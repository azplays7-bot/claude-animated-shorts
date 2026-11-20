// Where Max is, per shot and time (street / store-relative x, z). Shared by cast.ts (the card) and world.ts.
// Each key: [time s, x, z, facing x, facing z, walking?]; between keys the position glides (walking) or holds.
import { FPS, clamp01, WALK_Z } from "./story";

type K = [number, number, number, number, number, boolean];
const MAXK: Record<number, K[]> = {
  2: [[4.0, 27.5, WALK_Z, -1, 0, true], [8.4, 20.5, WALK_Z, -1, 0, false]],
  3: [[8.4, 20.5, WALK_Z, 0, 1, false], [22.7, 20.5, WALK_Z, -1, 0, true], [23.4, 13.5, WALK_Z, -1, 0, false]],
  4: [[23.8, 3, 9.8, 0, -1, true], [25.0, 3, 6.6, 0, -1, false],
      [26.6, -1.5, -2.45, 0, 1, false],
      [27.95, -1.5, 4.35, 0, 1, false],                 // sitting at his table from here
      [37.5, -1.5, 4.35, 1, 0, true], [38.5, 0.4, 6.5, 1, 0.6, true], [39.6, 3, 8.6, 0.4, 1, false]],
  5: [[44.6, 3, 9.3, 0, 1, true], [46.0, 3, 11.2, 0, 1, false], [48.2, 3, 11.2, 1, 0, true], [52.5, 6.3, WALK_Z, 1, 0, false],
      [55.3, 6.3, WALK_Z, 1, 0, true], [60.5, 12.5, WALK_Z, 1, 0, false]],
};
/** when Max is off screen */
const HIDE: Record<number, [number, number][]> = { 3: [[23.4, 99]], 4: [[39.6, 99]] };

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
/** Max sits at his table (shot 4) */
export const maxSits = (id: number, f: number) => id === 4 && f / FPS >= 27.95 && f / FPS < 37.5;
export { FPS };
