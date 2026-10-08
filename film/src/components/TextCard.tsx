import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import type {TextEvent} from "../edl";
import {SERIF} from "../fonts";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const INK = "rgba(240,236,226,0.94)";
// 実写の上でも読めるよう、輪郭の出ない柔らかい影だけを付ける（発光表現はしない）
const SHADOW = "0 0 24px rgba(0,0,0,0.55), 0 0 6px rgba(0,0,0,0.35)";

export const TextCard: React.FC<{event: TextEvent}> = ({event}) => {
  const frame = useCurrentFrame();
  const {height, fps} = useVideoConfig();
  const u = height / 1080;
  const fade = Math.round((event.style === "era" ? 0.75 : 1.1) * fps);
  const opacity =
    interpolate(frame, [0, fade], [0, 1], clamp) * interpolate(frame, [event.dur - fade, event.dur], [1, 0], clamp);

  if (event.style === "era") {
    return (
      <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity}}>
        <div style={{fontFamily: SERIF, fontSize: 38 * u, letterSpacing: "0.34em", paddingLeft: "0.34em", fontFeatureSettings: '"palt" 1', color: INK, textShadow: SHADOW}}>
          {event.text}
        </div>
      </AbsoluteFill>
    );
  }

  if (event.style === "line") {
    return (
      <AbsoluteFill style={{justifyContent: "flex-end", alignItems: "center", paddingBottom: 150 * u, opacity}}>
        {/* 文字の下だけをわずかに沈め、明るいボケの上でも読めるようにする */}
        <AbsoluteFill style={{background: "linear-gradient(to top, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 32%, rgba(0,0,0,0) 55%)"}} />
        <div
          style={{
            fontFamily: SERIF,
            position: "relative",
            fontSize: 46 * u,
            lineHeight: 1.95,
            letterSpacing: "0.16em",
            textAlign: "center",
            whiteSpace: "pre-line",
            color: INK,
            textShadow: SHADOW,
          }}
        >
          {event.text}
        </div>
      </AbsoluteFill>
    );
  }

  // タイトル（黒地）
  return (
    <AbsoluteFill style={{justifyContent: "center", alignItems: "center", opacity, backgroundColor: "#000"}}>
      <div style={{fontFamily: SERIF, fontWeight: 500, fontSize: 84 * u, letterSpacing: "0.38em", paddingLeft: "0.38em", color: INK}}>
        {event.text}
      </div>
      {event.sub ? (
        <>
          <div style={{width: 64 * u, height: Math.max(1, 1.5 * u), background: "rgba(240,236,226,0.5)", margin: `${36 * u}px 0`}} />
          <div style={{fontFamily: SERIF, fontSize: 30 * u, letterSpacing: "0.5em", paddingLeft: "0.5em", color: "rgba(240,236,226,0.8)"}}>
            {event.sub}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
