// The cast of "From empty shop to owner" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, OFFICE, STAGE, WALK_Z, ROSA_O, BOSS_DOOR, CLOCK_O, FR_SHOP, ID_SHOP, HQ, ROSA_ST, COUNTER, CUST, ROSA_C, ROSA_STREET, STALL, MANAGER, ROSA_X, SHOP2_X, SHOP_FRONT, add } from "./story";
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
/** Rosa: coral dress, dark hair, the same in every shot */
const ROSA: Outfit = { jacket: "#e8604c", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#2a1a14", dress: "#e8604c", skin: SKINS[3] };
/** her bakery team: cream shirts, pink caps */
const BAKER: Outfit = { jacket: "#f4efe6", pants: "#3b3f52", boots: "#3a2a1e", hat: "cap", cap: "#e8608a", buttons: "#e8608a", skin: SKINS[1] };
const BAKER2: Outfit = { ...BAKER, skin: SKINS[2], hat: "cap", cap: "#e8608a", dress: "#f4efe6" };
const BOSS: Outfit = { jacket: "#2a2f3a", pants: "#2a2f3a", boots: "#1e1a18", hat: "hair", hair: "#8a8f99", buttons: "#e8c45a", skin: SKINS[1], build: "stout" };
const MODERN: Outfit[] = [
  { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] },
  { jacket: "#3fa08a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#5a8fc2", skin: SKINS[1] },
  { jacket: "#e8a84a", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#2f6fd6", skin: SKINS[3] },
  { jacket: "#7b4fd0", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#5a3b2a", skin: SKINS[2] },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1e1a18", dress: "#c0392b", skin: SKINS[3] },
];
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const RO = W(1, ROSA, "rosa"), MG = W(2, BAKER, "manager"), BS = W(3, BOSS, "boss");
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
const fxBill = (p: Pen) => {
  p.poly([[10, 10], [290, 10], [290, 150], [10, 150]], "#a9d898", 9);
  p.ell(150, 80, 40, 40, "#e3f4dc", 6);
  txt(p, "$", 150, 84, 64, "#2f7a46");
  for (const x of [44, 256]) p.dot(x, 80, 10, "#2f7a46");
};
const fxCoin = (p: Pen) => { p.ell(128, 128, 110, 110, "#f2c33a", 10); p.ell(128, 128, 82, 82, null, 6); txt(p, "$", 128, 134, 120, "#8a5a12"); };
const fxClockT = (p: Pen, a: number) => {
  p.ell(150, 150, 128, 128, "#fbf7ee", 12);
  for (let k = 0; k < 12; k++) { const b = k * Math.PI / 6; p.stroke([[150 + 100 * Math.cos(b), 150 + 100 * Math.sin(b)], [150 + 116 * Math.cos(b), 150 + 116 * Math.sin(b)]], 7); }
  const h = a / 12 - Math.PI / 2, m = a - Math.PI / 2;
  p.stroke([[150, 150], [150 + 60 * Math.cos(h), 150 + 60 * Math.sin(h)]], 14); p.stroke([[150, 150], [150 + 92 * Math.cos(m), 150 + 92 * Math.sin(m)]], 9); p.dot(150, 150, 12, INK);
};
const fxLabel = (p: Pen, text: string, bg: string) => {
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  txt(p, text, 256, 84, text.length > 7 ? 80 : 100, "#ffffff");
};
const fxQuestion = (p: Pen) => { p.ell(150, 150, 130, 130, "#ffd23f", 12); txt(p, "?", 150, 160, 190, INK); };
const fxBulb = (p: Pen) => {
  const g = p.g; g.save(); g.fillStyle = "rgba(255,230,120,0.45)"; g.beginPath(); g.arc(150, 120, 130, 0, 7); g.fill(); g.restore();
  p.ell(150, 120, 80, 86, "#ffe680", 10);
  p.poly([[112, 196], [188, 196], [180, 250], [120, 250]], "#9aa3b2", 9);
  for (const y of [214, 232]) p.stroke([[118, y], [182, y]], 6);
  p.stroke([[130, 150], [150, 110], [170, 150]], 7);
};
const fxBook = (p: Pen) => {
  p.poly([[20, 40], [250, 20], [250, 230], [20, 250]], "#c0392b", 10);
  p.poly([[44, 52], [236, 36], [236, 214], [44, 230]], "#ffd23f", 0);
  txt(p, "PLAY", 140, 100, 64, "#7a1414"); txt(p, "BOOK", 140, 166, 64, "#7a1414");
};
const fxHeart = (p: Pen) => {
  const g = p.g; g.save(); g.beginPath(); g.moveTo(128, 220); g.bezierCurveTo(10, 140, 30, 30, 128, 80); g.bezierCurveTo(226, 30, 246, 140, 128, 220); g.closePath();
  g.fillStyle = "#ff4a6a"; g.fill(); g.lineWidth = 12; g.strokeStyle = INK; g.stroke(); g.restore();
};
const fxConfetti = (p: Pen, seed: number) => {
  const g = p.g, cols = ["#ff4a6a", "#ffd23f", "#3fd8ff", "#2bd96b", "#b06ad0", "#ffffff"];
  for (let k = 0; k < 26; k++) { g.save(); g.translate(20 + hh(k, seed) * 460, 20 + hh(k, seed + 1) * 460); g.rotate(hh(k, seed + 2) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-12, -6, 24, 12); g.restore(); }
};
const fxList = (p: Pen) => {
  p.poly([[16, 16], [284, 16], [284, 364], [16, 364]], "#fffbe6", 10);
  txt(p, "PROBLEMS", 150, 62, 50, "#c0392b");
  for (let k = 0; k < 3; k++) { txt(p, `${k + 1}.`, 56, 140 + k * 80, 50, INK); p.stroke([[90, 156 + k * 80], [260, 156 + k * 80]], 5, "#7f95c8"); }
};
/** a card flying along an arc (repeating every `every` frames between f0 and f1) */
const arc = (out: Stage, f: number, a: V3, b: V3, h: number, f0: number, f1: number, every: number, travel: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, size: number) => {
  for (let k = 0; f0 + k * every <= f1; k++) {
    const u = (f - (f0 + k * every)) / travel;
    if (u < 0 || u > 1) continue;
    const e = 1 - (1 - u) ** 2, m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
    const P = (i: number) => (1 - e) * (1 - e) * a[i] + 2 * (1 - e) * e * m[i] + e * e * b[i];
    out.fx.push({ key, cw, ch, draw, x: P(0), y: P(1), z: P(2), w: size, h: size * ch / cw, rot: 0.5 * Math.sin(k * 1.7 + u * 6) });
  }
};
const burst = (out: Stage, f: number, at: number, x: number, y: number, z: number, s = 1.2) => {
  if (f >= at && f < at + 8) { const u = q((f - at) / 8, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y, z, w: s, h: s }); }
};
const label = (out: Stage, f: number, at: number, text: string, bg: string, x: number, y: number, z: number, w: number, until = 1e9) => {
  const u = smooth((f - at) / 8);
  if (u <= 0 || f > until) return;
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 0.3 * (1 - u), z, w: w * (0.6 + 0.4 * u), h: w * 0.3125 * (0.6 + 0.4 * u) });
};
/** a label that rises and fades */
const riser = (out: Stage, f: number, at: number, text: string, bg: string, x: number, y: number, z: number, w: number, life = 26) => {
  const u = (f - at) / life;
  if (u < 0 || u > 1) return;
  const s = w * (0.7 + 0.3 * smooth(u * 4)) * (u > 0.8 ? 1 - (u - 0.8) * 4 : 1);
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 1.2 * u, z, w: s, h: s * 0.3125 });
};
/** a card that pops in (back-out scale) and bobs */
const pop = (out: Stage, f: number, at: number, until: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number) => {
  if (f < at || f > until) return;
  const u = clamp01((f - at) / 8), s = u < 1 ? 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2 : 1, o = clamp01((until - f) / 6);
  const k = Math.max(0.01, s * o);
  out.fx.push({ key, cw, ch, draw, x, y: y + 0.06 * Math.sin(f / 6), z, w: w * k, h: w * k * ch / cw });
};
const confetti = (out: Stage, f: number, at: number, x: number, y: number, z: number, spread = 3) => {
  for (let i = 0; i < 6; i++) {
    const u = (f - at - i * 3) / 50;
    if (u < 0 || u > 1) continue;
    out.fx.push({ key: "conf" + (i % 3), cw: 500, ch: 500, draw: (p) => fxConfetti(p, i % 3), x: x + (hh(i, 3) - 0.5) * spread, y: y + 1.2 * u * (1.6 - u) - 0.4 * u, z: z + 0.2 * i,
      w: 1.6 * (1 - 0.3 * u), h: 1.6 * (1 - 0.3 * u), rot: u * 3 + i, soft: true });
  }
};
/** passers-by on the sidewalk */
const strollers = (cam: CamInfo, out: Stage, t: number, n = 6, avoid = 0) => {
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, speed = 1.1 + 0.1 * (i % 3), x0 = -dir * (18 + 6 * i);
    const x = x0 + dir * speed * ((t + i * 3.1) % 34);
    if (Math.abs(x) > 28 || (avoid && Math.abs(x - 1) < avoid)) continue;
    walker(cam, out, W(40 + i, MODERN[i % MODERN.length], "walk" + i), x, WALK_Z + 1.3 + (i % 2 ? 0.35 : -0.3), dir, 0, q((t * 1.05 + i * 0.37) % 1, 60), "smile", t);
  }
};
const O = (x: number, y: number, z: number): V3 => add(OFFICE, [x, y, z]);
const ST = (p: V3): V3 => add(STAGE, p);

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const F = SHOP_FRONT, [rx, , rz] = ROSA_STREET;
  switch (id) {
    case 1: { // the empty shop at sunset; Rosa holds the key
      strollers(cam, out, t, 6, 3.5);
      front(cam, out, RO, rx, rz, { mode: "stand", expr: f > BT.becomes ? "grin" : "smile", prop: f > BT.stay ? ["raise", "key"] : ["hold", "key"], look: -1 }, t);
      pop(out, f, BT.becomes + 4, 190, "q", 300, 300, fxQuestion, ROSA_X - 0.3, 5.3, F + 0.6, 1.3);
      break;
    }
    case 2: { // the 9-to-5: her hours make money for someone else
      const [x, , z] = O(...ROSA_O);
      const pay = f > BT.someone + 26;
      front(cam, out, RO, x, z, { mode: "stand", expr: f > BT.someone + 4 ? "nervous" : f > BT.works ? "neutral" : "smile", prop: pay ? ["raise", "paycheck"] : null, look: f > BT.hours ? 1 : 0 }, t);
      [[-3.4, -2.1], [-3.4, 0.7], [-6.8, -2.1], [-6.8, 0.7]].forEach(([cx, cz], i) => { const p = O(cx + 0.15, 0, cz); front(cam, out, W(60 + i, MODERN[i], "cow" + i), p[0], p[2], { mode: "stand", expr: "neutral", look: 1 }, t); });
      const bp = O(5.9, 0, -3.3);
      front(cam, out, BS, bp[0], bp[2], { mode: "stand", expr: f > BT.someone ? "laugh" : "grin", look: -1, wave: f > BT.someone ? q(Math.sin(t * 8), 30) : undefined }, t);
      const ck = O(...CLOCK_O), sp = f < BT.works ? 0.05 : 0.05 + 0.5 * clamp01((f - BT.works) / 20);
      const ang = q(((f - 180) * sp) % (Math.PI * 2), 24);
      out.fx.push({ key: "clk" + ang, cw: 300, ch: 300, draw: (p) => fxClockT(p, ang), x: ck[0], y: ck[1], z: ck[2], w: 1.0, h: 1.0 });
      if (f > BT.hours) arc(out, f, O(0.3, 1.2, -0.4), O(BOSS_DOOR[0] + 0.6, 1.8, BOSS_DOOR[2] - 0.6), 1.2, BT.hours + 2, 345, 6, 22, "bill", 300, 160, fxBill, 0.42);
      arc(out, f, O(BOSS_DOOR[0], 1.6, BOSS_DOOR[2] + 0.2), O(0.5, 1.4, -0.5), 0.8, BT.someone + 8, BT.someone + 8, 99, 18, "bill", 300, 160, fxBill, 0.34);
      break;
    }
    case 3: { // two paths: a franchise (brand + playbook, fee + royalties) or your own idea (cheaper, all on you)
      const [x, , z] = ST(ROSA_ST);
      const ex: Expr = f > BT.all ? "nervous" : f > BT.cheaper ? "grin" : f > BT.own ? "laugh" : f > BT.royal ? "nervous" : f > BT.brand ? "grin" : "smile";
      const look = f > BT.own - 6 ? 1 : f > BT.franchise - 6 ? -1 : 0;
      front(cam, out, RO, x, z, { mode: "stand", expr: ex, look, prop: f > BT.fee - 4 && f < BT.royal ? ["raise", "cash"] : null }, t, 0, 1.3);
      burst(out, f, BT.owning, x, 3.4, z, 2.2);
      const [fx_, , fz] = ST(FR_SHOP), [ix, , iz] = ST(ID_SHOP), [hx, , hz] = ST(HQ);
      pop(out, f, BT.brand + 10, BT.own - 4, "book", 270, 270, fxBook, fx_ + 1.2, 3.3, fz + 1.9, 1.1);
      arc(out, f, [x - 0.4, 2.0, z], [fx_ + 0.2, 1.4, fz + 1.4], 1.4, BT.fee + 2, BT.fee + 24, 5, 18, "bill", 300, 160, fxBill, 0.6);
      label(out, f, BT.fee + 4, "FEE", "#c0392b", fx_ + 1.5, 3.6, fz + 1.6, 1.2, BT.own - 4);
      arc(out, f, [fx_, 3.0, fz + 0.6], [hx, 9.0, hz + 1.2], 2.2, BT.royal + 2, BT.own - 10, 8, 26, "coin", 256, 256, fxCoin, 0.55);
      label(out, f, BT.royal + 6, "4-8%", "#c0392b", hx + 1.0, 8.0, hz + 2.0, 2.0, BT.own - 4);
      pop(out, f, BT.own + 2, 775, "bulb", 300, 300, fxBulb, ix, 4.6, iz + 1.4, 1.4);
      label(out, f, BT.cheaper + 2, "LOW COST", "#2f6a3a", ix - 0.1, 3.7, iz + 2.2, 1.6);
      ["BRAND", "RECIPES", "ADS", "BOOKS"].forEach((w, k) => riser(out, f, BT.all + 2 + k * 7, w, ["#2f6fd6", "#e8742c", "#7b4fd0", "#1f4a4a"][k], ix + [-1.3, 1.2, -0.9, 1.0][k], 1.4 + 0.3 * k, iz + 2.4, 1.2, 40));
      break;
    }
    case 4: { // sales - costs = profit; a team runs the counter
      const [cx, , cz] = ST(CUST), [x, , z] = ST(ROSA_C), C = ST(COUNTER);
      const away = clamp01((f - BT.earns - 4) / 50);
      if (f < BT.earns + 4) front(cam, out, RO, x, z, { mode: "stand", expr: f > BT.profit ? "laugh" : f > BT.costs ? "nervous" : "grin", look: -1 }, t);
      else if (away < 1) walker(cam, out, RO, x + away * 4.5, z + away * 1.4, 1, 0.3, q((t * 1.1) % 1, 60), "laugh", t);
      front(cam, out, W(70, MODERN[3], "cust0"), cx, cz, { mode: "stand", expr: "smile", prop: f < BT.sales + 20 ? ["raise", "cash"] : ["hold", "bread"], look: 1 }, t);
      label(out, f, BT.sales - 2, "$10 SALE", "#2f7a46", C[0] - 0.9, 2.9, C[2] + 0.6, 1.3, BT.team - 4);
      label(out, f, BT.profit, "PROFIT $1", "#e8742c", C[0] - 0.3, 1.75, C[2] + 0.9, 1.5, BT.team + 10);
      burst(out, f, BT.profit, C[0] - 0.3, 1.4, C[2] + 0.5, 1.4);
      if (f > BT.team - 2) {
        [[-0.7, -0.75, BAKER, "st0"], [0.6, -0.75, BAKER2, "st1"]].forEach(([dx, dz, o, k], i) => {
          const p = ST([dx as number, 0, dz as number]);
          front(cam, out, W(80 + i, o as Outfit, k as string), p[0], p[2], { mode: "stand", expr: "grin", look: i ? 1 : -1, prop: i ? ["hold", "bread"] : null }, t);
          burst(out, f, BT.team + i * 5, p[0], 1.6, p[2], 1.4);
        });
        for (let k = 0; k < 2; k++) {
          const p = ST([-2.1 - (k + 1) * 0.8, 0, 1.3 + (k + 1) * 0.3]);
          front(cam, out, W(71 + k, MODERN[(k + 4) % 6], "cust" + (k + 1)), p[0], p[2], { mode: "stand", expr: "smile", look: 1, prop: ["raise", "cash"] }, t);
        }
        arc(out, f, ST([-2.2, 1.4, 0.9]), ST([-0.3, 1.2, 0.1]), 0.9, BT.team + 10, 1010, 9, 16, "coin", 256, 256, fxCoin, 0.36);
        for (let k = 0; BT.earns + 10 + k * 18 < 1012; k++) riser(out, f, BT.earns + 10 + k * 18, "+$1", "#2f7a46", C[0] - 0.3 + (k % 2 ? 0.5 : -0.5), 1.7, C[2] + 0.5, 0.9, 30);
      }
      break;
    }
    case 5: { // not easy: half close; start small, test the idea, read every contract
      strollers(cam, out, t, 8);
      if (f >= BT.small - 8) {
        const [sx, , sz] = STALL;
        front(cam, out, RO, sx + 0.1, sz - 0.75, { mode: "stand", expr: f > BT.read ? "stern" : "grin", look: f > BT.read ? 0 : -1, prop: f > BT.read - 2 ? ["raise", "lease"] : ["hold", "bread"] }, t);
        front(cam, out, W(73, MODERN[1], "taster0"), sx - 1.5, sz + 0.2, { mode: "stand", expr: f > BT.test + 6 ? "laugh" : "smile", look: 1, prop: ["hold", "bread"] }, t);
        front(cam, out, W(74, MODERN[2], "taster1"), sx - 2.4, sz - 0.3, { mode: "stand", expr: f > BT.test + 12 ? "laugh" : "grin", look: 1 }, t);
        pop(out, f, BT.test + 6, BT.read - 2, "heart", 256, 256, fxHeart, sx - 1.5, 2.55, sz + 0.2, 0.55);
        pop(out, f, BT.test + 14, BT.read - 2, "heart", 256, 256, fxHeart, sx - 2.4, 2.45, sz - 0.3, 0.5);
        label(out, f, BT.test, "TEST", "#2f6fd6", sx - 1.0, 3.35, sz - 0.2, 1.1, BT.read - 2);
      }
      break;
    }
    case 6: { // the reveal: Rosa's Bakery; the keys to her manager; shop #2
      const lit = f >= BT.bakery, keyed = f > BT.manager + 30;
      front(cam, out, RO, rx, rz, { mode: "stand", expr: lit ? "laugh" : f > BT.become ? "grin" : "smile", look: f > BT.manager - 4 && f < BT.shop2 ? -1 : 0,
        prop: keyed ? null : ["hold", "key"], wave: lit && f < BT.manager ? q(Math.sin(t * 9), 30) : undefined }, t);
      const [mx, , mz] = MANAGER;
      front(cam, out, MG, mx, mz, { mode: "stand", expr: keyed ? "laugh" : lit ? "grin" : "smile", look: 1, prop: keyed ? ["raise", "key"] : null }, t);
      arc(out, f, [rx - 0.2, 1.3, rz], [mx + 0.3, 1.3, mz], 0.9, BT.manager + 12, BT.manager + 12, 99, 18, "keyfx", 256, 256, (p) => drawKey(p), 0.45);
      const crowd: [number, number][] = [[-4.6, 7.4], [-3.6, 8.3], [4.4, 7.2], [5.4, 8.1], [-5.8, 8.6], [6.4, 8.8]];
      crowd.forEach(([cx, cz], i) => front(cam, out, W(90 + i, MODERN[i % 6], "crowd" + i), cx, cz, { mode: "stand", expr: lit ? "laugh" : "smile", look: cx < 0 ? 1 : -1,
        wave: lit && (f + i * 7) % 40 < 26 ? q(Math.sin(t * 9 + i), 30) : undefined, prop: lit && i % 3 === 1 ? ["hold", "bread"] : null }, t));
      pop(out, f, BT.become + 4, BT.bakery - 1, "q", 300, 300, fxQuestion, ROSA_X, 5.6, F + 0.6, 1.4);
      burst(out, f, BT.bakery, ROSA_X, 3.9, F + 0.8, 4.0);
      confetti(out, f, BT.bakery, ROSA_X, 4.6, F + 1.5, 6);
      confetti(out, f, BT.bakery + 18, ROSA_X, 4.6, F + 1.8, 6);
      // shop #2: its team waits outside; the sign lights up
      front(cam, out, W(83, BAKER2, "st1"), SHOP2_X + 2.0, F + 2.0, { mode: "stand", expr: f > BT.shop2 ? "laugh" : "grin", look: -1, wave: f > BT.shop2 + 4 ? q(Math.sin(t * 9), 30) : undefined }, t);
      front(cam, out, W(75, MODERN[4], "c2a"), SHOP2_X - 2.4, F + 3.0, { mode: "stand", expr: f > BT.shop2 ? "laugh" : "smile", look: 1 }, t);
      front(cam, out, W(76, MODERN[5], "c2b"), SHOP2_X - 3.3, F + 3.6, { mode: "stand", expr: f > BT.shop2 ? "laugh" : "smile", look: 1 }, t);
      burst(out, f, BT.shop2 + 4, SHOP2_X, 3.9, F + 0.8, 4.0);
      confetti(out, f, BT.shop2 + 4, SHOP2_X, 4.6, F + 1.5, 6);
      break;
    }
    case 7: { // your first step: write down 3 problems people pay to fix
      strollers(cam, out, t, 4, 4);
      front(cam, out, RO, rx - 0.6, rz + 0.6, { mode: "stand", expr: f > BT.problems ? "grin" : "laugh", look: 0, prop: f > BT.free - 4 ? ["raise", "notebook"] : null,
        wave: f < BT.free - 4 ? q(Math.sin(t * 8), 30) : undefined }, t);
      const [mx, , mz] = MANAGER;
      front(cam, out, MG, mx, mz, { mode: "stand", expr: "grin", look: 1, prop: ["hold", "key"] }, t);
      front(cam, out, W(81, BAKER2, "st1"), mx - 1.4, mz - 0.6, { mode: "stand", expr: "smile", look: 1, prop: ["hold", "bread"] }, t);
      pop(out, f, BT.problems + 4, 1800, "list", 300, 380, fxList, rx + 0.2, 2.7, rz + 0.9, 0.9);
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void KID; void clamp01; void ROSA_O; void FR_SHOP; void COUNTER; void STAGE;
  return out;
};
/** a key card (256 x 256) */
const drawKey = (p: Pen) => {
  p.ell(80, 128, 52, 52, "#f2c33a", 10); p.ell(80, 128, 20, 20, "#b8862a", 0);
  p.band([[130, 128], [236, 128]], "#f2c33a", 26, 8);
  p.band([[200, 128], [200, 168]], "#f2c33a", 20, 7); p.band([[226, 128], [226, 160]], "#f2c33a", 20, 7);
};
export { FPS };
