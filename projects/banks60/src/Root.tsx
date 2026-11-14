import React from "react";
import { Composition } from "remotion";
import { Banks60 } from "./Video";
import { TOTAL } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <Composition id="Banks60" component={Banks60} durationInFrames={TOTAL} fps={30} width={720} height={1280} />
);
