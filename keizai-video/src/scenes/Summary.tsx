import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_BOTTOM, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("summary");

const Row: React.FC<{ no: string; children: React.ReactNode }> = ({
  no,
  children,
}) => (
  <Card
    style={{
      height: 150,
      padding: "0 36px",
      display: "flex",
      alignItems: "center",
      gap: 30,
    }}
  >
    <div
      style={{
        width: 84,
        height: 84,
        borderRadius: "50%",
        background: C.accent,
        color: "#141414",
        fontSize: 52,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {no}
    </div>
    <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.3 }}>
      {children}
    </div>
  </Card>
);

export const Summary: React.FC = () => {
  const outro = cue("s5") - 8;
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <Appear at={0} out={outro} y={0}>
        <SceneHeader no="まとめ" title="今日のポイント" />
      </Appear>
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP,
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <Appear at={cue("s2")} out={outro} x={-40} y={0}>
          <Row no="1">
            急落のきっかけは米選挙。中身は
            <span style={{ color: C.down }}>AI関連株の調整</span>
          </Row>
        </Appear>
        <Appear at={cue("s3")} out={outro} x={-40} y={0}>
          <Row no="2">
            日経平均は<span style={{ color: C.down }}>AI・半導体</span>
            の影響を強く受ける指数
          </Row>
        </Appear>
        <Appear at={cue("s3") + 130} out={outro} x={-40} y={0}>
          <Row no="3">
            「下げ幅」だけでなく
            <span style={{ color: C.accent }}>下落率</span>と
            <span style={{ color: C.accent }}>中身</span>を見る
          </Row>
        </Appear>
      </div>
      <Appear
        at={cue("s4")}
        out={outro}
        y={16}
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_BOTTOM - 150,
          height: 150,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 10,
          color: C.muted,
          fontSize: 30,
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        <div>
          ※
          この動画は情報提供を目的としたもので、特定の投資を勧めるものではありません。
        </div>
        <div>
          ※
          2026年11月10日時点の情報です。出所：日本経済新聞、マネックス証券、外為どっとコム、CNBC、Bloomberg
          ほか
        </div>
      </Appear>

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          paddingBottom: 190,
        }}
      >
        <Appear at={cue("s5")} scaleFrom={0.9}>
          <div style={{ fontSize: 104, fontWeight: 900, textAlign: "center" }}>
            ご視聴ありがとうございました
          </div>
        </Appear>
        <div style={{ display: "flex", gap: 36, marginTop: 56 }}>
          <Appear at={cue("s5") + 30}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                padding: "22px 54px",
                borderRadius: 999,
                background: C.down,
                color: "#fff",
              }}
            >
              チャンネル登録
            </div>
          </Appear>
          <Appear at={cue("s5") + 58}>
            <div
              style={{
                fontSize: 60,
                fontWeight: 900,
                padding: "22px 54px",
                borderRadius: 999,
                border: `4px solid ${C.text}`,
              }}
            >
              👍 高評価
            </div>
          </Appear>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
