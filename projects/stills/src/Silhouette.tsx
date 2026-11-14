// Cinematic still: a footballer in pure black silhouette, arms raised, blinding floodlights directly behind him,
// a packed stadium, haze, lens flare and film grain. Empty dark pitch at the bottom for title text. 1080x1920.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ToneMapping, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { rng } from "./timeline";
import { glowDot } from "./textures";

const W = 1080, H = 1920;
const LIGHT: [number, number, number] = [0, 13.5, -38];          // the floodlight bank, straight behind the player
const BLACK = new THREE.MeshBasicMaterial({ color: "#000000", fog: false });

/** adult with realistic proportions (about 1.82 m, head ~1/8 of the height), arms raised in a V */
const Footballer: React.FC<JSX.IntrinsicElements["group"]> = (p) => {
  const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 16);
  const limb = (from: THREE.Vector3, to: THREE.Vector3, r: number, k: string) => {
    const d = new THREE.Vector3().subVectors(to, from), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return <mesh key={k} geometry={cap(r, Math.max(0.01, len - 2 * r))} material={BLACK} position={from.clone().add(to).multiplyScalar(0.5)} quaternion={q} />;
  };
  const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  const shL = V(-0.235, 1.47), shR = V(0.235, 1.47);
  const elL = V(-0.43, 1.74, -0.02), elR = V(0.43, 1.74, -0.02), haL = V(-0.6, 2.02, -0.04), haR = V(0.6, 2.02, -0.04);
  const hipL = V(-0.1, 0.95), hipR = V(0.1, 0.95), knL = V(-0.17, 0.5, 0.02), knR = V(0.15, 0.5, -0.02), ftL = V(-0.24, 0.07), ftR = V(0.22, 0.07);
  return (
    <group {...p}>
      <mesh material={BLACK} position={[0, 1.66, -0.02]} rotation={[-0.3, 0, 0]} scale={[0.85, 1.05, 0.95]}><sphereGeometry args={[0.115, 24, 18]} /></mesh>   {/* head */}
      <mesh material={BLACK} position={[0, 1.71, 0]} scale={[0.9, 0.55, 1]}><sphereGeometry args={[0.112, 24, 18]} /></mesh>        {/* short hair */}
      {limb(V(0, 1.47), V(0, 1.56), 0.05, "neck")}
      <mesh material={BLACK} position={[0, 1.25, 0]} scale={[1, 1, 0.55]}><cylinderGeometry args={[0.25, 0.175, 0.5, 24]} /></mesh>  {/* chest -> waist (shirt) */}
      <mesh material={BLACK} position={[0, 0.94, 0]} scale={[1, 1, 0.62]}><cylinderGeometry args={[0.175, 0.25, 0.3, 24]} /></mesh>     {/* shorts */}
      {[shL, shR].map((s, i) => <mesh key={i} material={BLACK} position={s}><sphereGeometry args={[0.085, 16, 12]} /></mesh>)}
      {limb(shL, elL, 0.062, "ual")}{limb(elL, haL, 0.05, "fal")}{limb(shR, elR, 0.062, "uar")}{limb(elR, haR, 0.05, "far")}
      {[haL, haR].map((h, i) => <mesh key={"h" + i} material={BLACK} position={h.clone().add(V(0, 0.05))} scale={[0.8, 1.25, 0.6]}><sphereGeometry args={[0.05, 12, 10]} /></mesh>)}
      {[elL, elR].map((e, i) => <mesh key={"e" + i} material={BLACK} position={e}><sphereGeometry args={[0.058, 14, 10]} /></mesh>)}
      {[knL, knR].map((k, i) => <mesh key={"k" + i} material={BLACK} position={k}><sphereGeometry args={[0.078, 14, 10]} /></mesh>)}
      {limb(hipL, knL, 0.09, "tl")}{limb(knL, ftL, 0.065, "sl")}{limb(hipR, knR, 0.09, "tr")}{limb(knR, ftR, 0.065, "sr")}
      {[ftL, ftR].map((f, i) => <mesh key={"f" + i} material={BLACK} position={f.clone().add(V(0, -0.02, 0.06))} scale={[0.7, 0.5, 1.6]}><sphereGeometry args={[0.07, 12, 10]} /></mesh>)}
    </group>
  );
};

/** the stands: rising tiers packed with tiny people; phone lights and camera flashes sparkle */
const Crowd: React.FC = () => {
  const mesh = useMemo(() => {
    const N = 110000, r = rng(7);
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.2), new THREE.MeshBasicMaterial({ toneMapped: false }), N);
    const o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      // a horseshoe of stands around the far end, rising away from the pitch
      const a = (r() - 0.5) * Math.PI * 1.25, row = r();
      const rad = 34 + row * 22, y = 1.5 + row * 19 + r() * 0.3;
      o.position.set(Math.sin(a) * rad * 1.15, y, -Math.cos(a) * rad + 4);
      o.lookAt(0, y, 6); o.scale.setScalar(0.8 + r() * 0.5); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      const flash = r() < 0.006, phone = r() < 0.02;
      if (flash) c.setRGB(6, 6, 6.5); else if (phone) c.setRGB(1.6, 1.7, 2.0);
      else { const v = 0.015 + r() * 0.06; c.setRGB(v * (0.8 + r() * 0.6), v * (0.8 + r() * 0.4), v * (0.9 + r() * 0.5)); }
      m.setColorAt(i, c);
    }
    m.frustumCulled = false;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

/** a bank of floodlight lamps on a gantry, plus soft glows and light shafts through the haze */
const Floodlights: React.FC = () => {
  const lamps = useMemo(() => { const out: [number, number][] = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) out.push([(c - 4) * 1.15, r * 0.95]); return out; }, []);
  return (
    <group position={LIGHT}>
      <mesh position={[0, 1.4, -0.3]}><planeGeometry args={[11.5, 4.6]} /><meshBasicMaterial color="#05070b" /></mesh>
      {lamps.map(([x, y], i) => <mesh key={i} position={[x, y, 0]}><planeGeometry args={[0.85, 0.65]} /><meshBasicMaterial color={new THREE.Color(9, 9.4, 10)} toneMapped={false} /></mesh>)}
      <sprite position={[0, 1.4, 0.5]} scale={[26, 26, 1]}><spriteMaterial map={glowDot()} color={new THREE.Color(1.6, 1.7, 1.9)} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
      <sprite position={[0, 1.4, 0.6]} scale={[120, 9, 1]}><spriteMaterial map={glowDot()} color={new THREE.Color(0.55, 0.75, 1.3)} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>
      {/* god rays: long faint cones from the lamps toward the pitch, visible in the haze */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[0, 1.4, 0.4]} rotation={[0, 0, (i - 4) * 0.16]}>
          <planeGeometry args={[0.5 + (i % 3) * 0.3, 70]} />
          <meshBasicMaterial color={new THREE.Color(0.6, 0.66, 0.8)} transparent opacity={0.022} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      ))}
    </group>
  );
};

/** lens flare: ghosts along the line from the light through the image centre */
const Flare: React.FC = () => {
  const { camera } = useThree();
  const ghosts = useMemo(() => [[0.35, 2.2, "#9fb8ff", 0.25], [0.6, 1.2, "#ffd59a", 0.18], [0.9, 3.4, "#7fe3ff", 0.12], [1.25, 1.6, "#c4a7ff", 0.14], [1.6, 4.5, "#9fb8ff", 0.08]] as const, []);
  const L = new THREE.Vector3(LIGHT[0], LIGHT[1] + 1.4, LIGHT[2]).project(camera);
  return (
    <group>
      {ghosts.map(([k, s, col, op], i) => {
        const p = new THREE.Vector3(L.x * (1 - 2 * k), L.y * (1 - 2 * k), 0.6).unproject(camera);
        return <sprite key={i} position={p} scale={[s * 0.18, s * 0.18, 1]}><spriteMaterial map={glowDot()} color={col} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></sprite>;
      })}
    </group>
  );
};

const Scene: React.FC = () => {
  const { camera, scene } = useThree();
  const c = camera as THREE.PerspectiveCamera;
  c.position.set(0, 0.4, 5.2); c.lookAt(0, 2.9, -10); c.fov = 44; c.near = 0.1; c.far = 400; c.updateProjectionMatrix();
  scene.fog = new THREE.FogExp2("#0a0e16", 0.0065);
  const grass = useMemo(() => {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 512; const g = cv.getContext("2d")!;
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#0b1a10" : "#0e2214"; g.fillRect(0, i * 32, 512, 32); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 8); return t;
  }, []);
  return (
    <>
      <color attach="background" args={["#05070c"]} />
      <ambientLight intensity={0.05} />
      <pointLight position={[LIGHT[0], LIGHT[1], LIGHT[2] + 6]} intensity={500} distance={90} color="#e8f0ff" />
      {/* the floodlight glare reflected on the wet grass, leading to the player */}
      <mesh position={[0, 0.02, -14]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[7, 40]} /><meshBasicMaterial map={glowDot()} color={new THREE.Color(0.55, 0.62, 0.8)} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}><planeGeometry args={[120, 120]} /><meshStandardMaterial map={grass} roughness={0.55} metalness={0.15} /></mesh>
      <Crowd />
      <Floodlights />
      {/* haze sheets catching the light behind the player */}
      {[-6, -14, -22].map((z, i) => <sprite key={i} position={[0, 3 + i, z]} scale={[40, 14, 1]}><spriteMaterial map={glowDot()} color={new THREE.Color(0.5, 0.56, 0.68)} transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>)}
      <Footballer position={[0, 0, 0]} rotation={[-0.06, 0, 0]} scale={1.0} />
      <EffectComposer multisampling={8}>
        <Bloom intensity={0.7} luminanceThreshold={1.2} luminanceSmoothing={0.2} mipmapBlur radius={0.55} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.25} darkness={0.75} />
        <Noise opacity={0.1} blendFunction={BlendFunction.SOFT_LIGHT} />
      </EffectComposer>
    </>
  );
};

/** optical lens flare drawn in screen space: ghosts on the line from the floodlight through the frame centre, plus a streak */
const LX = 540, LY = 570;                       // where the floodlight bank lands in the frame
const FlareOverlay: React.FC = () => {
  const ghosts: [number, number, string, number][] = [[0.12, 34, "255,210,150", 0.2], [1.45, 36, "190,160,255", 0.12], [1.75, 120, "110,200,255", 0.06], [2.05, 60, "130,170,255", 0.08]];
  return (
    <AbsoluteFill style={{ mixBlendMode: "screen", pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: LY - 6, height: 12, background: `linear-gradient(90deg, rgba(120,170,255,0) 0%, rgba(150,190,255,0.55) 35%, rgba(235,245,255,0.95) 50%, rgba(150,190,255,0.55) 65%, rgba(120,170,255,0) 100%)`, filter: "blur(3px)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: LY - 40, height: 80, background: `linear-gradient(90deg, rgba(90,140,255,0) 0%, rgba(110,160,255,0.18) 50%, rgba(90,140,255,0) 100%)`, filter: "blur(12px)" }} />
      {ghosts.map(([k, r, rgb, op], i) => {
        const x = LX + (W / 2 - LX) * k * 2, y = LY + (H / 2 - LY) * k * 2;
        return <div key={i} style={{ position: "absolute", left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: "50%",
          background: `radial-gradient(circle, rgba(${rgb},${op}) 0%, rgba(${rgb},${op * 0.6}) 55%, rgba(${rgb},0) 72%)` }} />;
      })}
    </AbsoluteFill>
  );
};

export const Silhouette: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <ThreeCanvas width={W} height={H} gl={{ antialias: false }} camera={{ fov: 46 }}><Scene /></ThreeCanvas>
    <FlareOverlay />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,6,0.92) 0%, rgba(2,3,6,0.55) 9%, rgba(2,3,6,0) 22%)" }} />
    <svg width={W} height={260} style={{ position: "absolute", top: 0, left: 0 }} viewBox={`0 0 ${W} 260`}>
      <path d={`M0 0 L${W} 0 L${W} 150 Q${W / 2} 230 0 150 Z`} fill="#010204" />
      {Array.from({ length: 13 }, (_, i) => <line key={i} x1={i * 90} y1={0} x2={i * 90 + 30} y2={150 + 70 * Math.sin((i / 12) * Math.PI) * 0.9} stroke="#0a0d14" strokeWidth={6} />)}
      <path d={`M0 150 Q${W / 2} 230 ${W} 150`} fill="none" stroke="rgba(170,190,230,0.35)" strokeWidth={3} />
    </svg>
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 70%, rgba(1,2,4,0.75) 86%, rgba(0,0,0,0.92) 100%)" }} />
  </AbsoluteFill>
);
