// node tools/shots.mjs <outdir> t1,t2,...  — renders stills of the film via the page (headless Chromium)
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright"); import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [out, times] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const dist = path.resolve("dist");
const srv = http.createServer((q, r) => { const f = path.join(dist, decodeURIComponent(q.url.split("?")[0]) === "/" ? "standalone.html" : decodeURIComponent(q.url.split("?")[0])); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": f.endsWith(".html") ? "text/html" : f.endsWith(".m4a") ? "audio/mp4" : "audio/webm" }); fs.createReadStream(f).pipe(r); }).listen(8765);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:8765/"); await p.waitForTimeout(500);
await p.addStyleTag({ content: ".stage{position:fixed!important;inset:0!important;width:1080px!important;height:1920px!important;border-radius:0!important;z-index:9}.bigplay{display:none}" });
for (const t of times.split(",").map(Number)) { await p.evaluate((t) => window.__player.film.renderAt(t), t); await p.locator("#film").screenshot({ path: `${out}/t${t.toFixed(2)}.jpg`, type: "jpeg", quality: 85 }); }
console.log(errs.length ? errs.join("\n") : "no errors"); await b.close(); srv.close();
