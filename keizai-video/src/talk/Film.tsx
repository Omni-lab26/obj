import React from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
} from "remotion";
import credits from "../line/credits.json";
import "../line/fonts";
import { GraphView } from "./Graphs";
import { MapView } from "./Maps";
import { Overlay, Shot, SHOTS } from "./shots";
import { ACCENT, HOST, INK, MINCHO, NIGHT, SANS, tone, U } from "./theme";
import {
  allLines,
  CROSS,
  lineTiming,
  ShotTiming,
  shotTimings,
} from "./timeline";
import manifest from "./voice-manifest.json";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const photoCredits = credits as Record<string, string>;
const hasAudio = manifest as Record<string, number>;
const SHADOW = "0 2px 24px rgba(0,0,0,0.7), 0 0 4px rgba(0,0,0,0.55)";

/** Full-bleed photograph that drifts slowly for the whole shot. */
const Photo: React.FC<{ shot: Shot; length: number }> = ({ shot, length }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, length], [0, 1], clamp);
  const move = shot.move ?? "in";
  const scale =
    move === "in" ? 1.04 + 0.1 * p : move === "out" ? 1.14 - 0.1 * p : 1.12;
  const x =
    move === "left" ? 2.4 - 4.8 * p : move === "right" ? -2.4 + 4.8 * p : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: NIGHT }}>
      <Img
        src={staticFile(`line/photos/${shot.photo ?? "towers_pink.jpg"}`)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: shot.focus ?? "50% 50%",
          scale: String(scale),
          translate: `${x}% 0%`,
        }}
      />
    </AbsoluteFill>
  );
};

const Veil: React.FC<{ dim?: number }> = ({ dim = 0 }) => (
  <>
    <AbsoluteFill
      style={{
        background:
          "linear-gradient(180deg, rgba(6,9,20,0.4) 0%, rgba(6,9,20,0) 24%, rgba(6,9,20,0) 40%, rgba(6,9,20,0.66) 72%, rgba(6,9,20,0.9) 100%)",
      }}
    />
    {dim > 0 ? (
      <AbsoluteFill style={{ backgroundColor: `rgba(6,9,20,${dim})` }} />
    ) : null}
  </>
);

/** Three dots in the corner: one fills in for each stop already visited. */
const Trail: React.FC<{ filled: number }> = ({ filled }) => (
  <div
    style={{
      position: "absolute",
      right: 6 * U,
      top: 5 * U,
      display: "flex",
      alignItems: "center",
    }}
  >
    {[0, 1, 2].map((i) => (
      <React.Fragment key={i}>
        {i > 0 ? (
          <div
            style={{
              width: 3.4 * U,
              height: 5,
              backgroundColor: i < filled ? ACCENT : "rgba(255,255,255,0.4)",
            }}
          />
        ) : null}
        <div
          style={{
            width: 1.8 * U,
            height: 1.8 * U,
            borderRadius: "50%",
            border: `4px solid ${i < filled ? ACCENT : INK}`,
            boxSizing: "border-box",
            backgroundColor: i < filled ? ACCENT : "transparent",
          }}
        />
      </React.Fragment>
    ))}
  </div>
);

const Tag: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      position: "absolute",
      left: 7 * U,
      top: 4.4 * U,
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: 30,
      letterSpacing: "0.08em",
      color: NIGHT,
      backgroundColor: ACCENT,
      padding: "8px 22px",
      borderRadius: 10,
    }}
  >
    {text}
  </div>
);

const Credit: React.FC<{ photo: string }> = ({ photo }) =>
  photoCredits[photo] ? (
    <div
      style={{
        position: "absolute",
        right: 3 * U,
        bottom: 2 * U,
        fontFamily: SANS,
        fontSize: 19,
        color: "rgba(255,255,255,0.55)",
        textShadow: "0 1px 6px rgba(0,0,0,0.6)",
      }}
    >
      写真：{photoCredits[photo]}
    </div>
  ) : null;

/** A single large word or number in colour, with the source underneath. */
const Big: React.FC<{
  o: Extract<Overlay, { kind: "big" }>;
  shotStart: number;
}> = ({ o, shotStart }) => {
  const frame = useCurrentFrame();
  const at = lineTiming(o.at).start - shotStart + (o.delay ?? 0);
  const p = interpolate(frame, [at, at + 22], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  const color = tone(o.tone);
  return (
    <>
      <AbsoluteFill
        style={{
          opacity: p,
          background:
            "linear-gradient(270deg, rgba(6,9,20,0.9) 0%, rgba(6,9,20,0.74) 42%, rgba(6,9,20,0) 78%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 8 * U,
          top: (o.top ?? 13) * U,
          textAlign: "right",
          color: INK,
          opacity: p,
          translate: `0px ${(1 - p) * 24}px`,
          textShadow: SHADOW,
        }}
      >
        {o.lead ? (
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44 }}>
            {o.lead}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: (o.size ?? 15) * U,
            lineHeight: 1.12,
            letterSpacing: "0.03em",
            color,
            whiteSpace: "nowrap",
          }}
        >
          {o.text}
          {o.unit ? (
            <span style={{ fontSize: "0.38em", marginLeft: "0.1em" }}>
              {o.unit}
            </span>
          ) : null}
        </div>
        <div
          style={{
            height: 14,
            marginTop: 10,
            marginLeft: "auto",
            borderRadius: 7,
            backgroundColor: color,
            width: `${interpolate(frame, [at + 8, at + 34], [0, 100], { ...clamp, easing: EASE })}%`,
          }}
        />
        {o.caption ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 27,
              marginTop: 16,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {o.caption}
          </div>
        ) : null}
      </div>
    </>
  );
};

/** Chapter card: the stop number on a block of the host colour. */
const Chapter: React.FC<{ o: Extract<Overlay, { kind: "chapter" }> }> = ({
  o,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill
      style={{ justifyContent: "center", paddingLeft: 9 * U, color: INK }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4 * U,
          opacity: p,
          translate: `${(1 - p) * -40}px 0px`,
        }}
      >
        {o.no ? (
          <div
            style={{
              width: 19 * U,
              height: 19 * U,
              borderRadius: 2.4 * U,
              backgroundColor: ACCENT,
              color: NIGHT,
              fontFamily: MINCHO,
              fontWeight: 800,
              fontSize: 15 * U,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {o.no}
          </div>
        ) : (
          <div
            style={{
              width: 1.4 * U,
              height: 17 * U,
              borderRadius: U,
              backgroundColor: ACCENT,
              flexShrink: 0,
            }}
          />
        )}
        <div style={{ textShadow: SHADOW }}>
          {o.kicker ? (
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 3 * U,
                letterSpacing: "0.2em",
                color: ACCENT,
                marginBottom: 0.6 * U,
              }}
            >
              {o.kicker}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: MINCHO,
              fontWeight: 800,
              fontSize: 8 * U,
              lineHeight: 1.35,
              whiteSpace: "pre-line",
            }}
          >
            {o.title}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Who is hosting today. */
const HostCard: React.FC<{
  o: Extract<Overlay, { kind: "host" }>;
  shotStart: number;
}> = ({ o, shotStart }) => {
  const frame = useCurrentFrame();
  const at = lineTiming(o.at).start - shotStart + (o.delay ?? 0);
  const p = interpolate(frame, [at, at + 22], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  return (
    <div
      style={{
        position: "absolute",
        right: 7 * U,
        top: 12 * U,
        opacity: p,
        translate: `${(1 - p) * 60}px 0px`,
        backgroundColor: ACCENT,
        color: NIGHT,
        borderRadius: 2 * U,
        padding: `${1.6 * U}px ${3 * U}px ${2 * U}px`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: "0.16em",
        }}
      >
        今日の担当
      </div>
      <div
        style={{
          fontFamily: MINCHO,
          fontWeight: 800,
          fontSize: 7.4 * U,
          lineHeight: 1.2,
        }}
      >
        {HOST.name}
      </div>
    </div>
  );
};

const EndCard: React.FC<{ shotStart: number }> = ({ shotStart }) => {
  const frame = useCurrentFrame();
  const at = lineTiming("g06").start - shotStart;
  const p = interpolate(frame, [at, at + 30], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  const photos = SHOTS.flatMap((s) => (s.photo && !s.map ? [s.photo] : []));
  const used = Array.from(new Set(photos.map((f) => photoCredits[f])))
    .filter(Boolean)
    .join("　／　");
  return (
    <AbsoluteFill style={{ color: INK, textShadow: SHADOW }}>
      <div
        style={{ position: "absolute", left: 7 * U, top: 12 * U, opacity: p }}
      >
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: 11 * U,
            lineHeight: 1.1,
          }}
        >
          Halftick
        </div>
        <div
          style={{
            display: "inline-block",
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 3.2 * U,
            marginTop: 1.4 * U,
            color: NIGHT,
            backgroundColor: ACCENT,
            padding: "6px 24px",
            borderRadius: 10,
            textShadow: "none",
          }}
        >
          バラバラのニュースを、1本の線に。
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 7 * U,
          right: 7 * U,
          bottom: 3 * U,
          fontFamily: SANS,
          fontSize: 15,
          lineHeight: 1.55,
          color: "rgba(255,255,255,0.72)",
          opacity: p,
        }}
      >
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.9)" }}>
          {
            "※この動画は特定の金融商品の売買を勧めるものではありません。　※写真は資料写真で、ニュースの現場を写したものではありません。"
          }
        </div>
        <div style={{ marginTop: 6 }}>
          {"音声：" + HOST.credit + "　／　地図：Natural Earth　／　写真："}
          {used}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ShotView: React.FC<{ shot: Shot; timing: ShotTiming }> = ({
  shot,
  timing,
}) => {
  const frame = useCurrentFrame();
  const o = shot.overlay;
  const opacity =
    timing.index === 0
      ? interpolate(frame, [0, 24], [0, 1], clamp)
      : interpolate(frame, [0, CROSS], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity }}>
      {shot.map ? (
        <MapView
          spec={shot.map}
          length={timing.duration + CROSS}
          shotStart={timing.start}
        />
      ) : (
        <Photo shot={shot} length={timing.duration + CROSS} />
      )}
      <Veil dim={shot.dim} />
      {shot.tag ? <Tag text={shot.tag} /> : null}
      {shot.trail !== undefined ? <Trail filled={shot.trail} /> : null}
      {o?.kind === "big" ? <Big o={o} shotStart={timing.start} /> : null}
      {o?.kind === "graph" ? (
        <GraphView graph={o.graph} shotStart={timing.start} />
      ) : null}
      {o?.kind === "chapter" ? <Chapter o={o} /> : null}
      {o?.kind === "host" ? <HostCard o={o} shotStart={timing.start} /> : null}
      {o?.kind === "end" ? <EndCard shotStart={timing.start} /> : null}
      {shot.map || !shot.photo || o?.kind === "end" ? null : (
        <Credit photo={shot.photo} />
      )}
    </AbsoluteFill>
  );
};

/** The spoken sentence, a phrase at a time. Words wrapped in *asterisks* take the host colour. */
const Phrase: React.FC<{ text: string; length: number; high?: boolean }> = ({
  text,
  length,
  high,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      lang="ja"
      style={{
        position: "absolute",
        left: 7 * U,
        right: 16 * U,
        bottom: (high ? 21 : 6.4) * U,
        fontFamily: MINCHO,
        fontWeight: 500,
        fontSize: 5.2 * U,
        lineHeight: 1.5,
        color: INK,
        textShadow: SHADOW,
        wordBreak: "auto-phrase",
        textWrap: "balance",
        opacity: interpolate(
          frame,
          [0, 5, length - 4, length],
          [0, 1, 1, 0],
          clamp,
        ),
      }}
    >
      {text.split("*").map((part, i) =>
        i % 2 === 1 ? (
          <span
            key={i}
            style={{
              color: ACCENT,
              fontWeight: 800,
              // short highlights stay on one line
              whiteSpace: part.length <= 8 ? "nowrap" : undefined,
            }}
          >
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </div>
  );
};

/** Soft grain and vignette so the stills feel filmed rather than pasted. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  return (
    <>
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.16 }}>
        <Img
          src={staticFile("line/grain.jpg")}
          style={{
            position: "absolute",
            width: 2100,
            height: 1200,
            maxWidth: "none",
            left: -((step * 37) % 170),
            top: -((step * 53) % 110),
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3) 100%)",
        }}
      />
    </>
  );
};

const silent = new Set(
  SHOTS.flatMap((s) => (s.overlay?.kind === "chapter" ? s.lines : [])),
);
const raised = new Set(
  SHOTS.flatMap((s) => (s.overlay?.kind === "end" ? s.lines : [])),
);

export const TalkFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: NIGHT }}>
      {shotTimings.map((timing) => (
        <Sequence
          key={timing.index}
          name={`Shot ${timing.index + 1}`}
          from={timing.start}
          durationInFrames={timing.duration + CROSS}
        >
          <ShotView shot={SHOTS[timing.index]} timing={timing} />
        </Sequence>
      ))}
      <Grain />
      {allLines().map((line) => (
        <React.Fragment key={line.id}>
          {hasAudio[line.id] ? (
            <Sequence
              name={`Voice ${line.id}`}
              from={line.start}
              durationInFrames={line.duration + 15}
              layout="none"
            >
              <Audio src={staticFile(`talk/voice/${line.id}.m4a`)} />
            </Sequence>
          ) : null}
          {silent.has(line.id)
            ? null
            : line.chunks.map((chunk) => (
                <Sequence
                  key={chunk.from}
                  name={`Sub ${line.id}`}
                  from={chunk.from}
                  durationInFrames={chunk.to - chunk.from}
                >
                  <Phrase
                    text={chunk.text}
                    length={chunk.to - chunk.from}
                    high={raised.has(line.id)}
                  />
                </Sequence>
              ))}
        </React.Fragment>
      ))}
    </AbsoluteFill>
  );
};
