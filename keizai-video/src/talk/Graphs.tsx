import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import {
  ACCENT,
  COOL,
  DOWN,
  INK,
  MINCHO,
  NIGHT,
  SANS,
  Tone,
  tone,
  U,
} from "./theme";
import { EN, t as tr } from "./lang";
import { lineTiming } from "./timeline";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Graph =
  | {
      kind: "dots";
      at: string;
      delay?: number;
      title: string;
      /** How many of the 100 dots are lit */
      value: number;
      source: string;
    }
  | {
      kind: "grid";
      at: string;
      delay?: number;
      title: string;
      total: number;
      on: number;
      unit: string;
      /** Points out the one cell that stays unlit, from this line on */
      odd?: {
        /** The cell is ringed when this line asks about it … */
        ask: string;
        askDelay?: number;
        /** … and named when this line answers */
        at: string;
        delay?: number;
        label: string;
      };
      source: string;
    }
  | {
      /** A side note: a term explained, or another point of view */
      kind: "note";
      at: string;
      delay?: number;
      /** Pill above the title ("ちなみに" unless given) */
      label?: string;
      title: string;
      /** Lines without `at` sit above the number; lines with one appear below it, on cue */
      body?: { text: string; at?: string; delay?: number }[];
      /** A row of dated points; the one marked `on` takes the host colour */
      timeline?: { label: string; note: string; on?: boolean }[];
      stat?: {
        at: string;
        delay?: number;
        lead?: string;
        text: string;
        unit?: string;
        tone?: Tone;
      };
      source?: string;
    }
  | {
      kind: "people";
      at: string;
      delay?: number;
      title: string;
      total: number;
      on: number;
      label: string;
      source: string;
    }
  | {
      kind: "bars";
      title: string;
      /** Value that fills the whole bar track */
      max: number;
      rows: {
        label: string;
        value: number;
        text: string;
        tone: Tone;
        /** The bar grows when this line starts … */
        at: string;
        delay?: number;
        /** … and the row is shown as a question mark from this earlier line */
        ask?: string;
      }[];
      note?: { at: string; delay?: number; text: string };
      source: string;
    }
  | {
      kind: "line";
      at: string;
      delay?: number;
      title: string;
      /** Draw only the first n points */
      points: number;
      /** Label for the fall into 11/6 */
      drop?: string;
      /** Label for the climb after it */
      rebound?: string;
      source: string;
    };

const cue = (id: string, shotStart: number, delay = 0) =>
  lineTiming(id).start - shotStart + delay;

/** Dark plate on the right that the charts sit on. */
const Panel: React.FC<{
  at: number;
  width: number;
  title: string;
  source?: string;
  /** Pill above the title; side notes use it */
  label?: string;
  edge?: string;
  children: React.ReactNode;
}> = ({ at, width, title, source, label, edge = ACCENT, children }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 20], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  return (
    <div
      style={{
        position: "absolute",
        right: 6 * U,
        top: 9.5 * U,
        width,
        boxSizing: "border-box",
        padding: "34px 44px 30px",
        borderRadius: 30,
        backgroundColor: "rgba(9,13,28,0.9)",
        border: "2px solid rgba(255,255,255,0.16)",
        borderTop: `12px solid ${edge}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        opacity: p,
        translate: `${(1 - p) * 60}px 0px`,
        color: INK,
      }}
    >
      {label ? (
        <div
          style={{
            display: "inline-block",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 26,
            letterSpacing: "0.1em",
            color: NIGHT,
            backgroundColor: edge,
            padding: "4px 18px",
            borderRadius: 8,
            marginBottom: 14,
          }}
        >
          {tr(label)}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 36,
          lineHeight: 1.35,
        }}
      >
        {tr(title)}
      </div>
      {children}
      {source ? (
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 500,
            fontSize: 23,
            color: "rgba(255,255,255,0.66)",
            marginTop: 18,
          }}
        >
          {tr(source)}
        </div>
      ) : null}
    </div>
  );
};

const Dots: React.FC<{
  g: Extract<Graph, { kind: "dots" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const at = cue(g.at, shotStart, g.delay);
  const lit = interpolate(frame, [at + 14, at + 74], [0, g.value], clamp);
  return (
    <Panel at={at} width={980} title={g.title} source={g.source}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          marginTop: 22,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(20, 20px)",
            gap: 8,
          }}
        >
          {new Array(100).fill(0).map((_, i) => (
            <div
              key={i}
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: i < lit ? ACCENT : "rgba(255,255,255,0.16)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: 150,
            lineHeight: 1,
            color: ACCENT,
            whiteSpace: "nowrap",
          }}
        >
          {Math.round(lit)}
          <span style={{ fontSize: 64 }}>%</span>
        </div>
      </div>
    </Panel>
  );
};

const Grid: React.FC<{
  g: Extract<Graph, { kind: "grid" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const at = cue(g.at, shotStart, g.delay);
  const lit = interpolate(frame, [at + 14, at + 64], [0, g.on], clamp);
  const ringAt = g.odd ? cue(g.odd.ask, shotStart, g.odd.askDelay) : Infinity;
  const ring = interpolate(frame, [ringAt, ringAt + 16], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  const oddAt = g.odd ? cue(g.odd.at, shotStart, g.odd.delay) : Infinity;
  const odd = interpolate(frame, [oddAt, oddAt + 16], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  return (
    <Panel at={at} width={1010} title={g.title} source={g.source}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          marginTop: 22,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(9, 38px)",
            gap: 9,
          }}
        >
          {new Array(g.total).fill(0).map((_, i) => (
            <div
              key={i}
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                boxSizing: "border-box",
                backgroundColor: i < lit ? ACCENT : "transparent",
                border: `3px solid ${i < lit ? ACCENT : i >= g.on && ring > 0.5 ? COOL : "rgba(255,255,255,0.4)"}`,
                scale: i >= g.on ? String(1 + 0.2 * ring) : undefined,
              }}
            />
          ))}
        </div>
        <div
          style={{ fontFamily: MINCHO, fontWeight: 800, whiteSpace: "nowrap" }}
        >
          <span style={{ fontSize: 170, lineHeight: 1, color: ACCENT }}>
            {Math.round(lit)}
          </span>
          <span style={{ fontSize: 50, marginLeft: 12 }}>
            / {g.total}
            {tr(g.unit)}
          </span>
        </div>
      </div>
      {g.odd ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginTop: 20,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 32,
            color: COOL,
            opacity: odd,
            translate: `0px ${(1 - odd) * 12}px`,
          }}
        >
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              boxSizing: "border-box",
              border: `3px solid ${COOL}`,
              flexShrink: 0,
            }}
          />
          {tr(g.odd.label)}
        </div>
      ) : null}
    </Panel>
  );
};

/** "By the way": a term in one sentence, optionally with one number. */
const Note: React.FC<{
  g: Extract<Graph, { kind: "note" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const at = cue(g.at, shotStart, g.delay);
  const show = (from: number) =>
    interpolate(frame, [from, from + 18], [0, 1], { ...clamp, easing: EASE });
  const statAt = g.stat ? cue(g.stat.at, shotStart, g.stat.delay) : 0;
  const stat = g.stat ? show(statAt) : 0;
  const color = tone(g.stat?.tone);
  const above = (g.body ?? []).filter((b) => !b.at);
  const below = (g.body ?? []).filter((b) => b.at);
  const line = (
    b: { text: string; at?: string; delay?: number },
    i: number,
  ) => {
    const p = show(b.at ? cue(b.at, shotStart, b.delay) : at + 10 + i * 8);
    return (
      <div
        key={b.text}
        style={{
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 34,
          lineHeight: 1.5,
          marginTop: b.at ? 16 : i === 0 ? 10 : 6,
          opacity: p,
          translate: `0px ${(1 - p) * 12}px`,
          wordBreak: "auto-phrase",
        }}
      >
        {tr(b.text)}
      </div>
    );
  };
  return (
    <Panel
      at={at}
      width={900}
      title={g.title}
      source={g.source}
      label={g.label ?? "ちなみに"}
      edge={INK}
    >
      {above.map(line)}
      {g.timeline ? (
        <div
          style={{
            display: "flex",
            marginTop: 26,
            opacity: show(at + 16),
          }}
        >
          {g.timeline.map((pt, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div
                style={{
                  position: "relative",
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: i === 0 ? "50%" : 0,
                    right: i === g.timeline!.length - 1 ? "50%" : 0,
                    height: 5,
                    backgroundColor: "rgba(255,255,255,0.4)",
                  }}
                />
                <div
                  style={{
                    position: "relative",
                    width: pt.on ? 34 : 22,
                    height: pt.on ? 34 : 22,
                    borderRadius: "50%",
                    backgroundColor: pt.on ? ACCENT : INK,
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: MINCHO,
                  fontWeight: 800,
                  fontSize: 44,
                  marginTop: 8,
                  color: pt.on ? ACCENT : INK,
                }}
              >
                {tr(pt.label)}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 28,
                  color: pt.on ? ACCENT : "rgba(255,255,255,0.8)",
                }}
              >
                {tr(pt.note)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {g.stat ? (
        <div
          style={{
            marginTop: 20,
            paddingTop: 18,
            borderTop: "2px solid rgba(255,255,255,0.2)",
            opacity: stat,
            translate: `0px ${(1 - stat) * 14}px`,
          }}
        >
          {g.stat.lead ? (
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30 }}>
              {tr(g.stat.lead)}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: MINCHO,
              fontWeight: 800,
              fontSize: EN ? 96 : 118,
              lineHeight: 1.15,
              color,
              whiteSpace: "nowrap",
            }}
          >
            {tr(g.stat.text)}
            {g.stat.unit ? (
              <span style={{ fontSize: "0.42em", marginLeft: "0.12em" }}>
                {tr(g.stat.unit)}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
      {below.map(line)}
    </Panel>
  );
};

const People: React.FC<{
  g: Extract<Graph, { kind: "people" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const at = cue(g.at, shotStart, g.delay);
  return (
    <Panel at={at} width={960} title={g.title} source={g.source}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 22,
          marginTop: 26,
        }}
      >
        {new Array(g.total).fill(0).map((_, i) => {
          const on = i < g.on;
          const p = interpolate(
            frame,
            [at + 14 + i * 6, at + 30 + i * 6],
            [0, 1],
            {
              ...clamp,
              easing: EASE,
            },
          );
          const fill = on ? ACCENT : "rgba(255,255,255,0.22)";
          return (
            <svg
              key={i}
              width={84}
              height={145}
              style={{ opacity: p, scale: String(0.8 + 0.2 * p) }}
              viewBox="0 0 110 190"
            >
              <circle cx={55} cy={40} r={34} fill={fill} />
              <path
                d="M10 190 C10 110 30 88 55 88 C80 88 100 110 100 190 Z"
                fill={fill}
              />
            </svg>
          );
        })}
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: 76,
            lineHeight: 1.1,
            color: ACCENT,
            marginLeft: 18,
            whiteSpace: "nowrap",
          }}
        >
          {tr(g.label)}
        </div>
      </div>
    </Panel>
  );
};

const Bars: React.FC<{
  g: Extract<Graph, { kind: "bars" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const first = Math.min(
    ...g.rows.map((r) => cue(r.ask ?? r.at, shotStart, r.ask ? 0 : r.delay)),
  );
  const TRACK = 340; // sized so neither bar is squeezed by its row
  return (
    <Panel at={first - 6} width={1010} title={g.title} source={g.source}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 26,
          marginTop: 28,
        }}
      >
        {g.rows.map((row) => {
          const shown = cue(
            row.ask ?? row.at,
            shotStart,
            row.ask ? 0 : row.delay,
          );
          const grow = cue(row.at, shotStart, row.delay);
          const visible = interpolate(
            frame,
            [shown, shown + 14],
            [0, 1],
            clamp,
          );
          const p = interpolate(frame, [grow, grow + 30], [0, 1], {
            ...clamp,
            easing: EASE,
          });
          const color = tone(row.tone);
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                opacity: visible,
              }}
            >
              <div
                style={{
                  width: EN ? 250 : 200,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 40,
                }}
              >
                {tr(row.label)}
              </div>
              <div
                style={{
                  width: Math.max(8, (row.value / g.max) * TRACK * p),
                  flexShrink: 0,
                  height: 64,
                  borderRadius: 10,
                  backgroundColor: p > 0 ? color : "rgba(255,255,255,0.25)",
                }}
              />
              <div
                style={{
                  fontFamily: MINCHO,
                  fontWeight: 800,
                  fontSize: 86,
                  lineHeight: 1,
                  color: p > 0 ? color : INK,
                  whiteSpace: "nowrap",
                }}
              >
                {p > 0 ? row.text : "？"}
              </div>
            </div>
          );
        })}
      </div>
      {g.note ? (
        <div
          style={{
            marginTop: 26,
            display: "inline-block",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 38,
            color: "#0A0F1F",
            backgroundColor: ACCENT,
            padding: "6px 22px",
            borderRadius: 10,
            opacity: interpolate(
              frame,
              [
                cue(g.note.at, shotStart, g.note.delay),
                cue(g.note.at, shotStart, g.note.delay) + 16,
              ],
              [0, 1],
              clamp,
            ),
          }}
        >
          {tr(g.note.text)}
        </div>
      ) : null}
    </Panel>
  );
};

// Nikkei 225 closes. Sources: Nikkei, Monex, Kabutan (to 2026-11-12).
const CLOSES = [
  { d: "10/30", v: 63290.11 },
  { d: "11/2", v: 63081.86 },
  { d: "11/4", v: 62188.63 },
  { d: "11/5", v: 61077.9 },
  { d: "11/6", v: 57434.77 },
  { d: "11/9", v: 58775.5 },
  { d: "11/10", v: 60459.58 },
  { d: "11/11", v: 61248.59 },
  { d: "11/12", v: 60819.36 },
];

const Line: React.FC<{
  g: Extract<Graph, { kind: "line" }>;
  shotStart: number;
}> = ({ g, shotStart }) => {
  const frame = useCurrentFrame();
  const at = cue(g.at, shotStart, g.delay);
  const pts = CLOSES.slice(0, g.points);
  const W = 900;
  const H = 400;
  const pad = { l: 52, r: 40, t: 30, b: 56 };
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) * i) / (pts.length - 1);
  const y = (v: number) =>
    pad.t + (H - pad.t - pad.b) * (1 - (v - 56500) / (64200 - 56500));
  const progress = interpolate(
    frame,
    [at + 12, at + 12 + pts.length * 11],
    [0, pts.length - 1],
    clamp,
  );
  const segColor = (i: number) => (i === 4 ? DOWN : i > 4 ? ACCENT : "#C9D4F0");
  const done = progress >= pts.length - 1 - 0.001;
  return (
    <Panel at={at} width={1000} title={g.title} source={g.source}>
      <svg width={W} height={H} style={{ marginTop: 10, display: "block" }}>
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(60000)}
          y2={y(60000)}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={2}
          strokeDasharray="8 10"
        />
        <text
          x={pad.l + 4}
          y={y(60000) - 10}
          fontFamily={SANS}
          fontWeight={700}
          fontSize={24}
          fill="rgba(255,255,255,0.8)"
        >
          {tr("6万円")}
        </text>
        {pts.slice(1).map((pt, idx) => {
          const i = idx + 1;
          const t = Math.min(1, Math.max(0, progress - idx));
          if (t <= 0) return null;
          const x1 = x(idx);
          const y1 = y(pts[idx].v);
          return (
            <line
              key={pt.d}
              x1={x1}
              y1={y1}
              x2={x1 + (x(i) - x1) * t}
              y2={y1 + (y(pt.v) - y1) * t}
              stroke={segColor(i)}
              strokeWidth={i === 4 ? 12 : 8}
              strokeLinecap="round"
            />
          );
        })}
        {pts.map((pt, i) =>
          progress >= i ? (
            <g key={pt.d}>
              <circle
                cx={x(i)}
                cy={y(pt.v)}
                r={9}
                fill="#0A0F1F"
                stroke={i === 0 ? "#C9D4F0" : segColor(i)}
                strokeWidth={5}
              />
            </g>
          ) : null,
        )}
        {pts.map((pt, i) => (
          <text
            key={pt.d}
            x={x(i)}
            y={H - 14}
            textAnchor="middle"
            fontFamily={SANS}
            fontWeight={700}
            fontSize={24}
            fill={progress >= i ? INK : "rgba(255,255,255,0.4)"}
          >
            {pt.d}
          </text>
        ))}
        {g.drop && progress >= 4 ? (
          <text
            x={x(4) - 44 - (x(4) - x(3)) * 0.45}
            y={y(pts[4].v) + 12}
            textAnchor="end"
            fontFamily={MINCHO}
            fontWeight={800}
            fontSize={EN ? 50 : 60}
            fill={DOWN}
            opacity={interpolate(progress, [3.5, 4], [0, 1], clamp)}
          >
            {tr(g.drop)}
          </text>
        ) : null}
        {g.rebound && done ? (
          <text
            x={W - pad.r}
            y={y(pts[4].v) + 12}
            textAnchor="end"
            fontFamily={MINCHO}
            fontWeight={800}
            fontSize={EN ? 50 : 60}
            fill={ACCENT}
          >
            {tr(g.rebound)}
          </text>
        ) : null}
      </svg>
    </Panel>
  );
};

export const GraphView: React.FC<{ graph: Graph; shotStart: number }> = ({
  graph,
  shotStart,
}) => {
  switch (graph.kind) {
    case "dots":
      return <Dots g={graph} shotStart={shotStart} />;
    case "grid":
      return <Grid g={graph} shotStart={shotStart} />;
    case "note":
      return <Note g={graph} shotStart={shotStart} />;
    case "people":
      return <People g={graph} shotStart={shotStart} />;
    case "bars":
      return <Bars g={graph} shotStart={shotStart} />;
    case "line":
      return <Line g={graph} shotStart={shotStart} />;
  }
};

export const COLORS = { ACCENT, COOL, DOWN };
