import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, SAFE_X } from "../theme";
import { scenes, totalFrames } from "../timeline";
import { Appear } from "./Appear";

/** Chapter label (top-left) and data source (top-right) for a scene. */
export const SceneHeader: React.FC<{
  no: string;
  title: string;
  source?: string;
}> = ({ no, title, source }) => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Appear
        at={0}
        y={-16}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: 62,
          display: "flex",
          alignItems: "center",
          gap: 22,
        }}
      >
        <div
          style={{
            background: C.accent,
            color: "#141414",
            fontWeight: 900,
            fontSize: 34,
            lineHeight: 1,
            padding: "12px 20px",
            borderRadius: 12,
          }}
        >
          {no}
        </div>
        <div style={{ color: C.text, fontWeight: 800, fontSize: 46 }}>
          {title}
        </div>
      </Appear>
      {source ? (
        <div
          style={{
            position: "absolute",
            right: SAFE_X,
            top: 84,
            color: C.dim,
            fontWeight: 500,
            fontSize: 24,
          }}
        >
          出所：{source}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Thin progress bar across the top of the whole video. */
export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: "100%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: 8,
          width: `${interpolate(frame, [0, totalFrames], [0, 100], {
            extrapolateRight: "clamp",
          })}%`,
          background: C.accent,
        }}
      />
      {scenes.slice(1).map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${(s.start / totalFrames) * 100}%`,
            width: 3,
            height: 8,
            background: C.bg,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
