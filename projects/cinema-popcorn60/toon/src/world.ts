// The world of "Why theaters lose money on the movie" as one three.js scene (Pisa engine): a street with a big old
// cinema (marquee with chasing bulbs, neon CINEMA sign, poster cases, glass doors) between small shops; the lobby
// (patterned carpet, posters, a velvet-rope queue, NO OUTSIDE FOOD stand, and the snack counter hidden behind a red
// curtain that opens on the reveal); and the explainer stage where a $15 ticket is split into cost jars.
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
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, BT, V3, add, SHOP_X, SHOP_W, SHOP_H, SHOP_D, SHOP_FRONT, CINEMA_X, CINEMA_W, CINEMA_H,
  ROAD_Z, LOBBY, STAGE, COUNTER_L, CURTAIN_Z, CURTAIN_HW, CURTAIN_H, POPPER, SODA, NOFOOD, COUNTER, JARS, JAR_COINS, COIN_N, CUST, curtainOpen } from "./story";

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
const neonBoard = (text: string, fg: string, bg: string, w = 1024, size = 170, h = 256) => ctex("neonB" + text + fg + bg + h, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = fg; g.shadowBlur = 30; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 8); g.shadowBlur = 0; g.fillText(text, w / 2, h / 2 + 8);
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
/** made-up movie posters */
const POSTERS: [string, string, string, string][] = [
  ["SPACE", "PUPS 3", "#1b1f5a", "#ffd23f"], ["MONSTER", "MALL", "#2f7a46", "#ff7aa8"], ["LOVE &", "LASERS", "#7a1f4a", "#3fd8ff"],
  ["ROBO", "RANCH", "#8a4a12", "#ffe680"], ["THE BIG", "HEIST", "#1e1e26", "#ff4057"], ["DINO", "DETECTIVE", "#2a5a8a", "#ffd23f"],
];
const posterTex = (k: number) => ctex("poster" + k, 256, 384, (g, r) => {
  const [a, b2, bg, fg] = POSTERS[k % POSTERS.length];
  const gr = g.createLinearGradient(0, 0, 0, 384); gr.addColorStop(0, bg); gr.addColorStop(1, "#0c0c14"); g.fillStyle = gr; g.fillRect(0, 0, 256, 384);
  for (let i = 0; i < 30; i++) { g.fillStyle = "rgba(255,255,255,0.5)"; g.fillRect(r() * 256, r() * 200, 2, 2); }
  g.fillStyle = fg; g.globalAlpha = 0.85;
  if (k % 3 === 0) { g.beginPath(); g.arc(128, 160, 62, 0, 7); g.fill(); }
  else if (k % 3 === 1) { g.beginPath(); g.moveTo(128, 80); g.lineTo(200, 240); g.lineTo(56, 240); g.closePath(); g.fill(); }
  else { g.fillRect(70, 100, 116, 130); }
  g.globalAlpha = 1;
  g.fillStyle = "#ffffff"; g.font = `52px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(a, 128, 282); g.fillStyle = fg; g.fillText(b2, 128, 336);
  g.strokeStyle = "#f2c33a"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 374);
});
const marqueeTex = () => ctex("marquee", 1024, 256, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#c0392b"; g.font = `64px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NOW SHOWING", 512, 56);
  g.fillStyle = "#1e1e26"; g.font = `92px ${ANTON}`; g.fillText("SPACE PUPS 3 · ROBO RANCH", 512, 168);
});
const lobbyCarpetTex = () => ctex("lobbyCarpet", 512, 512, (g) => {
  g.fillStyle = "#8a1f33"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#d9a441"; g.lineWidth = 8;
  for (let i = -1; i < 3; i++) for (let j = -1; j < 3; j++) { const x = i * 256 + 128, y = j * 256 + 128; g.beginPath(); g.moveTo(x, y - 110); g.lineTo(x + 110, y); g.lineTo(x, y + 110); g.lineTo(x - 110, y); g.closePath(); g.stroke(); }
  g.fillStyle = "#3a1a6a"; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(i * 256 + 128, j * 256 + 128, 24, 0, 7); g.fill(); }
});
const velvetTex = () => ctex("velvet", 512, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#c8182e"); gr.addColorStop(1, "#8a0f20"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  g.fillStyle = "#d9a441"; g.fillRect(0, 478, 512, 34);
  for (let x = 0; x < 512; x += 16) { g.fillStyle = "#f2c33a"; g.fillRect(x + 4, 470, 6, 42); }
});
const candyTex = () => ctex("candyCase", 1024, 256, (g, r) => {
  g.fillStyle = "#2a1a2a"; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "#fff3d6"; g.fillRect(20, 20, 984, 216);
  const cols = ["#e23b4e", "#2f6fd6", "#ffd23f", "#2fa05a", "#b06ad0", "#e8742c"];
  for (let s = 0; s < 2; s++) for (let i = 0; i < 16; i++) { g.fillStyle = cols[(i + s * 3) % 6]; g.fillRect(40 + i * 60, 50 + s * 96, 46, 64 + r() * 10); }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(100, 20); g.lineTo(200, 20); g.lineTo(140, 236); g.lineTo(40, 236); g.fill();
});
const popTex = () => ctex("popcornGlass", 512, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff6d0"); gr.addColorStop(1, "#ffd76a"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 420; k++) {
    const y = 160 + r() * 352, x = r() * 512, s = 10 + r() * 12;
    g.fillStyle = r() < 0.7 ? "#fffbe8" : "#ffe08a"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
    g.strokeStyle = "rgba(200,140,40,0.5)"; g.lineWidth = 2; g.stroke();
  }
  g.fillStyle = "rgba(255,255,255,0.4)"; g.fillRect(30, 0, 40, 512);
});
const menuTex = () => ctex("menuBoard", 1024, 384, (g) => {
  g.fillStyle = "#1e1e26"; g.fillRect(0, 0, 1024, 384);
  g.strokeStyle = "#f2c33a"; g.lineWidth = 10; g.strokeRect(10, 10, 1004, 364);
  g.font = `88px ${ANTON}`; g.textBaseline = "middle"; g.shadowColor = "#ffd23f"; g.shadowBlur = 18;
  [["POPCORN", "$9"], ["SODA", "$7"], ["CANDY", "$6"]].forEach(([a, p], i) => {
    g.fillStyle = "#ffe680"; g.textAlign = "left"; g.fillText(a, 70, 80 + i * 112); g.fillStyle = "#3fd8ff"; g.textAlign = "right"; g.fillText(p, 954, 80 + i * 112);
  });
});
const noFoodTex = () => ctex("noFood", 512, 512, (g) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#1e1e26"; g.lineWidth = 12; g.strokeRect(6, 6, 500, 500);
  g.fillStyle = "#e9a447"; g.beginPath(); g.ellipse(256, 190, 90, 50, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#6b3a22"; g.fillRect(166, 196, 180, 26); g.fillStyle = "#5cbf4a"; g.fillRect(170, 186, 172, 12); g.fillStyle = "#e9a447"; g.fillRect(170, 224, 172, 30);
  g.strokeStyle = "#e3263a"; g.lineWidth = 26; g.beginPath(); g.arc(256, 200, 128, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(166, 110); g.lineTo(346, 290); g.stroke();
  g.fillStyle = "#e3263a"; g.font = `78px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NO OUTSIDE", 256, 384); g.fillText("FOOD", 256, 460);
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
const coinTopTex = () => ctex("coinTop", 256, 256, (g) => {
  g.fillStyle = "#f2c33a"; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.strokeStyle = "#b8862a"; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 100, 0, 7); g.stroke();
  g.fillStyle = "#8a5a12"; g.font = `110px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$1", 128, 134);
});
const doorGlassTex = () => ctex("doorGlass", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#ffe6a8"); gr.addColorStop(1, "#ffb86a"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#b8862a"; g.fillRect(0, 0, 256, 18); g.fillRect(0, 494, 256, 18); g.fillRect(0, 0, 18, 512); g.fillRect(238, 0, 18, 512);
  g.fillRect(196, 220, 16, 90);
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(40, 18); g.lineTo(110, 18); g.lineTo(40, 300); g.lineTo(18, 300); g.fill();
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
/** a pleated curtain half: width w, height h, folds along x; the pivot (x = 0) is its OUTER edge, it spans toward +x */
const pleatGeo = (w: number, h: number, folds: number) => {
  const g = new THREE.PlaneGeometry(w, h, folds * 8, 1);
  g.translate(w / 2, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, 0.13 * Math.sin((p.getX(i) / w) * folds * Math.PI * 2));
  g.computeVertexNormals();
  return g;
};

type ShopLook = { name: string; wall: string; trim: string; sign: string; awnA: string; awnB: string; goods: string[] };
const LOOKS: Record<number, ShopLook> = {
  [-35]: { name: "TOYS", wall: "#e8b04a", trim: "#7a4a1a", sign: "#2f6fd6", awnA: "#2f6fd6", awnB: "#ffffff", goods: ["#e23b4e", "#2f6fd6", "#ffd23f", "#2fa05a"] },
  [-27]: { name: "BOOKS", wall: "#5aa0a0", trim: "#1f4a4a", sign: "#1f4a4a", awnA: "#1f6a6a", awnB: "#f4efe6", goods: ["#8a1f33", "#1f4a8a", "#2f6a3a", "#d9a441"] },
  [-19]: { name: "FLOWERS", wall: "#f0a0b8", trim: "#7a2a4a", sign: "#c2457a", awnA: "#c2457a", awnB: "#ffffff", goods: ["#ff6a8a", "#ffd23f", "#b06ad0", "#3fa05a"] },
  [-11]: { name: "PIZZA", wall: "#e8c890", trim: "#8a2a1a", sign: "#c0392b", awnA: "#c0392b", awnB: "#ffffff", goods: ["#e8a84a", "#c0392b", "#2fa05a", "#f4efe6"] },
  [11]: { name: "CAFE", wall: "#c9a27a", trim: "#4a2a1a", sign: "#4a2a1a", awnA: "#2f6a3a", awnB: "#f4efe6", goods: ["#6b3a22", "#f4efe6", "#d9a441", "#2f6a3a"] },
  [19]: { name: "SHOES", wall: "#8aa0d8", trim: "#2a3a6a", sign: "#2a3a6a", awnA: "#2a3a6a", awnB: "#e8edf6", goods: ["#3a2a1e", "#c0392b", "#f4efe6", "#2f6fd6"] },
  [27]: { name: "ARCADE", wall: "#b0a0d8", trim: "#3a2a6a", sign: "#7b4fd0", awnA: "#7b4fd0", awnB: "#ffd23f", goods: ["#7b4fd0", "#3fd8ff", "#ffd23f", "#e23b4e"] },
  [35]: { name: "GYM", wall: "#a0a8b8", trim: "#2a2a34", sign: "#e8742c", awnA: "#2a2a34", awnB: "#e8742c", goods: ["#2a2a34", "#e8742c", "#8a8f99", "#2f6fd6"] },
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
  private upper: THREE.Mesh[] = [];
  private mats: Record<string, THREE.Material> = {};
  private bulbs: THREE.InstancedMesh | null = null; private bulbN = 0; private bulbU: number[] = [];
  private lamps: THREE.Mesh[] = [];
  private curtain: THREE.Mesh[] = [];
  private popGlow!: THREE.MeshBasicMaterial; private counterLight!: THREE.PointLight; private menu!: THREE.Mesh;
  private money = new THREE.Group();
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
    this.mats.upperDark = new THREE.MeshLambertMaterial({ map: upperWinTex("#c0392b", false) });
    this.mats.upperLit = glow("#ffffff", 1.15, upperWinTex("#c0392b", true));
    this.street(R, kit);
    this.lobby(R);
    this.stageSet(R);
  }

  // =============== the street and the cinema ===============
  private street(R: THREE.Object3D, kit: Kit) {
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const white = lam("roadLine", () => ({ color: "#f4f1e6" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-300, 300, -30, ROAD_Z - 3.5, 0.01, 150, 18), path);
    b.add(flat(-300, 300, ROAD_Z - 3.5, ROAD_Z + 3.5, 0.012, 60, 1), asph);
    b.add(flat(-300, 300, ROAD_Z + 3.5, ROAD_Z + 7.5, 0.02, 120, 2), path);
    for (let x = -300; x < 300; x += 6) b.add(flat(x, x + 3, ROAD_Z - 0.09, ROAD_Z + 0.09, 0.016, 1, 1), white);
    box(b, curb, -300, 0, ROAD_Z - 3.62, 300, 0.14, ROAD_Z - 3.45); box(b, curb, -300, 0, ROAD_Z + 3.45, 300, 0.14, ROAD_Z + 3.62);
    const F = SHOP_FRONT, cream = lam("cream", () => ({ color: "#f4efe6" }));
    // ---- the small shops ----
    for (const x of SHOP_X) {
      const L = LOOKS[x], hw = SHOP_W / 2;
      const wall = lam("wall" + x, () => ({ color: L.wall })), trim = lam("trim" + x, () => ({ color: L.trim }));
      box(b, wall, x - hw, 0, -SHOP_D / 2, x + hw, SHOP_H, F);
      box(b, cream, x - hw - 0.15, SHOP_H, -SHOP_D / 2 - 0.15, x + hw + 0.15, SHOP_H + 0.45, F + 0.3);
      box(b, trim, x - hw, 0, F, x + hw, 3.1, F + 0.1);
      box(b, cream, x - hw, 3.1, F, x + hw, 3.25, F + 0.18);
      for (const s of [-1, 1]) box(b, cream, x + s * hw - 0.25, 0, F, x + s * hw + 0.25, SHOP_H, F + 0.2);
      box(b, lam("stoop", () => ({ color: "#b8b2a6" })), x - 1.0, 0, F, x + 1.0, 0.12, F + 0.5);
      const gm = glow("#ffffff", 1.0, goodsTex(x, L.goods));
      panel(x - 3.2, 0.5, x - 0.95, 2.85, F + 0.11, gm, R); panel(x + 0.95, 0.5, x + 3.2, 2.85, F + 0.11, gm, R);
      panel(x - 0.75, 0.12, x + 0.75, 2.85, F + 0.11, lam("doorDark", () => ({ color: "#3a3f4e" })), R);
      panel(x - 3.0, 3.35, x + 3.0, 4.35, F + 0.21, new THREE.MeshLambertMaterial({ map: boardTex(L.name, L.sign) }), R);
      mesh(awningGeo(x - 3.3, x + 3.3, 3.1, F + 0.12), lam("awn" + x, () => ({ map: rep(stripeTex(L.awnA, L.awnB), 1, 1), side: THREE.DoubleSide })), R);
      for (const dx of [-2.3, 0, 2.3]) this.upper.push(panel(x + dx - 0.6, 4.9, x + dx + 0.6, 6.7, F + 0.01, this.mats.upperDark, R));
    }
    // ---- the cinema ----
    const cx = CINEMA_X, hw = CINEMA_W / 2, H = CINEMA_H;
    const red = lam("cinemaWall", () => ({ color: "#9a2a3a" })), dk = lam("cinemaTrim", () => ({ color: "#2a1a2a" })), gold = lam("gold", () => ({ color: "#d9a441" }));
    box(b, red, cx - hw, 0, -SHOP_D / 2, cx + hw, H, F);
    box(b, cream, cx - hw - 0.2, H, -SHOP_D / 2 - 0.2, cx + hw + 0.2, H + 0.5, F + 0.35);
    box(b, gold, cx - hw - 0.1, H - 0.4, F, cx + hw + 0.1, H - 0.25, F + 0.25);
    for (const s of [-1, 1]) box(b, cream, cx + s * hw - 0.3, 0, F, cx + s * hw + 0.3, H, F + 0.25);
    box(b, dk, cx - hw + 0.3, 0, F, cx + hw - 0.3, 3.3, F + 0.08);
    box(b, lam("stoop", () => ({ color: "#b8b2a6" })), cx - 3.0, 0, F, cx + 3.0, 0.12, F + 0.7);
    // glass doors (warm lobby light) and poster cases
    const dg = glow("#ffffff", 1.25, doorGlassTex());
    for (let i = 0; i < 4; i++) panel(cx - 2.4 + i * 1.2 + 0.05, 0.12, cx - 2.4 + (i + 1) * 1.2 - 0.05, 2.75, F + 0.1, dg, R);
    [-5.7, -4.3, 4.3, 5.7].forEach((px, i) => {
      box(b, gold, cx + px - 0.66, 0.5, F + 0.08, cx + px + 0.66, 3.0, F + 0.14);
      panel(cx + px - 0.56, 0.6, cx + px + 0.56, 2.9, F + 0.15, glow("#ffffff", 1.15, posterTex(i)), R);
    });
    // the marquee: a lit letter board projecting over the doors, bulbs along its edges
    const mz0 = F, mz1 = F + 2.0, my0 = 3.45, my1 = 4.95, mx = 5.6;
    box(b, dk, cx - mx, my0, mz0, cx + mx, my1, mz1);
    box(b, gold, cx - mx - 0.05, my1, mz0, cx + mx + 0.05, my1 + 0.12, mz1 + 0.05);
    const mq = new THREE.Mesh(new THREE.PlaneGeometry(2 * mx - 0.6, my1 - my0 - 0.4), glow("#ffffff", 1.25, marqueeTex()));
    mq.position.set(cx, (my0 + my1) / 2, mz1 + 0.01); R.add(mq);
    for (const s of [-1, 1]) { const sm = new THREE.Mesh(new THREE.PlaneGeometry(mz1 - mz0 - 0.4, my1 - my0 - 0.4), glow("#ffffff", 1.1, marqueeTex())); sm.rotation.y = s * Math.PI / 2; sm.position.set(cx + s * (mx + 0.01), (my0 + my1) / 2, (mz0 + mz1) / 2); R.add(sm); }
    // the CINEMA sign across the upper facade, with a bulb frame
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 2.7), glow("#ffffff", 1.6, neonBoard("CINEMA", "#ffe680", "#3a0f1a", 1024, 230, 300)));
    sg.position.set(cx, 7.1, F + 0.12); R.add(sg);
    box(b, gold, cx - 4.8, 5.62, F, cx + 4.8, 5.72, F + 0.14); box(b, gold, cx - 4.8, 8.48, F, cx + 4.8, 8.58, F + 0.14);
    const pts: [number, number, number, number][] = [];   // x, y, z, chase index
    const row = (x0: number, x1: number, y: number, z: number, n: number) => { for (let i = 0; i <= n; i++) pts.push([x0 + (x1 - x0) * (i / n), y, z, pts.length]); };
    row(cx - mx, cx + mx, my0 - 0.02, mz1 + 0.06, 28); row(cx - mx, cx + mx, my1 + 0.02, mz1 + 0.06, 28);
    row(cx - 4.7, cx + 4.7, 5.67, F + 0.22, 22); row(cx - 4.7, cx + 4.7, 8.53, F + 0.22, 22);
    for (let i = 1; i < 7; i++) { pts.push([cx - 4.7, 5.67 + i * 0.41, F + 0.22, pts.length]); pts.push([cx + 4.7, 5.67 + i * 0.41, F + 0.22, pts.length]); }
    this.bulbN = pts.length;
    this.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }), pts.length);
    pts.forEach(([x, y, z], i) => { this.bulbs!.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, y, z)); this.bulbs!.setColorAt(i, new THREE.Color(1, 1, 1)); this.bulbU.push(i); });
    this.bulbs.layers.set(NOINK); this.bulbs.frustumCulled = false; R.add(this.bulbs);
    const ml = new THREE.PointLight("#ffd29a", 10, 9); ml.position.set(cx, 3.0, F + 2.6); R.add(ml);
    // ---- skyline behind ----
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
    [[-30, -16, 16, 22], [-12, -18, 14, 30], [12, -18, 16, 26], [28, -16, 14, 20], [46, -16, 14, 24], [-48, -16, 14, 24]].forEach(([x, z, w, h], i) =>
      facade(x, z, w, 10, h, [tw, tw2, tw3][i % 3], top));
    // street lamps between the units, trees across the road
    const pole = lam("lampPole", () => ({ color: "#2a2f3a" }));
    for (const lx of [-31, -23, -15, -7.4, 7.4, 15, 23, 31]) {
      b.add(cyl(0.08, 4.2, 10), pole, M4(lx, 0, ROAD_Z - 4.2));
      box(b, pole, lx - 0.06, 4.1, ROAD_Z - 4.6, lx + 0.06, 4.2, ROAD_Z - 4.2);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), new THREE.MeshBasicMaterial({ color: "#fff2c8", fog: false }));
      lamp.position.set(lx, 3.95, ROAD_Z - 4.6); lamp.layers.set(NOINK); R.add(lamp); this.lamps.push(lamp);
    }
    for (let x = -40; x <= 40; x += 9) if (Math.abs(x + 2) > 6) prop(b, kit, x % 2 ? "tree_oak" : "tree_default", x + 2, 0, ROAD_Z + 5.5, 5.5 + (Math.abs(x) % 3), x * 0.7);
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#9aa07a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);
  }

  // =============== the lobby ===============
  private lobby(R: THREE.Object3D) {
    const [OX, , OZ] = LOBBY, b = new Batch();
    const P = (x: number, y: number, z: number) => V(OX + x, y, OZ + z);
    b.add(quad(P(-9.5, 0, 18), P(9.5, 0, 18), P(9.5, 0, -6.2), P(-9.5, 0, -6.2), 7, 9), lam("lobbyCarpet", () => ({ map: rep(lobbyCarpetTex(), 1, 1) })));
    const wallM = lam("lobbyWall", () => ({ color: "#6a2a44" })), panelM = lam("lobbyPanel", () => ({ color: "#8a3a5a" })), gold = lam("gold", () => ({ color: "#d9a441" }));
    const WH = 7.0;
    box(b, wallM, OX - 9.5, 0, OZ - 6.6, OX + 9.5, WH, OZ - 6.2);
    for (const s of [-1, 1]) box(b, wallM, OX + s * 9.5 - 0.2, 0, OZ - 6.6, OX + s * 9.5 + 0.2, WH, OZ + 18);
    box(b, gold, OX - 9.5, WH - 0.3, OZ - 6.25, OX + 9.5, WH - 0.15, OZ - 6.1);
    box(b, gold, OX - 9.5, 1.0, OZ - 6.25, OX + 9.5, 1.1, OZ - 6.1);
    for (const s of [-1, 1]) { box(b, gold, OX + s * 9.3 - 0.1, 1.0, OZ - 6.2, OX + s * 9.3 + 0.1, 1.1, OZ + 18); box(b, gold, OX + s * 9.3 - 0.1, WH - 0.3, OZ - 6.2, OX + s * 9.3 + 0.1, WH - 0.15, OZ + 18); }
    // gold stars on the back wall above the curtain
    for (let i = -3; i <= 3; i++) b.add(new THREE.CircleGeometry(0.22, 5), gold, M4(OX + i * 1.3, 5.95, OZ - 6.19));
    // posters along the side walls (lit frames)
    [[-1, -2.2], [-1, 2.2], [-1, 6.6], [1, -2.2], [1, 2.2], [1, 6.6]].forEach(([s, z], i) => {
      const x = OX + s * 9.28;
      box(b, gold, x - 0.05, 1.6, OZ + z - 0.9, x + 0.05, 4.4, OZ + z + 0.9);
      const pm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), glow("#ffffff", 1.1, posterTex(i + 1)));
      pm.rotation.y = -s * Math.PI / 2; pm.position.set(x - s * 0.07, 3.0, OZ + z); R.add(pm);
    });
    // the snack counter, the popcorn machine, the soda fountain, tubs, the menu board
    const [, , cz] = COUNTER_L;
    box(b, lam("counterRed", () => ({ color: "#b0242e" })), OX - 3.6, 0, OZ + cz - 0.45, OX + 3.6, 1.05, OZ + cz + 0.45);
    box(b, gold, OX - 3.7, 1.05, OZ + cz - 0.52, OX + 3.7, 1.12, OZ + cz + 0.52);
    b.add(quad(P(-3.4, 0.15, cz + 0.46), P(3.4, 0.15, cz + 0.46), P(3.4, 0.95, cz + 0.46), P(-3.4, 0.95, cz + 0.46)), new THREE.MeshBasicMaterial({ map: candyTex() }));
    const [px, py, pz] = POPPER;
    box(b, lam("popperBase", () => ({ color: "#c0242e" })), OX + px - 0.6, py, OZ + pz - 0.4, OX + px + 0.6, py + 0.35, OZ + pz + 0.4);
    box(b, lam("popperTop", () => ({ color: "#c0242e" })), OX + px - 0.62, py + 1.45, OZ + pz - 0.42, OX + px + 0.62, py + 1.75, OZ + pz + 0.42);
    for (const dx of [-0.58, 0.58]) for (const dz of [-0.38, 0.38]) box(b, gold, OX + px + dx - 0.03, py + 0.35, OZ + pz + dz - 0.03, OX + px + dx + 0.03, py + 1.45, OZ + pz + dz + 0.03);
    b.add(quad(P(px - 0.55, py + 1.48, pz + 0.43), P(px + 0.55, py + 1.48, pz + 0.43), P(px + 0.55, py + 1.72, pz + 0.43), P(px - 0.55, py + 1.72, pz + 0.43)), lam("popSign", () => ({ map: boardTex("POPCORN", "#c0242e", "#ffe680", 1024, 170) })));
    this.popGlow = glow("#ffffff", 0.82, popTex());
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.74), this.popGlow); glass.position.set(OX + px, py + 0.9, OZ + pz); R.add(glass);
    const [sx, sy, sz] = SODA;
    box(b, lam("sodaBody", () => ({ color: "#2f6fd6" })), OX + sx - 0.7, sy, OZ + sz - 0.3, OX + sx + 0.7, sy + 1.0, OZ + sz + 0.3);
    b.add(quad(P(sx - 0.6, sy + 0.55, sz + 0.31), P(sx + 0.6, sy + 0.55, sz + 0.31), P(sx + 0.6, sy + 0.92, sz + 0.31), P(sx - 0.6, sy + 0.92, sz + 0.31)), lam("sodaSign", () => ({ map: boardTex("SODA", "#1f4a9a", "#ffffff", 1024, 170) })));
    for (let i = 0; i < 4; i++) box(b, lam("tap", () => ({ color: "#cfd6df" })), OX + sx - 0.45 + i * 0.3 - 0.04, sy + 0.3, OZ + sz + 0.3, OX + sx - 0.45 + i * 0.3 + 0.04, sy + 0.5, OZ + sz + 0.42);
    const tub = lam("tub", () => ({ map: rep(stripeTex("#e3263a", "#ffffff"), 2, 1) })), pop = lam("popTop", () => ({ color: "#fff1b8" }));
    [[-0.55, 0.1], [-0.15, 0.1], [0.25, 0.1], [-0.35, -0.2], [0.05, -0.2]].forEach(([dx, dz]) => {
      b.add(cyl(0.13, 0.36, 18, 0.17), tub, M4(OX + dx, 1.12, OZ + cz + dz));
      b.add(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), pop, M4(OX + dx, 1.48, OZ + cz + dz));
    });
    this.menu = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.72), glow("#ffffff", 1.3, menuTex()));
    this.menu.position.set(OX, 3.2, OZ - 6.15); R.add(this.menu);
    // curtain valance and side posts
    const cz2 = OZ + CURTAIN_Z;
    box(b, lam("valance", () => ({ color: "#a0122a" })), OX - CURTAIN_HW - 0.5, CURTAIN_H, cz2 - 0.2, OX + CURTAIN_HW + 0.5, CURTAIN_H + 0.75, cz2 + 0.25);
    box(b, gold, OX - CURTAIN_HW - 0.5, CURTAIN_H - 0.05, cz2 + 0.22, OX + CURTAIN_HW + 0.5, CURTAIN_H + 0.08, cz2 + 0.3);
    box(b, gold, OX - CURTAIN_HW - 0.5, CURTAIN_H + 0.62, cz2 + 0.22, OX + CURTAIN_HW + 0.5, CURTAIN_H + 0.75, cz2 + 0.3);
    for (const s of [-1, 1]) box(b, wallM, OX + s * (CURTAIN_HW + 0.25) - 0.35, 0, cz2 - 0.25, OX + s * (CURTAIN_HW + 0.25) + 0.35, CURTAIN_H + 0.75, cz2 + 0.2);
    for (const s of [-1, 1]) box(b, panelM, OX + s * (CURTAIN_HW + 0.6) - 0.01, 0, cz2 - 3.4, OX + s * 9.3, CURTAIN_H + 0.75, cz2 + 0.2);
    // velvet-rope queue
    const posts = [-4.2, -2.1, 0, 2.1, 4.2];
    for (const x of posts) { b.add(cyl(0.18, 0.06, 18), gold, M4(OX + x, 0, OZ + 1.8)); b.add(cyl(0.045, 0.95, 12), gold, M4(OX + x, 0, OZ + 1.8)); b.add(new THREE.SphereGeometry(0.08, 12, 8).translate(0, 1.0, 0), gold, M4(OX + x, 0, OZ + 1.8)); }
    const rope = lam("rope", () => ({ color: "#b0122a" }));
    for (let i = 0; i < posts.length - 1; i++) {
      const c = new THREE.QuadraticBezierCurve3(P(posts[i], 0.9, 1.8), P((posts[i] + posts[i + 1]) / 2, 0.55, 1.8), P(posts[i + 1], 0.9, 1.8));
      b.add(new THREE.TubeGeometry(c, 16, 0.035, 8, false), rope);
    }
    // NO OUTSIDE FOOD stand
    const [nx, , nz] = NOFOOD;
    b.add(cyl(0.22, 0.05, 18), gold, M4(OX + nx, 0, OZ + nz)); b.add(cyl(0.04, 1.5, 10), gold, M4(OX + nx, 0, OZ + nz));
    box(b, gold, OX + nx - 0.55, 1.4, OZ + nz - 0.04, OX + nx + 0.55, 2.5, OZ + nz + 0.02);
    b.add(quad(P(nx - 0.5, 1.45, nz + 0.03), P(nx + 0.5, 1.45, nz + 0.03), P(nx + 0.5, 2.45, nz + 0.03), P(nx - 0.5, 2.45, nz + 0.03)), new THREE.MeshBasicMaterial({ map: noFoodTex() }));
    b.build(R);
    // the curtain: two pleated halves, gathered toward the sides as it opens
    const vel = lam("velvet", () => ({ map: velvetTex(), side: THREE.DoubleSide }));
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(pleatGeo(CURTAIN_HW, CURTAIN_H, 7), vel);
      m.castShadow = true; m.receiveShadow = true;
      m.position.set(OX + s * CURTAIN_HW, 0, cz2); m.scale.x = -s;
      R.add(m); this.curtain.push(m);
    }
    for (const [x, z, k] of [[-5, 4, 9], [5, 4, 9], [0, -1.5, 7]] as const) { const l = new THREE.PointLight("#ffe2c0", k, 14); l.position.set(OX + x, 5.2, OZ + z); R.add(l); }
    this.counterLight = new THREE.PointLight("#ffd28a", 0, 9); this.counterLight.position.set(OX, 3.2, OZ - 2.4); R.add(this.counterLight);
  }

  // =============== the explainer stage ===============
  private stageSet(R: THREE.Object3D) {
    const [SX, , SZ] = STAGE, b = new Batch();
    const S = (p: V3): V3 => add(STAGE, p);
    b.add(cyl(9.5, 0.5, 72), lam("stageTop", () => ({ color: "#f2e2cc" })), M4(SX, -0.5, SZ));
    b.add(cyl(9.8, 0.2, 72), lam("stageRim", () => ({ color: "#c0242e" })), M4(SX, -0.5, SZ));
    b.build(R);
    const mb = new Batch();
    const [cx, , cz] = S(COUNTER);
    const wood = lam("counterRed", () => ({ color: "#b0242e" })), top = lam("counterTop", () => ({ color: "#f4efe6" })), gold = lam("gold", () => ({ color: "#d9a441" }));
    box(mb, wood, cx - 1.6, 0, cz - 0.45, cx + 1.6, 1.0, cz + 0.45);
    box(mb, top, cx - 1.7, 1.0, cz - 0.52, cx + 1.7, 1.06, cz + 0.52);
    mb.add(quad(V(cx - 1.4, 0.25, cz + 0.46), V(cx + 1.4, 0.25, cz + 0.46), V(cx + 1.4, 0.8, cz + 0.46), V(cx - 1.4, 0.8, cz + 0.46)), lam("tixSign", () => ({ map: boardTex("TICKETS", "#1e1e26", "#ffe680", 1024, 170) })));
    box(mb, lam("register", () => ({ color: "#3a4150" })), cx + 0.7, 1.06, cz - 0.3, cx + 1.4, 1.4, cz + 0.2);
    box(mb, lam("regScr", () => ({ color: "#2bd96b" })), cx + 0.8, 1.42, cz - 0.25, cx + 1.3, 1.62, cz - 0.2);
    const [, , j0z] = S(JARS[0]);
    box(mb, gold, cx - 2.5, 1.18, j0z - 0.35, cx + 2.5, 1.3, j0z + 0.35);
    for (const dx of [-2.4, 2.4]) box(mb, gold, cx + dx - 0.06, 0, j0z - 0.3, cx + dx + 0.06, 1.18, j0z + 0.3);
    JARS.forEach((j, i) => {
      const [x, y, z] = S(j);
      mb.add(quad(V(x - 0.72, 0.86, z + 0.37), V(x + 0.72, 0.86, z + 0.37), V(x + 0.72, 1.18, z + 0.37), V(x - 0.72, 1.18, z + 0.37)), lam("jarL" + i, () => ({ map: boardTex(["STUDIO", "RENT+STAFF", "POWER+TECH"][i], ["#7b4fd0", "#c0392b", "#2f6fd6"][i], "#ffffff", 1024, i ? 140 : 170) })));
      mb.add(cyl(0.12, 0.04, 20), lam("jarLid", () => ({ color: "#8a8f99" })), M4(x, y + 0.92, z, 4.2, 1, 4.2));
    });
    // a film-reel backdrop
    for (const s of [-1, 1]) {
      const [bx, , bz] = S([s * 4.3, 0, -2.6]), ry = 1.75, rr = 1.05;
      mb.add(new THREE.CylinderGeometry(rr, rr, 0.16, 40).rotateX(Math.PI / 2), lam("reel", () => ({ color: "#3a4150" })), M4(bx, ry, bz, 1, 1, 1, -s * 0.5));
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; mb.add(new THREE.CylinderGeometry(0.2, 0.2, 0.2, 20).rotateX(Math.PI / 2).translate(0.62 * Math.cos(a), 0.62 * Math.sin(a), 0.01), lam("reelHole", () => ({ color: "#f2e2cc" })), M4(bx, ry, bz, 1, 1, 1, -s * 0.5)); }
      mb.add(new THREE.CylinderGeometry(0.16, 0.16, 0.22, 20).rotateX(Math.PI / 2), gold, M4(bx, ry, bz, 1, 1, 1, -s * 0.5));
      box(mb, lam("reelPost", () => ({ color: "#2a2f3a" })), bx - 0.08, 0, bz - 0.18, bx + 0.08, ry, bz - 0.06);
    }
    mb.build(this.money);
    JARS.forEach((j) => {
      const [x, y, z] = S(j);
      const jar = new THREE.Mesh(cyl(0.48, 0.92, 32), new THREE.MeshLambertMaterial({ color: "#cfe8ff", transparent: true, opacity: 0.35, depthWrite: false }));
      jar.position.set(x, y, z); jar.layers.set(NOINK); this.money.add(jar);
    });
    const coinMat = [twoTone(new THREE.MeshLambertMaterial({ color: "#d9a92a" })), twoTone(new THREE.MeshLambertMaterial({ map: coinTopTex() })), twoTone(new THREE.MeshLambertMaterial({ map: coinTopTex() }))];
    const coinGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.06, 28);
    for (let k = 0; k < COIN_N; k++) { const c = mesh(coinGeo, coinMat, this.money); c.visible = false; this.coins.push(c); }
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
    this.upper.forEach((u, i) => (u.material = golden && i % 3 !== 1 ? this.mats.upperLit : this.mats.upperDark));
    for (const l of this.lamps) (l.material as THREE.MeshBasicMaterial).color.setRGB(golden ? 3.0 : 1.0, golden ? 2.6 : 0.97, golden ? 1.7 : 0.85);
    if (this.bulbs) {
      for (let i = 0; i < this.bulbN; i++) {
        const chase = (Math.floor(t * 10) + i) % 3 === 0, k = chase ? 3.4 : 1.6;
        this.col.setRGB(k, k * 0.82, k * 0.45);
        this.bulbs.setColorAt(i, this.col);
      }
      this.bulbs.instanceColor!.needsUpdate = true;
      this.bulbs.visible = s.place === "street";
    }
    // ---- lobby: the curtain opens on the reveal, the popcorn machine glows ----
    const op = curtainOpen(id, f), e = 1 - (1 - op) ** 3;
    this.curtain.forEach((m, i) => { m.scale.x = (i ? 1 : -1) * -1 * (1 - 0.86 * e); });
    const hot = op > 0 ? 0.82 + 0.3 * e + 0.06 * Math.sin(t * 9) : 0.82;
    this.popGlow.color.setScalar(hot);
    this.counterLight.intensity = 14 * e;
    this.menu.visible = op > 0.05;
    // ---- stage ----
    this.money.visible = id === 3;
    // ---- coins: the moviegoer pays $15; 8 -> STUDIO, 3 -> RENT+STAFF, 2 -> POWER+TECH; 2 stay with the theater ----
    if (id === 3) {
      const C = add(STAGE, COUNTER), CU = add(STAGE, CUST);
      const hand: V3 = [CU[0] + 0.35, 1.25, CU[2] - 0.1];
      const slot = (k: number): V3 => [C[0] - 0.75 + (k % 3) * 0.42, 1.09 + Math.floor(k / 3) * 0.065, C[2] + 0.05];
      const arcP = (a: V3, b2: V3, h: number, u: number): V3 => { const e2 = smooth(u); return [a[0] + (b2[0] - a[0]) * e2, a[1] + (b2[1] - a[1]) * e2 + h * 4 * e2 * (1 - e2), a[2] + (b2[2] - a[2]) * e2]; };
      const starts = [BT.half, BT.rent, BT.power];
      this.coins.forEach((c, k) => {
        const s0 = 296 + k * 1.6;
        c.visible = f >= s0;
        if (!c.visible) return;
        let p: V3 = arcP(hand, slot(k), 1.0, clamp01((f - s0) / 12)), spin = clamp01((f - s0) / 12) * Math.PI * 2;
        const order = COIN_N - 1 - k;   // from the top of the stack down
        if (order < 13) {
          let acc = 0, jar = 0, inJar = 0;
          for (let j = 0; j < 3; j++) { if (order < acc + JAR_COINS[j]) { jar = j; inJar = order - acc; break; } acc += JAR_COINS[j]; }
          const c0 = starts[jar] + inJar * 3.0;
          const J = add(STAGE, JARS[jar]), dst: V3 = [J[0] + ((inJar % 2) - 0.5) * 0.16, J[1] + 0.06 + Math.floor(inJar / 2) * 0.065 + (inJar % 2) * 0.03, J[2]];
          if (f >= c0) { const u = clamp01((f - c0) / 14); p = arcP(slot(k), dst, 1.1, u); spin = u * Math.PI * 2; }
        } else if (f >= BT.keep + 10 && f < BT.keep + 40) p = [p[0], p[1] + 0.35 * Math.abs(Math.sin(((f - BT.keep - 10) / 30) * Math.PI * 2)), p[2]];
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
    const inside = s.place === "lobby";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 16;
    if (s.place === "stage") Rr = 13;
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
