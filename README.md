# Claude Animated Shorts

The free Claude skill from the video **"How to Make Viral Animated Shorts Using Claude (Full Workflow)"**.

It makes 55-70 s vertical animated story shorts: 2D characters in a colourful 3D world, with ink outlines, a painted town, lens blur, gliding cameras, a march score and sound effects. Everything is rendered with three.js inside Remotion on your own PC, with no AI video generator.

Proven on **The Bridge That Fell for a Song**, a 67 s short about the 1831 Broughton bridge.

## What's inside
| Path | What it is |
|---|---|
| `SKILL.md` | The skill: the full pipeline, every rule, every fix, and the final look values |
| `setup.sh` | Builds a runnable Remotion project from the templates in one command |
| `templates/project/` | The project scaffold: pinned `package.json`, `src/index.ts`, `src/Root.tsx`, tsconfig |
| `templates/bridge/` | The full source of the bridge short: world, characters, ink, lens blur, grade, story/camera |
| `templates/audio/` | The synthesized sound: SFX, march music, the mix with ducking and loudness |
| `templates/scripts/` | Stills, side-by-side sheets, shot merge and frame-by-frame QA helpers |
| `references/STYLE_BIBLE.md` | The script and visual formula measured from 20 reference shorts |
| `references/reports/` | Seven measured reports: motion, depth, textures, characters, lighting, outlines, grade |
| `references/frames/` | 38 full-size reference frames (540x960) to compare your frames against |
| `references/sheets/` | 20 contact sheets, one per reference short, 60 frames each (1,200 frames) |

## Install
1. Copy this folder to `~/.claude/skills/cartoon-3d-short/` (clone it there, or download the ZIP).
2. You need Node 18+, Python 3 (`pip install numpy scipy pillow`) and ffmpeg.
3. Make a working project (installs Remotion, three.js and the pinned React 18 / R3F 8 stack):
   ```bash
   ~/.claude/skills/cartoon-3d-short/setup.sh ~/shorts
   cd ~/shorts && npm run still     # frames 100 and 400 -> out/test/
   ```
   On a headless Linux box with no GPU, use software GL:
   `REMOTION_GL=swangle npm run still` (the same variable works for `npm run render`).
4. Optional: drop the Kenney CC0 nature/town kit `.glb` files in `public/bridge/kenney/` (names in `world.ts`). Without them the short still renders, minus trees and stalls.
5. In Claude Code, say: *"Use the cartoon short skill and make a short about …"*.

Claude then follows `SKILL.md`: topic and facts, then script, then voice, then the shot plan in `story.ts`, then stills, then renders. Agents check your frames against the reports and the frames, and you get the final 2K render and sound mix.

## Notes
- Set `REMOTION_TMP` to a folder on a big drive. Every Remotion bundle copies `public/` (~1.3 GB) into the temp folder.
- Story, characters and voice should always be your own. Use the references for the look, not the content.

## License
The code and docs are MIT (see `LICENSE`). The reference frames are included for style study only.
