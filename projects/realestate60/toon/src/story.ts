// Timeline of "How Real Estate Can Build Wealth" in the flat-characters-in-a-3D-toon-world style (Pisa engine).
// 60 s = six 10-second clips (frames 0-299, 300-599, ...). Every clip starts on a hard cut so it can stand alone;
// shots inside a clip may crossfade. Beats come from the narration (timing.json, frame = start x 30).
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
  meet: at("Meet ALEX"), buys: at("Alex buys"), down: at("puts down"), loan: at("borrows"), back: at("pays it back"),
  rents: at("RENTS it"), pay: at("They pay him"), not: at("NOT all profit"), bills: at("BILLS to pay"),
  mort: at("Mortgage:"), tax: at("Taxes and"), rep: at("Repairs and"), left: at("That leaves"), wipe: at("REPAIR could"),
  shrink: at("SHRINKS"), rise: at("IF the home"), eq: at("EQUITY grows"), def: at("EQUITY is the"), guar: at("GUARANTEED"), secret: at("The SECRET"),
};

// ---------------- places ----------------
/** the rental house: front door faces +z; the street runs along x in front of it */
export const HOUSE: V3 = [0, 0, 0];
export const HW = 9, HD = 8, HH = 5.6;                  // width, depth, wall height of the rental house
export const DOOR: V3 = [0, 0, HD / 2];
export const WALK_Z = 7.0;                               // sidewalk line (north side)
export const ROAD_Z = 10.5;                              // road centre
export const SIGN: V3 = [3.2, 0, 5.6];                   // the yard sign
export const BANK_B: V3 = [-15, 0, 0];                   // the bank building down the street
export const OFFICE: V3 = [400, 0, 0];                   // Alex's office (insert set)
export const LENDER: V3 = [400, 0, 80];                  // the lender's office (insert set)
export const STAGE: V3 = [-400, 0, 0];                   // the money stage (plain sky)
export const COLUMN: V3 = [7.2, 0, 5.2];                 // the home-value column in the time-lapse

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "street" | "office" | "lender" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 102, light: "day", place: "office", sunAz: 150, sunEl: 30 },   // tired at the desk, paycheck
  { id: 2, a: 102, b: 138, light: "day", place: "street" },                            // the street from above
  { id: 3, a: 138, b: 300, light: "day", place: "street" },                            // meet Alex: rent flows to his phone
  { id: 4, a: 300, b: 392, light: "day", place: "street" },                            // FOR SALE $250,000
  { id: 5, a: 392, b: 516, light: "day", place: "lender", sunAz: 150, sunEl: 40 },    // down payment + loan
  { id: 6, a: 516, b: 600, light: "day", place: "street" },                            // SOLD: keys, monthly payments
  { id: 7, a: 600, b: 790, light: "day", place: "street" },                            // FOR RENT: the family moves in
  { id: 8, a: 790, b: 900, light: "day", place: "street" },                            // the bills arrive
  { id: 9, a: 900, b: 1200, light: "day", place: "stage", sunAz: 120, sunEl: 50 },    // the monthly math
  { id: 10, a: 1200, b: 1500, light: "day", place: "street" },                         // five years of seasons, equity grows
  { id: 11, a: 1500, b: 1640, light: "day", place: "street" },                      // Alex proud at sunset
  { id: 12, a: 1640, b: TOTAL, light: "day", place: "street" },                     // crane up: the street of possibilities
];
/** crossfades inside a clip (never on a clip boundary) */
export const XFADE: Record<number, number> = { 2: 8, 3: 8, 6: 8, 8: 6, 12: 10 };
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
/** slow push-in factor since f0 */
const pushK = (f: number, f0: number, rate: number) => Math.exp(-rate * Math.max(0, f - f0));
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const O = OFFICE, LD = LENDER, ST = STAGE;

/** Alex's spots */
export const ALEX_HOOK: V3 = [-2.4, 0, WALK_Z];
export const ALEX_YARD: V3 = [1.2, 0, 6.0];

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: (f) => dolly(add(O, [0.5, 1.75, 5.2]), add(O, [0, 1.55, 0.2]), pushK(f, 0, 0.0035), { fov: 40 }) },
    { f: 50, dur: 30, s: (f) => dolly(add(O, [0.25, 1.7, 4.0]), add(O, [0, 1.5, 0.2]), pushK(f, 50, 0.003), { fov: 38, roll: -0.04 }) },
  ],
  2: [{ f: 98, s: (f) => dolly([16, 26, 46], [0, 2, 2], pushK(f, 98, 0.006), { fov: 44 }) }],
  3: [
    { f: 134, s: (f) => dolly([-6.5, 2.6, 19], [-0.8, 2.7, 3.5], pushK(f, 134, 0.0018), { fov: 42 }) },
    { f: 230, dur: 40, s: (f) => dolly([-4.0, 2.3, 16], [-1.2, 2.4, 4.0], pushK(f, 230, 0.0015), { fov: 40 }) },
  ],
  4: [
    { f: 300, s: (f) => dolly([-11, 2.4, 18], [-5, 1.9, WALK_Z], 1, { fov: 42 }) },
    { f: 316, dur: 60, s: () => ({ pos: [5.5, 2.4, 17.5], look: [1.6, 2.2, 5.4], fov: 40 }) },
  ],
  5: [
    { f: 388, s: (f) => dolly(add(LD, [0.3, 2.0, 7.0]), add(LD, [0, 1.45, 0]), pushK(f, 388, 0.002), { fov: 42 }) },
    { f: 470, dur: 30, s: (f) => dolly(add(LD, [0.9, 1.9, 5.8]), add(LD, [0.2, 1.35, 0.2]), pushK(f, 470, 0.002), { fov: 40 }) },
  ],
  6: [
    { f: 512, s: (f) => dolly([2.5, 2.2, 15], [ALEX_YARD[0] - 0.4, 2.2, ALEX_YARD[2]], pushK(f, 512, 0.002), { fov: 40 }) },
    { f: 546, dur: 34, s: () => ({ pos: [-6.5, 6.5, 42], look: [-6.5, 3.6, 3], fov: 44 }) },
  ],
  7: [
    { f: 600, s: (f) => dolly([8.5, 2.6, 20], [3.0, 2.0, 5.5], pushK(f, 600, 0.0012), { fov: 44 }) },
    { f: 686, dur: 30, s: (f) => dolly([3.0, 2.3, 16.5], [0.6, 1.9, 5.8], pushK(f, 686, 0.0015), { fov: 40 }) },
  ],
  8: [{ f: 786, s: (f) => dolly([1.6, 2.0, 12.5], [ALEX_YARD[0] - 0.2, 1.9, ALEX_YARD[2]], pushK(f, 786, 0.0028), { fov: 38 }) }],
  9: [
    { f: 900, s: (f) => dolly(add(ST, [0, 5.5, 14]), add(ST, [0, 2.4, 0]), pushK(f, 900, 0.0008), { fov: 42 }) },
    { f: 1060, dur: 30, s: (f) => dolly(add(ST, [4.0, 5.4, 14]), add(ST, [1.4, 2.3, 0.4]), pushK(f, 1060, 0.0012), { fov: 42 }) },
    { f: 1130, dur: 20, s: (f) => dolly(add(ST, [4.6, 5.0, 13]), add(ST, [1.8, 2.2, 0.2]), pushK(f, 1130, 0.0015), { fov: 42, roll: 0.05 }) },
  ],
  10: [
    { f: 1200, s: () => ({ pos: [-9, 4.8, 24], look: [2.6, 3.6, 2.5], fov: 42 }) },
    { f: 1210, dur: 260, s: () => ({ pos: [17, 5.0, 22], look: [3.4, 3.6, 2.5], fov: 42 }) },
  ],
  11: [
    { f: 1500, s: (f) => dolly([2.0, 2.1, 13.5], [ALEX_YARD[0] - 0.3, 1.75, ALEX_YARD[2]], pushK(f, 1500, 0.0015), { fov: 38 }) },
    { f: 1560, dur: 60, s: () => ({ pos: [2.6, 3.4, 19], look: [0.8, 2.7, 5], fov: 42 }) },
  ],
  12: [
    { f: 1636, s: () => ({ pos: [4, 6, 26], look: [0, 3, 3], fov: 44 }) },
    { f: 1650, dur: 120, s: () => ({ pos: [10, 34, 60], look: [0, 0, 6], fov: 46 }) },
  ],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 10 },
  { f: 102, cInf: 0 },
  { f: 138, cInf: 6, focus: () => [ALEX_HOOK[0], 1.6, ALEX_HOOK[2]] },
  { f: 300, cInf: 3 },
  { f: 392, cInf: 10 },
  { f: 516, cInf: 6, focus: () => [ALEX_YARD[0], 1.6, ALEX_YARD[2]] },
  { f: 548, dur: 30, cInf: 0 },
  { f: 600, cInf: 3 },
  { f: 790, cInf: 8, focus: () => [ALEX_YARD[0], 1.6, ALEX_YARD[2]] },
  { f: 900, cInf: 0 },
  { f: 1200, cInf: 0 },
  { f: 1500, cInf: 7, focus: () => [ALEX_YARD[0], 1.6, ALEX_YARD[2]] },
  { f: 1560, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

// ---------------- the money (same worked example as the narration) ----------------
export const Y0 = 1212, Y1 = 1430;                       // the five years play between these frames
export const yearsAt = (f: number) => 5 * clamp01((f - Y0) / (Y1 - Y0));
export const loanAt = (y: number) => { const P = 200000, i = 0.005, pmt = (P * i) / (1 - Math.pow(1 + i, -360)), k = 12 * y; return P * Math.pow(1 + i, k) - (pmt * (Math.pow(1 + i, k) - 1)) / i; };
export const valueAt = (y: number) => 250000 + (50000 * y) / 5;   // hypothetical: +$50,000 over five years
/** season 0..1 per year: 0 summer, .3 autumn, .6 winter, .85 spring */
export const seasonAt = (f: number) => yearsAt(f) % 1;
