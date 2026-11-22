// The courtroom (years of hearings; in 1925 a court-appointed auditor found the owners responsible) and, in its
// clerk's corner, the engineer's desk for the new building rules (a tank plan that now needs an engineer's stamp).
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, text, rng } from "../look/kit";

const panel = () => canvas(512, 512, (g) => {
  const r = rng(9); g.fillStyle = "#5a3418"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 160; k++) { g.strokeStyle = `rgba(${30 + r() * 30},${15 + r() * 15},5,0.25)`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 20 - 10, 340, y + r() * 20 - 10, 512, y); g.stroke(); }
  g.strokeStyle = "rgba(255,220,170,0.15)"; g.lineWidth = 8; g.strokeRect(30, 30, 452, 452); g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 6; g.strokeRect(44, 44, 424, 424);
});
const floorT = () => canvas(512, 512, (g) => { const r = rng(4); for (let k = 0; k < 16; k++) { const v = 110 + r() * 40; g.fillStyle = `rgb(${v},${v * 0.62},${v * 0.36})`; g.fillRect(0, k * 32, 512, 31); g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(r() * 512, k * 32, 3, 32); } });
export const calTex = (year: number) => canvas(256, 320, (g) => {
  g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 256, 320); g.fillStyle = "#7a1515"; g.fillRect(0, 0, 256, 70); text(g, "CALENDAR", 128, 38, 40, "#f6f1e4");
  text(g, String(year), 128, 170, 110, "#1c1814"); for (let k = 0; k < 4; k++) { g.fillStyle = "rgba(28,24,20,0.35)"; g.fillRect(30, 240 + k * 16, 196, 6); }
});
const flagTex = () => canvas(380, 200, (g) => { for (let k = 0; k < 13; k++) { g.fillStyle = k % 2 ? "#ffffff" : "#b22234"; g.fillRect(0, k * 200 / 13, 380, 200 / 13 + 1); } g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, 160, 108); g.fillStyle = "#fff"; for (let i = 0; i < 8; i++) for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(12 + i * 19, 10 + j * 17, 3, 0, 7); g.fill(); } });
export const rulingTex = () => canvas(512, 680, (g) => {
  g.fillStyle = "#f3ecd8"; g.fillRect(0, 0, 512, 680);
  text(g, "AUDITOR'S FINDING", 256, 70, 46, "#1c1814"); text(g, "1925", 256, 130, 40, "#7a1515", INTER);
  for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(28,24,20,0.4)"; g.fillRect(50, 180 + k * 26, 412 - (k % 3) * 50, 8); }
  g.save(); g.translate(256, 480); g.rotate(-0.12); g.strokeStyle = "#b51d24"; g.lineWidth = 10; g.strokeRect(-200, -70, 400, 140); text(g, "OWNERS", 0, -22, 62, "#b51d24"); text(g, "RESPONSIBLE", 0, 38, 56, "#b51d24"); g.restore();
});
export const planTex = (stamped: number) => canvas(1024, 720, (g) => {
  g.fillStyle = "#1f4a8a"; g.fillRect(0, 0, 1024, 720);
  g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1; for (let x = 0; x < 1024; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 720); g.stroke(); } for (let y = 0; y < 720; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  g.strokeStyle = "#e8f0ff"; g.lineWidth = 4; g.strokeRect(160, 160, 300, 400); g.beginPath(); g.ellipse(310, 160, 150, 40, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(310, 560, 150, 40, 0, 0, Math.PI); g.stroke();
  for (let k = 1; k < 8; k++) { g.beginPath(); g.moveTo(160, 160 + k * 50); g.lineTo(460, 160 + k * 50); g.stroke(); }
  text(g, "STORAGE TANK · PLAN", 700, 120, 52, "#e8f0ff"); text(g, "WALL THICKNESS ✓", 700, 230, 34, "#e8f0ff", INTER); text(g, "WATER TEST ✓", 700, 290, 34, "#e8f0ff", INTER); text(g, "INSPECTION ✓", 700, 350, 34, "#e8f0ff", INTER);
  if (stamped > 0) { g.save(); g.translate(720, 520); g.rotate(-0.15); const s = 1 + 1.2 * Math.max(0, 1 - stamped); g.scale(s, s); g.globalAlpha = Math.min(1, stamped * 1.5); g.strokeStyle = "#ff4a4a"; g.lineWidth = 10; g.strokeRect(-210, -80, 420, 160); text(g, "APPROVED", 0, -20, 78, "#ff4a4a"); text(g, "ENGINEER SIGNED", 0, 45, 34, "#ff4a4a", INTER); g.restore(); }
});

export class Court {
  root = new THREE.Group(); cal: THREE.MeshStandardMaterial; plan: THREE.MeshStandardMaterial; calCache = new Map<number, THREE.Texture>(); planCache = new Map<number, THREE.Texture>();
  gavel: THREE.Group; stamp: THREE.Group;
  constructor() {
    const R = this.root, W = 12, D = 11, H = 5.2;
    put(R, new THREE.PlaneGeometry(W, D), MP("#ffffff", 0.35, { map: rep(floorT(), 4, 6), clearcoat: 0.8, clearcoatRoughness: 0.2 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    const wall = M("#ffffff", 0.6, 0, { map: rep(panel(), W / 1.6, 1) });
    put(R, new THREE.PlaneGeometry(W, 2.4), wall, 0, 1.2, -D / 2, { cast: false });
    put(R, new THREE.PlaneGeometry(W, H - 2.4), M("#e8dcc0", 0.85), 0, 2.4 + (H - 2.4) / 2, -D / 2, { cast: false });
    for (const sx of [-1, 1]) { put(R, new THREE.PlaneGeometry(D, 2.4), wall, sx * W / 2, 1.2, 0, { ry: -sx * Math.PI / 2, cast: false }); put(R, new THREE.PlaneGeometry(D, H - 2.4), M("#e8dcc0", 0.85), sx * W / 2, 2.4 + (H - 2.4) / 2, 0, { ry: -sx * Math.PI / 2, cast: false }); }
    put(R, new THREE.PlaneGeometry(W, D), M("#efe6d0", 0.9), 0, H, 0, { rx: Math.PI / 2, cast: false });
    put(R, rbox(W, 0.12, 0.1, 0.02), M("#3a2210", 0.5), 0, 2.4, -D / 2 + 0.05);
    // tall windows with light
    const winT = canvas(256, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff6e0"); gr.addColorStop(1, "#d8e8ff"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512); g.fillStyle = "#3a2210"; g.fillRect(124, 0, 8, 512); for (let y = 0; y < 512; y += 128) g.fillRect(0, y, 256, 8); });
    for (const z of [-2.5, 1.5]) { put(R, new THREE.PlaneGeometry(1.4, 2.8), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: winT, emissiveIntensity: 1.6 }), -W / 2 + 0.02, 2.9, z, { ry: Math.PI / 2, cast: false }); put(R, rbox(0.12, 3.0, 1.6, 0.02), M("#3a2210", 0.5), -W / 2 + 0.05, 2.9, z); }
    // judge's bench, seal, flags, clock, the wall calendar
    const bench = grp(R, 0, 0, -D / 2 + 1.4);
    put(bench, rbox(4.2, 1.5, 1.2, 0.05), MP("#4a2a12", 0.4), 0, 0.75, 0); put(bench, rbox(4.4, 0.08, 1.4, 0.02), MP("#3a2210", 0.3), 0, 1.54, 0);
    for (let k = 0; k < 4; k++) put(bench, rbox(0.8, 0.9, 0.04, 0.02), MP("#5a3418", 0.4), -1.5 + k * 1.0, 0.75, 0.62);
    put(bench, rbox(0.9, 0.06, 1.0, 0.01), MP("#3a2210", 0.3), 0, 0.02, -0.9);
    const seal = canvas(256, 256, (g) => { g.fillStyle = "#c9a55a"; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill(); g.fillStyle = "#3a2210"; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.fill(); text(g, "COURT", 128, 110, 40, "#c9a55a"); text(g, "⚖", 128, 160, 60, "#c9a55a", INTER); });
    put(R, cyl(0.6, 0.6, 0.06, 40), M("#ffffff", 0.3, 0.5, { map: seal }), 0, 3.4, -D / 2 + 0.05, { rx: Math.PI / 2 });
    for (const sx of [-1, 1]) { const f = grp(R, sx * 2.8, 0, -D / 2 + 0.6); put(f, cyl(0.03, 0.03, 2.8, 8), M("#c9a55a", 0.3, 1), 0, 1.4, 0); put(f, new THREE.SphereGeometry(0.06, 10, 8), M("#c9a55a", 0.3, 1), 0, 2.85, 0); put(f, new THREE.PlaneGeometry(1.0, 0.55), M("#ffffff", 0.7, 0, { map: flagTex(), side: THREE.DoubleSide }), 0.52, 2.35, 0, { cast: false }); }
    this.cal = new THREE.MeshStandardMaterial({ map: calTex(1919), roughness: 0.6 });
    put(R, rbox(0.7, 0.88, 0.03, 0.01), this.cal, 3.6, 3.0, -D / 2 + 0.03);
    const clk = canvas(256, 256, (g) => { g.fillStyle = "#fbf7ea"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = "#1c1814"; g.lineWidth = 8; g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(128, 128); g.lineTo(128, 60); g.stroke(); g.beginPath(); g.moveTo(128, 128); g.lineTo(180, 140); g.stroke(); });
    put(R, new THREE.CircleGeometry(0.4, 32), MP("#ffffff", 0.2, { map: clk }), -3.6, 3.4, -D / 2 + 0.03, { cast: false });
    // ruling paper + gavel on the bench
    put(bench, new THREE.PlaneGeometry(0.42, 0.56), M("#ffffff", 0.7, 0, { map: rulingTex() }), 0.75, 1.585, 0.15, { rx: -Math.PI / 2, rz: 0.12, cast: false });
    put(bench, cyl(0.12, 0.12, 0.04, 24), MP("#3a2210", 0.3), -0.6, 1.6, 0.25);
    this.gavel = grp(bench, -0.6, 1.62, 0.25);
    put(this.gavel, cyl(0.06, 0.06, 0.24, 16), MP("#4a2a12", 0.3), 0, 0.06, 0, { rz: Math.PI / 2 }); put(this.gavel, cyl(0.016, 0.02, 0.32, 8), MP("#4a2a12", 0.3), 0, 0.06, 0.18, { rx: Math.PI / 2 });
    // lawyers' tables + public benches + witness box
    for (const sx of [-1, 1]) { const t = grp(R, sx * 2.3, 0, -0.6); put(t, rbox(2.2, 0.06, 1.0, 0.02), MP("#4a2a12", 0.35), 0, 0.78, 0); for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) put(t, rbox(0.06, 0.78, 0.06, 0.01), MP("#3a2210", 0.4), x, 0.39, z); for (let k = 0; k < 3; k++) put(t, rbox(0.3, 0.02 + k * 0.01, 0.4, 0.005), M("#efe6cf", 0.8), -0.6 + k * 0.5, 0.82, 0); }
    for (let row = 0; row < 3; row++) for (const sx of [-1, 1]) { const b = grp(R, sx * 2.6, 0, 2.0 + row * 1.2); put(b, rbox(3.8, 0.08, 0.5, 0.02), MP("#5a3418", 0.4), 0, 0.48, 0); put(b, rbox(3.8, 0.7, 0.06, 0.02), MP("#5a3418", 0.4), 0, 0.85, 0.24); for (const x of [-1.8, 1.8]) put(b, rbox(0.08, 0.48, 0.5, 0.01), MP("#3a2210", 0.4), x, 0.24, 0); }
    put(R, rbox(0.9, 1.0, 0.9, 0.04), MP("#4a2a12", 0.4), 3.4, 0.5, -3.4);
    put(R, rbox(W, 0.9, 0.08, 0.02), MP("#4a2a12", 0.4), 0, 0.45, 1.1);
    // the engineer's desk (clerk's corner, right front): lamp, blueprint, stamp
    const desk = grp(R, 4.2, 0, 3.6, -0.5);
    put(desk, rbox(1.8, 0.07, 1.0, 0.02), MP("#6b4a2a", 0.4), 0, 0.9, 0); for (const [x, z] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) put(desk, rbox(0.06, 0.9, 0.06, 0.01), MP("#3a2210", 0.4), x, 0.45, z);
    this.plan = new THREE.MeshStandardMaterial({ map: planTex(0), roughness: 0.7 });
    put(desk, new THREE.PlaneGeometry(1.2, 0.84), this.plan, -0.15, 0.94, 0, { rx: -Math.PI / 2, cast: false });
    put(desk, cyl(0.12, 0.14, 0.03, 16), M("#c9a55a", 0.3, 1), 0.7, 0.95, -0.3); put(desk, cyl(0.012, 0.012, 0.4, 6), M("#c9a55a", 0.3, 1), 0.7, 1.15, -0.3);
    put(desk, new THREE.ConeGeometry(0.16, 0.18, 20, 1, true), MP("#1f6b3a", 0.3, { side: THREE.DoubleSide }), 0.62, 1.36, -0.24, { rz: 0.6 });
    put(desk, new THREE.SphereGeometry(0.05, 10, 8), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff0c0"; g.fillRect(0, 0, 8, 8); }), 4), 0.58, 1.3, -0.22, { cast: false });
    const dl = new THREE.PointLight("#ffd9a0", 2.0, 2.5, 2); dl.position.set(0.5, 1.25, -0.15); desk.add(dl);
    this.stamp = grp(desk, 0.45, 0.94, 0.15);
    put(this.stamp, cyl(0.07, 0.07, 0.05, 20), MP("#7a1515", 0.4), 0, 0.025, 0); put(this.stamp, cyl(0.025, 0.035, 0.14, 12), MP("#3a2210", 0.3), 0, 0.12, 0); put(this.stamp, new THREE.SphereGeometry(0.045, 12, 8), MP("#3a2210", 0.3), 0, 0.2, 0);
    // lights
    R.add(new THREE.HemisphereLight("#fff2dc", "#5a3418", 0.75));
    const sunIn = new THREE.DirectionalLight("#fff0d0", 2.6); sunIn.position.set(-9, 6, 0); sunIn.target.position.set(1, 0, -1); sunIn.castShadow = true; sunIn.shadow.mapSize.set(2048, 2048);
    Object.assign(sunIn.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 0.5, far: 25 }); sunIn.shadow.bias = -0.0005; R.add(sunIn, sunIn.target);
    const fill = new THREE.DirectionalLight("#dfe6ff", 0.8); fill.position.set(4, 4, 8); R.add(fill);
    for (const [x, z] of [[-2, -2], [2, -2], [0, 2.5]] as const) { const p = new THREE.PointLight("#ffe2b0", 3, 6, 2); p.position.set(x, 4.6, z); R.add(p); put(R, new THREE.SphereGeometry(0.15, 12, 8), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff0c8"; g.fillRect(0, 0, 8, 8); }), 3), x, 4.7, z, { cast: false }); put(R, cyl(0.01, 0.01, 0.5, 4), M("#222", 0.5), x, 4.95, z, { cast: false }); }
  }
  setYear(y: number) { if (!this.calCache.has(y)) this.calCache.set(y, calTex(y)); this.cal.map = this.calCache.get(y)!; }
  setStamp(u: number) { const q = Math.round(u * 10) / 10; if (!this.planCache.has(q)) this.planCache.set(q, planTex(q)); this.plan.map = this.planCache.get(q)!; }
}
