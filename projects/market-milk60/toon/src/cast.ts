// The cast of "Why is the milk at the back of the store?" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, STORE, SAMPLE, BAKERY, SODA_TOWER, LANES, BACKW, DOCK_Z, add } from "./story";
import { maxAt, cartAt } from "./blocking";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

// ---------------- canvas pool ----------------
type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
export type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

// ---------------- sprite meshes ----------------
const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
export const SU = 0.00216; // metres per design unit: 1000 units = 2.16 m
export const SU_SWING = 2.3 / 1830; // swing canvas: rope of 1830 units = 2.3 m
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
/** world roots that hold actors (to find the scene's sun when world.ts does not pass it) */
const ROOTS = new Set<THREE.Object3D>();

/** lit flat character: cardShade() material, receives shadows (dims to the bright floor only), casts its silhouette
 *  when world.ts says so (golden). Drawn after the contact blobs (renderOrder 1). */
export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D, geo: THREE.BufferGeometry = BODY) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    // rim width is in output pixels: tell the card shader the render height (1920 = 1080 x 1920 frame)
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
/** unlit effect card: hard cut-out (ink drawings), soft see-through (dust, mist) or a multiply ground blob */
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false; // A2C + MSAA left 1 px sky-depth seams on blurred far cards (POST)
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      // no mipmaps: at grazing views the mip chain averages the blob with its white surround and it fades out
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    }
    else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

// ---------------- placements ----------------
export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; geo?: "body" | "swing"; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
/** sun = world direction TOWARD the sun (optional: when absent the scene's shadow-casting light is used) */
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;

/** head-shape seed: 7 shapes, so marching soldiers in step still share canvases */
const seedOf = (i: number) => ((i * 5 + 3) % 7) + 1;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design]; sized for the 1440 x 2560 final */
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

// ---------------- light ----------------
const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D) => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => { if (!s && o instanceof THREE.DirectionalLight && o.castShadow) s = o; });
  return s as THREE.DirectionalLight | null;
};
/** the sun of the world that is calling: the attached root whose sun target sits on this camera's view axis */
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
/** canvas angle the sun comes FROM on an upright card facing the camera, in 45-degree steps (small texture cache) */
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};

/** front / side view and mirroring for someone at (x, z) walking along (dx, dz); fs = foreshortening of the walk */
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};

// ---------------- life: blinks and reaction timing ----------------
/** reference expression and action changes land 0-3 f before the word onset */
const LEAD = 2 / FPS;
/** eyelid 0 open .. 1 shut. Reference: gaps 0.5-2.3 s, 4-frame blink half / shut / shut / half, plus a blink across
 *  every expression swap (the shut frames hide the swap) */
const LID = [0.5, 1, 1, 0.5];
const SWAPS: Record<number, number[]> = {};
const lidAt = (t: number, i: number, swaps: number[] = []) => {
  const f = Math.round(t * FPS);
  for (const ts of swaps) { const k = f - Math.round((ts - LEAD) * FPS) + 1; if (k >= 0 && k < 4) return LID[k]; }
  let s = Math.round(-60 * hh(i, 9));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 31 + n, 13)); // next blink 0.5-2.3 s later
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));

type Who = { i: number; o: Outfit; okey: string };
/** one character drawing in the 600 x 1000 design space, sized by distance, lit from the scene's sun */
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, view: { side: boolean; mirror: boolean }, fo: FrontOpts, so: SideOpts, scale = 1): Place & { tierKey: string } => {
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = seedOf(who.i);
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, tierKey: `${w}`,
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
    size: [w, h, k],
  };
};

/** ground shadow under a standing / sitting card (review rounds 2-4), multiply, blue-violet: a TIGHT contact pool right under
 *  the feet (~.5 on screen at the core) so nobody floats, plus by day (cards cast no real shadow) a lighter soft tail
 *  stretched AWAY from the sun, length ~1.6 m / tan(sun elevation), capped. Golden: world.ts casts real card shadows. */
const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1, k = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h; // feet at v = .2 of the card
    const tc = hexOf(TAIL, k);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c,
      w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], k);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc,
    w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

// ---------------- our cast ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
/** Max the shopper: teal hoodie, yellow cap */
const MAX: Outfit = { jacket: "#2fa0a0", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", skin: SKINS[2] };
/** the store manager: green vest, gold buttons, stout */
const MANAGER: Outfit = { jacket: "#1f6a3a", pants: "#1e1e26", boots: "#1e1a18", hat: "hair", hair: "#3a2a1e", buttons: "#f2c33a", skin: SKINS[1], build: "stout" };
/** the free sample lady: orange apron */
const LADY: Outfit = { jacket: "#f4efe6", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#e8742c", skin: SKINS[0] };
/** the cashier: green polo, green cap */
const CASHIER: Outfit = { jacket: "#2fa05a", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#1f6a3a", skin: SKINS[3] };
/** the dock worker: orange safety vest, blue cap */
const WORKER: Outfit = { jacket: "#e8742c", pants: "#3b3f52", boots: "#3a2a1e", hat: "cap", cap: "#2f6fd6", buttons: "#ffd23f", skin: SKINS[1] };
const KIDO: Outfit = { ...KID, jacket: "#7b4fd0" };
const MODERN: Outfit[] = [
  { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] },
  { jacket: "#3fa08a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#5a8fc2", skin: SKINS[1] },
  { jacket: "#e8a84a", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#2f6fd6", skin: SKINS[3] },
  { jacket: "#7b4fd0", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#5a3b2a", skin: SKINS[2] },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1e1a18", dress: "#c0392b", skin: SKINS[3] },
];
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const MX = W(1, MAX, "max"), MG = W(2, MANAGER, "mgr"), LD = W(3, LADY, "lady"), CS = W(4, CASHIER, "cash"), WK = W(5, WORKER, "work"), KD = W(6, KIDO, "kid");
const front = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = 0, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};
const walker = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, dx: number, dz: number, phase: number, expr: Expr, t: number, y = 0, scale = 1, prop: FrontOpts["prop"] = null) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who, x, y, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, who.i), prop }, { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) }, scale));
  blob(out, x, y, z, scale);
};

// ---- effect drawings ----
const txt = (p: Pen, s: string, x: number, y: number, size: number, col: string) => { const g = p.g; g.save(); g.fillStyle = col; g.font = `${size}px Anton, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, x, y); g.restore(); };
const fxLabel = (p: Pen, text: string, bg: string) => {
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  txt(p, text, 256, 84, text.length > 9 ? 66 : text.length > 7 ? 80 : 100, "#ffffff");
};
const fxQuestion = (p: Pen) => { p.ell(150, 150, 130, 130, "#ffd23f", 12); txt(p, "?", 150, 160, 190, INK); };
const fxConfetti = (p: Pen, seed: number) => {
  const g = p.g, cols = ["#ff4a6a", "#ffd23f", "#3fd8ff", "#2bd96b", "#b06ad0", "#ffffff"];
  for (let k = 0; k < 26; k++) { g.save(); g.translate(20 + hh(k, seed) * 460, 20 + hh(k, seed + 1) * 460); g.rotate(hh(k, seed + 2) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-12, -6, 24, 12); g.restore(); }
};
/** wavy "smells good" lines */
const fxSteam = (p: Pen, k: number) => {
  for (let i = 0; i < 3; i++) {
    const pts: [number, number][] = [];
    for (let s = 0; s <= 20; s++) pts.push([70 + i * 60 + 18 * Math.sin(s * 0.6 + k * 0.9 + i), 380 - s * 17]);
    p.stroke(pts, 14, "#ffffff");
  }
};
const fxBread = (p: Pen) => { p.ell(128, 128, 110, 52, "#e0a050", 10); for (const dx of [-50, 0, 50]) p.stroke([[128 + dx - 18, 100], [128 + dx + 18, 150]], 9, "#9a5a22"); };
const fxBag = (p: Pen, col: string) => {
  p.poly([[60, 230], [70, 30], [186, 30], [196, 230]], col, 10);
  p.ell(128, 130, 44, 34, "#ffffff", 0); p.ell(128, 130, 26, 18, "#ffd23f", 0);
};
const fxBox = (p: Pen, col: string) => {
  p.poly([[50, 20], [206, 20], [206, 236], [50, 236]], col, 10);
  p.poly([[66, 36], [190, 36], [190, 70], [66, 70]], "#ffffff", 0);
  for (const dx of [-26, 26]) { p.ell(128 + dx, 130, 22, 26, "#ffffff", 6); p.dot(134 + dx, 136, 10, INK); }
};
const fxSix = (p: Pen, col: string) => {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.poly([[34 + i * 64, 40 + j * 96], [90 + i * 64, 40 + j * 96], [90 + i * 64, 126 + j * 96], [34 + i * 64, 126 + j * 96]], col, 7);
  p.poly([[24, 100], [232, 100], [232, 150], [24, 150]], "#f4f1ea", 7);
  txt(p, "SODA", 128, 128, 40, "#c0242e");
};
const fxCheese = (p: Pen) => { p.poly([[30, 200], [226, 200], [226, 120], [30, 160]], "#ffd23f", 10); p.dot(90, 175, 14, "#e8b020"); p.dot(170, 160, 18, "#e8b020"); };
const fxCandy = (p: Pen) => { p.poly([[50, 90], [206, 90], [206, 166], [50, 166]], "#e23b4e", 10); txt(p, "YUM", 128, 130, 56, "#ffffff"); };
const fxMilk = (p: Pen) => {
  p.poly([[78, 90], [178, 90], [178, 240], [78, 240]], "#ffffff", 10); p.poly([[78, 90], [128, 40], [178, 90]], "#ffffff", 10);
  p.poly([[82, 130], [174, 130], [174, 188], [82, 188]], "#2f6fd6", 0); txt(p, "MILK", 128, 160, 44, "#ffffff");
};
/** the bait: a milk carton hanging on a fishing hook */
const fxBait = (p: Pen) => {
  p.stroke([[128, 0], [128, 170]], 5, "#4a5260");
  p.arc(128, 196, 22, 26, 0, 200, 7, "#8a8f99"); p.stroke([[150, 196], [152, 174]], 7, "#8a8f99");
  p.g.save(); p.g.translate(0, 190); p.poly([[78, 90], [178, 90], [178, 300], [78, 300]], "#ffffff", 10); p.poly([[78, 90], [128, 40], [178, 90]], "#ffffff", 10);
  p.poly([[82, 150], [174, 150], [174, 220], [82, 220]], "#2f6fd6", 0); txt(p, "MILK", 128, 186, 48, "#ffffff"); p.g.restore();
};
/** googly cereal-box eyes, pupils toward the aisle */
const fxEyes = (p: Pen, dx: number) => { for (const x of [80, 176]) { p.ell(x, 128, 44, 54, "#ffffff", 9); p.dot(x + dx * 18, 136, 20, INK); } };
const fxStep = (p: Pen) => { p.ell(96, 150, 34, 60, "rgba(60,64,80,0.55)", 0); p.ell(160, 110, 34, 60, "rgba(60,64,80,0.55)", 0); };
/** the register total, counting up */
const fxTotal = (p: Pen, v: number) => {
  p.poly([[10, 10], [502, 10], [502, 170], [10, 170]], "#1e2a24", 10);
  txt(p, "TOTAL", 110, 92, 56, "#7fe0a0"); txt(p, "$" + v.toFixed(2), 340, 94, 96, v > 30 ? "#ff6a6a" : "#7fe0a0");
};
/** a long receipt strip (flat on the floor): rows of items */
const fxReceipt = (p: Pen) => {
  p.g.fillStyle = "#fffdf6"; p.g.fillRect(0, 0, 128, 2048);
  for (let y = 30; y < 2000; y += 46) { p.g.fillStyle = "#9aa3ad"; p.g.fillRect(14, y, 60 + ((y * 7) % 30), 10); p.g.fillRect(92, y, 24, 10); }
};

/** a card flying along an arc from a to b, starting at f0 (travel frames) */
const toss = (out: Stage, f: number, f0: number, travel: number, a: V3, b: V3, h: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, size: number) => {
  const u = (f - f0) / travel;
  if (u < 0 || u > 1) return;
  const e = u, m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
  const P = (i: number) => (1 - e) * (1 - e) * a[i] + 2 * (1 - e) * e * m[i] + e * e * b[i];
  out.fx.push({ key, cw, ch, draw, x: P(0), y: P(1), z: P(2), w: size, h: size * ch / cw, rot: 0.6 * Math.sin(u * 7) });
};
const burst = (out: Stage, f: number, at: number, x: number, y: number, z: number, s = 1.2) => {
  if (f >= at && f < at + 8) { const u = q((f - at) / 8, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y, z, w: s, h: s }); }
};
/** a label that rises and fades */
const riser = (out: Stage, f: number, at: number, text: string, bg: string, x: number, y: number, z: number, w: number, life = 26) => {
  const u = (f - at) / life;
  if (u < 0 || u > 1) return;
  const s = w * (0.7 + 0.3 * smooth(u * 4)) * (u > 0.8 ? 1 - (u - 0.8) * 4 : 1);
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 1.0 * u, z, w: s, h: s * 0.3125 });
};
/** a card that pops in (back-out scale) and bobs */
const pop = (out: Stage, f: number, at: number, until: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number) => {
  if (f < at || f > until) return;
  const u = clamp01((f - at) / 8), s = u < 1 ? 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2 : 1, o = clamp01((until - f) / 6);
  const k = Math.max(0.01, s * o);
  out.fx.push({ key, cw, ch, draw, x, y: y + 0.05 * Math.sin(f / 6), z, w: w * k, h: w * k * ch / cw });
};
const confetti = (out: Stage, f: number, at: number, x: number, y: number, z: number, spread = 3) => {
  for (let i = 0; i < 6; i++) {
    const u = (f - at - i * 3) / 50;
    if (u < 0 || u > 1) continue;
    out.fx.push({ key: "conf" + (i % 3), cw: 500, ch: 500, draw: (p) => fxConfetti(p, i % 3), x: x + (hh(i, 3) - 0.5) * spread, y: y + 1.2 * u * (1.6 - u) - 0.4 * u, z: z + 0.2 * i,
      w: 1.6 * (1 - 0.3 * u), h: 1.6 * (1 - 0.3 * u), rot: u * 3 + i, soft: true });
  }
};
const S = (x: number, y: number, z: number): V3 => add(STORE, [x, y, z]);
/** shoppers strolling up and down aisles in the store (background life) */
const shoppers = (cam: CamInfo, out: Stage, t: number, base: V3) => {
  const lanes: [number, number, number][] = [[1, -6, 5.5], [-7, -6, 5.5], [9.8, 4, -9]];
  lanes.forEach(([x, z0, z1], i) => {
    const len = Math.abs(z1 - z0) || 20, sp = 1.0 + 0.15 * (i % 3), u = ((t * sp + i * 7.3) % (2 * len)) / len, dir = u < 1 ? 1 : -1;
    const k = u < 1 ? u : 2 - u;
    const along = false;
    const px = along ? -10 + 20 * k : x + (i % 2 ? 0.35 : -0.35), pz = along ? -11.6 : z0 + (z1 - z0) * k;
    const dx = along ? dir : 0, dz = along ? 0 : Math.sign(z1 - z0) * dir;
    walker(cam, out, W(40 + i, MODERN[i % MODERN.length], "shop" + i), base[0] + px, base[2] + pz, dx, dz, q((t * 1.05 + i * 0.37) % 1, 60), "smile", t);
  });
};

/** Max, posed from the blocking: walking card or standing card with the beat's expression / prop */
const maxCard = (cam: CamInfo, out: Stage, id: number, f: number, t: number, base: V3, expr: Expr, prop: FrontOpts["prop"] = null, look = 0, wave?: number) => {
  const m = maxAt(id, f);
  if (!m.visible) return m;
  const x = base[0] + m.x, z = base[2] + m.z;
  if (m.walk) walker(cam, out, MX, x, z, m.dx, m.dz, q((t * (id === 4 ? 1.9 : 1.1)) % 1, 60), expr, t, 0, 1, prop);
  else front(cam, out, MX, x, z, { mode: "stand", expr, prop, look, wave }, t);
  return m;
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const B = s.place === "store" ? STORE : ([0, 0, 0] as V3);
  switch (id) {
    case 1: { // hook: the milk is as far from the door as possible. On purpose.
      shoppers(cam, out, t, B);
      const [x, , z] = S(-4.4, 0, -12.6);
      front(cam, out, MG, x, z, { mode: "stand", expr: f > BT.purpose - 4 ? "grin" : "neutral", look: 1, wave: f > BT.purpose + 4 ? q(Math.sin(t * 7), 30) : undefined }, t);
      break;
    }
    case 2: { // Max needs one thing: milk
      const m = maxAt(2, f);
      if (m.walk) walker(cam, out, MX, m.x, m.z, m.dx, m.dz, q((t * 1.1) % 1, 60), "smile", t, 0, 1, ["hold", "list"]);
      else front(cam, out, MX, m.x, m.z, { mode: "stand", expr: f > BT.list ? "grin" : "smile", prop: ["raise", "list"], look: -1 }, t);
      riser(out, f, BT.list - 2, "JUST MILK", "#2f6fd6", m.x + 0.2, 2.6, m.z + 0.3, 1.1, 30);
      // shoppers in the lot
      [[-4, 22, 1], [3, 26, -1], [14, 24, 1]].forEach(([x0, z0, d], i) => walker(cam, out, W(50 + i, MODERN[(i + 2) % 6], "lot" + i), x0 + d * ((t * 1.1 + i * 3) % 12) - d * 6, z0, d, 0, q((t * 1.1 + i * 0.4) % 1, 60), "smile", t));
      break;
    }
    case 3: { // the walk through the store, checkout, the trick, the back room, the shelves, extra steps
      shoppers(cam, out, t, B);
      const c = cartAt(3, f), cartP = (y = 1.15): V3 => S(c.x, y, c.z);
      // the sample lady and the cashier stand all shot; the dock worker in the back room
      const [lx, , lz] = S(SAMPLE[0], 0, SAMPLE[2]);
      front(cam, out, LD, lx, lz, { mode: "stand", expr: f > BT.sample && f < BT.cereal ? "laugh" : "smile", look: -1, prop: ["hold", "tray"] }, t);
      const [cx, , cz] = S(LANES[1] - 1.0, 0, 11.3);
      front(cam, out, CS, cx, cz, { mode: "stand", expr: f > BT.sixty ? "laugh" : "smile", look: 1, wave: f > BT.sixty + 6 && f < BT.stuff + 20 ? q(Math.sin(t * 8), 30) : undefined }, t);
      const [kx, , kz] = S(LANES[0] + 2.25, 0, 10.4);
      front(cam, out, KD, kx, kz, { mode: "stand", expr: "grin", look: 1, prop: ["raise", "candy"] }, t);
      const [wx, , wz] = S(0.6, 0, DOCK_Z + 1.8);
      front(cam, out, WK, wx, wz, { mode: "stand", expr: "grin", look: -1, wave: q(Math.sin(t * 6), 30) }, t);
      const [mx, , mz] = S(-2.6, 0, -12.4);
      front(cam, out, MG, mx, mz, { mode: "stand", expr: "grin", look: -1 }, t);
      // ---- Max ----
      let ex: Expr = "smile", pr: FrontOpts["prop"] = null, look = 0;
      if (t < 8.05) ex = f > BT.bam ? "shock" : "smile";
      else if (t < 10.9) { ex = f > BT.smells ? "laugh" : "grin"; pr = f < BT.cart - 12 ? ["raise", "bread"] : null; look = -1; }
      else if (t < 13.4) { ex = "nervous"; look = Math.sin(t * 3) > 0 ? 1 : -1; }
      else if (t < 15.0) ex = "smile";
      else if (t < 16.4) { ex = f > BT.sample + 6 ? "laugh" : "grin"; look = 1; }
      else if (t < 19.5) ex = "nervous";
      else if (t < 22.1) { ex = f > BT.twofor ? "laugh" : "shock"; look = -1; }
      else if (t < 23.9) ex = "pained";
      else if (t < 27.1) { ex = f > BT.full ? "shock" : f > BT.milk ? "laugh" : "grin"; pr = f > BT.milk - 2 && f < BT.full ? ["raise", "milk"] : null; }
      else if (t < 34.3) { ex = f > BT.sixty ? "shock" : f > BT.candy ? "grin" : "smile"; pr = f > BT.candy && f < BT.came ? ["raise", "candy"] : null; look = f > BT.came ? -1 : 1; }
      else ex = f > BT.chance ? "laugh" : "grin";
      const m = maxCard(cam, out, 3, f, t, B, ex, pr, look);
      const head: V3 = S(m.x, 2.55, m.z);
      // ---- gags on the beats ----
      burst(out, f, BT.bam, ...S(8, 1.6, 13.4), 2.6);
      confetti(out, f, BT.bam, ...S(8, 2.6, 12.6), 4);
      for (let k = 0; k < 3; k++) if (f > BT.flowers && f < BT.where) { const kk = (Math.floor(t * 5) + k) % 4; out.fx.push({ key: "steam" + kk, cw: 256, ch: 400, draw: (p) => fxSteam(p, kk), x: S(BAKERY[0] - 0.8 + k * 0.8, 0, 0)[0], y: 1.75 + 0.1 * Math.sin(t * 3 + k), z: S(0, 0, BAKERY[2])[2], w: 0.5, h: 0.78, soft: true }); }
      riser(out, f, BT.smells, "MMMM!", "#e8742c", ...S(6.6, 2.4, 11.8), 1.0, 30);
      toss(out, f, BT.cart - 12, 16, S(BAKERY[0] + 0.6, 1.2, BAKERY[2]), cartP(), 1.0, "bread", 256, 256, fxBread, 0.45);
      pop(out, f, BT.where - 2, Math.round(12.35 * FPS), "q", 300, 300, fxQuestion, head[0] + 0.1, 2.75, head[2] + 0.2, 0.55);
      toss(out, f, BT.chips, 14, S(5.6, 1.5, 2.6), cartP(), 0.6, "bagR", 256, 256, (p) => fxBag(p, "#e23b4e"), 0.4);
      riser(out, f, BT.sample + 8, "FREE!", "#e8742c", ...S(SAMPLE[0] - 0.2, 2.3, SAMPLE[2] + 0.3), 0.9, 30);
      toss(out, f, BT.sample + 16, 14, S(SAMPLE[0] - 0.2, 1.3, SAMPLE[2]), cartP(), 0.5, "cheese", 256, 256, fxCheese, 0.35);
      if (f > BT.cereal - 6 && t < 19.5) [[-1.5, 1.05], [-2.4, 1.48], [-1.0, 1.9], [-2.9, 0.62], [-3.4, 1.9]].forEach(([zz, yy], i) => {
        const dx = Math.max(-1, Math.min(1, (m.z - zz) * 0.6));
        const kk = Math.round(dx * 2) / 2;
        out.fx.push({ key: "eyes" + kk, cw: 256, ch: 256, draw: (p) => fxEyes(p, kk), x: S(-0.3, 0, 0)[0], y: yy + 0.03 * Math.sin(t * 4 + i), z: S(0, 0, zz)[2], w: 0.36, h: 0.36 });
      });
      toss(out, f, BT.cereal + 4, 14, S(-0.2, 1.4, -1.8), cartP(), 0.6, "cereal", 256, 256, (p) => fxBox(p, "#e8742c"), 0.4);
      burst(out, f, BT.soda, ...S(SODA_TOWER[0], 2.6, SODA_TOWER[2] + 0.8), 2.0);
      toss(out, f, BT.twofor, 14, S(SODA_TOWER[0] + 0.4, 1.5, SODA_TOWER[2] + 0.5), cartP(), 0.8, "sixR", 256, 256, (p) => fxSix(p, "#e23b4e"), 0.5);
      toss(out, f, BT.twofor + 8, 14, S(SODA_TOWER[0] - 0.2, 1.8, SODA_TOWER[2] + 0.5), cartP(), 0.8, "sixB", 256, 256, (p) => fxSix(p, "#2f6fd6"), 0.5);
      riser(out, f, BT.heavier - 4, "OOF!", "#c0392b", head[0] + 0.3, 2.4, head[2], 0.8, 34);
      burst(out, f, BT.milk, ...S(-7, 1.6, -13.8), 1.8);
      burst(out, f, BT.full, ...cartP(1.4), 1.8);
      riser(out, f, BT.full + 2, "FULL!", "#c0392b", ...cartP(1.5), 0.9, 30);
      toss(out, f, BT.candy + 2, 12, S(LANES[1] + 2.25, 1.3, 9.7), cartP(), 0.5, "candy", 256, 256, fxCandy, 0.3);
      // the register total counts up, the receipt unrolls across the floor
      if (f >= BT.came - 4 && t < 34.3) {
        const u = smooth((f - BT.sixty + 6) / 22), v = f < BT.four ? 0 : f < BT.sixty - 6 ? 4.29 : 4.29 + (63.12 - 4.29) * u;
        const vv = Math.round(v * 4) / 4;
        out.fx.push({ key: "total" + vv, cw: 512, ch: 180, draw: (p) => fxTotal(p, vv), ...xyz(S(LANES[1] - 0.15, 2.0, 12.15)), w: 0.95, h: 0.33 });
        const len = 6.5 * smooth((f - BT.sixty + 4) / 30);
        if (len > 0.05) out.fx.push({ key: "receipt", cw: 128, ch: 2048, draw: fxReceipt, ...xyz(S(LANES[1] + 0.8 + len / 2, 0.03, 12.9)), w: 0.3, h: len, flat: true, rot: Math.PI / 2 });
      }
      // the bait: a milk carton bobbing on a fishing hook in front of the coolers
      if (t >= 35.5 && t < 37.0) out.fx.push({ key: "bait", cw: 256, ch: 512, draw: fxBait, ...xyz(S(-7, 2.15 + 0.08 * Math.sin(t * 5), BACKW + 2.1)), w: 0.62, h: 1.24, rot: 0.08 * Math.sin(t * 3) });
      // eye level vs. by your feet
      riser(out, f, BT.pricey + 6, "EYE LEVEL = $$$", "#c0242e", ...S(-8.2, 1.95, -2.0), 1.3, 40);
      riser(out, f, BT.cheap + 4, "CHEAP = DOWN HERE", "#2f7a46", ...S(-8.2, 0.75, -2.4), 1.2, 40);
      // every extra step: footprints, +$ each step, things keep jumping in
      if (t >= 48.85 && t < 52.4) {
        for (let k = 0; k < 8; k++) {
          const ts = 48.9 + k * 0.42; if (t < ts) continue;
          const p = maxAt(3, Math.round(ts * FPS));
          out.fx.push({ key: "step", cw: 256, ch: 256, draw: fxStep, ...xyz(S(p.x + (k % 2 ? 0.14 : -0.14), 0.03, p.z + 0.3)), w: 0.5, h: 0.5, flat: true, rot: 0 });
          riser(out, f, Math.round(ts * FPS), "+$", "#2f7a46", ...S(p.x + (k % 2 ? 0.5 : -0.5), 0.6, p.z), 0.55, 24);
        }
        const goods: [string, (p: Pen) => void][] = [["bagB", (p) => fxBag(p, "#2f6fd6")], ["cereal", (p) => fxBox(p, "#e8742c")], ["sixR", (p) => fxSix(p, "#e23b4e")], ["candy", fxCandy], ["bagR", (p) => fxBag(p, "#e23b4e")]];
        goods.forEach(([key, draw], k) => toss(out, f, BT.chance - 20 + k * 7, 14, S(k % 2 ? -1.6 : -4.4, 1.6, m.z - 1.5), cartP(), 0.7, key, 256, 256, draw, 0.38));
      }
      break;
    }
    case 4: { // next time: walk in, grab the milk, get out
      const m = maxAt(4, f);
      const out2 = f > BT.getout - 20;
      if (m.visible) {
        if (m.walk) walker(cam, out, MX, m.x, m.z, m.dx, m.dz, q((t * 2.0) % 1, 60), out2 ? "laugh" : "stern", t, 0, 1, out2 ? ["raise", "milk"] : null);
        else front(cam, out, MX, m.x, m.z, { mode: "stand", expr: f > BT.walkin ? "laugh" : "stern", look: 0, prop: f > BT.walkin ? ["raise", "milk"] : null }, t);
      }
      burst(out, f, BT.walkin + 10, DOOR_POS[0], 1.6, DOOR_POS[2], 2.4);
      burst(out, f, BT.getout - 6, DOOR_POS[0], 1.6, DOOR_POS[2] + 0.4, 2.4);
      confetti(out, f, BT.getout + 4, m.x, 3.0, m.z + 0.4, 5);
      riser(out, f, BT.getout + 2, "IN & OUT: $4", "#2f7a46", m.x + 0.2, 2.7, m.z + 0.4, 1.2, 60);
      [[-6, 21, 1], [2, 27, -1]].forEach(([x0, z0, d], i) => walker(cam, out, W(50 + i, MODERN[(i + 3) % 6], "lot" + i), x0 + d * ((t * 1.1 + i * 3) % 12) - d * 6, z0, d, 0, q((t * 1.1 + i * 0.4) % 1, 60), "smile", t));
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void CART_UNUSED;
  return out;
};
const DOOR_POS: V3 = [8, 0, 16.6];
const CART_UNUSED = 0;
const xyz = (p: V3) => ({ x: p[0], y: p[1], z: p[2] });
export { FPS };
