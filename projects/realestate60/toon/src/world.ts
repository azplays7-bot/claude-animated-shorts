// The world of "How Real Estate Can Build Wealth" as one three.js scene (Pisa engine): a suburban street with the
// rental house, its neighbours and a bank down the road; three insert sets far away (Alex's office at night, the
// lender's office, the money stage). update(id, f, camera) poses everything for shot `id` at frame f. Sky, light rig,
// clouds, character cards and the post chain are the bridge / Pisa engine's.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, boxGeo, V, lam, quad, tri, Kit, Ray, house, prop, setSight, matTable } from "./build";
import { ctex, rep, stoneHD, grassHD, planksHD, cloudHD, beam } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, V3, smooth, clamp01, ShotDef, HOUSE, HW, HD, HH, WALK_Z, ROAD_Z, SIGN, BANK_B, OFFICE, LENDER, STAGE, COLUMN, BT,
  yearsAt, seasonAt, loanAt, valueAt } from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default", "tree_fat", "tree_cone", "plant_bushDetailed", "plant_bush", "hedge"];
let kitP: Promise<Kit> | null = null;
export const loadKit = () => {
  if (!kitP) {
    const loader = new GLTFLoader();
    kitP = Promise.all(KENNEY.map((n) => loader.loadAsync(staticFile(`bridge/kenney/${n}.glb`)).then((g) => [n, g.scene] as const).catch(() => [n, null] as const)))
      .then((list) => Object.fromEntries(list.filter((e) => e[1]).map(([n, s]) => [n, s!])) as Kit);
  }
  return kitP;
};

// ---------------- painted textures ----------------
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6f7a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const signTex = (lines: string[], bg: string) => ctex("sign" + lines.join("|") + bg, 768, 512, (g) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, 768, 512);
  g.fillStyle = bg; g.fillRect(22, 22, 724, 468);
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  if (lines.length === 1) { g.font = "190px Anton, Impact, sans-serif"; g.fillText(lines[0], 384, 268); }
  else { g.font = "150px Anton, Impact, sans-serif"; g.fillText(lines[0], 384, 170); g.font = "120px Anton, Impact, sans-serif"; g.fillText(lines[1], 384, 360); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024) => ctex("board" + text + bg, w, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, 256);
  g.fillStyle = fg; g.font = "150px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, 136);
});
const cashTex = () => ctex("cashBundle", 512, 256, (g) => {
  g.fillStyle = "#a9d898"; g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#2f7a46"; g.lineWidth = 14; g.strokeRect(12, 12, 488, 232);
  g.fillStyle = "#e3f4dc"; g.beginPath(); g.ellipse(256, 128, 70, 70, 0, 0, 7); g.fill();
  g.fillStyle = "#2f7a46"; g.font = "120px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 256, 134);
  g.fillStyle = "#f2e2b6"; g.fillRect(228, 0, 56, 256);
});
const nightTex = () => ctex("nightWin", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#1b2552"); gr.addColorStop(1, "#4a4a86"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 50; k++) { g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(r() * 512, r() * 300, 3, 3); }
  g.fillStyle = "#fff4cf"; g.beginPath(); g.arc(380, 120, 40, 0, 7); g.fill(); g.fillStyle = "#1e2858"; g.beginPath(); g.arc(398, 108, 36, 0, 7); g.fill();
  for (let k = 0; k < 7; k++) { g.fillStyle = "#151b3a"; const h = 140 + r() * 160; g.fillRect(k * 76, 512 - h, 70, h); g.fillStyle = "#ffd36b"; for (let j = 0; j < 6; j++) g.fillRect(k * 76 + 10 + (j % 3) * 20, 512 - h + 20 + Math.floor(j / 3) * 30, 9, 12); }
  g.strokeStyle = "#f4efe6"; g.lineWidth = 22; g.strokeRect(11, 11, 490, 490); g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
});
const screenTex = () => ctex("screen", 512, 320, (g) => {
  g.fillStyle = "#0e2a52"; g.fillRect(0, 0, 512, 320);
  for (let k = 0; k < 8; k++) { g.fillStyle = k % 3 ? "#7fb6f5" : "#ffd44d"; g.fillRect(36, 30 + k * 34, 120 + ((k * 97) % 280), 14); }
});
const clockTex = () => ctex("clockE", 256, 256, (g) => {
  g.fillStyle = "#f7f1e1"; g.strokeStyle = "#221f2e"; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 110, 0, 7); g.fill(); g.stroke();
  g.lineCap = "round"; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(122, 60); g.stroke(); g.lineWidth = 9; g.beginPath(); g.moveTo(128, 128); g.lineTo(92, 150); g.stroke();
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

/** every street lens position looking at its subject (houses that would block a shot are left out) */
const sightLines = (): Ray[] => {
  const out: Ray[] = [];
  for (const s of SHOTS) {
    if (s.place !== "street" || s.id === 2 || s.id === 12) continue;   // aerials look over the roofs
    for (let f = s.a - 8; f < s.b + 8; f += 3) {
      const c = camAt(s.id, Math.max(0, Math.min(1799, f))), o = V(...c.pos), look = V(...c.look);
      const fw = look.clone().sub(o), len = fw.length() + 6;
      fw.normalize();
      const rt = fw.clone().cross(V(0, 1, 0)).normalize(), up = rt.clone().cross(fw);
      const ty = Math.tan((c.fov * Math.PI) / 360), tx = ty * (9 / 16);
      for (const [sx, sy] of [[0, 0], [-0.7, 0], [0.7, 0], [0, 0.7], [0, -0.5]])
        out.push({ o, d: fw.clone().addScaledVector(rt, sx * tx).addScaledVector(up, sy * ty), len: sy < 0 ? len - 6 : len, core: sx === 0 && sy === 0 });
    }
  }
  return out;
};

type Season = { leaf: THREE.Color; grass: THREE.Color; roof: THREE.Color };
const SEAS = {
  summer: { leaf: new THREE.Color(1, 1, 1), grass: new THREE.Color(1, 1, 1), roof: new THREE.Color(1, 1, 1) },
  autumn: { leaf: new THREE.Color(2.6, 1.15, 0.32), grass: new THREE.Color(1.25, 1.0, 0.55), roof: new THREE.Color(1, 1, 1) },
  winter: { leaf: new THREE.Color(2.4, 2.3, 2.7), grass: new THREE.Color(2.3, 2.3, 2.6), roof: new THREE.Color(2.0, 2.1, 2.4) },
  spring: { leaf: new THREE.Color(1.25, 1.35, 0.85), grass: new THREE.Color(1.1, 1.15, 0.9), roof: new THREE.Color(1, 1, 1) },
};
const lerpS = (a: Season, b: Season, k: number): Season => ({ leaf: a.leaf.clone().lerp(b.leaf, k), grass: a.grass.clone().lerp(b.grass, k), roof: a.roof.clone().lerp(b.roof, k) });
const seasonTint = (s: number): Season => {
  if (s < 0.3) return lerpS(SEAS.summer, SEAS.autumn, smooth(s / 0.3));
  if (s < 0.55) return lerpS(SEAS.autumn, SEAS.winter, smooth((s - 0.3) / 0.25));
  if (s < 0.8) return lerpS(SEAS.winter, SEAS.spring, smooth((s - 0.55) / 0.25));
  return lerpS(SEAS.spring, SEAS.summer, smooth((s - 0.8) / 0.2));
};

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 25, 420);
  private sunCache = new Map<number, THREE.Vector3>();
  private cloudMaps: Record<"day" | "golden", THREE.Texture[]>;
  private clouds: THREE.Mesh[] = [];
  // dynamic props
  private signs: Record<string, THREE.Group> = {};
  private boxes = new THREE.Group();
  private column = new THREE.Group(); private loanBar: THREE.Mesh; private eqBar: THREE.Mesh;
  private pins: THREE.Group[] = [];
  private lenderCash: THREE.Mesh[] = []; private contract: THREE.Mesh;
  private stageCash: THREE.Mesh[] = []; private piggy = new THREE.Group(); private toolbox = new THREE.Group();
  private seasonMats: { m: THREE.MeshLambertMaterial; kind: keyof Season; base: THREE.Color }[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
    // ---- sky + light (bridge engine) ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      const w = 130 + (i % 4) * 30; m.scale.set(w, w / 2, 1); m.layers.set(NOINK);
      m.userData.a = (i / 10) * Math.PI * 2 + 0.3; m.userData.d = 620 + (i % 3) * 60; m.userData.h = 120 + (i % 4) * 38;
      this.clouds.push(m); R.add(m);
    }

    // ---- the street (static batch) ----
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const white = lam("whiteTrim", () => ({ color: "#f6f1e6" })), yellow = lam("roadLine", () => ({ color: "#f2c94c" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-300, 300, ROAD_Z - 3, ROAD_Z + 3, 0.012, 60, 1), asph);
    b.add(flat(-300, 300, WALK_Z - 0.8, WALK_Z + 0.7, 0.02, 120, 1), path);
    b.add(flat(-300, 300, ROAD_Z + 3.1, ROAD_Z + 4.6, 0.02, 120, 1), path);
    for (let x = -300; x < 300; x += 6) b.add(flat(x, x + 3, ROAD_Z - 0.09, ROAD_Z + 0.09, 0.016, 1, 1), yellow);
    box(b, curb, -300, 0, ROAD_Z - 3.12, 300, 0.14, ROAD_Z - 2.95); box(b, curb, -300, 0, ROAD_Z + 2.95, 300, 0.14, ROAD_Z + 3.12);
    // the rental house is always built (it is the subject); the rest step aside for the lens
    setSight([]);
    house(b, HOUSE[0], HOUSE[2], 0, HW, HD, HH, 0);
    b.add(flat(-0.8, 0.8, HD / 2, WALK_Z - 0.8, 0.018, 1, 2), path);                                   // front walk
    // white picket fence along the front yard, gap at the walk
    for (const [x0, x1] of [[-5.2, -1.1], [1.1, 5.2]]) {
      for (let x = x0; x <= x1 + 1e-6; x += 0.32) box(b, white, x - 0.05, 0, 5.98, x + 0.05, 0.85, 6.04);
      for (const y of [0.3, 0.65]) box(b, white, x0, y - 0.04, 5.94, x1, y + 0.04, 5.98);
    }
    // mailbox
    box(b, lam("post", () => ({ color: "#6e4b33" })), -1.75, 0, 6.15, -1.65, 1.0, 6.25);
    box(b, lam("mailbox", () => ({ color: "#2f5fb5" })), -1.95, 1.0, 6.05, -1.45, 1.25, 6.35);
    setSight(sightLines());
    // neighbours: north side facing the street, south side facing back
    const rays = sightLines(); setSight(rays.filter((r) => r.core));   // neighbours only step aside for the centre of a shot
    const north: [number, number, number][] = [[14, 1, 5.6], [-27, 4, 5.6], [27, 6, 6.4], [-42, 7, 5.6], [41, 5, 5.6], [-55, 2, 6.4], [55, 3, 5.6]];
    for (const [x, si, h] of north) house(b, x, 0, 0, 9, 8, h, si);
    const south: [number, number, number][] = [[-21, 5, 5.6], [-7, 2, 6.4], [7, 4, 5.6], [21, 7, 5.6], [35, 1, 6.4], [-35, 3, 5.6], [49, 6, 5.6], [-49, 0, 6.4]];
    for (const [x, si, h] of south) house(b, x, 24, Math.PI, 9, 8, h, si);
    setSight(rays);
    // the bank down the street
    const bankW = lam("bankWall", () => ({ color: "#efe7d6" })), bankR = lam("bankRoof", () => ({ color: "#c9c2b2" }));
    const [bx, , bz] = BANK_B;
    box(b, bankW, bx - 5, 0, bz - 4, bx + 5, 6, bz + 4);
    box(b, bankR, bx - 5.5, 6, bz - 4.5, bx + 5.5, 6.6, bz + 4.8);
    b.add(tri(V(bx - 5.5, 6.6, bz + 4.8), V(bx + 5.5, 6.6, bz + 4.8), V(bx, 8.4, bz + 4.8)), bankR);
    for (let i = 0; i < 4; i++) b.add(cyl(0.32, 6, 16), white, M4(bx - 3.6 + i * 2.4, 0, bz + 4.35));
    b.add(quad(V(bx - 2.2, 5.0, bz + 4.86), V(bx + 2.2, 5.0, bz + 4.86), V(bx + 2.2, 5.9, bz + 4.86), V(bx - 2.2, 5.9, bz + 4.86)), lam("bankSign", () => ({ map: boardTex("BANK", "#1f5a3a", "#ffe08a") })));
    box(b, lam("bankDoor", () => ({ color: "#5a3b2a" })), bx - 0.8, 0, bz + 3.95, bx + 0.8, 2.6, bz + 4.02);
    // trees and bushes
    const trees: [number, number, number][] = [[-6.6, 3.0, 7.5], [6.4, 2.0, 8.0], [-20.5, 3.5, 7.5], [20.5, 3.0, 8.5], [-34, 3.5, 7], [34, 3.0, 8], [-14, 17.2, 7.5], [0, 17.5, 8], [14, 17.2, 7], [28, 17.2, 7.5], [-28, 17.5, 8], [-46, 3.5, 7.5], [47, 3.2, 8]];
    trees.forEach(([x, z, h], i) => prop(b, kit, ["tree_oak", "tree_fat", "tree_default", "tree_oak"][i % 4], x, 0, z, h, i * 1.3));
    for (const x of [-3.6, -2.2, 2.2, 3.6]) prop(b, kit, "plant_bushDetailed", x, 0, HD / 2 + 0.7, 1.1, x);
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#7d9a7a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);

    // ---- yard signs (one per state) ----
    const states: [string, string[], string][] = [["sale", ["FOR SALE", "$250,000"], "#d0352f"], ["sold", ["SOLD"], "#2f5fb5"], ["rent", ["FOR RENT"], "#e07a1f"], ["rented", ["RENTED"], "#2f9a55"]];
    for (const [k, lines, bg] of states) {
      const g = new THREE.Group();
      mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1).translate(-0.75, 0.95, 0), white, g);
      mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08).translate(-0.25, 1.85, 0), white, g);
      mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05).translate(-0.15, 1.35, 0), lam("signFace" + k, () => ({ map: signTex(lines, bg) })), g);
      g.position.set(...SIGN); g.rotation.y = -0.25; g.visible = false; R.add(g); this.signs[k] = g;
    }
    // moving boxes on the porch
    const card = lam("cardboard", () => ({ color: "#c99a5b" }));
    for (const [x, y, z, s] of [[-2.0, 0, 4.9, 0.6], [-1.4, 0, 5.1, 0.55], [-1.75, 0.5, 5.0, 0.45], [1.5, 0, 4.9, 0.6]]) {
      const m = mesh(new THREE.BoxGeometry(s, s * 0.85, s).translate(0, s * 0.425, 0), card, this.boxes); m.position.set(x, y, z); m.rotation.y = x * 0.7;
    }
    this.boxes.visible = false; R.add(this.boxes);
    // the home-value column (time-lapse): red = loan still owed, gold = Alex's equity
    mesh(cyl(1.0, 0.25, 32), lam("colBase", () => ({ color: "#4a5262" })), this.column);
    this.loanBar = mesh(UB, lam("loanBar", () => ({ color: "#e0453c" })), this.column);
    this.eqBar = mesh(UB, twoTone(new THREE.MeshPhongMaterial({ color: "#f2c33a", specular: "#fff0b0", shininess: 60 }), 0.15), this.column);
    const lbl = (t: string, bg: string) => new THREE.MeshBasicMaterial({ map: boardTex(t, bg, "#ffffff", 768), toneMapped: true });
    const ll = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.37), lbl("LOAN", "#a32a24")); ll.name = "lLoan"; ll.layers.set(NOINK); this.column.add(ll);
    const le = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.37), lbl("EQUITY", "#b8860b")); le.name = "lEq"; le.layers.set(NOINK); this.column.add(le);
    this.column.position.set(...COLUMN); this.column.visible = false; R.add(this.column);
    // gold pins over other houses ("maybe one day")
    const gold = twoTone(new THREE.MeshPhongMaterial({ color: "#f2c33a", specular: "#fff0b0", shininess: 60, emissive: "#5a3a00" }), 0.15);
    for (const [x, z] of [[-14, 0], [14, 0], [-7, 24], [7, 24]]) {
      const g = new THREE.Group();
      mesh(new THREE.ConeGeometry(0.9, 2.0, 24).rotateX(Math.PI), gold, g).position.y = 0;
      mesh(new THREE.SphereGeometry(1.0, 24, 16), gold, g).position.y = 1.1;
      g.position.set(x, 13, z); g.visible = false; R.add(g); this.pins.push(g);
    }

    // ---- Alex's office (night) ----
    {
      const [OX, , OZ] = OFFICE, ob = new Batch();
      const floor = lam("offFloor", () => ({ map: rep(planksHD(), 2, 2) })), wall = lam("offWall", () => ({ color: "#d9cdb4" }));
      ob.add(quad(V(OX - 5, 0, OZ + 5), V(OX + 5, 0, OZ + 5), V(OX + 5, 0, OZ - 5), V(OX - 5, 0, OZ - 5), 3, 3), floor);
      box(ob, wall, OX - 5, 0, OZ - 1.6, OX + 5, 3.4, OZ - 1.45);
      box(ob, wall, OX - 2.9, 0, OZ - 5, OX - 2.75, 3.4, OZ + 5);
      ob.add(quad(V(OX - 1.9, 1.3, OZ - 1.44), V(OX - 0.3, 1.3, OZ - 1.44), V(OX - 0.3, 2.7, OZ - 1.44), V(OX - 1.9, 2.7, OZ - 1.44)), lam("nightWin", () => ({ map: nightTex() })));
      ob.add(new THREE.CircleGeometry(0.32, 32).translate(OX + 1.2, 2.55, OZ - 1.43), lam("clockFace", () => ({ map: clockTex() })));
      const wood = lam("deskWood", () => ({ map: beam() }));
      box(ob, wood, OX - 1.1, 0.74, OZ + 0.35, OX + 1.1, 0.82, OZ + 1.15);           // desk top
      box(ob, wood, OX - 1.05, 0, OZ + 0.4, OX - 0.95, 0.74, OZ + 1.1); box(ob, wood, OX + 0.95, 0, OZ + 0.4, OX + 1.05, 0.74, OZ + 1.1);
      box(ob, lam("deskFront", () => ({ color: "#7a5236" })), OX - 1.05, 0.15, OZ + 1.1, OX + 1.05, 0.74, OZ + 1.15);
      box(ob, lam("monitor", () => ({ color: "#2a2f3a" })), OX - 1.08, 0.82, OZ + 0.45, OX - 0.62, 1.2, OZ + 0.5);
      ob.add(quad(V(OX - 1.05, 0.85, OZ + 0.51), V(OX - 0.65, 0.85, OZ + 0.51), V(OX - 0.65, 1.17, OZ + 0.51), V(OX - 1.05, 1.17, OZ + 0.51)), new THREE.MeshBasicMaterial({ map: screenTex() }));
      for (let k = 0; k < 4; k++) box(ob, lam("paperStack", () => ({ color: "#f4f1ea" })), OX + 0.35, 0.82 + k * 0.03, OZ + 0.55, OX + 0.75, 0.84 + k * 0.03, OZ + 0.85);
      ob.add(cyl(0.06, 0.13, 16), lam("mug", () => ({ color: "#e2453c" })), M4(OX + 0.9, 0.82, OZ + 0.95));
      ob.build(R);
      const lamp = new THREE.PointLight("#ffcf7a", 6, 4); lamp.position.set(OX + 0.7, 1.4, OZ + 0.9); R.add(lamp);
    }
    // ---- the lender's office ----
    {
      const [LX, , LZ] = LENDER, lb = new Batch();
      const floor = lam("lenFloor", () => ({ map: rep(planksHD(), 2, 2) })), wall = lam("lenWall", () => ({ color: "#cfdce6" }));
      lb.add(quad(V(LX - 6, 0, LZ + 6), V(LX + 6, 0, LZ + 6), V(LX + 6, 0, LZ - 6), V(LX - 6, 0, LZ - 6), 3, 3), floor);
      box(lb, wall, LX - 6, 0, LZ - 1.9, LX + 6, 3.6, LZ - 1.75);
      lb.add(quad(V(LX - 1.3, 2.35, LZ - 1.74), V(LX + 1.3, 2.35, LZ - 1.74), V(LX + 1.3, 3.0, LZ - 1.74), V(LX - 1.3, 3.0, LZ - 1.74)), lam("loanSign", () => ({ map: boardTex("HOME LOANS", "#1f5a3a", "#ffe08a") })));
      const desk = lam("lenDesk", () => ({ color: "#f4f1ea" })), dk = lam("lenDeskFront", () => ({ color: "#9aa8b8" }));
      box(lb, desk, LX - 1.3, 0.74, LZ - 0.45, LX + 1.3, 0.82, LZ + 0.45);
      box(lb, dk, LX - 1.25, 0.1, LZ + 0.4, LX + 1.25, 0.74, LZ + 0.45);
      box(lb, lam("plant", () => ({ color: "#3f8f3c" })), LX + 2.4, 0, LZ - 1.5, LX + 2.9, 1.3, LZ - 1.0);
      lb.build(R);
      const cashM = lam("cashBundle", () => ({ map: cashTex() }));
      for (let i = 0; i < 25; i++) { const m = mesh(new THREE.BoxGeometry(0.42, 0.06, 0.2), cashM, R); m.visible = false; this.lenderCash.push(m); }
      this.contract = mesh(new THREE.PlaneGeometry(0.42, 0.55).rotateX(-Math.PI / 2), lam("contract", () => ({ map: ctex("contractT", 400, 520, (g) => {
        g.fillStyle = "#ffffff"; g.fillRect(0, 0, 400, 520); g.fillStyle = "#1f5a3a"; g.font = "60px Anton, Impact, sans-serif"; g.textAlign = "center"; g.fillText("MORTGAGE", 200, 90);
        g.fillStyle = "rgba(31,90,58,0.35)"; for (let k = 0; k < 8; k++) g.fillRect(40, 140 + k * 36, 320 - (k % 3) * 40, 12);
        g.strokeStyle = "#222"; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 470); g.bezierCurveTo(100, 420, 140, 500, 200, 450); g.stroke(); }) })), R);
      this.contract.visible = false;
    }
    // ---- the money stage ----
    {
      const [SX, , SZ] = STAGE, sb = new Batch();
      sb.add(cyl(7, 0.5, 64), lam("stageTop", () => ({ color: "#e9dcc0" })), M4(SX, -0.5, SZ));
      sb.add(cyl(7.3, 0.2, 64), lam("stageRim", () => ({ color: "#c98a3a" })), M4(SX, -0.5, SZ));
      sb.add(cyl(0.8, 0.4, 32), lam("plinth", () => ({ color: "#6b7383" })), M4(SX, 0, SZ));
      // bins: mini bank (mortgage), shield (taxes + insurance), toolbox (repairs + vacancy)
      const bw = lam("miniBank", () => ({ color: "#efe7d6" })), br = lam("miniBankRoof", () => ({ color: "#2f5fb5" }));
      const mb = (x: number, z: number) => {
        box(sb, bw, x - 0.9, 0, z - 0.6, x + 0.9, 0.2, z + 0.6);
        for (let i = 0; i < 4; i++) sb.add(cyl(0.09, 1.0, 12), bw, M4(x - 0.66 + i * 0.44, 0.2, z + 0.35));
        box(sb, bw, x - 0.8, 0.2, z - 0.55, x + 0.8, 1.2, z + 0.2);
        box(sb, br, x - 1.0, 1.2, z - 0.65, x + 1.0, 1.35, z + 0.65);
        sb.add(tri(V(x - 1.0, 1.35, z + 0.65), V(x + 1.0, 1.35, z + 0.65), V(x, 1.85, z + 0.65)), br);
        sb.add(tri(V(x + 1.0, 1.35, z - 0.65), V(x - 1.0, 1.35, z - 0.65), V(x, 1.85, z - 0.65)), br);
        sb.add(quad(V(x - 1.0, 1.35, z + 0.65), V(x - 1.0, 1.35, z - 0.65), V(x, 1.85, z - 0.65), V(x, 1.85, z + 0.65)), br);
        sb.add(quad(V(x + 1.0, 1.35, z - 0.65), V(x + 1.0, 1.35, z + 0.65), V(x, 1.85, z + 0.65), V(x, 1.85, z - 0.65)), br);
      };
      mb(SX - 3.6, SZ - 1.4);
      const sh = new THREE.Shape(); sh.moveTo(0, 0.9); sh.quadraticCurveTo(0.55, 0.85, 0.75, 0.7); sh.quadraticCurveTo(0.75, -0.3, 0, -0.9); sh.quadraticCurveTo(-0.75, -0.3, -0.75, 0.7); sh.quadraticCurveTo(-0.55, 0.85, 0, 0.9);
      sb.add(new THREE.ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }).translate(0, 1.1, 0), lam("shield", () => ({ color: "#3a9bd6" })), M4(SX, 0, SZ - 4.2));
      box(sb, lam("shieldX", () => ({ color: "#ffffff" })), SX - 0.08, 0.85, SZ - 3.88, SX + 0.08, 1.45, SZ - 3.86); box(sb, lam("shieldX", () => ({ color: "#ffffff" })), SX - 0.3, 1.07, SZ - 3.88, SX + 0.3, 1.23, SZ - 3.86);
      const tb = lam("toolbox", () => ({ color: "#d63a32" }));
      box(sb, tb, SX + 2.9, 0, SZ - 1.8, SX + 4.3, 0.7, SZ - 1.1); box(sb, lam("toolboxLid", () => ({ color: "#9c2a24" })), SX + 2.88, 0.7, SZ - 1.82, SX + 4.32, 0.82, SZ - 1.08);
      sb.add(new THREE.TorusGeometry(0.25, 0.05, 8, 20, Math.PI).translate(SX + 3.6, 0.82, SZ - 1.45), lam("handle", () => ({ color: "#2a2f3a" })));
      // labels in front of each bin
      const lab = (t: string, bg: string, x: number, z: number, w = 2.4) => sb.add(quad(V(x - w / 2, 0.02, z + 0.35), V(x + w / 2, 0.02, z + 0.35), V(x + w / 2, 0.62, z), V(x - w / 2, 0.62, z)), lam("lab" + t, () => ({ map: boardTex(t, bg) })));
      lab("MORTGAGE", "#a32a24", SX - 3.6, SZ - 0.3);
      lab("TAXES + INSURANCE", "#1f6aa0", SX, SZ - 3.3, 3.0);
      lab("REPAIRS + VACANCY", "#b0561a", SX + 3.6, SZ - 0.5, 3.0);
      lab("CASH FLOW", "#2f8a4a", SX + 2.6, SZ + 2.9);
      sb.build(R);
      // piggy bank (cash flow), toolbox wobble group
      const pk = lam("piggy", () => ({ color: "#f6a6c8" })), pk2 = lam("piggy2", () => ({ color: "#e77aa8" }));
      mesh(new THREE.SphereGeometry(0.7, 32, 24).scale(1.25, 1, 1).translate(0, 0.85, 0), pk, this.piggy);
      mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.24, 20).rotateZ(Math.PI / 2).translate(0.9, 0.9, 0), pk2, this.piggy);
      for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.14, 0.3, 12).rotateZ(-0.4).translate(0.45, 1.5, s * 0.3), pk2, this.piggy);
      for (const [x, z] of [[-0.5, 0.35], [0.5, 0.35], [-0.5, -0.35], [0.5, -0.35]]) mesh(cyl(0.12, 0.35, 12), pk2, this.piggy).position.set(x, 0, z);
      for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.06, 10, 8).translate(0.72, 1.12, s * 0.22), lam("eye", () => ({ color: "#1e1a24" })), this.piggy);
      mesh(new THREE.BoxGeometry(0.5, 0.04, 0.08).translate(0, 1.55, 0), lam("slot", () => ({ color: "#7a2a4a" })), this.piggy);
      this.piggy.position.set(SX + 2.6, 0, SZ + 1.6); this.piggy.rotation.y = -0.5; R.add(this.piggy);
      const cashM = lam("cashBundle", () => ({ map: cashTex() }));
      for (let i = 0; i < 36; i++) { const m = mesh(new THREE.BoxGeometry(0.9, 0.09, 0.42), cashM, R); m.visible = false; this.stageCash.push(m); }
    }
    // the seasonal materials (leaves, lawn, roofs) and their painted colours
    for (const [k, m] of matTable()) {
      const kind: keyof Season | null = k.startsWith("leafHD") ? "leaf" : k === "grassHD" ? "grass" : k.startsWith("roof") ? "roof" : null;
      if (kind && m.color) this.seasonMats.push({ m, kind, base: m.color.clone() });
    }
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz ?? L.az), el = THREE.MathUtils.degToRad(s.sunEl ?? L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  private poseProps(id: number, f: number) {
    const t = f / FPS;
    // yard sign state
    const sign = id <= 4 ? (id >= 4 ? "sale" : "rented") : id === 5 ? null : id === 6 ? "sold" : id === 7 ? (f < BT.rents + 46 ? "rent" : "rented") : "rented";
    for (const k in this.signs) this.signs[k].visible = k === sign && SHOTS[id - 1].place === "street";
    this.boxes.visible = (id === 7 && f > BT.pay - 20) || id === 8 || id >= 10;
    // home-value column
    this.column.visible = id === 10;
    if (id === 10) {
      const y = yearsAt(f), K = 1 / 60000, V0 = valueAt(y), L0 = loanAt(y), w = 1.4;
      const grow = smooth((f - 1203) / 10);
      this.loanBar.scale.set(w, Math.max(0.01, L0 * K * grow), w); this.loanBar.position.y = 0.25 + (L0 * K * grow) / 2;
      const eh = (V0 - L0) * K * grow;
      this.eqBar.scale.set(w + 0.04, Math.max(0.01, eh), w + 0.04); this.eqBar.position.y = 0.25 + L0 * K * grow + eh / 2;
      const ll = this.column.getObjectByName("lLoan")!, le = this.column.getObjectByName("lEq")!;
      ll.position.set(0, 0.25 + (L0 * K * grow) / 2, w / 2 + 0.03); le.position.set(0, 0.25 + L0 * K * grow + eh / 2, w / 2 + 0.05);
      ll.visible = le.visible = grow > 0.9;
    }
    // pins over other houses
    this.pins.forEach((p, i) => { const u = smooth((f - BT.guar - i * 6) / 10); p.visible = id === 12 && u > 0; p.scale.setScalar(Math.max(0.01, u)); p.position.y = 13 + 0.4 * Math.sin(t * 2 + i); p.rotation.y = t * 1.2; });
    // lender: $10,000 bundles - 5 from Alex (down payment), 20 from the bank (loan), merged into one $250,000 pile
    const [LX, , LZ] = LENDER;
    const merge = smooth((f - BT.loan - 30) / 24);
    this.lenderCash.forEach((m, i) => {
      if (id !== 5) { m.visible = false; return; }
      const mine = i < 5, k = mine ? i : i - 5, ap = mine ? BT.down + 6 + k * 3 : BT.loan + 6 + k * 1.2, a = clamp01((f - ap) / 9);
      m.visible = a > 0;
      const from = mine ? V(LX + 0.75, 0.85 + k * 0.065, LZ + 0.2) : V(LX - 0.15 + (k >= 10 ? 0.45 : 0), 0.85 + (k % 10) * 0.065, LZ - 0.1);
      const drop = mine ? V(LX + 0.75, 1.5, LZ + 0.5) : V(LX + 0.1, 3.4, LZ - 0.1);
      const p = drop.lerp(from, a);
      const to = V(LX - 0.25 + (i >= 13 ? 0.5 : 0), 0.85 + (i % 13) * 0.065, LZ);
      m.position.copy(p.lerp(to, merge)); m.rotation.y = 0.15 * (1 - merge) * (i % 3 - 1);
    });
    this.contract.visible = id === 5 && f > BT.loan + 54;
    this.contract.position.set(LX + 0.6, 0.83, LZ + 0.15); this.contract.rotation.y = -0.3;
    // stage: 36 bundles of $50 = $1,800; peel off the top: 24 mortgage, 5 taxes+insurance, 4 repairs, 3 left (cash flow)
    const [SX, , SZ] = STAGE;
    const groups: [number, number, V3, number][] = [[24, BT.mort + 8, [SX - 3.6, 1.5, SZ - 1.4], 1.0], [5, BT.tax + 14, [SX, 1.0, SZ - 4.2], 2.4], [4, BT.rep + 14, [SX + 3.6, 0.9, SZ - 1.45], 2.4], [3, BT.left + 10, [SX + 2.6, 1.6, SZ + 1.6], 2.4]];
    const wipe = BT.wipe + 18;
    let idx = 35;
    for (const [n, t0, dest, every] of groups) for (let k = 0; k < n; k++, idx--) {
      const m = this.stageCash[idx];
      if (id !== 9) { m.visible = false; continue; }
      const start = V(SX, 0.45 + idx * 0.1, SZ);
      const u = clamp01((f - t0 - k * every) / 16);
      let p = start.clone(), s = 1;
      if (u > 0) { const d = V(...dest), mid = start.clone().lerp(d, 0.5); mid.y = Math.max(start.y, d.y) + 1.2; p = start.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(mid, 2 * u * (1 - u)).addScaledVector(d, u * u); s = 1 - 0.85 * u * u; }
      if (n === 3 && f > wipe) { // the repair takes the cash flow
        const w = clamp01((f - wipe - k * 2) / 16), d = V(SX + 3.6, 0.9, SZ - 1.45), a = V(...dest), mid = a.clone().lerp(d, 0.5); mid.y += 1.4;
        p = a.clone().multiplyScalar((1 - w) * (1 - w)).addScaledVector(mid, 2 * w * (1 - w)).addScaledVector(d, w * w); s = 0.15 + 0.5 * (1 - w) * (1 - w);
        if (w >= 1) s = 0;
      }
      m.visible = s > 0.02 && u < 1 || (n === 3 && f <= wipe && u > 0);
      if (n === 3 && f <= wipe && u >= 1) { p = V(dest[0] + (k - 1) * 0.0, dest[1] + 0.2 + k * 0.1, dest[2]); s = 0.6; m.visible = true; }
      m.position.copy(p); m.scale.setScalar(Math.max(0.01, s)); m.rotation.y = u > 0 ? (1 - u) * 2.5 : 0;
    }
    // the piggy wobbles when the repair hits; the toolbox gulps
    const sh = id === 9 && f > BT.wipe && f < wipe + 20 ? 0.06 * Math.sin(f * 2.2) : 0;
    this.piggy.position.x = SX + 2.6 + sh;
    this.piggy.visible = id === 9;
    // seasons (time-lapse only)
    const tint = id === 10 ? seasonTint(seasonAt(f)) : null;
    for (const s of this.seasonMats) s.m.color.copy(s.base).multiply(tint ? tint[s.kind] : SEAS.summer[s.kind]);
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const inside = s.place === "office" || s.place === "lender";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 6;
    if (s.place === "stage") Rr = 12;
    if (id === 2 || id === 12) Rr = Math.max(Rr, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds (they race across during the time-lapse) ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = inside || s.place === "stage" ? 60 : L.fogNear; this.fog.far = inside || s.place === "stage" ? 400 : Math.max(L.fogFar, 520);
    scene.fog = this.fog; scene.background = null;
    const drift = t * 0.004 + (id === 10 ? 3 * clamp01((f - 1212) / 218) : 0);
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = m.userData.a + drift;
      m.position.set(Math.cos(a) * m.userData.d, m.userData.h, Math.sin(a) * m.userData.d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[s.light][i % 4];
    }
    this.poseProps(id, f);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e2.use(!!p.soft);
      e2.mesh.visible = true;
      e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      fused.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e3 of fused) e3.bind();
    void HOUSE; void HH; void quad;
    return focus;
  }
}
