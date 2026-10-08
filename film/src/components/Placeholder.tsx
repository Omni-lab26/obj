import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from "remotion";
import {edl, type Shot} from "../edl";
import {SERIF} from "../fonts";

// 仮編集（アニマティック）用のスレート。素材が届くまでショットの位置・長さ・意図を示す
const TINT: Record<number, [string, string]> = {
  1: ["#3a1d12", "#160b07"],
  2: ["#123238", "#071517"],
  3: ["#14321f", "#08150d"],
  4: ["#2c3214", "#121508"],
  5: ["#232a21", "#0e110d"],
  6: ["#22361a", "#0e160b"],
};

const KIND: Record<string, string> = {
  observation: "観察映像（現在の自然）",
  metaphor: "比喩（現代の映像で過去を表す）",
  reconstruction: "図解・再現",
};

export const Placeholder: React.FC<{shot: Shot}> = ({shot}) => {
  const frame = useCurrentFrame();
  const {height} = useVideoConfig();
  const u = height / 1080;
  const [a, b] = TINT[shot.chapter] ?? TINT[1];
  const chapter = edl.chapters.find((c) => c.id === shot.chapter);
  const len = (shot.end_frame - shot.cut_frame) / edl.fps;
  const progress = interpolate(frame, [0, shot.dur], [0, 100], {extrapolateRight: "clamp"});

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 45%, ${a} 0%, ${b} 75%)`,
        fontFamily: SERIF,
        color: "rgba(236,230,218,0.92)",
      }}
    >
      <div style={{position: "absolute", top: 54 * u, left: 72 * u, fontSize: 22 * u, letterSpacing: "0.2em", opacity: 0.6}}>
        仮編集 ・ {shot.chapter} {chapter?.name}
      </div>
      <div style={{position: "absolute", top: 54 * u, right: 72 * u, fontSize: 22 * u, letterSpacing: "0.12em", opacity: 0.6}}>
        {shot.id}
      </div>
      <AbsoluteFill style={{justifyContent: "flex-start", alignItems: "center", paddingTop: 250 * u, paddingLeft: 200 * u, paddingRight: 200 * u}}>
        <div style={{fontSize: 46 * u, lineHeight: 1.6, textAlign: "center", fontWeight: 500}}>{shot.desc}</div>
        <div style={{marginTop: 34 * u, fontSize: 22 * u, opacity: 0.62, letterSpacing: "0.08em"}}>
          {KIND[shot.kind]} ・ {len.toFixed(2)}秒 ・ {shot.hold ? "長回し ・ " : ""}同期: {shot.sync} ・ つなぎ: {shot.transition_in}
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          bottom: 70 * u,
          left: 72 * u,
          right: 72 * u,
          fontSize: 18 * u,
          opacity: 0.45,
          fontFamily: "monospace",
        }}
      >
        search: {shot.queries.join(" / ")}
      </div>
      <div style={{position: "absolute", bottom: 48 * u, left: 72 * u, right: 72 * u, height: 2 * u, background: "rgba(255,255,255,0.08)"}}>
        <div style={{width: `${progress}%`, height: "100%", background: "rgba(255,255,255,0.35)"}} />
      </div>
    </AbsoluteFill>
  );
};
