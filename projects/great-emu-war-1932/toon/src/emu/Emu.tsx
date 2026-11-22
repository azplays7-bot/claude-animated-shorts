// "The Great Emu War" (Western Australia, November 1932), detailed style. One outback set (outback.ts); every number
// lives on something in the scene: the crates (10 x 1,000 rounds), the CAMPION sign, the November 1932 calendar, the
// camp chalkboard (2,500 rounds / about 50 emus; 9,860 / 986 = 10), Meredith's report (986) and the painted water tank.
// No bird is shown being hit: the guns fire, the emus scatter and win.
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
import { Outback, Emu, FARM, CAMP, TANKW, TRUCK0, lewisGun } from "./outback";
import WORDS from "./words.json";

export const EMU_FRAMES = 1800;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const rnd = (i: number, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

const P = (o: Partial<CharSpec>): CharSpec => ({ skin: "#e8b58f", shirt: "#8a7a4a", cap: "#000", capLogo: "#000", hair: "#3a2416", bodyR: 0.2, bodyLen: 0.26, headR: 0.27, legLen: 0.62, hat: "slouch", hatColor: "#8a7450", belt: "#4a3420", ...o });
const CAST: Record<string, CharSpec> = {
  major: P({ shirt: "#7a7048", hat: "officer", hatColor: "#6a6440", stache: "#5a3a20", skin: "#f1c7a2", bodyR: 0.22 }),
  s1: P({ skin: "#f3d1b0" }), s2: P({ skin: "#d8a27a", hair: "#2a1a12", stache: "#2a1a12" }),
  farmer: P({ shirt: "#a8483a", stripes: "#e8e0d0", hat: "bush", hatColor: "#6a4a2a", stache: "#8a6a3a", belt: "#3a2a1a", skin: "#e0a880" }),
  birdman: P({ shirt: "#d8cfb0", hat: "bush", hatColor: "#c8b890", glasses: "#2a2a2e", stache: "", belt: "#5a4a2a", skin: "#f1c7a2" }),
};

type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number, number?];
type Shot = { a: number; b: number; light: "day" | "golden"; cams: Cam[]; truckCam?: boolean; calCam?: boolean; trackTruck?: boolean };
const SHOTS: Shot[] = [
  { a: 0, b: 2.3, light: "day", cams: [[0, V(-6, 0.8, 5.6), V(-18, 1.5, 2), V(-6.5, 0.85, 5.4), V(-10, 1.6, 2), 52, 50]] },
  { a: 2.3, b: 4.5, light: "day", truckCam: true, cams: [[2.3, V(1.7, 2.5, -0.3), V(0, 2.1, -1.9), V(1.5, 2.45, -0.5), V(0, 2.1, -1.9), 50, 46]] },
  { a: 4.5, b: 6.0, light: "day", cams: [[4.5, V(-6, 1.95, -3.5), V(-6, 1.88, -5.8), V(-6, 1.93, -3.9), V(-6, 1.88, -5.8), 40, 36, 1]] },
  { a: 6.0, b: 7.7, light: "day", cams: [[6.0, V(7, 1.7, 7.5), V(-3, 1.1, 0), V(6.4, 1.7, 7.0), V(-3, 1.1, 0), 54, 52]] },
  { a: 7.7, b: 10.9, light: "day", cams: [[7.7, V(FARM.x - 4.6, 1.65, 3.6), V(FARM.x - 6, 1.55, -1.2), V(FARM.x - 5.0, 1.65, 3.0), V(FARM.x - 6, 1.55, -1.2), 48, 46]] },
  { a: 10.9, b: 12.5, light: "day", cams: [[10.9, V(3, 8, 14), V(14, 1, -12), V(5, 7.5, 13), V(14, 1, -12), 50, 48]] },
  { a: 12.5, b: 16.3, light: "day", cams: [[12.5, V(-5.5, 1.8, -1.0), V(-8, 0.9, -10), V(-6.0, 1.7, -2.0), V(-8, 0.8, -10), 50, 48]] },
  { a: 16.3, b: 21.5, light: "day", cams: [[16.3, V(-6.0, 1.55, 15.2), V(-8.6, 1.25, 7.5), V(-9.5, 1.55, 15.0), V(-8.6, 1.25, 7.5), 52, 50]] },
  { a: 21.5, b: 25.1, light: "day", calCam: true, cams: [[21.5, V(0, 0.05, 0.9), V(0, 0, 0), V(0, 0.05, 0.75), V(0, 0, 0), 40, 38, 1], [22.8, V(30, 1.7, 12.5), V(30, 2.0, 6.2), V(30, 1.8, 11.5), V(30, 2.1, 6.2), 48, 46]] },
  { a: 25.1, b: 27.2, light: "day", cams: [[25.1, V(-6, 16, 4), V(-6, 0, -13), V(-6, 18, 5), V(-6, 0, -13), 52, 54]] },
  { a: 27.2, b: 28.9, light: "day", cams: [[27.2, V(-4.1, 1.35, 10.2), V(-5.5, 1.0, 11.0), V(-4.2, 1.3, 10.3), V(-5.5, 1.0, 11.0), 46, 44, 1]] },
  { a: 28.9, b: 32.8, light: "day", trackTruck: true, cams: [[28.9, V(-3, 2.0, 8.2), V(2, 1.3, 2), V(-3, 2.0, 8.2), V(2, 1.3, 2), 56, 56]] },
  { a: 32.8, b: 36.0, light: "day", cams: [[32.8, V(-7.4, 1.65, 9.3), V(-6.8, 1.6, 7.6), V(-7.5, 1.65, 9.6), V(-6.8, 1.6, 7.6), 46, 46]] },
  { a: 36.0, b: 39.0, light: "day", cams: [[36.0, V(-7.8, 1.7, 10.4), V(-6.6, 1.45, 7.6), V(-7.9, 1.7, 10.7), V(-6.6, 1.45, 7.6), 50, 50, 1]] },
  { a: 39.0, b: 43.2, light: "day", cams: [[39.0, V(2.5, 1.3, -2.6), V(-5, 1.1, -12), V(1.8, 1.3, -3.0), V(-5, 1.1, -12), 50, 48]] },
  { a: 43.2, b: 45.9, light: "day", cams: [[43.2, V(8, 2.6, 13), V(-8, 1.2, 2), V(8, 2.6, 13), V(-8, 1.2, 2), 50, 50]] },
  { a: 45.9, b: 49.2, light: "day", cams: [[45.9, V(-8.2, 1.85, 12.2), V(-8.45, 0.8, 11.2), V(-8.25, 1.7, 12.0), V(-8.45, 0.8, 11.2), 44, 42]] },
  { a: 49.2, b: 51.5, light: "day", cams: [[49.2, V(-7.45, 1.65, 9.4), V(-6.8, 1.6, 7.6), V(-7.4, 1.65, 9.2), V(-6.8, 1.6, 7.6), 44, 42, 1]] },
  { a: 51.5, b: 60.0, light: "golden", cams: [[51.5, V(14, 1.5, 4.5), V(19.5, 1.6, -6), V(15, 1.6, 3.5), V(19.1, 2.0, -6.5), 52, 50], [53.4, V(17, 1.8, 2.6), V(19, 2.2, -6.5), V(17.7, 2.0, 0.2), V(19, 2.2, -6.5), 50, 48]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (s: Shot, t: number) => {
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = c[7] === 1 ? 1 - Math.pow(1 - Math.min(1, u * 1.1), 3) : u * u * (3 - 2 * u) * 0.85 + u * 0.15;
  return { i, pos: c[1].clone().lerp(c[3], k), look: c[2].clone().lerp(c[4], k), fov: c[5] + (c[6] - c[5]) * k };
};

type Act = { L?: ArmName; R?: ArmName; mouth?: Mouth; yaw?: number; pitch?: number; walk?: number };
const act = (c: Toon, t: number, a: Act, armL?: THREE.Vector3[], armR?: THREE.Vector3[]) => c.pose({
  blink: [1.1, 3.7].reduce((b, x) => { const d = Math.abs(((t - x) % 4.3 + 4.3) % 4.3); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.3 - d) / 0.07)); }, 0),
  mouth: a.mouth ?? "smile", brow: 0.3, headYaw: a.yaw ?? 0, headPitch: a.pitch ?? 0,
  armL: armL ?? armMix(c, a.L ?? "rest", a.L ?? "rest", 0, -1, t), armR: armR ?? armMix(c, a.R ?? "rest", a.R ?? "rest", 0, 1, t),
  bob: Math.sin(t * 2.4 + c.spec.headR * 40) * 0.006 + (a.walk !== undefined ? Math.abs(Math.sin(a.walk)) * 0.02 : 0), walk: a.walk,
});

class World {
  o = new Outback(); c: Record<string, Toon> = {}; emus: Emu[] = []; capOnEmu: THREE.Group; binos: THREE.Group; medal: THREE.Group;
  light = "";
  constructor(scene: THREE.Scene) {
    const R = this.o.root; scene.add(R);
    for (const k of Object.keys(CAST)) this.c[k] = new Toon(R, CAST[k], 0, 0, 0);
    for (let i = 0; i < 26; i++) this.emus.push(new Emu(R, 0.92 + rnd(i) * 0.16, i));
    // props: the Major's cap (stolen by an emu at the end), binoculars, the farmer's war medal
    this.capOnEmu = new THREE.Group();
    put(this.capOnEmu, cyl(0.09, 0.075, 0.05, 20), MP("#6a6440", 0.6), 0, 0.04, 0); put(this.capOnEmu, cyl(0.076, 0.076, 0.015, 20), M("#8a1d1d", 0.5), 0, 0.02, 0);
    put(this.capOnEmu, new THREE.CylinderGeometry(0.06, 0.06, 0.008, 20, 1, false, -Math.PI / 2, Math.PI), M("#1a1410", 0.3), 0, 0.01, 0.05);
    this.emus[0].head.add(this.capOnEmu); this.capOnEmu.position.set(0, 0.09, 0); this.capOnEmu.rotation.z = 0.2; this.capOnEmu.visible = false;
    this.binos = new THREE.Group();
    for (const sx of [-1, 1]) put(this.binos, cyl(0.035, 0.04, 0.14, 12), M("#1c1c1e", 0.4, 0.4), sx * 0.045, 0, 0, { rx: Math.PI / 2 });
    this.medal = new THREE.Group();
    put(this.medal, new THREE.PlaneGeometry(0.05, 0.06), M("#2a4a8a", 0.6), 0, 0.05, 0, { cast: false }); put(this.medal, cyl(0.03, 0.03, 0.008, 16), M("#d8b04a", 0.25, 1), 0, -0.01, 0.004, { rx: Math.PI / 2 });
    const fb = this.c.farmer; fb.body.add(this.medal); this.medal.position.set(-0.1, fb.bodyCy + 0.1, fb.spec.bodyR - 0.005); this.medal.rotation.y = -0.4;
    // soldiers ride in the truck tray
    this.o.truck.add(this.c.s1.root); this.o.truck.add(this.c.s2.root);
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
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.45;
    scene.background = new THREE.Color("#8fc4f2");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.6, distanceFalloff: 1.0, intensity: 2.2, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.6, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.4, offset: 0.32 })));
    composer.setSize(size.width, size.height);
    return { composer };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = shotAt(t), O = W.o, C = W.c;
  if (W.light !== s.light) { W.light = s.light; O.setLight(s.light); scene.environmentIntensity = s.light === "golden" ? 0.25 : 0.45; }
  O.wheatT.value = t;
  const rotor = O.root.getObjectByName("rotor"); if (rotor) rotor.rotation.z = -t * 2.2;

  // ---------------- the truck ----------------
  const tr = O.truck; let bump = 0;
  tr.rotation.set(0, Math.PI / 2, 0);
  if (t < 2.3) tr.position.set(-26 + 20 * ss(0, 2.3, t) * 1.05, 0, TRUCK0.z);
  else if (t >= 28.9 && t < 32.8) { const u = t - 28.9; tr.position.set(-16 + u * 5.2, 0, TRUCK0.z); bump = 1; }
  else if (t >= 43.2 && t < 45.9) {
    const x = t < 44.0 ? -4 - 22 * ss(43.2, 44.0, t) : t < 44.75 ? -26 + 22 * ss(44.0, 44.75, t) : -4 - 26 * ss(44.8, 45.9, t);
    tr.position.set(x, 0, TRUCK0.z); tr.rotation.y = t < 44.0 || t >= 44.8 ? -Math.PI / 2 : Math.PI / 2;
  } else tr.position.copy(TRUCK0);
  if (bump) { tr.position.y = Math.abs(Math.sin(t * 13)) * 0.22; tr.rotation.x = Math.sin(t * 11) * 0.07; tr.rotation.z = Math.sin(t * 7.3) * 0.08; }
  tr.visible = !(t >= 4.5 && t < 6.0) && !(t >= 7.7 && t < 16.3);
  // soldiers in the tray: one on the gun, one with a cheering / bewildered face
  const inTray = t < 6.0 || (t >= 28.9 && t < 32.8) || (t >= 43.2 && t < 45.9);
  C.s1.root.visible = C.s2.root.visible = true;
  if (inTray) {
    C.s1.root.position.set(0.05, 0.75 + (bump ? Math.abs(Math.sin(t * 13 + 0.5)) * 0.12 : 0), -2.25); C.s1.root.rotation.set(0, 0, 0);
    C.s2.root.position.set(-0.6, 0.75 + (bump ? Math.abs(Math.sin(t * 13 + 1.2)) * 0.12 : 0), -3.1); C.s2.root.rotation.set(0, bump ? 0.6 : -0.4, 0);
    act(C.s1, t, { mouth: bump ? "o" : t > 2.3 && t < 4.5 ? "flat" : "grin", L: "hold", R: "hold", pitch: 0.05 });
    act(C.s2, t, { mouth: bump ? "dazed" : t >= 6.0 ? "o" : "smile", L: bump ? "raise" : "hip", R: bump ? "raise" : "point", yaw: 0.3 });
  } else { C.s1.root.visible = C.s2.root.visible = false; }
  // ---------------- people ----------------
  const show = (k: string, on: boolean) => (C[k].root.visible = on);
  ["major", "farmer", "birdman"].forEach((k) => show(k, false));
  const at = (k: string, x: number, z: number, ry: number) => { const c = C[k]; c.root.visible = true; c.root.position.set(x, 0, z); c.root.rotation.y = ry; return c; };
  if (t >= 6.0 && t < 7.7) { at("major", -2.6, 3.8, 0.6); act(C.major, t, { mouth: "o", L: "hip", R: "shrug", yaw: -0.6, pitch: 0 }); }
  if (t >= 7.7 && t < 12.5) { at("farmer", FARM.x - 6, -0.7, 0); act(C.farmer, t, { mouth: "smile", L: "hip", R: "wave", pitch: 0.05 }); }
  if (t >= 12.5 && t < 16.3) { at("farmer", -4.6, -1.0, Math.PI + 0.4); act(C.farmer, t, { mouth: t > 14 ? "o" : "flat", L: "raise", R: "point", pitch: 0.1, yaw: -0.3 }); }
  if (t >= 16.3 && t < 21.5) {
    // the line-up: Major Meredith + two soldiers (the soldiers step down from the tray for this)
    at("major", -8.6, 8.4, 0.05); act(C.major, t, { mouth: "grin", L: "hip", R: t > 17.1 && t < 17.9 ? "wave" : "rest" });
    for (const [k, x] of [["s1", -9.9], ["s2", -7.3]] as const) { const c = C[k]; O.root.attach(c.root); c.root.visible = true; c.root.position.set(x, 0, 8.6); c.root.rotation.set(0, 0, 0); act(c, t, { mouth: "smile", L: "rest", R: t > 18.3 && t < 19.0 ? "raise" : "rest" }); }
  } else { if (C.s1.root.parent !== O.truck) { O.truck.attach(C.s1.root); O.truck.attach(C.s2.root); } }
  if (t >= 27.2 && t < 28.9) {
    // the jam: a gunner tugs at the gun on its tripod
    at("major", -4.9, 11.7, Math.PI * 0.85); act(C.major, t, { mouth: t > 28.1 ? "dazed" : "flat", L: "hold", R: t > 28.1 ? "raise" : "hold", pitch: 0.2 });
  }
  if (t >= 32.8 && t < 39.0) { at("major", -7.9, 8.4, 0.9); act(C.major, t, { mouth: t > 37.4 ? "dazed" : "flat", L: "hip", R: t > 37.4 ? "raise" : "point", yaw: -0.5, pitch: -0.05 }); }
  if (t >= 39.0 && t < 43.2) {
    const b = at("birdman", 0.6, -3.4, Math.PI + 0.55); const sh = b.shoulderY;
    act(b, t, { mouth: t > 40.2 ? "grin" : "smile", pitch: 0.05 }, [V(-0.2, sh - 0.05, 0.25), V(-0.06, sh + 0.25, 0.3)], [V(0.2, sh - 0.05, 0.25), V(0.06, sh + 0.25, 0.3)]);
    if (W.binos.parent !== b.head) b.head.add(W.binos); W.binos.position.set(0, -0.02, b.spec.headR * 1.05); W.binos.visible = true;
  } else W.binos.visible = false;
  if (t >= 45.9 && t < 49.2) { at("major", -9.45, 11.9, Math.PI * 0.7); act(C.major, t, { mouth: "grin", L: "counter", R: "counter", pitch: 0.4 }); }
  if (t >= 49.2 && t < 51.5) { at("major", -7.9, 8.4, 0.9); act(C.major, t, { mouth: "talk", L: "hip", R: "point", yaw: -0.5 }); }
  if (t >= 51.5) { at("major", 12.7, 1.6, -0.6 + Math.PI); act(C.major, t, { mouth: "o", L: "hip", R: "point", pitch: -0.05 }); }

  // ---------------- emus ----------------
  W.emus.forEach((e, i) => { e.root.visible = false; e.leaves.visible = false; });
  W.capOnEmu.visible = t >= 51.5;
  const emu = (i: number, x: number, z: number, ry: number, run: number, peck: number, look = 0, speed = 9) => {
    const e = W.emus[i]; e.root.visible = true; e.root.position.set(x, 0, z); e.root.rotation.y = ry; e.pose(t * speed + i * 1.7, run, peck, look, t + i);
  };
  if (t < 2.3) for (let i = 0; i < 6; i++) emu(i, -10 + i * 2.2 + rnd(i) * 1.5, -5 - rnd(i, 1) * 5, rnd(i, 2) * 6, 0, 0.5 + 0.5 * Math.sin(t * 2 + i), 0);
  if (t >= 4.5 && t < 6.0) { emu(0, -6, -6.4, 0, 0, 0, 0.25 * Math.sin((t - 4.5) * 3)); for (let i = 1; i < 6; i++) emu(i, -8 + i * 1.3, -9 - rnd(i) * 3, rnd(i, 3) * 6, 0, 0.6, 0); }
  if (t >= 6.0 && t < 7.7) for (let i = 0; i < 18; i++) { const u = t - 6.0; emu(i, -9 + rnd(i) * 10, -8 + (u * 7 + rnd(i, 1) * 9) % 18, 0, 1, 0, 0, 12); }
  if (t >= 12.5 && t < 16.3) for (let i = 0; i < 12; i++) emu(i, -12 + (i % 4) * 2.2 + rnd(i) * 1.2, -7 - Math.floor(i / 4) * 2.4 - rnd(i, 1), rnd(i, 2) * 6, 0, Math.max(0, Math.sin(t * 2.5 + i * 1.3)), 0);
  if (t >= 10.9 && t < 12.5) for (let i = 0; i < 6; i++) emu(i, -2 + i * 1.6, -12 - rnd(i) * 4, -0.6, 1, 0, 0, 10);
  if (t >= 21.5 && t < 25.1) for (let i = 0; i < 4; i++) emu(i, 34 + i * 1.8, 0.5 + rnd(i) * 2, Math.PI / 2, 0.15, 0, 0.5);
  if (t >= 25.1 && t < 27.2) for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2 + rnd(i) * 0.3, d = 1.5 + (t - 25.1) * (5 + rnd(i, 1) * 3); emu(i, -6 + Math.sin(a) * d, -13 + Math.cos(a) * d, a, 1, 0, 0, 13); }
  if (t >= 27.2 && t < 28.9) for (let i = 0; i < 5; i++) emu(i, -9 + i * 1.5, -6 - rnd(i) * 3, 0.4, 0.3, 0, 0.6);
  if (t >= 28.9 && t < 32.8) for (let i = 0; i < 8; i++) emu(i, O.truck.position.x + 9 + i * 1.6 + Math.sin(t * 2 + i) * 0.4, 1.0 + (i % 3) * 1.1, Math.PI / 2, 1, 0, 0, 14);
  if (t >= 32.8 && t < 39.0) for (let i = 0; i < 3; i++) emu(i, -3.5 + i * 1.4, 6.0 - rnd(i), -2.4, 0, 0.3 + 0.3 * Math.sin(t + i), 0.3);
  if (t >= 39.0 && t < 43.2) {
    // "guerrilla tactics": small squads with leaves on their heads, sneaking through the wheat
    for (let i = 0; i < 12; i++) {
      const squad = Math.floor(i / 3), sx = -9 + squad * 3.2, sz = -8 - (squad % 2) * 3.5;
      const sneak = (t - 39.0) * 0.6;
      emu(i, sx + (i % 3) * 0.8 + sneak * (squad % 2 ? 1 : -1) * 0.5, sz + (i % 3) * 0.6 - sneak * 0.3, squad % 2 ? 1.2 : -1.2, 0.25, 0.25, Math.sin(t * 2 + i) * 0.6, 4);
      W.emus[i].leaves.visible = true; W.emus[i].body.position.y -= 0.15;
    }
  }
  if (t >= 43.2 && t < 45.9) for (let i = 0; i < 6; i++) emu(i, -14 + i * 2.5, -4 - rnd(i) * 2, 0.3 * Math.sin(t + i), 0, Math.max(0, Math.sin(t * 3 + i)), 0);
  if (t >= 51.5) for (let i = 0; i < 9; i++) { const ex = i === 0 ? 16.1 + (t - 51.5) * 0.15 : 12.5 + rnd(i) * 12, ez = i === 0 ? -1.0 : -3 - rnd(i, 1) * 8; emu(i, ex, ez, i === 0 ? -0.6 : rnd(i, 2) * 6, i === 0 ? 0.2 : 0, i === 0 ? 0 : Math.max(0, Math.sin(t * 1.5 + i)), i === 0 ? 0.3 * Math.sin(t) : 0, 4); }

  // ---------------- in-world numbers ----------------
  const chalk: [string, string?][] = t < 32.8 ? [["EMU CAMPAIGN"], ["NOV. 1932"]] : t < 34.0 ? [["DAY 6"]] : t < 37.3 ? [["DAY 6"], ["ROUNDS FIRED:"], ["2,500", "#ffd88a"]] : t < 49.2 ? [["DAY 6"], ["ROUNDS FIRED: 2,500"], ["EMUS: ABOUT 50 ?", "#ffb0a0"]]
    : t < 49.7 ? [["FINAL TALLY"], ["9,860 ROUNDS"]] : t < 50.3 ? [["FINAL TALLY"], ["9,860 ROUNDS"], ["÷ 986 EMUS"]] : [["FINAL TALLY"], ["9,860 ROUNDS"], ["÷ 986 EMUS"], ["≈ 10 PER BIRD", "#ffd88a"]];
  O.setChalk(chalk);
  // gun smoke puffs while firing; a little dust behind the truck
  const firing = (t >= 3.3 && t < 4.3) || (t >= 25.3 && t < 26.4) || (t >= 27.6 && t < 28.0) || (t >= 29.4 && t < 32.6 && Math.sin(t * 6) > 0);
  O.smoke.visible = firing;
  if (firing) { const g = (t >= 27.2 && t < 28.9) ? O.gunA : O.truckGun; const p = new THREE.Vector3(0, t >= 27.2 && t < 28.9 ? 0.95 : 0, 0.85); g.localToWorld(p); O.smoke.position.copy(p); O.smoke.scale.setScalar(0.25 + 0.15 * Math.abs(Math.sin(t * 30))); }
  O.dust.forEach((d, k) => {
    const on = (t < 2.3) || (t >= 28.9 && t < 32.8) || (t >= 43.2 && t < 45.9);
    d.visible = on; if (!on) return;
    const ph = ((t * 1.3 + k / 40) % 1), back = new THREE.Vector3(0, 0.3, -2.8 - ph * 3); O.truck.localToWorld(back);
    d.position.set(back.x + (rnd(k) - 0.5) * 1.5, 0.3 + ph * 1.2, back.z + (rnd(k, 1) - 0.5) * 1.5); d.scale.setScalar(0.6 + ph * 1.8); (d.material as THREE.SpriteMaterial).opacity = (1 - ph) * 0.5;
  });

  // ---------------- camera ----------------
  const c = camAt(s, t);
  let pos = c.pos, look = c.look;
  if (s.truckCam) { pos = O.truck.localToWorld(c.pos.clone()); look = O.truck.localToWorld(c.look.clone()); }
  if (s.trackTruck) { pos = c.pos.clone().add(V(O.truck.position.x, 0, 0)); look = c.look.clone().add(V(O.truck.position.x, 0, 0)); }
  if (s.calCam && c.i === 0) { const shed = O.root.getObjectByName("shed")!; const cal = shed.localToWorld(V(0.9, 1.6, 1.77)); const n = shed.localToWorld(V(0.9, 1.6, 2.77)).sub(cal).normalize(); pos = cal.clone().add(n.multiplyScalar(c.pos.z)).add(V(0, c.pos.y, 0)); look = cal; }
  const sh = (t >= 29 && t < 32.8) ? Math.sin(t * 17) * 0.05 : 0;
  cam.fov = c.fov; cam.near = 0.04; cam.far = 600; cam.position.copy(pos).add(V(0, sh, sh * 0.5)); cam.lookAt(look); cam.updateProjectionMatrix();
  O.sun.target.position.copy(look).setY(0); O.sun.position.copy(O.sun.target.position).add(s.light === "golden" ? V(-40, 8, 20) : V(-20, 40, 26));
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
const PROPER = ["AUSTRALIA", "WORLD", "WAR", "ONE", "WESTERN", "MAJOR", "MEREDITH", "NOVEMBER", "CAMPION"];
const showW = (s: string) => (PROPER.includes(s) ? s[0] + s.slice(1).toLowerCase() : s.toLowerCase());
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
        Cartoon recreation · figures vary by source: Britannica, National Geographic, History Hit, Wikipedia · Serventy quote via Wikipedia
      </div>
    </>
  );
};
export const EmuShort: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#8fc4f2" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.04, far: 600 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / 30} />
      <Audio src={staticFile("emu/mix.wav")} />
    </AbsoluteFill>
  );
};
void CAMP; void TANKW; void lewisGun;
