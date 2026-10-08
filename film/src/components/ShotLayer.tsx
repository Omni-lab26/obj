import {AbsoluteFill, interpolate, OffthreadVideo, staticFile, useCurrentFrame} from "remotion";
import type {Shot} from "../edl";
import {Placeholder} from "./Placeholder";

const clamp = {extrapolateLeft: "clamp", extrapolateRight: "clamp"} as const;

export const ShotLayer: React.FC<{shot: Shot; res: "1080" | "2160"}> = ({shot, res}) => {
  const frame = useCurrentFrame();
  const {dur, fade_in: fi, fade_out: fo, move} = shot;

  const delay = shot.fade_delay ?? 0;
  const opacityIn = fi > 0 ? interpolate(frame, [delay, delay + fi], [0, 1], clamp) : 1;
  const opacityOut = fo > 0 ? interpolate(frame, [dur - fo, dur], [1, 0], clamp) : 1;

  // 静的な画にだけ、ごくわずかな寄り・パンを付ける（selects.json の move で指定）
  const p = interpolate(frame, [0, dur], [0, 1], clamp);
  const lerp = (r?: [number, number], d = 0) => (r ? r[0] + (r[1] - r[0]) * p : d);
  const transform = move
    ? `translate(${lerp(move.x)}%, ${lerp(move.y)}%) scale(${lerp(move.scale, 1)})`
    : undefined;

  return (
    <AbsoluteFill style={{opacity: opacityIn * opacityOut}}>
      {shot.clip ? (
        <AbsoluteFill style={{transform}}>
          <OffthreadVideo
            src={staticFile(`${shot.clip}_${res}.mp4`)}
            trimBefore={shot.clip_trim}
            muted
            style={{width: "100%", height: "100%", objectFit: "cover"}}
          />
        </AbsoluteFill>
      ) : (
        <Placeholder shot={shot} />
      )}
    </AbsoluteFill>
  );
};
