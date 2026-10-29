import { allSubjects, FREE, type Subject } from '@/data';
import { KVG } from './kvg';

// A subject as サイバー shows it: its station-number plate (EN 01), and the
// sign that hangs in the timer card's alley. The sign fits any name: up to 3
// characters in one column; 4–6 in two columns read right to left, like a
// tenant 袖看板; 7 or more show the subject's 略称 (Subject.short), else the
// short name schools use, else its leading kanji or first word — never a name
// cut off halfway; with none of those, the number plate. A sign is neon tubes
// (one tube per stroke) when every character has strokes and it is big enough
// to bend glass for, else a lit acrylic box: decided once per sign, never half
// and half.

/** Latin, digits, Roman numerals and the middle dot on KanjiVG's 109 grid, for names like 数学Ⅰ and 英検2級. */
export const LAT: Record<string, string[]> = {
  O: ['M34 16C15 16 6 33 6 54.5C6 76 15 93 34 93C53 93 62 76 62 54.5C62 33 53 16 34 16Z'], K: ['M8 16V93', 'M55 16L12 59', 'M26 46L57 93'], '!': ['M16 16V70', 'M16 86V88'],
  A: ['M54.5 16L27 93', 'M54.5 16L82 93', 'M38 64H71'], B: ['M32 16V93', 'M32 16H60C74 16 79 25 79 34C79 44 72 52 60 52H32', 'M32 52H64C78 52 83 62 83 72C83 84 75 93 62 93H32'],
  C: ['M80 27C74 19 65 16 56 16C38 16 28 33 28 54.5C28 76 38 93 56 93C65 93 74 90 80 82'],
  'Ⅰ': ['M54.5 18V91', 'M40 18H69', 'M40 91H69'], 'Ⅱ': ['M43 18V91', 'M66 18V91', 'M30 18H79', 'M30 91H79'], 'Ⅲ': ['M35 18V91', 'M54.5 18V91', 'M74 18V91', 'M24 18H85', 'M24 91H85'],
  1: ['M30 30L46 16V93'], 2: ['M10 34C10 22 20 16 33 16C47 16 56 24 56 37C56 50 45 59 10 93H59'], 3: ['M11 24C17 18 24 16 33 16C46 16 54 24 54 34C54 45 45 52 30 52C47 52 58 60 58 72C58 86 47 93 31 93C22 93 15 90 9 84'],
  '・': ['M54.5 53V56'],
};
/** How far a narrow glyph advances in a row, as a share of the size (1 for the rest). */
export const LATW: Record<string, number> = { O: 0.62, K: 0.56, '!': 0.3, 1: 0.6, 2: 0.6, 3: 0.6 };
/** A character's strokes in writing order; undefined when it has none (it can't be a tube). */
export const strokesOf = (c: string): string[] | undefined => KVG[c] ?? LAT[c];
/** Small kana: in a vertical sign they sit at the upper right. */
export const SMALL = 'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ';
/** A column never starts with these (kinsoku). */
const NOSTART = SMALL + 'ー・」』）、。';
/** …nor ends with a prefix (英検準｜2級 reads wrong) … */
const NOEND = '準第新旧';
/** …and never splits a run of Roman numerals, Latin letters or digits (数学｜ⅠAⅡB, not 数学Ⅰ｜AⅡB). */
const RUN = /[ⅠⅡⅢA-Za-z0-9]/;
/** Where a name splits best: before the words that end subject names (物理｜基礎, 英検｜準2級). */
const SUFFIX = /(基礎|探究|演習|総合|表現|対策|講座|準?[0-9]+級)/;
/** Tubes are bent from this size up (smaller signs are boxes). */
export const MIN_TUBE = 28;
/** The height a sign may take in the kit's 272-point picture (the room above 勉強中). */
export const SIGN_ROOM = 124;

/** A typed name made sign-ready: full-width letters to ASCII, and I/II/III after Japanese to Ⅰ/Ⅱ/Ⅲ (数学IA → 数学ⅠA). */
export function normName(n: string): string {
  return n
    .trim()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/(?<=[぀-ヿ㐀-鿿])((?:(?:III|II|I)[ABC]?)+)(?![A-Za-z])/g, (m) => m.replace(/III|II|I/g, (r) => ({ I: 'Ⅰ', II: 'Ⅱ', III: 'Ⅲ' })[r as 'I' | 'II' | 'III']));
}

/** Short names schools actually use, for names of 7 or more characters. */
export const ABBR: Record<string, string> = {
  英語コミュニケーション: 'コミュ英', 英語コミュニケーションⅠ: 'コミュ英', 英語コミュニケーションⅡ: 'コミュ英', 英語コミュニケーションⅢ: 'コミュ英',
  総合的な探究の時間: '総探', 科学と人間生活: '科人',
};

export type SignLayout =
  | { plate: true; w: number; h: number }
  /** cols: right to left. tube: neon (size: each character's box) or acrylic (ls: each panel's letter size). w, h: the sign's box with its padding. */
  | { plate?: false; cols: string[]; tube: true; size: number; w: number; h: number }
  | { plate?: false; cols: string[]; tube: false; ls: number; w: number; h: number };

/** The sign for a subject's name (and 略称), in `room` points of height. */
export function signLayout(S: { name: string; short?: string }, room = SIGN_ROOM): SignLayout {
  const name = normName(S.name), all = [...name];
  const short = S.short?.trim() ? normName(S.short) : '';
  const lead = name.match(/^[㐀-鿿]{2,3}/)?.[0], word = name.match(/^[A-Za-z]{2,6}(?=\s|$|[぀-ヿ㐀-鿿])/)?.[0];
  // the plate: its code (30) over its number (18), 10 above and below, in the sign's 12 of padding
  if (!short && all.length > 6 && !ABBR[name] && !lead && !word) return { plate: true, w: 104, h: 94 };
  const t = short ? [...short] : all.length > 6 ? [...(ABBR[name] ?? lead ?? word ?? '')] : all;
  let cols = [t];
  if (t.length > 3) {
    const ok = (k: number) => k > 0 && k < t.length && !NOSTART.includes(t[k]) && !NOEND.includes(t[k - 1]) && !(RUN.test(t[k - 1]) && RUN.test(t[k]));
    // before a word that ends the name, if it leaves the columns within one of each other; else near the middle
    const word2 = t.join('').match(SUFFIX);
    const before = word2?.index !== undefined ? [...t.join('').slice(0, word2.index)].length : -1;
    const half = Math.ceil(t.length / 2);
    const at = [before, half, half + 1, half - 1, half + 2, half - 2].find((k) => ok(k) && (k !== before || Math.abs(t.length - 2 * k) <= 2));
    if (at !== undefined && !(t.length === 4 && at !== 2)) cols = [t.slice(0, at), t.slice(at)];
  }
  const rows = Math.max(...cols.map((c) => c.length)), n = cols.length;
  const out = cols.map((c) => c.join(''));
  if (t.every((c) => !!strokesOf(c))) {
    const size = Math.min(50, Math.floor(room / (rows + 0.08 * (rows - 1))));
    if (size >= MIN_TUBE) {
      const gap = Math.round(size * 0.08);
      return { cols: out, tube: true, size, w: n * size + (n - 1) * 10 + 20, h: rows * size + (rows - 1) * gap + 24 };
    }
  }
  // a box panel is 1.3em with 2pt between panels and 2pt around them
  const ls = Math.max(9, Math.min(42, Math.floor((room - 4 - 2 * (rows - 1)) / (1.3 * rows))));
  return { cols: out, tube: false, ls, w: Math.round(n * (1.3 * ls + 4) + (n - 1) * 10 + 20), h: Math.round(rows * 1.3 * ls + 2 * (rows - 1) + 4 + 24) };
}

// ---------- number plates ----------
const CODES: [RegExp, string][] = [
  [/世界史/, 'HI'], [/日本史/, 'JH'], [/地理/, 'GE'], [/政治|経済/, 'PE'], [/倫理/, 'ET'], [/公共/, 'PU'],
  [/物理/, 'PH'], [/化学/, 'CH'], [/生物/, 'BI'], [/地学/, 'ES'], [/情報|プログラ/, 'IN'],
  [/英|English|TOEIC|TOEFL|IELTS|リスニング/i, 'EN'], [/数|算/, 'MA'], [/国語|現代文|現文|現国|古文|漢文|古典|言語文化|小論/, 'JA'],
];
const AREA_CODE: Record<Subject['area'], string> = { en: 'EN', ma: 'MA', ja: 'JA', sci: 'SC', soc: 'SO', info: 'IN', other: 'XX' };
/** Two letters for a subject, like a line's code on a station number (英語 EN, 物理 PH; else its 教科's). */
export function codeOf(x: { name: string; area: Subject['area']; id?: string }): string {
  if (x.id === FREE) return 'FR';
  return CODES.find(([re]) => re.test(x.name))?.[1] ?? AREA_CODE[x.area];
}
/** A subject's plate: its code and its number among your subjects (01, 02 …; ·· when it isn't one of yours). */
export function plateOf(x: { id?: string; name: string; area: Subject['area'] }): { code: string; no: string } {
  const list = allSubjects();
  const i = x.id ? list.findIndex((s) => s.id === x.id) : list.findIndex((s) => s.name === x.name);
  return { code: codeOf(x), no: i >= 0 ? String(i + 1).padStart(2, '0') : '··' };
}

/** Whether a sign can be neon tubes at a size: every character has strokes, and it's big enough to bend glass for (figures alone, from 16). */
export function canTube(text: string, size: number): boolean {
  const ch = [...text];
  const min = ch.every((c) => /[0-9]/.test(c)) ? 16 : MIN_TUBE;
  return ch.length > 0 && size >= min && ch.every((c) => !!strokesOf(c));
}
