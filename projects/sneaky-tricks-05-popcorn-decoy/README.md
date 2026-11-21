# Sneaky Business Tricks #5: the medium popcorn decoy (60 s vertical cartoon)

Part 5 of the "Sneaky Business Tricks" series. Same engine and fast style, American narrator am_fenrir (speed 1.15),
set in Tony's world.

**Story.** Small popcorn $5, large $9: most people pick the small. Add a medium for $8 and suddenly the large looks
like a steal, only $1 more. The medium isn't really there to be bought: it's a decoy. In a famous classroom test,
students chose a magazine deal: web only (about $60) or print + web ($125). Most picked web only. Add a silly
print-only option at $125 and nobody chooses it, but now most pick print + web. It was a small classroom test, later
studies found decoys don't always work, and the popcorn prices are just an example. Tony adds a medium soda ($2 /
$3.50 / $4) and everybody orders large. Next time you see three sizes, ask: which one do they want me to buy?

## Fact check

| Claim | Status |
|---|---|
| Adding a slightly cheaper medium makes the large look like a deal (decoy / attraction effect) | ✅ Well-known effect (Huber, Payne & Puto 1982); prices are labeled as an example |
| Magazine test: web $59 vs print + web $125; most chose web | ✅ Dan Ariely's classroom test of an Economist offer (68 % web) |
| Adding print-only at $125: nobody chose it, most chose print + web | ✅ 0 % print-only, 84 % print + web |
| Small classroom test; decoys don't always work | ✅ e.g. Frederick, Lee & Baskin 2014 "The Limits of Attraction" |
| Tony's sodas | Cartoon gag, not a claim |

All places are made up (Tony's Burgers, MAISON D'OR).

## Build

```
cd narration && python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python make_words.py
cd ../audio && python make_audio.py
# toon/src is the Remotion composition (DecShort); render with toon/render.mjs, then:
python3 make_video.py <chunk_dir>
```
