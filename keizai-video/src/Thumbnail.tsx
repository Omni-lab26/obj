import React from "react";
import { AbsoluteFill } from "remotion";
import "./fonts";
import { C, FONT } from "./theme";

/** 1280x720 YouTube thumbnail. Render with `npm run thumbnail`. */
export const Thumbnail: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        color: C.text,
        background: `linear-gradient(150deg, #1A0B14 0%, ${C.bg} 60%)`,
      }}
    >
      <svg width={1280} height={720} style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="thumb-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,90,95,0.42)" />
            <stop offset="100%" stopColor="rgba(255,90,95,0)" />
          </linearGradient>
        </defs>
        <path
          d="M 880 440 L 1000 452 L 1096 500 L 1236 690 L 1236 720 L 880 720 Z"
          fill="url(#thumb-area)"
        />
        <path
          d="M 880 440 L 1000 452 L 1096 500 L 1236 690"
          fill="none"
          stroke={C.down}
          strokeWidth={20}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 40,
          fontSize: 62,
          fontWeight: 900,
          background: C.accent,
          color: "#141414",
          padding: "4px 26px",
          borderRadius: 12,
        }}
      >
        日経平均{"　"}歴代3位の急落
      </div>
      <div
        style={{
          position: "absolute",
          left: 44,
          top: 150,
          fontSize: 252,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: -8,
          color: C.down,
          WebkitTextStroke: "10px #fff",
          paintOrder: "stroke fill",
          whiteSpace: "nowrap",
        }}
      >
        ▼3,643
        <span style={{ fontSize: 150, letterSpacing: 0 }}>円</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 56,
          top: 440,
          fontSize: 116,
          fontWeight: 900,
          lineHeight: 1.15,
          WebkitTextStroke: "14px #05070F",
          paintOrder: "stroke fill",
        }}
      >
        <span style={{ color: C.accent }}>AI規制ショック</span>
        <br />
        の正体
      </div>
      <div
        style={{
          position: "absolute",
          right: 44,
          top: 44,
          fontSize: 54,
          fontWeight: 900,
          border: "6px solid #fff",
          borderRadius: 16,
          padding: "2px 22px",
          background: "rgba(5,7,15,0.7)",
        }}
      >
        5分で解説
      </div>
    </AbsoluteFill>
  );
};
