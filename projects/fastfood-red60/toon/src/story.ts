// Timeline of "Why are fast food signs red and yellow?" (Pisa engine, fast-cut style).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Pacing: a new camera setup every ~1.5 s, every setup moves, a gag every 3-5 s, information on signs in the world.
// Look: the street is drained to grey (only the restaurant, its sign and Max keep their colour) until Max walks in;
// the inside is loud red / yellow under bright light; the ending is golden hour with the sign glowing.
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
  accident: w("ACCIDENT"), watch: w("WATCH"), hungry: w("HUNGRY"), gray: w("GRAY"), bam: w("BAM"), giant: w("GIANT"),
  grabs: w("GRABS"), eye: w("EYE"), yellow2: w("YELLOW", 2), far: w("FAR"), together: w("TOGETHER"), stop: w("STOP"), now: w("NOW"),
  linked: w("LINKED"), appetite: w("APPETITE"), starving: w("STARVING"), feet: w("FEET"), turn: w("TURN"),
  inside: w("INSIDE"), bright: w("BRIGHT"), music: w("MUSIC"), hurry: w("HURRY"), studies: w("STUDIES"), eat: w("EAT"),
  chomp: w("CHOMP"), chomp2: w("CHOMP", 1), chomp3: w("CHOMP", 2), gone: w("GONE"), ninety: w("90SECONDS"),
  seats: w("SEATS"), plastic: w("PLASTIC"), comfy: w("COMFY"), stay: w("STAY"), empties: w("EMPTIES"),
  next1: w("NEXT", 0), next2: w("NEXT", 1), next3: w("NEXT", 2), next4: w("NEXT", 3), long: w("LONG"),
  walked: w("WALKED"), nothing: w("NOTHING"), combo: w("COMBO"), milkshake: w("MILKSHAKE"), magic: w("MAGIC"), design: w("DESIGN"),
  nexttime: w("NEXT", 4), ask: w("ASK"), am: w("AM"), sign: w("SIGN", 3),
  end: Math.round(WORDLIST[WORDLIST.length - 1].end * FPS),
};

// ---------------- places ----------------
/** The street runs along x. The restaurant occupies x -SIDE..SIDE, z BACKW..FRONT (front door at DOOR_X on the
 *  facade z = FRONT); the inside is a copy of the same footprint at STORE, so street and store coordinates match. */
export const STORE: V3 = [400, 0, 0];
export const FRONT = 9, BACKW = -9, SIDE = 7, CEIL = 3.8;
export const DOOR_X = 3;
export const WALK_Z = 11.6;              // the sidewalk Max walks along
export const ROAD_Z0 = 13.5, ROAD_Z1 = 21.5;
/** the pole sign in the parking lot (base), the sign box centre height, the reader board under it */
export const POLE: V3 = [12, 0, 6.5];
export const SIGN_Y = 9.6, BOARD_Y = 6.5;
/** inside: the counter (front face at COUNTER_Z), the tables (centre x, z), the speaker on the left wall, the number board */
export const COUNTER_Z = -3.5, COUNTER_X0 = -6.6, COUNTER_X1 = 1.2;
export const TABLES: [number, number][] = [[-5, 1], [-1.5, 1], [5.2, 1.5], [-5, 5], [-1.5, 5], [5.2, 5.5]];
export const MAX_TABLE = 4;
export const SPEAKER: V3 = [-6.9, 3.05, 2.2];
export const NUMBER_BOARD: V3 = [2.75, 2.75, -3.45];
export const GRILL: V3 = [-3.5, 0, -7.6];

// ---------------- shots (place + light) ----------------
export type Light = "day" | "golden";
export type Place = "street" | "store";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; gray?: boolean };
const T = (s: number) => Math.round(s * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(4.0), light: "day", place: "street", sunAz: 120, sunEl: 40 },                    // hook: every sign is red and yellow
  { id: 2, a: T(4.0), b: BT.bam - 2, light: "day", place: "street", sunAz: 110, sunEl: 35, gray: true },// Max walks a grey street
  { id: 3, a: BT.bam - 2, b: BT.inside - 6, light: "day", place: "street", sunAz: 120, sunEl: 40, gray: true }, // BAM: the sign, why red, why yellow
  { id: 4, a: BT.inside - 6, b: BT.walked - 6, light: "day", place: "store", sunAz: 140, sunEl: 78 },  // inside: light, music, seats, next
  { id: 5, a: BT.walked - 6, b: TOTAL, light: "golden", place: "street", sunAz: 150, sunEl: 12 },       // golden hour: combo + shake, the sign
];
export const XFADE: Record<number, number> = { 4: 8, 5: 10 };
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
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [17.5, 1.1, 21], [12, 9.4, 6.5], [14.2, 5.6, 14.2], [12, 9.6, 6.5], 62, 46, 1],             // rocket up at the glowing pole sign
    [1.55, [-4.5, 3.4, 19.5], [-1, 5.0, 9], [-1.5, 3.6, 18.6], [0.5, 5.0, 9], 46, 44],                // the roof sign: BLAZE BURGER
    [2.75, [5.9, 1.6, 13.6], [4.6, 1.55, 10.3], [5.5, 1.6, 12.7], [4.6, 1.55, 10.3], 44, 38],          // the owner smirks: not an accident
  ],
  2: [
    [4.0, [28.5, 1.55, 16.2], [26.5, 1.4, WALK_Z], [24.0, 1.55, 16.2], [22.0, 1.4, WALK_Z], 46, 46],  // Max walking home (grey)
    [5.5, [18.6, 1.65, 12.4], [24, 1.5, WALK_Z], [18.2, 1.65, 12.2], [22.4, 1.5, WALK_Z], 44, 40],      // not hungry. at all.
    [6.95, [16.5, 5.2, 19.5], [36, 3.4, 8], [18.0, 5.6, 20.5], [38, 3.4, 8], 48, 46],                  // grey street, grey buildings
  ],
  3: [
    [8.45, [24.0, 1.2, 14.0], [12, 8.6, 6.5], [23.0, 1.5, 13.6], [12, 9.4, 6.5], 58, 50, 1],            // BAM: whip to the sign
    [9.05, [13.8, 0.5, 10.6], [12, 10.2, 6.5], [14.4, 0.6, 11.3], [12, 10.2, 6.5], 64, 58],             // a GIANT sign, worm's eye
    [10.1, [18.7, 1.75, 13.0], [20.5, 1.6, WALK_Z], [19.1, 1.75, 12.7], [20.5, 1.6, WALK_Z], 40, 36],   // Max: !!
    [10.85, [16.4, 9.2, 15.6], [12, 9.6, 6.5], [14.6, 9.5, 11.8], [12, 9.6, 6.5], 46, 40, 1],            // red grabs your eye
    [12.2, [21.8, 2.0, 12.9], [12, 8.8, 6.5], [21.4, 2.1, 12.5], [12, 9.2, 6.5], 40, 28],                // ...faster than any colour (over the shoulder)
    [13.35, [60, 3.0, 17], [12, 7.8, 7], [57, 3.3, 16], [12, 7.8, 7], 20, 17],                           // yellow: seen from far away
    [14.75, [42, 2.4, 15], [12, 8.6, 6.5], [31, 2.9, 13.6], [12, 8.9, 6.5], 26, 32],                     // from far... rushing in
    [16.45, [15.8, 6.2, 14.8], [12, 9.3, 6.5], [15.2, 6.5, 13.8], [12, 9.3, 6.5], 50, 44, 1],            // together they scream
    [17.35, [13.7, 6.4, 10.8], [12, 6.5, 6.6], [13.4, 6.4, 10.1], [12, 6.5, 6.6], 46, 42],               // STOP HERE / RIGHT NOW
    [18.55, [19.3, 1.5, 13.4], [20.5, 1.5, WALK_Z], [19.7, 1.55, 13.0], [20.5, 1.55, WALK_Z], 44, 40],   // energy and appetite: GRRR
    [20.2, [18.2, 0.9, 14.4], [20.3, 1.6, WALK_Z], [18.6, 1.3, 14.0], [12, 8.6, 6.5], 48, 46],           // tilt from Max up to the sign
    [21.35, [19.55, 1.9, 12.45], [20.5, 1.85, WALK_Z], [19.8, 1.9, 12.3], [20.5, 1.85, WALK_Z], 36, 32], // starving: lick
    [22.55, [21.8, 0.32, 13.3], [20.4, 0.35, WALK_Z], [19.4, 0.36, 13.4], [15.5, 0.4, WALK_Z], 52, 52, 1], // his feet just turn: zoom
  ],
  4: [
    [23.8, [1.4, 1.6, 2.4], [3, 1.5, 8.6], [1.8, 1.6, 3.4], [3, 1.5, 8.6], 54, 48],                      // in the door: bright!
    [24.55, [0.2, 1.2, 6.2], [-2, 3.7, 0], [0.2, 1.4, 5.2], [-2, 2.0, -3], 62, 58, 1],                  // bright lights (tilt down)
    [25.1, [6.4, 2.7, 8.4], [-3, 1.0, -2], [5.6, 2.5, 8.6], [-4, 1.0, 0], 62, 60],                       // bright colours: the room
    [25.65, [-4.4, 2.3, 4.6], [-6.9, 3.0, 2.2], [-5.0, 2.55, 3.9], [-6.9, 3.0, 2.2], 46, 40],             // upbeat music: the speaker
    [26.65, [0.9, 1.6, 0.4], [-2, 1.4, -3.4], [0.5, 1.6, -0.3], [-2, 1.4, -3.4], 48, 44],                 // the room says: hurry up
    [28.05, [-1.5, 1.35, 8.1], [-1.5, 1.2, 4.4], [-1.5, 1.35, 7.1], [-1.5, 1.2, 4.4], 44, 40],            // studies: faster music...
    [29.55, [6.9, 1.4, 8.4], [5.2, 1.15, 4.9], [6.4, 1.4, 7.6], [5.2, 1.15, 4.9], 44, 40],                // ...people eat faster
    [31.85, [-1.5, 1.4, 6.15], [-1.5, 1.35, 4.3], [-1.5, 1.4, 5.75], [-1.5, 1.35, 4.3], 40, 36],          // chomp chomp chomp
    [33.3, [-1.4, 3.3, 5.6], [-1.5, 0.7, 4.85], [-1.4, 2.9, 5.45], [-1.5, 0.7, 4.85], 50, 46],            // 90 seconds: empty tray
    [34.35, [-4.15, 0.75, 2.95], [-5, 0.4, 1.65], [-4.4, 0.65, 2.5], [-5, 0.38, 1.65], 46, 40],           // the seats: hard plastic
    [36.05, [-0.4, 1.3, 7.3], [-1.5, 1.1, 4.3], [-0.7, 1.3, 6.6], [-1.5, 1.1, 4.3], 46, 42],              // comfy enough to eat
    [36.85, [-3.5, 1.2, 6.7], [-1.5, 1.0, 4.3], [-3.1, 1.2, 6.2], [-1.5, 1.0, 4.4], 46, 42],              // not comfy enough to stay
    [38.25, [-1.5, 4.0, 7.6], [-1.5, 0.7, 4.6], [-1.5, 3.5, 7.0], [-1.5, 0.7, 4.6], 50, 48],              // the table empties fast
    [39.75, [-3.7, 1.4, 7.5], [-1.5, 1.1, 4.3], [-3.2, 1.4, 6.8], [-1.5, 1.1, 4.3], 46, 42],              // ready for the next customer
    [41.6, [1.7, 2.3, -0.4], [2.75, 2.75, -3.45], [1.9, 2.45, -1.3], [2.75, 2.75, -3.45], 46, 40],        // NOW SERVING: next
    [42.4, [6.5, 3.2, 8.7], [-2, 0.8, 1.2], [5.9, 3.0, 8.1], [-2, 0.8, 1.2], 62, 60],                     // next, next: the room flips
    [43.05, [-2.4, 1.85, -2.5], [-3.5, 1.3, -6.9], [-2.8, 1.85, -3.1], [-3.5, 1.3, -6.9], 50, 44],        // next order: the grill, all day long
  ],
  5: [
    [44.6, [5.7, 1.6, 13.6], [3, 1.4, 9.8], [5.1, 1.6, 12.9], [3, 1.45, 10.2], 48, 44],                  // walked in for nothing...
    [46.25, [4.6, 1.75, 13.5], [3.4, 1.6, 11.3], [4.3, 1.75, 13.0], [3.4, 1.6, 11.3], 40, 36],             // ...out with a combo and a shake
    [48.25, [21, 2.0, 18.5], [12, 8.8, 6.5], [18.6, 2.6, 16.6], [12, 9.0, 6.5], 42, 38],                   // not magic: design (sunset sign)
    [49.95, [1.2, 1.5, 14.6], [12, 7.4, 6.5], [2.0, 1.5, 14.2], [12, 8.0, 6.5], 46, 40],                   // next time a sign makes you hungry
    [52.65, [7.9, 1.75, 13.5], [6.3, 1.7, WALK_Z], [7.6, 1.75, 13.1], [6.3, 1.7, WALK_Z], 40, 36],          // ask yourself: ?
    [53.65, [15.2, 8.6, 14.8], [12, 9.5, 6.5], [13.9, 9.3, 11.4], [12, 9.5, 6.5], 46, 40, 1],               // or is it the SIGN? (it licks its lips)
    [55.3, [16.5, 3.2, 16.5], [11.5, 6.6, 7], [23, 4.2, 25], [11.5, 7.4, 6.5], 46, 50],                     // the end: pull back
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
/** small camera shake (the sign screaming) */
const shake = (f: number) => (f >= BT.together && f < BT.together + 24 ? 0.06 * Math.sin(f * 2.1) * (1 - (f - BT.together) / 24) : 0);
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
/** grey-street amount 0..1 (1 = colour drained) */
export const grayAt = (id: number) => (SHOTS[id - 1].gray ? 1 : 0);
export const ceilingOff = (_id: number, _f: number) => false;
export const D0 = 0;
