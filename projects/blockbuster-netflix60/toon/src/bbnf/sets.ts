// "Blockbuster vs Netflix": every set lives in one world, far apart, toggled per shot.
// store (0): a 2000-era video rental store (aisles of tapes, counter, late-fee board).   garage (300): the tiny
// start-up office (desk, laptop, whiteboard, piles of red mailers).   board (600): a Dallas boardroom at night (long
// table, pitch screen, skyline).   living (900): a living room with a TV and a couch.   studio (1200): a news desk.
// front (1500): the store's front at night (sign, windows, banner) that becomes the last store in Bend, Oregon.
// Company names are written as plain text (no logos).
import * as THREE from "three";
import { M, MP, canvas, put, grp, rbox, cyl, glow, text, rng, rep, ANTON, INTER } from "../look/kit";

export const SETS = {
  store: new THREE.Vector3(0, 0, 0), garage: new THREE.Vector3(300, 0, 0), board: new THREE.Vector3(600, 0, 0),
  living: new THREE.Vector3(900, 0, 0), studio: new THREE.Vector3(1200, 0, 0), front: new THREE.Vector3(1500, 0, 0),
};
export type SetName = keyof typeof SETS;
export type Line = [string, number, string?, string?];
const texCache = new Map<string, THREE.Texture>();
export const screenTex = (lines: Line[], w = 1024, h = 576, bg = ["#0b1430", "#1d0b2e"], accent = "#d8262e") => {
  const key = JSON.stringify([lines, w, h, bg, accent]);
  if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(w, h, (g) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(255,255,255,0.04)"; for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
    g.fillStyle = accent; g.fillRect(0, h - 18, w, 18); g.fillRect(0, 0, w, 8);
    const total = lines.reduce((a, l) => a + l[1] * 1.15, 0); let y = h / 2 - total / 2;
    for (const [s, size, col, font] of lines) { y += size * 0.575; text(g, s, w / 2, y, size, col ?? "#ffffff", font ?? ANTON); y += size * 0.575; }
  });
  texCache.set(key, t); return t;
};
/** a streaming-app style screen: dark, a row title and a grid of coloured poster tiles, one big headline */
export const streamTex = (head: string, sub: string) => {
  const key = "stream|" + head + sub; if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(1024, 576, (g) => {
    g.fillStyle = "#0b0b0e"; g.fillRect(0, 0, 1024, 576);
    const r = rng(77), cols = ["#d8262e", "#2a6aff", "#ffb020", "#1a9a5a", "#8a3ad8", "#e85a8a", "#3ac8d8"];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 6; k++) { g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(40 + k * 162, 300 + row * 130, 146, 110); g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(40 + k * 162, 380 + row * 130, 146, 30); }
    text(g, head, 512, 120, 120, "#ffffff"); text(g, sub, 512, 230, 60, "#ff4a4a", INTER);
    g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(900, 90); g.lineTo(960, 125); g.lineTo(900, 160); g.fill();
  });
  texCache.set(key, t); return t;
};
/** a big painted sign (yellow on blue, or red on white) */
export const signTex = (s: string, sub = "", fg = "#ffd23a", bg = "#1d3a9a", w = 2048, h = 400) => {
  const key = "sign|" + s + sub + fg + bg + w + h; if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(w, h, (g) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40); text(g, s, w / 2, sub ? h * 0.42 : h / 2 + 8, h * (sub ? 0.5 : 0.62), fg); if (sub) text(g, sub, w / 2, h * 0.8, h * 0.17, "#ffffff", INTER); });
  texCache.set(key, t); return t;
};
const screenMat = (k = 1.15) => new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: k, emissiveMap: screenTex([["", 10]]) });
/** instanced video boxes on shelves */
const tapes = (parent: THREE.Object3D, spots: [number, number, number, number][], seed: number) => {
  const r = rng(seed), m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.21, 0.035), M("#ffffff", 0.45), spots.length);
  const cols = ["#d8262e", "#1d3a8a", "#ffb020", "#1a7a3a", "#2a2a30", "#e8e4da", "#8a3ad8", "#3ac8d8", "#ff6a2a", "#f0f0f0"];
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion();
  spots.forEach(([x, y, z, ry], i) => { q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry + (r() - 0.5) * 0.06); mat.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 0.9 + r() * 0.2, 1)); m.setMatrixAt(i, mat); m.setColorAt(i, new THREE.Color(cols[Math.floor(r() * cols.length)])); });
  m.castShadow = false; m.receiveShadow = true; parent.add(m); return m;
};
/** a stylised figure-crowd for the street (static, simple) */
const sky = (R: THREE.Group, top: [number, number, number], bot: [number, number, number]) => {
  const s = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }", fragmentShader: `varying vec3 vP; void main(){ float h = clamp(vP.y, 0.0, 1.0); vec3 c = mix(vec3(${bot.join(",")}), vec3(${top.join(",")}), smoothstep(0.0, 0.5, h)); gl_FragColor = vec4(c, 1.0); }` }));
  s.name = "sky"; R.add(s); return s;
};

export class World {
  root = new THREE.Group();
  g: Record<SetName, THREE.Group> = {} as Record<SetName, THREE.Group>;
  fee!: THREE.MeshStandardMaterial; laptop!: THREE.MeshStandardMaterial; wb!: THREE.MeshStandardMaterial; pitch!: THREE.MeshStandardMaterial;
  livetv!: THREE.MeshStandardMaterial; tv!: THREE.MeshStandardMaterial; frontSign!: THREE.MeshStandardMaterial; banner!: THREE.MeshStandardMaterial; winM!: THREE.MeshStandardMaterial;
  cash!: THREE.InstancedMesh; envs: THREE.Mesh[] = []; envDesk!: THREE.Group; box!: THREE.Group; tape!: THREE.Group; envelope!: THREE.Group; phone1!: THREE.Group; frontLights: THREE.Light[] = []; trees!: THREE.Group; pines!: THREE.Group; skyNight!: THREE.Mesh;
  constructor() {
    for (const [k, v] of Object.entries(SETS)) { const g = grp(this.root, v.x, v.y, v.z); this.g[k as SetName] = g; }
    this.buildStore(this.g.store); this.buildGarage(this.g.garage); this.buildBoard(this.g.board); this.buildLiving(this.g.living); this.buildStudio(this.g.studio); this.buildFront(this.g.front);
    // hand props
    this.tape = new THREE.Group(); put(this.tape, rbox(0.13, 0.21, 0.035, 0.005), M("#1d3a8a", 0.4), 0, 0, 0); put(this.tape, new THREE.PlaneGeometry(0.11, 0.06), M("#ffd23a", 0.5), 0, 0.05, 0.019, { cast: false });
    this.envelope = new THREE.Group(); put(this.envelope, rbox(0.24, 0.13, 0.01, 0.003), MP("#d8262e", 0.5), 0, 0, 0);
    this.phone1 = new THREE.Group(); put(this.phone1, rbox(0.08, 0.15, 0.012, 0.01), MP("#111", 0.2), 0, 0, 0); put(this.phone1, new THREE.PlaneGeometry(0.07, 0.13), glow(canvas(8, 8, (g) => { g.fillStyle = "#9ac8ff"; g.fillRect(0, 0, 8, 8); }), 2.2), 0, 0, 0.007, { cast: false });
    this.box = new THREE.Group(); put(this.box, rbox(0.42, 0.3, 0.32, 0.01), M("#b8925a", 0.8), 0, 0, 0.05); for (let k = 0; k < 4; k++) put(this.box, rbox(0.13, 0.21, 0.035, 0.004), M(["#d8262e", "#ffd23a", "#2a6aff", "#e8e4da"][k], 0.5), -0.12 + k * 0.08, 0.17, 0.05, { rz: 0.15 * (k - 1.5) });
  }
  show(k: SetName) { (Object.keys(this.g) as SetName[]).forEach((n) => (this.g[n].visible = n === k)); }

  // ------------------------------------------------------------------ the rental store
  buildStore(R: THREE.Group) {
    const carpet = rep(canvas(256, 256, (g) => { g.fillStyle = "#1a2a5a"; g.fillRect(0, 0, 256, 256); const r = rng(2); for (let k = 0; k < 140; k++) { g.fillStyle = ["#ffd23a", "#d8262e", "#3ac8d8"][k % 3]; g.globalAlpha = 0.35; g.beginPath(); g.arc(r() * 256, r() * 256, 3 + r() * 6, 0, 7); g.fill(); } g.globalAlpha = 1; }), 8, 8);
    put(R, new THREE.PlaneGeometry(16, 14), MP("#ffffff", 0.9, { map: carpet, clearcoat: 0 }), 0, 0, -1, { rx: -Math.PI / 2, cast: false });
    const wallM = M("#1d3a9a", 0.8);
    put(R, new THREE.PlaneGeometry(16, 4.5), wallM, 0, 2.25, -6, { cast: false });
    for (const sx of [-1, 1]) put(R, new THREE.PlaneGeometry(14, 4.5), wallM, sx * 7, 2.25, -1, { ry: -sx * Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(16, 14), M("#e8e6e0", 0.9), 0, 4.5, -1, { rx: Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(16, 0.5), M("#ffd23a", 0.6), 0, 4.0, -5.98, { cast: false });
    put(R, new THREE.PlaneGeometry(6.5, 1.25), MP("#ffffff", 0.5, { map: signTex("BLOCKBUSTER", "VIDEO"), emissive: "#ffffff", emissiveMap: signTex("BLOCKBUSTER", "VIDEO"), emissiveIntensity: 0.6 }), -2.6, 3.25, -5.95, { cast: false });
    // ceiling light panels
    const lt = canvas(8, 8, (g) => { g.fillStyle = "#fff8ee"; g.fillRect(0, 0, 8, 8); });
    for (const x of [-4, 0, 4]) for (const z of [-4, -1, 2]) put(R, new THREE.PlaneGeometry(1.6, 0.6), glow(lt, 2.2), x, 4.48, z, { rx: Math.PI / 2, cast: false });
    // aisles: double-sided shelves running along z
    const spots: [number, number, number, number][] = [];
    const shelfM = M("#e8e6e0", 0.5), edgeM = M("#ffd23a", 0.5);
    for (const x of [-5.2, -3.0, -0.8]) {
      put(R, rbox(0.55, 1.9, 6.0, 0.02), shelfM, x, 0.95, -2.2);
      for (let tier = 0; tier < 4; tier++) { const y = 0.35 + tier * 0.42; for (const sx of [-1, 1]) { put(R, rbox(0.12, 0.04, 6.0, 0.01), edgeM, x + sx * 0.33, y - 0.13, -2.2, { cast: false }); for (let k = 0; k < 40; k++) spots.push([x + sx * 0.3, y, -5.0 + k * 0.143, sx * Math.PI / 2]); } }
      put(R, new THREE.PlaneGeometry(1.6, 0.4), MP("#ffffff", 0.5, { map: signTex(x === -0.8 ? "NEW RELEASES" : x === -3.0 ? "COMEDY" : "ACTION", "", "#ffffff", "#d8262e", 1024, 256) }), x, 2.6, 0.6, { cast: false });
    }
    // back-wall shelving
    for (let tier = 0; tier < 4; tier++) { put(R, rbox(5.6, 0.04, 0.3, 0.01), edgeM, 3.6, 0.22 + tier * 0.42, -5.8, { cast: false }); for (let k = 0; k < 38; k++) spots.push([1.0 + k * 0.143, 0.35 + tier * 0.42, -5.78, 0]); }
    tapes(R, spots, 11);
    // the counter + register + returns slot
    const C = grp(R, 3.4, 0, -1.4);
    put(C, rbox(3.2, 1.0, 0.8, 0.03), M("#1d3a9a", 0.5), 0, 0.5, 0); put(C, rbox(3.3, 0.06, 0.9, 0.02), MP("#ffd23a", 0.4), 0, 1.03, 0);
    put(C, rbox(0.4, 0.22, 0.34, 0.03), M("#2a2a30", 0.4), -0.7, 1.17, 0); put(C, rbox(0.36, 0.2, 0.03, 0.02), glow(screenTex([["$4.99", 160, "#7dff9a"]], 512, 256, ["#000", "#000"], "#000"), 1.2), -0.7, 1.4, -0.08, { rx: -0.3, cast: false });
    put(C, rbox(0.5, 0.5, 0.5, 0.03), M("#d8262e", 0.5), 1.9, 0.25, 0.3); put(C, new THREE.PlaneGeometry(0.4, 0.1), M("#111", 0.5), 1.9, 0.38, 0.552, { cast: false });
    put(C, new THREE.PlaneGeometry(0.46, 0.12), MP("#fff", 0.5, { map: signTex("RETURNS", "", "#ffffff", "#d8262e", 512, 128) }), 1.9, 0.18, 0.552, { cast: false });
    // the late-fee board behind the counter
    this.fee = screenMat(1.2);
    put(R, rbox(3.3, 1.9, 0.1, 0.03), M("#0a0a0e", 0.4), 3.6, 2.55, -5.88); put(R, new THREE.PlaneGeometry(3.15, 1.77), this.fee, 3.6, 2.55, -5.82, { cast: false });
    // a pile of cash on the counter that grows (instances shown with .count)
    this.cash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.012, 0.07), MP("#5aa85a", 0.6), 160);
    const r = rng(5), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let i = 0; i < 160; i++) { const layer = Math.floor(i / 16), k = i % 16; q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (r() - 0.5) * 0.9); m.compose(new THREE.Vector3(3.9 + (k % 4) * 0.17 - 0.25 + (r() - 0.5) * 0.05, 1.07 + layer * 0.014 + (3 - Math.abs(k % 4 - 1.5)) * layer * 0.004, -1.4 + Math.floor(k / 4) * 0.09 - 0.14), q, new THREE.Vector3(1, 1, 1)); this.cash.setMatrixAt(i, m); }
    this.cash.count = 0; this.cash.castShadow = true; R.add(this.cash);
    R.add(new THREE.HemisphereLight("#c8d4ff", "#1a1a2a", 0.9));
    const key = new THREE.SpotLight("#fff4e6", 160, 22, 0.9, 0.6, 1.5); key.position.set(1, 4.3, 3); key.target.position.set(1, 0.8, -2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
    for (const [x, z] of [[-3, -2], [3, -3]]) { const p = new THREE.PointLight("#fff0dc", 25, 10, 2); p.position.set(x, 4, z); R.add(p); }
  }

  // ------------------------------------------------------------------ the start-up office
  buildGarage(R: THREE.Group) {
    const wood = rep(canvas(256, 256, (g) => { g.fillStyle = "#8a6a4a"; g.fillRect(0, 0, 256, 256); g.fillStyle = "rgba(0,0,0,0.18)"; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 256, 3); const r = rng(9); for (let k = 0; k < 200; k++) { g.fillStyle = `rgba(60,30,10,${r() * 0.1})`; g.fillRect(r() * 256, r() * 256, 40, 2); } }), 4, 4);
    put(R, new THREE.PlaneGeometry(10, 10), MP("#ffffff", 0.6, { map: wood, clearcoat: 0.2 }), 0, 0, -1, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.6), M("#a89c88", 0.9), 0, 1.8, -4, { cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.6), M("#cfc6b4", 0.9), -4, 1.8, -1, { ry: Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(10, 10), M("#e8e4da", 0.9), 0, 3.6, -1, { rx: Math.PI / 2, cast: false });
    // whiteboard
    this.wb = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, map: screenTex([["", 10]]), emissive: "#ffffff", emissiveIntensity: 0.06, emissiveMap: screenTex([["", 10]]) });
    put(R, rbox(2.9, 1.7, 0.06, 0.02), M("#b8bcc4", 0.4, 0.6), 0.6, 1.95, -3.95); put(R, new THREE.PlaneGeometry(2.8, 1.6), this.wb, 0.6, 1.95, -3.91, { cast: false });
    // desk with laptop + lamp
    const D = grp(R, -1.4, 0, -2.6);
    put(D, rbox(2.2, 0.06, 0.9, 0.02), M("#5a4030", 0.5), 0, 0.76, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(D, cyl(0.03, 0.03, 0.76, 8), M("#333", 0.4, 0.6), sx * 1.0, 0.38, sz * 0.38);
    put(D, rbox(0.42, 0.02, 0.3, 0.005), M("#c8ccd4", 0.3, 0.8), 0.2, 0.8, 0.1);
    this.laptop = screenMat(1.1); put(D, rbox(0.42, 0.28, 0.015, 0.005), M("#c8ccd4", 0.3, 0.8), 0.2, 0.94, -0.05, { rx: -0.25 }); put(D, new THREE.PlaneGeometry(0.38, 0.24), this.laptop, 0.2, 0.94, -0.04, { rx: -0.25, cast: false });
    put(D, cyl(0.1, 0.12, 0.03, 16), M("#222", 0.4), -0.8, 0.8, -0.2); put(D, cyl(0.012, 0.012, 0.45, 8), M("#222", 0.4), -0.8, 1.02, -0.2); const shade = put(D, new THREE.ConeGeometry(0.13, 0.15, 16, 1, true), M("#d8262e", 0.5, 0, { side: THREE.DoubleSide }), -0.72, 1.22, -0.12, { rz: 0.6 });
    shade.castShadow = false; const lp = new THREE.PointLight("#ffd8a0", 6, 3, 2); lp.position.set(-0.7, 1.15, -0.1); D.add(lp);
    // stacks of red mailers (desk + floor bins)
    const envM = MP("#d8262e", 0.5), whiteM = M("#f4f2ec", 0.6);
    this.envDesk = grp(D, 0, 0, 0);
    for (let k = 0; k < 7; k++) put(this.envDesk, rbox(0.24, 0.012, 0.13, 0.003), envM, -0.35 + (k % 2) * 0.03, 0.8 + k * 0.014, 0.2, { ry: (k % 3) * 0.1 });
    for (const [x, z] of [[1.6, -3.2], [2.3, -3.3], [1.95, -2.6]]) { const B = grp(R, x, 0, z, x); put(B, rbox(0.55, 0.4, 0.4, 0.01), M("#b8925a", 0.8), 0, 0.2, 0); for (let k = 0; k < 8; k++) put(B, rbox(0.24, 0.13, 0.01, 0.003), k % 3 ? envM : whiteM, -0.15 + k * 0.04, 0.45, 0, { rz: 0.1 * Math.sin(k) }); }
    // flying envelopes (shot code moves them)
    for (let k = 0; k < 14; k++) { const e = put(R, rbox(0.24, 0.13, 0.012, 0.003), envM, 0, -5, 0); this.envs.push(e); }
    // mail bin + sign
    put(R, rbox(0.8, 0.6, 0.55, 0.02), M("#2a4a8a", 0.6), 2.6, 0.3, -1.4); put(R, new THREE.PlaneGeometry(0.6, 0.16), MP("#fff", 0.5, { map: signTex("OUTGOING", "", "#ffffff", "#2a4a8a", 512, 128) }), 2.6, 0.45, -1.12, { cast: false });
    R.add(new THREE.HemisphereLight("#ffe8c8", "#2a2018", 0.35));
    const key = new THREE.SpotLight("#fff0dc", 55, 14, 0.9, 0.6, 1.5); key.position.set(1.5, 3.5, 2.5); key.target.position.set(-0.5, 0.8, -2.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
    const fill = new THREE.PointLight("#9ac8ff", 12, 8, 2); fill.position.set(3, 2.5, 0); R.add(fill);
  }

  // ------------------------------------------------------------------ the Dallas boardroom
  buildBoard(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(12, 12), MP("#3a3a44", 0.8, { clearcoat: 0 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(12, 3.4), M("#2a2420", 0.7), 0, 1.7, -4.2, { cast: false });
    put(R, new THREE.PlaneGeometry(12, 12), M("#1a1a20", 0.9), 0, 3.4, 0, { rx: Math.PI / 2, cast: false });
    // skyline windows on both sides
    const r = rng(41);
    const city = canvas(1024, 512, (g) => { const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#0a0e2a"); gr.addColorStop(1, "#3a1a4a"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512); let x = 0; while (x < 1024) { const w = 40 + r() * 90, h = 120 + r() * 320; g.fillStyle = "#0c0e18"; g.fillRect(x, 512 - h, w, h); for (let y = 512 - h + 10; y < 500; y += 18) for (let xx = x + 6; xx < x + w - 8; xx += 14) if (r() < 0.4) { g.fillStyle = r() < 0.8 ? "#ffd890" : "#9ac8ff"; g.fillRect(xx, y, 7, 9); } x += w + 4; } });
    for (const sx of [-1, 1]) { put(R, new THREE.PlaneGeometry(9, 2.8), new THREE.MeshBasicMaterial({ map: city }), sx * 4.4, 1.75, 0, { ry: -sx * Math.PI / 2, cast: false }); for (let k = -3; k <= 3; k++) put(R, rbox(0.08, 3.0, 0.08, 0.01), M("#111", 0.4), sx * 4.35, 1.6, k * 1.3); }
    put(R, new THREE.PlaneGeometry(12, 3.4), M("#2a2420", 0.7), 0, 1.7, 3.6, { ry: Math.PI, cast: false }); put(R, new THREE.PlaneGeometry(5, 2.2), new THREE.MeshBasicMaterial({ map: city }), 0, 1.8, 3.58, { ry: Math.PI, cast: false });
    // long table along z + chairs
    put(R, rbox(1.6, 0.08, 5.0, 0.03), MP("#3a2416", 0.25, { clearcoat: 1 }), 0, 0.76, -0.4); put(R, rbox(1.2, 0.72, 4.4, 0.02), M("#22160e", 0.6), 0, 0.36, -0.4);
    const chair = (x: number, z: number, ry: number) => { const c = grp(R, x, 0, z, ry); put(c, rbox(0.55, 0.1, 0.5, 0.04), MP("#141418", 0.5), 0, 0.5, 0); put(c, rbox(0.55, 0.75, 0.1, 0.04), MP("#141418", 0.5), 0, 0.95, -0.25); put(c, cyl(0.04, 0.04, 0.45, 8), M("#888", 0.3, 0.9), 0, 0.23, 0); };
    for (const z of [-1.8, -0.6, 0.6]) { chair(-1.15, z, Math.PI / 2); chair(1.15, z, -Math.PI / 2); }
    chair(0, 2.6, Math.PI);
    for (const z of [-1.8, -0.6, 0.6]) for (const sx of [-1, 1]) put(R, rbox(0.21, 0.01, 0.28, 0.003), M("#f4f2ec", 0.6), sx * 0.5, 0.81, z);
    put(R, cyl(0.04, 0.04, 0.12, 12), MP("#d8e8ff", 0.05, { transparent: true, opacity: 0.6 }), 0.4, 0.86, 1.6);
    // the pitch screen on the end wall
    this.pitch = screenMat(1.15);
    put(R, rbox(3.6, 2.1, 0.1, 0.03), M("#0a0a0e", 0.4), 0, 1.95, -4.1); put(R, new THREE.PlaneGeometry(3.45, 1.95), this.pitch, 0, 1.95, -4.04, { cast: false });
    R.add(new THREE.HemisphereLight("#8a9aca", "#1a1410", 0.55));
    for (const z of [-1.5, 1]) { const p = new THREE.SpotLight("#fff0dc", 70, 10, 0.8, 0.6, 1.5); p.position.set(0, 3.3, z); p.target.position.set(0, 0.8, z - 0.5); p.castShadow = z < 0; if (p.castShadow) p.shadow.mapSize.set(2048, 2048); R.add(p, p.target); put(R, cyl(0.3, 0.3, 0.05, 20), glow(canvas(8, 8, (g) => { g.fillStyle = "#fff4e0"; g.fillRect(0, 0, 8, 8); }), 3), 0, 3.38, z, { cast: false }); }
    const b = new THREE.PointLight("#4a6aff", 20, 10, 2); b.position.set(0, 2, -3.5); R.add(b);
  }

  // ------------------------------------------------------------------ the living room
  buildLiving(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(10, 10), MP("#7a5a3a", 0.6, { map: rep(canvas(128, 128, (g) => { g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, 128, 128); g.fillStyle = "rgba(0,0,0,0.2)"; for (let y = 0; y < 128; y += 16) g.fillRect(0, y, 128, 2); }), 6, 6), clearcoat: 0.3 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.CircleGeometry(1.6, 40), M("#4a6a8a", 0.95), 0, 0.005, 0.2, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.2), M("#5a4a6a", 0.9), 0, 1.6, -2.6, { cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.2), M("#4a3a5a", 0.9), -3.5, 1.6, 0, { ry: Math.PI / 2, cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.2), M("#5a4a6a", 0.9), 0, 1.6, 3.4, { ry: Math.PI, cast: false }); put(R, rbox(1.4, 0.9, 0.05, 0.02), M("#2a1e16", 0.5), 0, 1.9, 3.36); put(R, new THREE.PlaneGeometry(1.3, 0.8), M("#3a8a9a", 0.7), 0, 1.9, 3.33, { ry: Math.PI, cast: false });
    put(R, new THREE.PlaneGeometry(10, 3.2), M("#4a3a5a", 0.9), 3.5, 1.6, 0, { ry: -Math.PI / 2, cast: false });
    // TV on a low stand against the back wall
    put(R, rbox(2.2, 0.5, 0.45, 0.03), M("#2a1e16", 0.5), 0, 0.25, -2.3);
    this.livetv = screenMat(1.2);
    put(R, rbox(2.3, 1.35, 0.08, 0.03), M("#0a0a0e", 0.3), 0, 1.35, -2.42); put(R, new THREE.PlaneGeometry(2.18, 1.23), this.livetv, 0, 1.35, -2.37, { cast: false });
    // couch facing the TV (seat top ~0.5)
    const C = grp(R, 0, 0, 1.9, Math.PI);
    put(C, rbox(2.6, 0.42, 0.9, 0.12), MP("#b8432c", 0.8, { clearcoat: 0 }), 0, 0.3, 0); put(C, rbox(2.6, 0.7, 0.25, 0.12), MP("#b8432c", 0.8, { clearcoat: 0 }), 0, 0.75, -0.35);
    for (const sx of [-1, 1]) put(C, rbox(0.25, 0.6, 0.9, 0.1), MP("#a83a24", 0.8, { clearcoat: 0 }), sx * 1.35, 0.4, 0);
    // coffee table with a red mailer + popcorn
    put(R, rbox(1.0, 0.06, 0.55, 0.02), M("#3a2a1e", 0.4), 0, 0.42, 0.6); for (const sx of [-1, 1]) put(R, rbox(0.06, 0.4, 0.5, 0.01), M("#3a2a1e", 0.4), sx * 0.45, 0.2, 0.6);
    put(R, rbox(0.24, 0.012, 0.13, 0.003), MP("#d8262e", 0.5), -0.2, 0.46, 0.6, { ry: 0.3 });
    put(R, cyl(0.1, 0.07, 0.18, 16), MP("#e8e4da", 0.4, { map: canvas(64, 64, (g) => { for (let x = 0; x < 64; x += 16) { g.fillStyle = x % 32 ? "#ffffff" : "#d8262e"; g.fillRect(x, 0, 16, 64); } }) }), 0.25, 0.54, 0.6);
    for (let k = 0; k < 9; k++) put(R, new THREE.SphereGeometry(0.03, 8, 6), M("#fff6d8", 0.8), 0.25 + Math.sin(k * 2.4) * 0.05, 0.64 + (k % 3) * 0.015, 0.6 + Math.cos(k * 2.4) * 0.05, { cast: false });
    // lamp + picture frames
    put(R, cyl(0.12, 0.15, 0.04, 16), M("#222", 0.4), 2.4, 0.02, -1.6); put(R, cyl(0.015, 0.015, 1.5, 8), M("#222", 0.4), 2.4, 0.77, -1.6); put(R, cyl(0.18, 0.25, 0.3, 16, true), glow(canvas(8, 8, (g) => { g.fillStyle = "#ffe0a8"; g.fillRect(0, 0, 8, 8); }), 1.6), 2.4, 1.6, -1.6, { cast: false });
    const lp = new THREE.PointLight("#ffd8a0", 14, 6, 2); lp.position.set(2.4, 1.6, -1.4); R.add(lp);
    for (const [x, y, c] of [[-2.0, 2.0, "#3ac8d8"], [-1.5, 1.6, "#ffb020"], [2.0, 2.2, "#8a3ad8"]] as const) { put(R, rbox(0.45, 0.35, 0.03, 0.01), M("#2a1e16", 0.5), x, y, -2.58); put(R, new THREE.PlaneGeometry(0.37, 0.27), M(c, 0.7), x, y, -2.56, { cast: false }); }
    R.add(new THREE.HemisphereLight("#8a7aaa", "#1a1210", 0.5));
    const tvL = new THREE.PointLight("#8ab4ff", 18, 6, 2); tvL.position.set(0, 1.3, -1.6); R.add(tvL);
    const key = new THREE.SpotLight("#ffe8cc", 60, 12, 0.8, 0.6, 1.5); key.position.set(-1.5, 3.2, 3.0); key.target.position.set(0, 0.6, 0.5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
  }

  // ------------------------------------------------------------------ TV news desk
  buildStudio(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(30, 20), MP("#1a1c24", 0.25, { clearcoat: 0.8 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, new THREE.CylinderGeometry(9, 9, 6, 48, 1, true, -Math.PI / 2, Math.PI), M("#141824", 0.7, 0, { side: THREE.BackSide }), 0, 3, 0, { cast: false });
    const strip = canvas(8, 8, (g) => { g.fillStyle = "#3a8aff"; g.fillRect(0, 0, 8, 8); });
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k + 0.5) / 9 * Math.PI; put(R, rbox(0.06, 5, 0.06, 0.01), glow(strip, 3), Math.sin(a) * 8.9, 3, -Math.cos(a) * 8.9, { cast: false }); }
    this.tv = screenMat(1.15);
    put(R, rbox(6.4, 3.7, 0.12, 0.04), M("#0a0a0e", 0.4), 0, 2.9, -6.0); put(R, new THREE.PlaneGeometry(6.2, 3.5), this.tv, 0, 2.9, -5.93, { cast: false });
    const D = grp(R, 0, 0, -2.6);
    put(D, rbox(3.2, 0.76, 0.9, 0.08), MP("#0e1426", 0.25, { clearcoat: 1 }), 0, 0.38, 0); put(D, rbox(3.3, 0.06, 1.0, 0.02), MP("#c8ccd4", 0.3, { metalness: 0.7 }), 0, 0.78, 0);
    put(D, rbox(3.0, 0.12, 0.02, 0.01), glow(strip, 2.5), 0, 0.55, 0.46, { cast: false });
    R.add(new THREE.HemisphereLight("#5a6a9a", "#0a0a12", 0.5));
    const key = new THREE.SpotLight("#fff2e6", 120, 18, 0.7, 0.5, 1.5); key.position.set(2.5, 5.5, 4); key.target.position.set(0, 1, -2.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); R.add(key, key.target);
    const p = new THREE.PointLight("#ff6a8a", 30, 12, 2); p.position.set(-5, 3, -3); R.add(p);
  }

  // ------------------------------------------------------------------ the store front at night (later: Bend, Oregon)
  buildFront(R: THREE.Group) {
    put(R, new THREE.PlaneGeometry(80, 40), MP("#15161c", 0.2, { clearcoat: 1, clearcoatRoughness: 0.1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
    put(R, rbox(30, 0.15, 3.0, 0.02), M("#5a5a62", 0.8), 0, 0.075, -2.5);
    const F = grp(R, 0, 0, -4.0);
    put(F, rbox(14, 5.2, 0.4, 0.03), M("#1d3a9a", 0.7), 0, 2.6, -0.2);
    this.winM = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffeccc", emissiveIntensity: 1.0, emissiveMap: canvas(512, 256, (g) => { g.fillStyle = "#fff4e0"; g.fillRect(0, 0, 512, 256); const r = rng(6); for (let k = 0; k < 4; k++) { g.fillStyle = "#c8b8a0"; g.fillRect(20 + k * 125, 80, 90, 176); for (let t = 0; t < 30; t++) { g.fillStyle = ["#d8262e", "#1d3a8a", "#ffb020", "#1a7a3a"][Math.floor(r() * 4)]; g.fillRect(24 + k * 125 + (t % 6) * 14, 90 + Math.floor(t / 6) * 32, 12, 26); } } }) });
    for (const x of [-4.2, 4.2]) { put(F, new THREE.PlaneGeometry(4.6, 2.6), this.winM, x, 1.5, 0.02, { cast: false }); put(F, rbox(4.8, 0.12, 0.1, 0.02), M("#ffd23a", 0.5), x, 2.86, 0.05); }
    put(F, new THREE.PlaneGeometry(1.6, 2.4), this.winM, 0, 1.2, 0.02, { cast: false }); put(F, rbox(1.75, 0.1, 0.12, 0.02), M("#ffd23a", 0.5), 0, 2.45, 0.05);
    this.frontSign = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.3, emissiveMap: signTex("BLOCKBUSTER", "VIDEO") });
    put(F, rbox(8.4, 1.6, 0.25, 0.04), M("#0e1a4a", 0.5), 0, 4.0, 0.15); put(F, new THREE.PlaneGeometry(8.2, 1.5), this.frontSign, 0, 4.0, 0.29, { cast: false });
    this.banner = new THREE.MeshStandardMaterial({ color: "#000", emissive: "#ffffff", emissiveIntensity: 1.1, emissiveMap: signTex("", "", "#ffffff", "#d8262e", 1024, 256) });
    put(F, new THREE.PlaneGeometry(3.8, 0.95), this.banner, -4.2, 1.6, 0.05, { cast: false });
    // lamps on the sidewalk
    for (const x of [-5.3, 5.3]) { const l = grp(R, x, 0, -1.2); put(l, cyl(0.06, 0.08, 4.2, 10), M("#222", 0.5, 0.6), 0, 2.1, 0); put(l, rbox(0.6, 0.1, 0.3, 0.02), glow(canvas(8, 8, (g) => { g.fillStyle = "#ffd8a0"; g.fillRect(0, 0, 8, 8); }), 4), 0.25, 4.2, 0, { cast: false }); const p = new THREE.PointLight("#ffc890", 30, 10, 2); p.position.set(x + 0.25, 4.0, -1.2); R.add(p); }
    // pine trees + mountain silhouette (only for the Bend ending)
    this.pines = grp(R);
    const pineM = M("#1a3a2a", 0.8);
    for (const [x, z, s] of [[-3.6, -7.5, 2.3], [3.8, -8.0, 2.5], [-1.2, -9.0, 2.0], [6.2, -2.2, 1.05], [-6.2, -2.2, 1.0], [1.6, -9.5, 1.9]] as const) { const T = grp(this.pines, x, 0, z); put(T, cyl(0.12, 0.16, 1.2 * s, 8), M("#4a3020", 0.8), 0, 0.6 * s, 0); for (let k = 0; k < 3; k++) put(T, new THREE.ConeGeometry((1.2 - k * 0.3) * s, 1.6 * s, 12), pineM, 0, (1.4 + k * 0.9) * s, 0); }
    put(this.pines, new THREE.ConeGeometry(16, 11, 5), M("#2a2a44", 0.9), 6, 5.5, -30, { cast: false }); put(this.pines, new THREE.ConeGeometry(3.4, 2.4, 5), M("#e8eef8", 0.7), 6, 9.8, -30, { cast: false });
    this.pines.visible = false;
    this.skyNight = sky(R, [0.03, 0.03, 0.10], [0.32, 0.12, 0.30]);
    R.add(new THREE.HemisphereLight("#4a3a7a", "#0a0a10", 0.5));
    const moon = new THREE.DirectionalLight("#9ab8ff", 1.0); moon.position.set(-10, 20, 10); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 }); R.add(moon, moon.target);
    const shop = new THREE.PointLight("#ffe8c0", 40, 9, 2); shop.position.set(0, 1.8, -2.4); R.add(shop); this.frontLights.push(shop);
    const shop2 = new THREE.SpotLight("#ffe8c0", 60, 12, 0.9, 0.7, 1.5); shop2.position.set(0, 5.5, 1); shop2.target.position.set(0, 1, -3); R.add(shop2, shop2.target); this.frontLights.push(shop2);
  }
}
