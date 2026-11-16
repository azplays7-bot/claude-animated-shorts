// Timeline of "The Tower That Leaned Before It Was Finished": shots timed to the voice words
// (projects/pisa-short/voice/words.json, frames = start x 30), the tower's state per era (storeys built, lean, bend)
// and the camera grammar of the cartoon-3d-short skill: symmetric smootherstep glides of 18-40 f, cuts on big
// reframes, every hold creeps in, 7-frame flip kicks on impacts, 4-5 deg rolls on emphasis beats.
export const FPS = 30;
export const TOTAL = 1910;
export const D0 = 0; // ground height (m): the piazza lies at y = 0
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lin = (pts: [number, number][], x: number) => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return pts[pts.length - 1][1];
};

// ---------------- places ----------------
/** the tower base centre; it leans toward +x */
export const TOWER: V3 = [0, 0, 0];
/** the bedroom (blocks on a mattress, books on a bed) far from the piazza */
export const ROOM: V3 = [420, 0, 0];
/** the soil cut-away diorama (the 1999-2001 fix), floating in a plain sky */
export const DIO: V3 = [-420, 0, 0];

// ---------------- the tower ----------------
// storey heights (m): ground storey 11, six gallery storeys 7.1, belfry 6.6 (about 56 m in all, like the real one)
export const STOREY_H = [11, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 6.6];
/** cartoon scale of the tower (0.55: 31 m tall, 8.5 m wide) so people and tower share a vertical frame */
export const TS = 0.55;
export type TowerState = { built: number; lean: number; bend: number; scaffold: boolean; moss: number };
const T = (f: number) => f / FPS;
// kicks: the tower jolts further over on "leaned more" (1838, 1934) and starts to lean on "leaning"
export const LEAN_KICKS = { first: 314, f1838: 1069, f1934: 1245 };
const kickLean = (f: number, at: number, from: number, to: number) => from + (to - from) * easeOut((f - at) / 9);
/** tower state in shot `id` at frame f (cartoon angles: a little more than the real 1.6-5.5 deg so it reads on a phone) */
export const towerAt = (id: number, f: number): TowerState => {
  switch (id) {
    case 1: return { built: 3, lean: 3.2, bend: 0, scaffold: true, moss: 0 };
    case 2: return { built: lin([[110, 0.7], [243, 1.0]], f), lean: 0, bend: 0, scaffold: true, moss: 0 };
    case 3: return { built: 3, lean: f < LEAN_KICKS.first ? 0.4 * clamp01((f - 243) / 70) : kickLean(f, LEAN_KICKS.first, 0.4, 3.2), bend: 0, scaffold: true, moss: 0 };
    case 4: return { built: 3, lean: 3.2, bend: 0, scaffold: true, moss: 0 };
    case 6: return { built: 3, lean: 3.2, bend: 0, scaffold: f < 500, moss: clamp01((f - 480) / 80) };
    case 7: case 8: return { built: 3, lean: 3.2, bend: 0, scaffold: false, moss: 1 };
    case 9: return { built: lin([[697, 3], [740, 3.2], [845, 7]], f), lean: 3.6, bend: smooth((f - 720) / 120), scaffold: true, moss: 0.5 };
    case 10: return { built: 8, lean: 4.4, bend: 1, scaffold: false, moss: 0 };
    case 11: return { built: 8, lean: kickLean(f, LEAN_KICKS.f1838, 4.4, 5.2), bend: 1, scaffold: false, moss: 0 };
    case 12: return { built: 8, lean: kickLean(f, LEAN_KICKS.f1934, 5.2, 6.0), bend: 1, scaffold: false, moss: 0 };
    case 14: return { built: 8, lean: 6.0, bend: 1, scaffold: false, moss: 0 };
    case 15: return { built: 2, lean: lin([[1600, 6.0], [1670, 5.1]], f), bend: 0, scaffold: false, moss: 0 }; // diorama stub
    case 16: return { built: 8, lean: lin([[1670, 6.0], [1715, 5.1]], f), bend: 1, scaffold: false, moss: 0 };
    default: return { built: 8, lean: 5.1, bend: 1, scaffold: false, moss: 0 };
  }
};

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: "piazza" | "room" | "dio"; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 110, light: "day", place: "piazza" },      // hook: the half-built tower already leaning
  { id: 2, a: 110, b: 243, light: "day", place: "piazza" },    // Pisa 1173: proud town, ground storey going up
  { id: 3, a: 243, b: 333, light: "day", place: "piazza" },    // five years in: step back... it's leaning
  { id: 4, a: 333, b: 383, light: "day", place: "piazza" },    // one side on soft clay
  { id: 5, a: 383, b: 457, light: "day", place: "room", sunAz: 150, sunEl: 40 },      // blocks on a mattress
  { id: 6, a: 457, b: 560, light: "day", place: "piazza" },    // war: work stops for a century
  { id: 7, a: 560, b: 642, light: "day", place: "piazza" },    // luckily the ground settled
  { id: 8, a: 642, b: 697, light: "day", place: "piazza" },    // unluckily still crooked
  { id: 9, a: 697, b: 853, light: "day", place: "piazza" },    // the next builders cheat (taller on the short side)
  { id: 10, a: 853, b: 940, light: "day", place: "piazza" },   // slightly banana-shaped
  { id: 11, a: 940, b: 1097, light: "day", place: "piazza" },  // 1838: the dig, water, leaned more
  { id: 12, a: 1097, b: 1271, light: "day", place: "piazza" }, // 1934: concrete, leaned more
  { id: 13, a: 1271, b: 1400, light: "day", place: "room", sunAz: 150, sunEl: 40 },   // books on a soft bed
  { id: 14, a: 1400, b: 1508, light: "golden", place: "piazza" }, // 1990: closed
  { id: 15, a: 1508, b: 1670, light: "day", place: "dio" },    // the opposite: scoops of soil from under the high side
  { id: 16, a: 1670, b: 1720, light: "day", place: "piazza" }, // ... and the tower slowly leaned back
  { id: 17, a: 1720, b: 1773, light: "day", place: "piazza" }, // they stopped long before it was straight
  { id: 18, a: 1773, b: TOTAL, light: "day", place: "piazza" }, // tourists hold it up
];
/** crossfades at place / time changes; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 6: 8, 7: 10, 9: 8, 11: 8, 12: 8, 14: 8, 15: 8, 16: 8 };
export const FLASH_AT = 110;
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
/** push-in factor since f0 (subject grows ~rate per frame), with a punch for the first n frames */
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const zoom = (pos: V3, look: V3, fov: number, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos, look, fov: (360 / Math.PI) * Math.atan(Math.tan((fov * Math.PI) / 360) * k), ...rest });
const rolled = (s: (f: number) => Shot, roll: number) => (f: number): Shot => ({ ...s(f), roll });

// subject spots on the piazza: builders stand south-east of the tower (+z, toward the lens side)
export const CREW: V3 = [3, 0, 17];
const R0: V3 = [ROOM[0], 0, ROOM[2]], DI: V3 = [DIO[0], 0, DIO[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const CAMS: Record<number, Key[]> = {
  // 1 hook: low at the builders' feet looking up at the leaning stub, push; roll on "falling over"
  1: [
    { f: 0, s: (f) => dolly([-6, 1.4, 30], [1.0, 4.6, 4], pushK(f, 0, 0.0028), { fov: 44 }) },
    { f: 46, dur: 30, s: (f) => dolly([-4.5, 1.3, 27.5], [1.4, 5.0, 4], pushK(f, 46, 0.0025), { fov: 42, roll: 0.07 }) },
  ],
  // 2 aerial establishing over the piazza, then down to the proud crowd at the scaffold
  2: [
    { f: 104, s: (f) => zoom([42, 28, 58], [-6, 3, 0], 44, pushK(f, 104, 0.0018)) },
    { f: 176, cut: true, s: (f) => dolly([4, 1.7, 30], [1, 3.5, 6], pushK(f, 176, 0.0025), { fov: 42 }) },
  ],
  // 3 the builders step back; on "leaning" the lens rolls with the tower
  3: [
    { f: 243, s: (f) => dolly([9, 2.2, 34], [1, 5, 0], pushK(f, 243, 0.0022), { fov: 44 }) },
    { f: 300, dur: 28, s: (f) => dolly([9, 2.0, 32], [1.5, 5.5, 0], pushK(f, 300, 0.002, 0.006, 30), { fov: 44, roll: 0.075 }) },
  ],
  // 4 low at the base on the sinking side: the ground bulge and the dark clay
  4: [{ f: 333, s: (f) => dolly([11, 1.2, 10.5], [3.6, 1.6, 0], pushK(f, 333, 0.003), { fov: 42, roll: -0.04 }) }],
  // 5 bedroom: the kid's block tower on the mattress
  5: [
    { f: 383, s: (f) => dolly(add(R0, [0.6, 1.3, 4.2]), add(R0, [-0.2, 0.95, 0.3]), pushK(f, 383, 0.003), { fov: 40 }) },
    { f: 425, dur: 24, s: (f) => dolly(add(R0, [0.5, 1.2, 3.5]), add(R0, [-0.15, 0.95, 0.3]), pushK(f, 425, 0.0025), { fov: 38, roll: 0.06 }) },
  ],
  // 6 war: the crew downs tools and walks off; the lens rises to a high still wide as a century passes
  6: [
    { f: 453, s: (f) => dolly([8, 2.0, 30], [1, 3.5, 5], pushK(f, 453, 0.002), { fov: 42 }) },
    { f: 500, dur: 40, s: (f) => zoom([34, 20, 52], [0, 5, 0], 44, pushK(f, 500, 0.0012)) },
  ],
  // 7 luckily: low over the settled ground at the base, the new crew walks in
  7: [{ f: 555, s: (f) => dolly([-10, 1.5, 28], [1, 4, 4], pushK(f, 555, 0.0022), { fov: 44, roll: 0.03 }) }],
  // 8 unluckily: MS of the new crew, heads tilted like the tower
  8: [{ f: 642, s: (f) => dolly([4, 1.75, 26.5], [2, 2.0, 17], pushK(f, 642, 0.0025, 0.006, 25), { fov: 40, roll: -0.05 }) }],
  // 9 cheating: crane up the tower as floors are added
  9: [
    { f: 693, s: (f) => dolly([22, 6, 38], [0, 9, 0], pushK(f, 693, 0.0015), { fov: 46 }) },
    { f: 760, dur: 60, s: (f) => dolly([26, 18, 48], [1.5, 16, 0], pushK(f, 760, 0.0015), { fov: 48 }) },
  ],
  // 10 banana: side view, the whole curve, push on "banana-shaped"
  10: [{ f: 853, s: (f) => zoom([0, 16, 64], [1.5, 16, 0], 42, pushK(f, 853, 0.0015, 0.005, 30)) }],
  // 11 1838: the architect and the dig, then the kick
  11: [
    { f: 936, s: (f) => dolly([-12, 2.4, 20], [-2.2, 2.2, 6.5], pushK(f, 936, 0.0022), { fov: 42 }) },
    { f: 1040, cut: true, s: (f) => dolly([-14, 6, 40], [1.5, 13, 0], pushK(f, 1040, 0.002), { fov: 46 }) },
    { f: 1069, dur: 18, s: (f) => dolly([-14, 6, 40], [1.5, 13, 0], pushK(f, 1040, 0.002), { fov: 46, roll: -0.07 }) },
  ],
  // 12 1934: engineers at the pump, then the kick
  12: [
    { f: 1093, s: (f) => dolly([16, 2.2, 24], [4, 2.0, 9], pushK(f, 1093, 0.002), { fov: 42 }) },
    { f: 1178, dur: 24, s: (f) => dolly([12, 1.8, 20], [5, 1.4, 8], pushK(f, 1178, 0.0022), { fov: 40, roll: 0.04 }) },
    { f: 1239, cut: true, s: (f) => dolly([18, 6, 42], [1.5, 13, 0], pushK(f, 1239, 0.002), { fov: 46, roll: 0.07 }) },
  ],
  // 13 bedroom: books on the bed, a hand presses the low side
  13: [
    { f: 1271, s: (f) => dolly(add(R0, [0.9, 1.3, 3.9]), add(R0, [-0.1, 0.9, 0.4]), pushK(f, 1271, 0.0025), { fov: 40 }) },
    { f: 1340, dur: 26, s: (f) => dolly(add(R0, [0.7, 1.1, 3.0]), add(R0, [0.0, 0.85, 0.3]), pushK(f, 1340, 0.003, 0.006, 30), { fov: 38, roll: -0.06 }) },
  ],
  // 14 1990 dusk: the closed door, the guard, the barrier
  14: [
    { f: 1396, s: (f) => dolly([-2.5, 2.0, 21], [0, 3.2, 4], pushK(f, 1396, 0.0022), { fov: 42 }) },
    { f: 1480, dur: 22, s: (f) => dolly([-1.2, 1.7, 12.5], [0.2, 1.7, 4.4], pushK(f, 1480, 0.003, 0.006, 25), { fov: 40 }) },
  ],
  // 15 diorama: side view of the soil slab, augers under the high side
  15: [
    { f: 1504, s: (f) => dolly(add(DI, [2, 7, 58]), add(DI, [-1, 3, 0]), pushK(f, 1504, 0.0018), { fov: 42 }) },
    { f: 1590, dur: 30, s: (f) => dolly(add(DI, [-4, 2, 40]), add(DI, [-4, 0, 0]), pushK(f, 1590, 0.0022), { fov: 40 }) },
  ],
  // 16 wide: the tower settles back a little
  16: [{ f: 1666, s: (f) => zoom([28, 5, 58], [1.5, 14, 0], 44, pushK(f, 1666, 0.002)) }],
  // 17 the engineers look up, satisfied
  17: [{ f: 1720, s: (f) => dolly([6, 1.6, 27.5], [2.5, 2.4, 17], pushK(f, 1720, 0.0025), { fov: 40, roll: 0.04 }) }],
  // 18 tourists holding it up, then the crane out to the whole piazza
  18: [
    { f: 1773, s: (f) => dolly([-4, 1.7, 44], [1, 9, 0], pushK(f, 1773, 0.0022), { fov: 46 }) },
    { f: 1840, dur: 70, s: (f) => zoom([-32, 24, 80], [2, 10, 0], 46, pushK(f, 1840, 0.0012)) },
  ],
};

// impact kicks: image offset flips sign every frame, decaying over 7 f
const KICKS: [number, number][] = [[LEAN_KICKS.first / FPS, 0.8], [LEAN_KICKS.f1838 / FPS, 1.2], [LEAN_KICKS.f1934 / FPS, 1.4], [1501 / FPS, 0.8], [1380 / FPS, 0.6]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(T(f));
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
void rolled;

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 4, focus: () => [-2.6, 1.6, 19.6] },  // hook: the crew sharp, the tower a little soft behind
  { f: 110, cInf: 0 },                                 // aerial
  { f: 176, cInf: 10, focus: () => [2, 1.7, 17] },     // the proud crowd
  { f: 243, cInf: 6, focus: () => [CREW[0], 1.6, CREW[2]] },
  { f: 333, cInf: 0 },
  { f: 383, cInf: 13 },                                // bedroom inserts: focus = look
  { f: 457, cInf: 8, focus: () => [CREW[0], 1.6, CREW[2]] },
  { f: 500, dur: 40, cInf: 0 },
  { f: 642, cInf: 12, focus: () => [CREW[0], 1.7, CREW[2]] },
  { f: 697, cInf: 0 },
  { f: 940, cInf: 9, focus: () => [-3.2, 1.7, 8.6] },
  { f: 1040, cInf: 0 },
  { f: 1097, cInf: 9, focus: () => [5, 1.6, 10] },
  { f: 1239, cInf: 0 },
  { f: 1271, cInf: 13 },
  { f: 1400, cInf: 6, focus: () => [1.3, 1.7, 5.4] },
  { f: 1508, cInf: 0 },
  { f: 1720, cInf: 12, focus: () => [CREW[0], 1.7, CREW[2]] },
  { f: 1773, cInf: 5, focus: () => [-3, 1.7, 31] },
  { f: 1840, dur: 50, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: 176, b: 243, kit: "plant_bushDetailed", pos: [7.5, 0, 24.5], s: 1.3, yaw: 0.4 },
  { a: 1773, b: 1840, kit: "plant_bushDetailed", pos: [-6.2, 0, 37.5], s: 1.2, yaw: 0.2 },
];
