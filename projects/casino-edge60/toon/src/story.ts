// Timeline of "How casinos make money (and their one weakness)" in the flat-characters-in-a-3D-toon-world style (Pisa engine).
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
  weak: at("ONE weakness"), stay: at("Stay to the END"), max: at("This is MAX"), roulette: at("playing ROULETTE"), pockets: at("38 POCKETS"),
  zeros: at("plus 0 and 00"), bet: at("Bet $1"), t38: at("that's $38"), wins: at("One number WINS"), pays: at("35 to 1"),
  back36: at("get back $36"), keeps: at("keeps $2"), every: at("EVERY SPIN"), edge: at("HOUSE EDGE"), slots: at("SLOTS, BLACKJACK"),
  payouts: at("built into the PAYOUTS"), room: at("ROOM helps"), chips: at("CHIPS don't"), drinks: at("free DRINKS"), clocks: at("hide the CLOCKS"),
  night: at("ONE night"), millions: at("MILLIONS"), math: at("MATH always"), what: at("WEAKNESS?"), time: at("TIME."), keep: at("KEEP PLAYING"),
  up: at("UP $50"), walks: at("WALKS OUT"), house: at("can't win back"), left: at("LEFT the building"),
  end: Math.round(CH[CH.length - 1].end * FPS),
};

// ---------------- places ----------------
/** the casino: front doors face +z; the boulevard runs along x in front of it */
export const CAS: V3 = [0, 0, 0];
export const CW = 24, CD = 12, CH_ = 8.5;               // width, depth, wall height of the casino hall
export const DOOR: V3 = [0, 0, CD / 2];
export const WALK_Z = 13.0;                              // sidewalk line (north side)
export const ROAD_Z = 17.0;                              // road centre
export const FLOOR: V3 = [400, 0, 0];                    // the casino floor (insert set)
export const STAGE: V3 = [-400, 0, 0];                   // the money stage (a giant roulette wheel)
/** on the floor, relative to FLOOR */
export const TABLE: V3 = [0, 0, 0];                      // roulette table centre (long axis along x)
export const WHEEL: V3 = [-1.75, 0.92, 0];               // the wheel bowl on the table's left end
export const MAX_T: V3 = [0.7, 0, 1.55];                 // Max at the table
export const DEALER: V3 = [-0.3, 0, -1.45];              // the croupier behind the table
/** on the stage, relative to STAGE */
export const SW_R = 4.4;                                  // giant wheel radius
export const SW_POCKET_R = 3.75;                          // where chips sit
export const MAX_S: V3 = [-2.5, 0, 5.3];                 // Max at the front of the stage
export const PILE_S: V3 = [-0.4, 0, 6.4];                 // his chip pile
export const VAULT_S: V3 = [2.3, 0, 5.4];                 // the HOUSE vault behind the wheel
/** American wheel order (pocket 0 at angle 0, clockwise seen from above) */
export const ORDER = ["0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34", "15", "3", "24", "36", "13", "1", "00",
  "27", "10", "25", "29", "12", "8", "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2"];
export const REDS = new Set(["1", "3", "5", "7", "9", "12", "14", "16", "18", "19", "21", "23", "25", "27", "30", "32", "34", "36"]);
export const WIN_POCKET = 9;                              // index in ORDER of the winning number ("17")
export const GREEN_POCKETS = [0, 19];                     // "0" and "00"

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "street" | "floor" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 160, light: "golden", place: "street" },                           // the casino at sunset: one weakness
  { id: 2, a: 160, b: 400, light: "day", place: "floor", sunAz: 140, sunEl: 55 },      // Max at the roulette table, the wheel
  { id: 3, a: 400, b: 755, light: "day", place: "stage", sunAz: 120, sunEl: 55 },      // $38 in, $36 back, house keeps $2
  { id: 4, a: 755, b: 940, light: "day", place: "floor", sunAz: 140, sunEl: 55 },      // house edge: slots, blackjack
  { id: 5, a: 940, b: 1160, light: "day", place: "floor", sunAz: 140, sunEl: 55 },     // chips, free drinks, no clocks
  { id: 6, a: 1160, b: 1310, light: "golden", place: "street" },                       // millions of bets: the aerial
  { id: 7, a: 1310, b: 1525, light: "day", place: "floor", sunAz: 140, sunEl: 55 },    // the weakness: TIME; Max is up $50
  { id: 8, a: 1525, b: TOTAL, light: "golden", place: "street" },                      // Max walks out the door
];
/** crossfades between shots */
export const XFADE: Record<number, number> = { 2: 10, 3: 10, 4: 10, 6: 10, 7: 10, 8: 8 };
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
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const FL = FLOOR, ST = STAGE;
const F = (x: number, y: number, z: number): V3 => add(FL, [x, y, z]);

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: () => ({ pos: [9, 4.5, 40], look: [0, 7.5, 2], fov: 50 }) },
    { f: 2, dur: 158, s: () => ({ pos: [4, 2.6, 29], look: [0, 8.6, 2], fov: 50 }) },
  ],
  2: [
    { f: 155, s: (f) => dolly(F(2.6, 2.3, 6.4), F(0.2, 1.4, 0.6), pushK(f, 155, 0.0018), { fov: 42 }) },
    { f: BT.pockets - 8, dur: 34, s: (f) => dolly(F(-1.75, 2.75, 1.25), F(-1.75, 0.9, 0.05), pushK(f, BT.pockets + 26, 0.0012), { fov: 40 }) },
  ],
  3: [
    { f: 395, s: () => ({ pos: add(ST, [0, 9, 15.5]), look: add(ST, [0, 0.4, 1.4]), fov: 50 }) },
    { f: 410, dur: 300, s: () => ({ pos: add(ST, [0, 11, 14.5]), look: add(ST, [0, 0.2, 0.6]), fov: 52 }) },
  ],
  4: [
    { f: 750, s: () => ({ pos: F(-6.5, 2.5, 4.6), look: F(-4.5, 1.6, -4.5), fov: 44 }) },
    { f: 760, dur: 175, s: () => ({ pos: F(2.5, 2.5, 4.4), look: F(5.2, 1.3, -2.2), fov: 44 }) },
  ],
  5: [
    { f: 935, s: (f) => dolly(F(1.8, 2.1, 6.0), F(0.6, 1.5, 1.2), pushK(f, 935, 0.0016), { fov: 42 }) },
    { f: BT.clocks - 6, dur: 30, s: (f) => dolly(F(0.4, 2.6, 5.4), F(-0.6, 3.7, -3), pushK(f, BT.clocks + 24, 0.0015), { fov: 44 }) },
  ],
  6: [
    { f: 1155, s: () => ({ pos: [30, 26, 46], look: [0, 3, 2], fov: 50 }) },
    { f: 1160, dur: 150, s: () => ({ pos: [22, 30, 50], look: [0, 3, 2], fov: 50 }) },
  ],
  7: [
    { f: 1305, s: (f) => dolly(F(1.4, 2.0, 5.8), F(0.6, 1.5, 1.4), pushK(f, 1305, 0.0025), { fov: 40 }) },
    { f: BT.keep - 4, dur: 30, s: (f) => dolly(F(2.6, 2.4, 6.2), F(0.2, 1.3, 0.6), pushK(f, BT.keep + 26, 0.0015), { fov: 42 }) },
  ],
  8: [
    { f: 1520, s: () => ({ pos: [2.5, 2.4, 22], look: [0, 2.4, 8], fov: 44 }) },
    { f: 1530, dur: 120, s: () => ({ pos: [2.0, 2.1, 19], look: [0, 2.2, 9], fov: 44 }) },
    { f: BT.house + 10, dur: 110, s: () => ({ pos: [3, 2.2, 25], look: [0, 3.8, 6], fov: 50 }) },
  ],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 0 },
  { f: 160, cInf: 7, focus: () => F(MAX_T[0], 1.5, MAX_T[2]) },
  { f: BT.pockets - 8, dur: 30, cInf: 6, focus: () => F(WHEEL[0], WHEEL[1], WHEEL[2]) },
  { f: 400, cInf: 0 },
  { f: 755, cInf: 4 },
  { f: 940, cInf: 7, focus: () => F(MAX_T[0], 1.5, MAX_T[2]) },
  { f: BT.clocks - 6, dur: 24, cInf: 3 },
  { f: 1160, cInf: 0 },
  { f: 1310, cInf: 7, focus: () => F(MAX_T[0], 1.5, MAX_T[2]) },
  { f: 1525, cInf: 4 },
  { f: BT.house + 10, dur: 40, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

/** Max walking out of the casino in the last shot: position at frame f */
export const maxOut = (f: number): V3 => {
  const u = clamp01((f - (BT.walks - 14)) / 150);
  return [0.6, 0, DOOR[2] + 0.2 + u * 5.6];
};
