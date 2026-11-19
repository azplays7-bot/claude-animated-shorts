// Where Max and his cart are, per shot and frame (store / street-relative x, z). Shared by cast.ts (the card) and
// world.ts (the 3D cart and what is in it). Each key: [time s, x, z, facing x, facing z, walking?]; between keys the
// position glides linearly (walking) or holds (standing).
import { FPS, BT, clamp01 } from "./story";

type K = [number, number, number, number, number, boolean];
const MAXK: Record<number, K[]> = {
  2: [[4.33, 8, 20.6, 0, 1, false], [5.35, 8.7, 23.0, -0.15, -1, true], [6.83, 8.05, 16.9, -0.15, -1, true]],
  3: [
    [6.83, 8, 15.6, 0, -1, true], [8.05, 7.5, 13.2, 0, -1, true],
    [8.06, 6.7, 11.5, -1, 0, false], [10.9, 5, 7.9, 0, 1, false], [12.35, 5, 7.9, 0, -1, false],
    [13.4, 5, 4.4, 0, -1, true], [15.0, 5, 1.0, 0, -1, true],
    [15.01, 5.0, -9.0, 1, -0.3, false],
    [16.4, 1, 2.0, 0, -1, true], [19.5, 1, -3.2, 0, -1, true],
    [19.51, 1.4, 9.1, -1, 0, false],
    [22.1, -3, 4.6, 0, -1, true], [23.9, -3, -1.6, 0, -1, true],
    [23.91, -4.9, -10.3, -0.6, -1, true], [25.0, -7, -12.9, 0, -1, true], [25.01, -7, -12.9, 0, -1, false],
    [27.1, -4.9, 11.0, 0, 1, false],
    [34.3, -4.9, 11.0, 0, 1, false],
    [48.85, -3, 3.4, 0, -1, true], [50.6, -3, 0.7, 0, -1, true], [52.4, -3, -2.2, 0, -1, true],
  ],
  4: [[52.25, 8, 20.4, 0, 1, false], [54.15, 8, 20.4, 0, -1, true], [54.6, 8, 16.6, 0, -1, true],
      [54.95, 8, 16.6, 0, 1, true], [55.6, 8.4, 20.6, 0, 1, true], [55.61, 8.4, 20.6, 0, 1, false]],
};
/** when Max is off screen (shot 3: the map, the bait close-up, the back room and the shelf close-ups have no Max) */
const HIDE: Record<number, [number, number][]> = { 3: [[34.3, 48.85]], 4: [[54.6, 54.95]] };

export type Pose = { x: number; z: number; dx: number; dz: number; walk: boolean; visible: boolean };
export const maxAt = (id: number, f: number): Pose => {
  const ks = MAXK[id], t = f / FPS;
  if (!ks || t < ks[0][0] || (HIDE[id] ?? []).some(([a, b]) => t >= a && t < b)) return { x: 0, z: 0, dx: 0, dz: 1, walk: false, visible: false };
  let i = 0; while (i + 1 < ks.length && t >= ks[i + 1][0]) i++;
  const a = ks[i], b = ks[i + 1];
  if (a[5] && b && b[0] - a[0] > 0.05) {
    const u = clamp01((t - a[0]) / (b[0] - a[0]));
    const dx = b[1] - a[1], dz = b[2] - a[2], n = Math.hypot(dx, dz) || 1;
    return { x: a[1] + dx * u, z: a[2] + dz * u, dx: dx / n, dz: dz / n, walk: true, visible: true };
  }
  return { x: a[1], z: a[2], dx: a[3], dz: a[4], walk: false, visible: true };
};

/** the cart: rides 1.05 m ahead of Max in shot 3 (beside him when he stands sideways to a counter) */
export type CartPose = { x: number; z: number; yaw: number; visible: boolean };
export const cartAt = (id: number, f: number): CartPose => {
  const m = maxAt(id, f), t = f / FPS;
  if (id !== 3 || !m.visible || (t >= 34.3 && t < 48.85)) return { x: 0, z: 0, yaw: 0, visible: false };
  let dx = m.dx, dz = m.dz;
  if (!m.walk && Math.abs(dx) > 0.5) { dx = 0; dz = -1; }        // facing a counter: the cart waits beside him
  if (t >= 10.9 && t < 13.4) { dx = 0.6; dz = -0.8; }          // "where's the milk?": cart parked at his side
  if (t >= 27.1 && t < 34.3) { dx = 0; dz = 1; }               // checkout: the cart waits in the lane ahead of him
  const n = Math.hypot(dx, dz) || 1;
  return { x: m.x + (dx / n) * 1.05, z: m.z + (dz / n) * 1.05, yaw: Math.atan2(-dx, -dz), visible: true }   // handle (local +z) toward Max;
};

/** what is in the cart at frame f: items land when their arc ends (arcs are drawn in cast.ts) */
export const CART_ITEMS: { at: number; kind: "bread" | "chips" | "cheese" | "cereal" | "soda" | "pile" | "milk" | "candy" }[] = [
  { at: BT.cart + 4, kind: "bread" }, { at: BT.chips + 14, kind: "chips" }, { at: BT.sample + 30, kind: "cheese" },
  { at: BT.cereal + 18, kind: "cereal" }, { at: BT.twofor + 14, kind: "soda" }, { at: BT.twofor + 22, kind: "soda" },
  { at: BT.heavier - 30, kind: "pile" }, { at: BT.milk + 10, kind: "milk" }, { at: BT.candy + 14, kind: "candy" },
];
export const itemsAt = (f: number) => CART_ITEMS.filter((c) => f >= c.at);
export { FPS };
