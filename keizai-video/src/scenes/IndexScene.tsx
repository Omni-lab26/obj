import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear, useProgress } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("index");

const Def: React.FC<{
  name: string;
  how: string;
  point: React.ReactNode;
  color: string;
}> = ({ name, how, point, color }) => (
  <Card style={{ height: 248, padding: "18px 34px" }} accent={color}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
      <span style={{ fontSize: 58, fontWeight: 900, color }}>{name}</span>
      <span style={{ fontSize: 34, fontWeight: 700, color: C.muted }}>
        {how}
      </span>
    </div>
    <div
      style={{ fontSize: 46, fontWeight: 800, lineHeight: 1.35, marginTop: 6 }}
    >
      {point}
    </div>
  </Card>
);

const Bar: React.FC<{
  at: number;
  name: string;
  pct: number;
  color: string;
}> = ({ at, name, pct, color }) => {
  const p = useProgress(at, 26);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 26, opacity: p }}>
      <div style={{ width: 250, fontSize: 46, fontWeight: 900 }}>{name}</div>
      <div
        style={{
          width: (pct / 3.5) * 1000 * p,
          height: 52,
          borderRadius: 12,
          background: color,
        }}
      />
      <div style={{ fontSize: 58, fontWeight: 900, color, lineHeight: 1.3 }}>
        −{(pct * p).toFixed(2)}%
      </div>
    </div>
  );
};

export const IndexScene: React.FC = () => {
  const colW = (1920 - SAFE_X * 2 - 36) / 2;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader
        no="2"
        title="なぜ起きた？　日経平均の「中身」"
        source="各指数の終値から算出"
      />

      <Appear
        at={cue("j2")}
        x={-40}
        y={0}
        style={{
          position: "absolute",
          left: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Def
          name="日経平均"
          how="225銘柄の株価を平均"
          color={C.down}
          point={
            <>
              株価の高い銘柄ほど影響大
              <br />→ <span style={{ color: C.down }}>AI・半導体</span>
              の比重が高い
            </>
          }
        />
      </Appear>
      <Appear
        at={cue("j3") + 120}
        x={40}
        y={0}
        style={{
          position: "absolute",
          right: SAFE_X,
          top: CONTENT_TOP,
          width: colW,
        }}
      >
        <Def
          name="TOPIX"
          how="東証の幅広い銘柄が対象"
          color={C.blue}
          point={
            <>
              時価総額をもとに算出
              <br />→ 市場<span style={{ color: C.blue }}>全体</span>
              の動きを映す
            </>
          }
        />
      </Appear>

      <Appear
        at={cue("j3")}
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP + 248 + 20,
        }}
      >
        <Card style={{ height: 266, padding: "16px 34px" }}>
          <div style={{ fontSize: 34, fontWeight: 700, color: C.muted }}>
            先週の月曜〜木曜（11/2〜11/5）の騰落率
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 6,
            }}
          >
            <Bar at={cue("j3") + 50} name="日経平均" pct={3.5} color={C.down} />
            <Bar at={cue("j3") + 200} name="TOPIX" pct={0.62} color={C.blue} />
          </div>
        </Card>
      </Appear>

      <Appear
        at={cue("j4") + 60}
        scaleFrom={0.94}
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_BOTTOM - 110,
        }}
      >
        <div
          style={{
            height: 110,
            borderRadius: 26,
            background: C.accent,
            color: "#141414",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 60,
            fontWeight: 900,
          }}
        >
          出発点は「AI関連」の調整だった
        </div>
      </Appear>
    </AbsoluteFill>
  );
};
