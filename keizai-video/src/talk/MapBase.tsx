import React from "react";
import { AbsoluteFill } from "remotion";
import { PACIFIC, US } from "./geo";

/**
 * The still part of a map: sea, grid, land, lakes, borders and city lights.
 * Rendered once to an image (`npm run maps:talk`) because the glow filters are
 * far too slow to redraw on every frame of the video.
 */
export const MapBase: React.FC<{ kind: "us" | "pacific" }> = ({ kind }) => {
  const map = kind === "us" ? US : PACIFIC;
  // Lights are sized for the zoom the map is mostly seen at.
  const k = kind === "us" ? 1 / Math.sqrt(1.7) : 1;
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(ellipse at 50% 42%, #14234A 0%, #0A1330 55%, #050913 100%)",
      }}
    >
      <svg width={1920} height={1080} style={{ position: "absolute" }}>
        <defs>
          <filter id="map-coast" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="map-bloom" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={3.2 * k} />
          </filter>
          <linearGradient id="map-land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2B3D6E" />
            <stop offset="100%" stopColor="#1D2A52" />
          </linearGradient>
        </defs>
        <path
          d={map.graticule}
          fill="none"
          stroke="rgba(150,180,255,0.1)"
          strokeWidth={0.8}
        />
        <path
          d={map.land}
          fill="none"
          stroke="rgba(110,160,255,0.55)"
          strokeWidth={5}
          filter="url(#map-coast)"
        />
        {map.neighbours ? <path d={map.neighbours} fill="#162142" /> : null}
        <path
          d={map.land}
          fill={map.neighbours ? "url(#map-land)" : "#1B2850"}
        />
        {map.focus ? <path d={map.focus} fill="url(#map-land)" /> : null}
        <path d={map.lakes} fill="#0A1330" />
        <path
          d={map.borders}
          fill="none"
          stroke="rgba(190,210,255,0.26)"
          strokeWidth={0.7}
        />
        {map.neighbours ? (
          <path
            d={map.neighbours}
            fill="none"
            stroke="rgba(190,210,255,0.3)"
            strokeWidth={0.7}
          />
        ) : null}
        <path
          d={map.land}
          fill="none"
          stroke="rgba(170,200,255,0.75)"
          strokeWidth={0.9}
        />
        <g filter="url(#map-bloom)" opacity={0.75}>
          {map.lights.map((l, i) => (
            <circle
              key={i}
              cx={l.x}
              cy={l.y}
              r={(1.6 + 7 * l.w) * k}
              fill="#FFD48A"
            />
          ))}
        </g>
        {map.lights.map((l, i) => (
          <circle
            key={i}
            cx={l.x}
            cy={l.y}
            r={(0.7 + 2 * l.w) * k}
            fill="#FFF3D6"
            opacity={0.6 + 0.4 * l.w}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

export const MapBaseUs: React.FC = () => <MapBase kind="us" />;
export const MapBasePacific: React.FC = () => <MapBase kind="pacific" />;
