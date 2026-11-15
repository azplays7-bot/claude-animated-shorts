// Timing and shared helpers for "The 9-5 Trap" (60 s, 30 fps, designed at 720x1280, rendered 1080x1920).
// All visual beats are tied to the measured narration (narration/timing.json), so picture and voice stay in sync.
import T from "../narration/timing.json";

export const FPS = 30;
export const TOTAL = 60 * FPS;

export type Chunk = { scene: number; start: number; end: number; text: string };
export const CHUNKS = T.chunks as Chunk[];
export const SENT = T.sentences as { scene: number; start: number; end: number }[];
const SP = T.scenes as unknown as Record<string, [number, number]>;
const snap = (x: number) => Math.round(x * FPS) / FPS;
/** scene windows: boundaries in the middle of the pause between scenes; the part cuts (scene 2|3 and 4|5) sit at exactly 20 s and 40 s */
export const SCN: [number, number][] = [1, 2, 3, 4, 5, 6].map((k) => {
  const b = (j: number) => (j === 2 ? 20 : j === 4 ? 40 : snap((SP[String(j)][1] + SP[String(j + 1)][0]) / 2));   // boundary after scene j
  return [k === 1 ? 0 : b(k - 1), k === 6 ? 60 : b(k)];
});
/** the three parts for editing: scenes 1-2, 3-4, 5-6 */
export const PARTS: [number, number][] = [[0, SCN[1][1]], [SCN[2][0], SCN[3][1]], [SCN[4][0], 60]];
export const sceneAt = (t: number) => { for (let i = 0; i < 6; i++) if (t < SCN[i][1]) return i + 1; return 6; };
/** start / end time of sentence i (0-based, script order) */
export const S = (i: number) => SENT[i].start;
export const E = (i: number) => SENT[i].end;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (u: number) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
export const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
export const easeIn = (u: number) => Math.pow(clamp(u), 3);
export const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const backOut = (u: number) => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
export const pulse = (t: number, at: number, len = 0.35) => (t < at || t > at + len ? 0 : Math.sin(Math.PI * (t - at) / len));
export const rng = (seed: number) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

// one palette for the whole video
export const COL = {
  sky: "#8fd0ff", grass: "#5cc46b", road: "#5b6170", night: "#0b1020",
  gold: "#ffc83d", orange: "#ff8a1f", green: "#2bd96b", money: "#3fae5a", red: "#ff4057", cyan: "#3fd8ff", purple: "#8b5cf6",
  white: "#f8fafc", skin: "#f2c09b", hoodie: "#14b8a6",   // the teen's teal hoodie, every scene
};
export const LOOKS = {
  dad: { hoodie: "#4f46e5", hair: "#3b2a1a", hairStyle: 1 as const, pants: "#374151" },
  mom: { hoodie: "#e11d48", hair: "#6b3a1a", hairStyle: 2 as const, pants: "#334155", skin: "#e8b08a" },
  kid: { hoodie: "#f59e0b", hair: "#2b1a10", hairStyle: 0 as const, pants: "#1e40af" },
  maya: { hoodie: "#d99a1e", collar: "#1f2a4d", badge: true, puff: true, hair: "#1a120c", hairStyle: 1 as const, pants: "#2a3350", skin: "#8d5a3b" },
  mayaOld: { hoodie: "#d99a1e", collar: "#1f2a4d", puff: true, hair: "#6f6a66", hairStyle: 1 as const, pants: "#2a3350", skin: "#875638" },
  worker: (i: number) => ({ hoodie: ["#5b4636", "#3f4a3a", "#4a4a55", "#6b4a3a", "#3a3f4f"][i % 5], hair: "#2a1d14", hairStyle: (i % 3) as 0 | 1 | 2, pants: ["#2f2a26", "#36322c", "#2a2e36"][i % 3], skin: ["#e0b08c", "#c48a62", "#f0c6a4", "#9c6a48"][i % 4], hat: i % 2 ? "#3b3a36" : undefined }),
  colleague: (i: number) => ({ hoodie: ["#3b82f6", "#64748b", "#0f766e", "#9333ea"][i % 4], hair: ["#111", "#5b3a1e", "#2b1a10", "#c08a4a"][i % 4], hairStyle: (i % 3) as 0 | 1 | 2, pants: "#1f2937", skin: ["#f2c09b", "#c98f68", "#e8b08a", "#7a4a30"][i % 4] }),
};
export const blink = (t: number, seed: number) => { const p = 2.3 + (seed % 5) * 0.37; const ph = (t + seed * 0.71) % p; return ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0; };
