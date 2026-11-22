// Look test (5 s): the Part 5 moment "So Tony added a medium soda. Small $2, medium $3.50, large $4" rebuilt in the
// detailed style: PBR materials + image-based lighting, soft shadows, real floor reflections, ambient occlusion (N8AO),
// bloom on emissive screens, ACES tone mapping, depth of field, a dressed set, costumed 3D characters with ink
// outlines, the prices on an in-world menu screen, a slow wide-lens push-in, and small lower-third captions.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, DepthOfFieldEffect, VignetteEffect } from "postprocessing";
import { N8AOPostPass } from "n8ao";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TonySet, ROOM } from "./set";
import { Toon, Pose, Mouth } from "./char";
import WORDS from "../dec/words.json";

export const LOOK_FRAMES = 150;
const T0 = 41.5; // Part 5 time where this shot starts
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const lerpV = (a: THREE.Vector3, b: THREE.Vector3, u: number) => a.clone().lerp(b, u);

const TONY = { skin: "#f1c7a2", shirt: "#f7f5f0", cap: "#1f8a4a", capLogo: "#d8262e", hair: "#3a2416", bodyR: 0.23, bodyLen: 0.2, headR: 0.31, legLen: 0.74, apron: "#1f8a4a", tag: "TONY", pen: true };
const MAX = { skin: "#f3cba8", shirt: "#1aa3a6", cap: "#ffc928", capLogo: "#2b5fb4", hair: "#6b4226", bodyR: 0.16, bodyLen: 0.24, headR: 0.25, legLen: 0.5, backpack: "#3a59a8", shorts: "#2a3554" };

const Inner: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / 30, tt = T0 + t;
  const { gl, scene, camera, size } = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const world = useMemo(() => {
    gl.toneMapping = THREE.NoToneMapping; gl.toneMappingExposure = 1.0;
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap;
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.45;
    scene.background = new THREE.Color("#20242a");
    const set = new TonySet();
    scene.add(set.root);
    // lights: warm key with soft shadows, cool window fill, hemisphere bounce, pendant spots, heat-lamp + screen glow
    const hemi = new THREE.HemisphereLight("#e6eeff", "#6a5848", 0.6); scene.add(hemi);
    const key = new THREE.DirectionalLight("#fff0da", 3.0); key.position.set(2.2, 4.6, 3.6); key.target.position.set(0, 1.0, -0.6);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: 0.5, far: 12 }); key.shadow.radius = 3;
    scene.add(key, key.target);
    const fill = new THREE.DirectionalLight("#cfe2ff", 0.9); fill.position.set(-5, 2.2, 1.6); scene.add(fill);
    const front = new THREE.DirectionalLight("#fff6ea", 0.9); front.position.set(0.4, 1.8, 6); front.target.position.set(0, 1.4, -1); scene.add(front, front.target);
    for (const x of [-1.2, 0, 1.2]) {
      const s = new THREE.SpotLight("#ffd9a8", 9, 5.5, 0.75, 0.7, 2); s.position.set(x, ROOM.h - 0.8, 0.05); s.target.position.set(x, 0, 0.1);
      if (x === 0) { s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -0.0006; }
      scene.add(s, s.target);
    }
    const heat = new THREE.PointLight("#ff8a3a", 1.6, 1.4, 2); heat.position.set(0.75, 1.3, ROOM.z0 + 0.34); scene.add(heat);
    const scr = new THREE.PointLight("#8fb8ff", 1.0, 3.0, 2); scr.position.set(0, 1.95, ROOM.z0 + 1.1); scene.add(scr);
    const tony = new Toon(set.root, TONY, 0.22, -0.78, 0);
    const max = new Toon(set.root, MAX, -0.4, 1.0, Math.PI - 0.3);
    return { set, tony, max };
  }, [gl, scene]);
  const fx = useMemo(() => {
    const P = ((getInputProps() as { post?: Record<string, boolean> }).post ?? {}) as Record<string, boolean>;
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    composer.addPass(new RenderPass(scene, cam));
    const ao = new N8AOPostPass(scene, cam, size.width, size.height);
    Object.assign(ao.configuration, { aoRadius: 0.4, distanceFalloff: 1.0, intensity: 2.4, halfRes: true, aoSamples: 16, denoiseSamples: 8, denoiseRadius: 12, gammaCorrection: false });
    if (P.ao !== false) composer.addPass(ao);
    const dof = new DepthOfFieldEffect(cam, { worldFocusDistance: 2.8, worldFocusRange: 1.6, bokehScale: 2.6, height: 960 });
    dof.target = new THREE.Vector3();
    if (P.dof === true) composer.addPass(new EffectPass(cam, dof)); // off: with bloom it veils the frame and hides the ink
    const bloom = new BloomEffect({ intensity: 0.7, luminanceThreshold: 1.6, luminanceSmoothing: 0.3, mipmapBlur: true, radius: 0.65 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const vig = new VignetteEffect({ darkness: 0.42, offset: 0.32 });
    composer.addPass(P.bloom === false ? new EffectPass(cam, tone, vig) : new EffectPass(cam, bloom, tone, vig));
    composer.setSize(size.width, size.height);
    return { composer, dof };
  }, [gl, scene, cam, size.width, size.height]);
  useEffect(() => () => fx.composer.dispose(), [fx]);

  // ---- timeline ----
  const hi = tt < 43.55 ? -1 : tt < 43.98 ? 0 : tt < 45.35 ? 1 : 2;
  const pulse = tt > 42.5 && tt < 43.5 ? Math.abs(Math.sin((tt - 42.5) * Math.PI * 3)) : 0;
  world.set.update(t, hi, pulse);
  const blinkAt = (ts: number[]) => ts.reduce((b, x) => Math.max(b, 1 - Math.min(1, Math.abs(t - x) / 0.07)), 0);
  const bobT = Math.sin(t * 2.4) * 0.006;
  // Tony: palm toward the medium cup, then a thumb up at the screen behind him, looking back at it
  const look = ss(2.0, 2.5, t) * (1 - ss(3.9, 4.3, t));
  const tonyMouth: Mouth = t < 0.5 ? "smile" : t < 2.0 ? "grin" : look > 0.5 ? "talk" : t > 4.3 ? "grin" : "smile";
  const offer = ss(0.3, 0.8, t) * (1 - ss(2.0, 2.4, t));
  const point = ss(2.0, 2.45, t) * (1 - ss(4.2, 4.6, t));
  const armL = [lerpV(V(-0.38, 1.15, 0.2), V(-0.46, 1.22, 0.4), offer), lerpV(V(-0.32, 1.03, 0.5), V(-0.5, 1.22, 0.8), offer)];
  const armR = [lerpV(V(0.38, 1.08, 0.18), V(0.42, 1.6, 0.05), point), lerpV(V(0.3, 1.03, 0.46), V(0.46, 1.98, -0.12), point)];
  const tp: Pose = { blink: blinkAt([1.25, 3.55]), mouth: tonyMouth, brow: 0.4 + 0.6 * offer, headYaw: 0.08 - 0.55 * look, headPitch: 0.02 - 0.22 * look, armL, armR, bob: bobT };
  world.tony.pose(tp);
  // Max: looks up at the menu while the prices are read, one hand on his strap, the other pointing at the screen
  const up = ss(1.8, 2.4, t);
  const mp: Pose = { blink: blinkAt([0.8, 2.9, 4.6]), mouth: up > 0.5 ? "o" : "smile", brow: up, headYaw: 0.1 * Math.sin(t * 0.8), headPitch: -0.12 - 0.22 * up,
    armL: [V(-0.24, 0.72, 0.06), V(-0.22, 0.55, 0.06)], armR: [lerpV(V(0.25, 0.75, 0.05), V(0.28, 0.95, 0.2), ss(2.6, 3.1, t)), lerpV(V(0.23, 0.55, 0.06), V(0.3, 1.25, 0.38), ss(2.6, 3.1, t))], bob: Math.sin(t * 2.1 + 1) * 0.005 };
  world.max.pose(mp);
  // camera: over Max's shoulder, slow push-in that tilts up to the menu as the prices are read; tiny handheld drift
  const u = ss(0, 5, t), up2 = ss(1.6, 3.2, t);
  const pos = lerpV(V(0.05, 1.72, 3.15), V(0.12, 1.74, 2.45), u).add(V(Math.sin(t * 1.7) * 0.006, Math.sin(t * 2.3) * 0.005, 0));
  const tgt = lerpV(V(0.12, 1.3, -0.8), V(0.12, 1.85, -1.6), up2);
  cam.fov = 50; cam.near = 0.05; cam.far = 30; cam.position.copy(pos); cam.lookAt(tgt); cam.updateProjectionMatrix();
  // focus: Tony's face, easing toward the menu screen while it is being read
  const tonyHead = new THREE.Vector3(); world.tony.head.getWorldPosition(tonyHead);
  fx.dof.target!.copy(lerpV(tonyHead, V(0, 2.4, ROOM.z0 + 0.1), 0.55 * up2));

  useFrame(() => { fx.composer.render(); }, 1);
  return null;
};

const useFonts = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [new FontFace("Anton", `url(${staticFile("fonts/anton-latin-400-normal.woff2")})`),
      new FontFace("Inter", `url(${staticFile("fonts/inter-latin-800-normal.woff2")})`, { weight: "800" })];
    Promise.all(faces.map((x) => x.load())).then((fs) => { fs.forEach((x) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(x)); setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};

type Word = { start: number; end: number; text: string };
const LIST = (WORDS as Word[]).filter((w) => w.start >= T0 - 0.2 && w.start < T0 + 5);
const show = (s: string) => (s === "TONY" ? "Tony" : s.toLowerCase());
const Captions: React.FC<{ t: number }> = ({ t }) => {
  const tt = T0 + t;
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) { const w = LIST[i], n = LIST[i + 1]; if (tt >= w.start - 0.03 && tt < (n ? Math.min(n.start, w.end + 0.45) : w.end + 0.6)) { cur = w; break; } }
  if (!cur) return null;
  const age = tt - cur.start, s = 0.9 + 0.1 * Math.min(1, age / 0.08);
  return (
    <div style={{ position: "absolute", top: 1330, left: 0, right: 0, textAlign: "center", transform: `scale(${s})` }}>
      <span style={{ fontFamily: "Inter, Arial, sans-serif", fontWeight: 800, fontSize: 66, color: "#ffffff", WebkitTextStroke: "9px #0d0b10", paintOrder: "stroke fill", textShadow: "0 4px 10px rgba(0,0,0,0.55)" }}>{show(cur.text)}</span>
    </div>
  );
};

export const LookTest: React.FC = () => {
  const f = useCurrentFrame();
  const fonts = useFonts();
  if (!fonts) return null;
  return (
    <AbsoluteFill style={{ background: "#20242a" }}>
      <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance" }} camera={{ fov: 50, near: 0.05, far: 30 }}>
        <Inner />
      </ThreeCanvas>
      <Captions t={f / 30} />
      <Audio src={staticFile("look/part5_41.5.wav")} />
    </AbsoluteFill>
  );
};
