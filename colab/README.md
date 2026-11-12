# Render the short in Google Colab (iPad / iPhone friendly)

`Cartoon_Short_Colab.ipynb` builds and renders the whole bridge short in a free Google Colab runtime and exports an MP4.
Everything it needs is inside the notebook: the characters, town, bridge, the 15 shots and their camera moves, ink
outlines, lens blur, colour grade, the music and sound effects code, and the render driver.

## Run it from Safari on an iPad
1. Save `Cartoon_Short_Colab.ipynb` to the Files app (or to Google Drive).
2. In Safari open **colab.research.google.com** and sign in with your Google account.
3. **File → Upload notebook → Browse**, pick `Cartoon_Short_Colab.ipynb`.
   (Or, if you saved it to Drive: open it from Drive with "Open with → Google Colaboratory".)
4. **Runtime → Change runtime type → T4 GPU → Save** (usually already set by the notebook).
5. Optional: change the **Settings** cell (quality, part of the video, sound).
6. **Runtime → Run all**. When asked, tap **Connect to Google Drive** and allow it.
7. Keep the tab open and in front, the iPad plugged in, and Auto-Lock set to Never until it finishes.
8. The video lands in **Google Drive → My Drive → CartoonShort**. In the Drive app: ⋯ → Send a copy → Save Video to put it in Photos.

If Colab disconnects: open the notebook again and **Run all**. Finished 2-second pieces are kept in Drive, so it resumes.

## Settings
| Setting | Choices |
|---|---|
| QUALITY | Fast 540x960 (default, quickest), HD 1080x1920, 2K 1440x2560 (slowest) |
| PART | Whole video (67 s), First 10 seconds (quick test), Custom start/end seconds |
| SOUND | Music + sound effects (default), My voice + music + sound effects (needs `voice.wav` + `words.json` in My Drive/CartoonShort/voice/), No sound |
| SAVE_TO_GOOGLE_DRIVE | On (default: resumable, survives disconnects) / off (keeps files only in the runtime) |

## What happens
1. Installs Chrome's system libraries, Node.js 20 and the pinned npm packages.
2. Renders 8 test frames with each render mode (GPU ANGLE-EGL, GPU Vulkan, GPU EGL, CPU SwiftShader), discards modes that
   fail or draw blank frames, picks the fastest and prints the estimated time.
3. Renders the chosen frames in 60-frame chunks into Drive (`chunks_<size>_<from>-<to>/`, each with a `.done` marker).
4. Builds the sound: the original march score and synthesized SFX (or your voice through the full mix).
5. Joins the chunks, adds the sound and saves `bridge_short_<size>.mp4` (faststart, plays on iPhone).

## Limitations
- Free Colab is not guaranteed: GPUs are given out when available, sessions end after at most ~12 h and earlier when the
  tab is idle or closed. Safari suspends background tabs, so keep it in front.
- Headless Chrome on a GPU in Colab is not guaranteed to work; the notebook then uses the CPU, which is much slower
  (measured ~7.5 s per frame at 540x960 on 4 CPU cores; Colab's free CPU has 2 cores). A whole 67 s video on CPU can take
  many hours, so use "First 10 seconds" or a Custom range, and Run all again to continue later.
- The optional Kenney CC0 props (trees, market stalls, cart, windmill, canoe) are not included; the video renders without them.
- Your narration is not in the repo: the default sound is music + SFX only.
- Remotion is free for individuals and small teams; companies above that size need a Remotion company licence.

## Rebuilding the notebook
After changing anything in `templates/`, run `python colab/build_notebook.py` to re-embed the project.
