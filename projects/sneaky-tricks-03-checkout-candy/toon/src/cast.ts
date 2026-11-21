// The cast of "Why are fast food signs red and yellow?" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, TOTAL, STORE, POLE, SIGN_Y, WALK_Z, DOOR_X, add, STAND, warp, unwarp, TONY_DOOR, CAFE_X0, CAFE_X1 } from "./story";
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
/** Tony: white shirt, green cap and buttons, moustache, stout */
const TONY: Outfit = { jacket: "#f4f1ea", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#2f8a4a", buttons: "#2f8a4a", moustache: "#3a2a1e", skin: SKINS[1], build: "stout" };
/** the landlord: blue-grey suit, gold buttons, white hair */
const LANDLORD: Outfit = { jacket: "#5a6a8a", pants: "#2a2f3a", boots: "#1e1a18", hat: "hair", hair: "#d8d8e0", buttons: "#ffc928", skin: SKINS[0], build: "stout" };
/** the franchise salesman: black suit, slick hair */
const SALES: Outfit = { jacket: "#22252e", pants: "#22252e", boots: "#141418", hat: "hair", hair: "#1e1a18", buttons: "#d8d8e0", skin: SKINS[2] };
/** Tony's cook */
const COOK: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", buttons: "#2f8a4a", skin: SKINS[3] };
const MODERN: Outfit[] = [
  { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] },
  { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] },
  { jacket: "#3fa08a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#5a8fc2", skin: SKINS[1] },
  { jacket: "#e8a84a", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#2f6fd6", skin: SKINS[3] },
  { jacket: "#7b4fd0", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#5a3b2a", skin: SKINS[2] },
  { jacket: "#5d7a3a", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#1e1a18", dress: "#c0392b", skin: SKINS[3] },
  { ...KID, jacket: "#2f6fd6" },
];
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const TN = W(1, TONY, "tony"), LL = W(2, LANDLORD, "landlord"), SM = W(3, SALES, "sales"), CK = W(4, COOK, "cook");
const front = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = 0, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};
const walker = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, dx: number, dz: number, phase: number, expr: Expr, t: number, y = 0, scale = 1, prop: FrontOpts["prop"] = null) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who, x, y, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, who.i), prop }, { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) }, scale));
  blob(out, x, y, z, scale);
};
/** seated card on a stool (hips on the stool top) */
const SIT_Y = 0.3;
const sitter = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number) =>
  out.places.push(person(cam, who, x, SIT_Y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), mode: "sit", ...fo }, {}, 1));

// ---- effect drawings ----
const txt = (p: Pen, s: string, x: number, y: number, size: number, col: string) => { const g = p.g; g.save(); g.fillStyle = col; g.font = `${size}px Anton, Impact, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(s, x, y); g.restore(); };
const fxLabel = (p: Pen, text: string, bg: string) => {
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  const g = p.g; let size = text.length > 9 ? 66 : text.length > 7 ? 80 : 100;
  g.font = `${size}px Anton, Impact, sans-serif`; const wd = g.measureText(text).width; if (wd > 452) size = Math.floor(size * 452 / wd);
  txt(p, text, 256, 84, size, "#ffffff");
};
const fxQuestion = (p: Pen) => { p.ell(150, 150, 130, 130, "#ffd23f", 12); txt(p, "?", 150, 160, 190, INK); };
const fxBang = (p: Pen) => { p.ell(150, 150, 130, 130, "#e23b4e", 12); txt(p, "!", 150, 160, 200, "#ffffff"); };
const fxConfetti = (p: Pen, seed: number) => {
  const g = p.g, cols = ["#ff4a6a", "#ffd23f", "#3fd8ff", "#2bd96b", "#b06ad0", "#ffffff"];
  for (let k = 0; k < 26; k++) { g.save(); g.translate(20 + hh(k, seed) * 460, 20 + hh(k, seed + 1) * 460); g.rotate(hh(k, seed + 2) * 6); g.fillStyle = cols[k % cols.length]; g.fillRect(-12, -6, 24, 12); g.restore(); }
};
/** red target rings (red grabs your eye) */
const fxRings = (p: Pen, u: number) => { for (let k = 0; k < 3; k++) { const r = 60 + ((u + k / 3) % 1) * 180; p.g.globalAlpha = 1 - ((u + k / 3) % 1); p.arc(256, 256, r, r, 0, 360, 16, "#ff2a3a"); } p.g.globalAlpha = 1; };
/** yellow radiating glow lines (yellow = seen from far) */
const fxRays = (p: Pen, u: number) => { for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2 + u * 0.4, r0 = 150 + 20 * Math.sin(u * 6 + k), r1 = 240; p.stroke([[256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0], [256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1]], 16, "#ffd23f"); } };
/** a big cartoon eye */
const fxEye = (p: Pen, look: number) => { p.ell(128, 128, 110, 70, "#ffffff", 10); p.dot(128 + look * 30, 128, 40, "#2f6fd6"); p.dot(128 + look * 30, 128, 20, INK); p.dot(140 + look * 30, 116, 8, "#ffffff"); };
/** speech bubble (from the sign) */
const fxBubble = (p: Pen, s: string) => {
  p.poly([[20, 20], [492, 20], [492, 200], [180, 200], [110, 260], [130, 200], [20, 200]], "#ffffff", 12);
  txt(p, s, 256, 112, s.length > 6 ? 96 : 130, "#d8262e");
};
/** thought bubble with a burger */
const fxThinkBurger = (p: Pen) => {
  p.ell(256, 190, 230, 160, "#ffffff", 10); p.ell(90, 400, 34, 30, "#ffffff", 8); p.ell(50, 470, 18, 16, "#ffffff", 6);
  burgerDraw(p, 256, 200, 1.6, 0);
};
const burgerDraw = (p: Pen, cx: number, cy: number, s: number, bites: number) => {
  const g = p.g; g.save(); g.translate(cx, cy); g.scale(s, s);
  p.poly([[-70, -10], [-62, -48], [-30, -70], [30, -70], [62, -48], [70, -10]], "#e9a447", 6);
  for (const [x, y] of [[-30, -48], [0, -58], [28, -44], [-6, -36]]) p.ell(x, y, 5, 3, "#fff6dc", 0);
  p.poly([[-76, -10], [76, -10], [68, 4], [-68, 4]], "#5cbf4a", 5);
  p.poly([[-72, 2], [72, 2], [72, 24], [-72, 24]], "#6b2a12", 5);
  p.poly([[-74, 20], [74, 20], [64, 34], [-64, 34]], "#ffd23f", 4);
  p.poly([[-68, 32], [68, 32], [62, 56], [-62, 56]], "#e9a447", 6);
  g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < bites; k++) { const x = 80 - k * 46; for (const dy of [-50, -18, 14, 46]) { g.beginPath(); g.arc(x, dy, 26, 0, 7); g.fill(); } }
  g.restore();
};
const fxBurger = (p: Pen, bites: number) => burgerDraw(p, 256, 160, 2.6, bites);
const fxCrumb = (p: Pen) => { for (let k = 0; k < 7; k++) p.dot(40 + hh(k, 4) * 176, 40 + hh(k, 5) * 176, 9 + hh(k, 6) * 10, "#e9a447"); };
const fxNote = (p: Pen, k: number) => {
  const col = ["#ff3a5a", "#ffd23f", "#3fd8ff", "#2bd96b"][k % 4];
  p.stroke([[160, 50], [160, 190]], 16, col); p.ell(128, 196, 40, 30, col, 8);
  if (k % 2) { p.stroke([[160, 50], [220, 70], [220, 160]], 16, col); p.ell(190, 166, 36, 26, col, 8); } else p.stroke([[160, 50], [210, 80]], 16, col);
};
const fxStopwatch = (p: Pen, s: string) => {
  p.ell(256, 290, 200, 200, "#ffffff", 14); p.poly([[226, 60], [286, 60], [286, 100], [226, 100]], "#3a3f4a", 8);
  p.arc(256, 290, 170, 170, -90, 270, 10, "#d8262e"); txt(p, s, 256, 300, 150, INK);
};
const fxDust = (p: Pen) => { for (let k = 0; k < 5; k++) p.ell(60 + k * 34, 150 - k * 8, 50 - k * 5, 40 - k * 4, "rgba(220,220,225,0.9)", 0); };
const fxSpeed = (p: Pen) => { for (let k = 0; k < 6; k++) p.stroke([[20, 40 + k * 36], [200 + (k % 3) * 90, 40 + k * 36]], 10, "#ffffff"); };
const fxDrool = (p: Pen) => { p.poly([[40, 0], [88, 0], [86, 120], [64, 170], [42, 120]], "#bfe9ff", 6); p.ell(60, 60, 8, 20, "#ffffff", 0); };
const fxWrapper = (p: Pen) => { p.poly([[30, 60], [120, 20], [220, 50], [236, 150], [170, 230], [60, 210], [20, 140]], "#f4efe4", 8); p.poly([[70, 90], [180, 80], [170, 160], [80, 170]], "#d8262e", 0); };
const fxNumber = (p: Pen, n: number) => { p.g.fillStyle = "#16121c"; p.g.fillRect(0, 0, 512, 200); txt(p, String(n), 256, 104, 160, "#2bff7a"); };
const fxTray = (p: Pen) => { p.poly([[20, 60], [492, 60], [470, 196], [42, 196]], "#c0242e", 8); burgerDraw(p, 180, 110, 0.9, 0); p.poly([[330, 30], [400, 30], [390, 150], [340, 150]], "#d8262e", 6); for (let k = 0; k < 4; k++) p.stroke([[344 + k * 14, 34], [344 + k * 14, 0]], 9, "#ffd23f"); };
const fxPatty = (p: Pen) => { p.ell(128, 128, 110, 50, "#6b2a12", 9); for (const dx of [-50, 0, 50]) p.stroke([[128 + dx - 20, 110], [128 + dx + 20, 140]], 8, "#2a140a"); };
const fxTicket = (p: Pen) => { p.poly([[40, 10], [216, 10], [216, 246], [40, 246]], "#ffffff", 8); for (let y = 50; y < 230; y += 36) p.stroke([[64, y], [190, y]], 8, "#9aa3ad"); };
const fxShake = (p: Pen) => {
  p.poly([[60, 90], [196, 90], [176, 250], [80, 250]], "#ffffff", 9); p.poly([[64, 120], [192, 120], [186, 170], [70, 170]], "#ff7aa8", 0);
  p.ell(128, 84, 74, 40, "#ffd6e6", 8); p.dot(150, 54, 16, "#e23b4e"); p.stroke([[120, 70], [100, 0]], 10, "#d8262e");
};
const fxBag = (p: Pen) => { p.poly([[50, 70], [206, 70], [216, 250], [40, 250]], "#e8c88a", 9); p.ell(128, 160, 56, 40, "#d8262e", 6); txt(p, "BB", 128, 162, 44, "#ffc928"); p.arc(128, 70, 40, 40, 180, 360, 9, "#8a6a40"); };
/** the sign's face: googly eyes (wink at the end) and a licking tongue */
const fxSignEyes = (p: Pen, look: number, wink: boolean) => {
  for (const [i, x] of [[0, 140], [1, 372]] as const) {
    if (wink && i === 1) { p.stroke([[x - 70, 140], [x, 110], [x + 70, 140]], 22, INK); continue; }
    p.ell(x, 128, 96, 100, "#ffffff", 14); p.dot(x + look * 34, 150, 40, INK); p.dot(x + look * 34 + 12, 136, 10, "#ffffff");
  }
};
const fxTongue = (p: Pen, u: number) => {
  p.arc(256, 40, 150, 70, 10, 170, 18, INK);
  const x = 256 + 110 * Math.sin(u * Math.PI * 2);
  p.ell(x, 120, 70, 60, "#ff6a8a", 12); p.stroke([[x, 80], [x, 150]], 8, "#d8405a");
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
const S = (x: number, y: number, z: number): V3 => add(STORE, [x, y, z]);
const xyz = (p: V3) => ({ x: p[0], y: p[1], z: p[2] });
const H2 = (x: number, y: number, z: number) => S(x, y, z);

// ---- Tony's effect drawings ----
/** a price tag on a string: small grey "COST", big green / red "PRICE" */
const fxTag = (p: Pen, top: string, big: string, bg: string) => {
  p.poly([[60, 20], [492, 20], [492, 236], [60, 236], [10, 128]], bg, 10);
  p.dot(52, 128, 14, "#ffffff"); p.stroke([[52, 128], [0, 60]], 6, INK);
  txt(p, top, 280, 72, 52, "#ffffff"); txt(p, big, 280, 166, big.length > 4 ? 100 : 120, "#ffffff");
};
const fxSoda = (p: Pen) => {
  p.poly([[50, 70], [206, 70], [186, 360], [70, 360]], "#ffffff", 9);
  p.poly([[56, 150], [200, 150], [194, 230], [62, 230]], "#2f8a4a", 0); txt(p, "T", 128, 192, 64, "#ffffff");
  p.ell(128, 66, 84, 22, "#e8e2d4", 8); p.stroke([[140, 60], [176, 0]], 12, "#d8262e");
};
/** a small bill for the cash rain */
const fxCash = (p: Pen) => { p.poly([[10, 20], [246, 20], [246, 120], [10, 120]], "#7fc97a", 7); p.ell(128, 70, 30, 30, "#4f9a4a", 5); txt(p, "$", 128, 72, 44, "#2a5a2a"); };
/** the big $10 bill with n bites out of the right side (6 = a sliver left) */
const fxBill = (p: Pen, n: number) => {
  const g = p.g;
  p.poly([[20, 20], [1004, 20], [1004, 476], [20, 476]], "#8fd18a", 12);
  p.poly([[50, 50], [974, 50], [974, 446], [50, 446]], null, 6);
  p.ell(512, 248, 120, 140, "#cfeccb", 8); p.ell(512, 220, 50, 56, "#5a9a56", 0); p.ell(512, 330, 80, 50, "#5a9a56", 0);
  txt(p, "$10", 190, 150, 120, "#2a5a2a"); txt(p, "$10", 834, 346, 120, "#2a5a2a"); txt(p, "TEN DOLLARS", 512, 430, 46, "#2a5a2a");
  g.save(); g.globalCompositeOperation = "destination-out";
  for (let k = 0; k < n; k++) { const x = 1024 - k * 150; for (const y of [0, 120, 250, 380, 500]) { g.beginPath(); g.arc(x + (y % 240 ? 30 : 0), y, 110, 0, 7); g.fill(); } }
  g.restore();
};
/** a torn-off bite of the bill */
const fxChunk = (p: Pen) => { p.poly([[30, 40], [200, 20], [226, 120], [180, 230], [40, 210], [70, 120]], "#8fd18a", 8); txt(p, "$", 128, 128, 80, "#2a5a2a"); };
const fxCoin = (p: Pen) => { p.ell(128, 128, 100, 100, "#ffc928", 10); p.ell(128, 128, 70, 70, null, 6); txt(p, "¢", 128, 134, 110, "#a87a10"); };
const fxBolt = (p: Pen) => { p.poly([[150, 10], [60, 140], [120, 140], [90, 246], [200, 100], [140, 100], [180, 10]], "#ffd23f", 10); };
const fxFlame = (p: Pen) => { p.poly([[128, 10], [200, 110], [210, 180], [128, 246], [46, 180], [56, 110], [100, 120]], "#ff7a2a", 10); p.poly([[128, 110], [165, 170], [128, 230], [92, 170]], "#ffd23f", 0); };
const fxWrench = (p: Pen) => { p.stroke([[60, 200], [180, 80]], 34, "#9aa3ad"); p.ell(196, 64, 44, 44, "#9aa3ad", 10); p.ell(212, 48, 18, 18, "#ffffff", 0); p.ell(52, 208, 26, 26, "#9aa3ad", 8); };
/** FRANCHISE AGREEMENT on a clipboard; ripped = two torn halves (half 0 / 1) */
const fxContract = (p: Pen, half = -1) => {
  const g = p.g;
  if (half >= 0) { g.save(); g.beginPath(); if (half === 0) { g.moveTo(0, 0); g.lineTo(190, 0); g.lineTo(150, 120); g.lineTo(200, 240); g.lineTo(160, 380); g.lineTo(200, 512); g.lineTo(0, 512); } else { g.moveTo(400, 0); g.lineTo(190, 0); g.lineTo(150, 120); g.lineTo(200, 240); g.lineTo(160, 380); g.lineTo(200, 512); g.lineTo(400, 512); } g.clip(); }
  p.poly([[30, 30], [370, 30], [370, 490], [30, 490]], "#ffffff", 10);
  txt(p, "FRANCHISE", 200, 90, 58, "#22252e"); txt(p, "AGREEMENT", 200, 148, 46, "#22252e");
  for (let y = 210; y < 420; y += 34) p.stroke([[70, y], [330, y]], 7, "#b8c0c8");
  p.stroke([[220, 455], [340, 445]], 6, "#2f6fd6");
  if (half >= 0) g.restore();
};
const fxThink = (p: Pen) => {
  p.ell(256, 170, 230, 140, "#ffffff", 10); p.ell(90, 360, 34, 30, "#ffffff", 8); p.ell(50, 430, 18, 16, "#ffffff", 6);
  txt(p, "BIG NAME?", 256, 170, 86, "#d8262e");
};
const fxTumble = (p: Pen) => { for (let k = 0; k < 9; k++) p.arc(128, 128, 60 + hh(k, 2) * 50, 50 + hh(k, 3) * 60, hh(k, 4) * 360, hh(k, 4) * 360 + 240, 7, "#a07a4a"); };
const fxPhone = (p: Pen, views: number) => {
  p.poly([[40, 10], [216, 10], [216, 400], [40, 400]], "#22252e", 10); p.poly([[56, 40], [200, 40], [200, 330], [56, 330]], "#ffffff", 0);
  p.poly([[100, 120], [100, 200], [170, 160]], "#d8262e", 0);
  txt(p, String(views), 128, 260, 54, "#22252e"); txt(p, "VIEWS", 128, 304, 30, "#6a707a");
};
const fxFlyer = (p: Pen) => {
  p.poly([[20, 20], [236, 20], [236, 330], [20, 330]], "#fff6dc", 8);
  txt(p, "TONY'S", 128, 70, 50, "#d8262e"); txt(p, "BURGERS", 128, 116, 38, "#2f8a4a");
  burgerDraw(p, 128, 200, 0.8, 0); txt(p, "TRY US!", 128, 290, 40, "#22252e");
};
/** 1 IN 4: four little shop fronts, the last one crossed out */
const fxOneIn4 = (p: Pen, crossed: boolean) => {
  p.poly([[10, 10], [1014, 10], [1014, 500], [10, 500]], "#ffffff", 12);
  txt(p, "NEW RESTAURANTS, YEAR 1", 512, 70, 60, "#22252e");
  for (let k = 0; k < 4; k++) {
    const x = 140 + k * 248;
    p.poly([[x - 90, 200], [x + 90, 200], [x + 90, 420], [x - 90, 420]], k === 3 ? "#c0c6d0" : "#3f9a5a", 8);
    p.poly([[x - 105, 150], [x + 105, 150], [x + 90, 205], [x - 90, 205]], k === 3 ? "#8a9099" : "#ffd23f", 8);
    p.poly([[x - 30, 320], [x + 30, 320], [x + 30, 420], [x - 30, 420]], "#2a3a2e", 0);
  }
  if (crossed) { const x = 140 + 3 * 248; p.stroke([[x - 110, 160], [x + 110, 440]], 26, "#d8262e"); p.stroke([[x + 110, 160], [x - 110, 440]], 26, "#d8262e"); }
};
const fxHeart = (p: Pen) => { p.ell(90, 100, 56, 56, "#ff4a6a", 0); p.ell(166, 100, 56, 56, "#ff4a6a", 0); p.poly([[38, 120], [218, 120], [128, 230]], "#ff4a6a", 0); };
const fxSweat = (p: Pen) => { p.poly([[64, 10], [110, 90], [64, 120], [18, 90]], "#bfe9ff", 6); };

/** the famous chain's line out the door (BLAZE door at DOOR_X, facade z 9) */
const queue = (cam: CamInfo, out: Stage, t: number, n = 13) => {
  for (let k = 0; k < n; k++) {
    const x = 4.3 + k * 1.05, z = 10.3 + (k % 2) * 0.22;
    front(cam, out, W(80 + k, MODERN[k % 7], "qb" + k), x, z, { mode: "stand", expr: k % 3 ? "smile" : "grin", look: -1, wave: k === 6 ? q(Math.sin(t * 5), 30) : undefined }, t);
  }
};
/** people walking the far sidewalk and the near kerb, not stopping at Tony's */
const passers = (cam: CamInfo, out: Stage, t: number) => {
  const P: [number, number, number][] = [[10, 12.7, -1], [34, 12.9, 1], [-6, 12.5, 1], [26, 23.0, -1], [4, 22.8, 1], [40, 12.6, -1], [22, 12.8, 1]];
  P.forEach(([x0, z, d], i) => {
    const x = x0 + d * ((t * 1.15 + i * 2.3) % 14) - d * 7;
    walker(cam, out, W(40 + i, MODERN[i % 7], "m" + i), x, z, d, 0, q((t * 1.1 + i * 0.37) % 1, 60), "smile", t);
  });
};
const TX = TONY_DOOR - 1.3, TZ = 10.7;   // Tony's spot outside his door

/** everything with a face in shot `id` at time t */
const MAX: Outfit = { jacket: "#2fa0a0", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", skin: SKINS[2] };
const CLERK: Outfit = { jacket: "#8a6a4a", pants: "#3a2a1e", boots: "#2a1e16", hat: "cap", cap: "#5a3b2a", buttons: "#ffd23f", skin: SKINS[0] };
const LADY: Outfit = { jacket: "#7a5a8a", pants: "#3a2a3e", boots: "#2a1e16", hat: "hair", hair: "#5a3b2a", dress: "#9a7aa8", skin: SKINS[1] };
const MX = W(5, MAX, "max"), CL = W(6, CLERK, "clerk"), LD = W(7, LADY, "lady");

// ---- part 1 effect drawings ----
const fxThought = (p: Pen, s: string, col = "#2f8a4a") => {
  p.ell(256, 170, 230, 140, "#ffffff", 10); p.ell(90, 360, 34, 30, "#ffffff", 8); p.ell(50, 430, 18, 16, "#ffffff", 6);
  txt(p, s, 256, 176, s.length > 4 ? 110 : 170, col);
};
/** the fancy menu on an easel: dollars (the $ signs), hi = highlight the steak line */
/** the candy rack: three shelves of bright bars; n = bars left (0..1) */
const fxRack = (p: Pen, n = 1) => {
  p.poly([[16, 16], [496, 16], [496, 496], [16, 496]], "#c0242e", 10);
  txt(p, "TREATS!", 256, 62, 56, "#ffd23f");
  const cols = ["#7a3a1e", "#ff4a9a", "#ffd23f", "#2f6fd6", "#2bd96b", "#ff7a2a"];
  for (let r = 0; r < 3; r++) {
    p.poly([[36, 200 + r * 110], [476, 200 + r * 110], [476, 214 + r * 110], [36, 214 + r * 110]], "#f4f1ea", 4);
    for (let k = 0; k < 6; k++) { if ((r * 6 + k) / 18 >= n) continue; const x = 60 + k * 70; p.poly([[x, 120 + r * 110], [x + 54, 120 + r * 110], [x + 54, 198 + r * 110], [x, 198 + r * 110]], cols[(k + r) % 6], 6); p.stroke([[x + 8, 150 + r * 110], [x + 46, 150 + r * 110]], 6, "#ffffff"); }
  }
};
const fxCandy = (p: Pen) => {
  p.poly([[30, 128], [80, 90], [80, 166]], "#ff4a9a", 8); p.poly([[226, 128], [176, 90], [176, 166]], "#ff4a9a", 8);
  p.ell(128, 128, 60, 52, "#ff4a9a", 10); p.stroke([[100, 90], [150, 166]], 12, "#ffffff"); p.stroke([[130, 80], [168, 140]], 10, "#ffffff");
};
/** the UK study board: bars u (0..1 drop), pie (0..1) */
const fxUK = (p: Pen, u: number, pie: number) => {
  p.poly([[16, 16], [752, 16], [752, 880], [16, 880]], "#fff6e8", 12);
  txt(p, "UK SUPERMARKETS", 384, 70, 60, "#22252e"); txt(p, "CANDY OFF THE CHECKOUT", 384, 126, 38, "#6a707a");
  if (pie <= 0) {
    const h0 = 380, h1 = h0 * (1 - 0.17 * u);
    p.poly([[150, 760 - h0], [330, 760 - h0], [330, 760], [150, 760]], "#d8262e", 8); txt(p, "BEFORE", 240, 800, 40, "#22252e");
    p.poly([[440, 760 - h1], [620, 760 - h1], [620, 760], [440, 760]], "#2f8a4a", 8); txt(p, "1 YEAR LATER", 530, 800, 36, "#22252e");
    p.stroke([[110, 762], [660, 762]], 8, "#22252e");
    txt(p, "GRAB-AND-GO SWEETS & CHIPS", 384, 190, 32, "#22252e");
    if (u > 0.5) txt(p, "-17%", 530, 760 - h1 - 60, 90, "#2f8a4a");
  } else {
    txt(p, "FOOD & DRINK WITHIN REACH", 384, 190, 32, "#22252e");
    const g = p.g, cx = 384, cy = 500, r = 230;
    g.save(); g.fillStyle = "#2bd96b"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#d8262e"; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.7 * pie); g.closePath(); g.fill();
    g.lineWidth = 10; g.strokeStyle = "#22252e"; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); g.restore();
    if (pie > 0.9) { txt(p, "70%", cx - 40, cy + 10, 120, "#ffffff"); txt(p, "UNHEALTHY", 384, 800, 50, "#d8262e"); }
  }
};
/** a self-checkout kiosk; scan = beep flash */
const fxKiosk = (p: Pen, scan: boolean) => {
  p.poly([[120, 16], [392, 16], [392, 300], [120, 300]], "#2a2f3a", 10);
  p.poly([[140, 36], [372, 36], [372, 260], [140, 260]], scan ? "#2bd96b" : "#3fa0d8", 6);
  txt(p, scan ? "BEEP!" : "SCAN", 256, 148, 70, "#ffffff");
  p.poly([[80, 330], [432, 330], [432, 420], [80, 420]], "#3a3f4a", 10); p.stroke([[150, 375], [362, 375]], 10, scan ? "#ff2a3a" : "#7a2a2a");
  p.poly([[200, 420], [312, 420], [300, 700], [212, 700]], "#2a2f3a", 10);
};
/** a fruit bowl (untouched, flies) */
const fxFruit = (p: Pen, flies: number) => {
  p.poly([[40, 200], [472, 200], [400, 330], [112, 330]], "#c08a4a", 10);
  p.ell(170, 170, 70, 64, "#e23b4e", 8); p.ell(300, 160, 76, 70, "#7fc97a", 8); p.ell(236, 120, 70, 60, "#ffd23f", 8); p.ell(380, 180, 56, 50, "#ff7a2a", 8);
  for (let k = 0; k < 3; k++) { const a = flies * 6 + k * 2.1, x = 256 + Math.cos(a) * 170, y = 70 + Math.sin(a * 1.3) * 40; p.dot(x, y, 10, INK); p.ell(x - 10, y - 12, 10, 6, "#bfe9ff", 3); p.ell(x + 10, y - 12, 10, 6, "#bfe9ff", 3); }
};
/** a cookie jar with n cookies (0..6) */
const fxJar = (p: Pen, n: number) => {
  p.poly([[110, 70], [402, 70], [430, 470], [82, 470]], "rgba(220,240,255,0.55)", 10); p.poly([[96, 40], [416, 40], [416, 80], [96, 80]], "#c0242e", 8);
  for (let k = 0; k < n; k++) { const x = 170 + (k % 3) * 86, y = 400 - Math.floor(k / 3) * 90; p.ell(x, y, 44, 40, "#c8894a", 6); p.dot(x - 12, y - 8, 7, "#4a2a12"); p.dot(x + 14, y + 10, 7, "#4a2a12"); }
  txt(p, "COOKIES", 256, 240, 50, "#c0242e");
};
const fxCross = (p: Pen) => { p.stroke([[30, 30], [226, 226]], 30, "#e23b4e"); p.stroke([[226, 30], [30, 226]], 30, "#e23b4e"); };
const fxZzz = (p: Pen) => { txt(p, "Z", 60, 200, 90, "#3fa0d8"); txt(p, "Z", 140, 140, 70, "#3fa0d8"); txt(p, "Z", 210, 90, 54, "#3fa0d8"); };

const QL = W(9, MODERN[1], "q1"), QG = W(10, MODERN[0], "q2"), KD = W(11, KID, "kid");
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const counter = S(-4.9, 0, -4.45), mx = S(-2.4, 0, -2.6);
  const F = (sec: number) => Math.round(sec * FPS);
  const RK = S(-3.55, 1.0, -3.2);
  const rack = (n = 1) => out.fx.push({ key: "rack" + q(n, 18), cw: 512, ch: 512, draw: (p) => fxRack(p, n), ...xyz(RK), w: 0.62, h: 0.62 });
  switch (id) {
    case 1: { // the candy rack by the register; prime real estate
      front(cam, out, TN, counter[0], counter[2], { mode: "stand", expr: f < BT.accident ? "smile" : "grin", look: 1, blink: f >= BT.accident && f < BT.accident + 8 ? 1 : undefined }, t);
      rack();
      burst(out, f, BT.candy - 2, ...S(-3.55, 1.2, -3.1), 0.8);
      riser(out, f, BT.register - 2, "RIGHT BY THE REGISTER", "#c0242e", ...S(-4.0, 1.85, -3.2), 0.8, 34);
      riser(out, f, BT.accident - 2, "NO ACCIDENT", "#22252e", ...S(-4.9, 2.2, -4.2), 0.6, 30);
      pop(out, f, BT.prime - 4, TOTAL, "prime", 512, 160, (p) => fxLabel(p, "PRIME REAL ESTATE", "#2f8a4a"), ...S(-3.55, 1.42, -3.1), 0.62, -0.05);
      break;
    }
    case 2: { // the queue: everyone passes; bored; chocolate at eye level; the kid
      front(cam, out, TN, counter[0], counter[2], { mode: "stand", expr: "smile", look: 1 }, t);
      rack();
      const bored = f >= BT.bored - 4;
      front(cam, out, MX, ...([S(-3.5, 0, -1.6)[0], S(0, 0, -1.6)[2]] as [number, number]), { mode: "stand", expr: !bored ? "smile" : f < BT.chocolate ? "dazed" : "lick", look: -1 }, t);
      front(cam, out, QL, S(-3.25, 0, 0)[0], -0.4, { mode: "stand", expr: bored ? "dazed" : "smile", look: -1 }, t);
      front(cam, out, QG, S(-3.0, 0, 0)[0], 0.8, { mode: "stand", expr: bored ? "dazed" : "smile", look: -1 }, t);
      front(cam, out, KD, S(-2.85, 0, 0)[0], -1.75, { mode: "stand", expr: f < BT.kids ? "smile" : "lick", look: -1 }, t, 0, 0.8);
      riser(out, f, BT.everyone - 2, "EVERYONE PAYS HERE", "#c0242e", ...S(-4.2, 2.6, -3.4), 1.0, 40);
      pop(out, f, BT.wait - 4, F(13.0), "watch", 512, 512, (p) => fxStopwatch(p, "3:00"), ...S(-2.5, 2.1, -0.6), 0.4);
      if (t >= 13.0 && t < 14.75) pop(out, f, BT.bored - 4, F(14.75), "zzz", 256, 256, fxZzz, ...S(-3.15, 2.0, -1.5), 0.3);
      riser(out, f, BT.eye - 2, "EYE LEVEL", "#c0242e", ...S(-3.55, 1.5, -3.0), 0.5, 30);
      if (t >= 16.3) { pop(out, f, BT.kids - 4, TOTAL, "kidEye", 256, 256, (p) => fxEye(p, -0.6), ...S(-2.85, 1.25, -1.6), 0.18); riser(out, f, BT.kids - 2, "KID EYE LEVEL TOO", "#ff4a9a", ...S(-3.2, 1.25, -2.4), 0.6, 34); }
      break;
    }
    case 3: { // the UK study board: -17 %; 70 % unhealthy
      passers(cam, out, t);
      const mxs: [number, number] = [TX + 1.9, TZ + 0.5];
      front(cam, out, TN, TX, TZ, { mode: "stand", expr: f < BT.less ? "smile" : "nervous", look: 1 }, t);
      front(cam, out, MX, ...mxs, { mode: "stand", expr: f < BT.year ? "smile" : f < BT.unhealthy ? "grin" : "shock", look: -1 }, t);
      const u = f < BT.less - 4 ? 0 : smooth((f - BT.less + 4) / 30), pie = t < 27.6 ? 0 : smooth((f - BT.p70 + 8) / 20);
      if (t < 25.4 || (t >= 27.6 && t < 32.0)) pop(out, f, BT.british - 4, TOTAL, "uk" + q(u, 20) + q(pie, 20), 768, 896, (p) => fxUK(p, u, pie), TONY_DOOR - 1, 2.6, 10.3, 1.4);
      for (let k = 0; k < 3; k++) toss(out, f, BT.away + k * 4, 20, [TONY_DOOR - 1.3 + k * 0.3, 2.4, 10.4], [TONY_DOOR - 3.5 + k * 0.4, 4.2, 9.6], 0.6, "candyA", 256, 256, fxCandy, 0.2);
      burst(out, f, BT.p17 - 2, TONY_DOOR - 1, 2.75, 10.5, 1.0);
      if (t >= 25.4 && t < 27.6) riser(out, f, BT.year - 2, "1 YEAR LATER", "#2f8a4a", mxs[0], 2.35, mxs[1] + 0.2, 0.6, 40);
      if (t >= 32.0) { pop(out, f, BT.unhealthy - 2, TOTAL, "bangU", 300, 300, fxBang, mxs[0] - 0.3, 2.1, mxs[1] + 0.25, 0.26); riser(out, f, BT.unhealthy, "70% UNHEALTHY", "#d8262e", mxs[0], 2.35, mxs[1] + 0.2, 0.6, 40); }
      break;
    }
    case 4: { // self-checkout: busy scanning
      const scan = f >= BT.impulse && Math.floor(t * 3) % 2 === 0;
      out.fx.push({ key: "kiosk" + scan, cw: 512, ch: 720, draw: (p) => fxKiosk(p, scan), ...xyz(S(-1.4, 1.2, -3.0)), w: 0.8, h: 1.12 });
      front(cam, out, MX, mx[0], mx[2], { mode: "stand", expr: f < BT.scanning ? "smile" : "grin", look: 1, prop: ["raise", "chips"] }, t);
      pop(out, f, BT.survey - 4, F(38.4), "survey", 512, 160, (p) => fxLabel(p, "1 INDUSTRY SURVEY", "#6a707a"), ...S(-1.9, 2.2, -2.8), 0.8, 0.04);
      riser(out, f, BT.impulse - 2, "FEWER IMPULSE BUYS", "#2f8a4a", ...S(-1.9, 1.95, -2.7), 0.85, 40);
      riser(out, f, BT.scanning - 2, "BUSY SCANNING", "#3fa0d8", ...S(-1.4, 1.95, -2.9), 0.55, 30);
      if (t >= 40.0) pop(out, f, BT.chocolate3 - 4, TOTAL, "noCh", 256, 256, fxCross, ...S(-2.1, 1.95, -2.5), 0.22);
      break;
    }
    case 5: { // the fruit bowl vs the cookie jar
      front(cam, out, TN, counter[0], counter[2], { mode: "stand", expr: f < BT.nobody ? "smile" : f < BT.cookie ? "nervous" : "laugh", look: 1 }, t);
      front(cam, out, MX, mx[0], mx[2], { mode: "stand", expr: f < BT.gone ? "smile" : "laugh", look: -1, prop: f >= BT.gone - 6 ? ["raise", "candy"] : null }, t);
      out.fx.push({ key: "fruit" + q((t * 3) % 1, 10), cw: 512, ch: 340, draw: (p) => fxFruit(p, t * 3), ...xyz(S(-3.9, 1.22, -3.3)), w: 0.5, h: 0.33 });
      riser(out, f, BT.nobody - 2, "NOBODY TOUCHED IT", "#6a707a", ...S(-3.9, 1.7, -3.2), 0.6, 34);
      const n = f < BT.cookie ? 6 : Math.max(0, 6 - Math.floor((f - BT.cookie) / 5));
      out.fx.push({ key: "jar" + n, cw: 512, ch: 512, draw: (p) => fxJar(p, n), ...xyz(S(-3.3, 1.3, -3.3)), w: 0.42, h: 0.42 });
      if (n < 6) for (let k = 0; k < 6 - n; k++) toss(out, f, BT.cookie + k * 5, 14, S(-3.3, 1.45, -3.3), S(-2.4 - k * 0.15, 1.6, -2.4), 0.4, "crumb", 256, 256, fxCrumb, 0.12);
      riser(out, f, BT.gone - 2, "GONE BY LUNCH", "#c0242e", ...S(-3.3, 1.75, -3.2), 0.55, 34);
      break;
    }
    case 6: { // golden hour: part four (slow music); that candy is there for you
      front(cam, out, TN, TX, TZ, { mode: "stand", expr: "grin", look: 1 }, t);
      front(cam, out, MX, TX + 1.1, TZ + 0.3, { mode: "stand", expr: f < BT.stuck ? "smile" : f < BT.candy3 ? "dazed" : "laugh", look: -1, prop: f >= BT.candy3 - 4 ? ["raise", "candy"] : null }, t);
      if (t < 51.7) {
        for (let k = 0; k < 4; k++) pop(out, f, BT.slow + k * 6, F(51.7), "note" + k, 256, 256, (p) => fxNote(p, k), TX + 0.1 + k * 0.35, 2.1 + 0.15 * Math.sin(t * 3 + k), TZ + 0.4, 0.2);
        pop(out, f, BT.part - 4, F(51.7), "part4", 512, 160, (p) => fxLabel(p, "PART 4: SLOW MUSIC", "#3fa0d8"), TX + 0.6, 2.5, TZ + 0.35, 0.95, -0.04);
      }
      if (t >= 51.7) {
        if (t < 54.2) pop(out, f, BT.stuck - 4, F(54.2), "watch6", 512, 512, (p) => fxStopwatch(p, "5:00"), TX + 1.5, 2.15, TZ + 0.45, 0.3);
        riser(out, f, BT.candy3 - 2, "PUT THERE FOR YOU", "#ff4a9a", TX + 1.1, 2.35, TZ + 0.4, 0.75, 46);
        pop(out, f, BT.end + 4, TOTAL, "follow", 512, 160, (p) => fxLabel(p, "FOLLOW FOR PART 4", "#2f8a4a"), TX + 0.6, 3.5, TZ + 0.3, 2.3);
        confetti(out, f, BT.end + 8, TX + 0.6, 3.0, TZ + 0.5, 4);
      }
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void townsfolk; void WALK_Z; void DOOR_X; void H2; void CAFE_X0; void CAFE_X1; void queue; void unwarp; void warp; void STAND; void SM; void LD; void CK;
  return out;
};
export { FPS };
