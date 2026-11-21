# Markets in 30 Seconds

Nine daily 1080×1920 recaps for TikTok / Reels / Shorts: **3 videos × 3 languages** (one account per language).

| Post # | Set | English | Arabic (Fatima, ar-AE voice) | Hebrew | Accent | Cover |
|---|---|---|---|---|---|---|
| 1 | `macro` | Gold, Oil, Dollar Index, EUR/USD, Nikkei, DAX | Oil, Gold, Aramco*, CIB*, Dollar Index | TA-35, USD/ILS, Gold, Oil, Dollar Index | amber | YEAR |
| 2 | `crypto` | BTC, ETH, SOL, XRP, BNB | same | same | purple | MONTH |
| 3 | `wallstreet` | S&P 500, Nasdaq, Dow, Russell 2000 + top mega-cap mover | same | same | blue | DAY |

\* Stand-ins for the TASI and EGX30 indices: Yahoo Finance has no price history for those indices.
Swap them in `config.json → assets` once there's a reliable free source.

Posting 1 → 2 → 3 makes each profile row read **DAY | MONTH | YEAR** (left-to-right in English,
right-to-left for Arabic/Hebrew app users, since Instagram mirrors the grid).

```bash
npm run setup     # once: Python venv + Remotion deps
npm run daily     # all 9: fetch → script → voice → cover + video
```

Outputs in `out/YYYY-MM-DD/<lang>/`: `<n>_<set>.mp4`, `<n>_<set>_cover.png`, `<n>_<set>_caption.txt`,
`grid_preview.png` and `POSTING_ORDER.txt`. Raw data: `data/YYYY-MM-DD/` (shared per asset + per video).

## Options
```bash
python run.py --lang he                # one language (3 videos)
python run.py --lang ar --set crypto   # one video
python run.py --date 2026-11-20        # re-render a saved day (reproducible)
python run.py --refresh                # re-fetch data (each asset once for all languages)
python run.py --lang en --voice en-US-AndrewNeural
python run.py --skip-render            # data + script + audio + captions only
```

## Where things live
| What | File |
|---|---|
| Assets, sets, accents, per-language asset lists, voices, speed | `config.json` |
| All wording (spoken templates, names, UI text, hashtags, months, date format) | `locales/en.json`, `ar.json`, `he.json` |
| Fetch (yfinance + CoinGecko, cached per asset per day, "last close" detection) | `pipeline/fetch.py` |
| Script generation | `pipeline/script.py` |
| Voice (edge-tts, retries, silence trim, word timings) | `pipeline/tts.py` |
| Video + cover (Remotion, RTL-aware) | `render/src/` (`Recap.tsx`, `Cover.tsx`, `scenes/`) |

Arabic and Hebrew use noun-style phrasing ("Gold: down 3.9%") to avoid verb-gender agreement.
Markets that didn't trade today (e.g. Tadawul/EGX on Fridays) are voiced and labelled as "last close"
and are never used as "today's biggest mover".

## Scheduling
Run after the US close, e.g. cron `30 21 * * 1-5 cd /path/markets-recap && npm run daily`.

Not financial advice. Data from Yahoo Finance and CoinGecko public endpoints; values are best-effort.
