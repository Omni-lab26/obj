import type { Article, Comment, PostKind } from './data/types';

// 1,234 → 1.2k
export const kfmt = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

// 小数の桁をそろえ、3桁ごとに区切る
export const num = (n: number, dec = 0): string =>
  n.toLocaleString('ja-JP', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const kindOf = (a: Article): PostKind => (a.type ? a.type : a.brk ? 'breaking' : 'slot');

// 読む時間（分）：本文と見出しの文字数 ÷ 500、最低2分
export const readingMinutes = (a: Article): number => {
  if (a.read) return a.read;
  const chars = (a.blocks ?? []).reduce((n, b) => (b.t === 'p' || b.t === 'h' ? n + b.x.length : n), 0);
  return Math.max(2, Math.round(chars / 500));
};

// コメントの数（返信も含む）
export const countComments = (list: Comment[]): number => list.reduce((n, c) => n + 1 + countComments(c.kids), 0);

// 並び替え：人気順（▲の数）／新しい順（分の少ない順）。返信の中も同じ順にする
export const sortComments = (list: Comment[], by: 'top' | 'new'): Comment[] =>
  [...list]
    .sort((a, b) => (by === 'top' ? b.up + (b.liked ? 1 : 0) - (a.up + (a.liked ? 1 : 0)) : a.min - b.min))
    .map((c) => ({ ...c, kids: sortComments(c.kids, by) }));

export const ago = (min: number): string =>
  min <= 0 ? 'たった今' : min < 60 ? `${min}分前` : `${Math.floor(min / 60)}時間前`;

// 「…<mark>強調</mark>…」を、ふつうの文字と強調の文字に分ける
export const splitMarks = (s: string): { t: string; mark: boolean }[] =>
  s
    .split(/(<mark>.*?<\/mark>)/)
    .filter(Boolean)
    .map((p) => (p.startsWith('<mark>') ? { t: p.slice(6, -7), mark: true } : { t: p, mark: false }));

// 決まった種から、毎回同じ折れ線を作る（見本のグラフ用）
export const linePoints = (f: { base: number; end: number; n: number; vol: number; seed: number }): number[] => {
  let s = f.seed * 9301 + 49297;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const out: number[] = [];
  let v = f.base;
  for (let i = 0; i < f.n; i++) {
    const pull = (f.end - v) / Math.max(1, f.n - i);
    v += pull + (rnd() - 0.5) * f.vol;
    out.push(i === f.n - 1 ? f.end : v);
  }
  out[0] = f.base;
  return out;
};

// 画面幅：320〜440 に収める
export const clampWidth = (w: number, min = 320, max = 440): number => Math.max(min, Math.min(max, w));

// 記事の計算の部品（電気代・住宅ローン・お米・両替）。結果の文字を返す
export const calcOut = (kind: 'power' | 'loan' | 'fx' | 'rice', v: number): { main: string; sub?: string } => {
  const yen = (n: number) => Math.round(n).toLocaleString('ja-JP');
  if (kind === 'fx') return { main: `$${yen((v * 10000) / 152.4)}`, sub: `150円なら $${yen((v * 10000) / 150)}` };
  if (kind === 'rice') return { main: `+${yen(v * (4280 - 3560) * 12)}円` };
  if (kind === 'loan') {
    const pay = (P: number, r: number) => {
      const i = r / 12;
      const n = 420;
      return (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    };
    const P = v * 10000;
    return { main: `+${yen(pay(P, 0.0093) - pay(P, 0.0068))}円` };
  }
  return { main: `+${yen(v * 1.15)}円` };
};
