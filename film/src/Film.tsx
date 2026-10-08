import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useVideoConfig} from "remotion";
import {edl} from "./edl";
import {ShotLayer} from "./components/ShotLayer";
import {TextCard} from "./components/TextCard";
import {CreditsCard} from "./components/CreditsCard";

export type FilmProps = {
  res: "1080" | "2160";
  withAudio: boolean;
};

// 曲入りのミックスがあればそれを、無ければ環境音のみのミックスをプレビューで鳴らす
const MIXES = ["audio/mix_full.wav", "audio/mix_nomusic.wav"];

export const Film: React.FC<FilmProps> = ({res, withAudio}) => {
  const {fps} = useVideoConfig();
  const files = getStaticFiles().map((f) => f.name);
  const mix = MIXES.find((m) => files.includes(m));

  return (
    <AbsoluteFill style={{backgroundColor: "#000"}}>
      {/* 映像: 後のショットほど上に重なる。ディゾルブは上のショットの不透明度で作る */}
      {edl.shots.map((shot) => (
        <Sequence
          key={shot.id}
          name={`${shot.id} ${shot.desc.slice(0, 18)}`}
          from={shot.from}
          durationInFrames={shot.dur}
          premountFor={fps}
        >
          <ShotLayer shot={shot} res={res} />
        </Sequence>
      ))}

      {/* 文字（年代・締めの言葉・タイトル） */}
      {edl.texts.map((t) => (
        <Sequence key={t.id} name={`text: ${t.text.replace("\n", " ")}`} from={t.from} durationInFrames={t.dur}>
          <TextCard event={t} />
        </Sequence>
      ))}

      <Sequence name="credits" from={edl.credits.from} durationInFrames={edl.credits.dur}>
        <CreditsCard />
      </Sequence>

      {/* プレビュー用の音（書き出し時は --muted で無効化し、ffmpeg で音を合わせる） */}
      {withAudio && mix ? <Audio src={staticFile(mix)} /> : null}
    </AbsoluteFill>
  );
};
