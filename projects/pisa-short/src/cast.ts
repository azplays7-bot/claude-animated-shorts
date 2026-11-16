// Our cast as lit flat sprites in the 3D world. Each frame every character asks for a drawing (a key + a draw call);
// the pool keeps one canvas per distinct drawing, so soldiers marching in step share canvases (7 head shapes x 4
// outfits). Characters are yaw-only billboards shaded by cardShade() (scene tint, bright floor, side gradient toward
// the sun, painted crescent in the drawing); standing ones get a soft multiply contact blob. Effects are unlit cards.
// Cards, effects and blobs live on the NOINK layer so the world ink pass never outlines their quads.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, KID, SKINS, INK, fxBurst, fxSplash, fxPuff, fxRing, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, SHOTS, V3, smooth, clamp01, CREW, ROOM } from "./story";
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

// ---------------- our Pisa cast ----------------
export type Stage = { places: Place[]; fx: FxPlace[] };
const TUNIC = ["#9a6a3a", "#5d7a3a", "#8c3b4a", "#3f6fb5", "#b5653f"];
const CAPS = ["#c0353a", "#e0b040", "#3b5b9a", "#6a4a2a", "#2f6a43"];
const builder = (v: number): Outfit => ({ jacket: TUNIC[v % 5], pants: "#5a4a3a", boots: "#4a3426", skin: SKINS[v % 4],
  ...(v % 3 === 2 ? { hat: "hair", hair: "#3a2a1e" } : { hat: "cap", cap: CAPS[v % 5] }), ...(v % 4 === 1 ? { moustache: "#3a2a1e" } : {}) });
const MAYOR: Outfit = { jacket: "#7a2a3a", pants: "#3b2f3a", boots: "#2a1e18", hat: "cap", cap: "#3a2a5a", sash: "#e8c45a", moustache: "#5a4030", build: "stout", skin: SKINS[1] };
const folk = (v: number): Outfit => {
  const o: Outfit = { jacket: ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9"][v % 6], pants: "#3b3f52", boots: "#4a3426", skin: SKINS[v % 4] };
  return v % 2 ? { ...o, hat: "bonnet", dress: ["#d9a441", "#c25a7a", "#5a8fc2"][v % 3] } : { ...o, hat: "hair", hair: ["#3a2a1e", "#6a4a2a", "#1e1a18"][v % 3] };
};
const ARCHITECT: Outfit = { jacket: "#2b2f3a", pants: "#3a3d48", boots: "#1e1a18", hat: "tophat", moustache: "#4a3020", build: "stout", skin: SKINS[0] };
const digger = (v: number): Outfit => ({ jacket: ["#6b5a45", "#5a6a7a", "#7a4a3a"][v % 3], pants: "#4a4038", boots: "#2a2018", hat: "cap", cap: ["#3a3a40", "#6a4a2a", "#2f4a5a"][v % 3], skin: SKINS[(v + 1) % 4] });
const eng34 = (v: number): Outfit => ({ jacket: ["#7a745e", "#5f6a5a", "#6f6a5a"][v % 3], pants: "#3a3a38", boots: "#1e1a18", hat: "cap", cap: "#33363c", skin: SKINS[(v + 2) % 4], ...(v === 1 ? { moustache: "#2a201a" } : {}) });
const GUARD: Outfit = { jacket: "#2a3550", pants: "#22293d", boots: "#14161c", hat: "cap", cap: "#2a3550", buttons: "#e8c45a", skin: SKINS[2] };
const eng01 = (v: number): Outfit => ({ jacket: "#f08a2c", pants: "#2f3b52", boots: "#3a2a1e", hat: "cap", cap: "#f4f4ee", skin: SKINS[v % 4] });
const tourist = (v: number): Outfit => {
  const o: Outfit = { jacket: ["#e2453c", "#2fa36b", "#3f8fd6", "#f2c33a", "#a25ad1", "#ff8a5c"][v % 6], pants: ["#3b5b9a", "#2a2a33", "#d9cdb0"][v % 3], boots: "#f4f1ea", skin: SKINS[(v + 1) % 4] };
  return v % 2 ? { ...o, hat: "hair", hair: ["#6a4a2a", "#1e1a18", "#c9a06a"][v % 3] } : { ...o, hat: "cap", cap: ["#ffffff", "#2a2a33", "#e2453c"][v % 3] };
};
const W = (i: number, o: Outfit, key: string): Who => ({ i, o, okey: key });
const L = LEAD;
const front = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, fo: FrontOpts, t: number, y = 0, scale = 1, shadow = true) => {
  out.places.push(person(cam, who, x, y, z, { side: false, mirror: false }, { blink: lidAt(t, who.i), ...fo }, {}, scale));
  if (shadow) blob(out, x, y, z, scale);
};
const walker = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, dx: number, dz: number, phase: number, expr: Expr, t: number, y = 0) => {
  const view = viewOf(cam, x, z, dx, dz);
  out.places.push(person(cam, who, x, y, z, view, { mode: "stroll", phase, expr, blink: lidAt(t, who.i) }, { mode: "march", phase, expr, stomp: 0.55, stride: 0.875 * view.fs, blink: lidAt(t, who.i) }));
  blob(out, x, y, z);
};
/** the "holding it up" pose: side view, both hands out toward the tower */
const holder = (cam: CamInfo, out: Stage, who: Who, x: number, z: number, mirror: boolean, t: number) => {
  const so: SideOpts = { mode: "push", pose: 1, expr: "grin", blink: lidAt(t, who.i), hand: [560, 470] };
  out.places.push({ ...person(cam, who, x, 0, z, { side: true, mirror }, {}, so), mirror });
  blob(out, x, 0, z);
};
const hammerK = (t: number, rate = 1.6, off = 0) => { const u = ((t * rate + off) % 1 + 1) % 1; return u < 0.18 ? smooth(u / 0.18) : u < 0.3 ? 1 : 1 - smooth((u - 0.3) / 0.7); };

/** banana, painted like an effect card (420 x 420): the gag for "slightly banana-shaped" */
const fxBanana = (p: Pen) => {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 20; i++) { const a = Math.PI * (0.15 + 0.7 * i / 20); pts.push([210 + 170 * Math.cos(a), 330 - 230 * Math.sin(a)]); }
  for (let i = 20; i >= 0; i--) { const a = Math.PI * (0.15 + 0.7 * i / 20); pts.push([210 + 120 * Math.cos(a), 330 - 165 * Math.sin(a) + 18]); }
  p.poly(pts, "#ffd84a", 12);
  p.poly([[58, 252], [40, 240], [44, 228], [70, 236]], "#5a3b1e", 8);
  p.ell(368, 250, 14, 10, "#5a3b1e", 6);
};
const fxConcrete = (p: Pen, t: number) => {
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, r = 70 + 90 * t; p.ell(200 + r * Math.cos(a) * 0.9, 200 + r * Math.sin(a) * 0.5, 60 - 20 * t, 40 - 12 * t, "#9a9a96", 7); }
  p.ell(200, 200, 110 + 40 * t, 70 + 20 * t, "#b5b4ae", 8);
};

/** everything with a face in shot `id` at time t */
export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1], f = t * FPS;
  LNAME = s.light;
  findSun(cam, SUN);
  const [cx, , cz] = CREW;
  switch (id) {
    case 1: {
      const ex: Expr[] = ["shock", "nervous", "shock"];
      [[-4.6, 20.6], [-2.6, 19.0], [-0.6, 20.0]].forEach(([x, z], k) =>
        front(cam, out, W(k, builder(k), `b${k}`), x, z, { mode: "stand", expr: f > 50 ? ex[k] : "neutral", headTilt: f > 50 ? 8 : 0, look: 1 }, t));
      break;
    }
    case 2: {
      if (f < 176) { // aerial: little figures around the scaffold
        for (let k = 0; k < 12; k++) { const a = k * 0.52 + 0.4, r = 11 + (k % 3) * 2.2; front(cam, out, W(30 + k, k % 3 ? folk(k) : builder(k), k % 3 ? `f${k % 6}` : `b${k % 5}`), r * Math.cos(a), r * Math.sin(a), { mode: "stand", expr: "smile" }, t); }
      } else {
        const cheer = (f > 186 - 2 && f < 200) || f > 228;
        front(cam, out, W(20, MAYOR, "mayor"), 1.2, 19.2, { mode: "stand", expr: cheer ? "laugh" : "grin", wave: cheer ? q(Math.sin(t * 9), 30) : undefined }, t);
        const spots: [number, number][] = [[-1.4, 18.0], [3.6, 18.4], [-3.4, 16.2], [5.9, 16.6], [0.2, 15.6], [-5.6, 14.0], [7.6, 14.6], [2.2, 14.0]];
        spots.forEach(([x, z], k) => {
          const b = k % 3 === 2, o = b ? builder(k) : folk(k), hop = cheer && k % 2 ? Math.max(0, Math.sin(t * 8 + k)) * 0.15 : 0;
          front(cam, out, W(21 + k, o, b ? `b${k % 5}` : `f${k % 6}`), x, z, { mode: "stand", expr: (["grin", "smile", "laugh", "smile_closed"] as Expr[])[k % 4], wave: cheer && k % 3 === 0 ? q(Math.sin(t * 9 + k), 30) : undefined }, t, hop);
        });
      }
      break;
    }
    case 3: {
      const back = smooth((f - 250) / 35) * 2.2, lean = f > 314 - L * FPS;
      [[cx - 2.4, cz], [cx, cz - 0.8], [cx + 2.4, cz - 0.2]].forEach(([x, z], k) =>
        f < 285 && f > 250
          ? walker(cam, out, W(k, builder(k), `b${k}`), x, z + back, 0, 1, q((t * 0.9 + k * 0.3) % 1, 60), "neutral", t)
          : front(cam, out, W(k, builder(k), `b${k}`), x, z + back, { mode: "stand", expr: lean ? (k === 1 ? "shock" : "nervous") : "neutral", headTilt: lean ? 9 : 0, look: f > 286 ? 0 : 1 }, t));
      break;
    }
    case 4: front(cam, out, W(1, builder(1), "b1"), 9.6, 4.2, { mode: "stand", expr: "nervous", look: -1 }, t); break;
    case 5: {
      const sh = f > 440;
      front(cam, out, W(60, KID, "kid"), ROOM[0] - 0.5, ROOM[2] + 1.35, { mode: "stand", expr: sh ? "shock" : "smile", look: 1 }, t, 0, 0.62);
      break;
    }
    case 6: {
      if (f < 505) [[cx - 2.4, cz], [cx, cz - 0.6], [cx + 2.4, cz]].forEach(([x, z], k) => {
        const go = smooth((f - 470) / 30), wx = x - 7 * go * go;
        if (f < 470) front(cam, out, W(k, builder(k), `b${k}`), x, z, { mode: "stand", expr: "shock", look: -1 }, t);
        else walker(cam, out, W(k, builder(k), `b${k}`), wx, z, -1, 0, q((t * 1.1 + k * 0.3) % 1, 60), "nervous", t);
      });
      break;
    }
    case 7: {
      [[cx - 8, cz + 1], [cx - 10, cz - 0.5], [cx - 12, cz + 0.8]].forEach(([x, z], k) => {
        const wx = x + Math.min(8, 1.4 * Math.max(0, t - 19.2));
        walker(cam, out, W(10 + k, builder(k + 3), `b${(k + 3) % 5}`), wx, z, 1, 0, q((t * 1.0 + k * 0.33) % 1, 60), "grin", t);
      });
      break;
    }
    case 8: [[cx - 1.4, cz], [cx + 1.0, cz + 0.3], [cx + 3.0, cz - 0.4]].forEach(([x, z], k) =>
      front(cam, out, W(10 + k, builder(k + 3), `b${(k + 3) % 5}`), x, z, { mode: "stand", expr: k === 1 ? "dazed" : "neutral", headTilt: 9, look: 0 }, t)); break;
    case 9: {
      // workers up on the scaffold: one per growing floor, hammering
      for (let k = 0; k < 3; k++) {
        const lv = 0.55 * (18.1 + 7.1 * k) + 0.15, ang = 0.35 + k * 0.45, x = 5.6 * Math.cos(ang) + Math.tan((3.6 * Math.PI) / 180) * lv, z = 5.6 * Math.sin(ang);
        front(cam, out, W(10 + k, builder(k + 1), `b${(k + 1) % 5}`), x, z, { mode: "stand", expr: "grin", prop: ["hammer", q(hammerK(t, 1.4, k * 0.3), 30)] }, t, lv, 1, false);
      }
      break;
    }
    case 10: {
      const u = smooth((f - 900) / 12);
      if (u > 0) out.fx.push({ key: "banana", cw: 420, ch: 420, draw: fxBanana, x: -10, y: 19, z: 3, w: 7 * u, h: 7 * u, rot: 0.15 });
      break;
    }
    case 11: {
      const shock = f > 1069 - 2;
      if (f < 1040) {
        front(cam, out, W(40, ARCHITECT, "arch"), -3.2, 8.6, { mode: "stand", expr: f > 1028 ? "grin" : "smile", wave: f > 1000 && f < 1035 ? q(Math.sin(t * 6), 30) : undefined }, t);
        [[-1.0, 6.6], [1.8, 6.4], [-4.6, 5.2]].forEach(([x, z], k) =>
          front(cam, out, W(41 + k, digger(k), `d${k}`), x, z, { mode: "stand", expr: "neutral", prop: ["hammer", q(hammerK(t, 1.2, k * 0.35), 30)] }, t));
      } else {
        front(cam, out, W(40, ARCHITECT, "arch"), -3.2, 8.6, { mode: "stand", expr: shock ? "shock" : "nervous" }, t, 0, 1);
      }
      // the trench floods ("Water poured in")
      if (f > 1036) for (let k = 0; k < 10; k++) {
        const a = -0.2 + k * 0.62, u = q(((t - 34.5 + k * 0.13) % 1.1) / 1.1, 30);
        out.fx.push({ key: `ring${u}`, cw: 600, ch: 600, draw: (p) => fxRing(p, u), x: 5.3 * Math.cos(a), y: 0.06, z: 5.3 * Math.sin(a), w: 1.6, h: 1.6, flat: true });
        if (k % 2 === 0 && f < 1075) out.fx.push({ key: `splash${q(clamp01((f - 1040 - k * 2) / 30), 30)}`, cw: 800, ch: 800, draw: (p) => fxSplash(p, q(clamp01((f - 1040 - k * 2) / 30), 30)), x: 5.3 * Math.cos(a), y: 0.9, z: 5.3 * Math.sin(a), w: 2.2, h: 2.2 });
      }
      break;
    }
    case 12: {
      const shock = f > 1245 - 2;
      [[3.6, 9.4], [6.4, 10.2], [8.6, 8.6]].forEach(([x, z], k) =>
        front(cam, out, W(50 + k, eng34(k), `e${k}`), x, z, { mode: "stand", expr: shock ? "shock" : k === 1 ? "stern" : "neutral", look: shock ? 0 : -1 }, t));
      if (f > 1194) { const u = q(clamp01((f - 1194) / 40), 30); out.fx.push({ key: `conc${u}`, cw: 400, ch: 400, draw: (p) => fxConcrete(p, u), x: 6.2, y: 0.05, z: 3.6, w: 5, h: 5, flat: true }); }
      break;
    }
    case 13: {
      // the kid presses the low side of the book stack (side view, hands on the books)
      const press = smooth((f - 1325) / 10);
      const so: SideOpts = { mode: "push", pose: q(press, 30), expr: f > 1380 ? "shock" : "grin", blink: lidAt(t, 60), hand: [560, 520] };
      out.places.push({ ...person(cam, W(60, KID, "kid"), ROOM[0] - 0.3, 0, ROOM[2] + 1.0, { side: true, mirror: false }, {}, so, 0.62), mirror: false });
      blob(out, ROOM[0] - 0.3, 0, ROOM[2] + 1.0, 0.62);
      break;
    }
    case 14: {
      const shut = f > 1501 - 2;
      front(cam, out, W(70, GUARD, "guard"), 1.3, 5.4, { mode: "stand", expr: shut ? "stern" : "neutral", look: shut ? 0 : -1 }, t);
      [[-3.8, 9.4], [-5.2, 10.4]].forEach(([x, z], k) => {
        if (f < 1480) front(cam, out, W(71 + k, tourist(k), `t${k}`), x, z, { mode: "stand", expr: "nervous", look: 1 }, t);
        else walker(cam, out, W(71 + k, tourist(k), `t${k}`), x - 1.4 * (t - 49.3), z + 0.6 * (t - 49.3), -1, 0.4, q((t * 1.0 + k * 0.4) % 1, 60), "pained", t);
      });
      if (f >= 1501 && f < 1506) { const u = q((f - 1501) / 5, 30); out.fx.push({ key: `burst${u}`, cw: 500, ch: 500, draw: (p) => fxBurst(p, u), x: 0, y: 1.3, z: 4.5, w: 1.6, h: 1.6 }); }
      break;
    }
    case 17: [[cx - 1.4, cz], [cx + 1.1, cz + 0.4], [cx + 3.2, cz - 0.3]].forEach(([x, z], k) =>
      front(cam, out, W(80 + k, eng01(k), `o${k}`), x, z, { mode: "stand", expr: k === 1 ? "relief" : "smile_closed", look: 0, headTilt: 5 }, t)); break;
    case 18: {
      holder(cam, out, W(90, tourist(0), "t0"), -3.4, 31.0, false, t);
      holder(cam, out, W(91, tourist(3), "t3"), 5.6, 27.0, true, t);
      for (let k = 0; k < 8; k++) {
        const x = -10 + k * 3.0, z = 18 - (k % 3) * 2.2, ice = k % 4 === 1;
        front(cam, out, W(92 + k, tourist(k + 1), `tt${k}`), x, z, { mode: "stand", expr: ice ? "lick" : (["smile", "grin", "smile_closed"] as Expr[])[k % 3], prop: ice ? "icecream" : null, wave: k % 4 === 2 ? q(Math.sin(t * 7 + k), 30) : undefined }, t);
      }
      break;
    }
  }
  // dust at the base when the tower jolts
  for (const fk of [314, 1069, 1245]) if (f >= fk && f < fk + 16 && (id === 3 || id === 11 || id === 12)) {
    const u = q((f - fk) / 16, 30);
    for (const a of [0.2, 1.4, 2.6, 3.8, 5.0]) out.fx.push({ key: `puff${u}`, cw: 300, ch: 300, draw: (p) => fxPuff(p, u), x: 4.8 * Math.cos(a), y: 0.6, z: 4.8 * Math.sin(a), w: 2.4, h: 2.4, soft: true });
  }
  void INK; void bodyFront; void bodySide;
  return out;
};
export { FPS };
