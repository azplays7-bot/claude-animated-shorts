// Timeline of "Why is the milk always at the back of the store?" (Pisa engine, faster cut style).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Pacing rules for this one: a new camera setup every ~1.5-2 s, every setup keeps moving (push / pull / track),
// something happens on screen every 3-5 s, information lives on signs inside the world.
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
  possible: w("POSSIBLE"), purpose: w("PURPOSE"), watch: w("WATCH"), list: w("MILK", 1), walks: w("WALKS"), bam: w("BAM"),
  flowers: w("FLOWERS"), bread: w("BREAD"), smells: w("SMELLS"), cart: w("CART"), where: w("WHERES"), back: w("BACK"),
  chips: w("CHIPS"), sample: w("SAMPLE"), cereal: w("CEREAL"), staring: w("STARING"), soda: w("SODA"), twofor: w("2FOR$5"),
  heavier: w("HEAVIER"), reaches: w("REACHES"), milk: w("MILK", 3), full: w("FULL"), checkout: w("CHECKOUT"), candy: w("CANDY"),
  eye: w("EYE"), came: w("CAME"), four: w("$4"), sixty: w("$63"), stuff: w("STUFF"), trick: w("TRICK"), bait: w("BAIT"),
  almost: w("ALMOST"), everything: w("EVERYTHING"), practical: w("PRACTICAL"), coolers: w("COOLERS"), dock: w("DOCK"),
  pricey: w("PRICEY"), eye2: w("EYE", 1), cheap: w("CHEAP"), feet: w("FEET"), extra: w("EXTRA"), chance: w("CHANCE"),
  next: w("NEXT"), walkin: w("WALK", 1), grab: w("GRAB", 1), getout: w("GET", 1),
  end: Math.round(WORDLIST[WORDLIST.length - 1].end * FPS),
};

// ---------------- places ----------------
/** the street: the market building occupies x -12.5..12.5, z -15.5..16.2 (facade at z = FRONT) with the parking lot in
 *  front. The interior is a copy of the same footprint at STORE, so street and store coordinates match. */
export const STORE: V3 = [400, 0, 0];
export const FRONT = 16.2, BACKW = -15.5, SIDE = 12.5, CEIL = 5.6;
export const DOOR_X = 8;
/** shelf rows (centre x), each spans z SHELF_Z0..SHELF_Z1; aisles run between them */
export const SHELF_X = [-9, -5, -1, 3, 7];
export const SHELF_Z0 = -8, SHELF_Z1 = 6, SHELF_H = 2.3, SHELF_D = 1.1;
/** what each shelf row sells (left face, right face) */
export const AISLE = { chips: 5, cereal: 1, sweets: -3, home: -7 };
export const BAKERY: V3 = [5.0, 0, 12.0];
export const FLOWERS: V3 = [10.6, 0, 12.4];
export const SAMPLE: V3 = [6.5, 0, -10.2];
export const SODA_TOWER: V3 = [-1, 0, 7.7];
export const DAIRY_X0 = -12.2, DAIRY_X1 = -1.2;        // dairy coolers along the back wall
export const MILK_SPOT: V3 = [-7, 0, -13.2];           // where Max stands to grab the milk
export const LANES = [-9.6, -6.2];                      // checkout counters (x), counter runs z 9..12.4
export const DOCK_Z = -22;                              // the back room runs from the back wall to the dock door
/** Max's walk through the store (store-relative x, z), the path the map shot draws */
export const PATH: [number, number][] = [
  [8, 15.5], [8, 13.2], [6.2, 11.0], [5, 8.0], [5, -9.6], [1, -10.4], [1, 7.6], [-3, 8.4], [-3, -11.0], [-7, -12.6],
];

// ---------------- shots (place + light) ----------------
export type Light = "day" | "golden";
export type Place = "street" | "store";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 130, light: "day", place: "store", sunAz: 140, sunEl: 78 },                 // hook: milk as far as possible
  { id: 2, a: 130, b: 205, light: "day", place: "street", sunAz: 120, sunEl: 40 },              // Max needs one thing
  { id: 3, a: 205, b: BT.next - 6, light: "day", place: "store", sunAz: 140, sunEl: 78 },       // the walk, checkout, the trick
  { id: 4, a: BT.next - 6, b: TOTAL, light: "golden", place: "street", sunAz: 155, sunEl: 13 },                        // next time: walk in, grab, get out
];
export const XFADE: Record<number, number> = { 4: 10 };
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
    [0.0, [-3, 1.75, 10.5], [-3, 1.9, -15], [-3, 1.7, -3.5], [-3, 2.1, -15], 62, 52, 1],           // rocket down the aisle at the far MILK sign
    [1.9, [-10.6, 4.6, -13.6], [8, 0.8, 15.5], [-9.6, 4.0, -12.4], [8, 0.8, 15.5], 46, 40],          // from the milk: the door is SO far
    [3.25, [-2.6, 1.75, -9.2], [-4.4, 1.55, -12.4], [-3.4, 1.65, -10.6], [-4.4, 1.6, -12.4], 46, 40], // the manager smirks: on purpose
  ],
  2: [
    [4.33, [9.0, 1.65, 23.6], [8, 1.55, 20.6], [8.7, 1.6, 22.6], [8, 1.55, 20.6], 44, 40],           // Max and his list: MILK
    [5.35, [12.6, 0.55, 29], [8, 2.4, 16.4], [11.2, 0.75, 25.5], [8, 2.3, 16.4], 52, 50],            // low wide: walking to the doors
  ],
  3: [
    [6.83, [7.0, 1.55, 8.6], [8, 1.5, 14.6], [7.3, 1.6, 9.8], [8, 1.5, 14.6], 56, 50, 1],            // BAM: flowers and bread
    [8.05, [3.7, 1.55, 9.7], [5.0, 1.15, 12.0], [4.2, 1.45, 10.6], [5.0, 1.1, 12.0], 44, 38],        // warm bread close-up
    [9.2, [10.2, 1.5, 9.4], [6.7, 1.0, 11.4], [9.6, 1.4, 10.0], [6.7, 1.0, 11.4], 48, 44],            // into the cart
    [10.9, [5.2, 1.6, 5.4], [5, 1.55, 8.0], [5.1, 1.6, 6.2], [5, 1.55, 8.0], 46, 42],                 // where's the milk?
    [12.35, [5.4, 3.5, 8.6], [-6.7, 3.4, -15.3], [5.0, 3.4, 6.6], [-6.7, 3.5, -15.3], 44, 30],        // over the shelves: ALL the way in the back
    [13.4, [5, 1.45, -0.6], [5, 1.15, 3.6], [5, 1.45, -3.0], [5, 1.15, 1.2], 50, 50],                 // chips aisle, tracking backwards
    [15.0, [2.4, 1.5, -9.0], [5.9, 1.35, -9.7], [2.8, 1.45, -9.3], [5.9, 1.35, -9.7], 50, 44],         // the free sample lady
    [16.4, [2.5, 1.25, -0.4], [-0.45, 1.3, -1.9], [2.2, 1.25, -1.2], [-0.45, 1.3, -1.9], 46, 40],      // cereal with cartoon eyes
    [17.9, [1, 1.9, -7.4], [1, 1.2, -2.4], [1, 1.8, -6.2], [1, 1.2, -2.4], 52, 48],                    // eyes staring right at him
    [19.5, [2.0, 0.35, 11.4], [-1, 2.4, 7.6], [1.6, 0.4, 10.6], [-1, 2.5, 7.6], 54, 50, 1],            // the soda tower, low hero angle
    [21.05, [3.0, 1.7, 10.4], [0.8, 1.0, 8.4], [2.7, 1.6, 9.9], [0.8, 1.0, 8.4], 48, 44],              // two for five: in they go
    [22.1, [-3, 0.75, 8.6], [-3, 1.05, 1.0], [-3, 0.8, 6.4], [-3, 1.05, -1.0], 52, 50],                // the cart gets heavier
    [23.9, [-3.6, 1.85, -7.4], [-7, 1.5, -14.2], [-4.6, 1.75, -9.0], [-7, 1.5, -14.2], 50, 44, 1],      // the dairy wall glows
    [25.2, [-6.0, 1.6, -10.9], [-7, 1.3, -13.4], [-6.3, 1.55, -11.4], [-7, 1.3, -13.4], 44, 40],       // grab the milk
    [25.9, [-7.4, 5.0, -11.1], [-7, 0.4, -12.4], [-7.3, 4.3, -11.5], [-7, 0.4, -12.4], 54, 52],        // top down: the cart is FULL
    [27.1, [-2.6, 1.25, 14.6], [-4.3, 1.2, 9.8], [-2.9, 1.25, 13.8], [-4.3, 1.2, 9.8], 46, 42],       // checkout: candy at eye level
    [28.3, [-4.5, 1.15, 12.0], [-3.95, 1.1, 9.6], [-4.4, 1.15, 11.4], [-3.95, 1.1, 9.6], 44, 40],      // the candy rack close
    [29.6, [-3.4, 1.6, 13.4], [-6.6, 1.35, 11.6], [-3.8, 1.6, 12.8], [-6.6, 1.35, 11.6], 44, 40],      // $4 carton... ring ring ring
    [31.9, [-3.6, 2.0, 15.0], [-6.2, 1.0, 11.0], [-1.8, 3.2, 17.4], [-6.2, 0.8, 11.0], 50, 50],        // $63: the receipt keeps going
    [34.3, [0.6, 26, 3.0], [-4, 0, -6], [-2.0, 15, -6.0], [-6.5, 0, -12.8], 46, 46, 1],                 // that's the trick: dive to the milk
    [35.5, [-6.2, 1.65, -10.6], [-7, 1.9, -14.6], [-6.5, 1.75, -11.6], [-7, 2.0, -14.6], 46, 40],      // the milk is the BAIT
    [37.0, [0.4, 40, 1.2], [0.4, 0, 0.2], [0.4, 36, 1.0], [0.4, 0, 0.2], 46, 46],                      // the map: the path past everything
    [40.65, [-8.0, 2.1, -16.9], [2.4, 1.8, -24.5], [-6.8, 2.0, -17.4], [2.4, 1.8, -24.5], 50, 46],      // back room: the loading dock
    [42.0, [-2.8, 1.6, -18.6], [-7.2, 1.35, -15.7], [-3.6, 1.55, -18.0], [-7.2, 1.35, -15.7], 46, 42],  // crates straight into the coolers
    [44.2, [-5.4, 1.6, -1.2], [-8.45, 1.62, -2.0], [-5.9, 1.6, -1.6], [-8.45, 1.62, -2.0], 48, 42],     // pricey brands at eye level
    [46.6, [-6.0, 0.8, -1.5], [-8.45, 0.25, -2.6], [-6.3, 0.6, -1.9], [-8.45, 0.2, -2.6], 48, 44],      // the cheap ones by your feet
    [48.85, [-0.9, 0.55, 0.4], [-3, 0.9, 2.8], [-1.0, 0.55, -0.9], [-3, 0.9, 1.0], 58, 58],            // every extra step
    [50.6, [-3, 3.0, -7.4], [-3, 1.0, 0.6], [-3, 2.6, -5.6], [-3, 1.0, 0.6], 50, 48],                   // one more chance to grab
  ],
  4: [
    [52.25, [8.6, 1.6, 23.4], [8, 1.5, 20.4], [8.5, 1.6, 22.4], [8, 1.5, 20.4], 46, 42],               // next time you just need milk
    [54.15, [13.0, 1.1, 29.0], [8, 1.9, 16.6], [12.4, 1.15, 27.6], [8, 1.9, 16.6], 50, 48, 1],          // walk in, grab, get out
    [55.6, [8.9, 1.55, 23.6], [8.3, 1.8, 19.5], [8.7, 2.9, 29.5], [8.2, 3.2, 17.5], 46, 50],            // the end: GRAB THE MILK. GET OUT.
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
export const camAt = (id: number, f: number): Cam => {
  const { i, u } = setupAt(id, f), s = SETUPS[id][i];
  const k = s[7] === 1 ? easeOut(u * 1.15) : smooth(u) * 0.85 + u * 0.15;
  const base: V3 = SHOTS[id - 1].place === "store" ? STORE : [0, 0, 0];
  return { pos: add(base, lerp3(s[1], s[3], k)), look: add(base, lerp3(s[2], s[4], k)), fov: s[5] + (s[6] - s[5]) * k, roll: 0 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [{ f: 0, cInf: 2.5 }];
export const dofAt = (f: number) => {
  const sh = shotAt(f), { i } = setupAt(sh.id, f);
  // map shots (looking straight down from high up) stay sharp; close-ups get a stronger background blur
  const s = SETUPS[sh.id][i], dist = Math.hypot(s[1][0] - s[2][0], s[1][1] - s[2][1], s[1][2] - s[2][2]);
  return { cInf: s[1][1] > 10 ? 0 : dist < 3.5 ? 4 : 2.5, focus: undefined as undefined | ((f: number) => V3) };
};

/** is the store ceiling hidden (the overhead map shots)? */
export const ceilingOff = (id: number, f: number) => id !== 2 && id !== 4 && SETUPS[id][setupAt(id, f).i][1][1] > 4.4;
/** map path progress 0..1 (drawn during the map shot) */
export const pathDraw = (f: number) => clamp01((f - Math.round(37.0 * FPS) - 4) / 80);
export const D0 = 0;
