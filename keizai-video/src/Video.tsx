import React from "react";
import { AbsoluteFill, Series } from "remotion";
import { Background } from "./components/Background";
import { ProgressBar } from "./components/Chrome";
import { Narration } from "./components/Narration";
import "./fonts";
import { Cause } from "./scenes/Cause";
import { Chain } from "./scenes/Chain";
import { Hook } from "./scenes/Hook";
import { IndexScene } from "./scenes/IndexScene";
import { Rates } from "./scenes/Rates";
import { Rank } from "./scenes/Rank";
import { Rebound } from "./scenes/Rebound";
import { Summary } from "./scenes/Summary";
import { Watch } from "./scenes/Watch";
import { What } from "./scenes/What";
import { getScene } from "./timeline";

export const SCENES = [
  { id: "hook", name: "Hook", component: Hook },
  { id: "what", name: "What", component: What },
  { id: "rank", name: "Rank", component: Rank },
  { id: "cause", name: "Cause", component: Cause },
  { id: "chain", name: "Chain", component: Chain },
  { id: "index", name: "Index", component: IndexScene },
  { id: "rates", name: "Rates", component: Rates },
  { id: "rebound", name: "Rebound", component: Rebound },
  { id: "watch", name: "Watch", component: Watch },
  { id: "summary", name: "Summary", component: Summary },
];

/** Wraps a scene so it can be previewed on its own with the shared background. */
export const withBackground = (Scene: React.FC): React.FC => {
  const Wrapped: React.FC = () => (
    <AbsoluteFill>
      <Background />
      <Scene />
    </AbsoluteFill>
  );
  return Wrapped;
};

export const NikkeiAiShock: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <Series>
        {SCENES.map(({ id, name, component: Scene }) => (
          <Series.Sequence
            key={id}
            name={name}
            durationInFrames={getScene(id).duration}
          >
            <Scene />
          </Series.Sequence>
        ))}
      </Series>
      <Narration />
      <ProgressBar />
    </AbsoluteFill>
  );
};
