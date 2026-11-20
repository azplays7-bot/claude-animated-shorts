// Where Ronaldo is, per shot and time (stadium / house-relative x, z). Shared by cast.ts (the card) and world.ts.
// Each key: [time s, x, z, facing x, facing z, moving?]; between keys the position glides (moving) or holds.
import { FPS, clamp01, unwarp } from "./story";

type K = [number, number, number, number, number, boolean];
const CRK: Record<number, K[]> = {
  1: [[0, 0, 0, 0, 1, false], [7.3, 0, 0, 1, 0, true], [9.55, 20, 0, 1, 0, false], [9.7, 20, 0, 0, 1, false]],
  2: [[11.0, -11.7, -3.05, 0, 1, false], [11.75, -9.7, -2.0, 0, 1, false], [14.55, -11.7, -3.05, 0, 1, false],
      [17.25, -4.0, -0.95, 0, 1, false], [19.6, 4.0, -2.95, 0, 1, false]],
  3: [[25.55, 14, 4, 0, 1, false], [26.35, 11, 4, 1, 0, true], [26.8, 22, 4, 1, 0, false], [26.8, 24, 8, 0, 1, false],
      [27.35, 41, 0, 1, 0, false], [31.55, 46.2, 0.6, 0, 1, false]],
  4: [[36.95, 12, -2.05, 0, 1, false]],
  5: [[41.95, 41, 0, 1, 0, false], [43.2, 42, 0, 0, 1, false]],
  7: [[53.85, 42, 0, 0, 1, false]],
};
export type Mode = "stand" | "walk" | "sit" | "lie" | "jump";
export type Pose = { x: number; z: number; dx: number; dz: number; mode: Mode; y: number; visible: boolean };
/** jump arc: height (m) of the card origin, takeoff a, apex hold [b, c], landing d (seconds) */
const arc = (t: number, a: number, b: number, c: number, d: number, h: number) =>
  t < a || t > d ? 0 : t < b ? h * Math.sin((Math.PI / 2) * (t - a) / (b - a)) : t < c ? h : h * Math.cos((Math.PI / 2) * (t - c) / (d - c));
export const crAt = (id: number, f: number): Pose => {
  const ks = CRK[id], t = unwarp(f / FPS); // keys are in pre-warp seconds
  if (!ks || t < ks[0][0]) return { x: 0, z: 0, dx: 0, dz: 1, mode: "stand", y: 0, visible: false };
  let i = 0; while (i + 1 < ks.length && t >= ks[i + 1][0]) i++;
  const a = ks[i], b = ks[i + 1];
  let x = a[1], z = a[2], dx = a[3], dz = a[4], mode: Mode = "stand";
  if (a[5] && b && b[0] - a[0] > 0.05) {
    const u = clamp01((t - a[0]) / (b[0] - a[0])), ddx = b[1] - a[1], ddz = b[2] - a[2], n = Math.hypot(ddx, ddz) || 1;
    x = a[1] + ddx * u; z = a[2] + ddz * u; dx = ddx / n; dz = ddz / n; mode = "walk";
  }
  let y = 0;
  if (id === 2) mode = t < 11.75 || (t >= 14.55 && t < 17.25) ? "lie" : t >= 17.25 ? "sit" : "stand";
  if (id === 4) mode = "stand"; // in the tub, under the ice-cold shower
  if (id === 3 && t >= 31.55) { y = arc(t, 33.0, 33.7, 35.2, 35.75, 0.95); if (y > 0.02) mode = "jump"; }
  if (id === 7) { y = arc(t, 55.0, 55.45, 55.75, 56.1, 0.8); if (y > 0.02) mode = "jump"; }
  if (id === 5 && t >= 44.65 && t < 46.45) { y = arc(t, 44.75, 45.05, 45.15, 45.45, 0.45); if (y > 0.02) mode = "jump"; }
  return { x, z, dx, dz, mode, y, visible: true };
};
export { FPS };
