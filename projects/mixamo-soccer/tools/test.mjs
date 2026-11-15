// node tools/test.mjs <outdir> <times> [fbx files...] — loads the page in headless Chromium (software WebGL), optionally
// "uploads" FBX files through the real file input, and screenshots the stage at the given times.
import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const [out, times, ...uploads] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const SP = process.env.SP, root = path.resolve(".");
const page0 = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>html,body{margin:0}[hidden]{display:none!important}</style></head><body>${fs.readFileSync("index.html", "utf8")}</body></html>`;
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/") { r.writeHead(200, { "content-type": "text/html" }); return r.end(page0); } const f = path.join(root, "assets", u); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200); fs.createReadStream(f).pipe(r); }).listen(8767);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1200, height: 1000 } });
await p.route("https://cdn.jsdelivr.net/npm/three@0.170.0/**", (rt) => { const rel = rt.request().url().split("three@0.170.0/")[1]; rt.fulfill({ path: `${SP}/three/package/${rel}`, contentType: "text/javascript" }); });
await p.route("**/mp4-muxer.js", (rt) => rt.fulfill({ path: `${SP}/mux/package/build/mp4-muxer.js`, contentType: "text/javascript" }));
await p.route("https://fonts.googleapis.com/**", (rt) => rt.fulfill({ body: "", contentType: "text/css" }));
const logs = []; p.on("pageerror", (e) => logs.push("pageerror " + e.message)); p.on("console", (m) => (m.type() === "error" || m.type() === "warning") && logs.push(m.type() + " " + m.text().slice(0, 200)));
await p.goto("http://localhost:8767/");
await p.waitForFunction(() => document.getElementById("loading").hidden || /Couldn't/.test(document.getElementById("loading").textContent), null, { timeout: 120000 });
if (uploads.length) { await p.setInputFiles("#fileInput", uploads); await p.waitForTimeout(4000); }
console.log("files:", (await p.textContent("#fileList")).replace(/\s+/g, " ").slice(0, 300));
console.log("clip:", await p.textContent("#clipInfo"));
await p.addStyleTag({ content: ".stage{position:fixed!important;left:0!important;top:0!important;width:540px!important;height:960px!important;z-index:99;border-radius:0!important}" });
await p.waitForTimeout(500);
for (const t of times.split(",").map(Number)) { await p.evaluate((t) => window.__studio.renderAt(t), t); await p.waitForTimeout(700); await p.screenshot({ timeout: 180000, path: `${out}/t${t.toFixed(2)}.jpg`, clip: { x: 0, y: 0, width: 540, height: 960 }, type: "jpeg", quality: 85 }); }
if (process.env.EXPORT) { await p.evaluate(() => { window.__EXPORT_FRAMES = 12; window.__EXPORT_W = 540; }); await p.click("#exportBtn"); await p.waitForFunction(() => /Done|failed|encoder/.test(document.getElementById("ptext").textContent), null, { timeout: 300000 }); console.log("export:", await p.textContent("#ptext"), await p.textContent("#saveNote")); }
console.log(logs.slice(0, 15).join("\n") || "no errors"); await b.close(); srv.close();
