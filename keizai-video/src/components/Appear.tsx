import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 eased progress starting at `at`. */
export const useProgress = (at: number, dur = 16) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
};

type Props = {
  /** Frame at which the element enters */
  at: number;
  /** Frame at which it leaves again (optional) */
  out?: number;
  dur?: number;
  x?: number;
  y?: number;
  scaleFrom?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

export const Appear: React.FC<Props> = ({
  at,
  out,
  dur = 16,
  x = 0,
  y = 28,
  scaleFrom = 1,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [at, at + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const exit =
    out === undefined
      ? 1
      : interpolate(frame, [out, out + 10], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  return (
    <div
      style={{
        opacity: enter * exit,
        translate: `${(1 - enter) * x}px ${(1 - enter) * y}px`,
        scale: scaleFrom + (1 - scaleFrom) * enter,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
