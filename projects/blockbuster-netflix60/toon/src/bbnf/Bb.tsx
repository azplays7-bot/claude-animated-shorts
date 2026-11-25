// "Blockbuster vs Netflix: the $50 million no", one 60 s short in the reference style (long gliding shots, close
// framing, 2-4 reacting characters, rim light, glowing screens). 60 fps. Cartoon caricatures; companies named in plain
// text, no logos. Facts and sources in projects/blockbuster-netflix60/README.md.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armPts, CharSpec } from "../look/char";
import { World, SETS, SetName, screenTex, streamTex, signTex, Line } from "./sets";
import WORDS from "./words.json";
import TIMING from "./timing.json";

export const BB_FPS = 60;
export const BB_FRAMES = 60 * BB_FPS;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------------------------------------------------------------- cast
const P = (o: Partial<CharSpec>): CharSpec => ({ skin: "#f1c7a2", shirt: "#2a2a34", cap: "#000", capLogo: "#000", hair: "#2a1a12", bodyR: 0.21, bodyLen: 0.3, headR: 0.27, legLen: 0.64, hat: "none", shortHair: true, ...o });
const CAST: Record<string, CharSpec> = {
  boss: P({ skin: "#f1c7a2", hair: "#8a8a8e", shirt: "#1d2a5a", coat: "#1d2a5a", scarf: "#ffd23a", bodyR: 0.23 }),
  reed: P({ skin: "#f1c7a2", hair: "#2a1a12", shirt: "#18181c" }),
  marc: P({ skin: "#f3d1b0", hair: "#6a5a4a", beard: "#6a5a4a", shirt: "#b8232c", glasses: "#1a1a1a" }),
  clerk: P({ skin: "#a8714f", hair: "#121010", shirt: "#1d3a9a", tag: "STAFF" }),
  cust1: P({ skin: "#e8b58f", hair: "#3a2416", hairStyle: "bun", shortHair: false, shirt: "#2a8a6a", bodyR: 0.19 }),
  cust2: P({ skin: "#7a4a2e", hair: "#121010", shirt: "#ff8a20", hat: "cap", cap: "#2a2a30", capLogo: "#ffffff" }),
  cust3: P({ skin: "#f1c7a2", hair: "#c8a060", shirt: "#6a3a8a" }),
  ex1: P({ skin: "#e8b58f", hair: "#3a2a1a", shirt: "#24242c", coat: "#24242c" }),
  ex2: P({ skin: "#c99470", hair: "#121010", shirt: "#2a2a34", coat: "#2a2a34", glasses: "#1a1a1a" }),
  ex3: P({ skin: "#f1c7a2", hair: "#9a9a9a", shirt: "#30303a", coat: "#30303a", bodyR: 0.23 }),
  mom: P({ skin: "#d9a47e", hair: "#2a1a12", hairStyle: "bun", shortHair: false, shirt: "#3a6ac8", bodyR: 0.19 }),
  dad: P({ skin: "#d9a47e", hair: "#16110e", beard: "#16110e", shirt: "#4a4a52" }),
  kid: P({ skin: "#d9a47e", hair: "#16110e", shirt: "#ffb020", bodyR: 0.16, headR: 0.24, legLen: 0.42, bodyLen: 0.22 }),
  anchor: P({ skin: "#e8b58f", hair: "#3a2416", hairStyle: "bun", shortHair: false, shirt: "#b8232c", bodyR: 0.19 }),
  tour1: P({ skin: "#f3d1b0", hair: "#5a3a20", shirt: "#2a6a9a", hat: "cap", cap: "#d8262e", capLogo: "#ffffff" }),
  tour2: P({ skin: "#a8714f", hair: "#121010", hairStyle: "bun", shortHair: false, shirt: "#e85a8a", bodyR: 0.19 }),
};

// ---------------------------------------------------------------- acting
// ---------------------------------------------------------------- acting
type Arm = ArmName | "guard" | "phone" | "ear" | "heart" | "behind" | "fist" | "grab" | THREE.Vector3;
type Key = { t: number; L?: Arm; R?: Arm; mouth?: Mouth; yaw?: number; pitch?: number; brow?: number };
const reach = (c: Toon, target: THREE.Vector3, sx: number) => {          // target in WORLD space
  c.root.updateMatrixWorld(true);
  const loc = c.root.worldToLocal(target.clone()), sh = V(sx * c.spec.bodyR * 0.92, c.shoulderY, 0);
  const d = loc.clone().sub(sh); if (d.length() > 0.62) loc.copy(sh).addScaledVector(d.normalize(), 0.62);
  const el = sh.clone().lerp(loc, 0.5).add(V(sx * 0.08, -0.07, 0));
  return [el, loc];
};
const armAt = (c: Toon, a: Arm, sx: number, t: number): THREE.Vector3[] => {
  if (a instanceof THREE.Vector3) return reach(c, a, sx);
  const R = c.spec.bodyR, sh = c.shoulderY, hy = c.head.position.y, hr = c.spec.headR;
  switch (a) {
    case "guard": return [V(sx * (R + 0.08), sh - 0.12, 0.2), V(sx * 0.12, hy - hr * 0.4 + 0.02 * Math.sin(t * 5 + sx), hr + 0.2)];
    case "fist": return [V(sx * (R + 0.1), sh, 0.12), V(sx * (R + 0.06), sh + 0.36 + 0.03 * Math.sin(t * 9), 0.1)];
    case "phone": return [V(sx * (R + 0.06), sh - 0.16, 0.18), V(sx * 0.08, sh + 0.02, R + 0.26)];
    case "ear": return [V(sx * (R + 0.12), sh - 0.08, 0.06), V(sx * (hr + 0.05), hy - 0.02, 0.05)];
    case "heart": return [V(sx * (R + 0.08), sh - 0.14, 0.14), V(sx * 0.06, sh - 0.06, R + 0.06)];
    case "behind": return [V(sx * (R + 0.06), sh - 0.18, -0.12), V(sx * 0.06, sh - 0.3, -R - 0.1)];
    case "grab": return [V(sx * (R + 0.08), sh - 0.02, 0.24), V(sx * 0.16, sh + 0.05 + 0.04 * Math.sin(t * 11 + sx), R + 0.42)];
    default: return armPts(c, a, sx, t);
  }
};
type Opt = { walk?: number; still?: boolean };
const track = (c: Toon, t: number, keys: Key[], o: Opt = {}) => {
  let k = 0; while (k + 1 < keys.length && t >= keys[k + 1].t) k++;
  const cur = keys[k], prev = keys[Math.max(0, k - 1)], u = k === 0 ? 1 : ss(cur.t, cur.t + 0.3, t);
  const L = (n?: Arm) => n ?? "rest";
  const num = (a: number | undefined, b: number | undefined, d = 0) => (a ?? d) + ((b ?? d) - (a ?? d)) * u;
  if (o.walk === undefined && !o.still) { c.root.rotation.y += 0.06 * Math.sin(t * 1.1 + c.spec.headR * 33); c.root.rotation.z += 0.02 * Math.sin(t * 1.7 + c.spec.bodyR * 21); }
  const mix = (a: Arm, b: Arm, sx: number) => { const A = armAt(c, a, sx, t), B = armAt(c, b, sx, t); return A.map((v, i) => v.clone().lerp(B[i], u)); };
  const blinkT = [1.1, 3.7].reduce((b, x) => { const d = Math.abs(((t - x + c.spec.headR * 7) % 4.4 + 4.4) % 4.4); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.4 - d) / 0.08)); }, 0);
  c.pose({
    blink: blinkT, mouth: (u < 0.5 ? prev.mouth : cur.mouth) ?? "flat", brow: num(prev.brow, cur.brow, 0.3),
    headYaw: num(prev.yaw, cur.yaw) + 0.08 * Math.sin(t * 0.9 + c.spec.headR * 50), headPitch: num(prev.pitch, cur.pitch) + 0.035 * Math.sin(t * 1.3 + c.spec.bodyR * 30),
    armL: mix(L(prev.L), L(cur.L), -1), armR: mix(L(prev.R), L(cur.R), 1),
    bob: Math.sin(t * 2.2 + c.spec.headR * 40) * 0.012 + (o.walk !== undefined ? Math.abs(Math.sin(o.walk)) * 0.03 : 0), walk: o.walk,
  });
};


// ---------------------------------------------------------------- shots
type CK = [number, THREE.Vector3, THREE.Vector3, number];
type Ctx = { t: number; W: World; C: Record<string, Toon>; O: THREE.Vector3; place: (k: string, x: number, z: number, ry: number, y?: number) => Toon;
  hold: (c: Toon, k: number, obj: THREE.Object3D) => void; seat: (c: Toon, y: number) => void; head: (k: string) => THREE.Vector3; cam: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } };
type Shot = { a: number; b: number; set: SetName; keys: CK[]; act: (x: Ctx) => void };
const S = (k: number) => (k <= 1 ? 0 : (TIMING as { scenes: Record<string, number[]> }).scenes[String(k)][0] - 0.35);
const w = (text: string, n = 0) => (WORDS as { start: number; text: string }[]).filter((x) => x.text.replace(/[^A-Z0-9]/g, "") === text)[n].start;
const pick = <T,>(t: number, list: [number, T][]) => { let r = list[0][1]; for (const [a, v] of list) if (t >= a) r = v; return r; };
const WB = (lines: Line[]) => screenTex(lines, 1024, 576, ["#ffffff", "#eeeeea"], "#d8262e");
const RED = "#ff4a4a", YEL = "#ffd23a";

const SHOTS: Shot[] = [
  // 1. the offer, staged as a counter scene: the founders hold out a red mailer, the boss says no
  { a: 0, b: S(2), set: "store", keys: [[0, V(-1.6, 2.0, 3.6), V(3.2, 1.6, -2.8), 48], [0.45, V(1.0, 1.9, 1.0), V(3.4, 1.7, -3.0), 46], [1, V(3.4, 1.75, 2.5), V(3.4, 1.55, -2.6), 46]],
    act: ({ t, place, W, hold }) => {
      W.fee.emissiveMap = screenTex(pick(t, [[0, [["2000", 90, "#ffffff"], ["NETFLIX FOR SALE", 100, RED], ["$50,000,000", 120, YEL]]], [w("NO") - 0.1, [["NO.", 300, RED]]]]) as Line[]);
      W.cash.count = 0;
      const no = t > w("NO") - 0.15;
      track(place("boss", 3.4, -2.15, 0), t, [{ t: 0, L: "counter", R: "counter", mouth: "smile", yaw: 0.2 }, { t: 3.2, L: "hip", R: "counter", mouth: "flat", brow: 1, yaw: 0.25 }, { t: w("NO") - 0.15, L: "hip", R: "hip", mouth: "talk", brow: 1, yaw: no ? 0.4 * Math.sin(t * 10) * (1 - ss(w("NO") + 0.9, w("NO") + 1.3, t)) : 0 }], { still: true });
      const r = place("reed", 2.75, -0.55, Math.PI + 0.5);
      track(r, t, [{ t: 0, L: "rest", R: V(3.05, 1.15, -1.1).add(SETS.store), mouth: "smile" }, { t: w("NO") + 0.1, L: "rest", R: "rest", mouth: "o", brow: 1 }]); if (t < w("NO") + 0.1) hold(r, 1, W.envelope);
      track(place("marc", 4.05, -0.55, Math.PI - 0.5), t, [{ t: 0, L: "rest", R: "wave", mouth: "grin" }, { t: 2.0, L: "rest", R: "point", mouth: "talk" }, { t: w("NO") + 0.1, L: "shrug", R: "shrug", mouth: "o", brow: 1 }]);
    } },
  // 2. the store in its prime: browsing, then the late-fee board and the growing pile of cash
  { a: S(2), b: S(3), set: "store", keys: [[0, V(-1.9, 1.55, 2.6), V(-1.9, 1.25, -3.5), 46], [0.3, V(-1.6, 1.6, 0.9), V(-1.9, 1.2, -3.5), 46], [0.5, V(0.6, 1.75, 1.6), V(3.6, 1.7, -3.0), 48], [0.75, V(1.3, 1.9, 1.3), V(3.6, 2.1, -5.5), 48], [1, V(1.9, 1.75, 0.9), V(3.7, 1.5, -2.2), 46]],
    act: ({ t, place, W, hold }) => {
      const m8 = w("800MILLION");
      W.fee.emissiveMap = screenTex(pick(t, [[0, [["FRIDAY NIGHT", 100, "#ffffff"], ["NEW RELEASES", 110, YEL]]], [w("THOUSANDS") - 0.1, [["THOUSANDS", 130, "#ffffff"], ["OF STORES", 110, YEL]]], [m8 - 0.15, [["LATE FEES · 2000", 80, "#ffffff"], ["$800,000,000", 140, YEL]]]]) as Line[]);
      W.cash.count = Math.round(160 * ss(m8 - 0.2, 14.3, t));
      const c1 = place("cust1", -1.95, -2.2 + 0.25 * Math.sin(t * 0.6), -Math.PI / 2 + 0.3);
      track(c1, t, [{ t: 0, L: "rest", R: V(-2.6, 1.15, -2.3).add(SETS.store), mouth: "smile", yaw: -0.3 }, { t: 8.0, L: "rest", R: "hold", mouth: "grin", yaw: 0.4 }], { still: true }); if (t > 8.0) hold(c1, 1, W.tape);
      track(place("cust2", -1.75, -3.6, Math.PI / 2 - 0.2), t, [{ t: 0, L: "hold", R: "rest", mouth: "flat", pitch: 0.2 }, { t: 9.0, L: "hold", R: "point", mouth: "talk" }]); hold(C_.cust2, 0, W.box);
      track(place("clerk", 3.4, -2.15, 0), t, [{ t: 0, L: "counter", R: "counter", mouth: "smile" }, { t: m8 - 0.2, L: "counter", R: V(3.2, 1.2, -1.1).add(SETS.store), mouth: "talk" }]);
      track(place("cust3", 3.2, -0.45, Math.PI), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat" }, { t: m8, L: "rest", R: V(3.25, 1.18, -1.0).add(SETS.store), mouth: "o", brow: 1 }, { t: w("LATE") + 0.2, L: "shrug", R: "shrug", mouth: "dazed", brow: 1 }]);
    } },
  // 3. the start-up: two founders, a laptop, a whiteboard and a stream of red mailers
  { a: S(3), b: S(4), set: "garage", keys: [[0, V(0.5, 2.0, 2.8), V(0.4, 1.6, -3.0), 48], [0.5, V(0.35, 1.75, 1.7), V(0.35, 1.5, -2.5), 46], [1, V(0.3, 1.6, 1.0), V(0.3, 1.4, -2.0), 46]],
    act: ({ t, place, W, hold }) => {
      W.wb.emissiveMap = W.wb.map = pick(t, [[0, WB([["NETFLIX", 150, "#d8262e"], ["EST. 1997", 80, "#1a1a1a"], ["DVDs BY MAIL", 80, "#1a1a1a"]])], [w("FOUNDERS") - 0.1, WB([["REED HASTINGS", 90, "#1a1a1a"], ["+", 70, "#d8262e"], ["MARC RANDOLPH", 90, "#1a1a1a"]])], [w("LOSING") - 0.1, WB([["LOSING MONEY", 120, "#d8262e"], ["FAST", 110, "#1a1a1a"]])]]);
      W.laptop.emissiveMap = screenTex([["ORDERS", 120, "#ffffff"], ["DVD · DVD · DVD", 70, RED]]);
      const lose = t > w("LOSING") - 0.2;
      const r = place("reed", -0.4, -1.55, 0.5);
      track(r, t, [{ t: 0, L: "rest", R: "hold", mouth: "talk", yaw: 0.3 }, { t: 19.6, L: "point", R: "hold", mouth: "talk", yaw: 0.6 }, { t: w("LOSING") - 0.2, L: "ear", R: "hold", mouth: "o", brow: 1, yaw: 0 }]); if (!lose) hold(r, 1, W.envelope);
      const m = place("marc", 0.95, -1.5, -0.5);
      track(m, t, [{ t: 0, L: "hold", R: "rest", mouth: "smile", yaw: -0.3 }, { t: 17.6, L: "hold", R: "wave", mouth: "grin" }, { t: w("LOSING") - 0.2, L: "shrug", R: "shrug", mouth: "dazed", brow: 1 }]); if (!lose) hold(m, 0, W.envelope);
      // mailers flying from the desk pile into the outgoing bin
      const from = V(-1.75, 0.95, -2.4), to = V(2.6, 0.55, -1.4);
      W.envs.forEach((e, k) => { const ph = (t - 14.8) * 0.9 - k * 0.42; const u = ph - Math.floor(ph); e.visible = ph > 0 && t < w("LOSING") + 0.6; e.position.copy(from).lerp(to, u); e.position.y += Math.sin(Math.PI * u) * 1.4; e.rotation.set(u * 6, u * 3 + k, 0.3); });
    } },
  // 4a. Dallas: the pitch
  { a: S(4), b: w("BLOCKBUSTERS") - 0.25, set: "board", keys: [[0, V(0.5, 2.3, 4.6), V(0, 1.7, -3.4), 48], [1, V(0.25, 1.95, 3.5), V(0, 1.6, -3.4), 46]],
    act: ({ t, place, seat, W }) => {
      W.pitch.emissiveMap = screenTex(pick(t, [[0, [["DALLAS · 2000", 90, "#ffffff"], ["NETFLIX", 140, RED]]], [w("OFFERED") - 0.1, [["OFFER", 90, "#ffffff"], ["NETFLIX", 110, RED], ["FOR $50 MILLION", 100, YEL]]]]) as Line[]);
      boardroom(t, place, seat, false);
    } },
  // 4b. the boss says no, then struggles not to laugh
  { a: w("BLOCKBUSTERS") - 0.25, b: S(5), set: "board", keys: [[0, V(0.55, 1.55, 0.9), V(0, 1.35, 2.6), 42], [0.6, V(0.4, 1.5, 1.2), V(0, 1.35, 2.6), 40], [1, V(-0.5, 1.7, 0.6), V(0.1, 1.35, 2.4), 44]],
    act: ({ t, place, seat, W }) => {
      W.pitch.emissiveMap = screenTex([["OFFER", 90, "#ffffff"], ["NETFLIX", 110, RED], ["FOR $50 MILLION", 100, YEL]]);
      boardroom(t, place, seat, true);
    } },
  // 5. monthly plan, no late fees, then streaming (2007)
  { a: S(5), b: S(6), set: "living", keys: [[0, V(1.1, 2.45, 4.6), V(0, 1.25, -2.4), 46], [0.4, V(0.7, 2.3, 4.0), V(0, 1.3, -2.4), 44], [0.64, V(0.6, 2.25, 3.9), V(0, 1.3, -2.4), 44], [0.76, V(1.0, 1.45, -0.5), V(0, 1.0, 1.9), 48], [1, V(0.8, 1.4, -0.3), V(0, 1.0, 1.9), 48]],
    act: ({ t, place, seat, W }) => {
      W.livetv.emissiveMap = pick(t, [[0, screenTex([["MONTHLY PLAN", 120, "#ffffff"], ["NO LATE FEES", 110, YEL]], 1024, 576, ["#140608", "#2a0a0e"])], [w("2007") - 0.15, streamTex("STREAMING", "2007")]]);
      const cheer = t > w("STREAMING") - 0.1;
      for (const [k, x] of [["mom", -0.65], ["kid", 0], ["dad", 0.65]] as const) {
        const c = place(k, x, 1.95, Math.PI); seat(c, 0.52);
        track(c, t, [{ t: 0, L: "rest", R: "rest", mouth: "smile", pitch: 0.05 }, { t: w("NO", 2), L: "rest", R: k === "kid" ? "point" : "rest", mouth: "grin" }, { t: w("STREAMING") - 0.1, L: cheer ? "cheer" : "rest", R: "cheer", mouth: "laugh" }], { still: true }); seat(c, 0.52);
      }
    } },
  // 6a. the peak: a bright store front, 2004
  { a: S(6), b: w("BUT") - 0.3, set: "front", keys: [[0, V(-2.4, 1.5, 7.0), V(0, 2.7, -4), 46], [1, V(1.2, 1.7, 4.6), V(0, 2.5, -4), 46]],
    act: ({ t, place, W }) => {
      W.frontSign.emissiveMap = signTex("BLOCKBUSTER", "VIDEO");
      W.banner.emissiveMap = pick(t, [[0, signTex("OPEN LATE", "", "#ffffff", "#d8262e", 1024, 256)], [w("2004") - 0.1, signTex("2004", "", "#ffffff", "#d8262e", 1024, 256)], [w("9000") - 0.1, signTex("9,000+ STORES", "", "#ffffff", "#d8262e", 1024, 256)]]);
      const u = Math.min(1, (t - S(6)) / 4.0);
      track(place("cust1", lerp(-3.4, -0.6, u), -2.2, Math.PI / 2 + 0.6), t, [{ t: 0, L: "rest", R: "rest", mouth: "smile" }], { walk: t * 6 });
      track(place("cust2", lerp(3.6, 0.7, u), -1.9, -Math.PI / 2 - 0.6), t, [{ t: 0, L: "rest", R: "hold", mouth: "talk" }], { walk: t * 6 + 1 });
      track(place("cust3", lerp(-4.6, -1.6, u), -1.4, Math.PI / 2 + 0.3), t, [{ t: 0, L: "rest", R: "wave", mouth: "grin" }], { walk: t * 6 + 2 });
    } },
  // 6b. customers moved online: the lights go out, the clerk carries out a box
  { a: w("BUT") - 0.3, b: w("2010") - 0.35, set: "front", keys: [[0, V(1.4, 1.5, 2.6), V(0, 1.6, -3.0), 46], [1, V(0.9, 1.45, 1.8), V(0, 1.4, -2.8), 44]],
    act: ({ t, place, W, hold }) => {
      const dim = 1 - ss(w("MOVED") - 0.2, w("ONLINE") + 0.3, t);
      W.winM.emissiveIntensity = lerp(0.08, 1.0, dim); W.frontLights.forEach((l) => (l.intensity *= lerp(0.1, 1, dim)));
      W.banner.emissiveMap = signTex("STORE CLOSING", "", "#ffffff", "#d8262e", 1024, 256);
      const c = place("clerk", lerp(0.0, 1.3, ss(w("BUT"), w("2010"), t)), -2.9, 0.4); track(c, t, [{ t: 0, L: "hold", R: "hold", mouth: "flat", brow: 1, pitch: 0.25 }], { walk: t * 5 }); hold(c, 0, W.box);
    } },
  // 6c. the news: bankrupt
  { a: w("2010") - 0.35, b: S(7), set: "studio", keys: [[0, V(-1.0, 1.5, 1.2), V(0, 1.7, -3.6), 50], [1, V(0.3, 1.7, 0.6), V(0, 2.3, -5.4), 50]],
    act: ({ t, place, W }) => {
      W.tv.emissiveMap = screenTex([["BLOCKBUSTER", 120, "#ffffff"], ["BANKRUPT", 150, RED], ["2010", 90, YEL]]);
      track(place("anchor", 0, -3.25, 0), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", yaw: -0.3 }, { t: 46.8, L: "shrug", R: "rest", mouth: "talk", yaw: 0.3 }]);
    } },
  // 7a. Netflix today: the founders on the couch
  { a: S(7), b: w("AND", 4) - 0.3, set: "living", keys: [[0, V(1.1, 2.45, 4.6), V(0, 1.3, -2.4), 46], [0.5, V(0.9, 1.5, -0.6), V(0, 1.0, 1.9), 48], [1, V(0.6, 1.45, -0.3), V(0, 1.0, 1.9), 46]],
    act: ({ t, place, seat, W }) => {
      W.livetv.emissiveMap = screenTex(pick(t, [[0, [["NETFLIX", 130, RED], ["TODAY", 80, "#ffffff"]]], [w("HUNDREDS") - 0.1, [["NETFLIX", 110, RED], ["WORTH", 70, "#ffffff"], ["$ HUNDREDS OF BILLIONS", 76, YEL]]]]) as Line[], 1024, 576, ["#140608", "#2a0a0e"]);
      for (const [k, x] of [["reed", -0.45], ["marc", 0.45]] as const) { const c = place(k, x, 1.95, Math.PI); seat(c, 0.52); track(c, t, [{ t: 0, L: "rest", R: "rest", mouth: "smile" }, { t: w("BILLIONS"), L: k === "reed" ? "cheer" : "rest", R: "cheer", mouth: "laugh" }], { still: true }); seat(c, 0.52); }
    } },
  // 7b. the last store: Bend, Oregon
  { a: w("AND", 4) - 0.3, b: 60, set: "front", keys: [[0, V(0.6, 1.6, 2.2), V(0, 1.9, -4.0), 46], [0.35, V(0.3, 2.0, 5.0), V(0, 2.5, -4.0), 48], [0.7, V(0, 3.0, 10.5), V(0, 2.6, -4.0), 50], [1, V(0, 3.3, 11.5), V(0, 2.7, -4.0), 50]],
    act: ({ t, place, W, hold }) => {
      W.pines.visible = true; W.frontSign.emissiveMap = signTex("BLOCKBUSTER", "VIDEO");
      W.banner.emissiveMap = pick(t, [[0, signTex("THE LAST ONE", "BEND, OREGON", "#ffffff", "#d8262e", 1024, 256)], [w("BE") - 0.1, signTex("BE KIND", "REWIND", "#ffffff", "#d8262e", 1024, 256)]]);
      const c = place("clerk", 1.25, -3.35, -0.2); track(c, t, [{ t: 0, L: "rest", R: "wave", mouth: "smile" }, { t: w("BE"), L: "wave", R: "wave", mouth: "grin" }]);
      const a = place("tour1", -0.9, -0.4, Math.PI - 0.2); track(a, t, [{ t: 0, L: "rest", R: "phone", mouth: "grin", pitch: -0.2 }]); hold(a, 1, W.phone1);
      track(place("tour2", -1.75, 0.1, Math.PI + 0.3), t, [{ t: 0, L: "point", R: "rest", mouth: "laugh", pitch: -0.2 }, { t: w("BE"), L: "cheer", R: "cheer", mouth: "laugh" }]);
    } },
];
/** the boardroom: founders by the screen, three execs seated, the boss at the head of the table */
function boardroom(t: number, place: Ctx["place"], seat: Ctx["seat"], close: boolean) {
  const no = w("NO", 1), laugh = w("RANDOLPH", 1) - 0.1;
  track(place("reed", -1.0, -3.3, 0.15), t, [{ t: 0, L: "rest", R: "point", mouth: "talk" }, { t: w("OFFERED"), L: "shrug", R: "shrug", mouth: "talk" }, { t: no, L: "rest", R: "rest", mouth: "o", brow: 1 }]);
  track(place("marc", 1.0, -3.3, -0.15), t, [{ t: 0, L: "rest", R: "rest", mouth: "smile" }, { t: w("50MILLION", 1), L: "rest", R: "point", mouth: "grin" }, { t: no, L: "rest", R: "rest", mouth: "flat", brow: 1 }]);
  const exs: [string, number, number][] = [["ex1", -1.15, -0.6], ["ex2", 1.15, -0.6], ["ex3", 1.15, 0.6]];
  for (const [k, x, z] of exs) { const c = place(k, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2); seat(c, 0.55); const mouth: Mouth = t > laugh ? "grin" : "flat"; track(c, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", yaw: x < 0 ? -0.9 : 0.9 }, { t: no, L: "rest", R: "rest", mouth: "flat", yaw: 0 }, { t: laugh, L: "rest", R: "heart", mouth, yaw: x < 0 ? 0.5 : -0.5 }], { still: true }); seat(c, 0.55); }
  const b = place("boss", 0, 2.65, Math.PI); seat(b, 0.55);
  const mouthPt = head("boss").add(V(0, -0.12, -0.22));
  const shake = t > no - 0.1 && t < no + 1.0 ? 0.45 * Math.sin(t * 11) : 0;
  track(b, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", yaw: 0, pitch: -0.1 }, { t: no - 0.1, L: "rest", R: "rest", mouth: "talk", brow: 1, yaw: shake }, { t: no + 1.0, L: "hip", R: "rest", mouth: "flat", brow: 1 }, { t: laugh, L: "rest", R: mouthPt, mouth: "grin", brow: 0, pitch: 0.15 + 0.06 * Math.sin(t * 18) }], { still: true });
  seat(b, 0.55);
  void close;
}
let C_: Record<string, Toon> = {};
let head: (k: string) => THREE.Vector3 = () => new THREE.Vector3();

const shotCam = (s: Shot, t: number, cv: Map<Shot, { p: THREE.CatmullRomCurve3; l: THREE.CatmullRomCurve3 }>) => {
  if (!cv.has(s)) { const ext = (i: number) => s.keys.map((k) => k[i] as THREE.Vector3); cv.set(s, { p: new THREE.CatmullRomCurve3(ext(1), false, "centripetal"), l: new THREE.CatmullRomCurve3(ext(2), false, "centripetal") }); }
  const c = cv.get(s)!, K = s.keys;
  const g = Math.min(1, Math.max(0, (t - s.a) / (s.b - s.a))), w = g * g * (3 - 2 * g) * 0.08 + g * 0.92;
  let i = 0; while (i + 2 < K.length && w >= K[i + 1][0]) i++;
  const fr = Math.min(1, Math.max(0, (w - K[i][0]) / (K[i + 1][0] - K[i][0]))), u = (i + fr) / (K.length - 1);
  const o = SETS[s.set];
  return { pos: c.p.getPoint(u).add(o), look: c.l.getPoint(u).add(o), fov: K[i][3] + (K[i + 1][3] - K[i][3]) * fr };
};

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const S = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.35;
    scene.background = new THREE.Color("#07080d");
    const W = new World(); scene.add(W.root);
    const C: Record<string, Toon> = {}; for (const k of Object.keys(CAST)) C[k] = new Toon(W.root, CAST[k], 0, 0, 0);
    const rim = new THREE.DirectionalLight("#7fb6ff", 2.6), rim2 = new THREE.DirectionalLight("#ff9a5a", 1.6); scene.add(rim, rim.target, rim2, rim2.target);
    return { W, C, rim, rim2, curves: new Map() };
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.5, distanceFalloff: 1.0, intensity: 2.0, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.9, luminanceThreshold: 1.1, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.7 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.55, offset: 0.28 })));
    composer.setSize(size.width, size.height);
    return { composer };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = SHOTS.find((x) => t >= x.a && t < x.b) ?? SHOTS[SHOTS.length - 1];
  const { W, C } = S; const O = SETS[s.set]; C_ = C;
  W.show(s.set);
  Object.values(C).forEach((c) => { c.root.visible = false; c.held.forEach((h) => h?.parent?.remove(h)); c.held = [null, null]; c.legs.forEach((l) => (l.rotation.x = 0)); c.root.rotation.set(0, 0, 0); });
  W.cash.count = 0; W.envs.forEach((e) => (e.visible = false)); W.pines.visible = false; W.winM.emissiveIntensity = 1; W.frontLights[0].intensity = 40; W.frontLights[1].intensity = 60;
  const place = (k: string, x: number, z: number, ry: number, y = 0) => { const c = C[k]; c.root.visible = true; c.root.position.set(O.x + x, O.y + y, O.z + z); c.root.rotation.set(0, ry, 0); c.root.updateMatrixWorld(true); return c; };
  const hold = (c: Toon, k: number, obj: THREE.Object3D) => { c.held[k] = obj; c.root.add(obj); obj.visible = true; };
  const seat = (c: Toon, y: number) => { c.root.position.y = O.y + y - c.spec.legLen; c.legs.forEach((l) => (l.rotation.x = -Math.PI / 2)); };
  head = (k: string) => { C[k].root.updateMatrixWorld(true); return C[k].head.getWorldPosition(new THREE.Vector3()); };
  const camState = shotCam(s, t, S.curves);
  s.act({ t, W, C, O, place, hold, seat, head, cam: camState });
  Object.values(C).forEach((c) => c.held.forEach((h, k) => {
    if (!h) return; h.position.copy(c.hands[k].position); h.position.y += 0.02;
    h.rotation.set(-0.3, 0, 0); h.position.z += 0.03;
  }));
  cam.fov = camState.fov; cam.near = 0.03; cam.far = 400; cam.position.copy(camState.pos); cam.lookAt(camState.look); cam.updateProjectionMatrix();
  const sky = W.g.front.getObjectByName("sky"); if (sky) sky.position.copy(cam.position).sub(SETS.front);
  const back = camState.look.clone().sub(camState.pos).setY(0).normalize();
  S.rim.position.copy(camState.look).addScaledVector(back, 8).add(V(0, 5, 0)); S.rim.target.position.copy(camState.look);
  S.rim2.position.copy(camState.look).addScaledVector(back, 6).add(V(back.z * 5, 2.5, -back.x * 5)); S.rim2.target.position.copy(camState.look);
  // overlap check (characters vs characters, camera vs heads) -> console warnings in the stills log
  const vis = Object.entries(C).filter(([, ch]) => ch.root.visible);
  for (let i = 0; i < vis.length; i++) {
    const [ka, a] = vis[i];
    for (let j = i + 1; j < vis.length; j++) { const [kb, b] = vis[j]; const d = Math.hypot(a.root.position.x - b.root.position.x, a.root.position.z - b.root.position.z); if (d < a.spec.bodyR + b.spec.bodyR + 0.05 && Math.abs(a.root.position.y - b.root.position.y) < 0.8) console.warn(`OVERLAP t=${t.toFixed(2)} ${ka}~${kb}`); }
    const hp = new THREE.Vector3(); a.head.getWorldPosition(hp); if (hp.distanceTo(cam.position) < a.spec.headR + 0.2) console.warn(`OVERLAP t=${t.toFixed(2)} camera~${ka}`);
  }
  useFrame(() => { fx.composer.render(); }, 1);
  return null;
};

const useFonts = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [new FontFace("Anton", `url(${staticFile("fonts/anton-latin-400-normal.woff2")})`),
      new FontFace("Inter", `url(${staticFile("fonts/inter-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Inter", `url(${staticFile("fonts/inter-latin-400-normal.woff2")})`, { weight: "400" })];
    Promise.all(faces.map((x) => x.load())).then((fs) => { fs.forEach((x) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(x)); setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};

type Word = { start: number; end: number; text: string; emph?: boolean };
const PROPER = ["BLOCKBUSTER", "BLOCKBUSTER'S", "NETFLIX", "REED", "HASTINGS", "MARC", "RANDOLPH", "DALLAS", "JOHN", "ANTIOCO", "BEND", "OREGON"];
const showW = (s: string) => (s === "DVDs" ? s : s.startsWith("$") ? s.replace("MILLION", "million") : PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
const Captions: React.FC<{ t: number; list: Word[] }> = ({ t, list }) => {
  let cur: Word | null = null;
  for (let i = 0; i < list.length; i++) { const x = list[i], n = list[i + 1]; if (t >= x.start - 0.03 && t < (n ? Math.min(n.start, x.end + 0.45) : x.end + 0.6)) { cur = x; break; } }
  const age = cur ? t - cur.start : 0, e = Math.min(1, Math.max(0, age / 0.12));
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1160, left: 0, right: 0, textAlign: "center", opacity: 0.4 + 0.6 * e, transform: `scale(${0.85 + 0.15 * e}) translateY(${(1 - e) * 14}px)` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 96, color: cur.emph ? "#ffd23a" : "#ffffff", WebkitTextStroke: "12px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{showW(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · sources: Marc Randolph, Reed Hastings (memoirs), NBC News, Fortune, Oregon Encyclopedia
      </div>
    </>
  );
};
export const BbShort: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#07080d" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.03, far: 400 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / fps} list={WORDS as Word[]} />
      <Audio src={staticFile("bbnf/mix.wav")} />
    </AbsoluteFill>
  );
};
