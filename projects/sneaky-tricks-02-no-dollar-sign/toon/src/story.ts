// Timeline of "Sneaky Business Tricks #2: why fancy menus drop the $ sign" (Pisa engine, fast-cut style, Tony's world).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Look: the sunny street at MAISON D'OR (Steak 48, not $48), Tony's bright dining room (the Cornell three-menu test,
// the small-study note, a menu designer), the same room drained of colour with a red alarm (the pain of paying), colour
// back (no sign, no alarm), Tony drops his own $ signs, golden hour at Tony's door (part three: candy at the checkout).
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
  fancy: w("FANCY"), skip: w("SKIP"), sign: w("SIGN"), steak: w("STEAK"), n48: w("48"), not: w("NOT"), d48: w("$48"), typo: w("TYPO"), trick: w("TRICK"),
  cornell: w("CORNELL"), three: w("THREE"), restaurant: w("RESTAURANT"), cooking: w("COOKING"),
  one1: w("ONE", 0), dsign: w("SIGN", 1), one2: w("ONE", 1), words: w("WORDS"), one3: w("ONE", 2), number: w("NUMBER"), which: w("WHICH"), most: w("MOST"),
  just: w("JUST", 1), number2: w("NUMBER", 1), diners: w("DINERS"), five: w("$5"), more: w("MORE"), spelling: w("SPELLING"), help: w("HELP"),
  small: w("SMALL"), n200: w("200"), but: w("BUT"), designers: w("DESIGNERS"), swear: w("SWEAR"),
  think: w("THINK"), reminds: w("REMINDS"), pain: w("PAIN"), paying: w("PAYING"), tiny: w("TINY"), alarm: w("ALARM"), head: w("HEAD"),
  no: w("NO"), alarm2: w("ALARM", 1), just2: w("JUST", 2), juicy: w("JUICY"), steak2: w("STEAK", 1),
  tony: w("TONY"), tried: w("TRIED"), classic: w("CLASSIC"), n5: w("5"), will: w("WILL"), study: w("STUDY", 1), nobody: w("NOBODY"), sure: w("SURE"),
  next: w("NEXT", 1), candy: w("CANDY"), checkout: w("CHECKOUT"), part: w("PART"), until: w("UNTIL"), menu: w("MENU", 1), hides: w("HIDES"),
  remember: w("REMEMBER"), still: w("STILL"), money: w("MONEY"),
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
  { id: 1, a: 0, b: T(7.6), light: "day", place: "street", sunAz: 120, sunEl: 40 },               // MAISON D'OR: Steak 48, not $48
  { id: 2, a: T(7.6), b: T(31.8), light: "day", place: "store", sunAz: 140, sunEl: 78 },           // the Cornell test; small study; designers
  { id: 3, a: T(31.8), b: T(37.75), light: "day", place: "store", sunAz: 140, sunEl: 78, tense: true }, // the pain of paying: an alarm
  { id: 4, a: T(37.75), b: T(41.35), light: "day", place: "store", sunAz: 140, sunEl: 78 },        // no sign, no alarm: a juicy steak
  { id: 5, a: T(41.35), b: T(47.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // Tony tries it: CLASSIC 5
  { id: 6, a: T(47.5), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 24 },        // part three: candy; it's still your money
];
export const XFADE: Record<number, number> = { 2: 8, 4: 6, 6: 12 };
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
const MS = STAND, MX0 = 25.55, MZ0 = 11.0;   // the MAISON menu stand; Max beside it
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [21.6, 1.8, 17.0], [22.6, 2.0, 9.6], [21.2, 1.85, 16.2], [22.6, 2.0, 9.6], 50, 46],                       // fancy menus...
    [1.75, [MS[0], 1.25, 12.2], [MS[0], 1.1, MS[2]], [MS[0], 1.25, 11.9], [MS[0], 1.1, MS[2]], 44, 40, 1],              // skip the dollar sign
    [2.95, [MS[0] + 0.15, 1.15, 11.3], [MS[0] + 0.15, 1.0, MS[2]], [MS[0] + 0.15, 1.15, 11.1], [MS[0] + 0.15, 1.0, MS[2]], 44, 40, 1], // Steak 48
    [3.95, [MX0 - 0.2, 1.72, 12.6], [MX0, 1.66, MZ0], [MX0 - 0.2, 1.72, 12.4], [MX0, 1.66, MZ0], 48, 44],              // not $48?
    [5.5, [21.2, 1.75, 12.4], [21.2, 1.7, 10.4], [21.2, 1.75, 12.15], [21.2, 1.7, 10.4], 46, 42],                       // not a typo
    [6.7, [21.6, 1.75, 11.8], [21.25, 1.72, 10.4], [21.5, 1.75, 11.6], [21.25, 1.72, 10.4], 42, 38, 1],                 // it's a trick (wink)
  ],
  2: [
    [7.6, [5.6, 2.6, 7.4], [-2.5, 1.3, -2.5], [5.0, 2.5, 6.8], [-2.5, 1.3, -2.5], 56, 54],                              // Cornell tested three menus
    [10.3, [-4.6, 1.8, -1.5], [-4.9, 1.55, -4.4], [-4.7, 1.8, -1.8], [-4.9, 1.55, -4.4], 46, 44],                         // a cooking school (the chef)
    [12.45, [-1.5, 1.95, 0.0], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.4], [-1.5, 1.95, -3.0], 44, 40],                       // $48.00
    [14.75, [-1.5, 1.95, -0.8], [-1.5, 1.95, -3.0], [-1.5, 1.95, -1.0], [-1.5, 1.95, -3.0], 40, 38, 1],                   // forty-eight dollars
    [16.35, [-1.0, 1.9, -0.9], [-1.1, 1.9, -3.0], [-1.0, 1.9, -1.1], [-1.1, 1.9, -3.0], 42, 40, 1],                       // 48
    [17.9, [-2.0, 1.6, 0.6], [-2.6, 1.85, -3.0], [-2.1, 1.6, 0.1], [-2.6, 1.85, -3.0], 46, 42],                           // which one? (Max)
    [20.2, [-1.5, 1.95, 0.2], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.2], [-1.5, 1.95, -3.0], 44, 42, 1],                     // just the number! bars grow
    [23.5, [-1.9, 1.95, -0.9], [-1.9, 1.95, -3.0], [-1.85, 1.95, -1.1], [-1.9, 1.95, -3.0], 42, 40, 1],                   // words? no help
    [26.1, [0.6, 2.2, 1.6], [-1.5, 1.9, -2.6], [0.3, 2.15, 1.1], [-1.5, 1.9, -2.6], 50, 46],                              // a small study, ~200 diners
    [28.9, [-3.0, 1.55, 3.9], [-5.0, 1.3, 1.0], [-3.2, 1.55, 3.6], [-5.0, 1.3, 1.0], 46, 42],                             // menu designers swear by it
  ],
  3: [
    [31.8, [-2.3, 1.65, 0.0], [-2.3, 1.6, -2.6], [-2.3, 1.65, -0.3], [-2.3, 1.6, -2.6], 46, 42],                         // the dollar sign reminds you
    [33.65, [-2.35, 1.25, -0.9], [-2.35, 1.15, -2.3], [-2.35, 1.25, -1.1], [-2.35, 1.15, -2.3], 46, 42, 1],                   // ...of the pain of paying
    [35.75, [-2.4, 1.78, 0.2], [-2.4, 1.75, -2.6], [-2.4, 1.78, -0.05], [-2.4, 1.75, -2.6], 48, 46, 1],                       // a tiny alarm in your head
  ],
  4: [
    [37.75, [-2.4, 1.78, 0.0], [-2.4, 1.72, -2.6], [-2.4, 1.78, -0.25], [-2.4, 1.72, -2.6], 48, 44],                        // no sign, no alarm
    [39.25, [-2.35, 1.45, -0.4], [-2.35, 1.35, -2.5], [-2.35, 1.45, -0.6], [-2.35, 1.35, -2.5], 48, 44, 1],                       // a juicy steak
  ],
  5: [
    [41.35, [-4.6, 2.8, -0.6], [-4.6, 2.8, -4.05], [-4.6, 2.8, -1.0], [-4.6, 2.8, -4.05], 44, 40],                        // Tony tried it: CLASSIC 5
    [43.0, [-4.6, 1.75, -2.2], [-4.9, 1.65, -4.45], [-4.65, 1.75, -2.4], [-4.9, 1.65, -4.45], 46, 42, 1],                  // Tony grins
    [43.95, [-2.0, 1.6, 0.4], [-2.4, 1.6, -2.6], [-2.05, 1.6, 0.0], [-2.4, 1.6, -2.6], 46, 42],                            // will it work? one study
    [45.7, [5.6, 2.6, 7.4], [-2.5, 1.3, -2.5], [5.2, 2.5, 7.0], [-2.5, 1.3, -2.5], 56, 54],                                // nobody knows for sure
  ],
  6: [
    [47.5, [TX + 0.6, 1.65, 13.4], [TX + 0.6, 1.55, 10.9], [TX + 0.6, 1.65, 13.0], [TX + 0.6, 1.55, 10.9], 48, 44],       // next time: candy at the checkout
    [50.35, [TX + 0.6, 2.0, 12.6], [TX + 0.6, 2.0, 10.9], [TX + 0.6, 2.0, 12.4], [TX + 0.6, 2.0, 10.9], 46, 42, 1],         // part three
    [51.6, [MS[0], 1.25, 12.2], [MS[0], 1.05, MS[2]], [MS[0], 1.35, 12.5], [MS[0], 1.2, MS[2]], 44, 46],                     // a menu hides the dollar sign
    [54.1, [TX + 1.2, 1.7, 12.6], [TX + 1.0, 1.65, 11.0], [TX + 1.2, 1.7, 12.4], [TX + 1.0, 1.65, 11.0], 46, 42, 1],         // it's still your money
    [56.0, [TX + 0.6, 1.8, 13.4], [TX + 0.6, 1.6, 10.8], [TX + 1.4, 5.0, 22.0], [TX, 2.8, 9.5], 46, 50],                     // follow for part 3
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
const SHAKES = [BT.n48, BT.just, BT.alarm];
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
