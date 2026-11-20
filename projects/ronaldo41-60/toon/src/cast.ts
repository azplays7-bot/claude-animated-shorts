// The cast of "How is Ronaldo still scoring at 41?" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, TOTAL, unwarp, warp, HOUSE, BED, TABLE_K, PRESS_T, TUB, CALENDAR, COUCH, WHITEBOARD, FRIDGE_NOTE, LOG_BOARD, POLE_M, SCREEN, BOOTH, GOAL_X, add } from "./story";
import { crAt } from "./blocking";
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
// ---- effect drawings ----
const txt = (p: Pen, s: string, x: number, y: number, size: number, col: string) => { const g = p.g; g.save(); g.fillStyle = col; g.font = `${size}px Anton, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, x, y); g.restore(); };
const fxLabel = (p: Pen, text: string, bg: string) => {
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  txt(p, text, 256, 84, text.length > 13 ? 52 : text.length > 9 ? 66 : text.length > 7 ? 80 : 100, "#ffffff");
};
const fxQuestion = (p: Pen) => { p.ell(150, 150, 130, 130, "#ffd23f", 12); txt(p, "?", 150, 160, 190, INK); };
const fxBang = (p: Pen) => { p.ell(150, 150, 130, 130, "#e23b4e", 12); txt(p, "!", 150, 160, 200, "#ffffff"); };
const fxConfetti = (p: Pen, seed: number) => {
  const g = p.g, cols = ["#ff4a6a", "#ffd23f", "#3fd8ff", "#2bd96b", "#b06ad0", "#ffffff"];
  for (let k = 0; k < 26; k++) { g.save(); g.translate(20 + hh(k, seed) * 460, 20 + hh(k, seed + 1) * 460); g.rotate(hh(k, seed + 2) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-12, -6, 24, 12); g.restore(); }
};
const fxStopwatch = (p: Pen, s: string) => {
  p.ell(256, 290, 200, 200, "#ffffff", 14); p.poly([[226, 60], [286, 60], [286, 100], [226, 100]], "#3a3f4a", 8);
  p.arc(256, 290, 170, 170, -90, 270, 10, "#d8262e"); txt(p, s, 256, 300, 150, INK);
};
const fxDust = (p: Pen) => { for (let k = 0; k < 5; k++) p.ell(60 + k * 34, 150 - k * 8, 50 - k * 5, 40 - k * 4, "rgba(220,220,225,0.9)", 0); };
const fxSpeed = (p: Pen) => { for (let k = 0; k < 6; k++) p.stroke([[20, 40 + k * 36], [200 + (k % 3) * 90, 40 + k * 36]], 10, "#ffffff"); };
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
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 0.6 * u * w, z, w: s, h: s * 0.3125 });
};
/** a card that pops in (back-out scale) and bobs */
const pop = (out: Stage, f: number, at: number, until: number, key: string, cw: number, ch: number, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, rot = 0) => {
  if (f < at || f > until) return;
  const u = clamp01((f - at) / 8), s = u < 1 ? 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2 : 1, o = clamp01((until - f) / 6);
  const k = Math.max(0.01, s * o);
  out.fx.push({ key, cw, ch, draw, x, y: y + 0.03 * w * Math.sin(f / 6), z, w: w * k, h: w * k * ch / cw, rot });
};
const confetti = (out: Stage, f: number, at: number, x: number, y: number, z: number, spread = 3) => {
  for (let i = 0; i < 6; i++) {
    const u = (f - at - i * 3) / 50;
    if (u < 0 || u > 1) continue;
    out.fx.push({ key: "conf" + (i % 3), cw: 500, ch: 500, draw: (p) => fxConfetti(p, i % 3), x: x + (hh(i, 3) - 0.5) * spread, y: y + 1.2 * u * (1.6 - u) - 0.4 * u, z: z + 0.2 * i,
      w: 1.6 * (1 - 0.3 * u), h: 1.6 * (1 - 0.3 * u), rot: u * 3 + i, soft: true });
  }
};

export type Stage = { places: Place[]; fx: FxPlace[] };
// ---- outfits ----
const HAIR = "#1a1410";
/** Ronaldo: red #7 shirt, green, white boots, slick dark hair */
const CRK: Outfit = { jacket: "#c8102e", pants: "#1f5a32", boots: "#f4f1ea", hat: "hair", hair: HAIR, skin: SKINS[1], num: "7" };
/** at home: white tee with a red 7 */
const CRH: Outfit = { jacket: "#f4f4f4", pants: "#3a3f4a", boots: "#f4f1ea", hat: "hair", hair: HAIR, skin: SKINS[1], num: "7", numCol: "#c8102e" };
const KIDCR: Outfit = { ...KID, jacket: "#c8102e", pants: "#1f5a32", boots: "#f4f1ea", hat: "hair", hair: HAIR, skin: SKINS[1], num: "7" };
const OLD: Outfit[] = [
  { jacket: "#f4f4f4", pants: "#1e3a8a", boots: "#2a2a2e", hat: "hair", hair: "#d8d8e0", skin: SKINS[0], num: "9", numCol: "#1e3a8a", build: "stout" },
  { jacket: "#2f6fd6", pants: "#f4f4f4", boots: "#2a2a2e", hat: "hair", hair: "#bfc4cc", skin: SKINS[3], num: "10", build: "stout" },
  { jacket: "#ffc928", pants: "#16121c", boots: "#2a2a2e", hat: "hair", hair: "#e4e4ea", skin: SKINS[2], num: "4", numCol: "#16121c", build: "stout" },
];
const PUNDIT: Outfit[] = [
  { jacket: "#2a2f3a", pants: "#2a2f3a", boots: "#16121c", hat: "hair", hair: "#bfc4cc", skin: SKINS[0], buttons: "#e8e4dc", build: "stout" },
  { jacket: "#5a3b2a", pants: "#2a2f3a", boots: "#16121c", hat: "hair", hair: "#d8d8e0", skin: SKINS[3], buttons: "#e8e4dc", moustache: "#d8d8e0" },
];
const MATE: Outfit[] = [
  { jacket: "#2f6fd6", pants: "#16121c", boots: "#f4f1ea", hat: "hair", hair: "#3a2a1e", skin: SKINS[3], num: "10" },
  { jacket: "#2f6fd6", pants: "#16121c", boots: "#f4f1ea", hat: "hair", hair: "#6a4a2a", skin: SKINS[0], num: "4" },
  { jacket: "#2f6fd6", pants: "#16121c", boots: "#f4f1ea", hat: "cap", cap: "#16121c", skin: SKINS[2], num: "8" },
  { jacket: "#2f6fd6", pants: "#16121c", boots: "#f4f1ea", hat: "hair", hair: "#1e1a18", skin: SKINS[1], num: "11" },
];
const GK: Outfit = { jacket: "#2bd96b", pants: "#16121c", boots: "#16121c", hat: "hair", hair: "#5a3b2a", skin: SKINS[0], num: "1", numCol: "#16121c" };
const MAX: Outfit = { jacket: "#2fa0a0", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", skin: SKINS[2] };
const PHOTO: Outfit[] = [
  { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] },
];
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const CR = W(1, CRK, "cr"), CRHOME = W(1, CRH, "crh"), KIDW = W(2, KIDCR, "kid"), GKW = W(3, GK, "gk"), MX = W(4, MAX, "max");
const front = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = 0, scale = 1, shadow = true, roll = 0) => {
  const pl = person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale);
  if (roll) pl.roll = roll;
  out.places.push(pl);
  if (shadow) blob(out, x, 0, z, scale);
};
const walker = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, dx: number, dz: number, phase: number, expr: Expr, t: number, y = 0, scale = 1, prop: FrontOpts["prop"] = null) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who, x, y, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, who.i), prop }, { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) }, scale));
  blob(out, x, y, z, scale);
};
const SIT_Y = 0.3;
const sitter = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = SIT_Y) =>
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), mode: "sit", ...fo }, {}, 1));

// ---- new effect drawings ----
const fxBall = (p: Pen, rot: number) => {
  p.ell(128, 128, 110, 110, "#ffffff", 10);
  const g = p.g; g.save(); g.translate(128, 128); g.rotate(rot);
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; p.dot(Math.cos(a) * 72, Math.sin(a) * 72, 22, INK); }
  p.poly([[0, -34], [32, -10], [20, 28], [-20, 28], [-32, -10]], INK, 0);
  g.restore();
};
const fxZzz = (p: Pen) => { txt(p, "Z", 60, 190, 90, "#2f6fd6"); txt(p, "Z", 130, 120, 70, "#2f6fd6"); txt(p, "z", 190, 60, 56, "#2f6fd6"); };
const fxBlanket = (p: Pen) => {
  p.poly([[10, 40], [500, 20], [502, 230], [14, 240]], "#3f6fd0", 10);
  for (let i = 0; i < 4; i++) p.stroke([[30 + i * 120, 34], [30 + i * 120, 236]], 6, "#7fa6f0");
  p.stroke([[12, 130], [500, 120]], 6, "#7fa6f0");
};
const fxClock = (p: Pen, a: number, ring: boolean) => {
  if (ring) for (const s of [-1, 1]) p.arc(128 + s * 60, 60, 40, 40, s < 0 ? 180 : 270, s < 0 ? 270 : 360, 14, "#ffd23f");
  p.ell(128, 140, 100, 100, ring ? "#e23b4e" : "#ffffff", 12); p.ell(128, 140, 80, 80, "#ffffff", 0);
  p.stroke([[128, 140], [128 + Math.sin(a) * 60, 140 - Math.cos(a) * 60]], 10, INK);
  p.stroke([[128, 140], [128 + Math.sin(a / 12) * 40, 140 - Math.cos(a / 12) * 40]], 14, INK);
};
const fxTick = (p: Pen) => p.stroke([[30, 140], [100, 210], [230, 40]], 34, "#2f9a4a");
const fxCross = (p: Pen) => { p.stroke([[40, 40], [216, 216]], 34, "#e23b4e"); p.stroke([[216, 40], [40, 216]], 34, "#e23b4e"); };
const fxPlate = (p: Pen, k: number) => {
  p.ell(128, 128, 116, 116, "#ffffff", 8); p.ell(128, 128, 84, 84, "#f0f0ec", 0);
  if (k === 0) { p.poly([[50, 128], [110, 92], [190, 110], [214, 128], [190, 146], [110, 164]], "#f2a07a", 6); p.poly([[200, 128], [232, 100], [232, 156]], "#f2a07a", 6); p.dot(80, 120, 8, INK); }
  else if (k === 1) { for (const [x, y] of [[96, 108], [160, 150]]) { p.ell(x, y, 50, 44, "#ffffff", 6); p.dot(x, y, 22, "#ffc928"); } }
  else { for (const [x, y, c] of [[92, 110, "#e23b4e"], [150, 100, "#2bd96b"], [120, 160, "#ffa62b"], [170, 156, "#7b4fd0"]] as const) p.ell(x, y, 30, 30, c, 6); }
};
const fxCake = (p: Pen) => {
  p.poly([[40, 140], [216, 140], [216, 230], [40, 230]], "#f2c8a0", 8); p.poly([[40, 110], [216, 110], [216, 150], [40, 150]], "#ff7aa8", 8);
  for (let k = 0; k < 4; k++) p.dot(70 + k * 40, 100, 9, ["#e23b4e", "#ffd23f", "#2f6fd6", "#2bd96b"][k]);
  p.stroke([[128, 104], [128, 50]], 12, "#ffffff"); p.ell(128, 40, 10, 16, "#ffa62b", 0);
};
const fxSoda = (p: Pen) => {
  p.poly([[96, 40], [160, 40], [176, 90], [180, 470], [76, 470], [80, 90]], "#c0242e", 8);
  p.poly([[110, 10], [146, 10], [146, 42], [110, 42]], "#e8e4dc", 6);
  p.poly([[78, 200], [178, 200], [178, 300], [78, 300]], "#ffffff", 0);
  txt(p, "FIZZ", 128, 252, 54, "#c0242e");
};
const fxWine = (p: Pen) => { p.poly([[70, 30], [186, 30], [170, 140], [128, 170], [86, 140]], "#e9f4fa", 8); p.poly([[80, 80], [176, 80], [166, 136], [128, 160], [90, 136]], "#8a1b3a", 0); p.stroke([[128, 170], [128, 290]], 12, "#e9f4fa"); p.ell(128, 296, 60, 14, "#e9f4fa", 6); };
const fxFlash = (p: Pen) => { p.dot(128, 128, 110, "rgba(255,255,255,0.55)"); p.dot(128, 128, 60, "#ffffff"); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; p.stroke([[128 + Math.cos(a) * 60, 128 + Math.sin(a) * 60], [128 + Math.cos(a) * 124, 128 + Math.sin(a) * 124]], 10, "#ffffff"); } };
const fxIce = (p: Pen) => { for (let k = 0; k < 7; k++) { const x = 40 + hh(k, 2) * 420, y = 40 + hh(k, 3) * 170, s = 26 + hh(k, 4) * 20; p.poly([[x - s, y - s * 0.8], [x + s, y - s], [x + s * 0.9, y + s], [x - s, y + s * 0.9]], "#e8f8ff", 6); p.stroke([[x - s * 0.5, y - s * 0.4], [x, y - s * 0.6]], 5, "#ffffff"); } };
const fxShiver = (p: Pen) => { for (const s of [-1, 1]) for (let k = 0; k < 3; k++) p.stroke([[128 + s * (70 + k * 18), 60 + k * 10], [128 + s * (84 + k * 18), 120], [128 + s * (70 + k * 18), 180 - k * 10]], 8, "#bfe9ff"); };
const fxShowerHead = (p: Pen) => {
  p.stroke([[128, 0], [128, 70], [150, 110]], 14, "#8a9099");
  p.poly([[100, 110], [210, 110], [190, 150], [120, 150]], "#b8bec6", 6);
  for (let k = 0; k < 5; k++) p.ell(125 + k * 15, 158, 4, 4, "#5aa9e6", 0);
};
/** falling ice-cold water, 4 animation phases */
const fxShower = (p: Pen, ph: number) => {
  for (let k = 0; k < 11; k++) {
    const x = 30 + k * 19 + hh(k, 7) * 8, len = 40 + hh(k, 8) * 40;
    for (let y = ((ph * 32 + hh(k, 9) * 128) % 128) - 128; y < 512; y += 128) p.stroke([[x, y], [x + 2, y + len]], 5, "rgba(140,210,255,0.85)");
  }
  for (let k = 0; k < 6; k++) { const y = (hh(k, 10) * 512 + ph * 40) % 512; p.ell(40 + hh(k, 11) * 180, y, 7, 7, "rgba(255,255,255,0.9)", 0); }
};
/** a little cartoon goat (the G.O.A.T. gag) */
const fxGoat = (p: Pen) => {
  for (const x of [130, 170, 230, 265]) p.stroke([[x, 250], [x, 330]], 14, "#3a3a3a");
  p.ell(200, 230, 95, 55, "#f4f1ea", 6);
  p.ell(300, 165, 48, 40, "#f4f1ea", 6);
  p.stroke([[285, 130], [270, 85], [250, 75]], 10, "#8a6a3c"); p.stroke([[310, 128], [305, 82], [288, 66]], 10, "#8a6a3c");
  p.poly([[300, 200], [318, 200], [309, 240]], "#e2ddd0", 4);
  p.ell(312, 160, 7, 9, "#1a1a1a", 0); p.ell(340, 178, 5, 4, "#1a1a1a", 0);
  p.stroke([[110, 215], [90, 200]], 10, "#f4f1ea");
};
const fxBreath = (p: Pen) => { for (let k = 0; k < 4; k++) p.ell(50 + k * 50, 128 - k * 10, 40 - k * 4, 30 - k * 3, "rgba(235,248,255,0.85)", 0); };
const fxPage = (p: Pen, n: number) => { p.poly([[8, 8], [248, 8], [248, 312], [8, 312]], "#ffffff", 6); p.g.fillStyle = "#c8102e"; p.g.fillRect(10, 10, 236, 60); txt(p, "DAY", 128, 42, 40, "#ffffff"); txt(p, String(n), 128, 190, 110, INK); };
const fxStamp = (p: Pen, s: string) => { p.g.save(); p.g.translate(256, 100); p.g.rotate(-0.15); p.g.strokeStyle = "#e23b4e"; p.g.lineWidth = 16; p.g.strokeRect(-230, -70, 460, 140); txt(p, s, 0, 6, 110, "#e23b4e"); p.g.restore(); };
const fxMedal = (p: Pen) => { p.poly([[90, 10], [128, 120], [166, 10], [200, 10], [150, 130], [106, 130], [56, 10]], "#c8102e", 6); p.ell(128, 190, 80, 80, "#ffc928", 10); p.ell(128, 190, 56, 56, "#ffdc5e", 0); txt(p, "#1", 128, 196, 70, "#8a5a10"); };
const fxDash = (p: Pen) => { for (let k = 0; k < 8; k++) p.g.fillRect(k * 64, 0, 40, 32); };
const fxWeb = (p: Pen) => { for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI / 2; p.stroke([[0, 0], [Math.cos(a) * 240, Math.sin(a) * 240]], 3, "#e8e8ee"); } for (const r of [60, 120, 180]) p.arc(0, 0, r, r, 0, 90, 3, "#e8e8ee"); };
const fxFirework = (p: Pen, u: number, col: string) => { const r = 40 + 200 * u; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; p.g.globalAlpha = 1 - u * 0.8; p.dot(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 14 * (1 - u * 0.6), col); } p.g.globalAlpha = 1; };
const fxBubble = (p: Pen, s: string) => {
  p.poly([[20, 20], [492, 20], [492, 200], [300, 200], [230, 262], [240, 200], [20, 200]], "#ffffff", 12);
  txt(p, s, 256, 112, s.length > 12 ? 58 : s.length > 8 ? 74 : 96, INK);
};
const ball = (out: Stage, x: number, y: number, z: number, t: number, s = 0.24) => { const r = q((t * 3) % (Math.PI * 2), 4); out.fx.push({ key: "ball" + r, cw: 256, ch: 256, draw: (p) => fxBall(p, r), x, y, z, w: s, h: s }); };
const fireworks = (out: Stage, f: number, f0: number, f1: number, cx: number, cy: number, cz: number, spread: number) => {
  for (let k = 0; f >= f0 && f < f1 && k < 5; k++) {
    const per = 26, age = (f - f0 + k * 11) % per, cyc = Math.floor((f - f0 + k * 11) / per), u = q(age / per, 20);
    const col = ["#ff3a5a", "#ffd23f", "#3fd8ff", "#2bd96b", "#ffffff"][(k + cyc) % 5];
    out.fx.push({ key: "fw" + u + col, cw: 512, ch: 512, draw: (p) => fxFirework(p, u, col), x: cx + (hh(k + cyc * 5, 1) - 0.5) * spread, y: cy + hh(k + cyc * 5, 2) * 8, z: cz + (hh(k + cyc * 5, 3) - 0.5) * spread * 0.5, w: 9, h: 9, soft: true });
  }
};
const H = (x: number, y: number, z: number): V3 => add(HOUSE, [x, y, z]);
const xyz = (p: V3) => ({ x: p[0], y: p[1], z: p[2] });
const fT = (s: number) => Math.round(warp(s) * FPS); // pre-warp seconds -> frame

/** Ronaldo, posed from the blocking */
const crCard = (cam: CamInfo, out: Stage, id: number, f: number, t: number, base: V3, who: Who, fo: FrontOpts, speed = 1.1) => {
  const m = crAt(id, f);
  if (!m.visible) return m;
  const x = base[0] + m.x, z = base[2] + m.z;
  if (m.mode === "lie") front(cam, out, who, x, z, { mode: "stand", ...fo }, t, 0.78 + base[1], 1, false, Math.PI / 2);
  else if (m.mode === "sit") sitter(cam, out, who, x, z, fo, t);
  else if (m.mode === "walk") walker(cam, out, who, x, z, m.dx, m.dz, q((t * speed) % 1, 60), fo.expr ?? "grin", t, 0, 1, fo.prop ?? null);
  else if (m.mode === "jump") { front(cam, out, who, x, z, { ...fo, mode: "fall" }, t, m.y, 1, false); blob(out, x, 0, z, 1 - m.y * 0.4); }
  else front(cam, out, who, x, z, { mode: "stand", ...fo }, t);
  return m;
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  t = unwarp(t); // the times written below are pre-warp seconds (beats BT are frames of the current narration)
  LNAME = s.light;
  findSun(cam, SUN);
  const B = s.place === "house" ? HOUSE : ([0, 0, 0] as V3);
  switch (id) {
    case 1: { // hook: most retire at 35; he's 41 and chasing 1,000
      OLD.forEach((o, i) => front(cam, out, W(10 + i, o, "old" + i), -5 + i * 1.6, -30.1 + (i % 2) * 0.15, { mode: "stand", expr: i === 1 ? "laugh" : "grin", look: i - 1, wave: q(Math.sin(t * 6 + i), 30) }, t));
      pop(out, f, 6, BT.players - 2, "bye", 512, 280, (p) => fxBubble(p, "BYE BYE!"), -2.0, 2.65, -29.8, 1.4);
      riser(out, f, BT.n35 - 2, "RETIRED AT 35", "#6a707a", -3.4, 2.4, -29.6, 2.0, 30);
      // pundits in the TV booth
      PUNDIT.forEach((o, i) => {
        const talk = i === Math.floor(t * 1.4) % 2;
        front(cam, out, W(20 + i, o, "pun" + i), BOOTH[0] - 0.9 + i * 1.8, BOOTH[2] + 0.35, { mode: "stand", expr: talk ? (Math.floor(t * 8) % 2 ? "laugh" : "grin") : "smile", look: i ? -1 : 1, wave: talk && i === 0 ? q(Math.sin(t * 5), 30) : undefined }, t, BOOTH[1], 1, false);
      });
      pop(out, f, BT.talking - 4, fT(5.2), "pundit", 512, 280, (p) => fxBubble(p, "BACK IN MY DAY..."), BOOTH[0] - 1.2, BOOTH[1] + 2.5, BOOTH[2] - 0.6, 1.7);
      // Ronaldo
      const m = crCard(cam, out, 1, f, t, B, CR, { expr: t < 9.65 ? "grin" : "laugh", look: t < 7 ? 0 : 1, wave: t >= 9.65 ? q(Math.sin(t * 8), 30) : undefined }, 3.0);
      if (m.visible) {
        const run = t >= 7.3 && t < 9.55;
        ball(out, m.x + (run ? 0.7 + 0.25 * Math.sin(t * 9) : 0.32), 0.12, m.z + 0.15, run ? t * 4 : 0);
        if (run) { out.fx.push({ key: "speed", cw: 512, ch: 256, draw: fxSpeed, x: m.x - 1.0, y: 1.1, z: m.z + 0.05, w: 1.4, h: 0.7 }); for (let k = 0; k < 2; k++) out.fx.push({ key: "dust", cw: 256, ch: 200, draw: fxDust, x: m.x - 0.6 - k * 0.6, y: 0.3, z: m.z + 0.1, w: 0.8, h: 0.6, soft: true }); }
      }
      burst(out, f, BT.cristiano, 0, 1.3, 0.3, 2.6);
      confetti(out, f, BT.cristiano + 4, 0, 2.4, 0.6, 4);
      pop(out, f, BT.how - 2, TOTAL, "q", 300, 300, fxQuestion, 20.55, 2.55, 0.4, 0.5);
      riser(out, f, BT.follow, "FOLLOW HIS DAY", "#2f6fd6", 19.6, 2.4, 0.5, 1.5, 34);
      fireworks(out, f, 0, fT(11), 30, 26, -50, 60);
      break;
    }
    case 2: { // morning: sleep, naps, breakfast, the soda bottles, no alcohol
      const m = crAt(2, f);
      const lying = m.mode === "lie";
      const ex: Expr = lying ? "smile_closed" : t < 17.25 ? "grin" : t < 19.6 ? (t >= 18.6 ? "stern" : "laugh") : t < 23.55 ? (t >= unwarp(BT.held / FPS) ? "grin" : "smile") : "stern";
      let pr: FrontOpts["prop"] = null;
      if (t >= unwarp(BT.held / FPS) - 0.1 && t < 23.55) pr = ["raise", "water"];
      const who = t < 19.6 ? CRHOME : CR;
      crCard(cam, out, 2, f, t, B, who, { expr: ex, prop: pr, blink: lying ? 1 : undefined, wave: !lying && t >= 11.75 && t < 12.45 ? q(Math.sin(t * 6), 30) : t >= 23.55 ? q(Math.sin(t * 10), 30) : undefined, look: t >= 23.55 ? (Math.floor(t * 5) % 2 ? 1 : -1) : 0 });
      // bed: blanket, Zzz, alarm, wall clock
      if (lying) {
        out.fx.push({ key: "blanket", cw: 512, ch: 256, draw: fxBlanket, ...xyz(H(-11.9, 0.75, -2.55)), w: 2.2, h: 0.7 });
        const u = (t * 0.8) % 1;
        out.fx.push({ key: "zzz", cw: 256, ch: 256, draw: fxZzz, ...xyz(H(-13.0 + u * 0.3, 1.2 + u * 0.5, -2.8)), w: 0.5, h: 0.5 });
      }
      const ring = f >= BT.morning - 4 && f < BT.wakes;
      out.fx.push({ key: "alarm" + (ring ? Math.floor(t * 12) % 2 : 2), cw: 256, ch: 256, draw: (p) => fxClock(p, 1.2, ring), ...xyz(H(-14.9 + (ring ? 0.02 * Math.sin(t * 60) : 0), 0.85, -3.25)), w: 0.32, h: 0.32 });
      if (t >= 14.55 && t < 17.25) { const a = q(t * 14, 6); out.fx.push({ key: "wclock" + a, cw: 256, ch: 256, draw: (p) => fxClock(p, a, false), ...xyz(H(-12.0, 2.85, -3.94)), w: 0.42, h: 0.42 }); }
      burst(out, f, BT.wakes, ...H(-9.7, 1.4, -1.6), 1.6);
      riser(out, f, BT.rested - 2, "RESTED!", "#2f9a4a", ...H(-9.7, 2.25, -1.7), 0.9, 30);
      // whiteboard ticks: night sleep, then the naps
      [BT.sleep + 4, BT.naps - 6, BT.naps + 6, BT.naps + 18].forEach((at, i) => { if (f >= at) out.fx.push({ key: "tick", cw: 256, ch: 256, draw: fxTick, ...xyz(H(WHITEBOARD[0] - 0.33, WHITEBOARD[1] + 0.09 - 0.122 * i, WHITEBOARD[2] + 0.03)), w: 0.11, h: 0.11 }); });
      ["NAP 1", "NAP 2", "NAP 3"].forEach((n, i) => riser(out, f, BT.naps - 8 + i * 12, n, "#2f6fd6", ...H(-12.9 + i * 0.55, 1.35 + i * 0.1, -2.6), 0.55, 28));
      riser(out, f, BT.reportedly + 4, "REPORTEDLY", "#6a707a", ...H(-12, 2.2, -2.6), 1.1, 34);
      // breakfast
      if (t >= 17.25 && t < 19.6) {
        [[-0.4, -0.25], [0.2, -0.1], [0.55, 0.15]].forEach(([dx, dz], k) => out.fx.push({ key: "plate" + k, cw: 256, ch: 256, draw: (p) => fxPlate(p, k), ...xyz(H(TABLE_K[0] + dx, 0.79, TABLE_K[2] + dz)), w: 0.36, h: 0.36, flat: true }));
        riser(out, f, BT.protein - 2, "PROTEIN!", "#2f9a4a", ...H(TABLE_K[0], 1.55, TABLE_K[2] + 0.2), 0.7, 30);
        pop(out, f, BT.sugar - 10, fT(19.6), "cake", 256, 256, fxCake, ...H(FRIDGE_NOTE[0] - 0.5, 1.4, -2.7), 0.36);
        pop(out, f, BT.sugar, fT(19.6), "crossCake", 256, 256, fxCross, ...H(FRIDGE_NOTE[0] - 0.5, 1.4, -2.65), 0.42);
      }
      // the press table: two soda bottles go, water comes up
      if (t >= 19.6 && t < 25.6) {
        const [px, , pz] = PRESS_T;
        const gone = (k: number) => BT.off - 8 + k * 8;
        for (let k = 0; k < 2; k++) {
          const at = gone(k), a: V3 = H(px - 0.22 + k * 0.44, 0.94, pz + 0.18), b: V3 = H(px + 1.9 + k * 0.4, 0.4, pz + 0.5);
          if (f < at) out.fx.push({ key: "soda", cw: 256, ch: 480, draw: fxSoda, ...xyz(a), w: 0.17, h: 0.32 });
          else toss(out, f, at, 12, a, b, 0.5, "soda", 256, 480, fxSoda, 0.32);
          if (f >= at + 12) out.fx.push({ key: "sodaDown", cw: 256, ch: 480, draw: fxSoda, ...xyz(b), w: 0.17, h: 0.32, rot: 1.5 });
        }
        riser(out, f, BT.soda, "SODA? NO.", "#c0242e", ...H(px + 0.8, 1.55, pz + 0.4), 0.8, 30);
        riser(out, f, BT.water - 2, "WATER!", "#2f6fd6", ...H(px + 0.55, 1.95, pz + 0.3), 0.75, 34);
        // photographers + flashes
        [[2.0, 0.2], [6.0, 0.3]].forEach(([x, z], i) => front(cam, out, W(30 + i, PHOTO[i], "ph" + i), ...([H(x, 0, z)[0], H(x, 0, z)[2]] as [number, number]), { mode: "stand", expr: "grin", look: i ? -1 : 1, prop: ["raise", "phone"] }, t));
        for (let k = 0; k < 6; k++) { const at = fT(19.8) + k * 17 + (k % 2) * 5; if (f >= at && f < at + 4) out.fx.push({ key: "flash", cw: 256, ch: 256, draw: fxFlash, ...xyz(H(k % 2 ? 5.75 : 2.3, 2.0, k % 2 ? 0.35 : 0.25)), w: 0.6, h: 0.6 }); }
        if (f >= BT.held && f < BT.held + 4) out.fx.push({ key: "flash", cw: 256, ch: 256, draw: fxFlash, ...xyz(H(px + 0.6, 1.7, pz + 0.6)), w: 0.8, h: 0.8 });
        // alcohol? never
        pop(out, f, BT.alcohol - 6, TOTAL, "wine", 256, 320, fxWine, ...H(px + 0.17, 1.0, pz + 0.3), 0.22);
        pop(out, f, BT.alcohol + 8, TOTAL, "crossWine", 256, 256, fxCross, ...H(px + 0.17, 1.02, pz + 0.33), 0.34);
        riser(out, f, BT.drink - 6, "NO ALCOHOL", "#c0242e", ...H(px, 1.85, pz + 0.4), 0.85, 30);
      }
      break;
    }
    case 3: { // training: sprints, weights, extra shooting, first in / last out, the jump
      const m = crAt(3, f);
      const kicking = t >= 27.35 && t < 31.55;
      const shot = kicking ? (t - 27.45) % 0.55 : 1;
      let ex: Expr = t < 26.35 ? "grin" : t < 27.35 ? "pained" : kicking ? "grin" : t < 33 ? "stern" : "laugh";
      if (t >= 35.55) ex = "laugh";
      const pr: FrontOpts["prop"] = t >= 26.8 && t < 27.35 ? (Math.floor(t * 5) % 2 ? ["raise", "dumbbell"] : ["hold", "dumbbell"]) : null;
      crCard(cam, out, 3, f, t, B, CR, { expr: ex, prop: pr, tilt: kicking && shot < 0.12 ? -8 : 0, look: kicking ? 1 : 0 }, 3.6);
      // teammates: train with him, then head for the tunnel from 27.6
      MATE.forEach((o, i) => {
        const x0 = 24 + i * 2.4, z0 = 7 + (i % 2) * 2.5, x1 = 38.4 + i * 0.6, z1 = -37.5, u = clamp01((t - 27.6 - i * 0.15) / 5.0);
        if (u <= 0) front(cam, out, W(40 + i, o, "mate" + i), x0, z0, { mode: "stand", expr: "grin", look: -1 }, t);
        else if (u < 1) walker(cam, out, W(40 + i, o, "mate" + i), x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, x1 - x0, z1 - z0, q((t * 1.1 + i * 0.3) % 1, 60), "smile", t);
      });
      if (t >= 29.45 && t < 31.55) [0, 1].forEach((i) => front(cam, out, W(40 + i, MATE[i], "mate" + i), 40.6 + i * 1.8, -33.2, { mode: "stand", expr: Math.floor(t * 6 + i) % 2 ? "laugh" : "grin", look: i ? -1 : 1 }, t));
      pop(out, f, BT.teammates, BT.last - 2, "say1", 512, 280, (p) => fxBubble(p, "FIRST IN..."), 40.4, 2.7, -32.9, 1.3);
      pop(out, f, BT.last - 2, fT(31.55), "say2", 512, 280, (p) => fxBubble(p, "...LAST OUT!"), 42.6, 2.7, -32.9, 1.3);
      if (f >= BT.first) out.fx.push({ key: "tick", cw: 256, ch: 256, draw: fxTick, x: LOG_BOARD[0] + 0.97, y: LOG_BOARD[1] + 0.09, z: -37.66, w: 0.4, h: 0.4 });
      if (f >= BT.last) out.fx.push({ key: "tick", cw: 256, ch: 256, draw: fxTick, x: LOG_BOARD[0] + 0.97, y: LOG_BOARD[1] - 0.47, z: -37.66, w: 0.4, h: 0.4 });
      burst(out, f, BT.first, LOG_BOARD[0] + 0.97, LOG_BOARD[1] + 0.09, -37.5, 0.7); burst(out, f, BT.last, LOG_BOARD[0] + 0.97, LOG_BOARD[1] - 0.47, -37.5, 0.7);
      // sprint
      if (m.mode === "walk") { out.fx.push({ key: "speed", cw: 512, ch: 256, draw: fxSpeed, x: m.x - 1.1, y: 1.1, z: m.z + 0.05, w: 1.4, h: 0.7 }); out.fx.push({ key: "dust", cw: 256, ch: 200, draw: fxDust, x: m.x - 0.7, y: 0.3, z: m.z + 0.1, w: 0.8, h: 0.6, soft: true }); }
      riser(out, f, BT.sprints, "SPRINTS", "#c8102e", 18, 2.3, 4.6, 1.4, 22);
      riser(out, f, BT.weights + 2, "WEIGHTS", "#2a2f3a", 24, 2.35, 8.3, 0.8, 18);
      // extra shooting: a ball every 0.55 s into the net
      if (kicking) {
        for (let k = 0; k < 8; k++) {
          const at = fT(27.45 + k * 0.55);
          toss(out, f, at, 9, [41.45, 0.12, 0.1], [52.6, 0.7 + (k % 3) * 0.6, -2.4 + (k % 4) * 1.5], 0.5, "ball0", 256, 256, (p) => fxBall(p, 0), 0.24);
          burst(out, f, at + 9, 52.4, 0.7 + (k % 3) * 0.6, -2.4 + (k % 4) * 1.5, 1.0);
        }
        if (shot > 0.15) ball(out, 41.38, 0.12, 0.15, 0);
      }
      riser(out, f, BT.extra, "EXTRA SHOTS", "#c8102e", 41.2, 2.4, 0.4, 1.3, 30);
      pop(out, f, BT.leaves - 6, fT(29.45), "still", 512, 280, (p) => fxBubble(p, "ONE MORE!"), 41.4, 2.7, 0.3, 1.6);
      // the jump: cross in, header, the measuring line
      if (t >= 31.55) {
        toss(out, f, fT(32.9), fT(33.75) - fT(32.9), [36, 2.5, 9], [46.3, 2.95, 0.75], 2.0, "ball0", 256, 256, (p) => fxBall(p, 0), 0.24);
        toss(out, f, fT(33.75), 10, [46.3, 2.95, 0.75], [52.7, 1.9, 1.6], 0.2, "ball0", 256, 256, (p) => fxBall(p, 0), 0.24);
        burst(out, f, fT(33.75), 46.3, 2.95, 0.8, 1.2);
        if (f >= BT.measured - 6 && t < 35.55) {
          out.fx.push({ key: "dash", cw: 512, ch: 32, draw: fxDash, x: 46.45, y: 2.56, z: -0.1, w: 1.3, h: 0.04 });
          riser(out, f, BT.measured - 4, "2.5 M+", "#c8102e", 47.2, 2.95, -0.2, 0.75, 46);
        }
        riser(out, f, BT.jumps - 4, "BOING!", "#2f6fd6", 45.2, 1.0, 1.4, 0.7, 24);
        // keeper looks up, ball in the net
        front(cam, out, GKW, 50.4, 0.8, { mode: t > 33.8 ? "fall" : "stand", expr: t > 33.6 ? "shock" : "stern", look: -1 }, t, t > 33.8 ? 0.25 : 0, 1, true, t > 33.8 ? -0.35 : 0);
        if (t >= 34.15) { ball(out, 53.4, 0.15, 1.6, 0); }
        burst(out, f, fT(34.0), 53.2, 1.6, 1.6, 1.4);
        riser(out, f, BT.high - 2, "WHAT?!", "#2a2f3a", 50.6, 2.5, 0.8, 0.75, 26);
      }
      break;
    }
    case 4: { // ice bath, then rest + repeat
      const shiver = f >= BT.ice - 4 ? 0.02 * Math.sin(t * 70) : 0;
      // standing in the tub under an ice-cold shower (the tub hides his legs)
      front(cam, out, CRHOME, H(TUB[0] + shiver, 0, 0)[0], H(0, 0, TUB[2] - 0.1)[2], { mode: "stand", expr: f < BT.ice - 4 ? "grin" : f < BT.rest ? "shock" : "smile_closed", look: 0 }, t, 0.15, 1, false);
      out.fx.push({ key: "showerHead", cw: 256, ch: 256, draw: fxShowerHead, ...xyz(H(TUB[0], 2.25, TUB[2] - 0.2)), w: 0.75, h: 0.75 });
      if (f >= BT.later - 2 && f < BT.rest + 4) { const ph = Math.floor(f / 2) % 4; out.fx.push({ key: "shower" + ph, cw: 256, ch: 512, draw: (p) => fxShower(p, ph), ...xyz(H(TUB[0], 1.45, TUB[2] + 0.05)), w: 0.9, h: 1.8, soft: true }); }
      out.fx.push({ key: "ice", cw: 512, ch: 256, draw: fxIce, ...xyz(H(TUB[0], 0.64, TUB[2])), w: 1.7, h: 0.85, flat: true });
      if (f >= BT.ice - 4 && f < BT.rest) out.fx.push({ key: "shiver", cw: 256, ch: 256, draw: fxShiver, ...xyz(H(TUB[0], 1.45, TUB[2] + 0.1)), w: 0.85, h: 0.85 });
      if (f >= BT.brrr - 6 && f < BT.rest) { const u = (t * 1.5) % 1; out.fx.push({ key: "breath", cw: 256, ch: 256, draw: fxBreath, ...xyz(H(TUB[0] + 0.25 + u * 0.3, 1.55 + u * 0.15, TUB[2] + 0.3)), w: 0.4 + u * 0.2, h: 0.4 + u * 0.2, soft: true }); }
      riser(out, f, BT.ice, "3°C", "#2f6fd6", ...H(TUB[0] - 0.7, 1.6, TUB[2] + 0.4), 0.5, 30);
      riser(out, f, BT.brrr + 2, "BRRR!", "#2f6fd6", ...H(TUB[0] + 0.45, 2.0, TUB[2] + 0.3), 0.7, 30);
      // the calendar: pages fly off
      if (f >= BT.rest - 4) for (let k = 0; k < 14; k++) toss(out, f, BT.rest - 4 + k * 5, 18, H(CALENDAR[0], CALENDAR[1], CALENDAR[2] + 0.05), H(CALENDAR[0] + (hh(k, 5) - 0.3) * 3, 0.1, CALENDAR[2] + 1.5 + hh(k, 6)), 0.6, "page" + (k + 1), 256, 320, (p) => fxPage(p, k + 1), 0.32);
      pop(out, f, BT.repeat - 2, TOTAL, "stampRep", 512, 200, (p) => fxStamp(p, "REPEAT"), ...H(CALENDAR[0], CALENDAR[1] - 0.15, CALENDAR[2] + 0.12), 0.9);
      riser(out, f, BT.rest, "REST", "#2f9a4a", ...H(CALENDAR[0] - 0.8, 2.3, CALENDAR[2] + 0.4), 0.55, 26);
      break;
    }
    case 5: { // the result
      const kick = t < 42.5;
      crCard(cam, out, 5, f, t, B, CR, { expr: t < 42.3 ? "stern" : t >= 49.75 && t < 50.95 ? "smile" : "laugh", tilt: t >= 42.1 && t < 42.35 ? -8 : 0,
        prop: t >= 48.4 && t < 49.75 ? ["raise", "trophy"] : null, wave: t >= 43.2 && t < 44.65 ? q(Math.sin(t * 7), 30) : undefined });
      if (kick) { if (t < 42.15) ball(out, 41.4, 0.12, 0.15, 0); toss(out, f, fT(42.15), 9, [41.45, 0.12, 0.1], [52.6, 1.4, -1.8], 0.6, "ball0", 256, 256, (p) => fxBall(p, 0), 0.26); }
      front(cam, out, GKW, 51.0, 0.3, { mode: t > 42.25 ? "fall" : "stand", expr: t > 42.25 ? "shock" : "stern", look: -1 }, t, t > 42.25 && t < 43 ? 0.35 : 0, 1, true, t > 42.25 ? 0.55 : 0);
      burst(out, f, fT(42.45), 52.6, 1.4, -1.8, 1.2); confetti(out, f, fT(42.45), 50, 3, -1, 6);
      riser(out, f, fT(42.5), "GOAL!", "#c8102e", 48.5, 3.2, -0.5, 2.0, 30);
      fireworks(out, f, fT(42.4), fT(52.2), 62, 30, 0, 40);
      fireworks(out, f, fT(46.3), fT(47.4), 40, 26, -52, 70);
      pop(out, f, BT.goat - 2, BT.cups - 2, "goat", 384, 384, fxGoat, 42.5, 0.42, 0.4, 0.7);
      riser(out, f, BT.goat - 2, "G.O.A.T.", "#ffc928", 42, 2.45, 0.4, 1.0, 28);
      for (let k = 0; k < 6; k++) pop(out, f, BT.cups + 4 + k * 4, fT(48.4), "cupball", 256, 256, (p) => fxBall(p, k), SCREEN[0] - 0.6, SCREEN[1] - 2.6, -4.5 + k * 1.8, 1.4);
      confetti(out, f, BT.league, 42, 3.2, 0.6, 4);
      riser(out, f, BT.league + 2, "CHAMPIONS", "#ffc928", 42, 2.5, 0.4, 1.1, 34);
      if (t >= 49.75 && t < 50.95) {
        front(cam, out, KIDW, 30, 0, { mode: "stand", expr: "grin", look: 0 }, t);
        ball(out, 30.25, 0.25 + Math.abs(Math.sin(t * 6)) * 0.45, 0.2, t * 3, 0.2);
        riser(out, f, BT.talent, "TALENT", "#2f6fd6", 30, 1.75, 0.4, 0.75, 30);
      }
      ["SLEEP", "FOOD", "TRAIN", "ICE"].forEach((_, k) => { if (f >= BT.habits + 3 + k * 5) { out.fx.push({ key: "tick", cw: 256, ch: 256, draw: fxTick, x: SCREEN[0] - 0.4, y: SCREEN[1] - 1.9, z: (140 + 248 * k - 512) / 56.9, w: 1.6, h: 1.6 }); } });
      for (let k = 0; k < 4; k++) burst(out, f, BT.habits + 3 + k * 5, SCREEN[0] - 0.4, SCREEN[1] - 1.9, (140 + 248 * k - 512) / 56.9, 2.4);
      break;
    }
    case 6: { // you, on the couch
      sitter(cam, out, MX, H(COUCH[0], 0, 0)[0], H(0, 0, COUCH[2] + 0.05)[2], { expr: f < BT.skip - 4 ? "smile" : "nervous", prop: ["raise", "chips"], look: f < BT.skip - 4 ? 1 : -1 }, t, 0.32);
      out.fx.push({ key: "web", cw: 256, ch: 256, draw: fxWeb, ...xyz(H(COUCH[0] + 1.75, 0.22, COUCH[2] + 1.0)), w: 0.32, h: 0.32 });
      riser(out, f, BT.skip - 2, "SKIPPED", "#6a707a", ...H(COUCH[0], 1.75, COUCH[2] + 0.4), 0.8, 28);
      pop(out, f, BT.workout - 2, TOTAL, "sweat", 300, 300, fxQuestion, ...H(COUCH[0] + 0.45, 1.55, COUCH[2] + 0.3), 0.3);
      break;
    }
    case 7: { // still training at 41: SIUUU
      const m = crAt(7, f);
      crCard(cam, out, 7, f, t, B, CR, { expr: m.mode === "jump" ? "laugh" : t > 56.1 ? "laugh" : "grin", wave: t < 55 ? q(Math.sin(t * 5), 30) : undefined });
      ball(out, 42.38, 0.12, 0.2, 0);
      riser(out, f, BT.n41d + 4, "SIUUU!", "#ffc928", 42, 2.9, 0.4, 1.8, 50);
      burst(out, f, fT(56.1), 42, 1.6, -0.4, 1.6);
      confetti(out, f, fT(56.1), 42, 3.0, 0.6, 6);
      confetti(out, f, fT(57.2), 42, 4.0, 0.6, 8);
      fireworks(out, f, fT(54.0), TOTAL, 42, 22, -20, 70);
      fireworks(out, f, fT(56.2), TOTAL, 62, 26, 10, 40);
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void townsfolk; void smooth; void TOTAL; void BED; void POLE_M; void GOAL_X; void fxBang; void fxStopwatch; void SCREEN;
  return out;
};
export { FPS };
