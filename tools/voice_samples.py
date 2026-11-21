#!/usr/bin/env python3
"""Record every candidate voice reading the same real script line, for side-by-side listening.

    .venv/bin/python tools/voice_samples.py out/voice-samples

Writes one MP3 per voice plus compilation MP3s where an English announcer names each voice
("Number 3. Egypt, Shakir.") before its sample.
"""
from __future__ import annotations

import asyncio
import os
import ssl
import subprocess
import sys
from pathlib import Path

import certifi
import edge_tts
import edge_tts.communicate as _comm

_comm._SSL_CTX = ssl.create_default_context(cafile=os.environ.get("SSL_CERT_FILE") or certifi.where())
PROXY = os.environ.get("HTTPS_PROXY")

TEXT = {
    "ar": "الذهب: هبوط حاد 4 بالمئة، الأكبر حركة اليوم. ستاندرد آند بورز: تراجع 2.1 بالمئة، عند 7,027. تابعنا لملخص الغد.",
    "he": "הזהב: צניחה של 4 אחוז, התנועה הגדולה היום. אס אנד פי: ירידה של 2.1 אחוז, ל-7,027. עקבו לסיכום של מחר.",
}
RATE = {"ar": "+25%", "he": "+20%"}

COUNTRIES = {"AE": "Emirates", "BH": "Bahrain", "DZ": "Algeria", "EG": "Egypt", "IQ": "Iraq", "JO": "Jordan",
             "KW": "Kuwait", "LB": "Lebanon", "LY": "Libya", "MA": "Morocco", "OM": "Oman", "QA": "Qatar",
             "SA": "Saudi", "SY": "Syria", "TN": "Tunisia", "YE": "Yemen", "IL": "Israel"}
MULTILINGUAL = ["en-US-AndrewMultilingualNeural", "en-US-BrianMultilingualNeural",
                "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural"]


async def say(text: str, voice: str, rate: str, out: Path) -> bool:
    for attempt in range(3):
        try:
            with out.open("wb") as f:
                async for ch in edge_tts.Communicate(text, voice, rate=rate, proxy=PROXY).stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
            if out.stat().st_size > 2000:
                return True
        except Exception as e:  # noqa: BLE001
            print(f"  retry {voice}: {type(e).__name__}")
            await asyncio.sleep(2 * (attempt + 1))
    return False


def label(voice: str) -> str:
    parts = voice.split("-")
    name = parts[2].replace("MultilingualNeural", " multilingual").replace("Neural", "")
    return name if voice in MULTILINGUAL else f"{COUNTRIES.get(parts[1], parts[1])}, {name}"


async def main(outdir: Path) -> None:
    outdir.mkdir(parents=True, exist_ok=True)
    voices = await edge_tts.list_voices(proxy=PROXY)
    groups = {
        "arabic_male": [v["ShortName"] for v in voices if v["Locale"].startswith("ar-") and v["Gender"] == "Male"],
        "arabic_female": [v["ShortName"] for v in voices if v["Locale"].startswith("ar-") and v["Gender"] == "Female"],
        "hebrew": [v["ShortName"] for v in voices if v["Locale"].startswith("he-")],
    }
    available = {v["ShortName"] for v in voices}
    multi = [m for m in MULTILINGUAL if m in available]
    groups["arabic_multilingual"] = multi
    groups["hebrew_multilingual"] = multi

    for group, names in groups.items():
        lang = "he" if group.startswith("hebrew") else "ar"
        parts, listing = [], []
        for i, voice in enumerate(sorted(names), 1):
            sample = outdir / group / f"{i:02d}_{voice}.mp3"
            sample.parent.mkdir(parents=True, exist_ok=True)
            if not await say(TEXT[lang], voice, RATE[lang], sample):
                print(f"  skip {voice} (no audio)")
                continue
            intro = outdir / group / f".intro{i:02d}.mp3"
            await say(f"Number {i}. {label(voice)}.", "en-US-GuyNeural", "+0%", intro)
            parts += [intro, sample]
            listing.append(f"{i:2d}. {voice:34s} {label(voice)}")
            print(f"[{group}] {i:2d} {voice}")
        if not parts:
            continue
        lst = outdir / group / ".concat.txt"
        # Re-encode each piece to a common format with a short pause, then concatenate.
        wavs = []
        for p in parts:
            w = p.with_suffix(".wav")
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(p), "-af", "apad=pad_dur=0.5",
                            "-ar", "24000", "-ac", "1", str(w)], check=True)
            wavs.append(w)
        lst.write_text("".join(f"file '{w.resolve()}'\n" for w in wavs))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                        "-c:a", "libmp3lame", "-q:a", "4", str(outdir / f"{group}_ALL.mp3")], check=True)
        (outdir / f"{group}_list.txt").write_text("\n".join(listing) + "\n")
        for w in wavs:
            w.unlink()


if __name__ == "__main__":
    asyncio.run(main(Path(sys.argv[1] if len(sys.argv) > 1 else "out/voice-samples")))
