import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("cause");

const DotGrid: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(21, 26px)",
        gap: 9,
      }}
    >
      {new Array(41).fill(0).map((_, i) => {
        const on = interpolate(
          frame,
          [at + i * 1.6, at + i * 1.6 + 6],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );
        const restrict = i < 40;
        return (
          <div
            key={i}
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: restrict ? C.down : "transparent",
              border: `3px solid ${restrict ? C.down : C.muted}`,
              boxSizing: "border-box",
              opacity: 0.15 + 0.85 * on,
              scale: 0.6 + 0.4 * on,
            }}
          />
        );
      })}
    </div>
  );
};

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      fontSize: 42,
      fontWeight: 800,
      padding: "14px 34px",
      borderRadius: 999,
      background: "rgba(108,155,255,0.14)",
      border: `2px solid ${C.blue}`,
    }}
  >
    {children}
  </div>
);

export const Cause: React.FC = () => {
  const colW = (1920 - SAFE_X * 2 - 36) / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="2"
        title="なぜ起きた？"
        source="CNBC、The Conversation ほか"
      />

      <Appear
        at={cue("c2")}
        x={-40}
        y={0}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Card style={{ height: 400 }} accent={C.blue}>
          <div style={{ fontSize: 38, fontWeight: 700, color: C.muted }}>
            11月3日{"　"}アメリカ中間選挙
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 900,
              lineHeight: 1.2,
              marginTop: 10,
            }}
          >
            民主党が
            <br />
            <span style={{ color: C.blue }}>上下両院</span>で多数派
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 20 }}>
            {["上院", "下院"].map((house, i) => (
              <Appear key={house} at={cue("c2") + 130 + i * 22} y={10}>
                <div
                  style={{
                    fontSize: 38,
                    fontWeight: 800,
                    padding: "8px 26px",
                    borderRadius: 12,
                    background: C.blue,
                    color: "#0B1024",
                  }}
                >
                  ✓ {house}
                </div>
              </Appear>
            ))}
          </div>
        </Card>
      </Appear>

      <Appear
        at={cue("c3")}
        x={40}
        y={0}
        style={{
          position: "absolute",
          right: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Card style={{ height: 400 }} accent={C.down}>
          <div style={{ fontSize: 34, fontWeight: 700, color: C.muted }}>
            同じ日{"　"}データセンターの住民投票（10州）
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              marginTop: 6,
              fontWeight: 900,
            }}
          >
            <span style={{ fontSize: 50 }}>41件中</span>
            <span style={{ fontSize: 124, color: C.down, lineHeight: 1.1 }}>
              40件
            </span>
            <span style={{ fontSize: 50 }}>で規制強化</span>
          </div>
          <div style={{ marginTop: 22 }}>
            <DotGrid at={cue("c3") + 70} />
          </div>
        </Card>
      </Appear>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP + 400 + 24,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Appear at={cue("c4")} y={0}>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: C.muted,
              marginRight: 10,
            }}
          >
            背景にある不満
          </div>
        </Appear>
        <Appear at={cue("c4") + 40}>
          <Chip>電気料金の上昇</Chip>
        </Appear>
        <Appear at={cue("c4") + 82}>
          <Chip>電力の大量消費</Chip>
        </Appear>
        <Appear at={cue("c4") + 104}>
          <Chip>水の大量消費</Chip>
        </Appear>
      </div>

      <Appear
        at={cue("c5")}
        scaleFrom={0.94}
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
            background: C.accent,
            color: "#141414",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
            fontWeight: 900,
          }}
        >
          <span
            style={{
              fontSize: 36,
              background: "#141414",
              color: C.accent,
              padding: "8px 22px",
              borderRadius: 10,
            }}
          >
            市場の受け止め
          </span>
          <span style={{ fontSize: 62 }}>
            AIデータセンター建設に「ブレーキ」
          </span>
        </div>
      </Appear>
    </AbsoluteFill>
  );
};
