// "The Great Stink of 1858" (London), detailed style, rendered at 60 fps for smooth motion.
// Smoothness: every character pose is keyframed and eased (0.4 s blends), cameras glide on eased paths with no shake,
// walk cycles are continuous, arms are kept outside the body (char.ts), and an overlap check warns (console) whenever
// two characters, a character and an obstacle, or the camera and a character intersect.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armPts, CharSpec } from "../look/char";
import { M, MP, cyl, put, rbox } from "../look/kit";
import { Victorian, SETS, newspaperTex } from "./victorian";
import WORDS from "./words.json";

export const STINK_FPS = 60;
export const STINK_FRAMES = 60 * STINK_FPS;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

const P = (o: Partial<CharSpec>): CharSpec => ({ skin: "#f1c7a2", shirt: "#2a2a34", cap: "#000", capLogo: "#000", hair: "#5a3a20", bodyR: 0.21, bodyLen: 0.3, headR: 0.27, legLen: 0.64, hat: "top", coat: "#2a2a34", ...o });
const CAST: Record<string, CharSpec> = {
  mp1: P({ whiskers: "#5a3a20" }), mp2: P({ shirt: "#3a2a22", coat: "#3a2a22", whiskers: "#9a9a9a", hair: "#9a9a9a", skin: "#e8b58f" }), mp3: P({ shirt: "#1d2a3a", coat: "#1d2a3a", stache: "#2a1a12", skin: "#f3d1b0" }), mp4: P({ shirt: "#2a3a2a", coat: "#2a3a2a", whiskers: "#b5651d", hair: "#b5651d" }),
  lady: P({ hat: "lady", hatColor: "#5a3a5a", shirt: "#7a4a6a", dress: "#7a4a6a", coat: undefined, hair: "#6b4226", bodyR: 0.19, skin: "#f3d1b0" }),
  worker: P({ hat: "flat", hatColor: "#5a5048", shirt: "#7a6a5a", coat: undefined, stache: "#3a2416", skin: "#e0a880" }),
  worker2: P({ hat: "flat", hatColor: "#3a3a3e", shirt: "#5a6a7a", coat: undefined, skin: "#c98c64", hair: "#1a1410" }),
  newsboy: P({ hat: "flat", hatColor: "#7a6a5a", shirt: "#9a7a5a", coat: undefined, bodyR: 0.15, bodyLen: 0.22, headR: 0.25, legLen: 0.46, shorts: "#4a4a50", hair: "#b5651d" }),
  maid1: P({ hat: "mob", hatColor: "#5a8ac8", hairStyle: "tufts", shirt: "#3a3a4a", dress: "#3a3a4a", coat: undefined, bodyR: 0.19, skin: "#f3d1b0" }),
  maid2: P({ hat: "mob", hatColor: "#c86a8a", hairStyle: "tufts", shirt: "#4a3a3a", dress: "#4a3a3a", coat: undefined, bodyR: 0.19, skin: "#c98c64", hair: "#2a1a12" }),
  snow: P({ hat: "none", hairStyle: "top", hair: "#3a2416", whiskers: "#3a2416", shirt: "#1c1c22", coat: "#1c1c22" }),
  baz: P({ stache: "#2a1a12", whiskers: "#2a1a12", shirt: "#2a2a30", coat: "#2a2a30", skin: "#e8b58f" }),
  kid1: P({ hat: "cap", cap: "#d8262e", capLogo: "#fff", shirt: "#1aa3a6", coat: undefined, bodyR: 0.15, bodyLen: 0.22, headR: 0.24, legLen: 0.46, shorts: "#2a3554", skin: "#f1c7a2" }),
  kid2: P({ hat: "none", hairStyle: "bun", hair: "#2a1a12", shirt: "#ffc928", coat: undefined, bodyR: 0.15, bodyLen: 0.22, headR: 0.24, legLen: 0.46, shorts: "#3a2a5a", skin: "#8d5a3b" }),
};

type Set = keyof typeof SETS;
type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number];
type Shot = { a: number; b: number; set: Set; era?: "old" | "today" | "sunset"; cams: Cam[] };
const SHOTS: Shot[] = [
  { a: 0, b: 2.9, set: "river", era: "old", cams: [[0, V(8, 3.0, -30), V(46, 8, -3), V(12, 3.4, -28), V(46, 8.5, -3), 54, 52]] },
  { a: 2.9, b: 5.2, set: "river", era: "old", cams: [[2.9, V(-12.4, 1.65, 4.6), V(-12.9, 1.45, 1.4), V(-12.6, 1.62, 4.3), V(-12.9, 1.45, 1.4), 48, 46]] },
  { a: 5.2, b: 6.7, set: "river", era: "old", cams: [[5.2, V(-4.0, 1.3, 4.3), V(-4.0, 1.15, 2.6), V(-4.0, 1.3, 4.1), V(-4.0, 1.15, 2.6), 46, 44]] },
  { a: 6.7, b: 10.9, set: "river", era: "old", cams: [[6.7, V(-4.6, 0.1, -5.6), V(-8, -0.4, -2.0), V(-5.0, 0.0, -5.3), V(-8, -0.5, -2.0), 52, 50]] },
  { a: 10.9, b: 12.2, set: "street", cams: [[10.9, V(8.3, 1.62, -0.6), V(8.3, 1.6, -2.28), V(8.3, 1.62, -0.85), V(8.3, 1.6, -2.28), 44, 42]] },
  { a: 12.2, b: 15.0, set: "street", cams: [[12.2, V(3.0, 1.7, 6.2), V(-1.5, 1.4, 0.3), V(2.2, 1.7, 5.6), V(-1.8, 1.4, 0.3), 52, 50]] },
  { a: 15.0, b: 17.8, set: "river", era: "old", cams: [[15.0, V(34, 2.6, -16), V(50, 6.5, -3), V(37, 2.8, -14), V(50, 7.5, -3), 52, 50]] },
  { a: 17.8, b: 20.9, set: "commons", cams: [[17.8, V(-5.55, 1.8, 5.4), V(-5.5, 1.4, -0.4), V(-5.55, 1.75, 4.9), V(-5.5, 1.45, -0.4), 54, 52]] },
  { a: 20.9, b: 22.1, set: "commons", cams: [[20.9, V(0.5, 1.6, 1.3), V(1.7, 1.25, 0.2), V(0.6, 1.6, 1.2), V(1.7, 1.25, 0.2), 46, 44]] },
  { a: 22.1, b: 26.0, set: "street", cams: [[22.1, V(-10.4, 1.7, 2.4), V(-12.4, 1.7, -2.3), V(-10.9, 1.7, 2.0), V(-12.4, 1.75, -2.3), 50, 48]] },
  { a: 26.0, b: 30.7, set: "street", cams: [[26.0, V(0.6, 1.6, 5.6), V(-2.2, 1.45, 1.2), V(0.1, 1.6, 5.0), V(-2.2, 1.45, 1.2), 50, 48]] },
  { a: 30.7, b: 32.2, set: "street", cams: [[30.7, V(1.6, 1.8, 7.0), V(-2.2, 1.3, 1.6), V(1.3, 1.8, 6.8), V(-2.2, 1.3, 1.6), 54, 54]] },
  { a: 32.2, b: 34.5, set: "commons", cams: [[32.2, V(0, 2.8, 8.4), V(0, 1.3, -2), V(0, 2.6, 7.4), V(0, 1.3, -2), 54, 52]] },
  { a: 34.5, b: 37.4, set: "commons", cams: [[34.5, V(0.0, 1.75, -2.75), V(0, 0.965, -3.7), V(0.0, 1.7, -2.85), V(0, 0.965, -3.7), 44, 42]] },
  { a: 37.4, b: 39.7, set: "commons", cams: [[37.4, V(2.2, 4.0, -7.9), V(2.2, 4.0, -9.96), V(2.2, 4.0, -8.1), V(2.2, 4.0, -9.96), 46, 44]] },
  { a: 39.7, b: 44.3, set: "tunnel", cams: [[39.7, V(1.0, 1.75, 1.0), V(-0.8, 1.25, -3.4), V(0.6, 1.7, 0.4), V(-0.8, 1.25, -3.4), 52, 50]] },
  { a: 44.3, b: 47.5, set: "tunnel", cams: [[44.3, V(-0.75, 2.0, -2.55), V(-1.0, 0.93, -3.2), V(-0.8, 1.95, -2.65), V(-1.0, 0.93, -3.2), 48, 46]] },
  { a: 47.5, b: 50.1, set: "river", era: "old", cams: [[47.5, V(-46.0, 2.7, 3.8), V(-40.0, -0.4, -1.4), V(-45.4, 2.6, 3.4), V(-40.0, -0.4, -1.4), 56, 54]] },
  { a: 50.1, b: 53.5, set: "river", era: "today", cams: [[50.1, V(16, 1.6, -16), V(46, 6, -2), V(20, 1.7, -16.5), V(46, 6.5, -2), 52, 50]] },
  { a: 53.5, b: 60.0, set: "river", era: "sunset", cams: [[53.5, V(-12.5, 3.2, 3.0), V(-14.0, 1.3, -10.4), V(-7.5, 3.0, 2.6), V(-6.0, 1.4, -10.4), 60, 58]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (s: Shot, t: number) => {
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = u * u * (3 - 2 * u) * 0.7 + u * 0.3;          // a gentle ease, never a stop-start
  const o = SETS[s.set];
  return { pos: c[1].clone().lerp(c[3], k).add(o), look: c[2].clone().lerp(c[4], k).add(o), fov: c[5] + (c[6] - c[5]) * k };
};

// ---------------- smooth, keyframed acting ----------------
type Arm = ArmName | "nose" | "fan" | "pick" | "paper";
type Key = { t: number; L?: Arm; R?: Arm; mouth?: Mouth; yaw?: number; pitch?: number; brow?: number };
const armAt = (c: Toon, a: Arm, sx: number, t: number): THREE.Vector3[] => {
  const R = c.spec.bodyR, sh = c.shoulderY, hy = c.head.position.y, hr = c.spec.headR;
  switch (a) {
    case "nose": return [V(sx * (R + 0.09), sh - 0.08, 0.22), V(sx * 0.03, hy - hr * 0.3, hr + 0.07)];
    case "fan": return [V(sx * (R + 0.1), sh - 0.02, 0.18), V(sx * (hr + 0.1), hy - 0.05 + 0.05 * Math.sin(t * 14), 0.18 + 0.06 * Math.sin(t * 14))];
    case "pick": { const s = Math.sin(t * 4); return [V(sx * (R + 0.1), sh + 0.05 * s, 0.2), V(sx * 0.1, sh + 0.25 * s, R + 0.3)]; }
    case "paper": return [V(sx * (R + 0.06), sh - 0.15, 0.16), V(sx * 0.16, sh - 0.05, R + 0.26)];
    default: return armPts(c, a, sx, t);
  }
};
/** pose at time t from keyframes: everything blends over 0.4 s after each key */
const track = (c: Toon, t: number, keys: Key[], walk?: number) => {
  let k = 0; while (k + 1 < keys.length && t >= keys[k + 1].t) k++;
  const cur = keys[k], prev = keys[Math.max(0, k - 1)], u = k === 0 ? 1 : ss(cur.t, cur.t + 0.4, t);
  const L = (n?: Arm) => n ?? "rest";
  const mix = (a: Arm, b: Arm, sx: number) => armAt(c, a, sx, t).map((v, i) => v.clone().lerp(armAt(c, b, sx, t)[i], u));
  const num = (a: number | undefined, b: number | undefined, d = 0) => (a ?? d) + ((b ?? d) - (a ?? d)) * u;
  const blinkT = [1.3, 3.9].reduce((b, x) => { const d = Math.abs(((t - x) % 4.6 + 4.6) % 4.6); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.6 - d) / 0.08)); }, 0);
  c.pose({
    blink: blinkT, mouth: (u < 0.5 ? prev.mouth : cur.mouth) ?? "smile", brow: num(prev.brow, cur.brow, 0.3),
    headYaw: num(prev.yaw, cur.yaw) + 0.04 * Math.sin(t * 0.9 + c.spec.headR * 50), headPitch: num(prev.pitch, cur.pitch) + 0.02 * Math.sin(t * 1.3),
    armL: mix(L(prev.L), L(cur.L), -1), armR: mix(L(prev.R), L(cur.R), 1),
    bob: Math.sin(t * 2.2 + c.spec.headR * 40) * 0.005 + (walk !== undefined ? Math.abs(Math.sin(walk)) * 0.025 : 0), walk,
  });
};

class World {
  v = new Victorian(); c: Record<string, Toon> = {}; paper: THREE.Mesh; cloth: THREE.Mesh; pick: THREE.Group; pick2: THREE.Group;
  constructor(scene: THREE.Scene) {
    scene.add(this.v.root);
    for (const k of Object.keys(CAST)) this.c[k] = new Toon(this.v.root, CAST[k], 0, 0, 0);
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.55), new THREE.MeshStandardMaterial({ map: newspaperTex(), roughness: 0.8, side: THREE.DoubleSide })); this.paper.castShadow = true;
    this.cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.3), MP("#f2ecd8", 0.8, { side: THREE.DoubleSide, clearcoat: 0 })); this.cloth.castShadow = true;
    const mk = () => { const g = new THREE.Group(); put(g, cyl(0.02, 0.02, 0.8, 8), M("#7a5a3a", 0.7), 0, 0.3, 0); put(g, rbox(0.45, 0.05, 0.05, 0.01), M("#5a5a60", 0.4, 0.8), 0, 0.7, 0); return g; };
    this.pick = mk(); this.pick2 = mk();
  }
}

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const W = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4;
    scene.background = new THREE.Color("#d8d0a0");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.5, distanceFalloff: 1.0, intensity: 2.2, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.6, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.4, offset: 0.32 })));
    composer.setSize(size.width, size.height);
    return { composer };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = shotAt(t), Vc = W.v, C = W.c, idx = SHOTS.indexOf(s);
  (Object.keys(SETS) as Set[]).forEach((k) => ((Vc as unknown as Record<string, THREE.Group>)[k].visible = k === s.set));
  if (s.set === "river") Vc.setEra(s.era === "today" || s.era === "sunset", s.era === "sunset");
  const O = SETS[s.set];
  Object.values(C).forEach((c) => { c.root.visible = false; c.held.forEach((h) => h?.parent?.remove(h)); c.held = [null, null]; c.legs.forEach((l) => (l.rotation.x = 0)); });
  const place = (k: string, x: number, z: number, ry: number, y = 0) => { const c = C[k]; c.root.visible = true; c.root.position.set(O.x + x, O.y + y, O.z + z); c.root.rotation.set(0, ry, 0); return c; };
  const hold = (c: Toon, k: number, obj: THREE.Object3D) => { c.held[k] = obj; c.root.add(obj); };
  const seat = (c: Toon, seatY: number) => { c.root.position.y = O.y + seatY - c.spec.legLen; c.legs.forEach((l) => (l.rotation.x = -Math.PI / 2)); };

  // water drifts, sludge pours, steamer paddles, the tour boat glides
  Vc.waterMat.map!.offset.set(t * 0.004, t * 0.002);
  const ofl = Vc.outflow.material as THREE.MeshPhysicalMaterial; if (ofl.map) ofl.map.offset.set(0, -t * 0.25);
  Vc.wheel.rotation.x = t * 2.2; Vc.steamer.position.x = 26 - t * 0.6;
  Vc.tour.position.x = -16 + Math.max(0, t - 53.5) * 1.6;
  // stink wisps + flies near the action (1858 only)
  const stinky = s.era === "old" || s.set === "street" || (s.set === "commons" && t < 39.7);
  const ctr = camAt(s, t).look;
  Vc.wisps.forEach((w, k) => {
    w.visible = stinky; if (!stinky) return;
    const ph = (t * 0.18 + k / 20) % 1, ang = k * 2.4;
    w.position.set(ctr.x + Math.cos(ang) * (1.5 + (k % 5) * 0.9), ctr.y - 1.2 + ph * 3.2, ctr.z + Math.sin(ang) * (1.2 + (k % 4) * 0.8));
    w.scale.set(0.5, 1.7, 1); (w.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * ph) * 0.6;
  });
  Vc.flies.forEach((fl, k) => { fl.visible = stinky && k < 5; if (!fl.visible) return; fl.position.set(ctr.x + Math.sin(t * 3 + k * 2) * 1.2, ctr.y + 0.2 + Math.cos(t * 2.3 + k) * 0.5, ctr.z + Math.cos(t * 2.7 + k * 1.3) * 1.0); fl.scale.setScalar(0.35); });
  // curtains darken as they are soaked; the bill gets its LAW stamp; the day counter flips 1..18
  Vc.curtainsWet.forEach((m) => m.color.set(new THREE.Color("#7a1d2a").lerp(new THREE.Color("#3a2a22"), ss(18.0, 20.5, t))));
  Vc.setBill(ss(36.9, 37.15, t)); Vc.setDays(Math.max(1, Math.min(18, 1 + Math.floor(Math.max(0, t - 37.5) / 0.1))));
  Vc.plan.map = t < 44.5 ? Vc.planA : Vc.planB;

  switch (idx) {
    case 1: {
      track(place("lady", -13.5, 1.4, 0.25), t, [{ t: 2.9, L: "rest", R: "rest", mouth: "o" }, { t: 3.2, L: "rest", R: "nose", mouth: "flat", brow: 1 }]);
      track(place("mp1", -12.3, 1.2, -0.3), t, [{ t: 2.9, L: "hip", R: "rest", mouth: "flat" }, { t: 3.6, L: "hip", R: "nose", mouth: "flat", brow: 1 }]);
      break;
    }
    case 2: { const nb = place("newsboy", -4.0, 2.4, 0); track(nb, t, [{ t: 5.2, L: "paper", R: "paper", mouth: "talk" }]); hold(nb, 1, W.paper); break; }
    case 3: { track(place("worker", -4.6, -0.2, -2.2), t, [{ t: 6.7, L: "rest", R: "rest", mouth: "o", pitch: 0.4 }, { t: 7.6, L: "hip", R: "nose", mouth: "flat", pitch: 0.3 }]); break; }
    case 5: {
      const w = 12.2;
      track(place("lady", -0.6 + (t - w) * 0.35, 1.4, -Math.PI / 2 + 0.3), t, [{ t: w, L: "rest", R: "fan", mouth: "flat" }], t * 6);
      track(place("worker", -2.6, 2.2, 0.6), t, [{ t: w, L: "rest", R: "rest", mouth: "o" }, { t: w + 0.6, L: "hip", R: "nose", mouth: "flat" }]);
      track(place("mp1", 0.6, 2.6, -0.5), t, [{ t: w, L: "nose", R: "hip", mouth: "flat", brow: 1 }]);
      break;
    }
    case 7: {
      track(place("maid1", -5.3, -0.6, -Math.PI / 2), t, [{ t: 17.8, L: "rest", R: "hold", mouth: "flat" }, { t: 18.4, L: "hold", R: "raise", mouth: "o" }, { t: 19.6, L: "hold", R: "hold", mouth: "flat" }]);
      hold(C.maid1, 1, W.cloth);
      track(place("maid2", -5.3, 1.3, -Math.PI / 2 - 0.2), t, [{ t: 17.8, L: "nose", R: "rest", mouth: "flat" }, { t: 19.0, L: "nose", R: "hold", mouth: "flat" }]);
      break;
    }
    case 8: { const m = place("mp2", 1.75, 0.2, -Math.PI / 2); seat(m, 0.56); track(m, t, [{ t: 20.9, L: "nose", R: "rest", mouth: "flat", brow: 1 }, { t: 21.3, L: "nose", R: "fan", mouth: "dazed" }]); seat(m, 0.56); break; }
    case 9: {
      track(place("mp3", -11.0, 0.0, Math.PI - 0.5), t, [{ t: 22.1, L: "nose", R: "rest", mouth: "flat" }, { t: 23.6, L: "nose", R: "point", mouth: "talk" }]);
      track(place("lady", -13.4, -0.2, Math.PI + 0.3), t, [{ t: 22.1, L: "rest", R: "nose", mouth: "flat" }]);
      break;
    }
    case 10: case 11: {
      track(place("snow", -2.3, 2.3, -0.5), t, [{ t: 26.0, L: "hip", R: "rest", mouth: "smile" }, { t: 26.6, L: "hip", R: "point", mouth: "talk", yaw: -0.4 }, { t: 29.2, L: "shrug", R: "shrug", mouth: "talk", yaw: 0.3 }, { t: 30.8, L: "hip", R: "point", mouth: "o", yaw: 0.6 }]);
      if (idx === 11) {
        const u = t - 30.7;
        track(place("mp1", 0.6 - u * 1.3, 3.6, -Math.PI / 2), t, [{ t: 30.7, L: "nose", R: "rest", mouth: "flat", pitch: -0.2, yaw: 0.4 }], t * 7);
        track(place("lady", 1.8 - u * 1.2, 4.3, -Math.PI / 2), t, [{ t: 30.7, L: "rest", R: "fan", mouth: "flat", yaw: 0.6 }], t * 7 + 1);
      }
      break;
    }
    case 12: {
      const seats: [string, number, number][] = [["mp1", -1.75, -1.5], ["mp2", 1.75, -0.6], ["mp3", -2.65, 1.2], ["mp4", 1.75, 2.0]];
      seats.forEach(([k, x, z], i) => { const m = place(k, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2); const sy = Math.abs(x) < 2 ? 0.56 : 0.98; seat(m, sy); track(m, t + i * 0.3, [{ t: 32.2, L: "nose", R: i % 2 ? "fan" : "rest", mouth: i === 2 ? "dazed" : "flat", brow: 1 }]); seat(m, sy); });
      break;
    }
    case 15: {
      const b = place("baz", -0.2, -2.1, 0.45);
      track(b, t, [{ t: 39.7, L: "hip", R: "point", mouth: "talk", pitch: 0.3, yaw: 0.3 }, { t: 41.6, L: "hip", R: "raise", mouth: "grin" }, { t: 43.2, L: "rest", R: "point", mouth: "talk", pitch: 0.3 }]);
      for (const [k, x, z, pk] of [["worker", 1.0, -9.5, W.pick], ["worker2", -1.1, -11.0, W.pick2]] as const) { const w = place(k, x, z, Math.PI); track(w, t, [{ t: 39.7, L: "pick", R: "pick", mouth: "grin" }]); hold(w, 1, pk); }
      break;
    }
    case 17: {
      for (const [k, x, z, pk] of [["worker", -38.2, 1.0, W.pick], ["worker2", -39.6, 1.5, W.pick2]] as const) { const w = place(k, x, z, Math.PI + 0.4); track(w, t + x, [{ t: 47.5, L: "pick", R: "pick", mouth: "grin" }]); hold(w, 1, pk); }
      track(place("baz", -30.6, 3.4, -2.0), t, [{ t: 47.5, L: "hip", R: "point", mouth: "talk" }]);
      break;
    }
    case 18: case 19: {
      const u = t - 50.1;
      track(place("kid1", 4 + u * 0.9, 2.6, Math.PI / 2), t, [{ t: 50.1, L: "rest", R: "point", mouth: "grin", yaw: -0.5 }], t * 7);
      track(place("kid2", 3 + u * 0.9, 3.4, Math.PI / 2), t, [{ t: 50.1, L: "wave", R: "rest", mouth: "laugh", yaw: -0.4 }], t * 7 + 1);
      if (idx === 19) { track(place("kid1", -3.0, 1.0, Math.PI + 0.2), t, [{ t: 53.5, L: "rest", R: "wave", mouth: "laugh" }]); track(place("kid2", -4.3, 1.2, Math.PI - 0.2), t, [{ t: 53.5, L: "cheer", R: "cheer", mouth: "laugh" }]); }
      break;
    }
  }
  Object.values(C).forEach((c) => c.held.forEach((h, k) => {
    if (!h) return; h.position.copy(c.hands[k].position); h.position.y += 0.02;
    if (h === W.paper) { h.position.set(0, c.shoulderY - 0.05, c.spec.bodyR + 0.3); h.rotation.set(-0.1, 0, 0); }
    if (h === W.pick || h === W.pick2) h.rotation.set(-0.6 + 0.5 * Math.sin(t * 4), 0, 0);
  }));

  // ---------------- camera ----------------
  const c = camAt(s, t);
  if (idx === 19) { const bx = O.x + Vc.tour.position.x - 0.5; c.pos.x = bx + 1.0; c.look.x = bx; }
  cam.fov = c.fov; cam.near = 0.03; cam.far = 400; cam.position.copy(c.pos); cam.lookAt(c.look); cam.updateProjectionMatrix();
  if (s.set === "river") { Vc.sun.target.position.copy(c.look).setY(0); Vc.sun.position.copy(Vc.sun.target.position).add(s.era === "sunset" ? V(-40, 9, 20) : V(-16, 36, 24)); const sky = Vc.river.getObjectByName("sky"); if (sky) sky.position.copy(cam.position).sub(O); }

  // ---------------- overlap checks (warnings show up in the stills log) ----------------
  const vis = Object.entries(C).filter(([, ch]) => ch.root.visible && ch.root.parent === Vc.root);
  const loc = (ch: Toon) => ch.root.position.clone().sub(O);
  for (let i = 0; i < vis.length; i++) {
    const [ka, a] = vis[i], pa = loc(a);
    for (let j = i + 1; j < vis.length; j++) { const [kb, b] = vis[j], pb = loc(b); if (Math.hypot(pa.x - pb.x, pa.z - pb.z) < a.spec.bodyR + b.spec.bodyR + 0.08) console.warn(`OVERLAP t=${t.toFixed(2)} ${ka}~${kb}`); }
    for (const [ox, oz, r] of Vc.obstacles[s.set]) if (r > 0 && Math.hypot(pa.x - ox, pa.z - oz) < r + a.spec.bodyR) console.warn(`OVERLAP t=${t.toFixed(2)} ${ka}~obstacle(${ox},${oz})`);
    if (s.set === "commons" && a.legs[0].rotation.x === 0 && Math.abs(pa.x) > 1.15 && Math.abs(pa.x) < 4.8 && Math.abs(pa.z) < 7.1) console.warn(`OVERLAP t=${t.toFixed(2)} ${ka}~bench`);
    const hp = new THREE.Vector3(); a.head.getWorldPosition(hp); if (hp.distanceTo(cam.position) < a.spec.headR + 0.15) console.warn(`OVERLAP t=${t.toFixed(2)} camera~${ka}`);
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
type Word = { start: number; end: number; text: string };
const LIST = WORDS as Word[];
const PROPER = ["LONDON", "GREAT", "STINK", "RIVER", "THAMES", "PARLIAMENT", "JOHN", "SNOW", "JOSEPH", "BAZALGETTE"];
const showW = (s: string) => (PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
const Captions: React.FC<{ t: number }> = ({ t }) => {
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) { const w = LIST[i], n = LIST[i + 1]; if (t >= w.start - 0.03 && t < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  // captions ease in (scale + fade over 0.12 s) for a smoother feel
  const age = cur ? t - cur.start : 0, e = Math.min(1, Math.max(0, age / 0.12));
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", opacity: 0.4 + 0.6 * e, transform: `scale(${0.92 + 0.08 * e})` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 66, color: "#ffffff", WebkitTextStroke: "9px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{showW(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · sources: London Museum, Historic England, Historic UK, History.co.uk, ICE, Wikipedia
      </div>
    </>
  );
};
export const StinkShort: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#20242a" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.03, far: 400 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / fps} />
      <Audio src={staticFile("stink/mix.wav")} />
    </AbsoluteFill>
  );
};
