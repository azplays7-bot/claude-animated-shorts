// Timing, easing and shared data for "What if you invested $20 a month in Bitcoin?" (60 s, 30 fps, 720x1280).
// Everything is a pure function of time t (seconds), so any frame renders the same on its own.
import DATA from "./data.json";

export const FPS = 30;
export const TOTAL = 60 * FPS; // 1800 frames = exactly 60 s; clips are frames 0-599, 600-1199, 1200-1799

export type Pt = [number, number]; // [year as decimal, price USD]
export const CHART = DATA.chart as Pt[];
export const BUYS = DATA.buys as { m: string; p: number; btc: number }[];
export const RANGE = DATA.range;
export const DROPS = { DROP18: DATA.drops.d2018.pct, DROP22: DATA.drops.d2022.pct }; // daily closes, peak -> trough

// scene windows (seconds). Neighbouring scenes overlap by a frame or two at cuts.
export const SC = {
  bedroom: [0, 5.1],
  deposit: [5.1, 12.2],
  chart1: [12.2, 18.7],
  wallet: [18.7, 21.2],     // spans the clip 1 -> clip 2 cut (same image both sides)
  chart2: [21.2, 27.2],
  crash: [27.2, 34.2],
  rush: [34.2, 38.6],
  mystery: [38.6, 41.3],    // spans the clip 2 -> clip 3 cut
  vault: [41.3, 53.2],
  finale: [53.2, 60],
} as const;
export type SceneId = keyof typeof SC;
export const sceneAt = (t: number): SceneId => {
  for (const k of Object.keys(SC) as SceneId[]) if (t >= SC[k][0] && t < SC[k][1]) return k;
  return "finale";
};
export const local = (t: number, id: SceneId) => t - SC[id][0];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (u: number) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); }; // smootherstep
export const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
export const easeIn = (u: number) => Math.pow(clamp(u), 3);
export const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const backOut = (u: number) => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
export const pulse = (t: number, at: number, len = 0.35) => (t < at || t > at + len ? 0 : Math.sin(Math.PI * (t - at) / len));
export const rng = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/** price on the chart at a decimal year (linear between weekly points) */
export const priceAt = (y: number) => {
  if (y <= CHART[0][0]) return CHART[0][1];
  for (let i = 1; i < CHART.length; i++) if (CHART[i][0] >= y) {
    const [y0, p0] = CHART[i - 1], [y1, p1] = CHART[i];
    return p0 + (p1 - p0) * (y - y0) / (y1 - y0);
  }
  return CHART[CHART.length - 1][1];
};
/** largest close-to-close drop (fraction) between two decimal years, from the real weekly series */
export const maxDrop = (from: number, to: number) => {
  let peak = 0, worst = 0;
  for (const [y, p] of CHART) if (y >= from && y <= to) { peak = Math.max(peak, p); worst = Math.max(worst, 1 - p / peak); }
  return worst;
};

export const money = (v: number) => v >= 1000 ? "$" + Math.round(v).toLocaleString("en-US") : v >= 1 ? "$" + v.toFixed(2) : "$" + v.toFixed(2);
export const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

// palette: one visual identity for all three clips
export const COL = {
  night: "#070b18", navy: "#0d1630", gold: "#ffc23d", goldDeep: "#e08a00", orange: "#f7931a",
  green: "#2dff9a", red: "#ff3550", cyan: "#3fd8ff", white: "#f4f6ff", skin: "#f2c09b", hoodie: "#e8650a",
};
