import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C } from "../theme";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 240) * 60;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${C.bg2} 0%, ${C.bg} 62%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          backgroundPosition: `${-(frame / 6) % 96}px 0px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: 1150 + drift,
          top: -520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(108,155,255,0.20) 0%, rgba(108,155,255,0) 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -380 - drift,
          top: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,90,95,0.13) 0%, rgba(255,90,95,0) 65%)",
        }}
      />
    </AbsoluteFill>
  );
};
