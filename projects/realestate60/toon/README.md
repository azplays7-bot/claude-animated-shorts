# How Real Estate Can Build Wealth: cartoon-toon version

This is the same story, script, numbers, narration, captions and mix as the 3D version (`../src`). It is rebuilt in the flat-characters-in-a-3D-toon-world style of the Leaning Tower of Pisa short, using the same engine (ink outlines, two-tone shading, lens blur and grade).

## What's in `src/`
| File | Contents |
|---|---|
| `story.ts` | Shots, cameras, depth of field, narration beats and the money maths |
| `world.ts` | The street, the rental house, the neighbours and the bank; the office, the lender's office and the money stage; seasonal tints |
| `cast.ts` | Alex, the lender and the family; flying bills, envelopes and alerts |
| `toon.ts` | The character painter, plus held items (paycheck, phone, cash, key, lease) |
| `overlay.tsx` | Captions, money cards and the closing card (shared with the 3D version) |

## Build
The engine files sit in a Remotion project at `src/videos/estate/` and are registered as composition `EstateShort` (1080×1920, 1800 frames).

Render with:

```
node render.mjs '{"mode":"render","comp":"EstateShort","gl":"swangle","chromeMode":"headless-shell","from":0,"to":1799,"chunk":60,"out":"out/estate_chunks","concurrency":2,"crf":16}'
```

Then join the chunks with `../audio/mix.wav` and cut six 10-second clips.
