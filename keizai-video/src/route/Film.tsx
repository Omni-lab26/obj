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
import { INK, MINCHO, SANS, U, WARM } from "../line/theme";
import { MapView } from "./Maps";
import { Overlay, Shot, SHOTS } from "./shots";
import {
  allLines,
  CROSS,
  lineTiming,
  ShotTiming,
  shotTimings,
} from "./timeline";
import manifest from "./voice-manifest.json";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;
const photoCredits = credits as Record<string, string>;
const hasAudio = manifest as Record<string, number>;
const SHADOW = "0 2px 24px rgba(0,0,0,0.65), 0 0 4px rgba(0,0,0,0.5)";

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
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0c0c0c" }}>
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
          "linear-gradient(180deg, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.62) 72%, rgba(0,0,0,0.86) 100%)",
      }}
    />
    {dim > 0 ? (
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${dim})` }} />
    ) : null}
  </>
);

/** Three dots in the corner: one fills in each time a chapter adds a point to the line. */
const Trail: React.FC<{ filled: number }> = ({ filled }) => (
  <div
    style={{
      position: "absolute",
      right: 6 * U,
      top: 5.4 * U,
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
              height: 4,
              backgroundColor: i < filled ? INK : "rgba(255,255,255,0.4)",
            }}
          />
        ) : null}
        <div
          style={{
            width: 1.6 * U,
            height: 1.6 * U,
            borderRadius: "50%",
            border: `4px solid ${INK}`,
            boxSizing: "border-box",
            backgroundColor: i < filled ? INK : "transparent",
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
      top: 5 * U,
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 32,
      letterSpacing: "0.14em",
      color: "rgba(255,255,255,0.94)",
      textShadow: SHADOW,
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

/** A single large word or number, with the source underneath. */
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
  return (
    <>
      <AbsoluteFill
        style={{
          opacity: p,
          background:
            "linear-gradient(270deg, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.7) 42%, rgba(0,0,0,0) 76%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 9 * U,
          top: (o.top ?? 15) * U,
          textAlign: "right",
          color: INK,
          opacity: p,
          translate: `0px ${(1 - p) * 24}px`,
          textShadow: SHADOW,
        }}
      >
        {o.lead ? (
          <div style={{ fontFamily: MINCHO, fontWeight: 500, fontSize: 60 }}>
            {o.lead}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: (o.size ?? 15) * U,
            lineHeight: 1.1,
            letterSpacing: "0.04em",
            color: o.warm ? WARM : INK,
            whiteSpace: "nowrap",
          }}
        >
          {o.text}
          {o.unit ? (
            <span style={{ fontSize: "0.36em", marginLeft: "0.1em" }}>
              {o.unit}
            </span>
          ) : null}
        </div>
        {o.caption ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 500,
              fontSize: 28,
              marginTop: 14,
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

const Triptych: React.FC<{ o: Extract<Overlay, { kind: "tri" }> }> = ({
  o,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 8,
        backgroundColor: "#EFEAE0",
      }}
    >
      {o.items.map((item, i) => {
        const p = interpolate(frame, [i * 16, i * 16 + 30], [0, 1], {
          ...clamp,
          easing: EASE,
        });
        const drift = interpolate(frame, [0, 400], [1.04, 1.14], clamp);
        return (
          <div
            key={item.photo}
            style={{
              position: "relative",
              overflow: "hidden",
              backgroundColor: "#111",
            }}
          >
            <Img
              src={staticFile(`line/photos/${item.photo}`)}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: item.focus ?? "50% 50%",
                transformOrigin: item.origin ?? "50% 50%",
                translate: `0% ${(1 - p) * 100}%`,
                scale: String(drift * (item.zoom ?? 1)),
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 2.2 * U,
                top: 2.6 * U,
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 33,
                letterSpacing: "0.1em",
                color: INK,
                backgroundColor: "rgba(0,0,0,0.58)",
                padding: "6px 18px",
                borderRadius: 6,
                opacity: p,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const Chapter: React.FC<{ o: Extract<Overlay, { kind: "chapter" }> }> = ({
  o,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [8, 34], [0, 1], { ...clamp, easing: EASE });
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        paddingLeft: 9 * U,
        color: INK,
        textShadow: SHADOW,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4 * U,
          opacity: p,
          translate: `0px ${(1 - p) * 30}px`,
        }}
      >
        <div
          style={{
            fontFamily: MINCHO,
            fontWeight: 800,
            fontSize: 22 * U,
            lineHeight: 1,
            color: WARM,
          }}
        >
          {o.no}
        </div>
        <div>
          {o.kicker ? (
            <div
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 2.6 * U,
                letterSpacing: "0.2em",
                color: WARM,
                marginBottom: 0.6 * U,
              }}
            >
              {o.kicker}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: MINCHO,
              fontWeight: 500,
              fontSize: 7.4 * U,
              lineHeight: 1.4,
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

const EndCard: React.FC<{ shotStart: number }> = ({ shotStart }) => {
  const frame = useCurrentFrame();
  const at = lineTiming("g06").start - shotStart;
  const p = interpolate(frame, [at, at + 30], [0, 1], {
    ...clamp,
    easing: EASE,
  });
  const photos = SHOTS.flatMap((s) =>
    s.overlay?.kind === "tri"
      ? s.overlay.items.map((i) => i.photo)
      : s.photo && !s.map
        ? [s.photo]
        : [],
  );
  const used = Array.from(new Set(photos.map((f) => photoCredits[f])))
    .filter(Boolean)
    .join("　／　");
  return (
    <AbsoluteFill style={{ color: INK, textShadow: SHADOW }}>
      <div
        style={{
          position: "absolute",
          left: 7 * U,
          top: 13 * U,
          opacity: p,
        }}
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
            fontFamily: MINCHO,
            fontWeight: 500,
            fontSize: 3.6 * U,
            marginTop: 1.4 * U,
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
          {
            "音声：Style-Bert-VITS2（JVNVコーパス）　／　地図：Natural Earth　／　写真："
          }
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
      ) : o?.kind === "tri" ? (
        <Triptych o={o} />
      ) : (
        <Photo shot={shot} length={timing.duration + CROSS} />
      )}
      <Veil dim={shot.dim} />
      {shot.tag ? <Tag text={shot.tag} /> : null}
      {shot.trail !== undefined ? <Trail filled={shot.trail} /> : null}
      {o?.kind === "big" ? <Big o={o} shotStart={timing.start} /> : null}
      {o?.kind === "chapter" ? <Chapter o={o} /> : null}
      {o?.kind === "end" ? <EndCard shotStart={timing.start} /> : null}
      {shot.map ||
      !shot.photo ||
      o?.kind === "tri" ||
      o?.kind === "end" ? null : (
        <Credit photo={shot.photo} />
      )}
    </AbsoluteFill>
  );
};

/** The spoken sentence, a phrase at a time. */
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
      {text}
    </div>
  );
};

/** Soft grain and vignette so the stills feel filmed rather than pasted. */
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  const step = Math.floor(frame / 2);
  return (
    <>
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.2 }}>
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
            "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.34) 100%)",
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

export const Film: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0c0c0c" }}>
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
              <Audio src={staticFile(`route/voice/${line.id}.m4a`)} />
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
