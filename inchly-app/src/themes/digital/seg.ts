// The デジタル app's figures are 7-segment readouts, like a stopwatch's. This
// is their geometry: which segments light for a character, where each sits,
// and how wide a line of them is. Plain numbers (no React), so it's tested.

/** The segments each character lights: a top, b top right, c bottom right, d bottom, e bottom left, f top left, g middle. */
export const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg',
  '-': 'g', ' ': '', '_': 'd',
  A: 'abcefg', b: 'cdefg', C: 'adef', c: 'deg', d: 'bcdeg', E: 'adefg', F: 'aefg', G: 'acdef', H: 'bcefg', h: 'cefg', I: 'bc', i: 'c',
  J: 'bcde', L: 'def', n: 'ceg', O: 'abcdef', o: 'cdeg', P: 'abefg', r: 'eg', S: 'afgcd', t: 'defg', U: 'bcdef', u: 'cde', y: 'bcdfg',
};
export const ALL = 'abcdefg';

/** The slant of the figures (tan 6°): the top of a cell leans right by this much of its height. */
const K = 0.105;
/** A digit cell is half as wide as it is tall; the gap after it is a tenth. */
const CELL = 0.5;
const GAP = 0.1;

export type Item = { kind: 'digit'; x: number; ch: string } | { kind: 'colon' | 'dot'; x: number };

/** How far a character moves the pen along, for figures of height h. */
export const advance = (ch: string, h: number) => (ch === ':' ? h * 0.26 : ch === '.' ? h * 0.2 : h * (CELL + GAP));

/** Places each character of a line of figures; the width includes the lean of the last one. */
export function layout(text: string, h: number): { width: number; items: Item[] } {
  let x = 0;
  const items: Item[] = [];
  for (const ch of text) {
    if (ch === ':') items.push({ kind: 'colon', x });
    else if (ch === '.') items.push({ kind: 'dot', x });
    else items.push({ kind: 'digit', x, ch });
    x += advance(ch, h);
  }
  // the last cell has no gap after it, but leans past its box at the top
  const last = [...text].pop();
  const trail = last && last !== ':' && last !== '.' ? h * GAP : 0;
  return { width: Math.max(0, x - trail) + h * K, items };
}

/** The tallest figures that fit a line of `chars` into `width`. */
export function heightFor(text: string, width: number) {
  const unit = layout(text, 1).width;
  return unit > 0 ? width / unit : 0;
}

const pt = (x: number, y: number, h: number) => `${(x + (h - y) * K).toFixed(2)},${y.toFixed(2)}`;
const hseg = (x1: number, x2: number, y: number, r: number, g: number, h: number) =>
  [pt(x1 + g, y, h), pt(x1 + r + g, y - r, h), pt(x2 - r - g, y - r, h), pt(x2 - g, y, h), pt(x2 - r - g, y + r, h), pt(x1 + r + g, y + r, h)].join(' ');
const vseg = (x: number, y1: number, y2: number, r: number, g: number, h: number) =>
  [pt(x, y1 + g, h), pt(x + r, y1 + r + g, h), pt(x + r, y2 - r - g, h), pt(x, y2 - g, h), pt(x - r, y2 - r - g, h), pt(x - r, y1 + r + g, h)].join(' ');

/** The seven segments of the cell that starts at x, as polygon points. */
export function cell(x: number, h: number): Record<string, string> {
  const w = h * CELL;
  const t = h * 0.12;
  const r = t / 2;
  const g = t * 0.14;
  const L = x + r, R = x + w - r, T = r, M = h / 2, B = h - r;
  return {
    a: hseg(L, R, T, r, g, h), g: hseg(L, R, M, r, g, h), d: hseg(L, R, B, r, g, h),
    f: vseg(L, T, M, r, g, h), b: vseg(R, T, M, r, g, h), e: vseg(L, M, B, r, g, h), c: vseg(R, M, B, r, g, h),
  };
}

const square = (cx: number, cy: number, s: number, h: number) =>
  [pt(cx - s / 2, cy - s / 2, h), pt(cx + s / 2, cy - s / 2, h), pt(cx + s / 2, cy + s / 2, h), pt(cx - s / 2, cy + s / 2, h)].join(' ');
/** A colon's two dots. */
export const colon = (x: number, h: number): [string, string] => {
  const s = h * 0.11;
  const cx = x + h * 0.13 - h * 0.02;
  return [square(cx, h * 0.31, s, h), square(cx, h * 0.69, s, h)];
};
/** A decimal point, on the baseline. */
export const point = (x: number, h: number) => square(x + h * 0.07, h - h * 0.06, h * 0.11, h);
