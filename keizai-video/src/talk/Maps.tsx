import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { ACCENT, COOL, INK, MINCHO, SANS } from "./theme";
import { LonLat, PACIFIC, US, XY } from "./geo";
import { lineTiming } from "./timeline";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Mark = {
  at: LonLat;
  label: string;
  /** Small second line under the label */
  note?: string;
  /** Appears when this line starts (default: with the shot) */
  cue?: string;
  delay?: number;
  /** Label position relative to the dot */
  side?: "right" | "left" | "top" | "bottom";
};

export type Link = {
  from: LonLat;
  to: LonLat;
  cue?: string;
  delay?: number;
  /** Frames the line takes to draw */
  draw?: number;
  /** Dotted = a guess, not an established cause */
  dotted?: boolean;
  /** How far the curve bows, as a fraction of its length (negative bows upward) */
  bow?: number;
  label?: string;
};

export type MapSpec = {
  kind: "us" | "pacific";
  /** Camera: scale and the place it settles on */
  zoom?: { from: number; to: number; on: LonLat };
  highlight?: "ohio" | "usa-japan";
  marks?: Mark[];
  links?: Link[];
};

const cueFrame = (
  cue: string | undefined,
  delay: number | undefined,
  shotStart: number,
) => (cue ? lineTiming(cue).start - shotStart : 0) + (delay ?? 0);

export const MapView: React.FC<{
  spec: MapSpec;
  length: number;
  shotStart: number;
}> = ({ spec, length, shotStart }) => {
  const frame = useCurrentFrame();
  const map = spec.kind === "us" ? US : PACIFIC;
  const p = interpolate(frame, [0, length], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.quad),
  });
  const zoom = spec.zoom ?? { from: 1, to: 1.06, on: [0, 0] as LonLat };
  const scale = zoom.from + (zoom.to - zoom.from) * p;
  const focus = spec.zoom ? map.point(zoom.on) : { x: 960, y: 540 };
  // The camera centre slides from the middle of the map to the focus as it zooms in.
  const settle = spec.zoom
    ? Math.min(
        1,
        (scale - 1) / Math.max(0.0001, Math.max(zoom.from, zoom.to) - 1),
      )
    : 0;
  const cx = 960 + (focus.x - 960) * settle;
  const cy = 540 + (focus.y - 540) * settle;
  const toScreen = (pt: XY): XY => ({
    x: (pt.x - cx) * scale + 960,
    y: (pt.y - cy) * scale + 540,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050913", overflow: "hidden" }}>
      {/* the still base map, pre-rendered by `npm run maps:talk` */}
      <Img
        src={staticFile(`talk/map-${spec.kind}.jpg`)}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          maxWidth: "none",
          transformOrigin: "0 0",
          transform: `translate(${960 - cx * scale}px, ${540 - cy * scale}px) scale(${scale})`,
        }}
      />
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <filter id="map-line" x="-10%" y="-30%" width="120%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        {spec.kind === "us" && spec.highlight === "ohio" ? (
          <g
            transform={`translate(${960 - cx * scale} ${540 - cy * scale}) scale(${scale})`}
          >
            <path
              d={map.ohio}
              fill={ACCENT}
              opacity={interpolate(frame, [8, 40], [0, 0.92], clamp)}
            />
          </g>
        ) : null}

        {map.labels.map((label) => {
          const pt = toScreen(map.point(label.at));
          return (
            <text
              key={label.text}
              x={pt.x}
              y={pt.y}
              textAnchor="middle"
              fontFamily={SANS}
              fontWeight={700}
              fontSize={30}
              letterSpacing="0.35em"
              fill="rgba(190,210,255,0.42)"
            >
              {label.text}
            </text>
          );
        })}

        {(spec.links ?? []).map((link, i) => {
          const a = toScreen(map.point(link.from));
          const b = toScreen(map.point(link.to));
          const start = cueFrame(link.cue, link.delay, shotStart);
          const t = interpolate(
            frame,
            [start, start + (link.draw ?? 40)],
            [0, 1],
            {
              ...clamp,
              easing: Easing.inOut(Easing.cubic),
            },
          );
          if (t <= 0) return null;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const bow = link.bow ?? -0.18;
          const sign = dx >= 0 ? 1 : -1;
          const mx = (a.x + b.x) / 2 - dy * bow * sign;
          const my = (a.y + b.y) / 2 + dx * bow * sign;
          const pts: string[] = [];
          const steps = 48;
          for (let s = 0; s <= steps; s++) {
            const u = (s / steps) * t;
            const x =
              (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x;
            const y =
              (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y;
            pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
          }
          const lx = 0.25 * a.x + 0.5 * mx + 0.25 * b.x;
          const ly = 0.25 * a.y + 0.5 * my + 0.25 * b.y;
          return (
            <g key={i}>
              {/* glow under the route */}
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={link.dotted ? COOL : ACCENT}
                strokeWidth={16}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={link.dotted ? 0.35 : 0.6}
                filter="url(#map-line)"
              />
              <polyline
                points={pts.join(" ")}
                fill="none"
                stroke={link.dotted ? COOL : ACCENT}
                strokeWidth={7}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={link.dotted ? "3 17" : undefined}
              />
              {/* bright head while the line is being drawn */}
              {t < 1 && !link.dotted ? (
                <circle
                  cx={Number(pts[pts.length - 1].split(",")[0])}
                  cy={Number(pts[pts.length - 1].split(",")[1])}
                  r={11}
                  fill="#FFFFFF"
                />
              ) : null}
              {link.label ? (
                <text
                  x={lx}
                  y={ly - 22}
                  textAnchor="middle"
                  fontFamily={SANS}
                  fontWeight={700}
                  fontSize={30}
                  fill={link.dotted ? COOL : "rgba(255,255,255,0.95)"}
                  opacity={interpolate(t, [0.6, 1], [0, 1], clamp)}
                  stroke="rgba(6,10,19,0.75)"
                  strokeWidth={7}
                  style={{ paintOrder: "stroke" }}
                >
                  {link.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {(spec.marks ?? []).map((mark) => {
          const pt = toScreen(map.point(mark.at));
          const start = cueFrame(mark.cue, mark.delay, shotStart);
          const t = interpolate(frame, [start, start + 18], [0, 1], {
            ...clamp,
            easing: EASE,
          });
          if (t <= 0) return null;
          const pulse = 0.5 + 0.5 * Math.sin((frame - start) / 14);
          const side = mark.side ?? "right";
          const lx = pt.x + (side === "right" ? 30 : side === "left" ? -30 : 0);
          const ly =
            pt.y + (side === "top" ? -44 : side === "bottom" ? 78 : 18);
          const anchor =
            side === "right" ? "start" : side === "left" ? "end" : "middle";
          return (
            <g key={mark.label} opacity={t}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={24 + 10 * pulse}
                fill={ACCENT}
                opacity={0.22}
              />
              <circle
                cx={pt.x}
                cy={pt.y}
                r={12 * t}
                fill={ACCENT}
                stroke="#0A1220"
                strokeWidth={3}
              />
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontFamily={MINCHO}
                fontWeight={800}
                fontSize={54}
                fill={INK}
                stroke="rgba(6,10,19,0.8)"
                strokeWidth={9}
                style={{ paintOrder: "stroke" }}
              >
                {mark.label}
              </text>
              {mark.note ? (
                <text
                  x={lx}
                  y={ly + 44}
                  textAnchor={anchor}
                  fontFamily={SANS}
                  fontWeight={700}
                  fontSize={29}
                  fill="rgba(255,255,255,0.92)"
                  stroke="rgba(6,10,19,0.8)"
                  strokeWidth={7}
                  style={{ paintOrder: "stroke" }}
                >
                  {mark.note}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
