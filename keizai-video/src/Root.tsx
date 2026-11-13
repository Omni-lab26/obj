import React from "react";
import { Composition, Folder, Still } from "remotion";
import { Documentary } from "./line/Documentary";
import { LineThumbnail } from "./line/LineThumbnail";
import { Film } from "./route/Film";
import { totalFrames as routeFrames } from "./route/timeline";
import { TalkFilm } from "./talk/Film";
import { MapBasePacific, MapBaseUs } from "./talk/MapBase";
import { totalFrames as talkFrames } from "./talk/timeline";
import { totalFrames as lineFrames } from "./line/timeline";
import { FPS, getScene, HEIGHT, totalFrames, WIDTH } from "./timeline";
import { Thumbnail } from "./Thumbnail";
import { NikkeiAiShock, SCENES, withBackground } from "./Video";

// Scene previews (without narration) for quick iteration in Studio.
const previews = SCENES.map((scene) => ({
  ...scene,
  preview: withBackground(scene.component),
}));

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="DenkidaiTalk"
        component={TalkFilm}
        durationInFrames={talkFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="DenkidaiRoute"
        component={Film}
        durationInFrames={routeFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="DenkidaiLine"
        component={Documentary}
        durationInFrames={lineFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="NikkeiAiShock"
        component={NikkeiAiShock}
        durationInFrames={totalFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
      <Still id="MapBaseUs" component={MapBaseUs} width={1920} height={1080} />
      <Still
        id="MapBasePacific"
        component={MapBasePacific}
        width={1920}
        height={1080}
      />
      <Still
        id="LineThumbnail"
        component={LineThumbnail}
        width={1280}
        height={720}
      />
      <Folder name="Scenes">
        {previews.map((scene) => (
          <Composition
            key={scene.id}
            id={`Scene-${scene.name}`}
            component={scene.preview}
            durationInFrames={getScene(scene.id).duration}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
    </>
  );
};
