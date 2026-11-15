import React from "react";
import { AbsoluteFill } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Human, runPose, Ball } from "./Human";
const Sc: React.FC = () => {
  const { camera } = useThree(); camera.position.set(0, 1.2, 5.2); camera.lookAt(0, 0.95, 0);
  return (<>
    <color attach="background" args={["#2a2f3a"]} />
    <hemisphereLight args={["#ffffff", "#554433", 0.8]} /><directionalLight position={[3, 5, 4]} intensity={2.2} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[20, 20]} /><meshStandardMaterial color="#7a6a55" /></mesh>
    <Human age={8} position={[-1.6, 0, 0]} rotation={[0, 0.6, 0]} pose={runPose(0.2, 0.9)} look={{ shirt: "#b91c1c", shorts: "#1e293b" }} />
    <Ball position={[-1.3, 0.11, 0.5]} />
    <Human age={12} position={[-0.5, 0, 0]} rotation={[0, -0.4, 0]} look={{ shirt: "#3b4a63", pants: true, shorts: "#2d2a26", sleeves: "long" }} />
    <Human age={15} position={[0.6, 0.45, 0]} rotation={[0, 0.3, 0]} pose={{ sit: true, shL: 0.6, shR: 0.6, elL: 0.9, elR: 0.9 }} look={{ shirt: "#cbd5e1" }} />
    <Human age={20} position={[1.7, 0, 0]} rotation={[0, -0.3, 0]} pose={{ abL: 2.6, abR: 2.6 }} look={{ shirt: "#f5f5f5", shorts: "#f5f5f5" }} />
  </>);
};
export const HumanTest: React.FC = () => <AbsoluteFill><ThreeCanvas width={1080} height={1080} camera={{ fov: 45 }}><Sc /></ThreeCanvas></AbsoluteFill>;
