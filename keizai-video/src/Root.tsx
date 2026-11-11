import React from "react";
import { Composition, Folder, Still } from "remotion";
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
        id="NikkeiAiShock"
        component={NikkeiAiShock}
        durationInFrames={totalFrames}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
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
