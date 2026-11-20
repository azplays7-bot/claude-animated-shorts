# Tony's Burgers: cheap to make, hard to sell (60 s vertical cartoon)

A 60-second 1080x1920 cartoon in the fast style of the other shorts: a camera change about every 1.5 s, a gag every
3-5 s, the information on signs and labels inside the 3D world, one-word captions, a fast British narrator (Kokoro
voice bm_george, speed 1.28) and lighting changes (Tony's bright green dining room, the sunny street, golden hour).

**Story.** A burger costs about $3 to make and sells for $10; a fountain soda costs about 30 cents and sells for $3.
Easy money? Not so fast. Meet Tony, who just opened Tony's Burgers: out of every $10, food, rent, staff, power, gas
and repairs each take a bite, and Tony often keeps less than $1. Why not buy a famous name? A big burger franchise
can cost over a million dollars to open, plus royalties on every sale. So Tony keeps his own name, but nobody knows it:
down the street the famous chain has a line out the door while Tony's dining room is empty (tumbleweed, crickets).
Flyers, videos, free samples. About 1 in 4 new restaurants close or change hands in their first year. Making food is
cheap; getting people to pick your food is the hard part. Tony wins them over one happy customer at a time.

All restaurants are made up (Tony's Burgers, BLAZE BURGER, Cafe Rosa); no real brands or logos.

## Fact check

| Claim | Status |
|---|---|
| A ~$10 burger costs ~$3 in food | ✅ Typical food cost is ~28-35 % of the menu price (NRA median ~32 %) |
| A $3 fountain soda costs ~30 cents | ✅ Reported ~25-40 cents for syrup, water and cup |
| Tony keeps less than $1 of every $10 | ✅ Typical net margins: ~3-5 % full service, a bit higher for quick service; varies a lot |
| A big burger franchise can cost over $1 million to open | ✅ e.g. McDonald's disclosure: ~$1.5-2.8 M total investment ($45k fee) |
| Plus a cut of every sale | ✅ Royalties usually ~4-8 % of sales, plus ad-fund fees |
| About 1 in 4 new restaurants close or change hands in year one | ✅ Ohio State (Columbus) study: ~26 % in year 1 (others find 17 % or less; the "90 % fail" claim is a myth) |

Sources: Toast (food cost %), The Takeout (fountain soda cost), MoneyInc / Small Biz Trends (franchise costs and
royalties), Ohio State University news (restaurant failure study), Toast / Restaurant365 (profit margins).

## Build

```
cd narration && python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python make_words.py
cd ../audio && python make_audio.py
# toon/src is the Remotion composition (TonyShort); render with toon/render.mjs, then:
python3 make_video.py <chunk_dir>
```
