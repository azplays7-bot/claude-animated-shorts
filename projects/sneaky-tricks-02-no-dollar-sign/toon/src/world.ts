// The world of "Cheap to make, hard to sell" (Tony's Burgers) as one three.js scene (Pisa engine), built on the
// BLAZE BURGER street of the red-and-yellow short:
//  - the street: a row of dull offices / shops, the BLAZE BURGER restaurant (red walls, yellow roof band, glass front)
//    with a tall pole sign and a reader board in its parking lot. In the grey shots the world's albedo is drained to
//    grey (shade.ts uSat) while the restaurant and its sign use unlit glow materials, so they keep their colour;
//  - the inside (same footprint at STORE): red / yellow walls, bright ceiling panels, the counter and menu boards, the
//    grill behind, hard plastic stools at small tables, a speaker, a NOW SERVING board.
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
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, BT, STORE, FRONT, BACKW, SIDE, CEIL, DOOR_X, ROAD_Z0, ROAD_Z1, POLE, SIGN_Y, BOARD_Y,
  COUNTER_Z, COUNTER_X0, COUNTER_X1, TABLES, MAX_TABLE, SPEAKER, NUMBER_BOARD, GRILL, grayAt, TONY_X0, TONY_X1, TONY_DOOR, TONY_H, CAFE_X0, CAFE_X1 } from "./story";

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
const RED = "#d8262e", YEL = "#ffc928", DARK = "#241726";
const T = (g: G, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = "center") => {
  g.fillStyle = col; g.font = `${size}px ${ANTON}`; g.textAlign = align; g.textBaseline = "middle"; g.fillText(s, x, y);
};
/** text with a dark outline */
const TO = (g: G, s: string, x: number, y: number, size: number, col: string, ow = 10) => {
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.lineJoin = "round";
  g.strokeStyle = DARK; g.lineWidth = ow; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y);
};
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#5e616c"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const walkTex = () => ctex("sidewalk", 512, 512, (g) => {
  g.fillStyle = "#cfcac0"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(90,90,100,0.35)"; g.lineWidth = 4;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); }
});
const tileTex = () => ctex("redTiles", 512, 512, (g) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? "#f4efe4" : "#3f8a5a"; g.fillRect(i * 128, j * 128, 128, 128); }
  g.strokeStyle = "rgba(90,40,40,0.25)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024, size = 150, h = 256) => ctex("board" + text + bg + fg + w + size + h, w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
  T(g, text, w / 2, h / 2 + 8, size, fg);
});
/** the BLAZE BURGER logo: a flame-topped burger on red, the name in yellow */
const logo = (g: G, cx: number, cy: number, s: number) => {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.fillStyle = YEL; g.beginPath(); g.moveTo(-60, 20); g.quadraticCurveTo(-70, -40, -30, -80); g.quadraticCurveTo(-30, -40, -10, -40); g.quadraticCurveTo(-20, -90, 20, -120);
  g.quadraticCurveTo(15, -60, 40, -50); g.quadraticCurveTo(45, -80, 60, -90); g.quadraticCurveTo(80, -30, 60, 20); g.fill();
  g.fillStyle = "#ff8a1e"; g.beginPath(); g.ellipse(0, 0, 70, 34, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#6b2a12"; g.fillRect(-72, 4, 144, 22); g.fillStyle = "#5cbf4a"; g.fillRect(-74, 0, 148, 8);
  g.fillStyle = "#ff8a1e"; g.beginPath(); g.ellipse(0, 30, 70, 18, 0, 0, Math.PI); g.fill();
  g.restore();
};
const signTex = () => ctex("poleSign", 1024, 660, (g) => {
  g.fillStyle = RED; g.fillRect(0, 0, 1024, 660);
  g.strokeStyle = YEL; g.lineWidth = 26; g.strokeRect(20, 20, 984, 620);
  logo(g, 512, 250, 1.6);
  TO(g, "BLAZE", 512, 395, 150, YEL, 16); TO(g, "BURGER", 512, 545, 150, "#ffffff", 16);
});
const roofSignTex = () => ctex("roofSign", 2048, 320, (g) => {
  g.fillStyle = RED; g.fillRect(0, 0, 2048, 320); g.fillStyle = YEL; g.fillRect(0, 0, 2048, 22); g.fillRect(0, 298, 2048, 22);
  logo(g, 250, 190, 1.0); logo(g, 1798, 190, 1.0);
  TO(g, "BLAZE BURGER", 1024, 172, 230, YEL, 18);
});
/** the reader board under the pole sign (black with yellow bulbs, white letters) */
const BOARDS = ["COMBO $8.99", "STOP HERE!", "RIGHT NOW!", "HUNGRY YET?", "STILL HUNGRY?", "OPEN LATE"];
const readerTex = (s: string) => ctex("reader" + s, 1024, 256, (g) => {
  g.fillStyle = "#16121c"; g.fillRect(0, 0, 1024, 256);
  for (let x = 20; x < 1010; x += 40) for (const y of [16, 240]) { g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  for (const x of [16, 1008]) for (let y = 56; y < 220; y += 40) { g.fillStyle = "#ffd75e"; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
  g.shadowColor = "#ffffff"; g.shadowBlur = 16; T(g, s, 512, 136, s.length > 11 ? 120 : 140, "#ffffff"); g.shadowBlur = 0;
});
const windowGridTex = (base: string, key: string) => ctex("winGrid" + key, 512, 512, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = r() < 0.3 ? "#9aa6b4" : "#6c7888"; g.fillRect(28 + i * 122, 30 + j * 122, 80, 84); g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(32 + i * 122, 34 + j * 122, 20, 76); }
});
const glassFrontTex = () => ctex("restGlass", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff4cc"); gr.addColorStop(1, "#ffd27a"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  // tables and stools seen through the glass
  for (let k = 0; k < 4; k++) { g.fillStyle = "#c8323a"; g.fillRect(80 + k * 240, 330, 140, 20); g.fillRect(140 + k * 240, 350, 20, 110);
    for (const dx of [-30, 170]) { g.fillStyle = k % 2 ? "#ffc928" : "#d8262e"; g.fillRect(80 + k * 240 + dx - 10, 400, 40, 60); } }
  g.fillStyle = "#ffffff"; for (let k = 0; k < 5; k++) g.fillRect(k * 220 + 40, 30, 150, 26);
  for (let k = 0; k <= 4; k++) { g.fillStyle = "#3a3f4a"; g.fillRect(k * 256 - 6, 0, 12, 512); }
  g.fillStyle = "rgba(255,255,255,0.35)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 256 + 40, 0); g.lineTo(k * 256 + 90, 0); g.lineTo(k * 256 + 30, 512); g.lineTo(k * 256 - 20, 512); g.fill(); }
});
const doorGlassTex = () => ctex("doorGlass", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#fff6dc"); gr.addColorStop(1, "#ffdc90"); g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  g.fillStyle = "#3a3f4a"; g.fillRect(0, 0, 256, 14); g.fillRect(0, 498, 256, 14); g.fillRect(0, 0, 14, 512); g.fillRect(242, 0, 14, 512);
  g.fillStyle = "#c0c6d0"; g.fillRect(200, 220, 18, 90);
  g.fillStyle = "rgba(255,255,255,0.5)"; g.beginPath(); g.moveTo(40, 14); g.lineTo(110, 14); g.lineTo(40, 300); g.lineTo(14, 300); g.fill();
});
/** Tony's hand-made look: green and cream, a little burger drawing */
const TG = "#2f8a4a", CREAM = "#f6efdc";
const tonyBurger = (g: G, cx: number, cy: number, s: number) => {
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.fillStyle = "#e9a447"; g.beginPath(); g.ellipse(0, -10, 70, 40, 0, Math.PI, 0); g.fill();
  g.fillStyle = "#5cbf4a"; g.fillRect(-74, -12, 148, 10); g.fillStyle = "#6b2a12"; g.fillRect(-72, -2, 144, 22);
  g.fillStyle = "#ffd23f"; g.fillRect(-70, 18, 140, 8); g.fillStyle = "#e9a447"; g.beginPath(); g.ellipse(0, 28, 70, 18, 0, 0, Math.PI); g.fill();
  g.restore();
};
/** v: 0 = round prices, 1 = the .99 prices, 2 = the 1880 general store (chalk), 3 = no $ signs */
const menuTex = (k: number, v = 0) => ctex("pmenu" + k + "_" + v, 1024, 512, (g) => {
  g.fillStyle = v === 2 ? "#2a2a26" : k === 1 ? TG : "#1c2420"; g.fillRect(0, 0, 1024, 512);
  g.strokeStyle = v === 2 ? "#b89a6a" : CREAM; g.lineWidth = 12; g.strokeRect(10, 10, 1004, 492);
  const items = v === 2 ? [["GOODS", "SILK 99¢", "GLOVES $1.49"], ["GENERAL STORE", "EST. 1880", "COME IN!"], ["SUNDRIES", "SOAP 5¢", "CANDY 1¢"]][k]
    : v === 3 ? [["BURGERS", "CLASSIC 5", "DOUBLE 7"], ["TONY'S", "HOMEMADE", "SINCE 2026"], ["SIDES", "FRIES 4", "SODA 3"]][k]
    : v === 1 ? [["BURGERS", "CLASSIC $4.99", "DOUBLE $6.99"], ["TONY'S", "HOMEMADE", "SINCE 2026"], ["SIDES", "FRIES $3.99", "SODA $2.99"]][k]
    : [["BURGERS", "CLASSIC $5.00", "DOUBLE $7.00"], ["TONY'S", "HOMEMADE", "SINCE 2026"], ["SIDES", "FRIES $4.00", "SODA $3.00"]][k];
  T(g, items[0], 512, 80, 100, k === 1 ? "#ffd23f" : CREAM);
  tonyBurger(g, 180, 300, 1.3);
  T(g, items[1], 640, 250, 70, "#ffffff"); T(g, items[2], 640, 370, 70, "#ffffff");
});
/** Tony's shop sign, the GRAND OPENING banner, the cafe's CLOSED / FOR LEASE signs, Tony's glass front (empty inside) */
/** MAISON D'OR: black and gold */
const maisonTex = () => ctex("maison", 1536, 300, (g) => {
  g.fillStyle = "#111014"; g.fillRect(0, 0, 1536, 300); g.strokeStyle = "#d8b45a"; g.lineWidth = 10; g.strokeRect(20, 20, 1496, 260);
  g.fillStyle = "#e8c46a"; g.font = `150px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("MAISON D'OR", 768, 160);
});
const tonySignTex = () => ctex("tonySign", 1536, 300, (g) => {
  g.fillStyle = CREAM; g.fillRect(0, 0, 1536, 300); g.strokeStyle = TG; g.lineWidth = 18; g.strokeRect(12, 12, 1512, 276);
  tonyBurger(g, 170, 160, 1.2); tonyBurger(g, 1366, 160, 1.2);
  TO(g, "TONY'S BURGERS", 768, 156, 170, "#d8262e", 14);
});
const bannerTex = () => ctex("grandOpen", 1024, 200, (g) => {
  g.fillStyle = "#ffd23f"; g.fillRect(0, 0, 1024, 200);
  for (let x = 0; x < 1024; x += 64) { g.fillStyle = (x / 64) % 2 ? "#d8262e" : TG; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 64, 0); g.lineTo(x + 32, 30); g.fill(); }
  TO(g, "GRAND OPENING!", 512, 118, 110, "#ffffff", 12);
});
const closedTex = (s: string, bg: string) => ctex("closed" + s, 768, 300, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 768, 300); g.strokeStyle = "#ffffff"; g.lineWidth = 14; g.strokeRect(14, 14, 740, 272);
  T(g, s, 384, 160, s.length > 7 ? 120 : 150, "#ffffff");
});
const tonyGlassTex = () => ctex("tonyGlass", 1024, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, "#f4f7ee"); gr.addColorStop(1, "#d9ead2"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 512);
  for (let k = 0; k < 4; k++) { g.fillStyle = "#f6efdc"; g.fillRect(80 + k * 240, 330, 140, 20); g.fillStyle = "#3a3f4a"; g.fillRect(140 + k * 240, 350, 20, 110);
    for (const dx of [-30, 170]) { g.fillStyle = k % 2 ? TG : "#ffd23f"; g.fillRect(80 + k * 240 + dx - 10, 400, 40, 60); } }
  for (let k = 0; k <= 4; k++) { g.fillStyle = "#2a3a2e"; g.fillRect(k * 256 - 6, 0, 12, 512); }
  g.fillStyle = "rgba(255,255,255,0.4)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(k * 256 + 40, 0); g.lineTo(k * 256 + 90, 0); g.lineTo(k * 256 + 30, 512); g.lineTo(k * 256 - 20, 512); g.fill(); }
});
const posterTex = (s: string, k: number) => ctex("tposter" + s, 512, 768, (g) => {
  g.fillStyle = k ? "#ffd23f" : TG; g.fillRect(0, 0, 512, 768);
  tonyBurger(g, 256, 360, 2.2);
  TO(g, s, 256, 640, s.length > 5 ? 90 : 110, k ? "#d8262e" : CREAM, 12);
  g.strokeStyle = "#ffffff"; g.lineWidth = 14; g.strokeRect(14, 14, 484, 740);
});
const kitchenTex = () => ctex("kitchenWall", 512, 512, (g) => {
  g.fillStyle = "#e8ecef"; g.fillRect(0, 0, 512, 512); g.strokeStyle = "rgba(120,130,140,0.4)"; g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke(); }
});
const speakerTex = () => ctex("speaker", 256, 384, (g) => {
  g.fillStyle = "#24262e"; g.fillRect(0, 0, 256, 384);
  for (const [y, r] of [[110, 70], [280, 50]] as const) { g.fillStyle = "#3a3f4a"; g.beginPath(); g.arc(128, y, r, 0, 7); g.fill(); g.fillStyle = "#14161c"; g.beginPath(); g.arc(128, y, r * 0.45, 0, 7); g.fill(); }
});
const officeSign = (s: string) => ctex("office" + s, 1024, 200, (g) => { g.fillStyle = "#56606e"; g.fillRect(0, 0, 1024, 200); T(g, s, 512, 108, 130, "#e8eaee"); });

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
/** unlit (keeps its colour in the grey shots; > 1 = HDR for the bloom) */
const glow = (col: string, k: number, map?: THREE.Texture, transparent = false) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), map: map ?? null, transparent, depthWrite: !transparent, fog: false, toneMapped: true });
const gbox = (R: THREE.Object3D, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => {
  const o = new THREE.Mesh(UB, m); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); o.scale.set(x1 - x0, y1 - y0, z1 - z0); o.castShadow = true; R.add(o); return o;
};
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
  private doors: THREE.Mesh[] = [];
  private store = new THREE.Group();
  private street = new THREE.Group();
  private signGroup = new THREE.Group();
  private signMat!: THREE.MeshBasicMaterial; private roofMat!: THREE.MeshBasicMaterial; private edgeMat!: THREE.MeshBasicMaterial;
  private reader!: THREE.Mesh; private readerMaps: Record<string, THREE.Texture> = {};
  private menuMats: THREE.MeshBasicMaterial[] = []; private menuMaps: THREE.Texture[][] = [];
  private grillMat!: THREE.MeshBasicMaterial;
  private tray!: THREE.Group;
  private tonySign!: THREE.MeshBasicMaterial; private opening!: THREE.Group; private closed!: THREE.Mesh; private lease!: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
  private areaLights: THREE.PointLight[] = [];
  private frustum = new THREE.Frustum();
  private m4 = new THREE.Matrix4(); private v = new THREE.Vector3(); private sph = new THREE.Sphere();

  constructor(kit: Kit) {
    const R = this.root;
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

  // =============== the street ===============
  private buildStreet(R: THREE.Object3D, kit: Kit) {
    const b = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) })));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) })), white = lam("roadLine", () => ({ color: "#f4f1e6" })), yline = lam("roadYel", () => ({ color: "#e8c23a" }));
    b.add(flat(-120, 120, ROAD_Z0, ROAD_Z1, 0.01, 60, 2), asph);
    for (let x = -118; x < 118; x += 6) b.add(flat(x, x + 3, 17.42, 17.58, 0.016, 1, 1), yline);
    const walk = lam("walk", () => ({ map: rep(walkTex(), 1, 1) }));
    b.add(flat(-120, 120, FRONT, ROAD_Z0, 0.03, 60, 1), walk); b.add(flat(-120, 120, ROAD_Z1, ROAD_Z1 + 3, 0.03, 60, 1), walk);
    const curb = lam("curb", () => ({ color: "#b9b4aa" }));
    box(b, curb, -120, 0, ROAD_Z0 - 0.15, 120, 0.14, ROAD_Z0 + 0.05); box(b, curb, -120, 0, ROAD_Z1 - 0.05, 120, 0.14, ROAD_Z1 + 0.15);
    // the parking lot beside the restaurant
    b.add(flat(SIDE, 17.5, -9, FRONT, 0.02, 4, 6), asph);
    for (let z = -7; z <= 3; z += 2.6) b.add(flat(SIDE + 4.5, 17, z - 0.05, z + 0.05, 0.03, 1, 1), white);
    // ---- the dull row: offices, a bank, a laundromat (both sides of the road) ----
    const dull = ["#8d8a86", "#a39b8f", "#7f8894", "#9a9690", "#8a8478", "#77808a"];
    const row: [number, number, number, string][] = [[-58, -44, 12, "OFFICE"], [-44, -31, 8, "TAX HELP"], [-31, -19, 10, "BANK"], [-19, -7.6, 7, "LAUNDRY"],
      [CAFE_X0, CAFE_X1, 5, "CAFE ROSA"], [40, 52, 8, "COPY SHOP"], [52, 66, 11, "BANK"]];
    row.forEach(([x0, x1, h, s], i) => {
      const m = lam("dull" + i, () => ({ color: dull[i % dull.length] }));
      box(b, m, x0 + 0.15, 0, -6, x1 - 0.15, h, FRONT);
      box(b, lam("dullTrim" + (i % 3), () => ({ color: ["#6a6660", "#5c636c", "#74706a"][i % 3] })), x0, h, -6.2, x1, h + 0.4, FRONT + 0.2);
      const win = new THREE.MeshLambertMaterial({ map: rep(windowGridTex(dull[i % dull.length], "w" + i), Math.max(1, Math.round((x1 - x0) / 4)), Math.max(1, Math.round((h - 3) / 4))) });
      panel(x0 + 0.6, 3.2, x1 - 0.6, h - 0.6, FRONT + 0.02, win, R);
      panel(x0 + 0.8, 0.2, x1 - 0.8, 2.6, FRONT + 0.02, new THREE.MeshLambertMaterial({ map: windowGridTex("#5d6470", "shop" + (i % 2)) }), R);
      const sg = panel(-(x1 - x0) * 0.3, -0.38, (x1 - x0) * 0.3, 0.38, 0, new THREE.MeshLambertMaterial({ map: officeSign(s) }), R); sg.position.set((x0 + x1) / 2, 2.95, FRONT + 0.05);
    });
    // ---- Tony's little shop: green walls, cream trim, striped awning, hand-painted sign ----
    {
      const green = lam("tonyGreen", () => ({ color: "#3f9a5a" })), cream = lam("tonyCream", () => ({ color: "#f3ead2" }));
      box(b, green, TONY_X0 + 0.15, 0, -6, TONY_X1 - 0.15, TONY_H, FRONT);
      box(b, cream, TONY_X0, TONY_H, -6.2, TONY_X1, TONY_H + 0.35, FRONT + 0.2);
      box(b, cream, TONY_X0 + 0.15, 0, FRONT, TONY_X1 - 0.15, 0.35, FRONT + 0.08);
      panel(TONY_X0 + 0.7, 0.45, TONY_DOOR - 1.0, 2.9, FRONT + 0.03, new THREE.MeshLambertMaterial({ map: tonyGlassTex() }), R);
      panel(TONY_DOOR + 1.0, 0.45, TONY_X1 - 0.7, 2.9, FRONT + 0.03, new THREE.MeshLambertMaterial({ map: tonyGlassTex() }), R);
      box(b, lam("tonyDoorFrame", () => ({ color: "#2a3a2e" })), TONY_DOOR - 0.95, 0, FRONT, TONY_DOOR + 0.95, 2.75, FRONT + 0.06);
      panel(TONY_DOOR - 0.85, 0.05, TONY_DOOR + 0.85, 2.65, FRONT + 0.07, new THREE.MeshLambertMaterial({ map: doorGlassTex() }), R);
      const ts = panel(-3.9, -0.76, 3.9, 0.76, 0, glow("#ffffff", 1.05, tonySignTex()), R); ts.position.set((TONY_X0 + TONY_X1) / 2, 3.75, FRONT + 0.1); this.tonySign = ts.material as THREE.MeshBasicMaterial;
      // striped awning over the windows (green / white slats)
      for (let k = 0; k < 18; k++) {
        const x0 = TONY_X0 + 0.4 + k * ((TONY_X1 - TONY_X0 - 0.8) / 18), x1 = x0 + (TONY_X1 - TONY_X0 - 0.8) / 18;
        box(b, k % 2 ? cream : lam("tonyAwning", () => ({ color: "#2f8a4a" })), x0, 2.95, FRONT + 0.05, x1, 3.1, FRONT + 1.1);
      }
      // two little planters
      for (const x of [TONY_X0 + 0.6, TONY_X1 - 0.6]) { box(b, lam("planter", () => ({ color: "#8a5a3a" })), x - 0.35, 0, FRONT + 0.2, x + 0.35, 0.5, FRONT + 0.8); b.add(new THREE.SphereGeometry(0.42, 12, 8), lam("bush", () => ({ color: "#4f9a3a" })), M4(x, 0.75, FRONT + 0.5)); }
      // GRAND OPENING banner + balloons (shot 2 only)
      this.opening = new THREE.Group(); R.add(this.opening);
      panel(-2.4, -0.47, 2.4, 0.47, 0, glow("#ffffff", 1.05, bannerTex()), this.opening).position.set(TONY_DOOR, 2.45, FRONT + 1.15);
      const bcol = ["#d8262e", "#ffd23f", "#2f8a4a", "#2f6fd6"];
      for (let k = 0; k < 8; k++) {
        const x = TONY_DOOR + (k < 4 ? -1.4 - k * 0.3 : 1.4 + (k - 4) * 0.3), y = 3.2 + (k % 2) * 0.35;
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), glow(bcol[k % 4], 1.0)); bl.scale.set(1, 1.2, 1); bl.position.set(x, y, FRONT + 1.2); bl.castShadow = true; this.opening.add(bl);
      }
    }
    // the cafe next door: CLOSED, then FOR LEASE (shots 8 + 9)
    this.closed = panel(-1.3, -0.5, 1.3, 0.5, 0, glow("#ffffff", 1.05, closedTex("CLOSED", "#c0242e")), R); this.closed.position.set(23.4, 1.45, FRONT + 0.06);
    this.lease = panel(-1.3, -0.5, 1.3, 0.5, 0, glow("#ffffff", 1.05, closedTex("FOR LEASE", "#2f6fd6")), R); this.lease.position.set(20.6, 1.45, FRONT + 0.06);
    // MAISON D'OR: a black-and-gold ground floor over the old cafe
    {
      const blk = glow("#17161b", 1.0), gold = glow("#d8b45a", 1.2);
      gbox(R, blk, CAFE_X0 + 0.3, 0, FRONT + 0.02, CAFE_X1 - 0.3, 3.3, FRONT + 0.12);
      gbox(R, gold, CAFE_X0 + 0.3, 3.3, FRONT + 0.02, CAFE_X1 - 0.3, 3.42, FRONT + 0.2);
      const mw = panel(-3.6, -1.0, 3.6, 1.0, 0, glow("#ffffff", 1.0, ctex("maisonWin", 1024, 300, (g) => {
        const gr = g.createLinearGradient(0, 0, 0, 300); gr.addColorStop(0, "#5a3a1a"); gr.addColorStop(1, "#2a1a0e"); g.fillStyle = gr; g.fillRect(0, 0, 1024, 300);
        for (let k = 0; k < 6; k++) { g.fillStyle = "#ffd890"; g.beginPath(); g.arc(90 + k * 170, 70, 14, 0, 7); g.fill(); g.fillStyle = "#f4efe4"; g.fillRect(50 + k * 170, 200, 80, 12); }
        g.strokeStyle = "#d8b45a"; g.lineWidth = 8; for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, 300); g.stroke(); }
      })), R); mw.position.set((CAFE_X0 + CAFE_X1) / 2, 1.65, FRONT + 0.14);
      const ms = panel(-3.4, -0.66, 3.4, 0.66, 0, glow("#ffffff", 1.15, maisonTex()), R); ms.position.set((CAFE_X0 + CAFE_X1) / 2, 4.15, FRONT + 0.14);
      for (const x of [CAFE_X0 + 1.0, CAFE_X1 - 1.0]) { b.add(cyl(0.06, 2.2, 10), lam("lampGold", () => ({ color: "#b8943a" })), M4(x, 0, FRONT + 0.6)); const l = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), glow("#ffe0a0", 2.2)); l.position.set(x, 2.3, FRONT + 0.6); l.layers.set(NOINK); R.add(l); }
    }
    const far: [number, number, number][] = [[-50, -36, 14], [-36, -20, 9], [-20, -6, 11], [-6, 8, 8], [8, 22, 13], [22, 36, 9], [36, 50, 12]];
    far.forEach(([x0, x1, h], i) => {
      const c = dull[(i + 2) % dull.length];
      box(b, lam("dullF" + i, () => ({ color: c })), x0 + 0.15, 0, ROAD_Z1 + 3, x1 - 0.15, h, ROAD_Z1 + 16);
      panel(x0 + 0.6, 3.0, x1 - 0.6, h - 0.6, ROAD_Z1 + 2.98, new THREE.MeshLambertMaterial({ map: rep(windowGridTex(c, "f" + i), Math.max(1, Math.round((x1 - x0) / 4)), Math.max(1, Math.round((h - 3) / 4))) }), R, Math.PI);
    });
    // street lamps, a few trees, parked cars
    const pole = lam("lampPole", () => ({ color: "#2a2f3a" }));
    for (let lx = -48; lx <= 60; lx += 12) {
      b.add(cyl(0.09, 5.5, 10), pole, M4(lx, 0, ROAD_Z0 - 0.5));
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10), new THREE.MeshBasicMaterial({ color: "#fff2c8", fog: false }));
      lamp.position.set(lx, 5.5, ROAD_Z0 - 0.5); lamp.layers.set(NOINK); R.add(lamp); this.lamps.push(lamp);
    }
    for (const x of [-40, -26]) prop(b, kit, "tree_oak", x, 0, ROAD_Z0 - 1.2, 5.5, x);
    const carCols = ["#7a7f8a", "#a8a49c", "#5c6470", "#8e8a84", "#b0b4ba"];
    [[-30, 15], [-12, 15], [56, 15], [46, 20], [-40, 20], [5, 20]].forEach(([x, z], i) => {
      const c = lam("car" + i, () => ({ color: carCols[i % carCols.length] }));
      box(b, c, x - 2.2, 0.35, z - 1.0, x + 2.2, 1.15, z + 1.0); box(b, c, x - 1.2, 1.15, z - 0.9, x + 1.0, 1.75, z + 0.9);
      box(b, lam("carGlass", () => ({ color: "#3a4a62" })), x - 1.15, 1.2, z - 0.92, x + 0.95, 1.68, z + 0.92);
      for (const sx of [-1.4, 1.4]) for (const sz of [-0.95, 0.95]) b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18).rotateX(Math.PI / 2), lam("tyre", () => ({ color: "#24262e" })), M4(x + sx, 0.36, z + sz));
    });
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#9aa07a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);

    // ---- the restaurant: unlit red / yellow so it keeps its colour in the grey street ----
    const red = glow(RED, 0.95), redDark = glow("#a81c24", 0.95), yel = glow(YEL, 1.0);
    gbox(R, red, -SIDE, 0, -9, SIDE, 3.4, FRONT - 0.05);
    gbox(R, yel, -SIDE - 0.25, 3.4, -9.2, SIDE + 0.25, 4.4, FRONT + 0.25);              // the yellow roof band
    gbox(R, redDark, -SIDE - 0.3, 4.4, -9.3, SIDE + 0.3, 4.6, FRONT + 0.3);
    gbox(R, glow("#ffffff", 0.85), -SIDE, 0, FRONT - 0.05, SIDE, 0.35, FRONT + 0.1);
    this.roofMat = glow("#ffffff", 1.25, roofSignTex());
    const rs = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.72), this.roofMat); rs.position.set(0, 5.45, FRONT + 0.32); rs.layers.set(NOINK); R.add(rs);
    gbox(R, redDark, -5.6, 4.55, FRONT + 0.15, 5.6, 6.35, FRONT + 0.3);
    // glass front with the warm inside, the door
    const gl = glow("#ffffff", 1.1, glassFrontTex());
    panel(-6.6, 0.4, DOOR_X - 1.3, 3.2, FRONT + 0.06, gl, R); panel(DOOR_X + 1.3, 0.4, 6.6, 3.2, FRONT + 0.06, gl, R);
    gbox(R, glow("#3a3f4a", 1), DOOR_X - 1.3, 0, FRONT, DOOR_X + 1.3, 2.9, FRONT + 0.08);
    panel(DOOR_X - 1.2, 0.05, DOOR_X + 1.2, 2.8, FRONT + 0.09, glow("#ffffff", 1.2, ctex("doorIn", 64, 64, (g) => { g.fillStyle = "#ffe6a8"; g.fillRect(0, 0, 64, 64); })), R);
    const dg = new THREE.MeshBasicMaterial({ map: doorGlassTex(), transparent: true, opacity: 0.9 });
    for (const s of [-1, 1]) { const d = panel(-0.6, 0.05, 0.6, 2.8, 0, dg, R); d.position.set(DOOR_X + s * 0.6, 1.425, FRONT + 0.14); d.userData.s = s; this.doors.push(d); }
    // a red awning over the door
    gbox(R, yel, DOOR_X - 1.8, 2.95, FRONT, DOOR_X + 1.8, 3.15, FRONT + 1.2);
    // ---- the pole sign + reader board ----
    const sg = this.signGroup; sg.position.set(POLE[0], 0, POLE[2]); R.add(sg);
    const steel = glow("#d0d4da", 0.9);
    for (const dx of [-0.9, 0.9]) { const p = new THREE.Mesh(cyl(0.2, SIGN_Y - 1.6, 16), steel); p.position.set(dx, 0, 0); p.castShadow = true; sg.add(p); }
    this.signMat = glow("#ffffff", 1.3, signTex());
    this.edgeMat = glow(YEL, 1.3);
    const sbox = new THREE.Mesh(UB, [this.edgeMat, this.edgeMat, this.edgeMat, this.edgeMat, this.signMat, this.signMat]);
    sbox.scale.set(5.6, 3.6, 0.6); sbox.position.set(0, SIGN_Y, 0); sbox.castShadow = true; sg.add(sbox);
    this.reader = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.3), glow("#ffffff", 1.25, readerTex(BOARDS[0])));
    for (const s of BOARDS) this.readerMaps[s] = readerTex(s);
    this.reader.position.set(0, BOARD_Y, 0); this.reader.castShadow = true; sg.add(this.reader);
    gbox(sg, glow(RED, 0.9), -1.4, 0, -0.5, 1.4, 0.5, 0.5);
    sg.traverse((o) => o.layers.enable(0));
  }

  // =============== the inside (local coordinates; the group sits at STORE) ===============
  private buildStore(R: THREE.Object3D) {
    const b = new Batch();
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-SIDE, SIDE, BACKW, FRONT, 0, 7, 9), lam("redTiles", () => ({ map: rep(tileTex(), 1, 1) })));
    const redW = lam("inGreen", () => ({ color: "#3f9a5a" })), yelW = lam("inCream", () => ({ color: "#f3e6c4" })), white = lam("inWhite", () => ({ color: "#f4efe4" }));
    // walls: red below, yellow above, a white stripe
    for (const [x0, x1] of [[-SIDE - 0.3, -SIDE], [SIDE, SIDE + 0.3]] as const) { box(b, redW, x0, 0, BACKW, x1, 1.3, FRONT); box(b, white, x0, 1.3, BACKW, x1, 1.45, FRONT); box(b, yelW, x0, 1.45, BACKW, x1, CEIL, FRONT); }
    box(b, lam("kitWall", () => ({ map: rep(kitchenTex(), 4, 1) })), -SIDE, 0, BACKW - 0.3, SIDE, CEIL, BACKW);
    // the glass front (looking out at the street) + door
    panel(-SIDE, 0, SIDE, CEIL, FRONT, glow("#ffffff", 1.2, ctex("frontGlassIn", 512, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#d8eeff"); gr.addColorStop(0.6, "#bfe0f6"); gr.addColorStop(1, "#a9aeb6"); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
      g.fillStyle = "#8d8a86"; g.fillRect(0, 120, 512, 80); g.fillStyle = "#3a3f4a"; for (let k = 0; k <= 8; k++) g.fillRect(k * 64 - 3, 0, 6, 256); g.fillRect(0, 0, 512, 8);
      g.fillStyle = "#ffffff"; g.font = `40px ${ANTON}`; g.textAlign = "center"; g.fillText("EXIT", 314, 30);
    })), R, Math.PI);
    // ceiling + bright panels
    box(b, lam("ceil", () => ({ color: "#f2efe8" })), -SIDE, CEIL, BACKW, SIDE, CEIL + 0.1, FRONT);
    const strip = glow("#fffaf0", 2.8);
    for (let x = -4.5; x <= 4.5; x += 3) for (let z = -7.5; z < FRONT - 1; z += 3) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), strip); m.rotation.x = Math.PI / 2; m.position.set(x, CEIL - 0.01, z); m.layers.set(NOINK); R.add(m); }
    // ---- the counter, registers, tray stack ----
    box(b, redW, COUNTER_X0, 0, COUNTER_Z - 0.8, COUNTER_X1, 1.0, COUNTER_Z);
    box(b, yelW, COUNTER_X0, 0.55, COUNTER_Z - 0.02, COUNTER_X1, 0.75, COUNTER_Z + 0.01);
    box(b, lam("counterTop", () => ({ color: "#e9e6e0" })), COUNTER_X0 - 0.05, 1.0, COUNTER_Z - 0.85, COUNTER_X1 + 0.05, 1.07, COUNTER_Z + 0.05);
    for (const x of [-4.5]) {
      box(b, lam("register", () => ({ color: "#2a2f3a" })), x - 0.25, 1.07, COUNTER_Z - 0.6, x + 0.25, 1.3, COUNTER_Z - 0.25);
      box(b, lam("regScr", () => ({ color: "#2bd96b" })), x - 0.2, 1.3, COUNTER_Z - 0.5, x + 0.2, 1.52, COUNTER_Z - 0.46);
    }
    for (let k = 0; k < 6; k++) box(b, lam("trayStack", () => ({ color: "#2f8a4a" })), -3.3, 1.07 + k * 0.03, COUNTER_Z - 0.5, -2.8, 1.09 + k * 0.03, COUNTER_Z - 0.15);
    // a partition wall right of the counter with the NOW SERVING board
    box(b, white, COUNTER_X1 + 0.3, 0, COUNTER_Z - 0.4, SIDE, CEIL, COUNTER_Z - 0.1);
    box(b, redW, COUNTER_X1 + 0.3, 0, COUNTER_Z - 0.1, SIDE, 1.3, COUNTER_Z - 0.05);
    const nb = panel(-0.75, -0.42, 0.75, 0.42, 0, glow("#ffffff", 1.2, ctex("nowServing", 512, 288, (g) => { g.fillStyle = "#16121c"; g.fillRect(0, 0, 512, 288); g.strokeStyle = YEL; g.lineWidth = 12; g.strokeRect(8, 8, 496, 272); T(g, "NOW SERVING", 256, 56, 56, YEL); })), R);
    nb.position.set(NUMBER_BOARD[0], NUMBER_BOARD[1], NUMBER_BOARD[2]);
    const rr = panel(-0.9, -0.22, 0.9, 0.22, 0, new THREE.MeshLambertMaterial({ map: boardTex("RESTROOMS →", "#2a2f3a", "#ffffff", 1024, 110) }), R); rr.position.set(5.4, 2.3, COUNTER_Z - 0.04);
    // menu boards hanging over the counter
    for (let k = 0; k < 3; k++) {
      const m = glow("#ffffff", 1.25, menuTex(k)); this.menuMats.push(m); this.menuMaps.push([menuTex(k, 0), menuTex(k, 1), menuTex(k, 2), menuTex(k, 3)]);
      const p = panel(-1.25, -0.62, 1.25, 0.62, 0, m, R); p.position.set(-5.0 + k * 2.6, 2.85, COUNTER_Z - 0.55);
    }
    box(b, lam("menuBar", () => ({ color: "#2a2f3a" })), COUNTER_X0, 3.5, COUNTER_Z - 0.6, COUNTER_X1, 3.55, COUNTER_Z - 0.5);
    // ---- the kitchen: grill, fryer, hood ----
    const steel = lam("steel", () => ({ color: "#b8c0c8" }));
    const [gx, , gz] = GRILL;
    box(b, steel, gx - 1.2, 0, gz - 0.5, gx + 1.2, 0.9, gz + 0.5);
    this.grillMat = glow("#ff7a2a", 1.4);
    const gt = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.85), this.grillMat); gt.rotation.x = -Math.PI / 2; gt.position.set(gx, 0.91, gz); R.add(gt);
    box(b, steel, gx - 1.4, 2.4, gz - 0.9, gx + 1.4, 3.0, gz + 0.6);
    box(b, steel, gx + 1.6, 0, gz - 0.5, gx + 2.8, 0.95, gz + 0.5);
    const oil = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), glow("#ffd23f", 1.3)); oil.rotation.x = -Math.PI / 2; oil.position.set(gx + 2.2, 0.96, gz); R.add(oil);
    for (let k = 0; k < 6; k++) b.add(cyl(0.18, 0.06, 18), lam("patty", () => ({ color: "#6b2a12" })), M4(gx - 0.8 + (k % 3) * 0.8, 0.92, gz - 0.2 + Math.floor(k / 3) * 0.4));
    box(b, steel, -6.8, 0, -8.8, -5.2, 1.9, -7.9);          // fridge
    box(b, steel, 0, 0, -8.8, 1.0, 1.0, -6.2);               // prep table
    // ---- tables + hard plastic stools ----
    const top = lam("tableTop", () => ({ color: "#f4efe4" })), ped = lam("tablePed", () => ({ color: "#3a3f4a" }));
    const stR = lam("stoolGreen", () => ({ color: "#2f8a4a" })), stY = lam("stoolYel", () => ({ color: "#ffc928" }));
    TABLES.forEach(([x, z], i) => {
      box(b, top, x - 0.6, 0.72, z - 0.42, x + 0.6, 0.77, z + 0.42);
      box(b, ped, x - 0.06, 0, z - 0.06, x + 0.06, 0.72, z + 0.06);
      for (const sz of [-0.68, 0.68]) for (const sx of [-0.3, 0.3]) {
        const m = (i + (sx > 0 ? 1 : 0) + (sz > 0 ? 1 : 0)) % 2 ? stR : stY;
        b.add(cyl(0.2, 0.06, 20), m, M4(x + sx, 0.42, z + sz)); b.add(cyl(0.04, 0.42, 8), ped, M4(x + sx, 0, z + sz));
      }
    });
    // Max's tray
    this.tray = new THREE.Group();
    const tb = new Batch();
    box(tb, lam("tray", () => ({ color: "#c0242e" })), -0.26, 0, -0.18, 0.26, 0.03, 0.18);
    box(tb, lam("fryBox", () => ({ color: "#d8262e" })), 0.08, 0.03, -0.1, 0.2, 0.2, 0.0);
    for (let k = 0; k < 5; k++) box(tb, lam("fries", () => ({ color: "#ffd23f" })), 0.09 + k * 0.022, 0.2, -0.07, 0.105 + k * 0.022, 0.27, -0.055);
    tb.build(this.tray);
    const [tx, tz] = TABLES[MAX_TABLE]; this.tray.position.set(tx, 0.77, tz - 0.05); R.add(this.tray);
    // ---- the speaker, posters, the tray return ----
    gbox(R, new THREE.MeshLambertMaterial({ map: speakerTex() }), SPEAKER[0], SPEAKER[1] - 0.4, SPEAKER[2] - 0.28, SPEAKER[0] + 0.4, SPEAKER[1] + 0.4, SPEAKER[2] + 0.28);
    const P: [string, number, number, number, number][] = [["FRESH!", 0, -SIDE + 0.02, 2.4, -1.2], ["YUM!", 1, -SIDE + 0.02, 2.4, 5.6], ["TRY ME", 1, SIDE - 0.02, 2.4, 0.6], ["TONY'S", 0, SIDE - 0.02, 2.4, 4.4]];
    for (const [s, k, x, y, z] of P) { const m = panel(-0.6, -0.9, 0.6, 0.9, 0, glow("#ffffff", 1.1, posterTex(s, k)), R, x < 0 ? Math.PI / 2 : -Math.PI / 2); m.position.set(x, y, z); }
    box(b, lam("binBody", () => ({ color: "#3a3f4a" })), 5.4, 0, 7.6, 6.6, 1.1, 8.4);
    const ty = panel(-0.5, -0.15, 0.5, 0.15, 0, new THREE.MeshLambertMaterial({ map: boardTex("THANK YOU", "#2f8a4a", "#f6efdc", 1024, 150) }), R, -Math.PI / 2); ty.position.set(5.39, 0.8, 8.0);
    b.build(R);
    // ---- lights: bright warm overheads, an orange grill glow ----
    const L = (x: number, y: number, z: number, col: string, k: number, d: number) => { const l = new THREE.PointLight(col, k, d); l.position.set(x, y, z); R.add(l); this.areaLights.push(l); return l; };
    for (const x of [-4, 3]) for (const z of [-1, 5]) L(x, 3.3, z, "#fff4e0", 9, 10);
    L(gx, 1.8, gz + 0.8, "#ff9a4a", 10, 5);
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
    const t = f / FPS, s = SHOTS[id - 1], golden = s.light === "golden", inStore = s.place === "store";
    this.store.visible = inStore; this.street.visible = !inStore;
    for (const l of this.lamps) (l.material as THREE.MeshBasicMaterial).color.setRGB(golden ? 3.0 : 1.0, golden ? 2.6 : 0.97, golden ? 1.7 : 0.85);
    this.doors.forEach((d) => (d.position.x = DOOR_X + (d.userData.s as number) * 0.6));
    if (!inStore) {
      this.signMat.color.setScalar(golden ? 1.75 : 1.3);
      this.roofMat.color.setScalar(golden ? 1.6 : 1.25);
      this.edgeMat.color.set(YEL).multiplyScalar(golden ? 1.7 : 1.3);
      this.signGroup.rotation.z = 0;
      (this.reader.material as THREE.MeshBasicMaterial).map = this.readerMaps[golden ? "OPEN LATE" : "COMBO $8.99"];
      this.opening.visible = false;
      this.tonySign.color.setScalar(golden ? 1.25 : 1.05);
      this.closed.visible = false; this.lease.visible = false;
      return;
    }
    const v = id === 5 && f >= BT.tried ? 3 : 1;
    this.menuMats.forEach((m, k) => { m.map = this.menuMaps[k][v]; m.color.setScalar(1.25 + (id === 5 && f >= BT.tried && f < BT.tried + 10 ? 0.8 : 0)); });
    this.grillMat.color.set("#ff7a2a").multiplyScalar(1.3 + 0.25 * Math.sin(t * 9) + 0.15 * Math.sin(t * 23));
    this.tray.visible = false;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0);
    if (Math.abs(c.pos[0] - c.look[0]) + Math.abs(c.pos[2] - c.look[2]) < 0.3) cam.up.set(0, 0, -1);
    cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.1; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    cam.layers.enable(NOINK);
    const K = LOOK[s.light], sunDir = this.shotSun(id, s, L), gray = grayAt(id);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = s.place === "store" ? L.sunI * 0.8 : L.sunI * (gray ? 0.8 : 1);
    const inside = s.place === "store";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 14;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce);
    TONE.uSat.value = gray ? 0.06 : inside ? 1.15 : K.sat;
    if (gray) { TONE.uLitCol.value.set(1.25, 1.25, 1.28); TONE.uShadeCol.value.set(0.42, 0.42, 0.46); }
    if (inside) { TONE.uShadeCol.value.set(0.6, 0.58, 0.58); TONE.uLitCol.value.set(1.5, 1.47, 1.42); }
    if (s.sepia) { TONE.uSat.value = 0.12; TONE.uLitCol.value.set(1.55, 1.36, 1.05); TONE.uShadeCol.value.set(0.62, 0.52, 0.4); }
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    if (inside) CHAR.uCharTint.value.set(1.0, 0.98, 0.95);
    if (s.sepia) CHAR.uCharTint.value.set(1.0, 0.86, 0.66);
    // sky (grey and flat in the grey shots)
    const su = this.skyMat.uniforms;
    const skyC = gray ? ["#c3c6cc", "#b8bcc4", "#aeb2ba", "#a4a8b0", "#9a9ea6"] : K.sky.c;
    skyC.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(gray ? "#b8bcc4" : L.fog, this.fog.color); this.fog.near = inside ? 80 : L.fogNear; this.fog.far = inside ? 500 : Math.max(L.fogFar, 520);
    scene.fog = this.fog; scene.background = null;
    const drift = t * 0.004;
    for (let i = 0; i < this.clouds.length; i++) {
      const m = this.clouds[i], a = m.userData.a + drift;
      m.position.set(Math.cos(a) * m.userData.d, m.userData.h, Math.sin(a) * m.userData.d);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      const mm = m.material as THREE.MeshBasicMaterial;
      mm.map = this.cloudMaps[s.light][i % 4]; mm.color.setScalar(gray ? 0.85 : 1.1);
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
void clamp01;
