"""Fetch daily prices + 5-day history.

Each asset is fetched once per day and cached in data/YYYY-MM-DD/_assets/<id>.json, so the
English, Arabic and Hebrew videos share one download. Each video's exact input is also written to
data/YYYY-MM-DD/<lang>/<set>.json, so every video is reproducible.
"""
from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
import yfinance as yf

COINGECKO = "https://api.coingecko.com/api/v3"
SPARK_POINTS = 6  # 6 closes = 5 daily moves


def _from_closes(closes: list[float], as_of: str) -> dict:
    if len(closes) < 2:
        raise RuntimeError("not enough history")
    return {
        "price": closes[-1],
        "prev_close": closes[-2],
        "change_pct": (closes[-1] / closes[-2] - 1) * 100,
        "spark": closes[-SPARK_POINTS:],
        "week_ago": closes[-SPARK_POINTS] if len(closes) >= SPARK_POINTS else closes[0],
        "as_of": as_of,
    }


def _yahoo(symbol: str) -> dict:
    hist = yf.Ticker(symbol).history(period="1mo", interval="1d", auto_adjust=False)
    closes = [float(c) for c in hist["Close"].dropna().tolist()]
    if len(closes) < 2:
        raise RuntimeError(f"Yahoo returned no history for {symbol}")
    return _from_closes(closes, hist["Close"].dropna().index[-1].isoformat())


_CG = requests.Session()
_CG.headers["accept"] = "application/json"


def _cg_get(path: str, params: dict, attempts: int = 6) -> dict:
    """CoinGecko's free tier rate-limits bursts (429 / empty body): pace and back off."""
    r = None
    for i in range(attempts):
        time.sleep(1.2)
        r = _CG.get(f"{COINGECKO}{path}", params=params, timeout=20)
        if r.status_code == 200 and r.content:
            return r.json()
        wait = min(60, 5 * 2 ** i)
        print(f"[fetch] CoinGecko {r.status_code} on {path}, retrying in {wait}s")
        time.sleep(wait)
    r.raise_for_status()
    raise RuntimeError(f"CoinGecko: no data for {path}")


def _coingecko(coin_id: str) -> dict:
    spot = _cg_get("/simple/price", {"ids": coin_id, "vs_currencies": "usd", "include_24hr_change": "true",
                                      "include_last_updated_at": "true"})[coin_id]
    chart = _cg_get(f"/coins/{coin_id}/market_chart",
                    {"vs_currency": "usd", "days": 7, "interval": "daily"})
    daily = [float(p[1]) for p in chart.get("prices", [])]
    spark = (daily[:-1] + [float(spot["usd"])])[-SPARK_POINTS:] if daily else [float(spot["usd"])]
    return {
        "price": float(spot["usd"]),
        "change_pct": float(spot["usd_24h_change"]),
        "spark": spark,
        "week_ago": daily[0] if daily else float(spot["usd"]),
        "as_of": datetime.fromtimestamp(spot["last_updated_at"], tz=timezone.utc).isoformat(),
        "always_live": True,
    }


def _top_mover(universe: list[str]) -> dict:
    """Biggest absolute daily move among a list of mega caps."""
    df = yf.download(universe, period="1mo", interval="1d", progress=False, auto_adjust=False,
                     group_by="ticker", threads=True)
    best = None
    for s in universe:
        col = df[s]["Close"].dropna()
        if len(col) < 2:
            continue
        row = _from_closes([float(c) for c in col.tolist()], col.index[-1].isoformat())
        if best is None or abs(row["change_pct"]) > abs(best[1]["change_pct"]):
            best = (s, row)
    if best is None:
        raise RuntimeError("no top-mover data")
    sym, row = best
    return {**row, "symbol": sym, "ticker": sym, "top_mover": True}


def _fetch_asset(asset_id: str, spec: dict) -> dict:
    if spec["source"] == "top_mover":
        print(f"[fetch] {asset_id}: top mover across {len(spec['universe'])} mega caps")
        return _top_mover(spec["universe"])
    print(f"[fetch] {asset_id} ({spec['source']}:{spec['symbol']})")
    row = (_yahoo if spec["source"] == "yahoo" else _coingecko)(spec["symbol"])
    return {"symbol": spec["symbol"], "ticker": spec["ticker"], **row}


def get_asset(asset_id: str, cfg: dict, date: str, root: Path, refresh: bool, weekly: bool = False) -> dict:
    spec = cfg["assets"][asset_id]
    path = root / "data" / date / "_assets" / f"{asset_id}.json"
    if path.exists() and not refresh:
        row = json.loads(path.read_text())
    else:
        row = _fetch_asset(asset_id, spec)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(row, indent=2))
    # "stale" = the market's last session is not today (e.g. Tadawul/EGX on a Friday).
    stale = not row.get("always_live") and row["as_of"][:10] < date
    out = {"id": asset_id, "unit": spec["unit"], "decimals": spec["decimals"], "source": spec["source"],
           "stale": stale, **row}
    if weekly:  # week-in-review: change vs ~one week ago; "last close" no longer applies
        ref = row.get("week_ago") or row["spark"][0]
        out.update(change_pct=(row["price"] / ref - 1) * 100, stale=False, period="week")
    return out


def fetch_set(lang: str, set_id: str, asset_ids: list[str], cfg: dict, date: str, root: Path,
              refresh: bool = False, refreshed: set | None = None, weekly: bool = False) -> dict:
    """refreshed: asset ids already re-fetched in this run (so --refresh fetches each once)."""
    refreshed = refreshed if refreshed is not None else set()
    assets = []
    for aid in asset_ids:
        assets.append(get_asset(aid, cfg, date, root, refresh and aid not in refreshed, weekly))
        refreshed.add(aid)
    data = {"date": date, "lang": lang, "set": set_id,
            "fetched_at": datetime.now(timezone.utc).isoformat(), "assets": assets}
    path = root / "data" / date / lang / f"{set_id}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data
