// The cast of "How casinos make money (and their one weakness)" as lit flat sprites (Pisa engine) in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts, townsfolk } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, BT, FLOOR, STAGE, DOOR, WALK_Z, MAX_T, DEALER, MAX_S, WHEEL, VAULT_S, WIN_POCKET, ORDER, SW_POCKET_R, maxOut, add } from "./story";
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
/** Max, the player: purple shirt, brown hair, the same in every shot */
const MAX_O: Outfit = { jacket: "#7b4fd0", pants: "#2f3448", boots: "#3a2a1e", hat: "hair", hair: "#5a3b2a", skin: SKINS[2] };
/** the croupier: burgundy vest, gold buttons */
const DEALER_O: Outfit = { jacket: "#8a1f33", pants: "#1e1a22", boots: "#1e1a18", hat: "hair", hair: "#1e1a18", buttons: "#e8c45a", skin: SKINS[3], build: "stout" };
const SERVER_O: Outfit = { jacket: "#1f1f2a", pants: "#1f1f2a", boots: "#1e1a18", hat: "hair", hair: "#e0b45a", dress: "#c0392b", buttons: "#e8c45a", skin: SKINS[0] };
const DAD: Outfit = { jacket: "#4f6fd0", pants: "#3b3f52", boots: "#4a3426", hat: "hair", hair: "#3a2a1e", skin: SKINS[2] };
const MOM: Outfit = { jacket: "#c25a7a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#6a4a2a", dress: "#d9a441", skin: SKINS[0] };
const GRAN: Outfit = { jacket: "#3fa08a", pants: "#3b3f52", boots: "#5a3b2a", hat: "hair", hair: "#d8d8e0", dress: "#5a8fc2", skin: SKINS[1] };
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const MX = W(1, MAX_O, "max"), DL = W(30, DEALER_O, "dealer"), SV = W(31, SERVER_O, "server");
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
const fxBill = (p: Pen) => {
  const g = p.g;
  p.poly([[10, 10], [290, 10], [290, 150], [10, 150]], "#a9d898", 9);
  p.ell(150, 80, 40, 40, "#e3f4dc", 6);
  g.save(); g.fillStyle = "#2f7a46"; g.font = "64px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("$", 150, 84); g.restore();
  for (const x of [44, 256]) p.dot(x, 80, 10, "#2f7a46");
};
/** a casino chip card (256 x 256) */
const fxChip = (p: Pen, col = "#d63a3a") => {
  const g = p.g;
  p.ell(128, 128, 112, 112, col, 9);
  g.save(); g.fillStyle = "#ffffff";
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.save(); g.translate(128 + 92 * Math.cos(a), 128 + 92 * Math.sin(a)); g.rotate(a); g.fillRect(-9, -15, 18, 30); g.restore(); }
  g.restore();
  p.ell(128, 128, 60, 60, null, 6);
  const gg = p.g; gg.save(); gg.fillStyle = "#ffffff"; gg.font = "64px Anton, Impact, sans-serif"; gg.textAlign = "center"; gg.textBaseline = "middle"; gg.fillText("$", 128, 132); gg.restore();
};
const fxClock = (p: Pen, crossed: number) => {
  const g = p.g;
  p.ell(150, 150, 128, 128, "#fbf7ee", 12);
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; p.stroke([[150 + 100 * Math.cos(a), 150 + 100 * Math.sin(a)], [150 + 116 * Math.cos(a), 150 + 116 * Math.sin(a)]], 7); }
  p.stroke([[150, 150], [150, 66]], 10); p.stroke([[150, 150], [206, 172]], 12); p.dot(150, 150, 12, INK);
  if (crossed > 0) {
    g.save(); g.globalAlpha = crossed; g.strokeStyle = "#e3263a"; g.lineCap = "round"; g.lineWidth = 34;
    g.beginPath(); g.moveTo(40, 40); g.lineTo(260, 260); g.moveTo(260, 40); g.lineTo(40, 260); g.stroke(); g.restore();
  }
};
const fxLabel = (p: Pen, text: string, bg: string) => {
  const g = p.g;
  p.poly([[10, 10], [502, 10], [502, 150], [10, 150]], bg, 10);
  g.save(); g.fillStyle = "#ffffff"; g.font = "100px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 256, 84); g.restore();
};
const fxQuestion = (p: Pen) => {
  const g = p.g;
  p.ell(150, 150, 130, 130, "#ffd23f", 12);
  g.save(); g.fillStyle = INK; g.font = "190px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 150, 160); g.restore();
};
/** cards flying along an arc */
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
const label = (out: Stage, f: number, at: number, text: string, bg: string, x: number, y: number, z: number, w: number) => {
  const u = smooth((f - at) / 8);
  if (u <= 0) return;
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 0.3 * (1 - u), z, w: w * (0.6 + 0.4 * u), h: w * 0.3125 * (0.6 + 0.4 * u) });
};
/** a label that rises and fades (the "+$2" pops) */
const riser = (out: Stage, f: number, at: number, text: string, bg: string, x: number, y: number, z: number, w: number, life = 26) => {
  const u = (f - at) / life;
  if (u < 0 || u > 1) return;
  const s = w * (0.7 + 0.3 * smooth(u * 4)) * (u > 0.8 ? 1 - (u - 0.8) * 4 : 1);
  out.fx.push({ key: "lbl" + text + bg, cw: 512, ch: 160, draw: (p) => fxLabel(p, text, bg), x, y: y + 1.2 * u, z, w: s, h: s * 0.3125 });
};
/** passers-by on the sidewalk */
const strollers = (cam: CamInfo, out: Stage, t: number, n = 6) => {
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1, speed = 1.1 + 0.1 * (i % 3), x0 = -dir * (18 + 6 * i);
    const x = x0 + dir * speed * ((t + i * 3.1) % 34);
    if (Math.abs(x) > 26) continue;
    const who = W(40 + i, [townsfolk(i), DAD, MOM, GRAN][i % 4], "walk" + i);
    walker(cam, out, who, x, WALK_Z + (i % 2 ? 0.35 : -0.3), dir, 0, q((t * 1.05 + i * 0.37) % 1, 60), "smile", t);
  }
};
const FL = (x: number, y: number, z: number): V3 => add(FLOOR, [x, y, z]);
/** gamblers at the slot machines along the floor's back wall */
const slotters = (cam: CamInfo, out: Stage, t: number, f: number, happy = 0) => {
  const spots: [number, Outfit, number][] = [[2, DAD, -1], [5, GRAN, 1], [8, MOM, -1], [12, townsfolk(2), 1]];
  spots.forEach(([k, o, look], i) => {
    const [x, , z] = FL(-10.4 + k * 1.6 + 0.85, 0, -4.2);
    const win = happy > 0 && ((f + i * 23) % 70) < 22;
    front(cam, out, W(60 + i, o, "slot" + i), x, z, { mode: "stand", expr: win ? "laugh" : "grin", look, wave: win ? q(Math.sin(t * 9 + i), 30) : undefined }, t);
  });
};
const atTable = (cam: CamInfo, out: Stage, t: number, fo: FrontOpts) => {
  const [mx, , mz] = FL(...MAX_T), [dx, , dz] = FL(...DEALER);
  front(cam, out, MX, mx, mz, fo, t);
  front(cam, out, DL, dx, dz, { mode: "stand", expr: "smile", look: 1 }, t);
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const [MXx, , MXz] = FL(...MAX_T), hand: V3 = [MXx + 0.25, 1.25, MXz - 0.1];
  const felt: V3 = FL(0.9, 0.9, 0.2), wheel = FL(WHEEL[0], WHEEL[1] + 0.4, WHEEL[2]);
  switch (id) {
    case 1: case 6: { // the casino at sunset; people strolling in; (6) bets streaming in from everywhere
      strollers(cam, out, t, 8);
      for (let i = 0; i < 3; i++) { // couples walking up the carpet into the casino
        const u = ((t * 0.16 + i * 0.33) % 1), z = WALK_Z - 0.6 - u * (WALK_Z - DOOR[2] - 0.2);
        walker(cam, out, W(50 + i, [MOM, DAD, GRAN][i], "in" + i), (i - 1) * 0.9, z, 0, -1, q((t * 1.05 + i * 0.3) % 1, 60), "grin", t);
      }
      if (id === 6) {
        const door: V3 = [0, 4.5, DOOR[2] + 1];
        const from: V3[] = [[-34, 1.5, 15], [34, 1.5, 15], [-22, 1.5, 32], [22, 1.5, 32], [0, 1.5, 38], [-40, 1.5, 4], [40, 1.5, 4]];
        from.forEach((a, i) => arc(out, f, a, door, 7, 1150 + i * 2, 1305, 5, 34, "chipR", 256, 256, (p) => fxChip(p, ["#d63a3a", "#2f6fd6", "#2fa05a"][i % 3]), 1.1));
      }
      break;
    }
    case 2: { // Max at the roulette table; the wheel up close
      slotters(cam, out, t, f);
      const hi = f > BT.max - 4 && f < BT.pockets;
      atTable(cam, out, t, { mode: "stand", expr: hi ? "laugh" : "grin", prop: ["hold", "chips"], wave: hi && f < BT.max + 30 ? q(Math.sin(t * 9), 30) : undefined, look: -1 });
      burst(out, f, BT.max, MXx + 0.3, 2.3, MXz, 1.2);
      const [wx, , wz] = FL(WHEEL[0], 0, WHEEL[2]);
      label(out, f, BT.zeros + 22, "0", "#1f9a4a", wx - 0.42, 1.55, wz + 0.1, 0.55);
      label(out, f, BT.zeros + 34, "00", "#1f9a4a", wx + 0.42, 1.55, wz + 0.1, 0.55);
      break;
    }
    case 3: { // the giant wheel: $38 in, $36 back, the house keeps $2
      const [mx, , mz] = add(STAGE, MAX_S), V = add(STAGE, VAULT_S);
      const ex: Expr = f > BT.every ? "shock" : f > BT.keeps ? "nervous" : f > BT.pays ? "laugh" : f > BT.wins ? "shock" : "grin";
      front(cam, out, MX, mx, mz, { mode: "stand", expr: ex, prop: f > BT.bet - 4 && f < BT.t38 + 24 ? ["raise", "chips"] : ["hold", "chips"], look: 1 }, t, 0, 1.35);
      const a = -Math.PI / 2 + (WIN_POCKET * Math.PI * 2) / ORDER.length, wp: V3 = [STAGE[0] + SW_POCKET_R * Math.cos(a), 1.2, STAGE[2] + SW_POCKET_R * Math.sin(a)];
      burst(out, f, BT.wins, wp[0], wp[1], wp[2], 2.6);
      if (f > BT.pays - 4 && f < BT.back36 + 30) label(out, f, BT.pays, "35 : 1", "#1f7a44", wp[0], 2.6, wp[2], 2.4);
      riser(out, f, BT.keeps + 24, "+$2", "#b3203a", V[0] - 0.4, 4.0, V[2] + 0.6, 2.2, 34);
      for (let k = 0; BT.every + 6 + k * 16 < 760; k++) riser(out, f, BT.every + 6 + k * 16, "+$2", "#b3203a", V[0] + (k % 2 ? -0.1 : -0.9), 4.0, V[2] + 0.6, 2.0, 30);
      burst(out, f, BT.keeps + 24, V[0], 3.0, V[2] + 0.4, 2.8);
      break;
    }
    case 4: { // house edge everywhere: slots, blackjack
      slotters(cam, out, t, f, 1);
      atTable(cam, out, t, { mode: "stand", expr: "grin", prop: ["hold", "chips"], look: -1 });
      const [bx, , bz] = FL(5.6, 0, -3.3);
      front(cam, out, W(32, DEALER_O, "bjdealer"), bx, bz, { mode: "stand", expr: "smile", look: -1 }, t);
      front(cam, out, W(65, DAD, "bjp1"), FL(4.6, 0, -0.1)[0], FL(4.6, 0, -0.1)[2], { mode: "stand", expr: "nervous", look: 1 }, t);
      front(cam, out, W(66, MOM, "bjp2"), FL(6.7, 0, -0.2)[0], FL(6.7, 0, -0.2)[2], { mode: "stand", expr: "grin", look: -1 }, t);
      label(out, f, BT.slots - 2, "EDGE", "#b3203a", FL(-1.6, 3.0, -5.0)[0], 3.0, FL(0, 0, -5.0)[2], 1.5);
      label(out, f, BT.slots + 12, "EDGE", "#b3203a", FL(5.6, 0, 0)[0], 2.6, FL(0, 0, -2.0)[2], 1.5);
      if (f > BT.payouts) arc(out, f, FL(4.6, 1.4, -0.1), FL(5.6, 1.0, -2.6), 1.0, BT.payouts + 2, 935, 9, 20, "chipB", 256, 256, (p) => fxChip(p, "#2f6fd6"), 0.32);
      break;
    }
    case 5: { // the room: chips, free drinks, no clocks
      slotters(cam, out, t, f);
      const got = f > BT.drinks + 14;
      atTable(cam, out, t, { mode: "stand", expr: got ? "laugh" : "grin", prop: got ? ["raise", "drink"] : ["raise", "chips"], look: 1 });
      const u = clamp01((f - (BT.drinks - 30)) / 26), sx = MXx + 4.2 - u * 2.9, sz = MXz + 0.4;
      if (f > BT.drinks - 30) {
        if (u < 1) walker(cam, out, SV, sx, sz, -1, 0, q((t * 1.1) % 1, 60), "smile", t, 0, 1, ["hold", "drink"]);
        else front(cam, out, SV, sx, sz, { mode: "stand", expr: "smile", prop: got ? null : ["hold", "drink"], look: -1 }, t);
      }
      if (f > BT.chips - 2 && f < BT.drinks) arc(out, f, hand, felt, 0.5, BT.chips, BT.drinks - 10, 8, 16, "chipR", 256, 256, (p) => fxChip(p), 0.24);
      const ck = FL(-0.6, 4.7, -6.45);
      if (f > BT.clocks - 8) { const c = q(smooth((f - BT.clocks - 12) / 8), 10); out.fx.push({ key: "clock" + c, cw: 300, ch: 300, draw: (p) => fxClock(p, c), x: ck[0], y: ck[1], z: ck[2], w: 2.0, h: 2.0 }); }
      break;
    }
    case 7: { // the weakness: TIME. Max keeps playing... then he is up $50
      slotters(cam, out, t, f);
      const up = f > BT.up - 3;
      atTable(cam, out, t, { mode: "stand", expr: up ? "laugh" : f > BT.time ? "shock" : "nervous", prop: f > BT.keep && !up ? ["raise", "chips"] : up ? ["hold", "cash"] : ["hold", "chips"], look: -1,
        wave: up ? q(Math.sin(t * 9), 30) : undefined });
      if (f > BT.what - 2 && f < BT.time) { const u = smooth((f - BT.what) / 8); out.fx.push({ key: "q", cw: 300, ch: 300, draw: fxQuestion, x: MXx + 0.1, y: 2.75 + 0.1 * Math.sin(t * 5), z: MXz, w: 0.8 * u, h: 0.8 * u }); }
      if (f > BT.time - 2 && f < BT.up) { const u = smooth((f - BT.time + 2) / 7); out.fx.push({ key: "clock0", cw: 300, ch: 300, draw: (p) => fxClock(p, 0), x: MXx - 0.95, y: 2.05, z: MXz - 0.3, w: 0.9 * u, h: 0.9 * u, rot: 0.15 * Math.sin(t * 12) }); }
      burst(out, f, BT.time, MXx - 0.95, 2.05, MXz - 0.3, 1.6);
      if (f > BT.keep && f < BT.up) arc(out, f, hand, felt, 0.5, BT.keep, BT.up - 12, 7, 15, "chipR", 256, 256, (p) => fxChip(p), 0.24);
      if (up) { arc(out, f, FL(-0.3, 1.5, -1.2), hand, 0.8, BT.up, 1520, 5, 16, "chipG", 256, 256, (p) => fxChip(p, "#2fa05a"), 0.24); label(out, f, BT.up + 2, "+$50", "#1f9a4a", MXx + 0.75, 2.2, MXz, 0.8); }
      burst(out, f, BT.up, MXx + 0.2, 2.4, MXz, 1.4);
      void wheel;
      break;
    }
    case 8: { // Max walks out of the door with his winnings
      strollers(cam, out, t, 6);
      const p = maxOut(f), walking = f < BT.walks - 14 + 150;
      if (walking) walker(cam, out, MX, p[0], p[2], 0, 1, q((t * 1.0) % 1, 60), "laugh", t, 0, 1, ["hold", "cash"]);
      else front(cam, out, MX, p[0], p[2], { mode: "stand", expr: "laugh", prop: ["raise", "cash"], look: 0 }, t);
      front(cam, out, W(33, DEALER_O, "doorman"), -2.9, DOOR[2] + 2.2, { mode: "stand", expr: f > BT.left ? "nervous" : "smile", look: 1 }, t);
      break;
    }
  }
  void bodyFront; void bodySide; void fxShadow; void fxContact; void fxBill; void KID; void MAX_S; void clamp01;
  return out;
};
export { FPS };
