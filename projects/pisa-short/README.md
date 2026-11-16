# The Tower That Leaned Before It Was Finished

Our original 64-second cartoon 3D short about the Leaning Tower of Pisa, made with the `cartoon-3d-short` skill on the bridge engine. It has flat bean-head character cards with plum ink in a painted three.js world, plus world ink lines, lens blur, bloom and the colour grade.

- `SCRIPT.md`: the researched facts with sources, the approved voice-over and the visual beats.
- `voice/`: `make_voice.py` (Kokoro `am_michael`, speed 1.34, one steady tone), `voice.wav`, and `words.json` with word times, which everything is timed to.
- `src/`: the video folder, which goes in `src/videos/pisa/` of the Remotion project as composition `PisaShort` (1080×1920, 30 fps, 1910 frames).
  - Built for this film:
    - `story.ts`: 18 shots on the word frames, tower state per era, cameras, kicks and lens blur.
    - `world.ts`: a tower of eight merged storey groups that is built floor by floor and leans and bends.
    - `cast.ts`: builders, mayor, the 1838 architect, the 1934 engineers, the guard, the kid and the tourists, plus a banana effect card.
  - Copied from the bridge engine: `ink.ts`, `lensblur.ts`, `grade.ts`, `lights.ts`, `shade.ts`, `cardshade.ts` and `toon.ts`.
  - Copied and edited: `paint.ts` (marble palettes added), `build.ts` (`setSight` exported) and `Pisa.tsx`.
- `audio/make_audio.py`: an original comic march (tuba oom-pah, pizzicato, glockenspiel) and synthesized effects keyed to word frames. Mixed at the skill's standard levels (music +3 dB, effects −6 dB, voice unchanged), −14 LUFS, −1 dBTP.

Render: `node render.mjs` (swangle, about 5.5 s per frame with two renders in parallel on four CPU cores). Then mux with the mix using `-map 0:v:0 -map 1:a:0`.
