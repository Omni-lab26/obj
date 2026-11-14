import { script, voiceSeconds } from "./lang";
import { PACING, SHOTS } from "./episodes";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const GAP = 7; // shortest pause between lines (each clip already carries a short lead-in and tail)
const SHOT_GAP = 5; // extra pause when the picture changes
const CHAPTER_LEAD = 26; // a chapter card sits alone for a moment
const LEAD = 20;
const TAIL = 75;
/** How long a new picture takes to fade in over the previous one */
export const CROSS = 20;

const seconds = voiceSeconds;
const text = new Map(script.lines.map((l) => [l.id, l.text]));

export type Chunk = { text: string; from: number; to: number };
export type LineTiming = {
  id: string;
  /** Start frame on the main timeline */
  start: number;
  duration: number;
  chunks: Chunk[];
};
export type ShotTiming = {
  index: number;
  start: number;
  /** Frames until the next shot starts */
  duration: number;
  lines: LineTiming[];
};

for (const id of Object.keys(PACING)) {
  if (!text.has(id)) throw new Error(`pacing.ts names an unknown line: ${id}`);
}

const weight = (s: string) => s.replace(/[、。「」*\s]/g, "").length || 1;

const build = () => {
  const shots: ShotTiming[] = [];
  const lines = new Map<string, LineTiming>();
  let t = LEAD;
  SHOTS.forEach((shot, index) => {
    const start = index === 0 ? 0 : t;
    if (shot.overlay?.kind === "chapter") t += CHAPTER_LEAD;
    const shotLines = shot.lines.map((id) => {
      const raw = text.get(id);
      if (raw === undefined) throw new Error(`Unknown line ${id}`);
      const duration = Math.ceil((seconds[id] ?? raw.length * 0.19) * FPS);
      const pace = PACING[id] ?? {};
      t += Math.round((pace.before ?? 0) * FPS);
      // The subtitle stays up through the pause, so a question can be read while thinking.
      const gap = GAP + Math.round((pace.after ?? 0) * FPS);
      const parts = raw.split("|");
      const total = parts.reduce((sum, p) => sum + weight(p), 0);
      let acc = 0;
      const chunks = parts.map((part, i) => {
        const from = Math.round(t + (duration * acc) / total);
        acc += weight(part);
        const last = i === parts.length - 1;
        const to = last
          ? t + duration + gap - 3
          : Math.round(t + (duration * acc) / total);
        return { text: part, from, to };
      });
      const timing = { id, start: t, duration, chunks };
      lines.set(id, timing);
      t += duration + gap;
      return timing;
    });
    t += SHOT_GAP;
    shots.push({ index, start, duration: t - start, lines: shotLines });
  });
  const total = t + TAIL;
  shots[shots.length - 1].duration += TAIL;
  return { shots, lines, total };
};

const built = build();
export const shotTimings = built.shots;
export const totalFrames = built.total;

export const lineTiming = (id: string): LineTiming => {
  const line = built.lines.get(id);
  if (!line) throw new Error(`Line ${id} is not used in any shot`);
  return line;
};

export const allLines = () => shotTimings.flatMap((s) => s.lines);
