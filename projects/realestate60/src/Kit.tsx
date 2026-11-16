// Shared 3D building blocks (from the banks video): camera helper, labels, buildings, street, characters, money.
import React, { useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Bill, Coin, Coins, Person, Look, Pose } from "./Actors";
import { COL, E, LOOKS, S, blink, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth, backOut } from "./timeline";
import { bond, cash, company, glowDot, label, marble, siding, sign, tower } from "./textures";

export type V3 = [number, number, number];
export const mix3 = (a: V3, b: V3, u: number): V3 => [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
/** camera keyframes: [time, pos, look, fov]; smootherstep between keys */
type Key = [number, V3, V3, number?];
/** zoom > 1 pulls every close key (camera within 12 m of its target) further back along its line of sight */
const pull = (k: Key, zoom: number): Key => {
  const d: V3 = [k[1][0] - k[2][0], k[1][1] - k[2][1], k[1][2] - k[2][2]];
  if (zoom === 1 || Math.hypot(...d) > 12) return k;
  return [k[0], [k[2][0] + d[0] * zoom, k[2][1] + d[1] * zoom, k[2][2] + d[2] * zoom], k[2], k[3]];
};
export const useCamKeys = (t: number, keys_: Key[], roll = 0, zoom = 1) => {
  const keys = keys_.map((k) => pull(k, zoom));
  let i = 0; while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, p0, l0, f0 = 42] = keys[i], [t1, p1, l1, f1 = 42] = keys[Math.min(i + 1, keys.length - 1)];
  const u = t1 > t0 ? smooth((t - t0) / (t1 - t0)) : 1;
  useCam(mix3(p0, p1, u), mix3(l0, l1, u), lerp(f0, f1, u), roll);
};
export const useCam = (pos: V3, look: V3, fov = 42, roll = 0) => {
  const { camera, size } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.up.set(Math.sin(roll), Math.cos(roll), 0); c.lookAt(...look);
  if (c.fov !== fov || c.aspect !== size.width / size.height) { c.fov = fov; c.aspect = size.width / size.height; c.updateProjectionMatrix(); }
};
export const Glow: React.FC<{ color: string; size: number; opacity?: number } & JSX.IntrinsicElements["sprite"]> = ({ color, size, opacity = 1, ...p }) => (
  <sprite scale={[size, size, 1]} {...p}><spriteMaterial map={glowDot()} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></sprite>
);
export const Label: React.FC<{ text: string; h: number; color?: string } & JSX.IntrinsicElements["mesh"]> = ({ text, h, color = "#ffffff", ...p }) => {
  const t = label(text, 128, color);
  return <mesh {...p}><planeGeometry args={[h * (t.image.width / t.image.height), h]} /><meshBasicMaterial map={t} transparent toneMapped={false} depthWrite={false} /></mesh>;
};
export const Sign: React.FC<{ text: string; w: number; h: number; bg?: string; fg?: string } & JSX.IntrinsicElements["mesh"]> = ({ text, w, h, bg = "#0f3d2e", fg = "#ffd84d", ...p }) => (
  <mesh {...p}><planeGeometry args={[w, h]} /><meshBasicMaterial map={sign(text, bg, fg)} toneMapped={false} /></mesh>
);
export const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => <meshStandardMaterial color={c} roughness={0.6} {...o} />;
export const Box: React.FC<{ s: V3; c: string; o?: Partial<THREE.MeshStandardMaterialParameters> } & JSX.IntrinsicElements["mesh"]> = ({ s, c, o, ...p }) => (
  <mesh {...p}><boxGeometry args={s} />{M(c, o)}</mesh>
);
/** a cash stack: banded bundle of bills */
export const Stack: React.FC<{ n?: number } & JSX.IntrinsicElements["group"]> = ({ n = 1, ...p }) => {
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
export const Tree: React.FC<JSX.IntrinsicElements["group"] & { k?: number }> = ({ k = 0, ...p }) => (
  <group {...p}>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.1, 0.14, 1, 10]} />{M("#7a4b2a")}</mesh>
    <mesh position={[0, 1.45, 0]}><sphereGeometry args={[0.65 + 0.1 * (k % 3), 18, 14]} />{M(["#3fae4a", "#4cc35a", "#2f9e44"][k % 3], { roughness: 0.8 })}</mesh>
  </group>
);
/** curved money road between two points (reveal 0..1), with an arrow head */
export const Arc: React.FC<{ a: V3; b: V3; h: number; reveal: number; color: string; width?: number }> = ({ a, b, h, reveal, color, width = 0.07 }) => {
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
export const arcPoint = (a: V3, b: V3, h: number, u: number): V3 => {
  const m: V3 = [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + h, (a[2] + b[2]) / 2];
  const v = (i: number) => (1 - u) * (1 - u) * a[i] + 2 * (1 - u) * u * m[i] + u * u * b[i];
  return [v(0), v(1), v(2)];
};
/** a stream of bills (or coins) along an arc: n items, each takes `travel` s, launched every `every` s from t0 to t1 */
export const Stream: React.FC<{ t: number; a: V3; b: V3; h: number; t0: number; t1: number; every: number; travel: number; coin?: boolean; scale?: number }> = ({ t, a, b, h, t0, t1, every, travel, coin, scale = 1 }) => {
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
export const walkPose = (t: number, k = 0, amt = 1): Pose => ({ bob: 0.04 * amt * Math.abs(Math.sin(t * 7 + k)), armL: 0.4 * amt * Math.sin(t * 7 + k), armR: -0.4 * amt * Math.sin(t * 7 + k), step: t * 7 + k, stride: 0.45 * amt, blink: blink(t, k) });
export const Sky: React.FC<{ top?: string; bottom?: string }> = ({ top = "#5fb6ff", bottom = "#d6f0ff" }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(bottom) } },
    vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 a; uniform vec3 b; varying vec3 p; void main(){ gl_FragColor = vec4(mix(b, a, smoothstep(-0.05, 0.6, p.y)), 1.0); }" }), [top, bottom]);
  return <mesh material={mat}><sphereGeometry args={[150, 32, 16]} /></mesh>;
};

// =========================================================================== street set (scenes 2, 3, 5)
export const BANK: V3 = [-2.6, 0, -2.4], HOUSE: V3 = [2.5, 0, -1.4], GOV: V3 = [4.4, 0, -9.0];
export const BankBuilding: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
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
export const House: React.FC<JSX.IntrinsicElements["group"]> = (p) => {
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
export const GovBuilding: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
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
export const Street: React.FC = () => (
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
export const BANK_DOOR: V3 = [BANK[0] + 0.6, 2.9, BANK[2] + 1.0], HOUSE_TOP: V3 = [HOUSE[0] - 0.4, 2.6, HOUSE[2] + 0.6], GOV_TOP: V3 = [GOV[0] - 0.6, 3.6, GOV[2] + 1.6];
export const Family: React.FC<{ t: number; keysAt?: number }> = ({ t, keysAt = 99 }) => {
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
export const Key: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <mesh><torusGeometry args={[0.13, 0.045, 10, 24]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>
    <mesh position={[0.32, 0, 0]}><boxGeometry args={[0.42, 0.06, 0.04]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>
    {[0.38, 0.48].map((x) => <mesh key={x} position={[x, -0.06, 0]}><boxGeometry args={[0.05, 0.1, 0.04]} />{M(COL.gold, { metalness: 1, roughness: 0.25 })}</mesh>)}
  </group>
);

