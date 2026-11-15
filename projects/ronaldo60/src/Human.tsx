// A realistically proportioned human, built procedurally from joint angles (no rig files). The face has no features:
// every shot keeps it turned away, in profile shadow or backlit, so the identity stays hidden until the name card.
// The same boy at every age: olive skin, short dark curly hair, slim build. age sets height and head proportion.
import React, { useMemo } from "react";
import * as THREE from "three";

export type HumanLook = { skin?: string; hair?: string; shirt?: string; shorts?: string; socks?: string; boots?: string; pants?: boolean; sleeves?: "short" | "long"; silhouette?: boolean };
export type HumanPose = {
  hipL?: number; hipR?: number; kneeL?: number; kneeR?: number;          // leg swing forward (+) and knee bend (radians)
  shL?: number; shR?: number; elL?: number; elR?: number;                 // shoulder swing forward (+), elbow bend
  abL?: number; abR?: number;                                             // arm raised out to the side (radians)
  lean?: number; headPitch?: number; headYaw?: number;                    // torso lean forward, head down (+) / turn
  sit?: boolean;
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** proportions by age: total height (m), head radius, leg share of height */
export const bodyFor = (age: number) => {
  const H = age >= 18 ? 1.86 : age >= 15 ? 1.74 : age >= 12 ? 1.5 : age >= 10 ? 1.4 : 1.28;
  const headR = H / (age >= 18 ? 7.6 : age >= 15 ? 7.2 : age >= 12 ? 6.6 : 6.2) / 2;
  const leg = H * (age >= 15 ? 0.48 : 0.45);
  return { H, headR, leg, build: age >= 18 ? 1.15 : age >= 15 ? 1.0 : 0.82 };
};

/** a running cycle (phase in cycles); k = 0..1 intensity (walk 0.4, sprint 1) */
export const runPose = (phase: number, k = 1): HumanPose => {
  const a = phase * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
  return { hipL: 0.75 * k * s, hipR: -0.75 * k * s, kneeL: 0.25 + k * 1.1 * Math.max(0, -c), kneeR: 0.25 + k * 1.1 * Math.max(0, c),
    shL: -0.8 * k * s, shR: 0.8 * k * s, elL: 1.2 * k + 0.2, elR: 1.2 * k + 0.2, lean: 0.12 + 0.12 * k };
};

export const Human: React.FC<{ age: number; look?: HumanLook; pose?: HumanPose; bob?: number } & JSX.IntrinsicElements["group"]> = ({ age, look = {}, pose = {}, bob = 0, ...g }) => {
  const b = bodyFor(age);
  const mats = useMemo(() => {
    const m = (c: string, rough = 0.7) => look.silhouette ? new THREE.MeshBasicMaterial({ color: "#000", fog: false }) : new THREE.MeshStandardMaterial({ color: c, roughness: rough });
    return { skin: m(look.skin ?? "#b98563", 0.55), hair: m(look.hair ?? "#0f0b08", 0.9), shirt: m(look.shirt ?? "#e8e4dc"), shorts: m(look.shorts ?? "#20242c"),
      socks: m(look.socks ?? "#e8e4dc"), boots: m(look.boots ?? "#141414", 0.4) };
  }, [look.skin, look.hair, look.shirt, look.shorts, look.socks, look.boots, look.silhouette]);
  const { H, headR, leg, build } = b;
  const thigh = leg * 0.52, shin = leg * 0.48, upper = H * 0.17, fore = H * 0.155, torso = H * 0.3;
  const p = { hipL: 0, hipR: 0, kneeL: 0.05, kneeR: 0.05, shL: 0, shR: 0, elL: 0.15, elR: 0.15, abL: 0.12, abR: 0.12, lean: 0, headPitch: 0, headYaw: 0, ...pose };
  if (p.sit) { p.hipL = p.hipR = Math.PI / 2; p.kneeL = p.kneeR = Math.PI / 2; }
  const hipY = p.sit ? 0 : leg + bob;
  const hw = H * 0.055 * build, sw = H * 0.115 * build;
  // legs: thigh swings around the hip (pitch), shin bends back at the knee
  const legPts = (side: number, a: number, kb: number) => {
    const hip = V(side * hw, hipY, 0);
    const knee = hip.clone().add(V(0, -Math.cos(a) * thigh, Math.sin(a) * thigh));
    const ankle = knee.clone().add(V(0, -Math.cos(a - kb) * shin, Math.sin(a - kb) * shin));
    return { hip, knee, ankle };
  };
  const L = legPts(-1, p.hipL, p.kneeL), R = legPts(1, p.hipR, p.kneeR);
  // torso leans forward around the hips
  const up = V(0, Math.cos(p.lean), Math.sin(p.lean));
  const neck = V(0, hipY, 0).add(up.clone().multiplyScalar(torso));
  const shoulderY = neck.clone().add(up.clone().multiplyScalar(-H * 0.02));
  const armPts = (side: number, sw_: number, ab: number, eb: number) => {
    const sh = shoulderY.clone().add(V(side * sw, 0, 0));
    const dir = V(side * Math.sin(ab), -Math.cos(ab) * Math.cos(sw_), Math.sin(sw_) * Math.cos(ab)).normalize();
    const el = sh.clone().add(dir.clone().multiplyScalar(upper));
    const fdir = dir.clone().applyAxisAngle(V(1, 0, 0), -eb).normalize();
    const hand = el.clone().add(fdir.multiplyScalar(fore));
    return { sh, el, hand };
  };
  const A = armPts(-1, p.shL, p.abL, p.elL), B = armPts(1, p.shR, p.abR, p.elR);
  const limb = (from: THREE.Vector3, to: THREE.Vector3, r: number, mat: THREE.Material, k: string) => {
    const d = to.clone().sub(from), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.clone().normalize());
    return <mesh key={k} material={mat} position={from.clone().add(to).multiplyScalar(0.5)} quaternion={q}><capsuleGeometry args={[r, Math.max(0.001, len - 2 * r), 4, 12]} /></mesh>;
  };
  const mid = (a: THREE.Vector3, c: THREE.Vector3, u: number) => a.clone().lerp(c, u);
  const shirtLong = look.sleeves === "long", pants = !!look.pants;
  const head = neck.clone().add(up.clone().multiplyScalar(headR * 1.25 + H * 0.02));
  const curls = useMemo(() => Array.from({ length: 70 }, (_, i) => { const a = i * 2.39996, y = 1 - (i / 69) * 1.6; const r = Math.sqrt(1 - y * y); return [Math.cos(a) * r, y, Math.sin(a) * r] as const; }), []);
  return (
    <group {...g}>
      {/* legs: shorts over the thigh top, skin, sock, boot */}
      {[L, R].map((l, i) => (
        <group key={i}>
          {limb(l.hip, pants ? l.knee : mid(l.hip, l.knee, 0.55), 0.068 * H / 1.8 * build * 1.15, pants ? mats.shorts : mats.shorts, "s" + i)}
          {!pants && limb(mid(l.hip, l.knee, 0.45), l.knee, 0.058 * H / 1.8 * build, mats.skin, "t" + i)}
          {limb(l.knee, l.ankle, 0.05 * H / 1.8 * build, pants ? mats.shorts : mats.socks, "k" + i)}
          <mesh material={mats.boots} position={l.ankle.clone().add(V(0, -0.025, 0.07 * H / 1.8))} scale={[0.8, 0.55, 1.9]}><sphereGeometry args={[0.07 * H / 1.8, 12, 10]} /></mesh>
          <mesh material={pants ? mats.shorts : mats.skin} position={l.knee}><sphereGeometry args={[0.058 * H / 1.8 * build, 12, 10]} /></mesh>
        </group>
      ))}
      <mesh material={mats.shorts} position={V(0, hipY + 0.02, 0).add(up.clone().multiplyScalar(0.02))} scale={[1, 1, 0.65]}><cylinderGeometry args={[hw + 0.06 * build, hw + 0.075 * build, H * 0.09, 20]} /></mesh>
      {/* torso */}
      <mesh material={mats.shirt} position={V(0, hipY, 0).add(up.clone().multiplyScalar(torso * 0.55))} quaternion={new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), up)} scale={[1, 1, 0.58]}>
        <cylinderGeometry args={[sw * 0.95, hw + 0.05 * build, torso * 0.95, 22]} />
      </mesh>
      {[A.sh, B.sh].map((s, i) => <mesh key={"sh" + i} material={mats.shirt} position={s}><sphereGeometry args={[0.062 * H / 1.8 * build, 14, 10]} /></mesh>)}
      {/* arms: sleeve, skin, hand */}
      {[A, B].map((a, i) => (
        <group key={"a" + i}>
          {limb(a.sh, shirtLong ? a.el : mid(a.sh, a.el, 0.6), 0.046 * H / 1.8 * build, mats.shirt, "u" + i)}
          {!shirtLong && limb(mid(a.sh, a.el, 0.5), a.el, 0.04 * H / 1.8 * build, mats.skin, "v" + i)}
          <mesh material={shirtLong ? mats.shirt : mats.skin} position={a.el}><sphereGeometry args={[0.04 * H / 1.8 * build, 12, 10]} /></mesh>
          {limb(a.el, a.hand, 0.036 * H / 1.8 * build, shirtLong ? mats.shirt : mats.skin, "f" + i)}
          <mesh material={mats.skin} position={a.hand} scale={[0.75, 1.15, 0.5]}><sphereGeometry args={[0.042 * H / 1.8, 12, 10]} /></mesh>
        </group>
      ))}
      {/* neck + head (no face) + short dark curly hair */}
      {limb(neck, head.clone().add(up.clone().multiplyScalar(-headR * 0.8)), 0.035 * H / 1.8 * build, mats.skin, "neck")}
      <group position={head} rotation={[p.lean + p.headPitch, p.headYaw, 0]}>
        <mesh material={mats.skin} scale={[0.86, 1.06, 0.95]}><sphereGeometry args={[headR, 28, 20]} /></mesh>
        {[-1, 1].map((sd) => <mesh key={sd} material={mats.skin} position={[sd * headR * 0.86, -headR * 0.05, 0]} scale={[0.4, 0.8, 0.55]}><sphereGeometry args={[headR * 0.28, 10, 8]} /></mesh>)}
        {curls.map(([x, y, z], i) => (y > 0.4 || (z < -0.05 && y > -0.55) || (Math.abs(x) > 0.7 && y > 0.0 && z < 0.25)) && (
          <mesh key={i} material={mats.hair} position={[x * headR * 0.86, y * headR * 1.04 + headR * 0.08, z * headR * 0.95 - headR * 0.04]}><sphereGeometry args={[headR * 0.25, 8, 6]} /></mesh>
        ))}
      </group>
    </group>
  );
};

/** an old leather football: panels via a painted texture */
let ballTex: THREE.CanvasTexture | null = null;
export const Ball: React.FC<{ worn?: boolean } & JSX.IntrinsicElements["group"]> = ({ worn = true, ...p }) => {
  if (!ballTex) {
    const c = document.createElement("canvas"); c.width = 512; c.height = 256; const g = c.getContext("2d")!;
    g.fillStyle = worn ? "#b8916a" : "#f1ede4"; g.fillRect(0, 0, 512, 256);
    g.strokeStyle = worn ? "#4a3220" : "#333"; g.lineWidth = 5;
    for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64 + 20, 256); g.stroke(); }
    for (let j = 1; j < 4; j++) { g.beginPath(); g.moveTo(0, j * 64); g.lineTo(512, j * 64 + 6); g.stroke(); }
    for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(60,35,20,${0.05 + (k % 5) * 0.03})`; g.fillRect((k * 97) % 512, (k * 53) % 256, 6 + (k % 7) * 3, 3); }
    ballTex = new THREE.CanvasTexture(c); ballTex.colorSpace = THREE.SRGBColorSpace;
  }
  return <group {...p}><mesh><sphereGeometry args={[0.11, 32, 24]} /><meshStandardMaterial map={ballTex} roughness={0.75} /></mesh></group>;
};
