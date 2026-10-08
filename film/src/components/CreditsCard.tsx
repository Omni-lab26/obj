import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {credits} from "../edl";
import {SERIF} from "../fonts";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;
const SP = "\u3000"; // 全角スペース

export const CreditsCard: React.FC = () => {
  const frame = useCurrentFrame();
  const {height, fps, durationInFrames} = useVideoConfig();
  const u = height / 1080;
  const fade = Math.round(0.8 * fps);
  const opacity =
    interpolate(frame, [0, fade], [0, 1], clamp) *
    interpolate(frame, [durationInFrames - fade, durationInFrames], [1, 0], clamp);
  const names = credits.footage.map((f) => f.credit);
  const cols = names.length > 36 ? 4 : names.length > 18 ? 3 : 2;
  const small = names.length > 48 ? 15 : 17;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000",
        color: "rgba(236,232,222,0.86)",
        fontFamily: SERIF,
        opacity,
        padding: `${80 * u}px ${150 * u}px`,
        justifyContent: "center",
      }}
    >
      <div style={{fontSize: 20 * u, lineHeight: 1.9, textAlign: "center", marginBottom: 34 * u, opacity: 0.9}}>
        {credits.note}
      </div>
      {names.length ? (
        <>
          <div style={{fontSize: 17 * u, letterSpacing: "0.3em", textAlign: "center", marginBottom: 14 * u, opacity: 0.6}}>
            映像
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              columnGap: 28 * u,
              rowGap: 4 * u,
              fontSize: small * u,
              lineHeight: 1.5,
              textAlign: "center",
              marginBottom: 30 * u,
            }}
          >
            {names.map((n, i) => (
              <div key={i}>{n}</div>
            ))}
          </div>
        </>
      ) : null}
      <div style={{fontSize: 17 * u, lineHeight: 2.0, textAlign: "center", opacity: 0.75}}>
        {credits.music ? <div>音楽{SP}{credits.music}</div> : null}
        <div>環境音{SP}{credits.sound}</div>
        <div>書体{SP}{credits.font}</div>
        <div>{credits.tools}</div>
      </div>
    </AbsoluteFill>
  );
};
