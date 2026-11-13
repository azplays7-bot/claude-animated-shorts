// The ten scenes of the 60 s timeline. Each takes its local time lt (seconds) and places the camera itself.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { CHART, COL, DROPS, SC, backOut, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth } from "./timeline";
import { Bill, Coin, Coins, Person, Pose } from "./Actors";
import { calPage, crashScreen, glowDot, label, nightWindow, oldScreen, paper, wood } from "./textures";

type V3 = [number, number, number];
const useCam = (pos: V3, look: V3, fov = 40, roll = 0) => {
  const { camera, size } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.up.set(Math.sin(roll), Math.cos(roll), 0); c.lookAt(...look);
  if (c.fov !== fov || c.aspect !== size.width / size.height) { c.fov = fov; c.aspect = size.width / size.height; c.updateProjectionMatrix(); }
};
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
const blink = (t: number, seed: number) => { const p = 2.3 + (seed % 5) * 0.37; const ph = (t + seed * 0.71) % p; return ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0; };
const Glow: React.FC<{ color: string; size: number; opacity?: number } & JSX.IntrinsicElements["sprite"]> = ({ color, size, opacity = 1, ...p }) => (
  <sprite scale={[size, size, 1]} {...p}><spriteMaterial map={glowDot()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
);
const Label: React.FC<{ text: string; h: number; color?: string } & JSX.IntrinsicElements["mesh"]> = ({ text, h, color = "#ffffff", ...p }) => {
  const t = label(text, 128, color);
  const w = h * (t.image.width / t.image.height);
  return <mesh {...p}><planeGeometry args={[w, h]} /><meshBasicMaterial map={t} transparent toneMapped={false} depthWrite={false} /></mesh>;
};
/** dark studio backdrop with a glowing floor grid: the shared look of every non-bedroom scene */
const Stage: React.FC<{ tint?: string; grid?: string }> = ({ tint = COL.navy, grid = "#1d3a6e" }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[200, 200]} /><meshStandardMaterial color={tint} roughness={0.35} metalness={0.4} /></mesh>
    <gridHelper args={[200, 100, grid, grid]} position={[0, 0.01, 0]} />
  </group>
);

// =========================================================================== 1. bedroom, 2010 (0-5.1 s)
export const Bedroom: React.FC<{ lt: number }> = ({ lt }) => {
  // establishing push-in on Max at his computer, the B lights up, then a fast zoom onto the $20 bill
  const zoom = smooth(ramp(lt, 2.55, 3.75));
  const pos = mix3(mix3([3.0, 1.8, 1.25], [2.45, 1.6, 0.95], smooth(lt / 2.6)), [0.95, 1.12, 0.22], zoom);
  const look = mix3(mix3([0.0, 1.15, 0.2], [-0.02, 1.1, 0.1], smooth(lt / 2.6)), [0.55, 0.77, -0.05], zoom);
  useCam(pos, look, lerp(42, 30, zoom) - 1.5 * ramp(lt, 3.75, 5.1), 0.02 * Math.sin(lt * 0.8));
  const glow = smooth(ramp(lt, 0.6, 1.6));
  const scr = useMemo(() => [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => oldScreen(k / 8)), []);
  const floor = useMemo(() => { const t = wood(); return t; }, []);
  return (
    <group>
      <color attach="background" args={["#141a2c"]} />
      <ambientLight intensity={0.25} color="#8aa0ff" />
      <pointLight position={[0.92, 1.42, -0.36]} intensity={0.6} distance={3} color="#ffcf8a" />
      <pointLight position={[2.0, 2.4, 2.0]} intensity={2.5} distance={8} color="#a9b8ff" />
      <pointLight position={[-0.1, 1.2, -0.25]} intensity={3.5 * glow} distance={3} color={COL.orange} />
      <directionalLight position={[3, 4, 3]} intensity={0.6} color="#9fb6ff" />
      {/* room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8, 8]} /><meshStandardMaterial map={floor} roughness={0.8} /></mesh>
      <mesh position={[0, 2, -1.2]}><planeGeometry args={[8, 4]} /><meshStandardMaterial color="#3b4d7a" roughness={0.9} /></mesh>
      <mesh position={[-2.6, 2, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[8, 4]} /><meshStandardMaterial color="#34446c" roughness={0.9} /></mesh>
      <mesh position={[-1.55, 1.85, -1.19]}><planeGeometry args={[1.1, 1.0]} /><meshBasicMaterial map={nightWindow()} /></mesh>
      <mesh position={[-1.55, 1.85, -1.185]}><boxGeometry args={[1.2, 1.1, 0.01]} /><meshStandardMaterial color="#e8e1d2" /></mesh>
      <mesh position={[-1.55, 1.85, -1.175]}><planeGeometry args={[1.1, 1.0]} /><meshBasicMaterial map={nightWindow()} /></mesh>
      {/* poster */}
      <mesh position={[1.25, 2.1, -1.19]}><planeGeometry args={[0.7, 0.95]} /><meshStandardMaterial color="#c2493b" roughness={0.9} /></mesh>
      <Label text="2010" h={0.28} color="#ffe7c2" position={[1.25, 2.15, -1.18]} />
      {/* desk */}
      <mesh position={[0, 0.74, -0.25]}><boxGeometry args={[2.0, 0.06, 0.9]} /><meshStandardMaterial color="#9b6b43" roughness={0.6} /></mesh>
      {[[-0.92, -0.62], [0.92, -0.62], [-0.92, 0.12], [0.92, 0.12]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]}><boxGeometry args={[0.06, 0.74, 0.06]} /><meshStandardMaterial color="#6f4a2e" /></mesh>
      ))}
      {/* CRT monitor + keyboard */}
      <mesh position={[-0.1, 1.12, -0.5]}><boxGeometry args={[0.7, 0.58, 0.55]} /><meshStandardMaterial color="#d8d2c2" roughness={0.7} /></mesh>
      <mesh position={[-0.1, 1.13, -0.218]}><planeGeometry args={[0.56, 0.42]} /><meshBasicMaterial map={scr[Math.round(glow * 8)]} toneMapped={false} /></mesh>
      <mesh position={[-0.1, 0.8, -0.5]}><boxGeometry args={[0.3, 0.06, 0.3]} /><meshStandardMaterial color="#c8c2b2" /></mesh>
      <mesh position={[-0.1, 0.785, -0.02]}><boxGeometry args={[0.6, 0.03, 0.2]} /><meshStandardMaterial color="#cfc9ba" /></mesh>
      {/* desk lamp */}
      <mesh position={[0.85, 0.8, -0.5]}><cylinderGeometry args={[0.1, 0.12, 0.04, 20]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.85, 1.15, -0.5]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.015, 0.015, 0.7, 8]} /><meshStandardMaterial color="#333" /></mesh>
      <mesh position={[0.92, 1.5, -0.4]} rotation={[0.6, 0, 0]}><coneGeometry args={[0.14, 0.18, 20, 1, true]} /><meshStandardMaterial color="#e04a3a" side={THREE.DoubleSide} /></mesh>
      <Glow color="#ffcf8a" size={0.35} position={[0.92, 1.43, -0.36]} opacity={0.5} />
      {/* the $20 bill and a mug */}
      <Bill position={[0.55, 0.775, -0.05]} rotation={[-Math.PI / 2, 0, 0.25]} glow={0.35 * ramp(lt, 3.4, 4.2)} />
      <mesh position={[0.45, 0.83, -0.35]}><cylinderGeometry args={[0.05, 0.05, 0.11, 20]} /><meshStandardMaterial color="#e8e8f0" /></mesh>
      {/* chair + Max */}
      <mesh position={[0.05, 0.45, 0.62]}><boxGeometry args={[0.5, 0.06, 0.5]} /><meshStandardMaterial color="#2c2c38" /></mesh>
      <mesh position={[0.05, 0.85, 0.86]}><boxGeometry args={[0.5, 0.8, 0.06]} /><meshStandardMaterial color="#2c2c38" /></mesh>
      <Person position={[0.05, 0.0, 0.62]} rotation={[0, Math.PI, 0]} scale={0.95}
        pose={{ sit: 1, armR: 1.05 + 0.08 * Math.sin(lt * 9), armL: 1.05 + 0.08 * Math.sin(lt * 9 + 2), head: 0.15 * Math.sin(lt * 0.7), blink: blink(lt, 1), mood: glow > 0.5 ? "wow" : "smile" }} />
    </group>
  );
};

// =========================================================================== 2. calendar + wallet deposits (5.1-12.2 s)
export const WALLET_POS: V3 = [0.9, 0, 0];
/** glass wallet box with coins inside; fill 0..1 */
export const Wallet: React.FC<{ fill: number; glow: number; t: number } & JSX.IntrinsicElements["group"]> = ({ fill, glow, t, ...p }) => {
  const N = 90;
  const r = useMemo(() => { const g = rng(7); return Array.from({ length: N }, () => [g(), g(), g(), g()]); }, []);
  const shown = Math.floor(N * fill);
  return (
    <group {...p}>
      <mesh position={[0, 0.75, 0]}><boxGeometry args={[1.2, 1.5, 0.8]} />
        <meshPhysicalMaterial color="#9fdcff" transparent opacity={0.16} roughness={0.05} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <lineSegments position={[0, 0.75, 0]}><edgesGeometry args={[new THREE.BoxGeometry(1.2, 1.5, 0.8)]} />
        <lineBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(1 + 2.5 * glow)} toneMapped={false} /></lineSegments>
      <mesh position={[0, 1.62, 0]}><boxGeometry args={[1.3, 0.22, 0.9]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} /></mesh>
      <mesh position={[0, 1.735, 0]}><boxGeometry args={[0.7, 0.012, 0.08]} /><meshBasicMaterial color={COL.green} toneMapped={false} /></mesh>
      <Label text="WALLET" h={0.16} color="#bfeaff" position={[0, 1.62, 0.455]} />
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[1.3, 0.06, 0.9]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} /></mesh>
      <Coins n={N} xf={(i) => {
        if (i >= shown) return null;
        const [a, b, c, d] = r[i];
        const layer = Math.floor(i / 9), k = i % 9;
        return [[-0.38 + (k % 3) * 0.38 + (a - 0.5) * 0.1, 0.1 + layer * 0.075 + b * 0.03, -0.2 + Math.floor(k / 3) * 0.2 + (c - 0.5) * 0.08], [Math.PI / 2 + (d - 0.5) * 0.4, d * 6, (a - 0.5) * 0.3], 0.36];
      }} />
      <pointLight position={[0, 0.8, 0.6]} intensity={0.8 + 1.6 * glow} distance={3} color={COL.gold} />
      {glow > 0 && <Glow color={COL.gold} size={2.2 * glow} position={[0, 0.85, 0.5]} opacity={0.13 * glow} />}
    </group>
  );
};
// deposit beats: months shown on the calendar, accelerating
const DEP_MONTHS = 13; // JUL 2010 .. JUL 2011
const depBeat = (i: number) => 0.45 + 6.2 * (1 - Math.pow(1 - i / DEP_MONTHS, 1.6)) * 0.98;
export const depIndex = (lt: number) => { let i = 0; while (i < DEP_MONTHS - 1 && depBeat(i + 1) <= lt) i++; return i; };
export const Deposit: React.FC<{ lt: number }> = ({ lt }) => {
  useCam(mix3([0.5, 2.0, 7.0], [0.3, 1.8, 5.6], smooth(lt / 7.1)), [0.2, 1.55, 0], 44, -0.035);
  const i = depIndex(lt);
  const tb = lt - depBeat(i);                          // time since this month's beat
  const flip = clamp(tb / 0.28);
  const [mon, yr] = [["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][(6 + i) % 12], String(2010 + Math.floor((6 + i) / 12))];
  const prev = i > 0 ? [["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][(5 + i) % 12], String(2010 + Math.floor((5 + i) / 12))] : null;
  // bill flight from Max's hand into the wallet slot
  const fly = clamp(tb / 0.32);
  const billP = mix3([-0.2, 1.25, 0.35], [WALLET_POS[0], 1.78, 0], easeIn(fly));
  return (
    <group>
      <color attach="background" args={[COL.night]} />
      <fog attach="fog" args={[COL.night, 8, 22]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <pointLight position={[-2, 2.5, 1.5]} intensity={8} distance={7} color={COL.cyan} />
      <Stage />
      {/* calendar stand */}
      <group position={[0.15, -0.1, -2.1]} rotation={[0, 0.05, 0]} scale={1.15}>
        <mesh position={[0, 0.8, -0.05]}><boxGeometry args={[0.08, 1.6, 0.08]} /><meshStandardMaterial color="#222c44" metalness={0.5} /></mesh>
        <group position={[0, 2.25, 0]}>
          <mesh position={[0, -0.52, -0.01]}><planeGeometry args={[0.9, 1.05]} /><meshBasicMaterial map={calPage(mon, yr)} /></mesh>
          {prev && flip < 1 && (
            <group rotation={[-Math.PI * easeOut(flip), 0, 0]}>
              <mesh position={[0, -0.52, 0.01]}><planeGeometry args={[0.9, 1.05]} /><meshBasicMaterial map={calPage(prev[0], prev[1])} side={THREE.DoubleSide} /></mesh>
            </group>
          )}
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[0.95, 0.06, 0.06]} /><meshStandardMaterial color="#c0c6d8" metalness={0.8} roughness={0.3} /></mesh>
        </group>
      </group>
      {/* Max feeding the wallet */}
      <Person position={[-0.35, 0, 0.25]} rotation={[0, 0.75, 0]}
        pose={{ armR: 0.5 + 1.0 * pulse(tb, 0, 0.35), armL: 0.1, bob: 0.03 * Math.abs(Math.sin(lt * 5)), blink: blink(lt, 3), mood: "smile" }} />
      <Wallet position={WALLET_POS} fill={0.05 + 0.9 * (lt / 7.1)} glow={0.4 * pulse(tb, 0.3, 0.4)} t={lt} />
      {fly < 1 && <Bill position={billP} rotation={[0.2 - fly * 1.2, 0.6, 0.1 + fly]} scale={1 - 0.4 * fly} glow={0.5} />}
      {/* new coin pops out of the slot */}
      {tb > 0.3 && tb < 1.0 && <Coin position={[WALLET_POS[0], 1.85 + 0.6 * easeOut((tb - 0.3) / 0.7), 0.1]} rotation={[0, (tb - 0.3) * 10, 0]} scale={0.38 * backOut((tb - 0.3) / 0.25)} />}
    </group>
  );
};

// =========================================================================== chart (shared by 3, 5 and 7)
export const XS = 2.2, YS = 1.25;                          // world units per year / per price decade
export const chartXY = (y: number, p: number): [number, number] => [(y - 2010.5) * XS, (Math.log10(p) + 1.4) * YS];
export const ChartLine: React.FC<{ upTo: number; width?: number }> = ({ upTo, width = 7 }) => {
  const { size } = useThree();
  const line = useMemo(() => {
    const pos: number[] = [], col: number[] = [];
    const g = new THREE.Color(COL.green).multiplyScalar(2.2), r = new THREE.Color(COL.red).multiplyScalar(2.2);
    CHART.forEach(([y, p], i) => {
      const [x, yy] = chartXY(y, p); pos.push(x, yy, 0);
      const back = CHART[Math.max(0, i - 6)][1];
      const c = p >= back ? g : r; col.push(c.r, c.g, c.b);
    });
    const geom = new LineGeometry(); geom.setPositions(pos); geom.setColors(col);
    const mat = new LineMaterial({ vertexColors: true, linewidth: width, worldUnits: false, toneMapped: false });
    return new Line2(geom, mat);
  }, [width]);
  (line.material as LineMaterial).resolution.set(size.width, size.height);
  let n = 0; while (n < CHART.length - 1 && CHART[n + 1][0] <= upTo) n++;
  (line.geometry as LineGeometry).instanceCount = Math.max(1, n);
  return <primitive object={line} />;
};
const headAt = (upTo: number): V3 => {
  let i = 0; while (i < CHART.length - 1 && CHART[i + 1][0] <= upTo) i++;
  const [x, y] = chartXY(CHART[i][0], CHART[i][1]); return [x, y, 0];
};
const PRICE_LINES: [number, string][] = [[0.1, "$0.10"], [1, "$1"], [10, "$10"], [100, "$100"], [1000, "$1K"], [10000, "$10K"], [100000, "$100K"]];
const ChartFrame: React.FC<{ from: number; to: number }> = ({ from, to }) => (
  <group>
    {PRICE_LINES.map(([p, s]) => { const [, y] = chartXY(2010.5, p); return (
      <group key={s}>
        <mesh position={[(from + to) / 2 * 0 + ((from + to) / 2 - 2010.5) * XS, y, -0.05]}><planeGeometry args={[(to - from + 3) * XS, 0.012]} /><meshBasicMaterial color="#2b4c86" /></mesh>
        <Label text={s} h={0.22} color="#7fa6e6" position={[(from - 2010.5) * XS - 0.9, y + 0.14, 0]} />
      </group>); })}
    {Array.from({ length: Math.floor(to) - Math.ceil(from) + 1 }, (_, k) => Math.ceil(from) + k).map((yr) => (
      <group key={yr}>
        <mesh position={[(yr - 2010.5) * XS, 4.5, -0.06]}><planeGeometry args={[0.012, 12]} /><meshBasicMaterial color="#21396a" /></mesh>
        <Label text={String(yr)} h={0.32} color="#9fc1ff" position={[(yr - 2010.5) * XS, -0.25, 0.02]} />
      </group>
    ))}
  </group>
);
const ChartScene: React.FC<{ lt: number; y0: number; y1: number; dur: number; tilt?: number; children?: React.ReactNode; ease?: (u: number) => number; zoom?: number }> =
  ({ lt, y0, y1, dur, tilt = 0, children, ease = smooth, zoom = 1 }) => {
    const yr = lerp(y0, y1, ease(lt / dur));
    const h = headAt(yr);
    useCam([h[0] - 1.6 * zoom, h[1] + 0.9 * zoom, 7.5 * zoom], [h[0] - 0.4, h[1] + 0.2, 0], 44, tilt);
    return (
      <group>
        <color attach="background" args={[COL.night]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 4, 6]} intensity={1.5} />
        <ChartFrame from={2010} to={2027} />
        <ChartLine upTo={yr} />
        <Glow color="#ffffff" size={0.55} position={[h[0], h[1], 0.05]} opacity={0.9} />
        <Glow color={COL.green} size={1.3} position={[h[0], h[1], 0.04]} opacity={0.35} />
        {children}
      </group>
    );
  };
export const chartYearAt = (lt: number, y0: number, y1: number, dur: number) => lerp(y0, y1, smooth(lt / dur));

// =========================================================================== 3. 2010 -> 2013 (12.2-18.7 s)
export const C1 = { y0: 2010.55, y1: 2013.95, dur: SC.chart1[1] - SC.chart1[0] };
export const Chart1: React.FC<{ lt: number }> = ({ lt }) => {
  const yr = chartYearAt(lt, C1.y0, C1.y1, C1.dur);
  const h = headAt(yr);
  // Max on a little platform below the line, tossing a coin up to the line each month
  const toss = (lt * 2.2) % 1;
  return (
    <ChartScene lt={lt} {...C1} tilt={0.03}>
      <group position={[h[0] - 1.25, h[1] - 2.2, 1.2]}>
        <mesh position={[0, -0.05, 0]}><cylinderGeometry args={[0.6, 0.6, 0.1, 32]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} emissive={COL.cyan} emissiveIntensity={0.2} /></mesh>
        <Person scale={0.75} rotation={[0, 0.5, 0]} pose={{ armR: 0.6 + 2.0 * pulse(toss, 0, 0.3), armL: 0.2, blink: blink(lt, 5), mood: "smile", bob: 0.03 * Math.abs(Math.sin(lt * 7)) }} />
      </group>
      <Coin position={mix3([h[0] - 1.0, h[1] - 1.0, 1.2], [h[0], h[1], 0.2], easeOut(toss))} rotation={[0, toss * 12, 0]} scale={0.32 * (1 - 0.6 * toss)} />
    </ChartScene>
  );
};

// =========================================================================== 4. glowing wallet (18.7-21.2 s), across the clip 1/2 cut
export const WalletShot: React.FC<{ lt: number }> = ({ lt }) => {
  // slow push-in; the image at 20.0 s (lt 1.3) is the last frame of clip 1 and the first of clip 2
  const u = smooth(lt / 2.5);
  useCam(mix3([0.2, 1.4, 3.4], [0.05, 1.1, 2.3], u), [0, 0.9, 0], 38, 0.06 * (u - 0.5));
  const glow = 0.55 + 0.45 * smooth(ramp(lt, 0.2, 1.2)) - 0.3 * smooth(ramp(lt, 1.9, 2.5));
  return (
    <group>
      <color attach="background" args={[COL.night]} />
      <fog attach="fog" args={[COL.night, 6, 18]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 4, 4]} intensity={1.2} />
      <Stage />
      <Wallet fill={1} glow={glow} t={lt} />
      <Coins n={24} xf={(i) => { const a = i / 24 * Math.PI * 2 + lt * 0.8, r = 1.25 + 0.15 * Math.sin(i * 1.7); return [[Math.cos(a) * r, 0.9 + 0.5 * Math.sin(a * 2 + i), Math.sin(a) * r * 0.6], [lt * 2 + i, i, 0], 0.18]; }} />
    </group>
  );
};

// =========================================================================== 5. 2014 -> 2017: soaring, newspapers, crowd (21.2-27.2 s)
export const C2 = { y0: 2014.0, y1: 2017.97, dur: SC.chart2[1] - SC.chart2[0] };
const HEADS = ["BITCOIN SOARS!", "CRYPTO FEVER", "IS IT A BUBBLE?", "EVERYONE WANTS IN", "NEW RECORD HIGH"];
export const Chart2: React.FC<{ lt: number }> = ({ lt }) => {
  const yr = chartYearAt(lt, C2.y0, C2.y1, C2.dur);
  const h = headAt(yr);
  const r = useMemo(() => { const g = rng(11); return HEADS.map(() => [g(), g(), g()]); }, []);
  return (
    <ChartScene lt={lt} {...C2} tilt={-0.04} zoom={1.15}>
      {/* newspapers spin out of the chart toward the camera */}
      {HEADS.map((hd, i) => {
        const t0 = 0.5 + i * 1.05, u = (lt - t0) / 1.5;
        if (u < 0 || u > 1) return null;
        const [a, b, c] = r[i];
        return (
          <mesh key={i} position={[h[0] - 0.4 + (a - 0.5) * 3.2 + u * (a - 0.5) * 2, h[1] + (b - 0.3) * 1.4 + u * 0.6, 0.8 + easeIn(u) * 3.6]}
            rotation={[0.3 * (c - 0.5), (a - 0.5) * 0.8, u * 7 * (c > 0.5 ? 1 : -1)]}>
            <planeGeometry args={[0.95, 1.26]} /><meshStandardMaterial map={paper(hd, i)} color="#c8c8c8" side={THREE.DoubleSide} roughness={0.95} envMapIntensity={0.2} />
          </mesh>
        );
      })}
      {/* the crowd watching the price climb (Max in his orange hoodie at the front) */}
      <group position={[h[0] - 1.0, h[1] - 2.55, 2.2]} rotation={[0, -0.15, 0]}>
        {([[0, 0, COL.hoodie, "#3a2416", 0], [-0.75, -0.35, "#5b6cff", "#111", 1], [0.75, -0.3, "#2fbf71", "#7a4a1a", 2], [-0.35, -0.9, "#e84a6a", "#2a1a10", 1], [0.4, -0.95, "#ffd23d", "#555", 0]] as const).map(([x, z, hood, hair, hs], i) => {
          const jump = Math.max(0, Math.sin((lt + i * 0.37) * 6.5)) * 0.12 * ramp(lt, 1.5, 2.5);
          const pose: Pose = { armR: 0.4 + 2.4 * ramp(lt, 1.2 + i * 0.25, 1.6 + i * 0.25), armL: i % 2 ? 2.4 * ramp(lt, 2 + i * 0.2, 2.4 + i * 0.2) : 0.2, mood: lt > 1.4 + i * 0.2 ? "wow" : "smile", bob: jump, blink: blink(lt, i), head: 0.2 * Math.sin(lt + i) };
          return <Person key={i} position={[x, 0, z]} scale={0.62} pose={pose} look={{ hoodie: hood, hair, hairStyle: hs as 0 | 1 | 2 }} />;
        })}
      </group>
    </ChartScene>
  );
};

// =========================================================================== 6. crash room (27.2-34.2 s)
const { DROP18, DROP22 } = DROPS;
export const Crash: React.FC<{ lt: number }> = ({ lt }) => {
  const shake = (pulse(lt, 0.15, 0.25) + pulse(lt, 2.0, 0.25)) * 0.06 * Math.sin(lt * 90);
  useCam(mix3([0.2, 1.9, 7.6], [0.1, 1.8, 6.4], smooth(lt / 7)), [0.1, 1.45 + shake, 0], 46, 0.06 * Math.sin(lt * 1.3) + shake);
  const alarm = 0.6 + 0.4 * Math.sin(lt * 9);
  const screens = useMemo(() => [
    crashScreen("2018 CRASH", `-${DROP18}%`, 0), crashScreen("PANIC SELLING", "SELL!", 1), crashScreen("2022 CRASH", `-${DROP22}%`, 2),
    crashScreen("FEAR", "-50%", 3), crashScreen("MARKET MELTDOWN", "▼▼▼", 4), crashScreen("BITCOIN IS DEAD?", "???", 5)], []);
  // deposit at 4.2 s: the nervous investor still puts in his $20
  const dep = lt - 4.2;
  return (
    <group>
      <color attach="background" args={["#12020a"]} />
      <fog attach="fog" args={["#12020a", 7, 20]} />
      <ambientLight intensity={0.25} color="#ff8899" />
      <pointLight position={[0, 3.2, 2]} intensity={12 * alarm} distance={10} color={COL.red} />
      <directionalLight position={[2, 3, 5]} intensity={0.6} color="#ffd0d6" />
      <Stage tint="#1c0610" grid="#5a1424" />
      {/* video wall */}
      {screens.map((s, i) => {
        const x = (i % 3 - 1) * 1.75, y = 1.65 + (i < 3 ? 1.05 : 0), z = -1.2 - Math.abs(i % 3 - 1) * 0.25;
        const on = ramp(lt, 0.1 + i * 0.22, 0.25 + i * 0.22);
        return (
          <group key={i} position={[x, y, z]} rotation={[0, -(i % 3 - 1) * 0.25, 0]}>
            <mesh><boxGeometry args={[1.65, 1.0, 0.08]} /><meshStandardMaterial color="#120408" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[0, 0, 0.045]}><planeGeometry args={[1.56, 0.94]} />
              <meshBasicMaterial map={s} toneMapped={false} color={new THREE.Color(1, 1, 1).multiplyScalar(on * (1.1 + 0.25 * Math.sin(lt * 12 + i)))} /></mesh>
          </group>
        );
      })}
      {/* deposit terminal */}
      <group position={[1.05, 0, 1.2]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.55, 0]}><boxGeometry args={[0.45, 1.1, 0.35]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 0.95, 0.18]}><planeGeometry args={[0.32, 0.2]} /><meshBasicMaterial color={dep > 0.45 ? COL.green : "#335"} toneMapped={false} /></mesh>
        {dep > 0.45 && <Label text="+$20" h={0.12} color="#06200f" position={[0, 0.95, 0.185]} />}
        <mesh position={[0, 0.72, 0.18]}><boxGeometry args={[0.26, 0.02, 0.02]} /><meshBasicMaterial color={COL.green} toneMapped={false} /></mesh>
      </group>
      {dep > 0 && dep < 0.5 && <Bill position={mix3([0.55, 1.1, 1.75], [0.95, 0.72, 1.45], easeIn(dep / 0.5))} rotation={[0, -0.5, 0]} scale={0.8} />}
      <Person position={[0.3, 0, 1.9]} scale={0.9} rotation={[0, dep > -0.6 && dep < 1 ? 0.75 : 0.25, 0]}
        pose={{ mood: dep > 0.6 && dep < 2.2 ? "calm" : "nervous", sweat: 0.5 + 0.5 * Math.sin(lt * 3), armR: 0.3 + 1.1 * pulse(dep, -0.3, 0.9), armL: 0.15,
                head: 0.35 * Math.sin(lt * 2.2) * (dep < 0 ? 1 : 0.3), tilt: 0.08 * Math.sin(lt * 5), blink: blink(lt, 7), bob: 0.01 * Math.sin(lt * 20) }} />
    </group>
  );
};

// =========================================================================== 7. years rushing past (34.2-38.6 s)
const RUSH = [[2020, 0.15], [2021, 1.0], [2022, 1.85], [2025, 2.7]] as const;
export const Rush: React.FC<{ lt: number }> = ({ lt }) => {
  // camera flies down a tunnel of light streaks; year cards rush toward it
  const z = -lt * 14;
  useCam([0, 1.6, z + 6], [0, 1.6, z - 10], 52, 0.15 * Math.sin(lt * 1.6));
  const streaks = useMemo(() => { const g = rng(3); return Array.from({ length: 70 }, () => [g(), g(), g()]); }, []);
  return (
    <group>
      <color attach="background" args={["#05070f"]} />
      <ambientLight intensity={0.6} />
      {streaks.map(([a, b, c], i) => {
        const ang = a * Math.PI * 2, rad = 3 + b * 3;
        const sz = ((c * 80 + i * 7) % 80);
        return <mesh key={i} position={[Math.cos(ang) * rad, 1.6 + Math.sin(ang) * rad, z - sz]}><boxGeometry args={[0.03, 0.03, 2.5 + c * 3]} />
          <meshBasicMaterial color={new THREE.Color(i % 3 ? COL.cyan : i % 2 ? COL.gold : COL.green).multiplyScalar(2)} toneMapped={false} /></mesh>;
      })}
      {RUSH.map(([yr, t0]) => {
        const zc = -(t0 + 0.75) * 14;   // passes the camera ~0.75 s after appearing
        return (
          <group key={yr} position={[0, 1.6, zc]}>
            <mesh position={[0, 0, -0.02]}><planeGeometry args={[4.2, 2.4]} /><meshBasicMaterial color="#0b1430" transparent opacity={0.85} /></mesh>
            <Label text={String(yr)} h={1.5} color="#ffffff" position={[0, 0.25, 0]} />
            <Label text="+ ANOTHER $20 EVERY MONTH" h={0.32} color={COL.gold} position={[0, -0.8, 0]} />
            <lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(4.2, 2.4)]} /><lineBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(2.5)} toneMapped={false} /></lineSegments>
          </group>
        );
      })}
      <Coins n={40} xf={(i) => { const g = (i * 0.618) % 1, a = g * Math.PI * 2; return [[Math.cos(a) * (1.8 + (i % 4) * 0.6), 1.6 + Math.sin(a) * (1.6 + (i % 3) * 0.5), z - ((i * 13.7) % 60)], [i + lt * 3, i * 2, 0], 0.3]; }} />
    </group>
  );
};

// =========================================================================== 8. mystery portfolio (38.6-41.3 s), across the clip 2/3 cut
export const Mystery: React.FC<{ lt: number }> = ({ lt }) => {
  // the image at 40.0 s (lt 1.4) ends clip 2 and opens clip 3; after it the camera dives through the "?" into the vault
  const dive = easeIn(ramp(lt, 1.75, 2.7));
  useCam(mix3(mix3([0.6, 1.3, 7.2], [0.25, 1.5, 6.0], smooth(lt / 1.75)), [0, 1.95, 0.4], dive), [0, 1.95, 0], lerp(40, 60, dive), 0.03);
  const q = 1 + 0.06 * Math.sin(lt * 6);
  return (
    <group>
      <color attach="background" args={[COL.night]} />
      <fog attach="fog" args={[COL.night, 6, 18]} />
      <ambientLight intensity={0.35} />
      <Stage />
      <group position={[0, 1.95, -0.3]}>
        <mesh><planeGeometry args={[3.0, 2.0]} /><meshBasicMaterial color="#0b1838" transparent opacity={0.9} /></mesh>
        <lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(3.0, 2.0)]} /><lineBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(2.2)} toneMapped={false} /></lineSegments>
        <Label text="PORTFOLIO VALUE" h={0.26} color="#9fd8ff" position={[0, 0.7, 0.01]} />
        <Label text="?" h={1.25 * q} color="#ffd36b" position={[0, -0.1, 0.02]} />
        <Glow color={COL.gold} size={2.4} position={[0, -0.1, 0.05]} opacity={0.5} />
      </group>
      <Person position={[-0.75, 0, 1.7]} rotation={[0, 0.55, 0]} scale={0.8} pose={{ head: 0.35, tilt: 0.1, mood: "wow", blink: blink(lt, 9), armR: 0.9 }} />
      <pointLight position={[0, 2, 1.5]} intensity={6} distance={6} color={COL.cyan} />
    </group>
  );
};

// =========================================================================== 9. vault + holographic calculator (41.3-53.2 s)
export const VAULT_REVEAL = 46.2 - SC.vault[0];   // local time of the value reveal
export const Vault: React.FC<{ lt: number }> = ({ lt }) => {
  const rv = lt - VAULT_REVEAL;
  const u = smooth(lt / 5);
  const close = smooth(ramp(rv, -0.4, 1.2));
  useCam(mix3(mix3([0, 2.6, 8.0], [1.3, 2.1, 6.2], u), [0, 2.3, 5.4], close), [0, 2.1 - 0.1 * close, 0], lerp(48, 40, close), 0.05 * Math.sin(lt * 0.5));
  const burst = rv > 0 ? clamp(rv / 1.5) : 0;
  return (
    <group>
      <color attach="background" args={["#04060d"]} />
      <fog attach="fog" args={["#04060d", 9, 26]} />
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 4.5, 0]} intensity={20} distance={12} color={COL.gold} />
      <pointLight position={[0, 1.5, 4]} intensity={6} distance={9} color={COL.cyan} />
      {/* round vault: floor rings and wall pillars */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[9, 64]} /><meshStandardMaterial color="#0e1426" metalness={0.7} roughness={0.25} /></mesh>
      {[2.2, 3.4, 4.6].map((r, i) => <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01 + i * 0.001, 0]}><ringGeometry args={[r, r + 0.05, 96]} />
        <meshBasicMaterial color={new THREE.Color(i % 2 ? COL.gold : COL.cyan).multiplyScalar(1.6)} toneMapped={false} /></mesh>)}
      {Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return (
        <group key={i} position={[Math.sin(a) * 8, 3, -Math.cos(a) * 8]} rotation={[0, -a, 0]}>
          <mesh><boxGeometry args={[1.2, 6, 0.4]} /><meshStandardMaterial color="#1a2238" metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0, 0.21]}><planeGeometry args={[0.08, 5.4]} /><meshBasicMaterial color={new THREE.Color(COL.gold).multiplyScalar(1.4)} toneMapped={false} /></mesh>
        </group>); })}
      {/* holographic calculator */}
      <group position={[0, 2.1, 0]}>
        <mesh><planeGeometry args={[2.4, 3.0]} /><meshBasicMaterial color={COL.cyan} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <lineSegments><edgesGeometry args={[new THREE.PlaneGeometry(2.4, 3.0)]} /><lineBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(2.5)} toneMapped={false} /></lineSegments>
        <mesh position={[0, 0.95, 0.01]}><planeGeometry args={[2.0, 0.7]} /><meshBasicMaterial color="#071c2c" transparent opacity={0.85} /></mesh>
        {Array.from({ length: 16 }, (_, k) => { const press = pulse(lt, 0.5 + ((k * 7) % 16) * 0.22, 0.25); return (
          <mesh key={k} position={[-0.72 + (k % 4) * 0.48, 0.15 - Math.floor(k / 4) * 0.42, 0.01 + 0.05 * press]}>
            <planeGeometry args={[0.38, 0.32]} /><meshBasicMaterial color={new THREE.Color(k % 4 === 3 ? COL.gold : COL.cyan).multiplyScalar(0.35 + 1.4 * press)} transparent opacity={0.4} toneMapped={false} /></mesh>); })}
        <Glow color={COL.gold} size={6 * burst} position={[0, 0.95, 0.1]} opacity={0.6 * (1 - 0.5 * burst)} />
      </group>
      {/* floating coins orbiting the calculator; at the reveal they burst outward */}
      <Coins n={70} xf={(i) => {
        const a = i / 70 * Math.PI * 2 + lt * (0.25 + (i % 3) * 0.08), r = 2.0 + (i % 5) * 0.45 + burst * 1.5 * (i % 2 + 0.5);
        return [[Math.cos(a) * r, 0.8 + (i % 7) * 0.45 + 0.2 * Math.sin(lt * 1.3 + i), Math.sin(a) * r], [lt * 1.5 + i, i * 0.7, 0], 0.32];
      }} />
      <Person position={[-1.35, 0, 1.6]} rotation={[0, 0.35, 0]} pose={{ mood: rv > 0 ? "wow" : "smile", armR: rv > 0.2 ? 2.6 * ramp(rv, 0.2, 0.6) : 0.15, armL: rv > 0.3 ? 2.6 * ramp(rv, 0.3, 0.7) : 0.15, bob: rv > 0.6 ? 0.1 * Math.abs(Math.sin(rv * 7)) : 0, blink: blink(lt, 4), head: 0.25 }} />
    </group>
  );
};

// =========================================================================== 10. split-screen comparison + finale (53.2-60 s)
export const Finale: React.FC<{ lt: number }> = ({ lt }) => {
  useCam([0, 2.3, 9.2 - 0.25 * lt], [0, 1.25, 0], 44);
  const pile = smooth(ramp(lt, 0.3, 2.0));
  const N = 420;
  const r = useMemo(() => { const g = rng(21); return Array.from({ length: N }, () => [g(), g(), g()]); }, []);
  const hide = smooth(ramp(lt, 3.6, 4.4));    // the 3D comparison sinks away for the closing card
  return (
    <group>
      <color attach="background" args={["#04060d"]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <pointLight position={[1.6, 3, 2]} intensity={10} distance={8} color={COL.gold} />
      <Stage />
      <mesh position={[0, 2.2, -0.5]}><planeGeometry args={[0.025, 4.4]} /><meshBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(2)} toneMapped={false} /></mesh>
      <group position={[0, -3.2 * hide, 0]}>
        {/* left: the $3,940 invested = a small stack */}
        <mesh position={[-0.95, 0.15, 0]}><cylinderGeometry args={[0.45, 0.5, 0.3, 32]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} /></mesh>
        <Coins n={6} xf={(i) => [[-0.95, 0.35 + i * 0.075, 0], [0, i * 0.4, 0], 0.5]} />
        {/* right: the estimated final value = a mountain of coins */}
        <mesh position={[0.95, 0.15, 0]}><cylinderGeometry args={[0.75, 0.8, 0.3, 32]} /><meshStandardMaterial color="#1b2a4a" metalness={0.6} roughness={0.3} /></mesh>
        <Coins n={N} xf={(i) => {
          const [a, b, c] = r[i]; const h = Math.pow(b, 0.6);
          if (i > N * pile) return null;
          const rad = (1 - h) * 0.7 * Math.sqrt(a), ang = c * Math.PI * 2;
          return [[0.95 + Math.cos(ang) * rad, 0.33 + h * 1.9, Math.sin(ang) * rad * 0.8], [a * 3, c * 6, b * 2], 0.26];
        }} />
      </group>
      <Coin position={[0, 2.0 + 0.6 * (1 - hide), -1.5 + 2.5 * hide]} rotation={[0, lt * 1.4, 0]} scale={1.4 * hide} />
      <Glow color={COL.orange} size={5 * hide} position={[0, 2.0 + 0.6 * (1 - hide), -1.6 + 2.5 * hide]} opacity={0.5 * hide} />
    </group>
  );
};
