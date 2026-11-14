import { EN, script } from "./lang";
import palettes from "./palettes.json";

export const MINCHO =
  "'Shippori Mincho', 'Hiragino Mincho ProN', 'Yu Mincho', serif";
export const SANS = "'Noto Sans JP', sans-serif";
/** One layout unit. The design was drawn on a 128 x 72 unit grid. */
export const U = 15;

// Each host brings their own colour; everything else stays the same.
type Host = { name: string; accent: string; credit: string };
const HOSTS: Record<string, Host> = {
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
  // English version: an unnamed narrator and a second voice for quotations
  narrator: { name: "", accent: "#9BEA3F", credit: "Kokoro TTS" },
  reader: { name: "a narrator", accent: "#FFC53D", credit: "Kokoro TTS" },
};
export const HOST: Host = HOSTS[script.host] ?? HOSTS.zundamon;
/** The other voice reads quotations aloud. */
export const READER: Host = EN
  ? HOSTS.reader
  : script.host === "tsumugi"
    ? HOSTS.zundamon
    : HOSTS.tsumugi;

// A script may name a topic palette ("palette": "kawase"); see palettes/index.html.
// Without one, the host colour leads, as in the first video.
const PALETTE = palettes.find((p) => p.id === script.palette);
if (script.palette && !PALETTE) {
  throw new Error(`Unknown palette: ${script.palette}`);
}

export const INK = "#FFFFFF";
export const NIGHT: string = PALETTE?.base ?? "#0A0F1F";
/** The lead colour: answers, highlights, the route on the map */
export const ACCENT: string = PALETTE?.accent ?? HOST.accent;
/** Falls and warnings */
export const DOWN: string = PALETTE?.warn ?? "#FF4F72";
/** The thing being compared against, and anything uncertain */
export const COOL: string = PALETTE?.compare ?? "#3CCBFF";

export type Tone = "accent" | "down" | "cool" | "ink";
export const tone = (t: Tone | undefined): string =>
  t === "down" ? DOWN : t === "cool" ? COOL : t === "ink" ? INK : ACCENT;
