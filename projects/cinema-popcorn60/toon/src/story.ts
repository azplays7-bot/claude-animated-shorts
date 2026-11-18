// Timeline of "Why theaters lose money on the movie" in the flat-characters-in-a-3D-toon-world style (Pisa engine).
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
const atEnd = (needle: string) => Math.round(CH.find((c) => c.text.includes(needle))!.end * FPS);
const R0 = at("Then RENT"), R1 = atEnd("Then RENT");
/** narration beats (frames) */
export const BT = {
  ticket: at("movie TICKET"), little: at("very LITTLE"), curtain: at("behind this CURTAIN"), stay: at("Stay to the END"),
  studio: at("the STUDIO"), half: at("over HALF"), rent: R0, power: Math.round(R0 + (R1 - R0) * 0.62), screens: at("giant SCREENS"),
  dimmed: at("DIMMED"), gone: at("is GONE"), keep: at("might keep"),
  survive: at("SURVIVE"), hundreds: at("HUNDREDS"), allowed: at("AREN'T ALLOWED"), profitable: at("PROFITABLE"),
  what: at("behind the CURTAIN?"), popcorn: at("POPCORN."), tub: at("$9 tub"), third: at("a THIRD"), profit: at("mostly PROFIT"),
  getsin: at("gets you IN"), bills: at("pays the BILLS"), printers: at("PRINTERS"), consoles: at("CONSOLES"), cheap: at("looks CHEAP"), find: at("find the POPCORN"),
  end: Math.round(CH[CH.length - 1].end * FPS),
};

// ---------------- places ----------------
/** the street: shop fronts face +z at z = SHOP_FRONT; shops are SHOP_W wide, centred at SHOP_X; the cinema is the
 *  double-width unit at CINEMA_X */
export const SHOP_D = 8, SHOP_FRONT = SHOP_D / 2, SHOP_W = 7.6, SHOP_H = 7.6;
export const CINEMA_X = 0, CINEMA_W = 13.6, CINEMA_H = 10;
export const SHOP_X = [-35, -27, -19, -11, 11, 19, 27, 35];
export const WALK_Z = 7.0;                               // sidewalk centre
export const ROAD_Z = 12.5;                              // road centre
export const LOBBY: V3 = [400, 0, 0];                   // the lobby with the curtained counter
export const STAGE: V3 = [-400, 0, 0];                  // the explainer stage (where the $15 goes)
/** lobby, relative to LOBBY */
export const COUNTER_L: V3 = [0, 0, -4.2];              // the snack counter (behind the curtain)
export const CURTAIN_Z = -2.9, CURTAIN_HW = 4.0, CURTAIN_H = 4.6;
export const POPPER: V3 = [-1.9, 1.1, -4.2];            // the popcorn machine on the counter
export const SODA: V3 = [1.9, 1.1, -4.3];
export const NOFOOD: V3 = [5.6, 0, 0.6];                // the NO OUTSIDE FOOD stand
export const OWNER_L: V3 = [-4.9, 0, -1.6];             // the theater manager, by the curtain
/** stage, relative to STAGE */
export const COUNTER: V3 = [0, 0, 0];                   // the ticket counter
export const JARS: V3[] = [[-1.6, 1.3, -1.5], [0, 1.3, -1.5], [1.6, 1.3, -1.5]];   // STUDIO, RENT+STAFF, POWER+TECH
export const JAR_COINS = [8, 3, 2];                      // $13 of a $15 ticket; $2 stay
export const COIN_N = 15;
export const CUST: V3 = [-1.85, 0, 1.4];
export const OWNER_S: V3 = [1.85, 0, 1.3];
/** street: the moviegoer and the manager in front of the cinema */
export const MAX_STREET: V3 = [1.2, 0, 6.8];
export const OWNER_STREET: V3 = [-1.2, 0, 6.6];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "street" | "lobby" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 165, light: "golden", place: "street" },                           // the $15 ticket
  { id: 2, a: 165, b: 300, light: "day", place: "lobby", sunAz: 150, sunEl: 60 },      // the curtain: the real money maker
  { id: 3, a: 300, b: 735, light: "day", place: "stage", sunAz: 120, sunEl: 55 },      // where the $15 goes
  { id: 4, a: 735, b: 1370, light: "day", place: "lobby", sunAz: 150, sunEl: 60 },     // the lobby, the reveal: POPCORN
  { id: 5, a: 1370, b: TOTAL, light: "golden", place: "street" },                      // the lesson: find the popcorn
];
/** crossfades between shots */
export const XFADE: Record<number, number> = { 2: 10, 3: 10, 4: 10, 5: 10 };
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
const L = (x: number, y: number, z: number): V3 => add(LOBBY, [x, y, z]);
const S = (x: number, y: number, z: number): V3 => add(STAGE, [x, y, z]);

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: () => ({ pos: [6, 3.0, 30], look: [0, 4.4, 4], fov: 48 }) },
    { f: 2, dur: 160, s: () => ({ pos: [2.0, 2.0, 15.0], look: [0.4, 3.4, 5], fov: 48 }) },
  ],
  2: [
    { f: 160, s: (f) => dolly(L(0.6, 2.4, 9.5), L(0, 2.6, -2.8), pushK(f, 160, 0.0016), { fov: 50 }) },
  ],
  3: [
    { f: 295, s: () => ({ pos: S(0, 4.8, 11.2), look: S(0, 1.6, -0.2), fov: 54 }) },
    { f: 305, dur: 120, s: () => ({ pos: S(0, 4.0, 9.2), look: S(0, 1.7, -0.6), fov: 54 }) },
    { f: BT.dimmed - 6, dur: 40, s: () => ({ pos: S(0.4, 3.5, 8.6), look: S(0.2, 1.7, -0.6), fov: 54 }) },
    { f: BT.keep - 6, dur: 30, s: (f) => dolly(S(0.4, 3.2, 8.0), S(0.2, 1.5, 0), pushK(f, BT.keep + 24, 0.002), { fov: 52 }) },
  ],
  4: [
    { f: 730, s: () => ({ pos: L(1.5, 3.0, 13.5), look: L(0, 2.2, -1), fov: 52 }) },
    { f: 740, dur: 120, s: () => ({ pos: L(0.8, 3.4, 12.5), look: L(0, 2.0, -1), fov: 52 }) },
    { f: BT.allowed - 6, dur: 30, s: () => ({ pos: L(2.6, 2.6, 7.4), look: L(5.0, 1.8, 0.4), fov: 50 }) },
    { f: BT.profitable - 4, dur: 36, s: (f) => dolly(L(0.4, 2.6, 9.0), L(0, 2.6, -2.8), pushK(f, BT.profitable + 32, 0.0018), { fov: 50 }) },
    { f: BT.popcorn - 2, dur: 30, s: () => ({ pos: L(0.3, 2.9, 10.5), look: L(0, 2.4, -3), fov: 54 }) },
    { f: BT.tub - 4, dur: 34, s: (f) => dolly(L(-1.0, 2.2, 1.0), L(-1.4, 2.5, -4.0), pushK(f, BT.tub + 30, 0.0012), { fov: 50 }) },
    { f: BT.third - 4, dur: 34, s: () => ({ pos: L(0.5, 3.2, 9.5), look: L(0, 1.9, -2), fov: 54 }) },
  ],
  5: [
    { f: 1365, s: () => ({ pos: [0.6, 2.4, 15.2], look: [0, 3.0, 5], fov: 50 }) },
    { f: 1375, dur: 200, s: () => ({ pos: [0.3, 1.9, 12.4], look: [0, 2.8, 5], fov: 50 }) },
    { f: BT.cheap - 10, dur: 110, s: () => ({ pos: [0.2, 2.1, 13.6], look: [0, 3.0, 5], fov: 50 }) },
  ],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 2 },
  { f: 165, cInf: 3 },
  { f: 300, cInf: 0 },
  { f: 735, cInf: 2 },
  { f: BT.tub - 4, dur: 20, cInf: 4 },
  { f: BT.third - 4, dur: 20, cInf: 2 },
  { f: 1370, cInf: 2.5 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

/** curtain: 0 closed .. 1 open (opens on "POPCORN") */
export const curtainOpen = (id: number, f: number) => (id === 4 ? clamp01((f - BT.popcorn + 2) / 16) : 0);
