import edlJson from "./data/edl.json";
import creditsJson from "./data/credits.json";

export type ShotKind = "observation" | "metaphor" | "reconstruction";

export type Move = {
  scale?: [number, number];
  x?: [number, number];
  y?: [number, number];
};

export type Shot = {
  id: string;
  chapter: number;
  kind: ShotKind;
  desc: string;
  queries: string[];
  hold: boolean;
  sync: string;
  cut_frame: number;
  end_frame: number;
  from: number;
  dur: number;
  fade_in: number;
  fade_out: number;
  fade_delay?: number;
  transition_in: string;
  clip: string | null;
  clip_trim: number;
  move: Move | null;
};

export type TextEvent = {
  id: string;
  from: number;
  dur: number;
  text: string;
  sub?: string | null;
  style: "era" | "line" | "title";
};

export type Chapter = {
  id: number;
  name: string;
  en: string;
  from: number;
  to: number;
};

export type Edl = {
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  provisional_music: boolean;
  music: {file: string | null; offset_frames: number};
  chapters: Chapter[];
  shots: Shot[];
  texts: TextEvent[];
  credits: {from: number; dur: number};
};

export type Credits = {
  note: string;
  footage: {credit: string; source: string}[];
  music: string | null;
  sound: string;
  font: string;
  tools: string;
};

export const edl = edlJson as unknown as Edl;
export const credits = creditsJson as unknown as Credits;
