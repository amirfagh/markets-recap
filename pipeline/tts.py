"""edge-tts voiceover: one clip per scene segment, word timings, single concatenated track."""
from __future__ import annotations

import asyncio
import json
import os
import ssl
import subprocess
import time
from pathlib import Path

import certifi
import edge_tts
import edge_tts.communicate as _comm

# Respect corporate/sandbox proxies + custom CA bundles (aiohttp ignores env vars by default).
_CA = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or certifi.where()
_comm._SSL_CTX = ssl.create_default_context(cafile=_CA)
_PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")

TICKS = 10_000_000  # edge-tts offsets are in 100ns units


async def _synth(text: str, voice: str, rate: str, out: Path) -> list[dict]:
    words: list[dict] = []
    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary", proxy=_PROXY)
    with out.open("wb") as f:
        async for ch in comm.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"text": ch["text"], "start": ch["offset"] / TICKS,
                              "end": (ch["offset"] + ch["duration"]) / TICKS})
    return words


def _synth_retry(text: str, voice: str, rate: str, out: Path, attempts: int = 4) -> list[dict]:
    """edge-tts is a free websocket service; retry dropped connections with backoff."""
    for i in range(attempts):
        try:
            words = asyncio.run(_synth(text, voice, rate, out))
            if words and out.stat().st_size > 0:
                return words
            raise RuntimeError("empty audio")
        except Exception as e:  # noqa: BLE001
            if i == attempts - 1:
                raise
            wait = 2 * (i + 1)
            print(f"[tts] retry {i + 1}/{attempts - 1} in {wait}s ({type(e).__name__}: {e})")
            time.sleep(wait)
    raise RuntimeError("unreachable")


def _restore_punctuation(words: list[dict], text: str) -> list[dict]:
    """edge-tts drops punctuation from word boundaries; re-attach it so captions break naturally."""
    cursor = 0
    for w in words:
        idx = text.find(w["text"], cursor)
        if idx < 0:
            continue
        end = idx + len(w["text"])
        while end < len(text) and text[end] in ".,!?;:،؟":
            w["text"] += text[end]
            end += 1
        cursor = end
    return words


def _duration(path: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(path)])
    return float(out)


def synthesize(script: dict, voice: str, rate: str, gap: float, workdir: Path) -> dict:
    """Returns {"audio": path, "duration", "segments": [{id, start, duration, words}]}."""
    workdir.mkdir(parents=True, exist_ok=True)
    wavs, segs, t = [], [], 0.0
    for i, seg in enumerate(script["segments"]):
        mp3 = workdir / f"seg{i:02d}.mp3"
        wav = workdir / f"seg{i:02d}.wav"
        words = _restore_punctuation(_synth_retry(seg["text"], voice, rate, mp3), seg["text"])
        # edge-tts adds ~0.5s of silence at each end: trim to the spoken words, then pad
        # a fixed gap so scenes breathe. Fixed sample rate keeps the concat sample-exact.
        lead = min(0.06, words[0]["start"]) if words else 0.0
        t0 = (words[0]["start"] - lead) if words else 0.0
        t1 = (words[-1]["end"] + 0.12) if words else _duration(mp3)
        words = [{**w, "start": w["start"] - t0, "end": w["end"] - t0} for w in words]
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-af",
                        f"atrim={t0:.3f}:{t1:.3f},asetpts=PTS-STARTPTS,apad=pad_dur={gap}",
                        "-ar", "48000", "-ac", "1", str(wav)], check=True)
        dur = _duration(wav)
        segs.append({"id": seg["id"], "scene": seg["scene"], "text": seg["text"], "start": t,
                     "duration": dur, "words": [{**w, "start": w["start"] + t, "end": w["end"] + t}
                                                for w in words]})
        wavs.append(wav)
        t += dur
        print(f"[tts] {seg['id']:8s} {dur:5.2f}s  {seg['text']}")

    lst = workdir / "concat.txt"
    lst.write_text("".join(f"file '{w.name}'\n" for w in wavs))
    audio = workdir / "voice.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(audio)], check=True)
    result = {"audio": str(audio), "duration": t, "voice": voice, "segments": segs}
    (workdir / "tts.json").write_text(json.dumps(result, indent=2))
    print(f"[tts] total {t:.2f}s with voice {voice}")
    return result
