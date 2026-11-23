// "The Woman Who Fooled Doctors With Rabbits" (Mary Toft, 1726), detailed style. Five sets (georgian.ts). The story is
// told through the gullible doctors: Mary stays tucked in bed, cartoon bunnies hop about, a chalk slate keeps count
// (15, then HOAX!), Howard's letter goes to the King, the porter refuses the bribe, the Bridewell notice names her a
// "Notorious and Vile Cheat", and a print shop sells the satire. Nothing graphic is shown.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armMix, CharSpec } from "../look/char";
import { M, MP, cyl, put } from "../look/kit";
import { Georgian, Bunny, SETS } from "./georgian";
import WORDS from "./words.json";

export const TOFT_FRAMES = 1800;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const P = (o: Partial<CharSpec>): CharSpec => ({ skin: "#f1c7a2", shirt: "#5a3a22", cap: "#000", capLogo: "#000", hair: "#f2efe6", bodyR: 0.21, bodyLen: 0.3, headR: 0.27, legLen: 0.62, hat: "none", hairStyle: "wig", ...o });
const CAST: Record<string, CharSpec> = {
  mary: P({ hat: "mob", hatColor: "#c86a8a", hairStyle: "tufts", hair: "#6b4226", shirt: "#7a8a5a", dress: "#7a8a5a", skin: "#f3d1b0", bodyR: 0.19 }),
  howard: P({ coat: "#5a3a22", shirt: "#5a3a22" }),
  stand: P({ coat: "#1d2a5a", shirt: "#1d2a5a", skin: "#e8b58f" }),
  mann: P({ coat: "#1c1c20", shirt: "#1c1c20", glasses: "#2a2a2e", skin: "#f3d1b0" }),
  king: P({ coat: "#8a1d2a", shirt: "#8a1d2a", hat: "crown", scarf: "#f8f6f0", bodyR: 0.25, skin: "#f1c7a2" }),
  porter: P({ hat: "tricorn", hatColor: "#2a2a2e", hairStyle: "tufts", hair: "#5a3a20", coat: "#2a5a3a", shirt: "#2a5a3a", stache: "#5a3a20" }),
  c1: P({ hat: "tricorn", hatColor: "#3a2a1a", hairStyle: "tufts", hair: "#3a2416", coat: "#6a4a2a", shirt: "#6a4a2a" }),
  c2: P({ hat: "mob", hatColor: "#4a8ac8", hairStyle: "tufts", hair: "#b5651d", shirt: "#c86a6a", dress: "#c86a6a", skin: "#e8b58f", bodyR: 0.19 }),
  c3: P({ hat: "tricorn", hatColor: "#1c1c20", coat: "#3a5a7a", shirt: "#3a5a7a", skin: "#c98c64" }),
  c4: P({ hat: "mob", hatColor: "#e0b84a", hairStyle: "tufts", hair: "#2a1a12", shirt: "#5a5a8a", dress: "#5a5a8a", bodyR: 0.19 }),
};

type Set = keyof typeof SETS;
type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number, number?];
type Shot = { a: number; b: number; set: Set; cams: Cam[]; grade?: string };
const SHOTS: Shot[] = [
  { a: 0, b: 3.0, set: "bed", cams: [[0, V(3.2, 2.1, -0.2), V(0, 1.1, -1.8), V(2.9, 2.0, -0.4), V(0, 1.1, -1.8), 56, 54]] },
  { a: 3.0, b: 5.4, set: "bed", cams: [[3.0, V(0, 1.5, -3.05), V(0, 1.45, -0.6), V(0, 1.5, -2.9), V(0, 1.45, -0.6), 58, 56, 1]] },
  { a: 5.4, b: 7.8, set: "bed", cams: [[5.4, V(2.4, 0.9, 0.8), V(1.5, 0.4, -0.6), V(2.3, 0.85, 0.7), V(1.5, 0.4, -0.6), 50, 48]] },
  { a: 7.8, b: 10.9, set: "cottage", cams: [[7.8, V(4.0, 1.6, 9.5), V(0.5, 1.8, -1.0), V(3.2, 1.6, 8.6), V(0.5, 1.8, -1.0), 52, 50]] },
  { a: 10.9, b: 14.9, set: "bed", cams: [[10.9, V(-1.5, 1.55, -2.9), V(-2.55, 1.0, -3.15), V(-1.6, 1.5, -2.95), V(-2.55, 0.95, -3.15), 50, 48]] },
  { a: 14.9, b: 17.5, set: "throne", cams: [[14.9, V(0, 2.0, -2.3), V(0, 1.7, -5.5), V(0, 1.95, -2.6), V(0, 1.75, -5.5), 46, 44, 1]] },
  { a: 17.5, b: 21.3, set: "throne", cams: [[17.5, V(3.4, 2.2, 0.5), V(-0.2, 1.4, -4.2), V(3.0, 2.1, 0.0), V(-0.2, 1.4, -4.2), 52, 50]] },
  { a: 21.3, b: 24.4, set: "bed", cams: [[21.3, V(-2.6, 1.9, 2.6), V(0.8, 1.2, -2.0), V(-2.3, 1.85, 2.3), V(0.8, 1.2, -2.0), 52, 50]] },
  { a: 24.4, b: 27.1, set: "bed", cams: [[24.4, V(2.9, 1.6, -0.8), V(2.0, 1.55, -3.6), V(2.85, 1.6, -1.0), V(2.0, 1.5, -3.6), 52, 50, 1]] },
  { a: 27.1, b: 30.6, set: "street", cams: [[27.1, V(3.5, 2.0, 8.0), V(-3.0, 2.6, -2.0), V(2.8, 2.0, 7.0), V(-3.0, 2.8, -2.0), 52, 50]] },
  { a: 30.6, b: 32.3, set: "street", cams: [[30.6, V(0.6, 1.6, 3.4), V(-1.5, 1.45, 0.6), V(0.4, 1.6, 3.1), V(-1.5, 1.45, 0.6), 48, 46, 1]] },
  { a: 32.3, b: 35.6, set: "bed", grade: "sepia(0.6) saturate(0.9)", cams: [[32.3, V(3.2, 1.6, -1.2), V(0.6, 1.25, -2.4), V(3.0, 1.55, -1.35), V(0.6, 1.25, -2.4), 52, 50]] },
  { a: 35.6, b: 38.3, set: "bed", cams: [[35.6, V(-3.0, 1.65, -0.6), V(-0.4, 1.2, -2.3), V(-2.8, 1.6, -0.8), V(-0.4, 1.2, -2.3), 54, 52, 1]] },
  { a: 38.3, b: 40.5, set: "bed", cams: [[38.3, V(1.2, 1.7, -1.2), V(1.6, 1.6, -3.9), V(1.25, 1.7, -1.45), V(1.7, 1.6, -3.9), 48, 46, 1]] },
  { a: 40.5, b: 43.1, set: "jail", cams: [[40.5, V(0.4, 1.5, 3.4), V(0.3, 1.1, -1.6), V(0.35, 1.5, 3.1), V(0.3, 1.15, -1.6), 52, 50]] },
  { a: 43.1, b: 46.1, set: "cottage", cams: [[43.1, V(1.6, 1.5, 12.8), V(0.3, 1.0, 6.5), V(1.4, 1.5, 11.6), V(0.3, 1.0, 4.5), 52, 50]] },
  { a: 46.1, b: 51.7, set: "street", cams: [[46.1, V(5.6, 2.5, 3.4), V(5.75, 1.6, -2.1), V(5.7, 2.4, 2.8), V(5.75, 1.65, -2.1), 52, 50]] },
  { a: 51.7, b: 60.0, set: "street", cams: [[51.7, V(7.3, 1.3, 3.4), V(7.2, 0.6, 0.4), V(7.45, 1.72, 0.9), V(7.45, 1.75, -2.1), 50, 46]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (s: Shot, t: number) => {
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = c[7] === 1 ? 1 - Math.pow(1 - Math.min(1, u * 1.1), 3) : u * u * (3 - 2 * u) * 0.85 + u * 0.15;
  const o = SETS[s.set];
  return { pos: c[1].clone().lerp(c[3], k).add(o), look: c[2].clone().lerp(c[4], k).add(o), fov: c[5] + (c[6] - c[5]) * k };
};

type Act = { L?: ArmName; R?: ArmName; mouth?: Mouth; yaw?: number; pitch?: number; walk?: number };
const act = (c: Toon, t: number, a: Act, armL?: THREE.Vector3[], armR?: THREE.Vector3[]) => c.pose({
  blink: [1.1, 3.7].reduce((b, x) => { const d = Math.abs(((t - x) % 4.3 + 4.3) % 4.3); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.3 - d) / 0.07)); }, 0),
  mouth: a.mouth ?? "smile", brow: 0.3, headYaw: a.yaw ?? 0, headPitch: a.pitch ?? 0,
  armL: armL ?? armMix(c, a.L ?? "rest", a.L ?? "rest", 0, -1, t), armR: armR ?? armMix(c, a.R ?? "rest", a.R ?? "rest", 0, 1, t),
  bob: Math.sin(t * 2.4 + c.spec.headR * 40) * 0.006 + (a.walk !== undefined ? Math.abs(Math.sin(a.walk)) * 0.02 : 0), walk: a.walk,
});

class World {
  g = new Georgian(); c: Record<string, Toon> = {}; bunnies: Bunny[] = []; coins: THREE.Group; sack: THREE.Mesh; quill: THREE.Group; letterProp: THREE.Mesh;
  constructor(scene: THREE.Scene) {
    scene.add(this.g.root);
    for (const k of Object.keys(CAST)) this.c[k] = new Toon(this.g.root, CAST[k], 0, 0, 0);
    const cols = ["#fbfbf6", "#c8a070", "#8a7a6a", "#e8d8c0", "#5a4a3a", "#fbfbf6"];
    for (let i = 0; i < 6; i++) this.bunnies.push(new Bunny(this.g.root, cols[i], 0.95 + (i % 3) * 0.08));
    this.coins = new THREE.Group(); for (let k = 0; k < 4; k++) put(this.coins, cyl(0.025, 0.025, 0.006, 16), M("#e0b84a", 0.25, 1), (k % 2) * 0.02, k * 0.007, 0);
    this.sack = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), MP("#9a7a50", 0.9, { clearcoat: 0 })); this.sack.scale.set(1, 1.3, 1); this.sack.castShadow = true;
    this.quill = new THREE.Group(); put(this.quill, cyl(0.004, 0.012, 0.3, 6), M("#f2efe6", 0.7), 0, 0.12, 0, { rz: 0.4 });
    this.letterProp = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.38), (this.g.letter.children[0] as THREE.Mesh).material as THREE.Material); this.letterProp.castShadow = true;
  }
}

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const W = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping; gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.4;
    scene.background = new THREE.Color("#a8c8e8");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.4, distanceFalloff: 1.0, intensity: 2.2, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.6, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.42, offset: 0.32 })));
    composer.setSize(size.width, size.height);
    return { composer };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = shotAt(t), G = W.g, C = W.c;
  (Object.keys(SETS) as Set[]).forEach((k) => ((G as unknown as Record<string, THREE.Group>)[k].visible = k === s.set));
  const O = SETS[s.set];
  Object.values(C).forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.held.forEach((h) => h?.parent?.remove(h)); c.held = [null, null]; });
  W.bunnies.forEach((b) => { b.root.visible = false; if (b.root.parent !== G.root) G.root.attach(b.root); b.root.scale.setScalar(1); });
  G.tray.visible = false;
  const place = (k: string, x: number, z: number, ry: number, y = 0) => { const c = C[k]; c.root.visible = true; c.root.position.set(O.x + x, O.y + y, O.z + z); c.root.rotation.set(0, ry, 0); return c; };
  const hold = (c: Toon, k: number, obj: THREE.Object3D) => { c.held[k] = obj; c.root.add(obj); };
  const bunny = (i: number, x: number, z: number, ry: number, hop: number, y = 0) => { const b = W.bunnies[i]; b.root.visible = true; b.root.position.set(O.x + x, O.y + y, O.z + z); b.root.rotation.y = ry; b.pose(t + i * 0.37, hop); };
  const maryInBed = (mouth: Mouth, a: Act = {}) => { const m = place("mary", 0, -2.55, 0, 0.25); act(m, t, { mouth, L: "rest", R: "rest", ...a }); return m; };

  // the tally slate: up to 14 before St. André arrives, 15 as he arrives, HOAX! after the confession
  const n = t < 21.3 ? 9 : t < 24.4 ? 14 : 15;
  G.setSlate(n, t >= 38.3 && t < 46.1);
  switch (SHOTS.indexOf(s)) {
    case 0: case 1: case 2: {
      if (t < 3.0 || t >= 5.4) maryInBed(t < 3 ? "smile" : "flat", { yaw: 0.3 });
      place("howard", t >= 3 && t < 5.4 ? -0.55 : -0.8, -0.9, Math.PI - 0.55); act(C.howard, t, { mouth: "o", L: "hip", R: "point", yaw: 0.2 });
      place("stand", t >= 3 && t < 5.4 ? 0.55 : 0.8, -0.9, -Math.PI + 0.55); act(C.stand, t, { mouth: t > 5.4 ? "grin" : "o", L: "raise", R: "raise", yaw: -0.4 });
      place("mann", 0, -0.35, Math.PI); act(C.mann, t, { mouth: "o", L: "hip", R: "hip", pitch: 0.1 });
      for (let i = 0; i < 4; i++) bunny(i, 1.3 + (i % 2) * 0.35 + (t > 5.4 ? (t - 5.4) * 0.25 * (i + 1) * 0.3 : 0), -0.6 + Math.floor(i / 2) * 0.3 + (t > 5.4 ? (t - 5.4) * 0.2 : 0), 0.5 + i, t > 5.4 ? 1 : 0, t > 5.4 ? 0 : 0.18);
      break;
    }
    case 3: { const m = place("mary", 0.0, 2.6, 0.2); act(m, t, { mouth: "smile", L: "rest", R: "wave" }); break; }
    case 4: {
      const h = place("howard", -2.6, -2.45, Math.PI); const sh = h.shoulderY;
      act(h, t, { mouth: "grin", pitch: 0.45 }, undefined, [V(0.25, sh - 0.18, 0.15), V(0.12 + 0.04 * Math.sin(t * 9), sh - 0.32, 0.35)]);
      hold(h, 1, W.quill);
      maryInBed("smile", { yaw: -0.6 });
      break;
    }
    case 5: {
      const k = place("king", 0, -5.6, 0, 0.4); k.root.position.y = O.y + 0.4 + 0.33; const sh = k.shoulderY, R = k.spec.bodyR;
      act(k, t, { mouth: t > 15.7 ? "o" : "flat", pitch: 0.2, brow: 1 } as Act, [V(-(R + 0.05), sh - 0.15, 0.15), V(-0.12, sh - 0.05, R + 0.25)], [V(R + 0.05, sh - 0.15, 0.15), V(0.12, sh - 0.05, R + 0.25)]);
      hold(k, 1, W.letterProp); W.letterProp.rotation.set(-0.3, Math.PI, 0);
      break;
    }
    case 6: {
      const k = place("king", 0, -5.6, 0, 0.73); act(k, t, { mouth: "talk", L: "hip", R: "point", yaw: 0.25 });
      const st = place("stand", 1.2, -2.2, -2.6); const bow = Math.min(1, Math.max(0, (t - 19.0) / 0.4)) * (1 - Math.max(0, (t - 20.6) / 0.4));
      act(st, t, { mouth: "grin", L: "rest", R: bow > 0.5 ? "point" : "hip", pitch: 0.3 * bow }); st.body.rotation.x = 0.45 * Math.max(0, Math.min(1, bow));
      break;
    }
    case 7: {
      maryInBed("smile", { yaw: 0.4 });
      place("howard", -1.4, -1.1, 0.9); act(C.howard, t, { mouth: "grin", L: "hip", R: "point" });
      const x = 3.2 - Math.min(1.6, (t - 21.3) * 1.2); const st = place("stand", x, -0.8, -1.9); act(st, t, { mouth: "o", walk: t < 22.6 ? t * 7 : undefined, L: "rest", R: "raise", yaw: 0.3 });
      for (let i = 0; i < 3; i++) bunny(i, 1.4 + i * 0.3, -0.5 + (i % 2) * 0.3, 2 + i, 0.6);
      break;
    }
    case 8: {
      const st = place("stand", 2.2, -2.9, 0.3); const sh = st.shoulderY, R = st.spec.bodyR;
      act(st, t, { mouth: t > 25.4 ? "laugh" : "o", yaw: -0.2 }, [V(-(R + 0.05), sh - 0.16, 0.15), V(-0.08, sh - 0.12, R + 0.24)], [V(R + 0.05, sh - 0.16, 0.15), V(0.08, sh - 0.12, R + 0.24)]);
      const b = W.bunnies[0]; b.root.visible = true; b.pose(t, 0); st.root.add(b.root); b.root.position.set(0, sh - 0.32, R + 0.24); b.root.rotation.set(0, 0, 0);
      break;
    }
    case 9: {
      const crowd: [string, number, number][] = [["c1", -4.5, 1.6], ["c2", -3.4, 2.2], ["c3", -2.4, 1.5], ["c4", -1.4, 2.4], ["porter", -5.6, 2.6], ["howard", -0.4, 1.8]];
      crowd.forEach(([k, x, z], i) => { const c = place(k, x, z, Math.PI + (i % 2 ? 0.25 : -0.25)); act(c, t + i, { mouth: i % 2 ? "o" : "talk", L: i % 3 === 0 ? "point" : "rest", R: i % 2 ? "raise" : "hip", pitch: -0.35 }); });
      break;
    }
    case 10: {
      const p = place("porter", -1.8, 0.6, 0.7); act(p, t, { mouth: "talk", L: "point", R: "hip", yaw: 0.2 });
      const m = place("mann", -0.9, 1.1, -2.2); act(m, t, { mouth: "o", L: "hip", R: "raise", yaw: -0.2 });
      break;
    }
    case 11: {
      const m = maryInBed("grin", { yaw: 0.5 }); const sh = m.shoulderY, R = m.spec.bodyR;
      act(m, t, { mouth: "grin", yaw: 0.5 }, undefined, [V(R + 0.05, sh - 0.12, 0.15), V(0.22, sh - 0.05, R + 0.3)]); hold(m, 1, W.coins);
      const p = place("porter", 1.75, -2.3, -Math.PI / 2); act(p, t, { mouth: t > 33.6 ? "flat" : "o", L: "hold", R: t > 33.8 ? "shrug" : "rest", yaw: t > 33.8 ? 0.5 * Math.sin(t * 8) : 0 });
      hold(p, 0, W.sack);
      break;
    }
    case 12: {
      maryInBed(t > 36.5 ? "o" : "flat", { pitch: 0.1, yaw: -0.5 });
      const m = place("mann", -1.5, -2.0, Math.PI / 2); act(m, t, { mouth: "grin", L: "rest", R: "raise", yaw: 0.2 });
      G.tray.visible = true; G.tray.position.set(-1.6, 0.25 * Math.min(1, (t - 35.6) * 1.5), -1.35);
      break;
    }
    case 13: { const m = maryInBed(t > 38.6 ? "dazed" : "o"); act(m, t, { mouth: t > 38.6 ? "dazed" : "o", L: "raise", R: "raise", pitch: 0.1 }); place("mann", -1.0, -1.4, 0.8); act(C.mann, t, { mouth: "laugh", L: "hip", R: "point" }); break; }
    case 14: { const m = place("mary", 0.3, -1.6, 0, 0.0); act(m, t, { mouth: "flat", L: "hold", R: "hold", pitch: 0.25 }); break; }
    case 15: {
      const u = t - 43.1, m = place("mary", 0.2, 9.5 - u * 1.6, Math.PI); act(m, t, { mouth: "smile", walk: t * 6, L: "rest", R: "rest" });
      for (let i = 0; i < 4; i++) bunny(i, 0.6 + (i % 2) * 0.5, 10.4 - u * 1.6 + i * 0.45, Math.PI, 1);
      break;
    }
    case 16: {
      const crowd: [string, number, number][] = [["c1", 5.0, 0.9], ["c2", 6.0, 0.8], ["c3", 6.9, 1.0], ["c4", 4.3, 1.3]];
      crowd.forEach(([k, x, z], i) => { const c = place(k, x, z, Math.PI + (i - 1.5) * 0.15); act(c, t + i, { mouth: "laugh", L: i % 2 ? "point" : "hip", R: i % 2 ? "hip" : "point", pitch: -0.05 }); c.body.position.y = Math.abs(Math.sin(t * 9 + i)) * 0.03; });
      const st = place("stand", 7.4 - (t - 46.1) * 0.9, 1.6, -Math.PI / 2); act(st, t, { mouth: "flat", walk: t * 6, L: "rest", R: "rest", yaw: -0.7 });
      break;
    }
    case 17: { for (let i = 0; i < 5; i++) bunny(i, 6.4 + i * 0.4, 0.6 + (i % 2) * 0.4, -0.4 + i, 1); break; }
  }
  Object.values(C).forEach((c) => c.held.forEach((h, k) => { if (h) { h.position.copy(c.hands[k].position); h.position.y += 0.02; } }));

  const c = camAt(s, t);
  cam.fov = c.fov; cam.near = 0.03; cam.far = 300; cam.position.copy(c.pos); cam.lookAt(c.look); cam.updateProjectionMatrix();
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
const PROPER = ["ENGLISH", "MARY", "TOFT", "GODALMING", "JOHN", "HOWARD", "KING", "GEORGE", "FIRST", "NATHANIEL", "ANDRÉ", "LONDON", "WILLIAM", "HOGARTH"];
const showW = (s: string) => (s === "ST" ? "St." : PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
const Captions: React.FC<{ t: number }> = ({ t }) => {
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) { const w = LIST[i], n = LIST[i + 1]; if (t >= w.start - 0.03 && t < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", transform: `scale(${0.9 + 0.1 * Math.min(1, (t - cur.start) / 0.08)})` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 66, color: "#ffffff", WebkitTextStroke: "9px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{showW(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.8)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · sources: Wikipedia, Public Domain Review, Linda Hall Library, Univ. of Glasgow, UCL Museums · print redrawn after Hogarth (1726)
      </div>
    </>
  );
};
export const ToftShort: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  const s = shotAt(f / 30);
  return (
    <AbsoluteFill style={{ background: "#20242a" }}>
      <AbsoluteFill style={{ filter: s.grade }}>
        <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.03, far: 300 }}>
          <Inner />
        </ThreeCanvas>
      </AbsoluteFill>
      <Captions t={f / 30} />
      <Audio src={staticFile("toft/mix.wav")} />
    </AbsoluteFill>
  );
};
