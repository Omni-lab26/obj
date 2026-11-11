import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { chartXY, LineChart } from "../components/LineChart";
import { CLOSES } from "../data";
import { C, CONTENT_H, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("what");
const POINTS = CLOSES.slice(0, 5);
const CHART_W = 1090;
const CHART_H = CONTENT_H - 84;
const Y_MIN = 56000;
const Y_MAX = 64500;

const Stat: React.FC<{
  label: string;
  value: string;
  color?: string;
}> = ({ label, value, color = C.text }) => (
  <Card style={{ height: 211, padding: "26px 34px" }}>
    <div style={{ fontSize: 36, fontWeight: 700, color: C.muted }}>{label}</div>
    <div
      style={{
        fontSize: 96,
        fontWeight: 900,
        color,
        lineHeight: 1.2,
        letterSpacing: -1,
      }}
    >
      {value}
    </div>
  </Card>
);

export const What: React.FC = () => {
  const frame = useCurrentFrame();
  const dropAt = cue("w3") + 62;
  const progress =
    interpolate(frame, [cue("w2") + 10, cue("w2") + 120], [0, 3], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }) +
    interpolate(frame, [dropAt, dropAt + 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  const from = chartXY(CHART_W, CHART_H, 5, Y_MIN, Y_MAX, 3, POINTS[3].value);
  const to = chartXY(CHART_W, CHART_H, 5, Y_MIN, Y_MAX, 4, POINTS[4].value);

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="1"
        title="何が起きた？"
        source="日本経済新聞、マネックス証券"
      />
      <Appear
        at={cue("w1")}
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
              points={POINTS}
              yMin={Y_MIN}
              yMax={Y_MAX}
              progress={progress}
              segmentColor={(i) => (i === 4 ? C.down : C.blue)}
              gridValues={[58000, 62000, 64000]}
              reference={{ value: 60000, label: "6万円" }}
            />
            <Appear
              at={dropAt + 10}
              y={0}
              scaleFrom={0.6}
              style={{
                position: "absolute",
                left: (from.x + to.x) / 2 - 400,
                top: (from.y + to.y) / 2 + 4,
                width: 360,
                textAlign: "right",
                whiteSpace: "nowrap",
                transformOrigin: "100% 50%",
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: C.down,
                  lineHeight: 1.1,
                }}
              >
                ▼3,643円
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: C.muted }}>
                1日の下げ
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
          gap: 25,
        }}
      >
        <Appear at={cue("w3") + 150} x={40} y={0}>
          <Stat label="11月6日の終値" value="57,434円" />
        </Appear>
        <Appear at={cue("w4")} x={40} y={0}>
          <Stat label="1週間の下落率" value="−9.25%" color={C.down} />
        </Appear>
        <Appear at={cue("w4") + 96} x={40} y={0}>
          <Stat label="6月の最高値から" value="約2割安" color={C.down} />
        </Appear>
      </div>
    </AbsoluteFill>
  );
};
