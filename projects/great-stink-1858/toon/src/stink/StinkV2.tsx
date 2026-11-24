// "The Great Stink of 1858" V2: remade in the reference style (long moving shots, close framing, rim light), rendered at 60 fps for smooth motion.
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

export const STINK2_FPS = 60;
export const STINK2_FRAMES = 60 * STINK2_FPS;
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
// V2 ("reference style"): few long shots, the camera never stops (Catmull-Rom path through timed keys), close framing.
type CK = [number, THREE.Vector3, THREE.Vector3, number];   // time, position, look-at, fov
type Shot = { a: number; b: number; set: Set; era?: "old" | "today" | "sunset"; keys: CK[] };
const SHOTS: Shot[] = [
  { a: 0, b: 6.7, set: "river", era: "old", keys: [[0, V(-10.6, 1.65, 5.4), V(-13.0, 1.25, 1.8), 46], [3, V(-12.3, 1.55, 5.2), V(-12.9, 1.2, 1.9), 46], [5.4, V(-13.3, 1.4, 4.3), V(-13.0, 1.2, 2.4), 44], [6.7, V(-13.4, 1.36, 4.0), V(-13.0, 1.15, 2.45), 42]] },
  { a: 6.7, b: 12.2, set: "river", era: "old", keys: [[6.7, V(-5.0, 0.0, -5.6), V(-8, -0.5, -2.0), 50], [8.8, V(-6.0, 0.7, -3.6), V(-8, -0.3, -1.6), 48], [10.6, V(-8.9, 1.9, -0.9), V(-6.4, 1.2, 0.9), 46], [12.2, V(-8.6, 1.65, 1.5), V(-6.3, 1.3, 1.0), 44]] },
  { a: 12.2, b: 14.9, set: "street", keys: [[12.2, V(0.9, 1.55, 4.5), V(-1.0, 1.3, 1.6), 46], [14.9, V(2.4, 1.6, 4.4), V(0.5, 1.3, 1.6), 44]] },
  { a: 14.9, b: 17.8, set: "river", era: "old", keys: [[14.9, V(28, 1.2, -11), V(50, 5, -3), 52], [17.8, V(38, 5.0, -17), V(48, 10, -3), 50]] },
  { a: 17.8, b: 22.1, set: "commons", keys: [[17.8, V(-5.2, 1.75, 4.6), V(-5.4, 1.35, 0.4), 46], [19.6, V(-5.0, 2.0, 3.9), V(-5.2, 1.3, 0.6), 48], [20.9, V(-1.2, 3.4, 2.8), V(1.75, 1.2, 0.2), 48], [21.6, V(0.1, 1.9, 1.7), V(1.75, 1.2, 0.2), 46], [22.1, V(0.45, 1.65, 1.35), V(1.75, 1.2, 0.2), 44]] },
  { a: 22.1, b: 32.2, set: "street", keys: [[22.1, V(-11.3, 1.65, 3.7), V(-11.9, 1.35, -0.6), 46], [24.6, V(-11.7, 1.6, 3.3), V(-11.9, 1.35, -0.6), 44], [26.0, V(-6.0, 1.8, 5.8), V(-2.6, 1.5, 1.6), 48], [28.2, V(-0.7, 1.6, 4.8), V(-2.0, 1.5, 1.6), 44], [30.5, V(0.4, 1.6, 5.4), V(-2.2, 1.45, 1.4), 46], [32.2, V(0.9, 1.75, 6.4), V(-2.2, 1.35, 1.4), 48]] },
  { a: 32.2, b: 39.7, set: "commons", keys: [[32.2, V(0, 2.4, 7.6), V(0, 1.2, -1), 50], [34.0, V(0, 2.0, 2.2), V(0, 1.0, -2.6), 48], [35.6, V(0, 1.75, -2.55), V(0, 0.97, -3.6), 44], [36.9, V(0, 1.65, -2.8), V(0, 0.965, -3.7), 42], [37.7, V(0.6, 2.6, -5.0), V(1.6, 3.5, -9.96), 46], [39.7, V(2.0, 3.9, -7.7), V(2.2, 4.0, -9.96), 46]] },
  { a: 39.7, b: 47.5, set: "tunnel", keys: [[39.7, V(0.5, 1.7, 0.8), V(0.6, 1.35, -2.3), 46], [42.0, V(-0.6, 1.8, -0.4), V(0.6, 1.2, -5.0), 50], [43.9, V(0.0, 2.0, -1.9), V(-0.9, 0.95, -3.2), 46], [45.2, V(-0.75, 2.0, -2.5), V(-1.0, 0.93, -3.2), 46], [47.5, V(-0.88, 1.85, -2.45), V(-1.0, 0.93, -3.25), 44]] },
  { a: 47.5, b: 50.1, set: "river", era: "old", keys: [[47.5, V(-46.5, 2.4, 4.5), V(-40, -0.2, -1.4), 54], [50.1, V(-42.6, 2.2, 4.9), V(-37.4, 0.2, -1.0), 52]] },
  { a: 50.1, b: 53.5, set: "river", era: "today", keys: [[50.1, V(0, 0, 0), V(0, 0, 0), 46], [53.5, V(0, 0, 0), V(0, 0, 0), 44]] },
  { a: 53.5, b: 60.0, set: "river", era: "sunset", keys: [[53.5, V(-12.5, 3.2, 3.0), V(-14.0, 1.3, -10.4), 60], [60, V(-7.5, 3.0, 2.6), V(-6.0, 1.4, -10.4), 58]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const curves = new Map<Shot, { p: THREE.CatmullRomCurve3; l: THREE.CatmullRomCurve3 }>();
const camAt = (s: Shot, t: number) => {
  if (!curves.has(s)) { const ext = (i: number) => s.keys.map((k) => k[i] as THREE.Vector3); curves.set(s, { p: new THREE.CatmullRomCurve3(ext(1), false, "centripetal"), l: new THREE.CatmullRomCurve3(ext(2), false, "centripetal") }); }
  const cv = curves.get(s)!, K = s.keys;
  // gentle ease in/out on the whole shot only; inside, the camera keeps gliding
  const g = (t - s.a) / (s.b - s.a), ge = Math.min(1, Math.max(0, g)), w = ge * ge * (3 - 2 * ge) * 0.35 + ge * 0.65, tt = s.a + w * (s.b - s.a);
  let i = 0; while (i + 2 < K.length && tt >= K[i + 1][0]) i++;
  const fr = Math.min(1, Math.max(0, (tt - K[i][0]) / (K[i + 1][0] - K[i][0]))), u = (i + fr) / (K.length - 1);
  const o = SETS[s.set];
  return { pos: cv.p.getPoint(u).add(o), look: cv.l.getPoint(u).add(o), fov: K[i][3] + (K[i + 1][3] - K[i][3]) * fr };
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
  if (walk === undefined) { c.root.rotation.y += 0.07 * Math.sin(t * 1.1 + c.spec.headR * 33); c.root.rotation.z = 0.025 * Math.sin(t * 1.7 + c.spec.bodyR * 21); }
  c.pose({
    blink: blinkT, mouth: (u < 0.5 ? prev.mouth : cur.mouth) ?? "smile", brow: num(prev.brow, cur.brow, 0.3),
    headYaw: num(prev.yaw, cur.yaw) + 0.09 * Math.sin(t * 0.9 + c.spec.headR * 50), headPitch: num(prev.pitch, cur.pitch) + 0.04 * Math.sin(t * 1.3 + c.spec.bodyR * 30),
    armL: mix(L(prev.L), L(cur.L), -1), armR: mix(L(prev.R), L(cur.R), 1),
    bob: Math.sin(t * 2.2 + c.spec.headR * 40) * 0.014 + (walk !== undefined ? Math.abs(Math.sin(walk)) * 0.025 : 0), walk,
  });
};

class World {
  v = new Victorian(); c: Record<string, Toon> = {}; rim = new THREE.DirectionalLight("#7fb6ff", 2.4); rim2 = new THREE.DirectionalLight("#ff9a5a", 1.8); paper: THREE.Mesh; cloth: THREE.Mesh; pick: THREE.Group; pick2: THREE.Group;
  constructor(scene: THREE.Scene) {
    scene.add(this.v.root); scene.add(this.rim, this.rim.target, this.rim2, this.rim2.target);
    // darker ambient = more contrast; the key/rim lights do the shaping
    this.v.root.traverse((o) => { if ((o as THREE.HemisphereLight).isHemisphereLight) (o as THREE.HemisphereLight).intensity *= 0.55; });
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
    scene.background = new THREE.Color("#c9845a");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.5, distanceFalloff: 1.0, intensity: 2.2, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.85, luminanceThreshold: 1.15, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.7 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.55, offset: 0.28 })));
    composer.setSize(size.width, size.height);
    return { composer };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = shotAt(t), Vc = W.v, C = W.c, idx = SHOTS.indexOf(s);
  (Object.keys(SETS) as Set[]).forEach((k) => ((Vc as unknown as Record<string, THREE.Group>)[k].visible = k === s.set));
  if (s.set === "river") { Vc.setEra(s.era === "today" || s.era === "sunset", s.era === "sunset"); if (s.era === "old") { const u = Vc.skyMat.uniforms; u.top.value.set("#4a4070"); u.mid.value.set("#e89a5a"); u.bot.value.set("#ffcf8a"); } }
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
  const stinky = s.era === "old" || s.set === "street" || (s.set === "commons" && t < 36.6);
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
    case 0: {   // three Londoners on the riverbank; noses go at "smelled so bad", the newsboy shows the headline
      track(place("lady", -13.7, 1.6, 0.35), t, [{ t: 0, L: "rest", R: "rest", mouth: "smile", yaw: 0.3 }, { t: 2.9, L: "rest", R: "nose", mouth: "flat", brow: 1, yaw: -0.2 }, { t: 4.6, L: "fan", R: "nose", mouth: "flat", brow: 1, yaw: 0.3 }]);
      track(place("mp1", -12.3, 1.5, -0.4), t, [{ t: 0, L: "hip", R: "rest", mouth: "talk", yaw: -0.4 }, { t: 3.1, L: "hip", R: "nose", mouth: "o", brow: 1 }, { t: 4.0, L: "shrug", R: "nose", mouth: "flat", brow: 1, yaw: 0.2 }]);
      const nb = place("newsboy", -13.0, 2.5, 0.05);
      track(nb, t, [{ t: 0, L: "wave", R: "rest", mouth: "talk" }, { t: 1.6, L: "rest", R: "nose", mouth: "flat" }, { t: 4.9, L: "paper", R: "paper", mouth: "talk" }]);
      if (t >= 5.1) hold(nb, 1, W.paper);
      break;
    }
    case 1: {   // two workers look down at the sewer outfall, then the heat hits
      track(place("worker", -6.5, 0.7, -Math.PI / 2 - 0.55), t, [{ t: 6.7, L: "rest", R: "point", mouth: "o", pitch: 0.4 }, { t: 9.0, L: "hip", R: "nose", mouth: "flat", pitch: 0.3, brow: 1 }, { t: 11.0, L: "hip", R: "fan", mouth: "dazed", pitch: 0 }]);
      track(place("worker2", -5.9, 1.45, -Math.PI / 2 - 0.85), t, [{ t: 6.7, L: "nose", R: "rest", mouth: "flat", pitch: 0.3 }, { t: 9.6, L: "nose", R: "shrug", mouth: "talk", yaw: 0.4 }, { t: 11.0, L: "fan", R: "fan", mouth: "o", pitch: -0.2 }]);
      break;
    }
    case 2: {
      const w = 12.2;
      track(place("lady", -1.4 + (t - w) * 0.4, 0.75, Math.PI / 2 - 0.3), t, [{ t: w, L: "rest", R: "fan", mouth: "flat", brow: 1 }], t * 6);
      track(place("worker", -2.4, 2.4, 0.7), t, [{ t: w, L: "rest", R: "rest", mouth: "o" }, { t: w + 0.6, L: "hip", R: "nose", mouth: "flat", brow: 1 }, { t: w + 1.8, L: "fan", R: "nose", mouth: "dazed" }]);
      track(place("mp1", 0.9, 2.5, -0.5), t, [{ t: w, L: "nose", R: "hip", mouth: "flat", brow: 1 }, { t: w + 1.2, L: "nose", R: "fan", mouth: "o", yaw: -0.4 }]);
      break;
    }
    case 4: {   // maids soak the curtains while MPs suffer on the benches
      track(place("maid1", -5.45, -0.2, 0.5), t, [{ t: 17.8, L: "rest", R: "hold", mouth: "talk", yaw: 0.6 }, { t: 18.4, L: "hold", R: "raise", mouth: "o" }, { t: 19.6, L: "hold", R: "hold", mouth: "flat" }]);
      hold(C.maid1, 1, W.cloth);
      track(place("maid2", -5.35, 1.6, 0.1), t, [{ t: 17.8, L: "nose", R: "rest", mouth: "flat" }, { t: 19.0, L: "nose", R: "hold", mouth: "flat", yaw: -0.4 }]);
      const sit: [string, number, number, Key[]][] = [
        ["mp2", 1.75, 0.2, [{ t: 17.8, L: "nose", R: "rest", mouth: "flat", brow: 1 }, { t: 20.9, L: "nose", R: "fan", mouth: "dazed" }]],
        ["mp4", 1.75, 1.3, [{ t: 17.8, L: "rest", R: "nose", mouth: "flat" }, { t: 21.0, L: "shrug", R: "shrug", mouth: "o", yaw: -0.4 }]],
        ["mp3", 1.75, -1.0, [{ t: 17.8, L: "fan", R: "rest", mouth: "flat" }, { t: 21.1, L: "nose", R: "nose", mouth: "dazed", yaw: 0.3 }]],
      ];
      sit.forEach(([k, x, z, ks]) => { const m = place(k, x, z, -Math.PI / 2); seat(m, 0.56); track(m, t, ks); seat(m, 0.56); });
      break;
    }
    case 5: {   // miasma believers at the poster -> John Snow and his map -> MPs walk straight past
      track(place("mp3", -11.0, 0.0, 0.7), t, [{ t: 22.1, L: "nose", R: "rest", mouth: "flat" }, { t: 23.4, L: "nose", R: "point", mouth: "talk" }, { t: 24.8, L: "shrug", R: "point", mouth: "talk", yaw: 0.5 }]);
      track(place("lady", -12.6, -0.4, 0.2), t, [{ t: 22.1, L: "rest", R: "nose", mouth: "flat" }, { t: 24.0, L: "fan", R: "nose", mouth: "o", yaw: -0.5 }]);
      track(place("snow", -2.3, 2.3, 0.45), t, [{ t: 22.1, L: "hip", R: "rest", mouth: "smile" }, { t: 26.6, L: "hip", R: "point", mouth: "talk", yaw: -0.4 }, { t: 29.2, L: "shrug", R: "shrug", mouth: "talk", yaw: 0.3 }, { t: 30.8, L: "hip", R: "point", mouth: "o", yaw: 0.6 }]);
      if (t >= 29.6) {
        const u = t - 29.6;
        track(place("mp1", 2.4 - u * 1.2, 3.6, -Math.PI / 2), t, [{ t: 29.6, L: "nose", R: "rest", mouth: "flat", pitch: -0.2, yaw: 0.4 }], t * 7);
        track(place("mp4", 3.6 - u * 1.15, 4.3, -Math.PI / 2), t, [{ t: 29.6, L: "rest", R: "fan", mouth: "talk", yaw: 0.6 }], t * 7 + 1);
      }
      break;
    }
    case 6: {   // suffering benches -> two MPs rush the bill through -> the day counter
      const seats: [string, number, number][] = [["mp3", -2.65, 1.2], ["mp4", 1.75, 2.0], ["baz", -1.75, 3.0], ["snow", 2.65, -0.2]];
      seats.forEach(([k, x, z], i) => { const m = place(k, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2); const sy = Math.abs(x) < 2 ? 0.56 : 0.98; seat(m, sy); track(m, t + i * 0.3, [{ t: 32.2, L: "nose", R: i % 2 ? "fan" : "rest", mouth: i === 2 ? "dazed" : "flat", brow: 1 }, { t: 37.1, L: "cheer", R: "cheer", mouth: "laugh" }]); seat(m, sy); });
      track(place("mp1", 1.05, -3.0, -Math.PI / 2), t, [{ t: 32.2, L: "nose", R: "rest", mouth: "flat" }, { t: 34.4, L: "hip", R: "point", mouth: "talk", pitch: 0.3 }, { t: 37.0, L: "cheer", R: "cheer", mouth: "laugh" }]);
      track(place("mp2", -1.05, -4.8, Math.PI / 2 - 0.3), t, [{ t: 32.2, L: "nose", R: "rest", mouth: "flat" }, { t: 34.8, L: "rest", R: "raise", mouth: "o" }, { t: 37.0, L: "cheer", R: "cheer", mouth: "laugh" }]);
      break;
    }
    case 7: {
      const b = place("baz", 0.7, -2.3, 0.25);
      track(b, t, [{ t: 39.7, L: "hip", R: "raise", mouth: "grin" }, { t: 40.9, L: "hip", R: "point", mouth: "talk", yaw: 0.6 }, { t: 42.6, L: "rest", R: "point", mouth: "talk", yaw: 1.0, pitch: 0.3 }, { t: 44.4, L: "cheer", R: "point", mouth: "laugh", yaw: 1.0 }]);
      for (const [k, x, z, pk] of [["worker", 1.0, -9.5, W.pick], ["worker2", -1.1, -11.0, W.pick2]] as const) { const w = place(k, x, z, Math.PI); track(w, t + x, [{ t: 39.7, L: "pick", R: "pick", mouth: "grin" }]); hold(w, 1, pk); }
      track(place("newsboy", -1.75, -1.6, 0.9), t, [{ t: 39.7, L: "rest", R: "wave", mouth: "laugh" }, { t: 43.0, L: "rest", R: "point", mouth: "o", yaw: 0.6, pitch: 0.4 }]);
      break;
    }
    case 8: {
      for (const [k, x, z, pk] of [["worker", -38.2, 1.0, W.pick], ["worker2", -39.6, 1.5, W.pick2]] as const) { const w = place(k, x, z, Math.PI + 0.4); track(w, t + x, [{ t: 47.5, L: "pick", R: "pick", mouth: "grin" }]); hold(w, 1, pk); }
      track(place("baz", -36.4, 2.6, -2.0), t, [{ t: 47.5, L: "hip", R: "point", mouth: "talk" }, { t: 49.0, L: "cheer", R: "point", mouth: "grin" }]);
      break;
    }
    case 9: case 10: {
      const u = t - 50.1;
      if (idx === 9) {
        track(place("kid1", 4 + u * 0.9, 2.6, Math.PI / 2), t, [{ t: 50.1, L: "rest", R: "point", mouth: "grin", yaw: -0.5 }, { t: 51.8, L: "rest", R: "wave", mouth: "laugh", yaw: 0.6 }], t * 7);
        track(place("kid2", 3 + u * 0.9, 3.4, Math.PI / 2), t, [{ t: 50.1, L: "wave", R: "rest", mouth: "laugh", yaw: -0.4 }], t * 7 + 1);
      } else { track(place("kid1", -3.0, 1.0, Math.PI + 0.2), t, [{ t: 53.5, L: "rest", R: "wave", mouth: "laugh" }]); track(place("kid2", -4.3, 1.2, Math.PI - 0.2), t, [{ t: 53.5, L: "cheer", R: "cheer", mouth: "laugh" }]); }
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
  if (idx === 9) { const kx = O.x + 4 + (t - 50.1) * 0.9; c.pos.set(kx + 2.4 - (t - 50.1) * 0.25, O.y + 1.35, O.z + 5.4); c.look.set(kx - 0.3, O.y + 1.0, O.z + 2.6); }
  if (idx === 10) { const bx = O.x + Vc.tour.position.x - 0.5; c.pos.x = bx + 1.0; c.look.x = bx; }
  cam.fov = c.fov; cam.near = 0.03; cam.far = 400; cam.position.copy(c.pos); cam.lookAt(c.look); cam.updateProjectionMatrix();
  if (s.set === "river") { Vc.sun.target.position.copy(c.look).setY(0); Vc.sun.position.copy(Vc.sun.target.position).add(s.era === "sunset" ? V(-40, 9, 20) : s.era === "today" ? V(-16, 36, 24) : V(-30, 14, 26)); const sky = Vc.river.getObjectByName("sky"); if (sky) sky.position.copy(cam.position).sub(O); }
  W.v.bill.color.set("#bdbdbd"); const glare = s.set === "commons" && t > 34.6 && t < 37.6; W.rim.intensity = glare ? 0.4 : 2.4; W.rim2.intensity = glare ? 0.3 : 1.8;
  // rim light always sits behind the subject (opposite the camera) for the glowing-edge look
  const back = c.look.clone().sub(c.pos).setY(0).normalize();
  W.rim.position.copy(c.look).addScaledVector(back, 8).add(V(0, 5, 0)); W.rim.target.position.copy(c.look);
  W.rim2.position.copy(c.look).addScaledVector(back, 6).add(V(back.z * 5, 2.5, -back.x * 5)); W.rim2.target.position.copy(c.look);
  const heat = s.era === "old" ? ss(10.9, 11.8, t) : 0;
  if (s.set === "river" && s.era === "old") { Vc.sun.intensity = 3.0 + heat * 1.6; Vc.sun.color.set(new THREE.Color("#ffc890").lerp(new THREE.Color("#ff8a40"), heat)); }

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
const KEY = ["1858", "STINK", "THAMES", "HEATWAVE", "PARLIAMENT", "CURTAINS", "CHOLERA", "SNOW", "WATER", "LAW", "18", "DAYS", "BAZALGETTE", "TUNNELS", "1,100", "MILES", "TODAY"];
const showW = (s: string) => (PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
const Captions: React.FC<{ t: number }> = ({ t }) => {
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) { const w = LIST[i], n = LIST[i + 1]; if (t >= w.start - 0.03 && t < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  // captions ease in (scale + fade over 0.12 s) for a smoother feel
  const age = cur ? t - cur.start : 0, e = Math.min(1, Math.max(0, age / 0.12));
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1160, left: 0, right: 0, textAlign: "center", opacity: 0.4 + 0.6 * e, transform: `scale(${0.85 + 0.15 * e}) translateY(${(1 - e) * 14}px)` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 96, color: KEY.includes(cur.text) ? "#ffd23a" : "#ffffff", WebkitTextStroke: "12px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{showW(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · sources: London Museum, Historic England, Historic UK, History.co.uk, ICE, Wikipedia
      </div>
    </>
  );
};
export const Stink2Short: React.FC = () => {
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
