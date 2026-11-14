// "Your Life Could Be Completely Different in 10 Years": scenes. Each places its own camera from global time t.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Bill, Coin, Coins, Person, Pose, Look } from "./Actors";
import { Box, Glow, Label, M, Sign, Sky, Stack, Tree, V3, mix3, useCamKeys, walkPose } from "./Kit";
import { COL, E, S, SCN, blink, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth, backOut } from "./timeline";
import { company, tex, tower, wood } from "./textures";

// ---- Daniel: one look at 18, the same man at 28 (stubble, slightly fuller build, red work jacket after the time jump)
export const DANIEL18: Look = { hoodie: "#dc2626", hair: "#1c1410", hairStyle: 0, pants: "#111827", skin: "#e2b08c" };
export const DANIEL28: Look = { hoodie: "#b91c1c", hair: "#1c1410", hairStyle: 1, pants: "#111827", skin: "#e2b08c", beard: 0.9 };
const danielAt = (age: number): Look => ({ ...DANIEL18, hoodie: age >= 23 ? DANIEL28.hoodie : DANIEL18.hoodie, hairStyle: age >= 23 ? 1 : 0, beard: clamp((age - 20) / 8) * 0.9 });
const danielScale = (age: number) => lerp(0.93, 1.0, clamp((age - 18) / 6));
const EMP: Look = { hoodie: "#dc2626", hair: "#5b3a1e", hairStyle: 2, pants: "#334155", skin: "#c98f68" };   // his first employee, same team colour

// sub-scene cuts (between sentences)
export const CLOCK_AT = (E(0) + S(1)) / 2, SPLIT_AT = S(1) + 1.55;
export const RESEARCH_AT = S(3) + 2.0, DRIVEWAY_AT = S(3) + 4.6;
export const CHART_AT = S(4) + 2.6;
export const CUSTOMERS_AT = (E(7) + S(8)) / 2, TEAM_AT = S(8) + 2.8;
export const MONTAGE_AT = (E(9) + S(10)) / 2;
export const PULLBACK_AT = (E(11) + S(12)) / 2;

// =========================================================================== shared pieces
const Car: React.FC<JSX.IntrinsicElements["group"] & { color?: string; shine?: number }> = ({ color = "#2563eb", shine = 0, ...p }) => (
  <group {...p}>
    <Box s={[2.0, 0.5, 1.0]} c={color} o={{ metalness: 0.5, roughness: lerp(0.55, 0.12, shine) }} position={[0, 0.45, 0]} />
    <Box s={[1.1, 0.45, 0.92]} c={color} o={{ metalness: 0.5, roughness: lerp(0.55, 0.12, shine) }} position={[-0.1, 0.9, 0]} />
    <Box s={[1.0, 0.34, 0.94]} c="#bae6fd" o={{ roughness: 0.1 }} position={[-0.1, 0.92, 0]} />
    {[[-0.65, 0.5], [0.65, 0.5], [-0.65, -0.5], [0.65, -0.5]].map(([x, z], i) => <mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.16, 18]} />{M("#111827")}</mesh>)}
    {[0.5, -0.5].map((z) => <mesh key={z} position={[1.0, 0.5, z * 0.7]}><boxGeometry args={[0.02, 0.1, 0.2]} /><meshBasicMaterial color="#fff7cc" toneMapped={false} /></mesh>)}
    {shine > 0.5 && <Glow color="#ffffff" size={0.5} opacity={0.8 * shine} position={[0.4, 1.05, 0.5]} />}
  </group>
);
const Van: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <Box s={[2.8, 1.3, 1.25]} c="#f8fafc" o={{ metalness: 0.3, roughness: 0.3 }} position={[0, 0.95, 0]} />
    <Box s={[0.8, 0.9, 1.2]} c="#f8fafc" o={{ metalness: 0.3, roughness: 0.3 }} position={[1.75, 0.75, 0]} />
    <Box s={[0.5, 0.45, 1.22]} c="#bae6fd" o={{ roughness: 0.1 }} position={[1.85, 1.0, 0]} />
    <Sign text="DANIEL'S CAR CARE" w={2.4} h={0.42} bg="#dc2626" fg="#ffffff" position={[-0.1, 1.05, 0.63]} />
    {[[-0.9, 0.62], [1.4, 0.62], [-0.9, -0.62], [1.4, -0.62]].map(([x, z], i) => <mesh key={i} position={[x, 0.28, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, 0.18, 18]} />{M("#111827")}</mesh>)}
  </group>
);
const Bucket: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.22, 0.17, 0.4, 20, 1, true]} />{M("#2563eb", { side: THREE.DoubleSide })}</mesh>
    <mesh position={[0, 0.36, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.2, 20]} /><meshStandardMaterial color="#f8fafc" roughness={0.9} /></mesh>
    <mesh position={[0, 0.45, 0]}><torusGeometry args={[0.2, 0.012, 6, 20, Math.PI]} />{M("#94a3b8")}</mesh>
  </group>
);
const Jar: React.FC<{ fill: number; label?: string } & JSX.IntrinsicElements["group"]> = ({ fill, label = "SAVINGS", ...p }) => (
  <group {...p}>
    <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.24, 0.24, 0.6, 24, 1, true]} /><meshPhysicalMaterial color="#e0f2fe" transparent opacity={0.3} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh position={[0, 0.63, 0]}><cylinderGeometry args={[0.2, 0.2, 0.06, 24]} />{M("#b45309")}</mesh>
    {fill > 0 && <mesh position={[0, 0.02 + 0.27 * fill, 0]}><cylinderGeometry args={[0.22, 0.22, 0.54 * fill, 24]} />{M("#4ade80", { roughness: 0.8 })}</mesh>}
    <Label text={label} h={0.12} color="#1e293b" position={[0, 0.48, 0.25]} />
  </group>
);
/** suds: little white foam balls on a surface */
const Suds: React.FC<{ n: number; t: number; seed?: number } & JSX.IntrinsicElements["group"]> = ({ n, t, seed = 1, ...p }) => {
  const r = useMemo(() => { const g = rng(seed); return Array.from({ length: n }, () => [g(), g(), g()]); }, [n, seed]);
  return <group {...p}>{r.map(([a, b, c], i) => <mesh key={i} position={[(a - 0.5) * 1.4, (b - 0.5) * 0.5, 0]} scale={0.04 + 0.04 * c * (0.8 + 0.2 * Math.sin(t * 3 + i))}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.9} /></mesh>)}</group>;
};
/** small bedroom: bed, desk + laptop, poster, window */
const Bedroom: React.FC<{ t: number; evening?: number }> = ({ t, evening = 0 }) => {
  const floor = useMemo(() => wood(), []);
  return (
    <group>
      <color attach="background" args={["#1e293b"]} />
      <hemisphereLight args={["#ffffff", "#8a7a6a", 0.7]} />
      <directionalLight position={[-3, 4, 3]} intensity={1.6} color={evening ? "#ffb070" : "#fff3e0"} />
      <pointLight position={[1.4, 2.0, 0.4]} intensity={2} distance={5} color="#ffd9a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} /><meshStandardMaterial map={floor} roughness={0.75} /></mesh>
      <Box s={[10, 5, 0.2]} c="#475569" position={[0, 2.5, -2.2]} />
      <Box s={[0.2, 5, 10]} c="#3f4b5e" position={[-2.6, 2.5, 0]} />
      <Box s={[1.4, 1.1, 0.05]} c={evening ? "#fdba74" : "#bae6fd"} o={{ emissive: new THREE.Color(evening ? "#f97316" : "#7dd3fc"), emissiveIntensity: 0.7 }} position={[-1.2, 2.3, -2.08]} />
      <Box s={[0.7, 0.95, 0.04]} c="#dc2626" position={[0.9, 2.5, -2.08]} />
      <Label text="DREAM" h={0.2} color="#ffffff" position={[0.9, 2.6, -2.05]} />
      <Label text="BIG" h={0.2} color="#fde68a" position={[0.9, 2.35, -2.05]} />
      {/* bed */}
      <Box s={[1.4, 0.4, 2.2]} c="#334155" position={[-1.7, 0.2, -0.9]} />
      <Box s={[1.4, 0.15, 2.1]} c="#e2e8f0" position={[-1.7, 0.47, -0.9]} />
      <Box s={[0.9, 0.12, 0.45]} c="#f8fafc" position={[-1.7, 0.6, -1.7]} />
      {/* desk + laptop + books */}
      <Box s={[1.6, 0.06, 0.7]} c="#a16207" position={[1.4, 0.76, -1.6]} />
      {[[0.7, -1.9], [2.1, -1.9], [0.7, -1.3], [2.1, -1.3]].map(([x, z], i) => <Box key={i} s={[0.05, 0.76, 0.05]} c="#713f12" position={[x, 0.38, z]} />)}
      <group position={[1.3, 0.8, -1.6]}>
        <Box s={[0.6, 0.02, 0.4]} c="#94a3b8" />
        <group position={[0, 0.2, -0.2]} rotation={[-0.25, 0, 0]}><Box s={[0.6, 0.4, 0.02]} c="#334155" />
          <mesh position={[0, 0, 0.012]}><planeGeometry args={[0.55, 0.35]} /><meshBasicMaterial color={new THREE.Color("#38bdf8").multiplyScalar(1.2)} toneMapped={false} /></mesh></group>
      </group>
      {[["INVESTING 101", "#16a34a"], ["SMALL BUSINESS", "#2563eb"]].map(([tx, c], i) => (
        <group key={tx} position={[1.95, 0.83 + i * 0.07, -1.5]} rotation={[0, 0.2, 0]}><Box s={[0.4, 0.06, 0.28]} c={c} /><Label text={tx} h={0.045} color="#ffffff" position={[0, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} /></group>
      ))}
    </group>
  );
};
/** a suburban driveway for the car-care business */
const Driveway: React.FC<{ rain?: number; t?: number; sunrise?: number }> = ({ rain = 0, t = 0, sunrise = 0 }) => {
  const drops = useMemo(() => { const g = rng(4); return Array.from({ length: 120 }, () => [g(), g(), g()]); }, []);
  return (
    <group>
      <Sky top={rain ? "#64748b" : sunrise ? "#f59e0b" : "#5fb6ff"} bottom={rain ? "#94a3b8" : sunrise ? "#ffe4c4" : "#e0f2fe"} />
      <hemisphereLight args={[rain ? "#cbd5e1" : "#e0f2ff", "#5a8a4a", rain ? 0.6 : 0.8]} />
      <directionalLight position={[6, 8, 5]} intensity={rain ? 0.8 : 2.3} color={sunrise ? "#ffc58a" : "#fff4e0"} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} />{M(COL.grass, { roughness: 0.95 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.4]}><planeGeometry args={[5, 6]} />{M(rain ? "#71717a" : "#a8a29e", { roughness: rain ? 0.2 : 0.9 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 4.2]}><planeGeometry args={[60, 2.4]} />{M(COL.road, { roughness: 0.9 })}</mesh>
      {/* his parents' house + garage */}
      <group position={[0, 0, -3.2]}>
        <Box s={[6, 2.6, 2.6]} c="#fde68a" position={[-0.6, 1.3, 0]} />
        <mesh position={[-0.6, 3.0, 0]} rotation={[0, Math.PI / 4, 0]}><coneGeometry args={[4.4, 1.2, 4]} />{M("#9a3412")}</mesh>
        <Box s={[2.4, 1.9, 0.06]} c="#e5e7eb" position={[0.8, 0.95, 1.31]} />
        {[0, 1, 2, 3].map((k) => <Box key={k} s={[2.4, 0.03, 0.07]} c="#cbd5e1" position={[0.8, 0.3 + k * 0.45, 1.33]} />)}
        <Box s={[0.7, 1.4, 0.05]} c="#1d4ed8" position={[-2.2, 0.7, 1.31]} />
      </group>
      {[[-5, -1, 0], [5, -2, 1], [-6, 2.5, 2]].map(([x, z, k], i) => <Tree key={i} position={[x, 0, z]} k={k} />)}
      {rain > 0 && drops.map(([a, b, c], i) => (
        <mesh key={i} position={[(a - 0.5) * 10, 4 - ((t * 9 + c * 4) % 4), (b - 0.5) * 8 + 1]}><boxGeometry args={[0.01, 0.35, 0.01]} /><meshBasicMaterial color="#cbd5e1" transparent opacity={0.6 * rain} /></mesh>
      ))}
    </group>
  );
};

// =========================================================================== 1. two possible futures (0 - 7.9 s)
export const FuturesScene: React.FC<{ t: number }> = ({ t }) => (t < CLOCK_AT ? <Phone key="ph" t={t} /> : t < SPLIT_AT ? <Clock key="clk" t={t} /> : <Split key="split" t={t} />);
const Phone: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[0, [1.6, 2.0, 4.6], [-1.0, 1.0, -0.8], 42], [CLOCK_AT, [0.9, 1.6, 3.2], [-1.2, 1.05, -0.7], 38]]);
  return (
    <group>
      <Bedroom t={t} evening={1} />
      <Person position={[-1.4, 0.15, -0.6]} rotation={[0, 0.6, 0]} scale={0.93} look={DANIEL18}
        pose={{ sit: 1, armR: 1.3, armL: 1.25, mood: "calm", blink: blink(t, 1), tilt: 0.06, head: 0.1 * Math.sin(t * 0.8) }} />
      <group position={[-1.12, 1.12, -0.12]} rotation={[-0.7, 0.6, 0]}>
        <Box s={[0.12, 0.22, 0.015]} c="#111827" />
        <mesh position={[0, 0, 0.009]}><planeGeometry args={[0.105, 0.2]} /><meshBasicMaterial color={new THREE.Color("#93c5fd").multiplyScalar(1.4)} toneMapped={false} /></mesh>
      </group>
    </group>
  );
};
const Clock: React.FC<{ t: number }> = ({ t }) => {
  const u = (t - CLOCK_AT) / (SPLIT_AT - CLOCK_AT);
  useCamKeys(t, [[CLOCK_AT, [0, 0, 6.5], [0, 0, 0], 40], [SPLIT_AT, [0, 0, 3.4], [0, 0, 0], 48]], 0.3 * u);
  const spin = easeIn(u) * 60;
  return (
    <group>
      <color attach="background" args={["#0b1020"]} />
      <ambientLight intensity={0.5} />
      <mesh><torusGeometry args={[1.5, 0.08, 16, 80]} /><meshBasicMaterial color={new THREE.Color(COL.gold).multiplyScalar(2)} toneMapped={false} /></mesh>
      <mesh position={[0, 0, -0.05]}><circleGeometry args={[1.45, 64]} /><meshBasicMaterial color="#111a33" /></mesh>
      {Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return <mesh key={k} position={[Math.sin(a) * 1.25, Math.cos(a) * 1.25, 0]} rotation={[0, 0, -a]}><boxGeometry args={[0.04, 0.16, 0.02]} /><meshBasicMaterial color="#fde68a" toneMapped={false} /></mesh>; })}
      <mesh rotation={[0, 0, -spin]} position={[0, 0, 0.02]}><boxGeometry args={[0.05, 2.2, 0.02]} /><meshBasicMaterial color={new THREE.Color("#ffffff").multiplyScalar(1.5)} toneMapped={false} /></mesh>
      <mesh rotation={[0, 0, -spin / 12]} position={[0, 0, 0.03]}><boxGeometry args={[0.08, 1.4, 0.02]} /><meshBasicMaterial color={new THREE.Color(COL.gold).multiplyScalar(1.6)} toneMapped={false} /></mesh>
      <Glow color={COL.gold} size={6} opacity={0.35 + 0.3 * u} />
      {Array.from({ length: 40 }, (_, k) => { const a = k * 2.4 + t * 2, r = 1.8 + ((k * 0.37 + t * 1.5) % 2.2); return <mesh key={k} position={[Math.cos(a) * r, Math.sin(a) * r, -0.5]}><sphereGeometry args={[0.025, 6, 4]} /><meshBasicMaterial color="#fde68a" toneMapped={false} /></mesh>; })}
    </group>
  );
};
const Split: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SPLIT_AT, [0, 1.6, 7.6], [0, 1.1, 0], 42], [SCN[0][1], [0, 1.55, 7.0], [0, 1.1, 0], 42]]);
  return (
    <group>
      <color attach="background" args={["#0b1020"]} />
      <hemisphereLight args={["#ffffff", "#334155", 0.7]} />
      {/* left: still struggling (cold, grey) */}
      <group position={[-1.35, 0, 0]}>
        <pointLight position={[0, 2.4, 1.5]} intensity={3} distance={5} color="#93c5fd" />
        <Box s={[2.5, 0.05, 2.6]} c="#475569" position={[0, 0.02, 0]} />
        <Box s={[2.5, 3.2, 0.1]} c="#334155" position={[0, 1.6, -1.25]} />
        <Person position={[0, 0, 0.1]} look={DANIEL28} scale={1.0} rotation={[0, 0.3, 0]} pose={{ mood: "nervous", sweat: 0.6, armR: 0.9, blink: blink(t, 2), head: -0.2, tilt: 0.1 }} />
        {[0, 1, 2].map((k) => <mesh key={k} position={[0.55 + k * 0.08, 0.06 + k * 0.012, 0.7]} rotation={[-Math.PI / 2, 0, 0.3 * k]}><planeGeometry args={[0.35, 0.45]} />{M(k ? "#fecaca" : "#fca5a5")}</mesh>)}
        <Label text="DUE" h={0.12} color="#991b1b" position={[0.62, 0.1, 0.72]} rotation={[-Math.PI / 2, 0, 0.6]} />
        <Jar fill={0.05} position={[-0.75, 0.05, 0.5]} />
      </group>
      {/* divider */}
      <mesh position={[0, 1.8, 0.3]}><planeGeometry args={[0.025, 4]} /><meshBasicMaterial color={new THREE.Color(COL.gold).multiplyScalar(2)} toneMapped={false} /></mesh>
      {/* right: savings and a growing small business (warm) */}
      <group position={[1.35, 0, 0]}>
        <pointLight position={[0, 2.4, 1.5]} intensity={5} distance={5} color="#ffd59a" />
        <Box s={[2.5, 0.05, 2.6]} c="#a8a29e" position={[0, 0.02, 0]} />
        <Van position={[0.2, 0, -0.9]} scale={0.62} />
        <Person position={[-0.3, 0, 0.3]} look={DANIEL28} scale={1.0} rotation={[0, -0.2, 0]} pose={{ mood: "smile", armR: 0.2 + 2.2 * smooth(ramp(t, SPLIT_AT + 0.6, SPLIT_AT + 1.1)), blink: blink(t, 4) }} />
        <Jar fill={0.85} position={[0.75, 0.05, 0.6]} />
      </group>
    </group>
  );
};

// =========================================================================== 2. starting small (7.9 - 16.7 s)
export const StartScene: React.FC<{ t: number }> = ({ t }) => (t < RESEARCH_AT ? <Paycheck key="pay" t={t} /> : t < DRIVEWAY_AT ? <Research key="res" t={t} /> : <Setup key="set" t={t} />);
const Paycheck: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[1][0], [1.4, 1.9, 4.4], [-0.2, 1.1, -0.9], 42], [RESEARCH_AT, [1.0, 1.7, 3.6], [-0.1, 1.1, -0.9], 40]]);
  const put = smooth(ramp(t, S(3) + 0.3, S(3) + 1.3));
  return (
    <group>
      <Bedroom t={t} />
      <Person position={[-0.7, 0, -0.6]} rotation={[0, 0.5, 0]} scale={0.93} look={DANIEL18}
        pose={{ armR: 0.6 + 0.9 * pulse(t, S(3) + 0.2, 1.2), armL: 0.9, mood: t > S(3) + 1.3 ? "smile" : "calm", blink: blink(t, 1), head: -0.25 }} />
      {/* paycheck envelope; one $100 goes in the savings jar */}
      <group position={[-0.25, 0.95, -0.25]} rotation={[0, 0.4, 0.1]}><Box s={[0.32, 0.2, 0.02]} c="#f5f5f4" /><Label text="PAYCHECK" h={0.05} color="#334155" position={[0, 0.03, 0.012]} /></group>
      <Jar fill={0.15 * put} position={[0.35, 0.8, -1.35]} />
      <Box s={[0.6, 0.8, 0.4]} c="#78350f" position={[0.35, 0.4, -1.35]} />
      {put > 0 && put < 1 && <Bill position={mix3([-0.2, 1.0, -0.3], [0.35, 1.45, -1.35], put)} rotation={[0.3, put * 3, 0.2]} scale={0.6} glow={0.4} />}
    </group>
  );
};
const Research: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[RESEARCH_AT, [5.8, 2.1, 0.2], [1.4, 1.0, -1.3], 40], [DRIVEWAY_AT, [5.2, 1.9, -0.1], [1.4, 1.0, -1.3], 38]]);
  return (
    <group>
      <Bedroom t={t} />
      <Box s={[0.5, 0.45, 0.5]} c="#1f2937" position={[1.3, 0.23, -0.95]} />
      <Person position={[1.3, 0.05, -0.95]} rotation={[0, Math.PI, 0]} scale={0.93} look={DANIEL18}
        pose={{ sit: 1, armR: 1.35 + 0.06 * Math.sin(t * 14), armL: 1.35 + 0.06 * Math.sin(t * 14 + 1.5), mood: "calm", blink: blink(t, 2), head: 0.15 * Math.sin(t * 1.4) }} />
    </group>
  );
};
const Setup: React.FC<{ t: number }> = ({ t }) => {
  const walk = smooth(ramp(t, DRIVEWAY_AT, DRIVEWAY_AT + 1.4));
  useCamKeys(t, [[DRIVEWAY_AT, [3.4, 2.2, 6.0], [0.0, 0.9, 0.6], 42], [SCN[1][1], [2.8, 2.0, 5.2], [0.0, 0.9, 0.6], 40]]);
  return (
    <group>
      <Driveway />
      <Person position={[lerp(-1.6, -0.6, walk), 0, 0.6]} rotation={[0, 1.2, 0]} scale={0.93} look={DANIEL18}
        pose={{ ...(walk < 1 ? walkPose(t) : {}), armR: walk >= 1 ? 1.2 : 0.4, mood: "smile", blink: blink(t, 3) }} />
      <Bucket position={[0.2, 0, 0.9]} />
      <group position={[1.1, 0, 1.2]} rotation={[0, -0.4, 0]}>
        <Box s={[0.05, 0.9, 0.05]} c="#78350f" position={[0, 0.45, 0]} />
        <Sign text="CAR CLEANING $50" w={1.0} h={0.35} bg="#fef3c7" fg="#b91c1c" position={[0, 0.95, 0.03]} />
      </group>
      <mesh position={[-0.2, 0.05, 1.1]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[0.25, 0.03, 8, 24]} />{M("#16a34a")}</mesh>
    </group>
  );
};

// =========================================================================== 3. the power of investing (16.7 - 27.7 s)
export const R = 0.07 / 12;
export const fv = (months: number) => 100 * (Math.pow(1 + R, months) - 1) / R;   // $100/month, 7%/yr compounded monthly
export const InvestScene: React.FC<{ t: number }> = ({ t }) => (t < CHART_AT ? <Fund key="fund" t={t} /> : <Chart key="chart" t={t} />);
const Fund: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[2][0], [0.2, 2.1, 6.0], [-0.2, 1.2, 0], 42], [CHART_AT, [-0.2, 1.9, 5.2], [-0.2, 1.25, 0], 42]]);
  const drops = Math.floor((t - SCN[2][0]) / 0.45);
  return (
    <group>
      <color attach="background" args={["#0f172a"]} />
      <hemisphereLight args={["#ffffff", "#334155", 0.8]} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#1e293b", { roughness: 0.5 })}</mesh>
      <Person position={[-1.3, 0, 0.3]} rotation={[0, 0.5, 0]} scale={0.93} look={DANIEL18} pose={{ armR: 1.3, mood: "smile", blink: blink(t, 5) }} />
      <group position={[-1.0, 1.25, 0.6]} rotation={[-0.3, 0.5, 0]}><Box s={[0.14, 0.26, 0.015]} c="#111827" />
        <mesh position={[0, 0, 0.009]}><planeGeometry args={[0.12, 0.24]} /><meshBasicMaterial color={new THREE.Color(COL.green).multiplyScalar(1.3)} toneMapped={false} /></mesh></group>
      {/* the fund: a basket holding tiny pieces of many companies (diversified) */}
      <group position={[0.9, 0.9, 0]}>
        <mesh position={[0, -0.2, 0]}><cylinderGeometry args={[0.75, 0.55, 0.6, 28, 1, true]} />{M("#b45309", { side: THREE.DoubleSide, roughness: 0.9 })}</mesh>
        <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.75, 0.05, 8, 32]} />{M("#92400e")}</mesh>
        {Array.from({ length: 10 }, (_, i) => { const a = i * 0.63; return <mesh key={i} position={[Math.cos(a) * 0.4, 0.05 + (i % 2) * 0.1, Math.sin(a) * 0.3]} rotation={[0, a, 0.1]}><boxGeometry args={[0.22, 0.22, 0.22]} /><meshStandardMaterial map={company(i)} /></mesh>; })}
        <Label text="LOW-COST INDEX FUND" h={0.16} color="#fde68a" position={[0, -0.75, 0.6]} />
      </group>
      {Array.from({ length: 4 }, (_, k) => { const n = drops - k; if (n < 0) return null; const u = ((t - SCN[2][0]) / 0.45 - n); if (u < 0 || u > 1) return null;
        return <Coin key={n} position={[0.9, lerp(2.6, 1.0, easeIn(u)), 0]} rotation={[0, u * 6, 0]} scale={0.25} />; })}
    </group>
  );
};
const YEARS = 10;
const Chart: React.FC<{ t: number }> = ({ t }) => {
  const prog = smooth(ramp(t, CHART_AT + 0.2, S(5) + 1.0));        // years 0 -> 10
  const yrs = prog * YEARS;
  useCamKeys(t, [[CHART_AT, [-1.5, 2.6, 8.0], [-0.6, 2.0, 0], 44], [S(5) + 1.0, [1.2, 3.0, 8.6], [0.6, 2.4, 0], 44], [SCN[2][1], [1.4, 3.1, 8.2], [0.6, 2.5, 0], 44]]);
  const X = (y: number) => -2.6 + y * 0.52, Y = (v: number) => v / 17308 * 4.2;
  const lineObj = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: new THREE.Color(COL.green).multiplyScalar(2), toneMapped: false })), []);
  const pts: THREE.Vector3[] = [];
  for (let m = 0; m <= yrs * 12; m += 1) pts.push(new THREE.Vector3(X(m / 12), Y(fv(m)) + 0.05, 0.3));
  if (pts.length > 1) lineObj.geometry.setFromPoints(pts);
  return (
    <group>
      <color attach="background" args={["#0f172a"]} />
      <hemisphereLight args={["#ffffff", "#334155", 0.8]} />
      <directionalLight position={[3, 5, 6]} intensity={1.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#1e293b", { roughness: 0.5 })}</mesh>
      {/* contributions: one bar per year, height = $1,200 x year */}
      {Array.from({ length: YEARS }, (_, i) => {
        const y = i + 1, show = clamp(yrs - i);
        if (show <= 0) return null;
        const h = Y(1200 * y) * easeOut(show);
        return <group key={y}>
          <mesh position={[X(y), h / 2, 0]}><boxGeometry args={[0.36, Math.max(h, 0.001), 0.36]} />{M("#3b82f6", { roughness: 0.4 })}</mesh>
          <Label text={`Y${y}`} h={0.18} color="#cbd5e1" position={[X(y), -0.18 + 0.02, 0.4]} />
        </group>;
      })}
      {/* hypothetical value at 7%: the green line on top */}
      {pts.length > 1 && <primitive object={lineObj} />}
      {pts.length > 1 && <Glow color={COL.green} size={0.7} position={pts[pts.length - 1]} />}
      <Person position={[-3.4, 0, 1.2]} rotation={[0, 0.4, 0]} scale={0.93} look={DANIEL18} pose={{ mood: prog > 0.95 ? "wow" : "smile", armR: 1.6, blink: blink(t, 6), head: 0.2 }} />
    </group>
  );
};

// =========================================================================== 4. building a business (27.7 - 38.0 s)
export const BusinessScene: React.FC<{ t: number }> = ({ t }) => (t < CUSTOMERS_AT ? <FirstCustomer key="first" t={t} /> : t < TEAM_AT ? <MoreCustomers key="more" t={t} /> : <Team key="team" t={t} />);
const FirstCustomer: React.FC<{ t: number }> = ({ t }) => {
  const paid = S(7) + 1.4;
  useCamKeys(t, [[SCN[3][0], [5.8, 2.5, 0.6], [0.4, 0.8, 0.6], 42], [S(7), [5.2, 2.2, 1.4], [0.7, 0.9, 1.0], 40], [CUSTOMERS_AT, [4.6, 2.0, 2.0], [0.8, 1.0, 1.1], 40]]);
  const pay = smooth(ramp(t, paid, paid + 0.6));
  return (
    <group>
      <Driveway />
      <Car position={[0, 0, 0]} rotation={[0, 0.15, 0]} color="#2563eb" shine={ramp(t, S(6), paid)} />
      <Suds n={26} t={t} position={[0.1, 0.75, 0.56]} />
      <Bucket position={[1.4, 0, 1.0]} />
      <Person position={[0.4, 0, 1.0]} rotation={[0, Math.PI - 0.2, 0]} scale={0.93} look={DANIEL18}
        pose={{ armR: t < paid ? 1.3 + 0.35 * Math.sin(t * 9) : 1.0, armL: 0.5, mood: t > paid ? "wow" : "smile", blink: blink(t, 2) }} />
      <Person position={[1.5, 0, 2.3]} rotation={[0, -2.2, 0]} look={{ hoodie: "#7c3aed", hair: "#6b7280", hairStyle: 1, skin: "#f1c27d" }}
        pose={{ mood: "smile", armR: t > paid - 0.3 ? 1.3 : 0.2, blink: blink(t, 6) }} />
      {pay > 0 && pay < 1 && <Bill position={mix3([1.2, 1.35, 2.0], [0.7, 1.35, 1.25], pay)} rotation={[0, -1, 0.2]} scale={0.6} glow={0.5} />}
    </group>
  );
};
const MoreCustomers: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[CUSTOMERS_AT, [0.0, 4.6, 9.5], [0.0, 0.8, 0.8], 44], [TEAM_AT, [0.8, 3.8, 8.0], [0, 0.8, 0.8], 42]]);
  const cars = Math.min(4, 1 + Math.floor((t - CUSTOMERS_AT) / 0.6));
  return (
    <group>
      <Driveway />
      {[["#2563eb", -2.4], ["#16a34a", 0.0], ["#f59e0b", 2.4], ["#e11d48", 4.8]].slice(0, cars).map(([c, x], i) => (
        <Car key={i} position={[(x as number) - 1.0, 0, i === 0 ? 0.2 : 4.0]} rotation={[0, i === 0 ? 0.15 : 0, 0]} color={c as string} />
      ))}
      <Person position={[-1.0, 0, 1.2]} rotation={[0, Math.PI - 0.3, 0]} scale={0.95} look={danielAt(20)} pose={{ armR: 1.3 + 0.35 * Math.sin(t * 9), mood: "smile", blink: blink(t, 3) }} />
      {/* reinvested in better equipment: a pressure washer */}
      <group position={[0.6, 0, 1.4]}><Box s={[0.5, 0.45, 0.35]} c="#f59e0b" position={[0, 0.3, 0]} /><mesh position={[0, 0.08, 0.2]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />{M("#111827")}</mesh></group>
      <Suds n={20} t={t} seed={3} position={[-1.1, 0.75, 0.75]} />
    </group>
  );
};
const Team: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[TEAM_AT, [2.6, 2.1, 6.4], [0.2, 1.1, 0], 42], [SCN[3][1], [1.8, 1.9, 5.4], [0.2, 1.15, 0], 40]]);
  const shake = pulse(t, S(8) + 3.6, 0.9);
  return (
    <group>
      <Driveway />
      <Van position={[0.2, 0, -1.4]} scale={0.8} />
      {/* expenses notebook on a folding table */}
      <Box s={[1.0, 0.05, 0.6]} c="#e5e7eb" position={[1.5, 0.75, 0.6]} />
      <Box s={[0.05, 0.75, 0.05]} c="#94a3b8" position={[1.5, 0.37, 0.6]} />
      <group position={[1.45, 0.79, 0.6]} rotation={[-Math.PI / 2, 0, 0.2]}><mesh><planeGeometry args={[0.4, 0.3]} />{M("#fef9c3")}</mesh><Label text="EXPENSES" h={0.05} color="#991b1b" position={[0, 0.09, 0.01]} /></group>
      <Person position={[-0.5, 0, 0.8]} rotation={[0, 0.6, 0]} scale={0.97} look={danielAt(21)} pose={{ armR: 0.5 + 0.9 * shake, mood: "smile", blink: blink(t, 1) }} />
      <Person position={[0.45, 0, 1.0]} rotation={[0, -0.7, 0]} scale={0.95} look={EMP} pose={{ armR: 0.5 + 0.9 * shake, mood: "smile", blink: blink(t, 5) }} />
    </group>
  );
};

// =========================================================================== 5. ten years of consistency (38.0 - 47.8 s)
export const MontageScene: React.FC<{ t: number }> = ({ t }) => (t < MONTAGE_AT ? <Setbacks key="bad" t={t} /> : <Years key="yrs" t={t} />);
const Setbacks: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[4][0], [2.8, 2.2, 6.0], [-0.3, 0.9, 0.6], 42], [MONTAGE_AT, [2.0, 1.9, 5.0], [-0.4, 1.0, 0.6], 40]], 0.02 * Math.sin(t * 3));
  const leave = ramp(t, S(9) + 0.3, S(9) + 2.3);
  return (
    <group>
      <Driveway rain={1} t={t} />
      <Car position={[lerp(0, 9, easeIn(leave)), 0, lerp(0.2, 4.2, smooth(leave))]} color="#16a34a" />
      <Person position={[-0.9, 0, 1.0]} rotation={[0, 0.7, 0]} look={danielAt(22)} scale={0.98} pose={{ mood: "nervous", sweat: 0.4, armR: 0.2, blink: blink(t, 2), head: 0.3, tilt: -0.08 }} />
      <Bucket position={[-0.2, 0, 1.4]} rotation={[0, 0, leave > 0.5 ? 1.4 : 0]} />
    </group>
  );
};
const Years: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, MONTAGE_AT + 0.2, SCN[4][1] - 0.3);
  const yr = 1 + Math.floor(u * 9.999);
  const age = 18 + u * 10;
  useCamKeys(t, [[MONTAGE_AT, [0, 1.9, 6.6], [0, 1.4, 0], 42], [SCN[4][1], [0.6, 1.8, 5.4], [0, 1.45, 0], 40]], 0.02);
  // mini account: dips in a downturn (years 4-5) but monthly contributions keep going
  const acct = (y: number) => fv(y * 12) * (y > 3.6 && y < 5.4 ? 1 - 0.22 * Math.sin((y - 3.6) / 1.8 * Math.PI) : 1);
  const bars = Math.floor(u * 10);
  return (
    <group>
      <color attach="background" args={["#111827"]} />
      <hemisphereLight args={["#ffffff", "#334155", 0.8]} />
      <directionalLight position={[3, 5, 5]} intensity={1.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#1f2937", { roughness: 0.5 })}</mesh>
      {/* calendar flipping years */}
      <group position={[-1.6, 2.7, -0.6]}>
        <mesh><planeGeometry args={[1.1, 1.0]} /><meshBasicMaterial map={tex("cal" + yr, 256, 232, (g, w, h) => { g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#dc2626"; g.fillRect(0, 0, w, 70); g.fillStyle = "#fff"; g.font = "52px Anton"; g.textAlign = "center"; g.fillText("YEAR", w / 2, 56); g.fillStyle = "#111827"; g.font = "130px Anton"; g.fillText(String(yr), w / 2, 205); })} /></mesh>
        <group rotation={[-Math.PI * easeOut(clamp(((u * 9.999) % 1) / 0.35)), 0, 0]} position={[0, 0.5, 0.01]}>
          <mesh position={[0, -0.5, 0]}><planeGeometry args={[1.1, 1.0]} /><meshBasicMaterial color="#f1f5f9" side={THREE.DoubleSide} /></mesh>
        </group>
      </group>
      {/* Daniel ages 18 -> 28 while he works, learns, keeps going */}
      <Person position={[0, 0, 0.4]} rotation={[0, 0.2 * Math.sin(t), 0]} look={danielAt(age)} scale={danielScale(age)}
        pose={{ armR: 0.6 + 0.8 * Math.abs(Math.sin(t * 3)), armL: 0.3, mood: yr === 5 ? "nervous" : "smile", sweat: yr === 5 ? 0.5 : 0, blink: blink(t, 7) }} />
      {/* investment account: dips red in a downturn, green again later; +$100 every month regardless */}
      <group position={[1.5, 0.3, -0.4]}>
        {Array.from({ length: bars }, (_, i) => { const y = i + 1, h = acct(y) / 17308 * 2.4, dip = y === 5 || y === 4;
          return <mesh key={i} position={[(i - 4.5) * 0.14, h / 2, 0]}><boxGeometry args={[0.1, Math.max(h, 0.01), 0.1]} />{M(dip ? COL.red : COL.green, { emissive: new THREE.Color(dip ? COL.red : COL.green), emissiveIntensity: 0.3 })}</mesh>; })}
        <Coin position={[0.7, 1.6 + 0.6 * (1 - ((t * 2) % 1)), 0]} rotation={[0, t * 5, 0]} scale={0.18} />
      </group>
    </group>
  );
};

// =========================================================================== 6. the final message (47.8 - 60 s)
export const FinalScene: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SCN[5][0], [1.6, 1.85, 4.8], [0.05, 1.45, 0.5], 40], [PULLBACK_AT, [2.0, 2.1, 6.4], [0, 1.4, 0], 42], [56.4, [3.5, 6.0, 15.5], [0, 2.6, -2], 46], [60, [4.0, 7.2, 18.0], [0, 3.0, -2], 46]]);
  const photo = useMemo(() => tex("photo18", 256, 320, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#fde68a"); grd.addColorStop(1, "#f97316"); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = "#dc2626"; g.beginPath(); g.ellipse(w / 2, h * 0.95, 95, 90, 0, 0, Math.PI * 2); g.fill();          // red hoodie
    g.fillStyle = "#e2b08c"; g.beginPath(); g.ellipse(w / 2, h * 0.45, 62, 70, 0, 0, Math.PI * 2); g.fill();          // face
    g.fillStyle = "#1c1410"; g.beginPath(); g.ellipse(w / 2, h * 0.3, 66, 40, 0, Math.PI, Math.PI * 2); g.fill();     // hair
    g.fillStyle = "#111"; g.beginPath(); g.arc(w / 2 - 22, h * 0.45, 7, 0, 7); g.arc(w / 2 + 22, h * 0.45, 7, 0, 7); g.fill();
    g.strokeStyle = "#111"; g.lineWidth = 4; g.beginPath(); g.arc(w / 2, h * 0.52, 18, 0.2, Math.PI - 0.2); g.stroke();
    g.fillStyle = "#fff"; g.font = "34px Anton"; g.textAlign = "center"; g.fillText("AGE 18", w / 2, 40);
  }), []);
  const tw = useMemo(() => tower(), []);
  return (
    <group>
      <Sky top="#fb923c" bottom="#ffe4c4" />
      <hemisphereLight args={["#ffe7cc", "#5a6a4a", 0.75]} />
      <directionalLight position={[-8, 3, -6]} intensity={2.4} color="#ffb070" />
      <directionalLight position={[4, 6, 6]} intensity={0.8} color="#ffe7cc" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 200]} />{M("#6b8f5a", { roughness: 0.95 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 1.2]}><planeGeometry args={[14, 5]} />{M("#a8a29e", { roughness: 0.85 })}</mesh>
      {/* his modest, successful shop */}
      <group position={[0, 0, -2.2]}>
        <Box s={[5.2, 2.8, 2.6]} c="#f8fafc" position={[0, 1.4, 0]} />
        <Box s={[5.4, 0.25, 2.8]} c="#dc2626" position={[0, 2.9, 0]} />
        <Sign text="DANIEL'S CAR CARE" w={3.6} h={0.6} bg="#dc2626" fg="#ffffff" position={[0, 2.35, 1.32]} />
        <Box s={[2.2, 1.7, 0.05]} c="#cbd5e1" position={[-1.2, 0.85, 1.31]} />
        <Box s={[1.4, 1.0, 0.05]} c="#bae6fd" o={{ emissive: new THREE.Color("#fde68a"), emissiveIntensity: 0.4 }} position={[1.4, 1.3, 1.31]} />
      </group>
      <Van position={[3.6, 0, 0.6]} rotation={[0, -0.5, 0]} scale={0.75} />
      {/* city skyline catching the sunrise */}
      {[[-10, -16, 10], [-5, -20, 14], [1, -22, 18], [7, -19, 12], [12, -15, 9], [-15, -12, 7]].map(([x, z, h], i) => (
        <mesh key={i} position={[x, h / 2, z]}><boxGeometry args={[3.5, h, 3.5]} /><meshStandardMaterial map={tw} color="#ffd9b0" roughness={0.4} /></mesh>
      ))}
      <Glow color="#ffb347" size={18} opacity={0.5} position={[-6, 4, -30]} />
      {/* Daniel at 28, looking at a photo of himself at 18 */}
      <Person position={[0, 0, 0.6]} rotation={[0, 0.15, 0]} look={DANIEL28} scale={1.0}
        pose={{ armR: t < 54 ? 1.35 : 0.3, armL: t < 54 ? 1.2 : 0.2, head: t < 54 ? -0.1 : 0.0, tilt: t < 54 ? 0.15 : 0, mood: t < 51 ? "calm" : "smile", blink: blink(t, 3) }} />
      {t < 54 && <group position={[0.1, 1.22, 1.02]} rotation={[-0.5, 0.15, 0]}>
        <Box s={[0.3, 0.37, 0.02]} c="#78350f" />
        <mesh position={[0, 0, 0.012]}><planeGeometry args={[0.25, 0.31]} /><meshBasicMaterial map={photo} toneMapped={false} /></mesh>
      </group>}
      <Person position={[-2.1, 0, 0.9]} rotation={[0, 0.5, 0]} look={EMP} scale={0.95} pose={{ mood: "smile", armR: 0.4 + 1.6 * ramp(t, 55, 55.5), blink: blink(t, 8) }} />
    </group>
  );
};
