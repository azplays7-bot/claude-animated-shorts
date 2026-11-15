// The six 10-second clips of "Elon Musk: how much does his fortune grow every second?".
// The lead is a stylised, generic figure in a black suit and dark shirt (LOOKS.boss), not a likeness of the real person.
// No logos or company marks: the rocket, car and charts are generic designs.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Person, Coins } from "./Actors";
import { Box, Glow, Label, Sign, Sky, Stack, useCamKeys, V3 } from "./Kit";
import { COL, LOOKS, SCN, blink, clamp, easeOut, lerp, ramp, rng, smooth } from "./timeline";
import { tower, marble } from "./textures";
import T from "../narration/timing.json";

const CH = T.chunks as { start: number; end: number; text: string }[];
const at = (needle: string) => CH.find((c) => c.text.includes(needle))!.start;
// shared beats (Overlay.tsx and audio/make_audio.py use the same chunk times)
export const C2_WORKER = at("More than many workers");
export const C3_HOUSES = at("HOUSES"), C3_ROOF = at("only getting");
export const C4_ORBIT = SCN[3][0] + 2.6;
export const C5_COMMAND = at("Across a whole");
export const C6_TWIST = at("The TWIST");

const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={c} roughness={0.6} {...o} />;
const boss = LOOKS.boss;
const fmt = (v: number) => "$" + Math.round(v).toLocaleString("en-US");

/** night skyline: instanced towers with lit-window facades; lit(i) 0..1 lets windows switch on building by building */
const Skyline: React.FC<{ n?: number; r0?: number; r1?: number; lit?: (i: number) => number; seed?: number }> = ({ n = 70, r0 = 18, r1 = 70, lit, seed = 3 }) => {
  const r = rng(seed);
  const b = useMemo(() => Array.from({ length: n }, () => { const a = r() * Math.PI * 2, d = r0 + r() * (r1 - r0); return [Math.cos(a) * d, Math.sin(a) * d, 2 + r() * 3.5, 8 + r() * 34] as const; }), [n]);
  const tex = useMemo(() => tower(), []);
  return <group>{b.map(([x, z, w, h], i) => {
    const k = lit ? lit(i) : 1;
    return <mesh key={i} position={[x, h / 2, z]}><boxGeometry args={[w, h, w]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.15 + 0.85 * k} color={k > 0.5 ? "#ffffff" : "#6b7a99"} roughness={0.4} metalness={0.3} /></mesh>;
  })}</group>;
};
/** glowing holographic panel with a value on it */
const Holo: React.FC<{ text: string; w: number; color?: string } & JSX.IntrinsicElements["group"]> = ({ text, w, color = "#5ee7ff", ...p }) => (
  <group {...p}>
    <mesh><planeGeometry args={[w, w * 0.32]} /><meshBasicMaterial color={color} transparent opacity={0.12} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {[[0, w * 0.16, w, 0.03], [0, -w * 0.16, w, 0.03], [w / 2, 0, 0.03, w * 0.32], [-w / 2, 0, 0.03, w * 0.32]].map(([x, y, a, b], i) =>
      <mesh key={i} position={[x, y, 0.001]}><planeGeometry args={[a, b]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}
    <Label text={text} h={w * 0.14} color="#eafcff" position={[0, 0, 0.01]} />
    <Glow color={color} size={w * 1.3} opacity={0.35} position={[0, 0, -0.05]} />
  </group>
);

// =========================================================================== 1. the $14,000 second (penthouse at night)
export const SecondScene: React.FC<{ t: number }> = ({ t }) => {
  const sec = Math.floor(t), frac = t - sec;
  const val = 14396 * (sec + 1);
  useCamKeys(t, [
    [0, [0, 2.45, -1.15], [0, 2.45, -2.6], 30], [0.9, [0, 2.4, -0.6], [0, 2.4, -2.6], 34],
    [2.2, [2.6, 1.9, 4.6], [0, 1.7, -1.0], 40], [6.0, [-2.8, 1.8, 4.2], [0, 1.7, -1.0], 40],
    [8.2, [-1.4, 0.9, 3.2], [0, 1.5, -1.0], 40], [10, [-0.4, 1.9, 2.6], [0, 2.3, -2], 38]]);
  const tick = Math.max(0, 1 - frac / 0.12);
  const piles: V3[] = [[-1.6, 0, 0.4], [1.7, 0, 0.2], [-1.2, 0, 1.8], [1.4, 0, 1.6], [-2.2, 0, -0.8], [2.3, 0, -0.9]];
  const marb = useMemo(() => marble(), []);
  return (
    <group>
      <color attach="background" args={["#03050c"]} />
      <fog attach="fog" args={["#05070f", 30, 110]} />
      <ambientLight intensity={0.12} color="#6f86c7" />
      <spotLight position={[0, 5, 2.5]} angle={0.55} penumbra={0.7} intensity={45} color="#ffd9a3" />
      <pointLight position={[0, 2.4, -2.2]} intensity={6 + 6 * tick} distance={7} color="#5ee7ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[14, 14]} /><meshStandardMaterial map={marb} color="#3a3d48" roughness={0.12} metalness={0.4} /></mesh>
      <Box s={[14, 0.05, 14]} c="#0b0d14" position={[0, 4.2, 0]} />
      {/* glass walls with the city outside */}
      {[[0, -3.2, 0], [-4.5, 0, Math.PI / 2], [4.5, 0, -Math.PI / 2]].map(([x, z, ry], i) => (
        <mesh key={i} position={[x, 2.1, z]} rotation={[0, ry, 0]}><planeGeometry args={[12, 4.2]} /><meshPhysicalMaterial color="#9fc6ff" transparent opacity={0.08} roughness={0.05} metalness={0.2} /></mesh>))}
      {[-3, -1, 1, 3].map((x) => <Box key={x} s={[0.06, 4.2, 0.06]} c="#1c1f28" o={{ metalness: 0.8, roughness: 0.3 }} position={[x, 2.1, -3.2]} />)}
      <group position={[0, -30, 0]}><Skyline n={80} r0={12} r1={80} /></group>
      {/* the wall clock / counter display behind him */}
      <group position={[0, 2.45, -2.6]}>
        <Box s={[2.6, 0.9, 0.08]} c="#05070b" />
        <Label text={t < 2.0 ? `23:59:${String(50 + (sec % 10)).padStart(2, "0")}` : fmt(val)} h={0.36} color={t < 2.0 ? "#5ee7ff" : "#ffd27a"} position={[0, 0, 0.05]} />
      </group>
      {/* money stacks rising from the floor */}
      {piles.map((p, i) => { const k = easeOut(ramp(t, 5.6 + i * 0.25, 7.6 + i * 0.25)); return k > 0 ? <Stack key={i} n={Math.max(1, Math.round(k * 9))} position={p} rotation={[0, i * 0.7, 0]} /> : null; })}
      <Person look={boss} position={[0, 0, 0.2]} rotation={[0, 0.1 * Math.sin(t * 0.4), 0]} pose={{ armL: 0.15, armR: 0.15 + 0.2 * ramp(t, 3, 4), head: 0.15 * Math.sin(t * 0.6), blink: blink(t, 2), mood: "calm" }} />
    </group>
  );
};

// =========================================================================== 2. almost $1 million a minute (the vault, then a worker)
export const MinuteScene: React.FC<{ t: number }> = ({ t }) => (t < C2_WORKER ? <Vault key="v" t={t} /> : <Worker key="w" t={t} />);
const Vault: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SCN[1][0];
  useCamKeys(t, [[t0, [0, 1.6, 9], [0, 1.4, 0], 44], [t0 + 2.5, [0.6, 1.4, 3.5], [0, 1.2, -6], 44], [C2_WORKER, [-0.5, 1.2, -2.5], [0, 1.4, -12], 46]]);
  const cd = Math.max(0, 60 - Math.floor(60 * Math.pow(ramp(t, t0 + 0.6, C2_WORKER - 0.3), 1.6)));
  const fill = ramp(t, t0 + 0.6, C2_WORKER - 0.3);
  const r = rng(5);
  const walls = useMemo(() => Array.from({ length: 70 }, (_, i) => [i % 2 ? 1.6 : -1.6, -i * 0.42 + 6, r()] as const), []);
  return (
    <group>
      <color attach="background" args={["#0a0703"]} />
      <fog attach="fog" args={["#140c03", 6, 26]} />
      <ambientLight intensity={0.25} color="#ffd38a" />
      {[4, -2, -8, -14].map((z, i) => <pointLight key={i} position={[0, 3, z]} intensity={10 + 6 * fill} distance={9} color="#ffc35a" />)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -4]}><planeGeometry args={[6, 30]} />{M("#3a2c18", { metalness: 0.5, roughness: 0.3 })}</mesh>
      <Box s={[6, 0.1, 30]} c="#2a2010" position={[0, 3.6, -4]} />
      {/* round vault door, open */}
      <group position={[-2.0, 1.8, 6.5]} rotation={[0, 1.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.7, 1.7, 0.5, 48]} />{M("#9aa1aa", { metalness: 0.9, roughness: 0.25 })}</mesh>
        {[0, 1, 2, 3, 4, 5].map((k) => <mesh key={k} position={[Math.cos(k) * 0.6, Math.sin(k) * 0.6, 0.27]} rotation={[0, 0, k]}><boxGeometry args={[0.8, 0.08, 0.06]} />{M("#c9ced6", { metalness: 0.9, roughness: 0.2 })}</mesh>)}
      </group>
      {/* walls of cash that grow as the minute fills */}
      {walls.map(([x, z, k], i) => { const h = Math.max(1, Math.round((3 + k * 8) * clamp(fill * 1.6 - (i / 70) * 0.6))); return <Stack key={i} n={h} position={[x + (k - 0.5) * 0.3, 0, z]} rotation={[0, Math.PI / 2 + (k - 0.5) * 0.3, 0]} />; })}
      <Coins n={40} xf={(i) => { const k = ((t * 0.4 + i * 0.137) % 1); return [[Math.sin(i * 7) * 1.2, 3.4 - k * 3.4, -i * 0.35 + 3], [t * 3 + i, i, 0], 0.18]; }} />
      <Holo text={`00:${String(cd).padStart(2, "0")}`} w={1.6} color="#ffcc55" position={[0, 2.7, -3]} />
      <Glow color="#ffc35a" size={8} opacity={0.35 + 0.3 * fill} position={[0, 1.5, -14]} />
    </group>
  );
};
const Worker: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C2_WORKER, [2.4, 1.9, 3.6], [0, 1.2, -0.4], 42], [SCN[1][1], [1.9, 1.75, 3.0], [0, 1.25, -0.4], 42]]);
  return (
    <group>
      <color attach="background" args={["#1a1f28"]} />
      <ambientLight intensity={0.4} color="#e6f0ff" />
      <directionalLight position={[2, 3, 2]} intensity={1.2} color="#f0f6ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 12]} />{M("#4a4f58")}</mesh>
      <mesh position={[0, 2, -1.3]}><planeGeometry args={[10, 4]} />{M("#8f9aa8")}</mesh>
      <Box s={[1.6, 0.05, 0.8]} c="#c9b28f" position={[0, 0.75, -0.5]} />
      <Box s={[0.7, 0.42, 0.04]} c="#111827" position={[0, 1.05, -0.8]} />
      <mesh position={[0, 1.05, -0.777]}><planeGeometry args={[0.64, 0.36]} /><meshBasicMaterial color="#9cc3ff" toneMapped={false} /></mesh>
      <Person look={LOOKS.worker} position={[0, 0.05, 0.1]} rotation={[0, Math.PI - 0.5, 0]} pose={{ sit: 1, armL: 1.2 + 0.1 * Math.sin(t * 12), armR: 1.2 + 0.1 * Math.sin(t * 12 + 2), head: -0.4, blink: blink(t, 4), mood: "calm" }} />
    </group>
  );
};

// =========================================================================== 3. $52 million an hour (flight over the city, then the rooftop)
export const HourScene: React.FC<{ t: number }> = ({ t }) => (t < C3_ROOF ? <Flight key="f" t={t} /> : <Roof key="r" t={t} />);
const Flight: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SCN[2][0], u = ramp(t, t0, C3_ROOF);
  const z = lerp(40, -30, u);
  useCamKeys(t, [[t0, [6, 22, 40], [0, 10, 10], 50], [C3_HOUSES, [-4, 12, 8], [0, 6, -14], 52], [C3_ROOF, [2, 18, -26], [0, 0, -50], 50]]);
  void z;
  const r = rng(9);
  const homes = useMemo(() => Array.from({ length: 48 }, (_, i) => [(i % 8) * 3.2 - 11, -36 - Math.floor(i / 8) * 3.4, r()] as const), []);
  return (
    <group>
      <color attach="background" args={["#020410"]} />
      <fog attach="fog" args={["#050818", 40, 160]} />
      <ambientLight intensity={0.15} color="#7f93d6" />
      <directionalLight position={[10, 30, 20]} intensity={0.6} color="#9db0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[400, 400]} />{M("#0b0f1a", { roughness: 0.8 })}</mesh>
      <Skyline n={110} r0={6} r1={90} seed={9} lit={(i) => ramp(t, t0 + 0.2 + (i % 40) * 0.12, t0 + 0.5 + (i % 40) * 0.12)} />
      {/* a neighbourhood of houses lighting up gold */}
      {homes.map(([x, z2, k], i) => { const on = ramp(t, C3_HOUSES + i * 0.03, C3_HOUSES + 0.2 + i * 0.03); return (
        <group key={i} position={[x, 0, z2]}>
          <Box s={[2, 1.4, 2]} c={on > 0.5 ? "#f6d38a" : "#3a3f52"} o={{ emissive: new THREE.Color("#ffb84d"), emissiveIntensity: 0.6 * on }} position={[0, 0.7, 0]} />
          <mesh position={[0, 1.75, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[1.6, 0.9, 4]} />{M(on > 0.5 ? "#c58a2c" : "#2a2f3c", { emissive: new THREE.Color("#ff9a2a"), emissiveIntensity: 0.4 * on })}</mesh>
        </group>); })}
    </group>
  );
};
const Roof: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C3_ROOF, [3.6, 2.4, 5.0], [0, 1.6, 0], 42], [SCN[2][1], [5.5, 4.5, 9.0], [0, 1.8, -4], 48]]);
  return (
    <group>
      <Sky top="#05081a" bottom="#2b2f6b" />
      <ambientLight intensity={0.18} color="#8090d0" />
      <spotLight position={[3, 6, 4]} angle={0.5} penumbra={0.7} intensity={50} color="#ffe2b0" />
      <Box s={[10, 0.4, 10]} c="#2a2e38" position={[0, -0.2, 0]} />
      {[[-4.9, 0], [4.9, 0], [0, -4.9]].map(([x, z], i) => <Box key={i} s={[x ? 0.1 : 10, 1.0, x ? 10 : 0.1]} c="#7d8aa0" o={{ transparent: true, opacity: 0.35, metalness: 0.5 }} position={[x, 0.5, z]} />)}
      <group position={[0, -60, 0]}><Skyline n={110} r0={10} r1={110} seed={9} /></group>
      <Holo text="$51,800,000" w={3.6} color="#ffcc55" position={[0, 4.0, -3]} />
      <Person look={boss} position={[0, 0, 0]} rotation={[0, 0.6, 0]} pose={{ armL: 0.1, armR: 0.1, head: -0.3, blink: blink(t, 6), mood: "calm" }} />
    </group>
  );
};

// =========================================================================== 4. $1.24 billion a day (launch, then Earth from orbit)
export const DayScene: React.FC<{ t: number }> = ({ t }) => (t < C4_ORBIT ? <Launch key="l" t={t} /> : <Orbit key="o" t={t} />);
const Rocket: React.FC<{ flame: number } & JSX.IntrinsicElements["group"]> = ({ flame, ...p }) => (
  <group {...p}>
    <mesh position={[0, 6, 0]}><cylinderGeometry args={[0.9, 0.9, 12, 32]} />{M("#e8eaee", { metalness: 0.5, roughness: 0.3 })}</mesh>
    <mesh position={[0, 13.2, 0]}><coneGeometry args={[0.9, 2.4, 32]} />{M("#e8eaee", { metalness: 0.5, roughness: 0.3 })}</mesh>
    <Box s={[1.84, 0.4, 1.84]} c="#1a1c22" position={[0, 9, 0]} />
    {[0, 1, 2, 3].map((k) => <mesh key={k} position={[Math.cos(k * Math.PI / 2) * 1.0, 0.8, Math.sin(k * Math.PI / 2) * 1.0]} rotation={[0, -k * Math.PI / 2, 0]}><boxGeometry args={[0.6, 1.6, 0.08]} />{M("#1a1c22")}</mesh>)}
    {flame > 0 && <>
      <mesh position={[0, -2 * flame, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.8, 4 * flame, 24]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} transparent opacity={0.9} /></mesh>
      <Glow color="#ffb347" size={9 * flame} opacity={0.9} position={[0, -1, 0]} />
    </>}
  </group>
);
const Launch: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SCN[3][0], lift = Math.pow(ramp(t, t0 + 0.4, C4_ORBIT), 2) * 30;
  useCamKeys(t, [[t0, [14, 4, 22], [0, 7, 0], 44], [C4_ORBIT, [12, 9, 26], [0, 10 + lift * 0.6, 0], 46]]);
  const r = rng(12);
  const smoke = useMemo(() => Array.from({ length: 30 }, () => [r(), r(), r()]), []);
  return (
    <group>
      <Sky top="#2b3f7a" bottom="#ffb070" />
      <ambientLight intensity={0.4} color="#ffd8b0" />
      <directionalLight position={[-20, 6, 10]} intensity={2.2} color="#ffb070" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[400, 400]} />{M("#4a4036")}</mesh>
      <Box s={[8, 1, 8]} c="#5d5a55" position={[0, 0.5, 0]} />
      <Box s={[1.2, 18, 1.2]} c="#7a2a1a" position={[-3.5, 9, 0]} />
      <Rocket flame={0.6 + 0.4 * Math.abs(Math.sin(t * 30))} position={[0, 1 + lift, 0]} />
      {smoke.map(([a, b, c], i) => { const k = clamp((t - t0 - 0.3 - c * 0.6) / 2); return k > 0 ? <Glow key={i} color="#d9d2c8" size={3 + k * 9} opacity={0.5 * (1 - k)} position={[(a - 0.5) * 16 * k, 1 + b * 3 * k, (b - 0.5) * 10 * k]} /> : null; })}
    </group>
  );
};
const Orbit: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, C4_ORBIT, SCN[3][1]);
  const ang = lerp(-0.4, 0.5, u);
  useCamKeys(t, [[C4_ORBIT, [Math.sin(-0.3) * 13, 2.5, Math.cos(-0.3) * 13], [0, 0.2, 0], 44], [SCN[3][1], [Math.sin(0.4) * 11.5, 3.2, Math.cos(0.4) * 11.5], [0, 0.3, 0], 44]]);
  const earth = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 1024; c.height = 512; const g = c.getContext("2d")!;
    g.fillStyle = "#1f5fa8"; g.fillRect(0, 0, 1024, 512);
    const r = rng(21);
    for (let i = 0; i < 26; i++) { g.fillStyle = ["#3f7d3a", "#6a8f3e", "#a08a5a"][i % 3]; g.beginPath(); const x = r() * 1024, y = 90 + r() * 330; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.28, rr = 30 + r() * 70; g.lineTo(x + Math.cos(a) * rr * 1.6, y + Math.sin(a) * rr); } g.fill(); }
    g.fillStyle = "#e8f0f8"; g.fillRect(0, 0, 1024, 30); g.fillRect(0, 482, 1024, 30);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }, []);
  void ang;
  return (
    <group>
      <color attach="background" args={["#000005"]} />
      {Array.from({ length: 200 }, (_, i) => <mesh key={i} position={[Math.sin(i * 12.9) * 60, Math.cos(i * 7.3) * 40, -40 - (i % 7) * 5]}><sphereGeometry args={[0.06, 4, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      <ambientLight intensity={0.03} />
      <directionalLight position={[Math.cos(t * 0.5) * 10, 2, Math.sin(t * 0.5) * 10]} intensity={3} color="#fff3e0" />
      <group rotation={[0.4, t * 0.15, 0]}>
        <mesh scale={0.7}><sphereGeometry args={[3, 64, 48]} /><meshStandardMaterial map={earth} roughness={0.8} /></mesh>
      </group>
      <mesh scale={0.73}><sphereGeometry args={[3, 48, 32]} /><meshBasicMaterial color="#6fb6ff" transparent opacity={0.12} side={THREE.BackSide} toneMapped={false} /></mesh>
      {/* 24 hour icons on a ring, lighting up one by one */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2, on = ramp(t, C4_ORBIT + i * 0.22, C4_ORBIT + 0.15 + i * 0.22);
        return <group key={i} position={[Math.cos(a) * 4.6, 0.4 + Math.sin(a) * 0.6, Math.sin(a) * 4.6]}>
          <mesh rotation={[0, -a + Math.PI / 2, 0]}><circleGeometry args={[0.22, 24]} /><meshBasicMaterial color={on > 0.5 ? "#ffd27a" : "#2a3350"} toneMapped={false} side={THREE.DoubleSide} /></mesh>
          {on > 0.5 && <Glow color="#ffc35a" size={0.9} opacity={0.6} />}
        </group>;
      })}
    </group>
  );
};

// =========================================================================== 5. $38 billion a month (calendar, then the command centre)
export const MonthScene: React.FC<{ t: number }> = ({ t }) => (t < C5_COMMAND ? <Calendar key="c" t={t} /> : <Command key="m" t={t} />);
const Calendar: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SCN[4][0], u = ramp(t, t0 + 0.2, C5_COMMAND - 0.3), day = Math.min(30, 1 + Math.floor(u * 30)), flip = (u * 30) % 1;
  useCamKeys(t, [[t0, [0.8, 0.4, 6.5], [0, 0.2, 0], 40], [C5_COMMAND, [-0.6, 0.2, 4.6], [0, 0.2, 0], 40]]);
  return (
    <group>
      <color attach="background" args={["#020208"]} />
      {Array.from({ length: 150 }, (_, i) => <mesh key={i} position={[Math.sin(i * 12.9) * 40, Math.cos(i * 7.3) * 30, -30 - (i % 5) * 4]}><sphereGeometry args={[0.05, 4, 4]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 2, 4]} intensity={8} distance={12} color="#cfe3ff" />
      <group rotation={[0, 0.15 * Math.sin(t), 0]}>
        <Box s={[2.6, 3.0, 0.1]} c="#e9eef5" position={[0, 0, 0]} />
        <Box s={[2.6, 0.6, 0.12]} c="#c0392b" position={[0, 1.2, 0.01]} />
        <Label text="MONTH" h={0.32} color="#ffffff" position={[0, 1.2, 0.08]} />
        <Label text={String(day)} h={1.5} color="#14161c" position={[0, -0.2, 0.06]} />
        {flip < 0.6 && day < 30 && <group position={[0, 0.9, 0.08]} rotation={[-Math.PI * (flip / 0.6), 0, 0]}><mesh position={[0, -1.1, 0]}><planeGeometry args={[2.6, 2.2]} /><meshStandardMaterial color="#f6f8fb" side={THREE.DoubleSide} /></mesh></group>}
      </group>
      <Glow color="#7fb2ff" size={7} opacity={0.3} position={[0, 0, -1]} />
    </group>
  );
};
const Command: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C5_COMMAND, [3.6, 2.4, 6.0], [0, 1.4, 0], 44], [SCN[4][1], [-3.2, 2.0, 5.2], [0, 1.6, -1], 44]]);
  const line = useMemo(() => new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => new THREE.Vector3(-1.4 + i * 0.12, 0.2 * Math.sin(i * 0.8) + i * 0.04 - (i > 16 ? (i - 16) * 0.05 : 0), 0))), []);
  return (
    <group>
      <color attach="background" args={["#03060f"]} />
      <ambientLight intensity={0.2} color="#7f9cff" />
      <spotLight position={[0, 6, 3]} angle={0.7} penumbra={0.6} intensity={40} color="#cfe3ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#0e1220", { metalness: 0.6, roughness: 0.25 })}</mesh>
      {Array.from({ length: 8 }, (_, i) => <Box key={i} s={[0.05, 0.005, 20]} c="#1e3a6e" o={{ emissive: new THREE.Color("#1e6ad8"), emissiveIntensity: 0.6 }} position={[-7 + i * 2, 0.003, 0]} />)}
      {/* generic electric car */}
      <group position={[-2.4, 0, 0.6]} rotation={[0, 0.7, 0]}>
        <Box s={[1.9, 0.5, 4.4]} c="#c8ccd4" o={{ metalness: 0.8, roughness: 0.2 }} position={[0, 0.55, 0]} />
        <mesh position={[0, 0.95, -0.2]} scale={[0.9, 0.42, 1.7]}><sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#1b2430" metalness={0.8} roughness={0.1} /></mesh>
        {[[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]].map(([x, z], i) => <mesh key={i} position={[x, 0.36, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.36, 0.36, 0.24, 28]} />{M("#111")}</mesh>)}
      </group>
      <group position={[2.6, 0, -1.2]} scale={0.22}><Rocket flame={0} /></group>
      {/* holographic charts: a stock line and a pie of holdings */}
      <group position={[0, 2.6, -2.2]}>
        <mesh><planeGeometry args={[3.2, 1.6]} /><meshBasicMaterial color="#5ee7ff" transparent opacity={0.08} toneMapped={false} /></mesh>
        <mesh><tubeGeometry args={[line, 80, 0.025, 8, false]} /><meshBasicMaterial color="#5ee7ff" toneMapped={false} /></mesh>
        <Label text="SHARE PRICES" h={0.16} color="#bff4ff" position={[0, 0.65, 0.01]} />
      </group>
      <group position={[1.6, 1.2, -0.4]} rotation={[-0.5, 0, 0]}>
        {[["#5ee7ff", 0, 2.4], ["#ffcc55", 2.4, 1.9], ["#a78bfa", 4.3, 1.98]].map(([c, a, l], i) => <mesh key={i}><circleGeometry args={[0.55, 40, a as number, l as number]} /><meshBasicMaterial color={c as string} transparent opacity={0.7} toneMapped={false} side={THREE.DoubleSide} /></mesh>)}
      </group>
      <Person look={boss} position={[0, 0, 1.0]} rotation={[0, -0.2 + 0.3 * ramp(t, C5_COMMAND, SCN[4][1]), 0]} pose={{ armL: 0.1, armR: 0.6, head: 0.2, blink: blink(t, 8), mood: "calm" }} />
    </group>
  );
};

// =========================================================================== 6. the $454 billion reveal and the twist
export const YearScene: React.FC<{ t: number }> = ({ t }) => {
  const t0 = SCN[5][0];
  const a = lerp(-0.5, 0.6, smooth(ramp(t, t0, C6_TWIST)));
  const push = smooth(ramp(t, C6_TWIST, 59.6));
  useCamKeys(t, [[t0, [Math.sin(a) * 6, 1.7, Math.cos(a) * 6], [0, 2.2, -1], 44], [C6_TWIST, [Math.sin(0.6) * 5.2, 1.8, Math.cos(0.6) * 5.2], [0, 2.3, -1], 44], [60, [lerp(2.9, 1.0, push), 1.9, lerp(4.3, 2.6, push)], [0, 2.1, -1], 42]]);
  const frozen = t >= C6_TWIST;
  const tf = frozen ? C6_TWIST : t;
  const red = ramp(t, C6_TWIST + 0.9, C6_TWIST + 1.4);
  const morph = ramp(t, C6_TWIST + 0.3, C6_TWIST + 1.2);
  const r = rng(31);
  const rain = useMemo(() => Array.from({ length: 50 }, () => [r(), r(), r()]), []);
  return (
    <group>
      <color attach="background" args={["#020309"]} />
      <ambientLight intensity={0.12} />
      <spotLight position={[0, 6, 4]} angle={0.5} penumbra={0.7} intensity={50} color={red > 0.5 ? "#ffb4b4" : "#ffe2b0"} />
      <pointLight position={[0, 3.5, -3]} intensity={14} distance={10} color={red > 0.5 ? "#ff3b3b" : "#ffcc55"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#0b0d14", { metalness: 0.6, roughness: 0.2 })}</mesh>
      <Holo text={red > 0.5 ? "−$7.24B" : "+$454B"} w={5.2} color={red > 0.5 ? "#ff4057" : "#ffcc55"} position={[0, 3.6, -3.2]} />
      {/* falling bills freeze at the twist, then turn into chart bars */}
      {rain.map(([x, y, k], i) => {
        const fall = ((tf * (0.5 + k * 0.5) + y) % 1);
        const p: V3 = [(x - 0.5) * 7, 5.5 - fall * 5.5, -2 + k * 3];
        return morph < 0.5
          ? <mesh key={i} position={p} rotation={[tf * 2 + i, tf + i, 0]}><planeGeometry args={[0.3, 0.13]} /><meshStandardMaterial color="#8fcf8a" side={THREE.DoubleSide} /></mesh>
          : <mesh key={i} position={[p[0], p[1], p[2]]}><boxGeometry args={[0.12, 0.2 + k * 0.8, 0.12]} /><meshBasicMaterial color={i % 3 ? "#5ee7ff" : "#ff4057"} toneMapped={false} /></mesh>;
      })}
      {morph > 0.5 && <Sign text="SHARES  ·  STOCK PRICES  ·  COMPANY VALUES" w={3.4} h={0.36} bg="#0b1a2e" fg="#bff4ff" position={[0, 1.4, -2.6]} />}
      <Person look={boss} position={[0, 0, 0.3]} rotation={[0, 0.2, 0]} pose={{ armL: 0.12, armR: 0.12, head: frozen ? 0.25 : 0.1 * Math.sin(t), blink: frozen ? 0 : blink(t, 3), mood: red > 0.5 ? "nervous" : "calm" }} />
    </group>
  );
};
