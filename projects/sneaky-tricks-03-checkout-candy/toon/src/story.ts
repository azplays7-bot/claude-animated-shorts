// Timeline of "Sneaky Business Tricks #3: why the candy is at the checkout" (Pisa engine, fast-cut style, Tony's world).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Look: Tony's counter with a candy rack (prime real estate), the queue (bored, eye level, a kid's eye level), the sunny
// street with the UK study board (-17 %, 70 % unhealthy), a self-checkout kiosk, Tony's fruit bowl vs cookie jar, golden
// hour at Tony's door (part four: slow music).
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
  candy: w("CANDY"), register: w("REGISTER"), accident: w("ACCIDENT"), companies: w("COMPANIES"), prime: w("PRIME"), estate: w("ESTATE"),
  everyone: w("EVERYONE"), pay: w("PAY"), wait: w("WAIT"), line: w("LINE"), nothing: w("NOTHING"), bored: w("BORED"), chocolate: w("CHOCOLATE"),
  eye: w("EYE"), kids: w("KIDS"), too: w("TOO"),
  british: w("BRITISH"), away: w("AWAY"), less: w("LESS"), p17: w("17"), fewer: w("FEWER"), year: w("YEAR"), study: w("STUDY"), p70: w("70"), unhealthy: w("UNHEALTHY"),
  twist: w("TWIST"), survey: w("SURVEY"), impulse: w("IMPULSE"), self: w("SELFCHECKOUT"), scanning: w("SCANNING"), chocolate3: w("CHOCOLATE", 1),
  tony: w("TONY"), fruit: w("FRUIT"), nobody: w("NOBODY"), cookie: w("COOKIE"), gone: w("GONE"), lunch: w("LUNCH"),
  next: w("NEXT", 1), slow: w("SLOW"), music: w("MUSIC"), part: w("PART"), until: w("UNTIL"), stuck: w("STUCK"), candy3: w("CANDY", 2), you: w("YOU", 1),
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
  { id: 1, a: 0, b: T(7.85), light: "day", place: "store", sunAz: 140, sunEl: 78 },               // the candy rack by the register
  { id: 2, a: T(7.85), b: T(18.3), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // the queue: bored, eye level, kid level
  { id: 3, a: T(18.3), b: T(33.5), light: "day", place: "street", sunAz: 120, sunEl: 40 },        // the UK study board: -17 %, 70 % unhealthy
  { id: 4, a: T(33.5), b: T(41.5), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // self-checkout: busy scanning
  { id: 5, a: T(41.5), b: T(48.0), light: "day", place: "store", sunAz: 140, sunEl: 78 },         // fruit bowl vs cookie jar
  { id: 6, a: T(48.0), b: TOTAL, light: "golden", place: "street", sunAz: 160, sunEl: 24 },       // part four: slow music; it's there for you
];
export const XFADE: Record<number, number> = { 3: 8, 4: 8, 6: 12 };
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
const RK: V3 = [-3.55, 1.0, -3.2];   // the candy rack on the counter front
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [-3.55, 1.25, -1.3], [-3.55, 1.0, -3.2], [-3.55, 1.25, -1.6], [-3.55, 1.0, -3.2], 46, 42],                    // the candy...
    [1.9, [-3.4, 1.6, -0.6], [-4.2, 1.25, -3.5], [-3.5, 1.6, -0.9], [-4.2, 1.25, -3.5], 50, 46, 1],                      // ...next to the register
    [3.3, [-4.6, 1.75, -2.2], [-4.9, 1.65, -4.45], [-4.65, 1.75, -2.4], [-4.9, 1.65, -4.45], 46, 42, 1],                  // no accident (Tony winks)
    [4.6, [-3.55, 1.3, -1.5], [-3.55, 1.05, -3.2], [-3.55, 1.3, -1.75], [-3.55, 1.05, -3.2], 44, 40],                    // prime real estate
  ],
  2: [
    [7.85, [5.6, 2.6, 7.4], [-2.5, 1.3, -1.5], [5.0, 2.5, 6.8], [-2.5, 1.3, -1.5], 56, 54],                              // everyone passes the checkout
    [10.35, [0.6, 1.6, 1.6], [-3.4, 1.3, -1.2], [0.3, 1.6, 1.3], [-3.4, 1.3, -1.2], 50, 46],                             // wait in line
    [13.0, [-1.8, 1.65, -0.5], [-3.5, 1.6, -1.6], [-2.0, 1.65, -0.65], [-3.5, 1.6, -1.6], 46, 42, 1],                       // bored
    [14.75, [-3.55, 1.15, -1.7], [-3.55, 1.05, -3.2], [-3.55, 1.15, -1.95], [-3.55, 1.05, -3.2], 44, 40, 1],              // chocolate at eye level
    [16.3, [-2.6, 0.8, -0.5], [-3.2, 0.75, -2.4], [-2.7, 0.8, -0.8], [-3.2, 0.75, -2.4], 50, 46, 1],                       // the kid's eye level
  ],
  3: [
    [18.3, [TD - 1, 1.8, 16.5], [TD - 1, 2.2, 10], [TD - 1, 1.9, 15.8], [TD - 1, 2.2, 10], 50, 46],                       // British supermarkets
    [20.15, [TD - 1, 2.55, 14.1], [TD - 1, 2.6, 10.3], [TD - 1, 2.55, 13.8], [TD - 1, 2.6, 10.3], 44, 42],                 // candy off the checkout
    [22.2, [TD - 1.6, 2.4, 13.6], [TD - 1, 2.6, 10.3], [TD - 0.4, 2.4, 13.6], [TD - 1, 2.6, 10.3], 44, 44],                // bought less
    [23.55, [TD - 1, 2.7, 12.5], [TD - 1, 2.7, 10.3], [TD - 1, 2.7, 12.3], [TD - 1, 2.7, 10.3], 44, 40, 1],                // -17 %
    [25.4, [TD + 0.6, 1.72, 13.0], [TD + 0.6, 1.66, 11.3], [TD + 0.6, 1.72, 12.8], [TD + 0.6, 1.66, 11.3], 48, 44],        // a year later (Max)
    [27.6, [TD - 1, 2.55, 14.0], [TD - 1, 2.6, 10.3], [TD - 1, 2.55, 13.6], [TD - 1, 2.6, 10.3], 44, 42, 1],               // 70 %
    [32.0, [TD + 0.5, 1.74, 12.8], [TD + 0.5, 1.72, 11.3], [TD + 0.5, 1.74, 12.6], [TD + 0.5, 1.72, 11.3], 48, 44, 1],     // unhealthy!
  ],
  4: [
    [33.5, [-1.5, 1.9, 0.4], [-1.8, 1.5, -3.0], [-1.5, 1.9, 0.0], [-1.8, 1.5, -3.0], 48, 44],                             // self-checkout
    [36.0, [-2.0, 1.6, 0.5], [-2.3, 1.5, -2.8], [-2.1, 1.6, 0.2], [-2.3, 1.5, -2.8], 46, 42, 1],                            // fewer impulse buys
    [38.45, [-1.4, 1.55, -1.1], [-1.4, 1.5, -3.0], [-1.4, 1.55, -1.35], [-1.4, 1.5, -3.0], 44, 40, 1],                      // busy scanning
    [40.0, [-2.4, 1.72, -1.3], [-2.4, 1.66, -2.6], [-2.4, 1.72, -1.5], [-2.4, 1.66, -2.6], 46, 42],                         // not staring at chocolate
  ],
  5: [
    [41.5, [-4.6, 1.75, -2.2], [-4.9, 1.65, -4.45], [-4.65, 1.75, -2.4], [-4.9, 1.65, -4.45], 46, 42],                      // Tony tried...
    [42.6, [-3.9, 1.45, -2.0], [-3.9, 1.2, -3.3], [-3.9, 1.45, -2.2], [-3.9, 1.2, -3.3], 44, 40, 1],                         // a fruit bowl: nobody
    [45.5, [-3.3, 1.45, -2.0], [-3.3, 1.2, -3.3], [-3.3, 1.45, -2.2], [-3.3, 1.2, -3.3], 44, 40, 1],                         // a cookie jar: gone
    [46.9, [-2.4, 1.72, -1.3], [-2.6, 1.66, -2.6], [-2.4, 1.72, -1.5], [-2.6, 1.66, -2.6], 46, 42, 1],                       // gone by lunch (Max)
  ],
  6: [
    [48.0, [TX + 0.6, 1.65, 13.4], [TX + 0.6, 1.55, 10.9], [TX + 0.6, 1.65, 13.0], [TX + 0.6, 1.55, 10.9], 48, 44],       // next time: slow music
    [50.5, [TX + 0.6, 2.0, 12.6], [TX + 0.6, 2.0, 10.9], [TX + 0.6, 2.0, 12.4], [TX + 0.6, 2.0, 10.9], 46, 42, 1],         // part four
    [51.7, [TX + 1.2, 1.7, 12.6], [TX + 1.0, 1.65, 11.0], [TX + 1.2, 1.7, 12.4], [TX + 1.0, 1.65, 11.0], 46, 42],          // stuck in line...
    [54.2, [TX + 1.1, 1.55, 12.2], [TX + 1.05, 1.5, 11.0], [TX + 1.1, 1.55, 12.0], [TX + 1.05, 1.5, 11.0], 44, 40, 1],     // that candy was put there for you
    [56.0, [TX + 0.6, 1.8, 13.4], [TX + 0.6, 1.6, 10.8], [TX + 1.4, 5.0, 22.0], [TX, 2.8, 9.5], 46, 50],                   // follow for part 4
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
const SHAKES = [BT.accident, BT.p17, BT.p70];
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
