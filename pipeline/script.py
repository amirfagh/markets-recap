"""Turn market data into a short, neutral voiceover split into scene segments (any locale)."""
from __future__ import annotations

import json
from datetime import date as _date
from pathlib import Path

FLAT = 0.05      # |%| below this reads as flat
SMALL = 0.5      # "edged up / slipped"
BIG = 3.0        # "surged / tumbled"


def load_locale(root: Path, lang: str) -> dict:
    return json.loads((root / "locales" / f"{lang}.json").read_text())


def date_label(loc: dict, iso: str) -> str:
    d = _date.fromisoformat(iso)
    return loc["date_format"].format(d=d.day, month_long=loc["months_long"][d.month - 1], y=d.year)


def pick(value, i: int = 0):
    """Locale strings may be a list of variants; rotate through them to avoid repetitive scripts."""
    return value[i % len(value)] if isinstance(value, list) else value


def verb(loc: dict, pct: float, i: int = 0) -> str:
    v = loc["verbs"]
    if abs(pct) < FLAT:
        return pick(v["flat"], i)
    side = "up" if pct > 0 else "down"
    if abs(pct) >= BIG:
        return pick(v[f"{side}_big"], i)
    if abs(pct) < SMALL:
        return pick(v[f"{side}_small"], i)
    return pick(v[side], i)


def spoken_pct(loc: dict, pct: float) -> str:
    value = f"{abs(pct):.1f}".rstrip("0").rstrip(".")
    return loc["pct"].format(value=value)


def display_name(loc: dict, a: dict) -> str:
    if a.get("top_mover"):
        return loc["companies"].get(a["symbol"], a["symbol"])
    return loc["names"].get(a["id"], a["id"])


def spoken_name(loc: dict, a: dict) -> str:
    if a.get("top_mover"):
        return loc["companies"].get(a["symbol"], a["symbol"])
    return loc["spoken_names"].get(a["id"], display_name(loc, a))


def spoken_price(loc: dict, a: dict) -> str:
    p, d = a["price"], a["decimals"]
    approx = loc.get("approx_thousands")  # e.g. Arabic: "about 59 thousand dollars"
    if approx and p >= approx["min"] and a["unit"] in approx["units"]:
        num = approx["format"].format(k=round(p / 1000))
    elif d == 0 or p >= 1000 or (loc.get("round_spoken_prices") and p >= 10):
        num = f"{round(p):,}"
    elif p < 10:
        num = f"{p:,.{min(d, loc.get('small_price_decimals', 3))}f}"   # FX / small coins: 1.098, 0.91
    else:
        num = f"{p:,.2f}"
    unit = loc["units"].get(a["unit"], "")
    return f"{num} {unit}".strip()


def biggest_mover(data: dict) -> dict:
    """Hook on today's biggest move; markets that were closed today can't be 'today's' mover."""
    fresh = [a for a in data["assets"] if not a.get("stale")] or data["assets"]
    return max(fresh, key=lambda a: abs(a["change_pct"]))


def build_script(data: dict, loc: dict, mover_in_hook_only: bool = False) -> dict:
    """Returns {"segments": [{"id", "scene", "text"}], "mover_id", "up", "down", "mover_in_hook_only"}.

    mover_in_hook_only: the hook also gives the mover's price and the mover's own card is skipped,
    so the biggest mover isn't announced twice.
    """
    mover = biggest_mover(data)
    if "hook_down" in loc:  # direction-aware hook (scored with ig-reel/hookscore.py)
        hook_tpl = loc["hook_down"] if mover["change_pct"] < 0 else loc["hook_up"]
    else:
        hook_tpl = loc["hook_with_price"] if mover_in_hook_only else loc["hook"]
    segs = [{
        "id": "hook", "scene": "hook",
        "text": pick(hook_tpl).format(name=spoken_name(loc, mover), verb=verb(loc, mover["change_pct"]),
                                      pct=spoken_pct(loc, mover["change_pct"]), price=spoken_price(loc, mover)),
    }]
    for i, a in enumerate(data["assets"], 1):
        if mover_in_hook_only and a["id"] == mover["id"]:
            continue
        if a.get("top_mover"):
            tpl = loc["top_asset"]
        elif a.get("stale"):
            tpl = loc["asset_stale"]
        else:
            tpl = loc["asset_flat"] if abs(a["change_pct"]) < FLAT else loc["asset"]
        segs.append({"id": a["id"], "scene": "asset", "text": pick(tpl, i).format(
            name=spoken_name(loc, a), verb=verb(loc, a["change_pct"], i),
            pct=spoken_pct(loc, a["change_pct"]), price=spoken_price(loc, a))})
    up = sum(a["change_pct"] >= FLAT for a in data["assets"])
    down = sum(a["change_pct"] <= -FLAT for a in data["assets"])
    summary = loc["summary"]
    if up == 0 and "summary_all_down" in loc:
        summary = loc["summary_all_down"]
    elif down == 0 and "summary_all_up" in loc:
        summary = loc["summary_all_up"]
    segs.append({"id": "summary", "scene": "summary", "text": summary.format(up=up, down=down)})
    segs.append({"id": "outro", "scene": "outro", "text": loc["outro"]})
    words = sum(len(s["text"].split()) for s in segs)
    print(f"[script:{data['lang']}/{data['set']}] {len(segs)} segments, {words} words")
    return {"segments": segs, "mover_id": mover["id"], "up": up, "down": down,
            "mover_in_hook_only": mover_in_hook_only}


def post_caption(loc: dict, set_id: str, data: dict, script: dict, label: str) -> str:
    s = loc["sets"][set_id]
    mover = next(a for a in data["assets"] if a["id"] == script["mover_id"])
    sign = lambda p: f"{'+' if p >= 0 else '−'}{abs(p):.2f}%"
    lines = "\n".join(f"{display_name(loc, a)} {sign(a['change_pct'])}" for a in data["assets"])
    body = loc["post_caption"].format(title=s["title"], date=label, mover_name=display_name(loc, mover),
                                      mover_pct=sign(mover["change_pct"]), lines=lines)
    return body + "\n\n" + " ".join(s["hashtags"][:5]) + "\n"
