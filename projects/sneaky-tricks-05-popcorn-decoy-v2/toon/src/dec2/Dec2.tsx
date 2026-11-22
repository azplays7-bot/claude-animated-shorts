// "Sneaky Business Tricks #5: the medium popcorn decoy", rebuilt in the detailed style (look test approved).
// Two locations in one scene: the street (day, and golden hour for the ending) and Tony's place (counter + dining room
// with the TV), placed 200 m apart and shown one at a time. Every fact is on something in the world: the popcorn
// board (rows, stickers, the DECOY stamp), the TV (the classroom magazine test), the menu screen and register, and
// Tony's LED sign. Post: N8AO ambient occlusion -> bloom (emissives only) + ACES + vignette, MSAA 4.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TonySet, ROOM } from "../look/set";
import { Toon, Mouth, ArmName, armMix, CharSpec } from "../look/char";
import { MP, canvas, cyl, put, grp, text } from "../look/kit";
import { Street, STAND, BOARD, PATIO, LED_POS, TONY_DOOR_X } from "./street";
import { tvTex, TvState } from "./tv";
import WORDS from "../dec/words.json";

export const DEC2_FRAMES = 1800;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const OFF = V(200, 0, 0); // Tony's place sits 200 m down the x axis

// ---------------- cast ----------------
const TONY: CharSpec = { skin: "#f1c7a2", shirt: "#f7f5f0", cap: "#1f8a4a", capLogo: "#d8262e", hair: "#3a2416", bodyR: 0.23, bodyLen: 0.2, headR: 0.31, legLen: 0.74, apron: "#1f8a4a", tag: "TONY", pen: true };
const MAX: CharSpec = { skin: "#f3cba8", shirt: "#1aa3a6", cap: "#ffc928", capLogo: "#2b5fb4", hair: "#6b4226", bodyR: 0.16, bodyLen: 0.24, headR: 0.25, legLen: 0.5, backpack: "#3a59a8", shorts: "#2a3554" };
const SELLER: CharSpec = { skin: "#e8b58f", shirt: "#ffffff", stripes: "#d8262e", cap: "#fff", capLogo: "#d8262e", hat: "paper", hair: "#2a1a12", bodyR: 0.22, bodyLen: 0.24, headR: 0.29, legLen: 0.66 };
const LILA: CharSpec = { skin: "#c98c64", shirt: "#7a4fb0", cap: "#000", capLogo: "#000", hat: "none", hairStyle: "bun", hair: "#2a1a12", bodyR: 0.16, bodyLen: 0.24, headR: 0.25, legLen: 0.5, scarf: "#ff7aa8", shorts: "#3a2a5a" };
const GUS: CharSpec = { skin: "#f3d1b0", shirt: "#e08a18", cap: "#000", capLogo: "#000", hat: "none", hairStyle: "top", hair: "#b5651d", glasses: "#1b1b22", bodyR: 0.16, bodyLen: 0.24, headR: 0.25, legLen: 0.52, logo: "G", shorts: "#2a3554" };
const RAY: CharSpec = { skin: "#8d5a3b", shirt: "#1f9a4a", cap: "#d8262e", capLogo: "#ffffff", hair: "#111111", bodyR: 0.17, bodyLen: 0.26, headR: 0.26, legLen: 0.55, shorts: "#24282e" };

// ---------------- props ----------------
const stripeT = () => canvas(256, 256, (g) => { for (let x = 0; x < 256; x += 32) { g.fillStyle = (x / 32) % 2 ? "#ffffff" : "#d8262e"; g.fillRect(x, 0, 32, 256); } });
const bucket = (big: boolean) => {
  const b = new THREE.Group(), r0 = big ? 0.1 : 0.065, h = big ? 0.24 : 0.14;
  put(b, cyl(r0, r0 * 0.75, h, 20, true), MP("#ffffff", 0.5, { map: stripeT(), side: THREE.DoubleSide }), 0, h / 2 - 0.02, 0);
  for (let k = 0; k < (big ? 16 : 9); k++) put(b, new THREE.IcosahedronGeometry(0.032, 0), MP("#fff4cc", 0.7), Math.cos(k * 2.3) * r0 * 0.6, h - 0.01 + (k % 3) * 0.018, Math.sin(k * 2.3) * r0 * 0.6);
  return b;
};
const cupT = () => canvas(256, 256, (g) => { g.fillStyle = "#fbfaf6"; g.fillRect(0, 0, 256, 256); g.fillStyle = "#d8262e"; g.fillRect(0, 90, 256, 80); for (const x of [32, 96, 160, 224]) text(g, "TONY'S", x, 132, 26, "#fff"); });
const cupProp = (r0: number, h: number) => {
  const c = new THREE.Group();
  put(c, cyl(r0, r0 * 0.72, h, 24), MP("#ffffff", 0.4, { map: cupT() }), 0, h / 2 - 0.03, 0);
  put(c, cyl(r0 * 1.04, r0 * 1.04, 0.015, 24), MP("#f2f2f2", 0.25), 0, h - 0.023, 0);
  put(c, cyl(0.006, 0.006, 0.18, 8), MP("#d8262e", 0.3), 0.01, h + 0.05, 0, { rz: 0.15 });
  return c;
};
const qTex = () => canvas(256, 256, (g) => { g.fillStyle = "#ffc928"; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill(); g.strokeStyle = "#1b1b22"; g.lineWidth = 12; g.stroke(); text(g, "?", 128, 140, 190, "#1b1b22"); });

// ---------------- shots + cameras ----------------
type Place = "street" | "store" | "golden";
type Cam = [number, THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3, number, number, number?];
const SHOTS: { a: number; b: number; place: Place; cams: Cam[] }[] = [
  { a: 0, b: 7.05, place: "street", cams: [
    [0.0, V(3.6, 1.75, 9.2), V(-1.4, 1.9, 1.4), V(2.9, 1.65, 8.0), V(-1.2, 1.7, 1.6), 50, 48],          // the cinema + popcorn stand, Max walks up
    [2.75, V(-3.7, 1.45, 5.0), V(-0.2, 1.25, 3.0), V(-3.5, 1.45, 4.7), V(-0.2, 1.25, 3.0), 46, 44, 1],   // most people pick the small
    [4.35, V(0.05, 1.42, 4.6), V(-0.75, 1.22, 2.7), V(-0.1, 1.38, 4.15), V(-0.75, 1.22, 2.7), 46, 44, 1], // + a medium for $8
  ] },
  { a: 7.05, b: 13.95, place: "street", cams: [
    [7.05, V(-0.05, 1.35, 4.0), V(-0.75, 1.15, 2.7), V(-0.15, 1.35, 3.8), V(-0.75, 1.15, 2.7), 44, 42, 1], // the large: a steal
    [9.3, V(-2.9, 1.35, 4.9), V(-0.1, 1.3, 3.0), V(-2.7, 1.35, 4.6), V(-0.1, 1.3, 3.0), 46, 44, 1],      // only $1 more!
    [10.85, V(4.4, 1.8, 7.2), V(-1.4, 1.4, 2.0), V(4.1, 1.75, 6.8), V(-1.4, 1.4, 2.0), 48, 47],          // isn't really there to be bought
    [12.85, V(-0.2, 1.3, 3.75), V(-0.75, 1.2, 2.7), V(-0.25, 1.3, 3.6), V(-0.75, 1.2, 2.7), 42, 40, 1],  // DECOY
  ] },
  { a: 13.95, b: 34.0, place: "store", cams: [
    [13.95, V(2.7, 2.25, 4.4), V(-2.4, 1.45, 1.6), V(2.35, 2.15, 3.9), V(-2.4, 1.45, 1.6), 54, 52],       // a famous classroom test
    [15.75, V(1.05, 1.5, 1.9), V(-3.1, 1.72, 1.9), V(0.65, 1.5, 1.9), V(-3.1, 1.72, 1.9), 50, 50],        // web only or print + web
    [19.95, V(-1.05, 1.85, 2.3), V(-3.1, 1.85, 2.3), V(-1.15, 1.85, 2.3), V(-3.1, 1.85, 2.3), 44, 44, 1],  // web only: $60
    [21.9, V(-1.05, 1.85, 1.6), V(-3.1, 1.85, 1.6), V(-1.15, 1.85, 1.6), V(-3.1, 1.85, 1.6), 44, 44, 1],   // print + web: $125
    [23.85, V(0.95, 1.5, 1.9), V(-3.1, 1.65, 1.9), V(0.75, 1.5, 1.9), V(-3.1, 1.65, 1.9), 50, 50],        // most picked the cheaper web deal
    [25.65, V(0.7, 1.55, 1.9), V(-3.1, 1.75, 1.9), V(0.3, 1.55, 1.9), V(-3.1, 1.75, 1.9), 50, 50],        // + a silly print-only option
    [30.4, V(-1.45, 1.85, 1.9), V(-3.1, 1.85, 1.9), V(-1.6, 1.85, 1.9), V(-3.1, 1.85, 1.9), 44, 42, 1],    // nobody chose it
    [31.3, V(0.95, 1.5, 1.9), V(-3.1, 1.6, 1.9), V(0.75, 1.5, 1.9), V(-3.1, 1.6, 1.9), 50, 50, 1],        // now most picked print + web
    [32.6, V(1.3, 1.45, 2.1), V(-1.3, 1.35, 2.1), V(1.0, 1.45, 2.1), V(-1.3, 1.4, 2.1), 52, 50],          // the students turn and cheer
  ] },
  { a: 34.0, b: 41.5, place: "store", cams: [
    [34.0, V(0.6, 1.55, 1.9), V(-3.1, 1.75, 1.9), V(0.3, 1.55, 1.9), V(-3.1, 1.75, 1.9), 50, 50],         // a small classroom test
    [35.95, V(0.3, 1.55, 1.9), V(-3.1, 1.75, 1.9), V(0.0, 1.55, 1.9), V(-3.1, 1.75, 1.9), 50, 50, 1],     // decoys don't always work
    [37.3, V(-2.95, 1.32, 1.45), V(-1.6, 1.2, 1.35), V(-2.9, 1.32, 1.42), V(-1.6, 1.2, 1.35), 50, 48, 1],  // Max: dazed
    [38.7, V(-0.85, 1.85, 1.9), V(-3.1, 1.85, 1.9), V(-1.05, 1.85, 1.9), V(-3.1, 1.85, 1.9), 46, 46],      // just an example
  ] },
  { a: 41.5, b: 48.2, place: "store", cams: [
    [41.5, V(0.05, 1.72, 3.15), V(0.12, 1.3, -0.8), V(0.12, 1.74, 2.45), V(0.12, 1.85, -1.6), 50, 50],    // Tony added a medium soda (look test)
    [46.45, V(2.55, 1.6, 2.9), V(-0.3, 1.3, 1.0), V(2.35, 1.6, 2.6), V(-0.3, 1.3, 1.0), 50, 48, 1],       // everybody ordered... large
  ] },
  { a: 48.2, b: 60.0, place: "golden", cams: [
    [48.2, V(5.8, 1.5, 6.4), V(5.8, 1.75, 1.4), V(5.8, 1.5, 5.6), V(5.8, 1.75, 1.4), 50, 50],             // that's the end of part five
    [50.1, V(5.75, 1.35, 5.4), V(5.75, 2.4, 0.6), V(5.75, 1.4, 5.0), V(5.75, 2.9, 0.4), 50, 50],          // follow for more
    [52.3, V(9.7, 1.4, 4.7), V(7.95, 0.95, 2.3), V(9.4, 1.35, 4.4), V(7.95, 0.95, 2.3), 46, 44, 1],        // three sizes
    [54.0, V(7.2, 1.38, 4.9), V(7.2, 1.3, 2.95), V(7.2, 1.36, 4.6), V(7.2, 1.3, 2.95), 46, 44, 1],       // which one do they want me to buy?
    [56.3, V(5.8, 1.8, 6.6), V(5.8, 2.3, 1.0), V(5.8, 6.2, 16.0), V(5.8, 2.6, 0.0), 50, 54],              // follow
  ] },
];
const shotAt = (t: number) => SHOTS.find((s) => t >= s.a && t < s.b) ?? SHOTS[SHOTS.length - 1];
const camAt = (t: number) => {
  const s = shotAt(t);
  let i = 0; while (i + 1 < s.cams.length && t >= s.cams[i + 1][0]) i++;
  const c = s.cams[i], end = i + 1 < s.cams.length ? s.cams[i + 1][0] : s.b;
  const u = Math.min(1, Math.max(0, (t - c[0]) / (end - c[0])));
  const k = c[7] === 1 ? 1 - Math.pow(1 - Math.min(1, u * 1.1), 3) : u * u * (3 - 2 * u) * 0.85 + u * 0.15;
  const off = s.place === "store" ? OFF : V(0, 0, 0);
  return { pos: c[1].clone().lerp(c[3], k).add(off), look: c[2].clone().lerp(c[4], k).add(off), fov: c[5] + (c[6] - c[5]) * k, place: s.place };
};
// small camera shakes on the big beats
const SHAKES = [6.0, 8.84, 13.2, 31.54];
const shake = (t: number) => { for (const a of SHAKES) if (t >= a && t < a + 0.5) return 0.03 * Math.sin(t * 70) * (1 - (t - a) / 0.5); return 0; };

// ---------------- the world ----------------
class World {
  street = new Street(); store = new TonySet(); storeRoot = new THREE.Group();
  st: Record<string, Toon> = {}; in: Record<string, Toon> = {};
  props: Record<string, THREE.Object3D> = {};
  q: THREE.Sprite; tvCache = new Map<string, THREE.Texture>(); light = "";
  constructor(scene: THREE.Scene) {
    scene.add(this.street.root);
    this.storeRoot.position.copy(OFF); this.storeRoot.add(this.store.root); scene.add(this.storeRoot);
    // store lights (as in the look test)
    const L = this.storeRoot;
    L.add(new THREE.HemisphereLight("#e6eeff", "#6a5848", 0.6));
    const key = new THREE.DirectionalLight("#fff0da", 3.0); key.position.set(2.2, 4.6, 3.6); key.target.position.set(0, 1.0, -0.6);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -4.2, right: 4.2, top: 4.2, bottom: -4.2, near: 0.5, far: 14 });
    L.add(key, key.target);
    const fill = new THREE.DirectionalLight("#cfe2ff", 0.9); fill.position.set(5, 2.2, 1.6); L.add(fill);
    const front = new THREE.DirectionalLight("#fff6ea", 0.9); front.position.set(0.4, 1.8, 6); front.target.position.set(0, 1.4, -1); L.add(front, front.target);
    const tvFill = new THREE.DirectionalLight("#dfe8ff", 0.7); tvFill.position.set(-2.6, 2.0, 1.9); tvFill.target.position.set(0, 1.2, 2); L.add(tvFill, tvFill.target);
    for (const x of [-1.2, 0, 1.2]) {
      const s = new THREE.SpotLight("#ffd9a8", 9, 5.5, 0.75, 0.7, 2); s.position.set(x, ROOM.h - 0.8, 0.05); s.target.position.set(x, 0, 0.1);
      if (x === 0) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0006; }
      L.add(s, s.target);
    }
    const heat = new THREE.PointLight("#ff8a3a", 1.6, 1.4, 2); heat.position.set(0.75, 1.3, ROOM.z0 + 0.34); L.add(heat);
    const scr = new THREE.PointLight("#8fb8ff", 1.0, 3.0, 2); scr.position.set(0, 1.95, ROOM.z0 + 1.1); L.add(scr);
    const tvGlow = new THREE.PointLight("#9fc0ff", 1.4, 3.5, 2); tvGlow.position.set(-2.4, 1.8, 1.9); L.add(tvGlow);
    // cast: street (seller, Max, Tony for the ending) + store (Tony, Max, Lila, Gus, Ray)
    const S = this.street.root, I = this.store.root;
    this.st.seller = new Toon(S, SELLER, STAND.x, STAND.z - 0.75, 0);
    this.st.max = new Toon(S, MAX, 0, 3.3, Math.PI);
    this.st.tony = new Toon(S, TONY, TONY_DOOR_X - 0.65, 1.75, 0.15);
    this.in.tony = new Toon(I, TONY, 0.22, -0.78, 0);
    this.in.max = new Toon(I, MAX, -1.6, 1.35, -1.23);
    this.in.lila = new Toon(I, LILA, -1.5, 2.45, -1.89);
    this.in.gus = new Toon(I, GUS, -0.75, 2.9, -1.96);
    this.in.ray = new Toon(I, RAY, -0.2, 3.3, Math.PI);
    // props
    this.props.small = bucket(false); this.props.big = bucket(true);
    this.props.cupM = cupProp(0.072, 0.2);
    for (const k of ["c1", "c2", "c3", "c4"]) this.props[k] = cupProp(0.085, 0.26);
    // three cups on the patio table for the ending
    const tbl = grp(S, PATIO.x, 0.78, PATIO.z);
    ([[-0.2, 0.06, 0.15], [0.0, 0.072, 0.2], [0.22, 0.085, 0.26]] as const).forEach(([x, r0, h]) => { const c = cupProp(r0, h); c.position.set(x, 0.03, 0.05); tbl.add(c); });
    this.q = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex(), transparent: true, depthWrite: false }));
    this.q.visible = false; S.add(this.q);
  }
  hold(c: Toon, k: number, obj: THREE.Object3D | null) {
    const cur = c.held[k];
    if (cur === obj) return;
    if (cur) cur.parent?.remove(cur);
    c.held[k] = obj;
    if (obj) c.root.add(obj);
  }
  tv(s: TvState) {
    const key = JSON.stringify(s, (_k, v) => (typeof v === "number" ? +v.toFixed(2) : v));
    if (!this.tvCache.has(key)) { if (this.tvCache.size > 60) this.tvCache.clear(); this.tvCache.set(key, tvTex(s)); }
    this.store.tv.emissiveMap = this.tvCache.get(key)!;
  }
}

/** one character's pose for this frame */
type Act = { L?: ArmName; R?: ArmName; L2?: ArmName; R2?: ArmName; u?: number; mouth?: Mouth; blink?: number[]; yaw?: number; pitch?: number; walk?: number; brow?: number };
const act = (c: Toon, t: number, a: Act) => {
  const u = a.u ?? 0;
  const blink = (a.blink ?? [1.1, 3.7]).reduce((b, x) => { const d = Math.abs(((t - x) % 4.3 + 4.3) % 4.3); return Math.max(b, 1 - Math.min(1, Math.min(d, 4.3 - d) / 0.07)); }, 0);
  c.pose({
    blink, mouth: a.mouth ?? "smile", brow: a.brow ?? 0.3, headYaw: a.yaw ?? 0, headPitch: a.pitch ?? 0,
    armL: armMix(c, a.L ?? "rest", a.L2 ?? a.L ?? "rest", u, -1, t), armR: armMix(c, a.R ?? "rest", a.R2 ?? a.R ?? "rest", u, 1, t),
    bob: Math.sin(t * 2.4 + c.spec.headR * 40) * 0.006 + (a.walk !== undefined ? Math.abs(Math.sin(a.walk)) * 0.02 : 0), walk: a.walk,
  });
};

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30;
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const W = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    scene.background = new THREE.Color("#20242a");
    return new World(scene);
  }, [gl, scene]);
  const fx = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.4, distanceFalloff: 1.0, intensity: 2.4, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    composer.addPass(ao);
    const bloom = new BloomEffect({ intensity: 0.7, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 });
    composer.addPass(new EffectPass(cam, bloom, new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }), new VignetteEffect({ darkness: 0.42, offset: 0.32 })));
    composer.setSize(size.width, size.height);
    return { composer, ao };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  const c = camAt(t);
  const onStreet = c.place !== "store";
  W.street.root.visible = onStreet; W.storeRoot.visible = !onStreet;
  if (onStreet && W.light !== c.place) { W.light = c.place; W.street.setLight(c.place === "golden"); }
  fx.ao.configuration.aoRadius = onStreet ? 0.8 : 0.4;
  scene.environmentIntensity = c.place === "golden" ? 0.18 : 0.45;

  // ---------------- street, day: the popcorn stand ----------------
  const st = W.street, S = W.st, I = W.in;
  if (t < 13.95) {
    const med = ss(5.3, 5.8, t);
    const hi = t < 0.3 ? -1 : t < 2.15 ? 0 : t < 3.35 ? 2 : t < 5.3 ? 0 : t < 7.7 ? 1 : t < 11.0 ? 2 : 1;
    st.board.emissiveMap = st.boardState({ med, hi, steal: t >= 8.8, only1: t >= 9.6 && t < 11.0, notSale: t >= 11.7, decoy: ss(13.15, 13.35, t), example: false });
    // Max walks up to the stand, picks the small; later the large looks like a steal
    const walkU = ss(0.0, 2.2, t);
    S.max.root.position.set(1.9 - 1.95 * walkU, 0, 3.3);
    S.max.root.rotation.y = walkU < 1 ? -Math.PI / 2 - 0.15 * walkU : Math.PI - 0.55;
    const smallUp = t >= 3.9 && t < 9.45, bigUp = t >= 9.45;
    W.hold(S.max, 1, smallUp ? W.props.small : bigUp ? W.props.big : null);
    act(S.max, t, {
      walk: walkU > 0 && walkU < 1 ? t * 9 : undefined,
      L: t >= 3.35 && t < 3.9 ? "point" : "rest",
      R: smallUp ? "hold" : bigUp ? (t < 10.9 ? "raise" : "hold") : "rest",
      mouth: t < 7.7 ? "smile" : t < 11.0 ? "laugh" : "smile", pitch: walkU >= 1 ? -0.05 : 0, yaw: walkU >= 1 && t < 9.3 ? 0.35 : 0,
      blink: [1.6, 4.1, 6.5],
    });
    act(S.seller, t, {
      L: "counter", R: t >= 5.0 && t < 6.6 ? "point" : t >= 12.9 ? "hip" : "counter",
      mouth: t < 4.9 ? "smile" : "grin", yaw: t >= 5.0 && t < 6.6 ? 0.6 : 0.1,
      blink: t >= 13.2 ? [13.4] : [0.9, 3.3, 6.0, 9.1], brow: t >= 12.9 ? 0.9 : 0.3,
    });
    S.tony.root.visible = false;
  }
  // ---------------- store: magazine test, caveats, sodas ----------------
  if (t >= 13.95 && t < 48.2) {
    const three = ss(26.25, 26.8, t);
    let tv: TvState;
    if (t < 15.75) tv = { kind: "title" };
    else if (t < 25.65) tv = { kind: "mag", three: 0, hi: t < 17.5 ? -1 : t < 18.3 ? 0 : t < 19.9 ? 2 : t < 21.9 ? 0 : t < 23.85 ? 2 : -1, u: ss(23.9, 24.9, t), nobody: false };
    else if (t < 34.0) tv = { kind: "mag", three: Math.max(three, 0.001), hi: t < 26.25 ? -1 : t < 29.2 ? 1 : t < 30.4 ? 2 : t < 31.3 ? 1 : 2, u: ss(31.6, 32.6, t), nobody: t >= 30.5 };
    else if (t < 35.95) tv = { kind: "small" };
    else if (t < 38.7) tv = { kind: "dont" };
    else tv = { kind: "example" };
    W.tv(tv);
    const inS5 = t >= 41.5;
    const menuHi = t < 43.55 ? -1 : t < 43.98 ? 0 : t < 45.35 ? 1 : 2;
    W.store.update(t, inS5 ? (t >= 46.45 ? 2 : menuHi) : -1, t > 42.5 && t < 43.5 ? Math.abs(Math.sin((t - 42.5) * Math.PI * 3)) : 0);
    W.store.setPos(t >= 46.45 ? "4  LARGE SODA" : "1  MEDIUM SODA", t >= 46.45 ? "$16.00" : "$3.50");
    const students = [I.max, I.lila, I.gus];
    if (!inS5) {
      // students watching the TV
      const turn = ss(32.5, 32.9, t) * (1 - ss(33.9, 34.0, t));
      I.max.root.position.set(-1.6, 0, 1.35); I.max.root.rotation.y = -1.23 + turn * (1.23 + 1.35);
      I.lila.root.position.set(-1.5, 0, 2.45); I.lila.root.rotation.y = -1.89 + turn * (1.89 + 1.6);
      I.gus.root.position.set(-0.75, 0, 2.9); I.gus.root.rotation.y = -1.96 + turn * (1.96 + 1.9);
      I.ray.root.visible = false; I.lila.root.visible = true; I.gus.root.visible = true;
      const cheer = t >= 32.6 && t < 34.0, dazed = t >= 37.3 && t < 38.7;
      students.forEach((s, i) => {
        W.hold(s, 1, null);
        act(s, t + i * 0.7, {
          L: cheer ? "cheer" : "rest", R: cheer ? "cheer" : (i === 0 && t >= 23.9 && t < 25.6) || (i === 2 && t >= 31.6 && t < 32.6) ? "point" : i === 1 && t > 26.3 && t < 30.4 ? "hip" : "rest",
          mouth: dazed && i === 0 ? "dazed" : cheer ? "laugh" : t >= 30.5 && t < 31.3 ? "o" : "smile",
          pitch: -0.12, yaw: 0, blink: [0.8 + i, 2.9 + i],
        });
      });
      I.tony.root.visible = true;
      act(I.tony, t, { L: "counter", R: "counter", mouth: "smile", yaw: -0.4 });
    } else {
      // Tony's three sodas (the look test), then the line of large sodas
      I.ray.root.visible = t >= 46.45;
      const queue = t >= 46.45;
      if (!queue) {
        I.max.root.position.set(-0.4, 0, 1.0); I.max.root.rotation.y = Math.PI - 0.3;
        I.lila.root.visible = false; I.gus.root.visible = false;
        W.hold(I.max, 1, null);
        const up = ss(1.8, 2.4, t - 41.5);
        act(I.max, t, { L: "rest", R: t - 41.5 > 2.6 ? "point" : "rest", mouth: up > 0.5 ? "o" : "smile", pitch: -0.12 - 0.22 * up, brow: up });
      } else {
        I.lila.root.visible = true; I.gus.root.visible = true;
        const line: [Toon, number, number][] = [[I.max, -0.45, 0.9], [I.lila, -0.3, 1.65], [I.gus, -0.1, 2.4], [I.ray, 0.1, 3.15]];
        const drink = t >= 47.4;
        line.forEach(([s, x, z], i) => {
          s.root.position.set(x, 0, z); s.root.rotation.y = Math.PI - 0.5;
          W.hold(s, 1, drink ? W.props["c" + (i + 1)] : null);
          act(s, t + i * 0.4, { R: drink ? "raise" : "rest", L: drink ? "cheer" : "rest", mouth: drink ? "laugh" : "smile", yaw: 0.6, pitch: -0.05 });
        });
      }
      // Tony: palm toward the medium cup, then up at the menu screen (as in the look test)
      const tt = t - 41.5;
      const look = ss(2.0, 2.5, tt) * (1 - ss(3.9, 4.3, tt));
      const offer = ss(0.3, 0.8, tt) * (1 - ss(2.0, 2.4, tt));
      const point = ss(2.0, 2.45, tt) * (1 - ss(4.2, 4.6, tt));
      const lerpA = (a: THREE.Vector3[], b: THREE.Vector3[], u: number) => a.map((v, i) => v.clone().lerp(b[i], u));
      const tonyMouth: Mouth = t >= 47.08 ? "laugh" : tt < 0.5 ? "smile" : tt < 2.0 ? "grin" : look > 0.5 ? "talk" : "smile";
      I.tony.pose({
        blink: [1.25, 3.55].reduce((b, x) => Math.max(b, 1 - Math.min(1, Math.abs(tt - x) / 0.07)), 0), mouth: tonyMouth, brow: 0.4 + 0.6 * offer,
        headYaw: 0.08 - 0.55 * look, headPitch: 0.02 - 0.22 * look, bob: Math.sin(t * 2.4) * 0.006,
        armL: lerpA([V(-0.38, 1.15, 0.2), V(-0.32, 1.03, 0.5)], [V(-0.46, 1.22, 0.4), V(-0.5, 1.22, 0.8)], offer),
        armR: t >= 46.45 ? armMix(I.tony, "counter", "cheer", ss(47.1, 47.5, t), 1, t) : lerpA([V(0.38, 1.08, 0.18), V(0.3, 1.03, 0.46)], [V(0.42, 1.6, 0.05), V(0.46, 1.98, -0.12)], point),
      });
    }
  }
  // ---------------- golden hour at Tony's door ----------------
  if (t >= 48.2) {
    S.tony.root.visible = true;
    S.max.root.position.set(t < 52.3 ? TONY_DOOR_X + 0.55 : 7.15, 0, t < 52.3 ? 1.95 : 2.95);
    S.max.root.rotation.y = t < 52.3 ? -0.25 : t < 54.0 ? Math.PI - 0.2 : 0.05;
    W.hold(S.max, 1, null);
    S.tony.root.position.set(TONY_DOOR_X - 0.65, 0, 1.75); S.tony.root.rotation.y = 0.2;
    const msg = t < 50.1 ? "PART 5: THE END" : t < 56.3 ? "FOLLOW FOR MORE SNEAKY BUSINESS TRICKS" : "FOLLOW FOR MORE TRICKS!";
    st.led.emissiveMap = st.ledState(msg, msg.length > 30 ? Math.round((t - 50.1) * 15) / 15 : 0);
    const confused = t >= 54.0 && t < 56.3;
    act(S.tony, t, { L: t >= 50.1 && t < 52.3 ? "point" : "rest", R: t >= 56.3 ? "wave" : t >= 48.4 && t < 50.1 ? "wave" : "hip", mouth: t >= 56.3 ? "laugh" : "grin", yaw: 0.15, pitch: t >= 50.1 && t < 52.3 ? -0.3 : 0 });
    act(S.max, t, { L: confused ? "raise" : t >= 56.3 ? "cheer" : "rest", R: t >= 56.3 ? "cheer" : t >= 52.3 && t < 54 ? "point" : "rest", mouth: confused ? "dazed" : t >= 56.3 ? "laugh" : "smile", yaw: t < 52.3 ? -0.2 : 0, pitch: t >= 52.3 && t < 54 ? 0.25 : 0 });
    W.q.visible = t >= 54.1 && t < 56.3;
    const qs = 0.22 * ss(54.1, 54.3, t);
    W.q.position.set(7.15 + 0.3, 1.58 + 0.02 * Math.sin(t * 5), 3.1); W.q.scale.set(qs, qs, 1);
    st.setConfetti(t, 56.4, V(TONY_DOOR_X, 3.6, 1.0));
  } else { W.q.visible = false; st.setConfetti(t, 999, V(0, 0, 0)); }

  const sh = shake(t);
  cam.fov = c.fov; cam.near = 0.05; cam.far = 200; cam.position.copy(c.pos).add(V(sh, sh * 0.7, 0)); cam.lookAt(c.look); cam.updateProjectionMatrix();
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
const show = (s: string) => (s === "TONY" ? "Tony" : s === "PRINT-ONLY" ? "print-only" : s.toLowerCase());
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
        Made-up places · example prices · magazine test: Dan Ariely (MIT classroom, Economist offer) · decoy effects vary by study
      </div>
    </>
  );
};

export const Dec2Short: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#20242a" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.05, far: 200 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / 30} />
      <Audio src={staticFile("dec2/audio.wav")} />
    </AbsoluteFill>
  );
};
void BOARD; void LED_POS;
