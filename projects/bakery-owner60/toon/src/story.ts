// Timeline of "From empty shop to owner" in the flat-characters-in-a-3D-toon-world style (Pisa engine).
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
const S0 = at("SALES, minus"), S1 = atEnd("SALES, minus");
/** narration beats (frames) */
export const BT = {
  empty: at("This EMPTY"), stay: at("Stay to the END"), becomes: at("what it BECOMES"), rosa: at("This is ROSA"), works: at("9 to 5"),
  hours: at("her hours"), someone: at("SOMEONE ELSE"), owning: at("OWNING"), franchise: at("a FRANCHISE"), brand: at("proven BRAND"),
  fee: at("pay a FEE"), royal: at("ROYALTIES"), own: at("OWN IDEA"), cheaper: at("CHEAPER"), all: at("ALL on you"),
  math: at("MATH is simple"), sales: S0, costs: Math.round(S0 + (S1 - S0) * 0.36), profit: Math.round(S0 + (S1 - S0) * 0.74),
  team: at("TEAM"), earns: at("EARNS"), noteasy: at("NOT easy"), half: at("HALF"), small: at("start SMALL"), test: at("TEST the"),
  read: at("READ every"), become: at("BECOME?"), bakery: at("ROSA'S BAKERY"), manager: at("MANAGER"), shop2: at("SHOP #2"),
  free: at("FREE:"), problems: at("3 PROBLEMS"),
  end: Math.round(CH[CH.length - 1].end * FPS),
};

// ---------------- places ----------------
/** the high street: shop fronts face +z at z = SHOP_FRONT; shops are SHOP_W wide, centred at SHOP_X */
export const SHOP_D = 8, SHOP_FRONT = SHOP_D / 2, SHOP_W = 7.6, SHOP_H = 7.6;
export const SHOP_X = [-32, -24, -16, -8, 0, 8, 16, 24, 32];
export const ROSA_X = 0;                                 // the empty shop -> Rosa's Bakery
export const SHOP2_X = 16;                               // shop #2
export const CLOSING_X = [-32, -16, 8, 32];             // the ones that close ("about half")
export const WALK_Z = 7.0;                               // sidewalk centre
export const ROAD_Z = 12.5;                              // road centre
export const OFFICE: V3 = [400, 0, 0];                  // Rosa's 9-to-5 (insert set)
export const STAGE: V3 = [-400, 0, 0];                  // the explainer stage
/** office, relative to OFFICE */
export const DESK: V3 = [0, 0, 0];
export const ROSA_O: V3 = [0.15, 0, -0.75];
export const BOSS_DOOR: V3 = [4.4, 0, -2.2];
export const CLOCK_O: V3 = [-1.2, 3.1, -3.9];
/** stage, relative to STAGE */
export const FR_SHOP: V3 = [-3.5, 0, -1.6];             // path one: the franchise
export const ID_SHOP: V3 = [3.5, 0, -1.6];              // path two: your own idea
export const HQ: V3 = [-7.2, 0, -7.5];                  // the franchise headquarters (royalties fly here)
export const ROSA_ST: V3 = [0, 0, 2.2];
export const COUNTER: V3 = [0, 0, 0];                   // the money counter (shot 4)
export const JARS: V3[] = [[-1.6, 1.3, -1.5], [0, 1.3, -1.5], [1.6, 1.3, -1.5]];   // SUPPLIES, RENT, STAFF
export const JAR_COINS = [4, 2, 3];                      // $9 of costs out of a $10 sale
export const CUST: V3 = [-2.1, 0, 1.3];
export const ROSA_C: V3 = [2.1, 0, 1.2];
/** street: Rosa in front of her shop, the test stall, the manager */
export const ROSA_STREET: V3 = [1.9, 0, 6.0];
export const STALL: V3 = [2.6, 0, 7.6];
export const MANAGER: V3 = [-1.9, 0, 6.0];

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type Place = "street" | "office" | "stage";
export type ShotDef = { id: number; a: number; b: number; light: Light; place: Place; sunAz?: number; sunEl?: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 180, light: "golden", place: "street" },                           // the empty shop: what will it become?
  { id: 2, a: 180, b: 345, light: "day", place: "office", sunAz: 140, sunEl: 55 },     // Rosa's 9-to-5
  { id: 3, a: 345, b: 775, light: "day", place: "stage", sunAz: 120, sunEl: 55 },      // two paths: franchise or own idea
  { id: 4, a: 775, b: 1015, light: "day", place: "stage", sunAz: 120, sunEl: 55 },     // sales - costs = profit; a team
  { id: 5, a: 1015, b: 1270, light: "day", place: "street", sunAz: 150, sunEl: 50 },   // not easy: half close; start small
  { id: 6, a: 1270, b: 1545, light: "golden", place: "street" },                       // the reveal: Rosa's Bakery, the keys, shop #2
  { id: 7, a: 1545, b: TOTAL, light: "golden", place: "street" },                      // your first step
];
/** crossfades between shots */
export const XFADE: Record<number, number> = { 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 8 };
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
const O = (x: number, y: number, z: number): V3 => add(OFFICE, [x, y, z]);
const S = (x: number, y: number, z: number): V3 => add(STAGE, [x, y, z]);

const CAMS: Record<number, Key[]> = {
  1: [
    { f: 0, s: () => ({ pos: [7, 3.2, 30], look: [0, 3.6, 4], fov: 46 }) },
    { f: 2, dur: 176, s: () => ({ pos: [2.2, 2.0, 15.5], look: [0.6, 3.0, 4], fov: 46 }) },
  ],
  2: [
    { f: 175, s: (f) => dolly(O(1.0, 2.0, 5.0), O(0.2, 1.5, -0.6), pushK(f, 175, 0.0018), { fov: 44 }) },
    { f: BT.hours - 6, dur: 34, s: (f) => dolly(O(2.2, 2.4, 7.2), O(1.8, 1.6, -1.3), pushK(f, BT.hours + 28, 0.0012), { fov: 50 }) },
  ],
  3: [
    { f: 340, s: () => ({ pos: S(0, 3.4, 10.5), look: S(0, 2.0, 0), fov: 50 }) },
    { f: 350, dur: 50, s: () => ({ pos: S(0, 4.2, 13.0), look: S(0, 2.2, -0.6), fov: 50 }) },
    { f: BT.franchise - 6, dur: 30, s: (f) => dolly(S(-2.6, 3.4, 8.6), S(-3.6, 2.4, -1.8), pushK(f, BT.franchise + 24, 0.0008), { fov: 48 }) },
    { f: BT.royal - 10, dur: 34, s: () => ({ pos: S(-2.0, 5.2, 10.5), look: S(-4.8, 3.6, -4.2), fov: 50 }) },
    { f: BT.own - 6, dur: 30, s: (f) => dolly(S(2.6, 3.4, 8.6), S(3.6, 2.4, -1.8), pushK(f, BT.own + 24, 0.0008), { fov: 48 }) },
  ],
  4: [
    { f: 770, s: () => ({ pos: S(0, 4.8, 11.2), look: S(0, 1.6, -0.2), fov: 54 }) },
    { f: 780, dur: 120, s: () => ({ pos: S(0, 4.5, 10.4), look: S(0, 1.6, -0.2), fov: 54 }) },
    { f: BT.team - 6, dur: 40, s: () => ({ pos: S(0.8, 3.8, 10.8), look: S(0.4, 1.7, 0), fov: 56 }) },
  ],
  5: [
    { f: 1010, s: () => ({ pos: [16, 26, 44], look: [0, 3, 3], fov: 50 }) },
    { f: 1015, dur: 135, s: () => ({ pos: [10, 30, 48], look: [0, 3, 3], fov: 50 }) },
    { f: BT.small - 8, cut: true, s: (f) => dolly([4.4, 2.3, 16.5], [1.6, 1.7, 6.6], pushK(f, BT.small - 8, 0.0016), { fov: 44 }) },
  ],
  6: [
    { f: 1265, s: (f) => dolly([0.6, 2.4, 18.5], [0, 3.1, 4], pushK(f, 1265, 0.0012), { fov: 46 }) },
    { f: BT.bakery - 2, dur: 40, s: () => ({ pos: [0.4, 2.0, 21], look: [0, 3.6, 4], fov: 48 }) },
    { f: BT.shop2 - 16, dur: 42, s: () => ({ pos: [10.5, 2.4, 20], look: [14.5, 3.6, 4], fov: 48 }) },
  ],
  7: [
    { f: 1540, s: () => ({ pos: [1.6, 2.4, 13.5], look: [0.9, 2.5, 5], fov: 48 }) },
    { f: 1550, dur: 220, s: () => ({ pos: [1.4, 2.6, 16.0], look: [0.6, 3.0, 4.5], fov: 48 }) },
  ],
};
export const camAt = (id: number, f: number): Cam => run(CAMS[id], f);

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
export const DOF: Dof[] = [
  { f: 0, cInf: 2 },
  { f: 180, cInf: 7, focus: () => O(ROSA_O[0], 1.5, ROSA_O[2]) },
  { f: BT.hours - 6, dur: 30, cInf: 4 },
  { f: 345, cInf: 0 },
  { f: 1015, cInf: 0 },
  { f: BT.small - 8, cInf: 5, focus: () => [ROSA_STREET[0], 1.5, ROSA_STREET[2]] },
  { f: 1270, cInf: 3 },
  { f: 1545, cInf: 0 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

/** the bakery is open from the reveal on; shop #2 from its beat on */
export const bakeryOpen = (id: number, f: number) => id >= 7 || (id === 6 && f >= BT.bakery);
export const shop2Open = (id: number, f: number) => id >= 7 || (id === 6 && f >= BT.shop2 + 4);
export const closedNow = (id: number, f: number) => id >= 6 || (id === 5 && f >= BT.half + 8);
