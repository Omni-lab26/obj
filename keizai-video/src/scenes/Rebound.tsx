import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Appear, useProgress } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { chartXY, LineChart } from "../components/LineChart";
import { CLOSES } from "../data";
import { C, CONTENT_H, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("rebound");
const CHART_W = 1000;
const CHART_H = CONTENT_H - 84;
const Y_MIN = 56000;
const Y_MAX = 64500;

const Opinion: React.FC<{
  tone: string;
  color: string;
  children: React.ReactNode;
}> = ({ tone, color, children }) => (
  <Card style={{ height: 192, padding: "18px 30px" }} accent={color}>
    <div style={{ fontSize: 50, fontWeight: 900, color }}>{tone}</div>
    <div
      style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.4, marginTop: 4 }}
    >
      {children}
    </div>
  </Card>
);

export const Rebound: React.FC = () => {
  const frame = useCurrentFrame();
  const upAt = cue("b2") + 40;
  const progress =
    4 +
    interpolate(
      frame,
      [upAt, upAt + 36, upAt + 150, upAt + 186],
      [0, 1, 1, 2],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      },
    );
  const last = chartXY(CHART_W, CHART_H, 7, Y_MIN, Y_MAX, 6, CLOSES[6].value);
  const half = useProgress(cue("b3") + 10, 40);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="3"
        title="その後どうなった？"
        source="日本経済新聞、外為どっとコム、マネックス証券"
      />
      <Appear
        at={cue("b1")}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: CONTENT_TOP,
          width: CHART_W,
        }}
      >
        <Card style={{ padding: "22px 0 0 0", height: CONTENT_H }}>
          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              paddingLeft: 40,
              height: 62,
            }}
          >
            日経平均株価（終値・円）
          </div>
          <div style={{ position: "relative" }}>
            <LineChart
              width={CHART_W}
              height={CHART_H}
              points={CLOSES}
              yMin={Y_MIN}
              yMax={Y_MAX}
              progress={progress}
              segmentColor={(i) => (i >= 5 ? C.up : i === 4 ? C.down : C.blue)}
              gridValues={[58000, 62000, 64000]}
              reference={{ value: 60000, label: "6万円", align: "left" }}
            />
            <Appear
              at={upAt + 190}
              y={10}
              style={{
                position: "absolute",
                left: last.x - 340,
                top: last.y - 112,
                width: 380,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 60,
                  fontWeight: 900,
                  color: C.up,
                  lineHeight: 1.1,
                }}
              >
                60,459円
              </div>
            </Appear>
          </div>
        </Card>
      </Appear>

      <div
        style={{
          position: "absolute",
          left: SAFE_X + CHART_W + 34,
          right: SAFE_X,
          top: CONTENT_TOP,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <Appear at={cue("b2") + 20} x={40} y={0}>
          <Card style={{ height: 252, padding: "18px 30px" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: C.muted }}>
              今週の反発（9日・10日）
            </div>
            <div
              style={{
                fontSize: 70,
                fontWeight: 900,
                color: C.up,
                lineHeight: 1.12,
              }}
            >
              +3,024円
            </div>
            <div
              style={{
                position: "relative",
                height: 30,
                borderRadius: 15,
                background: "rgba(255,90,95,0.35)",
                marginTop: 8,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${51.7 * half}%`,
                  height: "100%",
                  background: C.up,
                }}
              />
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                marginTop: 8,
                opacity: half,
              }}
            >
              先週の下げ 5,855円の<span style={{ color: C.up }}>約半分</span>
            </div>
          </Card>
        </Appear>
        <Appear at={cue("b4") + 60} x={40} y={0}>
          <Opinion tone="「売られすぎ」" color={C.up}>
            規制がすぐに決まるわけではない
          </Opinion>
        </Appear>
        <Appear at={cue("b5")} x={40} y={0}>
          <Opinion tone="「上値は重い」" color={C.down}>
            規制・金利の不透明感は残る
          </Opinion>
        </Appear>
      </div>
    </AbsoluteFill>
  );
};
