// node tools/export_test.mjs <frames> <out.mp4> — runs the page's own MP4 exporter in headless Chromium
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [frames, out] = process.argv.slice(2); const dist = path.resolve("dist");
const MUX = process.env.MUX;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split("?")[0]); const f = path.join(dist, u === "/" ? "standalone.html" : u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(8766);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 430, height: 932 } });
await p.route("**/mp4-muxer.js", (rt) => rt.fulfill({ path: MUX, contentType: "text/javascript" }));
await p.route("https://fonts.googleapis.com/**", (rt) => rt.fulfill({ body: "", contentType: "text/css" }));
p.on("pageerror", (e) => console.log("pageerror", e.message));
await p.goto("http://localhost:8766/");
await p.evaluate((n) => (window.__EXPORT_FRAMES = n), +frames);
await p.selectOption("#res", "1080");
const t0 = Date.now(); await p.click("#exportBtn");
await p.waitForFunction(() => !document.getElementById("result").hidden || /failed|cancel/i.test(document.getElementById("ptext").textContent), null, { timeout: 600000 });
console.log(await p.textContent("#method"), "|", await p.textContent("#ptext"), "|", await p.textContent("#saveNote"), ((Date.now() - t0) / 1000).toFixed(1) + "s");
const b64 = await p.evaluate(async () => { const v = document.getElementById("preview"); if (!v.src) return null; const buf = await (await fetch(v.src)).arrayBuffer(); let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode(...u.subarray(i, i + 32768)); return btoa(s); });
if (b64) fs.writeFileSync(out, Buffer.from(b64, "base64"));
await b.close(); srv.close();
