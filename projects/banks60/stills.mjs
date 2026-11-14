// node stills.mjs <outPrefix> <frame,frame,...>   (software GL; set CHROME_PATH to a Chromium binary)
import fs from "node:fs"; import path from "node:path";
import { bundle } from "@remotion/bundler"; import { renderStill, selectComposition } from "@remotion/renderer";
const [prefix, frames] = process.argv.slice(2);
fs.mkdirSync(path.dirname(path.resolve(prefix)), { recursive: true });
const o = { browserExecutable: process.env.CHROME_PATH || null, chromiumOptions: { gl: process.env.REMOTION_GL || "swangle" }, timeoutInMilliseconds: 240000, logLevel: "error" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "Banks60", ...o });
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 90, ...o,
    onBrowserLog: (l) => { if (l.type === "error") console.log("[err]", l.text.slice(0, 300)); } });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
