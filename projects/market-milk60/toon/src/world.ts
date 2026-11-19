// The world of "Why is the milk at the back of the store?" as one three.js scene (Pisa engine):
//  - the street: the FRESHWAY MARKET building (glass front, sliding doors, big sign) over a parking lot with cars;
//  - the store (same footprint at STORE): checker floor, aisles of painted goods with hanging signs, the bakery and
//    flower stands by the door, the free sample stand, the soda tower, the glowing dairy wall with a giant MILK sign,
//    the checkout lanes with candy at eye level, and the back room with the loading dock behind the coolers;
//  - the cart (follows Max, fills up), the overhead map path, the dock crates.
// update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, lam, quad, Kit, prop, setSight } from "./build";
import { ctex, rep, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { cartAt, itemsAt } from "./blocking";
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, BT, add, STORE, FRONT, BACKW, SIDE, CEIL, DOOR_X, SHELF_X, SHELF_Z0, SHELF_Z1, SHELF_H, SHELF_D,
  BAKERY, FLOWERS, SAMPLE, SODA_TOWER, DAIRY_X0, DAIRY_X1, LANES, DOCK_Z, PATH, ceilingOff, pathDraw } from "./story";

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
type G = CanvasRenderingContext2D;
const T = (g: G, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "center") => {
  g.fillStyle = col; g.font = `${size}px ${ANTON}`; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#5e616c"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const tileTex = () => ctex("tiles", 512, 512, (g) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#e9e4da" : "#cfd6dc"; g.fillRect(i * 128, j * 128, 128, 128); }
  g.strokeStyle = "rgba(120,120,130,0.35)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024, size = 150, h = 256) => ctex("board" + text + bg + fg + w + size + h, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  T(g, text, w / 2, h / 2 + 8, size, fg);
});
const neonBoard = (text: string, fg: string, bg: string, w = 1024, size = 170, h = 256) => ctex("neonB" + text + fg + bg + h + w + size, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = fg; g.shadowBlur = 30; g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + 8); g.shadowBlur = 0; g.fillText(text, w / 2, h / 2 + 8);
});
const PAL = ["#e23b4e", "#2f6fd6", "#ffd23f", "#2fa05a", "#b06ad0", "#e8742c", "#3fd8ff", "#ff7aa8"];
/** a shelf face: 4 shelves of products by category (+ price tags); `tier` puts pricey gold packs at eye level */
const shelfTex = (kind: "chips" | "cereal" | "sweets" | "home" | "pricey", seed: number) => ctex("shelf" + kind + seed, 1024, 512, (g, r) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 1024, 512);
  for (let s = 0; s < 4; s++) {
    const y1 = 120 + s * 128, y0 = y1 - 112;
    g.fillStyle = "#9aa3ad"; g.fillRect(0, y1, 1024, 10);
    g.fillStyle = "#ffffff"; g.fillRect(0, y1 + 2, 1024, 6);
    let x = 10;
    while (x < 1000) {
      const c = PAL[Math.floor(r() * PAL.length)];
      if (kind === "chips") {
        const w = 70 + r() * 18, h = 90 + r() * 16;
        g.fillStyle = c; g.beginPath(); g.moveTo(x, y1); g.lineTo(x + 4, y1 - h); g.lineTo(x + w - 4, y1 - h); g.lineTo(x + w, y1); g.closePath(); g.fill();
        g.fillStyle = "rgba(255,255,255,0.85)"; g.beginPath(); g.ellipse(x + w / 2, y1 - h * 0.55, w * 0.32, h * 0.18, 0, 0, 7); g.fill();
        g.fillStyle = "#ffd23f"; g.beginPath(); g.ellipse(x + w / 2, y1 - h * 0.55, w * 0.18, h * 0.1, 0, 0, 7); g.fill();
        x += w + 6;
      } else if (kind === "cereal") {
        const w = 82, h = 104;
        g.fillStyle = c; g.fillRect(x, y1 - h, w, h);
        g.fillStyle = "#ffffff"; g.fillRect(x + 6, y1 - h + 6, w - 12, 18);
        // the cartoon mascot: big eyes looking down-right (toward a shopper in the aisle)
        for (const dx of [-15, 15]) { g.fillStyle = "#ffffff"; g.beginPath(); g.ellipse(x + w / 2 + dx, y1 - h * 0.48, 13, 16, 0, 0, 7); g.fill(); g.strokeStyle = "#241726"; g.lineWidth = 3; g.stroke();
          g.fillStyle = "#241726"; g.beginPath(); g.arc(x + w / 2 + dx + 4, y1 - h * 0.44, 6, 0, 7); g.fill(); }
        g.strokeStyle = "#241726"; g.lineWidth = 4; g.beginPath(); g.arc(x + w / 2, y1 - h * 0.28, 12, 0.2, Math.PI - 0.2); g.stroke();
        x += w + 8;
      } else if (kind === "sweets") {
        const w = 40 + r() * 16, h = 46 + r() * 30;
        for (let k = 0; k < 2; k++) { g.fillStyle = PAL[(Math.floor(r() * 8))]; g.fillRect(x, y1 - h * (k + 1) / 2 - k * 4, w, h / 2); }
        x += w + 6;
      } else {
        // home / pricey: bottles and boxes; pricey = gold boxes on the two middle shelves, cheap plain packs at the bottom
        const pricey = kind === "pricey" && (s === 1 || s === 2), cheap = kind === "pricey" && s === 3;
        const w = pricey ? 92 : 56 + r() * 20, h = pricey ? 104 : 70 + r() * 30;
        g.fillStyle = pricey ? (r() < 0.5 ? "#d9a441" : "#7b4fd0") : cheap ? "#c9c4ba" : c;
        if (!pricey && r() < 0.5) { g.fillRect(x + w * 0.3, y1 - h - 14, w * 0.4, 16); }
        g.fillRect(x, y1 - h, w, h);
        g.fillStyle = pricey ? "#fff6d6" : cheap ? "#8a8f99" : "rgba(255,255,255,0.8)";
        g.fillRect(x + 6, y1 - h * 0.62, w - 12, h * 0.26);
        if (pricey) T(g, "PREMIUM", x + w / 2, y1 - h * 0.49, 16, "#7a4a12");
        if (cheap) T(g, "BASIC", x + w / 2, y1 - h * 0.49, 15, "#ffffff");
        x += w + 8;
      }
    }
    // price tags
    if (kind === "pricey") {
      const tag = s === 1 || s === 2 ? "$6.99" : s === 3 ? "$2.49" : "$4.99";
      for (const tx of [150, 512, 874]) {
        g.fillStyle = s === 3 ? "#ffffff" : "#ffd23f"; g.fillRect(tx - 70, y1 - 2, 140, 38);
        g.strokeStyle = "#241726"; g.lineWidth = 3; g.strokeRect(tx - 70, y1 - 2, 140, 38);
        T(g, tag, tx, y1 + 18, 32, s === 3 ? "#2f7a46" : "#c0242e");
      }
    } else for (let tx = 60; tx < 1024; tx += 160) { g.fillStyle = "#ffd23f"; g.fillRect(tx, y1, 46, 22); }
  }
});
/** a glass cooler door row: lit shelves of milk cartons (dairy) or deli packs */
const coolerTex = (kind: "milk" | "deli") => ctex("cooler" + kind, 1024, 512, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#f2fbff"); gr.addColorStop(1, "#cfe8f6"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let s = 0; s < 4; s++) {
    const y1 = 120 + s * 124;
    g.fillStyle = "#b8c6d2"; g.fillRect(0, y1, 1024, 8);
    for (let x = 14; x < 1000; x += kind === "milk" ? 52 : 92) {
      if (kind === "milk") {
        g.fillStyle = "#ffffff"; g.fillRect(x, y1 - 82, 40, 70); g.beginPath(); g.moveTo(x, y1 - 82); g.lineTo(x + 20, y1 - 100); g.lineTo(x + 40, y1 - 82); g.fill();
        g.fillStyle = ["#2f6fd6", "#e23b4e", "#2fa05a", "#2f6fd6"][s]; g.fillRect(x + 2, y1 - 62, 36, 22);
        g.strokeStyle = "#8a9aa8"; g.lineWidth = 2; g.strokeRect(x, y1 - 82, 40, 70);
      } else { g.fillStyle = ["#e88a8a", "#f2c9a0", "#e8b04a"][Math.floor(r() * 3)]; g.fillRect(x, y1 - 40, 80, 30); g.fillStyle = "rgba(255,255,255,0.6)"; g.fillRect(x + 6, y1 - 34, 30, 8); }
    }
  }
  // door frames + glare
  for (let k = 0; k <= 4; k++) { g.fillStyle = "#4a5260"; g.fillRect(k * 256 - 6, 0, 12, 512); }
  g.fillStyle = "rgba(255,255,255,0.35)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 256 + 40, 0); g.lineTo(k * 256 + 90, 0); g.lineTo(k * 256 + 30, 512); g.lineTo(k * 256 - 20, 512); g.fill(); }
});
const candyRackTex = () => ctex("candyRack", 512, 1024, (g, r) => {
  g.fillStyle = "#2a2f3a"; g.fillRect(0, 0, 512, 1024);
  T(g, "CANDY", 256, 70, 96, "#ffd23f");
  for (let s = 0; s < 6; s++) for (let i = 0; i < 6; i++) {
    const x = 28 + i * 78, y = 150 + s * 140;
    g.fillStyle = PAL[Math.floor(r() * 8)]; g.fillRect(x, y, 66, 100);
    g.fillStyle = "rgba(255,255,255,0.8)"; g.fillRect(x + 8, y + 36, 50, 24);
  }
});
const breadTex = () => ctex("breadSign", 1024, 256, (g) => {
  g.fillStyle = "#6b3a22"; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = "#f2c33a"; g.lineWidth = 10; g.strokeRect(12, 12, 1000, 232);
  T(g, "FRESH BREAD", 512, 138, 150, "#ffe6a8");
});
const facadeSignTex = () => ctex("facadeSign", 2048, 384, (g) => {
  g.fillStyle = "#1f6a3a"; g.fillRect(0, 0, 2048, 384);
  g.font = `250px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.shadowColor = "#fff6c0"; g.shadowBlur = 28; g.fillStyle = "#fff6c0"; g.fillText("FRESHWAY MARKET", 1024, 200); g.shadowBlur = 0; g.fillText("FRESHWAY MARKET", 1024, 200);
});
const bannerTex = () => ctex("endBanner", 2048, 512, (g) => {
  g.fillStyle = "#c0242e"; g.fillRect(0, 0, 2048, 512);
  g.strokeStyle = "#ffd23f"; g.lineWidth = 18; g.strokeRect(20, 20, 2008, 472);
  g.font = `200px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.shadowColor = "#ffffff"; g.shadowBlur = 20;
  g.fillStyle = "#ffffff"; g.fillText("GRAB THE MILK.", 1024, 160); g.fillStyle = "#ffd23f"; g.fillText("GET OUT.", 1024, 360);
});
const doorGlassTex = () => ctex("doorGlass", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#e8f6ff"); gr.addColorStop(1, "#b8dcf0"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#6a7480"; g.fillRect(0, 0, 256, 14); g.fillRect(0, 498, 256, 14); g.fillRect(0, 0, 14, 512); g.fillRect(242, 0, 14, 512);
  g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(40, 14); g.lineTo(110, 14); g.lineTo(40, 300); g.lineTo(14, 300); g.fill();
});
const windowTex = () => ctex("storeWindow", 1024, 512, (g, r) => {
  g.fillStyle = "#fff3d6"; g.fillRect(0, 0, 1024, 512);
  for (let s = 0; s < 3; s++) { const y = 200 + s * 120; g.fillStyle = "#9aa3ad"; g.fillRect(0, y, 1024, 10); for (let x = 10; x < 1000; x += 50) { g.fillStyle = PAL[Math.floor(r() * 8)]; g.fillRect(x, y - 60 - r() * 20, 38, 60); } }
  g.fillStyle = "#e23b4e"; g.fillRect(60, 40, 300, 100); T(g, "SALE!", 210, 92, 80, "#ffffff");
  g.fillStyle = "#2f7a46"; g.fillRect(640, 40, 320, 100); T(g, "FRESH", 800, 92, 80, "#ffffff");
  for (let k = 0; k < 4; k++) { g.fillStyle = "#4a5260"; g.fillRect(k * 340 - 6, 0, 12, 512); }
  g.fillStyle = "rgba(255,255,255,0.35)"; g.beginPath(); g.moveTo(120, 0); g.lineTo(220, 0); g.lineTo(80, 512); g.lineTo(-20, 512); g.fill();
});
const floorLabelTex = (s: string, bg: string) => ctex("floorL" + s + bg, 512, 160, (g) => {
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 6, 500, 148, 40); g.fill(); g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.stroke();
  T(g, s, 256, 86, s.length > 7 ? 74 : 92, "#ffffff");
});
const crateTex = () => ctex("crate", 256, 256, (g) => {
  g.fillStyle = "#2f6fd6"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#1f4a9a"; for (let i = 0; i < 4; i++) g.fillRect(20 + i * 60, 30, 36, 196);
  g.fillStyle = "#ffffff"; for (let i = 0; i < 4; i++) g.fillRect(24 + i * 60, 12, 28, 30);
});
const truckTex = () => ctex("truckSide", 1024, 384, (g) => {
  g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, 1024, 384); g.fillStyle = "#2f6fd6"; g.fillRect(0, 300, 1024, 84);
  T(g, "DAIRY FRESH", 512, 150, 150, "#2f6fd6"); T(g, "DELIVERY", 512, 340, 56, "#ffffff");
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
/** unlit glowing material (HDR colour so the bloom picks it up) */
const glow = (col: string, k: number, map?: THREE.Texture, transparent = false) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), map: map ?? null, transparent, depthWrite: !transparent, fog: false, toneMapped: true });
/** a vertical plane, bottom-left (x0, y0) to top-right (x1, y1) at depth z, facing +z (ry rotates it about its centre) */
const panel = (x0: number, y0: number, x1: number, y1: number, z: number, mat: THREE.Material, parent: THREE.Object3D, ry = 0, ink = true) => {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.y = ry; m.receiveShadow = true; if (!ink) m.layers.set(NOINK); parent.add(m); return m;
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
  private doors: THREE.Mesh[] = [];
  private banner!: THREE.Mesh;
  private ceiling = new THREE.Group();
  private store = new THREE.Group();
  private street = new THREE.Group();
  private cart = new THREE.Group();
  private cartItems: THREE.Object3D[] = [];
  private pathTube!: THREE.Mesh; private pathN = 0;
  private mapLabels = new THREE.Group();
  private pin!: THREE.Mesh;
  private crates: THREE.Mesh[] = [];
  private areaLights: THREE.PointLight[] = [];
  private sodaGlow!: THREE.MeshBasicMaterial; private milkSign!: THREE.MeshBasicMaterial; private baitSign!: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
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
    setSight([]);
    this.buildStreet(this.street, kit);
    this.buildStore(this.store);
    this.store.position.set(...STORE);
    R.add(this.street, this.store);
  }

  // =============== the street: the market and its parking lot ===============
  private buildStreet(R: THREE.Object3D, kit: Kit) {
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const white = lam("roadLine", () => ({ color: "#f4f1e6" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-40, 40, FRONT + 3, FRONT + 40, 0.01, 20, 9), asph);
    b.add(flat(-40, 40, FRONT, FRONT + 3, 0.02, 20, 1), lam("sidewalk", () => ({ color: "#d8d2c6" })));
    box(b, curb, -40, 0, FRONT + 2.9, 40, 0.14, FRONT + 3.1);
    for (let x = -36; x <= 36; x += 3.2) if (Math.abs(x - DOOR_X) > 3) { b.add(flat(x - 0.06, x + 0.06, FRONT + 8, FRONT + 13, 0.016, 1, 1), white); b.add(flat(x - 0.06, x + 0.06, FRONT + 19, FRONT + 24, 0.016, 1, 1), white); }
    // crosswalk stripes to the door
    for (let k = 0; k < 6; k++) b.add(flat(DOOR_X - 2, DOOR_X + 2, FRONT + 3.4 + k * 0.8, FRONT + 3.8 + k * 0.8, 0.016, 1, 1), white);
    // the building
    const wallM = lam("mktWall", () => ({ color: "#efe6d2" })), trimM = lam("mktTrim", () => ({ color: "#1f6a3a" })), roofM = lam("mktRoof", () => ({ color: "#8a8f99" }));
    box(b, wallM, -SIDE, 0, BACKW - 6.5, SIDE, 6.6, FRONT);
    box(b, roofM, -SIDE - 0.3, 6.6, BACKW - 6.8, SIDE + 0.3, 7.0, FRONT + 0.3);
    box(b, trimM, -SIDE - 0.3, 6.0, FRONT, SIDE + 0.3, 6.6, FRONT + 0.4);
    box(b, trimM, -SIDE, 0, FRONT, SIDE, 0.4, FRONT + 0.15);
    // big sign on a raised parapet over the doors
    box(b, trimM, -7.5, 6.6, FRONT - 0.2, 7.5, 9.4, FRONT + 0.2);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 2.6), glow("#ffffff", 1.4, facadeSignTex())); sign.position.set(0, 8.0, FRONT + 0.22); R.add(sign);
    // windows along the front, the glass door bay with an awning
    const win = glow("#ffffff", 1.05, windowTex());
    panel(-11.6, 0.6, -0.6, 4.6, FRONT + 0.05, win, R); panel(0.4, 0.6, 5.4, 4.6, FRONT + 0.05, win, R); panel(10.6, 0.6, 11.9, 4.6, FRONT + 0.05, win, R);
    box(b, lam("doorFrame", () => ({ color: "#4a5260" })), DOOR_X - 2.6, 0, FRONT, DOOR_X + 2.6, 3.3, FRONT + 0.08);
    panel(DOOR_X - 2.4, 0.05, DOOR_X + 2.4, 3.1, FRONT + 0.06, glow("#ffffff", 1.15, ctex("doorInside", 256, 256, (g) => { const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#fff6e0"); gr.addColorStop(1, "#e8dcc0"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); })), R);
    const dg = new THREE.MeshLambertMaterial({ map: doorGlassTex(), transparent: true, opacity: 0.85 });
    for (const s of [-1, 1]) { const d = panel(-1.2, 0.05, 1.2, 3.1, 0, dg, R); d.position.set(DOOR_X + s * 1.2, 1.575, FRONT + 0.2); d.userData.s = s; this.doors.push(d); }
    box(b, trimM, DOOR_X - 3.0, 3.3, FRONT, DOOR_X + 3.0, 3.5, FRONT + 1.6);
    panel(DOOR_X - 2.6, 3.55, DOOR_X + 2.6, 4.45, FRONT + 0.06, new THREE.MeshLambertMaterial({ map: boardTex("OPEN 7AM - 11PM", "#1f6a3a", "#ffffff", 1024, 120) }), R);
    // the end banner (shot 4): GRAB THE MILK. GET OUT.
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.4), glow("#ffffff", 1.3, bannerTex()));
    this.banner.position.set(DOOR_X, 5.3, FRONT + 0.3); this.banner.visible = false; this.banner.layers.set(NOINK); R.add(this.banner);
    // cart corral, parked cars
    const steel = lam("steel", () => ({ color: "#aeb6c0" }));
    for (const z of [FRONT + 7, FRONT + 9.4]) box(b, steel, -2.0, 0.9, z - 0.04, 2.6, 0.98, z + 0.04);
    for (const x of [-2, 2.6]) for (const z of [FRONT + 7, FRONT + 9.4]) b.add(cyl(0.05, 0.98, 10), steel, M4(x, 0, z));
    const carCols = ["#e23b4e", "#2f6fd6", "#f4f1ea", "#2fa05a", "#ffd23f", "#7b4fd0", "#3a4150", "#e8742c"];
    [[-28, 10.5], [-21.6, 10.5], [-15.2, 10.5], [-8.8, 10.5], [14.4, 10.5], [20.8, 10.5], [27.2, 10.5], [-24.8, 21.5], [-12, 21.5], [17.6, 21.5], [24, 21.5]].forEach(([x, dz], i) => {
      const z = FRONT + dz, c = lam("car" + i, () => ({ color: carCols[i % carCols.length] }));
      box(b, c, x - 1.0, 0.35, z - 2.2, x + 1.0, 1.15, z + 2.2);
      box(b, c, x - 0.9, 1.15, z - 1.2, x + 0.9, 1.75, z + 1.0);
      box(b, lam("carGlass", () => ({ color: "#3a4a62" })), x - 0.92, 1.2, z - 1.15, x + 0.92, 1.68, z + 0.95);
      for (const sx of [-1, 1]) for (const sz of [-1.4, 1.4]) b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18).rotateZ(Math.PI / 2), lam("tyre", () => ({ color: "#24262e" })), M4(x + sx * 0.95, 0.36, z + sz));
    });
    // lamps and trees
    const pole = lam("lampPole", () => ({ color: "#2a2f3a" }));
    for (const lx of [-24, -10, 18, 30]) {
      b.add(cyl(0.1, 6, 10), pole, M4(lx, 0, FRONT + 16));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: "#fff2c8", fog: false }));
      lamp.position.set(lx, 6.0, FRONT + 16); lamp.layers.set(NOINK); R.add(lamp); this.lamps.push(lamp);
    }
    for (let x = -44; x <= 44; x += 8) prop(b, kit, x % 16 ? "tree_oak" : "tree_default", x, 0, FRONT + 44 + (x % 3), 6 + (Math.abs(x) % 3), x * 0.7);
    for (const s of [-1, 1]) for (let z = -10; z <= 10; z += 7) prop(b, kit, "tree_oak", s * 18, 0, z, 6.5, z);
    // neighbouring buildings, far hills
    const nb = lam("nbWall", () => ({ color: "#c9b8d8" })), nb2 = lam("nbWall2", () => ({ color: "#9cc4d8" }));
    box(b, nb, -46, 0, -14, -24, 9, 8); box(b, nb2, 24, 0, -18, 48, 12, 6);
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#9aa07a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);
  }

  // =============== the store interior (local coordinates; the group sits at STORE) ===============
  private buildStore(R: THREE.Object3D) {
    const b = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-SIDE, SIDE, BACKW, FRONT, 0, 12, 16), lam("tiles", () => ({ map: rep(tileTex(), 1, 1) })));
    const wallM = lam("inWall", () => ({ color: "#e8efe6" })), stripe = lam("inStripe", () => ({ color: "#1f6a3a" }));
    // walls (front wall = glass with daylight)
    box(b, wallM, -SIDE - 0.3, 0, BACKW - 0.3, -SIDE, CEIL, FRONT); box(b, wallM, SIDE, 0, BACKW - 0.3, SIDE + 0.3, CEIL, FRONT);
    box(b, stripe, -SIDE, 2.6, BACKW, -SIDE + 0.02, 3.0, FRONT); box(b, stripe, SIDE - 0.02, 2.6, BACKW, SIDE, 3.0, FRONT);
    panel(-SIDE, 0, SIDE, CEIL, FRONT, glow("#ffffff", 1.25, ctex("frontGlass", 512, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#d8eeff"); gr.addColorStop(0.6, "#bfe0f6"); gr.addColorStop(1, "#9ab8a0"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#4a5260"; for (let k = 0; k <= 8; k++) g.fillRect(k * 64 - 3, 0, 6, 256); g.fillRect(0, 0, 512, 8);
    })), R, Math.PI);
    // back wall above the coolers, with the dairy opening on the left and the deli on the right
    box(b, wallM, -SIDE, 2.6, BACKW - 0.3, SIDE, CEIL, BACKW);
    box(b, stripe, -SIDE, 2.55, BACKW + 0.0, SIDE, 2.75, BACKW + 0.05);
    // ---- the ceiling (hidden for the overhead map) with light strips ----
    const cb = new Batch();
    box(cb, lam("ceil", () => ({ color: "#d9dde2" })), -SIDE, CEIL, BACKW, SIDE, CEIL + 0.1, FRONT);
    cb.build(this.ceiling);
    const strip = glow("#f4fbff", 2.4);
    for (let x = -9; x <= 9; x += 4.5) for (let z = BACKW + 2; z < FRONT - 1; z += 4) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), strip); m.rotation.x = Math.PI / 2; m.position.set(x, CEIL - 0.01, z); m.layers.set(NOINK); this.ceiling.add(m); }
    this.ceiling.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; } });
    R.add(this.ceiling);
    // ---- shelf rows: a body, two painted faces, an end cap, a hanging aisle sign ----
    const shelfM = lam("shelfBody", () => ({ color: "#dfe3e8" })), capM = lam("shelfCap", () => ({ color: "#1f6a3a" }));
    const faces: Record<number, ["chips" | "cereal" | "sweets" | "home" | "pricey", "chips" | "cereal" | "sweets" | "home" | "pricey"]> = {
      [-9]: ["home", "pricey"], [-5]: ["home", "sweets"], [-1]: ["sweets", "cereal"], [3]: ["cereal", "chips"], [7]: ["chips", "home"] };
    for (const x of SHELF_X) {
      box(b, shelfM, x - SHELF_D / 2, 0, SHELF_Z0, x + SHELF_D / 2, SHELF_H, SHELF_Z1);
      box(b, capM, x - SHELF_D / 2 - 0.05, SHELF_H, SHELF_Z0 - 0.05, x + SHELF_D / 2 + 0.05, SHELF_H + 0.12, SHELF_Z1 + 0.05);
      const [lf, rf] = faces[x], len = SHELF_Z1 - SHELF_Z0, zc = (SHELF_Z0 + SHELF_Z1) / 2;
      for (const [side, kind] of [[-1, lf], [1, rf]] as const) {
        const tex = rep(shelfTex(kind, x * 7 + side), Math.round(len / 3.5), 1);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(len, SHELF_H - 0.1), new THREE.MeshLambertMaterial({ map: tex }));
        m.rotation.y = side * Math.PI / 2; m.position.set(x + side * (SHELF_D / 2 + 0.01), (SHELF_H - 0.1) / 2 + 0.05, zc); m.receiveShadow = true; R.add(m);
      }
      // end caps facing the front and the back
      for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(SHELF_D, SHELF_H - 0.1), new THREE.MeshLambertMaterial({ map: shelfTex("home", x + s * 3) })); m.rotation.y = s > 0 ? 0 : Math.PI; m.position.set(x, (SHELF_H - 0.1) / 2 + 0.05, s > 0 ? SHELF_Z1 + 0.01 : SHELF_Z0 - 0.01); R.add(m); }
    }
    // hanging aisle signs over each aisle (both faces)
    const AS: [number, string, string][] = [[5, "CHIPS", "#e23b4e"], [1, "CEREAL", "#e8742c"], [-3, "SWEETS", "#b06ad0"], [-7, "HOME", "#2f6fd6"], [10, "BAKERY", "#6b3a22"]];
    for (const [x, name, col] of AS) {
      for (const s of [0, Math.PI]) { const m = panel(-1.2, -0.35, 1.2, 0.35, 0, new THREE.MeshLambertMaterial({ map: boardTex(name, col, "#ffffff", 1024, 170, 300) }), R, s); m.position.set(x, 4.2, 4.2 + (s ? -0.01 : 0.01)); }
      b.add(cyl(0.01, 1.05, 4), lam("wire", () => ({ color: "#4a5260" })), M4(x - 1.0, 4.55, 4.2)); b.add(cyl(0.01, 1.05, 4), lam("wire", () => ({ color: "#4a5260" })), M4(x + 1.0, 4.55, 4.2));
    }
    // an entrance sign that points the long way: MILK -> BACK OF STORE
    const ms = panel(-1.6, -0.4, 1.6, 0.4, 0, new THREE.MeshLambertMaterial({ map: boardTex("MILK: BACK OF STORE  →", "#2f6fd6", "#ffffff", 1024, 96) }), R, Math.PI * 0.9);
    ms.position.set(DOOR_X - 1.2, 3.6, FRONT - 3.2);
    // ---- by the door: bakery (warm) and flowers ----
    const wood = lam("wood", () => ({ color: "#a8743f" }));
    const [bx, , bz] = BAKERY;
    box(b, wood, bx - 1.4, 0, bz - 0.6, bx + 1.4, 0.95, bz + 0.6);
    box(b, lam("cloth", () => ({ color: "#f4efe6" })), bx - 1.45, 0.95, bz - 0.65, bx + 1.45, 1.0, bz + 0.65);
    const loaf = lam("loaf", () => ({ color: "#d9903a" }));
    for (let i = 0; i < 9; i++) b.add(new THREE.SphereGeometry(0.17, 14, 10).scale(1.7, 0.85, 1), loaf, M4(bx - 1.0 + (i % 5) * 0.5, 1.12 + Math.floor(i / 5) * 0.05, bz - 0.25 + Math.floor(i / 5) * 0.45, 1, 1, 1, i * 0.3));
    const bs = panel(-1.4, -0.35, 1.4, 0.35, 0, glow("#ffffff", 1.2, breadTex()), R); bs.position.set(bx, 2.35, bz - 0.55);
    box(b, wood, bx - 1.3, 1.0, bz - 0.62, bx - 1.22, 2.6, bz - 0.54); box(b, wood, bx + 1.22, 1.0, bz - 0.62, bx + 1.3, 2.6, bz - 0.54);
    const [fx, , fz] = FLOWERS;
    box(b, lam("flowerStand", () => ({ color: "#2f7a46" })), fx - 1.1, 0, fz - 0.7, fx + 1.1, 0.7, fz + 0.7);
    const petals = ["#ff6a8a", "#ffd23f", "#b06ad0", "#ff8a3a", "#ffffff"];
    for (let i = 0; i < 6; i++) {
      const x = fx - 0.8 + (i % 3) * 0.8, z = fz - 0.3 + Math.floor(i / 3) * 0.6;
      b.add(cyl(0.2, 0.4, 14, 0.24), lam("bucket", () => ({ color: "#8a8f99" })), M4(x, 0.7, z));
      for (let k = 0; k < 7; k++) b.add(new THREE.SphereGeometry(0.09, 8, 6), lam("petal" + ((i + k) % 5), () => ({ color: petals[(i + k) % 5] })), M4(x + Math.cos(k * 0.9) * 0.15, 1.2 + (k % 3) * 0.08, z + Math.sin(k * 0.9) * 0.15));
    }
    // ---- the free sample stand ----
    const [sx, , sz] = SAMPLE;
    b.add(cyl(0.45, 0.9, 24), lam("sampleTable", () => ({ color: "#f4efe6" })), M4(sx + 0.5, 0, sz - 0.2));
    const ss = panel(-0.7, -0.25, 0.7, 0.25, 0, new THREE.MeshLambertMaterial({ map: boardTex("FREE SAMPLES!", "#e8742c", "#ffffff", 1024, 140) }), R, -Math.PI / 2.3);
    ss.position.set(sx + 0.15, 1.6, sz - 0.2);
    b.add(cyl(0.02, 1.4, 6), lam("wire", () => ({ color: "#4a5260" })), M4(sx + 0.5, 0, sz - 0.2));
    // ---- the soda tower: a pyramid of cans + 2 FOR $5 ----
    const [tx, , tz] = SODA_TOWER, canGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 14);
    const cans = new THREE.InstancedMesh(canGeo, new THREE.MeshLambertMaterial({ color: "#ffffff" }), 300);
    let ci = 0; const cc = new THREE.Color();
    for (let row = 0; row < 9; row++) {
      const n = 9 - row;
      for (let i = 0; i < n; i++) for (let j = 0; j < 2; j++) {
        if (ci >= 300) break;
        cans.setMatrixAt(ci, new THREE.Matrix4().makeTranslation(tx + (i - (n - 1) / 2) * 0.23, 0.12 + row * 0.245, tz + 0.2 + j * 0.24));
        cans.setColorAt(ci, cc.set(["#e23b4e", "#e23b4e", "#2f6fd6", "#2fa05a"][(row + i) % 4])); ci++;
      }
    }
    cans.count = ci; cans.castShadow = true; cans.receiveShadow = true; R.add(cans);
    this.sodaGlow = glow("#ffffff", 1.4, neonBoard("2 FOR $5", "#ffe680", "#c0242e", 1024, 190));
    const sd = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.48), this.sodaGlow); sd.position.set(tx, 2.75, tz + 0.5); R.add(sd);
    b.add(cyl(0.02, 2.6, 6), lam("wire", () => ({ color: "#4a5260" })), M4(tx - 0.9, 0, tz + 0.46));
    b.add(cyl(0.02, 2.6, 6), lam("wire", () => ({ color: "#4a5260" })), M4(tx + 0.9, 0, tz + 0.46));
    // ---- the dairy wall: glowing coolers + giant MILK sign; deli on the right ----
    const cooler = glow("#ffffff", 1.25, rep(coolerTex("milk"), 3, 1)), deli = glow("#ffffff", 1.1, rep(coolerTex("deli"), 3, 1));
    box(b, lam("coolerBody", () => ({ color: "#4a5260" })), DAIRY_X0, 0, BACKW - 0.2, SIDE, 0.35, BACKW + 0.9);
    panel(DAIRY_X0, 0.35, DAIRY_X1, 2.55, BACKW + 0.9, cooler, R);
    panel(DAIRY_X1 + 0.3, 0.35, SIDE - 0.2, 2.55, BACKW + 0.9, deli, R);
    box(b, lam("coolerBody", () => ({ color: "#4a5260" })), DAIRY_X1, 0.35, BACKW, DAIRY_X1 + 0.3, 2.6, BACKW + 0.92);
    this.milkSign = glow("#ffffff", 1.7, neonBoard("MILK", "#ffffff", "#2f6fd6", 1024, 210, 300));
    const msg = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.3), this.milkSign); msg.position.set((DAIRY_X0 + DAIRY_X1) / 2, 3.65, BACKW + 0.06); R.add(msg);
    const dsg = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), new THREE.MeshLambertMaterial({ map: boardTex("DELI", "#c0242e", "#ffffff", 1024, 170, 280) })); dsg.position.set(6, 3.5, BACKW + 0.06); R.add(dsg);
    // the BAIT sign over the milk (lights up on "bait")
    this.baitSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.62), glow("#ffffff", 1.6, neonBoard("BAIT", "#ffe680", "#c0242e", 1024, 220, 340)));
    this.baitSign.position.set(-7, 2.95, BACKW + 0.95); this.baitSign.visible = false; this.baitSign.layers.set(NOINK); R.add(this.baitSign);
    // ---- checkout lanes: counter, belt, register, candy rack at eye level ----
    const cnt = lam("counter", () => ({ color: "#1f6a3a" })), belt = lam("belt", () => ({ color: "#2a2f3a" }));
    for (const x of LANES) {
      box(b, cnt, x - 0.55, 0, 9.0, x + 0.55, 0.9, 12.4);
      box(b, belt, x - 0.45, 0.9, 9.4, x + 0.45, 0.94, 11.8);
      box(b, lam("register", () => ({ color: "#3a4150" })), x - 0.4, 0.94, 11.9, x + 0.1, 1.3, 12.35);
      box(b, lam("regScr", () => ({ color: "#2bd96b" })), x - 0.35, 1.32, 12.0, x + 0.05, 1.56, 12.05);
      box(b, lam("laneLight", () => ({ color: "#4a5260" })), x - 0.04, 0.9, 12.3, x + 0.04, 2.6, 12.38);
      const ln = panel(-0.3, -0.3, 0.3, 0.3, 0, glow("#ffffff", 1.3, boardTex(String(LANES.indexOf(x) + 1), "#2f6fd6", "#ffffff", 256, 180, 256)), R); ln.position.set(x, 2.85, 12.34);
      // candy rack at the head of the queue, facing the shoppers (eye level for kids and grown-ups)
      box(b, lam("rackBody", () => ({ color: "#2a2f3a" })), x + 1.7, 0, 9.3, x + 2.8, 1.8, 9.6);
      const cr = panel(-0.55, 0, 0.55, 1.75, 0, new THREE.MeshLambertMaterial({ map: candyRackTex() }), R); cr.position.set(x + 2.25, 0.9, 9.61);
    }
    // ---- the back room behind the dairy wall: crates, the loading dock, the delivery truck ----
    b.add(flat(-SIDE, SIDE, DOCK_Z, BACKW - 0.3, 0, 12, 4), lam("backFloor", () => ({ color: "#9aa3ad" })));
    box(b, lam("backWall", () => ({ color: "#c9c4ba" })), -SIDE, 0, DOCK_Z - 0.3, -2, CEIL, DOCK_Z);
    box(b, lam("backWall", () => ({ color: "#c9c4ba" })), 6, 0, DOCK_Z - 0.3, SIDE, CEIL, DOCK_Z);
    box(b, lam("backWall", () => ({ color: "#c9c4ba" })), -2, 4.2, DOCK_Z - 0.3, 6, CEIL, DOCK_Z);
    box(b, lam("rollDoor", () => ({ color: "#8a8f99" })), -2, 3.6, DOCK_Z - 0.2, 6, 4.2, DOCK_Z);
    box(b, lam("dockEdge", () => ({ color: "#ffd23f" })), -2, 0, DOCK_Z - 0.05, 6, 0.08, DOCK_Z + 0.25);
    // the cooler backs: walk-in doors stocked straight from the dock
    box(b, lam("coolerBack", () => ({ color: "#b8c6d2" })), DAIRY_X0, 0, BACKW - 1.6, DAIRY_X1, 2.6, BACKW - 0.3);
    panel(DAIRY_X0 + 0.3, 0.2, DAIRY_X1 - 0.3, 2.3, BACKW - 1.61, glow("#ffffff", 1.0, rep(coolerTex("milk"), 3, 1)), R, Math.PI);
    const dk = panel(-1.8, -0.4, 1.8, 0.4, 0, new THREE.MeshLambertMaterial({ map: boardTex("LOADING DOCK", "#2a2f3a", "#ffd23f", 1024, 140) }), R); dk.position.set(2, 4.6, DOCK_Z + 0.02);
    const crate = lam("crate", () => ({ map: crateTex() }));
    for (let i = 0; i < 10; i++) box(b, crate, -10 + (i % 5) * 0.7, Math.floor(i / 5) * 0.5, -19.5, -9.4 + (i % 5) * 0.7, 0.48 + Math.floor(i / 5) * 0.5, -18.9);
    // the truck outside the dock
    const truck = new Batch();
    box(truck, lam("truckBox", () => ({ map: truckTex() })), -2.3, 1.2, DOCK_Z - 9.5, 6.3, 4.4, DOCK_Z - 1.2);
    box(truck, lam("truckIn", () => ({ map: rep(crateTex(), 6, 4) })), -2.0, 1.2, DOCK_Z - 1.3, 6.0, 4.1, DOCK_Z - 1.15);
    truck.build(R);
    for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(UB, crate); c.scale.set(0.6, 0.45, 0.6); c.castShadow = true; c.visible = false; R.add(c); this.crates.push(c); }
    b.build(R);
    // ---- area lights: cool overheads, warm bakery, red soda, blue dairy, back room ----
    const L = (x: number, y: number, z: number, col: string, k: number, d: number) => { const l = new THREE.PointLight(col, k, d); l.position.set(x, y, z); R.add(l); this.areaLights.push(l); return l; };
    for (let x = -8; x <= 8; x += 8) for (let z = -10; z <= 12; z += 11) L(x, 4.8, z, "#eef6ff", 9, 15);
    L(bx, 2.6, bz + 0.6, "#ffb860", 14, 6);
    this.sodaLight = L(tx, 3.0, tz + 1.4, "#ff6a6a", 10, 6);
    L(-7, 2.2, BACKW + 2.2, "#bfe2ff", 12, 7);
    L(0, 3.5, -19, "#ffe6c0", 12, 12);
    // ---- the cart (a wire basket on wheels, items appear as they land) ----
    const wire = lam("cartWire", () => ({ color: "#c9d2dc" })), cb2 = new Batch();
    const BW = 0.56, BL = 0.86, BY = 0.45, BH = 0.5;
    const edge = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => box(cb2, wire, x0, y0, z0, x1, y1, z1);
    for (const sx of [-1, 1]) { edge(sx * BW / 2 - 0.02, BY, -BL / 2, sx * BW / 2 + 0.02, BY + BH, -BL / 2 + 0.04); edge(sx * BW / 2 - 0.02, BY, BL / 2 - 0.04, sx * BW / 2 + 0.02, BY + BH, BL / 2); }
    for (const y of [BY, BY + BH * 0.5, BY + BH]) { edge(-BW / 2, y - 0.015, -BL / 2, BW / 2, y + 0.015, -BL / 2 + 0.03); edge(-BW / 2, y - 0.015, BL / 2 - 0.03, BW / 2, y + 0.015, BL / 2); edge(-BW / 2, y - 0.015, -BL / 2, -BW / 2 + 0.03, y + 0.015, BL / 2); edge(BW / 2 - 0.03, y - 0.015, -BL / 2, BW / 2, y + 0.015, BL / 2); }
    for (let k = 0; k < 6; k++) { const x = -BW / 2 + (k + 0.5) * BW / 6; edge(x - 0.008, BY, -BL / 2, x + 0.008, BY + BH, -BL / 2 + 0.02); edge(x - 0.008, BY, BL / 2 - 0.02, x + 0.008, BY + BH, BL / 2); }
    edge(-BW / 2, BY - 0.02, -BL / 2, BW / 2, BY + 0.01, BL / 2);
    edge(-BW / 2 - 0.02, BY + BH + 0.12, BL / 2 + 0.12, BW / 2 + 0.02, BY + BH + 0.16, BL / 2 + 0.16);   // handle (toward Max = +z local)
    box(cb2, lam("cartRed", () => ({ color: "#c0242e" })), -BW / 2 - 0.03, BY + BH + 0.1, BL / 2 + 0.1, BW / 2 + 0.03, BY + BH + 0.18, BL / 2 + 0.18);
    for (const sx of [-1, 1]) { edge(sx * BW / 2 - 0.015, BY + BH, BL / 2, sx * BW / 2 + 0.015, BY + BH + 0.16, BL / 2 + 0.15); for (const sz of [-1, 1]) { edge(sx * (BW / 2 - 0.05) - 0.015, 0.1, sz * (BL / 2 - 0.08) - 0.015, sx * (BW / 2 - 0.05) + 0.015, BY, sz * (BL / 2 - 0.08) + 0.015);
      cb2.add(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 14).rotateZ(Math.PI / 2), lam("tyre", () => ({ color: "#24262e" })), M4(sx * (BW / 2 - 0.05), 0.07, sz * (BL / 2 - 0.08))); } }
    cb2.build(this.cart);
    // items: [kind, local x, y, z, sx, sy, sz, colour / map]
    const IT: [string, number, number, number, number, number, number, string][] = [
      ["bread", -0.12, BY + 0.1, -0.22, 0.42, 0.16, 0.2, "#d9903a"], ["chips", 0.12, BY + 0.16, -0.1, 0.24, 0.3, 0.12, "#e23b4e"],
      ["cheese", -0.15, BY + 0.06, 0.18, 0.18, 0.1, 0.14, "#ffd23f"], ["cereal", 0.1, BY + 0.2, 0.2, 0.24, 0.36, 0.1, "#e8742c"],
      ["soda", -0.1, BY + 0.1, 0.02, 0.3, 0.2, 0.2, "#2f6fd6"], ["soda", 0.12, BY + 0.3, -0.25, 0.3, 0.2, 0.2, "#e23b4e"],
      ["pile", 0, BY + 0.5, 0, 0.5, 0.36, 0.7, "#b06ad0"], ["milk", 0.1, BY + 0.76, 0.12, 0.13, 0.24, 0.13, "#ffffff"], ["candy", -0.12, BY + 0.74, -0.18, 0.2, 0.06, 0.1, "#e23b4e"],
    ];
    const pile = new Batch();
    for (let k = 0; k < 14; k++) box(pile, lam("pile" + (k % 6), () => ({ color: PAL[k % 8] })), -0.24 + (k % 4) * 0.13, (k % 3) * 0.1 - 0.16, -0.32 + Math.floor(k / 4) * 0.2, -0.13 + (k % 4) * 0.13, (k % 3) * 0.1 + 0.02, -0.16 + Math.floor(k / 4) * 0.2);
    IT.forEach(([kind, x, y, z, sx2, sy, sz2, col], i) => {
      let o: THREE.Object3D;
      if (kind === "pile") { const g = new THREE.Group(); pile.build(g); o = g; }
      else { const m = new THREE.Mesh(kind === "bread" ? new THREE.SphereGeometry(0.5, 14, 10) : UB, new THREE.MeshLambertMaterial({ color: col })); m.castShadow = true; o = m; }
      o.position.set(x, y, z); if (kind !== "pile") o.scale.set(sx2, sy, sz2); o.userData.kind = kind; o.userData.n = IT.slice(0, i).filter((q) => q[0] === kind).length;
      o.visible = false; this.cart.add(o); this.cartItems.push(o);
    });
    this.cart.traverse((o) => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
    R.add(this.cart);
    // ---- the overhead map: a glowing path through the store, floor labels, a pin ----
    const pts = PATH.map(([x, z]) => V(x, 0.08, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05);
    const tg = new THREE.TubeGeometry(curve, 400, 0.22, 8, false);
    this.pathN = tg.index ? tg.index.count : 0;
    this.pathTube = new THREE.Mesh(tg, glow("#ffd23f", 2.2)); this.pathTube.layers.set(NOINK); this.pathTube.visible = false; R.add(this.pathTube);
    this.pin = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 12), glow("#e23b4e", 1.8)); this.pin.layers.set(NOINK); this.pin.visible = false; R.add(this.pin);
    const LBL: [string, string, number, number][] = [["DOOR", "#2a2f3a", 8, 14.4], ["BREAD", "#6b3a22", 3.2, 12.4], ["CHIPS", "#e23b4e", 5, 2.6], ["SAMPLES", "#e8742c", 8.6, -10.2],
      ["CEREAL", "#e8742c", 1, -3.4], ["SODA", "#c0242e", -1, 10.2], ["SWEETS", "#b06ad0", -3, -3.4], ["MILK", "#2f6fd6", -7, -11.0], ["CANDY", "#2fa05a", -5, 13.6]];
    for (const [s, col, x, z] of LBL) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.06), glow("#ffffff", 1.3, floorLabelTex(s, col))); m.rotation.x = -Math.PI / 2; m.position.set(x, 2.5, z); this.mapLabels.add(m); }
    this.mapLabels.visible = false; this.mapLabels.traverse((o) => o.layers.set(NOINK)); R.add(this.mapLabels);
    this.pathCurve = curve;
  }
  private pathCurve!: THREE.CatmullRomCurve3;
  private sodaLight!: THREE.PointLight;

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
    const t = f / FPS, s = SHOTS[id - 1], golden = s.light === "golden", inStore = s.place === "store";
    this.store.visible = inStore; this.street.visible = !inStore;
    for (const l of this.lamps) (l.material as THREE.MeshBasicMaterial).color.setRGB(golden ? 3.0 : 1.0, golden ? 2.6 : 0.97, golden ? 1.7 : 0.85);
    // sliding doors: open as Max walks up (shot 2) and while he dashes in and out (shot 4)
    const open = id === 2 ? smooth((f - BT.walks + 14) / 12) : id === 4 ? Math.max(smooth((f - BT.walkin + 4) / 6), 0) * (1 - smooth((f - BT.getout - 30) / 10)) : 0;
    this.doors.forEach((d) => (d.position.x = DOOR_X + (d.userData.s as number) * (1.2 + 2.2 * open)));
    this.banner.visible = id === 4 && f >= BT.getout + 4;
    if (this.banner.visible) { const u = clamp01((f - BT.getout - 4) / 10), k = u < 1 ? 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2 : 1; this.banner.scale.setScalar(Math.max(0.01, k)); }
    if (!inStore) return;
    this.ceiling.visible = !ceilingOff(id, f);
    // glows that pulse on their beats
    this.sodaGlow.color.setScalar(f >= BT.soda && f < BT.heavier ? 1.4 + 0.5 * (Math.floor(t * 6) % 2) : 1.4);
    this.milkSign.color.setScalar(f >= BT.reaches && f < BT.full ? 1.7 + 0.4 * Math.sin(t * 10) : 1.7);
    this.baitSign.visible = f >= BT.bait - 2 && f < Math.round(37.0 * FPS);
    // the cart
    const c = cartAt(id, f);
    this.cart.visible = c.visible;
    if (c.visible) {
      this.cart.position.set(c.x, 0, c.z); this.cart.rotation.y = c.yaw;
      const have = itemsAt(f), counts: Record<string, number> = {};
      for (const h of have) counts[h.kind] = (counts[h.kind] ?? 0) + 1;
      // the extra-step beat refills the pile; at checkout everything is still in
      for (const o of this.cartItems) o.visible = (counts[o.userData.kind] ?? 0) > (o.userData.n as number);
    }
    // the map: path draws, labels pop, pin rides the path
    const mapOn = ceilingOff(id, f) && f >= Math.round(37.0 * FPS) - 2 && f < Math.round(40.65 * FPS);
    const pd = pathDraw(f);
    this.pathTube.visible = mapOn && pd > 0; this.mapLabels.visible = mapOn; this.pin.visible = mapOn;
    if (mapOn) {
      this.pathTube.geometry.setDrawRange(0, Math.floor((this.pathN * pd) / 3) * 3);
      const p = this.pathCurve.getPointAt(Math.min(0.999, pd)); this.pin.position.set(p.x, 0.6 + 0.12 * Math.abs(Math.sin(t * 8)), p.z);
      this.mapLabels.children.forEach((m, i) => { const u = clamp01((pd - i / 9) * 6 + 0.4); m.scale.setScalar(Math.max(0.01, u)); });
    }
    // the dock: crates go from the truck straight into the cooler backs
    const dockOn = f >= Math.round(40.65 * FPS) && f < Math.round(44.2 * FPS);
    this.crates.forEach((cr, i) => {
      const t0 = Math.round(40.75 * FPS) + i * 16, u = (f - t0) / 40;
      cr.visible = dockOn && u >= 0 && u < 1;
      if (!cr.visible) return;
      const a = V(1 + (i % 2) * 1.4, 1.4, DOCK_Z - 2.2), b2 = V(-7 + (i % 3) * 1.5, 1.2 + (i % 2) * 0.5, BACKW - 1.7), e = smooth(u);
      cr.position.set(a.x + (b2.x - a.x) * e, a.y + (b2.y - a.y) * e + 0.5 * Math.sin(e * Math.PI), a.z + (b2.z - a.z) * e);
    });
    // area lights: the soda light flashes on the deal
    this.sodaLight.intensity = f >= BT.soda && f < BT.heavier ? 10 + 8 * (Math.floor(t * 6) % 2) : 10;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0);
    // straight-down map shots need a stable up vector
    if (Math.abs(c.pos[0] - c.look[0]) + Math.abs(c.pos[2] - c.look[2]) < 1.5) cam.up.set(0, 0, -1);
    cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    // ---- light rig ----
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = s.place === "store" ? L.sunI * 0.8 : L.sunI;
    const inside = s.place === "store";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = ceilingOff(id, f) ? 26 : 18;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    // indoors: lift the shade (overhead light everywhere) and cool the tint a touch
    if (inside) { TONE.uShadeCol.value.set(0.55, 0.56, 0.62); TONE.uLitCol.value.set(1.45, 1.47, 1.5); }
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    if (inside) CHAR.uCharTint.value.set(1.0, 0.98, 0.98);
    // ---- sky, fog, clouds ----
    const su = this.skyMat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = inside ? 80 : L.fogNear; this.fog.far = inside ? 500 : Math.max(L.fogFar, 520);
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
void add;
