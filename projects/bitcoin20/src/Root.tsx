import React from "react";
import { Composition } from "remotion";
import { Bitcoin20 } from "./Video";
import { TOTAL } from "./timeline";

// One 60 s timeline; the three clips are rendered as frame ranges 0-599, 600-1199, 1200-1799.
export const RemotionRoot: React.FC = () => (
  <Composition id="Bitcoin20" component={Bitcoin20} durationInFrames={TOTAL} fps={30} width={720} height={1280} />
);
