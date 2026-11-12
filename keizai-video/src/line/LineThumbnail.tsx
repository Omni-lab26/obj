import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import "./fonts";
import { MINCHO, SANS, WARM } from "./theme";

/** 1280x720 thumbnail in the same documentary look. */
export const LineThumbnail: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#0c0c0c" }}>
    <Img
      src={staticFile("line/photos/towers_pink.jpg")}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.15) 100%)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 64,
        top: 70,
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 34,
        letterSpacing: "0.14em",
        color: "#fff",
      }}
    >
      {"Halftick　点を線にする"}
    </div>
    <div
      style={{
        position: "absolute",
        left: 60,
        top: 170,
        fontFamily: MINCHO,
        fontWeight: 800,
        fontSize: 118,
        lineHeight: 1.28,
        color: "#fff",
        textShadow: "0 4px 30px rgba(0,0,0,0.7)",
      }}
    >
      アメリカの
      <span style={{ color: WARM }}>電気代</span>が、
      <br />
      日本の株を
      <br />
      動かした
    </div>
  </AbsoluteFill>
);
