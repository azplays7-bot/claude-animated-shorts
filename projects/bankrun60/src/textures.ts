// Canvas-painted textures (fonts are loaded before any of these run; see Video.tsx).
import * as THREE from "three";
import { COL } from "./timeline";
export { rr };

const cache = new Map<string, THREE.CanvasTexture>();
export const tex = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, after?: (t: THREE.CanvasTexture) => void) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  after?.(t);
  cache.set(key, t);
  return t;
};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

/** the Bitcoin "B" mark: drawn with the font's B plus the two vertical strokes, centred at (x, y), height s */
export const btcMark = (g: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string) => {
  g.save();
  g.fillStyle = fill; g.strokeStyle = fill;
  g.font = `${s}px Anton`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("B", x, y + s * 0.03);
  g.lineWidth = s * 0.075; g.lineCap = "butt";
  for (const dx of [-0.07, 0.07]) {
    g.beginPath(); g.moveTo(x + dx * s, y - s * 0.56); g.lineTo(x + dx * s, y - s * 0.38);
    g.moveTo(x + dx * s, y + s * 0.4); g.lineTo(x + dx * s, y + s * 0.58); g.stroke();
  }
  g.restore();
};

/** coin face: gold disc, rim ring, B mark (also used as a bump map) */
export const coinFace = () => tex("coin", 512, 512, (g, w) => {
  const r = w / 2;
  const grd = g.createRadialGradient(r * 0.8, r * 0.7, 10, r, r, r);
  grd.addColorStop(0, "#ffe9a6"); grd.addColorStop(0.55, "#ffc23d"); grd.addColorStop(1, "#c77d00");
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
  g.strokeStyle = "#a86400"; g.lineWidth = 18; g.beginPath(); g.arc(r, r, r * 0.86, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "#ffe08a"; g.lineWidth = 6; g.beginPath(); g.arc(r, r, r * 0.8, 0, Math.PI * 2); g.stroke();
  g.save(); g.translate(r, r); g.rotate(0.24); btcMark(g, 0, 0, r * 1.05, "#9a5a00"); g.restore();
  g.save(); g.translate(r - 6, r - 6); g.rotate(0.24); btcMark(g, 0, 0, r * 1.05, "#fff1bf"); g.restore();
}, (t) => { t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; });  // cylinder caps map the image 90 degrees turned

/** US $20 bill, stylised (no real banknote artwork) */
export const bill = () => tex("bill", 1024, 436, (g, w, h) => {
  g.fillStyle = "#cfe3c4"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#3d6b47"; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32);
  g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80);
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(61,107,71,${0.06 + (i % 3) * 0.03})`; g.beginPath(); g.ellipse(w / 2, h / 2, 60 + i * 9, 30 + i * 5, 0, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = "#e9f2e3"; g.beginPath(); g.ellipse(w / 2, h / 2, 120, 150, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#3d6b47"; g.lineWidth = 6; g.stroke();
  g.fillStyle = "#3d6b47"; g.font = "180px Anton"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("20", w / 2, h / 2 + 6);
  g.font = "96px Anton"; for (const [x, y] of [[110, 100], [w - 110, 100], [110, h - 90], [w - 110, h - 90]]) g.fillText("20", x, y);
  g.font = "38px Anton"; g.fillText("TWENTY DOLLARS", w / 2, h - 58);
});

/** the 2010 computer screen: early wallet client look, glowing B appears with `glow` 0..1 */
export const oldScreen = (glow: number) => tex("screen" + Math.round(glow * 8), 640, 480, (g, w, h) => {
  g.fillStyle = "#101a2a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#c9ced8"; g.fillRect(0, 0, w, 34); g.fillStyle = "#1f2b45"; g.font = "22px Inter"; g.fillText("Bitcoin", 14, 24);
  g.fillStyle = "#26324c"; for (let i = 0; i < 6; i++) g.fillRect(24, 300 + i * 26, 360 - i * 40, 12);
  if (glow > 0) {
    g.save(); g.globalAlpha = glow;
    const grd = g.createRadialGradient(w * 0.68, h * 0.5, 4, w * 0.68, h * 0.5, 170);
    grd.addColorStop(0, "rgba(247,147,26,0.9)"); grd.addColorStop(1, "rgba(247,147,26,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = COL.orange; g.beginPath(); g.arc(w * 0.68, h * 0.5, 100, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(w * 0.68, h * 0.5); g.rotate(0.24); btcMark(g, 0, 0, 120, "#fff"); g.restore();
    g.restore();
  }
  for (let y = 0; y < h; y += 4) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y, w, 2); } // scanlines
});

/** calendar page for one month */
export const calPage = (month: string, year: string) => tex(`cal${month}${year}`, 512, 600, (g, w, h) => {
  g.fillStyle = "#fbfaf6"; rr(g, 0, 0, w, h, 26); g.fill();
  g.fillStyle = "#e23a3a"; rr(g, 0, 0, w, 170, 26); g.fill(); g.fillRect(0, 120, w, 50);
  g.fillStyle = "#fff"; g.font = "120px Anton"; g.textAlign = "center"; g.fillText(month, w / 2, 140);
  g.fillStyle = "#1b2133"; g.font = "170px Anton"; g.fillText(year, w / 2, 410);
  g.fillStyle = "#c9ccd6"; for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) g.fillRect(40 + c * 64, 460 + r * 40, 44, 24);
  g.fillStyle = "#2e9a57"; g.beginPath(); g.arc(w - 70, 470, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff"; g.font = "42px Anton"; g.fillText("$20", w - 70, 486);
});

/** tabloid front page (generic masthead, no real newspaper) */
export const paper = (head: string, i: number) => tex("paper" + i, 512, 680, (g, w, h) => {
  g.fillStyle = "#f2efe6"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#111"; g.font = "52px Anton"; g.textAlign = "center"; g.fillText("THE DAILY LEDGER", w / 2, 70);
  g.fillRect(24, 88, w - 48, 6);
  g.font = "92px Anton"; const words = head.split(" "); let line = "", y = 190;
  for (const wd of words) { const tst = line ? line + " " + wd : wd; if (g.measureText(tst).width > w - 50) { g.fillText(line, w / 2, y); y += 96; line = wd; } else line = tst; }
  g.fillText(line, w / 2, y);
  g.fillStyle = "#c9c4b4"; g.fillRect(30, y + 40, w - 60, 200);
  g.strokeStyle = i % 2 ? "#d22" : "#1a9b4b"; g.lineWidth = 10; g.beginPath(); g.moveTo(50, y + 210);
  for (let k = 0; k <= 10; k++) g.lineTo(50 + k * (w - 100) / 10, y + 210 - k * 15 - Math.sin(k * 1.7 + i) * 22); g.stroke();
  g.fillStyle = "#9d988a"; for (let r = 0; r < 6; r++) g.fillRect(30, y + 270 + r * 26, w - 60 - (r % 3) * 50, 12);
});

/** red crash monitor: falling chart and a big percentage */
export const crashScreen = (label: string, pct: string, i: number) => tex("crash" + i, 512, 320, (g, w, h) => {
  g.fillStyle = "#1a0408"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,53,80,0.25)"; g.lineWidth = 1;
  for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.strokeStyle = "#ff3550"; g.lineWidth = 7; g.beginPath(); const r = (k: number) => Math.sin(k * 3.1 + i * 2) * 14;
  for (let k = 0; k <= 20; k++) { const x = 20 + k * (w - 40) / 20, y = 60 + Math.pow(k / 20, 1.4) * 190 + r(k); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  g.fillStyle = "#ff3550"; g.font = "96px Anton"; g.textAlign = "right"; g.fillText(pct, w - 24, 110);
  g.fillStyle = "#ffb3bd"; g.font = "34px Anton"; g.fillText(label, w - 24, 150);
});

/** text label for 3D (year cards, axis labels); transparent background */
export const label = (text: string, size: number, color: string, key = "") => tex(`lbl${text}${size}${color}${key}`, Math.ceil(size * (0.62 * text.length + 0.6)), Math.ceil(size * 1.3), (g, w, h) => {
  g.fillStyle = color; g.font = `${size}px Anton`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + size * 0.04);
});

/** a soft round glow sprite */
export const glowDot = () => tex("glow", 256, 256, (g, w) => {
  const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
});

/** wood planks for the 2010 bedroom */
export const wood = () => {
  const t = tex("wood", 512, 512, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = ["#7a5236", "#835a3b", "#6f4a30", "#8a603f"][i % 4]; g.fillRect(0, i * 64, w, 64); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, i * 64, w, 3); }
    for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(40,20,10,${0.05 + (k % 5) * 0.02})`; g.fillRect((k * 97) % w, (k * 53) % h, 60 + (k % 7) * 10, 2); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
};

/** night window with stars and a crescent moon */
export const nightWindow = () => tex("window", 512, 512, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#0b1a46"); grd.addColorStop(1, "#24407c");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${0.4 + (k % 4) * 0.15})`; g.fillRect((k * 131) % w, (k * 71) % (h * 0.7), 3, 3); }
  g.fillStyle = "#fff6d6"; g.beginPath(); g.arc(w * 0.72, h * 0.28, 46, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#0e1e4e"; g.beginPath(); g.arc(w * 0.75, h * 0.25, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#13203a"; for (let k = 0; k < 7; k++) g.fillRect(k * 76, h - 70 - (k % 3) * 40, 70, 200);
  g.fillStyle = "#ffd36b"; for (let k = 0; k < 18; k++) g.fillRect(10 + (k * 29) % w, h - 50 - (k % 4) * 22, 8, 10);
});

/** generic green banknote with a denomination (not a real currency design) */
export const cash = (den: string) => tex("cash" + den, 1024, 436, (g, w, h) => {
  g.fillStyle = "#bfe3b0"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#2f7a46"; g.lineWidth = 16; g.strokeRect(14, 14, w - 28, h - 28); g.lineWidth = 3; g.strokeRect(40, 40, w - 80, h - 80);
  for (let i = 0; i < 30; i++) { g.strokeStyle = `rgba(47,122,70,${0.07 + (i % 3) * 0.03})`; g.beginPath(); g.ellipse(w / 2, h / 2, 50 + i * 10, 26 + i * 5.5, 0, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = "#e3f4dc"; g.beginPath(); g.arc(w / 2, h / 2, 128, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#2f7a46"; g.lineWidth = 6; g.stroke();
  g.fillStyle = "#2f7a46"; g.font = "200px Anton"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", w / 2, h / 2 + 8);
  g.font = "96px Anton"; for (const [x, y] of [[120, 100], [w - 120, 100], [120, h - 92], [w - 120, h - 92]]) g.fillText(den, x, y);
});
/** gold coin with a $ */
export const dollarFace = () => tex("dcoin", 512, 512, (g, w) => {
  const r = w / 2;
  const grd = g.createRadialGradient(r * 0.8, r * 0.7, 10, r, r, r);
  grd.addColorStop(0, "#fff0b3"); grd.addColorStop(0.55, "#ffc83d"); grd.addColorStop(1, "#c78400");
  g.fillStyle = grd; g.fillRect(0, 0, w, w);
  g.strokeStyle = "#a86a00"; g.lineWidth = 18; g.beginPath(); g.arc(r, r, r * 0.86, 0, Math.PI * 2); g.stroke();
  g.font = `${r * 1.1}px Anton`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillStyle = "#9a5f00"; g.fillText("$", r + 5, r + 10); g.fillStyle = "#fff4c4"; g.fillText("$", r - 2, r + 2);
}, (t) => { t.center.set(0.5, 0.5); t.rotation = -Math.PI / 2; });
/** polished marble checker floor */
export const marble = () => { const t = tex("marble", 512, 512, (g, w) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#e9e4da" : "#cfc6b6"; g.fillRect(i * 128, j * 128, 128, 128); }
  for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(120,110,95,${0.08 + (k % 4) * 0.03})`; g.lineWidth = 1 + (k % 3); g.beginPath();
    g.moveTo((k * 89) % w, (k * 37) % w); g.bezierCurveTo((k * 131) % w, (k * 71) % w, (k * 53) % w, (k * 97) % w, (k * 157) % w, (k * 113) % w); g.stroke(); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); return t; };
/** office tower facade: rows of lit windows */
export const tower = () => { const t = tex("tower", 256, 512, (g, w, h) => {
  g.fillStyle = "#1d3557"; g.fillRect(0, 0, w, h);
  for (let y = 8; y < h; y += 32) for (let x = 8; x < w; x += 32) { const lit = ((x * 7 + y * 13) % 5) > 1; g.fillStyle = lit ? "#ffe8a3" : "#5b8bd0"; g.fillRect(x, y, 22, 22); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 10); return t; };
/** house siding */
export const siding = (c: string) => { const t = tex("siding" + c, 256, 256, (g, w, h) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y, w, 3); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t; };
/** a bond certificate */
export const bond = () => tex("bond", 600, 420, (g, w, h) => {
  g.fillStyle = "#fbf3dc"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#8a6a2a"; g.lineWidth = 14; g.strokeRect(12, 12, w - 24, h - 24); g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68);
  g.fillStyle = "#5b4513"; g.font = "86px Anton"; g.textAlign = "center"; g.fillText("BOND", w / 2, 150);
  g.font = "34px Inter"; g.fillText("GOVERNMENT", w / 2, 205);
  g.fillStyle = "#c8a24a"; g.beginPath(); g.arc(w / 2, 300, 52, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#fff6d8"; g.font = "56px Anton"; g.fillText("$", w / 2, 320);
});
/** a tiny "company" tile for the mutual-fund basket (generic icons, no real brands) */
export const company = (i: number) => tex("co" + i, 256, 256, (g, w) => {
  const bg = ["#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#06b6d4", "#ec4899", "#84cc16"][i % 8];
  g.fillStyle = bg; rr(g, 0, 0, w, w, 40); g.fill();
  g.fillStyle = "#fff"; g.strokeStyle = "#fff"; g.lineWidth = 14; const c = w / 2;
  switch (i % 8) {
    case 0: g.fillRect(60, 110, 136, 90); g.beginPath(); g.moveTo(60, 110); g.lineTo(100, 70); g.lineTo(100, 110); g.lineTo(140, 70); g.lineTo(140, 110); g.lineTo(196, 60); g.lineTo(196, 110); g.fill(); break; // factory
    case 1: g.beginPath(); g.arc(c, c, 70, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(c - 70, c); g.lineTo(c + 70, c); g.moveTo(c, c - 70); g.lineTo(c, c + 70); g.stroke(); break; // globe
    case 2: g.beginPath(); g.moveTo(c, 50); g.lineTo(200, 200); g.lineTo(56, 200); g.closePath(); g.fill(); break; // energy
    case 3: g.fillRect(70, 60, 116, 136); g.fillStyle = bg; g.fillRect(90, 80, 76, 60); break; // tech screen
    case 4: g.fillRect(50, 120, 156, 50); g.beginPath(); g.arc(90, 180, 22, 0, Math.PI * 2); g.arc(170, 180, 22, 0, Math.PI * 2); g.fill(); g.fillRect(80, 90, 90, 40); break; // car
    case 5: g.beginPath(); g.moveTo(c, 50); g.bezierCurveTo(220, 90, 200, 200, c, 210); g.bezierCurveTo(56, 200, 36, 90, c, 50); g.fill(); break; // water/health
    case 6: g.fillRect(60, 80, 136, 110); g.fillStyle = bg; g.fillRect(80, 100, 96, 20); g.fillRect(80, 135, 70, 20); break; // store
    default: g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 0.8; g.lineTo(c + 80 * Math.cos(a), c + 80 * Math.sin(a)); } g.closePath(); g.fill();
  }
});
/** a sign board with text */
export const sign = (text: string, bg: string, fg: string, w = 1024, h = 256) => tex(`sign${text}${bg}${fg}`, w, h, (g) => {
  g.fillStyle = bg; rr(g, 0, 0, w, h, 30); g.fill();
  g.fillStyle = fg; g.font = `${h * 0.62}px Anton`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h / 2 + h * 0.03);
});
