import React from "react";
import { Composition } from "remotion";
import { Silhouette } from "./Silhouette";

export const RemotionRoot: React.FC = () => (
  <Composition id="Silhouette" component={Silhouette} durationInFrames={1} fps={30} width={1080} height={1920} />
);
