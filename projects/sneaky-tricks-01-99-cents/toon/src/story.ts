// Timeline of "Sneaky Business Tricks #1: why prices end in .99" (Pisa engine, fast-cut style, Tony's world).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Pacing: a new camera setup every ~1.5 s, every setup moves, a gag every 3-5 s, information on signs in the world.
// Look: Tony's bright dining room (the $4.99 flip, the left-digit tag, the brain scale), the sunny street (the catalog
// study board, the whispering 9), the same room in sepia (1880: the register legend), golden hour at the fancy
// MAISON D'OR next door (round prices, the $ sign flies off: part two), back to Tony's door for the question.
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
  isnt: w("ISNT"), five: w("$5"), brain: w("BRAIN"), four: w("$4"), read: w("READ"), left: w("LEFT"), right: w("RIGHT"), first: w("FIRST"), wins: w("WINS"),
  so: w("SO"), feels4: w("$4", 1), five2: w("$5", 1), feels5: w("$5", 2), cent: w("1"), cheaper: w("CHEAPER"),
  head: w("HEAD"), whole: w("WHOLE"), dollar: w("DOLLAR"),
  catalog: w("CATALOG"), dress: w("DRESS"), d34: w("$34"), d39: w("$39"), d44: w("$44"), d39b: w("$39", 1), best: w("BEST"), even: w("EVEN"),
  why: w("WHY"), nine: w("9"), whisper: w("WHISPER"), deal: w("DEAL"),
  where: w("WHERE"), start: w("START"), nobody: w("NOBODY"), popular: w("POPULAR"), owners: w("OWNERS"), open: w("OPEN"), register: w("REGISTER"),
  change: w("CHANGE"), pocket: w("POCKET"), cash: w("CASH"), c99: w("99", 1), newspaper: w("NEWSPAPER"), y1880: w("1880"),
  fancy: w("FANCY"), opposite: w("OPPOSITE"), round: w("ROUND"), nines: w("NINES"), bargain: w("BARGAIN"), drop: w("DROP"), sign: w("SIGN"),
  part: w("PART"), two: w("TWO"), next: w("NEXT"), nine2: w("9", 1), ask: w("ASK"), deal2: w("DEAL", 1), just: w("JUST"),
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
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; gray?: boolean; sepia?: boolean };
const T = (s: number) => Math.round(warp(s) * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(7.4), light: "day", place: "store", sunAz: 140, sunEl: 78 },                 // hook: $5.00 -> $4.99, the brain reads 4
  { id: 2, a: T(7.4), b: T(14.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },           // the brain scale: 1 cent = a whole dollar
  { id: 3, a: T(14.5), b: T(27.4), light: "day", place: "street", sunAz: 120, sunEl: 40 },         // the catalog test; the 9 whispers DEAL
  { id: 4, a: T(27.4), b: T(41.2), light: "day", place: "store", sunAz: 140, sunEl: 78, sepia: true }, // 1880: the register legend
  { id: 5, a: T(41.2), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 24 },        // MAISON D'OR: round prices; is it a deal?
];
export const XFADE: Record<number, number> = { 3: 8, 4: 10, 5: 12 };
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
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [-4.6, 2.8, -0.6], [-4.6, 2.8, -4.05], [-4.6, 2.8, -1.0], [-4.6, 2.8, -4.05], 44, 40],               // the menu: $5.00 -> $4.99
    [2.15, [-2.0, 1.6, 0.6], [-2.6, 1.9, -3.0], [-2.1, 1.6, 0.1], [-2.6, 1.9, -3.0], 46, 42, 1],              // your brain thinks it's $4
    [3.95, [-2.4, 2.2, -0.6], [-2.4, 2.25, -3.2], [-2.4, 2.2, -1.0], [-2.4, 2.25, -3.2], 44, 40],             // left to right: the first digit wins
  ],
  2: [
    [7.4, [-1.5, 1.95, 0.0], [-1.5, 1.95, -3.0], [-1.5, 1.95, -0.5], [-1.5, 1.95, -3.0], 44, 40],             // the brain scale: $4.99 feels like $4
    [11.4, [-1.5, 1.95, -1.0], [-1.5, 1.95, -3.0], [-1.5, 1.95, -1.3], [-1.5, 1.95, -3.0], 42, 38, 1],          // one cent cheaper
    [12.55, [-2.4, 1.72, -1.35], [-2.4, 1.68, -2.6], [-2.4, 1.72, -1.6], [-2.4, 1.68, -2.6], 46, 42, 1],       // in your head: a whole dollar
  ],
  3: [
    [14.5, [TD - 1, 1.8, 16.5], [TD - 1, 2.2, 10], [TD - 1, 1.9, 15.8], [TD - 1, 2.2, 10], 50, 46],              // a famous catalog test
    [16.65, [TD - 1, 2.55, 14.1], [TD - 1, 2.6, 10.3], [TD - 1, 2.55, 13.8], [TD - 1, 2.6, 10.3], 44, 42],        // the same dress: $34, $39, $44
    [20.65, [TD - 1.6, 2.4, 13.6], [TD - 1, 2.6, 10.3], [TD - 0.4, 2.4, 13.6], [TD - 1, 2.6, 10.3], 44, 44],       // sales bars grow
    [22.3, [TD - 1, 2.7, 12.5], [TD - 1, 2.7, 10.3], [TD - 1, 2.7, 12.3], [TD - 1, 2.7, 10.3], 44, 40, 1],        // $39 sold best!
    [23.25, [TD + 0.6, 1.72, 13.0], [TD + 0.6, 1.66, 11.3], [TD + 0.6, 1.72, 12.8], [TD + 0.6, 1.66, 11.3], 48, 44], // better than the cheaper one?!
    [24.95, [TD + 0.5, 1.74, 12.8], [TD + 0.5, 1.72, 11.3], [TD + 0.5, 1.74, 12.6], [TD + 0.5, 1.72, 11.3], 48, 44, 1], // the 9 whispers: deal
  ],
  4: [
    [27.4, [5.6, 2.6, 7.4], [-2.5, 1.3, -2.5], [5.0, 2.5, 6.8], [-2.5, 1.3, -2.5], 56, 54],                       // 1880: where did 99 start?
    [29.55, [-3.2, 1.75, 0.2], [-4.0, 1.5, -3.5], [-3.5, 1.75, -0.3], [-4.0, 1.5, -3.5], 48, 46],                 // nobody knows for sure
    [30.95, [-5.6, 1.7, -1.2], [-4.3, 1.45, -3.6], [-5.3, 1.7, -1.5], [-4.3, 1.45, -3.6], 46, 44],                // one popular story
    [33.6, [-4.0, 1.6, -2.1], [-4.5, 1.25, -3.9], [-4.1, 1.55, -2.4], [-4.5, 1.25, -3.9], 44, 40, 1],             // open the register, make change
    [35.15, [-3.9, 1.75, -0.6], [-3.9, 1.6, -4.4], [-3.9, 1.75, -1.0], [-3.9, 1.6, -4.4], 50, 46],                // ...so they couldn't pocket the cash
    [37.25, [-1.5, 2.0, 0.4], [-1.5, 2.0, -2.0], [-1.5, 2.0, 0.1], [-1.5, 2.0, -2.0], 44, 40],                    // 99c in the newspaper, 1880
  ],
  5: [
    [41.2, [21.6, 1.8, 17.0], [22.4, 2.2, 9.2], [21.0, 1.9, 16.4], [22.4, 2.2, 9.2], 50, 46],                     // fancy places do the opposite
    [43.6, [24.6, 1.2, 12.0], [24.6, 1.0, 10.2], [24.6, 1.2, 11.7], [24.6, 1.0, 10.2], 44, 40, 1],               // round prices, no nines
    [45.45, [21.2, 1.75, 12.4], [21.2, 1.7, 10.4], [21.2, 1.75, 12.1], [21.2, 1.7, 10.4], 46, 42],               // nothing that says bargain
    [46.95, [24.6, 1.25, 12.2], [24.6, 1.05, 10.2], [24.6, 1.4, 12.6], [24.6, 1.3, 10.2], 44, 46, 1],            // the $ sign flies off: part two
    [50.45, [TX + 0.6, 1.65, 13.4], [TX + 0.6, 1.55, 10.9], [TX + 0.6, 1.65, 13.0], [TX + 0.6, 1.55, 10.9], 48, 44], // next time you see a 9...
    [53.0, [TX + 1.2, 1.7, 12.6], [TX + 1.0, 1.65, 11.0], [TX + 1.2, 1.7, 12.4], [TX + 1.0, 1.65, 11.0], 46, 42, 1], // a deal, or just a 9?
    [55.0, [TX + 0.6, 1.8, 13.4], [TX + 0.6, 1.6, 10.8], [TX + 1.4, 5.0, 22.0], [TX, 2.8, 9.5], 46, 50],          // follow for part 2
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
/** small camera shakes: the price flip, $39 wins, the $ sign flies */
const SHAKES = [BT.five, BT.best, BT.drop];
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
