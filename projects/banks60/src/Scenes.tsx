// The six scenes of "How banks make money using your money". Each places its own camera from global time t.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Bill, Coin, Coins, Person, Look, Pose } from "./Actors";
import { COL, E, LOOKS, S, blink, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth, backOut } from "./timeline";
import { bond, cash, company, glowDot, label, marble, siding, sign, tower } from "./textures";

type V3 = [number, number, number];
const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** camera keyframes: [time, pos, look, fov]; smootherstep between keys */
type Key = [number, V3, V3, number?];
const useCamKeys = (t: number, keys: Key[], roll = 0) => {
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, p0, l0, f0 = 42] = keys[i], [t1, p1, l1, f1 = 42] = keys[Math.min(i + 1, keys.length - 1)];
  const u = t1 > t0 ? smooth((t - t0) / (t1 - t0)) : 1;
  useCam(mix3(p0, p1, u), mix3(l0, l1, u), lerp(f0, f1, u), roll);
};
const useCam = (pos: V3, look: V3, fov = 42, roll = 0) => {
  const { camera, size } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.up.set(Math.sin(roll), Math.cos(roll), 0); c.lookAt(...look);
  if (c.fov !== fov || c.aspect !== size.width / size.height) { c.fov = fov; c.aspect = size.width / size.height; c.updateProjectionMatrix(); }
};
const Glow: React.FC<{ color: string; size: number; opacity?: number } & JSX.IntrinsicElements["sprite"]> = ({ color, size, opacity = 1, ...p }) => (
  <sprite scale={[size, size, 1]} {...p}><spriteMaterial map={glowDot()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
);
const Label: React.FC<{ text: string; h: number; color?: string } & JSX.IntrinsicElements["mesh"]> = ({ text, h, color = "#ffffff", ...p }) => {
  const t = label(text, 128, color);
  return <mesh {...p}><planeGeometry args={[h * (t.image.width / t.image.height), h]} /><meshBasicMaterial map={t} transparent toneMapped={false} depthWrite={false} /></mesh>;
};
const Sign: React.FC<{ text: string; w: number; h: number; bg?: string; fg?: string } & JSX.IntrinsicElements["mesh"]> = ({ text, w, h, bg = "#0f3d2e", fg = "#ffd84d", ...p }) => (
  <mesh {...p}><planeGeometry args={[w, h]} /><meshBasicMaterial map={sign(text, bg, fg)} toneMapped={false} /></mesh>
);
const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={c} roughness={0.6} {...o} />;
const Box: React.FC<{ s: V3; c: string; o?: Partial<THREE.MeshStandardMaterialParameters> } & JSX.IntrinsicElements["mesh"]> = ({ s, c, o, ...p }) => (
  <mesh {...p}><boxGeometry args={s} />{M(c, o)}</mesh>
);
/** a cash stack: banded bundle of bills */
const Stack: React.FC<{ n?: number } & JSX.IntrinsicElements["group"]> = ({ n = 1, ...p }) => {
  const top = useMemo(() => cash("100"), []);
  return (
    <group {...p}>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[0, i * 0.075, 0]}>
          <mesh><boxGeometry args={[0.62, 0.07, 0.27]} /><meshStandardMaterial color="#a9d39a" roughness={0.9} /></mesh>
          <mesh position={[0, 0.036, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.6, 0.255]} /><meshStandardMaterial map={top} roughness={0.8} /></mesh>
          <mesh position={[0, 0, 0]}><boxGeometry args={[0.09, 0.075, 0.28]} /><meshStandardMaterial color="#f2e2b6" roughness={0.7} /></mesh>
        </group>
      ))}
    </group>
  );
};
const Tree: React.FC<JSX.IntrinsicElements["group"] & { k?: number }> = ({ k = 0, ...p }) => (
  <group {...p}>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.1, 0.14, 1, 10]} />{M("#7a4b2a")}</mesh>
    <mesh position={[0, 1.45, 0]}><sphereGeometry args={[0.65 + 0.1 * (k % 3), 18, 14]} />{M(["#3fae4a", "#4cc35a", "#2f9e44"][k % 3], { roughness: 0.8 })}</mesh>
  </group>
);
/** curved money road between two points (reveal 0..1), with an arrow head */
const Arc: React.FC<{ a: V3; b: V3; h: number; reveal: number; color: string; width?: number }> = ({ a, b, h, reveal, color, width = 0.07 }) => {
  const curve = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), new THREE.Vector3((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2), new THREE.Vector3(...b)), [a, b, h]);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 80, width, 10, false), [curve, width]);
  geo.setDrawRange(0, Math.floor(geo.index!.count * clamp(reveal)));
  const tip = curve.getPoint(Math.max(0.001, clamp(reveal))), dir = curve.getTangent(Math.max(0.001, clamp(reveal)));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  return (
    <group>
      <mesh geometry={geo}><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.6)} toneMapped={false} /></mesh>
      {reveal > 0.02 && <mesh position={tip} quaternion={q}><coneGeometry args={[width * 3, width * 6, 16]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(1.6)} toneMapped={false} /></mesh>}
    </group>
  );
};
const arcPoint = (a: V3, b: V3, h: number, u: number): V3 => {
  const m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
  const v = (i: number) => (1 - u) * (1 - u) * a[i] + 2 * (1 - u) * u * m[i] + u * u * b[i];
  return [v(0), v(1), v(2)];
};
/** a stream of bills (or coins) along an arc: n items, each takes `travel` s, launched every `every` s from t0 to t1 */
const Stream: React.FC<{ t: number; a: V3; b: V3; h: number; t0: number; t1: number; every: number; travel: number; coin?: boolean; scale?: number }> = ({ t, a, b, h, t0, t1, every, travel, coin, scale = 1 }) => {
  const items: React.ReactNode[] = [];
  for (let k = 0; t0 + k * every <= t1; k++) {
    const u = (t - (t0 + k * every)) / travel;
    if (u < 0 || u > 1) continue;
    const p = arcPoint(a, b, h, easeOut(u * 0.9 + 0.1 * u * u));
    items.push(coin
      ? <Coin key={k} position={p} rotation={[0, t * 5 + k, 0]} scale={0.3 * scale} />
      : <Bill key={k} position={p} rotation={[0.3 * Math.sin(t * 6 + k), t * 3 + k, 0.5 * Math.sin(t * 4 + k)]} scale={0.75 * scale} />);
  }
  return <>{items}</>;
};
const walkPose = (t: number, k = 0): Pose => ({ bob: 0.04 * Math.abs(Math.sin(t * 7 + k)), armL: 0.35 * Math.sin(t * 7 + k), armR: -0.35 * Math.sin(t * 7 + k), blink: blink(t, k) });
const Sky: React.FC<{ top?: string; bottom?: string }> = ({ top = "#5fb6ff", bottom = "#d6f0ff" }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ gl_FragColor = vec4(mix(b, a, smoothstep(-0.05, 0.6, p.y)), 1.0); }" }), [top, bottom]);
  return <mesh material={mat}><sphereGeometry args={[150, 32, 16]} /></mesh>;
};

// =========================================================================== street set (scenes 2, 3, 5)
export const BANK: V3 = [-2.6, 0, -2.4], HOUSE: V3 = [2.5, 0, -1.4], GOV: V3 = [4.4, 0, -9.0];
const BankBuilding: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <Box s={[3.8, 0.3, 2.9]} c="#d9d4c7" position={[0, 0.15, 0.2]} />
    <Box s={[3.6, 0.15, 0.4]} c="#cfc8b8" position={[0, 0.07, 1.75]} />
    <Box s={[3.4, 2.4, 2.4]} c="#efe9dc" position={[0, 1.5, 0]} />
    {[-1.3, -0.45, 0.45, 1.3].map((x) => <mesh key={x} position={[x, 1.5, 1.35]}><cylinderGeometry args={[0.14, 0.16, 2.4, 16]} />{M("#fbf7ee", { roughness: 0.4 })}</mesh>)}
    <Box s={[3.8, 0.25, 2.9]} c="#e6dfcf" position={[0, 2.82, 0.2]} />
    <mesh position={[0, 3.2, 1.25]} rotation={[0, 0, 0]}><cylinderGeometry args={[0.001, 2.05, 0.6, 3, 1, false, Math.PI / 2 * 0, Math.PI * 2]} />{M("#efe9dc")}</mesh>
    <Sign text="BANK" w={1.6} h={0.42} position={[0, 2.45, 1.5]} />
    <Box s={[0.9, 1.4, 0.05]} c="#5a3d2a" position={[0, 1.0, 1.21]} />
  </group>
);
const House: React.FC<JSX.IntrinsicElements["group"]> = (p) => {
  const wall = useMemo(() => siding("#ffd8a8"), []);
  return (
    <group {...p}>
      <mesh position={[0, 0.95, 0]}><boxGeometry args={[2.6, 1.9, 2.2]} /><meshStandardMaterial map={wall} roughness={0.8} /></mesh>
      <mesh position={[0, 2.35, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]}><coneGeometry args={[2.1, 1.0, 4]} />{M("#c2410c", { roughness: 0.7 })}</mesh>
      <Box s={[0.3, 0.7, 0.3]} c="#9a3412" position={[0.7, 2.5, -0.3]} />
      <Box s={[0.55, 1.0, 0.05]} c="#2563eb" position={[0, 0.5, 1.11]} />
      {[-0.8, 0.8].map((x) => <group key={x}><Box s={[0.55, 0.5, 0.04]} c="#bae6fd" o={{ roughness: 0.2, emissive: new THREE.Color("#3b6c8c"), emissiveIntensity: 0.3 }} position={[x, 1.15, 1.11]} /><Box s={[0.62, 0.06, 0.08]} c="#ffffff" position={[x, 0.88, 1.13]} /></group>)}
      <Box s={[1.6, 0.04, 1.2]} c="#9ca3af" position={[0, 0.02, 1.8]} />
    </group>
  );
};
const GovBuilding: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <Box s={[4.4, 0.35, 3.0]} c="#d6d3cc" position={[0, 0.17, 0]} />
    <Box s={[4.0, 2.0, 2.4]} c="#f4f1ea" position={[0, 1.35, 0]} />
    {[-1.6, -0.8, 0, 0.8, 1.6].map((x) => <mesh key={x} position={[x, 1.35, 1.3]}><cylinderGeometry args={[0.13, 0.15, 2.0, 14]} />{M("#ffffff", { roughness: 0.4 })}</mesh>)}
    <mesh position={[0, 2.6, 0]}><cylinderGeometry args={[1.0, 1.1, 0.5, 32]} />{M("#f4f1ea")}</mesh>
    <mesh position={[0, 2.85, 0]}><sphereGeometry args={[1.0, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />{M("#e8ecf2", { metalness: 0.3, roughness: 0.3 })}</mesh>
    <mesh position={[0, 4.05, 0]}><cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />{M("#555")}</mesh>
    <mesh position={[0.18, 4.2, 0]}><planeGeometry args={[0.32, 0.2]} />{M("#2563eb", { side: THREE.DoubleSide })}</mesh>
    <Sign text="GOVERNMENT" w={2.2} h={0.36} bg="#1e3a8a" fg="#ffffff" position={[0, 2.15, 1.32]} />
  </group>
);
const Street: React.FC = () => (
  <group>
    <Sky />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[120, 120]} />{M(COL.grass, { roughness: 0.95 })}</mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[3, 0.01, 1.9]}><planeGeometry args={[40, 1.6]} />{M(COL.road, { roughness: 0.9 })}</mesh>
    {Array.from({ length: 14 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-14 + i * 3, 0.02, 1.9]}><planeGeometry args={[1.2, 0.1]} />{M("#ffffff")}</mesh>)}
    <BankBuilding position={BANK} />
    <House position={HOUSE} />
    <GovBuilding position={GOV} scale={1.25} />
    {[[-7, -4, 0], [0.2, -4.5, 1], [6.6, -3.8, 2], [14.5, -5, 0], [-6.2, -0.8, 1], [7.2, 0.0, 2]].map(([x, z, k], i) => <Tree key={i} position={[x, 0, z]} k={k} />)}
    <hemisphereLight args={["#dff3ff", "#5a8a4a", 0.75]} />
    <directionalLight position={[6, 9, 6]} intensity={2.4} color="#fff4e0" />
  </group>
);
const BANK_DOOR: V3 = [BANK[0] + 0.6, 2.9, BANK[2] + 1.0], HOUSE_TOP: V3 = [HOUSE[0] - 0.4, 2.6, HOUSE[2] + 0.6], GOV_TOP: V3 = [GOV[0] - 0.6, 3.6, GOV[2] + 1.6];
const Family: React.FC<{ t: number; keysAt?: number }> = ({ t, keysAt = 99 }) => {
  const got = t > keysAt + 0.6;
  return (
    <group position={[HOUSE[0], 0, HOUSE[2] + 2.2]}>
      <Person position={[-0.75, 0, 0]} rotation={[0, -0.35, 0]} scale={0.95} look={LOOKS.dad} pose={{ mood: got ? "wow" : "smile", armR: got ? 2.3 : 0.15, blink: blink(t, 2), bob: got ? 0.05 * Math.abs(Math.sin(t * 8)) : 0 }} />
      <Person position={[0.1, 0, 0.1]} rotation={[0, -0.2, 0]} scale={0.9} look={LOOKS.mom} pose={{ mood: got ? "wow" : "smile", armL: got ? 1.8 : 0.1, blink: blink(t, 4) }} />
      <Person position={[0.75, 0, 0.25]} rotation={[0, -0.3, 0]} scale={0.6} look={LOOKS.kid} pose={{ mood: "smile", armR: got ? 2.8 : 0.2, armL: got ? 2.8 : 0.2, bob: got ? 0.08 * Math.abs(Math.sin(t * 9)) : 0, blink: blink(t, 6) }} />
    </group>
  );
};
/** a golden house key */
const Key: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <mesh><torusGeometry args={[0.13, 0.045, 10, 24]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>
    <mesh position={[0.32, 0, 0]}><boxGeometry args={[0.42, 0.06, 0.04]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>
    {[0.38, 0.48].map((x) => <mesh key={x} position={[x, -0.06, 0]}><boxGeometry args={[0.05, 0.1, 0.04]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>)}
  </group>
);

// =========================================================================== 1. the hook: bank lobby (0 - 7.5 s)
export const Lobby: React.FC<{ t: number }> = ({ t }) => {
  const walk = smooth(ramp(t, 0.0, 2.7));
  const teenZ = lerp(4.0, -1.7, walk);
  const give = smooth(ramp(t, 2.75, 3.5));
  const fly = ramp(t, 3.6, 7.2);
  const vault = smooth(ramp(t, 4.8, 5.8));
  const floor = useMemo(() => marble(), []);
  useCamKeys(t, [
    [0, [1.9, 2.1, 9.0], [0.1, 1.3, 0.0], 44], [2.6, [1.6, 1.8, 2.4], [0.0, 1.25, -2.6], 42],
    [3.7, [2.4, 1.85, -1.3], [0, 1.3, -3.2], 42], [5.2, [1.0, 2.1, -3.0], [0, 1.7, -6.0], 44], [7.5, [0.2, 1.8, -4.7], [0, 1.7, -6.2], 52],
  ]);
  const bills = Array.from({ length: 10 }, (_, k) => {
    const u = clamp((fly - k * 0.035) / 0.65);
    if (fly <= 0 || u >= 1) return null;
    const start: V3 = [0.0, 1.2, -2.95], mid: V3 = [-1.2 + k * 0.27, 2.6 + 0.3 * Math.sin(k), -4.2], end: V3 = [0, 1.7, -6.3];
    const p = u < 0.5 ? mix3(start, mid, easeOut(u * 2)) : mix3(mid, end, easeIn((u - 0.5) * 2));
    return <Bill key={k} position={p} rotation={[t * 4 + k, t * 3, 0.4 * Math.sin(t * 9 + k)]} scale={0.8} glow={0.3} />;
  });
  return (
    <group>
      <color attach="background" args={["#e8e0d0"]} />
      <hemisphereLight args={["#fff8ec", "#a89a85", 0.8]} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} color="#fff2dc" />
      <pointLight position={[0, 1.8, -5.6]} intensity={6 * vault} distance={5} color={COL.gold} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[14, 16]} /><meshStandardMaterial map={floor} roughness={0.25} metalness={0.1} /></mesh>
      <Box s={[14, 6, 0.2]} c="#f3ead9" position={[0, 3, -6.6]} />
      <Box s={[0.2, 6, 16]} c="#efe4cf" position={[-4.5, 3, 0]} />
      <Box s={[0.2, 6, 16]} c="#efe4cf" position={[4.5, 3, 0]} />
      {[-3.6, 3.6].map((x) => [-4.5, -1, 2.5].map((z) => <mesh key={`${x}${z}`} position={[x, 3, z]}><cylinderGeometry args={[0.28, 0.32, 6, 18]} />{M("#fbf6ec", { roughness: 0.35 })}</mesh>))}
      <Sign text="BANK" w={2.4} h={0.62} position={[0, 4.4, -6.45]} />
      {/* counter + glass + teller */}
      <Box s={[6, 1.1, 0.7]} c="#7c4a2a" o={{ roughness: 0.4 }} position={[0, 0.55, -3.0]} />
      <Box s={[6.1, 0.08, 0.8]} c="#e9e2d2" o={{ roughness: 0.2 }} position={[0, 1.12, -3.0]} />
      <mesh position={[0, 1.75, -3.25]}><boxGeometry args={[6, 1.2, 0.03]} /><meshPhysicalMaterial color="#cfefff" transparent opacity={0.18} roughness={0.05} /></mesh>
      <Person position={[0.1, 0, -3.8]} look={LOOKS.teller} pose={{ mood: "smile", armR: give > 0.5 && t < 4.2 ? 1.2 : 0.2, blink: blink(t, 3), head: 0.1 * Math.sin(t) }} />
      {/* vault door at the back */}
      <group position={[0, 1.7, -6.45]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.25, 1.25, 0.12, 48]} />{M("#6b7280", { metalness: 0.9, roughness: 0.3 })}</mesh>
        <group position={[1.2, 0, 0.12]} rotation={[0, -1.9 * vault, 0]}>
          <group position={[-1.2, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.1, 1.1, 0.22, 48]} />{M("#9ca3af", { metalness: 1, roughness: 0.25 })}</mesh>
            {[0, 1, 2].map((k) => <mesh key={k} position={[0, 0, 0.13]} rotation={[0, 0, k * Math.PI / 3 + t]}><boxGeometry args={[1.4, 0.08, 0.06]} />{M("#d1d5db", { metalness: 1, roughness: 0.2 })}</mesh>)}
          </group>
        </group>
        <Glow color={COL.gold} size={3.2 * vault} opacity={0.5 * vault} position={[0, 0, 0.1]} />
      </group>
      {/* the teen walks in with $1,000, hands it over */}
      <Person position={[0.25, 0, teenZ]} rotation={[0, Math.PI, 0]} look={LOOKS.teen} scale={0.92}
        pose={{ ...(walk < 1 ? walkPose(t) : {}), armR: give > 0 ? 0.9 + 0.4 * give : 0.9, mood: t > 5.3 ? "wow" : "smile", blink: blink(t, 1), head: t > 4 ? 0.0 : 0 }} />
      {t < 3.6 && <Stack n={4} position={give > 0 ? mix3([0.55, 1.12, teenZ - 0.45], [0.1, 1.2, -2.95], give) : [0.55, 1.1, teenZ - 0.45]} rotation={[0, 0.2, 0]} />}
      {bills}
    </group>
  );
};

// =========================================================================== 2. deposits -> loans (7.5 - 14.9 s)
export const Loans: React.FC<{ t: number }> = ({ t }) => {
  const reveal = easeOut(ramp(t, S(3) + 0.3, S(3) + 1.7));
  const keyAt = S(4) + 2.2;
  const ku = clamp((t - keyAt) / 1.0);
  useCamKeys(t, [[7.4, [0.2, 4.4, 15.5], [0, 2.4, -1.6], 44], [10.6, [0.4, 4.0, 13.8], [0.1, 2.3, -1.4], 44], [12.6, [2.0, 2.2, 6.4], [2.3, 1.5, -0.4], 42], [15, [2.4, 2.0, 5.2], [2.4, 1.4, -0.3], 42]]);
  return (
    <group>
      <Street />
      <Arc a={BANK_DOOR} b={HOUSE_TOP} h={2.6} reveal={reveal} color={COL.green} />
      {reveal > 0.9 && <Label text="LOAN" h={0.42} color="#eafff0" position={[arcPoint(BANK_DOOR, HOUSE_TOP, 2.6, 0.5)[0], arcPoint(BANK_DOOR, HOUSE_TOP, 2.6, 0.5)[1] + 0.45, -0.6]} />}
      <Stream t={t} a={BANK_DOOR} b={HOUSE_TOP} h={2.6} t0={S(3) + 1.2} t1={E(4)} every={0.28} travel={1.6} />
      {/* deposits pile in front of the bank */}
      <Stack n={6} position={[BANK[0] + 1.6, 0.32, BANK[2] + 2.1]} />
      <Label text="DEPOSITS" h={0.3} color="#0f3d2e" position={[BANK[0] + 1.6, 1.05, BANK[2] + 2.1]} />
      {ku > 0 && ku < 1 && <Key position={arcPoint(BANK_DOOR, [HOUSE[0] - 0.75, 1.6, HOUSE[2] + 2.3], 2.0, easeOut(ku))} rotation={[0, 0, t * 6]} scale={1.3} />}
      {ku >= 1 && <><Key position={[HOUSE[0] - 0.62, 1.93, HOUSE[2] + 2.45]} rotation={[0, 0, Math.sin(t * 4) * 0.3]} scale={1.1} /><Glow color={COL.gold} size={1.2} opacity={0.6 * (1 - ramp(t, keyAt + 1, keyAt + 2.4))} position={[HOUSE[0] - 0.6, 1.95, HOUSE[2] + 2.5]} /></>}
      <Family t={t} keysAt={keyAt} />
    </group>
  );
};

// =========================================================================== 3. interest (14.9 - 25.2 s)
export const Interest: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[14.9, [1.6, 3.6, 13.0], [0, 2.3, -1.6], 44], [19.0, [0.6, 3.9, 14.0], [0, 2.4, -1.6], 44], [25.2, [-0.6, 4.2, 15.0], [0, 2.5, -1.6], 44]]);
  const reveal = easeOut(ramp(t, 15.2, 16.3));
  return (
    <group>
      <Street />
      <Arc a={HOUSE_TOP} b={BANK_DOOR} h={2.6} reveal={reveal} color={COL.gold} />
      {/* payments back to the bank: bills (the loan) and gold coins (the interest) */}
      <Stream t={t} a={HOUSE_TOP} b={BANK_DOOR} h={2.6} t0={15.8} t1={24.4} every={0.55} travel={1.7} />
      <Stream t={t} a={HOUSE_TOP} b={BANK_DOOR} h={2.6} t0={16.07} t1={24.4} every={0.55} travel={1.7} coin scale={1.2} />
      <group position={[arcPoint(HOUSE_TOP, BANK_DOOR, 2.6, 0.5)[0], arcPoint(HOUSE_TOP, BANK_DOOR, 2.6, 0.5)[1] - 1.3, -0.6]} scale={backOut(ramp(t, 16.6, 17.2))}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.62, 0.62, 0.12, 40]} />{M(COL.gold, { metalness: 0.8, roughness: 0.25, emissive: new THREE.Color("#5a3a00") })}</mesh>
        <Label text="8%" h={0.62} color="#3b2500" position={[0, 0, 0.07]} />
      </group>
      <Family t={t} />
      <Stack n={Math.min(9, 6 + Math.floor(ramp(t, 16, 24.5) * 4))} position={[BANK[0] + 1.6, 0.32, BANK[2] + 2.1]} />
    </group>
  );
};

// =========================================================================== 4. your savings (25.2 - 34.9 s)
export const SPLIT_AT = (E(8) + S(9)) / 2;
const Room: React.FC<{ t: number; mood: Pose["mood"]; lookUp?: number }> = ({ t, mood, lookUp = 0 }) => (
  <group>
    <color attach="background" args={["#cfe7ff"]} />
    <hemisphereLight args={["#ffffff", "#b0a090", 0.8]} />
    <directionalLight position={[-3, 5, 4]} intensity={1.6} color="#fff3e0" />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 12]} />{M("#d9b38c", { roughness: 0.7 })}</mesh>
    <Box s={[12, 5, 0.2]} c="#7dd3c8" position={[0, 2.5, -2.2]} />
    <Box s={[1.6, 1.2, 0.05]} c="#e0f2fe" o={{ emissive: new THREE.Color("#bfe9ff"), emissiveIntensity: 0.6 }} position={[1.7, 2.2, -2.08]} />
    <Box s={[1.7, 0.08, 0.12]} c="#ffffff" position={[1.7, 1.58, -2.04]} />
    <Box s={[0.9, 1.2, 0.04]} c="#fb923c" position={[-1.6, 2.4, -2.08]} />
    <Label text="$" h={0.7} color="#fff7ed" position={[-1.6, 2.4, -2.05]} />
    {/* sofa */}
    <Box s={[2.6, 0.45, 1.0]} c="#6366f1" position={[0, 0.35, -0.9]} />
    <Box s={[2.6, 0.8, 0.3]} c="#585ce0" position={[0, 0.8, -1.35]} />
    {[-1.3, 1.3].map((x) => <Box key={x} s={[0.3, 0.6, 1.0]} c="#585ce0" position={[x, 0.55, -0.9]} />)}
    <Person position={[0.1, 0.12, -0.8]} look={LOOKS.teen} scale={0.92}
      pose={{ sit: 1, armR: 1.25, armL: 1.25, mood, blink: blink(t, 2), head: 0.05 * Math.sin(t), tilt: lookUp }} />
    {/* phone in his hands */}
    <group position={[0.1, 1.3, -0.25]} rotation={[-0.6, 0, 0]}>
      <Box s={[0.2, 0.38, 0.025]} c="#111827" o={{ roughness: 0.3 }} />
      <mesh position={[0, 0, 0.014]}><planeGeometry args={[0.18, 0.35]} /><meshBasicMaterial color={new THREE.Color("#7dd3fc").multiplyScalar(1.3)} toneMapped={false} /></mesh>
    </group>
  </group>
);
export const Savings: React.FC<{ t: number }> = ({ t }) => {
  if (t < SPLIT_AT) {
    useCamKeys(t, [[25.2, [1.6, 1.7, 3.6], [0.1, 1.2, -0.6], 42], [28.8, [0.9, 1.55, 2.6], [0.1, 1.25, -0.6], 40], [SPLIT_AT, [0.5, 1.5, 2.0], [0.1, 1.3, -0.5], 38]]);
    return <Room t={t} mood={t > S(8) + 1.0 ? "smile" : "calm"} />;
  }
  // split screen: what you earn (left) vs what the bank earns from a loan of the same $1,000 (right)
  useCamKeys(t, [[SPLIT_AT, [0, 1.6, 8.8], [0, 1.0, 0], 42], [35.2, [0, 1.6, 8.4], [0, 1.0, 0], 42]]);
  const grow = easeOut(ramp(t, SPLIT_AT + 0.2, SPLIT_AT + 1.3));
  return (
    <group>
      <color attach="background" args={["#0f1b33"]} />
      <hemisphereLight args={["#ffffff", "#334155", 1.0]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#16294a", { roughness: 0.4, metalness: 0.3 })}</mesh>
      <mesh position={[0, 2.2, -0.6]}><planeGeometry args={[0.03, 4.4]} /><meshBasicMaterial color={new THREE.Color(COL.cyan).multiplyScalar(2)} toneMapped={false} /></mesh>
      {/* left: you + one coin ($10) */}
      <Person position={[-1.25, 0, 0]} rotation={[0, 0.25, 0]} scale={0.8} look={LOOKS.teen} pose={{ mood: "calm", armR: 1.2, blink: blink(t, 5) }} />
      <Coin position={[-0.75, 1.25, 0.4]} rotation={[0, t * 2, 0]} scale={0.4 * backOut(ramp(t, SPLIT_AT + 0.1, SPLIT_AT + 0.5))} />
      {/* right: a mini bank with eight coins ($80) */}
      <BankBuilding position={[1.25, 0, -0.8]} scale={0.38} />
      <Coins n={8} xf={(i) => i / 8 < grow ? [[1.25, 0.1 + i * 0.1, 0.6], [0, i * 0.5, 0], 0.45] : null} />
      <Glow color={COL.gold} size={1.6} opacity={0.35 * grow} position={[1.25, 0.6, 0.7]} />
    </group>
  );
};

// =========================================================================== 5. investments and mutual funds (34.9 - 46.0 s)
export const FUND_AT = (E(10) + S(11)) / 2;
export const Invest: React.FC<{ t: number }> = ({ t }) => {
  if (t < FUND_AT) {
    // bonds: the bank lends to the government, a bond certificate comes back, then interest coins
    useCamKeys(t, [[34.9, [0.0, 5.0, 14.5], [0.8, 2.8, -3.6], 46], [38.9, [1.4, 5.4, 13.0], [1.2, 3.0, -4.2], 46]]);
    const reveal = easeOut(ramp(t, 35.3, 36.4));
    const bu = clamp((t - 37.0) / 1.1);
    return (
      <group>
        <Street />
        <Arc a={BANK_DOOR} b={GOV_TOP} h={3.0} reveal={reveal} color={COL.cyan} />
        <Stream t={t} a={BANK_DOOR} b={GOV_TOP} h={3.0} t0={35.8} t1={37.0} every={0.22} travel={1.4} />
        {bu > 0 && bu < 1 && <mesh position={arcPoint(GOV_TOP, BANK_DOOR, 2.0, easeOut(bu))} rotation={[0, 0, Math.sin(t * 5) * 0.2]}><planeGeometry args={[1.0, 0.7]} /><meshStandardMaterial map={bond()} side={THREE.DoubleSide} /></mesh>}
        <Stream t={t} a={GOV_TOP} b={BANK_DOOR} h={2.0} t0={37.9} t1={38.9} every={0.25} travel={1.2} coin scale={1.1} />
        <Label text="BOND" h={0.4} color="#e0f7ff" position={[arcPoint(BANK_DOOR, GOV_TOP, 3.0, 0.5)[0], arcPoint(BANK_DOOR, GOV_TOP, 3.0, 0.5)[1] + 0.5, -1.0]} />
      </group>
    );
  }
  // mutual fund: the teen CHOOSES to buy a basket of tiny pieces of many companies; the bank charges a small fee for helping
  useCamKeys(t, [[FUND_AT, [0.4, 2.0, 7.6], [0.1, 1.5, -0.6], 42], [43.0, [0.6, 2.1, 6.6], [0.1, 1.6, -0.6], 40], [46.0, [0.5, 2.2, 6.2], [0.1, 1.7, -0.6], 40]]);
  const basket = backOut(ramp(t, 40.6, 41.2));
  const fee = clamp((t - 41.4) / 0.9);
  return (
    <group>
      <color attach="background" args={["#fde7c9"]} />
      <hemisphereLight args={["#ffffff", "#c9a27a", 0.8]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#f6d6ab", { roughness: 0.6 })}</mesh>
      <Box s={[14, 6, 0.2]} c="#fbcf8f" position={[0, 3, -3]} />
      <Sign text="INVESTING DESK" w={3.0} h={0.55} bg="#7c2d12" fg="#ffedd5" position={[0, 3.3, -2.88]} />
      <Box s={[2.4, 1.0, 0.7]} c="#9a3412" position={[-1.5, 0.5, -1.6]} />
      <Person position={[-1.5, 0, -2.3]} look={LOOKS.teller} scale={0.9} pose={{ mood: "smile", blink: blink(t, 8), armR: fee > 0 && fee < 1 ? 1.0 : 0.2 }} />
      {/* customers: the teen chooses, two others browse */}
      <Person position={[0.4, 0, 0.6]} rotation={[0, -0.5, 0]} look={LOOKS.teen} scale={0.92} pose={{ mood: basket > 0.5 ? "wow" : "smile", armR: t > 40.1 && t < 41.3 ? 1.6 : 0.3, blink: blink(t, 1) }} />
      <Person position={[1.6, 0, -0.2]} rotation={[0, -0.7, 0]} look={{ hoodie: "#8b5cf6", hair: "#1f2937", hairStyle: 1 }} scale={0.95} pose={{ mood: "calm", blink: blink(t, 3), head: 0.3 * Math.sin(t * 0.8) }} />
      <Person position={[2.4, 0, 0.7]} rotation={[0, -0.9, 0]} look={{ hoodie: "#f43f5e", hair: "#78350f", hairStyle: 2, skin: "#d9a07a" }} scale={0.9} pose={{ mood: "smile", blink: blink(t, 5) }} />
      {/* the basket (mutual fund) with tiny companies dropping in */}
      <group position={[-0.55, 2.05, -0.6]} scale={0.85 * basket}>
        <mesh position={[0, -0.18, 0]}><cylinderGeometry args={[0.55, 0.4, 0.45, 24, 1, true]} />{M("#b45309", { roughness: 0.9, side: THREE.DoubleSide })}</mesh>
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.4, 24]} />{M("#92400e")}</mesh>
        <mesh position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.045, 8, 32]} />{M("#92400e")}</mesh>
        <mesh position={[0, 0.35, 0]} rotation={[0, 0, 0]}><torusGeometry args={[0.5, 0.03, 8, 24, Math.PI]} />{M("#92400e")}</mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const at = 41.4 + i * 0.32, u = clamp((t - at) / 0.45);
          if (t < at) return null;
          const ang = i * 0.8, r = 0.22 + (i % 2) * 0.12;
          return <mesh key={i} position={[Math.cos(ang) * r, lerp(1.4, -0.05 + (i % 3) * 0.08, easeIn(u)), Math.sin(ang) * r * 0.6]} rotation={[0, -0.2 + ang * 0.1, 0.15 * Math.sin(i)]}>
            <boxGeometry args={[0.24, 0.24, 0.24]} /><meshStandardMaterial map={company(i)} roughness={0.5} /></mesh>;
        })}
      </group>
      {fee > 0 && fee < 1 && <Coin position={mix3([0.3, 1.5, 0.4], [-1.5, 1.6, -1.6], easeOut(fee))} rotation={[0, t * 6, 0]} scale={0.25} />}
    </group>
  );
};

// =========================================================================== 6. the big reveal (46.0 - 60 s)
export const TEEN_END = (E(15) + S(16)) / 2;
const CROWD = 360;
const TeenEnd: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[TEEN_END, [0.6, 1.6, 2.4], [0.1, 1.35, -0.6], 40], [60, [0.35, 1.55, 1.8], [0.1, 1.4, -0.6], 36]]);
  return <Room t={t} mood="wow" lookUp={0.06 * Math.sin(t * 3)} />;
};
export const Reveal: React.FC<{ t: number }> = ({ t }) => (t >= TEEN_END ? <TeenEnd key="teen" t={t} /> : <City key="city" t={t} />);
const City: React.FC<{ t: number }> = ({ t }) => {
  // a city: thousands of customers streaming into a giant bank tower; money flies up; red expenses fly out
  const towerMap = useMemo(() => tower(), []);
  const r = useMemo(() => { const g = rng(5); return Array.from({ length: CROWD }, () => [g(), g(), g(), g()]); }, []);
  const people = useMemo(() => {
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.18, 0.35, 4, 8), new THREE.MeshStandardMaterial({ roughness: 0.7 }), CROWD);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.17, 12, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), CROWD);
    const cols = ["#14b8a6", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#22c55e", "#ec4899", "#f97316"], skins = ["#f2c09b", "#c98f68", "#8d5a3b", "#e8b08a"];
    for (let i = 0; i < CROWD; i++) { body.setColorAt(i, new THREE.Color(cols[i % cols.length])); head.setColorAt(i, new THREE.Color(skins[(i * 7) % 4])); }
    body.frustumCulled = head.frustumCulled = false;
    return { body, head };
  }, []);
  const o = new THREE.Object3D();
  for (let i = 0; i < CROWD; i++) {
    const [a, b, c, d] = r[i];
    const ang = a * Math.PI * 2, along = ((b + (t - 46) * (0.05 + 0.04 * c)) % 1);
    const rad = lerp(26, 3.2, along);
    const x = Math.cos(ang) * rad + (d - 0.5) * 0.8, z = Math.sin(ang) * rad - 6 + (c - 0.5) * 0.8;
    const bob = 0.05 * Math.abs(Math.sin(t * 8 + i));
    o.position.set(x, 0.42 + bob, z); o.rotation.set(0, -ang - Math.PI / 2, 0); o.scale.setScalar(1); o.updateMatrix(); people.body.setMatrixAt(i, o.matrix);
    o.position.set(x, 0.98 + bob, z); o.updateMatrix(); people.head.setMatrixAt(i, o.matrix);
  }
  people.body.instanceMatrix.needsUpdate = people.head.instanceMatrix.needsUpdate = true;
  useCamKeys(t, [[46.0, [14, 16, 26], [0, 3, -6], 46], [48.7, [8, 7, 15], [0, 6, -6], 46], [50.4, [3.5, 2.2, 6.5], [0, 13, -6], 52], [54.0, [5, 4, 11], [0, 8, -6], 48], [57.4, [6, 5, 14], [0, 7, -6], 46]]);
  const billions = ramp(t, 48.8, 49.4);
  const out = ramp(t, 50.6, 54.0);
  return (
    <group>
      <Sky top="#4aa8ff" bottom="#ffe2c2" />
      <hemisphereLight args={["#e6f4ff", "#5a8a4a", 0.8]} />
      <directionalLight position={[10, 18, 8]} intensity={2.4} color="#fff1dc" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 200]} />{M(COL.grass, { roughness: 0.95 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -6]}><circleGeometry args={[27, 64]} />{M("#cbd5e1", { roughness: 0.8 })}</mesh>
      {/* the tower */}
      <group position={[0, 0, -6]}>
        <mesh position={[0, 8, 0]}><boxGeometry args={[4.4, 16, 4.4]} /><meshStandardMaterial map={towerMap} roughness={0.25} metalness={0.4} emissive="#ffffff" emissiveMap={towerMap} emissiveIntensity={0.25} /></mesh>
        <Box s={[5.0, 0.4, 5.0]} c="#e2e8f0" position={[0, 16.2, 0]} />
        <Sign text="BANK" w={3.6} h={1.0} position={[0, 15.2, 2.23]} />
        <Box s={[5.6, 1.4, 5.6]} c="#e2e8f0" position={[0, 0.7, 0]} />
        <Box s={[1.4, 1.2, 0.05]} c="#1e293b" position={[0, 0.6, 2.82]} />
        <Glow color={COL.gold} size={9 * billions} opacity={0.35 * billions} position={[0, 15, 3]} />
      </group>
      {[[-12, -14], [11, -16], [-16, -2], [15, -4], [-8, -22], [7, -24]].map(([x, z], i) => (
        <mesh key={i} position={[x, 3 + (i % 3) * 1.5, z]}><boxGeometry args={[3, 6 + (i % 3) * 3, 3]} /><meshStandardMaterial map={towerMap} roughness={0.4} color="#c7d6ee" /></mesh>
      ))}
      <primitive object={people.body} /><primitive object={people.head} />
      {/* money rising into the tower */}
      <Coins n={60} xf={(i) => { const u = ((t - 46) * 0.35 + i / 60) % 1, a = i * 2.4; return [[Math.cos(a) * (2.6 + (i % 4) * 0.6), 1 + u * 15, -6 + Math.sin(a) * (2.6 + (i % 4) * 0.6)], [t * 2 + i, i, 0], 0.55]; }} />
      {Array.from({ length: 14 }, (_, i) => {
        const u = ((t - 46) * 0.3 + i / 14) % 1, a = i * 1.7;
        return <Label key={i} text="$" h={1.1} color={i % 3 ? "#7CFFB0" : "#ffe27a"} position={[Math.cos(a) * 4.2, 2 + u * 16, -6 + Math.sin(a) * 4.2 + 2.5]} />;
      })}
      {/* expenses leaving: red bills */}
      {out > 0 && Array.from({ length: 10 }, (_, i) => {
        const u = clamp((out * 3.4 - i * 0.22) % 1.4);
        if (u <= 0 || u >= 1) return null;
        const a = i * 0.9 - 0.6;
        return <mesh key={i} position={[Math.cos(a) * (2.6 + u * 8), 8 + 3 * Math.sin(i) - u * 2, -6 + Math.sin(a) * (2.6 + u * 8) + 2]} rotation={[t * 3 + i, t * 2, 0]}>
          <planeGeometry args={[0.9, 0.4]} /><meshBasicMaterial color={new THREE.Color(COL.red).multiplyScalar(1.3)} side={THREE.DoubleSide} toneMapped={false} /></mesh>;
      })}
    </group>
  );
};
