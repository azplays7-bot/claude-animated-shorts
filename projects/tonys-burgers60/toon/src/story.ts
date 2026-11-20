// Timeline of "Cheap to make, hard to sell" (Tony's Burgers) (Pisa engine, fast-cut style).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Pacing: a new camera setup every ~1.5 s, every setup moves, a gag every 3-5 s, information on signs in the world.
// Look: Tony's bright green dining room (cost tags, the bitten $10 bill, the franchise contract, the empty room),
// the sunny street (Tony's little shop, the famous BLAZE BURGER chain with its line), golden hour for the ending.
import WORDS from "./words.json";
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
/** narration beats (frames) */
export const BT = {
  burger: w("BURGER"), cost3: w("$3"), sells: w("SELLS"), price10: w("$10"), soda: w("SODA"), c30: w("30"), soda3: w("$3", 1),
  easy: w("EASY"), money: w("MONEY"), not: w("NOT"), fast: w("FAST"),
  meet: w("MEET"), opened: w("OPENED"), tonys: w("TONYS"), every10: w("$10", 1), rent: w("RENT"), bite: w("BITE"), staff: w("STAFF"),
  power: w("POWER"), gas: w("GAS"), repairs: w("REPAIRS"), keeps: w("KEEPS"), one: w("$1"),
  why: w("WHY"), famous: w("FAMOUS"), opening: w("OPENING"), franchise: w("FRANCHISE"), cost: w("COST"), million: w("$1MILLION"),
  plus: w("PLUS"), cut: w("CUT"), single: w("SINGLE"), sale: w("SALE"),
  keeps2: w("KEEPS", 1), own: w("OWN"), nobody: w("NOBODY"), street: w("STREET"), chain: w("CHAIN"), line: w("LINE"), door: w("DOOR"),
  dining: w("DINING"), empty: w("EMPTY"), flyers: w("FLYERS"), videos: w("VIDEOS"), samples: w("SAMPLES"),
  oneIn4: w("1IN4"), close: w("CLOSE"), change: w("CHANGE"), first: w("FIRST"),
  making: w("MAKING"), cheap: w("CHEAP"), pick: w("PICK"), hard: w("HARD"), wins: w("WINS"), happy: w("HAPPY"), time: w("TIME"),
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
/** where the bitten $10 bill floats (store-relative), the burger / soda on the counter */
export const BILL: V3 = [-1.5, 2.25, -3.25];
export const BURGER_AT: V3 = [-2.6, 1.22, -3.72];
export const SODA_AT: V3 = [-0.6, 1.3, -3.72];

// ---------------- shots (place + light) ----------------
export type Light = "day" | "golden";
export type Place = "street" | "store";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; gray?: boolean };
const T = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(11.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },            // hook: $3 -> $10, 30c -> $3, easy money? not so fast
  { id: 2, a: T(11.5), b: T(14.35), light: "day", place: "street", sunAz: 120, sunEl: 40 },    // meet Tony: grand opening
  { id: 3, a: T(14.35), b: T(22.25), light: "day", place: "store", sunAz: 140, sunEl: 78 },    // the $10 bill gets eaten
  { id: 4, a: T(22.25), b: T(24.6), light: "day", place: "street", sunAz: 120, sunEl: 40 },    // why not a famous name?
  { id: 5, a: T(24.6), b: T(32.75), light: "day", place: "store", sunAz: 140, sunEl: 78 },     // the franchise contract, the cut of every sale
  { id: 6, a: T(32.75), b: T(37.6), light: "day", place: "street", sunAz: 120, sunEl: 40 },    // nobody knows; the chain's line
  { id: 7, a: T(37.6), b: T(39.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },      // the empty dining room
  { id: 8, a: T(39.5), b: T(47.65), light: "day", place: "street", sunAz: 110, sunEl: 34 },    // flyers, videos, samples; 1 in 4 close
  { id: 9, a: T(47.65), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 26 },   // golden hour: one happy customer at a time
];
export const XFADE: Record<number, number> = { 2: 8, 4: 6, 6: 8, 8: 8, 9: 12 };
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
const TD = TONY_DOOR;
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [-2.6, 1.5, -2.0], [-2.6, 1.36, -3.75], [-2.6, 1.48, -2.25], [-2.6, 1.36, -3.75], 40, 36],          // this burger: $3
    [2.95, [-3.2, 1.55, -2.1], [-2.6, 1.4, -3.75], [-3.0, 1.52, -2.3], [-2.6, 1.4, -3.75], 44, 40, 1],         // sells for $10 (ka-ching)
    [4.25, [-0.6, 1.52, -2.0], [-0.6, 1.4, -3.75], [-0.6, 1.5, -2.25], [-0.6, 1.4, -3.75], 40, 36],         // this soda: 30c
    [6.15, [0.1, 1.58, -2.1], [-0.6, 1.42, -3.75], [-0.1, 1.55, -2.3], [-0.6, 1.42, -3.75], 44, 40, 1],       // sells for $3
    [7.65, [-1.5, 1.7, 0.2], [-1.5, 1.6, -4.4], [-1.5, 1.7, -0.6], [-1.5, 1.65, -4.4], 50, 46],                // easy money? (cash rain)
    [10.1, [-1.5, 1.78, -2.5], [-1.5, 1.72, -4.6], [-1.5, 1.76, -2.75], [-1.5, 1.72, -4.6], 40, 34, 1],          // not so fast!
  ],
  2: [
    [11.5, [TD + 0.5, 1.8, 18.0], [TD, 2.2, 9.5], [TD + 0.2, 1.9, 16.8], [TD, 2.2, 9.5], 52, 48],               // meet Tony: grand opening
    [12.95, [TD - 1.6, 0.9, 13.6], [TD, 4.6, 9.2], [TD - 1.2, 1.1, 13.0], [TD, 4.7, 9.2], 56, 52, 1],           // TONY'S BURGERS (worm's eye)
  ],
  3: [
    [14.35, [-1.5, 1.9, 1.0], [-1.5, 1.95, -3.6], [-1.5, 1.95, 0.2], [-1.5, 2.0, -3.6], 46, 44],               // out of every $10...
    [15.65, [2.0, 1.75, 0.3], [-0.6, 1.8, -3.3], [1.7, 1.75, -0.1], [-0.6, 1.8, -3.3], 48, 44, 1],          // RENT takes a bite
    [16.85, [-3.3, 1.85, -1.1], [-2.4, 1.85, -3.6], [-3.5, 1.85, -1.5], [-2.4, 1.85, -3.6], 46, 42, 1],        // then STAFF
    [17.75, [-1.5, 2.25, -0.4], [-1.5, 2.2, -3.3], [-1.5, 2.25, -0.8], [-1.5, 2.2, -3.3], 46, 42],             // power, gas, repairs
    [19.75, [-1.5, 1.75, -2.35], [-1.5, 1.65, -4.6], [-1.5, 1.72, -2.65], [-1.5, 1.65, -4.6], 42, 38, 1],      // Tony keeps less than $1
  ],
  4: [
    [22.25, [TD - 1.3, 1.7, 12.3], [TD - 1.3, 1.6, 10.6], [TD - 1.3, 1.7, 12.1], [TD - 1.3, 1.6, 10.6], 56, 52],  // why not...
    [23.35, [TD + 1.5, 1.9, 16.2], [12, 8.6, 6.5], [TD + 0.5, 1.9, 15.8], [12, 9.0, 6.5], 40, 34],              // ...a famous name? (over the shoulder)
  ],
  5: [
    [24.6, [-0.9, 1.5, 4.7], [-0.9, 1.1, 0.9], [-0.9, 1.5, 4.1], [-0.9, 1.1, 0.9], 48, 44],                    // the franchise guy at the table
    [25.65, [-1.5, 1.55, 2.35], [-1.5, 1.05, 1.05], [-1.5, 1.5, 2.1], [-1.5, 1.05, 1.05], 40, 36],              // FRANCHISE AGREEMENT
    [26.75, [0.6, 1.8, 3.9], [-0.7, 1.7, 1.5], [0.4, 1.8, 3.5], [-0.7, 1.7, 1.5], 44, 40, 1],               // over a million dollars!
    [28.25, [-3.5, 1.9, 2.2], [-3.5, 1.45, -3.0], [-3.5, 1.9, 1.6], [-3.5, 1.45, -3.0], 56, 52],               // plus a cut...
    [29.75, [-6.0, 1.6, -0.9], [-3.0, 1.45, -3.0], [-5.7, 1.6, -1.3], [-3.0, 1.45, -3.0], 46, 42, 1],          // ...of every single sale
    [31.15, [-0.9, 1.55, 4.3], [-0.9, 1.25, 0.9], [-0.9, 1.55, 3.6], [-0.9, 1.25, 0.9], 46, 42, 1],            // Tony keeps his own name (rip!)
  ],
  6: [
    [32.75, [TD - 3.5, 1.6, 15.8], [TD - 0.5, 1.9, 10.0], [TD - 2.5, 1.6, 15.4], [TD, 1.9, 10.0], 46, 44],      // nobody knows it
    [34.25, [TD + 1.5, 2.2, 12.6], [6, 1.9, 10.2], [TD - 1.5, 2.6, 12.6], [6, 1.9, 10.2], 34, 32],               // down the street...
    [35.7, [10.5, 1.6, 15.0], [7.5, 1.4, 10.3], [7.5, 1.6, 15.0], [4.5, 1.4, 10.3], 46, 46],                           // ...a line out the door
  ],
  7: [
    [37.6, [6.2, 2.9, 8.2], [-2, 0.8, 0.8], [5.6, 2.7, 7.6], [-2, 0.8, 0.8], 58, 56],                           // the dining room: empty
    [38.6, [-1.5, 1.62, -2.3], [-1.5, 1.55, -4.6], [-1.5, 1.6, -2.55], [-1.5, 1.55, -4.6], 42, 38],             // Tony, bored
  ],
  8: [
    [39.5, [TD - 4.0, 1.6, 14.0], [TD - 1.3, 1.4, 11.0], [TD - 3.4, 1.6, 13.6], [TD - 1.3, 1.4, 11.0], 46, 42],  // flyers
    [40.8, [TD - 1.3, 1.72, 12.25], [TD - 1.3, 1.68, 10.9], [TD - 1.3, 1.7, 12.05], [TD - 1.3, 1.68, 10.9], 50, 46, 1], // posts videos
    [41.7, [TD + 1.4, 1.5, 13.9], [TD - 1.0, 1.3, 11.0], [TD + 0.9, 1.5, 13.4], [TD - 1.0, 1.3, 11.0], 46, 42],  // free samples
    [43.1, [22.0, 2.0, 17.4], [22.0, 3.2, 9], [22.0, 2.4, 18.2], [22.0, 3.4, 9], 50, 50],                        // 1 in 4 close...
    [46.1, [TD - 1.3, 1.72, 12.3], [TD - 1.3, 1.65, 10.9], [TD - 1.3, 1.7, 12.1], [TD - 1.3, 1.65, 10.9], 54, 50, 1], // Tony gulps
  ],
  9: [
    [47.65, [TD - 1.3, 1.6, 12.35], [TD - 1.3, 1.5, 10.9], [TD - 1.3, 1.6, 12.1], [TD - 1.3, 1.5, 10.9], 58, 54],   // making food is cheap
    [48.95, [TD - 7, 2.0, 17.0], [TD - 0.5, 1.5, 10.5], [TD - 5, 2.0, 16.5], [TD, 1.5, 10.5], 48, 46],             // getting people to pick it: the hard part
    [51.85, [TD + 1.8, 1.6, 14.6], [TD - 0.4, 1.35, 11.0], [TD + 1.3, 1.6, 14.1], [TD - 0.4, 1.35, 11.0], 44, 40],    // one tries a sample: WOW
    [53.3, [TD + 0.5, 1.5, 16.0], [TD + 1.5, 1.5, 10.2], [TD + 2.5, 5.5, 24.0], [TD + 0.5, 2.4, 9.5], 44, 50],             // a line starts: crane out
  ],
};
const STARTS = Object.fromEntries(Object.entries(SETUPS).map(([k, v]) => [k, v.map((s) => Math.round(s[0] * FPS))])) as Record<string, number[]>;
const lerp3 = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** setup index and progress at frame f */
export const setupAt = (id: number, f: number) => {
  const list = SETUPS[id], st = STARTS[id];
  let i = 0; while (i + 1 < list.length && f >= st[i + 1]) i++;
  const end = i + 1 < list.length ? st[i + 1] : SHOTS[id - 1].b;
  return { i, u: clamp01((f - st[i]) / Math.max(1, end - st[i])) };
};
/** small camera shakes: "not so fast", the million-dollar price, the contract rip */
const SHAKES = [BT.not, BT.million, BT.keeps2];
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
