import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear, useProgress } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("rates");
const CARD_H = 500;

const CpiBar: React.FC<{
  at: number;
  label: string;
  value: number;
  color: string;
}> = ({ at, label, value, color }) => {
  const p = useProgress(at, 24);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: p }}>
      <div style={{ width: 120, fontSize: 42, fontWeight: 800 }}>{label}</div>
      <div
        style={{
          width: (value / 0.3) * 400 * p,
          height: 60,
          borderRadius: 12,
          background: color,
        }}
      />
      <div style={{ fontSize: 68, fontWeight: 900, color }}>
        +{(value * p).toFixed(1)}%
      </div>
    </div>
  );
};

const Seesaw: React.FC<{ at: number }> = ({ at }) => {
  const tilt = useProgress(at, 40) * 11;
  return (
    <div style={{ position: "relative", width: 760, height: 300 }}>
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 150,
          width: 720,
          height: 16,
          borderRadius: 8,
          background: C.text,
          rotate: `${tilt}deg`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 26,
            width: 300,
            rotate: `${-tilt}deg`,
            transformOrigin: "50% 100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: C.accent,
              lineHeight: 1.1,
            }}
          >
            金利 ↑
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 88,
            width: 380,
            rotate: `${-tilt}deg`,
            transformOrigin: "50% 100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 50,
              fontWeight: 900,
              whiteSpace: "nowrap",
              color: C.down,
              lineHeight: 1.1,
            }}
          >
            成長期待の株 ↓
          </div>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 380 - 46,
          top: 166,
          width: 0,
          height: 0,
          borderLeft: "46px solid transparent",
          borderRight: "46px solid transparent",
          borderBottom: `92px solid ${C.dim}`,
        }}
      />
    </div>
  );
};

const Term: React.FC<{ children: React.ReactNode; color: string }> = ({
  children,
  color,
}) => (
  <div
    style={{
      fontSize: 54,
      fontWeight: 900,
      padding: "18px 40px",
      borderRadius: 20,
      border: `3px solid ${color}`,
      color,
      background: "rgba(255,255,255,0.04)",
    }}
  >
    {children}
  </div>
);

export const Rates: React.FC = () => {
  const colW = (1920 - SAFE_X * 2 - 36) / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="2"
        title="なぜ起きた？　もう一つの重し「金利」"
        source="外為どっとコム、Bloomberg"
      />

      <Appear
        at={cue("f2")}
        x={-40}
        y={0}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Card style={{ height: CARD_H }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: C.muted }}>
            米国 10月の消費者物価（コア・前月比）
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginTop: 24,
            }}
          >
            <CpiBar
              at={cue("f2") + 40}
              label="予想"
              value={0.2}
              color="#7C8BB8"
            />
            <CpiBar
              at={cue("f2") + 90}
              label="結果"
              value={0.3}
              color={C.accent}
            />
          </div>
          <Appear at={cue("f2") + 150} y={16}>
            <div
              style={{
                marginTop: 34,
                fontSize: 54,
                fontWeight: 900,
                padding: "20px 0",
                textAlign: "center",
                borderRadius: 18,
                background: "rgba(255,210,63,0.12)",
                border: `2px solid ${C.accent}`,
              }}
            >
              12月の<span style={{ color: C.accent }}>利上げ観測</span>
              が強まる
            </div>
          </Appear>
        </Card>
      </Appear>

      <Appear
        at={cue("f3")}
        x={40}
        y={0}
        style={{
          position: "absolute",
          right: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Card
          style={{
            height: CARD_H,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: C.muted,
              alignSelf: "flex-start",
            }}
          >
            金利と株価の関係
          </div>
          <div style={{ marginTop: 70 }}>
            <Seesaw at={cue("f3") + 24} />
          </div>
        </Card>
      </Appear>

      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP + CARD_H,
          height: CONTENT_BOTTOM - CONTENT_TOP - CARD_H,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 34,
        }}
      >
        <Appear at={cue("f4")}>
          <Term color={C.blue}>規制への不安</Term>
        </Appear>
        <Appear at={cue("f4") + 36} y={0} scaleFrom={0.4}>
          <div style={{ fontSize: 80, fontWeight: 900, paddingBottom: 8 }}>
            ＋
          </div>
        </Appear>
        <Appear at={cue("f4") + 44}>
          <Term color={C.accent}>金利の上昇</Term>
        </Appear>
        <Appear at={cue("f4") + 84} y={0} scaleFrom={0.4}>
          <div style={{ fontSize: 80, fontWeight: 900, paddingBottom: 8 }}>
            ＝
          </div>
        </Appear>
        <Appear at={cue("f4") + 92}>
          <Term color={C.down}>今回の下げ</Term>
        </Appear>
      </div>
    </AbsoluteFill>
  );
};
