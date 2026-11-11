import React from "react";
import { AbsoluteFill } from "remotion";
import { Appear } from "../components/Appear";
import { Card } from "../components/Card";
import { SceneHeader } from "../components/Chrome";
import { C, CONTENT_H, CONTENT_TOP, FONT, SAFE_X } from "../theme";
import { cuesFor } from "../timeline";

const cue = cuesFor("watch");

const ITEMS = [
  {
    line: "n2",
    no: "1",
    title: "規制の具体化",
    color: C.blue,
    points: ["連邦議会の動き", "州ごとの規制"],
    delay: 62,
  },
  {
    line: "n3",
    no: "2",
    title: "12月の金融政策",
    color: C.accent,
    points: ["アメリカ FOMC", "日銀の会合"],
    delay: 78,
  },
  {
    line: "n4",
    no: "3",
    title: "AI企業の決算",
    color: C.down,
    points: ["投資計画の変化", "巨額投資は続くか"],
    delay: 82,
  },
];

export const Watch: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <SceneHeader no="3" title="これからの注目点" />
      <div
        style={{
          position: "absolute",
          left: SAFE_X,
          right: SAFE_X,
          top: CONTENT_TOP,
          height: CONTENT_H,
          display: "flex",
          alignItems: "center",
          gap: 30,
        }}
      >
        {ITEMS.map((item) => (
          <Appear
            key={item.no}
            at={cue(item.line)}
            y={50}
            style={{ flex: 1, height: 620 }}
          >
            <Card
              accent={item.color}
              style={{ height: "100%", padding: "30px 36px" }}
            >
              <div
                style={{
                  fontSize: 170,
                  fontWeight: 900,
                  color: item.color,
                  lineHeight: 1,
                }}
              >
                {item.no}
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  marginTop: 22,
                  lineHeight: 1.25,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  height: 4,
                  width: 90,
                  background: item.color,
                  margin: "30px 0",
                  borderRadius: 2,
                }}
              />
              {item.points.map((point, i) => (
                <Appear
                  key={point}
                  at={cue(item.line) + item.delay + i * 40}
                  y={14}
                >
                  <div
                    style={{
                      fontSize: 46,
                      fontWeight: 700,
                      lineHeight: 1.4,
                      marginBottom: 22,
                      display: "flex",
                      gap: 14,
                    }}
                  >
                    <span style={{ color: item.color }}>●</span>
                    {point}
                  </div>
                </Appear>
              ))}
            </Card>
          </Appear>
        ))}
      </div>
    </AbsoluteFill>
  );
};
