// "What if everyone withdrew their money from the bank?": the six scenes. Each places its own camera from global time t.
import React, { useMemo } from "react";
import * as THREE from "three";
import { Bill, Coin, Coins, Person, Pose } from "./Actors";
import { Arc, BANK, BANK_DOOR, BankBuilding, Box, Glow, HOUSE, Label, M, Sign, Sky, Stack, Stream, Street, Tree, V3, arcPoint, mix3, useCamKeys, walkPose } from "./Kit";
import { COL, E, LOOKS, S, SCN, blink, clamp, easeIn, easeOut, lerp, pulse, ramp, rng, smooth, backOut } from "./timeline";
import { bond, marble, tower } from "./textures";

// sub-scene cut points (between sentences)
export const MAP_AT = (E(3) + S(4)) / 2;          // lobby/vault -> money map
export const VAULT2_AT = (E(5) + S(6)) / 2;       // crowded lobby -> draining vault
export const SALE_AT = (E(7) + S(8)) / 2;         // line outside -> quick sale
export const DOMINO_AT = (E(8) + S(9)) / 2;       // quick sale -> dominoes

// =========================================================================== shared pieces
/** instanced crowd: n simple people with per-person colours; place(i) returns [x, z, yaw, bob] or null to hide */
const CROWD_COLS = ["#14b8a6", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#22c55e", "#ec4899", "#f97316", "#64748b"];
const SKINS = ["#f2c09b", "#c98f68", "#8d5a3b", "#e8b08a"];
const Crowd: React.FC<{ n: number; place: (i: number) => [number, number, number, number] | null; scale?: number }> = ({ n, place, scale = 1 }) => {
  const m = useMemo(() => {
    const body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.2, 0.42, 4, 10), new THREE.MeshStandardMaterial({ roughness: 0.7 }), n);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.19, 14, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n);
    const hair = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ roughness: 0.5 }), n);
    for (let i = 0; i < n; i++) {
      body.setColorAt(i, new THREE.Color(CROWD_COLS[(i * 5) % CROWD_COLS.length]));
      head.setColorAt(i, new THREE.Color(SKINS[(i * 7) % 4]));
      hair.setColorAt(i, new THREE.Color(["#2b1a10", "#111", "#6b3a1a", "#d4a24c"][(i * 3) % 4]));
    }
    for (const x of [body, head, hair]) x.frustumCulled = false;
    return { body, head, hair };
  }, [n]);
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const p = place(i);
    const set = (mesh: THREE.InstancedMesh, y: number) => {
      if (!p) { o.position.set(0, -50, 0); o.scale.setScalar(0); }
      else { o.position.set(p[0], (y + p[3]) * scale, p[1]); o.rotation.set(0, p[2], 0); o.scale.setScalar(scale); }
      o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    };
    set(m.body, 0.5); set(m.head, 1.12); set(m.hair, 1.15);
  }
  m.body.instanceMatrix.needsUpdate = m.head.instanceMatrix.needsUpdate = m.hair.instanceMatrix.needsUpdate = true;
  return <><primitive object={m.body} /><primitive object={m.head} /><primitive object={m.hair} /></>;
};

/** the city around the bank: bank in the middle of a plaza, towers behind, a road in front */
const CITY_BANK: V3 = [0, 0, -3];
const City: React.FC<{ morning?: number }> = ({ morning = 1 }) => {
  const tw = useMemo(() => tower(), []);
  return (
    <group>
      <Sky top="#56b4ff" bottom={morning ? "#ffe9c7" : "#dff1ff"} />
      <hemisphereLight args={["#e9f6ff", "#6a8f5a", 0.75]} />
      <directionalLight position={[8, 7, 10]} intensity={2.6} color="#fff0d2" />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[200, 200]} />{M(COL.grass, { roughness: 0.95 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 2]}><planeGeometry args={[60, 14]} />{M("#d6d3cc", { roughness: 0.85 })}</mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 7.2]}><planeGeometry args={[80, 3.4]} />{M(COL.road, { roughness: 0.9 })}</mesh>
      {Array.from({ length: 20 }, (_, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-38 + i * 4, 0.02, 7.2]}><planeGeometry args={[1.6, 0.12]} />{M("#ffffff")}</mesh>)}
      <BankBuilding position={CITY_BANK} scale={1.7} />
      {[[-8, -9, 9], [8, -10, 12], [-14, -16, 15], [14, -17, 10], [-4, -22, 18], [5, -24, 14], [-20, -6, 8], [20, -7, 9]].map(([x, z, h], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, h / 2, 0]}><boxGeometry args={[4, h, 4]} /><meshStandardMaterial map={tw} roughness={0.35} metalness={0.3} color={["#ffffff", "#cfe0ff", "#ffe7d1"][i % 3]} /></mesh>
          <Box s={[4.3, 0.3, 4.3]} c="#e2e8f0" position={[0, h + 0.15, 0]} />
        </group>
      ))}
      {[[-5, 0.6], [5.5, 0.4], [-9, 2.5], [9.5, 2.8]].map(([x, z], i) => <Tree key={i} position={[x, 0, z]} k={i} />)}
    </group>
  );
};
/** queue path from the bank door: out to the sidewalk, then along it (slot k -> [x, z, yaw]) */
const queueSlot = (k: number): [number, number, number] => {
  const d = k * 0.62;
  const door: [number, number] = [0.0, -0.4];
  if (d < 2.6) return [door[0], door[1] + d, Math.PI];
  const along = d - 2.6;
  const row = Math.floor(along / 16), x0 = along % 16;
  const dir = row % 2 ? -1 : 1;                               // snakes back and forth along the sidewalk
  return [dir > 0 ? x0 * 0.9 + 0.6 : 15 * 0.9 + 0.6 - x0 * 0.9, 2.4 + row * 1.0, dir > 0 ? -Math.PI / 2 : Math.PI / 2];
};
const Queue: React.FC<{ t: number; count: number; leave?: number }> = ({ t, count, leave = 0 }) => (
  <Crowd n={260} place={(i) => {
    if (i >= count + 1) return null;
    const arrive = clamp(count - i + 1);                       // the newest person walks in
    const [x, z, yaw] = queueSlot(i);
    const [x2, z2] = queueSlot(i + 3);
    if (i < leave) return null;
    return [lerp(x2 + 2, x, easeOut(arrive)), lerp(z2, z, easeOut(arrive)), yaw, 0.03 * Math.abs(Math.sin(t * (arrive < 1 ? 8 : 1.5) + i))];
  }} />
);

/** bank lobby (marble, counter, tellers) with the vault room behind it */
const VAULT_DOOR: V3 = [2.4, 1.7, -6.6];
const Lobby: React.FC<{ t: number; worried?: number; cash?: number; alarm?: number; vaultOpen?: number }> = ({ t, worried = 0, cash = 1, alarm = 0, vaultOpen = 1 }) => {
  const floor = useMemo(() => marble(), []);
  const flash = alarm * (0.5 + 0.5 * Math.sin(t * 10));
  return (
    <group>
      <color attach="background" args={["#e8e0d0"]} />
      <hemisphereLight args={["#fff8ec", "#a89a85", 0.8]} />
      <directionalLight position={[3, 6, 4]} intensity={1.4} color="#fff2dc" />
      <pointLight position={[0, 3.5, 0]} intensity={14 * flash} distance={14} color={COL.red} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 16]} /><meshStandardMaterial map={floor} roughness={0.25} metalness={0.1} /></mesh>
      {/* back wall with the round vault doorway on the right */}
      <Box s={[6.4, 6, 0.3]} c="#f3ead9" position={[-1.6, 3, -6.6]} />
      <Box s={[4.4, 2.6, 0.3]} c="#f3ead9" position={[5.0, 1.3, -6.6]} />
      <Box s={[3.0, 2.2, 0.3]} c="#f3ead9" position={[2.4, 4.9, -6.6]} />
      <Box s={[3.0, 6, 0.3]} c="#f3ead9" position={[6.6, 3, -6.6]} />
      <Box s={[0.2, 6, 16]} c="#efe4cf" position={[-4.8, 3, 0]} />
      <Box s={[0.2, 6, 16]} c="#efe4cf" position={[7.6, 3, -2]} />
      {[-3.8].map((x) => [-4.5, -1, 2.5].map((z) => <mesh key={`${x}${z}`} position={[x, 3, z]}><cylinderGeometry args={[0.28, 0.32, 6, 18]} />{M("#fbf6ec", { roughness: 0.35 })}</mesh>))}
      <Sign text="BANK" w={2.4} h={0.62} position={[-1.6, 4.4, -6.43]} />
      {/* counter, glass, tellers */}
      <Box s={[6.4, 1.1, 0.7]} c="#7c4a2a" o={{ roughness: 0.4 }} position={[-1.2, 0.55, -3.0]} />
      <Box s={[6.5, 0.08, 0.8]} c="#e9e2d2" o={{ roughness: 0.2 }} position={[-1.2, 1.12, -3.0]} />
      <mesh position={[-1.2, 1.75, -3.25]}><boxGeometry args={[6.4, 1.2, 0.03]} /><meshPhysicalMaterial color="#cfefff" transparent opacity={0.18} roughness={0.05} /></mesh>
      {[-2.8, -0.4].map((x, k) => (
        <Person key={x} position={[x, 0, -3.8]} look={k ? { ...LOOKS.teller, hoodie: "#0f766e" } : LOOKS.teller}
          pose={{ mood: worried > 0.5 ? "nervous" : "smile", sweat: worried > 0.6 ? 0.5 + 0.5 * Math.sin(t * 3 + k) : 0, armR: worried > 0.5 ? 0.6 + 0.5 * Math.abs(Math.sin(t * 4 + k)) : 0.2, blink: blink(t, 3 + k), head: worried * 0.4 * Math.sin(t * 2.2 + k) }} />
      ))}
      <VaultRoom t={t} cash={cash} open={vaultOpen} alarm={flash} />
    </group>
  );
};
/** the vault (look taken from the reference: round steel door, riveted wall, crates of cash bundles, gold bars, a lantern) */
const VaultRoom: React.FC<{ t: number; cash: number; open: number; alarm: number }> = ({ t, cash, open, alarm }) => {
  const rivets = useMemo(() => Array.from({ length: 28 }, (_, i) => { const a = i / 28 * Math.PI * 2; return [Math.cos(a) * 1.5, Math.sin(a) * 1.5] as [number, number]; }), []);
  const crates: V3[] = [[0.8, 0, -8.0], [2.8, 0, -8.4], [4.4, 0, -7.8], [1.6, 0, -9.6], [3.6, 0, -9.8]];
  const stacksPer = 9;
  return (
    <group>
      <Box s={[7, 0.05, 6]} c="#5b5348" position={[2.6, 0.01, -9.4]} />
      <Box s={[7, 4.2, 0.2]} c="#8a8f96" o={{ metalness: 0.7, roughness: 0.4 }} position={[2.6, 2.1, -12.3]} />
      <Box s={[0.2, 4.2, 6]} c="#7c8188" o={{ metalness: 0.7, roughness: 0.4 }} position={[-0.6, 2.1, -9.4]} />
      <Box s={[0.2, 4.2, 6]} c="#7c8188" o={{ metalness: 0.7, roughness: 0.4 }} position={[5.8, 2.1, -9.4]} />
      {/* round doorway + rivets + the thick swung-open door */}
      <group position={VAULT_DOOR}>
        <mesh rotation={[0, 0, 0]}><torusGeometry args={[1.32, 0.18, 16, 48]} />{M("#9aa0a8", { metalness: 0.9, roughness: 0.3 })}</mesh>
        {rivets.map(([x, y], i) => <mesh key={i} position={[x, y, 0.12]}><sphereGeometry args={[0.04, 8, 6]} />{M("#c9ced6", { metalness: 1, roughness: 0.25 })}</mesh>)}
        <group position={[-1.32, 0, 0.1]} rotation={[0, -1.75 * open, 0]}>
          <group position={[1.32, 0, 0.25]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.25, 1.25, 0.5, 48]} />{M("#8b9098", { metalness: 0.95, roughness: 0.28 })}</mesh>
            {[0, 1, 2].map((k) => <mesh key={k} position={[0, 0, 0.27]} rotation={[0, 0, k * Math.PI / 3]}><boxGeometry args={[1.5, 0.09, 0.07]} />{M("#d1d5db", { metalness: 1, roughness: 0.2 })}</mesh>)}
            <mesh position={[0, 0, 0.3]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, 0.1, 24]} />{M("#b8bec6", { metalness: 1, roughness: 0.2 })}</mesh>
            {Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 1.25, Math.sin(a) * 1.25, -0.05]} rotation={[0, 0, a]}><boxGeometry args={[0.35, 0.12, 0.12]} />{M("#c9ced6", { metalness: 1, roughness: 0.25 })}</mesh>; })}
          </group>
        </group>
      </group>
      {/* crates of cash: the stacks disappear as cash runs low */}
      {crates.map((c, ci) => (
        <group key={ci} position={c}>
          <Box s={[1.3, 0.55, 0.9]} c="#7a5230" o={{ roughness: 0.85 }} position={[0, 0.27, 0]} />
          {Array.from({ length: stacksPer }, (_, k) => {
            const idx = ci * stacksPer + k, total = crates.length * stacksPer;
            if (idx / total >= cash) return null;
            return <Stack key={k} n={1 + (k % 2)} position={[-0.42 + (k % 3) * 0.42, 0.58, -0.25 + Math.floor(k / 3) * 0.25]} scale={0.62} />;
          })}
        </group>
      ))}
      {/* gold bars on a shelf + lantern */}
      <Box s={[1.6, 0.06, 0.5]} c="#4b3a2a" position={[5.2, 1.3, -11.0]} />
      {Array.from({ length: 9 }, (_, k) => <mesh key={k} position={[4.7 + (k % 3) * 0.33, 1.4 + Math.floor(k / 3) * 0.1, -11.0]}><boxGeometry args={[0.3, 0.09, 0.15]} />{M(COL.gold, { metalness: 1, roughness: 0.22 })}</mesh>)}
      <group position={[0.2, 0.62, -10.6]}>
        <mesh><cylinderGeometry args={[0.12, 0.14, 0.32, 12]} /><meshStandardMaterial color="#ffd27a" emissive="#ffb347" emissiveIntensity={2.2} transparent opacity={0.85} toneMapped={false} /></mesh>
        <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.06, 0.15, 0.1, 12]} />{M("#5b4a2a", { metalness: 0.6 })}</mesh>
        <pointLight intensity={4} distance={6} color="#ffb347" />
        <Glow color="#ffb347" size={1.2} opacity={0.5} />
      </group>
      <pointLight position={[2.6, 3.5, -9.4]} intensity={6 + 20 * alarm} distance={9} color={alarm > 0.1 ? COL.red : "#ffe2b0"} />
    </group>
  );
};
const Car: React.FC<JSX.IntrinsicElements["group"] & { color?: string }> = ({ color = "#ef4444", ...p }) => (
  <group {...p}>
    <Box s={[1.8, 0.45, 0.9]} c={color} o={{ metalness: 0.4, roughness: 0.3 }} position={[0, 0.42, 0]} />
    <Box s={[1.0, 0.4, 0.82]} c={color} o={{ metalness: 0.4, roughness: 0.3 }} position={[-0.1, 0.82, 0]} />
    <Box s={[0.9, 0.3, 0.84]} c="#bae6fd" o={{ roughness: 0.1 }} position={[-0.1, 0.84, 0]} />
    {[[-0.6, 0.45], [0.6, 0.45], [-0.6, -0.45], [0.6, -0.45]].map(([x, z], i) => <mesh key={i} position={[x, 0.2, z]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.2, 0.2, 0.15, 18]} />{M("#111827")}</mesh>)}
  </group>
);
const Piggy: React.FC<JSX.IntrinsicElements["group"]> = (p) => (
  <group {...p}>
    <mesh scale={[1.2, 1, 1]}><sphereGeometry args={[0.6, 32, 24]} />{M("#f9a8d4", { roughness: 0.4 })}</mesh>
    <mesh position={[0.72, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.22, 0.2, 20]} />{M("#f472b6", { roughness: 0.4 })}</mesh>
    {[-0.08, 0.08].map((z) => <mesh key={z} position={[0.83, 0, z]}><sphereGeometry args={[0.04, 8, 6]} />{M("#9d174d")}</mesh>)}
    {[-0.22, 0.22].map((z) => <mesh key={z} position={[0.35, 0.5, z]} rotation={[0, 0, -0.4]}><coneGeometry args={[0.14, 0.25, 12]} />{M("#f472b6")}</mesh>)}
    {[[-0.4, -0.3], [0.4, -0.3], [-0.4, 0.3], [0.4, 0.3]].map(([x, z], i) => <mesh key={i} position={[x, -0.55, z]}><cylinderGeometry args={[0.1, 0.1, 0.25, 12]} />{M("#f472b6")}</mesh>)}
    {[-0.22, 0.22].map((z) => <mesh key={z} position={[0.5, 0.15, z]}><sphereGeometry args={[0.05, 10, 8]} />{M("#111")}</mesh>)}
    <Box s={[0.3, 0.02, 0.05]} c="#831843" position={[0, 0.6, 0]} />
  </group>
);
/** generic shield (not the FDIC's official logo): extruded shield with a check mark */
const Shield: React.FC<JSX.IntrinsicElements["group"] & { glow?: number }> = ({ glow = 1, ...p }) => {
  const geo = useMemo(() => {
    const s = new THREE.Shape(); s.moveTo(0, 1.2); s.quadraticCurveTo(0.6, 1.2, 1.0, 0.95); s.lineTo(1.0, 0.1); s.quadraticCurveTo(0.9, -0.9, 0, -1.3);
    s.quadraticCurveTo(-0.9, -0.9, -1.0, 0.1); s.lineTo(-1.0, 0.95); s.quadraticCurveTo(-0.6, 1.2, 0, 1.2);
    return new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4 });
  }, []);
  return (
    <group {...p}>
      <mesh geometry={geo} position={[0, 0, -0.09]}><meshStandardMaterial color="#1d4ed8" metalness={0.5} roughness={0.25} emissive="#1e3a8a" emissiveIntensity={0.4 * glow} /></mesh>
      <Label text="FDIC" h={0.55} color="#ffffff" position={[0, 0.35, 0.18]} />
      <mesh position={[-0.22, -0.35, 0.17]} rotation={[0, 0, -0.75]}><boxGeometry args={[0.12, 0.4, 0.05]} /><meshBasicMaterial color={new THREE.Color(COL.green).multiplyScalar(1.5)} toneMapped={false} /></mesh>
      <mesh position={[0.1, -0.25, 0.17]} rotation={[0, 0, 0.62]}><boxGeometry args={[0.12, 0.75, 0.05]} /><meshBasicMaterial color={new THREE.Color(COL.green).multiplyScalar(1.5)} toneMapped={false} /></mesh>
      <Glow color="#60a5fa" size={4 * glow} opacity={0.4 * glow} position={[0, 0, -0.3]} />
    </group>
  );
};

// =========================================================================== 1. the big question: the line outside (0 - 8.9 s)
export const LineScene: React.FC<{ t: number }> = ({ t }) => {
  const count = Math.floor(lerp(4, 230, Math.pow(ramp(t, 1.2, 8.6), 1.3)) * 1) + ramp(t, 1.2, 8.6) * 0;
  const frac = lerp(4, 230, Math.pow(ramp(t, 1.2, 8.6), 1.3));
  useCamKeys(t, [[0, [9, 11, 30], [0, 3.5, -2], 44], [4.5, [6, 6.5, 19], [1.5, 2.2, 0], 44], [8.9, [0.6, 2.0, 5.2], [0, 2.0, -1.5], 46]]);
  return (
    <group>
      <City />
      <Queue t={t} count={frac} />
      <Person position={[1.4, 0, 3.6 - 0 * count]} rotation={[0, -0.6, 0]} look={LOOKS.teen} scale={0.95} pose={{ ...walkPose(t), mood: t > 5 ? "wow" : "smile", blink: blink(t, 1) }} />
    </group>
  );
};

// =========================================================================== 2. where your money goes (8.9 - 19.9 s)
export const MoneyScene: React.FC<{ t: number }> = ({ t }) => (t < MAP_AT ? <Deposit key="dep" t={t} /> : <MoneyMap key="map" t={t} />);
const Deposit: React.FC<{ t: number }> = ({ t }) => {
  const walk = smooth(ramp(t, 8.9, 10.8));
  const teenZ = lerp(2.4, -1.75, walk);
  const give = smooth(ramp(t, 10.9, 11.6));
  const fly = ramp(t, 11.7, 14.3);
  useCamKeys(t, [[8.9, [1.4, 2.0, 6.2], [-0.4, 1.3, -2.0], 44], [11.2, [1.2, 1.8, 1.4], [-0.6, 1.25, -2.8], 42], [12.6, [2.4, 2.0, -3.6], [2.4, 1.5, -7.0], 46], [MAP_AT, [2.5, 2.1, -5.4], [2.6, 1.0, -9.2], 50]]);
  return (
    <group>
      <Lobby t={t} cash={0.9} />
      <Person position={[-0.4, 0, teenZ]} rotation={[0, Math.PI, 0]} look={LOOKS.teen} scale={0.92} pose={{ ...(walk < 1 ? walkPose(t) : {}), armR: 0.9 + 0.4 * give, mood: "smile", blink: blink(t, 1) }} />
      {t < 11.7 && <Stack n={4} position={give > 0 ? mix3([-0.1, 1.12, teenZ - 0.45], [-0.4, 1.2, -2.95], give) : [-0.1, 1.1, teenZ - 0.45]} />}
      {/* the $1,000 flies through the open vault: only a little lands in a crate, the rest keeps going (to loans) */}
      {Array.from({ length: 10 }, (_, k) => {
        const u = clamp((fly - k * 0.05) / 0.55);
        if (fly <= 0 || u >= 1) return null;
        const keep = k < 2;
        const end: V3 = keep ? [2.8, 0.9, -8.4] : [2.6 + (k - 5) * 0.4, 3.6, -12.2];
        const p = mix3(mix3([-0.4, 1.3, -2.95], [VAULT_DOOR[0], 2.0, -5.0], easeOut(Math.min(1, u * 1.7))), end, easeIn(Math.max(0, u * 1.7 - 0.7) / 1.0));
        return <Bill key={k} position={p} rotation={[t * 4 + k, t * 3, 0.4 * Math.sin(t * 9 + k)]} scale={0.8} glow={keep ? 0.6 : 0.2} />;
      })}
    </group>
  );
};
const CAR_POS: V3 = [0.7, 0, 0.9];
const MoneyMap: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[MAP_AT, [0.2, 4.4, 15.5], [0, 2.2, -1.4], 44], [19.9, [0.3, 3.8, 13.6], [0, 2.1, -1.2], 44]]);
  const r1 = easeOut(ramp(t, S(4) + 1.4, S(4) + 2.3)), r2 = easeOut(ramp(t, S(4) + 2.4, S(4) + 3.3));
  const CAR_TOP: V3 = [CAR_POS[0], 1.3, CAR_POS[2]];
  return (
    <group>
      <Street />
      <Car position={CAR_POS} rotation={[0, 0.3, 0]} />
      <Stack n={2} position={[BANK[0] + 1.6, 0.32, BANK[2] + 2.1]} />
      <Label text="KEPT READY" h={0.3} color="#0f3d2e" position={[BANK[0] + 1.6, 0.85, BANK[2] + 2.1]} />
      <Arc a={BANK_DOOR} b={[HOUSE[0] - 0.4, 2.6, HOUSE[2] + 0.6]} h={2.4} reveal={r1} color={COL.green} />
      <Arc a={BANK_DOOR} b={CAR_TOP} h={1.6} reveal={r2} color={COL.green} />
      <Stream t={t} a={BANK_DOOR} b={[HOUSE[0] - 0.4, 2.6, HOUSE[2] + 0.6]} h={2.4} t0={S(4) + 1.8} t1={19.6} every={0.3} travel={1.5} />
      <Stream t={t} a={BANK_DOOR} b={CAR_TOP} h={1.6} t0={S(4) + 2.8} t1={19.6} every={0.4} travel={1.2} />
      {r1 > 0.9 && <Label text="HOME LOAN" h={0.36} color="#eafff0" position={[arcPoint(BANK_DOOR, HOUSE, 2.4, 0.55)[0], arcPoint(BANK_DOOR, HOUSE, 2.4, 0.55)[1] + 2.6, -0.8]} />}
      {r2 > 0.9 && <Label text="CAR LOAN" h={0.32} color="#eafff0" position={[-1.6, 3.6, -0.4]} />}
    </group>
  );
};

// =========================================================================== 3. the problem begins (19.9 - 28.3 s)
export const RushScene: React.FC<{ t: number }> = ({ t }) => (t < VAULT2_AT ? <CrowdedLobby key="lob" t={t} /> : <EmptyingVault key="vault" t={t} />);
const crowdSpots = (() => { const g = rng(9); return Array.from({ length: 70 }, () => [g(), g(), g()]); })();
const CrowdedLobby: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[19.9, [-2.6, 4.6, 8.4], [-0.6, 1.0, -2.4], 46], [VAULT2_AT, [-1.4, 3.2, 4.8], [-0.8, 1.1, -2.8], 44]]);
  const fill = ramp(t, 19.9, 22.6);
  return (
    <group>
      <Lobby t={t} worried={ramp(t, 21.0, 22.0)} cash={0.7} />
      <Crowd n={70} place={(i) => {
        if (i / 70 > fill * 1.05) return null;
        const [a, b, c] = crowdSpots[i];
        const x = -4.2 + a * 8.0, z = -2.2 + b * 6.5;
        return [x, z, Math.PI + (c - 0.5) * 0.6, 0.05 * Math.abs(Math.sin(t * 6 + i))];
      }} />
      {[-2.8, -1.6, -0.4, 0.8].map((x, k) => (
        <Person key={x} position={[x, 0, -2.2]} rotation={[0, Math.PI, 0]} scale={0.9} look={k === 2 ? LOOKS.teen : { hoodie: ["#ef4444", "#3b82f6", "#000", "#f59e0b"][k], hair: "#2b1a10", hairStyle: (k % 3) as 0 | 1 | 2 }}
          pose={{ armR: 1.2 + 0.6 * Math.abs(Math.sin(t * 5 + k)), mood: "wow", bob: 0.04 * Math.abs(Math.sin(t * 7 + k)), blink: blink(t, k) }} />
      ))}
    </group>
  );
};
const EmptyingVault: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[VAULT2_AT, [2.3, 2.2, -4.6], [2.6, 0.8, -9.0], 50], [28.3, [2.5, 2.9, -6.3], [2.6, 0.6, -9.4], 52]]);
  const cash = lerp(0.65, 0.08, ramp(t, VAULT2_AT, 27.2));
  return (
    <group>
      <Lobby t={t} worried={1} cash={cash} alarm={ramp(t, 25.6, 26.0)} />
      {/* bills leaving the vault toward the counter */}
      {Array.from({ length: 12 }, (_, k) => {
        const u = ((t - VAULT2_AT) * 1.2 + k / 12) % 1;
        if (t > 27.2) return null;
        return <Bill key={k} position={mix3([2.6 + (k % 3 - 1) * 0.8, 0.9, -8.6], [-0.6, 2.2, -3.0], easeIn(u))} rotation={[t * 4 + k, t * 2, 0]} scale={0.7} />;
      })}
      <Person position={[1.3, 0, -7.4]} rotation={[0, -0.4, 0]} look={LOOKS.teller} pose={{ mood: "nervous", sweat: 1, armR: 1.4 + 0.3 * Math.sin(t * 6), armL: 1.4 + 0.3 * Math.sin(t * 6 + 1), blink: blink(t, 7), head: 0.4 * Math.sin(t * 3) }} />
    </group>
  );
};

// =========================================================================== 4. the domino effect (28.3 - 36.6 s)
export const DominoScene: React.FC<{ t: number }> = ({ t }) => (t < SALE_AT ? <RunOutside key="out" t={t} /> : t < DOMINO_AT ? <QuickSale key="sale" t={t} /> : <Dominoes key="dom" t={t} />);
const RunOutside: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[28.3, [12, 9, 22], [0, 2.5, -1], 46], [SALE_AT, [10, 7.5, 18], [0, 2.5, -1], 46]], 0.03 * Math.sin(t * 6));
  return (<group><City morning={0} /><Queue t={t} count={258} /></group>);
};
const QuickSale: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[SALE_AT, [0.4, 2.4, 7.4], [0, 1.6, 0], 44], [DOMINO_AT, [0.2, 2.2, 6.2], [0, 1.6, 0], 42]]);
  const price = ramp(t, S(8) + 2.2, S(8) + 2.8);
  return (
    <group>
      <color attach="background" args={["#ffe4cc"]} />
      <hemisphereLight args={["#ffffff", "#c9a27a", 0.8]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#f2c999", { roughness: 0.6 })}</mesh>
      <Box s={[14, 6, 0.2]} c="#fecaca" position={[0, 3, -3]} />
      <Sign text="QUICK SALE!" w={3.4} h={0.8} bg="#dc2626" fg="#fff7ed" position={[0, 3.6, -2.88]} />
      {/* the bank's stall: bonds and other investments for sale */}
      <Box s={[3.6, 1.0, 1.0]} c="#b91c1c" position={[0, 0.5, -0.6]} />
      {[-1.2, -0.4, 0.4, 1.2].map((x, k) => (
        <mesh key={x} position={[x, 1.32, -0.6]} rotation={[-0.3, 0, (k - 1.5) * 0.06]}><planeGeometry args={[0.7, 0.5]} /><meshStandardMaterial map={bond()} side={THREE.DoubleSide} /></mesh>
      ))}
      <Person position={[-0.9, 0, -1.6]} look={LOOKS.teller} pose={{ mood: "nervous", sweat: 0.7, armR: 1.6 + 0.4 * Math.sin(t * 6), blink: blink(t, 3) }} />
      <Person position={[2.4, 0, 0.8]} rotation={[0, -0.8, 0]} look={{ hoodie: "#64748b", hair: "#111", hairStyle: 1 }} pose={{ mood: "calm", armR: price > 0.5 ? 1.1 : 0.2, blink: blink(t, 6) }} />
      {/* buyer pays less than it's worth: a few bills, not many */}
      {price > 0 && Array.from({ length: 4 }, (_, k) => { const u = clamp((t - (S(8) + 2.4) - k * 0.15) / 0.6); return u > 0 && u < 1 ? <Bill key={k} position={mix3([2.2, 1.4, 0.6], [-0.8, 1.4, -1.2], easeOut(u))} rotation={[0, t * 4, 0.3]} scale={0.7} /> : null; })}
    </group>
  );
};
const DOM_N = 9;
const Dominoes: React.FC<{ t: number }> = ({ t }) => {
  const t0 = DOMINO_AT + 0.25;
  useCamKeys(t, [[DOMINO_AT, [-4.5, 2.4, 6.0], [-2.2, 1.0, 0], 46], [36.7, [3.6, 3.2, 7.6], [2.2, 0.9, 0], 46]], 0.05);
  return (
    <group>
      <color attach="background" args={["#1a0b16"]} />
      <hemisphereLight args={["#ffd6dc", "#2a0f1a", 0.7]} />
      <directionalLight position={[2, 6, 5]} intensity={1.8} />
      <pointLight position={[0, 3, 3]} intensity={8} distance={12} color={COL.red} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[40, 40]} />{M("#2a1424", { roughness: 0.4, metalness: 0.3 })}</mesh>
      {Array.from({ length: DOM_N }, (_, i) => {
        const fall = easeIn(clamp((t - (t0 + i * 0.17)) / 0.32));
        const ang = fall * (i === DOM_N - 1 ? Math.PI / 2 : 1.12);
        return (
          <group key={i} position={[-4 + i * 1.0 + 0.1, 0, 0]} rotation={[0, 0, -ang]}>
            <group position={[0.11, 0.9, 0]}>
              <mesh><boxGeometry args={[0.22, 1.8, 1.0]} />{M("#f4f1ea", { roughness: 0.5 })}</mesh>
              <mesh position={[0, 0.75, 0]}><boxGeometry args={[0.24, 0.2, 1.04]} />{M(i === 0 ? "#dc2626" : "#94a3b8")}</mesh>
              <Label text="BANK" h={0.24} color="#1e293b" position={[0, 0.2, 0.505]} />
              {[-0.25, 0.25].map((z) => <mesh key={z} position={[0, -0.25, z + 0.0]}><cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />{M("#d6d3cc")}</mesh>)}
            </group>
          </group>
        );
      })}
    </group>
  );
};

// =========================================================================== 5. how banks protect your money (36.6 - 49.4 s)
export const ProtectScene: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[36.6, [-0.6, 1.9, 8.6], [0.1, 1.45, 0], 44], [43.0, [0.6, 2.0, 7.9], [0.15, 1.5, 0], 44], [49.4, [0.1, 2.0, 7.5], [0.15, 1.5, 0], 44]]);
  const shield = backOut(ramp(t, S(11) + 0.6, S(11) + 1.3));
  const bubble = smooth(ramp(t, S(11) + 1.4, S(11) + 2.4));
  return (
    <group>
      <color attach="background" args={["#dbeafe"]} />
      <hemisphereLight args={["#ffffff", "#93a8c8", 0.85]} />
      <directionalLight position={[3, 6, 5]} intensity={1.8} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[30, 30]} />{M("#bfdbfe", { roughness: 0.5 })}</mesh>
      <Box s={[14, 6, 0.2]} c="#e0ecff" position={[0, 3, -3]} />
      {/* the friendly employee explains */}
      <Person position={[-1.0, 0, -0.1]} rotation={[0, 0.45, 0]} look={LOOKS.teller}
        pose={{ mood: "smile", armR: 0.6 + 0.9 * Math.abs(Math.sin(t * 2.2)), armL: t > S(11) ? 1.2 + 0.2 * Math.sin(t * 3) : 0.2, blink: blink(t, 2), head: 0.15 * Math.sin(t * 1.3) }} />
      {/* savings (piggy bank) inside the protective shield bubble */}
      <group position={[0.9, 0.75, 0.2]}>
        <Piggy rotation={[0, -0.6 + 0.1 * Math.sin(t), 0]} scale={0.9} />
        <mesh scale={bubble}><sphereGeometry args={[1.25, 40, 24]} /><meshPhysicalMaterial color="#93c5fd" transparent opacity={0.22} roughness={0.05} emissive="#3b82f6" emissiveIntensity={0.25} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        {Array.from({ length: 5 }, (_, k) => { const u = ((t - 37) * 0.8 + k / 5) % 1; return t > 37 ? <Coin key={k} position={[0, 2.0 - 1.4 * easeIn(u), 0]} rotation={[0, t * 4 + k, 0]} scale={0.22 * (1 - u * 0.3)} /> : null; })}
      </group>
      <Shield position={[0.1, 1.2, 1.5]} rotation={[0, 0.15, 0]} scale={0.42 * shield} glow={0.5 + 0.5 * Math.sin(t * 2)} />
    </group>
  );
};

// =========================================================================== 6. the big reveal: calm returns (49.4 - 60 s)
export const CalmScene: React.FC<{ t: number }> = ({ t }) => {
  useCamKeys(t, [[49.4, [7, 6, 17], [0, 2.4, -1], 46], [55.0, [3.2, 3.4, 11], [0, 2.4, -1.5], 44], [60, [1.4, 2.6, 8.5], [0, 2.6, -1.6], 44]]);
  const leave = Math.floor(lerp(0, 240, smooth(ramp(t, 49.6, 56.0))));
  const walkers = useMemo(() => { const g = rng(31); return Array.from({ length: 60 }, () => [g(), g(), g()]); }, []);
  return (
    <group>
      <City />
      {/* the line shrinks from the front: people got what they needed, or decided to leave their money where it is */}
      <Crowd n={260} place={(i) => { const k = i + leave; if (k > 258) return null; const [x, z, yaw] = queueSlot(i); return [x, z, yaw, 0.02 * Math.abs(Math.sin(t * 1.5 + i))]; }} />
      <Crowd n={60} place={(i) => {
        const [a, b, c] = walkers[i]; const st = 49.6 + a * 6;
        if (t < st) return null;
        const u = (t - st) * (0.5 + 0.3 * c);
        const ang = (b - 0.5) * 2.2 + Math.PI / 2;
        return [Math.cos(ang) * (1 + u * 3), 2 + Math.sin(ang) * (1 + u * 3), -ang + Math.PI / 2, 0.05 * Math.abs(Math.sin(t * 8 + i))];
      }} />
      <Person position={[-1.4, 0, 1.0]} rotation={[0, 0.3, 0]} look={LOOKS.teller} pose={{ mood: "smile", armR: 2.4 + 0.3 * Math.sin(t * 5), blink: blink(t, 4) }} />
      <Person position={[1.3, 0, 1.6]} rotation={[0, -0.4, 0]} look={LOOKS.teen} scale={0.92} pose={{ mood: t > 57.3 ? "wow" : "smile", armR: t > 57.3 ? 1.6 : 0.3, blink: blink(t, 1) }} />
    </group>
  );
};
