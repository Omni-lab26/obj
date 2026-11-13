import script from "./lines.json";

export const MINCHO =
  "'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif";
export const SANS = "'Noto Sans JP', sans-serif";
/** One layout unit. The design was drawn on a 128 x 72 unit grid. */
export const U = 15;

// Each host brings their own colour; everything else stays the same.
const HOSTS = {
  zundamon: {
    name: "ずんだもん",
    accent: "#9BEA3F",
    credit: "VOICEVOX:ずんだもん",
  },
  tsumugi: {
    name: "春日部つむぎ",
    accent: "#FFC53D",
    credit: "VOICEVOX:春日部つむぎ",
  },
} as const;
export const HOST = HOSTS[(script.host as keyof typeof HOSTS) ?? "zundamon"];
/** The other host reads quotations aloud. */
export const READER =
  script.host === "tsumugi" ? HOSTS.zundamon : HOSTS.tsumugi;

export const INK = "#FFFFFF";
export const NIGHT = "#0A0F1F";
/** The host colour: answers, highlights, the route on the map */
export const ACCENT: string = HOST.accent;
/** Falls and warnings */
export const DOWN = "#FF4F72";
/** The thing being compared against, and anything uncertain */
export const COOL = "#3CCBFF";

export type Tone = "accent" | "down" | "cool" | "ink";
export const tone = (t: Tone | undefined): string =>
  t === "down" ? DOWN : t === "cool" ? COOL : t === "ink" ? INK : ACCENT;
