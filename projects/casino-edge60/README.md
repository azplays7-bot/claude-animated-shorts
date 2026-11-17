# How casinos make money (and their one weakness): 60 s vertical short

1080×1920, 30 fps, about 60 s. Made in the same flat-characters-in-a-3D-toon-world style as the other shorts (Remotion + three.js).

**Story:** The hook promises "the casino's one weakness", and a locked badge stays on screen until the reveal. Max plays roulette. On a giant wheel, $1 on each of the 38 pockets means $38 in; the winner pays 35 to 1, so $36 comes back and the house keeps $2, which is the house edge (2/38 ≈ 5.3%). Every game has an edge, and the room is built to keep you playing. Over millions of bets the math wins. The reveal is **TIME**: the edge only works while you keep playing. Max is up $50 and walks out.

**Math:** American roulette has 38 pockets (1–36, 0 and 00) and a straight-up bet pays 35 to 1, so the expected loss is 2/38 ≈ 5.26% per bet, or about $52,600 expected on 1,000,000 $1 bets. The small print notes that walking away doesn't change the odds of any bet.

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS, am_puck), `narration.wav`, `timing.json`, `captions.srt` |
| `audio/` | `make_audio.py` and `dsp.py` (synthesized lounge-swing score and SFX), `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` shots and camera, `world.ts` sets, `cast.ts` characters and effects, `overlay.tsx` titles and captions); copy it into the engine project as `src/videos/casino` and register `CasinoShort` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/casino_house_edge_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
