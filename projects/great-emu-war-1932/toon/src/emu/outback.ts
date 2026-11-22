// "The Great Emu War" (Western Australia, November 1932), detailed style: a red dirt road along x, wheat fields on both
// sides (instanced swaying tufts, a trampled patch where the emus feed), a returned soldier's farm (weatherboard house
// with a veranda and a corrugated roof, a windmill, a corrugated water tank, a shed with the November 1932 calendar),
// gum trees, the CAMPION siding sign, and the army camp (tent, chalkboard tally, ten crates of 1,000 rounds, a truck
// with a Lewis gun). Emus are built and animated here too (run, peck, look, drum).
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, rr, text, rng, ink } from "../look/kit";

export const FARM = new THREE.Vector3(16, 0, -12);
export const CAMP = new THREE.Vector3(-10, 0, 9);
export const TANKW = new THREE.Vector3(19, 0, -6.5);
export const TRUCK0 = new THREE.Vector3(-4, 0, 2);

const dirt = () => canvas(1024, 1024, (g) => { const r = rng(2); g.fillStyle = "#b8683c"; g.fillRect(0, 0, 1024, 1024); for (let k = 0; k < 16000; k++) { const v = r(); g.fillStyle = v < 0.5 ? `rgba(120,50,20,${r() * 0.25})` : `rgba(240,170,110,${r() * 0.2})`; g.fillRect(r() * 1024, r() * 1024, 2 + r() * 4, 2 + r() * 4); } for (let k = 0; k < 6; k++) { g.strokeStyle = "rgba(90,40,15,0.25)"; g.lineWidth = 18; g.beginPath(); g.moveTo(0, 300 + k * 90); g.bezierCurveTo(300, 280 + k * 95, 700, 320 + k * 85, 1024, 300 + k * 90); g.stroke(); } });
const fieldGround = () => canvas(512, 512, (g) => { const r = rng(4); g.fillStyle = "#b08a3a"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 9000; k++) { g.fillStyle = r() < 0.5 ? "rgba(120,80,20,0.3)" : "rgba(240,210,120,0.3)"; g.fillRect(r() * 512, r() * 512, 2, 6); } });
const wheatTex = () => canvas(256, 256, (g) => {
  const r = rng(6); g.clearRect(0, 0, 256, 256);
  for (let k = 0; k < 26; k++) {
    const x = 10 + r() * 236, top = 10 + r() * 60, lean = (r() - 0.5) * 30;
    g.strokeStyle = `rgb(${200 + r() * 40},${160 + r() * 40},${70 + r() * 30})`; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 256); g.quadraticCurveTo(x + lean * 0.3, 140, x + lean, top + 30); g.stroke();
    g.fillStyle = `rgb(${220 + r() * 30},${180 + r() * 40},${80 + r() * 30})`;
    for (let j = 0; j < 7; j++) { g.beginPath(); g.ellipse(x + lean + (j % 2 ? 4 : -4), top + j * 6, 4, 7, (j % 2 ? 0.5 : -0.5), 0, 7); g.fill(); }
  }
});
const weatherboard = () => canvas(512, 512, (g) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 512, 512); for (let y = 0; y < 512; y += 32) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y + 28, 512, 4); g.fillStyle = "rgba(255,255,255,0.3)"; g.fillRect(0, y, 512, 3); } });
const corrugated = (col: string) => canvas(512, 512, (g) => { for (let x = 0; x < 512; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, col); gr.addColorStop(0.5, "#ffffff"); gr.addColorStop(1, col); g.fillStyle = gr; g.fillRect(x, 0, 16, 512); } g.fillStyle = "rgba(140,70,30,0.18)"; for (let k = 0; k < 40; k++) g.fillRect(Math.random() * 512, Math.random() * 512, 30, 4); });
const feather = () => canvas(512, 512, (g) => {
  const r = rng(9); g.fillStyle = "#4a3c30"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 2600; k++) { const x = r() * 512, y = r() * 512, l = 14 + r() * 26; g.strokeStyle = r() < 0.5 ? `rgba(30,22,16,${0.4 + r() * 0.4})` : `rgba(150,130,110,${0.3 + r() * 0.3})`; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + l * 0.5, x + (r() - 0.5) * 8, y + l); g.stroke(); }
});
export const chalkTex = (lines: [string, string?][]) => canvas(1024, 768, (g) => {
  g.fillStyle = "#1f3328"; g.fillRect(0, 0, 1024, 768);
  const r = rng(3); for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * 1024, r() * 768, 40, 6); }
  g.strokeStyle = "#8a5a30"; g.lineWidth = 30; g.strokeRect(0, 0, 1024, 768);
  lines.forEach(([s, col], i) => { g.save(); g.translate(512, 120 + i * 130); g.rotate((i % 2 ? 1 : -1) * 0.015); text(g, s, 0, 0, i === 0 ? 76 : 84, col ?? "#f2f2ea"); g.restore(); });
});
const crateTex = () => canvas(512, 256, (g) => { g.fillStyle = "#6b6a3a"; g.fillRect(0, 0, 512, 256); g.strokeStyle = "#3a3a1e"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 246); text(g, ".303 BALL", 256, 80, 64, "#f1ead0"); text(g, "1,000 RDS", 256, 175, 84, "#f1ead0"); });
const calTex = () => canvas(384, 480, (g) => {
  g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, 384, 480); g.fillStyle = "#7a1515"; g.fillRect(0, 0, 384, 120); text(g, "NOVEMBER", 192, 50, 56, "#f6f1e4"); text(g, "1932", 192, 100, 40, "#f6f1e4", INTER);
  for (let d = 1; d <= 30; d++) { const c = (d + 1) % 7, rr_ = Math.floor((d + 1) / 7); text(g, String(d), 32 + c * 52, 160 + rr_ * 60, 30, "#1c1814", INTER); if (d === 2) { g.strokeStyle = "#d8262e"; g.lineWidth = 5; g.beginPath(); g.arc(32 + c * 52, 160 + rr_ * 60, 24, 0, 7); g.stroke(); } }
});
const signTex = (s: string, sub = "") => canvas(1024, 256, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 1024, 256); g.strokeStyle = "#1c1814"; g.lineWidth = 14; g.strokeRect(10, 10, 1004, 236); text(g, s, 512, sub ? 110 : 132, 130, "#1c1814"); if (sub) text(g, sub, 512, 205, 44, "#5a4a2a", INTER); });
export const reportTex = () => canvas(640, 840, (g) => {
  g.fillStyle = "#f3ecd8"; g.fillRect(0, 0, 640, 840);
  text(g, "REPORT", 320, 80, 70, "#1c1814"); text(g, "MAJ. G.P.W. MEREDITH · 1932", 320, 140, 26, "#1c1814", INTER);
  g.fillStyle = "#1c1814"; g.fillRect(60, 175, 520, 3);
  text(g, "EMUS CLAIMED:", 320, 280, 54, "#1c1814"); text(g, "986", 320, 380, 120, "#7a1515");
  text(g, "ROUNDS FIRED:", 320, 510, 54, "#1c1814"); text(g, "9,860", 320, 610, 110, "#7a1515");
  for (let k = 0; k < 5; k++) { g.fillStyle = "rgba(28,24,20,0.35)"; g.fillRect(70, 690 + k * 24, 500 - (k % 3) * 60, 8); }
});
const tankTex = () => canvas(1024, 512, (g) => {
  for (let x = 0; x < 1024; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, "#9aa0a4"); gr.addColorStop(0.5, "#e6eaec"); gr.addColorStop(1, "#9aa0a4"); g.fillStyle = gr; g.fillRect(x, 0, 16, 512); }
  for (let y = 0; y < 512; y += 128) { g.fillStyle = "rgba(60,60,60,0.35)"; g.fillRect(0, y, 1024, 5); }
  g.fillStyle = "rgba(150,80,40,0.25)"; for (let k = 0; k < 60; k++) g.fillRect(Math.random() * 1024, Math.random() * 512, 6, 40);
});
export const tankPaint = () => canvas(1024, 512, (g) => {
  g.clearRect(0, 0, 1024, 512);
  g.save(); g.translate(512, 256); g.rotate(-0.02);
  g.font = `110px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round"; g.strokeStyle = "#ffffff"; g.lineWidth = 16;
  g.strokeText("FOLLOW FOR MORE", 0, -75); g.strokeText("WEIRD HISTORY", 0, 70); g.fillStyle = "#b8232c"; g.fillText("FOLLOW FOR MORE", 0, -75); g.fillText("WEIRD HISTORY", 0, 70); g.restore();
});

// ---------------- emu ----------------
export class Emu {
  root: THREE.Group; body: THREE.Group; neck: THREE.Mesh; head: THREE.Group; legs: THREE.Group[] = []; leaves: THREE.Group; helmet?: THREE.Group;
  constructor(parent: THREE.Object3D, s = 1, seed = 0) {
    this.root = grp(parent); this.root.scale.setScalar(s);
    this.body = grp(this.root, 0, 1.05, 0);
    const fm = new THREE.MeshPhysicalMaterial({ map: feather(), color: "#ffffff", roughness: 0.92, sheen: 0.8, sheenColor: new THREE.Color("#a08a70"), sheenRoughness: 0.6 });
    ink(put(this.body, new THREE.SphereGeometry(0.42, 28, 20), fm, 0, 0, 0, { s: [1.0, 0.95, 1.4] }), 0.01);
    ink(put(this.body, new THREE.SphereGeometry(0.2, 16, 12), fm, 0, 0.08, -0.58, { s: [1.2, 1, 1.1] }), 0.008);        // tail fluff
    for (const sx of [-1, 1]) {
      const hip = grp(this.root, sx * 0.17, 0.92, -0.02);
      put(hip, new THREE.SphereGeometry(0.15, 14, 10), fm, 0, -0.05, 0, { s: [0.9, 1.3, 1] });
      const shin = M("#8a7a62", 0.7);
      put(hip, cyl(0.045, 0.035, 0.85, 10), shin, 0, -0.5, 0);
      for (const a of [-0.45, 0, 0.45]) put(hip, rbox(0.035, 0.03, 0.17, 0.01), shin, Math.sin(a) * 0.07, -0.91, 0.07 + Math.cos(a) * 0.03, { ry: a });
      this.legs.push(hip);
    }
    this.neck = put(this.root, new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ color: "#8aa0b8", roughness: 0.75, sheen: 0.5, sheenColor: new THREE.Color("#c8d8e8") }), 0, 0, 0);
    this.head = grp(this.root, 0, 1.9, 0.45);
    ink(put(this.head, new THREE.SphereGeometry(0.1, 18, 14), MP("#7e94ab", 0.7), 0, 0, 0, { s: [0.9, 1, 1.15] }), 0.006);
    ink(put(this.head, new THREE.ConeGeometry(0.035, 0.13, 12), MP("#3a2e24", 0.4), 0, -0.02, 0.15, { rx: Math.PI / 2, s: [1.3, 1, 0.6] }), 0.004);
    for (const sx of [-1, 1]) {
      put(this.head, new THREE.SphereGeometry(0.045, 14, 10), MP("#ffffff", 0.3), sx * 0.065, 0.025, 0.06, { cast: false });
      put(this.head, new THREE.SphereGeometry(0.025, 12, 8), M("#c46a1a", 0.3), sx * 0.09, 0.03, 0.085, { cast: false });
      put(this.head, new THREE.SphereGeometry(0.014, 10, 8), M("#0a0a0a", 0.2), sx * 0.1, 0.032, 0.1, { cast: false });
    }
    put(this.head, new THREE.SphereGeometry(0.07, 10, 8), fm, 0, 0.08, -0.03, { s: [0.9, 0.6, 1.1] });                // head fuzz
    this.leaves = grp(this.head, 0, 0.1, 0); this.leaves.visible = false;
    for (let k = 0; k < 6; k++) put(this.leaves, new THREE.SphereGeometry(0.06, 8, 6), MP(k % 2 ? "#5a8a3a" : "#3f7030", 0.7), Math.cos(k) * 0.06, 0.03 + (k % 3) * 0.03, Math.sin(k) * 0.06, { s: [1.5, 0.5, 0.8], rz: k });
    void seed;
  }
  /** run: phase (rad), amount 0..1; peck 0..1 lowers the head; look: head yaw */
  pose(phase: number, run: number, peck: number, look = 0, t = 0) {
    const sw = Math.sin(phase) * 0.75 * run;
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    const bob = Math.abs(Math.cos(phase)) * 0.07 * run;
    this.body.position.y = 1.05 + bob; this.body.rotation.x = 0.08 * run + 0.25 * peck;
    const base = new THREE.Vector3(0, 1.2 + bob, 0.48);
    const hx = Math.sin(look) * 0.2, headY = 1.9 + bob - 1.25 * peck + 0.05 * Math.sin(t * 3), headZ = 0.55 + 0.5 * run + 0.35 * peck;
    const mid = new THREE.Vector3(hx * 0.5, (base.y + headY) / 2 + 0.1 * (1 - peck), (base.z + headZ) / 2 - 0.05 + 0.2 * peck);
    const end = new THREE.Vector3(hx, headY, headZ);
    this.neck.geometry.dispose();
    this.neck.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([base, mid, end]), 12, 0.055, 10, false);
    this.head.position.copy(end); this.head.rotation.set(0.15 + 1.2 * peck - 0.2 * run, look, 0);
  }
}

// ---------------- Lewis gun ----------------
export const lewisGun = () => {
  const g = new THREE.Group(), dk = M("#2a2c2a", 0.45, 0.7), wd = M("#6b4a2a", 0.6);
  put(g, cyl(0.06, 0.06, 0.75, 16), dk, 0, 0, 0.35, { rx: Math.PI / 2 });
  for (let k = 0; k < 6; k++) put(g, cyl(0.068, 0.068, 0.02, 16), dk, 0, 0, 0.1 + k * 0.1, { rx: Math.PI / 2 });
  put(g, cyl(0.02, 0.02, 0.15, 8), dk, 0, 0, 0.78, { rx: Math.PI / 2 });
  put(g, rbox(0.1, 0.12, 0.35, 0.02), dk, 0, 0, -0.15);
  put(g, cyl(0.16, 0.16, 0.05, 28), dk, 0, 0.1, -0.05);
  put(g, cyl(0.04, 0.04, 0.06, 12), M("#4a4c4a", 0.4, 0.8), 0, 0.13, -0.05);
  put(g, rbox(0.06, 0.12, 0.32, 0.02), wd, 0, -0.04, -0.45, { rx: 0.1 });
  put(g, rbox(0.04, 0.12, 0.05, 0.01), wd, 0, -0.1, -0.28, { rx: 0.3 });
  return g;
};
export const tripod = () => {
  const g = new THREE.Group(), m = M("#3a3c38", 0.5, 0.6);
  for (const a of [0, 2.1, 4.2]) put(g, cyl(0.02, 0.025, 0.95, 8), m, Math.sin(a) * 0.22, 0.42, Math.cos(a) * 0.22, { rx: Math.cos(a) * 0.45, rz: -Math.sin(a) * 0.45 });
  put(g, cyl(0.04, 0.04, 0.12, 10), m, 0, 0.86, 0);
  return g;
};

export class Outback {
  root = new THREE.Group(); sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; skyMat: THREE.ShaderMaterial;
  wheatMat!: THREE.MeshStandardMaterial; wheatT = { value: 0 };
  windmill!: THREE.Group; truck!: THREE.Group; truckGun!: THREE.Group; chalk!: THREE.MeshStandardMaterial; chalkCache = new Map<string, THREE.Texture>();
  tankSign!: THREE.Mesh; dust: THREE.Sprite[] = []; smoke: THREE.Sprite;
  gunA!: THREE.Group; gunB!: THREE.Group; report!: THREE.Mesh;
  constructor() {
    const R = this.root;
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color("#2f7fe0") }, mid: { value: new THREE.Color("#8fc4f2") }, bot: { value: new THREE.Color("#f4e6cc") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.06 ? mix(mid, top, smoothstep(0.06, 0.6, h)) : mix(bot, mid, smoothstep(-0.03, 0.06, h)); gl_FragColor = vec4(c * 1.1, 1.0); }" });
    R.add(new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), this.skyMat));
    // ground: red dirt road + plain, golden field ground, distant hills
    put(R, new THREE.PlaneGeometry(400, 400), M("#ffffff", 0.95, 0, { map: rep(dirt(), 40, 40) }), 0, -0.02, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(160, 5), M("#ffffff", 0.9, 0, { map: rep(dirt(), 16, 1), color: "#d0906a" }), 0, 0.0, 2, { rx: -Math.PI / 2, cast: false });
    for (const [x0, x1, z0, z1] of [[-70, 6, -2.2, -45], [26, 80, -2.2, -45], [-70, -18, 5.5, 40], [4, 80, 5.5, 40]] as const)
      put(R, new THREE.PlaneGeometry(x1 - x0, Math.abs(z1 - z0)), M("#ffffff", 0.95, 0, { map: rep(fieldGround(), (x1 - x0) / 4, Math.abs(z1 - z0) / 4) }), (x0 + x1) / 2, 0.01, (z0 + z1) / 2, { rx: -Math.PI / 2, cast: false });
    const r = rng(17);
    for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, d = 140 + r() * 30; put(R, new THREE.SphereGeometry(18 + r() * 14, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(k % 2 ? "#a86a48" : "#9a7a58", 0.95), Math.cos(a) * d, -2, Math.sin(a) * d, { s: [1.6, 0.35 + r() * 0.2, 1], cast: false }); }
    this.buildWheat(R); this.buildFarm(R); this.buildCamp(R); this.buildTrees(R);
    // lights
    this.hemi = new THREE.HemisphereLight("#cfe4ff", "#b07a50", 0.95); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff0d4", 3.6); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    R.add(this.sun, this.sun.target);
    // dust puffs + gun smoke
    const pt = canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(210,150,100,0.7)"); gr.addColorStop(1, "rgba(210,150,100,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    for (let k = 0; k < 40; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthWrite: false })); s.visible = false; R.add(s); this.dust.push(s); }
    const sm = canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(240,240,240,0.9)"); gr.addColorStop(1, "rgba(240,240,240,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    this.smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: sm, transparent: true, depthWrite: false })); this.smoke.visible = false; R.add(this.smoke);
  }
  buildWheat(R: THREE.Object3D) {
    const tex = wheatTex();
    this.wheatMat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.85 });
    const wt = this.wheatT;
    this.wheatMat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = wt;
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uT;").replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvec4 wp = instanceMatrix * vec4(position, 1.0); float sway = position.y * (0.12 * sin(uT * 1.7 + wp.x * 0.35 + wp.z * 0.2) + 0.05 * sin(uT * 3.1 + wp.z));\ntransformed.x += sway; transformed.z += sway * 0.4;");
    };
    const geo = new THREE.BufferGeometry();
    const q = new THREE.PlaneGeometry(1.1, 1.05); q.translate(0, 0.52, 0);
    const q2 = q.clone(); q2.rotateY(Math.PI / 2);
    const merged = [q, q2].reduce((acc, g) => { const p = acc.pos.concat(Array.from(g.attributes.position.array as Float32Array)); const n = acc.nor.concat(Array.from(g.attributes.normal.array as Float32Array)); const u = acc.uv.concat(Array.from(g.attributes.uv.array as Float32Array)); const off = acc.pos.length / 3; const idx = acc.idx.concat(Array.from(g.index!.array).map((i) => i + off)); return { pos: p, nor: n, uv: u, idx }; }, { pos: [] as number[], nor: [] as number[], uv: [] as number[], idx: [] as number[] });
    geo.setAttribute("position", new THREE.Float32BufferAttribute(merged.pos, 3)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(merged.nor, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(merged.uv, 2)); geo.setIndex(merged.idx);
    const pts: THREE.Matrix4[] = []; const r = rng(31);
    const fields: [number, number, number, number][] = [[-60, 6, -2.4, -40], [26, 60, -2.4, -40], [-60, -18, 5.8, 34], [4, 60, 5.8, 34]];
    for (const [x0, x1, z0, z1] of fields) for (let x = x0; x < x1; x += 0.75) for (let z = Math.min(z0, z1); z < Math.max(z0, z1); z += 0.75) {
      const px = x + r() * 0.6, pz = z + r() * 0.6;
      const trampled = px > -14 && px < -2 && pz < -4 && pz > -16 && r() < 0.75;
      const s = trampled ? 0.35 + r() * 0.2 : 0.85 + r() * 0.35;
      pts.push(new THREE.Matrix4().compose(new THREE.Vector3(px, 0, pz), new THREE.Quaternion().setFromEuler(new THREE.Euler(trampled ? (r() - 0.5) * 1.6 : 0, r() * 3, trampled ? (r() - 0.5) * 1.4 : 0)), new THREE.Vector3(1, s, 1)));
    }
    const im = new THREE.InstancedMesh(geo, this.wheatMat, pts.length);
    pts.forEach((m, i) => im.setMatrixAt(i, m)); im.receiveShadow = true; im.castShadow = false;
    R.add(im);
    // fences along the road
    const post = M("#7a5a3a", 0.85);
    for (const z of [-1.8, 5.2]) { for (let x = -60; x <= 60; x += 3) put(R, cyl(0.06, 0.07, 1.2, 6), post, x, 0.6, z, { rz: Math.sin(x) * 0.04 }); for (const y of [0.5, 0.9]) put(R, cyl(0.006, 0.006, 120, 4), M("#b0b4b8", 0.4, 0.8), 0, y, z, { rz: Math.PI / 2, cast: false }); }
  }
  buildFarm(R: THREE.Object3D) {
    const F = grp(R, FARM.x, 0, FARM.z);
    put(F, new THREE.PlaneGeometry(22, 18), M("#c89a6a", 0.95), 0, 0.02, 0, { rx: -Math.PI / 2, cast: false });
    // house: weatherboard walls, corrugated hip roof, veranda with posts, windows, door, steps
    const H = grp(F, 0, 0, -2);
    put(H, new THREE.BoxGeometry(9, 3.0, 6), M("#ffffff", 0.75, 0, { map: rep(weatherboard(), 3, 1) }), 0, 1.5 + 0.4, 0);
    put(H, rbox(9.2, 0.4, 6.2, 0.02), M("#8a6a4a", 0.8), 0, 0.2, 0);
    const roofM = MP("#ffffff", 0.35, { map: rep(corrugated("#8a2a22"), 6, 1), metalness: 0.4 });
    put(H, new THREE.ConeGeometry(6.4, 2.4, 4, 1), roofM, 0, 4.6, 0, { ry: Math.PI / 4, s: [1.05, 1, 0.72] });
    put(H, new THREE.BoxGeometry(10, 0.08, 2.6), roofM, 0, 3.25, 4.1, { rx: 0.18 });
    for (let k = 0; k < 6; k++) put(H, cyl(0.07, 0.07, 3.1, 8), M("#efe6d2", 0.6), -4.6 + k * 1.84, 1.75, 5.3);
    put(H, rbox(10, 0.15, 2.6, 0.02), M("#8a6a4a", 0.8), 0, 0.45, 4.1);
    for (let k = 0; k < 20; k++) put(H, rbox(0.05, 0.6, 0.05, 0.01), M("#efe6d2", 0.6), -4.8 + k * 0.5, 0.85, 5.35);
    put(H, rbox(10, 0.07, 0.07, 0.01), M("#efe6d2", 0.6), 0, 1.17, 5.35);
    const winT = canvas(256, 256, (g) => { g.fillStyle = "#2a3a4a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(20, 20, 80, 216); g.fillStyle = "#efe6d2"; g.fillRect(122, 0, 12, 256); g.fillRect(0, 122, 256, 12); g.strokeStyle = "#efe6d2"; g.lineWidth = 20; g.strokeRect(0, 0, 256, 256); });
    for (const x of [-3, 3]) { put(H, new THREE.PlaneGeometry(1.3, 1.4), MP("#ffffff", 0.1, { map: winT }), x, 2.0, 3.01, { cast: false }); put(H, rbox(1.5, 0.1, 0.2, 0.02), M("#2f5a3a", 0.6), x, 2.75, 3.05); for (const sx of [-1, 1]) put(H, rbox(0.35, 1.4, 0.05, 0.01), M("#2f5a3a", 0.6), x + sx * 0.85, 2.0, 3.04); }
    put(H, rbox(1.1, 2.2, 0.08, 0.02), M("#2f5a3a", 0.6), 0, 1.5, 3.02);
    put(H, cyl(0.3, 0.3, 1.6, 10), M("#9a5a3a", 0.85), 3.5, 5.0, -1.5);   // chimney
    // windmill
    this.windmill = grp(F, 8, 0, 2);
    const wm = M("#c0c4c8", 0.4, 0.6);
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) put(this.windmill, cyl(0.05, 0.05, 9, 6), wm, x * 0.6, 4.5, z * 0.6, { rx: -z * 0.1, rz: x * 0.1 });
    for (let k = 0; k < 6; k++) put(this.windmill, rbox(1.8 - k * 0.2, 0.04, 0.04, 0.01), wm, 0, 1 + k * 1.4, 0.6 - k * 0.06);
    const hub = grp(this.windmill, 0, 9.2, 0.4); hub.name = "rotor";
    for (let k = 0; k < 14; k++) put(hub, rbox(0.25, 1.6, 0.02, 0.01), M("#e8ecee", 0.4, 0.5), Math.sin(k * Math.PI / 7) * 0.9, Math.cos(k * Math.PI / 7) * 0.9, 0, { rz: -k * Math.PI / 7, ry: 0.4 });
    put(hub, cyl(0.15, 0.15, 0.3, 12), wm, 0, 0, 0, { rx: Math.PI / 2 });
    put(this.windmill, rbox(0.06, 0.8, 1.6, 0.01), M("#e8ecee", 0.4, 0.5), 0, 9.2, -1.2);
    // corrugated water tank (the end card is painted on it)
    const T = grp(R, TANKW.x, 0, TANKW.z);
    put(T, cyl(1.9, 1.9, 0.6, 24), M("#7a5a3a", 0.8), 0, 0.3, 0);
    put(T, cyl(1.8, 1.8, 3.0, 40), MP("#ffffff", 0.35, { map: tankTex(), metalness: 0.5 }), 0, 2.1, 0);
    put(T, new THREE.ConeGeometry(1.85, 0.6, 40), MP("#c8ccd0", 0.35, { metalness: 0.5 }), 0, 3.9, 0);
    this.tankSign = put(T, new THREE.CylinderGeometry(1.815, 1.815, 2.0, 40, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: tankPaint(), transparent: true, roughness: 0.5 }), 0, 2.1, 0, { cast: false });
    // shed with the November 1932 calendar
    const S = grp(F, -7, 0, -1, 0.3);
    S.name = "shed";
    put(S, new THREE.BoxGeometry(4, 2.8, 3.5), MP("#ffffff", 0.4, { map: rep(corrugated("#8a8e90"), 2, 1), metalness: 0.4 }), 0, 1.4, 0);
    put(S, new THREE.BoxGeometry(4.4, 0.08, 4), MP("#ffffff", 0.4, { map: rep(corrugated("#8a2a22"), 2, 1), metalness: 0.4 }), 0, 2.9, 0, { rx: 0.12 });
    put(S, rbox(0.55, 0.7, 0.02, 0.01), M("#ffffff", 0.6, 0, { map: calTex() }), 0.9, 1.6, 1.77);
    put(S, rbox(1.5, 2.2, 0.06, 0.01), M("#6a4a2a", 0.8), -0.7, 1.1, 1.77);
    // farm sign at the gate (returned soldier)
    const gs = grp(R, FARM.x - 6, 0, -1.9);
    for (const sx of [-1, 1]) put(gs, cyl(0.08, 0.08, 2.2, 8), M("#7a5a3a", 0.85), sx * 1.1, 1.1, 0);
    put(gs, rbox(2.4, 0.7, 0.06, 0.02), M("#ffffff", 0.7, 0, { map: signTex("WHEAT FARM", "RETURNED SOLDIER · W.A.") }), 0, 1.75, 0.04);
    // CAMPION siding sign
    const cs = grp(R, 30, 0, 6.2);
    put(cs, rbox(8, 0.6, 2.2, 0.04), M("#9a8a70", 0.9), 0, 0.3, 0.6);
    for (const sx of [-1, 1]) put(cs, cyl(0.08, 0.08, 2.4, 8), M("#2a2a2a", 0.5), sx * 1.4, 1.2, 0);
    put(cs, rbox(3.2, 0.8, 0.08, 0.02), M("#ffffff", 0.6, 0, { map: signTex("CAMPION") }), 0, 2.2, 0.05);
    for (const z of [2.5, 3.5]) put(R, rbox(160, 0.08, 0.1, 0.01), M("#8a8e90", 0.3, 0.9), 0, 0.05, z + 6.0);
  }
  buildCamp(R: THREE.Object3D) {
    const C = grp(R, CAMP.x, 0, CAMP.z);
    put(C, new THREE.CircleGeometry(9, 32), M("#c27a4a", 0.95), 0, 0.02, 0, { rx: -Math.PI / 2, cast: false });
    // canvas tent
    const tent = grp(C, -3, 0, 2.5);
    const cv = MP("#b8a878", 0.85, { side: THREE.DoubleSide, clearcoat: 0 });
    put(tent, new THREE.CylinderGeometry(0.01, 2.2, 2.6, 4, 1, true), cv, 0, 1.3, 0, { ry: Math.PI / 4, s: [1.4, 1, 1] });
    put(tent, cyl(0.04, 0.04, 2.8, 6), M("#6a4a2a", 0.8), 0, 1.4, 0);
    // camp table: typewriter + the report
    const tb = grp(C, 1.2, 0, 2.2);
    put(tb, rbox(1.6, 0.06, 0.9, 0.02), M("#8a6a4a", 0.7), 0, 0.78, 0);
    for (const [x, z] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) put(tb, cyl(0.03, 0.03, 0.78, 6), M("#6a4a2a", 0.7), x, 0.39, z);
    put(tb, rbox(0.42, 0.16, 0.36, 0.04), M("#1c1c1e", 0.4, 0.3), -0.35, 0.89, -0.05);
    put(tb, rbox(0.42, 0.05, 0.06, 0.02), M("#1c1c1e", 0.4, 0.3), -0.35, 1.0, -0.2);
    this.report = put(tb, new THREE.PlaneGeometry(0.42, 0.55), M("#ffffff", 0.7, 0, { map: reportTex() }), 0.35, 0.815, 0.05, { rx: -Math.PI / 2, rz: -0.15, cast: false });
    // chalkboard on an easel
    const cb = grp(C, 3.2, 0, -1.4, -0.35);
    this.chalk = new THREE.MeshStandardMaterial({ map: chalkTex([["EMU CAMPAIGN · 1932"]]), roughness: 0.9 });
    put(cb, rbox(2.0, 1.5, 0.06, 0.02), this.chalk, 0, 1.6, 0);
    for (const sx of [-1, 1]) put(cb, cyl(0.04, 0.04, 2.6, 6), M("#6a4a2a", 0.8), sx * 0.85, 1.2, -0.12, { rx: 0.12 });
    put(cb, cyl(0.04, 0.04, 2.4, 6), M("#6a4a2a", 0.8), 0, 1.15, -0.55, { rx: -0.32 });
    // ten crates of 1,000 rounds
    const ct = crateTex();
    for (let k = 0; k < 10; k++) put(C, rbox(0.8, 0.42, 0.5, 0.02), M("#ffffff", 0.75, 0, { map: ct }), -2.0 + (k % 4) * 0.84, 0.21 + Math.floor(k / 4) * 0.43, -2.3 + (k >= 8 ? 0.1 : 0), { ry: (k % 3 - 1) * 0.03 });
    put(C, rbox(1.2, 0.3, 0.06, 0.01), M("#ffffff", 0.7, 0, { map: canvas(512, 128, (g) => { g.fillStyle = "#1f3328"; g.fillRect(0, 0, 512, 128); text(g, "TOTAL: 10,000 RDS", 256, 66, 58, "#f2f2ea"); }) }), -0.75, 1.55, -2.05);
    // two Lewis guns on tripods
    this.gunA = grp(C, 4.5, 0, 2.0, Math.PI * 0.85); this.gunA.add(tripod()); const ga = lewisGun(); ga.position.y = 0.95; this.gunA.add(ga);
    this.gunB = grp(C, 5.6, 0, 1.2, Math.PI * 0.8); this.gunB.add(tripod()); const gb = lewisGun(); gb.position.y = 0.95; this.gunB.add(gb);
    // the army truck (a Lewis gun on a post in the tray)
    this.truck = grp(R, TRUCK0.x, 0, TRUCK0.z, Math.PI / 2);
    const od = MP("#5a5e3a", 0.5, { clearcoat: 0.3 });
    put(this.truck, rbox(1.7, 0.9, 1.9, 0.1), od, 0, 1.05, 1.7);
    put(this.truck, rbox(1.9, 1.5, 1.3, 0.08), od, 0, 1.55, 0.35);
    put(this.truck, rbox(2.0, 0.08, 1.45, 0.03), M("#3a3c28", 0.6), 0, 2.33, 0.35);
    put(this.truck, rbox(2.2, 0.3, 3.4, 0.05), M("#6a5a3a", 0.7), 0, 0.95, -2.0);
    for (const sx of [-1, 1]) put(this.truck, rbox(0.06, 0.5, 3.4, 0.02), M("#6a5a3a", 0.7), sx * 1.08, 1.3, -2.0);
    put(this.truck, rbox(1.6, 0.8, 0.06, 0.02), MP("#c0c4ca", 0.05, { transparent: true, opacity: 0.35 }), 0, 1.9, 1.02, { cast: false });
    for (const [x, z] of [[-0.95, 1.7], [0.95, 1.7], [-0.95, -2.6], [0.95, -2.6]]) { put(this.truck, cyl(0.47, 0.47, 0.22, 18), M("#1a1a1a", 0.7), x, 0.47, z, { rz: Math.PI / 2 }); put(this.truck, cyl(0.22, 0.22, 0.24, 12), M("#5a5e3a", 0.5), x, 0.47, z, { rz: Math.PI / 2 }); }
    const st = canvas(512, 128, (g) => { g.fillStyle = "#5a5e3a"; g.fillRect(0, 0, 512, 128); text(g, "R.A.A. · 7 HVY BTY", 256, 66, 52, "#f1ead0"); });
    for (const sx of [-1, 1]) put(this.truck, new THREE.PlaneGeometry(1.1, 0.28), M("#ffffff", 0.6, 0, { map: st }), sx * 0.96, 1.25, 1.7, { ry: sx * Math.PI / 2, cast: false });
    put(this.truck, cyl(0.05, 0.05, 1.0, 8), M("#3a3c38", 0.5, 0.6), 0, 1.6, -1.6);
    this.truckGun = lewisGun(); this.truckGun.position.set(0, 2.15, -1.6); this.truck.add(this.truckGun);
    for (const sx of [-1, 1]) put(this.truck, cyl(0.14, 0.14, 0.1, 14), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff8e0"; g.fillRect(0, 0, 8, 8); }), 0.6), sx * 0.6, 1.25, 2.67, { rx: Math.PI / 2 });
  }
  buildTrees(R: THREE.Object3D) {
    const r = rng(23);
    const trunk = MP("#e8e2d8", 0.6, { clearcoat: 0 }), leaf = [MP("#6a8a5a", 0.75, { clearcoat: 0 }), MP("#7a9a68", 0.75, { clearcoat: 0 }), MP("#5a7a4a", 0.75, { clearcoat: 0 })];
    for (const [x, z, s] of [[2, -6, 1.1], [24, -18, 1.3], [-22, 12, 1.2], [-30, -8, 1.0], [40, 14, 1.4], [6, 16, 0.9], [-16, -24, 1.2], [34, -26, 1.1], [-4, 22, 1.3]] as const) {
      const t = grp(R, x, 0, z); t.scale.setScalar(s);
      put(t, cyl(0.18, 0.3, 4.5, 10), trunk, 0, 2.25, 0, { rz: (r() - 0.5) * 0.2 });
      for (let k = 0; k < 3; k++) put(t, cyl(0.08, 0.14, 2.2, 8), trunk, (r() - 0.5) * 1.2, 4.6 + k * 0.3, (r() - 0.5) * 1.2, { rz: (r() - 0.5) * 1.2, rx: (r() - 0.5) * 1.0 });
      for (let k = 0; k < 10; k++) put(t, new THREE.IcosahedronGeometry(0.9 + r() * 0.5, 1), leaf[k % 3], (r() - 0.5) * 3.4, 5.4 + r() * 1.6, (r() - 0.5) * 3.4, { s: [1, 0.6, 1] });
    }
    for (let k = 0; k < 30; k++) { const x = -60 + r() * 120, z = (r() < 0.5 ? -1 : 1) * (42 + r() * 20); put(R, new THREE.SphereGeometry(0.8 + r() * 1.2, 10, 8), MP(k % 2 ? "#7a8a5a" : "#8a9a6a", 0.85, { clearcoat: 0 }), x, 0.4, z, { s: [1.4, 0.7, 1.2] }); }
  }
  setChalk(lines: [string, string?][]) { const k = JSON.stringify(lines); if (!this.chalkCache.has(k)) this.chalkCache.set(k, chalkTex(lines)); this.chalk.map = this.chalkCache.get(k)!; }
  setLight(kind: "day" | "golden") {
    const u = this.skyMat.uniforms;
    if (kind === "day") { u.top.value.set("#2f7fe0"); u.mid.value.set("#8fc4f2"); u.bot.value.set("#f4e6cc"); this.sun.color.set("#fff0d4"); this.sun.intensity = 3.6; this.sun.position.set(-20, 40, 26); this.hemi.intensity = 0.95; this.hemi.color.set("#cfe4ff"); }
    else { u.top.value.set("#3a4f9a"); u.mid.value.set("#f2a25a"); u.bot.value.set("#ffd08a"); this.sun.color.set("#ff9a4a"); this.sun.intensity = 4.0; this.sun.position.set(-40, 8, 20); this.hemi.intensity = 0.55; this.hemi.color.set("#ffb88a"); }
    this.sun.target.position.set(0, 0, 0);
  }
}
