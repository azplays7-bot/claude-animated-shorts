// "The 1904 Olympic Marathon" (St. Louis), detailed style. Stadium at the origin, the country course at ROAD.
// The numbers are on things in the scene: the store thermometer (90°F), the water-tower signs (mile 6, next water
// mile 12), the scoreboard (32 started, 14 finished; Lorz disqualified; Hicks 3 hrs 28 min), the MILE 9 post, the
// Boston 1905 poster, and the trainers' BRANDY / STRYCHNINE labels.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armMix, CharSpec } from "../look/char";
import { Route, ROAD, BOARD, POSTER } from "./route";
import WORDS from "./words.json";

export const MAR_FRAMES = 1800;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };

const RUN = (o: Partial<CharSpec>): CharSpec => ({ skin: "#f1c7a2", shirt: "#f4f2ea", cap: "#000", capLogo: "#000", hair: "#5a3a20", bodyR: 0.17, bodyLen: 0.3, headR: 0.25, legLen: 0.66, hat: "none", hairStyle: "top", shorts: "#1d2a5a", ...o });
const SUIT = (o: Partial<CharSpec>): CharSpec => ({ skin: "#e8b58f", shirt: "#2a2e38", cap: "#000", capLogo: "#000", hair: "#3a2416", bodyR: 0.21, bodyLen: 0.28, headR: 0.27, legLen: 0.62, hat: "bowler", hatColor: "#1c1c20", coat: "#2a2e38", stache: "#3a2416", ...o });
const CAST: Record<string, CharSpec> = {
  lorz: RUN({ bib: "31", hair: "#6b4226" }), hicks: RUN({ bib: "20", hair: "#2a1a12", skin: "#f3d1b0" }),
  carv: RUN({ shirt: "#f2ede0", sleeves: true, shorts: "#3a3a42", hair: "#1a1410", skin: "#d8a27a", stache: "#1a1410", bib: "" }),
  taun: RUN({ bib: "35", skin: "#6b4430", hair: "#111", shorts: "#2a2a2e" }), garcia: RUN({ bib: "13", skin: "#d8a27a", hair: "#1a1410", shorts: "#5a1d1d" }),
  r1: RUN({ bib: "7", shirt: "#e8e0d0", shorts: "#2a4a2a", hair: "#b5651d" }), r2: RUN({ bib: "22", skin: "#e8b58f", shorts: "#4a2a2a" }), r3: RUN({ bib: "5", hair: "#c8a070", shorts: "#2a2a2e" }),
  starter: SUIT({ hat: "boater", hatColor: "#7a1d1d", coat: "#3a3e48", shirt: "#3a3e48" }), official: SUIT({ hat: "boater", hatColor: "#1d2a5a", stache: "#8a8a8a", hair: "#9a9a9a" }),
  t1: SUIT({}), t2: SUIT({ shirt: "#4a3a2a", coat: "#4a3a2a", stache: "" }), driver: SUIT({ hat: "flat", hatColor: "#5a5048", glasses: "#3a2a1a", coat: undefined, shirt: "#6a5a3a" }),
};

type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number, number?];
type Shot = { a: number; b: number; road: boolean; cams: Cam[]; follow?: (t: number) => number };
const carX = (t: number) => -30 + (t - 19.3) * 8.5;
const hicksX = (t: number) => -12 + (t - 29.8) * 1.6;
const carvX = (t: number) => 20 + (t - 44.6) * 2.6;
const SHOTS: Shot[] = [
  { a: 0, b: 2.3, road: false, cams: [[0, V(9, 2.4, -10), V(-1, 2.0, 4), V(8, 2.3, -9), V(-1, 2.2, 4), 54, 52]] },
  { a: 2.3, b: 5.1, road: false, cams: [[2.3, V(10, 0.95, 0.9), V(0, 1.25, 1), V(9.5, 1.0, 1.0), V(0, 1.25, 1), 52, 50]] },
  { a: 5.1, b: 7.2, road: true, cams: [[5.1, V(-4.7, 1.65, 2.6), V(-4.7, 1.6, 4.44), V(-4.7, 1.65, 2.85), V(-4.7, 1.6, 4.44), 44, 42, 1]] },
  { a: 7.2, b: 11.1, road: true, cams: [[7.2, V(6, 1.6, 6.5), V(-2, 1.1, 0), V(7, 1.6, 6.2), V(-1, 1.1, 0), 54, 52]] },
  { a: 11.1, b: 14.3, road: true, cams: [[11.1, V(14.0, 1.7, 5.0), V(14.0, 2.8, -6), V(14.0, 1.9, 4.3), V(14.0, 3.3, -6), 58, 56]] },
  { a: 14.3, b: 17.4, road: false, cams: [[14.3, V(-12, 3.4, -1.0), V(-12, 3.6, -8), V(-12, 3.5, -1.6), V(-12, 3.6, -8), 50, 48]] },
  { a: 17.4, b: 19.3, road: false, cams: [[17.4, V(3.0, 1.3, -0.8), V(-1, 1.25, 1.0), V(2.8, 1.3, -0.7), V(-0.5, 1.25, 1.0), 52, 50, 1]] },
  { a: 19.3, b: 24.2, road: true, follow: carX, cams: [[19.3, V(3.6, 1.6, 4.8), V(0, 1.3, 1.4), V(3.6, 1.6, 4.8), V(0, 1.3, 1.4), 52, 52]] },
  { a: 24.2, b: 26.0, road: false, cams: [[24.2, V(-11, 3.0, -2.4), V(-12, 3.4, -8), V(-11.2, 3.1, -2.9), V(-12, 3.4, -8), 50, 48, 1]] },
  { a: 26.0, b: 29.8, road: false, cams: [[26.0, V(5.4, 1.6, 4.1), V(5.6, 1.45, 7.6), V(5.5, 1.6, 4.4), V(5.6, 1.45, 7.6), 50, 48]] },
  { a: 29.8, b: 33.2, road: true, follow: hicksX, cams: [[29.8, V(3.2, 1.7, 5.2), V(0, 1.2, 0), V(3.2, 1.7, 5.2), V(0, 1.2, 0), 52, 52]] },
  { a: 33.2, b: 36.3, road: true, cams: [[33.2, V(-5.9, 1.45, 3.0), V(-5.8, 1.15, 0.6), V(-5.9, 1.4, 2.8), V(-5.8, 1.15, 0.6), 46, 44, 1]] },
  { a: 36.3, b: 38.8, road: false, cams: [[36.3, V(4.2, 1.5, -1.6), V(0, 1.4, 1.2), V(4.0, 1.5, -1.5), V(0, 1.4, 1.2), 52, 50]] },
  { a: 38.8, b: 44.6, road: false, cams: [[38.8, V(-12, 3.4, -0.6), V(-12, 3.6, -8), V(-12, 3.5, -1.8), V(-12, 3.6, -8), 52, 48]] },
  { a: 44.6, b: 47.0, road: true, follow: carvX, cams: [[44.6, V(2.0, 1.4, 3.0), V(0, 1.15, -0.8), V(2.0, 1.4, 3.0), V(0, 1.15, -0.8), 50, 50]] },
  { a: 47.0, b: 48.9, road: true, cams: [[47.0, V(51, 1.5, 6.2), V(51, 1.35, 8.2), V(51, 1.45, 6.5), V(51, 1.35, 8.2), 44, 42, 1]] },
  { a: 48.9, b: 50.1, road: true, cams: [[48.9, V(48.3, 2.2, 2.6), V(47.8, 0.3, 5.9), V(48.3, 2.1, 2.75), V(47.8, 0.3, 5.9), 52, 50]] },
  { a: 50.1, b: 52.8, road: true, cams: [[50.1, V(-12.5, 1.6, 9.0), V(-17, 0.7, 13.5), V(-13.5, 1.6, 9.6), V(-20, 0.7, 14.8), 54, 52]] },
  { a: 52.8, b: 55.5, road: true, cams: [[52.8, V(2.6, 1.35, 6.2), V(-0.3, 1.0, 2.4), V(2.4, 1.35, 6.0), V(-0.3, 1.0, 2.4), 50, 48]] },
  { a: 55.5, b: 60.0, road: false, cams: [[55.5, V(-12, 2.6, -2.2), V(-12, 3.6, -8), V(-4, 5.5, 9), V(-9, 2.4, -6), 50, 54]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (s: Shot, t: number) => {
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = c[7] === 1 ? 1 - Math.pow(1 - Math.min(1, u * 1.1), 3) : u * u * (3 - 2 * u) * 0.85 + u * 0.15;
  const pos = c[1].clone().lerp(c[3], k), look = c[2].clone().lerp(c[4], k);
  if (s.follow) { const x = s.follow(t); pos.x += x; look.x += x; }
  if (s.road) { pos.add(ROAD); look.add(ROAD); }
  return { pos, look, fov: c[5] + (c[6] - c[5]) * k };
};

type Act = { L?: ArmName; R?: ArmName; mouth?: Mouth; yaw?: number; pitch?: number; walk?: number };
const act = (c: Toon, t: number, a: Act, armL?: THREE.Vector3[], armR?: THREE.Vector3[]) => c.pose({
  blink: [1.1, 3.7].reduce((b, x) => { const d = Math.abs(((t - x) % 4.3 + 4.3) % 4.3); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.3 - d) / 0.07)); }, 0),
  mouth: a.mouth ?? "smile", brow: 0.3, headYaw: a.yaw ?? 0, headPitch: a.pitch ?? 0,
  armL: armL ?? armMix(c, a.L ?? "rest", a.L ?? "rest", 0, -1, t), armR: armR ?? armMix(c, a.R ?? "rest", a.R ?? "rest", 0, 1, t),
  bob: Math.sin(t * 2.4 + c.spec.headR * 40) * 0.006 + (a.walk !== undefined ? Math.abs(Math.sin(a.walk)) * 0.035 : 0), walk: a.walk,
});
/** running arms: pumping elbows */
const runArms = (c: Toon, ph: number, sx: number) => { const R = c.spec.bodyR, y = c.shoulderY, s = Math.sin(ph) * sx; return [V(sx * (R + 0.06), y - 0.16, 0.08 * s), V(sx * (R - 0.02), y - 0.06, 0.12 + 0.14 * s)]; };

class World {
  r = new Route(); c: Record<string, Toon> = {}; light = "";
  constructor(scene: THREE.Scene) {
    scene.add(this.r.root);
    for (const k of Object.keys(CAST)) this.c[k] = new Toon(this.r.root, CAST[k], 0, 0, 0);
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
    scene.background = new THREE.Color("#b8d2e6");
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

  const s = shotAt(t), Rt = W.r, C = W.c;
  const O = s.road ? ROAD : V(0, 0, 0);
  Rt.stadium.visible = !s.road; Rt.road.visible = s.road;
  // hide everyone; each shot places who it needs (positions are in the current set's local coordinates)
  Object.values(C).forEach((c) => { c.root.visible = false; c.root.rotation.set(0, 0, 0); });
  Rt.cars.forEach((k) => (k.visible = false)); Rt.dogs.forEach((d) => (d.root.visible = false));
  Rt.stars.visible = false; Rt.zzz.visible = false; Rt.dust.forEach((d) => (d.visible = false));
  [Rt.bottle, Rt.vial, Rt.apple].forEach((p) => { p.parent?.remove(p); });
  Object.values(C).forEach((c) => { c.held = [null, null]; });
  const place = (k: string, x: number, z: number, ry: number, y = 0) => { const c = C[k]; if (c.root.parent !== Rt.root) Rt.root.attach(c.root); c.root.visible = true; c.root.position.set(O.x + x, y, O.z + z); c.root.rotation.set(0, ry, 0); return c; };
  const runner = (k: string, x: number, z: number, ry: number, speed = 10, mouth: Mouth = "flat", yaw = 0) => {
    const c = place(k, x, z, ry), ph = t * speed + k.length;
    act(c, t, { walk: ph, mouth, yaw, pitch: 0.05 }, runArms(c, ph, -1), runArms(c, ph + Math.PI, 1));
    return c;
  };
  const carAt = (i: number, x: number, z: number, ry: number) => { const k = Rt.cars[i]; k.visible = true; k.position.set(O.x + x, Math.abs(Math.sin(t * 9 + i)) * 0.03, O.z + z); k.rotation.set(0, ry, 0); k.children.forEach((w) => { if (w.name === "wheel") w.rotation.x = t * 12; }); return k; };
  const dustBehind = (k: THREE.Group, amount = 1) => Rt.dust.forEach((d, j) => {
    if (j / Rt.dust.length > amount) return;
    const ph = ((t * 1.1 + j / Rt.dust.length) % 1), back = V((Math.sin(j * 3.1) - 0.5) * 1.2, 0.4, -1.6 - ph * 6); k.localToWorld(back);
    d.visible = true; d.position.set(back.x, 0.4 + ph * 1.8, back.z + Math.cos(j) * 0.6); d.scale.setScalar(0.8 + ph * 3.2); (d.material as THREE.SpriteMaterial).opacity = (1 - ph) * 0.55;
  });

  // ---------------- per shot ----------------
  const scoreLines: [string, string?][] = t < 15.6 ? [["STARTERS: 32"]] : t < 24.2 ? [["STARTERS: 32"], ["FINISHERS: 14"]] : t < 26.0 ? [["F. LORZ:"], ["DISQUALIFIED", "#7a1d1d"]]
    : t < 55.5 ? [["WINNER: T. HICKS"], ["TIME:"], ["3 HRS 28 MIN"]] : [["FOLLOW FOR MORE"], ["WEIRD HISTORY", "#7a1d1d"]];
  Rt.setScore(scoreLines);
  Rt.tape.visible = !((t >= 18.3 && t < 19.3) || (t >= 37.5 && t < 38.8));
  if (t < 5.1) {
    const go = t >= 2.35;
    ["lorz", "hicks", "r1", "r2", "taun", "garcia", "r3", "carv"].forEach((k, i) => {
      const x = go ? -1.5 + (t - 2.35) * (3.0 + (i % 3) * 0.2) : -1.5, z = -2.4 + i * 0.95;
      if (go) runner(k, x, z, Math.PI / 2, 10 + i, "grin"); else { place(k, x, z, Math.PI / 2); act(C[k], t + i, { L: "hip", R: "rest", mouth: "smile", yaw: -0.3 }); }
    });
    place("starter", -1.2, -4.4, 0.4); act(C.starter, t, { R: "raise", L: "hip", mouth: t > 2.3 && t < 2.8 ? "o" : "smile", yaw: 0.2 });
  }
  if (t >= 5.1 && t < 7.2) { place("official", -6.4, 4.0, Math.PI); act(C.official, t, { L: "hip", R: "hold", mouth: "o", pitch: 0.1 }); }
  if (t >= 7.2 && t < 11.1) {
    ["r1", "hicks", "r2", "garcia", "r3"].forEach((k, i) => runner(k, -8 + (t - 7.2) * 2.4 + i * 1.3, -1.8 + (i % 3) * 1.2, Math.PI / 2, 9 + i, t > 9.3 ? "dazed" : "flat", t > 9.3 ? 0.6 : 0));
    const k = carAt(0, -16 + (t - 7.2) * 7, 1.7, Math.PI / 2); dustBehind(k);
    place("driver", 0, 0, 0); k.attach(C.driver.root); C.driver.root.position.set(0.35, 0.6, -0.05); C.driver.root.rotation.set(0, 0, 0); act(C.driver, t, { L: "counter", R: "counter", mouth: "grin" });
  }
  if (t >= 11.1 && t < 14.3) { const c = place("r1", 15.5, -5.6, Math.PI); act(c, t, { L: "raise", R: "hold", mouth: "o", pitch: -0.5 }); runner("r2", 6 + (t - 11.1) * 2, 0.3, Math.PI / 2, 9, "dazed"); }
  if (t >= 17.4 && t < 19.3) {
    runner("lorz", -3.4 + (t - 17.4) * 2.8, 1.0, Math.PI / 2, 11, "grin");
    if (t > 18.3) { const l = C.lorz; act(l, t, { mouth: "laugh", L: "cheer", R: "cheer", walk: t * 11 }); }
    place("official", 1.8, -4.2, -0.6); act(C.official, t, { L: "cheer", R: "cheer", mouth: "grin" });
  }
  if (t >= 19.3 && t < 24.2) {
    const k = carAt(1, carX(t), 1.6, Math.PI / 2); dustBehind(k);
    place("lorz", 0, 0, 0); k.attach(C.lorz.root); C.lorz.root.position.set(-0.35, 0.55, -0.05); C.lorz.root.rotation.set(0, 0, 0); act(C.lorz, t, { L: "rest", R: "wave", mouth: "laugh", yaw: -0.5 });
    place("driver", 0, 0, 0); k.attach(C.driver.root); C.driver.root.position.set(0.35, 0.6, -0.05); C.driver.root.rotation.set(0, 0, 0); act(C.driver, t, { L: "counter", R: "counter", mouth: "smile" });
    ["r1", "r3", "taun"].forEach((k2, i) => runner(k2, -20 + (t - 19.3) * 2.3 + i * 5, -1.6 + i * 0.4, Math.PI / 2, 9 + i, "o", 0.6));
  }
  if (t >= 24.2 && t < 26.0) { place("official", -10.4, -7.4, 0.3); act(C.official, t, { L: "hip", R: "point", mouth: "talk", yaw: 0.5 }); }
  if (t >= 26.0 && t < 29.8) { place("lorz", 4.9, 7.0, Math.PI + 0.25); act(C.lorz, t, { L: "hip", R: "point", mouth: "grin", yaw: 0.35 }); }
  if (t >= 29.8 && t < 33.2) {
    runner("hicks", hicksX(t), -0.6, Math.PI / 2, 6, "dazed");
    const k = carAt(2, hicksX(t) + 0.4, 1.7, Math.PI / 2);
    place("t1", 0, 0, 0); k.attach(C.t1.root); C.t1.root.position.set(-0.35, 0.55, -0.05); C.t1.root.rotation.set(0, -0.5, 0);
    act(C.t1, t, { L: "rest", R: "point", mouth: "talk", yaw: -0.4 }); C.t1.held[1] = Rt.bottle; C.t1.root.add(Rt.bottle);
    place("driver", 0, 0, 0); k.attach(C.driver.root); C.driver.root.position.set(0.35, 0.6, -0.05); C.driver.root.rotation.set(0, 0, 0); act(C.driver, t, { L: "counter", R: "counter", mouth: "flat" });
  }
  if (t >= 33.2 && t < 36.3) {
    const tr = place("t1", -5.4, 0.6, -Math.PI / 2 + 0.6); const sh = tr.shoulderY, R = tr.spec.bodyR;
    act(tr, t, { mouth: "talk", yaw: -0.3 }, [V(-(R + 0.05), sh - 0.16, 0.12), V(-0.12, sh - 0.12, R + 0.22)], [V(R + 0.05, sh - 0.16, 0.12), V(0.12, sh - 0.1, R + 0.22)]);
    tr.held[0] = Rt.vial; tr.root.add(Rt.vial); tr.held[1] = Rt.bottle; tr.root.add(Rt.bottle);
    act(tr, t, { mouth: "talk", yaw: -0.3 }, [V(-(R + 0.05), sh - 0.16, 0.12), V(-0.12, sh - 0.12, R + 0.22)], [V(R + 0.05, sh - 0.16, 0.12), V(0.12, sh - 0.1, R + 0.22)]);
    const h = place("hicks", -6.5, 0.4, Math.PI / 2 - 0.3); act(h, t, { mouth: "dazed", L: "rest", R: "rest", pitch: 0.15, yaw: 0.2 });
  }
  if (t >= 36.3 && t < 38.8) {
    const x = -3.5 + (t - 36.3) * 1.5;
    const h = place("hicks", x, 1.0, Math.PI / 2); h.root.rotation.z = 0.12 * Math.sin(t * 3); act(h, t, { mouth: "dazed", L: "raise", R: "raise", pitch: 0.2, walk: t * 4 });
    place("t1", x, 0.35, Math.PI / 2); act(C.t1, t, { L: "rest", R: "hold", mouth: "talk", walk: t * 4, yaw: -0.4 });
    place("t2", x, 1.65, Math.PI / 2); act(C.t2, t, { L: "hold", R: "rest", mouth: "o", walk: t * 4, yaw: 0.4 });
    const hp = new THREE.Vector3(); h.head.getWorldPosition(hp); Rt.stars.visible = true; Rt.stars.position.copy(hp).add(V(0, 0.42, 0)); Rt.stars.scale.set(0.7, 0.35, 1); Rt.stars.material.rotation = t * 3;
  }
  if (t >= 38.8 && t < 44.6) { place("official", -13.6, -7.4, 0.2); act(C.official, t, { L: "hip", R: "point", mouth: "talk", yaw: 0.5 }); }
  if (t >= 44.6 && t < 47.0) runner("carv", carvX(t), -0.8, Math.PI / 2, 9, "grin");
  if (t >= 47.0 && t < 48.9) {
    const cv = place("carv", 51, 8.2, Math.PI); const sh = cv.shoulderY, R = cv.spec.bodyR;
    act(cv, t, { mouth: t > 47.7 ? "dazed" : "grin", L: "hip", pitch: 0.05 }, undefined, [V(R + 0.06, sh - 0.12, 0.12), V(0.06, sh + 0.1, R + 0.2)]);
    cv.held[1] = Rt.apple; cv.root.add(Rt.apple);
    act(cv, t, { mouth: t > 47.7 ? "dazed" : "grin", L: "hip", pitch: 0.05 }, undefined, [V(R + 0.06, sh - 0.12, 0.12), V(0.06, sh + 0.1, R + 0.2)]);
  }
  if (t >= 48.9 && t < 50.1) {
    const cv = place("carv", 47.6, 6.7, 0, 0.2); cv.root.rotation.set(-Math.PI / 2, 0, 0, "YXZ"); cv.root.position.y = 0.22;
    act(cv, t, { mouth: "flat", L: "rest", R: "rest" }); cv.pose({ blink: 1, mouth: "flat", brow: 0, headYaw: 0, headPitch: 0, armL: armMix(cv, "hip", "hip", 0, -1, t), armR: armMix(cv, "hip", "hip", 0, 1, t), bob: 0 });
    const hp = new THREE.Vector3(); cv.head.getWorldPosition(hp); Rt.zzz.visible = true; Rt.zzz.position.copy(hp).add(V(0.3, 0.55 + 0.05 * Math.sin(t * 3), 0)); Rt.zzz.scale.setScalar(0.6);
  }
  if (t >= 50.1 && t < 52.8) {
    const u = t - 50.1, rx = -12 - u * 3.6, rz = 12 + u * 1.3;
    runner("taun", rx, rz, -Math.PI / 2 - 0.35, 14, "o", 0.8);
    Rt.dogs.forEach((d, i) => { d.root.visible = true; d.root.position.set(O.x + rx + 2.2 + i * 1.1, 0, O.z + rz - 0.8 + i * 0.6); d.root.rotation.y = -Math.PI / 2 - 0.35; d.pose(t * 16 + i, 1); });
  }
  if (t >= 52.8 && t < 55.5) {
    const g = place("garcia", -0.3, 2.5, 0.6); act(g, t, { mouth: "dazed", L: "hold", R: "hold", pitch: 0.5 }); g.root.rotation.x = 0.35;
    const k = carAt(0, -7 + (t - 52.8) * 6, -1.2, Math.PI / 2); dustBehind(k, 1);
    place("driver", 0, 0, 0); k.attach(C.driver.root); C.driver.root.position.set(0.35, 0.6, -0.05); C.driver.root.rotation.set(0, 0, 0); act(C.driver, t, { L: "counter", R: "counter", mouth: "grin" });
  }
  if (t >= 55.5) {
    ["lorz", "hicks", "carv", "taun"].forEach((k, i) => { const c = place(k, -16 + i * 2.2, -4.5 - (i % 2) * 1.2, 0.3); c.root.rotation.set(-Math.PI / 2, i * 0.5, 0, "YXZ"); c.root.position.y = 0.22; c.pose({ blink: i % 2, mouth: i === 1 ? "dazed" : "laugh", brow: 0, headYaw: 0, headPitch: 0, armL: armMix(c, "cheer", "cheer", 0, -1, t), armR: armMix(c, "hip", "hip", 0, 1, t), bob: 0 }); });
  }
  // keep held props glued to the hands
  Object.values(C).forEach((c) => c.held.forEach((h, k) => { if (h) { h.position.copy(c.hands[k].position); h.position.y += 0.02; } }));

  const c = camAt(s, t);
  cam.fov = c.fov; cam.near = 0.04; cam.far = 500; cam.position.copy(c.pos); cam.lookAt(c.look); cam.updateProjectionMatrix();
  Rt.sun.target.position.copy(c.look).setY(0); Rt.sun.position.copy(Rt.sun.target.position).add(V(-16, 38, 24));
  const sky = Rt.root.getObjectByName("sky"); if (sky) sky.position.copy(cam.position);
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
const PROPER = ["OLYMPIC", "ST", "LOUIS", "FRED", "LORZ", "BOSTON", "MARATHON", "THOMAS", "HICKS", "CUBAN"];
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
        Cartoon recreation · sources: Olympics.com, Smithsonian, Olympedia, Wikipedia, History.com · bib numbers illustrative
      </div>
    </>
  );
};
export const MarShort: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#b8d2e6" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.04, far: 500 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / 30} />
      <Audio src={staticFile("mar/mix.wav")} />
    </AbsoluteFill>
  );
};
void BOARD; void POSTER;
