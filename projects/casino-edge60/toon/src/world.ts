// The world of "How casinos make money (and their one weakness)" as one three.js scene (Pisa engine): a boulevard
// with a generic casino (marquee sign with chasing bulbs, entrance canopy, hotel tower behind); two insert sets far
// away (the casino floor with a roulette table, slot machines and a blackjack table; the money stage = a giant
// roulette wheel with 38 chips). update(id, f, camera) poses everything for shot `id` at frame f. Sky, light rig,
// clouds, character cards and the post chain are the bridge / Pisa engine's.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { staticFile } from "remotion";
import { Batch, V, lam, quad, Kit, prop, setSight } from "./build";
import { ctex, rep, stoneHD, grassHD, cloudHD } from "./paint";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { NOINK } from "./ink";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, camAt, smooth, clamp01, ShotDef, CAS, CW, CD, CH_, WALK_Z, ROAD_Z, FLOOR, STAGE, BT, TABLE, WHEEL, ORDER, REDS,
  SW_R, SW_POCKET_R, PILE_S, VAULT_S, MAX_S, GREEN_POCKETS, WIN_POCKET, V3, add } from "./story";

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
const ANTON = "Anton, Impact, sans-serif";
const asphaltTex = () => ctex("asphalt", 1024, 1024, (g, r) => {
  g.fillStyle = "#6c6f7a"; g.fillRect(0, 0, 1024, 1024);
  for (let k = 0; k < 3000; k++) { g.fillStyle = r() < 0.5 ? "rgba(40,40,50,0.18)" : "rgba(200,200,210,0.12)"; g.fillRect(r() * 1024, r() * 1024, 3, 3); }
});
const boardTex = (text: string, bg: string, fg = "#ffffff", w = 1024) => ctex("board" + text + bg + fg, w, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, 256);
  g.fillStyle = fg; g.font = `150px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, 136);
});
/** glowing marquee letters on transparent ground */
const neonTex = (text: string, fg: string, w = 1024, size = 190) => ctex("neon" + text + fg, w, 256, (g) => {
  g.clearRect(0, 0, w, 256);
  g.font = `${size}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 16; g.strokeStyle = "#7a1030"; g.strokeText(text, w / 2, 136);
  g.fillStyle = fg; g.fillText(text, w / 2, 136);
});
/** the roulette wheel seen from above: 38 pockets in American order, pocket k centred at canvas angle -90 + k * 360/38 */
export const wheelTex = (big: boolean) => ctex("wheel" + (big ? "B" : "S"), 1024, 1024, (g) => {
  const c = 512, R0 = 500, R1 = 470, R2 = 330, R3 = 250;
  g.fillStyle = "#6b3a1f"; g.beginPath(); g.arc(c, c, R0, 0, 7); g.fill();
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(c, c, R1 + 8, 0, 7); g.fill();
  const n = ORDER.length, da = (Math.PI * 2) / n;
  for (let k = 0; k < n; k++) {
    const a = -Math.PI / 2 + k * da, lbl = ORDER[k];
    g.fillStyle = lbl === "0" || lbl === "00" ? "#1f9a4a" : REDS.has(lbl) ? "#c8262f" : "#1d1d26";
    g.beginPath(); g.moveTo(c + R2 * Math.cos(a - da / 2), c + R2 * Math.sin(a - da / 2)); g.arc(c, c, R1, a - da / 2, a + da / 2); g.arc(c, c, R2, a + da / 2, a - da / 2, true); g.fill();
    g.strokeStyle = "#e8c45a"; g.lineWidth = 4;
    g.beginPath(); g.moveTo(c + R2 * Math.cos(a - da / 2), c + R2 * Math.sin(a - da / 2)); g.lineTo(c + R1 * Math.cos(a - da / 2), c + R1 * Math.sin(a - da / 2)); g.stroke();
    g.save(); g.translate(c + (R1 - 48) * Math.cos(a), c + (R1 - 48) * Math.sin(a)); g.rotate(a + Math.PI / 2);
    g.fillStyle = "#ffffff"; g.font = `${big ? 50 : 54}px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lbl, 0, 0); g.restore();
  }
  g.strokeStyle = "#e8c45a"; g.lineWidth = 8; g.beginPath(); g.arc(c, c, R2, 0, 7); g.stroke();
  const gr = g.createRadialGradient(c, c, 20, c, c, R2); gr.addColorStop(0, "#f4d98a"); gr.addColorStop(0.5, "#8a5a2a"); gr.addColorStop(1, "#5a3418");
  g.fillStyle = gr; g.beginPath(); g.arc(c, c, R2 - 4, 0, 7); g.fill();
  g.strokeStyle = "#e8c45a"; g.lineWidth = 10;
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.3; g.beginPath(); g.moveTo(c, c); g.lineTo(c + R3 * Math.cos(a), c + R3 * Math.sin(a)); g.stroke(); }
  g.fillStyle = "#e8c45a"; g.beginPath(); g.arc(c, c, 46, 0, 7); g.fill();
});
/** roulette table felt: 0 / 00 column and a 3 x 12 number grid, plus outside bets */
const feltTex = () => ctex("felt", 1536, 512, (g) => {
  g.fillStyle = "#1f7a44"; g.fillRect(0, 0, 1536, 512);
  const x0 = 180, y0 = 60, cw = 100, ch = 110;
  g.strokeStyle = "#f4f1e6"; g.lineWidth = 5;
  for (const [lbl, y, h] of [["0", y0, ch * 1.5], ["00", y0 + ch * 1.5, ch * 1.5]] as [string, number, number][]) {
    g.strokeRect(x0 - 110, y, 110, h); g.fillStyle = "#f4f1e6"; g.font = `64px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lbl, x0 - 55, y + h / 2);
  }
  for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) {
    const n = i * 3 + (3 - j), x = x0 + i * cw, y = y0 + j * ch;
    g.strokeRect(x, y, cw, ch);
    g.fillStyle = REDS.has(String(n)) ? "#d0303a" : "#1d1d26"; g.beginPath(); g.ellipse(x + cw / 2, y + ch / 2, 36, 40, 0, 0, 7); g.fill();
    g.fillStyle = "#ffffff"; g.font = `46px ${ANTON}`; g.fillText(String(n), x + cw / 2, y + ch / 2 + 2);
  }
  const lab = ["1-18", "EVEN", "RED", "BLACK", "ODD", "19-36"];
  lab.forEach((t, k) => { const x = x0 + k * 200, y = y0 + 3 * ch + 14; g.strokeRect(x, y, 200, 90); g.fillStyle = t === "RED" ? "#d0303a" : t === "BLACK" ? "#1d1d26" : "#f4f1e6"; g.font = `44px ${ANTON}`; g.fillText(t, x + 100, y + 47); });
});
const carpetTex = () => ctex("carpet", 512, 512, (g) => {
  g.fillStyle = "#7a1f35"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const x = i * 128 + 64, y = j * 128 + 64;
    g.strokeStyle = "#d9a441"; g.lineWidth = 6; g.beginPath(); g.moveTo(x, y - 40); g.lineTo(x + 40, y); g.lineTo(x, y + 40); g.lineTo(x - 40, y); g.closePath(); g.stroke();
    g.fillStyle = "#2f5aa0"; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
    g.fillStyle = "#5a1428"; g.beginPath(); g.arc(i * 128, j * 128, 18, 0, 7); g.fill();
  }
});
const slotTex = (k: number) => ctex("slot" + k, 256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#2a1a5e"); gr.addColorStop(1, "#5a2a9e"); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const sym = [["7", "#ff3b4e"], ["$", "#2bd96b"], ["★", "#ffd23f"], ["7", "#ff3b4e"], ["♦", "#3fd8ff"]];
  for (let r = 0; r < 3; r++) {
    g.fillStyle = "#fff8e6"; g.fillRect(18 + r * 76, 70, 68, 110);
    const [t, c] = sym[(k + r * 2) % sym.length]; g.fillStyle = c; g.font = `80px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, 52 + r * 76, 128);
  }
  g.fillStyle = "#ffd23f"; g.font = `40px ${ANTON}`; g.textAlign = "center"; g.fillText("JACKPOT", 128, 40);
  g.fillStyle = "#3fd8ff"; g.fillRect(30, 205, 196, 26);
});
const windowsTex = (base: string, lit: string) => ctex("win" + base, 256, 256, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = r() < 0.45 ? lit : "#2b3348"; g.fillRect(i * 64 + 12, j * 64 + 14, 40, 38); }
});
const chipTopTex = (col: string) => ctex("chip" + col, 256, 256, (g) => {
  g.fillStyle = col; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill();
  g.fillStyle = "#ffffff"; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.save(); g.translate(128 + 104 * Math.cos(a), 128 + 104 * Math.sin(a)); g.rotate(a); g.fillRect(-10, -18, 20, 36); g.restore(); }
  g.strokeStyle = "#ffffff"; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 70, 0, 7); g.stroke();
  g.fillStyle = "#ffffff"; g.font = `72px ${ANTON}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$1", 128, 132);
});
const chipSideTex = (col: string) => ctex("chipS" + col, 256, 32, (g) => {
  g.fillStyle = col; g.fillRect(0, 0, 256, 32); g.fillStyle = "#ffffff"; for (let k = 0; k < 8; k++) g.fillRect(k * 32 + 8, 0, 14, 32);
});

const UB = new THREE.BoxGeometry(1, 1, 1);
const cyl = (r: number, h: number, seg = 32, rt = r) => new THREE.CylinderGeometry(rt, r, h, seg, 1).translate(0, h / 2, 0);
const M4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), ry), V(sx, sy, sz));
const box = (b: Batch, m: THREE.Material, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => b.add(UB, m, M4((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, x1 - x0, y1 - y0, z1 - z0));
const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], parent: THREE.Object3D) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
/** unlit glowing material (HDR colour so the bloom picks it up) */
const glow = (col: string, k: number, map?: THREE.Texture, transparent = false) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), map: map ?? null, transparent, depthWrite: !transparent, fog: false, toneMapped: true });
const wheelGeo = (r: number) => new THREE.CircleGeometry(r, 96).rotateX(-Math.PI / 2);
/** bulbs along a rectangle outline in the xy plane at z (instanced, chase-animated in update) */
type Bulbs = { m: THREE.InstancedMesh; n: number; phase: number };

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
  private bulbs: Bulbs[] = [];
  private tableWheel!: THREE.Mesh; private ball!: THREE.Mesh;
  private bigWheel!: THREE.Mesh; private chips: THREE.Mesh[] = [];
  private vaultLid!: THREE.Mesh;
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
    this.boulevard(R, kit);
    this.floorSet(R);
    this.stageSet(R);
  }

  // =============== the boulevard and the casino ===============
  private boulevard(R: THREE.Object3D, kit: Kit) {
    const b = new Batch();
    const grass = lam("grassHD", () => ({ map: rep(grassHD(), 1, 1) }));
    const path = lam("pathStone", () => ({ map: stoneHD("copeHD") }));
    const asph = lam("asphalt", () => ({ map: rep(asphaltTex(), 1, 1) }));
    const yellow = lam("roadLine", () => ({ color: "#f2c94c" })), curb = lam("curb", () => ({ color: "#c9c4ba" }));
    const flat = (x0: number, x1: number, z0: number, z1: number, y: number, u: number, v: number) => quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), u, v);
    b.add(flat(-300, 300, -300, 300, 0, 150, 150), grass);
    b.add(flat(-60, 60, -30, WALK_Z - 0.8, 0.01, 30, 11), path);                     // plaza in front of / around the casino
    b.add(flat(-300, 300, ROAD_Z - 3.5, ROAD_Z + 3.5, 0.012, 60, 1), asph);
    b.add(flat(-300, 300, WALK_Z - 0.8, WALK_Z + 0.7, 0.02, 120, 1), path);
    b.add(flat(-300, 300, ROAD_Z + 3.6, ROAD_Z + 5.2, 0.02, 120, 1), path);
    for (let x = -300; x < 300; x += 6) b.add(flat(x, x + 3, ROAD_Z - 0.09, ROAD_Z + 0.09, 0.016, 1, 1), yellow);
    box(b, curb, -300, 0, ROAD_Z - 3.62, 300, 0.14, ROAD_Z - 3.45); box(b, curb, -300, 0, ROAD_Z + 3.45, 300, 0.14, ROAD_Z + 3.62);
    // red carpet from the doors to the sidewalk
    b.add(flat(-1.6, 1.6, CD / 2, WALK_Z - 0.8, 0.03, 1, 1), lam("redCarpet", () => ({ color: "#b3203a" })));
    // ---- the casino hall ----
    const hw = CW / 2, hd = CD / 2;
    const wall = lam("casWall", () => ({ color: "#5b2f7a" })), trim = lam("gold", () => ({ color: "#e2b53e" })), base = lam("casBase", () => ({ color: "#2d1a3e" }));
    box(b, base, -hw, 0, -hd, hw, 1.2, hd);
    box(b, wall, -hw + 0.05, 1.2, -hd + 0.05, hw - 0.05, CH_, hd - 0.05);
    box(b, trim, -hw - 0.3, CH_, -hd - 0.3, hw + 0.3, CH_ + 0.6, hd + 0.3);
    box(b, lam("casRoof", () => ({ color: "#d9d4c8" })), -hw - 0.15, CH_ + 0.6, -hd - 0.15, hw + 0.15, CH_ + 0.65, hd + 0.15);
    for (let k = -4; k <= 4; k++) if (Math.abs(k) > 1) box(b, trim, k * 2.7 - 0.22, 1.2, hd - 0.05, k * 2.7 + 0.22, CH_, hd + 0.25);   // pilasters
    // arched windows (warm glow) between the pilasters
    const winG = lam("casWin", () => ({ map: windowsTex("#3a1f52", "#ffcf7a") }));
    for (let k = -4; k < 4; k++) { const x = k * 2.7 + 1.35; if (Math.abs(x) < 3) continue; b.add(quad(V(x - 0.9, 2.2, hd + 0.01), V(x + 0.9, 2.2, hd + 0.01), V(x + 0.9, 6.6, hd + 0.01), V(x - 0.9, 6.6, hd + 0.01), 1, 2), winG); }
    // entrance: gold doors under a canopy on two columns
    box(b, trim, -2.6, 0, hd - 0.02, 2.6, 3.6, hd + 0.08);
    for (const x of [-1.25, 1.25]) b.add(quad(V(x - 1.1, 0.05, hd + 0.1), V(x + 1.1, 0.05, hd + 0.1), V(x + 1.1, 3.35, hd + 0.1), V(x - 1.1, 3.35, hd + 0.1)), lam("doorGlass", () => ({ color: "#ffd98a" })));
    box(b, trim, -0.08, 0.05, hd + 0.1, 0.08, 3.35, hd + 0.14);
    box(b, lam("canopy", () => ({ color: "#2d1a3e" })), -3.6, 4.1, hd, 3.6, 4.6, hd + 3.4);
    box(b, trim, -3.7, 4.05, hd + 3.3, 3.7, 4.65, hd + 3.5);
    for (const x of [-3.2, 3.2]) b.add(cyl(0.22, 4.1, 20), trim, M4(x, 0, hd + 3.1));
    // the hotel tower behind and two neighbours
    const tw = lam("towerWin", () => ({ map: rep(windowsTex("#c9b8d8", "#ffe2a8"), 1, 1) }));
    const tower = (x: number, z: number, w: number, d: number, h: number, mat: THREE.Material, top: THREE.Material) => {
      b.add(UB, mat, M4(x, h / 2, z, w, h, d)); box(b, top, x - w / 2 - 0.2, h, z - d / 2 - 0.2, x + w / 2 + 0.2, h + 0.8, z + d / 2 + 0.2);
    };
    const tw2 = lam("towerWin2", () => ({ map: rep(windowsTex("#9cc4d8", "#fff2c8"), 1, 1) })), tw3 = lam("towerWin3", () => ({ map: rep(windowsTex("#e2b8a0", "#ffe2a8"), 1, 1) }));
    // tower faces need repeats: use per-face quads instead of a stretched box texture
    const facade = (x: number, z: number, w: number, d: number, h: number, mat: THREE.Material, top: THREE.Material) => {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2, ru = w / 4, rd = d / 4, rv = h / 4;
      b.add(quad(V(x0, 0, z1), V(x1, 0, z1), V(x1, h, z1), V(x0, h, z1), ru, rv), mat);
      b.add(quad(V(x1, 0, z1), V(x1, 0, z0), V(x1, h, z0), V(x1, h, z1), rd, rv), mat);
      b.add(quad(V(x0, 0, z0), V(x0, 0, z1), V(x0, h, z1), V(x0, h, z0), rd, rv), mat);
      b.add(quad(V(x1, 0, z0), V(x0, 0, z0), V(x0, h, z0), V(x1, h, z0), ru, rv), mat);
      box(b, top, x0 - 0.2, h, z0 - 0.2, x1 + 0.2, h + 0.8, z1 + 0.2);
    };
    void tower;
    facade(CAS[0], -17, 30, 10, 38, tw, trim);
    facade(-34, -8, 14, 12, 26, tw2, lam("towerTop2", () => ({ color: "#3a6a8a" })));
    facade(36, -6, 14, 12, 22, tw3, lam("towerTop3", () => ({ color: "#8a4a3a" })));
    facade(-60, -12, 16, 12, 18, tw3, lam("towerTop3", () => ({ color: "#8a4a3a" })));
    facade(62, -14, 16, 12, 30, tw2, lam("towerTop2", () => ({ color: "#3a6a8a" })));
    // palms / trees along the sidewalk and planters by the entrance
    const trees: [number, number, number][] = [[-9, WALK_Z - 1.6, 6.5], [9, WALK_Z - 1.6, 6.5], [-17, WALK_Z - 1.6, 7], [17, WALK_Z - 1.6, 7], [-26, WALK_Z - 1.6, 7.5], [26, WALK_Z - 1.6, 6.8], [0, ROAD_Z + 7.5, 7.5], [-14, ROAD_Z + 7.5, 7], [14, ROAD_Z + 7.5, 7.2]];
    trees.forEach(([x, z, h], i) => prop(b, kit, ["tree_cone", "tree_fat", "tree_default", "tree_oak"][i % 4], x, 0, z, h, i * 1.3));
    for (const x of [-5.2, 5.2]) box(b, lam("planter", () => ({ color: "#8a8f99" })), x - 0.6, 0, hd + 0.4, x + 0.6, 0.7, hd + 1.6);
    for (const x of [-5.2, 5.2]) prop(b, kit, "plant_bushDetailed", x, 0.7, hd + 1.0, 1.0, x);
    b.build(R);
    const hillM = lam("hills", () => ({ color: "#9a7a8a" })), hb = new Batch();
    for (let i = 0; i < 9; i++) { const g = new THREE.ConeGeometry(70 + (i % 3) * 25, 50 + (i % 4) * 18, 7, 1); g.translate(0, (50 + (i % 4) * 18) / 2, 0); hb.add(g, hillM, M4(-320 + i * 95, -4, -420 - (i % 3) * 60, 1.8, 1, 1)); }
    hb.build(R, false);
    // ---- the marquee: CASINO letters on a dark board, framed by chasing bulbs; a smaller one on the canopy ----
    const boardY = CH_ + 3.0, boardW = 17, boardH = 3.6, bz = hd - 0.6;
    const bd = mesh(UB, lam("signBoard", () => ({ color: "#1e1030" })), R); bd.scale.set(boardW, boardH, 0.5); bd.position.set(0, boardY, bz);
    for (const x of [-5, 5]) { const p = mesh(cyl(0.18, boardY - boardH / 2 - CH_ + 0.2, 12), trim, R); p.position.set(x, CH_ + 0.6, bz - 0.1); }
    const letters = new THREE.Mesh(new THREE.PlaneGeometry(boardW - 1.2, (boardW - 1.2) / 4), glow("#ffd76a", 2.4, neonTex("CASINO", "#fff1b8", 1024, 200), true));
    letters.position.set(0, boardY - 0.15, bz + 0.27); letters.layers.set(NOINK); R.add(letters);
    this.addBulbs(R, 0, boardY, bz + 0.3, boardW - 0.3, boardH - 0.3, 0.38, 0);
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.6), glow("#ff5a8a", 2.2, neonTex("OPEN 24/7", "#ffd0e0", 1024, 170), true));
    cl.position.set(0, 4.35, hd + 3.52); cl.layers.set(NOINK); R.add(cl);
    this.addBulbs(R, 0, 4.35, hd + 3.53, 7.2, 0.0001, 0.42, 3);
  }
  /** instanced bulbs around a w x h rectangle centred at (x, y) in the plane z = z (h ~ 0: one row) */
  private addBulbs(R: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, step: number, phase: number) {
    const pts: V3[] = [];
    const nx = Math.round(w / step), ny = Math.round(h / step);
    for (let i = 0; i <= nx; i++) pts.push([x - w / 2 + (i * w) / nx, y + h / 2, z]);
    if (ny > 0) {
      for (let j = 1; j <= ny; j++) pts.push([x + w / 2, y + h / 2 - (j * h) / ny, z]);
      for (let i = nx - 1; i >= 0; i--) pts.push([x - w / 2 + (i * w) / nx, y - h / 2, z]);
      for (let j = ny - 1; j >= 1; j--) pts.push([x - w / 2, y - h / 2 + (j * h) / ny, z]);
    }
    const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff", fog: false }), pts.length);
    pts.forEach((p, i) => { m.setMatrixAt(i, new THREE.Matrix4().makeTranslation(...p)); m.setColorAt(i, new THREE.Color(1, 1, 1)); });
    m.layers.set(NOINK); m.frustumCulled = false; R.add(m);
    this.bulbs.push({ m, n: pts.length, phase });
  }

  // =============== the casino floor ===============
  private floorSet(R: THREE.Object3D) {
    const [FX, , FZ] = FLOOR, b = new Batch();
    const P = (x: number, y: number, z: number) => V(FX + x, y, FZ + z);
    const carpet = lam("carpet", () => ({ map: rep(carpetTex(), 1, 1) }));
    b.add(quad(P(-16, 0, 12), P(16, 0, 12), P(16, 0, -7), P(-16, 0, -7), 12, 7), carpet);
    const wallM = lam("floorWall", () => ({ color: "#4a1a2e" })), trim = lam("gold", () => ({ color: "#e2b53e" })), dark = lam("darkWood", () => ({ color: "#3a2216" }));
    box(b, wallM, FX - 16, 0, FZ - 7, FX + 16, 9, FZ - 6.6);
    box(b, trim, FX - 16, 3.3, FZ - 6.62, FX + 16, 3.5, FZ - 6.55);
    box(b, trim, FX - 16, 8.2, FZ - 6.62, FX + 16, 8.4, FZ - 6.55);
    for (const s of [-1, 1]) box(b, wallM, FX + s * 16 - 0.2, 0, FZ - 7, FX + s * 16 + 0.2, 9, FZ + 12);
    // wall panels with soft lamps
    for (let k = -5; k <= 5; k++) box(b, lam("panel", () => ({ color: "#5e2440" })), FX + k * 2.8 - 1.1, 3.8, FZ - 6.58, FX + k * 2.8 + 1.1, 7.7, FZ - 6.54);
    // gold columns
    for (const x of [-8.5, 8.5]) for (const z of [2.5]) { b.add(cyl(0.35, 9, 24), trim, M4(FX + x, 0, FZ + z)); }
    // ---- slot machines along the back wall ----
    for (let k = 0; k < 14; k++) {
      const x = FX - 10.4 + k * 1.6, z = FZ - 5.2;
      box(b, lam("slotBody" + (k % 3), () => ({ color: ["#a8182e", "#2a3a9e", "#7a1a8e"][k % 3] })), x - 0.62, 0, z - 0.45, x + 0.62, 1.95, z + 0.45);
      box(b, trim, x - 0.66, 1.95, z - 0.48, x + 0.66, 2.1, z + 0.48);
      box(b, dark, x - 0.62, 0.95, z + 0.45, x + 0.62, 1.05, z + 0.75);                        // button deck
      b.add(cyl(0.05, 0.6, 10), lam("chrome", () => ({ color: "#cfd6df" })), M4(x + 0.7, 1.2, z));  // lever
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), glow("#ffffff", 1.25, slotTex(k)));
      scr.position.set(x, 1.5, z + 0.46); R.add(scr);
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 10), glow(["#ff4a6a", "#3fd8ff", "#ffd23f"][k % 3], 3));
      top.position.set(x, 2.35, z); top.layers.set(NOINK); R.add(top);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), lam("leverBall", () => ({ color: "#d0303a" })));
      ball.position.set(x + 0.7, 1.85, z); R.add(ball);
    }
    // ---- the roulette table ----
    const [TX, , TZ] = TABLE;
    box(b, dark, FX + TX - 2.5, 0, FZ + TZ - 0.85, FX + TX + 2.5, 0.8, FZ + TZ + 0.85);
    b.add(quad(P(TX - 1.0, 0.84, TZ + 0.75), P(TX + 2.4, 0.84, TZ + 0.75), P(TX + 2.4, 0.84, TZ - 0.75), P(TX - 1.0, 0.84, TZ - 0.75)), lam("felt", () => ({ map: feltTex() })));
    b.add(quad(P(TX - 2.4, 0.83, TZ + 0.75), P(TX - 1.0, 0.83, TZ + 0.75), P(TX - 1.0, 0.83, TZ - 0.75), P(TX - 2.4, 0.83, TZ - 0.75)), lam("feltPlain", () => ({ color: "#1f7a44" })));
    for (const [x0, x1, z0, z1] of [[-2.55, 2.55, 0.75, 0.95], [-2.55, 2.55, -0.95, -0.75], [-2.55, -2.4, -0.75, 0.75], [2.4, 2.55, -0.75, 0.75]])
      box(b, lam("rail", () => ({ color: "#6b3a1f" })), FX + TX + x0, 0.8, FZ + TZ + z0, FX + TX + x1, 0.92, FZ + TZ + z1);
    const [WX, WY, WZ] = WHEEL;
    b.add(cyl(0.7, 0.16, 48, 0.66), lam("bowl", () => ({ color: "#6b3a1f" })), M4(FX + WX, 0.8, FZ + WZ));
    this.tableWheel = mesh(wheelGeo(0.6), new THREE.MeshLambertMaterial({ map: wheelTex(false) }), R);
    this.tableWheel.position.set(FX + WX, WY + 0.05, FZ + WZ); this.tableWheel.castShadow = false;
    const spindle = mesh(new THREE.ConeGeometry(0.07, 0.16, 16).translate(0, 0.08, 0), twoTone(new THREE.MeshPhongMaterial({ color: "#e8c45a", specular: "#fff0b0", shininess: 60 }), 0.15), this.tableWheel);
    spindle.position.y = 0; spindle.rotation.x = Math.PI / 2;
    this.ball = mesh(new THREE.SphereGeometry(0.035, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" }), R);
    // chip stacks on the table (Max's)
    const chipM = [lam("chipSide", () => ({ map: chipSideTex("#d63a3a") })), lam("chipTop", () => ({ map: chipTopTex("#d63a3a") })), lam("chipTop", () => ({ map: chipTopTex("#d63a3a") }))];
    void chipM;
    // ---- blackjack table (half moon) at the right ----
    const bj = P(5.6, 0, -2.0);
    b.add(new THREE.CylinderGeometry(1.5, 1.5, 0.8, 40, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.4, 0), dark, M4(bj.x, 0, bj.z));
    b.add(new THREE.CylinderGeometry(1.42, 1.42, 0.06, 40, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.82, 0), lam("bjFelt", () => ({ color: "#1f6a9a" })), M4(bj.x, 0, bj.z));
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + 0.3 + k * 0.62; b.add(UB, lam("card", () => ({ color: "#fbf7ee" })), M4(bj.x + 1.0 * Math.sin(a), 0.86, bj.z + 1.0 * Math.cos(a), 0.14, 0.01, 0.2, a)); }
    b.build(R);
    for (const x of [-3, 3]) { const l = new THREE.PointLight("#ffd9a0", 6, 9); l.position.set(FX + x, 4.5, FZ + 1.5); R.add(l); }
  }

  // =============== the money stage: a giant roulette wheel ===============
  private stageSet(R: THREE.Object3D) {
    const [SX, , SZ] = STAGE, b = new Batch();
    b.add(cyl(9.5, 0.5, 72), lam("stageTop", () => ({ color: "#3a1f52" })), M4(SX, -0.5, SZ));
    b.add(cyl(9.8, 0.2, 72), lam("gold", () => ({ color: "#e2b53e" })), M4(SX, -0.5, SZ));
    b.add(cyl(SW_R + 0.35, 0.12, 96), lam("bowl", () => ({ color: "#6b3a1f" })), M4(SX, 0, SZ));
    // the HOUSE vault behind the wheel
    const [VX, , VZ] = add(STAGE, VAULT_S);
    box(b, lam("vault", () => ({ color: "#5a6272" })), VX - 0.9, 0, VZ - 0.7, VX + 0.9, 1.9, VZ + 0.7);
    box(b, lam("gold", () => ({ color: "#e2b53e" })), VX - 1.0, 1.9, VZ - 0.8, VX + 1.0, 2.05, VZ + 0.8);
    b.add(quad(V(VX - 0.85, 0.8, VZ + 0.72), V(VX + 0.85, 0.8, VZ + 0.72), V(VX + 0.85, 1.36, VZ + 0.72), V(VX - 0.85, 1.36, VZ + 0.72)), lam("houseBoard", () => ({ map: boardTex("HOUSE", "#b3203a") })));
    // Max's tray (where his chips stack)
    const [PX, , PZ] = add(STAGE, PILE_S);
    box(b, lam("tray", () => ({ color: "#2b2e35" })), PX - 1.2, 0, PZ - 0.45, PX + 1.2, 0.08, PZ + 0.45);
    b.build(R);
    this.bigWheel = mesh(wheelGeo(SW_R), new THREE.MeshLambertMaterial({ map: wheelTex(true) }), R);
    this.bigWheel.position.set(SX, 0.13, SZ); this.bigWheel.castShadow = false;
    const chipMat = [twoTone(new THREE.MeshLambertMaterial({ map: rep(chipSideTex("#d63a3a"), 3, 1) })), twoTone(new THREE.MeshLambertMaterial({ map: chipTopTex("#d63a3a") })), twoTone(new THREE.MeshLambertMaterial({ map: chipTopTex("#d63a3a") }))];
    const chipGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.11, 32);
    for (let k = 0; k < ORDER.length; k++) { const c = mesh(chipGeo, chipMat, R); c.visible = false; this.chips.push(c); }
    this.vaultLid = mesh(UB, lam("vault", () => ({ color: "#5a6272" })), R); this.vaultLid.visible = false;
    void MAX_S;
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
    const t = f / FPS, s = SHOTS[id - 1];
    // marquee bulbs chase
    const step = Math.floor(t * 9);
    for (const B of this.bulbs) {
      for (let i = 0; i < B.n; i++) {
        const on = (i + step + B.phase) % 3 === 0;
        this.col.setRGB(on ? 3.2 : 1.0, on ? 2.5 : 0.7, on ? 1.3 : 0.35);
        B.m.setColorAt(i, this.col);
      }
      B.m.instanceColor!.needsUpdate = true;
    }
    // the table wheel spins, the ball runs the other way
    const [FX, , FZ] = FLOOR, [WX, WY, WZ] = WHEEL;
    this.tableWheel.rotation.y = t * 1.7;
    const ba = -t * 4.2;
    this.ball.position.set(FX + WX + 0.47 * Math.cos(ba), WY + 0.09, FZ + WZ + 0.47 * Math.sin(ba));
    // the giant wheel: still while the chips sit on it, then it spins ("every spin")
    const sp = Math.max(0, f - BT.every);
    this.bigWheel.rotation.y = -(sp * sp) / (2 * 40) * 0.06 * (sp < 40 ? 1 : 0) - (sp >= 40 ? (40 * 0.06) / 2 + (sp - 40) * 0.06 : 0);
    // 38 chips: pile -> pockets (bet), the winner hops, 36 back to Max, the two on 0 / 00 to the HOUSE
    const vis = s.place === "stage";
    const [SX, , SZ] = STAGE, P0 = add(STAGE, PILE_S), VA = add(STAGE, VAULT_S);
    const slot = (j: number): V3 => [P0[0] + ((j % 3) - 1) * 0.78, 0.14 + Math.floor(j / 3) * 0.115, P0[2]];
    const pocket = (k: number): V3 => { const a = -Math.PI / 2 + (k * Math.PI * 2) / ORDER.length; return [SX + SW_POCKET_R * Math.cos(a), 0.2, SZ + SW_POCKET_R * Math.sin(a)]; };
    const arcP = (a: V3, b: V3, h: number, u: number): V3 => { const e = smooth(u); return [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e + h * 4 * e * (1 - e), a[2] + (b[2] - a[2]) * e]; };
    let j = 0;
    this.chips.forEach((c, k) => {
      c.visible = vis;
      if (!vis) return;
      const green = GREEN_POCKETS.indexOf(k);
      const rank = green >= 0 ? -1 : j++;
      const b0 = BT.bet + 2 + k * 1.3, r0 = BT.back36 - 12 + rank * 1.0, g0 = BT.keeps + 2 + green * 6;
      let p: V3 = slot(k), spin = 0;
      if (f >= b0) { const u = clamp01((f - b0) / 16); p = arcP(slot(k), pocket(k), 1.8, u); spin = u * Math.PI * 2; }
      if (k === WIN_POCKET && f >= BT.wins && f < BT.wins + 30) p = [p[0], p[1] + 0.9 * Math.abs(Math.sin(((f - BT.wins) / 30) * Math.PI * 2)), p[2]];
      if (green < 0 && f >= r0) { const u = clamp01((f - r0) / 16); p = arcP(pocket(k), slot(rank), 2.0, u); spin = u * Math.PI * 2; }
      if (green >= 0 && f >= g0) { const u = clamp01((f - g0) / 22); p = arcP(pocket(k), [VA[0] + (green ? 0.4 : -0.4), 2.11, VA[2]], 3.2, u); spin = u * Math.PI * 4; }
      c.position.set(...p); c.rotation.set(spin, 0, 0);
    });
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
    const inside = s.place === "floor";
    let Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 6, 95);
    if (inside) Rr = 13;
    if (s.place === "stage") Rr = 12;
    if (id === 6) Rr = Math.max(Rr, 70);
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
