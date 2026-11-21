// Timeline of "Sneaky Business Tricks #5: the medium popcorn decoy" (Pisa engine, fast-cut style, Tony's world).
// Look: a popcorn stand on the sunny street (small $5, large $9, then a medium $8 decoy), Tony's room with the magazine
// test board (web vs print + web, then the silly print-only option), the honest caveats, Tony's three soda sizes (and
// a line of large sodas), golden hour at Tony's door (the end of part five: which one do they want me to buy?).
import WORDS from "./words.json";
import WARP from "./warp.json";
export const FPS = 30;
export const TOTAL = 1800;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

type Word = { start: number; end: number; text: string; emph: boolean };
export const WORDLIST = WORDS as Word[];
/** frame of the n-th occurrence of a caption word */
const w = (text: string, n = 0) => {
  const hits = WORDLIST.filter((x) => x.text.replace(/[^A-Z0-9$]/g, "") === text);
  if (!hits[n]) throw new Error("story.ts: no word " + text + " #" + n);
  return Math.round(hits[n].start * FPS);
};
/** Scene times below were written for an earlier recording; warp() maps them onto the current narration. */
const interp = (x: number, a: number[], b: number[]) => {
  let i = 0; while (i + 2 < a.length && x > a[i + 1]) i++;
  return b[i] + (b[i + 1] - b[i]) * (x - a[i]) / Math.max(1e-6, a[i + 1] - a[i]);
};
export const warp = (s: number) => interp(s, WARP.old, WARP.new);
export const unwarp = (s: number) => interp(s, WARP.new, WARP.old);
/** narration beats (frames) */
export const BT = {
  small: w("SMALL"), d5: w("$5"), large: w("LARGE"), d9: w("$9"), pick: w("PICK"), adds: w("ADDS"), medium: w("MEDIUM"), d8: w("$8"),
  suddenly: w("SUDDENLY"), steal: w("STEAL"), d1: w("$1"), medium2: w("MEDIUM", 1), decoy: w("DECOY"),
  famous: w("FAMOUS"), classroom: w("CLASSROOM"), magazine: w("MAGAZINE"), web: w("WEB"), print: w("PRINT"), d60: w("$60"), d125: w("$125"),
  most2: w("MOST", 1), cheaper: w("CHEAPER"), silly: w("SILLY"), printonly: w("PRINTONLY"), added: w("ADDED"), same: w("SAME"),
  nobody: w("NOBODY"), now: w("NOW"), most3: w("MOST", 2), print5: w("PRINT", 3),
  small3: w("SMALL", 2), later: w("LATER"), dont: w("DONT"), work: w("WORK"), example: w("EXAMPLE"),
  tony: w("TONY"), soda: w("SODA"), d2: w("$2"), d350: w("$350"), d4: w("$4"), guess: w("GUESS"), everybody: w("EVERYBODY"), ordered: w("ORDERED"),
  endw: w("END"), follow: w("FOLLOW"), sneaky: w("SNEAKY"), three: w("THREE"), sizes: w("SIZES"), ask: w("ASK"), buy: w("BUY"),
  end: Math.round(WORDLIST[WORDLIST.length - 1].end * FPS),
};

// ---------------- places ----------------
/** The street runs along x. BLAZE BURGER (the famous chain) occupies x -SIDE..SIDE, z BACKW..FRONT (door at DOOR_X on
 *  the facade z = FRONT) with its pole sign in the parking lot. Tony's little shop sits further down the street at
 *  x TONY_X0..TONY_X1 (door TONY_DOOR). Tony's dining room is built at STORE (local coordinates, same footprint). */
export const STORE: V3 = [400, 0, 0];
export const FRONT = 9, BACKW = -9, SIDE = 7, CEIL = 3.8;
export const DOOR_X = 3;
export const WALK_Z = 11.6;
export const ROAD_Z0 = 13.5, ROAD_Z1 = 21.5;
export const POLE: V3 = [12, 0, 6.5];
export const SIGN_Y = 9.6, BOARD_Y = 6.5;
export const TONY_X0 = 29, TONY_X1 = 40, TONY_DOOR = 34.5, TONY_H = 4.6;
/** the shop next to Tony's that closes (x range) */
export const CAFE_X0 = 17.8, CAFE_X1 = 29;
/** inside: the counter (front face at COUNTER_Z), the tables (centre x, z), the number board */
export const COUNTER_Z = -3.5, COUNTER_X0 = -6.6, COUNTER_X1 = 1.2;
export const TABLES: [number, number][] = [[-5, 1], [-1.5, 1], [5.2, 1.5], [-5, 5], [-1.5, 5], [5.2, 5.5]];
export const MAX_TABLE = 4;
export const SPEAKER: V3 = [-6.9, 3.05, 2.2];
export const NUMBER_BOARD: V3 = [2.75, 2.75, -3.45];
export const GRILL: V3 = [-3.5, 0, -7.6];
/** the fancy MAISON D'OR next door (the old cafe lot), its menu stand */
export const MAISON_X = 23.4;
export const STAND: V3 = [24.6, 0, 10.2];

// ---------------- shots (place + light) ----------------
export type Light = "day" | "golden";
export type Place = "street" | "store";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; gray?: boolean; sepia?: boolean; tense?: boolean };
const T = (s: number) => Math.round(warp(s) * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(7.05), light: "day", place: "street", sunAz: 120, sunEl: 40 },             // the popcorn stand: small, large, + medium
  { id: 2, a: T(7.05), b: T(13.95), light: "day", place: "street", sunAz: 120, sunEl: 40 },       // the large looks like a steal; the decoy
  { id: 3, a: T(13.95), b: T(34.0), light: "day", place: "store", sunAz: 140, sunEl: 78 },        // the magazine test
  { id: 4, a: T(34.0), b: T(41.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // caveats: small test, example prices
  { id: 5, a: T(41.5), b: T(48.2), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // Tony's three sodas: everybody goes large
  { id: 6, a: T(48.2), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 24 },       // the end of part five
];
export const XFADE: Record<number, number> = { 3: 8, 6: 12 };
export const FLASH_AT = -100;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- camera: a list of setups, each one moves from (p0, l0) to (p1, l1) over its own span ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
/** [start s, from pos, from look, to pos, to look, fov from, fov to, ease (0 = smooth in-out, 1 = fast start)] (store / street-relative) */
type Setup = [number, V3, V3, V3, V3, number, number, number?];
const TD = TONY_DOOR, TX = TONY_DOOR - 1.3;
const MS = STAND, MX0 = 25.55, MZ0 = 11.0;
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [MS[0], 1.3, 12.6], [MS[0], 1.15, MS[2]], [MS[0], 1.3, 12.3], [MS[0], 1.15, MS[2]], 46, 42],                    // small $5, large $9
    [2.75, [MX0 - 0.2, 1.72, 12.6], [MX0, 1.66, MZ0], [MX0 - 0.2, 1.72, 12.4], [MX0, 1.66, MZ0], 48, 44, 1],               // most people pick small
    [4.35, [MS[0], 1.3, 12.4], [MS[0], 1.15, MS[2]], [MS[0], 1.3, 12.1], [MS[0], 1.15, MS[2]], 46, 42, 1],                 // + a medium for $8
  ],
  2: [
    [7.05, [MS[0] + 0.15, 1.2, 11.7], [MS[0] + 0.15, 1.1, MS[2]], [MS[0] + 0.15, 1.2, 11.5], [MS[0] + 0.15, 1.1, MS[2]], 44, 40, 1], // the large: a steal
    [9.3, [MX0 - 0.2, 1.72, 12.6], [MX0, 1.66, MZ0], [MX0 - 0.2, 1.72, 12.4], [MX0, 1.66, MZ0], 48, 44, 1],                // only $1 more!
    [10.85, [21.6, 1.8, 15.6], [23.6, 1.3, 10.2], [21.8, 1.8, 15.2], [23.6, 1.3, 10.2], 48, 46],                            // the medium isn't there to be bought
    [12.85, [MS[0], 1.15, 11.5], [MS[0], 1.1, MS[2]], [MS[0], 1.15, 11.3], [MS[0], 1.1, MS[2]], 44, 40, 1],                  // it's a decoy
  ],
  3: [
    [13.95, [5.6, 2.6, 7.4], [-2.5, 1.3, -2.5], [5.0, 2.5, 6.8], [-2.5, 1.3, -2.5], 56, 54],                               // a famous classroom test
    [15.75, [-1.5, 1.95, 0.0], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.4], [-1.5, 1.95, -3.0], 44, 40],                        // web only or print + web
    [19.95, [-1.5, 1.95, -0.8], [-1.5, 1.95, -3.0], [-1.5, 1.95, -1.0], [-1.5, 1.95, -3.0], 40, 38, 1],                    // $60 / $125
    [23.85, [-2.0, 1.6, 0.6], [-2.6, 1.85, -3.0], [-2.1, 1.6, 0.1], [-2.6, 1.85, -3.0], 46, 42],                            // most picked the cheaper web deal
    [25.65, [-1.5, 1.95, 0.2], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.2], [-1.5, 1.95, -3.0], 44, 42, 1],                      // + a silly print-only option
    [30.4, [-1.5, 1.95, -0.9], [-1.5, 1.95, -3.0], [-1.5, 1.95, -1.1], [-1.5, 1.95, -3.0], 40, 38, 1],                      // nobody chose it
    [31.3, [-1.5, 1.95, 0.3], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.1], [-1.5, 1.95, -3.0], 44, 42, 1],                       // now most picked print + web
  ],
  4: [
    [34.0, [0.6, 2.2, 1.6], [-1.5, 1.9, -2.6], [0.3, 2.15, 1.1], [-1.5, 1.9, -2.6], 50, 46],                               // a small classroom test
    [35.95, [-2.0, 1.6, 0.4], [-2.4, 1.6, -2.6], [-2.05, 1.6, 0.0], [-2.4, 1.6, -2.6], 46, 42, 1],                          // decoys don't always work
    [38.7, [-1.5, 1.95, -0.2], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.6], [-1.5, 1.95, -3.0], 44, 40],                         // just an example
  ],
  5: [
    [41.5, [-4.6, 1.75, -2.2], [-4.9, 1.65, -4.45], [-4.65, 1.75, -2.4], [-4.9, 1.65, -4.45], 46, 42],                     // Tony added a medium soda
    [43.45, [-3.6, 1.45, -1.35], [-3.6, 1.3, -3.3], [-3.6, 1.45, -1.55], [-3.6, 1.3, -3.3], 46, 42, 1],                          // $2, $3.50, $4
    [46.45, [0.6, 1.6, 1.6], [-3.4, 1.3, -1.2], [0.3, 1.6, 1.3], [-3.4, 1.3, -1.2], 50, 46],                                 // everybody ordered... large
  ],
  6: [
    [48.2, [TX + 0.6, 1.65, 13.4], [TX + 0.6, 1.55, 10.9], [TX + 0.6, 1.65, 13.0], [TX + 0.6, 1.55, 10.9], 48, 44],       // the end of part five
    [50.1, [TX + 0.6, 2.0, 12.6], [TX + 0.6, 2.0, 10.9], [TX + 0.6, 2.0, 12.4], [TX + 0.6, 2.0, 10.9], 46, 42, 1],         // follow for more
    [52.3, [TX + 1.2, 1.7, 12.6], [TX + 1.0, 1.65, 11.0], [TX + 1.2, 1.7, 12.4], [TX + 1.0, 1.65, 11.0], 46, 42],          // three sizes...
    [54.0, [TX + 1.1, 1.55, 12.2], [TX + 1.05, 1.5, 11.0], [TX + 1.1, 1.55, 12.0], [TX + 1.05, 1.5, 11.0], 44, 40, 1],     // which one do they want me to buy?
    [56.3, [TX + 0.6, 1.8, 13.4], [TX + 0.6, 1.6, 10.8], [TX + 1.4, 5.0, 22.0], [TX, 2.8, 9.5], 46, 50],                   // follow
  ],
};
const STARTS = Object.fromEntries(Object.entries(SETUPS).map(([k, v]) => [k, v.map((s) => Math.round(warp(s[0]) * FPS))])) as Record<string, number[]>;
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** setup index and progress at frame f */
export const setupAt = (id: number, f: number) => {
  const list = SETUPS[id], st = STARTS[id];
  let i = 0; while (i + 1 < list.length && f >= st[i + 1]) i++;
  const end = i + 1 < list.length ? st[i + 1] : SHOTS[id - 1].b;
  return { i, u: clamp01((f - st[i]) / Math.max(1, end - st[i])) };
};
/** small camera shakes: the 48 lands, the winner, the alarm */
const SHAKES = [BT.d8, BT.steal, BT.now];
const shake = (f: number) => { for (const a of SHAKES) if (f >= a && f < a + 18) return 0.04 * Math.sin(f * 2.3) * (1 - (f - a) / 18); return 0; };
export const camAt = (id: number, f: number): Cam => {
  const { i, u } = setupAt(id, f), s = SETUPS[id][i];
  const k = s[7] === 1 ? easeOut(u * 1.15) : smooth(u) * 0.85 + u * 0.15;
  const base: V3 = SHOTS[id - 1].place === "store" ? STORE : [0, 0, 0];
  const sh = shake(f);
  return { pos: add(base, add(lerp3(s[1], s[3], k), [sh, sh * 0.7, 0])), look: add(base, lerp3(s[2], s[4], k)), fov: s[5] + (s[6] - s[5]) * k, roll: 0 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [{ f: 0, cInf: 2.5 }];
export const dofAt = (f: number) => {
  const sh = shotAt(f), { i } = setupAt(sh.id, f);
  const s = SETUPS[sh.id][i], dist = Math.hypot(s[1][0] - s[2][0], s[1][1] - s[2][1], s[1][2] - s[2][2]);
  return { cInf: dist > 25 ? 0.6 : dist < 3.5 ? 4 : 2.5, focus: undefined as undefined | ((f: number) => V3) };
};
export const grayAt = (_id: number) => 0;
export const ceilingOff = (_id: number, _f: number) => false;
export const D0 = 0;
