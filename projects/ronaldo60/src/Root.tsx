import React from "react";
import { Composition } from "remotion";
import { Ronaldo60 } from "./Video";
import { HumanTest } from "./HumanTest";
import { TOTAL } from "./timeline";

// Designed at 720x1280; rendered with --scale 1.5 (render.mjs "scale": 1.5) for the 1080x1920 master.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Ronaldo60" component={Ronaldo60} durationInFrames={TOTAL} fps={30} width={720} height={1280} />
    <Composition id="HumanTest" component={HumanTest} durationInFrames={1} fps={30} width={1080} height={1080} />
  </>
);
