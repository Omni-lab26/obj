import { t } from '../i18n';
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

// 並び替え：人気順（▲の数。自分の▲も足す）／新しい順（分の少ない順）。返信の中も同じ順にする
export type CommentSort = 'top' | 'new';
export const sortComments = (
  list: Comment[],
  by: CommentSort,
  liked: (c: Comment) => boolean = () => false
): Comment[] => {
  const score = (c: Comment) => c.up + (liked(c) ? 1 : 0);
  return [...list]
    .sort((a, b) => (by === 'top' ? score(b) - score(a) : a.min - b.min))
    .map((c) => ({ ...c, kids: sortComments(c.kids, by, liked) }));
};

// 検索：全角・半角や大文字・小文字の違いをならし、空白で区切った言葉がすべて入っている記事を返す。
// 題名・タグ・ラベル・リード・ひとこと・本文（段落と見出し）を探す
const fold = (s: string) => (typeof s.normalize === 'function' ? s.normalize('NFKC') : s).toLowerCase();
export const searchArticles = (list: Article[], q: string): Article[] => {
  const terms = fold(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return list.filter((a) => {
    const body = (a.blocks ?? []).map((b) => (b.t === 'p' || b.t === 'h' ? b.x : '')).join(' ');
    const hay = fold([a.title, a.tag, a.lab ?? '', a.lead ?? '', a.text ?? '', body].join(' '));
    return terms.every((w) => hay.includes(w));
  });
};

// 何分前・何時間前・何日前（文言は翻訳ファイルから）
export const ago = (min: number): string =>
  min <= 0
    ? t('time.now')
    : min < 60
      ? t('time.min', { n: min })
      : min < 1440
        ? t('time.hour', { n: Math.floor(min / 60) })
        : t('time.day', { n: Math.floor(min / 1440) });

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

// 記事の計算の部品（電気代・住宅ローン・お米・両替）。
// 計算の前提はここにまとめ、画面の「目安です」の文にも同じ数字を出す（文と計算がずれないように）
export type CalcKind = 'power' | 'loan' | 'fx' | 'rice';
export const CALC = {
  power: { perKwh: 1.15, step: 10 }, // 1kWh あたりの値上がり（円）
  loan: { from: 0.68, to: 0.93, years: 35, step: 100 }, // 金利（%）
  rice: { diff: 4280 - 3560, step: 1 }, // 5kg 1袋あたりの値上がり（円）
  fx: { rate: 152.4, alt: 150, step: 1 }, // 1ドルの円
} as const;

/** ＋−の刻み（記事の例の数字に合わせられるよう、きりのいい数） */
export const calcStep = (kind: CalcKind): number => CALC[kind].step;

/** 刻みの目にそろえて、はみ出さないようにする */
export const calcSnap = (v: number, min: number, max: number, step: number): number =>
  Math.max(min, Math.min(max, min + Math.round((v - min) / step) * step));

/** 結果の文字を返す。増える額には「+」を付ける */
export const calcOut = (kind: CalcKind, v: number): { main: string; sub?: string } => {
  const yen = (n: number) => t('blocks.yen', { n: Math.round(n).toLocaleString('ja-JP') });
  const usd = (n: number) => `$${Math.round(n).toLocaleString('ja-JP')}`;
  if (kind === 'fx') return { main: usd((v * 10000) / CALC.fx.rate), sub: usd((v * 10000) / CALC.fx.alt) };
  if (kind === 'rice') return { main: `+${yen(v * CALC.rice.diff * 12)}` };
  if (kind === 'loan') {
    const n = CALC.loan.years * 12;
    const pay = (P: number, rate: number) => {
      const i = rate / 100 / 12;
      return (P * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    };
    const P = v * 10000;
    return { main: `+${yen(pay(P, CALC.loan.to) - pay(P, CALC.loan.from))}` };
  }
  // 電気代は 10円単位の目安にする（見出しの「+300円」とそろう）
  return { main: `+${yen(Math.round((v * CALC.power.perKwh) / 10) * 10)}` };
};
