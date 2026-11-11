import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C, FONT, SAFE_X } from "../theme";
import { GAP, scenes } from "../timeline";
import manifest from "../voice-manifest.json";

const hasAudio = manifest as Record<string, number>;

const Subtitle: React.FC<{ text: string; duration: number }> = ({
  text,
  duration,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 44,
        paddingLeft: SAFE_X,
        paddingRight: SAFE_X,
      }}
    >
      <div
        lang="ja"
        style={{
          opacity: interpolate(
            frame,
            [0, 5, duration + GAP - 4, duration + GAP],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
          minHeight: 150,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "14px 56px",
          borderRadius: 22,
          background: "rgba(4,7,18,0.82)",
          border: `1px solid ${C.cardBorder}`,
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: 46,
          lineHeight: 1.36,
          color: C.text,
          textAlign: "center",
          // "\n" in script.json forces a line break
          whiteSpace: "pre-line",
          wordBreak: "auto-phrase",
          textWrap: "balance",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

/** Voice + subtitle for every line, placed on the main timeline. */
export const Narration: React.FC = () => {
  return (
    <>
      {scenes.flatMap((scene) =>
        scene.lines.map((line) => (
          <Sequence
            key={line.id}
            name={`Line ${line.id}`}
            from={scene.start + line.start}
            durationInFrames={line.duration + GAP}
          >
            {hasAudio[line.id] ? (
              <Audio src={staticFile(`voice/${line.id}.m4a`)} />
            ) : null}
            <Subtitle text={line.text} duration={line.duration} />
          </Sequence>
        )),
      )}
    </>
  );
};
