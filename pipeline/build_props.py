"""Assemble the Remotion input props (data + scene timings + words + localized UI strings)."""
from __future__ import annotations

import json
from datetime import date as _date
from pathlib import Path

from .script import display_name

FONTS = {
    "ltr": "'Inter', system-ui, sans-serif",
    # Inter first keeps digits/Latin tickers identical across languages; script glyphs fall through.
    "ar": "'Inter', 'IBM Plex Sans Arabic', system-ui, sans-serif",
    "he": "'Inter', 'Heebo', system-ui, sans-serif",
}


def _fix_caption(loc: dict, text: str) -> str:
    """Spellings tuned for the voice (e.g. Arabic "سوولانا") are shown correctly on screen."""
    for spoken, shown in loc.get("caption_fixes", {}).items():
        text = text.replace(spoken, shown)
    return text


def change_label(loc: dict, a: dict) -> str:
    """Label next to the % change: the session's closing date (videos are posted the next morning),
    "24h" for crypto, or the week label in week-in-review mode."""
    if a.get("period") == "week":
        return loc["ui"]["today"]
    if a.get("always_live"):
        return loc["ui"]["live_label"]
    d = _date.fromisoformat(a["as_of"][:10])
    return loc["ui"]["close_label"].format(d=d.day, month=loc["months_long"][d.month - 1])


def date_parts(iso: str, loc: dict) -> dict:
    d = _date.fromisoformat(iso)
    return {"day": f"{d.day:02d}", "month": loc["months"][d.month - 1], "year": str(d.year)}


def build_props(cfg: dict, lang: str, set_id: str, data: dict, script: dict, tts: dict, loc: dict,
                label: str, out: Path) -> dict:
    set_cfg, set_loc = cfg["sets"][set_id], loc["sets"][set_id]
    props = {
        "lang": lang,
        "brand": loc["brand"],
        "setId": set_id,
        "setLabel": set_loc["label"],
        "title": set_loc["title"],
        "titleLines": set_loc["title_lines"],
        "accent": set_cfg["accent"],
        "datePart": date_parts(data["date"], loc)[set_cfg["date_part"]],
        "datePartKind": set_cfg["date_part"],
        "dateLabel": label,
        "fontFamily": FONTS.get(lang, FONTS["ltr"]),
        "fps": cfg["fps"],
        "width": cfg["width"],
        "height": cfg["height"],
        "dir": loc.get("dir", "ltr"),
        "ui": loc["ui"],
        "audio": "voice.wav",
        "duration": tts["duration"],
        "moverId": script["mover_id"],
        "up": script["up"],
        "down": script["down"],
        "assets": [{"id": a["id"], "name": display_name(loc, a), "ticker": a["ticker"], "unit": a["unit"],
                    "decimals": a["decimals"], "price": a["price"], "change_pct": a["change_pct"],
                    "spark": a["spark"], "topMover": bool(a.get("top_mover")), "stale": bool(a.get("stale")),
                    "changeLabel": change_label(loc, a)}
                   for a in data["assets"]],
        "hookShowsPrice": bool(script.get("mover_in_hook_only")),
        "segments": [{**{k: s[k] for k in ("id", "scene", "start", "duration")},
                      "words": [{**w, "text": _fix_caption(loc, w["text"])} for w in s["words"]]}
                     for s in tts["segments"]],
    }
    out.write_text(json.dumps(props, indent=2, ensure_ascii=False))
    return props
