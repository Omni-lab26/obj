import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SAFE_X, yen } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("rank");

const ROWS = [
  { rank: 1, date: "2024年8月5日", name: "", drop: 4451, rate: 12.4 },
  {
    rank: 2,
    date: "1987年10月20日",
    name: "ブラックマンデー",
    drop: 3836,
    rate: 14.9,
  },
  { rank: 3, date: "2026年11月6日", name: "今回", drop: 3643, rate: 5.96 },
];
const BAR_MAX = 760;

export const Rank: React.FC = () => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.16, 1, 0.3, 1);
  // 0 = yen drop, 1 = percentage
  const mode = interpolate(frame, [cue("r3") + 20, cue("r3") + 44], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  const rowAt = [cue("r2"), cue("r2") + 100, cue("r2") + 215];

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="1"
        title="何が起きた？"
        source="日本経済新聞ほか（終値ベース）"
      />
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP,
          height: 84,
        }}
      >
        <Appear at={cue("r1")} out={cue("r3") + 14} y={16}>
          <div style={{ fontSize: 60, fontWeight: 900, position: "absolute" }}>
            日経平均{"　"}1日の<span style={{ color: C.accent }}>下げ幅</span>
            ランキング
          </div>
        </Appear>
        <Appear at={cue("r3") + 24} y={16}>
          <div style={{ fontSize: 60, fontWeight: 900, position: "absolute" }}>
            同じ3日を<span style={{ color: C.accent }}>下落率</span>
            で比べると…
          </div>
        </Appear>
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP + 108,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {ROWS.map((row, i) => {
          const grow = interpolate(frame, [rowAt[i], rowAt[i] + 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          const widthDrop = (row.drop / 4451) * BAR_MAX;
          const widthRate = (row.rate / 14.9) * BAR_MAX;
          const width = (widthDrop + (widthRate - widthDrop) * mode) * grow;
          const isNow = row.rank === 3;
          const color = isNow ? C.down : "#7C8BB8";
          return (
            <Appear key={row.rank} at={rowAt[i]} x={-40} y={0}>
              <Card
                accent={isNow ? C.down : undefined}
                style={{
                  height: 120,
                  padding: "0 30px",
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  background: isNow ? "rgba(255,90,95,0.10)" : C.card,
                }}
              >
                <div
                  style={{
                    width: 96,
                    fontSize: 62,
                    fontWeight: 900,
                    color: isNow ? C.down : C.muted,
                  }}
                >
                  {row.rank}
                  <span style={{ fontSize: 34 }}>位</span>
                </div>
                <div style={{ width: 390 }}>
                  <div style={{ fontSize: 42, fontWeight: 800 }}>
                    {row.date}
                  </div>
                  {row.name ? (
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 700,
                        color: isNow ? C.down : C.muted,
                      }}
                    >
                      {row.name}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    width,
                    height: 62,
                    borderRadius: 12,
                    background: color,
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    fontSize: 64,
                    fontWeight: 900,
                    color: isNow ? C.down : C.text,
                    opacity: grow,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ opacity: 1 - mode }}>−{yen(row.drop)}円</span>
                  <span
                    style={{ position: "absolute", left: 0, opacity: mode }}
                  >
                    −{row.rate.toFixed(1)}%
                  </span>
                </div>
              </Card>
            </Appear>
          );
        })}
      </div>

      <Appear
        at={cue("r4")}
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_BOTTOM - 150,
        }}
      >
        <div
          style={{
            height: 150,
            borderRadius: 26,
            background: "rgba(255,210,63,0.10)",
            border: `2px solid ${C.accent}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 44,
            fontSize: 46,
            fontWeight: 800,
          }}
        >
          <span style={{ color: C.accent, fontWeight: 900 }}>同じ5%安でも</span>
          <span>
            株価2万円なら <b style={{ fontSize: 60 }}>1,000円</b>
          </span>
          <span style={{ color: C.muted }}>▶</span>
          <span>
            6万円なら <b style={{ fontSize: 60, color: C.down }}>3,000円</b>
          </span>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};
