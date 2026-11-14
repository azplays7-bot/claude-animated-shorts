// Colab render driver: bundles the Remotion project once, then
//   probe:  renders one test still per GL mode and prints a JSON line per mode (works?, seconds)
//   render: renders the frame range in resumable chunks (chunk_XXXXX.mp4 + .done marker), printing progress lines
// Config comes as one JSON argument (see the notebook): {mode, comp, gl, chromeMode, scale, dpr, from, to, chunk, out, concurrency}
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";

const C = JSON.parse(process.argv[2]);
process.on("unhandledRejection", (e) => { console.log(JSON.stringify({ fatal: String(e).split("\n")[0] })); process.exit(1); });
const log = (o) => console.log(JSON.stringify(o));
const quiet = () => {};
const inputProps = C.dpr ? { post: { dpr: C.dpr } } : {};
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });

const opts = (gl, chromeMode) => ({
  chromiumOptions: { gl, enableMultiProcessOnLinux: true },
  chromeMode,
  browserExecutable: C.browser || null,
  timeoutInMilliseconds: 300000,
  logLevel: "error",
});

if (C.mode === "probe") {
  // per candidate [gl, chromeMode]: render 8 real frames, time frames 2..8 (frame 1 pays for page + shader start-up),
  // and call it blank if the h264 file is tiny (a frame of flat background compresses to almost nothing)
  for (const [gl, chromeMode] of C.candidates) {
    const t0 = Date.now();
    try {
      if (!C.browser) await ensureBrowser({ chromeMode });
      const o = opts(gl, chromeMode);
      const composition = await selectComposition({ serveUrl, id: C.comp, inputProps, ...o });
      const out = path.join(C.out, `probe_${gl}_${chromeMode}.mp4`);
      fs.mkdirSync(C.out, { recursive: true });
      let t1 = 0;
      await renderMedia({ composition, serveUrl, codec: "h264", crf: 20, imageFormat: "jpeg", frameRange: [C.frame, C.frame + 7], outputLocation: out,
        scale: C.scale, inputProps, concurrency: 1, muted: true, overwrite: true, onBrowserLog: quiet, ...o,
        onProgress: ({ renderedFrames }) => { if (renderedFrames === 1 && !t1) t1 = Date.now(); } });
      const bytes = fs.statSync(out).size;
      log({ gl, chromeMode, ok: bytes > 8 * 4000, bytes, sec: (Date.now() - t1) / 7000, startup: (t1 - t0) / 1000 });
    } catch (e) {
      log({ gl, chromeMode, ok: false, error: String(e).split("\n")[0].slice(0, 200), sec: (Date.now() - t0) / 1000 });
    }
  }
  process.exit(0);
}

// ---- render in chunks
const o = opts(C.gl, C.chromeMode);
const composition = await selectComposition({ serveUrl, id: C.comp, inputProps, ...o });
const last = Math.min(C.to, composition.durationInFrames - 1);
fs.mkdirSync(C.out, { recursive: true });
let done = 0;
const total = last - C.from + 1;
const t0 = Date.now();
for (let a = C.from; a <= last; a += C.chunk) {
  const b = Math.min(a + C.chunk - 1, last);
  const name = path.join(C.out, `chunk_${String(a).padStart(5, "0")}`);
  if (fs.existsSync(name + ".done")) { done += b - a + 1; log({ skip: a, to: b, done, total }); continue; }
  await renderMedia({
    composition, serveUrl, codec: "h264", crf: C.crf ?? 20, x264Preset: "veryfast", imageFormat: "jpeg", jpegQuality: 90,
    frameRange: [a, b], outputLocation: name + ".mp4", scale: C.scale, inputProps, concurrency: C.concurrency, muted: true,
    overwrite: true, onBrowserLog: quiet, ...o,
    onProgress: ({ renderedFrames }) => {
      if (renderedFrames % 10 === 0 || renderedFrames === b - a + 1) {
        const n = done + renderedFrames, el = (Date.now() - t0) / 1000;
        log({ frame: a + renderedFrames, done: n, total, elapsed: Math.round(el) });
      }
    },
  });
  fs.writeFileSync(name + ".done", "");
  done += b - a + 1;
}
log({ finished: true, total, elapsed: Math.round((Date.now() - t0) / 1000) });
