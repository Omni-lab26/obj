import React from "react";
import { C, FONT, yen } from "../theme";

export type ChartPoint = { label: string; value: number };

type Props = {
  width: number;
  height: number;
  points: ChartPoint[];
  yMin: number;
  yMax: number;
  /** How far the line is drawn, as a fractional point index (0 … points.length - 1) */
  progress: number;
  /** Colour of the segment that ends at point i (index 1 … n-1) */
  segmentColor: (i: number) => string;
  gridValues: number[];
  /** Dashed reference line */
  reference?: { value: number; label: string; align?: "left" | "right" };
};

const PAD = { left: 130, right: 60, top: 30, bottom: 70 };

export const LineChart: React.FC<Props> = ({
  width,
  height,
  points,
  yMin,
  yMax,
  progress,
  segmentColor,
  gridValues,
  reference,
}) => {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (innerW * i) / (points.length - 1);
  const y = (v: number) => PAD.top + innerH * (1 - (v - yMin) / (yMax - yMin));
  const baseline = PAD.top + innerH;

  const segments = points.slice(1).map((p, idx) => {
    const i = idx + 1;
    const t = Math.min(1, Math.max(0, progress - idx));
    const x1 = x(idx);
    const y1 = y(points[idx].value);
    return {
      i,
      t,
      x1,
      y1,
      x2: x1 + (x(i) - x1) * t,
      y2: y1 + (y(p.value) - y1) * t,
    };
  });
  const drawn = segments.filter((s) => s.t > 0);
  const head = drawn.length ? drawn[drawn.length - 1] : null;
  const area = head
    ? `M ${x(0)} ${baseline} L ${x(0)} ${y(points[0].value)} ` +
      drawn.map((s) => `L ${s.x2} ${s.y2}`).join(" ") +
      ` L ${head.x2} ${baseline} Z`
    : "";

  return (
    <svg width={width} height={height} style={{ fontFamily: FONT }}>
      <defs>
        <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(108,155,255,0.22)" />
          <stop offset="100%" stopColor="rgba(108,155,255,0)" />
        </linearGradient>
      </defs>
      {gridValues.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="rgba(255,255,255,0.09)"
            strokeWidth={2}
          />
          <text
            x={PAD.left - 18}
            y={y(v) + 10}
            textAnchor="end"
            fill={C.dim}
            fontSize={28}
            fontWeight={500}
          >
            {yen(v)}
          </text>
        </g>
      ))}
      {reference ? (
        <g>
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(reference.value)}
            y2={y(reference.value)}
            stroke={C.accent}
            strokeWidth={3}
            strokeDasharray="14 12"
          />
          <text
            x={reference.align === "left" ? PAD.left + 8 : width - PAD.right}
            y={y(reference.value) - 14}
            textAnchor={reference.align === "left" ? "start" : "end"}
            fill={C.accent}
            fontSize={30}
            fontWeight={800}
          >
            {reference.label}
          </text>
        </g>
      ) : null}
      {points.map((p, i) => (
        <text
          key={p.label}
          x={x(i)}
          y={height - 18}
          textAnchor="middle"
          fill={progress >= i ? C.text : C.dim}
          fontSize={32}
          fontWeight={700}
        >
          {p.label}
        </text>
      ))}
      {area ? <path d={area} fill="url(#chart-area)" /> : null}
      {drawn.map((s) => (
        <line
          key={s.i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={segmentColor(s.i)}
          strokeWidth={9}
          strokeLinecap="round"
        />
      ))}
      {points.map((p, i) =>
        progress >= i ? (
          <circle
            key={p.label}
            cx={x(i)}
            cy={y(p.value)}
            r={11}
            fill={C.bg}
            stroke={i === 0 ? C.blue : segmentColor(i)}
            strokeWidth={6}
          />
        ) : null,
      )}
      {head && head.t < 1 ? (
        <circle cx={head.x2} cy={head.y2} r={12} fill={segmentColor(head.i)} />
      ) : null}
    </svg>
  );
};

/** Pixel position of a point inside a LineChart with the same props. */
export const chartXY = (
  width: number,
  height: number,
  count: number,
  yMin: number,
  yMax: number,
  i: number,
  value: number,
) => {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  return {
    x: PAD.left + (innerW * i) / (count - 1),
    y: PAD.top + innerH * (1 - (value - yMin) / (yMax - yMin)),
  };
};
