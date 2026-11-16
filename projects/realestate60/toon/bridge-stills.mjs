// usage: node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale]  (bundles once, GPU via ANGLE, jpeg)
// BRIDGE_ENTRY=src/sandboxes/<name>/index.tsx renders a sandbox copy instead of the main project entry.
import fs from "node:fs";
// Remotion bundles fill the temp folder (~1.3 GB each): set REMOTION_TMP to a folder on a big drive
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [prefix, frames, scale = "0.5"] = process.argv.slice(2);
if (!prefix || !frames) { console.error("usage: node scripts/bridge-stills.mjs <outPrefix> <frame,frame,...> [scale]"); process.exit(1); }
fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
// CHROME_PATH: use an installed Chrome/Chromium; unset = Remotion's own headless shell (downloaded on first run).
// REMOTION_GL: angle (default, GPU on Windows/macOS) | swangle (CPU, works on headless Linux) | egl | vulkan
const browserExecutable = process.env.CHROME_PATH || null;
const chromiumOptions = { gl: process.env.REMOTION_GL || "angle" };
// INPUT_PROPS: JSON passed as Remotion inputProps, e.g. '{"post":{"ink":false}}' for A/B stills.
const inputProps = process.env.INPUT_PROPS ? JSON.parse(process.env.INPUT_PROPS) : {};
const serveUrl = await bundle({ entryPoint: path.resolve(process.env.BRIDGE_ENTRY || "src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "BridgeShort", inputProps, browserExecutable, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error" || l.type === "warning") console.log(`[${l.type}]`, l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 88, scale: Number(scale), inputProps,
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
