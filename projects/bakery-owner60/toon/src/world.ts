// The world of "From empty shop to owner" as one three.js scene (Pisa engine): a high street of small shops (one
// empty "FOR LEASE" unit that becomes Rosa's Bakery, a second unit that becomes shop #2, four that close in the
// "about half close" beat); two insert sets far away (Rosa's 9-to-5 office with the BOSS's glass office; the
// explainer stage with a franchise shop + HQ tower, an own-idea shop, and the sales/costs/profit counter).
// update(id, f, camera) poses everything for shot `id` at frame f. Sky, light rig, clouds, character cards and the
// post chain are the bridge / Pisa engine's.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, lam, quad, Kit, prop, setSight } from "./build";
import { ctex, rep, stoneHD, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, BT, V3, add, SHOP_X, SHOP_W, SHOP_H, SHOP_D, SHOP_FRONT, ROSA_X, SHOP2_X, CLOSING_X, STALL,
  WALK_Z, ROAD_Z, OFFICE, STAGE, DESK, BOSS_DOOR, FR_SHOP, ID_SHOP, HQ, COUNTER, JARS, JAR_COINS, CUST, bakeryOpen, shop2Open, closedNow } from "./story";

// ---------------- assets ----------------
const KENNEY = ["tree_oak", "tree_default"];
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
const ANTON = "Anton, Impact, sans-serif";
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6f7a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024, size = 150) => ctex("board" + text + bg + fg + w + size, w, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, 256);
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, 228);
  g.fillStyle = fg; g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, 136);
});
/** glowing sign letters on a dark board */
const neonBoard = (text: string, fg: string, bg: string, w = 1024, size = 170) => ctex("neonB" + text + fg + bg, w, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, 256);
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = fg; g.shadowBlur = 30; g.fillStyle = fg; g.fillText(text, w / 2, 136); g.shadowBlur = 0; g.fillText(text, w / 2, 136);
});
/** a lit shop window: shelves of coloured goods */
const goodsTex = (k: number, cols: string[]) => ctex("goods" + k, 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff3d6"); gr.addColorStop(1, "#f0d6a8"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let s = 0; s < 3; s++) {
    const y = 140 + s * 140;
    g.fillStyle = "#8a5a3a"; g.fillRect(20, y, 472, 14);
    for (let i = 0; i < 7; i++) { g.fillStyle = cols[(i + s + k) % cols.length]; const h = 50 + r() * 50; g.fillRect(34 + i * 66, y - h, 48, h); }
  }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(140, 0); g.lineTo(40, 512); g.lineTo(-60, 512); g.fill();
});
/** the bakery window: loaves, croissants and cakes on warm shelves, OPEN sign */
const bakeryTex = (open: boolean) => ctex("bakeryWin" + open, 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff0c8"); gr.addColorStop(1, "#ffd28a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let s = 0; s < 3; s++) {
    const y = 170 + s * 130;
    g.fillStyle = "#8a5a3a"; g.fillRect(16, y, 480, 14);
    for (let i = 0; i < 5; i++) {
      const x = 60 + i * 96;
      if ((i + s) % 3 === 0) { g.fillStyle = "#d9893a"; g.beginPath(); g.ellipse(x, y - 26, 40, 24, 0, 0, 7); g.fill(); g.strokeStyle = "#9a5a22"; g.lineWidth = 6; for (const d of [-16, 0, 16]) { g.beginPath(); g.moveTo(x + d - 6, y - 40); g.lineTo(x + d + 6, y - 14); g.stroke(); } }
      else if ((i + s) % 3 === 1) { g.fillStyle = "#e8a84a"; g.beginPath(); g.moveTo(x - 40, y - 4); g.quadraticCurveTo(x, y - 70, x + 40, y - 4); g.fill(); }
      else { g.fillStyle = "#f6c0d0"; g.fillRect(x - 32, y - 52, 64, 52); g.fillStyle = "#ffffff"; g.fillRect(x - 32, y - 58, 64, 10); g.fillStyle = "#e23b4e"; g.beginPath(); g.arc(x, y - 66, 8, 0, 7); g.fill(); }
    }
  }
  if (open) { g.fillStyle = "#e23b4e"; g.beginPath(); g.roundRect(150, 22, 212, 84, 18); g.fill(); g.fillStyle = "#ffffff"; g.font = `64px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("OPEN", 256, 66); }
  g.fillStyle = "rgba(255,255,255,0.3)"; g.beginPath(); g.moveTo(40, 0); g.lineTo(140, 0); g.lineTo(40, 512); g.lineTo(-60, 512); g.fill();
});
/** an empty unit: brown paper on the glass and a FOR LEASE sign */
const paperTex = () => ctex("paperWin", 512, 512, (g, r) => {
  g.fillStyle = "#c8a67a"; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 60; k++) { g.strokeStyle = r() < 0.5 ? "rgba(120,85,50,0.25)" : "rgba(240,220,180,0.3)"; g.lineWidth = 2 + r() * 4; g.beginPath(); const x = r() * 512, y = r() * 512; g.moveTo(x, y); g.lineTo(x + 60 - r() * 120, y + 60 - r() * 120); g.stroke(); }
  g.fillStyle = "#fbf7ee"; g.fillRect(96, 170, 320, 170); g.strokeStyle = "#c0392b"; g.lineWidth = 12; g.strokeRect(96, 170, 320, 170);
  g.fillStyle = "#c0392b"; g.font = `92px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("FOR LEASE", 256, 258);
});
/** a shop that closed: dark glass, empty shelves, CLOSED sign */
const closedTex = () => ctex("closedWin", 512, 512, (g) => {
  g.fillStyle = "#30364a"; g.fillRect(0, 0, 512, 512);
  for (let s = 0; s < 3; s++) { g.fillStyle = "#454b60"; g.fillRect(20, 140 + s * 140, 472, 14); }
  g.fillStyle = "#fbf7ee"; g.fillRect(120, 200, 272, 120); g.strokeStyle = "#1d1d26"; g.lineWidth = 8; g.strokeRect(120, 200, 272, 120);
  g.strokeStyle = "#8a8f99"; g.lineWidth = 5; g.beginPath(); g.moveTo(150, 200); g.lineTo(256, 120); g.lineTo(362, 200); g.stroke();
  g.fillStyle = "#1d1d26"; g.font = `86px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CLOSED", 256, 264);
});
const stripeTex = (a: string, b: string) => ctex("stripe" + a + b, 256, 64, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 64); }
});
const upperWinTex = (wall: string, lit: boolean) => ctex("upper" + wall + lit, 128, 192, (g) => {
  g.fillStyle = "#f4efe6"; g.fillRect(0, 0, 128, 192);
  g.fillStyle = lit ? "#ffd98a" : "#5a7a9a"; g.fillRect(12, 12, 104, 168);
  g.fillStyle = wall; g.fillRect(12, 12, 30, 168); g.fillRect(86, 12, 30, 168);
  g.fillStyle = "#f4efe6"; g.fillRect(60, 12, 8, 168);
});
const windowsTex = (base: string, lit: string) => ctex("win" + base, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = r() < 0.45 ? lit : "#2b3348"; g.fillRect(i * 64 + 12, j * 64 + 14, 40, 38); }
});
const cityTex = () => ctex("cityView", 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#8fc4ef"); gr.addColorStop(1, "#d8ecf8"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 14; i++) { const w = 50 + r() * 60, h = 160 + r() * 280, x = i * 75 + r() * 20; g.fillStyle = ["#7a8fb0", "#6a7f9e", "#8aa0c0"][i % 3]; g.fillRect(x, 512 - h, w, h);
    g.fillStyle = "rgba(255,255,255,0.35)"; for (let y = 512 - h + 12; y < 500; y += 22) for (let xx = x + 8; xx < x + w - 10; xx += 16) g.fillRect(xx, y, 8, 10); }
  g.strokeStyle = "#e8edf2"; g.lineWidth = 16; for (const x of [256, 512, 768]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
});
const screenTex = () => ctex("sheet", 512, 320, (g) => {
  g.fillStyle = "#f4f8ff"; g.fillRect(0, 0, 512, 320); g.fillStyle = "#2f6fd6"; g.fillRect(0, 0, 512, 40);
  g.strokeStyle = "#c4d2e6"; g.lineWidth = 2; for (let y = 60; y < 320; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); } for (let x = 90; x < 512; x += 90) { g.beginPath(); g.moveTo(x, 40); g.lineTo(x, 320); g.stroke(); }
  g.fillStyle = "#2bb36b"; [80, 130, 110, 170, 150, 210].forEach((h, i) => g.fillRect(300 + i * 32, 300 - h, 22, h));
});
const carpetTex = () => ctex("offCarpet", 256, 256, (g, r) => {
  g.fillStyle = "#6f7f99"; g.fillRect(0, 0, 256, 256);
  for (let k = 0; k < 900; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,50,70,0.15)" : "rgba(220,230,240,0.12)"; g.fillRect(r() * 256, r() * 256, 2, 2); }
});
const coinTopTex = () => ctex("coinTop", 256, 256, (g) => {
  g.fillStyle = "#f2c33a"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#b8862a"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke();
  g.fillStyle = "#8a5a12"; g.font = `110px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$1", 128, 134);
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
/** unlit glowing material (HDR colour so the bloom picks it up) */
const glow = (col: string, k: number, map?: THREE.Texture, transparent = false) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), map: map ?? null, transparent, depthWrite: !transparent, fog: false, toneMapped: true });
/** a vertical plane facing +z, bottom-left (x0, y0) to top-right (x1, y1) at depth z */
const panel = (x0: number, y0: number, x1: number, y1: number, z: number, mat: THREE.Material, parent: THREE.Object3D, ink = true) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.receiveShadow = true; if (!ink) m.layers.set(NOINK); parent.add(m); return m;
};
/** a sloped striped awning in front of a shop front (z = front), x0..x1, from height y down to y - 0.5 over 1.4 m */
const awningGeo = (x0: number, x1: number, y: number, z: number, depth = 1.4, drop = 0.55) => {
  const g = new THREE.BufferGeometry();
  const p = [x0, y, z, x1, y, z, x1, y - drop, z + depth, x0, y - drop, z + depth,   // slope
    x0, y - drop, z + depth, x1, y - drop, z + depth, x1, y - drop - 0.3, z + depth, x0, y - drop - 0.3, z + depth]; // valance
  const w = (x1 - x0) / 2;
  const uv = [0, 1, w, 1, w, 0, 0, 0, 0, 1, w, 1, w, 0, 0, 0];
  g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]); g.computeVertexNormals();
  return g;
};

type ShopLook = { name: string; wall: string; trim: string; sign: string; awnA: string; awnB: string; goods: string[] };
const LOOKS: Record<number, ShopLook> = {
  [-32]: { name: "TOYS", wall: "#e8b04a", trim: "#7a4a1a", sign: "#2f6fd6", awnA: "#2f6fd6", awnB: "#ffffff", goods: ["#e23b4e", "#2f6fd6", "#ffd23f", "#2fa05a"] },
  [-24]: { name: "BOOKS", wall: "#5aa0a0", trim: "#1f4a4a", sign: "#1f4a4a", awnA: "#1f6a6a", awnB: "#f4efe6", goods: ["#8a1f33", "#1f4a8a", "#2f6a3a", "#d9a441"] },
  [-16]: { name: "FLOWERS", wall: "#f0a0b8", trim: "#7a2a4a", sign: "#c2457a", awnA: "#c2457a", awnB: "#ffffff", goods: ["#ff6a8a", "#ffd23f", "#b06ad0", "#3fa05a"] },
  [-8]: { name: "SHOES", wall: "#8aa0d8", trim: "#2a3a6a", sign: "#2a3a6a", awnA: "#2a3a6a", awnB: "#e8edf6", goods: ["#3a2a1e", "#c0392b", "#f4efe6", "#2f6fd6"] },
  [0]: { name: "", wall: "#f4d6c0", trim: "#5a4038", sign: "#3a3a44", awnA: "#e8608a", awnB: "#ffffff", goods: [] },
  [8]: { name: "CAFE", wall: "#c9a27a", trim: "#4a2a1a", sign: "#4a2a1a", awnA: "#2f6a3a", awnB: "#f4efe6", goods: ["#6b3a22", "#f4efe6", "#d9a441", "#2f6a3a"] },
  [16]: { name: "", wall: "#d8c8e8", trim: "#4a3a5a", sign: "#3a3a44", awnA: "#e8608a", awnB: "#ffffff", goods: [] },
  [24]: { name: "PIZZA", wall: "#e8c890", trim: "#8a2a1a", sign: "#c0392b", awnA: "#c0392b", awnB: "#ffffff", goods: ["#e8a84a", "#c0392b", "#2fa05a", "#f4efe6"] },
  [32]: { name: "GYM", wall: "#a0a8b8", trim: "#2a2a34", sign: "#e8742c", awnA: "#2a2a34", awnB: "#e8742c", goods: ["#2a2a34", "#e8742c", "#8a8f99", "#2f6fd6"] },
};
type ShopDyn = { x: number; win: THREE.Mesh[]; sign: THREE.Mesh; door: THREE.Mesh; awning: THREE.Mesh; upper: THREE.Mesh[] };

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
  private shops: ShopDyn[] = [];
  private mats: Record<string, THREE.Material> = {};
  private bulbs: THREE.InstancedMesh | null = null; private bulbN = 0;
  private ribbon!: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
  private bakeryLight!: THREE.PointLight; private shop2Light!: THREE.PointLight;
  private paths = new THREE.Group(); private money = new THREE.Group(); private stall = new THREE.Group();
  private coins: THREE.Mesh[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();
  private col = new THREE.Color();

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
    setSight([]);
    // window / sign materials swapped per frame
    this.mats.paper = new THREE.MeshLambertMaterial({ map: paperTex() });
    this.mats.closed = new THREE.MeshLambertMaterial({ map: closedTex() });
    this.mats.bakery = glow("#ffffff", 1.35, bakeryTex(true));
    this.mats.bakeryNo = glow("#ffffff", 1.25, bakeryTex(false));
    this.mats.blankSign = new THREE.MeshLambertMaterial({ color: "#3a3a44" });
    this.mats.deadSign = new THREE.MeshLambertMaterial({ color: "#55555e" });
    this.mats.rosaSign = glow("#ffffff", 1.6, neonBoard("ROSA'S BAKERY", "#ffd2e0", "#5a1f3a", 1024, 150));
    this.mats.rosa2Sign = glow("#ffffff", 1.6, neonBoard("ROSA'S BAKERY #2", "#ffd2e0", "#5a1f3a", 1024, 132));
    this.mats.doorDark = new THREE.MeshLambertMaterial({ color: "#3a3f4e" });
    this.mats.doorLit = glow("#ffd98a", 1.3);
    this.mats.upperDark = new THREE.MeshLambertMaterial({ map: upperWinTex("#c0392b", false) });
    this.mats.upperLit = glow("#ffffff", 1.15, upperWinTex("#c0392b", true));
    this.street(R, kit);
    this.office(R);
    this.stageSet(R);
  }

  // =============== the high street ===============
  private street(R: THREE.Object3D, kit: Kit) {
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const white = lam("roadLine", () => ({ color: "#f4f1e6" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-300, 300, -30, ROAD_Z - 3.5, 0.01, 150, 18), path);                 // sidewalk / plaza in front of the shops
    b.add(flat(-300, 300, ROAD_Z - 3.5, ROAD_Z + 3.5, 0.012, 60, 1), asph);
    b.add(flat(-300, 300, ROAD_Z + 3.5, ROAD_Z + 7.5, 0.02, 120, 2), path);
    for (let x = -300; x < 300; x += 6) b.add(flat(x, x + 3, ROAD_Z - 0.09, ROAD_Z + 0.09, 0.016, 1, 1), white);
    box(b, curb, -300, 0, ROAD_Z - 3.62, 300, 0.14, ROAD_Z - 3.45); box(b, curb, -300, 0, ROAD_Z + 3.45, 300, 0.14, ROAD_Z + 3.62);
    // ---- the shops ----
    const F = SHOP_FRONT;
    for (const x of SHOP_X) {
      const L = LOOKS[x], hw = SHOP_W / 2;
      const wall = lam("wall" + x, () => ({ color: L.wall })), trim = lam("trim" + x, () => ({ color: L.trim })), cream = lam("cream", () => ({ color: "#f4efe6" }));
      box(b, wall, x - hw, 0, -SHOP_D / 2, x + hw, SHOP_H, F);
      box(b, cream, x - hw - 0.15, SHOP_H, -SHOP_D / 2 - 0.15, x + hw + 0.15, SHOP_H + 0.45, F + 0.3);              // cornice
      box(b, trim, x - hw, 0, F, x + hw, 3.1, F + 0.1);                                                                 // shop-front frame
      box(b, cream, x - hw, 3.1, F, x + hw, 3.25, F + 0.18);
      for (const s of [-1, 1]) box(b, cream, x + s * hw - 0.25, 0, F, x + s * hw + 0.25, SHOP_H, F + 0.2);          // pilasters
      box(b, lam("stoop", () => ({ color: "#b8b2a6" })), x - 1.0, 0, F, x + 1.0, 0.12, F + 0.5);
      // dynamic faces
      const win = [panel(x - 3.2, 0.5, x - 0.95, 2.85, F + 0.11, this.mats.paper, R), panel(x + 0.95, 0.5, x + 3.2, 2.85, F + 0.11, this.mats.paper, R)];
      const door = panel(x - 0.75, 0.12, x + 0.75, 2.85, F + 0.11, this.mats.doorDark, R);
      const sign = panel(x - 3.0, 3.35, x + 3.0, 4.35, F + 0.21, this.mats.blankSign, R);
      if (L.name) { this.mats["sign" + x] = new THREE.MeshLambertMaterial({ map: boardTex(L.name, L.sign) }); this.mats["goods" + x] = glow("#ffffff", 1.0, goodsTex(x, L.goods)); }
      const awning = mesh(awningGeo(x - 3.3, x + 3.3, 3.1, F + 0.12), lam("awn" + x, () => ({ map: rep(stripeTex(L.awnA, L.awnB), 1, 1), side: THREE.DoubleSide })), R);
      const upper = [-2.3, 0, 2.3].map((dx) => panel(x + dx - 0.6, 4.9, x + dx + 0.6, 6.7, F + 0.01, this.mats.upperDark, R));
      this.shops.push({ x, win, sign, door, awning, upper });
    }
    // the ribbon across Rosa's door (cut at the reveal)
    this.ribbon = mesh(new THREE.BoxGeometry(2.4, 0.16, 0.03), lam("ribbon", () => ({ color: "#e3263a" })), R);
    this.ribbon.position.set(ROSA_X, 1.3, F + 0.6);
    // string lights under Rosa's sign (on after the reveal)
    const pts: V3[] = [];
    for (const x0 of [ROSA_X, SHOP2_X]) for (let i = 0; i <= 14; i++) { const u = i / 14, x = x0 - 3.3 + 6.6 * u; pts.push([x, 3.05 - 0.22 * Math.sin(u * Math.PI * 2) ** 2, F + 1.62]); }
    this.bulbN = pts.length;
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }), pts.length);
    pts.forEach((p, i) => { this.bulbs!.setMatrixAt(i, new THREE.Matrix4().makeTranslation(...p)); this.bulbs!.setColorAt(i, new THREE.Color(1, 1, 1)); });
    this.bulbs.layers.set(NOINK); this.bulbs.frustumCulled = false; R.add(this.bulbs);
    // ---- skyline behind the shops ----
    const facade = (x: number, z: number, w: number, d: number, h: number, mat: THREE.Material, top: THREE.Material) => {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, ru = w / 4, rd = d / 4, rv = h / 4;
      b.add(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, h, z1), V(x0, h, z1), ru, rv), mat);
      b.add(quad(V(x1, 0, z1), V(x1, 0, z0), V(x1, h, z0), V(x1, h, z1), rd, rv), mat);
      b.add(quad(V(x0, 0, z0), V(x0, 0, z1), V(x0, h, z1), V(x0, h, z0), rd, rv), mat);
      box(b, top, x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.8, z1 + 0.2);
    };
    const tw = lam("towerWin", () => ({ map: rep(windowsTex("#c9b8d8", "#ffe2a8"), 1, 1) }));
    const tw2 = lam("towerWin2", () => ({ map: rep(windowsTex("#9cc4d8", "#fff2c8"), 1, 1) }));
    const tw3 = lam("towerWin3", () => ({ map: rep(windowsTex("#e2b8a0", "#ffe2a8"), 1, 1) }));
    const top = lam("towerTop", () => ({ color: "#5a6272" }));
    [[-30, -16, 16, 22], [-10, -18, 14, 30], [8, -16, 16, 18], [26, -18, 14, 26], [44, -16, 14, 20], [-48, -16, 14, 24]].forEach(([x, z, w, h], i) =>
      facade(x, z, w, 10, h, [tw, tw2, tw3][i % 3], top));
    // street lamps along the curb and trees across the road
    const pole = lam("lampPole", () => ({ color: "#2a2f3a" }));
    for (let x = -36; x <= 36; x += 8) {
      const lx = x;
      b.add(cyl(0.08, 4.2, 10), pole, M4(lx, 0, ROAD_Z - 4.2));
      box(b, pole, lx - 0.06, 4.1, ROAD_Z - 4.6, lx + 0.06, 4.2, ROAD_Z - 4.2);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: "#fff2c8", fog: false }));
      lamp.position.set(lx, 3.95, ROAD_Z - 4.6); lamp.layers.set(NOINK); R.add(lamp); this.lamps.push(lamp);
    }
    for (let x = -40; x <= 40; x += 9) prop(b, kit, x % 2 ? "tree_oak" : "tree_default", x + 2, 0, ROAD_Z + 5.5, 5.5 + (Math.abs(x) % 3), x * 0.7);
    // planters by Rosa's door
    for (const s of [-1, 1]) box(b, lam("planter", () => ({ color: "#8a8f99" })), ROSA_X + s * 3.4 - 0.4, 0, F + 0.4, ROSA_X + s * 3.4 + 0.4, 0.6, F + 1.1);
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#9aa07a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);
    // the sidewalk test stall (shot 5): a small table, a checked cloth, two cake domes and a SAMPLES board
    const sb = new Batch(), [tx, , tz] = STALL;
    box(sb, lam("stallLeg", () => ({ color: "#6b4a2a" })), tx - 0.75, 0, tz - 0.35, tx + 0.75, 0.82, tz + 0.35);
    box(sb, lam("cloth", () => ({ map: rep(stripeTex("#e8608a", "#ffffff"), 2, 1) })), tx - 0.82, 0.82, tz - 0.4, tx + 0.82, 0.86, tz + 0.4);
    for (const dx of [-0.4, 0.4]) { sb.add(cyl(0.22, 0.05, 20), lam("plate", () => ({ color: "#f4efe6" })), M4(tx + dx, 0.86, tz)); sb.add(new THREE.SphereGeometry(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.91, 0), lam("cloche", () => ({ color: "#cfd6df" })), M4(tx + dx, 0, tz)); }
    sb.add(quad(V(tx - 0.6, 0.3, tz + 0.41), V(tx + 0.6, 0.3, tz + 0.41), V(tx + 0.6, 0.7, tz + 0.41), V(tx - 0.6, 0.7, tz + 0.41)), lam("samples", () => ({ map: boardTex("FREE SAMPLES", "#e8608a", "#ffffff", 1024, 120) })));
    sb.build(this.stall); R.add(this.stall);
    this.bakeryLight = new THREE.PointLight("#ffc880", 0, 10); this.bakeryLight.position.set(ROSA_X, 2.4, F + 2.2); R.add(this.bakeryLight);
    this.shop2Light = new THREE.PointLight("#ffc880", 0, 10); this.shop2Light.position.set(SHOP2_X, 2.4, F + 2.2); R.add(this.shop2Light);
  }

  // =============== Rosa's 9-to-5 ===============
  private office(R: THREE.Object3D) {
    const [OX, , OZ] = OFFICE, b = new Batch();
    const P = (x: number, y: number, z: number) => V(OX + x, y, OZ + z);
    b.add(quad(P(-10, 0, 9), P(10, 0, 9), P(10, 0, -4.4), P(-10, 0, -4.4), 10, 7), lam("offCarpet", () => ({ map: rep(carpetTex(), 1, 1) })));
    const wallM = lam("offWall", () => ({ color: "#dfe4ea" })), dark = lam("offDark", () => ({ color: "#3a4150" })), wood = lam("desk", () => ({ color: "#c9a27a" }));
    box(b, wallM, OX - 10, 0, OZ - 4.6, OX + 10, 4.6, OZ - 4.2);
    for (const s of [-1, 1]) box(b, wallM, OX + s * 10 - 0.2, 0, OZ - 4.6, OX + s * 10 + 0.2, 4.6, OZ + 9);
    b.add(quad(P(-7.5, 1.2, -4.18), P(1.8, 1.2, -4.18), P(1.8, 3.9, -4.18), P(-7.5, 3.9, -4.18)), lam("cityView", () => ({ map: cityTex() })));
    box(b, wallM, OX - 10, 4.5, OZ - 4.6, OX + 10, 4.7, OZ + 9);
    // desks: Rosa's (front) and two rows of co-workers
    const desk = (x: number, z: number) => {
      box(b, wood, OX + x - 1.1, 0.72, OZ + z - 0.42, OX + x + 1.1, 0.78, OZ + z + 0.42);
      for (const dx of [-1.0, 1.0]) box(b, dark, OX + x + dx - 0.04, 0, OZ + z - 0.38, OX + x + dx + 0.04, 0.72, OZ + z + 0.38);
      box(b, dark, OX + x - 0.55 - 0.32, 0.78, OZ + z - 0.12, OX + x - 0.55 + 0.32, 0.84, OZ + z + 0.06);           // monitor foot
      box(b, dark, OX + x - 0.55 - 0.03, 0.84, OZ + z - 0.06, OX + x - 0.55 + 0.03, 1.05, OZ + z);
      box(b, dark, OX + x - 0.55 - 0.42, 1.0, OZ + z - 0.1, OX + x - 0.55 + 0.42, 1.52, OZ + z - 0.04);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.46), glow("#ffffff", 1.1, screenTex())); scr.position.set(OX + x - 0.55, 1.26, OZ + z - 0.03); R.add(scr);
      box(b, lam("keys", () => ({ color: "#e8edf2" })), OX + x - 0.2, 0.78, OZ + z + 0.05, OX + x + 0.35, 0.8, OZ + z + 0.25);
      b.add(cyl(0.06, 0.14, 12), lam("mug", () => ({ color: "#e23b4e" })), M4(OX + x + 0.7, 0.78, OZ + z + 0.1));
    };
    desk(DESK[0], DESK[2]);
    for (const [x, z] of [[-3.4, -1.6], [-3.4, 1.2], [-6.8, -1.6], [-6.8, 1.2]]) desk(x, z);
    for (const [x, z] of [[-3.4, -1.6], [-3.4, 1.2], [-6.8, -1.6], [-6.8, 1.2]]) box(b, lam("cubicle", () => ({ color: "#8a9ab8" })), OX + x - 1.2, 0, OZ + z - 0.55, OX + x + 1.2, 1.25, OZ + z - 0.47);
    // the BOSS's glass office on the right
    const [BX, , BZ] = BOSS_DOOR;
    const frame = lam("glassFrame", () => ({ color: "#2a2f3a" }));
    box(b, wallM, OX + 2.6, 0, OZ - 4.4, OX + 2.8, 4.5, OZ + BZ);
    box(b, frame, OX + 2.6, 0, OZ + BZ - 0.06, OX + 8, 0.12, OZ + BZ + 0.06);
    box(b, frame, OX + 2.6, 2.6, OZ + BZ - 0.06, OX + 8, 2.72, OZ + BZ + 0.06);
    box(b, wallM, OX + 2.6, 2.72, OZ + BZ - 0.06, OX + 8, 4.5, OZ + BZ + 0.06);
    for (const x of [2.7, BX - 0.6, BX + 0.6, 6.4, 7.9]) box(b, frame, OX + x - 0.05, 0, OZ + BZ - 0.06, OX + x + 0.05, 2.6, OZ + BZ + 0.06);
    box(b, lam("bossDesk", () => ({ color: "#6b3a22" })), OX + 5.0, 0, OZ - 3.6, OX + 7.2, 0.85, OZ - 2.8);
    b.add(quad(P(BX - 0.55, 2.0, BZ + 0.07), P(BX + 0.55, 2.0, BZ + 0.07), P(BX + 0.55, 2.4, BZ + 0.07), P(BX - 0.55, 2.4, BZ + 0.07)), lam("bossPlate", () => ({ map: boardTex("BOSS", "#1f2433", "#ffd23f", 512, 150) })));
    // potted plants
    for (const [x, z] of [[-1.9, -3.6], [1.9, -3.6], [-9.2, 2]]) { b.add(cyl(0.3, 0.6, 16, 0.36), lam("pot", () => ({ color: "#c96a3a" })), M4(OX + x, 0, OZ + z)); b.add(new THREE.SphereGeometry(0.55, 14, 10).translate(0, 1.05, 0), lam("leaf", () => ({ color: "#4a9a4a" })), M4(OX + x, 0, OZ + z)); }
    b.build(R);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.3, 2.5), new THREE.MeshLambertMaterial({ color: "#bfe0ff", transparent: true, opacity: 0.22, depthWrite: false }));
    glass.position.set(OX + 5.3, 1.35, OZ + BZ); glass.layers.set(NOINK); R.add(glass);
    for (const x of [-3, 2]) { const l = new THREE.PointLight("#fff4e0", 5, 9); l.position.set(OX + x, 4.2, OZ + 1); R.add(l); }
  }

  // =============== the explainer stage ===============
  private stageSet(R: THREE.Object3D) {
    const [SX, , SZ] = STAGE, b = new Batch();
    const S = (p: V3): V3 => add(STAGE, p);
    b.add(cyl(9.5, 0.5, 72), lam("stageTop", () => ({ color: "#f2e2cc" })), M4(SX, -0.5, SZ));
    b.add(cyl(9.8, 0.2, 72), lam("stageRim", () => ({ color: "#e8608a" })), M4(SX, -0.5, SZ));
    b.build(R);
    // ---- shot 3: the two paths ----
    const pb = new Batch();
    const mini = (c: V3, wall: string, awA: string, awB: string, name: string, signBg: string, k: string) => {
      const [x, , z] = S(c);
      box(pb, lam("mw" + k, () => ({ color: wall })), x - 1.6, 0, z - 1.1, x + 1.6, 3.0, z + 1.1);
      box(pb, lam("cream", () => ({ color: "#f4efe6" })), x - 1.7, 3.0, z - 1.2, x + 1.7, 3.2, z + 1.25);
      pb.add(quad(V(x - 1.3, 0.3, z + 1.11), V(x - 0.35, 0.3, z + 1.11), V(x - 0.35, 1.7, z + 1.11), V(x - 1.3, 1.7, z + 1.11)), lam("mg" + k, () => ({ map: goodsTex(7 + k.length, ["#e8a84a", "#c0392b", "#2f6fd6", "#2fa05a"]) })));
      pb.add(quad(V(x + 0.35, 0.3, z + 1.11), V(x + 1.3, 0.3, z + 1.11), V(x + 1.3, 1.7, z + 1.11), V(x + 0.35, 1.7, z + 1.11)), lam("mg" + k, () => ({ map: goodsTex(7 + k.length, ["#e8a84a", "#c0392b", "#2f6fd6", "#2fa05a"]) })));
      box(pb, lam("mdoor", () => ({ color: "#3a3f4e" })), x - 0.3, 0, z + 1.1, x + 0.3, 1.8, z + 1.14);
      pb.add(quad(V(x - 1.5, 2.25, z + 1.13), V(x + 1.5, 2.25, z + 1.13), V(x + 1.5, 2.85, z + 1.13), V(x - 1.5, 2.85, z + 1.13)), lam("ms" + k, () => ({ map: boardTex(name, signBg, "#ffffff", 1024, 140) })));
      pb.add(awningGeo(x - 1.6, x + 1.6, 2.15, z + 1.12, 0.8, 0.35), lam("ma" + k, () => ({ map: rep(stripeTex(awA, awB), 1, 1), side: THREE.DoubleSide })));
    };
    mini(FR_SHOP, "#f6c04a", "#c0392b", "#ffd23f", "FRANCHISE", "#c0392b", "fr");
    mini(ID_SHOP, "#9ad0a8", "#2f6a3a", "#f4efe6", "YOUR IDEA", "#2f6a3a", "idea");
    const [hx, , hz] = S(HQ);
    pb.add(UB, lam("hqWin", () => ({ map: rep(windowsTex("#c0392b", "#ffe2a8"), 1, 2) })), M4(hx, 4.5, hz, 3.2, 9, 3.2));
    box(pb, lam("hqTop", () => ({ color: "#5a1414" })), hx - 1.8, 9, hz - 1.8, hx + 1.8, 9.5, hz + 1.8);
    pb.add(quad(V(hx - 1.5, 9.6, hz + 1.0), V(hx + 1.5, 9.6, hz + 1.0), V(hx + 1.5, 10.9, hz + 1.0), V(hx - 1.5, 10.9, hz + 1.0)), lam("hqSign", () => ({ map: boardTex("HQ", "#c0392b", "#ffd23f", 512, 170) })));
    pb.build(this.paths);
    R.add(this.paths);
    // ---- shot 4: the counter, the shelf of cost jars, the coins ----
    const mb = new Batch();
    const [cx, , cz] = S(COUNTER);
    const wood = lam("counter", () => ({ color: "#c98a5a" })), top = lam("counterTop", () => ({ color: "#f4efe6" }));
    box(mb, wood, cx - 1.6, 0, cz - 0.45, cx + 1.6, 1.0, cz + 0.45);
    box(mb, top, cx - 1.7, 1.0, cz - 0.52, cx + 1.7, 1.06, cz + 0.52);
    box(mb, lam("register", () => ({ color: "#3a4150" })), cx + 0.7, 1.06, cz - 0.3, cx + 1.4, 1.4, cz + 0.2);
    box(mb, lam("regScr", () => ({ color: "#2bd96b" })), cx + 0.8, 1.42, cz - 0.25, cx + 1.3, 1.62, cz - 0.2);
    const [j0x, , j0z] = S(JARS[0]);
    box(mb, wood, cx - 2.5, 1.18, j0z - 0.35, cx + 2.5, 1.3, j0z + 0.35);
    for (const dx of [-2.4, 2.4]) box(mb, wood, cx + dx - 0.06, 0, j0z - 0.3, cx + dx + 0.06, 1.18, j0z + 0.3);
    void j0x;
    JARS.forEach((j, i) => {
      const [x, y, z] = S(j);
      mb.add(quad(V(x - 0.7, 0.86, z + 0.37), V(x + 0.7, 0.86, z + 0.37), V(x + 0.7, 1.18, z + 0.37), V(x - 0.7, 1.18, z + 0.37)), lam("jarL" + i, () => ({ map: boardTex(["SUPPLIES", "RENT", "STAFF"][i], ["#2f6fd6", "#c0392b", "#7b4fd0"][i], "#ffffff", 1024, 170) })));
      mb.add(cyl(0.12, 0.04, 20), lam("jarLid", () => ({ color: "#8a8f99" })), M4(x, y + 0.92, z, 4.2, 1, 4.2));
    });
    const cust = S(CUST);
    void cust;
    mb.build(this.money);
    JARS.forEach((j) => {
      const [x, y, z] = S(j);
      const jar = new THREE.Mesh(cyl(0.48, 0.92, 32), new THREE.MeshLambertMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.35, depthWrite: false }));
      jar.position.set(x, y, z); jar.layers.set(NOINK); this.money.add(jar);
    });
    const coinMat = [twoTone(new THREE.MeshLambertMaterial({ color: "#d9a92a" })), twoTone(new THREE.MeshLambertMaterial({ map: coinTopTex() })), twoTone(new THREE.MeshLambertMaterial({ map: coinTopTex() }))];
    const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 28);
    for (let k = 0; k < 10; k++) { const c = mesh(coinGeo, coinMat, this.money); c.visible = false; this.coins.push(c); }
    R.add(this.money);
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
    const t = f / FPS, s = SHOTS[id - 1], golden = s.light === "golden";
    // ---- shop fronts ----
    const open = bakeryOpen(id, f), open2 = shop2Open(id, f);
    for (const sh of this.shops) {
      const k = CLOSING_X.indexOf(sh.x);
      const closed = k >= 0 && closedNow(id, f - (id === 5 ? k * 10 : 0));
      let win: THREE.Material, sign: THREE.Material, door: THREE.Material = this.mats.doorDark, awn = true;
      if (sh.x === ROSA_X) { win = open ? this.mats.bakery : this.mats.paper; sign = open ? this.mats.rosaSign : this.mats.blankSign; door = open ? this.mats.doorLit : this.mats.doorDark; awn = open; }
      else if (sh.x === SHOP2_X) { win = open2 ? this.mats.bakeryNo : this.mats.paper; sign = open2 ? this.mats.rosa2Sign : this.mats.blankSign; door = open2 ? this.mats.doorLit : this.mats.doorDark; awn = open2; }
      else if (closed) { win = this.mats.closed; sign = this.mats.deadSign; awn = false; }
      else { win = this.mats["goods" + sh.x]; sign = this.mats["sign" + sh.x]; }
      sh.win.forEach((w) => (w.material = win));
      sh.sign.material = sign; sh.door.material = door; sh.awning.visible = awn;
      sh.upper.forEach((u, i) => (u.material = golden && !closed && (i + Math.abs(sh.x)) % 3 !== 1 ? this.mats.upperLit : this.mats.upperDark));
    }
    this.ribbon.visible = id === 6 && f < BT.bakery;
    this.stall.visible = id === 5;
    this.bakeryLight.intensity = open && golden ? 9 : 0;
    this.shop2Light.intensity = open2 && golden ? 9 : 0;
    for (const l of this.lamps) (l.material as THREE.MeshBasicMaterial).color.setRGB(golden ? 3.0 : 1.0, golden ? 2.6 : 0.97, golden ? 1.7 : 0.85);
    if (this.bulbs) {
      for (let i = 0; i < this.bulbN; i++) {
        const mine = i < this.bulbN / 2 ? open : open2, tw = 0.75 + 0.25 * Math.sin(t * 6 + i * 1.7);
        this.col.setRGB(mine ? 3.0 * tw : 0.25, mine ? 2.3 * tw : 0.25, mine ? 1.2 * tw : 0.28);
        this.bulbs.setColorAt(i, this.col);
      }
      this.bulbs.instanceColor!.needsUpdate = true;
      this.bulbs.visible = s.place === "street" && (open || open2);
    }
    // ---- stage groups ----
    this.paths.visible = id === 3;
    this.money.visible = id === 4;
    // ---- coins: customer -> counter (the $10 sale), 9 of them -> the cost jars, 1 stays: profit ----
    if (id === 4) {
      const C = add(STAGE, COUNTER), CU = add(STAGE, CUST);
      const hand: V3 = [CU[0] + 0.35, 1.25, CU[2] - 0.1];
      const slot = (k: number): V3 => [C[0] - 0.55 + (k % 2) * 0.46, 1.09 + Math.floor(k / 2) * 0.065, C[2] + 0.05];
      const arcP = (a: V3, b2: V3, h: number, u: number): V3 => { const e = smooth(u); return [a[0] + (b2[0] - a[0]) * e, a[1] + (b2[1] - a[1]) * e + h * 4 * e * (1 - e), a[2] + (b2[2] - a[2]) * e]; };
      let jar = 0, inJar = 0;
      this.coins.forEach((c, k) => {
        const s0 = BT.sales - 4 + k * 2.2;
        c.visible = f >= s0;
        if (!c.visible) return;
        let p: V3 = arcP(hand, slot(k), 1.0, clamp01((f - s0) / 12)), spin = clamp01((f - s0) / 12) * Math.PI * 2;
        if (k < 9) {
          // which jar does coin k go to? SUPPLIES 4, RENT 2, STAFF 3 (from the top of the stack down)
          const order = 8 - k;
          let acc = 0; jar = 0; for (let j = 0; j < 3; j++) { if (order < acc + JAR_COINS[j]) { jar = j; inJar = order - acc; break; } acc += JAR_COINS[j]; }
          const c0 = BT.costs + order * 3.2;
          const J = add(STAGE, JARS[jar]), dst: V3 = [J[0] + ((inJar % 2) - 0.5) * 0.16, J[1] + 0.06 + inJar * 0.065, J[2]];
          if (f >= c0) { const u = clamp01((f - c0) / 14); p = arcP(slot(k), dst, 1.1, u); spin = u * Math.PI * 2; }
        } else if (f >= BT.profit && f < BT.profit + 24) p = [p[0], p[1] + 0.35 * Math.abs(Math.sin(((f - BT.profit) / 24) * Math.PI * 2)), p[2]];
        c.position.set(...p); c.rotation.set(spin, 0, 0);
      });
    } else this.coins.forEach((c) => (c.visible = false));
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
    const inside = s.place === "office";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 11;
    if (s.place === "stage") Rr = 13;
    if (id === 5 && f < BT.small - 8) Rr = Math.max(Rr, 60);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = inside || s.place === "stage" ? 60 : L.fogNear; this.fog.far = inside || s.place === "stage" ? 400 : Math.max(L.fogFar, 520);
    scene.fog = this.fog; scene.background = null;
    const drift = t * 0.004;
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
    return focus;
  }
}
