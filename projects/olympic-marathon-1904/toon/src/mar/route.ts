// "The 1904 Olympic Marathon" (St. Louis), detailed style. Two sets: the stadium (origin: cinder track along x, finish
// line at x = 0, wooden grandstand with bunting and an instanced crowd, a hand-changed scoreboard, posters) and the
// country course (ROAD offset: dusty road along x, telegraph poles, rail fences, a general store with a 90°F
// thermometer, the mile-6 water tower, a MILE 9 post, an apple orchard, a shade tree, a field), early automobiles,
// dogs, props (brandy bottle + strychnine vial, apples), dust clouds.
import * as THREE from "three";
import { ANTON, INTER, M, MP, glow, canvas, rep, rbox, cyl, put, grp, text, rng, ink } from "../look/kit";

export const ROAD = new THREE.Vector3(300, 0, 0);
export const BOARD = new THREE.Vector3(-12, 0, -8);
export const POSTER = new THREE.Vector3(6, 0, 7.6);

const cinder = () => canvas(512, 512, (g) => { const r = rng(1); g.fillStyle = "#a8603e"; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 7000; k++) { g.fillStyle = r() < 0.5 ? `rgba(80,30,15,${r() * 0.3})` : `rgba(220,150,110,${r() * 0.25})`; g.fillRect(r() * 512, r() * 512, 2, 2); } });
const grass = (base = "#6f9a3f") => canvas(512, 512, (g) => { const r = rng(2); g.fillStyle = base; g.fillRect(0, 0, 512, 512); for (let k = 0; k < 8000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,70,20,0.35)" : "rgba(180,190,90,0.3)"; g.fillRect(r() * 512, r() * 512, 2, 5); } });
const dirtRoad = () => canvas(1024, 512, (g) => { const r = rng(3); g.fillStyle = "#c8a878"; g.fillRect(0, 0, 1024, 512); for (let k = 0; k < 9000; k++) { g.fillStyle = r() < 0.5 ? `rgba(120,90,50,${r() * 0.3})` : `rgba(240,220,180,${r() * 0.3})`; g.fillRect(r() * 1024, r() * 512, 2 + r() * 3, 2 + r() * 3); } for (const y of [170, 340]) { g.strokeStyle = "rgba(110,80,45,0.35)"; g.lineWidth = 26; g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x / 90) * 10); g.stroke(); } });
const boards = (base: string) => canvas(512, 512, (g) => { const r = rng(5); for (let y = 0; y < 512; y += 32) { const v = new THREE.Color(base).multiplyScalar(0.85 + r() * 0.25); g.fillStyle = `#${v.getHexString()}`; g.fillRect(0, y, 512, 30); g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, y + 30, 512, 2); } });
export const scoreTex = (lines: [string, string?][]) => canvas(1024, 768, (g) => {
  g.fillStyle = "#1d2a1d"; g.fillRect(0, 0, 1024, 768); g.strokeStyle = "#f1e6cf"; g.lineWidth = 12; g.strokeRect(20, 20, 984, 728);
  g.fillStyle = "#7a1d1d"; g.fillRect(20, 20, 984, 120); text(g, "MARATHON · 1904", 512, 82, 78, "#f1e6cf");
  lines.forEach(([s, col], i) => { g.fillStyle = "#f6f1e4"; const y = 230 + i * 150; g.fillRect(70, y - 58, 884, 116); text(g, s, 512, y + 4, s.length > 18 ? 66 : 84, col ?? "#1c1814"); });
});
const posterTex = () => canvas(512, 720, (g) => {
  g.fillStyle = "#efe2c0"; g.fillRect(0, 0, 512, 720); g.strokeStyle = "#7a1d1d"; g.lineWidth = 14; g.strokeRect(14, 14, 484, 692);
  text(g, "BOSTON", 256, 110, 110, "#1d2a5a"); text(g, "MARATHON", 256, 220, 88, "#1d2a5a"); text(g, "1905", 256, 320, 90, "#7a1d1d");
  g.fillStyle = "#1d2a5a"; g.fillRect(60, 380, 392, 6);
  text(g, "WINNER:", 256, 470, 64, "#1c1814"); text(g, "FRED LORZ", 256, 575, 88, "#7a1d1d");
});
const thermoTex = () => canvas(256, 768, (g) => {
  g.fillStyle = "#f2ead6"; g.fillRect(0, 0, 256, 768); g.strokeStyle = "#7a1515"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 758);
  text(g, "°F", 128, 60, 54, "#7a1515"); const y = (d: number) => 660 - (d - 30) * 7.5;
  for (let d = 30; d <= 100; d += 10) { g.fillStyle = "#1c1814"; g.fillRect(150, y(d) - 2, 40, 4); text(g, String(d), 200, y(d), 26, "#1c1814", INTER, "left"); }
  g.fillStyle = "#ddd"; g.fillRect(104, 120, 32, 560); g.fillStyle = "#d8262e"; g.fillRect(104, y(90), 32, 680 - y(90)); g.beginPath(); g.arc(120, 690, 36, 0, 7); g.fill();
  g.fillStyle = "#d8262e"; g.fillRect(40, y(90) - 3, 64, 6); text(g, "90", 70, y(90) - 26, 30, "#d8262e");
});
const signTex = (lines: string[], bg = "#f2ecd8", fg = "#1c1814") => canvas(768, 384, (g) => { g.fillStyle = bg; g.fillRect(0, 0, 768, 384); g.strokeStyle = fg; g.lineWidth = 12; g.strokeRect(10, 10, 748, 364); lines.forEach((s, i) => text(g, s, 384, 384 / (lines.length + 1) * (i + 1) + 6, lines.length > 1 ? 92 : 140, fg)); });
const starsTex = () => canvas(256, 256, (g) => { for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2, x = 128 + Math.cos(a) * 90, y = 128 + Math.sin(a) * 40; g.fillStyle = "#ffd23f"; g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 9 : 22, b = (j / 10) * Math.PI * 2; g.lineTo(x + Math.cos(b) * r, y + Math.sin(b) * r); } g.fill(); } });
const zzzTex = () => canvas(256, 256, (g) => { text(g, "Z", 60, 190, 70, "#2b5fb4"); text(g, "Z", 130, 120, 90, "#2b5fb4"); text(g, "Z", 200, 50, 110, "#2b5fb4"); });

// ---------------- early automobile ----------------
export const car = (col: string) => {
  const c = new THREE.Group(), body = MP(col, 0.3, { clearcoat: 1 }), brass = M("#c9a55a", 0.25, 1), blk = M("#1a1a1a", 0.6);
  put(c, rbox(1.4, 0.55, 2.6, 0.15), body, 0, 0.95, 0);
  put(c, rbox(1.2, 0.5, 0.8, 0.2), body, 0, 1.1, 1.1);
  put(c, rbox(1.3, 0.55, 0.12, 0.05), MP("#6b2a1a", 0.6), 0, 1.45, -0.35);           // seat back (tufted leather)
  put(c, rbox(1.3, 0.12, 0.8, 0.05), MP("#6b2a1a", 0.6), 0, 1.2, -0.0);
  put(c, cyl(0.03, 0.03, 0.8, 8), blk, 0.35, 1.45, 0.45, { rx: -0.6 }); put(c, new THREE.TorusGeometry(0.17, 0.02, 8, 24), blk, 0.35, 1.75, 0.25, { rx: -0.9 });
  for (const sx of [-1, 1]) { put(c, cyl(0.1, 0.12, 0.18, 14), brass, sx * 0.5, 1.25, 1.55, { rx: Math.PI / 2 }); put(c, new THREE.CircleGeometry(0.09, 16), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff6d0"; g.fillRect(0, 0, 8, 8); }), 0.6), sx * 0.5, 1.25, 1.65, { cast: false }); }
  for (const [x, z] of [[-0.78, 0.95], [0.78, 0.95], [-0.78, -0.9], [0.78, -0.9]]) {
    const w = grp(c, x, 0.48, z); w.name = "wheel";
    put(w, new THREE.TorusGeometry(0.42, 0.06, 10, 28), blk, 0, 0, 0, { ry: Math.PI / 2 });
    for (let k = 0; k < 10; k++) put(w, rbox(0.03, 0.8, 0.03, 0.005), M("#d8c8a0", 0.5), 0, 0, 0, { rx: (k * Math.PI) / 10 });
    put(w, cyl(0.07, 0.07, 0.1, 12), brass, 0, 0, 0, { rz: Math.PI / 2 });
  }
  put(c, new THREE.TorusGeometry(0.2, 0.03, 8, 20, Math.PI), brass, -0.55, 1.35, 1.3, { rz: 0.3 }); // horn
  return c;
};
// ---------------- dog ----------------
export class Dog {
  root: THREE.Group; legs: THREE.Group[] = []; head: THREE.Group; tail: THREE.Mesh;
  constructor(parent: THREE.Object3D, col: string, s = 1) {
    this.root = grp(parent); this.root.scale.setScalar(s);
    const fur = MP(col, 0.8, { sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), clearcoat: 0 });
    ink(put(this.root, new THREE.CapsuleGeometry(0.18, 0.5, 8, 16), fur, 0, 0.55, 0, { rx: Math.PI / 2 }), 0.008);
    this.head = grp(this.root, 0, 0.78, 0.42);
    ink(put(this.head, new THREE.SphereGeometry(0.16, 16, 12), fur, 0, 0, 0), 0.008);
    put(this.head, new THREE.CapsuleGeometry(0.08, 0.12, 6, 10), fur, 0, -0.04, 0.16, { rx: Math.PI / 2 });
    put(this.head, new THREE.SphereGeometry(0.035, 10, 8), M("#111", 0.3), 0, -0.02, 0.3);
    for (const sx of [-1, 1]) { put(this.head, new THREE.SphereGeometry(0.03, 10, 8), M("#111", 0.2), sx * 0.07, 0.05, 0.13); put(this.head, new THREE.SphereGeometry(0.07, 10, 8), fur, sx * 0.11, 0.12, -0.02, { s: [0.5, 1.3, 0.8], rz: sx * 0.5 }); }
    put(this.head, rbox(0.05, 0.015, 0.08, 0.01), M("#e06070", 0.5), 0, -0.1, 0.22, { rx: 0.4 });
    for (const [x, z] of [[-0.1, 0.25], [0.1, 0.25], [-0.1, -0.25], [0.1, -0.25]]) { const l = grp(this.root, x, 0.48, z); put(l, cyl(0.045, 0.04, 0.45, 8), fur, 0, -0.22, 0); this.legs.push(l); }
    this.tail = put(this.root, cyl(0.03, 0.015, 0.3, 8), fur, 0, 0.7, -0.4, { rx: -0.8 });
  }
  pose(ph: number, run: number) {
    const s = Math.sin(ph) * 0.8 * run; this.legs[0].rotation.x = s; this.legs[3].rotation.x = s; this.legs[1].rotation.x = -s; this.legs[2].rotation.x = -s;
    this.root.children[0].position.y = 0.55 + Math.abs(Math.cos(ph)) * 0.06 * run; this.head.rotation.x = Math.sin(ph * 2) * 0.08; this.tail.rotation.z = Math.sin(ph * 3) * 0.5;
  }
}

export class Route {
  root = new THREE.Group(); stadium = new THREE.Group(); road = new THREE.Group();
  sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; skyMat: THREE.ShaderMaterial;
  score!: THREE.MeshStandardMaterial; scoreCache = new Map<string, THREE.Texture>();
  cars: THREE.Group[] = []; dogs: Dog[] = []; dust: THREE.Sprite[] = []; stars: THREE.Sprite; zzz: THREE.Sprite;
  bottle: THREE.Group; vial: THREE.Group; apple: THREE.Mesh; tape!: THREE.Mesh;
  constructor() {
    const R = this.root; R.add(this.stadium, this.road); this.road.position.copy(ROAD);
    this.skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { top: { value: new THREE.Color("#4f8fd6") }, mid: { value: new THREE.Color("#b8d2e6") }, bot: { value: new THREE.Color("#f2e2c4") } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.7, h)) : mix(bot, mid, smoothstep(-0.03, 0.08, h)); gl_FragColor = vec4(c * 1.1, 1.0); }" });
    this.buildStadium(this.stadium); this.buildRoad(this.road);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), this.skyMat); R.add(sky); sky.name = "sky";
    this.hemi = new THREE.HemisphereLight("#d6e6ff", "#8a7a5a", 0.95); R.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff0d0", 3.8); this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.04;
    R.add(this.sun, this.sun.target);
    for (const c of ["#7a1d1d", "#1d3a5a", "#2a4a2a"]) { const k = car(c); R.add(k); this.cars.push(k); }
    for (const [c, s] of [["#c8a070", 1], ["#5a4a3a", 0.9], ["#e8e0d0", 1.05]] as const) this.dogs.push(new Dog(R, c, s));
    const dt = canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(215,190,150,0.8)"); gr.addColorStop(1, "rgba(215,190,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    for (let k = 0; k < 60; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dt, transparent: true, depthWrite: false })); s.visible = false; R.add(s); this.dust.push(s); }
    this.stars = new THREE.Sprite(new THREE.SpriteMaterial({ map: starsTex(), transparent: true, depthWrite: false })); this.stars.visible = false; R.add(this.stars);
    this.zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex(), transparent: true, depthWrite: false })); this.zzz.visible = false; R.add(this.zzz);
    // props
    this.bottle = new THREE.Group();
    put(this.bottle, cyl(0.045, 0.045, 0.2, 16), MP("#5a2a0a", 0.05, { transparent: true, opacity: 0.85 }), 0, 0.1, 0); put(this.bottle, cyl(0.016, 0.03, 0.08, 12), MP("#5a2a0a", 0.05), 0, 0.24, 0);
    put(this.bottle, cyl(0.047, 0.047, 0.09, 16, true), M("#ffffff", 0.6, 0, { map: canvas(256, 96, (g) => { g.fillStyle = "#f1e6cf"; g.fillRect(0, 0, 256, 96); text(g, "BRANDY", 128, 52, 54, "#7a1d1d"); }) }), 0, 0.1, 0, { ry: Math.PI });
    this.vial = new THREE.Group();
    put(this.vial, cyl(0.018, 0.018, 0.09, 12), MP("#d8f0e8", 0.05, { transparent: true, opacity: 0.7 }), 0, 0.045, 0);
    put(this.vial, new THREE.PlaneGeometry(0.12, 0.05), M("#ffffff", 0.6, 0, { map: canvas(256, 96, (g) => { g.fillStyle = "#fff6e0"; g.fillRect(0, 0, 256, 96); text(g, "STRYCHNINE", 128, 52, 40, "#1c1814"); }), side: THREE.DoubleSide }), 0, 0.12, 0.02, { cast: false });
    this.apple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), MP("#8a5a1a", 0.6)); this.apple.castShadow = true;
  }
  buildStadium(S: THREE.Object3D) {
    put(S, new THREE.PlaneGeometry(240, 200), M("#ffffff", 0.9, 0, { map: rep(grass(), 60, 50) }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(S, new THREE.PlaneGeometry(130, 8), M("#ffffff", 0.95, 0, { map: rep(cinder(), 26, 2) }), 0, 0.01, 1, { rx: -Math.PI / 2, cast: false });
    for (let k = 0; k <= 6; k++) put(S, new THREE.PlaneGeometry(130, 0.05), M("#f6f3ea", 0.7), 0, 0.015, -3 + k * 1.33, { rx: -Math.PI / 2, cast: false });
    put(S, new THREE.PlaneGeometry(0.12, 8), M("#ffffff", 0.6), 0, 0.016, 1, { rx: -Math.PI / 2, cast: false });
    // finish posts + banner + tape
    for (const z of [-3.4, 5.4]) put(S, cyl(0.06, 0.06, 3.2, 10), M("#f6f3ea", 0.5), 0, 1.6, z);
    put(S, rbox(0.06, 0.7, 8.8, 0.02), M("#ffffff", 0.6, 0, { map: canvas(1024, 96, (g) => { g.fillStyle = "#7a1d1d"; g.fillRect(0, 0, 1024, 96); text(g, "FINISH", 512, 52, 72, "#f1e6cf"); }) }), 0, 3.0, 1, { ry: Math.PI / 2 });
    this.tape = put(S, cyl(0.01, 0.01, 8.8, 6), M("#ffffff", 0.5), 0, 1.15, 1, { rx: Math.PI / 2, cast: false });
    // grandstand: tiers, columns, roof, bunting, banner, crowd
    const G = grp(S, 0, 0, 12);
    const wood = M("#ffffff", 0.8, 0, { map: rep(boards("#8a6a48"), 4, 1) });
    for (let k = 0; k < 8; k++) put(G, new THREE.BoxGeometry(60, 0.5 + k * 0.5, 0.9), wood, 0, (0.5 + k * 0.5) / 2, -0.6 + k * 0.9);
    put(G, new THREE.BoxGeometry(60, 1.2, 0.2), M("#ffffff", 0.8, 0, { map: rep(boards("#efe6d2"), 6, 1) }), 0, 0.6, -1.1);
    for (let k = 0; k < 13; k++) put(G, cyl(0.12, 0.14, 5.6, 12), MP("#f2ece0", 0.5), -30 + k * 5, 3.0 + 2.8, -0.9);
    put(G, new THREE.BoxGeometry(62, 0.25, 9), MP("#7a2a22", 0.5), 0, 8.7, 3.2, { rx: -0.12 });
    put(G, rbox(62, 0.9, 0.2, 0.03), M("#ffffff", 0.6, 0, { map: canvas(2048, 128, (g) => { g.fillStyle = "#f2ece0"; g.fillRect(0, 0, 2048, 128); text(g, "OLYMPIC GAMES · ST. LOUIS 1904 · LOUISIANA PURCHASE EXPOSITION", 1024, 68, 72, "#1d2a5a"); }) }), 0, 8.3, -1.2);
    const bunt = canvas(256, 128, (g) => { const cs = ["#b22234", "#ffffff", "#3c3b6e"]; for (let k = 0; k < 3; k++) { g.fillStyle = cs[k]; g.fillRect(0, k * 43, 256, 43); } });
    for (let k = 0; k < 12; k++) put(G, new THREE.CylinderGeometry(1.6, 1.6, 0.8, 16, 1, true, Math.PI / 2, Math.PI), M("#ffffff", 0.7, 0, { map: bunt, side: THREE.DoubleSide }), -27.5 + k * 5, 7.4, -1.05, { rx: Math.PI / 2, s: [1, 1, 0.4] });
    const r = rng(11), cols = ["#2a2a34", "#e8e2d0", "#7a1d1d", "#1d3a5a", "#5a4a3a", "#e8cf8a", "#6a3a5a", "#ffffff"];
    const n = 520, body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.35, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 10, 8), MP("#f1c7a2", 0.6), n), hat = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 10), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
    for (let i = 0; i < n; i++) {
      const row = i % 8, x = -29 + ((i / 8) | 0) * 0.9 + r() * 0.3, y = 0.5 + row * 0.5, z = -0.6 + row * 0.9 + 0.1;
      const m = new THREE.Matrix4().makeTranslation(x, y + 0.45, z); body.setMatrixAt(i, m); body.setColorAt(i, new THREE.Color(cols[(r() * cols.length) | 0]));
      head.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y + 0.95 + r() * 0.05, z)); head.setColorAt(i, new THREE.Color(["#f1c7a2", "#e8b58f", "#c98c64", "#8d5a3b"][(r() * 4) | 0]));
      hat.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y + 1.1, z)); hat.setColorAt(i, new THREE.Color(r() < 0.6 ? "#e8cf8a" : "#2a2a2e"));
    }
    G.add(body, head, hat);
    // scoreboard on the infield (faces the stand) + the Boston poster + officials' table
    const B = grp(S, BOARD.x, 0, BOARD.z);
    for (const sx of [-1, 1]) put(B, rbox(0.25, 5.5, 0.25, 0.03), M("#5a3a22", 0.7), sx * 2.6, 2.75, 0);
    put(B, rbox(5.6, 4.2, 0.2, 0.05), M("#3a2a1a", 0.7), 0, 3.6, 0);
    this.score = new THREE.MeshStandardMaterial({ map: scoreTex([["STARTERS: 32"]]), roughness: 0.6 });
    put(B, new THREE.PlaneGeometry(5.2, 3.9), this.score, 0, 3.6, 0.11, { cast: false });
    const P = grp(S, POSTER.x, 0, POSTER.z);
    put(P, rbox(1.4, 1.95, 0.08, 0.02), M("#ffffff", 0.6, 0, { map: posterTex() }), 0, 1.5, 0, { ry: Math.PI });
    const T = grp(S, 3.5, 0, -6.2);
    put(T, rbox(2.2, 0.06, 0.9, 0.02), M("#8a6a4a", 0.7), 0, 0.78, 0); for (const [x, z] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) put(T, cyl(0.03, 0.03, 0.78, 6), M("#6a4a2a", 0.7), x, 0.39, z);
    put(T, cyl(0.15, 0.15, 0.3, 16), MP("#c9a55a", 0.3, { metalness: 1 }), -0.6, 0.95, 0); put(T, rbox(0.4, 0.02, 0.3, 0.005), M("#efe6cf", 0.8), 0.4, 0.82, 0);
    // trees around the field
    for (let k = 0; k < 16; k++) { const x = -60 + k * 8 + r() * 3, z = -26 - r() * 8; const t = grp(S, x, 0, z); put(t, cyl(0.3, 0.4, 4, 8), M("#6b4a2a", 0.85), 0, 2, 0); for (let j = 0; j < 6; j++) put(t, new THREE.IcosahedronGeometry(1.8, 1), MP(j % 2 ? "#4f8a3a" : "#3f7a32", 0.75, { clearcoat: 0 }), (r() - 0.5) * 3, 5 + r() * 1.5, (r() - 0.5) * 3); }
    for (let k = 0; k < 4; k++) { const f = grp(S, -24 + k * 16, 0, -14); put(f, cyl(0.06, 0.06, 9, 8), M("#f2ece0", 0.5), 0, 4.5, 0); put(f, new THREE.PlaneGeometry(1.8, 1.0), M("#ffffff", 0.7, 0, { map: canvas(256, 140, (g) => { for (let j = 0; j < 7; j++) { g.fillStyle = j % 2 ? "#ffffff" : "#b22234"; g.fillRect(0, j * 20, 256, 20); } g.fillStyle = "#3c3b6e"; g.fillRect(0, 0, 100, 80); }), side: THREE.DoubleSide }), 0.92, 8.4, 0, { cast: false }); }
  }
  buildRoad(Rd: THREE.Object3D) {
    put(Rd, new THREE.PlaneGeometry(260, 200), M("#ffffff", 0.9, 0, { map: rep(grass("#8a9a4a"), 50, 40) }), 0, -0.01, 0, { rx: -Math.PI / 2, cast: false });
    put(Rd, new THREE.PlaneGeometry(240, 7), M("#ffffff", 0.95, 0, { map: rep(dirtRoad(), 24, 1) }), 0, 0.005, 0, { rx: -Math.PI / 2, cast: false });
    const r = rng(19), post = M("#7a5a3a", 0.85);
    for (let x = -100; x <= 100; x += 3) for (const z of [-4.2, 4.2]) { put(Rd, cyl(0.06, 0.07, 1.1, 6), post, x, 0.55, z); }
    for (const z of [-4.2, 4.2]) for (const y of [0.5, 0.9]) put(Rd, rbox(200, 0.08, 0.04, 0.01), post, 0, y, z);
    for (let x = -100; x <= 100; x += 18) { put(Rd, cyl(0.1, 0.12, 7, 8), M("#5a4a3a", 0.85), x, 3.5, -6); put(Rd, rbox(1.4, 0.1, 0.1, 0.01), M("#5a4a3a", 0.85), x, 6.6, -6); }
    for (const y of [6.7]) for (const dz of [-0.6, 0.6]) put(Rd, cyl(0.008, 0.008, 200, 4), M("#222", 0.5), 0, y, -6 + dz * 0.0 + dz, { rz: Math.PI / 2, cast: false });
    // general store with the thermometer
    const St = grp(Rd, -6, 0, 9, Math.PI);
    put(St, new THREE.BoxGeometry(8, 4, 5), M("#ffffff", 0.8, 0, { map: rep(boards("#c8b090"), 2, 1) }), 0, 2, 0);
    put(St, rbox(8.6, 1.6, 0.2, 0.03), M("#ffffff", 0.7, 0, { map: canvas(1024, 192, (g) => { g.fillStyle = "#f2ecd8"; g.fillRect(0, 0, 1024, 192); text(g, "GENERAL STORE", 512, 100, 120, "#7a1d1d"); }) }), 0, 4.6, 2.55);
    put(St, new THREE.BoxGeometry(8.6, 0.1, 2.2), M("#6a4a2a", 0.7), 0, 3.0, 3.5, { rx: -0.08 });
    for (let k = 0; k < 4; k++) put(St, cyl(0.08, 0.08, 3.0, 8), M("#efe6d2", 0.6), -3.9 + k * 2.6, 1.5, 4.5);
    put(St, rbox(8.6, 0.2, 2.2, 0.02), M("#8a6a4a", 0.8), 0, 0.1, 3.5);
    put(St, rbox(0.5, 1.45, 0.06, 0.02), M("#ffffff", 0.5, 0, { map: thermoTex() }), -1.3, 1.6, 4.56);
    for (let k = 0; k < 3; k++) put(St, cyl(0.3, 0.3, 0.8, 14), M("#7a5a3a", 0.8), 2.2 + k * 0.7, 0.6, 3.8);
    const win = canvas(256, 256, (g) => { g.fillStyle = "#3a4a5a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(255,255,255,0.2)"; g.fillRect(20, 20, 70, 216); g.fillStyle = "#efe6d2"; g.fillRect(122, 0, 12, 256); g.fillRect(0, 122, 256, 12); });
    for (const x of [-2.6, 2.6]) put(St, new THREE.PlaneGeometry(1.4, 1.4), MP("#ffffff", 0.1, { map: win }), x, 1.9, 2.52, { cast: false });
    put(St, rbox(1.1, 2.2, 0.06, 0.02), M("#5a3a22", 0.7), 0, 1.2, 2.53);
    // the mile-6 water tower + signs
    const W = grp(Rd, 14, 0, -8);
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) put(W, rbox(0.25, 6, 0.25, 0.03), M("#6a4a2a", 0.8), x, 3, z);
    put(W, cyl(2.0, 2.0, 2.6, 24), M("#ffffff", 0.8, 0, { map: rep(boards("#8a6a48"), 2, 1) }), 0, 7.3, 0);
    for (const y of [6.3, 7.3, 8.3]) put(W, new THREE.TorusGeometry(2.02, 0.04, 6, 32), M("#2a2a2a", 0.4, 0.8), 0, y, 0, { rx: Math.PI / 2 });
    put(W, new THREE.ConeGeometry(2.2, 1.0, 24), M("#5a3a22", 0.8), 0, 9.1, 0);
    put(W, cyl(0.06, 0.06, 4.5, 8), M("#3a3a3a", 0.4, 0.8), 1.4, 3.6, 1.4); put(W, cyl(0.05, 0.05, 0.5, 8), M("#3a3a3a", 0.4, 0.8), 1.6, 1.3, 1.6, { rz: 1.2 });
    put(W, rbox(0.4, 0.3, 0.4, 0.02), M("#7a5a3a", 0.8), 1.8, 0.15, 1.8);
    const sg = grp(Rd, 11.5, 0, -4.6);
    put(sg, cyl(0.06, 0.06, 2.2, 8), post, -0.8, 1.1, 0); put(sg, cyl(0.06, 0.06, 2.2, 8), post, 0.8, 1.1, 0);
    put(sg, rbox(2.0, 1.0, 0.06, 0.02), M("#ffffff", 0.6, 0, { map: signTex(["WATER", "MILE 6"]) }), 0, 1.9, 0.04);
    const sg2 = grp(Rd, 16.6, 0, -4.6);
    put(sg2, cyl(0.06, 0.06, 2.0, 8), post, 0, 1.0, 0);
    put(sg2, rbox(1.9, 0.85, 0.06, 0.02), M("#ffffff", 0.6, 0, { map: signTex(["NEXT WATER:", "MILE 12"], "#7a1d1d", "#f2ecd8") }), 0, 1.7, 0.04);
    // MILE 9 post
    const m9 = grp(Rd, -22, 0, -3.8);
    put(m9, rbox(0.25, 1.3, 0.25, 0.03), M("#efe6d2", 0.7), 0, 0.65, 0);
    put(m9, new THREE.PlaneGeometry(0.24, 0.6), M("#ffffff", 0.6, 0, { map: canvas(128, 320, (g) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, 128, 320); text(g, "MILE", 64, 90, 44, "#1c1814"); text(g, "9", 64, 210, 140, "#7a1d1d"); }) }), 0, 0.85, 0.13, { cast: false });
    // apple orchard + the nap tree + fallen apples
    const O = grp(Rd, 52, 0, 9);
    const leaf = [MP("#4f8a3a", 0.75, { clearcoat: 0 }), MP("#3f7a32", 0.75, { clearcoat: 0 })], appleM = MP("#c8302a", 0.4);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const t = grp(O, i * 5 + r() * 0.8, 0, j * 5 + r() * 0.8);
      put(t, cyl(0.15, 0.25, 2.0, 8), M("#6b4a2a", 0.85), 0, 1.0, 0);
      for (let k = 0; k < 6; k++) put(t, new THREE.IcosahedronGeometry(1.0, 1), leaf[k % 2], (r() - 0.5) * 2, 2.5 + r() * 1.0, (r() - 0.5) * 2);
      for (let k = 0; k < 10; k++) put(t, new THREE.SphereGeometry(0.07, 8, 6), appleM, (r() - 0.5) * 2.4, 2.0 + r() * 1.4, (r() - 0.5) * 2.4);
      for (let k = 0; k < 5; k++) put(t, new THREE.SphereGeometry(0.06, 8, 6), MP("#7a5a1a", 0.7), (r() - 0.5) * 2.5, 0.05, (r() - 0.5) * 2.5, { s: [1, 0.7, 1] });
    }
    const big = grp(Rd, 46, 0, 6);
    put(big, cyl(0.4, 0.6, 3.5, 10), M("#5a3a22", 0.85), 0, 1.75, 0);
    for (let k = 0; k < 10; k++) put(big, new THREE.IcosahedronGeometry(1.8, 1), leaf[k % 2], (r() - 0.5) * 4, 4.2 + r() * 1.6, (r() - 0.5) * 4);
    // farmhouse + barn far off, haystacks
    const F = grp(Rd, -40, 0, -22);
    put(F, new THREE.BoxGeometry(8, 5, 6), M("#ffffff", 0.8, 0, { map: rep(boards("#a83a2a"), 2, 1) }), 0, 2.5, 0); put(F, new THREE.ConeGeometry(6, 3, 4), M("#5a3a2a", 0.8), 0, 6.5, 0, { ry: Math.PI / 4, s: [1, 1, 0.75] });
    for (let k = 0; k < 6; k++) put(Rd, new THREE.SphereGeometry(1.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MP("#d8b860", 0.9, { clearcoat: 0 }), -30 + k * 12, 0, 16 + (k % 2) * 6, { s: [1, 1.1, 1] });
  }
  setScore(lines: [string, string?][]) { const k = JSON.stringify(lines); if (!this.scoreCache.has(k)) this.scoreCache.set(k, scoreTex(lines)); this.score.map = this.scoreCache.get(k)!; }
}
