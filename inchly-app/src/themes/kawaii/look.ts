// かわいい: a sticker diary. Pastel paper, washi tape, stickers with a soft
// outline, hearts to tick, stamps for the days you showed up, jelly bars, and
// a round mochi that lives on the page and keeps you company. One app, three
// colorways — ゆめかわ, ミルクティー, ソーダ — each with its own accents and its
// own mochi. The base colors are the theme's (design.ts), so the screens it
// shares with every theme match. (No React Native here, so it can be tested.)

export type VariantId = 'yumekawa' | 'milktea' | 'soda';
/** Sticker shapes. A cloud is a rest day's, so the days you studied get the others. */
export type Stamp = 'heart' | 'star' | 'flower' | 'cloud';
export type Mood = 'idle' | 'work' | 'sleep' | 'happy' | 'cheer';

export type Variant = {
  id: VariantId;
  /** the soft pop color: filled hearts, the selected tab, stickers */
  accent: string;
  /** a deeper one that carries white text: buttons */
  deep: string;
  /** the second color: stars and stamps */
  accent2: string;
  /** a pale ground for tracks and chips */
  soft: string;
  /** a warm yellow for stars and the over-the-goal glaze */
  sun: string;
  tapes: [string, string, string];
  stamps: Stamp[];
  mochi: { name: string; body: string; shade: string; cheek: string; extra: 'ribbon' | 'drip' | 'bubble'; extraColor: string };
  /** what the mochi says, by mood (short: it sits in a small bubble) */
  lines: Record<Mood, string[]>;
};

export const VARIANTS: Record<VariantId, Variant> = {
  yumekawa: {
    id: 'yumekawa', accent: '#FF8CC0', deep: '#E8559B', accent2: '#A98BFF', soft: '#FFE1EF', sun: '#FFD86B',
    tapes: ['#FFB8D9', '#D7C7FF', '#FFE3A3'], stamps: ['heart', 'star', 'flower', 'heart', 'star', 'flower', 'heart'],
    mochi: { name: 'ふわもち', body: '#FFFFFF', shade: '#FFE3F0', cheek: '#FF9CC8', extra: 'ribbon', extraColor: '#FF8CC0' },
    lines: {
      idle: ['きょうも ちょっとずつね', 'いっしょに がんばろ♡', 'なにから はじめる？'],
      work: ['いい感じだよ♡', 'しゅうちゅう〜！', 'そのちょうし！'],
      sleep: ['すやすや…', 'まだ ねむいの', 'はじめたら おきるね'],
      happy: ['目標クリア！えらい♡', 'きょうは もう100点！', 'ごほうびシール あげる'],
      cheer: ['やったね！！', 'すごいすごい♡', 'えらすぎる〜！'],
    },
  },
  milktea: {
    id: 'milktea', accent: '#D9A27A', deep: '#A86B43', accent2: '#E9A3A0', soft: '#F1E2D3', sun: '#F3CF7E',
    tapes: ['#E8CDB2', '#F2C9C3', '#F3DFA2'], stamps: ['flower', 'heart', 'star', 'flower', 'heart', 'star', 'flower'],
    mochi: { name: 'ミルもち', body: '#FFF8EE', shade: '#F0DFC9', cheek: '#EFA79A', extra: 'drip', extraColor: '#C88A5E' },
    lines: {
      idle: ['ひと口ずつ いこ', 'のんびり はじめよ', 'きょうは なにする？'],
      work: ['いい香り…集中してる', 'ことこと 進んでる', 'その調子だよ'],
      sleep: ['ほっと ひと息…', 'まだ おやすみ中', 'はじめたら 起きるね'],
      happy: ['目標クリア！おつかれさま', 'きょうは 満点だね', 'あまいの どうぞ'],
      cheer: ['やったね！', 'すごい すごい！', 'えらいね〜'],
    },
  },
  soda: {
    id: 'soda', accent: '#62C2FA', deep: '#1F8FD6', accent2: '#FF9DBA', soft: '#D5EEFF', sun: '#FFDA5C',
    tapes: ['#B8E2FF', '#FFE7A0', '#FFC9DA'], stamps: ['star', 'heart', 'flower', 'star', 'heart', 'flower', 'star'],
    mochi: { name: 'しゅわもち', body: '#FFFFFF', shade: '#DDF0FF', cheek: '#FFA8C5', extra: 'bubble', extraColor: '#8FD3FF' },
    lines: {
      idle: ['しゅわっと はじめよ', 'きょうも いこっ', 'なにから やる？'],
      work: ['しゅわしゅわ 集中中！', 'いいペース！', 'そのまま そのまま'],
      sleep: ['ぷかぷか…', 'まだ ねてるよ', 'はじめたら はじけるね'],
      happy: ['目標クリア！さわやか〜', 'きょうは 満点！', 'ごほうびの シール！'],
      cheer: ['やったー！！', 'はじけるくらい えらい', 'すごいよ〜！'],
    },
  },
};
export const variantOf = (id: string): Variant => VARIANTS[id as VariantId] ?? VARIANTS.yumekawa;

/** A color with alpha, from #RRGGBB. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Mixes #RRGGBB with white (k = 0 the color, 1 white): a pastel of it. */
export const pastel = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0');
  return `#${ch((n >> 16) & 255)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
};

/**
 * Today on the candy bar: each subject's share of the bar, then the session
 * under way, then what's left to the goal. The bar spans the goal, or all of
 * the day once it's past it. Fractions of the bar, never more than 1 in all.
 */
export type Piece = { c: string; f: number; live?: boolean };
export function candy(parts: { c: string; min: number }[], live: number, liveColor: string, goal: number): { pieces: Piece[]; goalAt: number } {
  const done = parts.reduce((a, p) => a + p.min, 0);
  const span = Math.max(goal, done + live, 1);
  const pieces: Piece[] = parts.filter((p) => p.min > 0).map((p) => ({ c: p.c, f: p.min / span }));
  if (live > 0) pieces.push({ c: liveColor, f: live / span, live: true });
  return { pieces, goalAt: goal > 0 ? Math.min(1, goal / span) : 1 };
}

// ---------- shapes (in a 0..100 box unless said) ----------
const f = (v: number) => (Math.round(v * 10) / 10).toString();
/** A heart filling the box. */
export const HEART = 'M50 88 C47 85 10 62 10 36 C10 20 22 10 34 10 C42 10 47 14 50 20 C53 14 58 10 66 10 C78 10 90 20 90 36 C90 62 53 85 50 88 Z';
/** A five-pointed star with rounded points, filling the box. */
export function starPath(points = 5, inner = 0.48) {
  const pts: [number, number][] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? 40 * inner : 44;
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    pts.push([50 + Math.cos(a) * r, 54 + Math.sin(a) * r]);
  }
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')} Z`;
}
export const STAR = starPath();
/** A flower of five round petals (draw the center on top). */
export function flowerPetals(): { cx: number; cy: number; r: number }[] {
  return Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { cx: 50 + Math.cos(a) * 22, cy: 52 + Math.sin(a) * 22, r: 19 };
  });
}
/** A puffy cloud. */
export const CLOUD = 'M24 76 C12 76 6 67 8 58 C10 49 18 45 25 46 C26 34 36 26 48 28 C56 18 72 20 77 32 C88 32 95 42 92 53 C98 58 96 76 82 76 Z';
/** The mochi: a soft dome, wider at the bottom (viewBox 0 0 100 90). */
export const MOCHI = 'M8 70 C8 38 28 16 50 16 C72 16 92 38 92 70 C92 83 79 87 50 87 C21 87 8 83 8 70 Z';
