// The cast of "From empty shop to owner" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, LOBBY, STAGE, WALK_Z, COUNTER, CUST, OWNER_S, OWNER_L, MAX_STREET, OWNER_STREET, NOFOOD, POPPER, CURTAIN_Z, SHOP_FRONT, JARS, add } from "./story";
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
/** Max the moviegoer: teal hoodie, yellow cap */
const MAX: Outfit = { jacket: "#2fa0a0", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", skin: SKINS[2] };
/** the theater manager: red vest, gold buttons */
const OWNER: Outfit = { jacket: "#b0242e", pants: "#1e1e26", boots: "#1e1a18", hat: "hair", hair: "#3a2a1e", buttons: "#f2c33a", skin: SKINS[1], build: "stout" };
/** the counter crew: cream shirt, red cap */
const CREW: Outfit = { jacket: "#f4efe6", pants: "#3b3f52", boots: "#3a2a1e", hat: "cap", cap: "#e3263a", buttons: "#e3263a", skin: SKINS[3] };
const MODERN: Outfit[] = [
  { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] },
  { jacket: "#3fa08a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#5a8fc2", skin: SKINS[1] },
  { jacket: "#e8a84a", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#2f6fd6", skin: SKINS[3] },
  { jacket: "#7b4fd0", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#5a3b2a", skin: SKINS[2] },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1e1a18", dress: "#c0392b", skin: SKINS[3] },
];
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const MX = W(1, MAX, "max"), OW = W(2, OWNER, "owner"), CR = W(3, CREW, "crew");
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
const fxCoin = (p: Pen) => { p.ell(128, 128, 110, 110, "#f2c33a", 10); p.ell(128, 128, 82, 82, null, 6); txt(p, "$", 128, 134, 120, "#8a5a12"); };
const fxLabel = (p: Pen, text: string, bg: string) => {
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  txt(p, text, 256, 84, text.length > 9 ? 66 : text.length > 7 ? 80 : 100, "#ffffff");
};
const fxQuestion = (p: Pen) => { p.ell(150, 150, 130, 130, "#ffd23f", 12); txt(p, "?", 150, 160, 190, INK); };
const fxConfetti = (p: Pen, seed: number) => {
  const g = p.g, cols = ["#ff4a6a", "#ffd23f", "#3fd8ff", "#2bd96b", "#b06ad0", "#ffffff"];
  for (let k = 0; k < 26; k++) { g.save(); g.translate(20 + hh(k, seed) * 460, 20 + hh(k, seed + 1) * 460); g.rotate(hh(k, seed + 2) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-12, -6, 24, 12); g.restore(); }
};
/** one popped kernel */
const fxKernel = (p: Pen, k: number) => {
  for (const [dx, dy, r] of [[-30, 6, 44], [26, 0, 46], [0, -30, 44], [4, 28, 40]]) p.ell(128 + dx + (k % 2) * 6, 128 + dy, r, r * 0.9, "#fff6d6", 8);
  p.ell(132, 136, 16, 12, "#ffd76a", 0);
};
/** a big striped popcorn tub */
const fxTub = (p: Pen) => {
  for (const [dx, dy, r] of [[-70, 70, 44], [-24, 50, 50], [30, 52, 48], [76, 72, 40], [0, 92, 46], [-52, 100, 40], [56, 104, 40], [-6, 30, 40]]) p.ell(150 + dx, 80 + dy, r, r * 0.9, "#fff6d6", 8);
  const pts: [number, number][] = [[50, 150], [250, 150], [222, 380], [78, 380]];
  p.poly(pts, "#ffffff", 0);
  for (const k of [-2, 0, 2]) { const x = 150 + k * 34; p.poly([[x - 15, 152], [x + 15, 152], [x + 11 + k * 1.5, 378], [x - 11 + k * 1.5, 378]], "#e3263a", 0); }
  p.poly(pts, null, 10);
  p.poly([[70, 220], [230, 220], [224, 280], [76, 280]], "#ffd23f", 7);
  txt(p, "POPCORN", 150, 252, 48, "#7a1414");
};
const fxPrinter = (p: Pen) => {
  p.poly([[70, 30], [230, 30], [230, 110], [70, 110]], "#ffffff", 9);
  p.poly([[20, 100], [280, 100], [280, 220], [20, 220]], "#cfd6df", 10);
  p.poly([[60, 200], [240, 200], [250, 290], [50, 290]], "#ffffff", 9);
  for (const y of [232, 252, 270]) p.stroke([[80, y], [220, y]], 5, "#7f95c8");
  p.dot(250, 130, 12, "#2bd96b");
  p.poly([[200, 240], [290, 240], [290, 300], [200, 300]], null, 0);
};
const fxInk = (p: Pen) => {
  p.poly([[60, 20], [196, 20], [196, 236], [60, 236]], "#2a2f3a", 10);
  p.poly([[78, 60], [178, 60], [178, 200], [78, 200]], "#3fd8ff", 0);
  txt(p, "INK", 128, 100, 52, "#0c2a40"); txt(p, "$$$", 128, 160, 52, "#ffffff");
};
const fxPad = (p: Pen) => {
  const g = p.g; g.save(); g.beginPath();
  g.moveTo(60, 70); g.lineTo(240, 70); g.quadraticCurveTo(300, 70, 290, 170); g.quadraticCurveTo(280, 230, 230, 200); g.lineTo(70, 200);
  g.quadraticCurveTo(20, 230, 10, 170); g.quadraticCurveTo(0, 70, 60, 70); g.closePath();
  g.fillStyle = "#3a4150"; g.fill(); g.lineWidth = 10; g.strokeStyle = INK; g.stroke(); g.restore();
  p.poly([[60, 120], [100, 120], [100, 136], [60, 136]], "#ffffff", 0); p.poly([[72, 108], [88, 108], [88, 148], [72, 148]], "#ffffff", 0);
  p.dot(210, 112, 13, "#e23b4e"); p.dot(238, 136, 13, "#2bd96b"); p.dot(182, 136, 13, "#2f6fd6"); p.dot(210, 160, 13, "#ffd23f");
};
const fxGame = (p: Pen) => {
  p.poly([[50, 20], [206, 20], [206, 236], [50, 236]], "#7b4fd0", 10);
  p.poly([[68, 40], [188, 40], [188, 150], [68, 150]], "#ffd23f", 0);
  txt(p, "GAME", 128, 96, 50, "#3a1a6a"); txt(p, "$$$", 128, 194, 52, "#ffffff");
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
/** kernels popping out of the machine */
const kernels = (out: Stage, f: number, at: number, until: number, x: number, y: number, z: number, n = 14) => {
  for (let i = 0; i < n; i++) {
    const t0 = at + i * 2.5 + hh(i, 7) * 4;
    for (let rep = 0; t0 + rep * 40 <= until; rep++) {
      const u = (f - t0 - rep * 40) / 28;
      if (u < 0 || u > 1) continue;
      const ang = (hh(i, 1) - 0.5) * 2.4, sp = 1.4 + hh(i, 2) * 1.2;
      out.fx.push({ key: "kern" + (i % 2), cw: 256, ch: 256, draw: (p) => fxKernel(p, i % 2), x: x + Math.sin(ang) * sp * u * 1.4, y: y + sp * 2.2 * u - 2.6 * u * u, z: z + 0.4 + u * 0.8 * hh(i, 3),
        w: 0.28, h: 0.28, rot: u * 5 + i });
    }
  }
};
/** passers-by on the sidewalk (some carry popcorn in the last shot) */
const strollers = (cam: CamInfo, out: Stage, t: number, n = 6, avoid = 0, snack = false) => {
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, speed = 1.1 + 0.1 * (i % 3), x0 = -dir * (18 + 6 * i);
    const x = x0 + dir * speed * ((t + i * 3.1) % 34);
    if (Math.abs(x) > 28 || (avoid && Math.abs(x) < avoid)) continue;
    walker(cam, out, W(40 + i, MODERN[i % MODERN.length], "walk" + i), x, WALK_Z + 1.3 + (i % 2 ? 0.35 : -0.3), dir, 0, q((t * 1.05 + i * 0.37) % 1, 60), "smile", t, 0, 1,
      snack && i % 2 === 0 ? ["hold", "popcorn"] : null);
  }
};
const LB = (x: number, y: number, z: number): V3 => add(LOBBY, [x, y, z]);
const ST = (p: V3): V3 => add(STAGE, p);

/** the lobby crowd: [x, z] spots in the queue, entry order */
const QUEUE: [number, number][] = [[-3.4, 3.0], [-2.2, 3.6], [-0.9, 2.9], [0.6, 3.5], [1.9, 2.9], [3.2, 3.6], [-2.8, 5.2], [-0.2, 5.0], [2.4, 5.3], [4.2, 4.8]];

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const F = SHOP_FRONT;
  switch (id) {
    case 1: { // the $15 ticket; the theater keeps very little
      strollers(cam, out, t, 6, 4);
      const [mx, , mz] = MAX_STREET, [ox, , oz] = OWNER_STREET;
      front(cam, out, MX, mx, mz, { mode: "stand", expr: f > BT.little ? "grin" : "smile", prop: f > BT.ticket - 2 ? ["raise", "ticket"] : ["hold", "ticket"], look: -1 }, t);
      front(cam, out, OW, ox, oz, { mode: "stand", expr: f > BT.little + 4 ? "nervous" : "smile", look: 1 }, t);
      label(out, f, BT.ticket + 18, "$15", "#2f7a46", mx + 0.2, 3.0, mz + 0.3, 1.0);
      pop(out, f, BT.little + 8, 170, "q", 300, 300, fxQuestion, ox - 0.1, 2.9, oz + 0.3, 0.7);
      break;
    }
    case 2: { // the curtain: the real money maker is behind it
      const [x, , z] = LB(...OWNER_L);
      front(cam, out, OW, x, z, { mode: "stand", expr: f > BT.stay ? "laugh" : "grin", look: 1, wave: f > BT.curtain + 10 ? q(Math.sin(t * 7), 30) : undefined }, t);
      [[-6.6, 4.4, 0], [6.4, 5.4, 1], [-7.2, 7.4, 4]].forEach(([px, pz, k], i) => { const p = LB(px, 0, pz); front(cam, out, W(60 + i, MODERN[k], "lob" + i), p[0], p[2], { mode: "stand", expr: "smile", look: px < 0 ? 1 : -1 }, t); });
      pop(out, f, BT.curtain + 22, 300, "q", 300, 300, fxQuestion, LB(0, 0, 0)[0], 3.0, LB(0, 0, CURTAIN_Z + 0.5)[2], 1.3);
      break;
    }
    case 3: { // where the $15 goes: studio, rent + staff, power + tech; the theater keeps $2
      const [cx, , cz] = ST(CUST), [x, , z] = ST(OWNER_S), C = ST(COUNTER), J = JARS.map(ST);
      front(cam, out, MX, cx, cz, { mode: "stand", expr: "smile", prop: f < 330 ? ["raise", "cash"] : ["hold", "ticket"], look: 1 }, t);
      const ex: Expr = f > BT.keep ? "nervous" : f > BT.gone ? "shock" : f > BT.rent ? "nervous" : f > BT.studio ? "neutral" : "grin";
      front(cam, out, OW, x, z, { mode: "stand", expr: ex, look: f > BT.keep ? -1 : 0 }, t);
      label(out, f, BT.studio, "STUDIO'S CUT", "#7b4fd0", J[0][0], 3.0, J[0][2] + 0.6, 1.5, BT.rent - 4);
      riser(out, f, BT.half + 34, "-$8", "#7b4fd0", J[0][0], 2.3, J[0][2] + 0.5, 0.9, 40);
      riser(out, f, BT.rent + 14, "-$3", "#c0392b", J[1][0], 2.3, J[1][2] + 0.5, 0.9, 40);
      riser(out, f, BT.power + 10, "-$2", "#2f6fd6", J[2][0], 2.3, J[2][2] + 0.5, 0.9, 40);
      burst(out, f, BT.gone, C[0], 1.6, C[2] + 0.5, 1.6);
      label(out, f, BT.keep + 10, "THEATER: $2", "#e8742c", C[0] - 0.4, 1.9, C[2] + 0.9, 1.7);
      break;
    }
    case 4: { // the lobby: hungry crowd, no outside food; the reveal: POPCORN; the math
      const [ox, , oz] = LB(...OWNER_L), open = f >= BT.popcorn;
      front(cam, out, OW, ox, oz, { mode: "stand", expr: open ? "laugh" : f > BT.profitable ? "grin" : f > BT.survive ? "nervous" : "smile", look: 1,
        wave: (f > BT.what && f < BT.popcorn) || (open && f < BT.popcorn + 50) ? q(Math.sin(t * 8), 30) : undefined }, t);
      // the crowd walks in on "hundreds" (the first three are already waiting)
      QUEUE.forEach(([qx, qz], i) => {
        const p = LB(qx, 0, qz), t0 = i < 3 ? -1e9 : BT.hundreds - 10 + (i - 3) * 7, u = clamp01((f - t0) / 50);
        const sx = p[0] + (i % 2 ? 1.5 : -1.5), sz = LB(0, 0, 15)[2];
        const snack: FrontOpts["prop"] = open && f > BT.third - 10 ? ["hold", i % 3 === 2 ? "drink" : "popcorn"] : null;
        const hungry = f > BT.hundreds + 20 && !open;
        const who = W(70 + i, MODERN[i % 6], "q" + i);
        if (u <= 0) return;
        if (u < 1) walker(cam, out, who, sx + (p[0] - sx) * u, sz + (p[2] - sz) * u, p[0] - sx, p[2] - sz, q((t * 1.1 + i * 0.3) % 1, 60), "smile", t);
        else front(cam, out, who, p[0], p[2], { mode: "stand", expr: open ? (i % 2 ? "laugh" : "grin") : hungry ? (i % 3 === 0 ? "pained" : "neutral") : "smile", look: qx < 0 ? 1 : -1,
          prop: snack, wave: open && f < BT.tub && (f + i * 7) % 40 < 24 ? q(Math.sin(t * 9 + i), 30) : undefined }, t);
        if (hungry && i % 3 === 0) riser(out, f, BT.hundreds + 30 + i * 4, "GRRR", "#e8742c", p[0], 2.4, p[2], 0.8, 36);
      });
      // no outside food: someone with a burger by the sign
      const nf = LB(NOFOOD[0] - 1.0, 0, NOFOOD[2] + 0.9);
      front(cam, out, MX, nf[0], nf[2], { mode: "stand", expr: f > BT.allowed + 6 ? "shock" : "smile", look: 1, prop: f > BT.allowed - 30 && f < BT.allowed + 60 ? ["raise", "burger"] : open && f > BT.third - 10 ? ["hold", "popcorn"] : null }, t);
      burst(out, f, BT.allowed + 4, LB(NOFOOD[0], 0, 0)[0], 2.0, LB(0, 0, NOFOOD[2] + 0.2)[2], 1.8);
      // the curtain teases, then opens
      const cz = LB(0, 0, CURTAIN_Z)[2], cx0 = LB(0, 0, 0)[0];
      pop(out, f, BT.profitable + 6, BT.popcorn - 1, "q", 300, 300, fxQuestion, cx0, 3.0, cz + 0.5, 1.3);
      if (open) {
        const crew = LB(0.9, 0, -5.0);
        front(cam, out, CR, crew[0], crew[2], { mode: "stand", expr: "grin", look: -1, wave: f < BT.tub ? q(Math.sin(t * 9), 30) : undefined }, t);
        burst(out, f, BT.popcorn, cx0, 2.6, cz + 0.4, 4.2);
        confetti(out, f, BT.popcorn, cx0, 3.4, cz + 1.0, 7);
        confetti(out, f, BT.popcorn + 16, cx0, 3.4, cz + 1.2, 7);
        const [px, py, pz] = LB(...POPPER);
        kernels(out, f, BT.popcorn + 2, 1370, px, py + 1.4, pz + 0.4);
        label(out, f, BT.tub + 6, "$9 TUB", "#2f7a46", LB(-0.2, 0, 0)[0], 2.15, LB(0, 0, -3.5)[2], 1.0, BT.third + 30);
        if (f > BT.third) for (let k = 0; BT.third + 4 + k * 12 < 1365; k++) riser(out, f, BT.third + 4 + k * 12, "+$" + [7, 6, 5][k % 3], "#2f7a46", cx0 + [-2.4, 0, 2.4, -1.2, 1.2][k % 5], 2.0, cz - 0.6, 0.8, 30);
      }
      break;
    }
    case 5: { // the lesson: the ticket gets you in, the popcorn pays the bills; find the popcorn
      strollers(cam, out, t, 6, 4.5, true);
      const [mx, , mz] = MAX_STREET, [ox, , oz] = OWNER_STREET;
      front(cam, out, MX, mx, mz, { mode: "stand", expr: f > BT.bills ? "laugh" : "grin", look: -1, prop: f > BT.bills - 4 ? ["raise", "popcorn"] : ["raise", "ticket"] }, t);
      front(cam, out, OW, ox, oz, { mode: "stand", expr: f > BT.bills ? "laugh" : "grin", look: 1, wave: f > BT.bills + 4 && f < BT.printers ? q(Math.sin(t * 8), 30) : undefined }, t);
      const crowd: [number, number][] = [[-4.4, 7.6], [-3.4, 8.5], [4.2, 7.4], [5.2, 8.4]];
      crowd.forEach(([cx, cz], i) => front(cam, out, W(90 + i, MODERN[(i + 2) % 6], "out" + i), cx, cz, { mode: "stand", expr: i % 2 ? "laugh" : "grin", look: cx < 0 ? 1 : -1, prop: ["hold", i % 2 ? "drink" : "popcorn"] }, t));
      label(out, f, BT.getsin, "TICKET = DOOR", "#2f6fd6", ox + 0.1, 2.75, oz + 0.4, 1.4, BT.printers - 6);
      label(out, f, BT.bills, "POPCORN = PROFIT", "#e8742c", mx + 0.1, 2.75, mz + 0.4, 1.5, BT.printers - 6);
      if (f > BT.bills + 6) arc(out, f, [mx, 2.0, mz], [mx + 0.8, 3.6, mz - 1.5], 1.2, BT.bills + 6, BT.printers - 10, 7, 20, "coin", 256, 256, fxCoin, 0.4);
      pop(out, f, BT.printers, BT.consoles - 2, "printer", 300, 300, fxPrinter, -0.3, 2.2, 8.4, 0.75);
      pop(out, f, BT.printers + 14, BT.consoles - 2, "ink", 256, 256, fxInk, 0.45, 2.55, 8.5, 0.45);
      pop(out, f, BT.consoles, BT.find - 2, "pad", 300, 300, fxPad, -0.3, 2.2, 8.4, 0.75);
      pop(out, f, BT.consoles + 14, BT.find - 2, "game", 256, 256, fxGame, 0.45, 2.55, 8.5, 0.45);
      pop(out, f, BT.find, 1800, "tub", 300, 400, fxTub, 0.1, 2.75, 8.6, 1.0);
      burst(out, f, BT.find, 0.1, 2.9, 8.6, 2.4);
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void KID; void F; void COUNTER;
  return out;
};
export { FPS };
