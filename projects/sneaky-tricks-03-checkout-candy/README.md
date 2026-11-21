# Sneaky Business Tricks #3: why the candy is at the checkout (60 s vertical cartoon)

Part 3 of the "Sneaky Business Tricks" series. Same engine and fast style, American narrator am_fenrir (speed 1.15),
set in Tony's world.

**Story.** The candy sits right by the register: no accident, food companies treat the checkout like prime real
estate. Everyone has to pass it, and most of us wait in line, bored, staring at chocolate at eye level (and at a kid's
eye level). When some British supermarkets took candy off the checkout, shoppers bought about 17 % fewer grab-and-go
sweets and chips a year later; one study found about 70 % of the food and drinks within reach at checkouts was
unhealthy. A twist: one industry survey found fewer impulse buys at self-checkout. Tony's fruit bowl gets ignored;
his cookie jar is gone by lunch. Next: slow music (part four).

## Fact check

| Claim | Status |
|---|---|
| Food companies treat the checkout as prime real estate | ✅ UC Davis researcher quote; checkout slots are paid placements |
| Everyone passes the checkout and many wait in line | ✅ Cambridge / PLOS Medicine 2018 rationale for checkout policies |
| UK stores removing checkout candy: ~17 % fewer small sweets/chips a year later | ✅ Ejlerskov et al., PLOS Medicine 2018 (observational, not a randomized trial) |
| ~70 % of food & drinks within reach at checkouts unhealthy | ✅ UC Davis checkout study ("70 % of food, drinks within arm's reach are unhealthy") |
| Fewer impulse buys at self-checkout | ✅ Said as "one industry survey" (IHL Consulting, 2007) |
| Fruit bowl / cookie jar | Cartoon gag, not a claim |

All places are made up (Tony's Burgers). Sources: University of Cambridge news, PLOS Medicine, UC Davis, Supermarket News.

## Build

```
cd narration && python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python make_words.py
cd ../audio && python make_audio.py
# toon/src is the Remotion composition (ChkShort); render with toon/render.mjs, then:
python3 make_video.py <chunk_dir>
```
