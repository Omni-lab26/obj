import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import "../line/fonts";
import { PACIFIC, PLACES } from "./geo";
import palettes from "./palettes.json";

// Thumbnails for the "enyasu" episode (1 dollar = 160 yen), 1280 x 720.
// Three designs to compare. Only facts already passed by FACTCHECK-enyasu.md appear here.

const MINCHO = "'Shippori Mincho', 'Hiragino Mincho ProN', serif";
const SANS = "'Noto Sans JP', sans-serif";
const P = palettes.find((p) => p.id === "kawase")!;
const MINT = P.accent;
const BASE = P.base;
const TSUMUGI = "#FFC53D";
const SHADOW = "0 4px 28px rgba(0,0,0,0.75), 0 0 6px rgba(0,0,0,0.6)";

const photo = (file: string) => staticFile(`line/photos/${file}`);

/** "Plotline" and the host of the day, top left. */
const Brand: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div
    style={{
      position: "absolute",
      left: 48,
      top: 40,
      display: "flex",
      alignItems: "center",
      gap: 16,
    }}
  >
    <div
      style={{
        fontFamily: MINCHO,
        fontWeight: 800,
        fontSize: 40,
        color: dark ? BASE : "#fff",
        textShadow: dark ? "none" : SHADOW,
        letterSpacing: "0.02em",
      }}
    >
      Plotline
    </div>
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 24,
        color: BASE,
        backgroundColor: TSUMUGI,
        padding: "4px 14px",
        borderRadius: 8,
      }}
    >
      つむぎ
    </div>
  </div>
);

/** A: the number, on a fan of yen notes. */
export const EnyasuThumbA: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BASE }}>
    <Img
      src={photo("y_hand.jpg")}
      style={{
        position: "absolute",
        right: -120,
        top: -40,
        width: 900,
        height: 800,
        objectFit: "cover",
        transform: "rotate(-6deg)",
      }}
    />
    <AbsoluteFill
      style={{
        background: `linear-gradient(90deg, ${BASE} 0%, ${BASE} 38%, rgba(7,24,27,0.78) 58%, rgba(7,24,27,0.15) 100%)`,
      }}
    />
    <Brand />
    <div style={{ position: "absolute", left: 48, top: 128, color: "#fff" }}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1,
          textShadow: SHADOW,
        }}
      >
        1ドル
      </div>
      <div
        style={{
          fontFamily: MINCHO,
          fontWeight: 800,
          fontSize: 250,
          lineHeight: 1,
          color: MINT,
          letterSpacing: "-0.02em",
          textShadow: SHADOW,
          marginTop: 4,
        }}
      >
        160
        <span style={{ fontSize: 130, marginLeft: 6 }}>円</span>
      </div>
      <div
        style={{
          height: 12,
          width: 640,
          borderRadius: 6,
          backgroundColor: MINT,
          marginTop: 8,
          boxShadow: `0 0 24px ${MINT}`,
        }}
      />
      <div
        style={{
          fontFamily: MINCHO,
          fontWeight: 800,
          fontSize: 62,
          lineHeight: 1.3,
          marginTop: 30,
          textShadow: SHADOW,
        }}
      >
        アメリカのレジが、
        <br />
        日本の食卓に届く
      </div>
    </div>
  </AbsoluteFill>
);

/** B: two photos joined by one glowing line: an American receipt and bread (wheat is mostly imported). */
export const EnyasuThumbB: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: BASE }}>
    <Img
      src={photo("y_receipt.jpg")}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 640,
        height: 720,
        objectFit: "cover",
        objectPosition: "8% 0%",
        filter: "grayscale(0.2) brightness(0.8)",
      }}
    />
    <Img
      src={photo("y_bread.jpg")}
      style={{
        position: "absolute",
        left: 640,
        top: 0,
        width: 640,
        height: 720,
        objectFit: "cover",
        filter: "brightness(0.85)",
      }}
    />
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(7,24,27,0.75) 0%, rgba(7,24,27,0.1) 30%, rgba(7,24,27,0.1) 62%, rgba(7,24,27,0.88) 100%)",
      }}
    />
    <Brand />
    {/* the line, from the receipt to the table */}
    <svg width={1280} height={720} style={{ position: "absolute" }}>
      <defs>
        <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <path
        d="M 150 360 C 420 250, 860 470, 1130 360"
        stroke={MINT}
        strokeWidth={26}
        fill="none"
        filter="url(#glow)"
        opacity={0.8}
      />
      <path
        d="M 150 360 C 420 250, 860 470, 1130 360"
        stroke={MINT}
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={150} cy={360} r={22} fill={MINT} />
      <circle cx={1130} cy={360} r={22} fill={MINT} />
    </svg>
    <div
      style={{
        position: "absolute",
        left: 640,
        top: 360,
        transform: "translate(-50%, -50%)",
        backgroundColor: BASE,
        border: `6px solid ${MINT}`,
        borderRadius: 26,
        padding: "8px 30px 14px",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 40,
          color: "#fff",
        }}
      >
        1ドル
      </div>
      <div
        style={{
          fontFamily: MINCHO,
          fontWeight: 800,
          fontSize: 130,
          lineHeight: 1,
          color: MINT,
        }}
      >
        160円
      </div>
    </div>
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        bottom: 34,
        display: "flex",
        justifyContent: "space-between",
        fontFamily: MINCHO,
        fontWeight: 800,
        fontSize: 64,
        color: "#fff",
        textShadow: SHADOW,
      }}
    >
      <span>アメリカのレジが、</span>
      <span>日本の食卓に届く</span>
    </div>
  </AbsoluteFill>
);

/** C: the map, with a question. */
const K = 1280 / 1920;
const map = (lonlat: [number, number]) => {
  const p = PACIFIC.point(lonlat);
  return { x: p.x * K, y: p.y * K };
};

export const EnyasuThumbC: React.FC = () => {
  const from = map(PLACES.washington);
  const to = map(PLACES.tokyo);
  // shift the map so both ends sit in the lower half, leaving room for the words
  const dx = 0;
  const dy = 220;
  const mx = (from.x + to.x) / 2 + dx;
  const my = Math.min(from.y, to.y) + dy - 90;
  const d = `M ${from.x + dx} ${from.y + dy} Q ${mx} ${my} ${to.x + dx} ${to.y + dy}`;
  return (
    <AbsoluteFill style={{ backgroundColor: "#050913" }}>
      <Img
        src={staticFile("talk/map-pacific.jpg")}
        style={{
          position: "absolute",
          left: dx,
          top: dy,
          width: 1280,
          height: 720,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(5,9,19,0.85) 0%, rgba(5,9,19,0.35) 45%, rgba(5,9,19,0.2) 100%)",
        }}
      />
      <svg width={1280} height={720} style={{ position: "absolute" }}>
        <defs>
          <filter id="arc" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <path
          d={d}
          stroke={MINT}
          strokeWidth={22}
          fill="none"
          filter="url(#arc)"
        />
        <path
          d={d}
          stroke={MINT}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
        />
        <circle cx={from.x + dx} cy={from.y + dy} r={16} fill={MINT} />
        <circle cx={to.x + dx} cy={to.y + dy} r={16} fill={MINT} />
      </svg>
      {[
        { at: from, text: "アメリカ", align: "right" as const },
        { at: to, text: "日本", align: "left" as const },
      ].map((m) => (
        <div
          key={m.text}
          style={{
            position: "absolute",
            top: m.at.y + dy + 26,
            ...(m.align === "left"
              ? { left: m.at.x + dx - 20 }
              : { right: 1280 - (m.at.x + dx) - 40 }),
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 34,
            color: "#fff",
            textShadow: SHADOW,
          }}
        >
          {m.text}
        </div>
      ))}
      <Brand />
      <div
        style={{
          position: "absolute",
          left: 48,
          top: 104,
          fontFamily: MINCHO,
          fontWeight: 800,
          fontSize: 116,
          lineHeight: 1.12,
          color: "#fff",
          textShadow: SHADOW,
        }}
      >
        なぜ、また
        <br />
        <span style={{ color: MINT }}>1ドル160円</span>？
      </div>
      <div
        style={{
          position: "absolute",
          left: 52,
          top: 380,
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 40,
          color: BASE,
          backgroundColor: P.warn,
          padding: "6px 20px",
          borderRadius: 10,
        }}
      >
        夏に15兆円の介入、それでも
      </div>
    </AbsoluteFill>
  );
};
