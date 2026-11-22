// "The Day a Giant Wave of Molasses Destroyed a City Neighborhood" (Boston, January 15, 1919), detailed style.
// Two sets: Commercial Street / the tank (world.ts, at the origin) and the courtroom (court.ts, 400 m away).
// Every number lives on something in the scene: the newsstand date board, the pump-house contents board, the
// truck's speedometer, the newspaper, the thermometer, the court calendar and ruling, the stamped tank plan,
// the plaque and the ballpark scoreboard. The flood is never shown hitting a person; the toll is told by a newspaper.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Toon, Mouth, ArmName, armMix, CharSpec } from "../look/char";
import { M, MP, canvas, cyl, put, grp, text, glow, rbox } from "../look/kit";
import { North, TANK, NEWS, THERMO, newspaperTex } from "./world";
import { Court } from "./court";
import WORDS from "./words.json";

export const MOL_FRAMES = 1800;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const COURT = V(400, 0, 0);
const BURST = 11.5;

// ---------------- cast (1919) ----------------
const skin = ["#f1c7a2", "#e8b58f", "#c98c64", "#f3d1b0", "#8d5a3b"];
const P = (o: Partial<CharSpec>): CharSpec => ({ skin: skin[0], shirt: "#3a3f4a", cap: "#000", capLogo: "#000", hair: "#3a2416", bodyR: 0.2, bodyLen: 0.26, headR: 0.27, legLen: 0.62, hat: "flat", hatColor: "#4a4038", ...o });
const CAST: Record<string, CharSpec> = {
  gent: P({ shirt: "#2a2e38", coat: "#2a2e38", hat: "bowler", hatColor: "#1c1c20", stache: "#3a2416" }),
  lady: P({ skin: skin[3], shirt: "#6a3a5a", dress: "#6a3a5a", hat: "lady", hatColor: "#3a2a3a", hair: "#5a3a20", bodyR: 0.19 }),
  worker: P({ skin: skin[1], shirt: "#5a6a7a", hat: "flat", hatColor: "#5a5048", stache: "#2a1a12" }),
  kid: P({ skin: skin[2], shirt: "#8a5a3a", hat: "flat", hatColor: "#6a5a4a", bodyR: 0.15, bodyLen: 0.2, headR: 0.24, legLen: 0.45, shorts: "#3a3a40" }),
  newsboy: P({ skin: skin[3], shirt: "#9a7a5a", hat: "flat", hatColor: "#7a6a5a", bodyR: 0.15, bodyLen: 0.2, headR: 0.25, legLen: 0.47, shorts: "#4a4a50", hair: "#b5651d" }),
  sailor1: P({ shirt: "#1d2a4a", hat: "sailor", skin: skin[0] }), sailor2: P({ shirt: "#1d2a4a", hat: "sailor", skin: skin[4], hair: "#111" }),
  fire: P({ shirt: "#1b1b1f", coat: "#1b1b1f", hat: "helmet", hatColor: "#1b1b1f", stache: "#5a3a20" }),
  painter: P({ shirt: "#e8e2d4", hat: "flat", hatColor: "#e8e2d4", skin: skin[1] }),
  driver: P({ shirt: "#4a3a2a", hat: "flat", hatColor: "#3a3a3e", stache: "#2a1a12" }),
  judge: P({ shirt: "#141418", coat: "#141418", hat: "none", hairStyle: "top", hair: "#c8c8c8", glasses: "#2a2a2e", stache: "#d0d0d0", bodyR: 0.23 }),
  lawyer: P({ shirt: "#2a2a34", hat: "none", hairStyle: "top", hair: "#2a1a12", stache: "#2a1a12" }),
  engineer: P({ shirt: "#e8e2d4", hat: "none", hairStyle: "top", hair: "#5a3a20", glasses: "#2a2a2e" }),
  sum1: P({ shirt: "#e8d8b0", hat: "flat", hatColor: "#c8b890", skin: skin[3] }), sum2: P({ shirt: "#d86a8a", dress: "#d86a8a", hat: "lady", hatColor: "#f2e6c8", skin: skin[1] }),
  k1: P({ shirt: "#d8262e", hat: "cap", cap: "#2b5fb4", capLogo: "#fff", bodyR: 0.15, bodyLen: 0.2, headR: 0.24, legLen: 0.45, shorts: "#2a3554", skin: skin[2] }),
  k2: P({ shirt: "#ffc928", hat: "cap", cap: "#d8262e", capLogo: "#fff", bodyR: 0.15, bodyLen: 0.2, headR: 0.24, legLen: 0.45, shorts: "#24282e", skin: skin[4] }),
  k3: P({ shirt: "#1aa3a6", hat: "none", hairStyle: "bun", hair: "#2a1a12", bodyR: 0.15, bodyLen: 0.2, headR: 0.24, legLen: 0.45, shorts: "#3a2a5a", skin: skin[0] }),
};

// ---------------- shots ----------------
type Light = "noon" | "night" | "sepia" | "summer" | "today" | "court";
type Mode = "flood" | "settled" | "none" | "summer" | "today";
type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number, number?];
type Shot = { a: number; b: number; light: Light; mode: Mode; ft?: (t: number) => number; grade?: string; cams: Cam[]; truck?: boolean };
const SHOTS: Shot[] = [
  { a: 0, b: 2.3, light: "noon", mode: "flood", ft: (t) => 1.05 + t * 0.5, cams: [[0, V(9, 3.4, 13.6), V(-3, 3.2, -6), V(8.4, 3.3, 13.4), V(-3, 3.6, -6), 58, 56]] },
  { a: 2.3, b: 4.5, light: "noon", mode: "flood", ft: (t) => 2.2 + (t - 2.3) * 0.55, cams: [[2.3, V(34, 30, 40), V(0, 0, -6), V(30, 27, 36), V(0, 0, -6), 50, 48]] },
  { a: 4.5, b: 7.0, light: "noon", mode: "flood", ft: (t) => 4.6 + (t - 4.5) * 0.4, cams: [[4.5, V(-5.2, 1.25, 4.2), V(-8.2, 0.7, 7.2), V(-5.6, 1.15, 4.7), V(-8.2, 0.7, 7.2), 44, 42]] },
  { a: 7.0, b: 9.4, light: "noon", mode: "none", ft: () => -5, cams: [
    [7.0, V(-6.5, 1.8, 8.6), V(-3.2, 2.6, 13.1), V(-5.6, 1.8, 9.2), V(-3.2, 2.7, 13.1), 46, 44],
    [8.4, V(4.5, 3.0, 6.0), V(4.5, 11.0, 14.3), V(4.5, 3.4, 6.6), V(4.5, 11.4, 14.3), 46, 44, 1]] },
  { a: 9.4, b: 11.4, light: "noon", mode: "none", ft: (t) => t - BURST, cams: [[9.4, V(9, 1.6, 10.5), V(0, 8, -19), V(7.5, 1.7, 8.8), V(0, 9, -19), 56, 54]] },
  { a: 11.4, b: 12.6, light: "noon", mode: "flood", ft: (t) => t - BURST, cams: [[11.4, V(16, 5, 6), V(0, 6, -12), V(16.5, 5.2, 6.6), V(0, 6, -12), 52, 52, 1]] },
  { a: 12.6, b: 14.6, light: "noon", mode: "flood", ft: (t) => 0.4 + (t - 12.6) * 0.55, cams: [[12.6, V(17, 1.95, 1.0), V(17, 1.95, -3.5), V(17, 1.95, 0.4), V(17, 1.95, -3.5), 42, 42]] },
  { a: 14.6, b: 17.2, light: "noon", mode: "flood", ft: (t) => t - BURST, cams: [[14.6, V(-16, 8.5, 19), V(2, 0, -6), V(-13, 8, 18), V(2, 0, -6), 52, 50]] },
  { a: 17.2, b: 20.0, light: "noon", mode: "flood", ft: (t) => 0.95 + (t - 17.2) * 0.22, cams: [[17.2, V(-17, 0.9, 13.8), V(-6, 6.5, 0), V(-16.5, 0.9, 13.6), V(-6, 7.2, 0), 60, 60]] },
  { a: 20.0, b: 22.2, light: "noon", mode: "flood", ft: (t) => 2.6 + (t - 20) * 0.5, truck: true, cams: [[20.0, V(0.05, 2.08, -0.32), V(0.32, 1.72, 0.95), V(0.05, 2.08, -0.3), V(0.32, 1.72, 0.95), 50, 50]] },
  { a: 22.2, b: 23.5, light: "noon", mode: "flood", ft: (t) => 1.0 + (t - 22.2) * 0.65, cams: [[22.2, V(-12, 3.4, 5.5), V(-25, 2.4, -7), V(-12.6, 3.4, 5.2), V(-25, 2.4, -7), 52, 52, 1]] },
  { a: 23.5, b: 25.9, light: "noon", mode: "flood", ft: (t) => 0.95 + (t - 23.5) * 0.55, cams: [[23.5, V(15, 3.6, 13.5), V(0, 5.6, 6), V(13.5, 3.6, 13.2), V(0, 5.4, 6), 54, 52]] },
  { a: 25.9, b: 29.6, light: "noon", mode: "none", ft: () => 99, grade: "saturate(0.3) contrast(1.06) brightness(0.96)", cams: [
    [25.9, V(-6.2, 1.5, 11.0), V(-6.0, 1.25, 13.2), V(-6.15, 1.45, 11.5), V(-6.0, 1.25, 13.2), 46, 42],
    [27.7, V(-6.05, 1.32, 12.4), V(-6.05, 1.22, 13.25), V(-6.05, 1.3, 12.55), V(-6.05, 1.22, 13.25), 42, 40, 1]] },
  { a: 29.6, b: 31.8, light: "night", mode: "settled", grade: "saturate(0.85)", cams: [[29.6, V(7.2, 2.35, 12.7), V(7.2, 2.25, 14.45), V(7.2, 2.35, 12.95), V(7.2, 2.25, 14.45), 44, 44]] },
  { a: 31.8, b: 35.8, light: "night", mode: "settled", grade: "saturate(0.85)", cams: [[31.8, V(3.5, 2.4, 12.2), V(-1, 1.2, 3.5), V(2.8, 2.2, 11.4), V(-1, 1.1, 3.5), 52, 50]] },
  { a: 35.8, b: 38.2, light: "sepia", mode: "none", ft: () => -9, grade: "sepia(0.85) saturate(0.9) contrast(1.06)", cams: [[35.8, V(6.5, 1.5, 2.6), V(-1, 6, -8), V(5.8, 1.5, 2.2), V(-1, 6.6, -8), 54, 52]] },
  { a: 38.2, b: 41.6, light: "sepia", mode: "none", ft: () => -9, grade: "sepia(0.85) saturate(0.9) contrast(1.06)", cams: [[38.2, V(2.6, 2.3, 0.4), V(-0.2, 3.0, -5.4), V(2.2, 2.4, -0.4), V(-0.2, 3.2, -5.4), 50, 48]] },
  { a: 41.6, b: 43.4, light: "court", mode: "none", cams: [[41.6, V(1.2, 2.4, 5.2), V(0, 1.7, -3.5), V(0.8, 2.3, 4.4), V(0.4, 1.9, -3.5), 54, 52]] },
  { a: 43.4, b: 44.9, light: "court", mode: "none", cams: [[43.4, V(0.6, 2.2, -2.2), V(0.1, 1.75, -4.1), V(0.55, 2.15, -2.4), V(0.1, 1.75, -4.1), 46, 44, 1]] },
  { a: 44.9, b: 48.4, light: "court", mode: "none", cams: [[44.9, V(3.6, 2.2, 4.6), V(4.1, 0.9, 3.5), V(3.7, 2.0, 4.45), V(4.1, 0.9, 3.5), 46, 44]] },
  { a: 48.4, b: 52.9, light: "summer", mode: "summer", cams: [[48.4, V(-5.0, 1.75, 8.6), V(-3.5, 1.5, 14.0), V(-4.0, 1.75, 9.0), V(-3.5, 1.6, 14.0), 52, 50]] },
  { a: 52.9, b: 55.6, light: "today", mode: "today", cams: [
    [52.9, V(8, 3.2, 7), V(-2, 1.2, -18), V(6.5, 3.0, 5.5), V(-2, 1.2, -18), 54, 52],
    [54.5, V(-6, 1.05, -2.35), V(-6, 0.72, -3.3), V(-6, 1.0, -2.5), V(-6, 0.72, -3.3), 42, 40, 1]] },
  { a: 55.6, b: 60.0, light: "today", mode: "today", cams: [[55.6, V(-8.5, 4.2, -21.5), V(-12, 5.6, -32), V(-4, 8, -8), V(-10, 4.5, -28), 50, 56]] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (s: Shot, t: number) => {
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = c[7] === 1 ? 1 - Math.pow(1 - Math.min(1, u * 1.1), 3) : u * u * (3 - 2 * u) * 0.85 + u * 0.15;
  return { pos: c[1].clone().lerp(c[3], k), look: c[2].clone().lerp(c[4], k), fov: c[5] + (c[6] - c[5]) * k };
};
const SHAKES = [BURST, 22.6, 24.3];
const shake = (t: number) => { for (const a of SHAKES) if (t >= a && t < a + 0.7) return 0.06 * Math.sin(t * 64) * (1 - (t - a) / 0.7); return t > BURST - 1.4 && t < BURST ? 0.01 * Math.sin(t * 90) : 0; };

type Act = { L?: ArmName; R?: ArmName; mouth?: Mouth; yaw?: number; pitch?: number; walk?: number; blink?: number[] };
const act = (c: Toon, t: number, a: Act) => c.pose({
  blink: (a.blink ?? [1.1, 3.7]).reduce((b, x) => { const d = Math.abs(((t - x) % 4.3 + 4.3) % 4.3); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.3 - d) / 0.07)); }, 0),
  mouth: a.mouth ?? "smile", brow: 0.3, headYaw: a.yaw ?? 0, headPitch: a.pitch ?? 0,
  armL: armMix(c, a.L ?? "rest", a.L ?? "rest", 0, -1, t), armR: armMix(c, a.R ?? "rest", a.R ?? "rest", 0, 1, t),
  bob: Math.sin(t * 2.4 + c.spec.headR * 40) * 0.006 + (a.walk !== undefined ? Math.abs(Math.sin(a.walk)) * 0.02 : 0), walk: a.walk,
});

class World {
  north = new North(); court = new Court(); courtRoot = new THREE.Group();
  c: Record<string, Toon> = {}; props: Record<string, THREE.Object3D> = {};
  light = ""; puffs: THREE.Sprite[] = []; barrel: THREE.Group; paper: THREE.Mesh; lanternLights: THREE.PointLight[] = [];
  scoreMsg = "";
  constructor(scene: THREE.Scene) {
    scene.add(this.north.root); this.courtRoot.position.copy(COURT); this.courtRoot.add(this.court.root); scene.add(this.courtRoot);
    const S = this.north.root, C = this.court.root;
    for (const k of ["gent", "lady", "worker", "kid", "newsboy", "sailor1", "sailor2", "fire", "painter", "driver", "sum1", "sum2", "k1", "k2", "k3"]) this.c[k] = new Toon(S, CAST[k], 0, 0, 0);
    this.c.judge = new Toon(C, CAST.judge, 0, -4.1, 0); this.c.judge.root.position.y = 0.55;
    this.c.lawyerA = new Toon(C, CAST.lawyer, -2.3, 0.2, Math.PI); this.c.lawyerB = new Toon(C, { ...CAST.lawyer, hair: "#6a6a6a", stache: "" }, 2.3, 0.2, Math.PI);
    this.c.engineer = new Toon(C, CAST.engineer, 4.55, 3.0, -0.5 + Math.PI);
    // the driver sits in the truck
    this.north.truck.add(this.c.driver.root); this.c.driver.root.position.set(-0.35, 0.55, 0.15); this.c.driver.root.rotation.y = 0;
    // props: lanterns, the newspaper, a paint brush, a floating barrel
    const lanternT = canvas(8, 8, (g) => { g.fillStyle = "#ffcf7a"; g.fillRect(0, 0, 8, 8); });
    for (const k of ["l1", "l2", "l3"]) {
      const l = new THREE.Group();
      put(l, cyl(0.07, 0.07, 0.16, 12), glow(lanternT, 5), 0, -0.1, 0, { cast: false }); put(l, cyl(0.09, 0.09, 0.03, 12), M("#222", 0.4, 0.8), 0, 0.0, 0); put(l, cyl(0.09, 0.09, 0.03, 12), M("#222", 0.4, 0.8), 0, -0.19, 0);
      const pl = new THREE.PointLight("#ffbf6a", 3.5, 6, 2); pl.position.set(0, -0.1, 0); l.add(pl); this.lanternLights.push(pl);
      this.props[k] = l;
    }
    this.paper = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), new THREE.MeshStandardMaterial({ map: newspaperTex(), roughness: 0.8, side: THREE.DoubleSide }));
    const pg = new THREE.Group(); pg.add(this.paper); this.paper.position.set(0, 0.2, 0.08); this.props.paper = pg;
    const br = new THREE.Group(); put(br, cyl(0.012, 0.012, 0.35, 6), M("#8a5a30", 0.6), 0, 0.12, 0.05, { rx: 0.6 }); put(br, rbox(0.08, 0.1, 0.03, 0.01), M("#5a3a22", 0.6), 0, 0.27, 0.15, { rx: 0.6 }); this.props.brush = br;
    this.barrel = grp(S, -8.2, 0.75, 7.2);
    const bt = canvas(512, 256, (g) => { g.fillStyle = "#8a5a30"; g.fillRect(0, 0, 512, 256); for (let x = 0; x < 512; x += 42) { g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(x, 0, 3, 256); } g.fillStyle = "#2a2a2e"; g.fillRect(0, 30, 512, 14); g.fillRect(0, 212, 512, 14); text(g, "MOLASSES", 256, 130, 74, "#1c1814"); });
    put(this.barrel, new THREE.CylinderGeometry(0.42, 0.42, 1.0, 24), M("#ffffff", 0.7, 0, { map: bt }), 0, 0, 0, { rz: Math.PI / 2 - 0.3, ry: 0.5 });
    // a ladder against the tank for the paint job
    const lad = grp(S, -0.3, 0, TANK.z + 13.9, 0); lad.name = "ladder";
    for (const sx of [-1, 1]) put(lad, rbox(0.06, 4.2, 0.06, 0.01), M("#8a6a40", 0.7), sx * 0.25, 2.05, 0.35, { rx: -0.16 });
    for (let k = 0; k < 9; k++) put(lad, rbox(0.5, 0.04, 0.04, 0.01), M("#8a6a40", 0.7), 0, 0.4 + k * 0.45, 0.42 - k * 0.07);
    // breath puffs (night)
    const pt = canvas(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(230,240,255,0.7)"); gr.addColorStop(1, "rgba(230,240,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    for (let k = 0; k < 9; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: pt, transparent: true, depthWrite: false })); s.visible = false; S.add(s); this.puffs.push(s); }
  }
  hold(c: Toon, k: number, obj: THREE.Object3D | null) {
    const cur = c.held[k]; if (cur === obj) return; if (cur) cur.parent?.remove(cur); c.held[k] = obj; if (obj) c.root.add(obj);
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
    scene.background = new THREE.Color("#20242a");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.8, distanceFalloff: 1.0, intensity: 2.4, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    composer.addPass(new EffectPass(cam, new BloomEffect({ intensity: 0.7, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 }), new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.42, offset: 0.32 })));
    composer.setSize(size.width, size.height);
    return { composer, ao };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const s = shotAt(t), N = W.north, C = W.c;
  const inCourt = s.light === "court";
  N.root.visible = !inCourt; W.courtRoot.visible = inCourt;
  fx.ao.configuration.aoRadius = inCourt ? 0.4 : 0.8;
  if (!inCourt && W.light !== s.light) { W.light = s.light; N.setLight(s.light === "sepia" ? "sepia" : (s.light as "noon" | "night" | "summer" | "today")); }
  scene.environmentIntensity = s.light === "night" ? 0.08 : 0.45;
  // which parts of the 1919 set exist in this shot
  const past = s.mode === "flood" || s.mode === "settled" || s.mode === "none";
  N.tankRoot.visible = past; N.el.visible = s.mode !== "today"; N.shed.visible = past; N.lot.visible = s.mode !== "today"; N.park.visible = s.mode === "today";
  N.truck.visible = past; const wagon = N.root.getObjectByName("wagon"); if (wagon) wagon.visible = s.mode !== "today";
  const ladder = N.root.getObjectByName("ladder"); if (ladder) ladder.visible = s.light === "sepia" && t >= 38.2;
  N.setTankSkin(s.light === "sepia" ? "gray" : "brown", s.light === "sepia" ? ss(38.6, 41.3, t) : 0);
  const ft = s.ft ? s.ft(t) : 99;
  N.flood(ft, s.mode === "flood" ? "flood" : s.mode === "settled" ? "settled" : "none", t);
  N.damage(s.mode === "flood" ? ft : s.mode === "settled" ? 99 : -1);
  if (s.mode === "none" && s.light === "noon" && t > 25) { N.flood(99, "none", t); }   // the newspaper shot: tank already gone
  W.barrel.visible = t >= 4.5 && t < 7.0; W.barrel.position.set(-8.2 + (t - 4.5) * 0.25, 0.72 + 0.04 * Math.sin(t * 3), 7.2); W.barrel.rotation.y = t * 0.2;
  N.setSmell(s.mode === "summer", t);
  if (s.mode === "today") { const m = t < 55.6 ? "WELCOME TO THE PARK" : "FOLLOW FOR MORE WEIRD HISTORY"; if (W.scoreMsg !== m) { W.scoreMsg = m; N.setScore(m); } }
  N.setThermo(41 - 13 * ss(29.9, 31.5, t));
  // the truck races the wave (35 mph on the dial)
  if (s.truck) { N.truck.position.set(-14 + (t - 20) * 7, 0, 3.2); N.setGauge(35 * ss(20.0, 21.2, t)); } else { N.truck.position.set(-14, 0, 3.2); N.setGauge(0); }
  act(C.driver, t, { L: "counter", R: "counter", mouth: "o", pitch: 0.05 });

  // ---------------- extras ----------------
  const all = ["gent", "lady", "worker", "kid", "newsboy", "sailor1", "sailor2", "fire", "painter", "sum1", "sum2", "k1", "k2", "k3"];
  all.forEach((k) => (C[k].root.visible = false));
  const place = (k: string, x: number, z: number, ry: number, a: Act, y = 0) => { const c = C[k]; c.root.visible = true; c.root.position.set(x, y, z); c.root.rotation.y = ry; act(c, t, a); };
  ["l1", "l2", "l3"].forEach((k, i) => W.hold([C.sailor1, C.sailor2, C.fire][i], 1, null));
  W.hold(C.newsboy, 1, null); W.hold(C.painter, 1, null);
  W.lanternLights.forEach((l) => (l.intensity = 0));
  if (t < 2.3) {
    // two people run from the wave toward the camera
    place("worker", 4.2 + 0.2 * Math.sin(t), 7.5 + t * 2.6, 0, { walk: t * 14, L: "raise", R: "raise", mouth: "o" });
    place("lady", 6.0, 6.6 + t * 2.4, 0.1, { walk: t * 13, L: "raise", R: "rest", mouth: "o" });
  }
  if (t >= 7.0 && t < 11.4) {
    // a mild winter lunch hour: people on the sidewalks, a man reading by the newsstand, kids
    place("gent", -2.0, 12.4, Math.PI * 0.15 + Math.PI, { R: "hold", mouth: "smile", pitch: 0.1 }, 0.12);
    place("lady", -8.5 + (t - 7) * 0.6, 12.9, Math.PI / 2, { walk: t * 6, mouth: "smile" }, 0.12);
    place("worker", 8.5, -1.2, -0.4, { L: "hold", R: "rest", mouth: "talk", yaw: 0.2 }, 0.12);
    place("kid", 9.6, -1.0, -1.2, { L: "point", R: "rest", mouth: "grin" }, 0.12);
    place("newsboy", -4.4, 12.9, Math.PI, { R: "wave", mouth: "talk" }, 0.12);
    if (t > 10.2) { C.worker.root.rotation.y = Math.PI; act(C.worker, t, { mouth: "o", pitch: -0.4 }); C.kid.root.rotation.y = Math.PI; act(C.kid, t, { mouth: "o", pitch: -0.4 }); }
  }
  if (t >= 25.9 && t < 29.6) {
    place("newsboy", -6.05, 13.55, Math.PI, { L: "hold", R: "hold", mouth: "flat", pitch: 0.05 }, 0.12);
    W.hold(C.newsboy, 1, W.props.paper); W.props.paper.rotation.set(0, Math.PI, 0);
    const hp = C.newsboy.hands[1].position; W.props.paper.position.set(hp.x - 0.12, hp.y - 0.05, hp.z + 0.06);
  }
  if (s.light === "night") {
    const wade = (t - 31.8);
    const r: [string, number, number, string][] = [["sailor1", -2.6 + wade * 0.18, 5.2, "l1"], ["sailor2", -0.9 + wade * 0.15, 6.4, "l2"], ["fire", 0.8 + wade * 0.12, 4.6, "l3"]];
    r.forEach(([k, x, z, l], i) => {
      place(k, x, z, Math.PI / 2 + 0.3 * (i - 1), { walk: t * 2.2 + i, R: "hold", L: i === 1 ? "point" : "rest", mouth: i === 2 ? "talk" : "flat", yaw: 0.4 });
      W.hold(C[k], 1, W.props[l]); W.lanternLights[i].intensity = 3.5;
      const p = W.puffs[i * 3 + (Math.floor(t * 1.2) % 3)];
      void p;
    });
    W.puffs.forEach((p, k) => {
      const who = C[["sailor1", "sailor2", "fire"][Math.floor(k / 3)]], ph = ((t * 0.8 + k * 0.33) % 1);
      const head = new THREE.Vector3(); who.head.getWorldPosition(head);
      p.visible = true; p.position.set(head.x + 0.3 + ph * 0.4, head.y - 0.1 + ph * 0.3, head.z + 0.1); p.scale.setScalar(0.15 + ph * 0.4); (p.material as THREE.SpriteMaterial).opacity = (1 - ph) * 0.6;
    });
  } else W.puffs.forEach((p) => (p.visible = false));
  if (s.light === "sepia") {
    place("lady", 4.4, -1.2, -2.6, { L: "point", R: "rest", mouth: "o", pitch: -0.45, yaw: 0.2 }, 0.12);
    place("gent", 5.4, -0.8, -2.8, { L: "hip", R: "point", mouth: "talk", pitch: -0.4 }, 0.12);
    if (t >= 38.2) {
      place("painter", -0.3, -4.4, Math.PI, { R: "raise", L: "rest", mouth: "smile", pitch: -0.3 }, 1.35 + 0.2 * Math.sin(t * 1.5));
      W.hold(C.painter, 1, W.props.brush);
      const hp = C.painter.hands[1].position; W.props.brush.position.set(hp.x + 0.05 * Math.sin(t * 9), hp.y + 0.04 * Math.sin(t * 9), hp.z);
    }
  }
  if (s.mode === "summer") {
    place("sum1", -4.6, 12.8, Math.PI + 0.3, { mouth: "grin", pitch: -0.35, L: "hip", R: "point" }, 0.12);
    place("sum2", -2.5, 13.0, Math.PI - 0.4, { mouth: "laugh", pitch: -0.3, L: "rest", R: "hold" }, 0.12);
    place("kid", -3.4, 12.2, Math.PI, { mouth: "grin", pitch: -0.4, L: "cheer", R: "cheer" }, 0.12);
  }
  if (s.mode === "today") {
    place("k1", 4.6, -19.5, Math.PI * 0.75, { L: "raise", R: "raise", mouth: "grin" }, 0.07);
    place("k2", 8.3, -24.6, -Math.PI * 0.25, { L: "hold", R: "hold", mouth: "talk" }, 0.07);
    place("k3", 1.5, -26.5, Math.PI * 0.3, { L: t > 54.3 ? "cheer" : "rest", R: t > 54.3 ? "cheer" : "rest", mouth: t > 54.3 ? "laugh" : "smile" }, 0.07);
    place("gent", -5.2, -2.6, Math.PI, { mouth: "smile", pitch: 0.3, L: "rest", R: "rest" }, 0.12);
  }
  // ---------------- court ----------------
  if (inCourt) {
    W.court.setYear(Math.min(1925, 1919 + Math.floor(Math.max(0, t - 41.8) / 0.2)));
    const g1 = 43.8, g2 = 44.08, hit = (a: number) => Math.max(0, 1 - Math.abs(t - a) / 0.12);
    W.court.gavel.rotation.x = -0.9 * Math.max(0, Math.min(1, (t - 43.4) / 0.3)) * (1 - Math.max(hit(g1), hit(g2)));
    act(C.judge, t, { L: "counter", R: t > 43.4 ? "raise" : "counter", mouth: t > 43.8 ? "talk" : "flat", pitch: 0.15 });
    act(C.lawyerA, t, { L: "rest", R: "rest", mouth: "flat", yaw: 0 }); act(C.lawyerB, t, { L: "rest", R: "rest", mouth: "smile" });
    W.court.setStamp(ss(46.15, 46.35, t));
    W.court.stamp.position.y = 0.94 + 0.25 * (t > 45.6 && t < 46.15 ? ss(45.6, 45.9, t) : t >= 46.15 ? 1 - ss(46.15, 46.25, t) + ss(46.5, 46.8, t) : 0);
    act(C.engineer, t, { L: "rest", R: "hold", mouth: t > 46.3 ? "grin" : "smile", pitch: 0.45 });
  }
  const c = camAt(s, t);
  let pos = c.pos, look = c.look;
  if (s.truck) { pos = N.truck.localToWorld(c.pos.clone()); look = N.truck.localToWorld(c.look.clone()); }
  if (inCourt) { pos = pos.clone().add(COURT); look = look.clone().add(COURT); }
  const sh = shake(t);
  cam.fov = c.fov; cam.near = 0.04; cam.far = 400; cam.position.copy(pos).add(V(sh, sh * 0.7, 0)); cam.lookAt(look); cam.updateProjectionMatrix();
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
const show = (s: string) => (["BOSTON", "JANUARY"].includes(s) ? s[0] + s.slice(1).toLowerCase() : /^[0-9]/.test(s) ? s.replace("TH", "th").replace("MILLION", "million").replace("FOOT", "foot") : s.toLowerCase());
const Captions: React.FC<{ t: number }> = ({ t }) => {
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) { const w = LIST[i], n = LIST[i + 1]; if (t >= w.start - 0.03 && t < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  return (
    <>
      {cur && (
        <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", transform: `scale(${0.9 + 0.1 * Math.min(1, (t - cur.start) / 0.08)})` }}>
          <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 66, color: "#ffffff", WebkitTextStroke: "9px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{show(cur.text)}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 30, left: 45, right: 45, textAlign: "center", fontFamily: "Inter, Arial, sans-serif", fontWeight: 400, fontSize: 19, lineHeight: 1.35, color: "rgba(255,255,255,0.78)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Cartoon recreation · figures: Britannica, NPR, Boston.gov, History.com · cold &amp; thickness: Sharp, Kennedy &amp; Rubinstein (APS 2016)
      </div>
    </>
  );
};
export const MolShort: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  const s = shotAt(f / 30);
  return (
    <AbsoluteFill style={{ background: "#20242a" }}>
      <AbsoluteFill style={{ filter: s.grade }}>
        <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.04, far: 400 }}>
          <Inner />
        </ThreeCanvas>
      </AbsoluteFill>
      <Captions t={f / 30} />
      <Audio src={staticFile("mol/mix.wav")} />
    </AbsoluteFill>
  );
};
void NEWS; void THERMO; void MP;
