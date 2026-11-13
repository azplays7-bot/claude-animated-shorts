// "What if you invested $20 a month in Bitcoin?": 60 s, 720x1280, 30 fps. One continuous timeline; the three
// 20 s clips are frame ranges of it (0-599, 600-1199, 1200-1799), so each clip's last frame is the next one's first image.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FPS, local, sceneAt } from "./timeline";
import { Bedroom, Chart1, Chart2, Crash, Deposit, Finale, Mystery, Rush, Vault, WalletShot } from "./Scenes";
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
  const id = sceneAt(t), lt = local(t, id);
  const { scene } = useThree();
  scene.environmentIntensity = id === "bedroom" ? 0.3 : 0.9;   // the small lamp-lit room needs far less ambient reflection
  const S = { bedroom: Bedroom, deposit: Deposit, chart1: Chart1, wallet: WalletShot, chart2: Chart2, crash: Crash, rush: Rush, mystery: Mystery, vault: Vault, finale: Finale }[id];
  return (
    <>
      <Env />
      <S key={id} lt={lt} />
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.75} luminanceThreshold={1.0} luminanceSmoothing={0.2} mipmapBlur radius={0.7} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </>
  );
};

export const Bitcoin20: React.FC = () => {
  const fonts = useFonts();
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill style={{ background: "#04060d" }}>
      {fonts && (
        <ThreeCanvas width={720} height={1280} gl={{ antialias: false, powerPreference: "high-performance" }} camera={{ fov: 40, near: 0.05, far: 300 }}>
          <World />
        </ThreeCanvas>
      )}
      {fonts && <Overlay t={t} />}
    </AbsoluteFill>
  );
};
