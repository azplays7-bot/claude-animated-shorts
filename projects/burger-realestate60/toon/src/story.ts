// Timeline of "How McDonald's makes money from real estate" in the flat-characters-in-a-3D-toon-world style (Pisa engine).
// One continuous 60 s video. Beats come from the narration (timing.json, frame = start x 30).
import TM from "./timing.json";
export const FPS = 30;
export const TOTAL = 1800;
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;

const CH = TM.chunks as { start: number; end: number; text: string }[];
const at = (needle: string) => Math.round(CH.find((c) => c.text.includes(needle))!.start * FPS);
/** narration beats (frames) */
export const BT = {
  billions: at("BILLIONS"), huge: at("HUGE share"), els: at("something ELSE"), re: at("REAL ESTATE."), p95: at("About 95%"), fran: at("FRANCHISEES"),
  sam: at("like SAM"), kitchen: at("runs the kitchen"), flips: at("flips the"), twist: at("TWIST"), owns: at("OWNS the building"), land: at("LAND under"),
  month: at("every MONTH"), rent: at("pays McDonald's RENT"), slice: at("SLICE of sales"), min: at("with a MINIMUM"), roy: at("ROYALTY on"),
  y2024: at("In 2024"), double: at("DOUBLE"), bad: at("BAD year"), coming: at("keeps COMING"), rise: at("RISE in value"),
  notjust: at("not JUST"), exec: at("early executive"), rebiz: at("REAL ESTATE business"), landlords: at("BIGGEST landlords"), planet: at("PLANET"),
  end: Math.round(CH[CH.length - 1].end * FPS),
};

// ---------------- places ----------------
/** the restaurant: front door faces +z; the street runs along x in front of it */
export const REST: V3 = [0, 0, 0];
export const RW = 11, RD = 8, RH = 4.2;                 // width, depth, wall height of the restaurant
export const DOOR: V3 = [0, 0, RD / 2];
export const WALK_Z = 7.0;                               // sidewalk line (north side)
export const ROAD_Z = 10.5;                              // road centre
export const LOT = { x0: -10, x1: 10, z0: -7.5, z1: WALK_Z - 0.85 };   // the parcel of land under the restaurant
export const POLE: V3 = [7.6, 0, 4.9];                   // the tall restaurant sign
/** other franchised restaurants down the street: [x, z, yaw] */
export const OTHERS: V3[] = [[-26, 0, 0], [27, 0, 0], [-13, 24, Math.PI], [15, 24, Math.PI]];
export const KITCHEN: V3 = [400, 0, 0];                  // Sam's kitchen (insert set)
export const STAGE: V3 = [-400, 0, 0];                   // the money stage (plain sky)
export const SAM_FRONT: V3 = [-2.6, 0, 5.4];             // Sam outside his restaurant
export const CORP: V3 = [-6.6, 0, 5.6];                  // the company's landlord man

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "street" | "kitchen" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 84, light: "day", place: "street" },                               // customers stream in, burgers fly out
  { id: 2, a: 84, b: 173, light: "day", place: "street" },                             // where does the money come from? crane down to the lot
  { id: 3, a: 173, b: 227, light: "day", place: "street" },                            // REAL ESTATE: the parcel lights up
  { id: 4, a: 227, b: 345, light: "day", place: "street" },                            // 95 %: pins over every restaurant
  { id: 5, a: 345, b: 415, light: "day", place: "street" },                            // meet Sam
  { id: 6, a: 415, b: 548, light: "day", place: "kitchen", sunAz: 150, sunEl: 40 },   // Sam's kitchen
  { id: 7, a: 548, b: 800, light: "day", place: "street" },                            // the twist: building + land, rent
  { id: 8, a: 800, b: 1170, light: "day", place: "stage", sunAz: 120, sunEl: 50 },    // rent vs royalties
  { id: 9, a: 1170, b: 1360, light: "day", place: "street" },                          // a bad year, rent keeps coming
  { id: 10, a: 1360, b: TOTAL, light: "day", place: "street" },                        // crane up: the landlord of the planet
];
/** crossfades between shots */
export const XFADE: Record<number, number> = { 2: 10, 4: 10, 5: 8, 7: 8, 9: 8, 10: 12 };
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mixC = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mixC(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const K = KITCHEN, ST = STAGE;

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: (f) => dolly([7.5, 3.0, 24], [0.5, 2.6, 3], pushK(f, 0, 0.003), { fov: 44 }) }],
  2: [
    { f: 79, s: () => ({ pos: [9, 4.2, 22], look: [0.6, 2.4, 3], fov: 44 }) },
    { f: 100, dur: 70, s: () => ({ pos: [12, 14, 26], look: [0, 0.4, 0], fov: 46 }) },
  ],
  3: [{ f: 173, s: (f) => dolly([16, 30, 30], [0, 0, 0], pushK(f, 173, 0.002), { fov: 46 }) }],
  4: [
    { f: 222, s: () => ({ pos: [-52, 30, 40], look: [6, 0, 10], fov: 50 }) },
    { f: 232, dur: 110, s: () => ({ pos: [-46, 36, 50], look: [8, 0, 10], fov: 52 }) },
  ],
  5: [{ f: 341, s: (f) => dolly([-0.5, 2.2, 14.5], [SAM_FRONT[0] - 0.2, 2.0, SAM_FRONT[2]], pushK(f, 341, 0.002), { fov: 40 }) }],
  6: [
    { f: 415, s: (f) => dolly(add(K, [0.4, 2.0, 6.4]), add(K, [0, 1.5, 0]), pushK(f, 415, 0.002), { fov: 42 }) },
    { f: 470, dur: 40, s: (f) => dolly(add(K, [0.7, 2.1, 6.0]), add(K, [0.1, 1.5, 0.2]), pushK(f, 470, 0.002), { fov: 42 }) },
  ],
  7: [
    { f: 544, s: (f) => dolly([-4.2, 2.6, 19], [-3.6, 2.2, 5], pushK(f, 544, 0.0015), { fov: 42 }) },
    { f: BT.owns - 6, dur: 40, s: () => ({ pos: [14, 9, 30], look: [0, 2.6, 1], fov: 46 }) },
    { f: BT.land - 4, dur: 36, s: () => ({ pos: [12, 22, 32], look: [0, 0, 0], fov: 46 }) },
    { f: BT.month - 8, dur: 30, s: (f) => dolly([-4.6, 2.6, 19], [-4.6, 1.9, 5.5], pushK(f, BT.month + 22, 0.0015), { fov: 42 }) },
  ],
  8: [
    { f: 800, s: (f) => dolly(add(ST, [0, 5.6, 21]), add(ST, [0, 2.3, -0.5]), pushK(f, 800, 0.0006), { fov: 46 }) },
    { f: BT.y2024 - 10, dur: 40, s: (f) => dolly(add(ST, [0, 5.4, 20]), add(ST, [0, 2.6, -1]), pushK(f, BT.y2024 + 30, 0.0008), { fov: 46 }) },
  ],
  9: [
    { f: 1166, s: (f) => dolly([-4.6, 2.6, 19], [-4.6, 1.9, 5.5], pushK(f, 1166, 0.0015), { fov: 42 }) },
    { f: BT.rise - 6, dur: 40, s: () => ({ pos: [13, 10, 30], look: [0, 2.0, 1], fov: 46 }) },
  ],
  10: [
    { f: 1354, s: () => ({ pos: [10, 8, 30], look: [0, 2.6, 2], fov: 46 }) },
    { f: 1366, dur: 260, s: () => ({ pos: [48, 34, 48], look: [-6, 0, 10], fov: 52 }) },
    { f: 1640, dur: 160, s: () => ({ pos: [54, 40, 56], look: [-6, 0, 10], fov: 52 }) },
  ],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 2 },
  { f: 100, dur: 40, cInf: 0 },
  { f: 345, cInf: 7, focus: () => [SAM_FRONT[0], 1.6, SAM_FRONT[2]] },
  { f: 415, cInf: 9 },
  { f: 548, cInf: 5, focus: () => [CORP[0] + 2, 1.6, CORP[2]] },
  { f: BT.owns - 6, dur: 30, cInf: 0 },
  { f: BT.month - 8, dur: 30, cInf: 5, focus: () => [CORP[0] + 2, 1.6, CORP[2]] },
  { f: 800, cInf: 0 },
  { f: 1170, cInf: 5, focus: () => [CORP[0] + 2, 1.6, CORP[2]] },
  { f: BT.rise - 6, dur: 30, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

// ---------------- the money (McDonald's 2024 Form 10-K, franchised-restaurant revenue) ----------------
export const RENT_B = 10.0, ROY_B = 5.6;                 // $ billions, rounded
