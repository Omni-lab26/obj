import {Composition} from "remotion";
import {Film} from "./Film";
import {edl} from "./edl";
import "./fonts";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 1920x1080 本編。尺・fps は src/data/edl.json（scripts/build_edl.py が生成）に従う */}
      <Composition
        id="Film"
        component={Film}
        durationInFrames={edl.durationInFrames}
        fps={edl.fps}
        width={1920}
        height={1080}
        defaultProps={{res: "1080" as const, withAudio: true}}
      />
      {/* 4K 版。public/clips/*_2160.mp4 が全ショット分そろっているときだけ書き出す */}
      <Composition
        id="Film4K"
        component={Film}
        durationInFrames={edl.durationInFrames}
        fps={edl.fps}
        width={3840}
        height={2160}
        defaultProps={{res: "2160" as const, withAudio: true}}
      />
    </>
  );
};
