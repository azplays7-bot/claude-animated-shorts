// Timeline of "Sneaky Business Tricks #4: why stores play slow music" (Pisa engine, fast-cut style, Tony's world).
// Look: Tony's room with the ceiling speaker (slow music = slow steps), the sunny street with the supermarket study board
// (9 weeks, +38 %), a fast-music dash, Tony's tables (+10 min, more drinks), MAISON D'OR's wine shelf (French vs German),
// Tony tries slow jazz (it depends on the song), golden hour at Tony's door (part five: the popcorn trap).
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
  slow: w("SLOW"), calm: w("CALM"), nice: w("NICE"), change: w("CHANGE"), walk: w("WALK"),
  famous: w("FAMOUS"), supermarket: w("SUPERMARKET"), slow2: w("SLOW", 1), fast2: w("FAST", 1), weeks: w("9WEEKS"), slow3: w("SLOW", 2), slower: w("SLOWER"),
  sales: w("SALES"), p38: w("38"), fast3: w("FAST", 2), opposite: w("OPPOSITE"), along: w("ALONG"),
  restaurants: w("RESTAURANTS"), kept: w("KEPT"), min10: w("10MIN"), longer: w("LONGER"), drinks: w("DRINKS"),
  weirder: w("WEIRDER"), french: w("FRENCH"), accordion: w("ACCORDION"), french2: w("FRENCH", 1), outsold: w("OUTSOLD"),
  german2: w("GERMAN", 1), german3: w("GERMAN", 2), sold: w("SOLD"), most: w("MOST"), mattered: w("MATTERED"),
  tony: w("TONY"), jazz: w("JAZZ"), careful: w("CAREFUL"), depends: w("DEPENDS"), song: w("SONG"), store3: w("STORE", 2), vary: w("VARY"),
  next: w("NEXT"), popcorn: w("POPCORN"), trap: w("TRAP"), part: w("PART"), until: w("UNTIL"), pace: w("PACE"), cart: w("CART"),
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
  { id: 1, a: 0, b: T(6.3), light: "day", place: "store", sunAz: 140, sunEl: 78 },                // the speaker: slow music, slow steps
  { id: 2, a: T(6.3), b: T(20.1), light: "day", place: "street", sunAz: 120, sunEl: 40 },         // the supermarket study: +38 %; fast music
  { id: 3, a: T(20.1), b: T(27.6), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // restaurants: +10 min, more drinks
  { id: 4, a: T(27.6), b: T(39.45), light: "golden", place: "street", sunAz: 160, sunEl: 24 },    // the wine shelf: French vs German
  { id: 5, a: T(39.45), b: T(47.0), light: "day", place: "store", sunAz: 140, sunEl: 78 },        // Tony's slow jazz: it depends
  { id: 6, a: T(47.0), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 24 },       // part five: the popcorn trap
];
export const XFADE: Record<number, number> = { 2: 8, 4: 10, 6: 12 };
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
    [0.0, [-5.2, 2.6, 4.0], [-6.9, 3.0, 2.2], [-5.4, 2.65, 3.7], [-6.9, 3.0, 2.2], 46, 42],                           // stores play slow music
    [2.6, [-3.0, 1.7, 4.8], [-3.0, 1.6, 2.2], [-3.0, 1.7, 4.5], [-3.0, 1.6, 2.2], 46, 42, 1],                          // not just to be nice
    [4.3, [2.8, 1.6, 7.6], [-1.5, 1.0, 3.2], [2.4, 1.6, 7.2], [-1.0, 1.0, 3.2], 50, 48],                               // how fast you walk
  ],
  2: [
    [6.3, [TD - 1, 1.8, 16.5], [TD - 1, 2.2, 10], [TD - 1, 1.9, 15.8], [TD - 1, 2.2, 10], 50, 46],                    // a famous study
    [8.2, [TD - 1, 2.55, 14.1], [TD - 1, 2.6, 10.3], [TD - 1, 2.55, 13.8], [TD - 1, 2.6, 10.3], 44, 42],               // slow vs fast, 9 weeks
    [11.6, [TD - 4.0, 1.4, 15.6], [TD - 1.5, 1.0, 11.8], [TD - 3.4, 1.4, 15.6], [TD - 0.9, 1.0, 11.8], 50, 48],        // shoppers walked slower
    [14.9, [TD - 1, 2.7, 12.5], [TD - 1, 2.7, 10.3], [TD - 1, 2.7, 12.3], [TD - 1, 2.7, 10.3], 44, 40, 1],             // sales +38 %
    [17.1, [TD + 2.5, 1.5, 16.6], [TD - 1, 1.0, 11.8], [TD + 2.2, 1.5, 16.2], [TD - 1, 1.0, 11.8], 52, 50],            // fast music moved people along
  ],
  3: [
    [20.1, [5.6, 2.6, 7.4], [-2.5, 1.3, 1.5], [5.0, 2.5, 6.8], [-2.5, 1.3, 1.5], 56, 54],                              // restaurants too
    [22.3, [-3.2, 1.55, 3.8], [-5.0, 1.25, 1.0], [-3.4, 1.55, 3.5], [-5.0, 1.25, 1.0], 46, 42],                        // diners stay
    [24.4, [-4.0, 1.75, 3.2], [-5.0, 1.75, 1.0], [-4.1, 1.75, 2.95], [-5.0, 1.75, 1.0], 44, 40, 1],                    // +10 min
    [26.0, [-4.6, 1.3, 2.9], [-5.0, 1.1, 1.0], [-4.65, 1.3, 2.7], [-5.0, 1.1, 1.0], 44, 40, 1],                        // more drinks
  ],
  4: [
    [27.6, [21.6, 1.8, 17.0], [22.6, 2.0, 9.6], [21.2, 1.85, 16.2], [22.6, 2.0, 9.6], 50, 46],                        // it gets weirder
    [29.2, [MS[0], 1.25, 12.4], [MS[0], 1.1, MS[2]], [MS[0], 1.25, 12.1], [MS[0], 1.1, MS[2]], 46, 42, 1],               // French accordion music
    [31.3, [MS[0] - 0.1, 1.1, 12.1], [MS[0] - 0.1, 1.05, MS[2]], [MS[0] - 0.1, 1.1, 11.9], [MS[0] - 0.1, 1.05, MS[2]], 44, 42, 1], // French wine outsold
    [33.5, [MS[0], 1.25, 12.2], [MS[0], 1.1, MS[2]], [MS[0], 1.25, 12.0], [MS[0], 1.1, MS[2]], 46, 42, 1],               // then German music
    [35.0, [MS[0] + 0.1, 1.1, 12.1], [MS[0] + 0.1, 1.05, MS[2]], [MS[0] + 0.1, 1.1, 11.9], [MS[0] + 0.1, 1.05, MS[2]], 44, 42, 1], // German wine sold more
    [36.9, [MX0 - 0.2, 1.72, 12.6], [MX0, 1.66, MZ0], [MX0 - 0.2, 1.72, 12.4], [MX0, 1.66, MZ0], 48, 44],                // didn't think it mattered
  ],
  5: [
    [39.45, [-4.6, 1.75, -2.2], [-4.9, 1.65, -4.45], [-4.65, 1.75, -2.4], [-4.9, 1.65, -4.45], 46, 42],                 // Tony tried slow jazz
    [41.4, [-5.2, 2.6, 4.0], [-6.9, 3.0, 2.2], [-5.4, 2.65, 3.7], [-6.9, 3.0, 2.2], 46, 42, 1],                          // careful: it depends on the song
    [43.8, [-2.0, 1.6, 0.4], [-2.4, 1.6, -2.6], [-2.05, 1.6, 0.0], [-2.4, 1.6, -2.6], 46, 42, 1],                        // the song (Max)
    [44.5, [5.6, 2.6, 7.4], [-2.5, 1.3, -2.5], [5.2, 2.5, 7.0], [-2.5, 1.3, -2.5], 56, 54],                              // one store; results vary
  ],
  6: [
    [47.0, [TX + 0.6, 1.65, 13.4], [TX + 0.6, 1.55, 10.9], [TX + 0.6, 1.65, 13.0], [TX + 0.6, 1.55, 10.9], 48, 44],     // next: the popcorn trap
    [49.7, [TX + 0.6, 2.0, 12.6], [TX + 0.6, 2.0, 10.9], [TX + 0.6, 2.0, 12.4], [TX + 0.6, 2.0, 10.9], 46, 42, 1],       // part five
    [51.0, [TX - 2.5, 1.5, 15.6], [TX, 1.0, 11.8], [TX - 2.1, 1.5, 15.4], [TX + 0.6, 1.0, 11.8], 50, 48],                // if the music is slow...
    [52.8, [TX + 1.2, 1.7, 12.6], [TX + 1.0, 1.65, 11.0], [TX + 1.2, 1.7, 12.4], [TX + 1.0, 1.65, 11.0], 46, 42, 1],      // check your pace and your cart
    [55.0, [TX + 0.6, 1.8, 13.4], [TX + 0.6, 1.6, 10.8], [TX + 1.4, 5.0, 22.0], [TX, 2.8, 9.5], 46, 50],                 // follow for part 5
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
const SHAKES = [BT.p38, BT.outsold, BT.sold];
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
