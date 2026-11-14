// "What if everyone withdrew their money from the bank?": 60 s, designed at 720x1280 and rendered at scale 1.5 = 1080x1920, 30 fps.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FPS, sceneAt } from "./timeline";
import { LineScene, MoneyScene, RushScene, DominoScene, ProtectScene, CalmScene } from "./Scenes";
import { Overlay } from "./Overlay";

const useFonts = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender("fonts"));
  useEffect(() => {
    const faces = [new FontFace("Anton", `url(${staticFile("fonts/anton-latin-400-normal.woff2")})`),
      new FontFace("Inter", `url(${staticFile("fonts/inter-latin-800-normal.woff2")})`, { weight: "800" }),
      new FontFace("Inter", `url(${staticFile("fonts/inter-latin-400-normal.woff2")})`, { weight: "400" })];
    Promise.all(faces.map((f) => f.load())).then((fs) => { fs.forEach((f) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(f)); setOk(true); continueRender(h); });
  }, [h]);
  return ok;
};

/** reflections for the gold coins and metal (generated once, no image files) */
const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.9;
    pm.dispose();
  }, [gl, scene]);
  return null;
};

const World: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const id = sceneAt(t);
  const Sc = [LineScene, MoneyScene, RushScene, DominoScene, ProtectScene, CalmScene][id - 1];
  return (
    <>
      <Env />
      <Sc key={id} t={t} />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.5} luminanceThreshold={1.0} luminanceSmoothing={0.2} mipmapBlur radius={0.65} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
};

export const BankRun60: React.FC = () => {
  const fonts = useFonts();
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: "#0b1020" }}>
      {fonts && (
        <ThreeCanvas width={720} height={1280} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 300 }}>
          <World />
        </ThreeCanvas>
      )}
      {fonts && <Overlay t={t} />}
    </AbsoluteFill>
  );
};
