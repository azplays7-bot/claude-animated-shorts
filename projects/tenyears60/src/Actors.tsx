// The recurring cast and props: the investor ("Max"), crowd variants, Bitcoin coins and $20 bills.
import React, { useMemo } from "react";
import * as THREE from "three";
import { COL } from "./timeline";
import { dollarFace, cash } from "./textures";

export type Mood = "smile" | "wow" | "nervous" | "calm";
export type Pose = {
  sit?: number;          // 0 standing .. 1 seated
  armR?: number;         // right arm raise, radians forward
  armL?: number;
  head?: number;         // head turn (yaw)
  tilt?: number;         // head tilt (roll)
  bob?: number;          // vertical body bounce (m)
  blink?: number;        // 0 open .. 1 closed
  mood?: Mood;
  sweat?: number;        // 0..1 nervous sweat drop
};
export type Look = { hoodie?: string; hair?: string; skin?: string; pants?: string; hairStyle?: 0 | 1 | 2; beard?: number };   // beard: 0..1 stubble (ageing)

const M = (c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0, ...o });
const geo = {
  head: new THREE.SphereGeometry(0.42, 48, 32),
  eye: new THREE.SphereGeometry(0.075, 20, 14),
  shine: new THREE.SphereGeometry(0.022, 10, 8),
  hair: new THREE.SphereGeometry(0.445, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.42),
  fringe: new THREE.CapsuleGeometry(0.09, 0.42, 6, 12),
  body: new THREE.CapsuleGeometry(0.3, 0.42, 8, 24),
  hood: new THREE.TorusGeometry(0.24, 0.07, 10, 24),
  limb: new THREE.CapsuleGeometry(0.075, 0.42, 6, 12),
  leg: new THREE.CapsuleGeometry(0.09, 0.46, 6, 12),
  hand: new THREE.SphereGeometry(0.085, 14, 10),
  shoe: new THREE.CapsuleGeometry(0.08, 0.14, 6, 10),
  brow: new THREE.BoxGeometry(0.14, 0.03, 0.03),
  drop: new THREE.SphereGeometry(0.05, 12, 10),
  ear: new THREE.SphereGeometry(0.08, 12, 10),
};
const black = M("#14141c", { roughness: 0.3 });
const white = new THREE.MeshBasicMaterial({ color: "#ffffff" });
const mouthGeo = (mood: Mood) => {
  if (mood === "wow") return new THREE.TorusGeometry(0.06, 0.022, 8, 20);
  if (mood === "nervous") return new THREE.TorusGeometry(0.1, 0.018, 6, 16, Math.PI * 0.6);
  return new THREE.TorusGeometry(0.11, 0.02, 6, 16, Math.PI * (mood === "calm" ? 0.55 : 0.9));
};
const mouths = { smile: mouthGeo("smile"), wow: mouthGeo("wow"), nervous: mouthGeo("nervous"), calm: mouthGeo("calm") };

/** stylised 3D cartoon person, 1.6 m tall, origin at the feet */
export const Person: React.FC<{ pose?: Pose; look?: Look } & JSX.IntrinsicElements["group"]> = ({ pose = {}, look = {}, ...g }) => {
  const mats = useMemo(() => ({
    skin: M(look.skin ?? COL.skin, { roughness: 0.55 }), hoodie: M(look.hoodie ?? COL.hoodie, { roughness: 0.75 }),
    hair: M(look.hair ?? "#3a2416", { roughness: 0.5 }), pants: M(look.pants ?? "#2b3550", { roughness: 0.8 }),
    shoe: M("#f2f2f2", { roughness: 0.5 }), sweat: new THREE.MeshStandardMaterial({ color: "#9fe3ff", roughness: 0.1, transparent: true, opacity: 0.9 }),
  }), [look.skin, look.hoodie, look.hair, look.pants]);
  const { sit = 0, armR = 0, armL = 0, head = 0, tilt = 0, bob = 0, blink = 0, mood = "smile", sweat = 0 } = pose;
  const hip = THREE.MathUtils.lerp(0.62, 0.5, sit);
  const eyeY = 1 - 0.9 * blink;
  const browTilt = mood === "nervous" ? 0.35 : mood === "wow" ? -0.15 : 0;
  const browY = mood === "wow" ? 0.2 : 0.16;
  const mouthRot = mood === "nervous" ? 0 : Math.PI;
  return (
    <group {...g}>
      <group position={[0, bob, 0]}>
        {/* legs */}
        {[-0.13, 0.13].map((x) => (
          <group key={x} position={[x, hip, 0]} rotation={[-Math.PI / 2 * sit, 0, 0]}>
            <mesh geometry={geo.leg} material={mats.pants} position={[0, -0.3, 0]} />
            <group position={[0, -0.58, 0]} rotation={[Math.PI / 2 * sit, 0, 0]}>
              <mesh geometry={geo.shoe} material={mats.shoe} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02 - 0.0 * sit, 0.06]} />
            </group>
          </group>
        ))}
        {/* body */}
        <mesh geometry={geo.body} material={mats.hoodie} position={[0, hip + 0.42, 0]} />
        <mesh geometry={geo.hood} material={mats.hoodie} position={[0, hip + 0.76, -0.06]} rotation={[Math.PI / 2.3, 0, 0]} />
        {/* B logo on the chest */}
        <mesh position={[0, hip + 0.48, 0.295]}><circleGeometry args={[0.09, 24]} /><meshStandardMaterial color="#fff3df" roughness={0.6} /></mesh>
        {/* arms: shoulder pivots */}
        {([[-1, armL], [1, armR]] as const).map(([s, a]) => (
          <group key={s} position={[0.36 * s, hip + 0.72, 0]} rotation={[-a, 0, s * 0.18]}>
            <mesh geometry={geo.limb} material={mats.hoodie} position={[0, -0.27, 0]} />
            <mesh geometry={geo.hand} material={mats.skin} position={[0, -0.56, 0]} />
          </group>
        ))}
        {/* head */}
        <group position={[0, hip + 1.12, 0]} rotation={[0, head, tilt]}>
          <mesh geometry={geo.head} material={mats.skin} scale={[1, 1.04, 0.96]} />
          <mesh geometry={geo.ear} material={mats.skin} position={[-0.42, -0.02, 0]} />
          <mesh geometry={geo.ear} material={mats.skin} position={[0.42, -0.02, 0]} />
          <mesh geometry={geo.hair} material={mats.hair} position={[0, 0.02, -0.02]} rotation={[-0.25, 0, 0]} />
          {look.hairStyle !== 1 && <mesh geometry={geo.fringe} material={mats.hair} position={[0.06, 0.3, 0.3]} rotation={[0.2, 0, 1.25]} />}
          {look.hairStyle === 2 && <mesh geometry={geo.fringe} material={mats.hair} position={[-0.12, 0.33, 0.24]} rotation={[0.4, 0, -1.1]} />}
          {[-0.15, 0.15].map((x) => (
            <group key={x} position={[x, 0.05, 0.37]} scale={[1, eyeY * (mood === "wow" ? 1.25 : 1), 1]}>
              <mesh geometry={geo.eye} material={black} />
              <mesh geometry={geo.shine} material={white} position={[0.025, 0.03, 0.06]} />
            </group>
          ))}
          {[-0.15, 0.15].map((x) => (
            <mesh key={"b" + x} geometry={geo.brow} material={mats.hair} position={[x, browY, 0.38]} rotation={[0, 0, (x < 0 ? -1 : 1) * browTilt]} />
          ))}
          <mesh geometry={mouths[mood]} material={black} position={[0, -0.15, 0.4]} rotation={[0, 0, mouthRot]} />
          {(look.beard ?? 0) > 0 && (
            <mesh scale={[1, 1.04, 0.96]}>
              {/* front-lower band of the head: phi 0..PI faces +z, theta 0.55..0.92 PI is the jaw */}
              <sphereGeometry args={[0.428, 32, 12, 0, Math.PI, Math.PI * 0.55, Math.PI * 0.37]} />
              <meshStandardMaterial color={look.hair ?? "#3a2416"} roughness={0.9} transparent opacity={0.55 * (look.beard ?? 0)} depthWrite={false} />
            </mesh>
          )}
          {sweat > 0 && <mesh geometry={geo.drop} material={mats.sweat} position={[0.36, 0.2 - 0.15 * sweat, 0.25]} scale={[0.8, 1.3, 0.8]} />}
        </group>
      </group>
    </group>
  );
};

// ---- coins
const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.09, 64, 1);
let coinMats: THREE.Material[] | null = null;
export const coinMaterials = () => {
  if (!coinMats) {
    const face = dollarFace();
    const side = new THREE.MeshStandardMaterial({ color: "#f0a91c", metalness: 1, roughness: 0.28 });
    const top = new THREE.MeshStandardMaterial({ map: face, bumpMap: face, bumpScale: 2.5, metalness: 0.9, roughness: 0.3, emissive: new THREE.Color("#3a2200") });
    coinMats = [side, top, top];
  }
  return coinMats;
};
/** one Bitcoin coin, face toward +z by default */
export const Coin: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}><mesh geometry={coinGeo} material={coinMaterials()} rotation={[Math.PI / 2, 0, 0]} /></group>
);

/** many coins at once (instanced). xf(i) returns [pos, euler, scale] or null to hide */
export const Coins: React.FC<{ n: number; xf: (i: number) => [THREE.Vector3Tuple, THREE.Vector3Tuple, number] | null }> = ({ n, xf }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(coinGeo, coinMaterials(), n);
    m.frustumCulled = false;
    return m;
  }, [n]);
  const o = useMemo(() => new THREE.Object3D(), []);
  for (let i = 0; i < n; i++) {
    const r = xf(i);
    if (!r) { o.scale.setScalar(0); o.position.set(0, -999, 0); }
    else { o.position.set(...r[0]); o.rotation.set(r[1][0] + Math.PI / 2, r[1][1], r[1][2]); o.scale.setScalar(r[2]); }
    o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---- $20 bill (0.62 x 0.264 m, real proportions)
const billGeo = new THREE.PlaneGeometry(0.62, 0.264);
let billMat: THREE.Material | null = null;
export const Bill: React.FC<JSX.IntrinsicElements["group"] & { glow?: number }> = ({ glow = 0, ...p }) => {
  if (!billMat) billMat = new THREE.MeshStandardMaterial({ map: cash("100"), roughness: 0.8, side: THREE.DoubleSide });
  return (
    <group {...p}>
      <mesh geometry={billGeo} material={billMat} />
      {glow > 0 && <mesh geometry={billGeo} scale={1.08} position={[0, 0, -0.002]}><meshBasicMaterial color={COL.green} transparent opacity={0.6 * glow} toneMapped={false} /></mesh>}
    </group>
  );
};
