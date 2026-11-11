import script from "./script.json";
import manifest from "./voice-manifest.json";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Breathing room, in frames.
const LEAD = 12; // before the first line of a scene
export const GAP = 10; // between lines
const TAIL = 22; // after the last line of a scene

export type LineTiming = {
  id: string;
  text: string;
  /** Scene-local start frame */
  start: number;
  /** Length of the spoken audio in frames */
  duration: number;
};

export type SceneTiming = {
  id: string;
  /** Start frame on the main timeline */
  start: number;
  duration: number;
  lines: LineTiming[];
};

const seconds = manifest as Record<string, number>;

const build = (): SceneTiming[] => {
  let sceneStart = 0;
  return script.scenes.map((scene) => {
    let t = LEAD;
    const lines = scene.lines.map((line) => {
      // Without generated audio, estimate from the text length.
      const sec = seconds[line.id] ?? line.text.length * 0.17;
      const duration = Math.ceil(sec * FPS);
      const timing = { id: line.id, text: line.text, start: t, duration };
      t += duration + GAP;
      return timing;
    });
    const duration = t - GAP + TAIL;
    const result = { id: scene.id, start: sceneStart, duration, lines };
    sceneStart += duration;
    return result;
  });
};

export const scenes = build();
export const totalFrames = scenes.reduce((sum, s) => sum + s.duration, 0);

export const getScene = (id: string): SceneTiming => {
  const scene = scenes.find((s) => s.id === id);
  if (!scene) throw new Error(`Unknown scene ${id}`);
  return scene;
};

/** Returns a lookup: line id -> scene-local frame at which that line starts. */
export const cuesFor = (sceneId: string) => {
  const scene = getScene(sceneId);
  return (lineId: string): number => {
    const line = scene.lines.find((l) => l.id === lineId);
    if (!line) throw new Error(`Unknown line ${lineId} in ${sceneId}`);
    return line.start;
  };
};
