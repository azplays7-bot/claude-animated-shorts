# The Boy Nobody Believed In (HTML/SVG version)

A 60-second 9:16 animated documentary built in plain HTML, CSS, JavaScript and SVG. It plays in any modern browser, including Safari on iPhone and iPad, and it can export itself as an MP4.

- **Play:** open `dist/standalone.html` with `soundtrack.mp4` and `soundtrack.webm` beside it. Or open the published artifact.
- **Ready-made video:** `dist/the-boy-nobody-believed-in-1080x1920.mp4`. It was rendered by the page's own exporter in headless Chromium, then remuxed with an AAC soundtrack.

## How it works
- **Rendering.** `src/film.js` turns any time `t` into one SVG frame. Every frame comes from a pure function of time, so playback can be scrubbed and each frame is exact. The film uses:
  - parallax camera layers
  - gradient lighting with moonbeams, floodlights and spotlights
  - posable, faceless characters drawn with simple joint maths
  - dips and flashes at the cuts
- **Text.** Captions and titles are glyph outlines taken from the Anton and Inter fonts (SIL OFL) by `tools/glyphs.py`. Text therefore looks the same everywhere, including in the exported MP4.
- **Playback.** The animation clock is locked to the soundtrack. The soundtrack is the narration, score and sound effects mix from `projects/ronaldo60`. Kokoro TTS and the code-synthesized music are free and open source.
- **Export.** There are two paths:
  - **Frame by frame (preferred).** Each frame is rasterized to a canvas and encoded with WebCodecs. Video is H.264, with VP9 or AV1 as fallbacks. Audio is AAC, with Opus as a fallback. `mp4-muxer` 5.1.3 (MIT) builds the MP4.
  - **Real-time recording (fallback).** Browsers without WebCodecs encoders record in real time with MediaRecorder.
- **Saving.** Inside claude.ai the page saves the file through the platform's downloads prompt. A standalone copy uses a normal download.

## Rebuild
1. `python3 tools/glyphs.py <anton.woff2> <inter-800.woff2> tools/glyphs.json`
2. `python3 tools/build.py`
3. To check frames: `node tools/shots.mjs <outdir> 3,8,12`
4. To test the exporter: `MUX=<path to mp4-muxer.js> node tools/export_test.mjs 1800 out.mp4`

The fact check is the same as for `projects/ronaldo60` (see its README). The film says "Based on his publicly reported life story. Some scenes are dramatized."
