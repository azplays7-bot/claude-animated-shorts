// The six 10-second clips of "How real estate can build wealth". One continuous story with the same cast:
// Alex (25, blue cardigan), the lender, and the renting family. All money shown is the script's worked example.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Person, Pose, Look } from "./Actors";
import { Arc, BankBuilding, Box, Glow, Key, Label, Sky, Stack, Stream, Tree, arcPoint, useCamKeys, walkPose, V3 } from "./Kit";
import { COL, LOOKS, SCN, backOut, blink, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth } from "./timeline";
import { nightWindow, rr, sign, siding, tex, wood } from "./textures";
import T from "../narration/timing.json";

const CH = T.chunks as { start: number; end: number; text: string }[];
const at = (needle: string) => CH.find((c) => c.text.includes(needle))!.start;
// shared beats (Overlay.tsx and audio/make_audio.py look the same chunks up)
export const B1_MEET = at("Meet ALEX");
export const B2_DOWN = at("puts down"), B2_LOAN = at("borrows"), B2_BACK = at("pays it back");
export const B3_RENTS = at("RENTS it"), B3_PAY = at("They pay him"), B3_NOT = at("NOT all profit"), B3_BILLS = at("BILLS to pay");
export const B4_MORT = at("Mortgage:"), B4_TAX = at("Taxes and"), B4_REP = at("Repairs and"), B4_LEFT = at("That leaves"), B4_WIPE = at("REPAIR could");
export const B5_PAY = at("SHRINKS"), B5_RISE = at("IF the home"), B5_EQ = at("EQUITY grows"), B5_DEF = at("EQUITY is the");
export const B6_GUAR = at("GUARANTEED"), B6_SECRET = at("The SECRET");
/** scene-local cut points */
export const C1_OUT = 3.4, C2_OFFICE = 13.0, C2_KEYS = B2_BACK - 0.1, C3_BILLS = B3_NOT - 0.05;

const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={c} roughness={0.6} {...o} />;
const alex = LOOKS.alex;
/** sets the scene background colour and fog on the scene itself (a fog element inside a group would not reach it) */
const SceneBg: React.FC<{ bg?: string; fog?: [string, number, number] }> = ({ bg, fog }) => {
  const { scene } = useThree();
  scene.background = bg ? new THREE.Color(bg) : null;
  scene.fog = fog ? new THREE.Fog(fog[0], fog[1], fog[2]) : null;
  return null;
};
const idle = (t: number, k: number, extra: Pose = {}): Pose => ({ blink: blink(t, k), bob: 0.008 * Math.sin(t * 2 + k), tilt: 0.04 * Math.sin(t * 0.9 + k), ...extra });

// =========================================================================== textures
const yardSign = (text: string, bg: string) => tex(`yard${text}${bg}`, 768, 512, (g, w, h) => {
  g.fillStyle = "#ffffff"; rr(g, 0, 0, w, h, 26); g.fill();
  g.fillStyle = bg; rr(g, 18, 18, w - 36, h - 36, 20); g.fill();
  g.fillStyle = "#ffffff"; g.textAlign = "center"; g.textBaseline = "middle";
  const lines = text.split("|");
  lines.forEach((l, i) => { const big = i === 0; g.font = `${big ? 170 : 120}px Anton`; g.fillText(l, w / 2, h / 2 + (lines.length === 1 ? 10 : i === 0 ? -70 : 105)); });
});
const phoneScreen = () => tex("phone", 360, 720, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#0f2a4a"); grd.addColorStop(1, "#06121f");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = "#e2f3ff"; g.font = "800 34px Inter"; g.textAlign = "center"; g.fillText("ALEX · ACCOUNT", w / 2, 92);
  g.fillStyle = "#22c55e"; rr(g, 40, 140, w - 80, 250, 30); g.fill();
  g.fillStyle = "#ffffff"; g.beginPath(); g.moveTo(w / 2, 175); g.lineTo(w / 2 + 70, 270); g.lineTo(w / 2 + 28, 270); g.lineTo(w / 2 + 28, 350); g.lineTo(w / 2 - 28, 350); g.lineTo(w / 2 - 28, 270); g.lineTo(w / 2 - 70, 270); g.closePath(); g.fill();
  g.fillStyle = "#ffffff"; g.font = "120px Anton"; g.fillText("$", w / 2, 540);
  g.fillStyle = "rgba(255,255,255,0.25)"; for (let k = 0; k < 3; k++) { rr(g, 50, 590 + k * 34, w - 100 - k * 60, 16, 8); g.fill(); }
});
const paycheck = () => tex("paycheck", 720, 320, (g, w, h) => {
  g.fillStyle = "#f4fbf3"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#5c9a6c"; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
  g.fillStyle = "#2f6b44"; g.font = "64px Anton"; g.textAlign = "left"; g.fillText("PAYCHECK", 40, 92);
  g.fillStyle = "rgba(47,107,68,0.35)"; for (let k = 0; k < 3; k++) g.fillRect(40, 140 + k * 46, 380 - k * 80, 14);
  g.strokeStyle = "#2f6b44"; g.lineWidth = 5; g.strokeRect(470, 140, 210, 80);
  g.fillStyle = "#2f6b44"; g.font = "56px Anton"; g.textAlign = "center"; g.fillText("$", 575, 200);
});
const clockFace = () => tex("clock", 256, 256, (g, w) => {
  g.fillStyle = "#fbfaf5"; g.beginPath(); g.arc(w / 2, w / 2, 120, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#1f2937"; g.lineWidth = 12; g.stroke();
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.fillStyle = "#1f2937"; g.fillRect(w / 2 + Math.cos(a) * 92 - 4, w / 2 + Math.sin(a) * 92 - 4, 8, 8); }
});
const monitorScreen = () => tex("monitor", 512, 320, (g, w, h) => {
  g.fillStyle = "#0b2547"; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 9; k++) { g.fillStyle = k % 3 ? "rgba(147,197,253,0.55)" : "rgba(253,224,71,0.7)"; g.fillRect(30, 30 + k * 30, 120 + ((k * 97) % 300), 12); }
});
const envelope = (text: string) => tex("env" + text, 512, 300, (g, w, h) => {
  g.fillStyle = "#fffaf0"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#d6c7a1"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h * 0.55); g.lineTo(w, 0); g.stroke();
  g.fillStyle = "#b91c1c"; rr(g, 40, h - 110, w - 80, 80, 14); g.fill();
  g.fillStyle = "#fff"; g.font = "58px Anton"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, w / 2, h - 68);
});
const lease = () => tex("lease", 400, 520, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#1e3a8a"; g.font = "64px Anton"; g.textAlign = "center"; g.fillText("LEASE", w / 2, 90);
  g.fillStyle = "rgba(30,58,138,0.3)"; for (let k = 0; k < 8; k++) g.fillRect(40, 140 + k * 38, w - 80 - (k % 3) * 40, 12);
  g.strokeStyle = "#1e3a8a"; g.lineWidth = 4; g.beginPath(); g.moveTo(40, 470); g.bezierCurveTo(90, 420, 130, 500, 180, 450); g.bezierCurveTo(210, 430, 240, 480, 300, 455); g.stroke();
});
const contract = () => tex("contract", 400, 520, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#14532d"; g.font = "54px Anton"; g.textAlign = "center"; g.fillText("MORTGAGE", w / 2, 80);
  g.fillStyle = "rgba(20,83,45,0.3)"; for (let k = 0; k < 8; k++) g.fillRect(40, 130 + k * 38, w - 80 - (k % 3) * 40, 12);
  g.strokeStyle = "#111"; g.lineWidth = 3; g.beginPath(); g.moveTo(40, 470); g.lineTo(w - 40, 470); g.stroke();
});
const grass = (c: string) => { const t = tex("grass" + c, 256, 256, (g, w, h) => {
  g.fillStyle = c; g.fillRect(0, 0, w, h);
  const r = rng(7); for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.03 + r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 4 + r() * 5); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40); return t; };
const asphalt = () => { const t = tex("asphalt", 256, 256, (g, w, h) => {
  g.fillStyle = "#4b5160"; g.fillRect(0, 0, w, h);
  const r = rng(9); for (let k = 0; k < 1500; k++) { g.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.04 + r() * 0.06})`; g.fillRect(r() * w, r() * h, 2, 2); }
}); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 1.5); return t; };

// =========================================================================== small props
/** a gable roof (two slabs + gable triangles) over a w x d footprint, ridge along x */
const Roof: React.FC<{ w: number; d: number; h: number; color: string; wall: string; snow?: number } & JSX.IntrinsicElements["group"]> = ({ w, d, h, color, wall, snow = 0, ...p }) => {
  const slope = Math.hypot(d / 2 + 0.25, h), ang = Math.atan2(h, d / 2 + 0.25);
  const tri = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath(); return new THREE.ShapeGeometry(s); }, [d, h]);
  return (
    <group {...p}>
      {[-1, 1].map((s_) => (
        <group key={s_} position={[0, h / 2, s_ * (d / 4 + 0.06)]} rotation={[s_ * ang, 0, 0]}>
          <mesh><boxGeometry args={[w + 0.5, 0.12, slope]} />{M(color, { roughness: 0.75 })}</mesh>
          {snow > 0 && <mesh position={[0, 0.08, 0]}><boxGeometry args={[w + 0.5, 0.06, slope]} /><meshStandardMaterial color="#ffffff" roughness={0.9} transparent opacity={snow} /></mesh>}
        </group>
      ))}
      {[-1, 1].map((s_) => <mesh key={"g" + s_} geometry={tri} position={[s_ * w / 2, 0, 0]} rotation={[0, s_ * Math.PI / 2, 0]}><meshStandardMaterial color={wall} roughness={0.8} side={THREE.DoubleSide} /></mesh>)}
    </group>
  );
};
const Window: React.FC<{ w?: number; h?: number; lit?: number } & JSX.IntrinsicElements["group"]> = ({ w = 0.7, h = 0.8, lit = 0, ...p }) => (
  <group {...p}>
    <Box s={[w + 0.12, h + 0.12, 0.06]} c="#ffffff" />
    <Box s={[w, h, 0.08]} c={lit > 0 ? "#ffe2a8" : "#a9d6f5"} o={{ roughness: 0.15, metalness: 0.1, emissive: new THREE.Color(lit > 0 ? "#ffb347" : "#2b5d80"), emissiveIntensity: lit > 0 ? 1.2 * lit : 0.25 }} />
    <Box s={[0.04, h, 0.1]} c="#ffffff" /><Box s={[w, 0.04, 0.1]} c="#ffffff" />
    {[-1, 1].map((s) => <Box key={s} s={[0.14, h + 0.1, 0.04]} c="#335c81" position={[s * (w / 2 + 0.13), 0, 0.02]} />)}
  </group>
);
/** yard sign on a post (text with "|" = two lines) */
const YardSign: React.FC<{ text: string; bg: string; swing?: number } & JSX.IntrinsicElements["group"]> = ({ text, bg, swing = 0, ...p }) => (
  <group {...p}>
    <Box s={[0.08, 1.4, 0.08]} c="#f8fafc" position={[-0.45, 0.7, 0]} />
    <Box s={[0.75, 0.06, 0.06]} c="#f8fafc" position={[-0.1, 1.33, 0]} />
    <group position={[-0.05, 1.3, 0]} rotation={[swing, 0, 0]}>
      <mesh position={[0, -0.32, 0]}><boxGeometry args={[0.85, 0.57, 0.03]} />{M("#ffffff")}</mesh>
      <mesh position={[0, -0.32, 0.017]}><planeGeometry args={[0.83, 0.55]} /><meshStandardMaterial map={yardSign(text, bg)} roughness={0.5} /></mesh>
    </group>
  </group>
);
const Fence: React.FC<{ from: number; to: number; z: number }> = ({ from, to, z }) => (
  <group>
    {Array.from({ length: Math.floor((to - from) / 0.25) + 1 }, (_, i) => <group key={i} position={[from + i * 0.25, 0, z]}>
      <Box s={[0.1, 0.62, 0.04]} c="#ffffff" position={[0, 0.31, 0]} /><mesh position={[0, 0.64, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.07, 0.07, 0.04]} />{M("#ffffff")}</mesh></group>)}
    {[0.2, 0.48].map((y) => <Box key={y} s={[to - from, 0.06, 0.03]} c="#ffffff" position={[(from + to) / 2, y, z - 0.03]} />)}
  </group>
);
/** leafy tree; season leaf colour and optional snow cap */
const LeafTree: React.FC<{ leaf: string; s?: number; snow?: number; bare?: number } & JSX.IntrinsicElements["group"]> = ({ leaf, s = 1, snow = 0, bare = 0, ...p }) => (
  <group {...p} scale={s}>
    <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.12, 0.18, 1.6, 10]} />{M("#6b4a2f", { roughness: 0.9 })}</mesh>
    {[[0, 2.0, 0, 0.95], [0.5, 1.75, 0.2, 0.65], [-0.45, 1.8, -0.15, 0.7], [0.1, 2.55, -0.1, 0.6]].map(([x, y, z, r], i) =>
      <mesh key={i} position={[x, y, z]} scale={1 - 0.75 * bare}><sphereGeometry args={[r, 20, 16]} />{M(leaf, { roughness: 0.85 })}</mesh>)}
    {snow > 0 && <mesh position={[0, 2.3, 0]} scale={[1, 0.5, 1]}><sphereGeometry args={[0.85 * (1 - 0.6 * bare), 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#ffffff" transparent opacity={snow} roughness={0.9} /></mesh>}
  </group>
);
const Bush: React.FC<{ c?: string } & JSX.IntrinsicElements["group"]> = ({ c = "#3f9e4a", ...p }) => (
  <group {...p}>{[[0, 0.25, 0, 0.35], [0.3, 0.2, 0.05, 0.27], [-0.3, 0.2, 0, 0.28]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 14, 12]} />{M(c, { roughness: 0.85 })}</mesh>)}</group>
);
const Mailbox: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}><Box s={[0.07, 0.9, 0.07]} c="#5b4636" position={[0, 0.45, 0]} />
    <mesh position={[0, 0.98, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.13, 0.13, 0.42, 16, 1, false, 0, Math.PI]} />{M("#1d4ed8", { metalness: 0.3, roughness: 0.4 })}</mesh>
    <Box s={[0.42, 0.04, 0.26]} c="#1d4ed8" position={[0, 0.98, 0]} /></group>
);
const Car: React.FC<{ c: string } & JSX.IntrinsicElements["group"]> = ({ c, ...p }) => (
  <group {...p}>
    <Box s={[2.0, 0.5, 0.95]} c={c} o={{ metalness: 0.4, roughness: 0.35 }} position={[0, 0.45, 0]} />
    <Box s={[1.1, 0.42, 0.85]} c={c} o={{ metalness: 0.4, roughness: 0.35 }} position={[-0.1, 0.9, 0]} />
    <Box s={[1.0, 0.34, 0.87]} c="#9fc9e8" o={{ roughness: 0.1, metalness: 0.3 }} position={[-0.1, 0.92, 0]} />
    {[[-0.62, 0.47], [0.62, 0.47], [-0.62, -0.47], [0.62, -0.47]].map(([x, z], i) => <mesh key={i} position={[x, 0.22, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.22, 0.22, 0.14, 18]} />{M("#18181b", { roughness: 0.8 })}</mesh>)}
  </group>
);
const MovingBox: React.FC<JSX.IntrinsicElements["group"] & { s?: number }> = ({ s = 0.45, ...p }) => (
  <group {...p}><Box s={[s, s * 0.8, s]} c="#c79a5b" o={{ roughness: 0.9 }} position={[0, s * 0.4, 0]} /><Box s={[s * 0.25, s * 0.81, s * 1.01]} c="#a07a44" position={[0, s * 0.4, 0]} /></group>
);
const Piggy: React.FC<JSX.IntrinsicElements["group"] & { glow?: number }> = ({ glow = 0, ...p }) => (
  <group {...p}>
    <mesh position={[0, 0.55, 0]} scale={[1.25, 1, 1]}><sphereGeometry args={[0.5, 32, 24]} />{M("#f9a8d4", { roughness: 0.35 })}</mesh>
    <mesh position={[0.6, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.2, 0.18, 20]} />{M("#f472b6", { roughness: 0.4 })}</mesh>
    {[-1, 1].map((s) => <mesh key={s} position={[0.35, 1.0, s * 0.22]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.1, 0.22, 12]} />{M("#f472b6")}</mesh>)}
    {[[-0.35, 0.25], [0.35, 0.25], [-0.35, -0.25], [0.35, -0.25]].map(([x, z], i) => <mesh key={i} position={[x, 0.12, z]}><cylinderGeometry args={[0.09, 0.09, 0.25, 12]} />{M("#f472b6")}</mesh>)}
    {[-1, 1].map((s) => <mesh key={"e" + s} position={[0.5, 0.75, s * 0.17]}><sphereGeometry args={[0.04, 10, 8]} />{M("#111")}</mesh>)}
    <Box s={[0.32, 0.03, 0.06]} c="#831843" position={[0, 1.05, 0]} />
    {glow > 0 && <Glow color="#f9a8d4" size={2.2} opacity={0.6 * glow} position={[0, 0.6, 0]} />}
  </group>
);
const Toolbox: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <Box s={[1.1, 0.55, 0.55]} c="#dc2626" o={{ metalness: 0.3, roughness: 0.4 }} position={[0, 0.28, 0]} />
    <Box s={[1.12, 0.08, 0.57]} c="#991b1b" position={[0, 0.5, 0]} />
    <mesh position={[0, 0.72, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.2, 0.035, 8, 20, Math.PI]} />{M("#1f2937", { metalness: 0.6 })}</mesh>
    <group position={[0.15, 0.62, 0]} rotation={[0, 0.4, 1.1]}><Box s={[0.07, 0.6, 0.05]} c="#9ca3af" o={{ metalness: 0.8, roughness: 0.3 }} /><mesh position={[0, 0.3, 0]}><torusGeometry args={[0.08, 0.035, 8, 16, Math.PI * 1.5]} />{M("#9ca3af", { metalness: 0.8, roughness: 0.3 })}</mesh></group>
  </group>
);
const Shield: React.FC<JSX.IntrinsicElements["group"]> = (p) => {
  const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 0.6); s.quadraticCurveTo(0.35, 0.55, 0.5, 0.45); s.quadraticCurveTo(0.5, -0.2, 0, -0.6); s.quadraticCurveTo(-0.5, -0.2, -0.5, 0.45); s.quadraticCurveTo(-0.35, 0.55, 0, 0.6);
    return new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }); }, []);
  return <group {...p}><mesh geometry={geo} position={[0, 0.9, -0.07]}>{M("#0ea5e9", { metalness: 0.4, roughness: 0.3 })}</mesh>
    <mesh position={[0, 0.95, 0.12]}><boxGeometry args={[0.1, 0.4, 0.02]} />{M("#ffffff")}</mesh><mesh position={[0, 0.95, 0.12]}><boxGeometry args={[0.4, 0.1, 0.02]} />{M("#ffffff")}</mesh></group>;
};
const Phone: React.FC<JSX.IntrinsicElements["group"] & { glow?: number }> = ({ glow = 0, ...p }) => (
  <group {...p}>
    <Box s={[0.52, 1.02, 0.06]} c="#111827" o={{ metalness: 0.6, roughness: 0.25 }} />
    <mesh position={[0, 0, 0.032]}><planeGeometry args={[0.46, 0.94]} /><meshBasicMaterial map={phoneScreen()} toneMapped={false} /></mesh>
    <Glow color="#4ade80" size={1.6} opacity={0.25 + 0.5 * glow} position={[0, 0, -0.1]} />
  </group>
);

// =========================================================================== the neighbourhood (scenes 1b, 2, 3, 5, 6)
export const HOUSE: V3 = [0, 0, -2.2];
const HW = 4.4, HD = 3.4, HH = 2.7;     // rental house body
const DOOR: V3 = [HOUSE[0] - 0.9, 0, HOUSE[2] + HD / 2];
type Env = { season?: number; snow?: number; dusk?: number; sign?: [string, string] | null; signSwing?: number; lit?: number; age?: number };
const leafAt = (season: number) => {   // 0 summer .. 0.33 autumn .. 0.6 winter .. 1 summer
  const c = new THREE.Color();
  const g = new THREE.Color("#4caf50"), o = new THREE.Color("#f08a24"), b = new THREE.Color("#8a6f55"), sp = new THREE.Color("#7ed957");
  const s = ((season % 1) + 1) % 1;
  if (s < 0.33) c.lerpColors(g, o, smooth(s / 0.33)); else if (s < 0.55) c.lerpColors(o, b, smooth((s - 0.33) / 0.22));
  else if (s < 0.8) c.lerpColors(b, sp, smooth((s - 0.6) / 0.2)); else c.lerpColors(sp, g, smooth((s - 0.8) / 0.2));
  return "#" + c.getHexString();
};
const bareAt = (season: number) => { const s = ((season % 1) + 1) % 1; return s < 0.4 ? 0 : s < 0.55 ? smooth((s - 0.4) / 0.15) : s < 0.75 ? 1 : 1 - smooth((s - 0.75) / 0.15); };
export const snowAt = (season: number) => { const s = ((season % 1) + 1) % 1; return s < 0.5 ? 0 : s < 0.56 ? (s - 0.5) / 0.06 : s < 0.72 ? 1 : s < 0.78 ? 1 - (s - 0.72) / 0.06 : 0; };

const RentalHouse: React.FC<{ e: Env }> = ({ e }) => {
  const wall = useMemo(() => siding("#f6e7c8"), []);
  const snow = e.snow ?? 0, lit = e.lit ?? 0;
  return (
    <group position={HOUSE}>
      <Box s={[HW + 0.3, 0.3, HD + 0.3]} c="#9ca3af" position={[0, 0.15, 0]} />
      <mesh position={[0, 0.3 + HH / 2, 0]}><boxGeometry args={[HW, HH, HD]} /><meshStandardMaterial map={wall} roughness={0.85} /></mesh>
      <Roof w={HW} d={HD} h={1.5} color="#7c2d12" wall="#f6e7c8" snow={snow} position={[0, 0.3 + HH, 0]} />
      <Box s={[0.45, 1.1, 0.45]} c="#9a3412" position={[1.3, 0.3 + HH + 1.0, -0.5]} />
      {/* porch */}
      <Box s={[2.0, 0.22, 1.1]} c="#d6d3d1" position={[-0.9, 0.11, HD / 2 + 0.55]} />
      {[-1.8, 0.0].map((x) => <Box key={x} s={[0.12, 2.0, 0.12]} c="#ffffff" position={[x, 1.2, HD / 2 + 1.0]} />)}
      <Box s={[2.3, 0.12, 1.25]} c="#7c2d12" position={[-0.9, 2.25, HD / 2 + 0.55]} rotation={[0.12, 0, 0]} />
      {/* door */}
      <Box s={[0.85, 1.65, 0.08]} c="#1e3a8a" o={{ roughness: 0.4 }} position={[-0.9, 0.3 + 0.83, HD / 2 + 0.02]} />
      <mesh position={[-0.6, 1.15, HD / 2 + 0.08]}><sphereGeometry args={[0.04, 10, 8]} />{M(COL.gold, { metalness: 1, roughness: 0.3 })}</mesh>
      <Window position={[1.1, 1.45, HD / 2 + 0.02]} w={1.1} h={0.9} lit={lit} />
      <Window position={[-0.9, 3.3, HD / 2 - 0.2]} w={0.6} h={0.5} lit={lit} />
      <Window position={[HW / 2 + 0.02, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} w={0.9} h={0.8} lit={lit} />
      {/* path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.9, 0.015, HD / 2 + 2.3]}><planeGeometry args={[1.0, 2.6]} />{M("#d6d3d1", { roughness: 0.9 })}</mesh>
      <Bush position={[0.8, 0, HD / 2 + 0.45]} c={snow > 0.5 ? "#dfe8e3" : "#3f9e4a"} /><Bush position={[1.8, 0, HD / 2 + 0.45]} c={snow > 0.5 ? "#dfe8e3" : "#4caf50"} />
      <Mailbox position={[-2.0, 0, HD / 2 + 3.3]} />
      <Fence from={-2.2 + 0.0 + 0} to={-1.6} z={HD / 2 + 3.45} /><Fence from={-0.2} to={2.3} z={HD / 2 + 3.45} />
      {e.sign && <YardSign text={e.sign[0]} bg={e.sign[1]} swing={e.signSwing ?? 0} position={[1.5, 0, HD / 2 + 2.4]} rotation={[0, -0.25, 0]} />}
    </group>
  );
};
const NEIGH: { x: number; z: number; ry: number; c: string; r: string; s: number }[] = [
  { x: -7.5, z: -2.0, ry: 0, c: "#bfdbfe", r: "#334155", s: 1.0 }, { x: 7.5, z: -2.3, ry: 0, c: "#fecaca", r: "#7f1d1d", s: 1.05 },
  { x: -15, z: -2.2, ry: 0, c: "#d9f99d", r: "#365314", s: 0.95 }, { x: 15, z: -2.0, ry: 0, c: "#fde68a", r: "#78350f", s: 1.0 },
  { x: -22.5, z: -2.1, ry: 0, c: "#e9d5ff", r: "#4c1d95", s: 1.0 }, { x: 22.5, z: -2.2, ry: 0, c: "#c7f9f1", r: "#134e4a", s: 1.0 },
  { x: -11, z: 15.5, ry: Math.PI, c: "#fed7aa", r: "#7c2d12", s: 1.0 }, { x: -3.5, z: 15.5, ry: Math.PI, c: "#e0e7ff", r: "#1e3a8a", s: 1.05 },
  { x: 4.0, z: 15.5, ry: Math.PI, c: "#fbcfe8", r: "#831843", s: 1.0 }, { x: 11.5, z: 15.5, ry: Math.PI, c: "#dcfce7", r: "#14532d", s: 0.95 },
  { x: 19, z: 15.5, ry: Math.PI, c: "#fef9c3", r: "#713f12", s: 1.0 }, { x: -18.5, z: 15.5, ry: Math.PI, c: "#cffafe", r: "#155e75", s: 1.0 },
];
const Neighbor: React.FC<{ c: string; r: string; snow: number; lit: number } & JSX.IntrinsicElements["group"]> = ({ c, r, snow, lit, ...p }) => {
  const wall = useMemo(() => siding(c), [c]);
  return (
    <group {...p}>
      <mesh position={[0, 1.2, 0]}><boxGeometry args={[3.8, 2.4, 3.0]} /><meshStandardMaterial map={wall} roughness={0.85} /></mesh>
      <Roof w={3.8} d={3.0} h={1.3} color={r} wall={c} snow={snow} position={[0, 2.4, 0]} />
      <Box s={[0.75, 1.5, 0.06]} c="#ffffff" position={[-0.8, 0.75, 1.52]} />
      <Window position={[0.9, 1.35, 1.52]} w={0.9} h={0.75} lit={lit} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.8, 0.012, 2.8]}><planeGeometry args={[0.9, 2.6]} />{M("#d6d3d1")}</mesh>
    </group>
  );
};
/** the whole street: ground, road, sidewalks, the rental house and its neighbours, trees, cars */
const Neighborhood: React.FC<{ e: Env; bank?: boolean }> = ({ e, bank }) => {
  const season = e.season ?? 0, snow = e.snow ?? 0, dusk = e.dusk ?? 0;
  const gc = new THREE.Color("#6cc35a").lerp(new THREE.Color("#a3a35a"), clamp((season % 1 - 0.2) * 3) * (season % 1 < 0.55 ? 1 : 0)).lerp(new THREE.Color("#eef3f6"), snow);
  const gtex = useMemo(() => grass("#ffffff"), []);
  const atex = useMemo(() => asphalt(), []);
  const leaf = leafAt(season), bare = bareAt(season);
  const trees: [number, number, number][] = [[-4.2, -0.6, 1.1], [4.0, -1.2, 1.25], [-11.2, -0.8, 1.0], [11.4, -0.5, 1.15], [-18.8, -1, 1.05], [18.6, -0.9, 1.0], [-7.3, 13.2, 0.9], [0.3, 13.0, 1.0], [7.8, 13.1, 0.95], [15.2, 13.2, 1.0]];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[160, 160]} /><meshStandardMaterial map={gtex} color={gc} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 4.0]}><planeGeometry args={[160, 3.6]} /><meshStandardMaterial map={atex} color={new THREE.Color("#ffffff").lerp(new THREE.Color("#f1f5f9"), snow * 0.6)} roughness={0.9} /></mesh>
      {Array.from({ length: 26 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-50 + i * 4, 0.02, 4.0]}><planeGeometry args={[1.6, 0.1]} />{M("#fde047")}</mesh>)}
      {[1.75, 6.25].map((z) => <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, z]}><planeGeometry args={[160, 0.9]} />{M("#d4d4d8", { roughness: 0.9 })}</mesh>)}
      {[1.3, 6.7].map((z) => <Box key={z} s={[160, 0.1, 0.12]} c="#a1a1aa" position={[0, 0.05, z === 1.3 ? 2.2 : 5.8]} />)}
      <RentalHouse e={e} />
      {NEIGH.map((n, i) => <Neighbor key={i} c={n.c} r={n.r} snow={snow} lit={e.lit ?? 0} position={[n.x, 0, n.z]} rotation={[0, n.ry, 0]} scale={n.s} />)}
      {trees.map(([x, z, s], i) => <LeafTree key={i} leaf={leaf} bare={bare} snow={snow} s={s * (1 + 0.25 * (e.age ?? 0))} position={[x, 0, z]} />)}
      <Car c="#ef4444" position={[9.5, 0, 3.0]} /><Car c="#38bdf8" position={[-13, 0, 5.0]} rotation={[0, Math.PI, 0]} />
      {bank && <BankBuilding position={[-8.6, 0, -6.5]} scale={0.95} />}
      {/* hills and far trees */}
      {Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <mesh key={"h" + i} position={[Math.cos(a) * 70, -6, Math.sin(a) * 70]}><sphereGeometry args={[18 + (i % 3) * 5, 20, 12]} />{M(snow > 0.5 ? "#e5edf0" : ["#5aa64f", "#4e9a48", "#68b35a"][i % 3], { roughness: 1 })}</mesh>; })}
      <Daylight dusk={dusk} />
    </group>
  );
};
const Daylight: React.FC<{ dusk?: number; sky?: [string, string] }> = ({ dusk = 0, sky }) => {
  const top = sky ? sky[0] : "#" + new THREE.Color("#4aa8ff").lerp(new THREE.Color("#3b3f8f"), dusk).getHexString();
  const bot = sky ? sky[1] : "#" + new THREE.Color("#d8efff").lerp(new THREE.Color("#ffb070"), dusk).getHexString();
  return (
    <>
      <Sky key={top + bot} top={top} bottom={bot} />
      <SceneBg fog={[bot, 40, 140]} />
      <hemisphereLight args={["#e3f2ff", "#5f7f4a", 0.55 - 0.2 * dusk]} />
      <directionalLight position={[-9 + 4 * dusk, 14 - 7 * dusk, 10]} intensity={2.6 - 0.6 * dusk} color={dusk > 0 ? "#" + new THREE.Color("#fff3df").lerp(new THREE.Color("#ffb36b"), dusk).getHexString() : "#fff3df"}
        castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16} shadow-camera-near={1} shadow-camera-far={60} />
    </>
  );
};

// =========================================================================== 1. the hook: tired at work, then the street that pays
const Office: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[0, [1.3, 2.1, 3.6], [0, 1.75, 0.3], 36], [C1_OUT, [0.35, 1.9, 2.05], [0, 1.65, 0.3], 34]], 0, 1.35);
  const fl = useMemo(() => wood(), []);
  const sigh = 0.5 + 0.5 * Math.sin(t * 1.6);
  const minute = 11 * 60 + 38 + t * 2;
  return (
    <group>
      <SceneBg bg="#0c1222" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 12]} /><meshStandardMaterial map={fl} roughness={0.7} /></mesh>
      <Box s={[12, 4, 0.2]} c="#334155" position={[0, 2, -1.6]} />
      <mesh position={[-1.6, 2.1, -1.48]}><planeGeometry args={[1.8, 1.4]} /><meshBasicMaterial map={nightWindow()} toneMapped={false} /></mesh>
      <Box s={[1.95, 0.08, 0.1]} c="#e2e8f0" position={[-1.6, 1.36, -1.45]} />
      {/* wall clock */}
      <group position={[1.3, 2.55, -1.48]}>
        <mesh><circleGeometry args={[0.32, 40]} /><meshBasicMaterial map={clockFace()} toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.01]} rotation={[0, 0, -((minute / 60) % 12) / 12 * Math.PI * 2]}><planeGeometry args={[0.03, 0.17]} /><meshBasicMaterial color="#111" /></mesh>
        <mesh position={[0, 0, 0.012]} rotation={[0, 0, -(minute % 60) / 60 * Math.PI * 2]}><planeGeometry args={[0.02, 0.26]} /><meshBasicMaterial color="#111" /></mesh>
      </group>
      {/* desk, monitor, lamp, mug, files */}
      <Box s={[1.9, 0.07, 0.85]} c="#8b5e3c" position={[0, 0.76, 0.75]} />
      {[[-0.85, 0.4], [0.85, 0.4], [-0.85, 1.1], [0.85, 1.1]].map(([x, z], i) => <Box key={i} s={[0.07, 0.75, 0.07]} c="#5b3b24" position={[x, 0.38, z]} />)}
      <group position={[-0.55, 0.8, 0.55]} rotation={[0, 0.5, 0]}>
        <Box s={[0.7, 0.45, 0.04]} c="#111827" position={[0, 0.38, 0]} />
        <mesh position={[0, 0.38, 0.025]} rotation={[0, Math.PI, 0]}><planeGeometry args={[0.64, 0.4]} /><meshBasicMaterial map={monitorScreen()} toneMapped={false} side={THREE.DoubleSide} /></mesh>
        <Box s={[0.06, 0.18, 0.06]} c="#111827" position={[0, 0.09, 0]} />
      </group>
      <pointLight position={[-0.5, 1.3, 0.9]} color="#7cc4ff" intensity={1.6} distance={3} />
      <group position={[0.7, 0.8, 0.55]}>
        <Box s={[0.2, 0.03, 0.2]} c="#1f2937" />
        <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.3]}><cylinderGeometry args={[0.015, 0.015, 0.5, 8]} />{M("#1f2937")}</mesh>
        <mesh position={[-0.12, 0.48, 0]} rotation={[0, 0, -0.6]}><coneGeometry args={[0.12, 0.16, 20, 1, true]} />{M("#facc15", { side: THREE.DoubleSide })}</mesh>
        <Glow color="#ffd27a" size={0.7} opacity={0.8} position={[-0.15, 0.42, 0]} />
      </group>
      <pointLight position={[0.5, 1.2, 0.7]} color="#ffcf7a" intensity={2.2} distance={4} castShadow />
      <mesh position={[0.35, 0.86, 0.95]}><cylinderGeometry args={[0.05, 0.045, 0.13, 16]} />{M("#f8fafc")}</mesh>
      {[0, 1, 2, 3].map((k) => <Box key={k} s={[0.34, 0.025, 0.25]} c={k % 2 ? "#f1f5f9" : "#e2e8f0"} position={[-0.75, 0.81 + k * 0.026, 0.95]} rotation={[0, 0.1 * k, 0]} />)}
      {/* chair + Alex */}
      <Box s={[0.6, 0.08, 0.55]} c="#1f2937" position={[0, 0.48, -0.05]} />
      <Box s={[0.6, 0.75, 0.08]} c="#1f2937" position={[0, 0.85, -0.33]} rotation={[-0.12, 0, 0]} />
      <Person position={[0, 0, 0]} look={alex} pose={{ sit: 1, mood: "nervous", armR: 1.15 + 0.03 * sigh, armL: 1.15 + 0.03 * sigh, head: 0, tilt: 0.12, blink: Math.max(blink(t, 1), 0.45 * ramp(t, 1.2, 2.2)), sweat: ramp(t, 0.8, 1.6), bob: -0.02 * sigh }} />
      <group position={[0, 1.07 + 0.01 * sigh, 0.55]} rotation={[-0.75, 0, 0]}>
        <mesh><planeGeometry args={[0.66, 0.29]} /><meshStandardMaterial map={paycheck()} roughness={0.7} side={THREE.DoubleSide} /></mesh>
      </group>
      <hemisphereLight args={["#90a4c8", "#2a1e14", 0.45]} />
      <ambientLight intensity={0.15} />
    </group>
  );
};
const Hook: React.FC<{ t: number }> = ({ t }) => {
  // pull back from the street to reveal the neighbourhood, then come down to Alex on the sidewalk
  useCamKeys(t, [
    [C1_OUT, [-1.0, 2.6, 7.0], [-0.6, 2.4, -1.0], 40], [B1_MEET - 0.6, [8, 19, 30], [0, 0.5, -1], 42],
    [B1_MEET + 0.5, [-4.6, 2.6, 9.6], [-1.3, 2.2, 0.6], 40], [10, [-3.0, 2.4, 8.8], [-1.2, 2.2, 0.6], 38]], 0, 1.15);
  const meet = t > B1_MEET - 0.2;
  const wave = meet ? Math.sin((t - B1_MEET) * 9) : 0;
  const ALEX: V3 = [-2.1, 0, 2.3], PH: V3 = [-1.25, 1.75, 2.5];
  return (
    <group>
      <Neighborhood e={{ sign: ["RENTED", "#16a34a"], dusk: 0.15 }} />
      <Person position={ALEX} rotation={[0, 0.25, 0]} look={alex} pose={idle(t, 1, { mood: meet ? "smile" : "wow", armR: meet && t < B1_MEET + 1.6 ? 2.7 + 0.25 * wave : 0.9, armL: 0.15, head: meet ? 0.1 : -0.6 })} />
      <Phone position={PH} rotation={[0, 0.15, 0]} scale={1 + 0.08 * pulse(t, Math.floor(t * 2.5) / 2.5, 0.3)} glow={0.5 + 0.5 * Math.sin(t * 5)} />
      <Stream t={t} a={[DOOR[0], 1.4, DOOR[2] + 0.4]} b={PH} h={2.4} t0={C1_OUT + 0.1} t1={9.6} every={0.22} travel={1.4} scale={1.1} />
      <Arc a={[DOOR[0], 1.4, DOOR[2] + 0.4]} b={PH} h={2.4} reveal={easeOut(ramp(t, C1_OUT, C1_OUT + 1.2))} color={COL.green} width={0.035} />
    </group>
  );
};
export const Scene1: React.FC<{ t: number }> = ({ t }) => (t < C1_OUT ? <Office key="o" t={t} /> : <Hook key="h" t={t} />);

// =========================================================================== 2. buying: the listing, the lender, the keys
const Listing: React.FC<{ t: number }> = ({ t }) => {
  const u = ramp(t, 10.1, 12.3);
  const x = lerp(-5.2, -0.4, u);
  const walking = u > 0 && u < 1;
  useCamKeys(t, [[10, [-7.5, 2.6, 8.8], [-3.0, 2.2, 0.5], 40], [C2_OFFICE, [3.6, 2.6, 9.6], [0.3, 2.2, -0.2], 40]], 0, 1.2);
  return (
    <group>
      <Neighborhood e={{ sign: ["FOR SALE|$250,000", "#dc2626"], signSwing: 0.05 * Math.sin(t * 2) }} />
      <Person position={[x, 0, 2.1]} rotation={[0, walking ? Math.PI / 2 : 2.4, 0]} look={alex}
        pose={walking ? walkPose(t, 1) : idle(t, 1, { mood: "wow", armR: 1.4, head: -0.3 })} />
    </group>
  );
};
const Lender: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C2_OFFICE, [2.7, 2.3, 2.4], [0.0, 1.35, 0.0], 38], [B2_LOAN, [2.2, 2.4, 1.9], [0.0, 1.3, 0.0], 38], [C2_KEYS, [-1.8, 2.5, 2.4], [0.0, 1.3, 0.0], 36]], 0, 1.65);
  const fl = useMemo(() => wood(), []);
  const sign_ = t > B2_LOAN + 1.4;
  const write = sign_ ? 0.12 * Math.sin(t * 22) : 0;
  const merge = smooth(ramp(t, B2_LOAN + 1.0, B2_LOAN + 1.8));
  // $10,000 bundles: 5 from Alex (down payment), 20 from the bank (loan)
  const bundles: React.ReactNode[] = [];
  for (let i = 0; i < 25; i++) {
    const mine = i < 5;
    const k = mine ? i : i - 5;
    const appear = mine ? B2_DOWN + 0.1 + k * 0.08 : B2_LOAN + 0.1 + k * 0.035;
    const a = clamp((t - appear) / 0.35);
    if (a <= 0) continue;
    const from: V3 = mine ? [-0.25, 0.86 + k * 0.075, 0.3] : [k < 10 ? 0.25 : 0.55, 0.86 + (k % 10) * 0.075, -0.15];
    const to: V3 = [i < 13 ? -0.18 : 0.38, 0.86 + (i % 13) * 0.075, 0.0];
    const p0: V3 = mine ? [-0.25, 1.7, 0.9] : [0.4, 1.7, -0.9];
    const pa = arcPoint(p0, from, 0.3, easeOut(a));
    const pos: V3 = [lerp(pa[0], to[0], merge), lerp(pa[1], to[1], merge), lerp(pa[2], to[2], merge)];
    bundles.push(<Stack key={i} position={pos} rotation={[0, 0.2 * (1 - merge), 0]} scale={0.9} />);
  }
  return (
    <group>
      <SceneBg bg="#dbe6f0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 12]} /><meshStandardMaterial map={fl} roughness={0.7} /></mesh>
      <Box s={[12, 4, 0.2]} c="#c7d6e6" position={[0, 2, -2.2]} />
      <Box s={[0.2, 4, 12]} c="#d7e2ee" position={[-3.2, 2, 0]} />
      <mesh position={[-3.08, 2.0, -0.4]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.6, 1.6]} /><meshBasicMaterial color="#bfe6ff" toneMapped={false} /></mesh>
      <BankBadge position={[0.4, 2.6, -2.08]} />
      {/* desk */}
      <Box s={[1.8, 0.08, 0.9]} c="#f8fafc" position={[0, 0.78, 0]} />
      <Box s={[1.7, 0.7, 0.06]} c="#cbd5e1" position={[0, 0.4, -0.38]} />
      {/* chairs */}
      <Box s={[0.6, 0.08, 0.55]} c="#334155" position={[0, 0.48, -0.95]} />
      <Box s={[0.6, 0.08, 0.55]} c="#334155" position={[0, 0.48, 0.95]} />
      <Person position={[0, 0, -0.95]} look={LOOKS.lender} pose={idle(t, 3, { sit: 1, armR: t > B2_LOAN && t < B2_LOAN + 1.0 ? 1.3 : 0.9, armL: 0.9, mood: "smile" })} />
      <Person position={[0, 0, 0.95]} rotation={[0, Math.PI, 0]} look={alex} pose={idle(t, 1, { sit: 1, armR: sign_ ? 1.05 + write : t > B2_DOWN && t < B2_DOWN + 0.8 ? 1.4 : 0.9, armL: 0.9, mood: merge > 0.5 ? "wow" : "smile", head: write * 0.3 })} />
      {bundles}
      {sign_ && <group position={[-0.3, 0.83, 0.38]} rotation={[-Math.PI / 2, 0, 0.2]}>
        <mesh><planeGeometry args={[0.4, 0.52]} /><meshStandardMaterial map={contract()} roughness={0.7} /></mesh>
      </group>}
      {sign_ && <mesh position={[-0.33 + write, 0.9, 0.42]} rotation={[0.9, 0, 0.6]}><cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />{M("#111827")}</mesh>}
      {t > B2_DOWN && <Label text="DOWN PAYMENT" h={0.14} color="#fde68a" position={[-0.25, 1.45 + 0.03 * Math.sin(t * 3), 0.35]} rotation={[0, -0.6, 0]} scale={backOut(ramp(t, B2_DOWN, B2_DOWN + 0.3))} />}
      {t > B2_LOAN && merge < 0.9 && <Label text="BANK LOAN" h={0.14} color="#bbf7d0" position={[0.55, 1.75, -0.15]} rotation={[0, 0.9, 0]} scale={backOut(ramp(t, B2_LOAN, B2_LOAN + 0.3))} />}
      <hemisphereLight args={["#ffffff", "#8a7a6a", 0.8]} />
      <directionalLight position={[-3, 5, 3]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} />
    </group>
  );
};
const BankBadge: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <mesh><planeGeometry args={[1.6, 0.42]} /><meshBasicMaterial map={sign("HOME LOANS", "#14532d", "#fde68a")} toneMapped={false} /></mesh>
  </group>
);
const Keys: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C2_KEYS, [-1.4, 2.4, 8.6], [-1.4, 2.4, 1.8], 38], [20, [-2.2, 3.6, 12.8], [-2.8, 2.4, -1.5], 42]]);
  const k = ramp(t, C2_KEYS, C2_KEYS + 0.9);
  const ALEX: V3 = [-1.4, 0, 2.3];
  const keyPos: V3 = [lerp(-0.2, ALEX[0] + 0.36, easeOut(k)), lerp(4.0, 2.25, easeOut(k)), ALEX[2] + 0.15];
  const pay = t > B2_BACK + 0.4;
  return (
    <group>
      <Neighborhood bank e={{ sign: ["SOLD", "#1d4ed8"] }} />
      <Person position={ALEX} rotation={[0, 0.1, 0]} look={alex} pose={idle(t, 1, { mood: "wow", armR: k > 0.9 ? 2.8 : 0.4 + 2.4 * k, bob: k > 0.9 && !pay ? 0.05 * Math.abs(Math.sin(t * 8)) : 0 })} />
      <Key position={keyPos} rotation={[0, t * 4, 0.4]} scale={0.8} />
      <Glow color={COL.gold} size={0.9} opacity={0.7} position={keyPos} />
      {pay && <Stream t={t} a={[ALEX[0] - 0.3, 1.4, ALEX[2]]} b={[-8.0, 2.4, -4.6]} h={2.0} t0={B2_BACK + 0.4} t1={19.8} every={0.3} travel={1.3} scale={0.9} />}
    </group>
  );
};
export const Scene2: React.FC<{ t: number }> = ({ t }) => (t < C2_OFFICE ? <Listing key="l" t={t} /> : t < C2_KEYS ? <Lender key="b" t={t} /> : <Keys key="k" t={t} />);

// =========================================================================== 3. renting: the family moves in, rent flows, bills arrive
const Renting: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[20, [6.2, 3.2, 10.4], [1.2, 2.0, 0.6], 42], [B3_PAY, [3.0, 2.8, 9.0], [-0.4, 2.0, 0.8], 40], [C3_BILLS, [-1.6, 2.8, 8.8], [-0.6, 2.0, 0.8], 40]]);
  const u = ramp(t, 20.1, B3_RENTS + 1.2);
  const fx = lerp(6.5, 0.6, u), walking = u > 0 && u < 1;
  const handed = t > B3_RENTS + 1.3;
  const ALEX: V3 = [-1.3, 0, 2.4];
  const dadP: V3 = [fx - 0.2, 0, 2.2];
  const fam = (dx: number, dz: number, look: Look, s: number, k: number, extra: Pose) =>
    <Person position={[fx + dx, 0, 2.2 + dz]} rotation={[0, walking ? -Math.PI / 2 : -1.2, 0]} scale={s} look={look} pose={walking ? walkPose(t, k) : idle(t, k, extra)} />;
  const boxes = ramp(t, B3_PAY - 0.6, B3_PAY + 0.6);
  return (
    <group>
      <Neighborhood e={{ sign: [handed ? "RENTED" : "FOR RENT", handed ? "#16a34a" : "#ea580c"] }} />
      <Person position={ALEX} rotation={[0, 0.9, 0]} look={alex} pose={idle(t, 1, { mood: "smile", armR: handed && t < B3_RENTS + 2.0 ? 1.5 : t > B3_PAY ? 1.2 : 0.3 })} />
      {fam(-0.2, 0, LOOKS.dad, 0.98, 2, { mood: handed ? "wow" : "smile", armR: handed && t < B3_PAY + 1.0 ? 1.4 : t > B3_PAY ? 1.0 : 0.2 })}
      {fam(0.75, 0.25, LOOKS.mom, 0.92, 4, { mood: "smile", armL: handed ? 2.4 : 0.2 })}
      {fam(1.5, -0.1, LOOKS.kid, 0.62, 6, { mood: "wow", armR: handed ? 2.8 : 0.2, armL: handed ? 2.8 : 0.2, bob: handed ? 0.08 * Math.abs(Math.sin(t * 9)) : 0 })}
      {handed && <group position={[dadP[0] + 0.35, 1.2, dadP[2] + 0.3]} rotation={[-0.3, -0.5, 0]}><mesh><planeGeometry args={[0.3, 0.4]} /><meshStandardMaterial map={lease()} side={THREE.DoubleSide} /></mesh></group>}
      {t > B3_RENTS + 0.4 && t < B3_RENTS + 1.6 && <Key position={[lerp(ALEX[0] + 0.5, dadP[0] - 0.3, smooth(ramp(t, B3_RENTS + 0.4, B3_RENTS + 1.3))), 1.25 + 0.3 * Math.sin(Math.PI * ramp(t, B3_RENTS + 0.4, B3_RENTS + 1.3)), 2.6]} rotation={[0, t * 5, 0]} scale={0.6} />}
      {[[-1.7, 0.22, 0], [-1.25, 0.22, 0.1], [-1.5, 0.58, 0.05], [-0.3, 0.22, -0.1]].map(([x, y, z], i) => (
        <MovingBox key={i} position={[DOOR[0] + x + 1.2, y - 0.22 + 0.22, DOOR[2] + 0.6 + z]} scale={backOut(clamp(boxes * 4 - i))} />))}
      <Stream t={t} a={[dadP[0], 1.3, dadP[2] + 0.2]} b={[ALEX[0] + 0.2, 1.4, ALEX[2] + 0.2]} h={1.2} t0={B3_PAY} t1={C3_BILLS - 0.6} every={0.18} travel={0.9} scale={0.8} />
    </group>
  );
};
const Bills: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[C3_BILLS, [0.6, 2.3, 6.6], [-0.9, 2.1, 1.4], 36], [30, [-0.2, 2.2, 5.6], [-1.0, 2.05, 1.4], 34]]);
  const ALEX: V3 = [-1.0, 0, 1.6];
  const worried = t > B3_BILLS - 0.2;
  const env: [string, number, V3][] = [["MORTGAGE", B3_BILLS - 0.1, [-1.75, 2.15, 2.0]], ["TAXES", B3_BILLS + 0.35, [-0.2, 2.3, 2.0]], ["INSURANCE", B3_BILLS + 0.8, [-1.5, 2.65, 1.9]], ["REPAIRS", B3_BILLS + 1.25, [-0.35, 2.75, 1.9]]];
  return (
    <group>
      <Neighborhood e={{ sign: ["RENTED", "#16a34a"] }} />
      <Person position={ALEX} rotation={[0, 0.35, 0]} look={alex} pose={idle(t, 1, { mood: worried ? "nervous" : "smile", sweat: ramp(t, B3_BILLS + 0.4, B3_BILLS + 1.2), armR: worried ? 0.5 : 1.2, armL: worried ? 0.5 : 0.2, head: worried ? 0.25 * Math.sin(t * 3) : 0 })} />
      {!worried && <group position={[ALEX[0] + 0.4, 1.12, ALEX[2] + 0.55]}>{[0, 1, 2].map((k) => <group key={k} rotation={[0.3, 0.3, 0.2 * k]} position={[0, 0.02 * k, 0]}><mesh><planeGeometry args={[0.46, 0.2]} /><meshStandardMaterial color="#bfe3b0" side={THREE.DoubleSide} /></mesh></group>)}</group>}
      {env.map(([txt, a, p], i) => {
        const u = ramp(t, a, a + 0.45);
        if (u <= 0) return null;
        return <group key={i} position={[p[0], lerp(p[1] + 2.2, p[1], easeOut(u)), p[2]]} rotation={[0, 0.3 * Math.sin(t * 2 + i) + 0.35, 0.15 * Math.sin(t * 3 + i)]}>
          <mesh><planeGeometry args={[0.62, 0.36]} /><meshStandardMaterial map={envelope(txt)} side={THREE.DoubleSide} roughness={0.7} /></mesh>
        </group>;
      })}
    </group>
  );
};
export const Scene3: React.FC<{ t: number }> = ({ t }) => (t < C3_BILLS ? <Renting key="r" t={t} /> : <Bills key="b" t={t} />);

// =========================================================================== 4. the monthly math: 36 bundles of $50 = $1,800
const BIN: Record<string, V3> = { mort: [-2.3, 0, -1.2], tax: [0, 0, -2.6], rep: [2.3, 0, -1.2], save: [1.5, 0, 1.3] };
const STACK0: V3 = [0, 0, 0];
const UNIT = 0.06;   // bundle height (scaled)
export const Scene4: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[30, [0.0, 4.2, 7.6], [0, 2.7, -0.6], 46], [B4_REP, [1.2, 4.4, 7.4], [0, 2.6, -0.6], 46], [B4_LEFT, [3.2, 3.4, 6.2], [1.0, 2.3, 0.3], 44], [B4_WIPE + 0.4, [4.0, 3.4, 6.2], [1.7, 2.3, 0.0], 44], [40, [4.4, 3.6, 6.2], [1.6, 2.3, -0.2], 44]]);
  // 36 bundles, top of the column first: 24 mortgage, 5 taxes+insurance, 4 repairs+vacancy, 3 left (cash flow)
  const groups: [string, number, number][] = [["mort", 24, B4_MORT + 0.35], ["tax", 5, B4_TAX + 0.6], ["rep", 4, B4_REP + 0.6], ["save", 3, B4_LEFT + 0.4]];
  const wipe = B4_WIPE + 0.6;
  const items: React.ReactNode[] = [];
  let idx = 35;
  for (const [g, n, t0] of groups) {
    for (let k = 0; k < n; k++, idx--) {
      const i = idx;
      const start: V3 = [STACK0[0], 0.4 + i * UNIT, STACK0[2]];
      const tl = t0 + k * (g === "mort" ? 0.035 : 0.09);
      const u = clamp((t - tl) / 0.55);
      const b = BIN[g];
      const dest: V3 = g === "save" ? [b[0], 0.75 + k * 0.05, b[2]] : [b[0] + ((k % 3) - 1) * 0.12, 0.55 + Math.floor(k / 3) * 0.02, b[2]];
      let p = u <= 0 ? start : arcPoint(start, dest, 1.0, easeOut(u));
      let s = u <= 0 ? 1 : lerp(1, g === "save" ? 0.6 : 0.0, easeIn(u));
      if (g === "save" && t > wipe) {   // the "one big repair" takes the cash flow
        const w = clamp((t - wipe - k * 0.08) / 0.6);
        p = arcPoint(dest, [BIN.rep[0], 0.6, BIN.rep[2]], 1.0, easeOut(w));
        s = lerp(0.6, 0, easeIn(w));
      }
      if (s <= 0.01) continue;
      items.push(<Stack key={i} position={p} rotation={[0, u > 0 ? (1 - u) * 2 + u * 0.3 : 0, 0]} scale={[s * 0.95, s * 0.8, s * 0.95]} />);
    }
  }
  const binPulse = (g: string) => { const [, , t0] = groups.find((x) => x[0] === g)!; return pulse(t, t0 + 0.5, 0.5); };
  const shake = t > B4_WIPE && t < wipe + 0.4 ? 0.05 * Math.sin(t * 60) : 0;
  return (
    <group>
      <SceneBg bg="#0b1530" fog={["#0b1530", 12, 30]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[5.2, 64]} />{M("#1e2a4f", { roughness: 0.4, metalness: 0.2 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><ringGeometry args={[5.0, 5.2, 64]} /><meshBasicMaterial color="#3fd8ff" toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}><planeGeometry args={[80, 80]} />{M("#081022")}</mesh>
      {/* column base */}
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.55, 0.6, 0.4, 32]} />{M("#334155", { metalness: 0.4, roughness: 0.3 })}</mesh>
      {t < B4_MORT + 0.3 && <Label text="$1,800 RENT" h={0.32} color="#bbf7d0" position={[0, 2.95, 0]} scale={backOut(ramp(t, 30.05, 30.4))} />}
      {items}
      {/* bins */}
      <group position={BIN.mort} scale={1 + 0.12 * binPulse("mort")}><BankBuilding scale={0.38} /><Label text="MORTGAGE" h={0.2} color="#fecaca" position={[0, 0.25, 1.05]} /></group>
      <group position={BIN.tax} scale={1 + 0.12 * binPulse("tax")}><Shield /><Label text="TAXES + INSURANCE" h={0.18} color="#bae6fd" position={[0, 0.2, 0.55]} /></group>
      <group position={BIN.rep} scale={1 + 0.12 * binPulse("rep") + 0.15 * pulse(t, wipe + 0.4, 0.6)}><Toolbox /><Label text="REPAIRS + VACANCY" h={0.18} color="#fed7aa" position={[0, 0.12, 0.62]} /></group>
      <group position={[BIN.save[0] + shake, 0, BIN.save[2]]} rotation={[0, -0.6, 0]}><Piggy glow={pulse(t, B4_LEFT + 0.9, 0.8)} /><Label text="CASH FLOW" h={0.2} color="#bbf7d0" position={[0.35, 0.15, 0.75]} rotation={[0, 0.6, 0]} /></group>
      {/* Alex at the side */}
      <Person position={[-1.3, 0, 1.6]} rotation={[0, 0.5, 0]} look={alex} pose={idle(t, 1, { mood: t > B4_WIPE ? "nervous" : t > B4_LEFT ? "wow" : "smile", sweat: ramp(t, B4_WIPE + 0.3, B4_WIPE + 0.9), armR: t > B4_LEFT && t < B4_WIPE ? 2.5 : 0.5, head: 0.4 })} />
      {t > B4_WIPE && <group position={[BIN.save[0], 2.2, BIN.save[2]]} scale={backOut(ramp(t, B4_WIPE, B4_WIPE + 0.3))}><Label text="!" h={0.6} color="#ff4057" /><Glow color="#ff4057" size={1.6} opacity={0.6} /></group>}
      <hemisphereLight args={["#bcd4ff", "#1a1530", 0.65]} />
      <spotLight position={[0, 7, 3]} angle={0.7} penumbra={0.6} intensity={60} color="#ffffff" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-3, 2, 2]} color="#3fd8ff" intensity={6} distance={9} />
      <pointLight position={[3, 2, 2]} color="#ff9a3c" intensity={5} distance={9} />
    </group>
  );
};

// =========================================================================== 5. time-lapse: five years of seasons, loan shrinks, value (maybe) rises
export const Y0 = 40.4, Y1 = 47.6;    // the five years play between these times
export const yearsAt = (t: number) => 5 * ramp(t, Y0, Y1);
export const loanAt = (y: number) => { const P = 200000, i = 0.005, pmt = P * i / (1 - Math.pow(1 + i, -360)), k = 12 * y; return P * Math.pow(1 + i, k) - pmt * (Math.pow(1 + i, k) - 1) / i; };
export const valueAt = (y: number) => 250000 + 50000 * y / 5;   // hypothetical: +$50,000 over five years
export const Scene5: React.FC<{ t: number }> = ({ t }) => {
  const y = yearsAt(t), season = y;   // one season cycle per year
  const snow = snowAt(season);
  const dayk = 0.5 + 0.5 * Math.cos(y * Math.PI * 2 * 3);   // quick day/night shimmer during the time-lapse
  const lapse = t > Y0 && t < Y1 ? 1 : 0;
  useCamKeys(t, [[40, [-4.0, 4.4, 13.0], [2.2, 3.1, -0.4], 42], [Y1, [9.0, 4.6, 12.0], [2.4, 3.1, -0.4], 42], [50, [9.4, 4.2, 11.4], [2.8, 3.1, -0.2], 42]]);
  const K = 1 / 100000;   // 1 m per $100,000
  const V = valueAt(y), L = loanAt(y);
  const COLP: V3 = [3.5, 0, 1.0];
  return (
    <group>
      <Neighborhood e={{ sign: ["RENTED", "#16a34a"], season, snow, lit: lapse * (1 - dayk) * 0.9, dusk: lapse * (1 - dayk) * 0.5, age: y / 5 }} />
      {/* home value column: red = what Alex still owes, gold = his equity */}
      <group position={COLP}>
        <mesh position={[0, 0.06, 0]}><cylinderGeometry args={[0.75, 0.8, 0.12, 32]} />{M("#334155", { metalness: 0.4, roughness: 0.4 })}</mesh>
        <mesh position={[0, 0.12 + (L * K) / 2, 0]}><boxGeometry args={[0.9, L * K, 0.9]} />{M("#ef4444", { roughness: 0.4 })}</mesh>
        <mesh position={[0, 0.12 + L * K + ((V - L) * K) / 2, 0]}><boxGeometry args={[0.92, (V - L) * K, 0.92]} />{M(COL.gold, { metalness: 0.6, roughness: 0.25, emissive: new THREE.Color("#5a3d00"), emissiveIntensity: 0.4 + 0.6 * pulse(t, B5_EQ, 0.8) })}</mesh>
        <Label text="LOAN" h={0.26} color="#ffffff" position={[0, 0.12 + (L * K) / 2, 0.47]} />
        <Label text="EQUITY" h={0.24} color="#3a2500" position={[0, 0.12 + L * K + ((V - L) * K) / 2, 0.47]} />
        <Glow color={COL.gold} size={2.2} opacity={0.35 + 0.4 * pulse(t, B5_DEF, 1.0)} position={[0, 0.12 + L * K + ((V - L) * K) / 2, 0]} />
      </group>
      <Person position={[1.7, 0, 1.9]} rotation={[0, 0.2, 0]} look={alex} pose={idle(t, 1, { mood: t > B5_EQ ? "wow" : "smile", armR: t > B5_DEF ? 1.6 : 0.3, head: -0.5 })} />
      {/* falling snow in winter */}
      {snow > 0.05 && Array.from({ length: 60 }, (_, i) => { const r = rng(i + 3); const x = (r() - 0.5) * 16, z = (r() - 0.5) * 10, sp = 0.6 + r() * 0.6; const yy = 8 - (((t * sp + r() * 8) % 8)); return <mesh key={i} position={[x + 2, yy, z]}><sphereGeometry args={[0.04, 6, 4]} /><meshBasicMaterial color="#ffffff" transparent opacity={snow} /></mesh>; })}
    </group>
  );
};

// =========================================================================== 6. the ending: Alex proud, the street of possibilities
export const Scene6: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[50, [-0.9, 2.3, 7.0], [-0.9, 2.1, 2.0], 36], [B6_GUAR, [-1.8, 4.0, 12.0], [-0.6, 2.4, 0.0], 42], [B6_SECRET + 0.5, [2.0, 17, 30], [0, 0.5, 2.0], 46], [60, [3.0, 19, 33], [0, 0.5, 2.0], 46]]);
  const others = [7, 8, 0, 1];   // houses that light up as "maybe one day"
  const pinU = ramp(t, B6_GUAR, B6_GUAR + 1.2);
  return (
    <group>
      <Neighborhood e={{ sign: ["RENTED", "#16a34a"], dusk: 0.55 + 0.3 * ramp(t, 50, 60), lit: 0.6 + 0.4 * ramp(t, 50, 56) }} />
      <Person position={[-0.9, 0, 2.6]} rotation={[0, 0.0, 0]} look={alex} pose={idle(t, 1, { mood: "smile", armR: t > 50.6 ? 2.6 : 0.3 + 2.3 * ramp(t, 50.1, 50.6), armL: 0.15, head: 0.1 * Math.sin(t) })} />
      <Glow color={COL.gold} size={4} opacity={0.3} position={[HOUSE[0], 4.6, HOUSE[2]]} />
      {others.map((k, i) => {
        const n = NEIGH[k]; const s = backOut(clamp(pinU * 3 - i * 0.5));
        if (s <= 0) return null;
        return <group key={k} position={[n.x, 5.0 + 0.15 * Math.sin(t * 2 + i), n.z]} scale={s}>
          <mesh rotation={[Math.PI, 0, 0]}><coneGeometry args={[0.45, 1.0, 24]} />{M(COL.gold, { metalness: 0.7, roughness: 0.25, emissive: new THREE.Color("#7a5200"), emissiveIntensity: 0.6 })}</mesh>
          <mesh position={[0, 0.55, 0]}><sphereGeometry args={[0.5, 24, 16]} />{M(COL.gold, { metalness: 0.7, roughness: 0.25, emissive: new THREE.Color("#7a5200"), emissiveIntensity: 0.6 })}</mesh>
          <Glow color={COL.gold} size={2.6} opacity={0.6} position={[0, 0.4, 0]} />
        </group>;
      })}
    </group>
  );
};
void Tree; void easeIn; void SCN;
