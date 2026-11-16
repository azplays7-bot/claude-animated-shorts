// The cast of "How Real Estate Can Build Wealth" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxSplash, fxPuff, fxRing, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, OFFICE, LENDER, STAGE, ALEX_HOOK, ALEX_YARD, DOOR, WALK_Z, BANK_B, SIGN } from "./story";
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
/** Alex, 25: blue jacket, khakis, dark hair, the same in every shot */
const ALEX: Outfit = { jacket: "#2f6fd0", pants: "#b89a6a", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[1] };
const LENDER_O: Outfit = { jacket: "#2b2f3a", pants: "#2b2f3a", boots: "#1e1a18", hat: "hair", hair: "#1e1a18", buttons: "#e8c45a", skin: SKINS[3], build: "stout" };
const DAD: Outfit = { jacket: "#2fa36b", pants: "#3b3f52", boots: "#4a3426", hat: "cap", cap: "#e2453c", skin: SKINS[2], moustache: "#3a2a1e" };
const MOM: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] };
const KID_O: Outfit = { ...KID, jacket: "#f08a2c", cap: "#3f8fd6" };
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const A = W(1, ALEX, "alex");
const front = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = 0, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};
const walker = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, dx: number, dz: number, phase: number, expr: Expr, t: number, y = 0, scale = 1) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who, x, y, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, who.i) }, { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) }, scale));
  blob(out, x, y, z, scale);
};

// ---- effect drawings ----
/** a banknote card (300 x 160) */
const fxBill = (p: Pen) => {
  const g = p.g;
  p.poly([[10, 10], [290, 10], [290, 150], [10, 150]], "#a9d898", 9);
  p.ell(150, 80, 40, 40, "#e3f4dc", 6);
  g.save(); g.fillStyle = "#2f7a46"; g.font = "64px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 150, 84); g.restore();
  for (const x of [44, 256]) p.dot(x, 80, 10, "#2f7a46");
};
const fxEnvelope = (p: Pen, label: string) => {
  const g = p.g;
  p.poly([[12, 12], [388, 12], [388, 248], [12, 248]], "#fffaf0", 10);
  p.stroke([[12, 12], [200, 130], [388, 12]], 8, "#c9b991");
  p.poly([[50, 170], [350, 170], [350, 230], [50, 230]], "#d0352f", 0);
  g.save(); g.fillStyle = "#ffffff"; g.font = "48px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(label, 200, 202); g.restore();
};
const fxAlert = (p: Pen) => {
  p.poly([[150, 18], [282, 262], [18, 262]], "#ffd23f", 14);
  p.poly([[138, 90], [162, 90], [158, 190], [142, 190]], INK, 0);
  p.dot(150, 222, 14, INK);
};
const fxHeart = (p: Pen) => { p.ell(105, 110, 60, 60, "#ff5a7a", 9); p.ell(195, 110, 60, 60, "#ff5a7a", 9); p.poly([[52, 140], [248, 140], [150, 262]], "#ff5a7a", 9); p.ell(150, 128, 90, 40, "#ff5a7a", 0); };
/** bills flying along an arc from a to b: n launched every `every` frames from f0 to f1, each taking `travel` frames */
const stream = (out: Stage, f: number, a: V3, b: V3, h: number, f0: number, f1: number, every: number, travel: number, size = 0.5) => {
  for (let k = 0; f0 + k * every <= f1; k++) {
    const u = (f - (f0 + k * every)) / travel;
    if (u < 0 || u > 1) continue;
    const e = 1 - (1 - u) ** 2, m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
    const P = (i: number) => (1 - e) * (1 - e) * a[i] + 2 * (1 - e) * e * m[i] + e * e * b[i];
    out.fx.push({ key: "bill", cw: 300, ch: 160, draw: fxBill, x: P(0), y: P(1), z: P(2), w: size, h: size * 0.53, rot: 0.6 * Math.sin(k * 1.7 + u * 6) });
  }
};
const burst = (out: Stage, f: number, at: number, x: number, y: number, z: number, s = 1.2) => {
  if (f >= at && f < at + 8) { const u = q((f - at) / 8, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x, y, z, w: s, h: s }); }
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  switch (id) {
    case 1: { // tired at the desk at night, staring at the paycheck
      const [OX, , OZ] = OFFICE;
      front(cam, out, A, OX, OZ - 0.1, { mode: "sit", expr: f > 40 ? "dazed" : "nervous", headTilt: -6, prop: ["hold", "paycheck"], look: 0 }, t, 0.42, 1, false);
      break;
    }
    case 2: { // little figures on the street from above
      front(cam, out, A, ALEX_HOOK[0], ALEX_HOOK[2], { mode: "stand", expr: "smile" }, t);
      front(cam, out, W(20, DAD, "dad"), -1.0, 4.9, { mode: "stand", expr: "smile" }, t);
      front(cam, out, W(21, MOM, "mom"), 0.6, 5.0, { mode: "stand", expr: "smile" }, t);
      break;
    }
    case 3: { // rent flies from the house into Alex's phone
      const meet = f > BT.meet - 2;
      front(cam, out, A, ALEX_HOOK[0], ALEX_HOOK[2], meet && f < BT.meet + 40 ? { mode: "stand", expr: "laugh", wave: q(Math.sin(t * 9), 30) } : { mode: "stand", expr: meet ? "grin" : "shock", prop: ["raise", "phone"], look: meet ? 0 : 1 }, t);
      front(cam, out, W(20, DAD, "dad"), -0.9, 5.0, { mode: "stand", expr: "smile" }, t, 0, 0.98);
      front(cam, out, W(21, MOM, "mom"), 0.5, 5.1, { mode: "stand", expr: "smile_closed" }, t, 0, 0.95);
      stream(out, f, [DOOR[0], 1.4, DOOR[2] + 0.4], [ALEX_HOOK[0] + 0.45, 2.15, ALEX_HOOK[2] + 0.1], 2.4, 142, 290, 7, 34, 0.42);
      break;
    }
    case 4: { // walking up to the FOR SALE sign
      const u = clamp01((f - 300) / 62), x = -9 + (SIGN[0] - 1.6 + 9) * u;
      if (u < 1) walker(cam, out, A, x, WALK_Z, 1, 0, q((t * 1.0) % 1, 60), "smile", t);
      else front(cam, out, A, SIGN[0] - 1.6, WALK_Z - 0.3, { mode: "stand", expr: f > 372 ? "shock" : "grin", look: 1, wave: f > 376 ? 0.8 : undefined }, t);
      break;
    }
    case 5: { // at the lender: down payment, loan, signature
      const [LX, , LZ] = LENDER;
      const signing = f > BT.loan + 54;
      front(cam, out, W(30, LENDER_O, "lender"), LX - 1.0, LZ - 1.0, { mode: "stand", expr: f > BT.loan ? "grin" : "smile", look: 1, wave: f > BT.loan && f < BT.loan + 20 ? 0.4 : undefined }, t, 0, 1, false);
      front(cam, out, A, LX + 1.05, LZ + 0.7, { mode: "stand", expr: signing ? "grin" : f > BT.down ? "smile" : "nervous", look: -1, prop: f > BT.down && f < BT.down + 18 ? ["hold", "cash"] : signing ? ["hammer", q(0.5 + 0.5 * Math.sin(t * 14), 30)] : null }, t);
      break;
    }
    case 6: { // SOLD: the key drops into Alex's hand; payments fly to the bank
      const k = clamp01((f - 516) / 22);
      front(cam, out, A, ALEX_YARD[0], ALEX_YARD[2], k < 1 ? { mode: "stand", expr: "shock", look: 0 } : { mode: "stand", expr: "laugh", prop: ["raise", "key"] }, t);
      if (k < 1) { const y = 6 - 3.6 * (k * k); out.fx.push({ key: "keyfx", cw: 200, ch: 200, draw: (p) => { p.ell(100, 60, 34, 34, "#f2c33a", 8); p.band([[100, 94], [100, 180]], "#f2c33a", 18, 6); p.band([[100, 150], [128, 150]], "#f2c33a", 14, 5); }, x: ALEX_YARD[0] + 0.35, y, z: ALEX_YARD[2] + 0.1, w: 0.5, h: 0.5, rot: k * 6 }); }
      burst(out, f, 538, ALEX_YARD[0] + 0.4, 2.5, ALEX_YARD[2] + 0.1, 1.4);
      if (f > BT.back) stream(out, f, [ALEX_YARD[0], 1.6, ALEX_YARD[2]], [BANK_B[0] + 2, 3.2, BANK_B[2] + 4.5], 3.5, BT.back + 4, 594, 6, 40, 0.5);
      break;
    }
    case 7: { // FOR RENT: the family walks in, keys and lease, rent starts flowing
      const u = clamp01((f - 602) / (BT.rents + 40 - 602)), fx0 = 9 - 7.2 * u, walking = u < 1;
      const handed = f > BT.rents + 46;
      front(cam, out, A, -0.6, 6.3, { mode: "stand", expr: "grin", prop: handed && f < BT.pay ? ["hold", "lease"] : f > BT.pay + 6 ? ["raise", "phone"] : f > BT.rents + 20 ? ["raise", "key"] : null, look: 1 }, t);
      const fam: [Who, number, number][] = [[W(20, DAD, "dad"), 0, 0], [W(21, MOM, "mom"), 1.1, 0.25], [W(22, KID_O, "kid"), 2.1, -0.15]];
      fam.forEach(([w, dx, dz], i) => {
        const x = fx0 + dx, z = WALK_Z + dz - (walking ? 0 : 0.6);
        if (walking) walker(cam, out, w, x, z, -1, 0, q((t * 1.05 + i * 0.3) % 1, 60), "smile", t, 0, i === 2 ? 0.62 : 1);
        else front(cam, out, w, x, z, { mode: "stand", expr: handed ? (i === 2 ? "laugh" : "grin") : "smile", look: -1, prop: i === 0 && f > BT.pay - 6 ? ["hold", "cash"] : null, wave: i === 2 && handed ? q(Math.sin(t * 10), 30) : undefined }, t, 0, i === 2 ? 0.62 : 1);
      });
      if (f > BT.pay) stream(out, f, [fx0 + 0.1, 1.5, WALK_Z - 0.5], [-0.15, 2.3, 6.4], 1.2, BT.pay + 2, 784, 5, 22, 0.42);
      burst(out, f, BT.rents + 46, 0.5, 2.6, 6.6, 1.2);
      break;
    }
    case 8: { // "but that's not all profit": the bills land around Alex
      const worried = f > BT.bills - 4;
      front(cam, out, A, ALEX_YARD[0], ALEX_YARD[2], { mode: "stand", expr: worried ? "nervous" : "grin", prop: worried ? null : ["raise", "phone"], look: worried ? 0 : 1, headTilt: worried ? 6 : 0 }, t);
      const labels = ["MORTGAGE", "TAXES", "INSURANCE", "REPAIRS"];
      labels.forEach((lb, i) => {
        const a = BT.bills - 4 + i * 12, u = clamp01((f - a) / 12);
        if (u <= 0) return;
        const [ex, ey] = [[-0.85, 2.2], [0.95, 2.4], [-0.65, 2.85], [0.8, 3.05]][i];
        out.fx.push({ key: "env" + lb, cw: 400, ch: 260, draw: (p) => fxEnvelope(p, lb), x: ALEX_YARD[0] + ex, y: ey + 3 * (1 - u) * (1 - u), z: ALEX_YARD[2] + 0.2, w: 0.85, h: 0.55, rot: 0.12 * Math.sin(i * 2 + t * 3) });
      });
      break;
    }
    case 9: { // the monthly math on the stage
      const [SX, , SZ] = STAGE;
      const wipe = f > BT.wipe;
      front(cam, out, A, SX - 1.5, SZ + 2.7, { mode: "stand", expr: wipe ? "shock" : f > BT.left ? "laugh" : "smile", look: 1, wave: f > BT.left + 10 && !wipe ? q(Math.sin(t * 8), 30) : undefined }, t);
      if (f > BT.left + 20 && !wipe) out.fx.push({ key: "heart", cw: 300, ch: 300, draw: fxHeart, x: SX + 2.6, y: 2.8 + 0.1 * Math.sin(t * 4), z: SZ + 1.6, w: 0.7, h: 0.7 });
      if (wipe) out.fx.push({ key: "alert", cw: 300, ch: 280, draw: fxAlert, x: SX + 2.6, y: 2.55, z: SZ + 1.6, w: 1.0 * smooth((f - BT.wipe) / 6), h: 0.93 * smooth((f - BT.wipe) / 6) });
      break;
    }
    case 10: { // five years go by; Alex watches his equity grow
      const ex: Expr = f > BT.eq ? "laugh" : f > BT.rise ? "grin" : "smile";
      front(cam, out, A, 4.4, 6.2, { mode: "stand", expr: ex, look: 1, wave: f > BT.def && f < BT.def + 50 ? 0.6 : undefined }, t);
      front(cam, out, W(20, DAD, "dad"), -1.2, 4.9, { mode: "stand", expr: "smile" }, t);
      front(cam, out, W(22, KID_O, "kid"), -0.2, 5.0, { mode: "stand", expr: "grin", wave: q(Math.sin(t * 7), 30) }, t, 0, 0.62);
      break;
    }
    case 11: { // proud at sunset
      front(cam, out, A, ALEX_YARD[0], ALEX_YARD[2], { mode: "stand", expr: f > 1530 ? "laugh" : "grin", wave: f > 1515 ? 1 : undefined, look: 0 }, t);
      front(cam, out, W(20, DAD, "dad"), -1.2, 4.9, { mode: "stand", expr: "smile" }, t);
      front(cam, out, W(21, MOM, "mom"), -2.4, 5.0, { mode: "stand", expr: "smile_closed" }, t);
      break;
    }
    case 12: {
      front(cam, out, A, ALEX_YARD[0], ALEX_YARD[2], { mode: "stand", expr: "laugh", wave: q(Math.sin(t * 6), 30) }, t);
      front(cam, out, W(20, DAD, "dad"), -1.2, 4.9, { mode: "stand", expr: "smile" }, t);
      front(cam, out, W(21, MOM, "mom"), -2.4, 5.0, { mode: "stand", expr: "smile_closed" }, t);
      break;
    }
  }
  void INK; void bodyFront; void bodySide; void fxSplash; void fxPuff; void fxRing; void fxShadow; void fxContact; void smooth; void DOOR;
  return out;
};
export { FPS };
