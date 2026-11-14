// "The Crypto Trader Who Shocked the Internet: Kimchi": six exact 10 s scenes, each places its own camera from global time t.
// Kimchi is pseudonymous: he is shown as an anonymous stylised character (dark hoodie, red beanie), not a real likeness.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Coin, Coins, Person, Look, Pose } from "./Actors";
import { Box, Glow, Label, M, Sign, Sky, V3, mix3, useCamKeys } from "./Kit";
import { COL, E, S, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth, backOut, blink } from "./timeline";
import { tower } from "./textures";

export const KIMCHI: Look = { hoodie: "#1f2937", hair: "#111111", hairStyle: 0, pants: "#111827", skin: "#e8bf98", hat: "#dc2626" };
const WINNER: Look = { hoodie: "#16a34a", hair: "#3b2a1a", hairStyle: 2, skin: "#c98f68" };
const LOSER: Look = { hoodie: "#64748b", hair: "#1f2937", hairStyle: 1, skin: "#f1c27d" };

// sub-scene cuts (between sentences / chunks)
export const PUSH_AT = 3.0;                                  // scene 1: hook pull-back -> slow push-in
export const GRAPH_AT = (E(2) + S(3)) / 2;                   // scene 2: research -> $100 graphic
export const CRASH_AT = S(4);                                // scene 2: "...crash in seconds" -> $80
export const SURGE_AT = (E(5) + S(6)) / 2;                   // scene 3: announcement -> surge
export const SPLIT_AT = 40.0, STAT_AT = (E(9) + S(10)) / 2, WATCH_AT = (E(10) + S(11)) / 2;

// =========================================================================== live chart textures
type Mode = "noise" | "pump" | "crash" | "climb";
/** a canvas texture redrawn every frame: candles + price line, scrolling with time */
const useChart = (mode: Mode, w = 512, h = 320, seed = 1) => {
  const { canvas, tex } = useMemo(() => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return { canvas: c, tex: t };
  }, [w, h]);
  const draw = (t: number, k = 1) => {
    const g = canvas.getContext("2d")!;
    g.fillStyle = "#050a14"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(80,120,180,0.18)"; g.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    const N = 36, cw = w / N, r = rng(seed + Math.floor(t * 6)), base = rng(seed);
    let p = 0.5; const pts: number[] = [];
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      const trend = mode === "pump" ? Math.pow(u, 3) * 0.75 * k : mode === "crash" ? -Math.pow(u, 1.6) * 0.75 * k : mode === "climb" ? u * 0.55 * k : 0;
      p = 0.5 + trend + (base() - 0.5) * 0.12 + Math.sin(i * 0.7 + t * 2 + seed) * 0.04;
      pts.push(p);
    }
    for (let i = 1; i < N; i++) {
      const o = pts[i - 1], c = pts[i] + (r() - 0.5) * 0.02, up = c >= o;
      const y = (v: number) => h - 20 - v * (h - 60);
      g.fillStyle = up ? "#22e07a" : "#ff3b5c"; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(i * cw + cw / 2, y(Math.max(o, c) + 0.03)); g.lineTo(i * cw + cw / 2, y(Math.min(o, c) - 0.03)); g.stroke();
      g.fillRect(i * cw + 3, y(Math.max(o, c)), cw - 6, Math.max(2, Math.abs(y(o) - y(c))));
    }
    const last = pts[N - 1], prev = pts[N - 2];
    g.fillStyle = last >= prev ? "#22e07a" : "#ff3b5c"; g.font = "bold 30px Inter"; g.textAlign = "right";
    const pct = Math.round((last - 0.5) * 400 + Math.sin(t * 5) * 3);
    g.fillText(`${pct >= 0 ? "+" : ""}${pct}%`, w - 14, 38);
    tex.needsUpdate = true;
  };
  return { tex, draw };
};
const Monitor: React.FC<{ mode: Mode; t: number; seed?: number; k?: number } & JSX.IntrinsicElements["group"]> = ({ mode, t, seed = 1, k = 1, ...p }) => {
  const { tex, draw } = useChart(mode, 512, 320, seed);
  draw(t, k);
  return (
    <group {...p}>
      <Box s={[1.08, 0.7, 0.05]} c="#0b0f19" o={{ metalness: 0.6, roughness: 0.3 }} />
      <mesh position={[0, 0, 0.027]}><planeGeometry args={[1.0, 0.62]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <Box s={[0.08, 0.35, 0.08]} c="#111827" position={[0, -0.5, -0.05]} />
    </group>
  );
};

// =========================================================================== the dark bedroom with three monitors
const DESK_Z = -0.9;
const TradingRoom: React.FC<{ t: number; mode: Mode; glow?: string; k?: number }> = ({ t, mode, glow = "#3b82f6", k = 1 }) => {
  const flick = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
  const city = useMemo(() => tower(), []);
  return (
    <group>
      <color attach="background" args={["#03060d"]} />
      <ambientLight intensity={0.12} color="#4466aa" />
      <pointLight position={[0, 1.3, DESK_Z + 0.3]} intensity={5.5 * flick} distance={4.5} color={glow} />
      <pointLight position={[0.9, 1.4, DESK_Z + 0.25]} intensity={2.5} distance={3} color={mode === "crash" ? COL.red : COL.green} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[10, 10]} />{M("#111827", { roughness: 0.8 })}</mesh>
      <Box s={[10, 5, 0.2]} c="#0f172a" position={[0, 2.5, -2.0]} />
      {/* night window: city lights far away, rain streaks */}
      <mesh position={[-1.9, 2.0, -1.88]}><planeGeometry args={[1.6, 1.3]} /><meshBasicMaterial map={city} color="#6b7fbf" toneMapped={false} /></mesh>
      {Array.from({ length: 16 }, (_, i) => <mesh key={i} position={[-2.65 + i * 0.1, 2.0 + 0.6 - ((t * 1.6 + i * 0.37) % 1.3), -1.86]}><planeGeometry args={[0.006, 0.12]} /><meshBasicMaterial color="#9fb4ff" transparent opacity={0.5} /></mesh>)}
      {/* desk + three monitors + keyboard */}
      <Box s={[2.6, 0.06, 0.8]} c="#1f2937" o={{ roughness: 0.4 }} position={[0, 0.76, DESK_Z]} />
      <Monitor mode={mode} t={t} seed={1} k={k} position={[0, 1.42, DESK_Z - 0.2]} />
      <Monitor mode={mode === "noise" ? "noise" : mode} t={t} seed={2} k={k * 0.8} position={[-1.1, 1.42, DESK_Z - 0.05]} rotation={[0, 0.45, 0]} />
      <Monitor mode={mode === "noise" ? "noise" : mode} t={t} seed={3} k={k * 0.9} position={[1.1, 1.42, DESK_Z - 0.05]} rotation={[0, -0.45, 0]} />
      <Box s={[0.7, 0.03, 0.22]} c="#111827" position={[0, 0.8, DESK_Z + 0.22]} />
      <mesh position={[0, 0.82, DESK_Z + 0.22]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.66, 0.18]} /><meshBasicMaterial color={new THREE.Color("#7c3aed").multiplyScalar(0.8)} toneMapped={false} /></mesh>
      {/* gaming chair */}
      <Box s={[0.6, 0.12, 0.55]} c="#111827" position={[0, 0.48, 0.2]} />
      <Box s={[0.6, 0.9, 0.1]} c="#7f1d1d" position={[0, 0.95, 0.5]} />
    </group>
  );
};
const Kimchi: React.FC<{ t: number; pose?: Pose } & JSX.IntrinsicElements["group"]> = ({ t, pose = {}, ...p }) => (
  <Person look={KIMCHI} pose={{ sit: 1, armR: 1.2 + 0.05 * Math.sin(t * 11), armL: 1.2 + 0.05 * Math.sin(t * 11 + 2), blink: blink(t, 1), mood: "calm", ...pose }} {...p} />
);

// =========================================================================== 1. the beginning (0-10 s)
export const BeginScene: React.FC<{ t: number }> = ({ t }) => {
  // 0-3 s: hook: from inside the glowing chart, fly back to reveal the lone trader; then a slow push toward his face
  useCamKeys(t, [[0, [0, 1.42, DESK_Z + 0.42], [0, 1.42, DESK_Z - 0.2], 30], [PUSH_AT * 0.75, [1.0, 1.9, 2.8], [0, 1.4, -0.4], 46], [PUSH_AT, [0.9, 2.2, -1.88], [0, 1.55, 0.25], 50], [10, [0.3, 2.1, -1.85], [0, 1.6, 0.25], 40]], 0.05 * (1 - ramp(t, 0, 3)));
  return (
    <group>
      <TradingRoom t={t} mode="noise" />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI, 0]} pose={{ head: 0.25 * Math.sin(t * 0.9), tilt: 0.04 }} />
    </group>
  );
};

// =========================================================================== 2. learning the market (10-20 s)
export const LearnScene: React.FC<{ t: number }> = ({ t }) => (t < GRAPH_AT ? <Research key="r" t={t} /> : <Graphic key="g" t={t} />);
const Research: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[10, [-1.1, 1.7, 0.9], [0.2, 1.35, DESK_Z], 40], [GRAPH_AT, [-0.7, 1.65, 0.5], [0.2, 1.35, DESK_Z], 38]]);
  return (
    <group>
      <TradingRoom t={t} mode="noise" glow="#22d3ee" />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI, 0]} pose={{ head: -0.3 + 0.3 * Math.sin(t * 1.4), armR: 1.25 + 0.08 * Math.sin(t * 15) }} />
      {/* floating research panels: wallet + new tokens */}
      {[["WALLET", -0.9, "#22d3ee"], ["NEW TOKENS", 0.9, "#a78bfa"]].map(([txt, x, c], i) => (
        <group key={i} position={[x as number, 2.15 + 0.04 * Math.sin(t * 2 + i), DESK_Z + 0.1]} rotation={[0, -(x as number) * 0.3, 0]}>
          <mesh><planeGeometry args={[0.8, 0.45]} /><meshBasicMaterial color={c as string} transparent opacity={0.16} toneMapped={false} side={THREE.DoubleSide} /></mesh>
          <Label text={txt as string} h={0.12} color={c as string} position={[0, 0.14, 0.01]} />
          {[0, 1, 2].map((k) => <mesh key={k} position={[0, 0.02 - k * 0.1, 0.01]}><planeGeometry args={[0.6 - k * 0.1, 0.035]} /><meshBasicMaterial color={c as string} transparent opacity={0.6} toneMapped={false} /></mesh>)}
        </group>
      ))}
    </group>
  );
};
const Graphic: React.FC<{ t: number }> = ({ t }) => {
  // a hypothetical $100 memecoin bet: hype to $500, then a crash to $80
  useCamKeys(t, [[GRAPH_AT, [0.4, 1.9, 3.4], [0, 1.8, 0], 42], [20, [-0.3, 1.8, 2.9], [0, 1.8, 0], 40]], 0.03 * Math.sin(t * 2));
  const up = easeOut(ramp(t, GRAPH_AT + 0.3, CRASH_AT - 0.2)), down = easeIn(ramp(t, CRASH_AT + 0.6, CRASH_AT + 1.4));
  const pts: THREE.Vector3[] = [];
  const val = (u: number) => u <= 1 ? 100 + 400 * u : 500 - 420 * (u - 1);
  const steps = 60, total = up + down;
  for (let i = 0; i <= steps * total; i++) { const u = i / steps; pts.push(new THREE.Vector3(-1.1 + u * 1.1, 0.9 + val(u) / 500 * 1.6, 0)); }
  const line = useMemo(() => new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ toneMapped: false })), []);
  if (pts.length > 1) { line.geometry.setFromPoints(pts); (line.material as THREE.LineBasicMaterial).color = new THREE.Color(down > 0 ? COL.red : COL.green).multiplyScalar(2.2); }
  const head = pts[pts.length - 1] ?? new THREE.Vector3(-1.1, 1.22, 0);
  return (
    <group>
      <TradingRoom t={t} mode={down > 0 ? "crash" : "pump"} glow={down > 0 ? COL.red : COL.green} k={down > 0 ? down : up} />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI - 0.25, 0]} pose={{ mood: down > 0.3 ? "nervous" : up > 0.6 ? "wow" : "calm", sweat: down > 0.3 ? 0.6 : 0, head: 0.2 }} />
      <group position={[0, 0, 0.9]}>
        <mesh position={[0, 1.7, -0.02]}><planeGeometry args={[2.6, 1.9]} /><meshBasicMaterial color="#0b1530" transparent opacity={0.55} /></mesh>
        {pts.length > 1 && <primitive object={line} />}
        <Glow color={down > 0 ? COL.red : COL.green} size={0.5} position={head} />
      </group>
    </group>
  );
};

// =========================================================================== 3. the TRUMP coin launch (20-30 s)
export const LaunchScene: React.FC<{ t: number }> = ({ t }) => (t < SURGE_AT ? <Announcement key="a" t={t} /> : <Surge key="s" t={t} />);
const Announcement: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[20, [0, 2.0, 7.5], [0, 2.2, 0], 44], [SURGE_AT, [0, 2.1, 5.2], [0, 2.3, 0], 40]], 0.02 * Math.sin(t * 3));
  const glitch = pulse(t, 20.15, 0.25) + pulse(t, 21.6, 0.15);
  return (
    <group>
      <color attach="background" args={["#05030d"]} />
      <ambientLight intensity={0.3} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 40]} />{M("#0b1020", { roughness: 0.25, metalness: 0.5 })}</mesh>
      <gridHelper args={[40, 40, "#3b1d6e", "#1f1240"]} position={[0, 0.01, 0]} />
      {/* giant breaking-news hologram */}
      <group position={[0.06 * glitch, 2.3, -0.5]}>
        <mesh><planeGeometry args={[4.2, 2.5]} /><meshBasicMaterial color="#1a0b3a" transparent opacity={0.85} /></mesh>
        <lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(4.2, 2.5)]} /><lineBasicMaterial color={new THREE.Color("#c084fc").multiplyScalar(2)} toneMapped={false} /></lineSegments>
        <Sign text="NEW TOKEN LAUNCH" w={3.2} h={0.5} bg="#7c3aed" fg="#ffffff" position={[0, 0.75, 0.01]} />
        <Label text="$TRUMP" h={0.85} color="#fde68a" position={[0, -0.05, 0.02]} />
        <Label text="JANUARY 2025" h={0.3} color="#e9d5ff" position={[0, -0.8, 0.02]} />
        <Glow color="#a855f7" size={6} opacity={0.35} position={[0, 0, -0.2]} />
      </group>
      {/* traders rushing in (silhouettes with phones) */}
      {Array.from({ length: 10 }, (_, i) => {
        const x = -3.2 + i * 0.7, z = 2.2 + (i % 3) * 0.6 - ramp(t, 20.6 + i * 0.1, 23.2) * 1.0;
        return <Person key={i} position={[x, 0, z]} rotation={[0, Math.PI, 0]} scale={0.85} look={{ hoodie: ["#334155", "#475569", "#1e293b"][i % 3], hair: "#111", hairStyle: (i % 3) as 0 | 1 | 2 }}
          pose={{ armR: 1.6, bob: 0.04 * Math.abs(Math.sin(t * 8 + i)), blink: blink(t, i) }} />;
      })}
    </group>
  );
};
const Surge: React.FC<{ t: number }> = ({ t }) => {
  const k = easeIn(ramp(t, SURGE_AT, 28.4));
  useCamKeys(t, [[SURGE_AT, [-1.4, 1.9, 1.8], [0, 1.45, -0.6], 44], [26.0, [0.9, 2.2, -1.88], [0, 1.55, 0.25], 50], [30, [0.25, 2.1, -1.85], [0, 1.6, 0.25], 40]]);
  return (
    <group>
      <TradingRoom t={t} mode="pump" glow={COL.green} k={0.3 + 0.9 * k} />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI - 0.15, 0]} pose={{ mood: k > 0.3 ? "wow" : "calm", armR: 1.3 + 0.2 * k, armL: 1.3, bob: 0.03 * k * Math.abs(Math.sin(t * 9)), head: 0.15 * Math.sin(t * 4) * k }} />
      <Coins n={30} xf={(i) => { const u = ((t - SURGE_AT) * 0.6 + i / 30) % 1; return k > 0.2 ? [[(i % 6 - 2.5) * 0.45, 0.8 + u * 2.4, DESK_Z + 0.4 - (i % 3) * 0.2], [t * 3 + i, i, 0], 0.08] : null; }} />
    </group>
  );
};

// =========================================================================== 4. the $40 million claim (30-40 s)
export const ClaimScene: React.FC<{ t: number }> = ({ t }) => {
  // the camera circles the trader while the monitors glow green
  const a = lerp(-1.15, 1.15, smooth(ramp(t, 30, 40)));
  const r = 2.2;
  // an arc in front of his face, between him and the monitors
  const cp: V3 = [Math.sin(a) * 1.9, 2.15 + 0.08 * Math.sin(a * 2), 0.25 - Math.cos(a) * 2.05];
  useCamKeys(t, [[0, cp, [0, 1.55, 0.25], 48]]);
  void r;
  return (
    <group>
      <TradingRoom t={t} mode="climb" glow={COL.green} k={1} />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI, 0]} pose={{ mood: "wow", armR: 1.2, armL: 1.25, head: 0.1 * Math.sin(t * 1.5) }} />
      <Coins n={50} xf={(i) => { const u = ((t - 30) * 0.35 + i / 50) % 1, ang = i * 2.39; return [[Math.cos(ang) * (0.9 + (i % 4) * 0.2), 0.4 + u * 2.8, Math.sin(ang) * (0.9 + (i % 4) * 0.2) - 0.2], [t * 2 + i, i, 0], 0.09]; }} />
      <Glow color={COL.green} size={3.5} opacity={0.18} position={[0, 1.6, DESK_Z]} />
    </group>
  );
};

// =========================================================================== 5. the reality of crypto (40-50 s)
export const RealityScene: React.FC<{ t: number }> = ({ t }) => (t < STAT_AT ? <SplitTraders key="sp" t={t} /> : t < WATCH_AT ? <BigCrash key="bc" t={t} /> : <Watching key="w" t={t} />);
const SplitTraders: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[40, [0, 1.5, 5.2], [0, 1.15, 0], 42], [STAT_AT, [0, 1.45, 4.8], [0, 1.15, 0], 42]]);
  return (
    <group>
      <color attach="background" args={["#05070d"]} />
      <hemisphereLight args={["#ffffff", "#111827", 0.45]} />
      {/* left: celebrating, green */}
      <group position={[-0.95, 0, 0]} scale={0.88}>
        <pointLight position={[0, 2.2, 1.2]} intensity={5} distance={5} color={COL.green} />
        <Monitor mode="pump" t={t} seed={5} position={[0, 1.6, -0.9]} scale={0.9} />
        <Person position={[0, 0, 0.2]} look={WINNER} scale={0.92} pose={{ mood: "wow", armR: 2.8, armL: 2.6, bob: 0.08 * Math.abs(Math.sin(t * 7)), blink: blink(t, 2) }} />
      </group>
      <mesh position={[0, 1.8, 0.3]}><planeGeometry args={[0.025, 4.2]} /><meshBasicMaterial color={new THREE.Color("#ffffff").multiplyScalar(1.5)} toneMapped={false} /></mesh>
      {/* right: watching an investment collapse, red */}
      <group position={[0.95, 0, 0]} scale={0.88}>
        <pointLight position={[0, 2.2, 1.2]} intensity={6 * (0.7 + 0.3 * Math.sin(t * 9))} distance={5} color={COL.red} />
        <Monitor mode="crash" t={t} seed={6} position={[0, 1.6, -0.9]} scale={0.9} />
        <Label text="LIQUIDATED" h={0.16} color="#ff6b7d" position={[0, 2.1, -0.85]} />
        <Person position={[0, 0, 0.2]} look={LOSER} scale={0.92} pose={{ mood: "nervous", sweat: 0.8, armR: 2.2, armL: 2.2, tilt: 0.25, blink: blink(t, 4) }} />
      </group>
    </group>
  );
};
const BigCrash: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[STAT_AT, [0, 2.0, 4.6], [0, 2.0, 0], 44], [WATCH_AT, [0.3, 1.8, 3.6], [0, 1.9, 0], 42]], -0.04);
  const { tex, draw } = useChart("crash", 1024, 640, 9);
  draw(t, 1.15);
  return (
    <group>
      <color attach="background" args={["#0d0306"]} />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 2.5, 2]} intensity={10 * (0.7 + 0.3 * Math.sin(t * 10))} distance={8} color={COL.red} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#1a0508", { roughness: 0.3, metalness: 0.4 })}</mesh>
      <mesh position={[0, 2.0, -0.6]}><planeGeometry args={[3.6, 2.25]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <Glow color={COL.red} size={6} opacity={0.25} position={[0, 2.0, -0.8]} />
    </group>
  );
};
const Watching: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[WATCH_AT, [-0.9, 2.2, -1.88], [0, 1.55, 0.25], 50], [50, [-0.35, 2.1, -1.85], [0, 1.6, 0.25], 42]]);
  return (
    <group>
      <TradingRoom t={t} mode="crash" glow={COL.red} k={1} />
      <Kimchi t={t} position={[0, 0.06, 0.25]} rotation={[0, Math.PI + 0.2, 0]} pose={{ mood: "calm", armR: 0.6, armL: 0.6, head: -0.15, tilt: -0.05 }} />
    </group>
  );
};

// =========================================================================== 6. the final lesson (50-60 s)
export const LessonScene: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[50, [0.8, 1.7, 2.6], [0, 1.5, 0], 40], [54.5, [1.4, 2.2, 5.4], [0, 1.9, -1], 44], [60, [2.2, 3.6, 11.5], [0, 2.8, -4], 48]]);
  const tw = useMemo(() => tower(), []);
  const blocks = useMemo(() => { const g = rng(12); return Array.from({ length: 14 }, () => [g(), g(), g()]); }, []);
  return (
    <group>
      <Sky top="#1e3a8a" bottom="#fdba74" />
      <hemisphereLight args={["#ffd7b0", "#1e293b", 0.65]} />
      <directionalLight position={[-6, 3, -10]} intensity={2.4} color="#ffb070" />
      <directionalLight position={[4, 6, 6]} intensity={0.6} color="#c7d2fe" />
      {/* rooftop */}
      <Box s={[8, 0.3, 6]} c="#334155" position={[0, -0.15, 0]} />
      <Box s={[8, 0.9, 0.12]} c="#475569" position={[0, 0.45, -2.6]} />
      {/* futuristic skyline at sunrise */}
      {[[-9, -18, 14, 3], [-4, -24, 22, 4], [2, -26, 28, 4.5], [8, -21, 18, 3.5], [13, -17, 11, 3], [-14, -14, 9, 3], [5, -15, 10, 2.5], [-6, -13, 8, 2.5]].map(([x, z, h, w], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2 - 2, 0]}><boxGeometry args={[w, h, w]} /><meshStandardMaterial map={tw} color="#ffd2b0" roughness={0.25} metalness={0.5} /></mesh>
          <mesh position={[0, h - 1.9, 0]}><boxGeometry args={[w * 0.3, 0.6, w * 0.3]} /><meshBasicMaterial color={new THREE.Color(i % 2 ? COL.cyan : "#a78bfa").multiplyScalar(1.5)} toneMapped={false} /></mesh>
        </group>
      ))}
      <Glow color="#ffb347" size={22} opacity={0.5} position={[-4, 3, -40]} />
      {/* floating blockchain: glowing blocks linked in a chain, plus faint chart lines */}
      {blocks.map(([a, b, c], i) => {
        const p: V3 = [-4 + i * 0.62, 3.2 + Math.sin(i * 0.9 + t * 0.8) * 0.4 + b * 0.6, -3.5 - c * 1.5];
        return <group key={i} position={p} rotation={[t * 0.3 + i, t * 0.4 + a * 3, 0]}>
          <mesh><boxGeometry args={[0.32, 0.32, 0.32]} /><meshStandardMaterial color="#60a5fa" transparent opacity={0.35} emissive="#3b82f6" emissiveIntensity={0.6} /></mesh>
          <lineSegments><edgesGeometry args={[new THREE.BoxGeometry(0.32, 0.32, 0.32)]} /><lineBasicMaterial color={new THREE.Color("#93c5fd").multiplyScalar(2)} toneMapped={false} /></lineSegments>
        </group>;
      })}
      <Person position={[0, 0, 0]} rotation={[0, Math.PI - 0.3 + 0.2 * smooth(ramp(t, 54, 56)), 0]} look={KIMCHI} pose={{ mood: "calm", armR: 0.15, armL: 0.15, head: 0.1, blink: blink(t, 6) }} />
    </group>
  );
};
