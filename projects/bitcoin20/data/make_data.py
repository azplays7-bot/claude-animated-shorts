# Builds src/data.json for the animation from the real price files in this folder:
#   chart: weekly price points 2010-07-18 .. 2026-11-13 (Habrador/CoinDesk daily file, then blockchain.info daily averages)
#   buys:  the 197 monthly purchases (purchases.csv) with running totals
#   range: the two source-dependent results (see README.md)
import csv, json, os, datetime as dt
HERE = os.path.dirname(os.path.abspath(__file__))
hb = {dt.date.fromisoformat(r["Date"]): float(r["Price"]) for r in csv.DictReader(open(os.path.join(HERE, "habrador.csv")))}
bc = {dt.datetime.fromtimestamp(p["x"], dt.timezone.utc).date(): p["y"]
      for p in json.load(open(os.path.join(HERE, "bc_market.json")))["values"] if p["y"] > 0}
daily = dict(bc); daily.update(hb)                      # Habrador wins where both exist
days = sorted(d for d in daily if d >= dt.date(2010, 7, 18))
pts, last = [], None
for d in days:
    if last is None or (d - last).days >= 7 or d == days[-1]:
        pts.append([round((d - dt.date(2010, 1, 1)).days / 365.25 + 2010, 4), daily[d]]); last = d
def max_drop(a, b):
    """largest close-to-close fall (peak to later trough) between two dates, from the daily series"""
    peak, worst, pk, tr = 0, 0, None, None
    for d in days:
        if a <= d <= b:
            if daily[d] > peak: peak, pkd = daily[d], d
            if 1 - daily[d] / peak > worst: worst, pk, tr = 1 - daily[d] / peak, (pkd, peak), (d, daily[d])
    return {"pct": round(100 * worst), "peak": [str(pk[0]), pk[1]], "trough": [str(tr[0]), tr[1]]}
drops = {"d2018": max_drop(dt.date(2017, 11, 1), dt.date(2019, 1, 31)), "d2022": max_drop(dt.date(2021, 10, 1), dt.date(2023, 1, 31))}
print(drops)
buys = [{"m": r["month"][:7], "p": float(r["price_usd"]), "btc": float(r["btc_total"])} for r in csv.DictReader(open(os.path.join(HERE, "purchases.csv")))]
out = {"chart": pts, "buys": buys, "drops": drops,
       "range": {"low_usd": 92471553, "high_usd": 115956561, "low_btc": 1344.73, "high_btc": 1624.82,
                 "coinbase_price_2026_11_13": 68765.995}}
json.dump(out, open(os.path.join(HERE, "..", "src", "data.json"), "w"), separators=(",", ":"))
print(len(pts), "chart points,", len(buys), "buys; last", pts[-1])
