export const C = {
  bg: "#070B18",
  bg2: "#0F1A36",
  text: "#F4F6FF",
  muted: "#9CA9CC",
  dim: "#5E6B90",
  down: "#FF5A5F",
  up: "#2EE6A6",
  accent: "#FFD23F",
  blue: "#6C9BFF",
  card: "rgba(255,255,255,0.055)",
  cardBorder: "rgba(255,255,255,0.13)",
};

export const FONT = "'Noto Sans JP', sans-serif";

// Layout box for scene content (subtitles live below CONTENT_BOTTOM).
export const SAFE_X = 120;
export const CONTENT_TOP = 168;
export const CONTENT_BOTTOM = 852;
export const CONTENT_W = 1920 - SAFE_X * 2;
export const CONTENT_H = CONTENT_BOTTOM - CONTENT_TOP;

export const yen = (n: number) => Math.round(n).toLocaleString("en-US");
