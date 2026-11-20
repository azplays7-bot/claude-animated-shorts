// Timeline of "How is Ronaldo still scoring at 41?" (Pisa engine, fast-cut style).
// One continuous 60 s video. Beats come from the narration word timings (words.json, frame = start x 30).
// Pacing: a new camera setup every ~1.5 s, every setup moves, a gag every 3-5 s, information on signs in the world.
// Look: golden evening stadium (hook, result, ending) / bright morning house / sunny training pitch / cold blue ice room.
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
/** The scene times below were written for an earlier recording; warp() maps them onto the current narration
 *  (piecewise linear between matching sentence starts), unwarp() maps current seconds back. */
const interp = (x: number, a: number[], b: number[]) => {
  let i = 0; while (i + 2 < a.length && x > a[i + 1]) i++;
  return b[i] + (b[i + 1] - b[i]) * (x - a[i]) / Math.max(1e-6, a[i + 1] - a[i]);
};
export const warp = (s: number) => interp(s, WARP.old, WARP.new);
export const unwarp = (s: number) => interp(s, WARP.new, WARP.old);
/** narration beats (frames) */
export const BT = {
  retire: w("RETIRE"), n35: w("35"), players: w("PLAYERS"), tv: w("TV"), talking: w("TALKING"), cristiano: w("CRISTIANO"), n41: w("41"),
  chasing: w("CHASING"), k1000: w("1000GOALS"), how: w("HOW"), follow: w("FOLLOW"),
  morning: w("MORNING"), wakes: w("WAKES"), rested: w("RESTED"), sleep: w("SLEEP"), training: w("TRAINING"), reportedly: w("REPORTEDLY"),
  naps: w("NAPS"), breakfast: w("BREAKFAST"), protein: w("PROTEIN"), sugar: w("SUGAR"), moved: w("MOVED"), soda: w("SODA"), off: w("OFF"),
  held: w("HELD"), water: w("WATER"), alcohol: w("ALCOHOL"), drink: w("DRINK"),
  training2: w("TRAINING", 1), sprints: w("SPRINTS"), weights: w("WEIGHTS"), extra: w("EXTRA"), shooting: w("SHOOTING"), leaves: w("LEAVES"),
  teammates: w("TEAMMATES"), first: w("FIRST"), last: w("LAST"), thats: w("THATS"), jumps: w("JUMPS"), header: w("HEADER"),
  measured: w("MEASURED"), meters: w("25METERS"), high: w("HIGH"),
  later: w("LATER"), ice: w("ICE"), brrr: w("SHOWER"), rest: w("REST"), repeat: w("REPEAT"), every: w("EVERY"),
  result: w("RESULT"), g970: w("970GOALS"), goat: w("GOAT"), cups: w("6WORLDCUPS"),
  league: w("LEAGUE"), n41c: w("41", 2), talent: w("TALENT"), habits: w("HABITS"), going: w("GOING"),
  skip: w("SKIP"), workout: w("WORKOUT"), remember: w("REMEMBER"), n41d: w("41", 3),
  end: Math.round(WORDLIST[WORDLIST.length - 1].end * FPS),
};

// ---------------- places ----------------
/** The stadium sits at the origin: pitch x -52..52, z -34..34, the goal on x = GOAL_X (mouth z -3.66..3.66), the big
 *  screen above the stand behind it. The house is one long room at HOUSE (local x -16..24, back wall z = -4):
 *  bedroom (x < -8), kitchen (-8..0), press room (0..8), ice room (8..16), living room (16..24). */
export const HOUSE: V3 = [400, 0, 0];
export const GOAL_X = 52, PITCH_X = 52, PITCH_Z = 34;
export const SCREEN: V3 = [62, 15, 0];          // big screen centre (faces -x)
export const BOOTH: V3 = [0, 5, 41.5];           // TV booth floor centre (window faces -z)
export const LOG_BOARD: V3 = [43.5, 1.9, -35.9]; // the training log by the tunnel (faces +z)
export const POLE_M: V3 = [46.6, 0, -0.6];       // the measuring pole beside the header
export const BED: V3 = [-12, 0, -3.2];            // bed centre (house); top at y 0.55
export const TABLE_K: V3 = [-4, 0, -0.2];         // kitchen table
export const PRESS_T: V3 = [4, 0, -2.2];          // press table
export const TUB: V3 = [12, 0, -2.0];             // ice tub
export const CALENDAR: V3 = [14.6, 1.8, -3.96];   // wall calendar in the ice room
export const COUCH: V3 = [20, 0, -2.6];           // Max's couch
export const WHITEBOARD: V3 = [-8.95, 1.75, -3.96];
export const FRIDGE_NOTE: V3 = [-1.2, 1.45, -3.0];

// ---------------- shots (place + light) ----------------
export type Light = "day" | "golden";
export type Place = "stadium" | "house";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number; cold?: boolean };
const T = (s: number) => Math.round(warp(s) * FPS);
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: T(11.0), light: "golden", place: "stadium", sunAz: 150, sunEl: 10 },   // hook: retire at 35? he's 41
  { id: 2, a: T(11.0), b: T(25.55), light: "day", place: "house", sunAz: 140, sunEl: 60 },   // morning: sleep, naps, breakfast, water
  { id: 3, a: T(25.55), b: T(36.95), light: "day", place: "stadium", sunAz: 110, sunEl: 45 }, // training, extra shooting, the jump
  { id: 4, a: T(36.95), b: T(41.95), light: "day", place: "house", sunAz: 140, sunEl: 60, cold: true }, // ice bath, repeat
  { id: 5, a: T(41.95), b: T(52.15), light: "golden", place: "stadium", sunAz: 150, sunEl: 10 }, // the result
  { id: 6, a: T(52.15), b: T(53.85), light: "day", place: "house", sunAz: 140, sunEl: 60 },   // you, on the couch
  { id: 7, a: T(53.85), b: TOTAL, light: "golden", place: "stadium", sunAz: 150, sunEl: 10 }, // still training at 41
];
export const XFADE: Record<number, number> = { 2: 10, 3: 8, 5: 8 };
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
/** [start s, from pos, from look, to pos, to look, fov from, fov to, ease (0 = smooth in-out, 1 = fast start)] (house-relative in the house) */
type Setup = [number, V3, V3, V3, V3, number, number, number?];
const SETUPS: Record<number, Setup[]> = {
  1: [
    [0.0, [-3.4, 1.5, -24.6], [-3.4, 1.25, -30], [-3.4, 1.45, -26.4], [-3.4, 1.2, -30], 50, 44, 1],      // old pros wave bye: retire at 35
    [1.35, [-1.6, 1.7, -26.2], [-3.4, 1.55, -30], [-2.0, 1.65, -26.8], [-3.4, 1.55, -30], 46, 42],         // 35! (the rocking chair)
    [2.35, [0, 6.8, 37.2], [0, 6.55, 41.5], [0, 6.75, 38.1], [0, 6.55, 41.5], 50, 44],                     // they're on TV now
    [3.75, [-1.1, 6.7, 39.4], [-0.75, 6.55, 41.6], [-0.95, 6.7, 39.85], [-0.75, 6.55, 41.6], 44, 40],        // talking about football
    [5.2, [1.3, 0.35, 3.4], [0, 1.9, 0], [1.0, 0.6, 2.8], [0, 1.7, 0], 58, 50, 1],                        // CRISTIANO RONALDO (worm's eye)
    [6.4, [40, 7.5, 7.5], [62, 15, 0], [45, 9.5, 4.5], [62, 15, 0], 46, 40],                              // the big screen: AGE 41
    [7.25, [-0.5, 1.3, 6.8], [0.5, 1.0, 0], [7.0, 1.3, 6.8], [8.0, 1.0, 0], 46, 46],                          // still chasing... (track)
    [8.15, [5.0, 1.9, 1.4], [62, 12, 0], [16.5, 2.2, 1.2], [62, 13, 0], 40, 36],                          // ...1,000 goals (over his shoulder)
    [9.65, [20.3, 1.65, 3.2], [20, 1.55, 0], [20.2, 1.65, 2.5], [20, 1.55, 0], 44, 40],                     // How? Let's follow his day
  ],
  2: [
    [11.0, [-11.8, 2.9, -0.6], [-12, 0.6, -3.2], [-11.9, 2.6, -1.1], [-12, 0.6, -3.2], 50, 46],          // morning: asleep, alarm
    [11.75, [-9.3, 1.5, 1.2], [-9.7, 1.25, -2.0], [-9.4, 1.5, 0.5], [-9.7, 1.25, -2.0], 46, 42, 1],        // wakes up rested
    [12.45, [-9.6, 1.75, -1.0], [-8.95, 1.75, -4], [-9.4, 1.75, -1.6], [-8.95, 1.75, -4], 46, 42],          // sleep = training (whiteboard)
    [14.55, [-11.2, 1.9, 2.0], [-12, 0.8, -3], [-11.6, 1.7, 1.2], [-12, 0.8, -3], 54, 50],                 // reportedly naps
    [15.95, [-12.2, 1.6, 0.2], [-12.6, 0.8, -3.0], [-12.4, 1.5, -0.3], [-12.6, 0.8, -3.0], 46, 42],     // NAP 1 NAP 2 NAP 3
    [17.25, [-4.0, 1.55, 2.6], [-4.0, 0.95, -0.6], [-4.0, 1.5, 2.0], [-4.0, 0.95, -0.6], 50, 46],            // breakfast
    [17.95, [-3.9, 1.65, 0.95], [-4.0, 0.78, -0.15], [-3.9, 1.6, 0.75], [-4.0, 0.78, -0.15], 50, 46],         // protein (plates)
    [18.6, [-2.4, 1.4, 0.7], [-1.2, 1.45, -3.0], [-2.0, 1.45, 0.0], [-1.2, 1.45, -3.0], 46, 42, 1],          // sugar? the fridge note
    [19.6, [4.0, 1.4, 1.8], [4.0, 1.05, -2.4], [4.0, 1.35, 1.2], [4.0, 1.05, -2.4], 50, 46],                // the press table
    [20.85, [4.7, 1.15, -0.3], [4.15, 0.95, -1.95], [4.6, 1.12, -0.55], [4.15, 0.95, -1.95], 46, 42],             // the soda bottles
    [21.9, [3.4, 1.35, 0.2], [4.0, 1.35, -2.5], [3.6, 1.35, -0.3], [4.0, 1.4, -2.5], 46, 42, 1],             // held up water
    [23.55, [4.0, 1.4, -0.4], [4.0, 1.3, -2.5], [4.0, 1.4, -0.75], [4.0, 1.3, -2.5], 46, 42],                // alcohol? never
  ],
  3: [
    [25.55, [12, 7, 17], [20, 0.5, 2], [14, 6, 16], [21, 0.5, 2], 52, 48],                               // then training (wide)
    [26.35, [13.5, 0.8, 9.8], [11.8, 1.0, 4], [20.5, 0.8, 9.8], [21.5, 1.0, 4], 48, 48],                     // sprints
    [26.8, [24.2, 1.5, 11.2], [24, 1.35, 8], [24.1, 1.5, 10.6], [24, 1.35, 8], 46, 42],                   // weights
    [27.35, [37.2, 1.75, 0.9], [52, 1.3, -0.3], [38.3, 1.65, 0.75], [52, 1.3, -0.3], 46, 42],                         // extra shooting
    [28.0, [33, 3.0, 15], [40, 1.0, -10], [35, 2.8, 13.5], [40, 1.0, -10], 54, 52],                        // after everyone leaves
    [29.45, [41.5, 1.6, -26.5], [41.5, 1.4, -32], [41.4, 1.6, -27.4], [41.5, 1.4, -32], 50, 46],           // teammates say
    [30.15, [43.5, 1.9, -32.2], [43.5, 1.9, -35.9], [43.5, 1.9, -32.9], [43.5, 1.9, -35.9], 46, 40],       // FIRST IN / LAST OUT board
    [31.55, [44.8, 0.5, 4.3], [46.2, 1.9, 0.6], [45.1, 0.55, 3.7], [46.2, 2.2, 0.6], 56, 54],              // that's how a 41-year-old jumps
    [34.15, [48.8, 2.1, 4.4], [46.4, 2.0, 0.0], [48.4, 2.2, 3.8], [46.4, 2.1, 0.0], 46, 44],               // header measured 2.5 m+
    [35.55, [53.6, 1.6, 2.6], [47.2, 1.7, -0.1], [53.4, 1.5, 2.3], [47.2, 1.6, -0.1], 50, 46],                     // high: in the net
  ],
  4: [
    [36.95, [12, 1.55, 1.6], [12, 1.0, -2.1], [12, 1.5, 0.9], [12, 1.0, -2.1], 50, 46],                    // ice cold shower
    [38.6, [12.1, 1.3, -0.55], [12, 1.2, -2.0], [12.0, 1.3, -0.8], [12, 1.2, -2.0], 46, 42],               // BRRR
    [39.65, [14.2, 1.8, -1.6], [14.6, 1.8, -4], [14.35, 1.8, -2.1], [14.6, 1.8, -4], 46, 42],               // rest, repeat (calendar)
    [40.7, [13.6, 2.3, 1.8], [12.8, 1.0, -2.6], [13.9, 2.5, 2.6], [12.8, 1.0, -2.6], 54, 56],                   // every single day
  ],
  5: [
    [41.95, [55.4, 1.9, -2.3], [44, 1.0, 0.2], [55.0, 1.8, -1.9], [44, 1.0, 0.2], 50, 46, 1],                  // the result: GOAL
    [42.85, [34, 5.2, 9], [62, 15, 0], [40, 7.5, 6], [62, 15, 0], 50, 42],                                  // 970+ goals
    [44.65, [41.2, 1.5, 4.4], [42, 1.45, 0], [41.4, 1.5, 3.7], [42, 1.45, 0], 46, 42],                      // the GOAT (a goat pops up)
    [47.35, [45, 9.5, 4], [62, 15, 0], [47, 10.5, 3], [62, 15, 0], 46, 40],                                  // 6 world cups
    [48.4, [41.5, 1.75, 3.6], [42, 1.15, 0], [41.7, 1.7, 3.0], [42, 1.15, 0], 46, 42, 1],                    // a league title at 41
    [49.75, [30.4, 0.75, 3.0], [30, 0.85, 0], [30.3, 0.8, 2.5], [30, 0.85, 0], 48, 44],                      // talent (the kid)
    [50.95, [35, 7.5, 0], [62, 14.5, 0], [36.5, 8, 0], [62, 14.5, 0], 58, 56],                                // habits: the checklist
  ],
  6: [
    [52.15, [20, 1.25, 1.8], [20, 0.85, -2.6], [20, 1.2, 1.1], [20, 0.85, -2.6], 50, 46],                    // you, on the couch
  ],
  7: [
    [53.85, [41.5, 1.1, 5.4], [42, 1.7, 0], [41.7, 1.0, 4.4], [42, 1.9, 0], 50, 50],                         // remember who's still training
    [55.25, [44.5, 0.6, 4.2], [42, 2.2, 0], [44.0, 0.6, 3.6], [42, 2.4, 0], 56, 54, 1],                      // at 41: SIUUU
    [56.7, [42.6, 1.8, 4.0], [42, 1.6, 0], [30, 16, 34], [44, 6, -6], 46, 56],                                // the end: crane out
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
/** small camera shakes: the goal, the ice bath shiver, the SIUUU landing */
const SHAKES = [BT.result + 10, BT.brrr, BT.n41d + 18];
const shake = (f: number) => { for (const a of SHAKES) if (f >= a && f < a + 20) return 0.05 * Math.sin(f * 2.3) * (1 - (f - a) / 20); return 0; };
export const camAt = (id: number, f: number): Cam => {
  const { i, u } = setupAt(id, f), s = SETUPS[id][i];
  const k = s[7] === 1 ? easeOut(u * 1.15) : smooth(u) * 0.85 + u * 0.15;
  const base: V3 = SHOTS[id - 1].place === "house" ? HOUSE : [0, 0, 0];
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
export const ceilingOff = (_id: number, _f: number) => false;
export const D0 = 0;
