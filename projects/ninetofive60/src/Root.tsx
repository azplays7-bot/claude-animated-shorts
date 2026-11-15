import React from "react";
import { Composition } from "remotion";
import { NineToFive60 } from "./Video";
import { TOTAL } from "./timeline";

// Designed at 720x1280; rendered with --scale 1.5 (render.mjs "scale": 1.5) for the 1080x1920 master.
export const RemotionRoot: React.FC = () => (
  <Composition id="NineToFive60" component={NineToFive60} durationInFrames={TOTAL} fps={30} width={720} height={1280} />
);
