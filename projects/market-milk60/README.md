# Why is the milk at the back of the store? (60 s vertical short)

1080×1920, 30 fps, 60 s, in the flat-characters-in-a-3D-toon-world style (Remotion + three.js). This one copies the
pacing of a reference short: a new camera setup every ~1.6 s (40 setups, each one moving), a gag every 3–5 s,
information on signs inside the world, one-word captions in the middle of the frame, a faster narrator (~221 wpm,
Kokoro voice am_fenrir), light/colour changes (cool store light, warm bakery, red soda deal, blue dairy wall,
golden-hour ending) and a light, bright 128 BPM bed under the voice.

**Story:** Grocery stores put the milk as far from the door as possible, on purpose. Max needs one thing: milk. Fresh
flowers and warm bread hit him at the door; chips, the free sample lady, cereal mascots staring at him and a soda
tower (2 for $5) fill his cart on the way to the back. Checkout: candy at eye level; he came in for a $4 carton and
leaves with $63 of stuff. The trick: the milk is the bait (overhead map of the path past everything). Partly
practical too: the coolers sit by the loading dock. Pricey brands at eye level, cheap ones by your feet. Every extra
step is one more chance to buy. Ending: walk in, grab the milk, get out.

**Facts / honesty:** made-up store and example prices; layouts vary; dairy often sits at the back partly for cooler
and delivery logistics, and also draws shoppers past other aisles; eye-level shelf space usually goes to pricier or
promoted brands.

| Path | Contents |
|---|---|
| `narration/` | `script.json`, `make_narration.py` (Kokoro TTS), `make_words.py` (word timings via faster-whisper), `narration.wav`, `timing.json`, `words.json` |
| `audio/` | `make_audio.py`, `dsp.py`, `mix.wav` (−14 LUFS, ≤ −1 dBTP) |
| `toon/src/` | Scene code (`story.ts` timeline + 40 camera setups, `blocking.ts` Max and the cart, `world.ts` street/store/back room, `cast.ts` characters and gags, `overlay.tsx` one-word captions); copy into the engine project as `src/videos/market` and register `MarketShort` |
| `toon/render.mjs` | Chunked, resumable renderer |
| `make_video.py <chunk_dir>` | Joins the chunks and the mix into `out/milk_at_the_back_60s.mp4` and its `.srt` |
| `deliverables/` | Final video, captions, contact sheet |
