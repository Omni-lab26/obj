import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear, useProgress } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_H, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("chain");

const Tile: React.FC<{
  name: string;
  value: string;
  note?: string;
  big?: boolean;
  style?: React.CSSProperties;
}> = ({ name, value, note, big, style }) => (
  <div
    style={{
      background: "rgba(255,90,95,0.10)",
      border: `1.5px solid rgba(255,90,95,0.55)`,
      borderRadius: 20,
      padding: big ? "18px 30px" : "14px 26px",
      boxSizing: "border-box",
      ...style,
    }}
  >
    <div style={{ fontSize: big ? 40 : 36, fontWeight: 800 }}>{name}</div>
    <div
      style={{
        fontSize: big ? 124 : 76,
        fontWeight: 900,
        color: C.down,
        lineHeight: 1.1,
        letterSpacing: -1,
      }}
    >
      {value}
    </div>
    {note ? (
      <div style={{ fontSize: 32, fontWeight: 700, color: C.muted }}>
        {note}
      </div>
    ) : null}
  </div>
);

const Panel: React.FC<{
  date: string;
  place: string;
  children: React.ReactNode;
}> = ({ date, place, children }) => (
  <Card style={{ height: CONTENT_H, padding: "24px 30px" }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
      <span
        style={{
          fontSize: 34,
          fontWeight: 900,
          background: C.text,
          color: C.bg,
          padding: "4px 16px",
          borderRadius: 10,
        }}
      >
        {date}
      </span>
      <span style={{ fontSize: 50, fontWeight: 900 }}>{place}</span>
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        marginTop: 20,
      }}
    >
      {children}
    </div>
  </Card>
);

export const Chain: React.FC = () => {
  const panelW = 760;
  const arrow = useProgress(cue("k3"), 20);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="2"
        title="なぜ起きた？"
        source="CNBC、外為どっとコム ほか"
      />

      <Appear
        at={cue("k1")}
        x={-40}
        y={0}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: CONTENT_TOP,
          width: panelW,
        }}
      >
        <Panel date="11月5日" place="アメリカ市場">
          <Appear at={cue("k1") + 60} y={16}>
            <Tile
              big
              name="半導体株指数（SOX）"
              value="約−12%"
              note="2020年3月以来の下げ"
            />
          </Appear>
          <div style={{ display: "flex", gap: 18 }}>
            <Appear at={cue("k2")} y={16} style={{ flex: 1 }}>
              <Tile name="エヌビディア" value="−9.3%" />
            </Appear>
            <Appear at={cue("k2") + 62} y={16} style={{ flex: 1 }}>
              <Tile name="AMD" value="−17.3%" />
            </Appear>
          </div>
        </Panel>
      </Appear>

      <div
        style={{
          position: "absolute",
          left: SAFE_X + panelW,
          width: 1920 - SAFE_X * 2 - panelW * 2,
          top: CONTENT_TOP,
          height: CONTENT_H,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity: arrow,
          translate: `${(1 - arrow) * -40}px 0px`,
        }}
      >
        <div style={{ fontSize: 30, fontWeight: 800, color: C.accent }}>
          波及
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 900,
            color: C.accent,
            lineHeight: 1,
          }}
        >
          ▶
        </div>
      </div>

      <Appear
        at={cue("k3")}
        x={40}
        y={0}
        style={{
          position: "absolute",
          right: SAFE_X,
          top: CONTENT_TOP,
          width: panelW,
        }}
      >
        <Panel date="11月6日" place="東京市場">
          <Appear at={cue("k3") + 20} y={16}>
            <Tile big name="日経平均株価" value="−5.96%" note="3,643円安" />
          </Appear>
          <Appear at={cue("k3") + 100} y={16}>
            <Tile name="ソフトバンクグループ" value="−10.8%" />
          </Appear>
          <Appear at={cue("k4")} y={16}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                textAlign: "center",
                padding: "16px 0",
                borderRadius: 20,
                background: C.down,
                color: "#fff",
              }}
            >
              銀行・食品にも売り → ほぼ全面安
            </div>
          </Appear>
        </Panel>
      </Appear>
    </AbsoluteFill>
  );
};
