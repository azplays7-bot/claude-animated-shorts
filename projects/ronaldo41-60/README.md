# How is Ronaldo still scoring at 41? (60 s vertical short)

1080×1920, 30 fps, 60 s, flat cartoon characters in a 3D toon world (Remotion + three.js), cut in the same fast
style as the milk and red & yellow videos: a new camera setup about every 1.5 s (47 setups, all moving), a gag every
3–5 s, information on signs inside the world (the stadium's big screen, a whiteboard, a breakfast board, a fridge
note, a training log, a measuring pole, a calendar), one-word captions, a fast narrator (Kokoro voice am_fenrir) and
lighting changes (golden evening stadium, bright morning house, sunny training pitch, a cold blue ice room).

This is a different angle from `projects/ronaldo60` (his childhood): this one is about how he is still playing at 41.

**Story:** Most footballers retire around 35 (old pros wave goodbye; pundits in a TV booth). Cristiano Ronaldo is 41
and still chasing 1,000 goals. His day: he treats sleep like training (reportedly with naps), protein for breakfast
and very little sugar, the press conference where he moved two soda bottles and held up water, no alcohol. Training:
sprints, weights, extra shooting after everyone leaves ("first in, last out"), a header measured at over 2.5 m, an
ice bath, then rest and repeat. The result: over 970 goals, the most international goals by any man, six World Cups,
a league title at 41. Talent got him started; habits kept him going. Ending: Max on the couch skipping a workout, and
Ronaldo's jump celebration.

## Fact check (November 2026)
| Claim | Source / status |
|---|---|
| Born 5 Feb 1985, so 41 now | ✅ |
| Over 970 career goals, chasing 1,000 | ✅ About 974–976 official goals in mid-2026 reports (footballtransfers.com, July 2026) |
| Most international goals in men's football | ✅ Record since 2021 |
| Six World Cups | ✅ 2026 was his sixth (Portugal out to Spain in the round of 16) |
| League title at 41 | ✅ Saudi Pro League 2025–26 with Al Nassr |
| Moved two soda bottles at a press conference and held up water | ✅ Euro 2020 press conference (June 2021); the bottles here are a made-up brand, "FIZZ" |
| Says he doesn't drink alcohol | ✅ His own interviews |
| Sleep treated like training, short naps | ⚠️ Widely reported (sleep coach interviews); the narration says "reportedly" |
| Protein, very little sugar | ⚠️ Widely reported diet; kept general |
| Header measured at over 2.5 m | ✅ 2019 header vs Sampdoria, widely reported at about 2.56 m |
| Ice-cold recovery | ⚠️ He has shown cryotherapy / cold recovery; the 3 °C sign is a cartoon detail |
| "First in, last out" | ⚠️ A common description from teammates and coaches; phrased as "teammates often say" |

**Likeness and brands:** a simple cartoon caricature (red #7 shirt), no club crests, real kits, sponsors or logos.
Small print on screen: "Unofficial fan cartoon · not affiliated with the player or any club · stats as reported in
2026 · habits as reported in the media".

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS), `make_words.py` (word timings via faster-whisper), `narration.wav`, `timing.json`, `words.json` |
| `audio/` | `make_audio.py`, `dsp.py`, `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` timeline + camera setups, `blocking.ts` Ronaldo, `world.ts` stadium + house, `cast.ts` characters and gags, `overlay.tsx` captions, `toon.ts` with jersey numbers and new props); copy into the engine project as `src/videos/cr7` and register `CR7Short` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/ronaldo_still_scoring_at_41_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
