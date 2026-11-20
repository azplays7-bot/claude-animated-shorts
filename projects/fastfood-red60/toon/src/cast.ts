// The cast of "Why are fast food signs red and yellow?" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, TOTAL, STORE, TABLES, MAX_TABLE, SPEAKER, NUMBER_BOARD, GRILL, POLE, SIGN_Y, BOARD_Y, WALK_Z, DOOR_X, COUNTER_Z, add } from "./story";
import { maxAt, maxSits } from "./blocking";
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
/** Max: teal hoodie, yellow cap */
const MAX: Outfit = { jacket: "#2fa0a0", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffd23f", skin: SKINS[2] };
/** the owner (hook): red blazer, yellow buttons, stout */
const OWNER: Outfit = { jacket: "#c0242e", pants: "#1e1e26", boots: "#1e1a18", hat: "hair", hair: "#3a2a1e", buttons: "#ffc928", skin: SKINS[1], build: "stout" };
/** crew: red shirt, yellow cap */
const CREW: Outfit = { jacket: "#d8262e", pants: "#2f3448", boots: "#3a2a1e", hat: "cap", cap: "#ffc928", skin: SKINS[3] };
const COOK: Outfit = { jacket: "#f4f1ea", pants: "#3b3f52", boots: "#3a2a1e", hat: "cap", cap: "#d8262e", buttons: "#d8262e", skin: SKINS[0] };
/** people on the grey street: grey and beige clothes */
const GREY: Outfit[] = [
  { jacket: "#7d838c", pants: "#4a4e56", boots: "#3a3a3e", hat: "hair", hair: "#4a4440", skin: SKINS[1] },
  { jacket: "#a49c90", pants: "#555960", boots: "#3a3a3e", hat: "hair", hair: "#2a2624", dress: "#8a8880", skin: SKINS[0] },
  { jacket: "#6a707a", pants: "#3f434a", boots: "#2e2e32", hat: "cap", cap: "#5a5e66", skin: SKINS[3] },
];
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
const MX = W(1, MAX, "max"), OW = W(2, OWNER, "owner"), CR = W(3, CREW, "crew"), CK = W(4, COOK, "cook");
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
  txt(p, text, 256, 84, text.length > 13 ? 52 : text.length > 9 ? 66 : text.length > 7 ? 80 : 100, "#ffffff");
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
const SIGN: V3 = [POLE[0], SIGN_Y, POLE[2] + 0.35];

/** Max, posed from the blocking */
const maxCard = (cam: CamInfo, out: Stage, id: number, f: number, t: number, base: V3, expr: Expr, prop: FrontOpts["prop"] = null, look = 0, speed = 1.1) => {
  const m = maxAt(id, f);
  if (!m.visible) return m;
  const x = base[0] + m.x, z = base[2] + m.z;
  if (maxSits(id, f)) sitter(cam, out, MX, x, z, { expr, prop, look }, t);
  else if (m.walk) walker(cam, out, MX, x, z, m.dx, m.dz, q((t * speed) % 1, 60), expr, t, 0, 1, prop);
  else front(cam, out, MX, x, z, { mode: "stand", expr, prop, look }, t);
  return m;
};
/** people walking the sidewalks (grey ones in the grey street) */
const passers = (cam: CamInfo, out: Stage, t: number, grey: boolean) => {
  const P: [number, number, number][] = [[10, 12.6, -1], [34, 10.6, 1], [-6, 12.3, 1], [26, 23.0, -1], [4, 22.8, 1]];
  P.forEach(([x0, z, d], i) => {
    const x = x0 + d * ((t * 1.15 + i * 2.3) % 14) - d * 7;
    walker(cam, out, W(40 + i, grey ? GREY[i % 3] : MODERN[i % 6], (grey ? "g" : "m") + i), x, z, d, 0, q((t * 1.1 + i * 0.37) % 1, 60), grey ? "neutral" : "smile", t);
  });
};
/** who sits at each table (back side, facing the door) at time t; Max's table is handled separately */
const DINERS: [number, number, number][] = [[0, -0.3, 0], [1, 0.0, 1], [2, -0.3, 2], [2, 0.3, 3], [3, 0.0, 4], [5, -0.3, 5], [5, 0.3, 6]];

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const B = s.place === "store" ? STORE : ([0, 0, 0] as V3);
  switch (id) {
    case 1: { // hook: every fast food sign is red and yellow. Not an accident.
      passers(cam, out, t, false);
      front(cam, out, OW, 4.6, 10.3, { mode: "stand", expr: f > BT.accident - 4 ? "grin" : "smile", look: -1, wave: f > BT.accident + 6 ? q(Math.sin(t * 7), 30) : undefined }, t);
      burst(out, f, 4, SIGN[0], SIGN[1], SIGN[2] + 0.5, 4.5);
      riser(out, f, 10, "RED + YELLOW", "#d8262e", SIGN[0] + 1.2, SIGN[1] + 1.4, SIGN[2] + 1.2, 3.2, 40);
      pop(out, f, BT.accident, 200, "bang", 300, 300, fxBang, 5.0, 2.55, 10.5, 0.5);
      break;
    }
    case 2: { // Max walks a grey street. Not hungry.
      passers(cam, out, t, true);
      maxCard(cam, out, 2, f, t, B, f > BT.hungry ? "stern" : "neutral");
      const m = maxAt(2, f);
      riser(out, f, BT.hungry - 2, "NOT HUNGRY", "#6a707a", m.x + 0.2, 2.5, m.z + 0.3, 1.1, 34);
      break;
    }
    case 3: { // BAM: the sign. Why red, why yellow, stop here, appetite, starving, the feet turn.
      passers(cam, out, t, true);
      let ex: Expr = "shock", look = -1, pr: FrontOpts["prop"] = null;
      if (f > BT.bam + 40 && f < BT.linked) ex = "dazed";
      if (f >= BT.linked) ex = f >= BT.starving ? "lick" : "grin";
      if (f >= BT.feet) ex = "laugh";
      void pr;
      const m = maxCard(cam, out, 3, f, t, B, ex, null, look, 3.2);
      // BAM
      burst(out, f, BT.bam, SIGN[0], SIGN[1], SIGN[2] + 0.6, 6);
      confetti(out, f, BT.bam, SIGN[0], SIGN[1] + 1, SIGN[2] + 1, 6);
      pop(out, f, BT.bam + 2, BT.grabs - 4, "bangMax", 300, 300, fxBang, m.x + 0.3, 2.6, m.z + 0.2, 0.5);
      riser(out, f, BT.giant - 2, "GIANT!", "#d8262e", SIGN[0] - 0.6, SIGN[1] - 2.8, SIGN[2] + 1, 2.0, 30);
      // red grabs your eye: rings around the sign, an eye looking at it
      if (f >= BT.grabs - 4 && f < BT.yellow2 - 4) {
        const u = q((t * 0.9) % 1, 30);
        out.fx.push({ key: "rings" + u, cw: 512, ch: 512, draw: (p) => fxRings(p, u), x: SIGN[0], y: SIGN[1], z: SIGN[2] + 0.4, w: 8, h: 8, soft: true });
      }
      riser(out, f, BT.grabs + 2, "RED = LOOK!", "#d8262e", SIGN[0] + 2.0, SIGN[1] - 2.6, SIGN[2] + 1.6, 2.6, 46);
      pop(out, f, BT.eye - 6, BT.yellow2 - 4, "eye" + (f > BT.eye + 10 ? 1 : 0), 256, 256, (p) => fxEye(p, f > BT.eye + 10 ? -1 : 0), m.x - 0.55, 2.05, m.z + 0.4, 0.5);
      // yellow: seen from far away
      if (f >= BT.yellow2 - 4 && f < BT.together) {
        const u = q((t * 0.6) % 1, 30);
        out.fx.push({ key: "rays" + u, cw: 512, ch: 512, draw: (p) => fxRays(p, u), x: SIGN[0], y: SIGN[1], z: SIGN[2] + 0.2, w: 10, h: 10, soft: true });
      }
      riser(out, f, BT.far - 18, "SEEN FROM FAR!", "#e0a800", SIGN[0], SIGN[1] + 2.6, SIGN[2] + 1, 4.0, 60);
      // together they scream
      if (f >= BT.together && f < BT.linked) pop(out, f, BT.together, BT.linked, "bub" + (f < BT.now ? "STOP!" : "NOW!"), 512, 280, (p) => fxBubble(p, f < BT.now ? "STOP!" : "NOW!"), SIGN[0] - 3.2, SIGN[1] + 1.6, SIGN[2] + 1.0, 3.0);
      burst(out, f, BT.together, SIGN[0] + 2.8, SIGN[1] + 1.4, SIGN[2] + 1, 2.4);
      burst(out, f, BT.stop, SIGN[0] - 2.4, BOARD_Y, SIGN[2] + 1, 2.0);
      // energy and appetite: a burger thought, a growl
      pop(out, f, BT.linked + 4, BT.feet, "think", 512, 512, fxThinkBurger, m.x + 0.75, 2.75, m.z + 0.25, 1.0);
      riser(out, f, BT.appetite, "GRRR!", "#c0392b", m.x - 0.45, 1.05, m.z + 0.4, 0.75, 30);
      riser(out, f, BT.appetite + 22, "GRRR!", "#c0392b", m.x + 0.4, 1.1, m.z + 0.4, 0.6, 26);
      if (f >= BT.starving && f < BT.feet) out.fx.push({ key: "drool", cw: 128, ch: 180, draw: fxDrool, x: m.x + 0.08, y: 1.68 - 0.06 * ((t * 2) % 1), z: m.z + 0.15, w: 0.08, h: 0.12 });
      riser(out, f, BT.starving + 2, "STARVING", "#d8262e", m.x - 0.2, 2.5, m.z + 0.3, 0.95, 30);
      // his feet just turn: dust and speed lines as he zooms off
      if (f >= BT.turn - 4 && m.visible) for (let k = 0; k < 3; k++) out.fx.push({ key: "dust", cw: 256, ch: 200, draw: fxDust, x: m.x + 0.6 + k * 0.7, y: 0.35 + k * 0.1, z: m.z + 0.1, w: 0.9, h: 0.7, soft: true });
      if (f >= BT.turn - 4 && m.visible) out.fx.push({ key: "speed", cw: 512, ch: 256, draw: fxSpeed, x: m.x + 1.2, y: 1.2, z: m.z + 0.05, w: 1.4, h: 0.7 });
      break;
    }
    case 4: { // inside: light, music, eat fast, hard seats, next customer
      const [cx, , cz] = S(-1.5, 0, COUNTER_Z - 0.75);
      front(cam, out, CR, cx, cz, { mode: "stand", expr: "grin", look: 1, wave: f > BT.hurry - 6 && f < BT.studies ? q(Math.sin(t * 9), 30) : undefined, prop: t > 26.4 && t < 27.4 ? ["raise", "tray"] : null }, t);
      const [kx, , kz] = S(-4.5, 0, COUNTER_Z - 0.75);
      front(cam, out, W(5, CREW, "crew2"), kx, kz, { mode: "stand", expr: "smile", look: 1 }, t);
      const [gx, , gz] = S(GRILL[0] + 0.2, 0, GRILL[2] + 0.9);
      front(cam, out, CK, gx, gz, { mode: "stand", expr: t > 43 ? "laugh" : "grin", look: -1, prop: ["raise", "spatula"] }, t);
      // the queue
      [[-4.4, -2.2], [-4.3, -1.2]].forEach(([x, z], i) => front(cam, out, W(30 + i, MODERN[(i + 3) % 7], "q" + i), ...([S(x, 0, z)[0], S(x, 0, z)[2]] as [number, number]), { mode: "stand", expr: "smile", look: -1 }, t));
      // diners: steady until "next customer", then the room flips every third of a second
      const flip = t >= 41.6 && t < 43.05;
      DINERS.forEach(([ti, dx, k]) => {
        const [x0, z0] = TABLES[ti], slot = flip ? Math.floor(t * 3) : 0, here = !flip || hh(k * 7 + slot, 2) > 0.35;
        if (!here) return;
        const who = W(60 + k + (flip ? (slot % 3) * 10 : 0), MODERN[(k + (flip ? slot : 0)) % 7], "d" + k + "_" + (flip ? slot % 3 : 0));
        const eating = t >= 29.5 && t < 31.8 ? (Math.floor(t * 6 + k) % 2 ? ["raise", "burger"] : ["hold", "burger"]) : k % 2 ? ["raise", "chips"] : ["hold", "burger"];
        const [x, , z] = S(x0 + dx, 0, z0 - 0.68);
        sitter(cam, out, who, x, z, { expr: t >= 28 && t < 31.8 ? "laugh" : "smile", look: k % 2 ? 1 : -1, prop: eating as FrontOpts["prop"] }, t);
        if (flip && hh(k * 7 + slot, 2) > 0.35 && (t * 3) % 1 < 0.3) burst(out, f, Math.floor(slot * 10), x, 1.1, z + 0.3, 0.8);
      });
      // ---- Max ----
      let ex: Expr = "shock", pr: FrontOpts["prop"] = null, look = 0;
      if (t < 24.55) ex = "shock";
      else if (t < 28) { ex = "grin"; pr = t > 27.1 ? ["raise", "tray"] : null; }
      else if (t < 31.85) { ex = "laugh"; pr = ["raise", "burger"]; look = Math.floor(t * 4) % 2 ? 1 : -1; }
      else if (t < 33.3) { ex = "laugh"; pr = null; }
      else if (t < 36.05) { ex = t < 34.4 ? "relief" : "pained"; }
      else if (t < 36.85) { ex = "smile"; pr = ["raise", "chips"]; }
      else ex = "pained";
      const m = maxCard(cam, out, 4, f, t, B, ex, pr, look, 1.3);
      const mx = S(m.x, 0, m.z);
      // in the door: bright!
      burst(out, f, BT.inside - 2, ...S(3, 1.6, 8.6), 2.4);
      riser(out, f, BT.bright + 2, "BRIGHT!", "#ffc928", ...S(-2, 2.8, -1.4), 1.4, 30);
      confetti(out, f, BT.bright + 16, ...S(-1, 2.6, 1), 6);
      // music notes from the speaker (faster from "faster music")
      if (t >= 25.5 && t < 33.3) for (let k = 0; k < 6; k++) {
        const sp = t >= 28.6 ? 1.6 : 0.8, u = (t * sp + k / 6) % 1;
        const fromT = t >= 28.0 && t < 29.55;
        const [sx, sy, sz] = fromT ? S(-1.5 + (k - 2.5) * 0.35, 1.5, 4.0) : S(SPEAKER[0] + 0.4, SPEAKER[1], SPEAKER[2]);
        out.fx.push({ key: "note" + (k % 4), cw: 256, ch: 256, draw: (p) => fxNote(p, k % 4), x: sx + (fromT ? 0 : u * 2.2), y: sy + u * 0.9 + 0.15 * Math.sin(u * 9 + k), z: sz + (fromT ? 0 : (k - 2.5) * 0.25), w: 0.32, h: 0.32 });
      }
      riser(out, f, BT.music, "UPBEAT!", "#2f6fd6", ...S(-5.6, 2.2, 2.4), 1.0, 34);
      // the whole room says: hurry up
      pop(out, f, BT.hurry - 4, BT.studies, "fast1", 512, 160, (p) => fxLabel(p, "FAST!", "#d8262e"), ...(S(-2.6, 2.0, -3.0)), 0.9, -0.15);
      pop(out, f, BT.hurry + 2, BT.studies, "fast2", 512, 160, (p) => fxLabel(p, "QUICK!", "#e0a800"), ...(S(-0.4, 1.75, -2.6)), 0.8, 0.12);
      pop(out, f, BT.hurry + 8, BT.studies, "fast3", 512, 160, (p) => fxLabel(p, "NEXT!", "#2f7a46"), ...(S(-4.0, 1.5, -2.8)), 0.8, -0.1);
      riser(out, f, BT.eat - 4, "FAST BEAT = FAST BITES", "#d8262e", ...S(5.2, 2.0, 4.6), 1.6, 44);
      // chomp chomp chomp: the burger shrinks
      if (t >= 31.85 && t < 33.3) {
        const bites = f < BT.chomp ? 0 : f < BT.chomp2 ? 1 : f < BT.chomp3 ? 2 : f < BT.gone ? 3 : 4;
        if (bites < 4) out.fx.push({ key: "burger" + bites, cw: 512, ch: 360, draw: (p) => fxBurger(p, bites), x: mx[0] + 0.3, y: 1.2, z: mx[2] + 0.35, w: 0.36, h: 0.26 });
        for (const [k, at] of [[0, BT.chomp], [1, BT.chomp2], [2, BT.chomp3]] as const) {
          riser(out, f, at, "CHOMP!", ["#d8262e", "#e0a800", "#2f7a46"][k], mx[0] + (k - 1) * 0.42, 1.65 + k * 0.1, mx[2] + 0.4, 0.5, 20);
          if (f >= at && f < at + 10) out.fx.push({ key: "crumb", cw: 256, ch: 256, draw: fxCrumb, x: mx[0] + 0.25 - (f - at) * 0.01, y: 1.25 - (f - at) * 0.03, z: mx[2] + 0.4, w: 0.3, h: 0.3 });
        }
      }
      // 90 seconds: stopwatch + empty wrapper on the tray
      if (t >= 33.3 && t < 34.35) {
        const [tx, tz] = TABLES[MAX_TABLE];
        out.fx.push({ key: "wrapper", cw: 256, ch: 256, draw: fxWrapper, ...xyz(S(tx - 0.08, 0.81, tz - 0.08)), w: 0.28, h: 0.28, flat: true, rot: 0.4 });
        pop(out, f, BT.ninety - 6, Math.round(34.35 * FPS), "watch", 512, 512, (p) => fxStopwatch(p, "1:30"), ...(S(tx + 0.3, 1.3, tz - 0.1)), 0.5);
      }
      // the hard plastic stool: knock knock
      riser(out, f, BT.plastic - 4, "KNOCK KNOCK", "#3a3f4a", ...S(-5.3, 0.75, 1.75), 0.55, 30);
      riser(out, f, BT.plastic + 10, "HARD!", "#d8262e", ...S(-4.7, 0.65, 1.8), 0.45, 30);
      if (t >= 34.35 && t < 36.05) for (const [k, at] of [[0, BT.plastic - 4], [1, BT.plastic + 4]] as const) burst(out, f, at, ...S(-4.7 - k * 0.2, 0.5, 1.75), 0.35);
      riser(out, f, BT.comfy + 4, "EAT? OK", "#2f7a46", mx[0] + 0.45, 1.8, mx[2] + 0.3, 0.6, 26);
      riser(out, f, BT.stay - 6, "STAY? OUCH!", "#c0392b", mx[0] - 0.3, 1.9, mx[2] + 0.3, 0.75, 30);
      // the table empties: sparkle; the next customer poofs in
      const [tx2, tz2] = TABLES[MAX_TABLE];
      if (t >= 39.75 && t < 41.6) {
        const nx = S(tx2, 0, tz2 - 0.65);
        if (f >= BT.empties + 30) sitter(cam, out, W(70, MODERN[1], "nextC"), nx[0], nx[2], { expr: "grin", look: 1, prop: ["hold", "burger"] }, t);
        burst(out, f, BT.empties + 30, nx[0], 1.1, nx[2] + 0.3, 1.0);
        riser(out, f, BT.next1 - 2, "NEXT!", "#2f7a46", nx[0] + 0.5, 1.8, nx[2] + 0.3, 0.7, 30);
      }
      riser(out, f, BT.empties - 2, "EMPTY!", "#2f6fd6", ...S(tx2, 1.2, tz2), 0.7, 34);
      // NOW SERVING counts up
      if (t >= 41.6 && t < 42.4) {
        const n = f < BT.next2 ? 41 : 42;
        out.fx.push({ key: "num" + n, cw: 512, ch: 200, draw: (p) => fxNumber(p, n), ...xyz(S(NUMBER_BOARD[0], NUMBER_BOARD[1] - 0.12, NUMBER_BOARD[2] + 0.05)), w: 1.25, h: 0.49 });
        burst(out, f, BT.next2, ...S(NUMBER_BOARD[0] + 0.6, NUMBER_BOARD[1] + 0.3, NUMBER_BOARD[2] + 0.2), 0.8);
      }
      // next tray / next order: trays fly across, patties flip, tickets
      if (t >= 42.4) {
        for (let k = 0; k < 4; k++) toss(out, f, BT.next3 - 6 + k * 6, 14, S(-1.5, 1.5, -3.6), S(-1.5 + (k - 1.5) * 2.2, 1.0, 3 + (k % 2) * 2), 0.8, "tray", 512, 256, fxTray, 0.6);
        for (let k = 0; k < 6; k++) { const at = BT.next4 - 4 + k * 5, u = (f - at) / 14; if (u >= 0 && u <= 1) out.fx.push({ key: "patty", cw: 256, ch: 256, draw: fxPatty, ...xyz(S(GRILL[0] - 0.8 + (k % 3) * 0.8, 0.95 + 1.1 * Math.sin(u * Math.PI), GRILL[2] + 0.1)), w: 0.36, h: 0.36, rot: u * 6.3 }); }
        for (let k = 0; k < 5; k++) { const u = ((t - 43.05) * 0.9 + k / 5) % 1; if (t >= 43.05) out.fx.push({ key: "ticket", cw: 256, ch: 256, draw: fxTicket, ...xyz(S(-1.2 + k * 0.5, 2.6 - u * 0.4, -4.2)), w: 0.28, h: 0.28, rot: 0.2 * Math.sin(k) }); }
        riser(out, f, BT.long - 8, "ALL DAY LONG", "#d8262e", ...S(-3.5, 2.3, -6.2), 1.4, 40);
      }
      break;
    }
    case 5: { // golden hour: walked in for nothing, out with a combo + shake; the sign licks its lips
      passers(cam, out, t, false);
      const m = maxAt(5, f);
      const pr: FrontOpts["prop"] = null;
      maxCard(cam, out, 5, f, t, B, f >= BT.ask ? "nervous" : "laugh", pr, 0, 1.3);
      if (m.visible) out.fx.push({ key: "shakeHand", cw: 256, ch: 256, draw: fxShake, x: m.x + 0.3, y: 0.95, z: m.z + 0.12, w: 0.34, h: 0.34 });
      if (m.visible) out.fx.push({ key: "bag", cw: 256, ch: 256, draw: fxBag, x: m.x - 0.32, y: 0.78, z: m.z + 0.12, w: 0.42, h: 0.42 });
      riser(out, f, BT.nothing - 4, "CAME FOR: NOTHING", "#6a707a", m.x + 0.1, 2.45, m.z + 0.3, 1.3, 40);
      riser(out, f, BT.combo - 4, "LEFT WITH: COMBO + SHAKE", "#d8262e", m.x + 0.1, 2.45, m.z + 0.3, 1.5, 46);
      burst(out, f, BT.milkshake, m.x + 0.3, 1.0, m.z + 0.2, 0.7);
      riser(out, f, BT.design - 4, "IT'S DESIGN", "#e0a800", SIGN[0], SIGN[1] + 2.6, SIGN[2] + 1, 3.2, 50);
      pop(out, f, BT.ask - 2, Math.round(53.65 * FPS), "q", 300, 300, fxQuestion, m.x + 0.25, 2.6, m.z + 0.2, 0.5);
      // the sign: googly eyes and a licking tongue from "or is the sign?"
      if (f >= BT.am - 6) {
        const look = f < BT.sign ? -1 : 0, wink = f >= BT.end + 20 && Math.floor(t * 1.2) % 3 === 0;
        pop(out, f, BT.am - 6, TOTAL + 10, "seyes" + look + (wink ? "w" : ""), 512, 256, (p) => fxSignEyes(p, look, wink), SIGN[0], SIGN[1] + 0.55, SIGN[2] + 0.45, 3.4);
        const u = q((t * 0.8) % 1, 30);
        if (f >= BT.sign - 4) pop(out, f, BT.sign - 4, TOTAL + 10, "tongue" + u, 512, 200, (p) => fxTongue(p, u), SIGN[0], SIGN[1] - 0.95, SIGN[2] + 0.45, 2.6);
      }
      confetti(out, f, BT.end + 6, SIGN[0], SIGN[1] + 1.5, SIGN[2] + 1, 7);
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void townsfolk; void WALK_Z; void DOOR_X;
  return out;
};
export { FPS };
