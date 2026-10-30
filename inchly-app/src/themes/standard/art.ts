// スタンダード's pixel art, as rows of letters: one letter a pixel, '.' empty,
// the other letters keys into a palette. The creatures (ペンタ, ボッ, めぶ,
// ジリ, ふせん, つる), the stickers and the pixel icons are Inchly's own, drawn
// for the introduction site and copied here as they are (docs/app/mock/shared/app.js).
// Pure data and helpers, no React: the drawing is in pixel.tsx.

export type Rows = string[];
export type Palette = Record<string, string>;

export const INK = '#17121F';

const R = (s: string): Rows => s.trim().split(/\s+/);
/** Set single pixels: [x, y, letter]. */
const pts = (rows: Rows, list: [number, number, string][]): Rows => {
  const g = rows.map((r) => r.split(''));
  for (const [x, y, c] of list) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
  return g.map((r) => r.join(''));
};
const rowAt = (w: number, xs: number[], ch = 'k') => {
  const a = Array<string>(w).fill('.');
  xs.forEach((x) => { if (x >= 0 && x < w) a[x] = ch; });
  return a.join('');
};
const shiftX = (rows: Rows, dx: number): Rows => rows.map((r) => (dx > 0 ? '.'.repeat(dx) + r.slice(0, r.length - dx) : r.slice(-dx) + '.'.repeat(-dx)));
const padX = (rows: Rows, n: number): Rows => rows.map((r) => '.'.repeat(n) + r + '.'.repeat(n));
const splice = (rows: Rows, at: number, repl: Rows): Rows => { const o = rows.slice(); repl.forEach((r, i) => { o[at + i] = r; }); return o; };

// ---------- the creatures ----------
/** ペンタ: a pencil, its eraser end the head. */
const PENTA_BODY = R(`
.....kkkkkkkkkkkkkk.
...kkYYYYYYYMqPPPPPk
.kLnnyyyyyyyMqpppppk
kLLnnyyyyyyymqpppppk
.kLNNooooooomqpppppk
...kkOOOOOOOqqrrrrrk
.....kkkkkkkkkkkkkk.`);
const PE: Record<string, [number, number, string][]> = {
  open: [[15, 2, 'k'], [15, 3, 'k'], [17, 2, 'k'], [17, 3, 'k'], [16, 4, 'r']],
  blink: [[15, 3, 'k'], [17, 3, 'k'], [16, 4, 'r']],
  up: [[15, 1, 'k'], [15, 2, 'k'], [17, 1, 'k'], [17, 2, 'k'], [16, 4, 'r']],
  wide: [[15, 1, 'k'], [15, 2, 'k'], [15, 3, 'k'], [17, 1, 'k'], [17, 2, 'k'], [17, 3, 'k'], [16, 4, 'k']],
  happy: [[14, 3, 'k'], [15, 2, 'k'], [16, 3, 'k'], [17, 2, 'k'], [18, 3, 'k']],
};
const penta = (eyes: string): Rows => [...pts(PENTA_BODY, PE[eyes]), rowAt(20, [6, 9, 13, 16]), rowAt(20, [6, 9, 13, 16])];

/** ボッ: the streak's flame. */
const BO = R(`
.......k.....
......kyk....
......kyrk...
.....kyork...
....kyooork..
...kyoyooork.
..kyoyyooork.
.kyooyyoooork
.kyowwoowwork
kyoowkoowkork
kyooyyyyyoork
kroyYYkkYYork
.kroyYYYYyrk.
..kkrrrrrkk..
....kkkkk....`);
const BO_TIP: Record<string, Rows> = { a: BO.slice(0, 3), b: R('......k...... .....kyk..... .....kyrk....'), c: R('........k.... .......kyk... ......kyork..') };
const BO_EYE: Record<string, Rows> = {
  open: [BO[8], BO[9], BO[10]],
  blink: ['.kyoooooooork', 'kyookkookkork', BO[10]],
  up: ['.kyowkoowkork', 'kyoowwoowwork', BO[10]],
  happy: ['.kyokoookoork', 'kyokokokokork', BO[10]],
};
const BO_MOUTH: Record<string, Rows> = { smile: [BO[11], BO[12]], open: ['kroyYYkkYYork', '.kroyYkkYyrk.'], calm: ['kroyYYYYYYork', BO[12]] };
const bo = (tip = 'a', eye = 'open', mouth = 'smile'): Rows => [...BO_TIP[tip], ...BO.slice(3, 8), ...BO_EYE[eye], ...BO_MOUTH[mouth], ...BO.slice(13)];

/** めぶ: a sprout in a pot. */
const MEBU_LEAF: Record<string, Rows> = {
  n: R('.kkk....kkk. kGGgk..kgGGk kGgggkkgggGk .kgggkkgggk. ..kkkhhkkk..'),
  up: R('..kk....kk.. .kGgk..kgGk. .kGgk..kgGk. ..kggkkggk.. ...kkhhkk...'),
};
MEBU_LEAF.l = [...shiftX(MEBU_LEAF.n.slice(0, 4), -1), MEBU_LEAF.n[4]];
const MEBU_POT = R('.....hh..... kkkkkkkkkkkk kTTTTTTTTTtk ktttttttttuk .kkkkkkkkkk. .kTttttttuk.');
const MEBU_FACE: Record<string, Rows> = {
  open: R('.kTwkttwkuk. .kTkkttkkuk. .kbttkkttbk.'),
  blink: R('.kTttttttuk. .kTkkttkkuk. .kbttkkttbk.'),
  shy: R('.kTttttttuk. .kTkkttkkuk. .kbbtkktbbk.'),
};
const MEBU_BASE = R('..kttttttk.. ...kkkkkk...');
const MEBU_BOOK = R('kppppkkppppk kccccCCcccck .kkkkkkkkkk.');
const mebu = (leaf = 'n', face = 'open', book = false): Rows => {
  const f = [...MEBU_LEAF[leaf], ...MEBU_POT, ...MEBU_FACE[face], ...MEBU_BASE];
  return book ? splice(f, 13, MEBU_BOOK) : f;
};

/** ジリ: an alarm clock. */
const JIRI = padX(R(`
..kk..k..kk..
.kYyk.k.kYyk.
kyyyokkkoyyok
.kkkkRRrkkkk.
..kRRrrrrek..
.kRrwwwwwrek.
.kRwwwwwwwek.
kRrwkwwwkwrek
kRrwkwwwkwrek
kRrbwwwwwbrek
.krwwkwkwwrk.
.kerwwkwwgek.
..keerrreek..
...kkkkkkk...
..kk.....kk..`), 1);
const jiri = (eye = 'open', ring = false): Rows => {
  const f = JIRI.slice();
  if (eye === 'blink') { f[7] = '.kRrwwwwwwwrek.'; f[8] = '.kRrkkwwwkkrek.'; }
  if (eye === 'scared') { f[7] = '.kRrwwwwwwwrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwkkkwgek..'; }
  if (eye === 'happy') { f[7] = '.kRrwkwwwkwrek.'; f[8] = '.kRrkwkwkwkrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwwwwwgek..'; }
  // ringing: the bells part from the clock by a pixel
  if (ring) for (let y = 0; y < 3; y++) { const r = f[y]; f[y] = `${r.slice(1, 7)}.${r[7]}.${r.slice(8, 14)}`; }
  return f;
};

/** ふせん: a sticky note. */
const FUSEN = R(`
.kkkkkkkkkkkk.
.kaaaaaaaaaak.
.kYyyyyyyyyyk.
.kyyyyyyyyyyk.
.kyyyyyyyyyyk.
.kyyyyyyyyyyk.
.kyyyyyyyyyyk.
.kybyyyyyybyk.
.kyyyykkyyyyk.
.kyyyyyyyyoOk.
.kyyyyyyyoOk..
.kkkkkkkkkk...
..kyk...kyk...`);
const FUSEN_EYE: Record<string, [number, number]> = { c: [0, 0], l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
const fusen = (look = 'c', mode = 'open'): Rows => {
  if (mode === 'blink') return pts(FUSEN, [[4, 6, 'k'], [5, 6, 'k'], [8, 6, 'k'], [9, 6, 'k']]);
  if (mode === 'eep') return pts(FUSEN, [[4, 5, 'k'], [9, 5, 'k'], [6, 8, 'k'], [7, 8, 'k'], [6, 9, 'k'], [7, 9, 'k']]);
  const [dx, dy] = FUSEN_EYE[look];
  const e: [number, number, string][] = [];
  for (const ex of [4, 8]) { const x = ex + dx, y = 4 + dy; e.push([x, y, 'w'], [x + 1, y, 'k'], [x, y + 1, 'k'], [x + 1, y + 1, 'k'], [x, y + 2, 'k'], [x + 1, y + 2, 'k']); }
  return pts(FUSEN, e);
};

/** つる: a paper crane. */
const TSURU_SIT = R(`
......k.......kkk.
......kk.....kwkwk
.....kwgk.....kwkr
.....kwgk.....kwk.
.....kwwgk...kwk..
....kwwwggk..kwk..
k...kwwwggk.kwk...
kwk.kwwwgggkkwk...
.kwkkwwwwggggwk...
..kwwwwwwgggggk...
...kgwwwwggggk....
....kkkkkkkkk.....`);
const TSURU_UP = R(`
....k.............
....kk............
....kwk.......kkk.
....kwgk.....kwkwk
....kwwgk.....kwkr
....kwwggk....kwk.
....kwwwggk..kwk..
...kwwwwgggk.kwk..
k..kwwwwggggkwk...
kwkkwwwwwggggwk...
.kwwwwwwwgggggk...
..kgwwwwwggggk....
...kkkkkkkkkk.....`);

const PAL = {
  penta: { k: INK, L: '#5a5468', n: '#f7d3a1', N: '#d9995a', Y: '#fff2a6', y: '#ffd23f', o: '#f2a91c', O: '#cf8410', M: '#f4f2fa', m: '#c9c5d6', q: '#8d88a2', P: '#ffc9db', p: '#ff8fb6', r: '#e0588a', w: '#ffffff' },
  bo: { k: INK, R: '#d8341c', r: '#ff5b2e', o: '#ff8a1f', y: '#ffc93a', Y: '#fff1a8', w: '#ffffff' },
  mebu: { k: INK, G: '#c4f27a', g: '#7bd63a', h: '#3f9a2a', T: '#f4a46b', t: '#de7740', u: '#ad4f22', c: '#58a6ff', C: '#2f6fd8', p: '#f6f1e4', w: '#ffffff', b: '#ff8fa8' },
  jiri: { k: INK, R: '#ff8a80', r: '#f2433f', e: '#c02336', y: '#ffd23f', Y: '#fff2a8', o: '#e0a10e', w: '#ffffff', g: '#dcd7e6', b: '#ff9cc2' },
  fusen: { k: INK, a: '#f6d443', Y: '#fff6b0', y: '#ffe55c', o: '#f2c21b', O: '#d29a0a', w: '#ffffff', b: '#ff9cb0' },
  tsuru: { k: INK, w: '#ffffff', g: '#e3dfee', r: '#ff4d6d' },
};

/** The faces every creature has; some have one more of their own (look, read, ring). */
export type Face = 'idle' | 'happy' | 'surprised' | 'sleep' | 'look' | 'read' | 'ring';
export type CreatureId = 'penta' | 'bo' | 'mebu' | 'jiri' | 'fusen' | 'tsuru';
export type Creature = { label: string; w: number; h: number; pal: Palette; faces: Partial<Record<Face, Rows>> & { idle: Rows } };
/**
 * Who shows where (the mock's plan): ペンタ a record, ボッ the streak, めぶ an
 * empty place and a first-timer, ジリ the next plan's time and deadlines, ふせん
 * a ToDo done, つる notices, messages and friends. One or two a screen.
 */
export const CREATURES: Record<CreatureId, Creature> = {
  penta: { label: 'ペンタ', w: 20, h: 9, pal: PAL.penta, faces: { idle: penta('open'), happy: penta('happy'), surprised: penta('wide'), sleep: penta('blink'), look: penta('up') } },
  bo: { label: 'ボッ', w: 13, h: 15, pal: PAL.bo, faces: { idle: bo('a'), happy: bo('a', 'happy', 'open'), surprised: bo('b', 'up', 'open'), sleep: bo('a', 'blink', 'calm'), look: bo('c', 'up') } },
  mebu: { label: 'めぶ', w: 12, h: 16, pal: PAL.mebu, faces: { idle: mebu(), happy: mebu('up', 'shy'), surprised: mebu('up', 'open'), sleep: mebu('n', 'blink'), read: mebu('n', 'blink', true) } },
  jiri: { label: 'ジリ', w: 15, h: 15, pal: PAL.jiri, faces: { idle: jiri(), happy: jiri('happy'), surprised: jiri('scared'), sleep: jiri('blink'), ring: jiri('happy', true) } },
  fusen: { label: 'ふせん', w: 14, h: 13, pal: PAL.fusen, faces: { idle: fusen('c'), happy: fusen('c', 'blink'), surprised: fusen('c', 'eep'), sleep: fusen('d'), look: fusen('u') } },
  tsuru: { label: 'つる', w: 18, h: 13, pal: PAL.tsuru, faces: { idle: TSURU_SIT, happy: TSURU_UP, surprised: pts(TSURU_SIT, [[17, 0, 'r'], [17, 2, '.']]), sleep: pts(TSURU_SIT, [[15, 1, 'w']]) } },
};
/** A creature's face, or its idle one when it hasn't that face. */
export const faceOf = (id: CreatureId, face: Face): Rows => CREATURES[id].faces[face] ?? CREATURES[id].faces.idle;

// ---------- stickers ----------
/**
 * A picture as a sticker on paper: a white rim a pixel wide ('3'), an ink
 * outline a pixel wide ('2'), and a faint shadow one pixel down and right ('1')
 * — slanted and light, so it never reads as the ink floor of something pressable.
 */
export function stickerRows(rows: Rows): Rows {
  const rw = Math.max(...rows.map((r) => r.length)), rh = rows.length, P = 2;
  const W = rw + P * 2 + 1, H = rh + P * 2 + 1;
  const g = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') g[y + P][x + P] = r[x]; });
  const filled = (m: string[][], x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && m[y][x] !== '.';
  const grow = (m: string[][], ch: string) => m.map((row, y) => row.map((c, x) => {
    if (c !== '.') return c;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(m, x + dx, y + dy)) return ch;
    return '.';
  }));
  const rim = grow(g, '3'), ring = grow(rim, '2');
  return ring.map((row, y) => row.map((c, x) => (c === '.' && filled(ring, x - 1, y - 1) ? '1' : c)).join(''));
}
export const STICKER_PAL: Palette = { 1: 'rgba(23,18,31,0.22)', 2: INK, 3: '#ffffff' };

export type StickerId = 'trophy' | 'star' | 'sun' | 'flame' | 'flag' | 'cal';
export const STICKERS: Record<StickerId, { pal: Palette; rows: Rows }> = {
  trophy: { pal: { k: INK, Y: '#fff2a6', y: '#ffd23f', o: '#e0a10e' }, rows: R(`
..kkkkkkkkkk..
kkkYyyyyyyokkk
k.kYyyyyyyok.k
k.kYyyyyyyok.k
.kkYyyyyyyokk.
..kYyyyyyyok..
...kyyyyyok...
....kyyyok....
.....kyok.....
.....kyok.....
....kkkkkk....
...kYyyyyok...
...kkkkkkkk...`) },
  star: { pal: { k: INK, Y: '#fff2a6', y: '#ffc23d', o: '#e09a0e' }, rows: R(`
......k......
.....kYk.....
.....kyk.....
kkkkkYyykkkkk
.kYyyyyyyyok.
..kyyyyyyyk..
...kyyyyyk...
...kyyyyok...
..kyyk.kyok..
..kyk...kok..
.kyk.....kok.
.kk.......kk.`) },
  sun: { pal: { k: INK, Y: '#fff2a6', y: '#ffd23f', o: '#f2a91c', r: '#ff8a1f' }, rows: R(`
......r......
..r...r...r..
...r.kkk.r...
....kYYyk....
...kYyyyok...
rr.kYyyyok.rr
...kyyyyok...
....kyyok....
...r.kkk.r...
..r...r...r..
......r......`) },
  flame: { pal: PAL.bo, rows: bo('a', 'happy', 'smile') },
  flag: { pal: { k: INK, r: '#ff4d6d', R: '#ff8fa3' }, rows: R(`
kk..........
kkkkkkkkkkk.
kkRRRRRRRRrk
kkRrrrrrrrk.
kkRrrrrrrk..
kkRrrrrrrrk.
kkrrrrrrrrrk
kkkkkkkkkkk.
kk..........
kk..........
kk..........
kk..........`) },
  cal: { pal: { k: INK, r: '#ff6b4a', w: '#ffffff', g: '#e3dfee' }, rows: R(`
..k.....k...
.kkk...kkk..
kkkkkkkkkkkk
krrrrrrrrrrk
krrrrrrrrrrk
kkkkkkkkkkkk
kwwwwwwwwwwk
kwkkwkkwkkwk
kwwwwwwwwwwk
kwkkwkkwggwk
kwwwwwwwwwwk
kkkkkkkkkkkk`) },
};

/** A palette in greys (by luminance): a badge not yet earned, an unlit flame. */
export function greyed(pal: Palette): Palette {
  const out: Palette = {};
  for (const [k, c] of Object.entries(pal)) {
    const m = /^#([0-9a-f]{6})$/i.exec(c);
    if (!m) { out[k] = c; continue; }
    const n = parseInt(m[1], 16);
    const l = Math.round(0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255));
    const h = l.toString(16).padStart(2, '0');
    out[k] = `#${h}${h}${h}`;
  }
  return out;
}

// ---------- icons ----------
/** Pixel icons on a 12 grid, drawn a pixel to 2pt so their lines are as thick as the outlines. In the text's color. */
export const ICONS = {
  home: R('.....kk..... ....k..k.... ...k....k... ..k......k.. .k........k. kkk......kkk ..k......k.. ..k.kkkk.k.. ..k.k..k.k.. ..k.k..k.k.. ..k.k..k.k.. ..kkkkkkkk..'),
  feed: R('kkkkkkkkkkkk k..........k k.kk.kkkkk.k k.kk.......k k....kkk...k kkkkkkkkkkkk k..........k k.kk.kkkkk.k k.kk.......k k....kkk...k kkkkkkkkkkkk'),
  clock: R('....kkkk.... ..kk....kk.. .k........k. .k....k...k. k.....k....k k.....k....k k.....kkk..k k..........k .k........k. .k........k. ..kk....kk.. ....kkkk....'),
  people: R('..kkk....kkk.. .k...k..k...k. .k...k..k...k. .k...k..k...k. ..kkk....kkk.. .............. .kkkkk..kkkkk. k.....kk.....k k.....kk.....k k.....kk.....k k.....kk.....k kkkkkkkkkkkkkk'),
  person: R('....kkkk.... ...k....k... ...k....k... ...k....k... ....kkkk.... ............ ..kkkkkkkk.. .k........k. k..........k k..........k k..........k kkkkkkkkkkkk'),
  search: R('..kkkk...... .k....k..... k......k.... k......k.... k......k.... k......k.... .k....kk.... ..kkkk.kk... ........kk.. .........kk. ..........kk'),
  bell: R('.....kk..... ....kkkk.... ...k....k... ..k......k.. ..k......k.. ..k......k.. ..k......k.. .k........k. k..........k kkkkkkkkkkkk ....k..k.... .....kk.....'),
  chat: R('.kkkkkkkkkk. k..........k k..........k k.kk.kk.kk.k k..........k k..........k .kk.kkkkkkk. ..k.k....... ..kk........ ..k.........'),
  gear: R('.....kk..... ..k.kkkk.k.. .kkk....kkk. ..k......k.. .k...kk...k. kk..k..k..kk kk..k..k..kk .k...kk...k. ..k......k.. .kkk....kkk. ..k.kkkk.k.. .....kk.....'),
  cal: R('..k.....k... kkkkkkkkkkkk k..........k kkkkkkkkkkkk k..........k k.kk.kk.kk.k k..........k k.kk.kk.kk.k k..........k kkkkkkkkkkkk'),
  play: R('k... kk.. kkk. kkkk kkk. kk.. k...'),
  pause: R('kk..kk kk..kk kk..kk kk..kk kk..kk kk..kk kk..kk'),
  plus: R('...k... ...k... ...k... kkkkkkk ...k... ...k... ...k...'),
  /** − (the record sheet's time; not in the mock's set, drawn as its page does) */
  minus: R('....... ....... ....... kkkkkkk ....... ....... .......'),
  check: R('......k .....k. k...k.. .k.k... ..k....'),
  right: R('k... .k.. ..k. ...k ..k. .k.. k...'),
  left: R('...k ..k. .k.. k... .k.. ..k. ...k'),
  down: R('k.....k .k...k. ..k.k.. ...k...'),
  x: R('k.....k .k...k. ..k.k.. ...k... ..k.k.. .k...k. k.....k'),
  heart: R('.kk...kk. kkkk.kkkk kkkkkkkkk kkkkkkkkk .kkkkkkk. ..kkkkk.. ...kkk... ....k....'),
  'heart-o': R('.kk...kk. k..k.k..k k...k...k k.......k .k.....k. ..k...k.. ...k.k... ....k....'),
  edit: R('.......kk. ......k..k .....k..k. ....k..k.. ...k..k... ..k..k.... .k..k..... k..k...... kkk.......'),
  more: R('kk.kk.kk kk.kk.kk'),
  sort: R('..k...... .kkk..... kkkkk.... ..k...... ..k...k.. ..k...k.. ....kkkkk .....kkk. ......k..'),
  /** the friends list's grip (≡) */
  grip: R('kkkkkkkk ........ ........ kkkkkkkk ........ ........ kkkkkkkk'),
};
export type IconId = keyof typeof ICONS;
