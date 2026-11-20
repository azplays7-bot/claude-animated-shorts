# Why are fast food signs red and yellow? (60 s vertical short)

1080×1920, 30 fps, 60 s, flat characters in a 3D toon world (Remotion + three.js), cut in the fast reference style:
a new camera setup about every 1.5 s (42 setups, all moving), a gag every 3–5 s, information on signs inside the
world, one-word captions in the middle of the frame, a fast narrator (Kokoro voice am_fenrir), lighting changes
(a grey, drained street where only the restaurant and Max keep their colour, a loud red/yellow inside under
bright panels, a golden-hour ending) and a 128 BPM bed that gets busier inside.

**Story:** Almost every fast food sign is red and yellow, not by accident. Max walks home down a grey street, not
hungry. BAM: a giant red and yellow sign. Red grabs the eye; yellow is easy to spot from far away; together they
scream "stop here, right now", and red is often linked with energy and appetite. Max is suddenly starving. Inside:
bright lights, bright colours, upbeat music (some studies found faster music can make people eat faster), a burger
gone in 90 seconds, hard plastic seats (comfy enough to eat, not to stay), so tables empty fast for the next
customer. He came in for nothing and left with a combo and a milkshake. Ending: am I hungry, or is the sign? (the
sign licks its lips).

**Honesty:** made-up restaurant (BLAZE BURGER) and prices; colour/appetite and music/eating-speed research is mixed
and effects vary; many chains now use calmer designs (small print on screen).

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS), `make_words.py` (word timings via faster-whisper), `narration.wav`, `timing.json`, `words.json` |
| `audio/` | `make_audio.py`, `dsp.py`, `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` timeline + camera setups, `blocking.ts` Max, `world.ts` street/restaurant, `cast.ts` characters and gags, `overlay.tsx` captions); copy into the engine project as `src/videos/redsign` and register `RedShort` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/red_yellow_signs_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
