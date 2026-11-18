# Why theaters lose money on the movie: 60 s vertical short

1080×1920, 30 fps, 60 s, in the same flat-characters-in-a-3D-toon-world style as the other shorts (Remotion + three.js).

**Story:** You pay $15 for a movie ticket, but the theater keeps very little of it. Its real money maker is hidden behind a red curtain in the lobby, and a locked badge stays on screen until the reveal. On the explainer stage the $15 is split into jars: the studio's cut (often over half early in a run), rent and staff, power and screens; the theater might keep about $2. So how does it survive? Hundreds of hungry people wait in one lobby, and outside snacks aren't allowed. The curtain opens: **POPCORN**. A $9 tub costs about $1.50 to make; snacks are about a third of sales but mostly profit. The lesson: the ticket gets you in, the popcorn pays the bills. The same trick is everywhere (cheap printers, pricey ink; cheap consoles, pricey games). End card: **FIND THE POPCORN**.

**Facts:** studios commonly take ~50–60%+ of box office early in a film's run (terms are negotiated per film and fall later in the run). AMC's 2024 annual report: admissions $2.56 B and food & beverage $1.62 B of $4.64 B total revenue (~35%). Concession margins are commonly cited at ~80–85%. The $15 / $2 ticket split and the $9 / $1.50 tub are illustrative examples. Not financial advice.

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS, am_puck), `narration.wav`, `timing.json`, `captions.srt` |
| `audio/` | `make_audio.py` and `dsp.py` (synthesized showtime score and SFX), `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` shots and camera, `world.ts` sets, `cast.ts` characters and effects, `overlay.tsx` titles and captions); copy into the engine project as `src/videos/cinema` and register `CinemaShort` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/popcorn_theater_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
