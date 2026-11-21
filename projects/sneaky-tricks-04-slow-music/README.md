# Sneaky Business Tricks #4: why stores play slow music (60 s vertical cartoon)

Part 4 of the "Sneaky Business Tricks" series. Same engine and fast style, American narrator am_fenrir (speed 1.15),
set in Tony's world.

**Story.** Stores play slow, calm music, and not just to be nice: music can change how fast you walk. In a famous
study one supermarket switched between slow and fast music for nine weeks; with slow music shoppers walked slower and
sales in that store were about 38 % higher. Fast music moved people along. In a restaurant, slow music kept diners at
their tables about ten minutes longer, and they bought more drinks. Weirder: a store played French accordion music and
French wine outsold German wine; with German music, German wine sold more, and most shoppers didn't think the music
mattered. Tony tries slow jazz, but later studies found it depends on the song, and it was one store. Next: the
popcorn trap (part five).

## Fact check

| Claim | Status |
|---|---|
| One supermarket, slow vs fast music, nine weeks | ✅ Milliman 1982, *Journal of Marketing* |
| Slow music: shoppers walked slower, sales ~38 % higher | ✅ Milliman 1982 (slow vs fast tempo; one store) |
| Fast music moved people along | ✅ Traffic flow was fastest with fast music in the same study |
| Restaurant: diners stayed ~10 min longer, bought more drinks | ✅ Milliman 1986 (~56 vs ~45 min; higher bar spending) |
| French music → French wine outsold German; German music → German wine | ✅ North, Hargreaves & McKendrick, *Nature* 1997 |
| Most shoppers didn't think the music mattered | ✅ Only about 1 in 7 said music influenced their choice |
| Later studies: depends on the song | ✅ e.g. Knöferle et al. 2012: tempo effect depended on the music's mode |

All places are made up (Tony's Burgers, MAISON D'OR).

## Build

```
cd narration && python make_narration.py <kokoro-v1.0.onnx> <voices-v1.0.bin> && python make_words.py
cd ../audio && python make_audio.py
# toon/src is the Remotion composition (MusShort); render with toon/render.mjs, then:
python3 make_video.py <chunk_dir>
```
