// "The Woman Who Fooled Doctors With Rabbits" (Mary Toft, 1726), detailed style. Five small sets placed 100 m apart:
// the bedroom (origin: four-poster, panelled walls, fireplace, candles, leaded window, a rabbit tally slate, Howard's
// writing desk, the doctors' instrument tray), the throne room (x 100), a London street with Lacy's Bagnio and a print
// shop (x 200), the Godalming cottage (x 300) and a Bridewell cell (x 400). Cartoon bunnies hop around. Nothing graphic.
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, text, rng, ink } from "../look/kit";

export const SETS = { bed: new THREE.Vector3(0, 0, 0), throne: new THREE.Vector3(100, 0, 0), street: new THREE.Vector3(200, 0, 0), cottage: new THREE.Vector3(300, 0, 0), jail: new THREE.Vector3(400, 0, 0) };
const SERIF = "Georgia, 'Times New Roman', serif";

const panel = (base: string) => canvas(512, 512, (g) => {
  const r = rng(9); g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 140; k++) { g.strokeStyle = `rgba(30,15,5,${0.1 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 512; g.moveTo(0, y); g.bezierCurveTo(170, y + r() * 16 - 8, 340, y + r() * 16 - 8, 512, y); g.stroke(); }
  g.strokeStyle = "rgba(255,230,190,0.18)"; g.lineWidth = 8; g.strokeRect(36, 36, 440, 440); g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 6; g.strokeRect(50, 50, 412, 412);
});
const plank = () => canvas(512, 512, (g) => { const r = rng(4); for (let k = 0; k < 8; k++) { const v = 120 + r() * 40; g.fillStyle = `rgb(${v},${v * 0.66},${v * 0.4})`; g.fillRect(0, k * 64, 512, 62); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, k * 64 + 62, 512, 2); g.fillRect(r() * 512, k * 64, 3, 64); } });
const brick = (base: string, seed: number) => canvas(1024, 1024, (g) => { const r = rng(seed); g.fillStyle = "#c8bca8"; g.fillRect(0, 0, 1024, 1024); for (let row = 0; row < 32; row++) for (let c = -1; c < 9; c++) { const x = c * 128 + (row % 2 ? 64 : 0) + 3, y = row * 32 + 3; const col = new THREE.Color(base).multiplyScalar(0.82 + r() * 0.34); g.fillStyle = `#${col.getHexString()}`; g.fillRect(x, y, 122, 26); } });
const stone = () => canvas(512, 512, (g) => { const r = rng(7); g.fillStyle = "#6a665e"; g.fillRect(0, 0, 512, 512); for (let row = 0; row < 8; row++) for (let c = -1; c < 5; c++) { const v = 90 + r() * 50; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(c * 128 + (row % 2 ? 64 : 0) + 4, row * 64 + 4, 120, 56); } });
const cobble = () => canvas(1024, 1024, (g) => { const r = rng(13); g.fillStyle = "#4e4a46"; g.fillRect(0, 0, 1024, 1024); for (let row = 0; row < 24; row++) for (let c = -1; c < 21; c++) { const x = c * 52 + (row % 2 ? 26 : 0), y = row * 43, v = 95 + r() * 60; g.fillStyle = `rgb(${v + 8},${v},${v - 6})`; g.beginPath(); g.ellipse(x + 26, y + 21, 23, 18, 0, 0, 7); g.fill(); } });
const quilt = () => canvas(512, 512, (g) => { const cs = ["#c86a6a", "#e8d8b0", "#6a8ac8", "#e8c86a", "#8ab86a"]; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = cs[(i * 3 + j * 2) % 5]; g.fillRect(i * 64, j * 64, 64, 64); g.strokeStyle = "rgba(255,255,255,0.5)"; g.setLineDash([6, 6]); g.lineWidth = 3; g.strokeRect(i * 64 + 4, j * 64 + 4, 56, 56); } });
export const slateTex = (n: number, hoax: boolean) => canvas(512, 640, (g) => {
  g.fillStyle = "#2a2e2a"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "#8a5a30"; g.lineWidth = 26; g.strokeRect(0, 0, 512, 640);
  text(g, "RABBITS", 256, 90, 72, "#f2f2ea");
  for (let k = 0; k < n; k++) { const grp_ = Math.floor(k / 5), j = k % 5, x0 = 70 + (grp_ % 2) * 200, y0 = 180 + Math.floor(grp_ / 2) * 140; g.strokeStyle = "#f2f2ea"; g.lineWidth = 9; g.lineCap = "round"; g.beginPath(); if (j < 4) { g.moveTo(x0 + j * 30, y0); g.lineTo(x0 + j * 30, y0 + 90); } else { g.moveTo(x0 - 15, y0 + 75); g.lineTo(x0 + 110, y0 + 15); } g.stroke(); }
  text(g, String(n), 256, 560, 96, "#ffd88a");
  if (hoax) { g.save(); g.translate(256, 330); g.rotate(-0.25); g.strokeStyle = "#ff4a4a"; g.lineWidth = 14; g.strokeRect(-210, -80, 420, 160); text(g, "HOAX!", 0, 6, 130, "#ff4a4a"); g.restore(); }
});
const letterTex = () => canvas(512, 640, (g) => {
  g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 512, 640);
  text(g, "Most Urgent", 256, 70, 44, "#3a2210", SERIF); text(g, "To the King's", 256, 140, 50, "#3a2210", SERIF); text(g, "Physicians", 256, 200, 50, "#3a2210", SERIF);
  for (let k = 0; k < 9; k++) { g.strokeStyle = "rgba(58,34,16,0.5)"; g.lineWidth = 3; g.beginPath(); g.moveTo(60, 270 + k * 34); for (let x = 60; x < 450 - (k % 3) * 40; x += 12) g.lineTo(x, 270 + k * 34 + Math.sin(x * 0.3) * 4); g.stroke(); }
  g.fillStyle = "#8a1d1d"; g.beginPath(); g.arc(380, 580, 34, 0, 7); g.fill(); text(g, "J.H.", 380, 584, 24, "#efe2c0", SERIF);
});
const printTex = () => canvas(768, 600, (g) => {
  g.fillStyle = "#efe6d0"; g.fillRect(0, 0, 768, 600); g.strokeStyle = "#2a2018"; g.lineWidth = 6; g.strokeRect(20, 20, 728, 560);
  text(g, "CUNICULARII", 384, 70, 64, "#2a2018", SERIF); text(g, "or The Wise Men of Godliman in Consultation", 384, 116, 26, "#2a2018", SERIF);
  // our own sketch: three gaping doctors in wigs around a bed, a rabbit hopping off
  g.strokeStyle = "#2a2018"; g.lineWidth = 4;
  g.strokeRect(470, 300, 230, 180); g.beginPath(); g.moveTo(470, 300); g.lineTo(470, 180); g.moveTo(700, 300); g.lineTo(700, 180); g.stroke();
  for (let k = 0; k < 3; k++) { const x = 130 + k * 110; g.beginPath(); g.arc(x, 260, 38, 0, 7); g.stroke(); g.beginPath(); g.arc(x - 14, 252, 6, 0, 7); g.arc(x + 14, 252, 6, 0, 7); g.stroke(); g.beginPath(); g.ellipse(x, 284, 10, 14, 0, 0, 7); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 40, 270, 14, 0, 7); g.stroke(); } g.strokeRect(x - 34, 300, 68, 160); }
  g.beginPath(); g.ellipse(600, 520, 30, 20, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(625, 490, 8, 26, 0.3, 0, 7); g.stroke(); g.beginPath(); g.ellipse(640, 492, 8, 26, 0.6, 0, 7); g.stroke();
  text(g, "after W. Hogarth, 1726", 384, 560, 22, "#2a2018", SERIF);
});
const broadsideTex = () => canvas(512, 720, (g) => { g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 512, 720); g.strokeStyle = "#2a2018"; g.lineWidth = 8; g.strokeRect(14, 14, 484, 692); text(g, "FOLLOW", 256, 150, 110, "#7a1d1d"); text(g, "for more", 256, 260, 70, "#2a2018", SERIF); text(g, "WEIRD", 256, 380, 120, "#7a1d1d"); text(g, "HISTORY", 256, 500, 110, "#7a1d1d"); text(g, "★ 1726 ★", 256, 620, 50, "#2a2018", SERIF); });
const noticeTex = () => canvas(512, 640, (g) => { g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 512, 640); g.strokeStyle = "#2a2018"; g.lineWidth = 6; g.strokeRect(14, 14, 484, 612); text(g, "BRIDEWELL", 256, 90, 64, "#2a2018"); text(g, "MARY TOFT", 256, 220, 64, "#7a1d1d"); text(g, "a Notorious", 256, 330, 50, "#2a2018", SERIF); text(g, "and Vile", 256, 400, 50, "#2a2018", SERIF); text(g, "CHEAT", 256, 500, 96, "#7a1d1d"); });
const signBoard = (s: string, sub = "") => canvas(1024, 320, (g) => { g.fillStyle = "#1d2a4a"; g.fillRect(0, 0, 1024, 320); g.strokeStyle = "#e0b84a"; g.lineWidth = 14; g.strokeRect(14, 14, 996, 292); text(g, s, 512, sub ? 130 : 165, 120, "#e0b84a", SERIF); if (sub) text(g, sub, 512, 250, 50, "#f2ecd8", SERIF); });

export class Bunny {
  root: THREE.Group; body: THREE.Group; ears: THREE.Mesh[] = [];
  constructor(parent: THREE.Object3D, col: string, s = 1) {
    this.root = grp(parent); this.root.scale.setScalar(s);
    this.body = grp(this.root);
    const fur = MP(col, 0.85, { clearcoat: 0, sheen: 0.8, sheenColor: new THREE.Color("#ffffff") });
    ink(put(this.body, new THREE.SphereGeometry(0.12, 18, 14), fur, 0, 0.11, 0, { s: [1, 0.9, 1.25] }), 0.006);
    ink(put(this.body, new THREE.SphereGeometry(0.08, 16, 12), fur, 0, 0.2, 0.12), 0.006);
    for (const sx of [-1, 1]) {
      const e = put(this.body, new THREE.CapsuleGeometry(0.022, 0.12, 6, 10), fur, sx * 0.035, 0.32, 0.1, { rz: sx * 0.2, rx: -0.2 }); ink(e, 0.004); this.ears.push(e);
      put(this.body, new THREE.SphereGeometry(0.018, 10, 8), M("#111", 0.2), sx * 0.04, 0.22, 0.19, { cast: false });
      put(this.body, new THREE.SphereGeometry(0.006, 6, 4), M("#fff", 0.2), sx * 0.044, 0.227, 0.205, { cast: false });
    }
    put(this.body, new THREE.SphereGeometry(0.012, 8, 6), M("#e88aa0", 0.4), 0, 0.19, 0.2);
    put(this.body, new THREE.SphereGeometry(0.04, 10, 8), MP("#fbfbf6", 0.9, { clearcoat: 0 }), 0, 0.14, -0.15);
  }
  pose(t: number, hopping: number) {
    const ph = (t * 2.2) % 1, h = hopping * Math.max(0, Math.sin(ph * Math.PI)) * 0.14;
    this.body.position.y = h; this.body.rotation.x = -hopping * 0.4 * Math.cos(ph * Math.PI);
    this.ears.forEach((e, i) => (e.rotation.x = -0.2 + 0.25 * Math.sin(t * 6 + i)));
  }
}

export class Georgian {
  root = new THREE.Group(); bed = new THREE.Group(); throne = new THREE.Group(); street = new THREE.Group(); cottage = new THREE.Group(); jail = new THREE.Group();
  slate!: THREE.MeshStandardMaterial; slateCache = new Map<string, THREE.Texture>(); letter!: THREE.Group; tray!: THREE.Group;
  sunCottage!: THREE.DirectionalLight; sunStreet!: THREE.DirectionalLight;
  constructor() {
    for (const [k, v] of Object.entries(SETS)) { const g = (this as unknown as Record<string, THREE.Group>)[k]; g.position.copy(v); this.root.add(g); }
    this.buildBed(this.bed); this.buildThrone(this.throne); this.buildStreet(this.street); this.buildCottage(this.cottage); this.buildJail(this.jail);
  }
  room(R: THREE.Object3D, w: number, d: number, h: number, wall: THREE.Material, floor: THREE.Material, ceil = "#efe6d0") {
    put(R, new THREE.PlaneGeometry(w, d), floor, 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(w, h), wall, 0, h / 2, -d / 2, { cast: false });
    for (const sx of [-1, 1]) put(R, new THREE.PlaneGeometry(d, h), wall, sx * w / 2, h / 2, 0, { ry: -sx * Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(w, h), wall, 0, h / 2, d / 2, { ry: Math.PI, cast: false });
    put(R, new THREE.PlaneGeometry(w, d), M(ceil, 0.9), 0, h, 0, { rx: Math.PI / 2, cast: false });
  }
  buildBed(R: THREE.Object3D) {
    this.room(R, 8, 8, 3.4, M("#ffffff", 0.7, 0, { map: rep(panel("#7a5232"), 4, 1.6) }), MP("#ffffff", 0.45, { map: rep(plank(), 4, 4), clearcoat: 0.6 }));
    // four-poster bed: posts, canopy, curtains, mattress, pillows, quilt
    const B = grp(R, 0, 0, -2.2);
    const wood = MP("#5a3418", 0.35);
    for (const [x, z] of [[-1.0, -1.1], [1.0, -1.1], [-1.0, 1.1], [1.0, 1.1]]) put(B, cyl(0.06, 0.07, 2.4, 12), wood, x, 1.2, z);
    put(B, rbox(2.2, 0.15, 2.4, 0.03), wood, 0, 2.4, 0);
    const cur = MP("#8a1d2a", 0.8, { side: THREE.DoubleSide, clearcoat: 0, sheen: 0.6 });
    put(B, new THREE.BoxGeometry(2.25, 0.35, 2.45), cur, 0, 2.2, 0);
    for (const sx of [-1, 1]) for (const z of [-0.95, 0.95]) put(B, new THREE.CylinderGeometry(0.16, 0.22, 2.0, 12, 1, true), cur, sx * 1.02, 1.3, z);
    put(B, rbox(2.0, 0.45, 2.2, 0.06), wood, 0, 0.35, 0);
    put(B, rbox(1.9, 0.25, 2.1, 0.08), MP("#fbf8f0", 0.8, { clearcoat: 0 }), 0, 0.68, 0);
    put(B, rbox(1.95, 0.12, 1.5, 0.05), MP("#ffffff", 0.8, { map: quilt(), clearcoat: 0 }), 0, 0.82, 0.3);
    for (const sx of [-1, 1]) put(B, new THREE.SphereGeometry(0.28, 16, 12), MP("#fbf8f0", 0.8, { clearcoat: 0 }), sx * 0.45, 0.88, -0.75, { s: [1.3, 0.5, 0.8] });
    put(B, rbox(2.0, 1.2, 0.08, 0.03), wood, 0, 1.25, -1.1);
    // fireplace with a glowing fire, mantel candles
    const F = grp(R, -3.95, 0, 0.6, Math.PI / 2);
    put(F, rbox(1.8, 1.4, 0.4, 0.03), MP("#e8e0d0", 0.5), 0, 0.7, 0.05);
    put(F, rbox(1.0, 0.8, 0.42, 0.02), M("#1a1410", 0.9), 0, 0.45, 0.06);
    put(F, rbox(2.0, 0.1, 0.5, 0.02), MP("#e8e0d0", 0.5), 0, 1.45, 0.1);
    const fireT = canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 48, 2, 32, 40, 32); gr.addColorStop(0, "#fff0a0"); gr.addColorStop(0.5, "#ff8a2a"); gr.addColorStop(1, "rgba(120,20,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    put(F, new THREE.PlaneGeometry(0.7, 0.55), new THREE.MeshBasicMaterial({ map: fireT, transparent: true, color: new THREE.Color(3, 3, 3) }), 0, 0.35, 0.3, { cast: false });
    const fl = new THREE.PointLight("#ff9a4a", 5, 6, 2); fl.position.set(0, 0.5, 0.8); F.add(fl);
    const candle = (P: THREE.Object3D, x: number, y: number, z: number) => { put(P, cyl(0.03, 0.03, 0.22, 10), MP("#f8f2e0", 0.4), x, y + 0.11, z); put(P, new THREE.SphereGeometry(0.025, 8, 6), glow(fireT, 4), x, y + 0.26, z, { s: [0.7, 1.4, 0.7], cast: false }); put(P, cyl(0.06, 0.07, 0.03, 12), M("#c9a55a", 0.3, 1), x, y + 0.01, z); };
    for (const x of [-0.7, 0.7]) candle(F, x, 1.5, 0.1);
    // leaded window with daylight, a chair, washstand, a basket for the bunnies, the tally slate, Howard's desk
    const winT = canvas(256, 384, (g) => { g.fillStyle = "#cfe6ff"; g.fillRect(0, 0, 256, 384); g.strokeStyle = "#3a3a3a"; g.lineWidth = 3; for (let k = -400; k < 400; k += 40) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 384, 384); g.stroke(); g.beginPath(); g.moveTo(k + 384, 0); g.lineTo(k, 384); g.stroke(); } g.strokeStyle = "#5a3418"; g.lineWidth = 16; g.strokeRect(0, 0, 256, 384); });
    put(R, new THREE.PlaneGeometry(1.2, 1.7), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: winT, emissiveIntensity: 1.4 }), 3.98, 1.8, -0.5, { ry: -Math.PI / 2, cast: false });
    const win = new THREE.DirectionalLight("#fff2d8", 1.6); win.position.set(6, 3, -0.5); win.target.position.set(0, 0.5, -1.5); win.castShadow = true; win.shadow.mapSize.set(1024, 1024); R.add(win, win.target);
    this.slate = new THREE.MeshStandardMaterial({ map: slateTex(0, false), roughness: 0.8 });
    put(R, rbox(0.8, 1.0, 0.04, 0.02), this.slate, 1.9, 1.7, -3.97);
    const bk = grp(R, 1.5, 0, -0.6);
    const bt = canvas(256, 128, (g) => { for (let x = 0; x < 256; x += 16) for (let y = 0; y < 128; y += 16) { g.fillStyle = (x + y) % 32 ? "#b8925a" : "#8a6a3a"; g.fillRect(x, y, 16, 16); } });
    put(bk, new THREE.CylinderGeometry(0.4, 0.32, 0.3, 24, 1, true), MP("#ffffff", 0.8, { map: rep(bt, 4, 1), side: THREE.DoubleSide, clearcoat: 0 }), 0, 0.15, 0);
    put(bk, cyl(0.32, 0.32, 0.02, 24), M("#8a6a3a", 0.8), 0, 0.02, 0); put(bk, new THREE.TorusGeometry(0.4, 0.03, 8, 30), M("#8a6a3a", 0.8), 0, 0.3, 0, { rx: Math.PI / 2 });
    put(bk, new THREE.TorusGeometry(0.3, 0.025, 8, 24, Math.PI), M("#8a6a3a", 0.8), 0, 0.3, 0);
    const desk = grp(R, -2.6, 0, -3.2);
    put(desk, rbox(1.4, 0.06, 0.7, 0.02), MP("#5a3418", 0.35), 0, 0.78, 0); for (const [x, z] of [[-0.62, -0.28], [0.62, -0.28], [-0.62, 0.28], [0.62, 0.28]]) put(desk, cyl(0.03, 0.03, 0.78, 6), MP("#5a3418", 0.35), x, 0.39, z);
    this.letter = grp(desk, 0, 0.815, 0.05); put(this.letter, new THREE.PlaneGeometry(0.42, 0.52), M("#ffffff", 0.7, 0, { map: letterTex() }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(desk, cyl(0.04, 0.05, 0.08, 12), M("#1a1a2a", 0.3), 0.45, 0.85, -0.15); put(desk, cyl(0.004, 0.012, 0.32, 6), M("#f2efe6", 0.7), 0.47, 0.98, -0.12, { rz: -0.4 });
    candle(desk, -0.5, 0.81, -0.2);
    const ch = grp(R, -2.6, 0, -2.5);
    put(ch, rbox(0.5, 0.06, 0.5, 0.02), MP("#5a3418", 0.35), 0, 0.46, 0); put(ch, rbox(0.5, 0.7, 0.06, 0.02), MP("#8a1d2a", 0.6), 0, 0.85, 0.24); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) put(ch, cyl(0.025, 0.025, 0.46, 6), MP("#5a3418", 0.35), x, 0.23, z);
    // the doctor's tray of alarming (cartoon) instruments
    this.tray = grp(R, -1.2, 0, -0.6); this.tray.visible = false;
    put(this.tray, rbox(0.7, 0.04, 0.45, 0.01), M("#c0c4ca", 0.25, 1), 0, 0.92, 0); put(this.tray, cyl(0.03, 0.03, 0.9, 8), M("#5a3418", 0.4), 0, 0.45, 0);
    for (let k = 0; k < 5; k++) put(this.tray, rbox(0.04, 0.02, 0.32 + k * 0.02, 0.005), M("#e0e4ea", 0.2, 1), -0.24 + k * 0.12, 0.955, 0, { ry: (k - 2) * 0.1 });
    put(this.tray, new THREE.TorusGeometry(0.12, 0.015, 6, 20, Math.PI * 1.3), M("#e0e4ea", 0.2, 1), 0.15, 1.0, 0.05, { rx: Math.PI / 2 });
    R.add(new THREE.HemisphereLight("#fff0d8", "#5a3418", 0.75));
    const fill = new THREE.DirectionalLight("#ffe8c8", 1.4); fill.position.set(1, 3, 5); fill.target.position.set(0, 1, -2); R.add(fill, fill.target);
  }
  buildThrone(R: THREE.Object3D) {
    this.room(R, 12, 14, 6, M("#ffffff", 0.7, 0, { map: rep(panel("#8a2a2a"), 6, 2) }), MP("#ffffff", 0.3, { map: rep(canvas(256, 256, (g) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#e8e0d0" : "#2a2a2e"; g.fillRect(i * 64, j * 64, 64, 64); } }), 6, 7), clearcoat: 0.9 }), "#e8dcc0");
    put(R, new THREE.PlaneGeometry(2.4, 12), MP("#8a1d2a", 0.8, { clearcoat: 0 }), 0, 0.01, 0, { rx: -Math.PI / 2, cast: false });
    const dais = grp(R, 0, 0, -5.5);
    put(dais, rbox(4, 0.4, 2.5, 0.04), MP("#8a1d2a", 0.7), 0, 0.2, 0);
    const gold = M("#e0b84a", 0.25, 1);
    put(dais, rbox(1.3, 0.12, 1.1, 0.04), gold, 0, 0.95, 0); put(dais, rbox(1.3, 2.2, 0.2, 0.08), gold, 0, 1.9, -0.5); put(dais, rbox(1.1, 1.8, 0.05, 0.06), MP("#8a1d2a", 0.6), 0, 1.85, -0.38);
    for (const sx of [-1, 1]) { put(dais, rbox(0.15, 0.5, 1.0, 0.04), gold, sx * 0.62, 1.2, 0); put(dais, rbox(0.12, 0.55, 0.12, 0.04), gold, sx * 0.6, 0.65, 0.45); }
    put(dais, new THREE.SphereGeometry(0.2, 16, 12), gold, 0, 3.1, -0.5);
    const crestT = canvas(512, 512, (g) => { g.fillStyle = "#8a1d2a"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#e0b84a"; g.beginPath(); g.moveTo(256, 60); g.lineTo(420, 140); g.lineTo(400, 380); g.lineTo(256, 460); g.lineTo(112, 380); g.lineTo(92, 140); g.fill(); text(g, "G R", 256, 270, 120, "#8a1d2a", SERIF); });
    put(R, new THREE.PlaneGeometry(2.4, 2.4), M("#ffffff", 0.5, 0.3, { map: crestT }), 0, 4.4, -6.97, { cast: false });
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) put(R, cyl(0.3, 0.35, 6, 20), MP("#efe6d4", 0.4), sx * 4.5, 3, -4 + k * 4);
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { const p = grp(R, sx * 5.97, 2.8, -2 + k * 5, -sx * Math.PI / 2); put(p, rbox(1.4, 1.8, 0.1, 0.03), gold, 0, 0, 0); put(p, new THREE.PlaneGeometry(1.2, 1.6), M("#ffffff", 0.6, 0, { map: canvas(128, 160, (g) => { const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, "#3a4a5a"); gr.addColorStop(1, "#1a1a20"); g.fillStyle = gr; g.fillRect(0, 0, 128, 160); g.fillStyle = "#f1c7a2"; g.beginPath(); g.arc(64, 60, 24, 0, 7); g.fill(); g.fillStyle = "#f2efe6"; g.beginPath(); g.arc(42, 64, 14, 0, 7); g.arc(86, 64, 14, 0, 7); g.fill(); g.fillStyle = ["#8a1d2a", "#1d2a5a", "#2a4a2a", "#5a3a1a"][k + (sx > 0 ? 2 : 0)]; g.fillRect(30, 90, 68, 70); }) }), 0, 0, 0.06, { cast: false }); }
    const ch = grp(R, 0, 5.2, -1);
    put(ch, new THREE.TorusGeometry(0.9, 0.05, 8, 30), gold, 0, 0, 0, { rx: Math.PI / 2 }); put(ch, cyl(0.02, 0.02, 0.8, 6), gold, 0, 0.4, 0);
    const ct = canvas(8, 8, (g) => { g.fillStyle = "#fff0c0"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; put(ch, new THREE.SphereGeometry(0.05, 8, 6), glow(ct, 5), Math.cos(a) * 0.9, 0.12, Math.sin(a) * 0.9, { cast: false }); }
    const pl = new THREE.PointLight("#ffd8a0", 14, 12, 2); pl.position.set(0, -0.2, 0); ch.add(pl);
    R.add(new THREE.HemisphereLight("#fff0d8", "#5a1d1d", 0.8));
    const key = new THREE.DirectionalLight("#fff0d8", 2.2); key.position.set(4, 6, 6); key.target.position.set(0, 1, -4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); R.add(key, key.target);
  }
  buildStreet(R: THREE.Object3D) {
    put(R, new THREE.PlaneGeometry(60, 30), M("#ffffff", 0.75, 0, { map: rep(cobble(), 12, 6) }), 0, 0, 4, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 2.2), M("#a49c8e", 0.8), 0, 0.1, -1.1, { rx: -Math.PI / 2, cast: false });
    const blocks: [number, number, string, number][] = [[-20, -9, "#9a5a3c", 12], [-9, 2, "#b0704a", 13], [2, 12, "#8c4632", 12], [12, 22, "#a8603e", 11]];
    blocks.forEach(([x0, x1, col, h], i) => {
      const w = x1 - x0, cx = (x0 + x1) / 2;
      put(R, new THREE.BoxGeometry(w, h, 6), M("#ffffff", 0.85, 0, { map: rep(brick(col, i + 3), w / 3, h / 3) }), cx, h / 2, -5.2);
      put(R, rbox(w + 0.2, 0.4, 0.5, 0.04), M("#e8e0d0", 0.6), cx, h - 0.2, -2.1);
      const wt = canvas(256, 384, (g) => { g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, 256, 384); g.fillStyle = i % 2 ? "#3a4a5a" : "#ffe0a0"; g.fillRect(20, 20, 216, 344); g.strokeStyle = "#e8e0d0"; g.lineWidth = 10; for (let k = 1; k < 3; k++) { g.beginPath(); g.moveTo(20 + k * 72, 20); g.lineTo(20 + k * 72, 364); g.stroke(); } for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(20, 20 + k * 86); g.lineTo(236, 20 + k * 86); g.stroke(); } });
      for (let fl = 0; fl < 3; fl++) for (let k = 0; k < Math.floor(w / 2.6); k++) put(R, new THREE.PlaneGeometry(1.0, 1.5), MP("#ffffff", 0.2, { map: wt }), x0 + 1.3 + k * 2.6, 4.6 + fl * 2.6, -2.19, { cast: false });
    });
    // Lacy's Bagnio: door with columns and a hanging sign
    const Bg = grp(R, -3.5, 0, -2.2);
    put(Bg, rbox(1.4, 2.6, 0.1, 0.02), MP("#1d3a2a", 0.4), 0, 1.3, 0.05);
    for (const sx of [-1, 1]) put(Bg, cyl(0.15, 0.17, 3.0, 14), MP("#efe6d4", 0.4), sx * 1.0, 1.5, 0.25);
    put(Bg, rbox(2.6, 0.35, 0.5, 0.04), MP("#efe6d4", 0.4), 0, 3.15, 0.25);
    put(Bg, rbox(3.8, 1.0, 0.1, 0.03), M("#ffffff", 0.5, 0, { map: signBoard("LACY'S BAGNIO", "Baths · Leicester Fields") }), 0, 3.9, 0.08);
    // print shop with the satirical print and the end broadside
    const Ps = grp(R, 6.5, 0, -2.2);
    put(Ps, rbox(3.4, 2.2, 0.1, 0.02), MP("#5a1d1d", 0.4), 0, 1.6, 0.06);
    put(Ps, new THREE.PlaneGeometry(1.35, 1.05), M("#ffffff", 0.7, 0, { map: printTex() }), -0.75, 1.75, 0.12, { cast: false });
    put(Ps, new THREE.PlaneGeometry(0.75, 1.05), M("#ffffff", 0.7, 0, { map: broadsideTex() }), 0.95, 1.75, 0.12, { cast: false });
    put(Ps, new THREE.PlaneGeometry(3.2, 2.0), MP("#d8e8f0", 0.02, { transparent: true, opacity: 0.18 }), 0, 1.65, 0.16, { cast: false });
    put(Ps, rbox(3.6, 0.6, 0.12, 0.03), M("#ffffff", 0.5, 0, { map: signBoard("PRINTS & SATIRES") }), 0, 3.0, 0.1);
    // oil lamps on brackets
    for (const x of [-8, 1.5, 11]) { const l = grp(R, x, 0, -1.4); put(l, cyl(0.06, 0.08, 3.2, 8), M("#1d1d1f", 0.5, 0.6), 0, 1.6, 0); put(l, new THREE.CylinderGeometry(0.18, 0.12, 0.4, 6, 1, true), MP("#fff6e0", 0.1, { transparent: true, opacity: 0.5 }), 0, 3.4, 0, { cast: false }); put(l, new THREE.ConeGeometry(0.22, 0.25, 6), M("#1d1d1f", 0.5, 0.6), 0, 3.72, 0); }
    R.add(new THREE.HemisphereLight("#d8e4f0", "#6a5a4a", 0.9));
    this.sunStreet = new THREE.DirectionalLight("#fff0d8", 2.8); this.sunStreet.position.set(-8, 16, 14); this.sunStreet.target.position.set(0, 0, -1); this.sunStreet.castShadow = true; this.sunStreet.shadow.mapSize.set(2048, 2048); Object.assign(this.sunStreet.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 }); R.add(this.sunStreet, this.sunStreet.target);
  }
  buildCottage(R: THREE.Object3D) {
    const gr = canvas(512, 512, (g) => { const r = rng(2); g.fillStyle = "#6f9a3f"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 8000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,70,20,0.35)" : "rgba(180,190,90,0.3)"; g.fillRect(r() * 512, r() * 512, 2, 5); } });
    put(R, new THREE.PlaneGeometry(80, 80), M("#ffffff", 0.9, 0, { map: rep(gr, 20, 20) }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(1.4, 12), M("#b8a078", 0.95), 0, 0.01, 4, { rx: -Math.PI / 2, cast: false });
    const C = grp(R, 0, 0, -3);
    const wall = canvas(512, 512, (g) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#4a3020"; for (const [x, y, w, h] of [[0, 0, 512, 24], [0, 488, 512, 24], [0, 0, 24, 512], [488, 0, 24, 512], [240, 0, 24, 512]]) g.fillRect(x, y, w, h); g.save(); g.translate(120, 256); g.rotate(0.6); g.fillRect(-150, -12, 300, 24); g.restore(); });
    put(C, new THREE.BoxGeometry(7, 3, 4.5), M("#ffffff", 0.85, 0, { map: rep(wall, 3, 1) }), 0, 1.5, 0);
    const thatch = canvas(512, 256, (g) => { const r = rng(5); g.fillStyle = "#b89a5a"; g.fillRect(0, 0, 512, 256); for (let k = 0; k < 4000; k++) { g.strokeStyle = r() < 0.5 ? "rgba(120,90,40,0.5)" : "rgba(230,200,130,0.4)"; g.beginPath(); const x = r() * 512, y = r() * 256; g.moveTo(x, y); g.lineTo(x + 2, y + 20); g.stroke(); } });
    put(C, new THREE.CylinderGeometry(0.4, 3.4, 2.6, 4, 1), MP("#ffffff", 0.95, { map: rep(thatch, 3, 1), clearcoat: 0 }), 0, 4.3, 0, { ry: Math.PI / 4, s: [1.45, 1, 0.95] });
    put(C, rbox(1.0, 2.0, 0.08, 0.02), MP("#3a5a3a", 0.5), 0, 1.0, 2.27);
    const winT = canvas(128, 128, (g) => { g.fillStyle = "#3a4a5a"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "#efe6d2"; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128); g.beginPath(); g.moveTo(64, 0); g.lineTo(64, 128); g.moveTo(0, 64); g.lineTo(128, 64); g.stroke(); });
    for (const x of [-2.2, 2.2]) put(C, new THREE.PlaneGeometry(0.9, 0.9), MP("#ffffff", 0.1, { map: winT }), x, 1.7, 2.26, { cast: false });
    put(C, cyl(0.35, 0.35, 1.8, 10), M("#9a5a3a", 0.85), 2.5, 5.0, -0.5);
    // picket fence, flowers, a tree, the town sign
    for (let k = -8; k <= 8; k++) if (Math.abs(k) > 1) put(R, rbox(0.08, 0.9, 0.04, 0.01), M("#f2efe6", 0.6), k * 0.45, 0.45, 2.5);
    for (const y of [0.3, 0.7]) for (const sx of [-1, 1]) put(R, rbox(3.2, 0.06, 0.03, 0.005), M("#f2efe6", 0.6), sx * 2.2, y, 2.5);
    const r = rng(8);
    for (let k = 0; k < 30; k++) put(R, new THREE.SphereGeometry(0.08, 8, 6), MP(["#d8262e", "#ffc928", "#c86ac8", "#ffffff"][k % 4], 0.5), -3.4 + r() * 6.8, 0.25, -0.3 + r() * 0.5 - (k % 2) * 0.1);
    const tr = grp(R, -6, 0, -1); put(tr, cyl(0.3, 0.45, 3.5, 10), M("#6b4a2a", 0.85), 0, 1.75, 0); for (let k = 0; k < 8; k++) put(tr, new THREE.IcosahedronGeometry(1.4, 1), MP(k % 2 ? "#4f8a3a" : "#3f7a32", 0.75, { clearcoat: 0 }), (r() - 0.5) * 2.6, 4 + r() * 1.5, (r() - 0.5) * 2.6);
    const sg = grp(R, 2.6, 0, 6);
    put(sg, cyl(0.07, 0.07, 2.2, 8), M("#5a3a22", 0.8), 0, 1.1, 0);
    put(sg, rbox(2.2, 0.7, 0.06, 0.02), M("#ffffff", 0.5, 0, { map: canvas(768, 256, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 768, 256); g.strokeStyle = "#2a2018"; g.lineWidth = 10; g.strokeRect(8, 8, 752, 240); text(g, "GODALMING", 384, 110, 110, "#2a2018", SERIF); text(g, "Surrey", 384, 200, 50, "#5a4a2a", SERIF); }) }), 0, 2.0, 0.04);
    R.add(new THREE.HemisphereLight("#d8e8ff", "#6a7a4a", 0.95));
    this.sunCottage = new THREE.DirectionalLight("#fff2d8", 3.2); this.sunCottage.position.set(-10, 14, 12); this.sunCottage.target.position.set(0, 0, 0); this.sunCottage.castShadow = true; this.sunCottage.shadow.mapSize.set(2048, 2048); Object.assign(this.sunCottage.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 }); R.add(this.sunCottage, this.sunCottage.target);
  }
  buildJail(R: THREE.Object3D) {
    this.room(R, 5, 5, 3.4, M("#ffffff", 0.95, 0, { map: rep(stone(), 2.5, 1.7) }), M("#ffffff", 0.95, 0, { map: rep(stone(), 3, 3) }), "#4a4640");
    for (let k = 0; k < 9; k++) put(R, cyl(0.03, 0.03, 2.6, 8), M("#2a2a2e", 0.4, 0.8), -1.2 + k * 0.3, 1.3, 2.3);
    for (const y of [0.3, 2.5]) put(R, rbox(2.8, 0.08, 0.08, 0.01), M("#2a2a2e", 0.4, 0.8), 0, y, 2.3);
    const r = rng(6);
    for (let k = 0; k < 60; k++) put(R, cyl(0.008, 0.008, 0.4, 4), M("#c8a860", 0.9), -1.8 + r() * 1.6, 0.03, -1.8 + r() * 1.6, { rz: Math.PI / 2, ry: r() * 3 });
    put(R, rbox(1.4, 0.4, 0.7, 0.03), M("#5a4a3a", 0.85), 1.4, 0.2, -1.9);
    put(R, rbox(0.5, 0.65, 0.02, 0.01), M("#ffffff", 0.7, 0, { map: noticeTex() }), -0.9, 1.7, -2.48);
    const winT = canvas(64, 64, (g) => { g.fillStyle = "#cfe6ff"; g.fillRect(0, 0, 64, 64); g.fillStyle = "#2a2a2e"; for (let x = 8; x < 64; x += 16) g.fillRect(x, 0, 5, 64); });
    put(R, new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveMap: winT, emissiveIntensity: 2 }), 0.6, 2.7, -2.48, { cast: false });
    R.add(new THREE.HemisphereLight("#b8c8e0", "#3a3630", 0.6));
    const shaft = new THREE.SpotLight("#e8f0ff", 18, 8, 0.4, 0.6, 2); shaft.position.set(0.6, 2.7, -2.2); shaft.target.position.set(0, 0, 0.6); shaft.castShadow = true; R.add(shaft, shaft.target);
  }
  setSlate(n: number, hoax: boolean) { const k = n + "|" + hoax; if (!this.slateCache.has(k)) this.slateCache.set(k, slateTex(n, hoax)); this.slate.map = this.slateCache.get(k)!; }
}
