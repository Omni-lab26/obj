import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { C, FONT, yen } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("hook");

const BigDrop: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const value = interpolate(frame, [at, at + 34], [0, 3643], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const landed = frame - (at + 34);
  const shake =
    landed >= 0 && landed < 14 ? Math.sin(landed * 2.4) * (14 - landed) : 0;
  return (
    <div
      style={{
        color: C.down,
        fontWeight: 900,
        fontSize: 290,
        lineHeight: 1,
        letterSpacing: -6,
        fontVariantNumeric: "tabular-nums",
        translate: `${shake}px 0px`,
        textShadow: "0 0 90px rgba(255,90,95,0.45)",
        display: "flex",
        alignItems: "baseline",
      }}
    >
      <span style={{ fontSize: 170, marginRight: 18 }}>▼</span>
      {yen(value)}
      <span style={{ fontSize: 150, marginLeft: 14, letterSpacing: 0 }}>
        円
      </span>
    </div>
  );
};

const Badge: React.FC<{ small: string; big: string }> = ({ small, big }) => (
  <div
    style={{
      border: `4px solid ${C.accent}`,
      borderRadius: 22,
      padding: "16px 40px",
      display: "flex",
      alignItems: "baseline",
      gap: 20,
      background: "rgba(255,210,63,0.08)",
    }}
  >
    <span style={{ fontSize: 44, fontWeight: 700, color: C.text }}>
      {small}
    </span>
    <span style={{ fontSize: 76, fontWeight: 900, color: C.accent }}>
      {big}
    </span>
  </div>
);

export const Hook: React.FC = () => {
  const phaseB = cue("h3") - 6;
  const phaseC = cue("h4") - 6;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      {/* A: the number */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 190,
        }}
      >
        <Appear at={2} out={phaseB} y={-20}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: C.muted,
              letterSpacing: 2,
            }}
          >
            2026年11月6日（金）{"　"}東京株式市場
          </div>
        </Appear>
        <Appear at={8} out={phaseB}>
          <div style={{ fontSize: 76, fontWeight: 800, marginTop: 18 }}>
            日経平均株価
          </div>
        </Appear>
        <Appear at={cue("h1") + 40} out={phaseB} y={0} scaleFrom={0.85}>
          <BigDrop at={cue("h1") + 44} />
        </Appear>
        <div style={{ display: "flex", gap: 44, marginTop: 34 }}>
          <Appear at={cue("h2")} out={phaseB}>
            <Badge small="下げ幅" big="歴代3位" />
          </Appear>
          <Appear at={cue("h2") + 50} out={phaseB}>
            <Badge small="半年ぶり" big="6万円割れ" />
          </Appear>
        </div>
      </AbsoluteFill>

      {/* B: the trigger */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 190,
        }}
      >
        <Appear at={cue("h3")} out={phaseC}>
          <div style={{ fontSize: 64, fontWeight: 800, color: C.muted }}>
            引き金は…
          </div>
        </Appear>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 50,
            marginTop: 50,
          }}
        >
          <Appear at={cue("h3") + 16} out={phaseC} x={-60} y={0}>
            <Card style={{ padding: "50px 64px" }} accent={C.blue}>
              <div style={{ fontSize: 100, fontWeight: 900 }}>
                アメリカの選挙
              </div>
            </Card>
          </Appear>
          <Appear at={cue("h3") + 34} out={phaseC} y={0} scaleFrom={0.4}>
            <div style={{ fontSize: 110, fontWeight: 900, color: C.accent }}>
              ×
            </div>
          </Appear>
          <Appear at={cue("h3") + 40} out={phaseC} x={60} y={0}>
            <Card style={{ padding: "50px 84px" }} accent={C.down}>
              <div style={{ fontSize: 100, fontWeight: 900 }}>AI</div>
            </Card>
          </Appear>
        </div>
      </AbsoluteFill>

      {/* C: title + agenda */}
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 190,
        }}
      >
        <Appear at={cue("h4")} y={-20}>
          <div
            style={{
              fontSize: 46,
              fontWeight: 800,
              color: "#141414",
              background: C.accent,
              padding: "8px 30px",
              borderRadius: 12,
            }}
          >
            5分でわかる
          </div>
        </Appear>
        <Appear at={cue("h4") + 6}>
          <div
            style={{
              fontSize: 118,
              fontWeight: 900,
              marginTop: 26,
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            日経平均 <span style={{ color: C.down }}>3,643円安</span>
            <br />
            「AI規制ショック」の正体
          </div>
        </Appear>
        <div style={{ display: "flex", gap: 30, marginTop: 50 }}>
          {[
            { no: "1", label: "何が起きた？", delay: 4 },
            { no: "2", label: "なぜ起きた？", delay: 42 },
            { no: "3", label: "これからの注目点", delay: 80 },
          ].map((item) => (
            <Appear key={item.no} at={cue("h4") + item.delay}>
              <Card
                style={{
                  padding: "20px 34px",
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                }}
              >
                <span
                  style={{ fontSize: 56, fontWeight: 900, color: C.accent }}
                >
                  {item.no}
                </span>
                <span style={{ fontSize: 50, fontWeight: 800 }}>
                  {item.label}
                </span>
              </Card>
            </Appear>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
