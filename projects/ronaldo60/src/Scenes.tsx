// "The Boy Nobody Believed In": six scenes, each split into 2-4 s shots. The boy is the same figure at every age and his
// face is never shown: behind, profile in shadow, or backlit. The adult is a pure silhouette until the name card.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Box, Glow, Label, M, Sky, V3, mix3, useCamKeys } from "./Kit";
import { COL, E, S, SCN, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth } from "./timeline";
import { Ball, Human, HumanLook, runPose } from "./Human";
import { Crowd, Floodlights, LIGHT } from "./Silhouette";
import { glowDot } from "./textures";

// the boy's look at each age (same skin, hair, build; clothes of the time)
const BOY = { skin: "#b98563", hair: "#0f0b08" };
const L_BED: HumanLook = { ...BOY, shirt: "#6b7d8f", shorts: "#3a3f4a", socks: "#b98563", boots: "#5a4636" };            // ~11, at home
const L_PITCH: HumanLook = { ...BOY, shirt: "#b91c1c", shorts: "#1e293b", socks: "#e5e7eb", boots: "#1a1a1a" };          // 8, street football
const L_TRAVEL: HumanLook = { ...BOY, shirt: "#35506e", shorts: "#2b2a28", pants: true, sleeves: "long", boots: "#2a2a2a" }; // 12, leaving
const L_DORM: HumanLook = { ...BOY, shirt: "#9aa4b1", shorts: "#2b2f38", socks: "#e5e7eb" };
const L_HOSP: HumanLook = { ...BOY, shirt: "#c9d4df", shorts: "#9fb0c2", pants: true, sleeves: "long" };                // 15, hospital gown
const L_TRAIN: HumanLook = { ...BOY, shirt: "#f4f4f2", shorts: "#f4f4f2", socks: "#f4f4f2", boots: "#111" };            // plain white kit, no number
const SIL: HumanLook = { silhouette: true };

// shot cut points
export const BLACK_IN = 0.75, BLACK_OUT = 9.62;
export const FEET_AT = 13.0, FATHER_AT = S(4), ALONE_AT = 17.6;
export const DORM_AT = (E(5) + S(6)) / 2, MOCK_AT = (E(6) + S(7)) / 2, BOOTS_AT = (E(7) + S(8)) / 2;
export const MONITOR_AT = (E(10) + S(11)) / 2, SPRINT_AT = S(11) + 1.3;
export const M_SHOT = 43.6, M_CROWD = 45.2, M_CUP = 47.0, M_AWARD = 48.8, M_ALONE = 50.8;
export const SILENCE_AT = 54.3, TURN_AT = 54.75, ERUPT_AT = 55.85;

// =========================================================================== shared sets
const Rain: React.FC<{ t: number; n?: number; area?: [number, number, number]; center?: V3 }> = ({ t, n = 160, area = [6, 5, 4], center = [0, 2.5, 0] }) => {
  const r = useMemo(() => { const g = rng(3); return Array.from({ length: n }, () => [g(), g(), g()]); }, [n]);
  return <group position={center}>{r.map(([a, b, c], i) => (
    <mesh key={i} position={[(a - 0.5) * area[0], area[1] / 2 - ((t * 7 + c * area[1]) % area[1]), (b - 0.5) * area[2]]}><boxGeometry args={[0.006, 0.28, 0.006]} /><meshBasicMaterial color="#9fb6d8" transparent opacity={0.35} /></mesh>
  ))}</group>;
};
/** peeling plaster wall texture */
const usePlaster = (base: string) => useMemo(() => {
  const c = document.createElement("canvas"); c.width = 512; c.height = 512; const g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  const r = rng(base.length * 31);
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(80,60,40,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 512, r() * 512, 10 + r() * 50, 6 + r() * 30, r() * 3, 0, 7); g.fill(); }
  for (let k = 0; k < 14; k++) { g.fillStyle = `rgba(220,210,190,${0.5 + r() * 0.3})`; const x = r() * 512, y = r() * 512; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 7; j++) g.lineTo(x + (r() - 0.3) * 60, y + (r() - 0.3) * 40); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
}, [base]);

// =========================================================================== 1. the hook: the bedroom, Madeira, 1980s
export const HookScene: React.FC<{ t: number }> = ({ t }) => {
  const wall = usePlaster("#5e5a50");
  useCamKeys(t, [[0, [0.9, 1.25, 1.9], [0.0, 0.75, -0.2], 40], [BLACK_OUT, [0.32, 0.98, 0.62], [0.05, 0.7, -0.15], 30]]);
  return (
    <group>
      <color attach="background" args={["#020306"]} />
      <ambientLight intensity={0.05} color="#7088c0" />
      {/* cold moonlight through the window + a dim warm lamp */}
      <spotLight position={[-1.6, 2.2, -1.8]} target-position={[0, 0.6, 0]} angle={0.55} penumbra={0.9} intensity={6} distance={6} color="#7fa2ff" />
      <pointLight position={[1.2, 0.95, -0.9]} intensity={0.9 + 0.06 * Math.sin(t * 11) * Math.sin(t * 4.3)} distance={3.0} color="#ffb366" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} />{M("#3a2c22", { roughness: 0.9 })}</mesh>
      <mesh position={[0, 2, -2.2]}><planeGeometry args={[8, 4]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
      <mesh position={[-2.4, 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[8, 4]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
      {/* small wooden window with rain on it */}
      <group position={[-1.2, 1.75, -2.18]}>
        <mesh><planeGeometry args={[0.9, 1.0]} /><meshBasicMaterial color="#141f38" /></mesh>
        <Box s={[1.0, 0.06, 0.06]} c="#3b2a1d" position={[0, 0.5, 0.02]} /><Box s={[1.0, 0.06, 0.06]} c="#3b2a1d" position={[0, -0.5, 0.02]} />
        <Box s={[0.06, 1.06, 0.06]} c="#3b2a1d" position={[-0.47, 0, 0.02]} /><Box s={[0.06, 1.06, 0.06]} c="#3b2a1d" position={[0.47, 0, 0.02]} /><Box s={[0.04, 1.0, 0.04]} c="#3b2a1d" position={[0, 0, 0.02]} />
        {Array.from({ length: 22 }, (_, i) => <mesh key={i} position={[-0.42 + (i * 0.137) % 0.84, 0.45 - ((t * 0.35 + i * 0.29) % 0.95), 0.01]}><planeGeometry args={[0.008, 0.07 + (i % 3) * 0.03]} /><meshBasicMaterial color="#a8c2ec" transparent opacity={0.55} /></mesh>)}
        <Glow color="#6f8fd8" size={1.6} opacity={0.35} position={[0, 0, 0.05]} />
      </group>
      {/* simple bed, worn wool blanket, bedside table + lamp */}
      <Box s={[0.95, 0.42, 1.95]} c="#4a3626" position={[0.1, 0.21, -0.95]} />
      <Box s={[0.95, 0.1, 1.9]} c="#7a6a58" position={[0.1, 0.47, -0.95]} />
      <Box s={[0.97, 0.06, 1.2]} c="#6b3d2e" position={[0.1, 0.53, -0.6]} />
      <Box s={[0.4, 0.5, 0.35]} c="#3b2a1d" position={[1.2, 0.25, -1.6]} />
      <mesh position={[1.2, 0.68, -1.6]}><cylinderGeometry args={[0.1, 0.16, 0.18, 16, 1, true]} /><meshStandardMaterial color="#e7c48f" emissive="#ffb366" emissiveIntensity={0.9} side={THREE.DoubleSide} /></mesh>
      {/* the boy on the edge of the bed, back to us, holding the old ball */}
      <Human age={11} look={L_BED} position={[0.05, 0.52, -0.45]} rotation={[0, Math.PI - 0.15, 0]}
        pose={{ sit: true, shL: 0.75, shR: 0.75, elL: 1.0, elR: 1.0, abL: 0.25, abR: 0.25, lean: 0.25, headPitch: 0.35 + 0.03 * Math.sin(t * 0.6) }} />
      <Ball position={[0.05, 0.75, -0.08]} rotation={[0.4, t * 0.05, 0]} />
    </group>
  );
};

// =========================================================================== 2. the beginning: the dirt pitch at sunset
const DirtPitch: React.FC<{ t: number }> = ({ t }) => {
  const dust = useMemo(() => { const g = rng(5); return Array.from({ length: 90 }, () => [g(), g(), g()]); }, []);
  return (
    <group>
      <Sky top="#ff9a4d" bottom="#ffe0a8" />
      <hemisphereLight args={["#ffd7a8", "#6b4a2a", 0.28]} />
      <directionalLight position={[-6, 2.2, -10]} intensity={3.2} color="#ffb060" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} />{M("#a7784e", { roughness: 1 })}</mesh>
      {/* small whitewashed clubhouse with tin roof, goal frame, low wall, hills */}
      <group position={[3.2, 0, -7]} rotation={[0, -0.4, 0]}>
        <Box s={[4.2, 2.4, 2.6]} c="#efe7d6" position={[0, 1.2, 0]} />
        <mesh position={[0, 2.55, 0]} rotation={[0.08, 0, 0]}><boxGeometry args={[4.6, 0.08, 3.0]} />{M("#8b8f94", { metalness: 0.6, roughness: 0.4 })}</mesh>
        <Box s={[0.8, 1.6, 0.05]} c="#2f4b6e" position={[-0.8, 0.8, 1.31]} />
        <Box s={[0.9, 0.6, 0.05]} c="#2d2a26" position={[1.0, 1.4, 1.31]} />
      </group>
      <group position={[-1.5, 0, -10]}>
        {[-1.8, 1.8].map((x) => <Box key={x} s={[0.1, 2.0, 0.1]} c="#e5e2da" position={[x, 1.0, 0]} />)}
        <Box s={[3.7, 0.1, 0.1]} c="#e5e2da" position={[0, 2.0, 0]} />
      </group>
      <Box s={[40, 0.7, 0.3]} c="#c7b79a" position={[0, 0.35, -14]} />
      {[[-12, -30, 6], [6, -34, 9], [22, -28, 5]].map(([x, z, h], i) => <mesh key={i} position={[x, 0, z]}><coneGeometry args={[h * 2, h, 6]} />{M("#7a6a62", { roughness: 1 })}</mesh>)}
      <Glow color="#ffcf8a" size={18} opacity={0.6} position={[-8, 2.4, -30]} />
      {dust.map(([a, b, c], i) => <mesh key={i} position={[(a - 0.5) * 10, 0.2 + b * 1.6 + 0.1 * Math.sin(t + i), -2 + (c - 0.5) * 8]}><sphereGeometry args={[0.012 + 0.012 * c, 6, 4]} /><meshBasicMaterial color="#ffd9a0" transparent opacity={0.6} /></mesh>)}
    </group>
  );
};
export const BeginningScene: React.FC<{ t: number }> = ({ t }) => (t < FATHER_AT ? <Dribble key="d" t={t} /> : t < ALONE_AT ? <Father key="f" t={t} /> : <Alone key="a" t={t} />);
const Dribble: React.FC<{ t: number }> = ({ t }) => {
  const x = lerp(-3.2, 3.0, (t - SCN[1][0]) / (FATHER_AT - SCN[1][0]));
  const feet = t >= FEET_AT;
  useCamKeys(t, feet ? [[FEET_AT, [x - 1.1, 0.25, 1.0], [x + 0.2, 0.25, 0], 40], [FATHER_AT, [x - 0.9, 0.22, 0.9], [x + 0.3, 0.22, 0], 40]]
    : [[SCN[1][0], [x - 1.8, 0.45, 2.6], [x + 0.6, 0.9, -0.5], 46], [FEET_AT, [x - 1.6, 0.4, 2.4], [x + 0.6, 0.9, -0.5], 46]]);
  const kids = [[-0.6, -1.4, 0.3], [1.4, -1.8, 0.9], [2.6, -1.1, 1.6]];
  return (
    <group>
      <DirtPitch t={t} />
      <Human age={8} look={L_PITCH} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} pose={runPose(t * 2.2, 0.75)} bob={0.03 * Math.abs(Math.sin(t * 13.8))} />
      <Ball position={[x + 0.45, 0.11, 0.05 * Math.sin(t * 7)]} rotation={[0, 0, -t * 12]} />
      {kids.map(([kx, kz, ph], i) => {
        const near = Math.abs(x - kx) < 1.2;
        return <Human key={i} age={8 + (i % 2)} look={{ skin: ["#c9926a", "#e0b48e", "#8d5a3b"][i], hair: "#2b1a10", shirt: ["#1d4ed8", "#e5e7eb", "#15803d"][i], shorts: "#3a3a3a" }}
          position={[kx + (near ? 0.15 * Math.sin(t * 3 + i) : 0), 0, kz]} rotation={[0, -Math.PI / 2 + 0.4 * Math.sin(t + i), 0]}
          pose={near ? runPose(t * 2 + ph, 0.5) : { lean: 0.15, kneeL: 0.3, kneeR: 0.3, hipL: 0.15, hipR: 0.15 }} />;
      })}
    </group>
  );
};
const Father: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[FATHER_AT, [0.6, 1.5, 3.4], [2.6, 1.1, -5.0], 42], [ALONE_AT, [1.0, 1.4, 2.6], [2.8, 1.1, -5.5], 40]]);
  const bx = lerp(-2.5, 4.5, (t - FATHER_AT) / (ALONE_AT - FATHER_AT));
  return (
    <group>
      <DirtPitch t={t} />
      {/* his father, the club's kit man, carrying a bag of balls and hanging shirts on the line */}
      <Human age={40} look={{ skin: "#a87553", hair: "#1a1410", shirt: "#4b5563", shorts: "#2f3a2e", pants: true, sleeves: "long", boots: "#2a1f17" }}
        position={[1.9, 0, -4.4]} rotation={[0, -0.7, 0]} pose={{ shR: 0.2, elR: 0.3, abL: 1.7 + 0.25 * Math.sin(t * 2), elL: 0.5, lean: 0.05 }} />
      <mesh position={[2.15, 0.45, -4.1]}><sphereGeometry args={[0.32, 16, 12]} />{M("#d6d3d1", { roughness: 0.95 })}</mesh>
      <mesh position={[3.3, 1.7, -4.9]} rotation={[0, -0.7, 0]}><boxGeometry args={[2.6, 0.01, 0.01]} />{M("#999")}</mesh>
      {[0, 1, 2, 3].map((k) => <mesh key={k} position={[2.5 + k * 0.5, 1.45, -4.3 - k * 0.42]} rotation={[0, -0.7, 0.04 * Math.sin(t * 2 + k)]}><planeGeometry args={[0.36, 0.45]} />{M(["#b91c1c", "#f5f5f5", "#b91c1c", "#f5f5f5"][k], { side: THREE.DoubleSide })}</mesh>)}
      <Human age={8} look={L_PITCH} position={[bx, 0, -2.2]} rotation={[0, Math.PI / 2, 0]} pose={runPose(t * 2.4, 0.8)} />
      <Ball position={[bx + 0.45, 0.11, -2.2]} rotation={[0, 0, -t * 12]} />
    </group>
  );
};
const Alone: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[ALONE_AT, [0, 0.35, 4.2], [0, 1.2, -6], 40], [SCN[1][1], [0, 0.4, 3.6], [0, 1.25, -6], 38]]);
  const u = (t * 1.6) % 1, hit = u < 0.2;
  return (
    <group>
      <DirtPitch t={t} />
      {/* practicing alone as the sun goes down: kicks against the wall, the ball comes back */}
      <Human age={8} look={L_PITCH} position={[0, 0, 0]} rotation={[0, Math.PI, 0]} pose={hit ? { hipR: 0.9, kneeR: 0.2, hipL: -0.2, shL: 0.6, shR: -0.4, lean: 0.1 } : { hipR: -0.2, kneeR: 0.5, lean: 0.12 }} />
      <Ball position={[0.15, 0.11 + 0.3 * Math.sin(Math.PI * u), -0.5 - 6 * Math.sin(Math.PI * u)]} />
    </group>
  );
};

// =========================================================================== 3. the sacrifice: leaving, the dormitory
export const SacrificeScene: React.FC<{ t: number }> = ({ t }) => (t < DORM_AT ? <Airport key="ap" t={t} /> : <Dorm key="dm" t={t} />);
const Airport: React.FC<{ t: number }> = ({ t }) => {
  const walk = ramp(t, SCN[2][0] + 0.3, DORM_AT - 1.4);
  const z = lerp(2.2, -3.4, walk);
  useCamKeys(t, [[SCN[2][0], [1.6, 1.75, 7.6], [-2.4, 1.3, -3.0], 44], [DORM_AT, [1.1, 1.65, 6.8], [-2.8, 1.3, -3.4], 42]]);
  return (
    <group>
      <Sky top="#7aa0c8" bottom="#e6ecef" />
      <hemisphereLight args={["#e8f0ff", "#5a5a5a", 0.4]} />
      <directionalLight position={[5, 8, 4]} intensity={1.6} color="#fff6e8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[80, 80]} />{M("#6b6e72", { roughness: 0.9 })}</mesh>
      {/* the plane: fuselage, wing, tail, stairs */}
      <group position={[0, 0, -6]} rotation={[0, 0.25, 0]}>
        <mesh position={[0, 2.2, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[1.25, 1.25, 16, 32]} />{M("#eef0f3", { metalness: 0.4, roughness: 0.35 })}</mesh>
        <Box s={[16, 0.25, 0.12]} c="#1e3a8a" position={[0, 2.0, 1.22]} />
        {Array.from({ length: 12 }, (_, i) => <mesh key={i} position={[-5 + i * 0.85, 2.6, 1.24]}><circleGeometry args={[0.13, 12]} />{M("#1f2937")}</mesh>)}
        <Box s={[3.0, 0.2, 9]} c="#d9dde3" position={[0, 1.6, -3]} />
        <Box s={[1.4, 2.4, 0.15]} c="#d9dde3" position={[7.4, 3.6, 0]} />
        <Box s={[0.9, 1.5, 0.05]} c="#cfd4da" position={[-5.0, 2.3, 1.27]} />
        <group position={[-5.0, 0, 2.2]}>{Array.from({ length: 8 }, (_, k) => <Box key={k} s={[1.0, 0.08, 0.32]} c="#9ca3af" position={[0, 0.2 + k * 0.24, -k * 0.13]} />)}</group>
      </group>
      {/* the family waving behind the fence */}
      <Box s={[12, 1.1, 0.05]} c="#9ca3af" o={{ transparent: true, opacity: 0.5 }} position={[0, 0.55, 3.2]} />
      {[[-1.3, 40, "#7f1d1d"], [-0.6, 14, "#1e40af"], [-1.9, 9, "#ca8a04"]].map(([x, age, c], i) => (
        <Human key={i} age={age as number} position={[x as number, 0, 3.7]} rotation={[0, Math.PI, 0]}
          look={{ skin: "#b98563", hair: i ? "#1a1410" : "#2b1d14", shirt: c as string, shorts: "#2f2f2f", pants: true, sleeves: "long" }}
          pose={{ abR: 2.4 + 0.3 * Math.sin(t * 6 + i), elR: 0.3 }} />
      ))}
      {/* the boy walks to the stairs with his bag, then turns back once */}
      <Human age={12} look={L_TRAVEL} position={[lerp(-1.0, -3.6, walk), 0, z]} rotation={[0, t > DORM_AT - 1.2 ? Math.PI * 1.35 : Math.PI + 0.45, 0]}
        pose={walk < 1 ? { ...runPose(t * 1.1, 0.35), shR: 0.1, elR: 0.2 } : { abR: 2.2 + 0.2 * Math.sin(t * 5), elR: 0.3 }} />
      <Box s={[0.42, 0.3, 0.22]} c="#3f3f46" position={[lerp(-1.0, -3.6, walk) - 0.3, 0.42, z + 0.05]} />
    </group>
  );
};
const Dorm: React.FC<{ t: number }> = ({ t }) => {
  const wall = usePlaster("#8e8a80");
  const flick = 0.85 + 0.15 * (Math.sin(t * 37) > 0.93 ? -1 : 1);
  const shot = t < MOCK_AT ? 0 : t < BOOTS_AT ? 1 : 2;
  useCamKeys(t, shot === 0 ? [[DORM_AT, [0.55, 1.55, 0.55], [-0.02, 0.85, -0.95], 36], [MOCK_AT, [0.42, 1.45, 0.4], [-0.02, 0.85, -0.95], 32]]
    : shot === 1 ? [[MOCK_AT, [1.3, 1.9, 5.8], [1.3, 0.95, -0.8], 50], [BOOTS_AT, [1.3, 1.8, 5.2], [1.3, 0.95, -0.8], 48]]
    : [[BOOTS_AT, [0.95, 0.8, 0.95], [0, 0.15, -0.3], 34], [SCN[2][1], [0.8, 0.72, 0.8], [0, 0.15, -0.3], 30]]);
  const photo = useMemo(() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 192; const g = c.getContext("2d")!;
    g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, 256, 192); g.fillStyle = "#b9a888"; g.fillRect(10, 10, 236, 172);
    g.fillStyle = "#7d8fa8"; g.fillRect(10, 10, 236, 70);
    [[60, 110, 26], [110, 100, 30], [160, 112, 22], [200, 120, 18]].forEach(([x, y, r]) => { g.fillStyle = "#4a3426"; g.beginPath(); g.arc(x, y - r * 1.4, r * 0.55, 0, 7); g.fill(); g.fillRect(x - r * 0.6, y - r * 0.8, r * 1.2, r * 2.4); });
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  }, []);
  return (
    <group>
      <color attach="background" args={["#05070a"]} />
      <ambientLight intensity={0.08} color="#a0b4d0" />
            <pointLight position={[0.2, 2.5, -0.5]} intensity={1.3 * flick} distance={5} color="#d6e4ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} />{M("#5b5850", { roughness: 0.6 })}</mesh>
      <mesh position={[0, 2, -1.6]}><planeGeometry args={[10, 4]} /><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
      {/* metal bunk beds */}
      {[[0, -1.0], [2.6, -1.0]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {[[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]].map(([a, b], k) => <Box key={k} s={[0.04, 1.9, 0.04]} c="#4b5563" o={{ metalness: 0.6 }} position={[a, 0.95, b]} />)}
          <Box s={[0.9, 0.12, 1.9]} c="#dfe3e8" position={[0, 0.45, 0]} />
          <Box s={[0.9, 0.12, 1.9]} c="#dfe3e8" position={[0, 1.4, 0]} />
          <Box s={[0.92, 0.05, 1.3]} c="#3b4a63" position={[0, 0.53, 0.3]} />
        </group>
      ))}
      <Human age={12} look={L_DORM} position={[0, 0.51, -0.6]} rotation={[0, Math.PI - 0.1, 0]}
        pose={shot === 2 ? { sit: true, lean: 0.7, headPitch: 0.4, shL: 1.3, shR: 1.3, elL: 0.3, elR: 0.3 } : { sit: true, lean: 0.3, headPitch: 0.45, shL: 0.9, shR: 0.9, elL: 1.2, elR: 1.2, abL: 0.2, abR: 0.2 }} />
      {shot !== 2 && <mesh position={[0.0, 0.92, -0.92]} rotation={[-1.1, Math.PI, 0]}><planeGeometry args={[0.2, 0.15]} /><meshStandardMaterial map={photo} roughness={0.6} side={THREE.DoubleSide} /></mesh>}
      {/* two other boys laughing on the far bunk */}
      {shot === 1 && [0, 1].map((i) => (
        <Human key={i} age={12} position={[2.4 + i * 0.4, i ? 1.47 : 0.51, -0.6 + i * 0.2]} rotation={[0, -2.2, 0]} look={{ skin: ["#e0b48e", "#c9926a"][i], hair: "#3b2a1a", shirt: ["#7c2d12", "#365314"][i], shorts: "#2b2f38" }}
          pose={{ sit: true, lean: -0.15 + 0.12 * Math.abs(Math.sin(t * 9 + i)), shR: 1.2, elR: 1.6, abR: 0.4 }} />
      ))}
      {/* his worn boots on the floor; in the last shot he ties them */}
      {[[-0.1, 0], [0.12, 0.06]].map(([x, dz], i) => <mesh key={i} position={[x, 0.05, -0.25 + dz]} scale={[0.7, 0.55, 1.7]}><sphereGeometry args={[0.08, 14, 10]} />{M("#1a1a1a", { roughness: 0.5 })}</mesh>)}
      {shot === 2 && [0, 1, 2].map((k) => <mesh key={k} position={[-0.1 + 0.02 * Math.sin(t * 12 + k), 0.1 + 0.015 * k, -0.2]} rotation={[0, 0, 0.6 * Math.sin(t * 10 + k)]}><boxGeometry args={[0.07, 0.004, 0.004]} />{M("#f5f5f5")}</mesh>)}
    </group>
  );
};

// =========================================================================== 4. the setback: hospital, heart monitor, back on the pitch
export const SetbackScene: React.FC<{ t: number }> = ({ t }) => (t < MONITOR_AT ? <Hospital key="h" t={t} /> : t < SPRINT_AT ? <Monitor key="m" t={t} /> : <Sprint key="s" t={t} />);
const useEcg = () => {
  const { canvas, tex } = useMemo(() => { const c = document.createElement("canvas"); c.width = 512; c.height = 256; const tx = new THREE.CanvasTexture(c); return { canvas: c, tex: tx }; }, []);
  const draw = (t: number, flat = 0) => {
    const g = canvas.getContext("2d")!; g.fillStyle = "#020a06"; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = "rgba(60,255,140,0.15)"; for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
    g.strokeStyle = "#3cff8c"; g.lineWidth = 4; g.beginPath();
    for (let x = 0; x <= 512; x += 2) {
      const ph = ((x / 512) * 3 - t * 1.2) % 1, p = ph < 0 ? ph + 1 : ph;
      const beat = p > 0.42 && p < 0.5 ? (p < 0.45 ? -90 : p < 0.47 ? 60 : -10) : p > 0.6 && p < 0.7 ? -14 * Math.sin((p - 0.6) * 31) : 0;
      const y = 128 + beat * (1 - flat);
      x ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke(); g.fillStyle = "#3cff8c"; g.font = "bold 40px Inter"; g.fillText("72", 430, 50); tex.needsUpdate = true;
  };
  return { tex, draw };
};
const Hospital: React.FC<{ t: number }> = ({ t }) => {
  const { tex, draw } = useEcg(); draw(t);
  useCamKeys(t, [[SCN[3][0], [3.6, 1.9, 3.4], [0.2, 0.8, -0.6], 42], [MONITOR_AT, [2.8, 1.6, 2.7], [0.3, 0.85, -0.6], 38]]);
  return (
    <group>
      <color attach="background" args={["#0d1218"]} />
      <ambientLight intensity={0.2} color="#c8d8e8" />
      <directionalLight position={[-3, 2.2, -1]} intensity={0.8} color="#e8f0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} />{M("#3a4046", { roughness: 0.5 })}</mesh>
      <mesh position={[0, 2, -1.6]}><planeGeometry args={[10, 4]} />{M("#4e5a63", { roughness: 0.9 })}</mesh>
      <mesh position={[-2.2, 1.6, -1.58]}><planeGeometry args={[1.4, 1.3]} /><meshBasicMaterial color="#eef4ff" /></mesh>
      <Glow color="#e8f0ff" size={2} opacity={0.15} position={[-2.2, 1.6, -1.4]} />
      {/* bed with the teen lying on his side, facing the window (away from us) */}
      <Box s={[2.0, 0.55, 0.95]} c="#8a929b" position={[0, 0.4, -0.6]} />
      <Box s={[2.0, 0.12, 0.95]} c="#b9c0c8" position={[0, 0.72, -0.6]} />
      <Box s={[0.08, 0.6, 1.0]} c="#9ca3af" o={{ metalness: 0.6 }} position={[1.02, 0.95, -0.6]} />
      {/* the patient: blanket over a body shape, head on the pillow turned toward the window */}
      <Box s={[0.35, 0.12, 0.6]} c="#c9cfd6" position={[-0.8, 0.84, -0.6]} />
      <mesh position={[0.15, 0.84, -0.6]} scale={[1.35, 0.17, 0.42]}><sphereGeometry args={[0.5, 24, 16]} />{M("#3e5874", { roughness: 0.95 })}</mesh>
      <group position={[-0.72, 1.0, -0.6]}>
        <mesh scale={[1, 1.1, 0.95]}><sphereGeometry args={[0.11, 24, 18]} />{M("#b98a6a", { roughness: 0.6 })}</mesh>
        {Array.from({ length: 140 }, (_, i) => { const y = 1 - (i + 0.5) / 70, r = Math.sqrt(Math.max(0, 1 - y * y)), th = i * 2.39996;
          const x = r * Math.cos(th), z = r * Math.sin(th); if (x < -0.3 || y < -0.35) return null;
          return <mesh key={i} position={[x * 0.115, y * 0.12, z * 0.108]}><sphereGeometry args={[0.03, 8, 6]} />{M("#141010", { roughness: 0.8 })}</mesh>; })}
      </group>
      {/* heart monitor on its stand */}
      <group position={[1.4, 0, -1.1]}>
        <Box s={[0.05, 1.3, 0.05]} c="#6b7280" position={[0, 0.65, 0]} />
        <Box s={[0.55, 0.4, 0.12]} c="#1f2937" position={[0, 1.45, 0]} />
        <mesh position={[0, 1.45, 0.065]}><planeGeometry args={[0.48, 0.32]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
        <Glow color={COL.green} size={0.9} opacity={0.4} position={[0, 1.45, 0.1]} />
      </group>
      {[[0.9, 0], [1.08, 0.08]].map(([x, dz], i) => <mesh key={i} position={[x - 2.6, 0.05, 0.6 + dz]} scale={[0.7, 0.55, 1.7]}><sphereGeometry args={[0.08, 14, 10]} />{M("#151515", { roughness: 0.45 })}</mesh>)}
    </group>
  );
};
const Monitor: React.FC<{ t: number }> = ({ t }) => {
  const { tex, draw } = useEcg(); draw(t);
  useCamKeys(t, [[MONITOR_AT, [0, 0, 1.0], [0, 0, 0], 36], [SPRINT_AT, [0, 0, 0.42], [0, 0, 0], 40]]);
  return (
    <group>
      <color attach="background" args={["#010302"]} />
      <mesh><planeGeometry args={[1.6, 0.8]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <Glow color={COL.green} size={2} opacity={0.3} position={[0, 0, 0.05]} />
    </group>
  );
};
const Sprint: React.FC<{ t: number }> = ({ t }) => {
  // slow motion for a second, then full speed: the comeback
  const slow = t < SPRINT_AT + 1.0 ? 0.35 : 1;
  const tt = t < SPRINT_AT + 1.0 ? SPRINT_AT + (t - SPRINT_AT) * 0.35 : SPRINT_AT + 0.35 + (t - SPRINT_AT - 1.0);
  const x = -3 + (tt - SPRINT_AT) * 6.5;
  useCamKeys(t, [[SPRINT_AT, [x - 0.8, 0.5, 2.4], [x + 0.8, 1.0, 0], 44], [SCN[3][1], [x - 1.0, 0.6, 2.6], [x + 1.0, 1.0, 0], 44]]);
  void slow;
  return (
    <group>
      <Sky top="#8ec5ff" bottom="#fff1d6" />
      <hemisphereLight args={["#fff4e0", "#4a7a3a", 0.35]} />
      <directionalLight position={[-6, 3, -6]} intensity={2.6} color="#ffd9a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[120, 120]} />{M("#3f8f3a", { roughness: 0.95 })}</mesh>
      {Array.from({ length: 30 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-20 + i * 1.4, 0.005, -1.2]}><planeGeometry args={[0.7, 30]} />{M(i % 2 ? "#3b8636" : "#45973f", { roughness: 0.95 })}</mesh>)}
      {[0, 2, 4, 6, 8].map((k) => <mesh key={k} position={[k * 1.5 - 1, 0.1, 0.8]}><coneGeometry args={[0.1, 0.22, 12]} />{M("#f97316")}</mesh>)}
      <Human age={15} look={L_TRAIN} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} pose={runPose(tt * 2.6, 1)} bob={0.04 * Math.abs(Math.sin(tt * 16.3))} />
    </group>
  );
};

// =========================================================================== 5 + 6. the stadium: montage, then the reveal
const StadiumBase: React.FC<{ t: number; erupt?: number }> = ({ t, erupt = 0 }) => {
  const confetti = useMemo(() => { const g = rng(17); return Array.from({ length: 160 }, () => [g(), g(), g(), g()]); }, []);
  return (
    <group>
      <color attach="background" args={["#05070c"]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[LIGHT[0], LIGHT[1], LIGHT[2] + 6]} intensity={500} distance={90} color="#e8f0ff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}><planeGeometry args={[120, 120]} />{M("#0c1a10", { roughness: 0.55, metalness: 0.15 })}</mesh>
      <mesh position={[0, 0.02, -14]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7, 40]} /><meshBasicMaterial map={glowDot()} color={new THREE.Color(0.55, 0.62, 0.8)} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <Crowd />
      <Floodlights />
      {[-6, -14, -22].map((z, i) => <sprite key={i} position={[0, 3 + i, z]} scale={[40, 14, 1]}><spriteMaterial map={glowDot()} color={new THREE.Color(0.5, 0.56, 0.68)} transparent opacity={0.08 + 0.1 * erupt} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>)}
      {erupt > 0 && confetti.map(([a, b, c, d], i) => {
        const y = 7 - ((t - ERUPT_AT) * (0.8 + c) + d * 7) % 7.5;
        return <mesh key={i} position={[(a - 0.5) * 9 + Math.sin(t * 2 + i) * 0.3, y, -1 - b * 6]} rotation={[t * 3 + i, t * 2 + i, 0]}><planeGeometry args={[0.07, 0.04]} />
          <meshBasicMaterial color={new THREE.Color(i % 3 ? "#ffd166" : "#fff3c4").multiplyScalar(1.4)} side={THREE.DoubleSide} toneMapped={false} /></mesh>;
      })}
    </group>
  );
};
export const RiseScene: React.FC<{ t: number }> = ({ t }) => {
  const shot = t < M_SHOT ? 0 : t < M_CROWD ? 1 : t < M_CUP ? 2 : t < M_CUP + 1.8 ? 3 : t < M_ALONE ? 4 : 5;
  if (shot === 0) return <MTrain key="0" t={t} />;
  if (shot === 1) return <MShot key="1" t={t} />;
  return <MStadium key={"s" + shot} t={t} shot={shot} />;
};
const MTrain: React.FC<{ t: number }> = ({ t }) => {
  const x = -3 + (t - SCN[4][0]) * 5;
  useCamKeys(t, [[SCN[4][0], [x - 3.6, 0.7, 3.2], [x, 1.0, 0], 40], [M_SHOT, [x - 3.2, 0.65, 3.0], [x, 1.0, 0], 40]]);
  return (
    <group>
      <Sky top="#1e2a4a" bottom="#ff9a6a" />
      <hemisphereLight args={["#ffb08a", "#203020", 0.3]} />
      <directionalLight position={[-6, 2, -6]} intensity={2.4} color="#ff9a5a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[120, 120]} />{M("#2f6b2c", { roughness: 0.95 })}</mesh>
      {[0, 2, 4, 6].map((k) => <mesh key={k} position={[k * 1.6 - 2, 0.1, 0.8]}><coneGeometry args={[0.1, 0.22, 12]} />{M("#f97316")}</mesh>)}
      <Human age={22} look={L_TRAIN} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} pose={runPose(t * 2.8, 1)} bob={0.04 * Math.abs(Math.sin(t * 17.6))} />
    </group>
  );
};
const MShot: React.FC<{ t: number }> = ({ t }) => {
  const kick = M_SHOT + 0.5, u = clamp((t - kick) / 0.45);
  useCamKeys(t, [[M_SHOT, [-1.6, 0.6, 2.2], [1.5, 1.0, -3], 42], [M_CROWD, [-1.2, 0.55, 1.8], [2.0, 1.1, -4], 40]]);
  const bulge = pulse(t, kick + 0.42, 0.5);
  return (
    <group>
      <StadiumBase t={t} />
      <hemisphereLight args={["#e8f0ff", "#203020", 0.5]} />
      {/* goal + net */}
      <group position={[2.6, 0, -7]} rotation={[0, -0.5, 0]}>
        {[-1.83, 1.83].map((x) => <Box key={x} s={[0.1, 2.44, 0.1]} c="#f5f5f5" position={[x, 1.22, 0]} />)}
        <Box s={[3.76, 0.1, 0.1]} c="#f5f5f5" position={[0, 2.44, 0]} />
        <mesh position={[0, 1.22, -0.8 - 0.4 * bulge]} scale={[1, 1, 1]}><planeGeometry args={[3.66, 2.44, 12, 8]} /><meshBasicMaterial color="#e5e7eb" wireframe transparent opacity={0.5} /></mesh>
      </group>
      <Human age={23} look={SIL} position={[0, 0, 0]} rotation={[0, -0.5, 0]} pose={t < kick ? runPose(t * 2.6, 0.8) : { hipR: 1.2 - u * 0.4, kneeR: 0.2, hipL: -0.3, shL: 0.8, shR: -0.6, lean: 0.25 }} />
      <Ball worn={false} position={t < kick ? [0.25, 0.11, -0.25] : mix3([0.25, 0.11, -0.25], [2.2, 1.6, -7.2], easeOut(u))} />
    </group>
  );
};
const MStadium: React.FC<{ t: number; shot: number }> = ({ t, shot }) => {
  // 2 crowd, 3 lifting a cup, 4 lifting a golden award, 5 alone, back to camera
  const keys: Record<number, Parameters<typeof useCamKeys>[1]> = {
    2: [[M_CROWD, [0, 6, 4], [0, 9, -40], 46], [M_CUP, [3, 5.5, 2], [2, 8.5, -40], 46]],
    3: [[M_CUP, [0, 0.6, 4.2], [0, 2.4, -10], 44], [M_CUP + 1.8, [0, 0.55, 3.6], [0, 2.4, -10], 42]],
    4: [[M_CUP + 1.8, [0.3, 0.5, 3.5], [0, 2.5, -10], 42], [M_ALONE, [0.2, 0.5, 3.0], [0, 2.5, -10], 40]],
    5: [[M_ALONE, [0, 1.4, 9.5], [0, 2.4, -10], 44], [SILENCE_AT, [0, 1.0, 6.2], [0, 2.6, -10], 42]],
  };
  useCamKeys(t, keys[shot]);
  return (
    <group>
      <StadiumBase t={t} erupt={shot === 3 || shot === 4 ? 0.6 : 0} />
      {shot !== 2 && <Human age={25} look={SIL} position={[0, 0, 0]} rotation={[0, shot === 5 ? Math.PI : 0, 0]}
        pose={shot === 5 ? { abL: 0.15, abR: 0.15 } : { abL: 2.55, abR: 2.55, elL: 0.25, elR: 0.25, headPitch: -0.3 }} />}
      {shot === 3 && <group position={[0, 2.62, 0]}>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.18, 0.08, 0.35, 24, 1, true]} /><meshStandardMaterial color="#d9dde3" metalness={1} roughness={0.2} side={THREE.DoubleSide} /></mesh>
        {[-1, 1].map((s) => <mesh key={s} position={[s * 0.2, 0.22, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.09, 0.015, 8, 16, Math.PI]} /><meshStandardMaterial color="#d9dde3" metalness={1} roughness={0.2} /></mesh>)}
        <Box s={[0.1, 0.18, 0.1]} c="#b8bec7" o={{ metalness: 1, roughness: 0.25 }} position={[0, -0.06, 0]} />
      </group>}
      {shot === 4 && <group position={[0, 2.66, 0]}>
        <mesh position={[0, 0.16, 0]}><sphereGeometry args={[0.15, 32, 24]} /><meshStandardMaterial color="#ffcf4d" metalness={1} roughness={0.18} emissive="#7a5200" emissiveIntensity={0.6} /></mesh>
        <Box s={[0.12, 0.12, 0.12]} c="#c9a24a" o={{ metalness: 1, roughness: 0.25 }} position={[0, -0.03, 0]} />
        <Glow color="#ffcf4d" size={1.2} opacity={0.5} position={[0, 0.16, 0.1]} />
      </group>}
    </group>
  );
};
export const RevealScene: React.FC<{ t: number }> = ({ t }) => {
  // the music stops; he turns to face the camera, a silhouette against the light; the stadium erupts
  const turn = smooth(ramp(t, TURN_AT, TURN_AT + 1.15));
  const erupt = ramp(t, ERUPT_AT, ERUPT_AT + 0.4);
  useCamKeys(t, [[SCN[5][0], [0, 0.95, 5.9], [0, 2.6, -10], 42], [60, [0, 0.55, 4.6], [0, 2.95, -10], 44]]);
  return (
    <group>
      <StadiumBase t={t} erupt={erupt} />
      <Human age={25} look={SIL} position={[0, 0, 0]} rotation={[0, Math.PI * (1 - turn), 0]}
        pose={{ abL: 0.15 + 2.4 * smooth(ramp(t, ERUPT_AT, ERUPT_AT + 0.6)), abR: 0.15 + 2.4 * smooth(ramp(t, ERUPT_AT, ERUPT_AT + 0.6)), elL: 0.2, elR: 0.2, headPitch: -0.15 * erupt }} />
    </group>
  );
};
