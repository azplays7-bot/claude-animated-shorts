// "Khabib vs McGregor: how the rivalry started", a 3-part series in the reference style (long gliding shots, close
// framing, 2-4 reacting characters, rim light, glowing screens). 60 fps. Cartoon caricatures; violence is kept off-screen
// or comic (no blood, no landed blows shown up close). Facts in the README of projects/khabib-mcgregor-rivalry.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armPts, CharSpec } from "../look/char";
import { M, MP, put, rbox, glow, canvas } from "../look/kit";
import { World, SETS, SetName, screenTex, chatTex, Line, BUS_WIN } from "./sets";
import W1 from "./p1_words.json"; import W2 from "./p2_words.json"; import W3 from "./p3_words.json";
import T1 from "./p1_timing.json"; import T2 from "./p2_timing.json"; import T3 from "./p3_timing.json";

export const MMA_FPS = 60;
export const MMA_FRAMES = 60 * MMA_FPS;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------------------------------------------------------------- cast
const P = (o: Partial<CharSpec>): CharSpec => ({ skin: "#f1c7a2", shirt: "#2a2a34", cap: "#000", capLogo: "#000", hair: "#2a1a12", bodyR: 0.21, bodyLen: 0.3, headR: 0.27, legLen: 0.64, hat: "none", shortHair: true, ...o });
const KH = { skin: "#d9a47e", hair: "#16110e", beard: "#16110e", bodyR: 0.235 };
const CM = { skin: "#f3c9a8", hair: "#8a4a20", beard: "#b5652a" };
const CAST: Record<string, CharSpec> = {
  khabib: P({ ...KH, hat: "papakha", hatColor: "#8c8a86", shirt: "#1c1f28" }),
  khabibF: P({ ...KH, bare: true, shorts: "#111114", gloves: "#141416" }),
  khabibR: P({ ...KH, bare: true, shorts: "#111114" }),
  conor: P({ ...CM, shirt: "#24304e", tag: undefined, scarf: undefined }),
  conorF: P({ ...CM, bare: true, tattoo: true, shorts: "#1a6a3a", gloves: "#141416" }),
  lobov: P({ skin: "#e8b896", hair: "#3a2a1a", beard: "#3a2a1a", shirt: "#4a4a52" }),
  danis: P({ skin: "#e0b090", hair: "#141010", beard: "#141010", shirt: "#18181c" }),
  tm1: P({ skin: "#c99470", hair: "#121010", beard: "#121010", shirt: "#121216", hat: "cap", cap: "#121216", capLogo: "#d8262e" }),
  tm2: P({ skin: "#d9a47e", hair: "#1a1410", beard: "#1a1410", shirt: "#2a2a30" }),
  crew1: P({ skin: "#f1c7a2", hair: "#5a3a20", beard: "#5a3a20", shirt: "#1a5a3a" }),
  crew2: P({ skin: "#f3d1b0", hair: "#2a1a12", shirt: "#3a3a40", hat: "cap", cap: "#1a5a3a", capLogo: "#ffffff" }),
  sec1: P({ skin: "#a8714f", shirt: "#141418", bib: "STAFF", hair: "#121010" }),
  sec2: P({ skin: "#7a4a2e", shirt: "#141418", bib: "STAFF", hair: "#121010" }),
  ref: P({ skin: "#f1c7a2", shirt: "#141418", bib: "REF", hair: "#9a9a9a", bodyR: 0.22 }),
  chiesa: P({ skin: "#f1c7a2", hair: "#c8a060", beard: "#c8a060", shirt: "#3a5a8a" }),
  borg: P({ skin: "#e8b58f", hair: "#2a1a12", shirt: "#6a3a3a" }),
  cop1: P({ skin: "#a8714f", shirt: "#1d2a4a", hat: "officer", hatColor: "#1d2a4a" }),
  cop2: P({ skin: "#f1c7a2", shirt: "#1d2a4a", hat: "officer", hatColor: "#1d2a4a" }),
  anchor: P({ skin: "#e8b58f", hair: "#3a2416", hairStyle: "long", shortHair: false, shirt: "#b8232c", bodyR: 0.19 }),
  host: P({ skin: "#f1c7a2", hair: "#5a5a60", shirt: "#3a3a4a", glasses: "#1a1a1a" }),
  iaq: P({ skin: "#f1c7a2", hair: "#2a1a12", bare: true, shorts: "#b8232c", gloves: "#141416" }),
};

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
type CK = [number, THREE.Vector3, THREE.Vector3, number];   // u (0..1 of the shot), position, look-at, fov
type Ctx = { t: number; W: XWorld; C: Record<string, Toon>; O: THREE.Vector3; place: (k: string, x: number, z: number, ry: number, y?: number) => Toon;
  hold: (c: Toon, k: number, obj: THREE.Object3D) => void; seat: (c: Toon, y: number) => void; kneel: (c: Toon) => void; head: (k: string) => THREE.Vector3; cam: { pos: THREE.Vector3; look: THREE.Vector3; fov: number } };
type Shot = { a: number; b: number; set: SetName; keys: CK[]; act: (x: Ctx) => void };
const SCN = (T: { scenes: Record<string, number[]> }) => (k: number) => (k <= 1 ? 0 : T.scenes[String(k)][0] - 0.35);
const wt = (WL: { start: number; text: string }[]) => (text: string, n = 0) => WL.filter((w) => w.text.replace(/[^A-Z0-9]/g, "") === text)[n].start;
const big = (W: World, lines: Line[]) => W.big.forEach((m) => (m.emissiveMap = screenTex(lines)));
const pick = <T,>(t: number, list: [number, T][]) => { let r = list[0][1]; for (const [a, v] of list) if (t >= a) r = v; return r; };

const phoneProp = () => { const g = new THREE.Group(); put(g, rbox(0.08, 0.15, 0.012, 0.01), MP("#111", 0.2), 0, 0, 0); put(g, new THREE.PlaneGeometry(0.07, 0.13), glow(canvas(8, 8, (gg) => { gg.fillStyle = "#9ac8ff"; gg.fillRect(0, 0, 8, 8); }), 2.2), 0, 0, 0.007, { cast: false }); return g; };

// ---- PART 1: friends to enemies
const S1 = SCN(T1), w1 = wt(W1);
const PART1: Shot[] = [
  { a: 0, b: S1(2), set: "arena", keys: [[0, V(2.0, 1.55, 3.0), V(0, 1.25, 0), 46], [0.3, V(2.4, 1.5, 1.9), V(0, 1.25, 0), 46], [0.42, V(1.6, 1.55, 1.5), V(-0.9, 1.3, 0), 44], [0.68, V(0.4, 1.5, 2.1), V(-0.9, 1.3, 0), 44], [0.8, V(-1.6, 1.55, 1.5), V(0.9, 1.3, 0), 44], [1, V(-0.6, 1.5, 2.0), V(0.9, 1.3, 0), 44]],
    act: ({ t, place, W }) => {
      big(W, pick(t, [[0, [["KHABIB", 150, "#ffffff"], ["vs", 70, "#d8262e"], ["McGREGOR", 150, "#ffffff"]]], [w1("KHABIB", 1) - 0.2, [["KHABIB NURMAGOMEDOV", 92, "#ffffff"], ["DAGESTAN, RUSSIA", 64, "#ffd23a"], ["UNBEATEN", 80, "#7dff9a"]]], [w1("CONOR") - 0.2, [["CONOR McGREGOR", 100, "#ffffff"], ["DUBLIN, IRELAND", 70, "#7dff9a"]]]]));
      track(place("khabibF", -0.9, 0, Math.PI / 2), t, [{ t: 0, L: "guard", R: "guard", mouth: "flat", brow: 1 }, { t: 6.2, L: "guard", R: "guard", mouth: "flat", brow: 0.6, yaw: 0.5 }, { t: 9.0, L: "guard", R: "guard", mouth: "flat", brow: 1, yaw: 0 }]);
      track(place("conorF", 0.9, 0, -Math.PI / 2), t, [{ t: 0, L: "guard", R: "point", mouth: "talk", brow: 1 }, { t: 3.0, L: "shrug", R: "shrug", mouth: "grin" }, { t: 9.1, L: "point", R: "shrug", mouth: "talk", yaw: -0.5 }, { t: 10.9, L: "fist", R: "point", mouth: "talk" }]);
      track(place("ref", 0.05, -1.3, 0), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat" }, { t: 2.2, L: "raise", R: "raise", mouth: "talk" }, { t: 4.0, L: "hip", R: "hip", mouth: "flat" }]);
    } },
  { a: S1(2), b: S1(3), set: "phone", keys: [[0, V(0, 1.7, 5.6), V(0, 1.5, -1), 46], [1, V(0, 1.6, 4.3), V(0, 1.45, -1), 46]],
    act: ({ t, place, W, hold }) => {
      const n = Math.max(1, Math.min(4, 1 + Math.floor((t - w1("FRIENDLY") + 0.1) / 0.7)));
      const seq: ("Lthumb" | "Rheart" | "L" | "R")[] = ["Lthumb", "R", "Rheart", "L"];
      W.phoneL.emissiveMap = chatTex("2014", seq.slice(0, n), "#3a8aff"); W.phoneR.emissiveMap = chatTex("2014", seq.slice(0, Math.max(1, n - 1)).map((b) => (b[0] === "L" ? "R" + b.slice(1) : "L" + b.slice(1))) as never, "#1a9a5a");
      const k = place("khabib", -0.6, 0.9, 0.35); track(k, t, [{ t: 0, L: "rest", R: "phone", mouth: "smile", pitch: 0.3 }, { t: 15.0, L: "rest", R: "phone", mouth: "grin", pitch: 0.2 }]); hold(k, 1, W.extra.ph1);
      const c = place("conor", 0.6, 0.9, -0.35); track(c, t, [{ t: 0, L: "phone", R: "rest", mouth: "grin", pitch: 0.3 }, { t: 15.4, L: "phone", R: "wave", mouth: "laugh" }]); hold(c, 0, W.extra.ph2);
    } },
  { a: S1(3), b: S1(4), set: "stage", keys: [[0, V(0, 2.2, 3.4), V(0, 2.0, -1.4), 46], [0.18, V(-0.6, 2.0, 2.9), V(-0.4, 1.95, -1.3), 46], [0.45, V(-1.0, 1.85, -0.2), V(-2.6, 1.35, 1.45), 44], [0.72, V(-1.25, 1.75, -0.3), V(-2.6, 1.35, 1.45), 44], [1, V(-1.0, 1.75, -0.4), V(-2.5, 1.4, 1.45), 44]],
    act: ({ t, place, W, hold }) => {
      W.stageWall.emissiveMap = screenTex(pick(t, [[0, [["CONOR McGREGOR", 110, "#ffffff"], ["SUPERSTAR", 90, "#ffd23a"]]], [w1("2016") - 0.2, [["NEW YORK · NOV 2016", 80, "#ffffff"], ["TITLE FIGHT", 110, "#ffd23a"], ["McGREGOR vs ALVAREZ", 80, "#ffffff"]]]]) as Line[]);
      W.scale.visible = false; W.pressTable.visible = false;
      track(place("conor", 0, -1.4, 0, 1.0), t, [{ t: 0, L: "cheer", R: "cheer", mouth: "laugh" }, { t: 19.0, L: "hip", R: "point", mouth: "talk" }, { t: 22.0, L: "shrug", R: "shrug", mouth: "grin" }]);
      const k = place("khabib", -2.6, 1.45, Math.PI - 0.6);
      track(k, t, [{ t: 0, L: "hip", R: "hip", mouth: "flat", brow: 1, yaw: -0.4 }, { t: w1("UNBEATEN") - 0.2, L: "hip", R: "point", mouth: "talk", yaw: 0.2 }, { t: w1("INSTEAD"), L: "hip", R: "hip", mouth: "flat", brow: 1, yaw: -0.7 }, { t: w1("KHABIB", 3) - 0.1, L: "rest", R: "phone", mouth: "flat", brow: 1, pitch: 0.3 }]);
      if (t > w1("KHABIB", 3) - 0.1) hold(k, 1, W.extra.ph1);
      track(place("tm1", -3.35, 1.7, Math.PI - 0.3), t, [{ t: 0, L: "hip", R: "rest", mouth: "flat", yaw: 0.6 }, { t: 24.0, L: "shrug", R: "shrug", mouth: "o" }]);
    } },
  { a: S1(4), b: S1(5), set: "stage", keys: [[0, V(1.7, 1.75, -8.4), V(0, 1.3, -11.2), 46], [0.6, V(0.6, 1.7, -8.2), V(0, 1.3, -11.3), 46], [1, V(0.3, 1.9, -7.3), V(0.1, 1.3, -11.3), 50]],
    act: ({ t, place, W }) => {
      W.backSign.emissiveMap = screenTex([["BACKSTAGE", 130, "#ffd23a"], ["WEIGH-INS · NEW YORK · NOV 2016", 46, "#ffffff"]], 1024, 360);
      const apart = ss(w1("STAFF") - 0.1, w1("APART") + 0.3, t);
      track(place("khabib", lerp(-0.5, -0.85, apart), -11.2, Math.PI / 2), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", brow: 1 }, { t: 31.4, L: "fist", R: "point", mouth: "talk", brow: 1 }, { t: w1("STAFF"), L: "point", R: "rest", mouth: "talk", brow: 1 }]);
      track(place("conor", lerp(0.5, 0.85, apart), -11.2, -Math.PI / 2), t, [{ t: 0, L: "point", R: "shrug", mouth: "talk", brow: 1 }, { t: 31.9, L: "fist", R: "point", mouth: "grin", brow: 1 }, { t: w1("STAFF"), L: "point", R: "fist", mouth: "talk" }]);
      const st = place("sec1", lerp(1.0, 0.02, ss(w1("STAFF") - 0.7, w1("STAFF"), t)), -11.75, 0);
      track(st, t, [{ t: 0, L: "rest", R: "rest", mouth: "o" }, { t: w1("STAFF") - 0.2, L: V(st.root.position.x - 0.4, 1.25, st.root.position.z + 0.45), R: V(st.root.position.x + 0.4, 1.25, st.root.position.z + 0.45), mouth: "talk" }]);
      track(place("tm1", -1.4, -11.9, Math.PI / 2 - 0.3), t, [{ t: 0, L: "hip", R: "rest", mouth: "flat", brow: 1 }]);
      track(place("crew1", 1.55, -11.9, -Math.PI / 2 + 0.3), t, [{ t: 0, L: "shrug", R: "point", mouth: "laugh" }]);
    } },
  { a: S1(5), b: S1(6), set: "arena", keys: [[0, V(0.7, 1.7, 7.2), V(0, 1.45, 0), 44], [0.45, V(0.35, 2.75, 4.3), V(0, 1.6, 0.2), 44], [1, V(0.8, 1.65, 2.6), V(0, 1.5, 0.3), 44]],
    act: ({ t, place, W, hold }) => {
      big(W, pick(t, [[0, [["NEW YORK · NOV 2016", 80, "#ffffff"], ["NEW CHAMPION", 120, "#ffd23a"]]], [w1("BECAME", 1) - 0.2, [["FIRST EVER", 90, "#ffffff"], ["TWO BELTS", 130, "#ffd23a"], ["AT THE SAME TIME", 70, "#ffffff"]]]]));
      const c = place("conorF", 0, 0.3, 0); track(c, t, [{ t: 0, L: "cheer", R: "cheer", mouth: "laugh" }, { t: 38.8, L: "cheer", R: "cheer", mouth: "grin", yaw: 0.4 }]);
      W.belts[0].visible = W.belts[1].visible = true; hold(c, 0, W.belts[0]); hold(c, 1, W.belts[1]);
      track(place("crew1", -1.2, -0.4, 0.5), t, [{ t: 0, L: "cheer", R: "wave", mouth: "laugh" }]);
      track(place("khabib", 1.6, 5.7, Math.PI + 0.3), t, [{ t: 0, L: "hip", R: "hip", mouth: "flat", brow: 1 }, { t: w1("KHABIB", 4) - 0.2, L: "hip", R: "point", mouth: "flat", brow: 1 }]);
    } },
  { a: S1(6), b: w1("KHABIB", 6) - 0.4, set: "studio", keys: [[0, V(0.4, 1.4, 1.8), V(-0.6, 1.0, -2.2), 46], [1, V(-0.2, 1.25, 0.2), V(-1.1, 1.05, -2.2), 44]],
    act: ({ t, place, W, seat }) => {
      W.interview.visible = true; W.newsDesk.visible = false;
      W.tv.emissiveMap = screenTex(pick(t, [[0, [["INTERVIEW", 120, "#ffffff"], ["RUSSIAN TV", 80, "#ffd23a"]]], [w1("ARTEM") - 0.1, [["ARTEM LOBOV", 110, "#ffffff"], ["CONOR'S TRAINING PARTNER", 60, "#7dff9a"]]]]) as Line[]);
      const l = place("lobov", -1.1, -2.2, 0.6); seat(l, 0.56); track(l, t, [{ t: 0, L: "rest", R: "point", mouth: "talk" }, { t: 46.9, L: "shrug", R: "shrug", mouth: "talk", brow: 1 }, { t: 48.4, L: "rest", R: "point", mouth: "grin" }], { still: true }); seat(l, 0.56);
      const h = place("host", 1.1, -2.2, -0.6); seat(h, 0.56); track(h, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", yaw: 0.2 }, { t: 47.0, L: "rest", R: "point", mouth: "o" }], { still: true }); seat(h, 0.56);
    } },
  { a: w1("KHABIB", 6) - 0.4, b: 60, set: "hotel", keys: [[0, V(0, 0, 0), V(0, 0, 0), 44], [1, V(0, 0, 0), V(0, 0, 0), 44]],
    act: ({ t, place, W, cam }) => {
      W.doorSign.emissiveMap = screenTex([["FIGHT WEEK", 120, "#ffd23a"], ["NEW YORK · APRIL 2018", 60, "#ffffff"]], 1024, 400);
      const t0 = w1("KHABIB", 6) - 0.4, kz = -15 + (Math.min(t, 55.6) - t0) * 0.95;
      const walking = t < 55.6;
      track(place("khabib", 0, kz, 0), t, [{ t: t0, L: "rest", R: "rest", mouth: "flat", brow: 1 }, { t: w1("FOUND"), L: "rest", R: "point", mouth: "talk", brow: 1 }], walking ? { walk: t * 6.5 } : {});
      track(place("tm1", -0.75, kz - 0.9, 0), t, [{ t: t0, L: "rest", R: "rest", mouth: "flat", brow: 1 }], walking ? { walk: t * 6.5 + 1 } : {});
      track(place("tm2", 0.75, kz - 1.0, 0), t, [{ t: t0, L: "rest", R: "rest", mouth: "flat", brow: 1 }], walking ? { walk: t * 6.5 + 2 } : {});
      track(place("lobov", 0.45, -7.4, Math.PI), t, [{ t: t0, L: "rest", R: "phone", mouth: "smile", pitch: 0.3 }, { t: w1("LOBOV", 1) - 0.1, L: "raise", R: "phone", mouth: "o", brow: 1, yaw: -0.3 }]);
      if (t >= t0) { const u = ss(w1("FOUND") - 0.3, w1("FOUND") + 1.4, t), O = SETS.hotel;
        const A = { pos: V(0.15, 1.5, kz + 2.6), look: V(0, 1.35, kz) }, B = { pos: V(-1.2, 1.9, kz - 1.2), look: V(0.45, 1.3, -7.4) };
        cam.pos.copy(A.pos.lerp(B.pos, u)).add(O); cam.look.copy(A.look.lerp(B.look, u)).add(O); cam.fov = 44; }
    } },
];
// Lobov stands with his back to the camera in the corridor; khabib walks toward camera (camera ahead of him, looking down the corridor at -z)

// ---- PART 2: the bus
const S2 = SCN(T2), w2 = wt(W2);
const PART2: Shot[] = [
  { a: 0, b: S2(2), set: "street", keys: [[0, V(-3.4, 1.5, -1.5), V(-6, 1.4, -5.2), 44], [0.6, V(0.4, 1.5, -1.7), V(-1.6, 1.4, -5.2), 44], [1, V(5.3, 1.8, -0.4), V(8.5, 2.5, -3.9), 44]],
    act: ({ t, place, W }) => {
      W.billboard.emissiveMap = screenTex([["FIGHT WEEK", 150, "#ffffff"], ["BROOKLYN · APRIL 2018", 80, "#ffd23a"]]);
      W.cardBoard.emissiveMap = screenTex([["FIGHT CARD", 90, "#ffd23a"], ["LIGHTWEIGHT", 70, "#ffffff"], ["TITLE FIGHT", 70, "#ffffff"], ["NURMAGOMEDOV", 74, "#7dff9a"]], 576, 800);
      const x = -6 + t * 1.0;
      track(place("khabib", x, -5.2, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", yaw: 0.5 }], { walk: t * 6.5 });
      track(place("tm1", x - 0.9, -5.9, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "rest", mouth: "talk", yaw: 0.3 }], { walk: t * 6.5 + 1 });
      track(place("tm2", x - 1.1, -4.6, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat" }], { walk: t * 6.5 + 2 });
    } },
  { a: S2(2), b: S2(3), set: "hotel", keys: [[0, V(-0.5, 1.6, -5.5), V(-0.85, 1.35, -8.0), 44], [0.55, V(0.6, 1.55, -6.2), V(-1.0, 1.4, -8.0), 42], [1, V(0.95, 1.5, -6.7), V(-1.1, 1.45, -8.05), 40]],
    act: ({ t, place, head }) => {
      const l = place("lobov", -1.22, -8.05, Math.PI / 2);
      const grabT = w2("GRABBED"), slapT = w2("SLAPPED"), sw = ss(slapT - 0.12, slapT + 0.05, t) * (1 - ss(slapT + 0.35, slapT + 0.7, t));
      track(l, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat" }, { t: 9.8, L: "shrug", R: "rest", mouth: "talk" }, { t: grabT, L: "raise", R: "raise", mouth: "o", brow: 1 }, { t: slapT + 0.05, L: "raise", R: "raise", mouth: "dazed" }]);
      const k = place("khabib", -0.44, -8.05, -Math.PI / 2), lh = head("lobov");
      const neck = lh.clone().add(V(0.12, -0.32, 0)), cheek = lh.clone().add(V(0.18, -0.05, 0.12)), wind = k.root.position.clone().add(V(0.05, 1.5, 0.45));
      track(k, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", brow: 1 }, { t: 9.2, L: "point", R: "rest", mouth: "talk", brow: 1 }, { t: grabT, L: "rest", R: neck, mouth: "talk", brow: 1 }, { t: slapT - 0.45, L: wind.clone().lerp(cheek, sw), R: neck, mouth: "talk", brow: 1 }]);
      track(place("tm1", 0.55, -7.4, -Math.PI / 2 - 0.4), t, [{ t: 0, L: "hip", R: "rest", mouth: "flat", brow: 1 }, { t: slapT, L: "hip", R: "point", mouth: "o" }]);
      track(place("tm2", 0.5, -8.85, -Math.PI / 2 + 0.4), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", brow: 1 }]);
    } },
  { a: S2(3), b: S2(4), set: "street", keys: [[0, V(-6.7, 1.55, -3.7), V(-8.0, 1.5, -5.0), 40], [0.24, V(-6.4, 1.4, -3.0), V(-3, 8, -24), 50], [0.5, V(-5.4, 1.5, -2.4), V(-6.5, 1.5, -5.2), 46], [1, V(0.6, 1.55, -1.6), V(-1.8, 1.4, -5.2), 44]],
    act: ({ t, place, W, hold }) => {
      W.billboard.emissiveMap = screenTex([["MEDIA DAY", 150, "#ffffff"], ["BROOKLYN ARENA", 80, "#ffd23a"]]);
      W.plane.visible = true; W.plane.position.x = -32 + (t - 14.9) * 20;
      const t0 = w2("HE", 2) - 0.1, x = -8 + Math.max(0, t - t0) * 1.3, walking = t > t0;
      const c = place("conor", x, -5.2, walking ? Math.PI / 2 : 0.7, 0.12);
      track(c, t, [{ t: 0, L: "rest", R: "ear", mouth: "o", brow: 1 }, { t: w2("FLEW") - 0.2, L: "rest", R: "ear", mouth: "talk", brow: 1 }, { t: t0, L: "rest", R: "point", mouth: "talk", brow: 1 }], walking ? { walk: t * 7.5 } : {});
      if (!walking) hold(c, 1, W.extra.ph2);
      track(place("crew1", x - 1.0, -5.9, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat" }], walking ? { walk: t * 7.5 + 1 } : {});
      track(place("crew2", x - 1.2, -4.5, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "rest", mouth: "talk" }], walking ? { walk: t * 7.5 + 2 } : {});
    } },
  { a: S2(4), b: S2(5), set: "dock", keys: [[0, V(1.9, 2.4, 0.3), V(1.2, 2.3, -2.3), 44], [0.42, V(3.2, 1.9, 3.6), V(6.8, 1.3, 0.8), 46], [0.68, V(3.6, 1.7, 3.7), V(5.4, 1.45, 1.3), 44], [0.86, V(2.6, 2.2, 3.4), V(2.2, 2.3, -1.0), 46], [1, V(2.1, 2.45, 1.5), V(1.2, 2.35, -2.25), 44]],
    act: ({ t, place, W, seat, hold }) => busScene(t, place, W, seat, hold, w2) },
  { a: S2(5), b: S2(6), set: "dock", keys: [[0, V(1.6, 2.4, 0.9), V(0.8, 2.25, -2.5), 44], [0.3, V(-0.4, 2.55, 1.5), V(-1.0, 2.25, -2.6), 42], [1, V(-6.6, 3.8, -1.5), V(-9, 4.45, -7.8), 44]],
    act: ({ t, place, W, seat, hold }) => {
      busScene(t, place, W, seat, hold, w2);
      W.board.emissiveMap = screenTex(pick(t, [[0, [["FIGHT CARD", 110, "#ffd23a"]]], [w2("FIGHTS", 0) - 0.3, [["CHIESA · CANCELLED", 80, "#ff5a5a"], ["BORG · CANCELLED", 80, "#ff5a5a"]]], [w2("LOBOV", 1) - 0.1, [["CHIESA · CANCELLED", 80, "#ff5a5a"], ["BORG · CANCELLED", 80, "#ff5a5a"], ["LOBOV · PULLED", 80, "#ffd23a"]]]]) as Line[]);
    } },
  { a: S2(6), b: w2("HE", 3) - 0.3, set: "dock", keys: [[0, V(-6.0, 1.6, 6.3), V(-8.4, 1.3, 3.2), 44], [1, V(-6.6, 1.5, 5.6), V(-8.6, 1.3, 3.0), 42]],
    act: ({ t, place, W }) => {
      W.police.visible = true; W.glassOk.visible = false; W.glassBroken.visible = true;
      const fl = Math.floor(t * 6) % 2; W.policeLights[0].emissiveIntensity = fl ? 6 : 0.5; W.policeLights[1].emissiveIntensity = fl ? 0.5 : 6;
      const z = 5.2 - (t - 37.2) * 0.6;
      track(place("conor", -7.3, z, Math.PI + 0.3), t, [{ t: 0, L: "behind", R: "behind", mouth: "talk", brow: 1, yaw: 0.4 }], { walk: t * 6 });
      track(place("cop1", -7.95, z + 0.2, Math.PI + 0.3), t, [{ t: 0, L: "rest", R: "hold", mouth: "flat" }], { walk: t * 6 + 1 });
      track(place("cop2", -6.65, z + 0.25, Math.PI + 0.3), t, [{ t: 0, L: "hold", R: "rest", mouth: "flat" }], { walk: t * 6 + 2 });
    } },
  { a: w2("HE", 3) - 0.3, b: S2(7), set: "studio", keys: [[0, V(0.95, 1.6, 1.7), V(0, 1.55, -3.4), 44], [1, V(0.25, 1.85, 0.7), V(0, 2.5, -5.9), 46]],
    act: ({ t, place, W }) => {
      W.interview.visible = false; W.newsDesk.visible = true;
      W.tv.emissiveMap = screenTex(pick(t, [[0, [["CONOR McGREGOR", 100, "#ffffff"], ["GUILTY PLEA", 100, "#ffd23a"], ["DISORDERLY CONDUCT", 70, "#ffffff"]]], [w2("COMMUNITY") - 0.2, [["GUILTY PLEA", 90, "#ffd23a"], ["COMMUNITY SERVICE", 72, "#ffffff"], ["+ ANGER MANAGEMENT", 72, "#ffffff"]]]]) as Line[]);
      track(place("anchor", 0, -3.25, 0), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", yaw: 0.3 }, { t: 42.0, L: "shrug", R: "rest", mouth: "talk", yaw: -0.3 }]);
    } },
  { a: S2(7), b: 60, set: "arena", keys: [[0, V(1.8, 1.35, 2.1), V(0, 1.5, 0), 44], [0.35, V(-1.6, 1.45, 1.8), V(0, 1.55, 0), 42], [0.62, V(0.4, 3.2, 4.8), V(0, 3.5, 0), 48], [1, V(0, 5.6, 9.6), V(0, 9.4, 0), 50]],
    act: ({ t, place, W, hold }) => {
      big(W, pick(t, [[0, [["BROOKLYN · APRIL 2018", 80, "#ffffff"], ["NEW CHAMPION", 120, "#ffd23a"]]], [w2("HE", 5) - 0.2, [["KHABIB 26-0", 120, "#7dff9a"], ["DEF. AL IAQUINTA · 5 ROUNDS", 60, "#ffffff"]]], [w2("NOW") - 0.2, [["KHABIB", 120, "#ffffff"], ["vs", 70, "#d8262e"], ["McGREGOR ?", 120, "#ffffff"]]], [w2("PART") - 0.2, [["PART 3", 150, "#ffd23a"], ["LAS VEGAS", 100, "#ffffff"]]]]));
      const k = place("khabibF", 0, 0.1, 0.2); track(k, t, [{ t: 0, L: "cheer", R: "rest", mouth: "grin" }, { t: w2("ANYWAY"), L: "cheer", R: "cheer", mouth: "laugh" }, { t: 50.4, L: "cheer", R: "wave", mouth: "grin", yaw: -0.5 }]);
      W.belts[0].visible = true; hold(k, 0, W.belts[0]);
      track(place("iaq", -1.4, -0.7, 0.9), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", pitch: 0.3 }, { t: 50.0, L: "rest", R: "wave", mouth: "smile", yaw: 0.4 }]);
      track(place("ref", 1.1, -0.6, -0.5), t, [{ t: 0, L: "rest", R: "raise", mouth: "talk" }, { t: 49.0, L: "rest", R: "rest", mouth: "smile" }]);
    } },
];
/** the bus attack: Khabib + fighters seated at the windows, Conor's crew runs in, the dolly flies, the glass breaks */
function busScene(t: number, place: Ctx["place"], W: XWorld, seat: Ctx["seat"], hold: Ctx["hold"], w: (s: string, n?: number) => number) {
  const bx = (x: number) => x, BZ = -3.5 + 0.0;
  const sitters: [string, number][] = [["khabib", BUS_WIN], ["chiesa", -0.25], ["borg", 2.65], ["tm1", -1.7]];
  const hit = w("WINDOW") + 0.12, thrown = w("THREW") - 0.05;
  for (const [k, x] of sitters) {
    const c = place(k, bx(x), BZ - 0.05, 0); seat(c, 1.55);
    const hurt = (k === "chiesa" || k === "borg") && t > hit + 0.25;
    track(c, t, [{ t: 0, L: "rest", R: k === "khabib" ? "rest" : "phone", mouth: "flat", pitch: 0.1 }, { t: w("RUSHED") - 0.2, L: "rest", R: "point", mouth: "o", brow: 1, yaw: 0.6 }, { t: hit, L: hurt ? "ear" : "guard", R: hurt ? "ear" : "guard", mouth: "o", brow: 1 }, { t: hit + 1.5, L: hurt ? "ear" : "rest", R: hurt ? "heart" : "point", mouth: hurt ? "dazed" : "talk", brow: 1 }], { still: true });
    seat(c, 1.55);
  }
  // Conor's crew runs in from the right, Conor grabs the dolly and throws it
  const run = ss(w("CONOR", 2) - 0.3, w("CONOR", 2) + 1.2, t);
  const cx = lerp(9.5, 5.3, run), lift = ss(w("GRABBED") - 0.1, thrown, t);
  const c = place("conor", cx, 1.55, -Math.PI / 2 - 0.5);
  const dollyHome = V(5.75, 0, 1.25).add(SETS.dock);
  track(c, t, [{ t: 0, L: "rest", R: "rest", mouth: "talk", brow: 1 }, { t: w("GRABBED") - 0.1, L: "fist", R: "fist", mouth: "talk", brow: 1 }, { t: thrown, L: "point", R: "point", mouth: "grin", brow: 1 }, { t: hit + 0.6, L: "shrug", R: "point", mouth: "talk" }], run < 1 && t < w("GRABBED") - 0.2 ? { walk: t * 10 } : {});
  track(place("crew1", cx + 1.1, 2.3, -Math.PI / 2 - 0.3), t, [{ t: 0, L: "fist", R: "rest", mouth: "talk" }], run < 1 ? { walk: t * 10 + 1 } : {});
  track(place("crew2", cx + 1.3, 0.9, -Math.PI / 2 - 0.6), t, [{ t: 0, L: "rest", R: "point", mouth: "talk" }], run < 1 ? { walk: t * 10 + 2 } : {});
  const d = W.dolly; d.rotation.set(0, 0, 0);
  if (t < w("GRABBED") - 0.1) d.position.copy(dollyHome).sub(SETS.dock);
  else if (t < thrown) { const hand = c.hands[1].getWorldPosition(new THREE.Vector3()); d.position.copy(hand).sub(SETS.dock).add(V(0, lift * 0.3 - 0.6, 0)); d.rotation.set(-lift * 1.2, 0, 0); }
  else {
    const start = V(cx - 0.3, 2.3, 1.3), end = V(BUS_WIN, 2.35, -3.5 + 1.15), u = Math.min(1, (t - thrown) / (hit - thrown));
    if (t < hit) { d.position.copy(start.lerp(end, u)); d.position.y += Math.sin(Math.PI * u) * 0.6; d.rotation.set(u * 5, u * 2, 0); }
    else { const f = Math.min(1, (t - hit) / 0.5); d.position.set(BUS_WIN + 0.3, lerp(2.2, 0.05, f * f), -3.5 + 1.6 + f * 0.4); d.rotation.set(1.4 * f, 0.6, 1.57 * f); }
  }
  const broken = t >= hit; W.glassOk.visible = !broken; W.glassBroken.visible = broken;
  W.shards.forEach((s, k) => {
    const dt = t - hit; s.visible = broken && dt < 2.5;
    if (!s.visible) return;
    const a = k * 2.399, sp = 1.2 + (k % 7) * 0.35;
    s.position.set(BUS_WIN + Math.cos(a) * 0.3 + Math.cos(a) * sp * dt * 0.6, Math.max(0.03, 2.35 + Math.sin(a) * 0.3 + (1.5 + (k % 3)) * dt - 4.9 * dt * dt), -3.5 + 1.3 + (0.4 + (k % 5) * 0.15) * dt);
    s.rotation.set(dt * (3 + k), dt * 2, k);
  });
}

// ---- PART 3: Las Vegas
const S3 = SCN(T3), w3 = wt(W3);
const PART3: Shot[] = [
  { a: 0, b: S3(2), set: "street", keys: [[0, V(0, 1.3, 4.5), V(0, 3.2, -9), 46], [1, V(0, 4.6, 1.6), V(0, 8.4, -9), 48]],
    act: ({ t, place, W }) => {
      W.billboard.emissiveMap = screenTex([["KHABIB vs McGREGOR", 110, "#ffffff"], ["OCTOBER 6 · LAS VEGAS", 70, "#ffd23a"]]);
      W.cardBoard.emissiveMap = screenTex([["TONIGHT", 110, "#ffd23a"], ["LIGHTWEIGHT", 70, "#ffffff"], ["TITLE", 70, "#ffffff"]], 576, 800);
      W.plane.visible = false;
      track(place("crew2", -1.6 + t * 0.6, -4.8, Math.PI / 2, 0.12), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", yaw: -0.6, pitch: -0.4 }], { walk: t * 6 });
      track(place("borg", 1.6 - t * 0.5, -5.6, -Math.PI / 2, 0.12), t, [{ t: 0, L: "phone", R: "rest", mouth: "o", pitch: -0.4 }], { walk: t * 6 + 1 });
    } },
  { a: S3(2), b: S3(3), set: "stage", keys: [[0, V(0, 2.45, 4.6), V(0, 2.0, -1.9), 46], [0.48, V(1.5, 2.15, 1.5), V(2.1, 2.1, -1.9), 42], [0.78, V(-1.0, 2.05, 0.6), V(-2.1, 1.95, -1.9), 42], [1, V(-1.55, 2.0, 0.05), V(-2.15, 1.95, -1.9), 40]],
    act: ({ t, place, W, seat }) => {
      W.stageWall.emissiveMap = screenTex([["PRESS CONFERENCE", 100, "#ffffff"], ["NEW YORK · SEPT 2018", 70, "#ffd23a"]]);
      W.scale.visible = false; W.pressTable.visible = true;
      const k = place("khabib", -2.1, -1.95, 0, 1.0); seat(k, 1.5); track(k, t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", pitch: 0.1 }, { t: w3("KHABIB", 1) - 0.2, L: "rest", R: "rest", mouth: "smile", pitch: -0.05 }], { still: true }); seat(k, 1.5);
      track(place("conor", 2.1, -1.95, -0.25, 1.0), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", yaw: -0.5 }, { t: 7.0, L: "shrug", R: "shrug", mouth: "grin" }, { t: 9.1, L: "point", R: "point", mouth: "talk", yaw: -0.7, brow: 1 }, { t: 11.0, L: "fist", R: "point", mouth: "talk", brow: 1 }]);
    } },
  { a: S3(3), b: S3(4), set: "arena", keys: [[0, V(1.7, 1.5, 2.3), V(0, 1.15, 0), 44], [0.3, V(0.7, 1.0, 2.1), V(-0.3, 0.55, 0), 44], [0.75, V(-0.4, 0.8, 1.7), V(-0.6, 0.4, -0.1), 42], [1, V(-0.7, 0.72, 1.35), V(-0.8, 0.35, 0), 40]],
    act: ({ t, place, W, kneel, head }) => {
      big(W, [["ROUND 4", 140, "#ffd23a"], ["LAS VEGAS · OCT 2018", 60, "#ffffff"]]);
      const down = ss(w3("DOWN") - 0.15, w3("DOWN") + 0.45, t);
      const c = place("conorF", lerp(0.3, 0.55, down), 0, -Math.PI / 2 * (1 - down) + 0 * down, lerp(0, 0.24, down));
      c.root.rotation.z = Math.PI / 2 * down;
      const tap = t > w3("TAPPED") - 0.1;
      track(c, t, [{ t: 0, L: "guard", R: "guard", mouth: "talk", brow: 1 }, { t: w3("DOWN"), L: "rest", R: "raise", mouth: "o", brow: 1 }, { t: w3("LOCKED") - 0.1, L: "rest", R: "rest", mouth: "dazed" }, { t: w3("TAPPED") - 0.1, L: "rest", R: tap ? V(-0.3, 0.06 + 0.07 * Math.abs(Math.sin(t * 12)), 0.35).add(SETS.arena) : "rest", mouth: "o" }], { still: true });
      const kx = lerp(-0.6, -0.45, down), kz = lerp(0, -0.55, down);
      const k = place("khabibF", kx, kz, lerp(Math.PI / 2, 0.1, down));
      if (down > 0.5) kneel(k);
      const ch = head("conorF");
      track(k, t, [{ t: 0, L: "grab", R: "grab", mouth: "flat", brow: 1 }, { t: w3("DOWN") + 0.4, L: "guard", R: "grab", mouth: "flat", brow: 1 }, { t: w3("LOCKED") - 0.1, L: ch.clone().add(V(-0.05, -0.1, 0.12)), R: ch.clone().add(V(0.1, 0.12, -0.05)), mouth: "flat", brow: 1 }], { still: true });
      if (down > 0.5) kneel(k);
      track(place("ref", 1.5, -0.9, -0.6), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", pitch: 0.3 }, { t: w3("TAPPED") + 0.3, L: "wave", R: "wave", mouth: "talk" }]);
    } },
  { a: S3(4), b: S3(5), set: "arena", keys: [[0, V(1.8, 1.6, 1.5), V(0, 1.3, 0.3), 44], [0.2, V(1.6, 1.75, 2.6), V(0.2, 1.7, 4.1), 46], [0.34, V(1.9, 2.55, 3.6), V(0.4, 1.6, 6.1), 46], [0.55, V(1.5, 2.1, 4.75), V(0.4, 1.5, 6.4), 44], [0.72, V(1.2, 2.35, 3.2), V(-0.5, 1.3, 0.3), 46], [1, V(0.85, 1.85, 2.3), V(-0.4, 1.3, 0.2), 44]],
    act: ({ t, place, W }) => {
      big(W, [["KHABIB WINS", 120, "#7dff9a"], ["STILL UNBEATEN · 27-0", 70, "#ffffff"]]);
      const climb = ss(w3("CLIMBED") - 0.1, w3("FENCE") + 0.2, t), over = ss(w3("FENCE") + 0.2, w3("JUMPED") + 0.4, t), chase = ss(w3("JUMPED") + 0.4, w3("DANIS") + 0.6, t);
      const run = ss(w3("BUT") - 0.2, w3("CLIMBED"), t);
      const kz = lerp(lerp(0.3, 3.9, run), 5.7, over) + chase * 0.5, ky = Math.max(0, climb * 1.6 * (1 - over) + Math.sin(Math.PI * over) * 0.9 + (over > 0.99 ? 0 : 0));
      const k = place("khabib" + "F", 0.1 + chase * 0.15, kz, 0, over > 0.99 ? 0 : ky);
      track(k, t, [{ t: 0, L: "cheer", R: "rest", mouth: "flat", brow: 1 }, { t: w3("CLIMBED") - 0.1, L: "cheer", R: "cheer", mouth: "talk", brow: 1 }, { t: w3("JUMPED"), L: "grab", R: "grab", mouth: "talk", brow: 1 }, { t: w3("SECURITY") + 0.2, L: "point", R: "rest", mouth: "talk", brow: 1 }], run > 0 && run < 1 ? { walk: t * 10 } : { still: true });
      track(place("danis", 0.2, 7.2, Math.PI), t, [{ t: 0, L: "cheer", R: "point", mouth: "talk" }, { t: w3("JUMPED"), L: "raise", R: "raise", mouth: "o", brow: 1 }, { t: w3("SECURITY") + 0.2, L: "point", R: "shrug", mouth: "talk" }]);
      const s2 = place("sec2", lerp(2.0, 0.95, ss(w3("SECURITY") - 0.3, w3("APART"), t)), 6.75, -Math.PI / 2); track(s2, t, [{ t: 0, L: "rest", R: "rest", mouth: "o" }, { t: w3("SECURITY"), L: "grab", R: "grab", mouth: "talk" }]);
      const tin = ss(w3("MEMBERS") - 0.3, w3("CAGE", 1), t);
      track(place("conorF", -0.5, 0.3, 0.4), t, [{ t: 0, L: "rest", R: "rest", mouth: "flat", pitch: 0.3 }, { t: w3("MEMBERS"), L: "guard", R: "guard", mouth: "o", brow: 1 }]);
      track(place("tm1", lerp(-3.6, -1.1, tin), lerp(-1.6, 0.0, tin), Math.PI / 2 - 0.4), t, [{ t: 0, L: "rest", R: "rest", mouth: "talk" }, { t: w3("HIT") - 0.2, L: "grab", R: "fist", mouth: "talk", brow: 1 }], tin > 0 && tin < 1 ? { walk: t * 10 } : {});
      track(place("tm2", lerp(-3.2, -0.6, tin), lerp(-2.4, -0.55, tin), 0.3), t, [{ t: 0, L: "rest", R: "rest", mouth: "talk" }, { t: w3("HIT") - 0.1, L: "fist", R: "grab", mouth: "talk", brow: 1 }], tin > 0 && tin < 1 ? { walk: t * 10 + 1 } : {});
      const sx_ = lerp(2.2, 0.05, ss(w3("SECURITY") - 0.2, w3("APART"), t));
      track(place("sec1", sx_, 0.45, -Math.PI / 2), t, [{ t: 0, L: "rest", R: "rest", mouth: "o" }, { t: w3("SECURITY"), L: "grab", R: "grab", mouth: "talk" }], { walk: t * 9 });
      track(place("ref", 2.0, -1.4, -0.9), t, [{ t: 0, L: "rest", R: "raise", mouth: "o" }, { t: w3("MEMBERS"), L: "wave", R: "wave", mouth: "talk" }]);
    } },
  { a: S3(5), b: S3(6), set: "studio", keys: [[0, V(-0.9, 1.6, 1.8), V(0, 1.6, -3.4), 44], [0.5, V(-0.3, 1.75, 1.1), V(0, 2.2, -5.0), 44], [1, V(0.3, 1.95, 0.6), V(0, 2.75, -5.9), 46]],
    act: ({ t, place, W }) => {
      W.interview.visible = false; W.newsDesk.visible = true;
      const L1: Line = ["KHABIB · 9 MONTHS · $500,000", 64, "#ffd23a"], L2: Line = ["CONOR · 6 MONTHS · $50,000", 64, "#ffffff"], L3: Line = ["2 TEAMMATES · 1 YEAR", 64, "#ff8a8a"];
      W.tv.emissiveMap = screenTex(pick(t, [[0, [["SUSPENDED + FINED", 90, "#ffffff"], L1]], [w3("CONOR", 5) - 0.2, [["SUSPENDED + FINED", 90, "#ffffff"], L1, L2]], [w3("TWO") - 0.2, [["SUSPENDED + FINED", 90, "#ffffff"], L1, L2, L3]]]) as Line[]);
      track(place("anchor", 0, -3.25, 0), t, [{ t: 0, L: "rest", R: "point", mouth: "talk", yaw: -0.3 }, { t: 38.0, L: "shrug", R: "rest", mouth: "talk", yaw: 0.3 }, { t: 40.6, L: "rest", R: "point", mouth: "talk" }]);
    } },
  { a: S3(6), b: S3(7), set: "arena", keys: [[0, V(0, 4.6, 4.2), V(0, 0.5, 0), 46], [0.5, V(0.95, 1.05, 1.7), V(0, 0.6, -0.25), 42], [1, V(0.55, 1.3, 1.25), V(0, 1.35, -0.5), 40]],
    act: ({ t, place, W, kneel }) => {
      big(W, [["29-0", 170, "#7dff9a"], ["RETIRED · OCT 2020", 70, "#ffffff"]]);
      W.gloves.visible = true; W.gloves.position.set(0, 0, 0.25);
      const up = ss(w3("HE", 3) - 0.6, w3("HE", 3) + 0.3, t);
      const k = place("khabibR", 0, -0.45, 0);
      if (up < 0.5) kneel(k);
      track(k, t, [{ t: 0, L: "heart", R: "rest", mouth: "flat", pitch: 0.45, brow: 0 }, { t: w3("GLOVES") - 0.2, L: "heart", R: "heart", mouth: "flat", pitch: 0.5 }, { t: w3("HE", 3), L: "rest", R: "heart", mouth: "smile", pitch: -0.45 }, { t: w3("MOTHER") + 0.1, L: "rest", R: "raise", mouth: "smile", pitch: -0.5 }], { still: true });
      if (up < 0.5) kneel(k);
      W.arenaKey.angle = 0.45;
    } },
  { a: S3(7), b: 60, set: "phone", keys: [[0, V(0, 1.75, 5.2), V(0, 1.75, -1), 46], [1, V(0, 1.7, 3.6), V(0, 2.2, -1), 46]],
    act: ({ t, place, W, hold }) => {
      const n = Math.max(1, Math.min(4, 1 + Math.floor((t - 54.2) / 0.5)));
      const seq: ("Lmad" | "Rmad" | "L" | "R")[] = ["Lmad", "R", "Rmad", "Lmad"];
      W.phoneL.emissiveMap = chatTex("TODAY", seq.slice(0, n), "#d8262e");
      W.phoneR.emissiveMap = t > w3("FOLLOW") - 0.1 ? screenTex([["FOLLOW", 120, "#ffffff"], ["FOR MORE", 70, "#ffd23a"], ["FIGHT", 120, "#ffffff"], ["HISTORY", 110, "#ffffff"]], 512, 1024) : chatTex("TODAY", seq.slice(0, n).map((b) => (b[0] === "L" ? "R" + b.slice(1) : "L" + b.slice(1))) as never, "#d8262e");
      const k = place("khabib", -0.95, 0.9, 0.35); track(k, t, [{ t: 0, L: "rest", R: "phone", mouth: "flat", brow: 1, pitch: 0.3 }, { t: 55.5, L: "hip", R: "phone", mouth: "talk", brow: 1 }]); hold(k, 1, W.extra.ph1);
      const c = place("conor", 0.95, 0.9, -0.35); track(c, t, [{ t: 0, L: "phone", R: "rest", mouth: "talk", brow: 1, pitch: 0.3 }, { t: 55.0, L: "phone", R: "point", mouth: "grin" }]); hold(c, 0, W.extra.ph2);
    } },
];
const PARTS = { 1: PART1, 2: PART2, 3: PART3 };
const WORDS = { 1: W1, 2: W2, 3: W3 };

type XWorld = World & { extra: { ph1: THREE.Group; ph2: THREE.Group } };
const shotCam = (s: Shot, t: number, cv: Map<Shot, { p: THREE.CatmullRomCurve3; l: THREE.CatmullRomCurve3 }>) => {
  if (!cv.has(s)) { const ext = (i: number) => s.keys.map((k) => k[i] as THREE.Vector3); cv.set(s, { p: new THREE.CatmullRomCurve3(ext(1), false, "centripetal"), l: new THREE.CatmullRomCurve3(ext(2), false, "centripetal") }); }
  const c = cv.get(s)!, K = s.keys;
  const g = Math.min(1, Math.max(0, (t - s.a) / (s.b - s.a))), w = g * g * (3 - 2 * g) * 0.35 + g * 0.65;
  let i = 0; while (i + 2 < K.length && w >= K[i + 1][0]) i++;
  const fr = Math.min(1, Math.max(0, (w - K[i][0]) / (K[i + 1][0] - K[i][0]))), u = (i + fr) / (K.length - 1);
  const o = SETS[s.set];
  return { pos: c.p.getPoint(u).add(o), look: c.l.getPoint(u).add(o), fov: K[i][3] + (K[i + 1][3] - K[i][3]) * fr };
};

const Inner: React.FC<{ part: 1 | 2 | 3 }> = ({ part }) => {
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
    const W = new World() as XWorld; scene.add(W.root);
    W.extra = { ph1: phoneProp(), ph2: phoneProp() };
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

  const shots = PARTS[part], s = shots.find((x) => t >= x.a && t < x.b) ?? shots[shots.length - 1];
  const { W, C } = S; const O = SETS[s.set];
  W.show(s.set);
  // reset per frame
  Object.values(C).forEach((c) => { c.root.visible = false; c.held.forEach((h) => h?.parent?.remove(h)); c.held = [null, null]; c.legs.forEach((l) => (l.rotation.x = 0)); c.root.rotation.set(0, 0, 0); });
  W.belts.forEach((b) => (b.visible = false)); W.gloves.visible = false; W.police.visible = false; W.plane.visible = false; W.arenaKey.angle = 0.75;
  W.glassOk.visible = true; W.glassBroken.visible = false; W.shards.forEach((x) => (x.visible = false)); W.dolly.position.set(5.75, 0, 1.25); W.dolly.rotation.set(0, 0, 0);
  // crowd phone lights + camera flashes twinkle (deterministic)
  W.flashes.forEach((fl, k) => { const ph = Math.sin(t * (0.7 + (k % 7) * 0.13) + k * 1.7); fl.visible = ph > -0.2; const flash = ((Math.floor(t * 9) + k * 37) % 97) === 0; fl.scale.set(flash ? 0.5 : 0.09, flash ? 0.5 : 0.14, 1); });
  W.stageFlashes.forEach((fl, k) => { const flash = ((Math.floor(t * 12) + k * 53) % 41) === 0; fl.scale.set(flash ? 0.6 : 0.09, flash ? 0.6 : 0.14, 1); });
  W.beams.forEach((b, k) => (b.rotation.z = 0.12 * Math.sin(t * 0.4 + k)));
  const place = (k: string, x: number, z: number, ry: number, y = 0) => { const c = C[k]; c.root.visible = true; c.root.position.set(O.x + x, O.y + y, O.z + z); c.root.rotation.set(0, ry, 0); c.root.updateMatrixWorld(true); return c; };
  const hold = (c: Toon, k: number, obj: THREE.Object3D) => { c.held[k] = obj; c.root.add(obj); obj.visible = true; };
  const seat = (c: Toon, y: number) => { c.root.position.y = O.y + y - c.spec.legLen; c.legs.forEach((l) => (l.rotation.x = -Math.PI / 2)); };
  const kneel = (c: Toon) => { c.root.position.y = O.y + 0.12 - c.spec.legLen; c.legs.forEach((l) => (l.rotation.x = Math.PI / 2)); };
  const head = (k: string) => { C[k].root.updateMatrixWorld(true); return C[k].head.getWorldPosition(new THREE.Vector3()); };
  const camState = shotCam(s, t, S.curves);
  s.act({ t, W, C, O, place, hold, seat, kneel, head, cam: camState });
  Object.values(C).forEach((c) => c.held.forEach((h, k) => {
    if (!h) return; h.position.copy(c.hands[k].position); h.position.y += 0.02;
    if (W.belts.includes(h as THREE.Group)) { h.position.y += 0.1; h.rotation.set(0, 0, k ? -0.3 : 0.3); }
    else { h.rotation.set(-0.3, 0, 0); h.position.z += 0.03; }
  }));
  cam.fov = camState.fov; cam.near = 0.03; cam.far = 400; cam.position.copy(camState.pos); cam.lookAt(camState.look); cam.updateProjectionMatrix();
  const sky = W.g.street.getObjectByName("sky"); if (sky) sky.position.copy(cam.position).sub(SETS.street);
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
const PROPER = ["KHABIB", "MCGREGOR", "CONOR", "CONOR'S", "KHABIB'S", "DAGESTAN", "RUSSIA", "DUBLIN", "IRELAND", "NEW", "YORK", "NOVEMBER", "ARTEM", "LOBOV", "RUSSIAN", "TV", "APRIL", "BROOKLYN", "MICHAEL", "CHIESA", "RAY", "BORG", "AL", "IAQUINTA", "LAS", "VEGAS", "OCTOBER", "DILLON", "DANIS", "ARENA'S"];
const showW = (s: string) => (s === "MCGREGOR" ? "McGregor" : s === "TV" ? "TV" : PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
const Captions: React.FC<{ t: number; list: Word[] }> = ({ t, list }) => {
  let cur: Word | null = null;
  for (let i = 0; i < list.length; i++) { const w = list[i], n = list[i + 1]; if (t >= w.start - 0.03 && t < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  const age = cur ? t - cur.start : 0, e = Math.min(1, Math.max(0, age / 0.12));
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1160, left: 0, right: 0, textAlign: "center", opacity: 0.4 + 0.6 * e, transform: `scale(${0.85 + 0.15 * e}) translateY(${(1 - e) * 14}px)` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 96, color: cur.emph ? "#ffd23a" : "#ffffff", WebkitTextStroke: "12px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{showW(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · sources: ESPN, CBS Sports, Sports Illustrated, CBS News, Fox Sports, Bleacher Report
      </div>
    </>
  );
};
const make = (part: 1 | 2 | 3): React.FC => () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#07080d" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.03, far: 400 }}>
        <Inner part={part} />
      </ThreeCanvas>
      <Captions t={f / fps} list={WORDS[part] as Word[]} />
      <Audio src={staticFile(`mma${part}/mix.wav`)} />
    </AbsoluteFill>
  );
};
export const Mma1Short = make(1);
export const Mma2Short = make(2);
export const Mma3Short = make(3);
