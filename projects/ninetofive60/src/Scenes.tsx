// The six scenes of "The 9-5 Trap". Every beat is timed to the narration (timing.json via S/E and the chunk starts below).
// Lead: Maya, 28, mustard cardigan over a navy polo, work badge, hair puff (LOOKS.maya). No logos or brand names anywhere.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Person, Coins, Bill } from "./Actors";
import { Box, Glow, Label, Sign, Sky, Tree, useCamKeys, walkPose, V3 } from "./Kit";
import { COL, LOOKS, SCN, blink, clamp, easeOut, lerp, ramp, rng, smooth, pulse, backOut } from "./timeline";
import T from "../narration/timing.json";

const CH = (T.chunks as { start: number; end: number; text: string }[]);
const at = (needle: string) => CH.find((c) => c.text.includes(needle))!.start;
// ---- cut points (seconds), shared with Overlay.tsx and audio/make_audio.py (which reads the same chunk times)
export const C1_BUS = at("ALARM") + 0.75, C1_DESK = at("ALARM") + 1.3, C1_PAY = at("PAYDAY"), C1_FACE = at("So is the");
export const C2_CLOCK = at("By 1940");
export const C3_RENT = at("nearly HALF");
export const C4_BORROW = at("So many BORROW");
export const C5_GROW = at("$200 a month");
export const C6_EXIT = at("The 9-to-5 isn't");
export const FINAL_AT = at("ENTIRE LIFE");

const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={c} roughness={0.6} {...o} />;
const maya = LOOKS.maya;
const Floor: React.FC<{ c: string; s?: number; y?: number }> = ({ c, s = 40, y = 0 }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow><planeGeometry args={[s, s]} />{M(c, { roughness: 0.85 })}</mesh>
);
const Wall: React.FC<{ c: string; w: number; h: number } & JSX.IntrinsicElements["mesh"]> = ({ c, w, h, ...p }) => (
  <mesh {...p}><planeGeometry args={[w, h]} />{M(c, { roughness: 0.9 })}</mesh>
);
const Phone: React.FC<{ glow?: string } & JSX.IntrinsicElements["group"]> = ({ glow = "#7dd3fc", ...p }) => (
  <group {...p}>
    <Box s={[0.075, 0.155, 0.009]} c="#111318" o={{ roughness: 0.25, metalness: 0.4 }} />
    <mesh position={[0, 0, 0.005]}><planeGeometry args={[0.068, 0.145]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
  </group>
);
const WindowGlow: React.FC<{ w: number; h: number; top: string; bottom: string } & JSX.IntrinsicElements["mesh"]> = ({ w, h, top, bottom, ...p }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } }, toneMapped: false,
    vertexShader: "varying vec2 v; void main(){ v = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec2 v; void main(){ gl_FragColor = vec4(mix(b, a, v.y), 1.0); }" }), [top, bottom]);
  return <mesh {...p} material={mat}><planeGeometry args={[w, h]} /></mesh>;
};

// =========================================================================== 1. the loop (alarm, bus, desk, payday, the question)
export const LoopScene: React.FC<{ t: number }> = ({ t }) =>
  t < C1_BUS ? <Bedroom key="a" t={t} /> : t < C1_DESK ? <Bus key="b" t={t} /> : t < C1_PAY ? <Desk key="c" t={t} /> : t < C1_FACE ? <Payday key="d" t={t} /> : <Question key="e" t={t} />;

const Bedroom: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[0, [0.8, 1.5, 3.8], [-0.1, 1.2, 0], 40], [C1_BUS, [0.55, 1.45, 3.2], [-0.1, 1.22, 0], 40]]);
  const ring = Math.sin(t * 40) * 0.03 * (t < 0.6 ? 1 : 0);
  return (
    <group>
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.12} color="#5b6b9a" />
      <pointLight position={[0.75, 0.75, 0.25]} intensity={1.6} distance={2.5} color="#7dd3fc" />
      <directionalLight position={[-2, 2.5, 1]} intensity={0.35} color="#7f93d6" />
      <Floor c="#2a2430" />
      <Wall c="#1e2236" w={8} h={4} position={[0, 2, -0.8]} />
      <WindowGlow w={0.9} h={1.1} top="#1c2a5a" bottom="#3b4f8a" position={[-0.8, 1.5, -0.79]} />
      <Box s={[2.1, 0.45, 1.6]} c="#30364f" position={[-0.6, 0.22, 0.1]} />
      <Box s={[2.0, 0.12, 1.5]} c="#c8cfe0" position={[-0.6, 0.5, 0.1]} />
      <Box s={[1.4, 0.16, 1.45]} c="#3d4a7a" position={[-0.3, 0.6, 0.12]} />
      <Box s={[0.45, 0.55, 0.4]} c="#4a3a2c" position={[0.75, 0.27, 0.1]} />
      <Phone position={[0.75 + ring, 0.56, 0.12]} rotation={[-Math.PI / 2 + 0.35, 0, 0.2]} />
      <Label text="6:30 AM" h={0.06} color="#e0f2fe" position={[0.75, 0.72, 0.15]} />
      <Person look={maya} position={[-0.3, 0.22, 0.15]} rotation={[0, 0.5, 0]} scale={0.95}
        pose={{ sit: 1, armR: 0.6, armL: 0.3, head: 0.35, tilt: 0.12, blink: t < 0.5 ? 0.8 : blink(t, 3), mood: "calm" }} />
    </group>
  );
};
const Bus: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C1_BUS, [1.8, 1.75, 4.2], [0.3, 1.3, 0], 40], [C1_DESK, [1.5, 1.7, 3.6], [0.3, 1.32, 0], 40]]);
  const sway = Math.sin(t * 5) * 0.05;
  const r = rng(4);
  const pax = useMemo(() => Array.from({ length: 6 }, (_, i) => [i % 2 ? 1.1 : -1.1, -2.6 + Math.floor(i / 2) * 1.3, r()] as const), []);
  return (
    <group rotation={[0, 0, sway * 0.3]}>
      <color attach="background" args={["#0d1220"]} />
      <ambientLight intensity={0.3} color="#cfd8ff" />
      <directionalLight position={[3, 3, 2]} intensity={1.2} color="#ffd8a8" />
      <pointLight position={[0, 2.3, 0]} intensity={2} distance={6} color="#e8f0ff" />
      <Floor c="#3a3f4a" s={12} />
      <Box s={[3.0, 0.1, 9]} c="#d8dde6" position={[0, 2.5, -2]} />
      {[-1.5, 1.5].map((x) => <group key={x}>
        <Box s={[0.08, 1.0, 9]} c="#9aa3b2" position={[x, 0.5, -2]} />
        <WindowGlow w={9} h={1.0} top="#f4b77a" bottom="#6d86c4" position={[x * 0.99, 1.55, -2]} rotation={[0, -Math.sign(x) * Math.PI / 2, 0]} />
        {[0, 1, 2, 3].map((k) => <Box key={k} s={[0.06, 1.05, 0.06]} c="#cfd5df" position={[x * 0.99, 1.55, -5 + k * 2.2 + ((t * 4) % 2.2)]} />)}
      </group>)}
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 1.25, 0]}><cylinderGeometry args={[0.025, 0.025, 2.5, 10]} />{M("#e5c06a", { metalness: 0.8, roughness: 0.3 })}</mesh>)}
      {pax.map(([x, z, k], i) => <group key={i}>
        <Box s={[0.7, 0.5, 0.6]} c="#2f4a8a" position={[x, 0.25, z]} />
        <Person look={LOOKS.colleague(i)} position={[x, 0.05, z]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} scale={0.95} pose={{ sit: 1, head: 0.2 * Math.sin(t + k * 9), blink: blink(t, i + 5), mood: "calm", armL: 0.5, armR: 0.5 }} />
      </group>)}
      <Person look={maya} position={[0.3, 0, 0.1]} rotation={[0, 0.35, 0]} pose={{ armR: 2.9, armL: 0.2, tilt: sway, bob: Math.abs(sway) * 0.2, head: -0.2, blink: blink(t, 2), mood: "calm" }} />
    </group>
  );
};
const Desk: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C1_DESK, [3.6, 2.1, 3.3], [-0.3, 1.4, -0.6], 42], [C1_PAY, [3.3, 2.05, 3.0], [-0.3, 1.42, -0.6], 42]]);
  const spin = (t - C1_DESK) * 18;
  return (
    <group>
      <color attach="background" args={["#1a1f28"]} />
      <ambientLight intensity={0.35} color="#e6f0ff" />
      <directionalLight position={[2, 3, 2]} intensity={0.9} color="#f0f6ff" />
      <Floor c="#4a4f58" s={12} />
      <Wall c="#9aa5b1" w={10} h={4} position={[0, 2, -1.2]} />
      <group position={[-0.6, 2.0, -1.18]}>
        <mesh><circleGeometry args={[0.32, 48]} />{M("#f8fafc")}</mesh>
        <mesh position={[0, 0, -0.01]}><ringGeometry args={[0.32, 0.36, 48]} />{M("#1f2937")}</mesh>
        <group rotation={[0, 0, -spin]}><Box s={[0.02, 0.26, 0.01]} c="#111" position={[0, 0.12, 0.01]} /></group>
        <group rotation={[0, 0, -spin / 12]}><Box s={[0.035, 0.18, 0.01]} c="#111" position={[0, 0.08, 0.015]} /></group>
      </group>
      <Box s={[1.6, 0.05, 0.8]} c="#c9b28f" position={[0.1, 0.75, -0.4]} />
      <Box s={[0.7, 0.42, 0.04]} c="#111827" position={[0.1, 1.05, -0.65]} />
      <mesh position={[0.1, 1.05, -0.627]}><planeGeometry args={[0.64, 0.36]} /><meshBasicMaterial color="#9cc3ff" toneMapped={false} /></mesh>
      <Person look={maya} position={[0.1, 0.05, 0.25]} rotation={[0, Math.PI, 0]} pose={{ sit: 1, armL: 1.2, armR: 1.2, tilt: 0.05 + 0.1 * ramp(t, C1_DESK, C1_PAY), head: 0.1, blink: blink(t, 1), mood: "calm" }} />
    </group>
  );
};
const Payday: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C1_PAY, [0, 1.45, 1.5], [0, 1.32, 0], 34], [C1_FACE, [0, 1.42, 1.15], [0, 1.3, 0], 34]]);
  const r = rng(7);
  const bills = useMemo(() => Array.from({ length: 16 }, () => [r(), r(), r()]), []);
  const u = ramp(t, C1_PAY + 0.5, C1_FACE - 0.3);
  return (
    <group>
      <color attach="background" args={["#0b0f18"]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 1.4, 0.4]} intensity={2.2} distance={3} color="#a5f3fc" />
      <directionalLight position={[-1, 2, 1]} intensity={0.6} color="#ffd9a8" />
      <Phone position={[0, 1.22, 0]} scale={1.6} glow={u > 0.8 ? "#fca5a5" : "#a7f3d0"} />
      {bills.map(([a, b, c], i) => {
        const k = clamp((u * 16 - i) / 2);
        if (k <= 0) return null;
        return <Bill key={i} position={[(a - 0.5) * 0.2 + k * (a - 0.5) * 1.6, 1.25 + k * (0.3 + b * 0.8), k * (0.2 + c * 0.6)]} rotation={[k * 3 * a, k * 4 * b, k * 2]} scale={0.32} />;
      })}
    </group>
  );
};
const Question: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C1_FACE, [0.4, 1.6, 4.4], [0, 1.4, 0], 40], [SCN[0][1], [0.2, 1.62, 3.2], [0, 1.45, 0], 40]]);
  const u = ramp(t, C1_FACE, SCN[0][1]);
  return (
    <group>
      <color attach="background" args={["#0a0d16"]} />
      <ambientLight intensity={0.18} />
      <directionalLight position={[-2, 2, 1.5]} intensity={1.4} color="#ffb070" />
      <pointLight position={[1.2, 1.8, 1]} intensity={0.8} distance={4} color="#6d8cff" />
      <Wall c="#202638" w={8} h={4} position={[0, 2, -1.5]} />
      <WindowGlow w={1.6} h={1.8} top="#30244a" bottom="#e07a4a" position={[-1.1, 1.8, -1.48]} />
      {Array.from({ length: 6 }, (_, i) => <Box key={i} s={[0.18, 0.4 + (i % 3) * 0.3, 0.01]} c="#151a2a" position={[-1.75 + i * 0.25, 1.1 + (i % 3) * 0.15, -1.46]} />)}
      <Person look={maya} position={[0, 0, 0]} rotation={[0, -0.25, 0]} pose={{ armL: 0.1, armR: 0.1, head: -0.1 + 0.1 * u, tilt: 0.06, blink: blink(t, 4), mood: u > 0.3 ? "nervous" : "calm" }} />
    </group>
  );
};

// =========================================================================== 2. how the 8-hour day was won (1886 march, 1940 time clock)
export const HistoryScene: React.FC<{ t: number }> = ({ t }) => (t < C2_CLOCK ? <March key="m" t={t} /> : <TimeClock key="c" t={t} />);
const BANNERS = ["8 HOURS FOR WORK", "8 HOURS FOR REST", "8 HOURS FOR WHAT WE WILL"];
const March: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, SCN[1][0], C2_CLOCK);
  useCamKeys(t, [[SCN[1][0], [0, 1.6, 7], [0, 1.5, -4], 44], [C2_CLOCK, [0.4, 4.2, 6.2], [0, 1.2, -4], 44]]);
  const r = rng(11);
  const crowd = useMemo(() => Array.from({ length: 34 }, (_, i) => [(i % 6) * 0.95 - 2.4 + (r() - 0.5) * 0.3, -1 - Math.floor(i / 6) * 1.25 + (r() - 0.5) * 0.3, r()] as const), []);
  const adv = (t - SCN[1][0]) * 0.55;
  return (
    <group>
      <Sky top="#8a8f99" bottom="#cfc6b4" />
      <fog attach="fog" args={["#b8ad98", 8, 30]} />
      <ambientLight intensity={0.55} color="#e8dcc4" />
      <directionalLight position={[3, 8, 4]} intensity={1.1} color="#fff0d6" />
      <Floor c="#5a5249" s={60} />
      {Array.from({ length: 18 }, (_, i) => <Box key={i} s={[0.22, 0.02, 0.22]} c="#6b6259" position={[((i * 7) % 9) - 4, 0.01, -((i * 13) % 20) + 4]} />)}
      {[-1, 1].map((s) => Array.from({ length: 6 }, (_, i) => (
        <group key={s + "" + i} position={[s * 4.6, 0, 3 - i * 4.2]}>
          <Box s={[2.2, 5 + (i % 3) * 1.2, 4]} c={["#7a3f2e", "#8a5a3a", "#6b4a3a"][(i + (s > 0 ? 1 : 0)) % 3]} position={[0, 2.5 + (i % 3) * 0.6, 0]} />
          {[1.6, 3.0, 4.4].map((y) => [-1.2, 0, 1.2].map((z) => <Box key={y + "" + z} s={[0.05, 0.7, 0.5]} c="#2a2622" position={[-s * 1.11, y, z]} />))}
        </group>
      )))}
      {crowd.map(([x, z, k], i) => (
        <Person key={i} look={LOOKS.worker(i)} position={[x, 0, z + adv]} rotation={[0, (k - 0.5) * 0.2, 0]} scale={0.95 + k * 0.1}
          pose={{ ...walkPose(t * 0.8, i), mood: "calm", armR: i % 7 === 0 ? 2.6 + 0.2 * Math.sin(t * 3 + i) : walkPose(t * 0.8, i).armR }} />
      ))}
      {[0, 1, 2].map((i) => <group key={i} position={[-1.9 + i * 1.9, 0, -1.6 - i * 1.4 + adv]}>
        {[-0.85, 0.85].map((x) => <mesh key={x} position={[x, 1.3, 0]}><cylinderGeometry args={[0.025, 0.025, 2.6, 8]} />{M("#5a3d24")}</mesh>)}
        <Sign text={BANNERS[i]} w={1.8} h={0.42} bg="#efe4cc" fg="#3a1d12" position={[0, 2.35, 0.02]} />
      </group>)}
    </group>
  );
};
const TimeClock: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C2_CLOCK, [0.9, 1.5, 2.4], [0, 1.35, -0.6], 36], [SCN[1][1], [0.35, 1.42, 1.25], [0, 1.35, -0.6], 34]]);
  const card = smooth(ramp(t, C2_CLOCK + 0.8, C2_CLOCK + 1.6));
  const stamp = pulse(t, C2_CLOCK + 1.65, 0.25);
  return (
    <group>
      <color attach="background" args={["#120d08"]} />
      <ambientLight intensity={0.25} color="#ffd9a8" />
      <spotLight position={[1.5, 3, 2]} angle={0.5} penumbra={0.6} intensity={30} color="#ffcf8a" />
      <Floor c="#3a2e24" s={20} />
      <Wall c="#6e4a36" w={10} h={5} position={[0, 2.5, -0.75]} />
      {Array.from({ length: 12 }, (_, i) => <Box key={i} s={[10, 0.015, 0.01]} c="#4a3226" position={[0, 0.3 + i * 0.33, -0.74]} />)}
      <Box s={[0.5, 0.75, 0.3]} c="#3b4a3a" o={{ metalness: 0.5, roughness: 0.45 }} position={[0, 1.35, -0.6]} />
      <mesh position={[0, 1.55, -0.444]}><circleGeometry args={[0.15, 40]} />{M("#efe6d2")}</mesh>
      <Box s={[0.012, 0.11, 0.005]} c="#222" position={[0, 1.6, -0.44]} />
      <Box s={[0.01, 0.08, 0.005]} c="#222" position={[0.03, 1.56, -0.44]} rotation={[0, 0, -1.2]} />
      <Box s={[0.32, 0.05, 0.05]} c="#1f2a1f" position={[0, 1.22, -0.43 + 0.02 * stamp]} />
      <Box s={[0.12, 0.22, 0.004]} c="#eadfc4" position={[0, lerp(1.62, 1.28, card) - 0.02 * stamp, -0.4]} rotation={[0, 0, 0]} />
      <Sign text="1940" w={0.6} h={0.28} bg="#2a1d12" fg="#ffcf6b" position={[0.9, 2.1, -0.72]} />
      {[-1, 1].map((s) => Array.from({ length: 5 }, (_, i) => <Box key={s + "" + i} s={[0.1, 0.18, 0.01]} c="#e0d4b8" position={[s * 0.55, 1.05 + i * 0.12, -0.73]} />))}
      <mesh position={[0.28, lerp(1.75, 1.4, card), -0.3]}><sphereGeometry args={[0.07, 16, 12]} />{M("#e0b08c")}</mesh>
    </group>
  );
};

// =========================================================================== 3. pay crawls, rent climbs
export const SqueezeScene: React.FC<{ t: number }> = ({ t }) => (t < C3_RENT ? <Chart key="c" t={t} /> : <Rent key="r" t={t} />);
const Apartment: React.FC = () => (
  <group>
    <color attach="background" args={["#0d0f18"]} />
    <ambientLight intensity={0.22} color="#b8c4ff" />
    <pointLight position={[-1.3, 2.0, 0.6]} intensity={3} distance={6} color="#ffbf73" />
    <directionalLight position={[2, 3, 3]} intensity={0.45} color="#9db0ff" />
    <Floor c="#5a4636" s={20} />
    <Wall c="#3b3346" w={12} h={5} position={[0, 2.5, -2]} />
    <WindowGlow w={2.0} h={1.6} top="#1d2a52" bottom="#8a5a7a" position={[1.6, 1.8, -1.98]} />
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} position={[0.75 + (i % 7) * 0.26, 1.2 + Math.floor(i / 7) * 0.5 + (i % 3) * 0.08, -1.97]}><planeGeometry args={[0.05, 0.05]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>)}
    <Glow color="#ffb35a" size={1.8} opacity={0.5} position={[-1.3, 1.95, 0.5]} />
    <mesh position={[-1.3, 1.95, 0.5]}><coneGeometry args={[0.2, 0.22, 24, 1, true]} /><meshStandardMaterial color="#f5e2c0" emissive="#ffb35a" emissiveIntensity={0.8} side={THREE.DoubleSide} /></mesh>
  </group>
);
const Chart: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[2][0], [-0.3, 1.4, 4.8], [0, 1.2, -0.2], 44], [C3_RENT, [0.4, 1.3, 4.0], [0, 1.2, -0.2], 44]]);
  const grow = easeOut(ramp(t, SCN[2][0] + 0.3, SCN[2][0] + 2.4));
  const pts = useMemo(() => Array.from({ length: 36 }, (_, i) => {
    const x = -0.9 + (i / 35) * 2.0;   // 1979 .. 2014, gently rising by 8% with small wobbles
    const y = 0.75 + 0.25 * (i / 35) + 0.04 * Math.sin(i * 0.9) - 0.03 * Math.sin(i * 0.37);
    return new THREE.Vector3(x, y, 0);
  }), []);
  const n = Math.max(2, Math.round(grow * 35) + 1);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts.slice(0, n)), [pts, n]);
  return (
    <group>
      <Apartment />
      <group position={[0, 0.3, -0.6]}>
        <Box s={[2.2, 0.02, 0.02]} c="#cbd5e1" position={[0.1, 0.7, 0]} />
        <Box s={[0.02, 1.2, 0.02]} c="#cbd5e1" position={[-0.95, 1.25, 0]} />
        <mesh><tubeGeometry args={[curve, 80, 0.025, 10, false]} /><meshStandardMaterial color={COL.gold} emissive={COL.gold} emissiveIntensity={0.8} metalness={0.6} roughness={0.25} /></mesh>
        <Label text="1979" h={0.11} position={[-0.88, 0.58, 0]} />
        <Label text="2014" h={0.11} position={[1.05, 0.58, 0]} />
        {grow > 0.95 && <Label text="+8%" h={0.2} color={COL.gold} position={[1.15, 1.15, 0]} />}
      </group>
      <Person look={maya} position={[-1.15, 0, 0.6]} rotation={[0, 0.7, 0]} pose={{ armR: 0.3, armL: 0.1, head: 0.2, blink: blink(t, 6), mood: "nervous" }} />
    </group>
  );
};
const Rent: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C3_RENT, [1.2, 1.7, 3.4], [0.3, 1.05, -0.4], 42], [SCN[2][1], [0.8, 1.55, 2.7], [0.25, 1.1, -0.4], 42]]);
  const stack = Math.round(easeOut(ramp(t, C3_RENT + 0.2, SCN[2][1] - 0.6)) * 34);
  const rub = ramp(t, C3_RENT + 1.4, C3_RENT + 2.0);
  return (
    <group>
      <Apartment />
      <Box s={[1.4, 0.05, 0.9]} c="#8a6a4a" position={[0, 0.76, -0.2]} />
      {[[-0.6, -0.55], [0.6, -0.55], [-0.6, 0.15], [0.6, 0.15]].map(([x, z], i) => <Box key={i} s={[0.05, 0.75, 0.05]} c="#5a4632" position={[x, 0.37, z - 0.2]} />)}
      {[0, 1, 2, 3].map((i) => <Box key={i} s={[0.21, 0.004, 0.28]} c="#f1f5f9" position={[-0.35 + i * 0.13, 0.79, -0.15 + (i % 2) * 0.06]} rotation={[0, i * 0.4, 0]} />)}
      <Box s={[0.1, 0.02, 0.16]} c="#334155" position={[0.25, 0.8, 0]} />
      {Array.from({ length: stack }, (_, i) => <Box key={i} s={[0.32, 0.045, 0.22]} c={i % 5 === 4 ? "#fca5a5" : "#f8f4e8"} position={[0.95 + Math.sin(i * 1.3) * 0.01, 0.025 + i * 0.05, -0.15]} rotation={[0, Math.sin(i) * 0.08, 0]} />)}
      <Person look={maya} position={[0, 0.02, -0.85]} rotation={[0, 0, 0]} scale={1}
        pose={{ sit: 1, armR: lerp(1.2, 2.7, rub), armL: 1.1, tilt: 0.12 * rub, head: 0.15, blink: blink(t, 8), mood: "nervous" }} />
    </group>
  );
};

// =========================================================================== 4. borrowing to survive
export const BorrowScene: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, SCN[3][0], SCN[3][1]);
  const roll = THREE.MathUtils.degToRad(5) * smooth(ramp(t, C4_BORROW, C4_BORROW + 0.8));
  useCamKeys(t, [[SCN[3][0], [2.4, 1.8, 5.4], [0.3, 1.15, -0.4], 42], [C4_BORROW, [1.7, 1.65, 4.3], [0.2, 1.25, -0.2], 42], [SCN[3][1], [1.3, 1.65, 3.7], [0.1, 1.35, 0], 42]], roll);
  const chain = easeOut(ramp(t, C4_BORROW + 0.3, C4_BORROW + 1.8));
  const r = rng(13);
  const steam = useMemo(() => Array.from({ length: 10 }, () => [r(), r()]), []);
  void u;
  return (
    <group>
      <color attach="background" args={["#05060c"]} />
      <fog attach="fog" args={["#0a0b14", 6, 22]} />
      <ambientLight intensity={0.12} color="#8090c0" />
      <spotLight position={[-1.2, 5, 0.5]} angle={0.7} penumbra={0.7} intensity={60} color="#ffa64d" />
      <pointLight position={[1.2, 0.5, -1.5]} intensity={1.4} distance={3} color="#ff3b3b" />
      <Floor c="#26262c" s={60} />
      {[-3, 0, 3].map((x) => <Box key={x} s={[0.08, 0.005, 2.6]} c="#d6d3c9" position={[x + 1.5, 0.003, -1]} />)}
      <mesh position={[-1.2, 2.5, 0.3]}><cylinderGeometry args={[0.05, 0.06, 5, 10]} />{M("#2a2a30")}</mesh>
      <Glow color="#ffa64d" size={2.2} opacity={0.7} position={[-1.2, 4.95, 0.5]} />
      {/* the old hatchback, hood up */}
      <group position={[1.2, 0, -1.3]} rotation={[0, -0.5, 0]}>
        <Box s={[1.7, 0.55, 3.4]} c="#6b7f8f" o={{ metalness: 0.4, roughness: 0.45 }} position={[0, 0.55, 0]} />
        <Box s={[1.5, 0.5, 1.8]} c="#5d6f7e" o={{ metalness: 0.4, roughness: 0.4 }} position={[0, 1.07, -0.35]} />
        <mesh position={[0, 1.08, 0.55]} rotation={[-0.5, 0, 0]}><planeGeometry args={[1.4, 0.45]} /><meshStandardMaterial color="#1b2430" metalness={0.8} roughness={0.15} /></mesh>
        <group position={[0, 0.84, 0.75]} rotation={[-1.1, 0, 0]}><Box s={[1.6, 0.04, 0.95]} c="#6b7f8f" o={{ metalness: 0.4, roughness: 0.45 }} position={[0, 0, 0.47]} /></group>
        {[[-0.8, 1.1], [0.8, 1.1], [-0.8, -1.1], [0.8, -1.1]].map(([x, z], i) => <mesh key={i} position={[x, 0.32, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.32, 0.32, 0.22, 24]} />{M("#111")}</mesh>)}
        {[-1, 1].map((s) => <Glow key={s} color="#ff2a2a" size={0.4} opacity={0.8} position={[s * 0.6, 0.7, -1.72]} />)}
        {steam.map(([a, b], i) => { const k = ((t * 0.5 + a) % 1); return <Glow key={i} color="#cbd5e1" size={0.4 + k * 0.9} opacity={0.18 * (1 - k)} position={[(b - 0.5) * 0.8, 1.0 + k * 1.6, 1.0]} />; })}
      </group>
      <Person look={maya} position={[-0.2, 0, 0.4]} rotation={[0, 0.5, 0]}
        pose={{ armR: t < C4_BORROW ? 1.2 : 1.5, armL: 1.1, head: 0.15, tilt: -0.05, blink: blink(t, 9), mood: "nervous", sweat: ramp(t, SCN[3][0] + 1, SCN[3][0] + 2) }} />
      {t < C4_BORROW + 0.3 && <Sign text="ESTIMATE  $400" w={0.34} h={0.17} bg="#f8fafc" fg="#b91c1c" position={[-0.08, 1.12, 0.78]} rotation={[-0.3, 0.5, 0]} />}
      {t >= C4_BORROW && <>
        <Box s={[0.16, 0.1, 0.006]} c="#e8b923" o={{ metalness: 0.7, roughness: 0.3 }} position={[0.05, 1.18, 0.8]} rotation={[-0.2, 0.5, 0]} />
        <Glow color={COL.gold} size={0.4} opacity={0.6} position={[0.05, 1.18, 0.82]} />
        {Array.from({ length: 14 }, (_, i) => {
          const k = i / 13; if (k > chain) return null;
          const p: V3 = [lerp(0.05, i < 7 ? 0.9 : -0.9, k), 1.18 + Math.sin(k * Math.PI) * 0.5 + k * 0.4, lerp(0.8, 0.2, k)];
          return <mesh key={i} position={p} rotation={[i % 2 ? Math.PI / 2 : 0, 0.5, 0]}><torusGeometry args={[0.04, 0.012, 8, 16]} /><meshStandardMaterial color="#ff4d4d" emissive="#ff2a2a" emissiveIntensity={1.4} metalness={0.6} roughness={0.3} /></mesh>;
        })}
        {chain > 0.9 && <Sign text="CARD  21% APR" w={0.6} h={0.2} bg="#3b0a0a" fg="#ffb4b4" position={[0.95, 2.05, 0.15]} />}
        {chain > 0.9 && <Sign text="CAR  $765 / MO" w={0.6} h={0.2} bg="#3b0a0a" fg="#ffb4b4" position={[-0.95, 2.05, 0.15]} />}
      </>}
    </group>
  );
};

// =========================================================================== 5. building the way out
export const BuildScene: React.FC<{ t: number }> = ({ t }) => (t < C5_GROW ? <Jar key="j" t={t} /> : <Grow key="g" t={t} />);
const Jar: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[4][0], [0.9, 1.6, 4.0], [0.45, 1.3, 0], 42], [C5_GROW, [0.75, 1.55, 3.3], [0.45, 1.3, 0], 42]]);
  const fill = easeOut(ramp(t, SCN[4][0] + 0.4, C5_GROW - 0.2));
  const N = 60, shown = Math.round(fill * N);
  const drop = (t * 2.2) % 1;
  return (
    <group>
      <color attach="background" args={["#1a1410"]} />
      <ambientLight intensity={0.35} color="#ffe8cc" />
      <directionalLight position={[-2, 2.5, 1.5]} intensity={2.2} color="#ffd59a" />
      <Wall c="#e9dcc5" w={8} h={4} position={[0, 2, -0.6]} />
      <WindowGlow w={1.2} h={1.0} top="#9cc8f2" bottom="#ffe2b0" position={[-0.9, 1.55, -0.58]} />
      <Box s={[3, 0.06, 0.8]} c="#b48a5a" position={[0, 0.9, -0.2]} />
      <group position={[0, 0.93, 0]}>
        <mesh position={[0, 0.17, 0]}><cylinderGeometry args={[0.13, 0.13, 0.34, 40, 1, true]} /><meshPhysicalMaterial color="#e8f6ff" transmission={0.9} roughness={0.05} thickness={0.02} transparent opacity={0.35} side={THREE.DoubleSide} /></mesh>
        <mesh position={[0, 0.355, 0]}><cylinderGeometry args={[0.135, 0.135, 0.03, 40]} />{M("#c0a060", { metalness: 0.7, roughness: 0.3 })}</mesh>
        <Coins n={N} xf={(i) => i < shown ? [[Math.cos(i * 2.4) * 0.07 * ((i % 3) / 2 + 0.3), 0.01 + i * 0.0045, Math.sin(i * 2.4) * 0.07 * ((i % 3) / 2 + 0.3)], [Math.PI / 2 + (i % 4) * 0.2, i, 0], 0.075] : null} />
        <Sign text="EMERGENCY FUND" w={0.22} h={0.05} bg="#fff7e6" fg="#7c2d12" position={[0, 0.2, 0.132]} />
        {fill < 0.98 && <group position={[0.02, 0.5 - drop * 0.25, 0]}><Coins n={1} xf={() => [[0, 0, 0], [0.4, t * 4, 0], 0.075]} /></group>}
      </group>
      <Person look={maya} position={[0.95, 0, 0.3]} rotation={[0, -0.8, 0]} pose={{ armR: 1.5 + 0.1 * Math.sin(t * 12), armL: 0.2, head: -0.3, blink: blink(t, 10), mood: "smile" }} />
    </group>
  );
};
const Grow: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, C5_GROW, SCN[4][1]);
  useCamKeys(t, [[C5_GROW, [0.9, 1.5, 5.0], [0.5, 1.3, 0], 42], [SCN[4][1], [1.2, 3.2, 10.5], [0.4, 2.4, 0], 44]]);
  const tree = smooth(ramp(t, C5_GROW + 0.2, SCN[4][1] - 0.4));
  const age = smooth(ramp(t, C5_GROW + 1.5, SCN[4][1] - 0.8));
  const hair = "#" + new THREE.Color("#1a120c").lerp(new THREE.Color("#8a8580"), age).getHexString();
  const sky = "#" + new THREE.Color("#7db8ec").lerp(new THREE.Color("#f2a65a"), u).getHexString();
  return (
    <group>
      <Sky top={sky} bottom="#ffe6c2" />
      <ambientLight intensity={0.45} color="#fff2dc" />
      <directionalLight position={[-4, 5, 3]} intensity={2.4} color="#ffd9a0" />
      <Floor c="#6aa04a" s={80} />
      {Array.from({ length: 16 }, (_, i) => <Box key={i} s={[1.6 + (i % 3) * 0.6, 4 + ((i * 7) % 6) * 1.8, 1.6]} c={["#6b7a92", "#7d8ba3", "#5f6c84"][i % 3]} position={[-14 + i * 1.9, 2 + ((i * 7) % 6) * 0.9, -14 - (i % 4) * 2]} />)}
      <Box s={[1.4, 0.35, 0.7]} c="#7a4f2e" position={[0, 0.17, 0]} />
      <group position={[0, 0.3, 0]} scale={0.15 + 2.6 * tree}><Tree k={1} /></group>
      <Person look={{ ...LOOKS.maya, hair, badge: false }} position={[1.2, 0, 0.9]} rotation={[0, -0.5, 0]}
        pose={{ armL: 0.1, armR: 0.15, head: -0.35 + 0.3 * u, tilt: 0.03, blink: blink(t, 12), mood: "smile", bob: -0.03 * age }} />
    </group>
  );
};

// =========================================================================== 6. the balanced ending
export const EndScene: React.FC<{ t: number }> = ({ t }) => (t < C6_EXIT ? <Benefits key="b" t={t} /> : <Exit key="e" t={t} />);
const Benefits: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[5][0], [3.6, 2.1, 3.3], [-0.3, 1.4, -0.6], 42], [C6_EXIT, [3.3, 2.05, 3.0], [-0.3, 1.42, -0.6], 42]]);
  const nod = Math.sin(ramp(t, SCN[5][0] + 0.8, SCN[5][0] + 1.4) * Math.PI) * 0.12;
  return (
    <group>
      <color attach="background" args={["#2a1d14"]} />
      <ambientLight intensity={0.45} color="#ffe2bf" />
      <directionalLight position={[-3, 2, 2]} intensity={2.4} color="#ffc27a" />
      <Floor c="#6a5a4a" s={12} />
      <Wall c="#d9c7ad" w={10} h={4} position={[0, 2, -1.2]} />
      <WindowGlow w={2.4} h={1.8} top="#f6b26b" bottom="#ffe0a8" position={[-1.8, 1.7, -1.18]} />
      <Box s={[1.6, 0.05, 0.8]} c="#c9b28f" position={[0.1, 0.75, -0.4]} />
      <Box s={[0.8, 0.48, 0.04]} c="#111827" position={[0.1, 1.08, -0.65]} />
      <Sign text="401(k)  YOU 6%  +  EMPLOYER 4%" w={0.74} h={0.4} bg="#0b2a1a" fg="#86efac" position={[0.1, 1.08, -0.627]} />
      <Person look={maya} position={[0.1, 0.05, 0.25]} rotation={[0, Math.PI, 0]} pose={{ sit: 1, armL: 1.2, armR: 1.2, head: 0.05, tilt: nod, blink: blink(t, 14), mood: "smile" }} />
    </group>
  );
};
const Exit: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, C6_EXIT, 60);
  useCamKeys(t, [[C6_EXIT, [1.4, 1.7, 5.6], [0.1, 1.35, 0], 40], [FINAL_AT, [2.2, 2.4, 7.0], [0.1, 1.6, -1], 42], [60, [3.5, 5.5, 11], [0, 3.0, -6], 46]]);
  const z = lerp(-2.5, 0.8, smooth(ramp(t, C6_EXIT, FINAL_AT + 1.2)));
  const walking = t < FINAL_AT + 1.2;
  void u;
  return (
    <group>
      <Sky top="#f4a259" bottom="#ffe3b3" />
      <fog attach="fog" args={["#ffd2a0", 20, 70]} />
      <ambientLight intensity={0.5} color="#ffe4c4" />
      <directionalLight position={[-6, 3, -8]} intensity={3} color="#ffb862" />
      <Glow color="#ffd08a" size={14} opacity={0.6} position={[-12, 6, -30]} />
      <Floor c="#b8ab98" s={120} />
      {Array.from({ length: 10 }, (_, i) => <Box key={i} s={[3, 9 + (i % 4) * 4, 3]} c={["#7f8ea6", "#9aa7bb", "#6f7d94"][i % 3]} o={{ metalness: 0.5, roughness: 0.25 }} position={[-18 + i * 4.2, (9 + (i % 4) * 4) / 2, -22 - (i % 3) * 4]} />)}
      <group position={[0, 0, -4]}>
        <Box s={[8, 6, 0.3]} c="#8fb3c9" o={{ metalness: 0.6, roughness: 0.1 }} position={[0, 3, 0]} />
        <Box s={[2.2, 2.6, 0.05]} c="#ffe2b0" o={{ metalness: 0.2, roughness: 0.05, emissive: new THREE.Color("#ffb862"), emissiveIntensity: 0.4 }} position={[0, 1.3, 0.18]} />
      </group>
      {[[-3, 1], [3.2, 2], [-4, -1]].map(([x, k], i) => <Tree key={i} k={k} position={[x, 0, -1.5 + i]} scale={1.3} />)}
      <Person look={maya} position={[0.2, 0, z]} rotation={[0, walking ? 0.15 : -0.4, 0]} pose={walking ? { ...walkPose(t, 2), mood: "smile" } : { armL: 0.1, armR: 0.1, head: -0.4, blink: blink(t, 15), mood: "smile" }} />
    </group>
  );
};

export { backOut, pulse };
