// Part 5 (detailed style): the street. Facades on z = 0 facing +z: a brick bookshop, the STARLIGHT cinema (marquee with
// bulbs, vertical sign, posters, glass doors) with the popcorn cart and its price board in front, TONY'S BURGERS
// (big sign, LED message board, striped awnings, lit windows, OPEN sign, patio table), a brick laundromat block.
// Sidewalk slabs, curb, asphalt road, lamp posts, trees, hydrant, bench, bin, bike rack, a parked car, sky dome.
// Two lights: "day" and "golden" (low warm sun, lamps on, windows brighter).
import * as THREE from "three";
import { ANTON, INTER, M, MP, STEEL, glow, canvas, rep, rbox, cyl, put, grp, rr, text, burgerIcon, rng } from "../look/kit";

export const STAND = new THREE.Vector3(-2.2, 0, 2.0);
export const BOARD = new THREE.Vector3(-0.75, 0, 2.7);
export const TONY_DOOR_X = 5.75;
export const LED_POS = new THREE.Vector3(TONY_DOOR_X, 3.2, 0.12);
export const PATIO = new THREE.Vector3(8.1, 0, 2.3);

// ---------------- textures ----------------
const brick = (base: string, seed: number) => canvas(1024, 1024, (g) => {
  const r = rng(seed); g.fillStyle = "#cfc6b8"; g.fillRect(0, 0, 1024, 1024);
  for (let row = 0; row < 32; row++) for (let c = -1; c < 9; c++) {
    const x = c * 128 + (row % 2 ? 64 : 0) + 3, y = row * 32 + 3;
    const v = 0.85 + r() * 0.3; const col = new THREE.Color(base).multiplyScalar(v);
    g.fillStyle = `#${col.getHexString()}`; g.fillRect(x, y, 122, 26);
  }
});
const slab = () => canvas(512, 512, (g) => {
  const r = rng(4); g.fillStyle = "#b9b6ae"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "60,60,60" : "240,240,240"},${r() * 0.12})`; g.fillRect(r() * 512, r() * 512, 3, 3); }
  g.strokeStyle = "#8d8a83"; g.lineWidth = 5; g.strokeRect(0, 0, 512, 512); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
});
const asphalt = () => canvas(1024, 1024, (g) => {
  const r = rng(6); g.fillStyle = "#3d3f45"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 9000; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "20,20,24" : "120,120,130"},${0.2 + r() * 0.3})`; g.fillRect(r() * 1024, r() * 1024, 2, 2); }
  g.fillStyle = "#e8d36a"; for (let x = 0; x < 1024; x += 256) g.fillRect(x + 40, 500, 150, 18);
});
const windowsTex = (cols: number, rows: number, warm: number) => canvas(512, 512, (g) => {
  const r = rng(cols * 7 + rows);
  g.fillStyle = "rgba(0,0,0,0)"; g.clearRect(0, 0, 512, 512);
  const cw = 512 / cols, ch = 512 / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const lit = r() < warm;
    const gr = g.createLinearGradient(0, j * ch, 0, j * ch + ch); gr.addColorStop(0, lit ? "#ffd98a" : "#5d7a9a"); gr.addColorStop(1, lit ? "#f0a64a" : "#24344a");
    g.fillStyle = "#e9e1d0"; g.fillRect(i * cw + cw * 0.18, j * ch + ch * 0.12, cw * 0.64, ch * 0.7);
    g.fillStyle = gr; g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.16, cw * 0.56, ch * 0.62);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(i * cw + cw * 0.22, j * ch + ch * 0.16, cw * 0.2, ch * 0.62);
    g.fillStyle = "#e9e1d0"; g.fillRect(i * cw + cw * 0.49, j * ch + ch * 0.16, 4, ch * 0.62);
  }
});
const interior = (seed: number) => canvas(1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff1d0"); gr.addColorStop(1, "#d9a868"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  const r = rng(seed);
  g.fillStyle = "#1f7a4d"; g.fillRect(0, 330, 1024, 182);
  g.fillStyle = "#24282e"; for (let k = 0; k < 3; k++) { g.fillRect(120 + k * 300, 60, 220, 110); g.fillStyle = "#ffd23f"; g.fillRect(130 + k * 300, 70, 200, 18); g.fillStyle = "#24282e"; }
  for (let k = 0; k < 5; k++) { g.fillStyle = "#d8262e"; g.beginPath(); g.ellipse(100 + k * 200 + r() * 40, 420, 60, 20, 0, 0, 7); g.fill(); g.fillStyle = "#c0c4ca"; g.fillRect(96 + k * 200, 420, 8, 90); }
  for (let k = 0; k < 4; k++) { const x = 150 + k * 240 + r() * 60; g.fillStyle = ["#1aa3a6", "#7a4fb0", "#e08a18", "#d8262e"][k]; g.beginPath(); g.ellipse(x, 330, 34, 60, 0, 0, 7); g.fill(); g.fillStyle = "#f1c7a2"; g.beginPath(); g.arc(x, 250, 36, 0, 7); g.fill(); }
});
const tonySign = () => canvas(2048, 400, (g) => {
  g.fillStyle = "#f6f1e4"; rr(g, 0, 0, 2048, 400, 60); g.fill(); g.strokeStyle = "#1f7a4d"; g.lineWidth = 26; rr(g, 16, 16, 2016, 368, 50); g.stroke();
  burgerIcon(g, 250, 220, 250);
  g.font = `250px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.strokeStyle = "#2a1517"; g.lineWidth = 22; g.strokeText("TONY'S BURGERS", 1150, 210); g.fillStyle = "#d8262e"; g.fillText("TONY'S BURGERS", 1150, 210);
});
const cinemaSign = () => canvas(256, 1024, (g) => {
  g.fillStyle = "#1a0b14"; g.fillRect(0, 0, 256, 1024);
  "STAR".split("").forEach((ch, i) => text(g, ch, 128, 110 + i * 210, 190, "#ffe7a0"));
});
const marqueeTex = (golden: boolean) => canvas(2048, 400, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 2048, 400);
  text(g, "NOW SHOWING", 1024, 70, 80, "#d8262e");
  text(g, "SPACE TACO  ·  THE DECOY  ·  NIGHT OF THE FRIES", 1024, 200, 116, "#151018");
  text(g, golden ? "TONIGHT 7 PM" : "MATINEE 2 PM", 1024, 320, 72, "#1f3fa0");
});
const posterTex = (title: string, c1: string, c2: string) => canvas(512, 760, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 760); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 512, 760);
  g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.arc(256, 330, 130, 0, 7); g.fill();
  g.fillStyle = c2; g.beginPath(); g.arc(256, 330, 90, 0, 7); g.fill();
  text(g, title, 256, 610, title.length > 9 ? 70 : 96, "#ffffff");
  text(g, "COMING SOON", 256, 700, 34, "#ffe7a0", INTER);
});
export const ledTex = (msg: string, scroll: number) => canvas(1536, 160, (g) => {
  g.fillStyle = "#07090c"; g.fillRect(0, 0, 1536, 160);
  g.font = `112px ${ANTON}`; g.textBaseline = "middle"; g.fillStyle = "#ffb627";
  const wdt = g.measureText(msg).width;
  if (wdt < 1400) { g.textAlign = "center"; g.fillText(msg, 768, 86); }
  else { g.textAlign = "left"; const x = 1536 - ((scroll * 260) % (wdt + 1536)); g.fillText(msg, x, 86); }
  // LED dot mask
  g.fillStyle = "rgba(7,9,12,0.55)"; for (let x = 0; x < 1536; x += 8) g.fillRect(x, 0, 2, 160); for (let y = 0; y < 160; y += 8) g.fillRect(0, y, 1536, 2);
});
/** the popcorn price board: med (0..1 slide), hi row (0 small, 1 medium, 2 large), stickers */
export type BoardState = { med: number; hi: number; steal: boolean; only1: boolean; notSale: boolean; decoy: number; example: boolean };
export const boardTex = (s: BoardState) => canvas(768, 1024, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 1024); gr.addColorStop(0, "#2a1450"); gr.addColorStop(1, "#160a2c"); g.fillStyle = gr; g.fillRect(0, 0, 768, 1024);
  g.strokeStyle = "#ffc928"; g.lineWidth = 14; rr(g, 14, 14, 740, 996, 30); g.stroke();
  for (let k = 0; k < 18; k++) { g.fillStyle = k % 2 ? "#fff3c0" : "#ffc928"; g.beginPath(); g.arc(40 + k * 40, 34, 7, 0, 7); g.fill(); }
  text(g, "POPCORN", 384, 130, 128, "#ffc928");
  const rows: [string, string, number][] = [["SMALL", "$5", 0], ["MEDIUM", "$8", 1], ["LARGE", "$9", 2]];
  const ys = s.med > 0 ? [330, 330 + 200 * s.med, 330 + 200 + 200 * s.med] : [330, 0, 530];
  rows.forEach(([n, p, i]) => {
    if (i === 1 && s.med <= 0) return;
    const y = i === 1 ? 330 + 200 * s.med : ys[i];
    const a = i === 1 ? Math.min(1, s.med * 1.5) : 1;
    g.globalAlpha = a;
    if (s.hi === i) { g.fillStyle = "#7d3fd0"; rr(g, 40, y - 80, 688, 160, 22); g.fill(); }
    // bucket icon sized like the bucket
    const k = 0.7 + i * 0.25;
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(110 - 42 * k, y - 40 * k); g.lineTo(110 + 42 * k, y - 40 * k); g.lineTo(110 + 30 * k, y + 60 * k); g.lineTo(110 - 30 * k, y + 60 * k); g.fill();
    g.fillStyle = "#d8262e"; for (let j = 0; j < 3; j++) g.fillRect(110 - 34 * k + j * 26 * k, y - 38 * k, 12 * k, 96 * k);
    g.fillStyle = "#fff6d0"; for (let j = 0; j < 6; j++) { g.beginPath(); g.arc(110 - 34 * k + j * 13 * k, y - 46 * k - (j % 2) * 10 * k, 15 * k, 0, 7); g.fill(); }
    text(g, n, 220, y + 6, 92, "#ffffff", ANTON, "left");
    text(g, p, 700, y + 6, 112, i === 2 ? "#5fe37a" : "#ffc928", ANTON, "right");
    g.globalAlpha = 1;
  });
  const sticker = (x: number, y: number, rot: number, bg: string, l1: string, l2 = "", sz = 54) => {
    g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = bg; g.beginPath();
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2, r = k % 2 ? 118 : 140; g.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.8); } g.closePath(); g.fill();
    g.strokeStyle = "#ffffff"; g.lineWidth = 8; g.stroke();
    text(g, l1, 0, l2 ? -22 : 4, sz, "#ffffff"); if (l2) text(g, l2, 0, 36, sz * 0.8, "#ffffff"); g.restore();
  };
  const y2 = 330 + 400;
  if (s.steal) sticker(560, y2 + 140, -0.15, "#1f9a4a", "WHAT A", "STEAL!");
  if (s.only1) sticker(560, y2 - 330, 0.12, "#e08a18", "ONLY $1", "MORE!", 50);
  if (s.notSale) { g.save(); g.translate(384, 530 + 60); g.rotate(-0.05); g.fillStyle = "#ffffff"; rr(g, -250, -26, 500, 52, 12); g.fill(); text(g, "NOT REALLY FOR SALE", 0, 2, 40, "#d8262e"); g.restore(); }
  if (s.decoy > 0) {
    const k = 1 + 1.6 * Math.max(0, 1 - s.decoy);
    g.save(); g.translate(400, 530); g.rotate(-0.18); g.scale(k, k); g.globalAlpha = Math.min(1, s.decoy * 1.4);
    g.strokeStyle = "#ff2a3a"; g.lineWidth = 14; rr(g, -230, -70, 460, 140, 18); g.stroke();
    text(g, "DECOY", 0, 8, 120, "#ff2a3a"); g.restore(); g.globalAlpha = 1;
  }
  if (s.example) { g.save(); g.translate(384, 940); g.rotate(-0.04); g.fillStyle = "#ffc928"; rr(g, -280, -40, 560, 80, 14); g.fill(); text(g, "EXAMPLE PRICES", 0, 4, 58, "#1a1208"); g.restore(); }
});

const skyMat = (golden: boolean) => new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { top: { value: new THREE.Color(golden ? "#3d4f9a" : "#3f8fe0") }, mid: { value: new THREE.Color(golden ? "#f2a25a" : "#9fd0ff") }, bot: { value: new THREE.Color(golden ? "#ffd08a" : "#e8f4ff") } },
  vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
  fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.7, h)) : mix(bot, mid, smoothstep(-0.05, 0.12, h)); gl_FragColor = vec4(c * 1.15, 1.0); }",
});

export class Street {
  root = new THREE.Group();
  board: THREE.MeshStandardMaterial; boardCache = new Map<string, THREE.Texture>();
  led: THREE.MeshStandardMaterial; ledCache = new Map<string, THREE.Texture>();
  sky: THREE.Mesh; golden = false;
  lamps: THREE.MeshStandardMaterial[] = []; windowsMats: THREE.MeshStandardMaterial[] = []; marquee: THREE.MeshStandardMaterial;
  sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; lampLights: THREE.PointLight[] = [];
  confetti: THREE.InstancedMesh;
  constructor() {
    const R = this.root;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 16), skyMat(false)); R.add(this.sky);
    // clouds
    const cloudT = canvas(256, 128, (g) => { for (let k = 0; k < 7; k++) { const gr = g.createRadialGradient(40 + k * 28, 70 - (k % 3) * 8, 0, 40 + k * 28, 70 - (k % 3) * 8, 50); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 256, 128); } });
    const r = rng(12);
    for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudT, transparent: true, depthWrite: false, opacity: 0.85 })); s.position.set(-40 + k * 11 + r() * 5, 16 + r() * 10, -45 - r() * 15); s.scale.set(16 + r() * 8, 7 + r() * 3, 1); R.add(s); }
    // ground: sidewalk, curb, road, far sidewalk
    put(R, new THREE.PlaneGeometry(60, 4.3), MP("#ffffff", 0.75, { map: rep(slab(), 60 / 1.2, 4.3 / 1.2), clearcoat: 0 }), 0, 0, 2.15, { rx: -Math.PI / 2, cast: false });
    put(R, rbox(60, 0.14, 0.18, 0.02), M("#a9a59c", 0.8), 0, -0.05, 4.36);
    put(R, new THREE.PlaneGeometry(60, 9), MP("#ffffff", 0.55, { map: rep(asphalt(), 60 / 8, 1), clearcoat: 0.25, clearcoatRoughness: 0.4 }), 0, -0.12, 9.0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 6), MP("#ffffff", 0.75, { map: rep(slab(), 50, 5), clearcoat: 0 }), 0, 0, 16.5, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 3), M("#4f8f3f", 0.9), 0, 0.01, 19.5, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(60, 0.4), M("#f4f1e8", 0.6), 0, -0.115, 4.9, { rx: -Math.PI / 2, cast: false }); // crosswalk edge line
    for (let k = 0; k < 7; k++) put(R, new THREE.PlaneGeometry(0.5, 3.2), M("#f4f1e8", 0.6), -13 + k * 0.9, -0.115, 7.4, { rx: -Math.PI / 2, cast: false });
    this.buildBookshop(R); this.buildCinema(R); this.buildTony(R); this.buildLaundry(R);
    this.marquee = this.marqueeMat;
    this.board = glow(this.boardState({ med: 0, hi: -1, steal: false, only1: false, notSale: false, decoy: 0, example: false }), 1.35);
    this.buildStand(R);
    this.led = glow(this.ledState("TONY'S BURGERS · OPEN", 0), 2.4);
    const led = grp(R, LED_POS.x, LED_POS.y, LED_POS.z);
    put(led, rbox(3.3, 0.42, 0.12, 0.02), M("#16181c", 0.4, 0.6), 0, 0, 0);
    put(led, new THREE.PlaneGeometry(3.15, 0.33), this.led, 0, 0, 0.062, { cast: false });
    this.buildProps(R);
    // lights
    this.hemi = new THREE.HemisphereLight("#cfe4ff", "#8a7a64", 0.9); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff4e0", 3.2); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 80 }); this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.03;
    R.add(this.sun, this.sun.target);
    // confetti for the finale
    this.confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.06, 0.035), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, vertexColors: false }), 160);
    const cols = ["#d8262e", "#ffc928", "#1f9a4a", "#2b5fb4", "#ffffff"];
    for (let k = 0; k < 160; k++) this.confetti.setColorAt(k, new THREE.Color(cols[k % 5]));
    this.confetti.visible = false; R.add(this.confetti);
  }
  marqueeMat!: THREE.MeshStandardMaterial;
  boardState(s: BoardState) {
    const k = JSON.stringify([+s.med.toFixed(2), s.hi, s.steal, s.only1, s.notSale, +s.decoy.toFixed(2), s.example]);
    if (!this.boardCache.has(k)) this.boardCache.set(k, boardTex(s));
    return this.boardCache.get(k)!;
  }
  ledState(msg: string, scroll: number) {
    const k = msg + "|" + scroll.toFixed(2);
    if (!this.ledCache.has(k)) { if (this.ledCache.size > 40) this.ledCache.clear(); this.ledCache.set(k, ledTex(msg, scroll)); }
    return this.ledCache.get(k)!;
  }
  facade(R: THREE.Object3D, x0: number, x1: number, h: number, mat: THREE.Material, cornice = "#e9e1d0") {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    put(R, new THREE.BoxGeometry(w, h, 8), mat, cx, h / 2, -4, { cast: true });
    put(R, rbox(w + 0.2, 0.3, 0.4, 0.03), M(cornice, 0.6), cx, h - 0.15, 0.1);
    put(R, rbox(w + 0.1, 0.12, 0.25, 0.02), M(cornice, 0.6), cx, h - 0.45, 0.05);
  }
  winRow(R: THREE.Object3D, x0: number, x1: number, y0: number, y1: number, cols: number, rows: number) {
    const m = new THREE.MeshStandardMaterial({ map: windowsTex(cols, rows, 0.3), transparent: true, roughness: 0.15, metalness: 0.2, emissive: "#ffffff", emissiveMap: windowsTex(cols, rows, 0.3), emissiveIntensity: 0.15 });
    this.windowsMats.push(m);
    put(R, new THREE.PlaneGeometry(x1 - x0, y1 - y0), m, (x0 + x1) / 2, (y0 + y1) / 2, 0.01, { cast: false });
  }
  buildBookshop(R: THREE.Object3D) {
    const bm = M("#ffffff", 0.85, 0, { map: rep(brick("#a4523a", 1), 8 / 2, 8 / 2) });
    this.facade(R, -15, -6.5, 8, bm);
    this.winRow(R, -14.6, -6.9, 3.4, 7.3, 4, 2);
    put(R, new THREE.PlaneGeometry(7.4, 2.4), new THREE.MeshStandardMaterial({ map: interior(3), emissive: "#ffffff", emissiveMap: interior(3), emissiveIntensity: 0.35, roughness: 0.1 }), -10.75, 1.4, 0.02, { cast: false });
    const aw = canvas(512, 128, (g) => { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? "#ffffff" : "#2b5fb4"; g.fillRect(x, 0, 64, 128); } });
    put(R, new THREE.BoxGeometry(7.6, 0.08, 1.2), MP("#ffffff", 0.6, { map: rep(aw, 4, 1) }), -10.75, 2.85, 0.55, { rx: 0.32 });
    const sign = canvas(1024, 160, (g) => { g.fillStyle = "#13294d"; g.fillRect(0, 0, 1024, 160); text(g, "PAGES & BEANS · BOOKS · COFFEE", 512, 84, 76, "#f4e4b8"); });
    put(R, rbox(6.4, 0.5, 0.08, 0.02), M("#ffffff", 0.5, 0, { map: sign }), -10.75, 3.25, 0.08);
  }
  buildCinema(R: THREE.Object3D) {
    const cream = MP("#efe3c8", 0.6, { clearcoat: 0.1 });
    this.facade(R, -6.5, 2.0, 9, cream, "#c9a55a");
    // art-deco ribs
    for (let k = 0; k < 6; k++) put(R, rbox(0.25, 4.2, 0.2, 0.03), MP("#c9493a", 0.5), -6.0 + k * 1.6, 6.6, 0.1);
    // marquee: box + bulbs + text panel + underside lights
    const mq = grp(R, -2.25, 3.9, 0.8);
    put(mq, rbox(6.6, 1.1, 1.5, 0.05), MP("#b8232c", 0.35), 0, 0, 0);
    this.marqueeMat = new THREE.MeshStandardMaterial({ map: marqueeTex(false), emissive: "#ffffff", emissiveMap: marqueeTex(false), emissiveIntensity: 0.25, roughness: 0.4 });
    put(mq, new THREE.PlaneGeometry(6.1, 0.82), this.marqueeMat, 0, 0, 0.76, { cast: false });
    const bulbM = glow(canvas(8, 8, (g) => { g.fillStyle = "#fff0b0"; g.fillRect(0, 0, 8, 8); }), 3.0);
    this.lamps.push(bulbM);
    const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), bulbM, 140);
    let n = 0;
    for (let k = 0; k < 44; k++) { bulbs.setMatrixAt(n++, new THREE.Matrix4().makeTranslation(-3.2 + k * 0.149, 0.52, 0.77)); bulbs.setMatrixAt(n++, new THREE.Matrix4().makeTranslation(-3.2 + k * 0.149, -0.52, 0.77)); }
    for (let k = 0; k < 7; k++) { bulbs.setMatrixAt(n++, new THREE.Matrix4().makeTranslation(-3.27, -0.45 + k * 0.15, 0.77)); bulbs.setMatrixAt(n++, new THREE.Matrix4().makeTranslation(3.27, -0.45 + k * 0.15, 0.77)); }
    bulbs.count = n; mq.add(bulbs);
    const under = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), bulbM, 24);
    for (let k = 0; k < 24; k++) under.setMatrixAt(k, new THREE.Matrix4().makeTranslation(-3 + (k % 12) * 0.55, -0.56, -0.4 + Math.floor(k / 12) * 0.7));
    mq.add(under);
    // vertical sign
    const vs = grp(R, 1.55, 6.3, 0.75);
    put(vs, rbox(0.9, 3.8, 0.35, 0.05), MP("#b8232c", 0.35), 0, 0, 0);
    put(vs, new THREE.PlaneGeometry(0.62, 3.4), glow(cinemaSign(), 2.2), 0, 0, 0.18, { cast: false });
    put(vs, new THREE.PlaneGeometry(0.62, 3.4), glow(cinemaSign(), 2.2), 0, 0, -0.18, { ry: Math.PI, cast: false });
    // doors with warm lobby
    const lobby = canvas(512, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#ffe2a8"); gr.addColorStop(1, "#c0623a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256); g.fillStyle = "#7a1d22"; g.fillRect(0, 200, 512, 56); for (let k = 0; k < 6; k++) { g.fillStyle = "#3a1a10"; g.fillRect(40 + k * 80, 40, 50, 100); } });
    put(R, new THREE.PlaneGeometry(3.6, 2.4), new THREE.MeshStandardMaterial({ map: lobby, emissive: "#ffffff", emissiveMap: lobby, emissiveIntensity: 0.55, roughness: 0.08, metalness: 0.1 }), -2.25, 1.2, 0.02, { cast: false });
    for (let k = 0; k < 5; k++) put(R, rbox(0.07, 2.45, 0.1, 0.01), M("#c9a55a", 0.3, 1), -4.05 + k * 0.9, 1.22, 0.06);
    put(R, rbox(3.7, 0.08, 0.12, 0.01), M("#c9a55a", 0.3, 1), -2.25, 2.45, 0.06);
    // poster cases
    for (const [x, t, c1, c2] of [[-5.6, "SPACE TACO", "#2b1d6b", "#e0603a"], [1.15, "THE DECOY", "#1a3a5a", "#d8262e"]] as const) {
      const pc = grp(R, x, 1.45, 0.06);
      put(pc, rbox(0.95, 1.4, 0.1, 0.02), M("#c9a55a", 0.3, 1), 0, 0, 0);
      put(pc, new THREE.PlaneGeometry(0.82, 1.24), new THREE.MeshStandardMaterial({ map: posterTex(t, c1, c2), emissive: "#ffffff", emissiveMap: posterTex(t, c1, c2), emissiveIntensity: 0.3, roughness: 0.1 }), 0, 0, 0.055, { cast: false });
    }
    // red carpet + rope posts
    put(R, new THREE.PlaneGeometry(3.4, 1.6), M("#9a1c24", 0.9), -2.25, 0.005, 0.8, { rx: -Math.PI / 2, cast: false });
    for (const x of [-4.1, -0.4]) { put(R, cyl(0.04, 0.04, 0.9, 12), M("#c9a55a", 0.25, 1), x, 0.45, 1.6); put(R, new THREE.SphereGeometry(0.06, 12, 8), M("#c9a55a", 0.25, 1), x, 0.92, 1.6); put(R, cyl(0.15, 0.15, 0.04, 20), M("#c9a55a", 0.25, 1), x, 0.02, 1.6); }
  }
  buildTony(R: THREE.Object3D) {
    const wallT = canvas(512, 512, (g) => { g.fillStyle = "#f3eee2"; g.fillRect(0, 0, 512, 512); g.fillStyle = "#1f7a4d"; g.fillRect(0, 420, 512, 92); g.strokeStyle = "rgba(0,0,0,0.06)"; for (let y = 0; y < 420; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } });
    this.facade(R, 2.0, 9.5, 5.4, M("#ffffff", 0.7, 0, { map: rep(wallT, 3, 1) }), "#1f7a4d");
    put(R, rbox(6.2, 1.25, 0.16, 0.04), M("#ffffff", 0.45, 0, { map: tonySign() }), TONY_DOOR_X, 4.3, 0.14);
    // windows with the lit dining room inside
    for (const [x0, x1] of [[2.4, 4.9], [6.6, 9.1]] as const) {
      const m = new THREE.MeshStandardMaterial({ map: interior(7), emissive: "#ffffff", emissiveMap: interior(7), emissiveIntensity: 0.4, roughness: 0.06, metalness: 0.1 });
      this.windowsMats.push(m);
      put(R, new THREE.PlaneGeometry(x1 - x0, 1.9), m, (x0 + x1) / 2, 1.55, 0.03, { cast: false });
      for (const [w, h, x, y] of [[x1 - x0 + 0.1, 0.08, (x0 + x1) / 2, 2.52], [x1 - x0 + 0.1, 0.12, (x0 + x1) / 2, 0.56], [0.08, 2.0, x0, 1.55], [0.08, 2.0, x1, 1.55], [0.05, 1.9, (x0 + x1) / 2, 1.55]] as const) put(R, rbox(w, h, 0.1, 0.01), MP("#1d4a32", 0.3), x, y, 0.06);
      put(R, rbox(x1 - x0 + 0.3, 0.1, 0.35, 0.02), M("#e8e3d8", 0.5), (x0 + x1) / 2, 0.5, 0.18);
      // striped awning with a scalloped edge
      const aw = canvas(512, 128, (g) => { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? "#ffffff" : "#1f8a4a"; g.fillRect(x, 0, 64, 128); } });
      const a = grp(R, (x0 + x1) / 2, 2.95, 0.55);
      put(a, new THREE.BoxGeometry(x1 - x0 + 0.4, 0.06, 1.15), MP("#ffffff", 0.6, { map: rep(aw, 3, 1) }), 0, 0, 0, { rx: 0.38 });
      for (let k = 0; k < 9; k++) put(a, new THREE.CylinderGeometry(0.15, 0.15, 0.04, 16, 1, false, 0, Math.PI), MP(k % 2 ? "#ffffff" : "#1f8a4a", 0.6), -(x1 - x0) / 2 + k * (x1 - x0 + 0.2) / 8.4, -0.22, 0.55, { rx: Math.PI / 2, rz: Math.PI });
    }
    // door + OPEN neon + menu case + planters
    put(R, rbox(1.15, 2.3, 0.08, 0.02), MP("#1d4a32", 0.35), TONY_DOOR_X, 1.15, 0.04);
    const glass = new THREE.MeshStandardMaterial({ map: interior(9), emissive: "#ffffff", emissiveMap: interior(9), emissiveIntensity: 0.4, roughness: 0.05 });
    this.windowsMats.push(glass);
    put(R, new THREE.PlaneGeometry(0.8, 1.5), glass, TONY_DOOR_X, 1.35, 0.09, { cast: false });
    put(R, rbox(0.05, 0.5, 0.06, 0.02), STEEL(), TONY_DOOR_X + 0.42, 1.15, 0.14);
    const openT = canvas(256, 96, (g) => { g.fillStyle = "#0a0a0c"; g.fillRect(0, 0, 256, 96); g.strokeStyle = "#ff3a5a"; g.lineWidth = 6; rr(g, 8, 8, 240, 80, 20); g.stroke(); text(g, "OPEN", 128, 52, 64, "#ff6a8a"); });
    put(R, new THREE.PlaneGeometry(0.62, 0.24), glow(openT, 2.6), 3.65, 2.1, 0.09, { cast: false });
    for (const x of [2.7, 8.8]) {
      const p = grp(R, x, 0, 0.45);
      put(p, rbox(0.7, 0.45, 0.4, 0.03), MP("#2b2f36", 0.4), 0, 0.225, 0);
      const r = rng(x * 10);
      for (let k = 0; k < 10; k++) put(p, new THREE.SphereGeometry(0.11, 12, 8), MP(k % 3 ? "#3f9b4a" : "#2f7f3a", 0.6), -0.25 + r() * 0.5, 0.5 + r() * 0.15, -0.1 + r() * 0.2);
      for (let k = 0; k < 4; k++) put(p, new THREE.SphereGeometry(0.035, 8, 6), MP(["#ff6a8a", "#ffc928"][k % 2], 0.5), -0.2 + k * 0.13, 0.66, 0.1);
    }
    // patio: table, two chairs, umbrella
    const pt = grp(R, PATIO.x, 0, PATIO.z);
    put(pt, cyl(0.45, 0.45, 0.04, 32), MP("#f2f0ea", 0.3), 0, 0.76, 0);
    put(pt, cyl(0.03, 0.03, 0.74, 10), STEEL(), 0, 0.37, 0);
    put(pt, cyl(0.25, 0.28, 0.03, 20), M("#333", 0.5, 0.6), 0, 0.015, 0);
    put(pt, cyl(0.02, 0.02, 2.2, 8), M("#eee", 0.4, 0.5), 0, 1.1, 0);
    const umb = canvas(512, 64, (g) => { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? "#ffffff" : "#d8262e"; g.fillRect(x, 0, 64, 64); } });
    put(pt, new THREE.ConeGeometry(1.15, 0.45, 16, 1, true), MP("#ffffff", 0.6, { map: umb, side: THREE.DoubleSide }), 0, 2.15, 0);
    for (const sx of [-1, 1]) {
      const ch = grp(pt, sx * 0.75, 0, 0.1, -sx * Math.PI / 2);
      put(ch, rbox(0.42, 0.04, 0.4, 0.02), MP("#1f8a4a", 0.4), 0, 0.46, 0);
      put(ch, rbox(0.42, 0.42, 0.04, 0.02), MP("#1f8a4a", 0.4), 0, 0.7, -0.19);
      for (const [a, b] of [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]]) put(ch, cyl(0.015, 0.015, 0.46, 6), STEEL(), a, 0.23, b);
    }
  }
  buildLaundry(R: THREE.Object3D) {
    const bm = M("#ffffff", 0.85, 0, { map: rep(brick("#7d8a99", 2), 7 / 2, 10 / 2) });
    this.facade(R, 9.5, 17, 10, bm, "#d8d2c4");
    this.winRow(R, 9.9, 16.6, 3.6, 9.2, 4, 3);
    put(R, new THREE.PlaneGeometry(6.6, 2.4), new THREE.MeshStandardMaterial({ map: interior(5), emissive: "#ffffff", emissiveMap: interior(5), emissiveIntensity: 0.3, roughness: 0.1 }), 13.25, 1.4, 0.02, { cast: false });
    const sign = canvas(1024, 160, (g) => { g.fillStyle = "#e9f4ff"; g.fillRect(0, 0, 1024, 160); text(g, "BUBBLES LAUNDROMAT", 512, 84, 90, "#2b5fb4"); });
    put(R, rbox(5.6, 0.55, 0.08, 0.02), M("#ffffff", 0.5, 0, { map: sign }), 13.25, 3.1, 0.08);
  }
  buildStand(R: THREE.Object3D) {
    const s = grp(R, STAND.x, 0, STAND.z);
    const stripe = canvas(512, 256, (g) => { for (let x = 0; x < 512; x += 64) { g.fillStyle = (x / 64) % 2 ? "#ffffff" : "#d8262e"; g.fillRect(x, 0, 64, 256); } });
    put(s, rbox(1.6, 0.85, 0.85, 0.04), MP("#ffffff", 0.4, { map: rep(stripe, 2, 1) }), 0, 0.55, 0);
    put(s, rbox(1.68, 0.06, 0.92, 0.02), M("#c9a55a", 0.3, 1), 0, 0.99, 0);
    for (const sx of [-1, 1]) { put(s, cyl(0.16, 0.16, 0.06, 24), M("#222", 0.5), sx * 0.55, 0.16, 0.45, { rx: Math.PI / 2 }); put(s, cyl(0.07, 0.07, 0.07, 16), M("#c9a55a", 0.3, 1), sx * 0.55, 0.16, 0.45, { rx: Math.PI / 2 }); }
    // glass case full of popcorn
    const gl = MP("#e8f6ff", 0.02, { transparent: true, opacity: 0.25 });
    put(s, rbox(1.3, 0.75, 0.7, 0.02), gl, 0, 1.4, -0.02, { cast: false });
    for (const [x, y] of [[-0.65, 1.4], [0.65, 1.4]]) put(s, rbox(0.04, 0.78, 0.74, 0.01), M("#c9a55a", 0.3, 1), x, y, -0.02);
    put(s, rbox(1.36, 0.05, 0.76, 0.01), M("#c9a55a", 0.3, 1), 0, 1.8, -0.02);
    const pop = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.035, 0), MP("#fff4cc", 0.7), 700);
    const r = rng(8);
    for (let k = 0; k < 700; k++) { const x = -0.6 + r() * 1.2, z = -0.32 + r() * 0.6, hgt = 0.18 + 0.12 * Math.cos(x * 2) * Math.cos(z * 3) + r() * 0.04; pop.setMatrixAt(k, new THREE.Matrix4().compose(new THREE.Vector3(x, 1.04 + r() * hgt, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 3, r() * 3, 0)), new THREE.Vector3(1, 0.8 + r() * 0.5, 1))); pop.setColorAt(k, new THREE.Color(r() < 0.2 ? "#f2c45a" : "#fff6d8")); }
    s.add(pop);
    put(s, cyl(0.12, 0.08, 0.06, 20), STEEL(), 0.25, 1.68, -0.02); // kettle
    // canopy + glowing POPCORN sign
    for (const sx of [-1, 1]) put(s, cyl(0.025, 0.025, 1.0, 8), M("#c9a55a", 0.3, 1), sx * 0.76, 2.2, 0.38);
    put(s, new THREE.CylinderGeometry(0.55, 0.55, 1.8, 24, 1, true, -Math.PI / 2, Math.PI), MP("#ffffff", 0.6, { map: rep(stripe, 3, 1), side: THREE.DoubleSide }), 0, 2.72, 0.05, { rz: Math.PI / 2, s: [1, 1, 0.7] });
    const ps = canvas(512, 128, (g) => { g.fillStyle = "#1a0b14"; g.fillRect(0, 0, 512, 128); text(g, "POPCORN", 256, 68, 96, "#ffd23f"); });
    put(s, rbox(1.2, 0.3, 0.06, 0.02), M("#1a0b14", 0.4), 0, 3.05, 0.3);
    put(s, new THREE.PlaneGeometry(1.1, 0.26), glow(ps, 2.4), 0, 3.05, 0.335, { cast: false });
    // buckets on the counter: small / medium / large
    const bucketT = canvas(256, 256, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? "#ffffff" : "#d8262e"; g.fillRect(x, 0, 32, 256); } });
    ([[-0.55, 0.07, 0.15], [-0.32, 0.085, 0.2], [-0.05, 0.1, 0.25]] as const).forEach(([x, r0, h]) => {
      const b = grp(s, x, 1.02, 0.32);
      put(b, cyl(r0, r0 * 0.75, h, 20, true), MP("#ffffff", 0.5, { map: bucketT, side: THREE.DoubleSide }), 0, h / 2, 0);
      for (let k = 0; k < 10; k++) put(b, new THREE.IcosahedronGeometry(0.03, 0), MP("#fff4cc", 0.7), Math.cos(k * 2.3) * r0 * 0.6, h + 0.01 + (k % 3) * 0.015, Math.sin(k * 2.3) * r0 * 0.6);
    });
    // the price board on an easel
    const bd = grp(R, BOARD.x, 0, BOARD.z, -0.42);
    put(bd, rbox(0.95, 1.25, 0.06, 0.02), M("#1a0b14", 0.4), 0, 1.2, 0);
    put(bd, new THREE.PlaneGeometry(0.88, 1.17), this.board, 0, 1.2, 0.032, { cast: false });
    for (const sx of [-1, 1]) put(bd, cyl(0.025, 0.025, 1.9, 8), M("#6b4a2a", 0.6), sx * 0.38, 0.93, -0.12, { rx: 0.12 });
    put(bd, cyl(0.022, 0.022, 1.8, 8), M("#6b4a2a", 0.6), 0, 0.9, -0.45, { rx: -0.32 });
  }
  buildProps(R: THREE.Object3D) {
    const lampHead = glow(canvas(8, 8, (g) => { g.fillStyle = "#fff0c8"; g.fillRect(0, 0, 8, 8); }), 0.2);
    this.lamps.push(lampHead);
    for (const x of [-8.5, 3.2, 11.8]) {
      const l = grp(R, x, 0, 3.95);
      put(l, cyl(0.06, 0.08, 4.4, 12), MP("#1d2a24", 0.35), 0, 2.2, 0);
      put(l, cyl(0.14, 0.16, 0.3, 12), MP("#1d2a24", 0.35), 0, 0.15, 0);
      put(l, rbox(0.06, 0.06, 0.6, 0.02), MP("#1d2a24", 0.35), 0, 4.3, -0.28);
      put(l, new THREE.ConeGeometry(0.22, 0.3, 16, 1, true), MP("#1d2a24", 0.35, { side: THREE.DoubleSide }), 0, 4.2, -0.55);
      put(l, new THREE.SphereGeometry(0.1, 12, 8), lampHead, 0, 4.1, -0.55, { cast: false });
      const pl = new THREE.PointLight("#ffcf8a", 0, 7, 2); pl.position.set(0, 3.9, -0.55); l.add(pl); this.lampLights.push(pl);
      // hanging flower basket
      put(l, new THREE.SphereGeometry(0.22, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MP("#5a3a20", 0.7), 0, 3.4, 0.25);
      for (let k = 0; k < 8; k++) put(l, new THREE.SphereGeometry(0.07, 8, 6), MP(k % 2 ? "#ff6a8a" : "#3f9b4a", 0.6), Math.cos(k) * 0.16, 3.42, 0.25 + Math.sin(k) * 0.16);
    }
    // trees in planters
    for (const x of [-12.5, 14.6]) {
      const t = grp(R, x, 0, 3.5);
      put(t, rbox(1.0, 0.35, 1.0, 0.03), M("#8f8a80", 0.8), 0, 0.17, 0);
      put(t, cyl(0.1, 0.14, 2.6, 10), M("#6b4a2a", 0.85), 0, 1.4, 0);
      const r = rng(x);
      for (let k = 0; k < 9; k++) put(t, new THREE.IcosahedronGeometry(0.75, 1), MP(k % 3 ? "#3f9b4a" : "#2f7f3a", 0.7, { clearcoat: 0 }), (r() - 0.5) * 1.3, 3.0 + r() * 1.1, (r() - 0.5) * 1.3, { s: 0.8 + r() * 0.4 });
    }
    // hydrant, bin, bench, bike rack
    const hy = grp(R, -4.6, 0, 3.9);
    put(hy, cyl(0.12, 0.14, 0.55, 16), MP("#d8262e", 0.3), 0, 0.28, 0); put(hy, new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MP("#d8262e", 0.3), 0, 0.55, 0);
    for (const sx of [-1, 1]) put(hy, cyl(0.05, 0.05, 0.1, 10), MP("#d8262e", 0.3), sx * 0.15, 0.38, 0, { rz: Math.PI / 2 });
    const bin = grp(R, 2.55, 0, 3.85);
    put(bin, cyl(0.25, 0.22, 0.9, 20), MP("#1f5a3a", 0.4), 0, 0.45, 0); put(bin, cyl(0.27, 0.27, 0.05, 20), MP("#1f5a3a", 0.4), 0, 0.92, 0);
    const bench = grp(R, 10.8, 0, 1.0);
    for (let k = 0; k < 3; k++) put(bench, rbox(1.6, 0.05, 0.12, 0.01), M("#a0703a", 0.6), 0, 0.45, -0.15 + k * 0.14);
    for (let k = 0; k < 2; k++) put(bench, rbox(1.6, 0.12, 0.04, 0.01), M("#a0703a", 0.6), 0, 0.65 + k * 0.16, -0.27, { rx: -0.15 });
    for (const sx of [-1, 1]) put(bench, rbox(0.06, 0.45, 0.45, 0.01), M("#222", 0.4, 0.8), sx * 0.7, 0.23, -0.05);
    for (let k = 0; k < 4; k++) put(R, new THREE.TorusGeometry(0.3, 0.02, 6, 20, Math.PI), STEEL(), 15.6 + k * 0.4, 0, 3.6, { ry: Math.PI / 2 });
    // parked car
    const car = grp(R, -9.8, -0.12, 5.6);
    put(car, rbox(3.9, 0.7, 1.75, 0.25), MP("#2b5fb4", 0.25, { clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.3 }), 0, 0.62, 0);
    put(car, rbox(2.2, 0.62, 1.6, 0.25), MP("#2b5fb4", 0.25, { clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.3 }), -0.2, 1.22, 0);
    put(car, rbox(2.05, 0.5, 1.64, 0.2), MP("#1a2430", 0.05, { metalness: 0.6 }), -0.2, 1.24, 0, { cast: false });
    for (const [x, z] of [[-1.25, 0.8], [1.25, 0.8], [-1.25, -0.8], [1.25, -0.8]]) { put(car, cyl(0.34, 0.34, 0.24, 20), M("#151515", 0.6), x, 0.34, z, { rx: Math.PI / 2 }); put(car, cyl(0.2, 0.2, 0.25, 16), M("#c0c4ca", 0.3, 1), x, 0.34, z, { rx: Math.PI / 2 }); }
    for (const sx of [-1, 1]) { put(car, new THREE.SphereGeometry(0.12, 12, 8), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff8e0"; g.fillRect(0, 0, 8, 8); }), 1.2), 1.95, 0.7, sx * 0.6, { s: [0.4, 1, 1] }); put(car, new THREE.SphereGeometry(0.1, 12, 8), glow(canvas(8, 8, (g) => { g.fillStyle = "#ff3030"; g.fillRect(0, 0, 8, 8); }), 1.0), -1.95, 0.75, sx * 0.6, { s: [0.4, 1, 1] }); }
  }
  setLight(golden: boolean) {
    this.golden = golden;
    (this.sky.material as THREE.ShaderMaterial).dispose(); this.sky.material = skyMat(golden);
    if (golden) {
      this.sun.color.set("#ff9442"); this.sun.intensity = 4.2; this.sun.position.set(18, 4.2, 13); this.sun.target.position.set(4, 0, 1);
      this.hemi.color.set("#ffb07a"); this.hemi.groundColor.set("#4a3a6a"); this.hemi.intensity = 0.42;
      this.lamps.forEach((m) => (m.emissiveIntensity = 4)); this.lampLights.forEach((l) => (l.intensity = 6));
      this.windowsMats.forEach((m) => (m.emissiveIntensity = 0.9)); this.marquee.emissiveIntensity = 0.8;
    } else {
      this.sun.color.set("#fff4e0"); this.sun.intensity = 3.2; this.sun.position.set(-6, 14, 12); this.sun.target.position.set(0, 0, 1);
      this.hemi.color.set("#cfe4ff"); this.hemi.groundColor.set("#8a7a64"); this.hemi.intensity = 0.9;
      this.lamps.forEach((m, i) => (m.emissiveIntensity = i === 0 ? 2.2 : 0.2)); this.lampLights.forEach((l) => (l.intensity = 0));
      this.windowsMats.forEach((m) => (m.emissiveIntensity = 0.35)); this.marquee.emissiveIntensity = 0.25;
    }
  }
  setConfetti(t: number, at: number, c: THREE.Vector3) {
    const u = t - at;
    this.confetti.visible = u > 0;
    if (u <= 0) return;
    const r = rng(77), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let k = 0; k < 160; k++) {
      const vx = (r() - 0.5) * 3, vy = 2 + r() * 3, vz = (r() - 0.5) * 2 + 0.6, sp = r() * 6;
      const tt = Math.min(u, 4);
      const x = c.x + vx * tt + Math.sin(u * 3 + sp) * 0.2, y = Math.max(0.02, c.y + vy * tt - 2.2 * tt * tt * 0.6), z = c.z + vz * tt;
      e.set(u * 4 + sp, u * 3 + sp, sp); q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1)); this.confetti.setMatrixAt(k, m);
    }
    this.confetti.instanceMatrix.needsUpdate = true;
  }
}
