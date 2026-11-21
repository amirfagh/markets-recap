#!/usr/bin/env python3
"""Markets in 30 Seconds — 3 daily recaps (Wall Street / Crypto / Global Macro) × 3 languages.

    python run.py                          # all languages × all sets for today (9 videos)
    python run.py --lang he                # one language (3 videos)
    python run.py --lang ar --set crypto   # one video
    python run.py --date 2026-11-20        # re-render a saved day from data/<date>/
    python run.py --refresh                # re-fetch even if the day's data exists
    python run.py --skip-render            # data + script + audio + captions only

Output: out/<date>/<lang>/<n>_<set>.mp4, <n>_<set>_cover.png, <n>_<set>_caption.txt,
        grid_preview.png, POSTING_ORDER.txt        (n = posting order on Instagram)
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from datetime import date as _date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from pipeline.build_props import build_props  # noqa: E402
from pipeline.fetch import fetch_set  # noqa: E402
from pipeline.script import build_script, date_label, load_locale, post_caption  # noqa: E402
from pipeline.tts import synthesize  # noqa: E402

GRID_ORDER = ("day", "month", "year")  # reading order of a profile row


def find_browser() -> str | None:
    """Use a preinstalled Chromium if present, so Remotion needn't download one."""
    if os.environ.get("REMOTION_BROWSER"):
        return os.environ["REMOTION_BROWSER"]
    for pattern in ("chromium_headless_shell-*/chrome-*/chrome-headless-shell",
                    "chromium_headless_shell-*/chrome-linux/headless_shell",
                    "chromium-*/chrome-linux*/chrome"):
        hits = sorted(Path("/opt/pw-browsers").glob(pattern))
        if hits:
            return str(hits[-1])
    return None


def remotion(kind: str, comp: str, out: Path, props: Path, public_dir: Path) -> None:
    rdir = ROOT / "render"
    if not (rdir / "node_modules").exists():
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=rdir, check=True)
    cmd = ["npx", "remotion", kind, "src/index.ts", comp, str(out), f"--props={props}",
           f"--public-dir={public_dir}", "--log=warn"]
    if kind == "render":
        cmd += ["--codec=h264", "--crf=18", "--audio-codec=aac"]
    browser = find_browser()
    if browser:
        cmd.append(f"--browser-executable={browser}")
    subprocess.run(cmd, cwd=rdir, check=True)


def grid_preview(covers: list[Path], out: Path) -> None:
    """Simulate an Instagram profile row: centre 3:4 crop of each cover, side by side."""
    inputs = sum((["-i", str(c)] for c in covers), [])
    crops = "".join(f"[{i}:v]crop=1080:1440:0:240,scale=360:480[c{i}];" for i in range(len(covers)))
    pads = "".join(f"[c{i}]" for i in range(len(covers)))
    subprocess.run(["ffmpeg", "-y", "-v", "error", *inputs, "-filter_complex",
                    f"{crops}{pads}hstack=inputs={len(covers)}[g];[g]pad=iw+8:ih+8:4:4:white",
                    str(out)], check=True)


def run_language(cfg: dict, lang: str, set_ids: list[str], date: str, args, refreshed: set) -> None:
    loc = load_locale(ROOT, lang)
    voice = args.voice or cfg["languages"][lang]["voice"]
    label = date_label(loc, date)
    out_dir = ROOT / "out" / date / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    order = cfg["post_order"]
    results = {}

    for set_id in set_ids:
        lang_set = cfg["languages"][lang].get("sets", {}).get(set_id, {})
        asset_ids = lang_set.get("assets", cfg["sets"][set_id]["assets"])
        n = order.index(set_id) + 1
        stem = f"{n}_{set_id}"
        work = ROOT / "build" / date / lang / set_id
        work.mkdir(parents=True, exist_ok=True)
        print(f"\n=== [{lang}] {loc['sets'][set_id]['title']} ===")

        data = fetch_set(lang, set_id, asset_ids, cfg, date, ROOT, args.refresh, refreshed)
        script = build_script(data, loc, cfg["sets"][set_id].get("mover_in_hook_only", False))
        (work / "script.json").write_text(json.dumps(script, indent=2, ensure_ascii=False))
        rate = cfg["languages"][lang].get("voice_rate", cfg["voice_rate"])
        tts = synthesize(script, voice, rate, cfg["segment_gap_s"], work)
        props = work / "props.json"
        build_props(cfg, lang, set_id, data, script, tts, loc, label, props)
        (out_dir / f"{stem}_caption.txt").write_text(post_caption(loc, set_id, data, script, label))

        if not args.skip_render:
            print(f"[render:{lang}/{set_id}] cover + video …")
            remotion("still", "Cover", out_dir / f"{stem}_cover.png", props, work)
            remotion("render", "Recap", out_dir / f"{stem}.mp4", props, work)
        results[set_id] = {"n": n, "stem": stem, "duration": tts["duration"],
                           "part": cfg["sets"][set_id]["date_part"]}

    if set(set_ids) == set(order):
        rtl = loc.get("dir") == "rtl"
        reading = "DAY | MONTH | YEAR" + (" (right to left)" if rtl else "")
        lines = [f"[{lang}] Post in this order so the profile row reads {reading} — {label}:", ""]
        for set_id in order:
            r = results[set_id]
            lines.append(f"{r['n']}. {loc['sets'][set_id]['label']:<18} cover={r['part'].upper():<5}  "
                         f"{r['stem']}.mp4  ({r['duration']:.1f}s)  cover: {r['stem']}_cover.png  "
                         f"caption: {r['stem']}_caption.txt")
        lines += ["", "The newest post appears first in the grid (top-left, or top-right in RTL app languages),",
                  "so the last post (DAY) leads the row. Upload the _cover.png as the Reel cover.",
                  "Never post anything else in between, or every later row shifts."]
        (out_dir / "POSTING_ORDER.txt").write_text("\n".join(lines) + "\n")
        if not args.skip_render:
            by_part = {cfg["sets"][s]["date_part"]: out_dir / f"{results[s]['stem']}_cover.png" for s in order}
            seq = [by_part[p] for p in GRID_ORDER]
            grid_preview(list(reversed(seq)) if rtl else seq, out_dir / "grid_preview.png")

    print(f"[done:{lang}] {out_dir.relative_to(ROOT)}/")


def main() -> None:
    cfg = json.loads((ROOT / "config.json").read_text())
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--date", default=_date.today().isoformat())
    ap.add_argument("--lang", default="all", choices=["all", *cfg["languages"]])
    ap.add_argument("--set", default="all", choices=["all", *cfg["sets"]])
    ap.add_argument("--voice", default=None, help="override the edge-tts voice (single --lang only)")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--skip-render", action="store_true")
    args = ap.parse_args()
    if args.voice and args.lang == "all":
        ap.error("--voice needs a single --lang")

    langs = list(cfg["languages"]) if args.lang == "all" else [args.lang]
    sets = cfg["post_order"] if args.set == "all" else [args.set]
    refreshed: set = set()
    for lang in langs:
        run_language(cfg, lang, sets, args.date, args, refreshed)

    out = ROOT / "out" / args.date
    print(f"\n[done] {out.relative_to(ROOT)}/")
    for f in sorted(out.rglob("*")):
        if f.is_file():
            print("   ", f.relative_to(out))


if __name__ == "__main__":
    main()
