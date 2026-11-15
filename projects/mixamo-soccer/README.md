# First Touch Studio: Mixamo × Three.js soccer scene

A 9:16 cinematic 3D scene (10 s), "The boy with the ball", built with Three.js r170. It loads your own Mixamo character and animations (FBX or GLB) in the browser, including on iPad.

## What's in the scene
- **Character:** your skinned character, driven by your Mixamo clip. Bone names are matched across rigs (`mixamorig:`, `mixamorig1:`, sanitized names). Forward drift ("not In Place") is removed automatically.
- **Ball:** touches are synced to your clip. The page samples the gait to find when the right foot reaches furthest forward and how fast a planted foot moves backwards. That speed becomes the run speed, so the feet don't slide.
- **Pitch and stadium:** a golden-hour training stadium with:
  - a physical sky and image-based light from it
  - a shadowed sun and a reflector fill light
  - turf with mowing stripes, plus 110k grass blades that sway in the wind
  - pitch lines, a goal with a net, cones, spare balls
  - three stands with roofs, advertising boards and floodlight towers
  - hills and trees in the distance
  - dust in the light, and turf kicked up on each touch
- **Look:** ACES tone mapping, bloom, vignette.
- **Shots:**
  1. ball-level crane-up reveal (0–3.4 s)
  2. low telephoto front dolly into the sun (3.4–6.6 s)
  3. rising orbit from behind, ending in slow motion (6.6–10 s)
- **Export:** 300 frames at 1080×1920, encoded with WebCodecs (H.264) and packed by mp4-muxer. Video only.

## Files
- `index.html`: the whole app, published as a claude.ai artifact. It loads Three.js and mp4-muxer from jsDelivr.
- `assets/xbot.json`: the sample character (Mixamo X Bot from the three.js examples, MIT), base64-encoded so the artifact can serve it.
- `tools/test.mjs`: headless test. It loads the page and optionally "uploads" FBX files, renders frames and test-exports.
