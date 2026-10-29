/*!
 * Inchly 新しい「スタンダード」— 共通の小さな道具（System 担当だけが書く）
 *
 * ページは <body data-tab="home" data-bar="idle"> と書くだけで、下の勉強バーとタブバーが出る。
 * 外のライブラリは使わない。動きは MOTION.md のトークンだけ（CSS 側）。
 *
 *   window.App = {
 *     upgrade(el)            data-* の部品を描く（ページを読んだとき自動で1回）
 *     pix(kind, face, scale) 住人の SVG 文字列     face(el, name)  住人の顔を fade で変える
 *     icon(name, scale)      ドットのアイコンの SVG 文字列
 *     sticker(name, scale)   シール（白いフチ＋インクの輪郭＋影）の SVG 文字列
 *     glyph(name)            科目の線の絵の SVG 文字列
 *     toast({title, sub, exp, pix, face, from, action, ms})
 *     sheet.open(id) / sheet.close(id)
 *     bar.set(state) / bar.state()            勉強バー（idle / live / paused / none）
 *     renderStudyBar(opts) / renderTabBar(tab, opts)   部品の一覧ページ用
 *     reduced()  動きを減らす設定か     scroller()  いまスクロールしている箱
 *     SUBJ, PEOPLE                      見本のデータ（アプリの data.ts と同じ）
 *   }
 */
(() => {
  'use strict';
  if (window.App) return;
  const doc = document;
  const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const WIDE = window.matchMedia ? matchMedia('(min-width: 431px)') : { matches: false };
  const reduced = () => RMQ.matches;
  const INK = '#17121F';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* =====================================================================
   * 1. 見本のデータ（inchly-app/src/data.ts と store.ts の値）
   * ===================================================================== */
  const SUBJ = {
    en: { name: '英語', c: '#5856D6', g: 'bubble', task: '長文読解 第3講' },
    ma: { name: '数学', c: '#FF9500', g: 'pi', task: '青チャート 数III 例題41〜50' },
    ph: { name: '物理', c: '#30B0C7', g: 'atom', task: '名問の森 電磁気 15' },
    ch: { name: '化学', c: '#1F7FB0', g: 'flask', task: '有機 構造決定 演習' },
    ja: { name: '国語', c: '#D9A300', g: 'book', task: '古文単語 315 · 61〜80' },
    wh: { name: '世界史', c: '#A0522D', g: 'temple', task: '' },
    bi: { name: '生物', c: '#1F7FB0', g: 'leaf', task: '' },
    jh: { name: '日本史', c: '#C2410C', g: 'torii', task: '' },
    gen: { name: '現代文', c: '#B88600', g: 'book', task: '' },
    free: { name: '自習', c: '#8C93A0', g: null, task: '' }
  };
  const PEOPLE = [
    { n: 'mio', h: 'mio.k', c: '#C47A55', s: '英語', g: '東大 文一' },
    { n: 'そら', h: 'sora_06', c: '#5D6DB8', s: '数学', g: '東大 理一' },
    { n: 'kaito', h: 'kaito', c: '#3E8C78', s: '物理', g: '科学大' },
    { n: 'ゆなっぴ', h: 'yuna', c: '#8E6283', s: '化学', g: '東大 理二' },
    { n: 'れん', h: 'ren.d', c: '#4B7A3B', s: '世界史', g: '一橋' },
    { n: 'taku', h: 'taku_1203', c: '#8A6D3B', s: '数学', g: '京大 工' },
    { n: 'さき', h: 'saki.ozw', c: '#B4545C', s: '生物', g: '医学部' },
    { n: 'ゆうき', h: 'yk_ronin', c: '#5B7B8E', s: '日本史', g: '早稲田' },
    { n: 'つばさ', h: 'tsubasa_t', c: '#5D6DB8', s: '英語', g: '東大 理一' },
    { n: 'あおい', h: 'aoi_07', c: '#3E8C78', s: '現代文', g: '阪大' },
    { n: 'ひなた', h: 'hinata.s', c: '#B39548', s: '化学', g: '東大 理二' },
    { n: 'はる', h: 'haru_study', c: '#6E56CF', s: '国語', g: '東大 理一' }
  ];

  /* =====================================================================
   * 2. ドット絵 — 文字の行で描く（'.' は透明、ほかはパレットの色）
   *    住人6匹はサイトの js/pix.js の定義をそのまま写した（Inchly の絵）。
   * ===================================================================== */
  const R = s => s.trim().split(/\s+/);
  const pts = (rows, list) => { const g = rows.map(r => r.split('')); for (const [x, y, c] of list) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c; return g.map(r => r.join('')); };
  const blank = w => '.'.repeat(w);
  const rowAt = (w, xs, ch = 'k') => { const a = Array(w).fill('.'); xs.forEach(x => { if (x >= 0 && x < w) a[x] = ch; }); return a.join(''); };
  const shiftX = (rows, dx) => rows.map(r => dx > 0 ? '.'.repeat(dx) + r.slice(0, r.length - dx) : r.slice(-dx) + '.'.repeat(-dx));
  const padX = (rows, n) => rows.map(r => '.'.repeat(n) + r + '.'.repeat(n));
  const splice = (rows, at, repl) => { const o = rows.slice(); repl.forEach((r, i) => { o[at + i] = r; }); return o; };

  /* ペンタ：えんぴつ（頭はピンクの消しゴムの側） */
  const PENTA_BODY = R(`
.....kkkkkkkkkkkkkk.
...kkYYYYYYYMqPPPPPk
.kLnnyyyyyyyMqpppppk
kLLnnyyyyyyymqpppppk
.kLNNooooooomqpppppk
...kkOOOOOOOqqrrrrrk
.....kkkkkkkkkkkkkk.`);
  const PE = {
    open: [[15, 2, 'k'], [15, 3, 'k'], [17, 2, 'k'], [17, 3, 'k'], [16, 4, 'r']],
    blink: [[15, 3, 'k'], [17, 3, 'k'], [16, 4, 'r']],
    down: [[15, 3, 'k'], [15, 4, 'k'], [17, 3, 'k'], [17, 4, 'k']],
    back: [[14, 2, 'k'], [14, 3, 'k'], [16, 2, 'k'], [16, 3, 'k'], [15, 4, 'r']],
    up: [[15, 1, 'k'], [15, 2, 'k'], [17, 1, 'k'], [17, 2, 'k'], [16, 4, 'r']],
    wide: [[15, 1, 'k'], [15, 2, 'k'], [15, 3, 'k'], [17, 1, 'k'], [17, 2, 'k'], [17, 3, 'k'], [16, 4, 'k']],
    happy: [[14, 3, 'k'], [15, 2, 'k'], [16, 3, 'k'], [17, 2, 'k'], [18, 3, 'k']]
  };
  const PL = [6, 9, 13, 16];
  const penta = eyes => [...pts(PENTA_BODY, PE[eyes]), rowAt(20, PL), rowAt(20, PL)];

  /* ボッ：連続記録の炎 */
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
  const BO_TIP = { a: BO.slice(0, 3), b: R(`......k...... .....kyk..... .....kyrk....`), c: R(`........k.... .......kyk... ......kyork..`) };
  const BO_EYE = {
    open: [BO[8], BO[9], BO[10]],
    blink: ['.kyoooooooork', 'kyookkookkork', BO[10]],
    up: ['.kyowkoowkork', 'kyoowwoowwork', BO[10]],
    happy: ['.kyokoookoork', 'kyokokokokork', BO[10]]
  };
  const BO_MOUTH = { smile: [BO[11], BO[12]], open: ['kroyYYkkYYork', '.kroyYkkYyrk.'], calm: ['kroyYYYYYYork', BO[12]] };
  const bo = (tip = 'a', eye = 'open', mouth = 'smile') => [...BO_TIP[tip], ...BO.slice(3, 8), ...BO_EYE[eye], ...BO_MOUTH[mouth], ...BO.slice(13)];

  /* めぶ：植木鉢の芽 */
  const MEBU_LEAF = {
    n: R(`.kkk....kkk. kGGgk..kgGGk kGgggkkgggGk .kgggkkgggk. ..kkkhhkkk..`),
    up: R(`..kk....kk.. .kGgk..kgGk. .kGgk..kgGk. ..kggkkggk.. ...kkhhkk...`)
  };
  MEBU_LEAF.l = [...shiftX(MEBU_LEAF.n.slice(0, 4), -1), MEBU_LEAF.n[4]];
  const MEBU_POT = R(`.....hh..... kkkkkkkkkkkk kTTTTTTTTTtk ktttttttttuk .kkkkkkkkkk. .kTttttttuk.`);
  const MEBU_FACE = {
    open: R(`.kTwkttwkuk. .kTkkttkkuk. .kbttkkttbk.`),
    blink: R(`.kTttttttuk. .kTkkttkkuk. .kbttkkttbk.`),
    shy: R(`.kTttttttuk. .kTkkttkkuk. .kbbtkktbbk.`)
  };
  const MEBU_BASE = R(`..kttttttk.. ...kkkkkk...`);
  const MEBU_BOOK = R(`kppppkkppppk kccccCCcccck .kkkkkkkkkk.`);
  const mebu = (leaf = 'n', face = 'open', book = false) => { let f = [...MEBU_LEAF[leaf], ...MEBU_POT, ...MEBU_FACE[face], ...MEBU_BASE]; if (book) f = splice(f, 13, MEBU_BOOK); return f; };

  /* ジリ：目ざまし時計 */
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
  const jiri = (eye = 'open', ring = false) => {
    const f = JIRI.slice();
    if (eye === 'blink') { f[7] = '.kRrwwwwwwwrek.'; f[8] = '.kRrkkwwwkkrek.'; }
    if (eye === 'scared') { f[7] = '.kRrwwwwwwwrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwkkkwgek..'; }
    if (eye === 'happy') { f[7] = '.kRrwkwwwkwrek.'; f[8] = '.kRrkwkwkwkrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwwwwwgek..'; }
    if (ring) { for (let y = 0; y < 3; y++) { const r = f[y]; f[y] = r.slice(1, 7) + '.' + r[7] + '.' + r.slice(8, 14); } }
    return f;
  };

  /* ふせん：付せん */
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
  const FUSEN_EYE = { c: [0, 0], l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1] };
  const fusen = (look = 'c', mode = 'open') => {
    if (mode === 'blink') return pts(FUSEN, [[4, 6, 'k'], [5, 6, 'k'], [8, 6, 'k'], [9, 6, 'k']]);
    if (mode === 'eep') return pts(FUSEN, [[4, 5, 'k'], [9, 5, 'k'], [6, 8, 'k'], [7, 8, 'k'], [6, 9, 'k'], [7, 9, 'k']]);
    const [dx, dy] = FUSEN_EYE[look]; const e = [];
    for (const ex of [4, 8]) { const x = ex + dx, y = 4 + dy; e.push([x, y, 'w'], [x + 1, y, 'k'], [x, y + 1, 'k'], [x + 1, y + 1, 'k'], [x, y + 2, 'k'], [x + 1, y + 2, 'k']); }
    return pts(FUSEN, e);
  };

  /* つる：折り鶴 */
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
  const TSURU = { sit: TSURU_SIT, up: TSURU_UP, blink: pts(TSURU_SIT, [[15, 1, 'w']]), look: pts(TSURU_SIT, [[17, 0, 'r'], [17, 2, '.']]) };

  const PAL = {
    penta: { k: INK, L: '#5a5468', n: '#f7d3a1', N: '#d9995a', Y: '#fff2a6', y: '#ffd23f', o: '#f2a91c', O: '#cf8410', M: '#f4f2fa', m: '#c9c5d6', q: '#8d88a2', P: '#ffc9db', p: '#ff8fb6', r: '#e0588a', w: '#ffffff' },
    bo: { k: INK, R: '#d8341c', r: '#ff5b2e', o: '#ff8a1f', y: '#ffc93a', Y: '#fff1a8', w: '#ffffff' },
    mebu: { k: INK, G: '#c4f27a', g: '#7bd63a', h: '#3f9a2a', T: '#f4a46b', t: '#de7740', u: '#ad4f22', c: '#58a6ff', C: '#2f6fd8', p: '#f6f1e4', w: '#ffffff', b: '#ff8fa8' },
    jiri: { k: INK, R: '#ff8a80', r: '#f2433f', e: '#c02336', y: '#ffd23f', Y: '#fff2a8', o: '#e0a10e', w: '#ffffff', g: '#dcd7e6', b: '#ff9cc2' },
    fusen: { k: INK, a: '#f6d443', Y: '#fff6b0', y: '#ffe55c', o: '#f2c21b', O: '#d29a0a', w: '#ffffff', b: '#ff9cb0' },
    tsuru: { k: INK, w: '#ffffff', g: '#e3dfee', r: '#ff4d6d' }
  };

  /* 住人と顔。どの住人にも idle / happy / surprised / sleep がある（そろえた名前） */
  const CREATURES = {
    penta: { label: 'ペンタ', w: 20, h: 9, pal: PAL.penta, faces: { idle: penta('open'), happy: penta('happy'), surprised: penta('wide'), sleep: penta('blink'), look: penta('up') } },
    bo: { label: 'ボッ', w: 13, h: 15, pal: PAL.bo, faces: { idle: bo('a'), happy: bo('a', 'happy', 'open'), surprised: bo('b', 'up', 'open'), sleep: bo('a', 'blink', 'calm'), look: bo('c', 'up') } },
    mebu: { label: 'めぶ', w: 12, h: 16, pal: PAL.mebu, faces: { idle: mebu(), happy: mebu('up', 'shy'), surprised: mebu('up', 'open'), sleep: mebu('n', 'blink'), read: mebu('n', 'blink', true) } },
    jiri: { label: 'ジリ', w: 15, h: 15, pal: PAL.jiri, faces: { idle: jiri(), happy: jiri('happy'), surprised: jiri('scared'), sleep: jiri('blink'), ring: jiri('happy', true) } },
    fusen: { label: 'ふせん', w: 14, h: 13, pal: PAL.fusen, faces: { idle: fusen('c'), happy: fusen('c', 'blink'), surprised: fusen('c', 'eep'), sleep: fusen('d'), look: fusen('u') } },
    tsuru: { label: 'つる', w: 18, h: 13, pal: PAL.tsuru, faces: { idle: TSURU.sit, happy: TSURU.up, surprised: TSURU.look, sleep: TSURU.blink } }
  };
  const ALIAS = { pen: 'penta', pencil: 'penta', flame: 'bo', fire: 'bo', sprout: 'mebu', clock: 'jiri', note: 'fusen', crane: 'tsuru' };

  /* 行 → SVG。同じ色が横に続く所は1本の四角にまとめる */
  function rowsSVG(rows, pal, scale = 3, size) {
    const rw = Math.max(...rows.map(r => r.length));
    const w = (size && size.w) || rw, h = (size && size.h) || rows.length;
    const ox = Math.floor((w - rw) / 2), oy = h - rows.length;
    const paths = {};
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (ch === '.' || !(ch in pal)) { x++; continue; }
        let e = x + 1; while (e < r.length && r[e] === ch) e++;
        (paths[ch] || (paths[ch] = [])).push(`M${ox + x} ${oy + y}h${e - x}v1h${x - e}z`);
        x = e;
      }
    });
    const body = Object.keys(pal).filter(ch => paths[ch]).map(ch => `<path fill="${pal[ch]}" d="${paths[ch].join('')}"/>`).join('');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w * scale}" height="${h * scale}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${body}</svg>`;
  }
  function pix(kind, face = 'idle', scale = 3) {
    const c = CREATURES[ALIAS[kind] || kind];
    if (!c) return '';
    return rowsSVG(c.faces[face] || c.faces.idle, c.pal, scale, { w: c.w, h: c.h });
  }

  /* シール：絵のまわりに 白いフチ（1マス）→ インクの輪郭（1マス）→ 右下にずれた薄い影 */
  function stickerRows(rows) {
    const rw = Math.max(...rows.map(r => r.length)), rh = rows.length, P = 2;
    const W = rw + P * 2 + 1, H = rh + P * 2 + 1;
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') g[y + P][x + P] = r[x]; });
    const filled = (m, x, y) => y >= 0 && y < H && x >= 0 && x < W && m[y][x] !== '.';
    const dil = (m, ch) => m.map((row, y) => row.map((c, x) => { if (c !== '.') return c; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(m, x + dx, y + dy)) return ch; return '.'; }));
    const rim = dil(g, '3'), ring = dil(rim, '2');
    const out = ring.map((row, y) => row.map((c, x) => (c === '.' && filled(ring, x - 1, y - 1)) ? '1' : c));
    return out.map(r => r.join(''));
  }
  const STK_ART = {
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
kkkkkkkkkkkk`) }
  };
  function sticker(name, scale = 2) {
    const a = STK_ART[name] || (CREATURES[name] && { pal: CREATURES[name].pal, rows: CREATURES[name].faces.idle });
    if (!a) return '';
    const pal = Object.assign({ 1: 'rgba(23,18,31,.22)', 2: INK, 3: '#ffffff' }, a.pal);
    return rowsSVG(stickerRows(a.rows), pal, scale);
  }

  /* ドットのアイコン（12マス。1マス2pt で 24pt）。色は文字の色 */
  const ICONS = {
    home: R(`.....kk..... ....k..k.... ...k....k... ..k......k.. .k........k. kkk......kkk ..k......k.. ..k.kkkk.k.. ..k.k..k.k.. ..k.k..k.k.. ..k.k..k.k.. ..kkkkkkkk..`),
    feed: R(`kkkkkkkkkkkk k..........k k.kk.kkkkk.k k.kk.......k k....kkk...k kkkkkkkkkkkk k..........k k.kk.kkkkk.k k.kk.......k k....kkk...k kkkkkkkkkkkk`),
    clock: R(`....kkkk.... ..kk....kk.. .k........k. .k....k...k. k.....k....k k.....k....k k.....kkk..k k..........k .k........k. .k........k. ..kk....kk.. ....kkkk....`),
    people: R(`..kkk....kkk.. .k...k..k...k. .k...k..k...k. .k...k..k...k. ..kkk....kkk.. .............. .kkkkk..kkkkk. k.....kk.....k k.....kk.....k k.....kk.....k k.....kk.....k kkkkkkkkkkkkkk`),
    person: R(`....kkkk.... ...k....k... ...k....k... ...k....k... ....kkkk.... ............ ..kkkkkkkk.. .k........k. k..........k k..........k k..........k kkkkkkkkkkkk`),
    search: R(`..kkkk...... .k....k..... k......k.... k......k.... k......k.... k......k.... .k....kk.... ..kkkk.kk... ........kk.. .........kk. ..........kk`),
    bell: R(`.....kk..... ....kkkk.... ...k....k... ..k......k.. ..k......k.. ..k......k.. ..k......k.. .k........k. k..........k kkkkkkkkkkkk ....k..k.... .....kk.....`),
    chat: R(`.kkkkkkkkkk. k..........k k..........k k.kk.kk.kk.k k..........k k..........k .kk.kkkkkkk. ..k.k....... ..kk........ ..k.........`),
    gear: R(`.....kk..... ..k.kkkk.k.. .kkk....kkk. ..k......k.. .k...kk...k. kk..k..k..kk kk..k..k..kk .k...kk...k. ..k......k.. .kkk....kkk. ..k.kkkk.k.. .....kk.....`),
    cal: R(`..k.....k... kkkkkkkkkkkk k..........k kkkkkkkkkkkk k..........k k.kk.kk.kk.k k..........k k.kk.kk.kk.k k..........k kkkkkkkkkkkk`),
    play: R(`k... kk.. kkk. kkkk kkk. kk.. k...`),
    pause: R(`kk..kk kk..kk kk..kk kk..kk kk..kk kk..kk kk..kk`),
    plus: R(`...k... ...k... ...k... kkkkkkk ...k... ...k... ...k...`),
    check: R(`......k .....k. k...k.. .k.k... ..k....`),
    right: R(`k... .k.. ..k. ...k ..k. .k.. k...`),
    left: R(`...k ..k. .k.. k... .k.. ..k. ...k`),
    down: R(`k.....k .k...k. ..k.k.. ...k...`),
    x: R(`k.....k .k...k. ..k.k.. ...k... ..k.k.. .k...k. k.....k`),
    heart: R(`.kk...kk. kkkk.kkkk kkkkkkkkk kkkkkkkkk .kkkkkkk. ..kkkkk.. ...kkk... ....k....`),
    'heart-o': R(`.kk...kk. k..k.k..k k...k...k k.......k .k.....k. ..k...k.. ...k.k... ....k....`),
    edit: R(`.......kk. ......k..k .....k..k. ....k..k.. ...k..k... ..k..k.... .k..k..... k..k...... kkk.......`),
    more: R(`kk.kk.kk kk.kk.kk`),
    sort: R(`..k...... .kkk..... kkkkk.... ..k...... ..k...k.. ..k...k.. ....kkkkk .....kkk. ......k..`)
  };
  /* どのアイコンも 1マス 2pt（線の太さが輪郭と同じ）。小さな ▶ ❚❚ ＋ ✓ › はマスの数を減らして小さくする */
  function icon(name, scale) {
    const rows = ICONS[name];
    if (!rows) return '';
    return rowsSVG(rows, { k: 'currentColor' }, scale || 2);
  }

  /* 科目の線の絵（inchly-app の SubjectGlyph と同じ線。インクで描く） */
  const GLYPH = {
    flask: '<path d="M9.5 3.5h5M10.5 3.5v5.3L5.3 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.7-2.9l-5.2-8.8V3.5"/><path d="M7.4 14.6h9.2"/><circle cx="11" cy="17.3" r=".9" fill="currentColor" stroke="none"/><circle cx="14" cy="16.6" r=".7" fill="currentColor" stroke="none"/>',
    atom: '<circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/>',
    leaf: '<path d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"/><path d="M5 19l9-9M10 14.2V11M12.6 11.4H15"/>',
    mountain: '<path d="M2.5 19.5l6.5-10 4 6 2.5-3.5 6 7.5z"/><path d="M7.2 12.3l1.8 1.3 1.6-1.4"/><circle cx="17.5" cy="6" r="1.8"/>',
    pi: '<path d="M4.5 8c.9-1.3 2.1-2 3.6-2h11.4M9.6 6v12.5M15 6v9.8c0 1.5.8 2.6 2.4 2.6.9 0 1.6-.4 2.1-1"/>',
    bubble: '<path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-8l-4.5 3.5v-3.5H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><path d="M9.4 14l2.6-6.4 2.6 6.4M10.3 12h3.4"/>',
    headphones: '<path d="M4.5 15v-3a7.5 7.5 0 0 1 15 0v3"/><rect x="3.5" y="13.5" width="4" height="6.5" rx="1.6"/><rect x="16.5" y="13.5" width="4" height="6.5" rx="1.6"/>',
    pen: '<path d="M4.5 19.5l1.2-4.3L15.8 5.1a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L8.8 18.3zM14 7l3 3M4.5 19.5h7"/>',
    book: '<path d="M12 6.6C9.6 5 6.6 4.7 3.5 5.4v13c3.1-.7 6.1-.4 8.5 1.2 2.4-1.6 5.4-1.9 8.5-1.2v-13c-3.1-.7-6.1-.4-8.5 1.2zM12 6.6v13"/>',
    scroll: '<path d="M7 4h10.5A2.5 2.5 0 0 1 20 6.5V8h-3M7 4a2.5 2.5 0 0 0-2.5 2.5V8H7M7 4a2.5 2.5 0 0 1 2.5 2.5v11A2.5 2.5 0 0 0 12 20h7.5M17 8v9.5a2.5 2.5 0 0 0 2.5 2.5M12.5 9.5h2.5M12.5 12.5h2.5M12.5 15.5h2"/>',
    brush: '<path d="M14.5 4.2l5.3 5.3-6.3 6.3-5.3-5.3zM8.2 10.5l5.3 5.3-2.6 2.6c-1.6 1.6-4.2 2.1-6.9 2.1 0-2.7.5-5.3 2.1-6.9z"/>',
    temple: '<path d="M3.5 9L12 4l8.5 5zM5.8 9.5v7.5M9.9 9.5v7.5M14.1 9.5v7.5M18.2 9.5v7.5M4 17.5h16M3 20h18"/>',
    torii: '<path d="M3 5.2c6 1.3 12 1.3 18 0M4.5 9.2h15M7 6.2V20M17 6.2V20M12 6.6v2.6"/>',
    map: '<path d="M3 6.5L9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20"/>',
    scales: '<path d="M12 4v15.5M8 19.5h8M5 7.5h14M5 7.5l-2.6 6h5.2zM19 7.5l-2.6 6h5.2zM2.4 13.5a2.6 2.6 0 0 0 5.2 0M16.4 13.5a2.6 2.6 0 0 0 5.2 0"/>',
    laptop: '<rect x="5" y="5.5" width="14" height="10" rx="1.6"/><path d="M3 18.5h18M10.2 8.8l-1.9 1.9 1.9 1.9M13.8 8.8l1.9 1.9-1.9 1.9"/>'
  };
  const glyph = (name, width = 2) => GLYPH[name] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${GLYPH[name]}</svg>` : '';

  /* ロゴの印：高さの上がる5本の目盛り（ドット）と、いちばん上のライムの芽 */
  const LOGO = '<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true" focusable="false"><rect width="16" height="16" rx="3" fill="#17121F"/><rect x="1" y="10" width="2" height="3" fill="#E5484D"/><rect x="4" y="8" width="2" height="5" fill="#F2C46D"/><rect x="7" y="6" width="2" height="7" fill="#9AB8DB"/><rect x="10" y="4" width="2" height="9" fill="#5B8DEF"/><rect x="13" y="2" width="2" height="11" fill="#9D7BF5"/><rect x="13" y="0" width="2" height="1" fill="#C6F432"/></svg>';

  /* =====================================================================
   * 3. data-* の部品を描く
   * ===================================================================== */
  function subjTile(el) {
    const id = el.dataset.s || 'free';
    if (id === 'none') { el.classList.add('is-none'); el.innerHTML = el.innerHTML || `<span class="pi">${icon('cal')}</span>`; return; }
    const s = SUBJ[id] || { name: el.dataset.name || id, c: el.dataset.c || '#8C93A0', g: el.dataset.g || null };
    el.style.setProperty('--c', el.dataset.c || s.c);
    const keep = el.querySelector('.dot');
    el.innerHTML = s.g ? glyph(s.g) : `<span class="subj-l">${esc((s.name || '?')[0])}</span>`;
    if (keep) el.appendChild(keep);
    if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-hidden')) { el.setAttribute('role', 'img'); el.setAttribute('aria-label', s.name); }
  }
  function avatar(el) {
    const p = PEOPLE.find(x => x.n === el.dataset.n);
    if (p && !el.style.getPropertyValue('--c')) el.style.setProperty('--c', p.c);
    if (!el.textContent.trim()) el.textContent = (el.dataset.n || '?').slice(0, 1).toUpperCase();
    if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
  }

  /* 草：18週 × 7日。今日は 2026-10-29（木）。data-levels で中身を渡せる（列ごとに月→日、0〜4） */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function grass(el) {
    const weeks = +el.dataset.weeks || 18;
    const todayRow = el.dataset.todayRow != null ? +el.dataset.todayRow : 3;
    const empty = el.hasAttribute('data-empty');
    const given = (el.dataset.levels || '').replace(/[^0-4]/g, '');
    const r = rng(+el.dataset.seed || 29);
    const end = new Date(2026, 9, 26); // 最後の列の月曜
    const cells = [], months = [];
    let lastM = -1, lastAt = -9;
    for (let w = 0; w < weeks; w++) {
      const mon = new Date(end); mon.setDate(end.getDate() - (weeks - 1 - w) * 7);
      if (mon.getMonth() !== lastM) { if (w - lastAt >= 3 || lastAt < 0) { months.push([w, mon.getMonth() + 1]); lastAt = w; } lastM = mon.getMonth(); }
      for (let d = 0; d < 7; d++) {
        const i = w * 7 + d;
        const last = w === weeks - 1;
        let cls = 'gc', l = 0;
        if (last && d > todayRow) cls += ' future';
        else if (!empty) {
          if (given) l = +given[i] || 0;
          else { const x = r(); l = x < .14 ? 0 : x < .27 ? 1 : x < .52 ? 2 : x < .78 ? 3 : 4; }
        }
        if (last && d === todayRow) { cls += ' today'; if (!empty && !given) l = 3; }
        cells.push(`<i class="${cls}" data-l="${l}"></i>`);
      }
    }
    const pct = w => (w / weeks * 100).toFixed(2) + '%';
    el.setAttribute('role', 'img');
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', empty ? '勉強した日：まだありません' : '勉強した日の草。濃い緑ほど長く勉強した日');
    el.innerHTML =
      `<div class="grass-m" aria-hidden="true">${months.map(([w, m]) => `<span style="left:${pct(w)}">${m}月</span>`).join('')}</div>` +
      `<div class="grass-d" aria-hidden="true"><span>月</span><span></span><span>水</span><span></span><span>金</span><span></span><span></span></div>` +
      `<div class="grass-c" style="grid-template-columns:repeat(${weeks},minmax(0,1fr))" aria-hidden="true">${cells.join('')}</div>` +
      (el.hasAttribute('data-nokey') ? '' : `<div class="grass-k" aria-hidden="true"><span>少</span><i style="background:var(--g0)"></i><i style="background:var(--g1)"></i><i style="background:var(--g2)"></i><i style="background:var(--g3)"></i><i style="background:var(--g4)"></i><span>多</span></div>`);
  }

  /* インチテープ：data-goal="180" data-parts="en:95,ma:40,ja:30"（分） */
  const fmt = m => `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, '0')}`;
  function tape(el) {
    const goal = +el.dataset.goal || 180;
    const parts = (el.dataset.parts || '').split(',').filter(Boolean).map(p => { const [id, min] = p.split(':'); const s = SUBJ[id] || { name: id, c: '#8C93A0' }; return { name: s.name, c: s.c, min: +min }; }).filter(p => p.min > 0);
    const total = parts.reduce((a, p) => a + p.min, 0);
    const end = Math.max(goal + 60, Math.ceil((total + 30) / 60) * 60);
    const x = m => (m / end * 100).toFixed(3) + '%';
    const reached = total >= goal;
    let ticks = '';
    for (let m = 0; m <= end; m += 15) ticks += `<i class="${m % 60 ? '' : 'h'}" style="left:${x(m)}"></i>`;
    let labels = '';
    for (let h = 0; h * 60 <= end; h++) {
      if (Math.abs(h * 60 - goal) < 40) continue;
      labels += `<span class="${h === 0 ? 'first' : h * 60 === end ? 'last' : ''}" style="left:${x(h * 60)}">${h === 0 ? '0' : h + 'h'}</span>`;
    }
    labels += `<span class="goal${reached ? ' is-done' : ''}" style="left:${x(goal)}">目標 ${goal % 60 ? fmt(goal) : goal / 60 + 'h'}</span>`;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `今日 ${Math.floor(total / 60)}時間${total % 60}分。目標は${goal / 60}時間。` + parts.map(p => `${p.name} ${p.min}分`).join('、'));
    el.innerHTML =
      `<div class="tape-bar" aria-hidden="true"><div class="tape-fill${el.hasAttribute('data-reveal') && !reduced() ? ' is-reveal' : ''}">${parts.map(p => `<i class="tape-seg" style="--c:${p.c};width:${x(p.min)}"></i>`).join('')}</div></div>` +
      `<div class="tape-rule" aria-hidden="true">${ticks}<b class="tape-goal" style="left:${x(goal)}"></b>${labels}</div>` +
      (el.hasAttribute('data-nokey') ? '' : `<div class="tape-key" aria-hidden="true">${parts.map(p => `<span><i style="--c:${p.c}"></i>${esc(p.name)} <b>${fmt(p.min)}</b></span>`).join('')}${reached ? '' : `<span><i class="rest"></i>目標まで <b>${fmt(goal - total)}</b></span>`}</div>`);
  }

  function upgradeKey(el) {
    if (el.querySelector(':scope > .face')) return;
    const face = doc.createElement('span'); face.className = 'face';
    while (el.firstChild) face.appendChild(el.firstChild);
    el.appendChild(face);
  }

  function upgrade(root = doc) {
    root.querySelectorAll('.key, .chip').forEach(upgradeKey);
    root.querySelectorAll('[data-pi]').forEach(el => { if (!el.firstElementChild) { el.innerHTML = icon(el.dataset.pi, el.dataset.scale && +el.dataset.scale); el.classList.add('pi'); if (!el.hasAttribute('aria-label')) el.setAttribute('aria-hidden', 'true'); } });
    root.querySelectorAll('[data-pix]').forEach(el => { if (!el.firstElementChild) { el.classList.add('pix'); el.innerHTML = pix(el.dataset.pix, el.dataset.face || 'idle', +el.dataset.scale || 3); if (!el.hasAttribute('aria-label')) el.setAttribute('aria-hidden', 'true'); else el.setAttribute('role', 'img'); } });
    root.querySelectorAll('[data-stk]').forEach(el => { if (!el.firstElementChild) { el.classList.add('stk'); el.innerHTML = sticker(el.dataset.stk, +el.dataset.scale || 2); if (!el.hasAttribute('aria-label')) el.setAttribute('aria-hidden', 'true'); } });
    root.querySelectorAll('.flame').forEach(el => {
      if (el.firstElementChild) return;
      const days = el.dataset.days != null ? +el.dataset.days : 1;
      el.classList.toggle('is-out', days === 0);
      el.innerHTML = pix('bo', days === 0 ? 'sleep' : 'idle', +el.dataset.scale || 3);
      if (!el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');
    });
    root.querySelectorAll('.subj').forEach(subjTile);
    root.querySelectorAll('.av').forEach(avatar);
    root.querySelectorAll('.grass').forEach(el => { if (!el.firstElementChild) grass(el); });
    root.querySelectorAll('.tape').forEach(el => { if (!el.firstElementChild) tape(el); });
    root.querySelectorAll('.hdr[data-hdr]').forEach(header);
  }

  /* 住人の顔を変える（重ねた新しい絵が 0.2 秒で fade。動きを減らす設定ならすぐ差しかえ） */
  function face(el, name) {
    if (!el) return;
    const kind = el.dataset.pix || 'bo', scale = +el.dataset.scale || 3;
    el.dataset.face = name;
    const svg = pix(kind, name, scale);
    if (reduced()) { el.innerHTML = svg; return; }
    const top = doc.createElement('span'); top.className = 'pix-in'; top.innerHTML = svg;
    el.appendChild(top);
    top.addEventListener('animationend', () => { el.innerHTML = svg; }, { once: true });
  }

  /* =====================================================================
   * 4. ヘッダー：<header class="hdr" data-hdr="home"></header>
   *    home = ロゴ・Lv・さがす/お知らせ/メッセージ   search = さがすだけ   gear = 設定だけ
   *    data-title="10月29日（木）" で左に短い文字（勉強タブの日付など）
   * ===================================================================== */
  function header(el) {
    if (el.dataset.done) return; el.dataset.done = '1';
    const kind = el.dataset.hdr;
    const title = el.dataset.title;
    const left = kind === 'home'
      ? `<a class="logo" href="home.html" aria-label="Inchly ホーム">${LOGO}<span class="logo-word" aria-hidden="true">inchly</span></a>` +
        `<button class="key key-sm lv" type="button" data-open-sheet="sheet-level" aria-label="レベル 25。押すとくわしく"><span class="face"><span class="lv-n">Lv.25</span><span class="lv-bar"><i style="--p:.4"></i></span></span></button>`
      : title ? `<p class="hdr-t">${esc(title)}</p>` : '';
    const btn = (pi, label, dot) => `<button type="button" data-soon aria-label="${label}${dot ? '（未読あり）' : ''}"><i class="pi">${icon(pi)}</i>${dot ? '<span class="udot"></span>' : ''}</button>`;
    const right = kind === 'home' ? `<div class="kgroup">${btn('search', 'さがす')}${btn('bell', 'お知らせ', 1)}${btn('chat', 'メッセージ', 1)}</div>`
      : kind === 'search' ? `<div class="kgroup">${btn('search', 'さがす')}</div>`
      : kind === 'gear' ? `<div class="kgroup">${btn('gear', '設定')}</div>` : '';
    el.innerHTML = left + right + el.innerHTML;
  }

  /* =====================================================================
   * 5. 下の2本のバー（勉強バー・タブバー）
   * ===================================================================== */
  const TABS = [
    { id: 'home', href: 'home.html', pi: 'home', label: 'ホーム' },
    { id: 'timeline', href: 'timeline.html', pi: 'feed', label: 'タイムライン' },
    { id: 'study', href: 'study.html', pi: 'clock', label: '勉強（時間割・締切）' },
    { id: 'community', href: 'community.html', pi: 'people', label: 'みんな' },
    { id: 'me', href: 'me.html', pi: 'person', label: 'マイページ' }
  ];
  function renderTabBar(tab, opt = {}) {
    const nav = doc.createElement('nav');
    nav.className = 'tabbar'; nav.setAttribute('aria-label', 'タブ');
    const st = opt.study; // 'live' | 'paused' | undefined
    nav.innerHTML = TABS.map(t => {
      const cur = t.id === tab;
      const dot = t.id === 'study' && st && st !== 'idle' && !cur ? `<i class="dot ${st === 'paused' ? 'pause' : 'run'}"></i>` : '';
      const lab = t.id === 'study' && st === 'live' && !cur ? `${t.label}・勉強中` : t.id === 'study' && st === 'paused' && !cur ? `${t.label}・一時停止中` : t.label;
      return `<a class="tab" href="${t.href}"${cur ? ' aria-current="page"' : ''} aria-label="${lab}"><span class="tab-plate"><i class="pi">${icon(t.pi)}</i>${dot}</span></a>`;
    }).join('');
    return nav;
  }

  const BAR_DEFAULT = {
    idle: { subj: 'en', next: true, title: '英語 · 長文読解', sub: '次 · 17:00から' },
    live: { subj: 'ja', title: '国語', elapsed: 39 * 60 + 24, plan: 60, tail: '予定 1時間' }
  };
  const clock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  function renderStudyBar(o = {}) {
    const state = o.state || 'idle';
    const el = doc.createElement('div');
    el.className = 'sbar'; el.dataset.state = state;
    const href = o.href || 'timer.html';
    if (state === 'idle') {
      const d = Object.assign({}, BAR_DEFAULT.idle, o);
      const tile = d.subj === 'none' ? `<span class="subj is-none" data-s="none" aria-hidden="true"></span>` : `<span class="subj${d.next ? ' is-next' : ''}" data-s="${d.subj}" aria-hidden="true"></span>`;
      el.innerHTML = `<div class="sbar-face">
        <a class="sbar-main" href="${href}" aria-label="タイマーを開く。${esc(d.title)}、${esc(d.sub)}">${tile}<span class="sbar-txt"><span class="sbar-t">${esc(d.title)}</span><span class="sbar-s">${esc(d.sub)}</span></span></a>
        <a class="key key-lime key-sm sbar-go" href="${o.goHref || href}"><span class="face"><i class="pi">${icon('play')}</i>勉強を開始</span></a>
      </div>`;
    } else {
      const d = Object.assign({}, BAR_DEFAULT.live, o);
      const s = SUBJ[d.subj] || SUBJ.free;
      const title = d.title || s.name;
      el.dataset.elapsed = d.elapsed; el.dataset.plan = d.plan; el.dataset.tail = d.tail;
      el.innerHTML = `<div class="sbar-face">
        <a class="sbar-main" href="${href}"><span class="subj" data-s="${d.subj}" aria-hidden="true"><i class="dot run"></i></span><span class="sbar-txt"><span class="sbar-t">${esc(title)}</span><span class="sbar-s"><span class="sbar-time">${clock(d.elapsed)}</span> · ${esc(d.tail)}</span></span></a>
        <button class="ibtn sbar-pp" type="button"><i class="pi"></i></button>
        <span class="pline" aria-hidden="true"><i></i></span>
      </div>`;
      paintLive(el);
    }
    upgrade(el);
    return el;
  }
  function paintLive(el) {
    const st = el.dataset.state, e = +el.dataset.elapsed, plan = +el.dataset.plan * 60;
    const main = el.querySelector('.sbar-main'), pp = el.querySelector('.sbar-pp'), t = el.querySelector('.sbar-time'), line = el.querySelector('.pline');
    const title = el.querySelector('.sbar-t').textContent;
    if (t) t.textContent = clock(e);
    if (line) { line.classList.toggle('is-over', e > plan); line.firstElementChild.style.setProperty('--p', Math.min(1, e / plan).toFixed(4)); }
    const dot = el.querySelector('.subj .dot'); if (dot) dot.hidden = st === 'paused';
    if (pp) { pp.innerHTML = `<i class="pi">${icon(st === 'paused' ? 'play' : 'pause', 2)}</i>`; pp.setAttribute('aria-label', st === 'paused' ? '再開する' : '一時停止する'); }
    if (main) main.setAttribute('aria-label', `タイマーを開く。${title}、${st === 'paused' ? '一時停止中' : '勉強中'} ${Math.floor(e / 60)}分`);
  }

  let barEl = null, tabEl = null, ticker = 0;
  function chrome() {
    const b = doc.body;
    const tab = b.dataset.tab, bar = b.dataset.bar;
    if (!tab && !bar) return;
    const app = doc.querySelector('.app');
    if (!app) return;
    let ch = app.querySelector(':scope > .chrome');
    if (!ch) { ch = doc.createElement('div'); ch.className = 'chrome'; app.appendChild(ch); }
    ch.innerHTML = '';
    barEl = null; tabEl = null;
    if (bar && bar !== 'none') {
      const o = { state: bar === 'paused' ? 'paused' : bar === 'live' ? 'live' : 'idle' };
      const d = b.dataset;
      if (d.barSubj) o.subj = d.barSubj;
      if (d.barTitle) o.title = d.barTitle;
      if (d.barSub) o.sub = d.barSub;
      if (d.barTail) o.tail = d.barTail;
      if (d.barElapsed) o.elapsed = +d.barElapsed;
      if (d.barPlan) o.plan = +d.barPlan;
      if (d.barHref) o.href = d.barHref;
      if (d.barNext === 'false') o.next = false;
      barEl = renderStudyBar(o);
      ch.appendChild(barEl);
    }
    if (tab && tab !== 'none') {
      tabEl = renderTabBar(tab, { study: bar });
      ch.appendChild(tabEl);
    }
    clearInterval(ticker);
    if (barEl && barEl.dataset.state === 'live') ticker = setInterval(tick, 1000);
  }
  function tick() {
    if (!barEl || barEl.dataset.state !== 'live') return;
    barEl.dataset.elapsed = +barEl.dataset.elapsed + 1;
    paintLive(barEl);
  }
  const bar = {
    state: () => (barEl ? barEl.dataset.state : 'none'),
    set(state) {
      if (!barEl || (state !== 'live' && state !== 'paused')) return;
      barEl.dataset.state = state; doc.body.dataset.bar = state;
      paintLive(barEl);
      if (tabEl) { const t = renderTabBar(doc.body.dataset.tab, { study: state }); tabEl.replaceWith(t); tabEl = t; }
      clearInterval(ticker);
      if (state === 'live') ticker = setInterval(tick, 1000);
    }
  };

  /* =====================================================================
   * 6. トースト・シート
   * ===================================================================== */
  function host() { return doc.querySelector('.app') || doc.body; }
  function toast(o = {}) {
    let box = host().querySelector(':scope > .toasts');
    if (!box) { box = doc.createElement('div'); box.className = 'toasts'; box.setAttribute('aria-live', 'polite'); host().appendChild(box); }
    const t = doc.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    const p = o.pix ? `<span class="pix" data-pix="${o.pix}" data-face="${o.from || o.face || 'idle'}" data-scale="${o.scale || 2}"></span>` : '';
    t.innerHTML = `${p}<div class="toast-txt"><b>${esc(o.title || '')}</b>${o.exp ? `<span class="exp">${esc(o.exp)}</span>` : ''}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</div>` +
      (o.action ? `<button class="key key-sm" type="button"><span class="face">${esc(o.action.label)}</span></button>` : '');
    box.prepend(t);
    while (box.children.length > 3) box.lastElementChild.remove();
    upgrade(t);
    const px = t.querySelector('.pix');
    if (px && o.from && o.face && o.from !== o.face) setTimeout(() => face(px, o.face), reduced() ? 0 : 450);
    const close = () => { if (t.classList.contains('is-out')) return; t.classList.add('is-out'); setTimeout(() => t.remove(), reduced() ? 0 : 300); };
    if (o.action) t.querySelector('.key').addEventListener('click', () => { o.action.onClick && o.action.onClick(); close(); });
    setTimeout(close, o.ms || 2800);
    return t;
  }
  let lastFocus = null;
  const sheet = {
    open(id) {
      const s = doc.getElementById(id) || (id === 'sheet-level' ? levelSheet() : null);
      if (!s) return;
      if (s.parentElement !== host() && !s.classList.contains('is-static')) host().appendChild(s);
      lastFocus = doc.activeElement;
      s.hidden = false; s.classList.remove('is-out');
      const panel = s.querySelector('.sheet-panel');
      panel.setAttribute('tabindex', '-1'); panel.focus({ preventScroll: true });
    },
    close(id) {
      const s = id ? doc.getElementById(id) : doc.querySelector('.sheet:not([hidden]):not(.is-static)');
      if (!s || s.hidden) return;
      s.classList.add('is-out');
      setTimeout(() => { s.hidden = true; s.classList.remove('is-out'); if (lastFocus) lastFocus.focus({ preventScroll: true }); }, reduced() ? 0 : 290);
    }
  };
  function levelSheet() {
    const s = doc.createElement('div');
    s.className = 'sheet'; s.id = 'sheet-level'; s.hidden = true;
    s.innerHTML = `<div class="sheet-scrim" data-close-sheet></div>
      <div class="sheet-panel" role="dialog" aria-modal="true" aria-labelledby="sheet-level-h">
        <span class="sheet-grab" aria-hidden="true"></span>
        <div class="sheet-h"><h2 id="sheet-level-h">レベル</h2></div>
        <div style="display:flex;align-items:baseline;gap:10px"><span class="big">Lv.25</span><span class="muted">今日 <b class="num" style="color:var(--run-ink)">+165 EXP</b></span></div>
        <div class="lv-bar" style="width:100%;height:10px;margin:14px 0 6px"><i style="--p:.4"></i></div>
        <p class="muted" style="font-size:12px">Lv.26 まで あと <b class="num" style="color:var(--ink)">2,118 EXP</b></p>
        <div class="hr-soft"></div>
        <p class="sec-h" style="margin-bottom:6px"><span class="sec-t">EXP のもらい方</span></p>
        <div class="rows">
          <div class="row row-sm"><span class="row-main"><span class="row-t" style="font-weight:500;font-size:14px">勉強 1分</span></span><span class="row-v num">+1 EXP</span></div>
          <div class="row row-sm"><span class="row-main"><span class="row-t" style="font-weight:500;font-size:14px;white-space:normal">1日の目標（3時間）を達成した日</span></span><span class="row-v num">+30 EXP</span></div>
          <div class="row row-sm"><span class="row-main"><span class="row-t" style="font-weight:500;font-size:14px;white-space:normal">ToDoを1つ完了（1日5つまで）</span></span><span class="row-v num">+10 EXP</span></div>
        </div>
        <div class="sheet-acts"><button class="key key-block" type="button" data-close-sheet><span class="face">閉じる</span></button></div>
      </div>`;
    host().appendChild(s);
    upgrade(s);
    return s;
  }

  /* =====================================================================
   * 7. 押したときの反応（床は動かず、面だけ）と、切りかえの部品
   * ===================================================================== */
  const PRESS = '.key, .chip, .sbar-main, .tab, .kgroup > *, a.row, button.row, .seg > button, .ibtn';
  const downs = new Set();
  function targetOf(el) { return el.classList.contains('sbar-main') ? el.closest('.sbar') : el; }
  function down(el) { if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return; const t = targetOf(el); t.classList.add('is-down'); t._downAt = performance.now(); downs.add(t); }
  function up() {
    downs.forEach(t => { const wait = Math.max(0, 90 - (performance.now() - (t._downAt || 0))); setTimeout(() => t.classList.remove('is-down'), reduced() ? 0 : wait); });
    downs.clear();
  }
  doc.addEventListener('pointerdown', e => { if (e.button && e.button !== 0) return; const el = e.target.closest(PRESS); if (el) down(el); }, { passive: true });
  ['pointerup', 'pointercancel', 'dragstart'].forEach(n => doc.addEventListener(n, up, { passive: true }));
  doc.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { const el = e.target.closest && e.target.closest(PRESS); if (el) down(el); } if (e.key === 'Escape') sheet.close(); });
  doc.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') up(); });

  doc.addEventListener('click', e => {
    const t = e.target;
    const o = t.closest('[data-open-sheet]'); if (o) { e.preventDefault(); sheet.open(o.dataset.openSheet); return; }
    const c = t.closest('[data-close-sheet]'); if (c) { e.preventDefault(); sheet.close(c.closest('.sheet') && c.closest('.sheet').id); return; }
    const soon = t.closest('[data-soon]'); if (soon) { e.preventDefault(); toast({ title: 'この見本では開きません', sub: soon.getAttribute('aria-label') ? soon.getAttribute('aria-label').replace(/（.*）/, '') + ' の画面は、まだ作っていません' : '', ms: 2000 }); return; }
    const pp = t.closest('.sbar-pp'); if (pp) { const sb = pp.closest('.sbar'); if (sb === barEl) bar.set(sb.dataset.state === 'paused' ? 'live' : 'paused'); else { sb.dataset.state = sb.dataset.state === 'paused' ? 'live' : 'paused'; paintLive(sb); } return; }
    const chip = t.closest('.chips > .chip');
    if (chip && chip.hasAttribute('aria-pressed')) {
      const g = chip.parentElement;
      if (g.hasAttribute('data-single')) g.querySelectorAll(':scope > .chip[aria-pressed]').forEach(x => x.setAttribute('aria-pressed', String(x === chip)));
      else chip.setAttribute('aria-pressed', String(chip.getAttribute('aria-pressed') !== 'true'));
      g.dispatchEvent(new CustomEvent('change', { bubbles: true }));
    }
    const sb = t.closest('.seg > button');
    if (sb) { sb.parentElement.querySelectorAll(':scope > button').forEach(x => x.setAttribute('aria-pressed', String(x === sb))); sb.parentElement.dispatchEvent(new CustomEvent('change', { bubbles: true })); }
    const ut = t.closest('.utabs > [role="tab"]');
    if (ut) { ut.parentElement.querySelectorAll(':scope > [role="tab"]').forEach(x => { x.setAttribute('aria-selected', String(x === ut)); x.tabIndex = x === ut ? 0 : -1; }); ut.parentElement.dispatchEvent(new CustomEvent('change', { bubbles: true })); }
  });

  /* =====================================================================
   * 8. 画面の枠：.stage > .app > .screen（なければ作る）
   * ===================================================================== */
  function scroller() { return WIDE.matches ? doc.querySelector('.app > .screen') || doc.scrollingElement : doc.scrollingElement; }
  function frame() {
    const b = doc.body;
    if (!(b.dataset.tab || b.dataset.bar || b.hasAttribute('data-app'))) return;
    let app = doc.querySelector('.app');
    if (!app) {
      const note = doc.querySelector('body > .note');
      const stage = doc.createElement('div'); stage.className = 'stage';
      app = doc.createElement('div'); app.className = 'app';
      const screen = doc.createElement('main'); screen.className = 'screen';
      [...b.childNodes].forEach(n => { if (n !== note && !(n.tagName === 'SCRIPT')) screen.appendChild(n); });
      app.appendChild(screen); stage.appendChild(app); if (note) stage.appendChild(note);
      b.prepend(stage);
    }
    if (!app.querySelector(':scope > .os')) {
      const os = doc.createElement('div'); os.className = 'os'; os.setAttribute('aria-hidden', 'true');
      os.innerHTML = `<span>${esc(b.dataset.time || '7:32')}</span><span class="os-r"><svg width="17" height="11" viewBox="0 0 17 11" shape-rendering="crispEdges"><rect x="0" y="7" width="3" height="4" fill="#17121F"/><rect x="4.5" y="5" width="3" height="6" fill="#17121F"/><rect x="9" y="2.5" width="3" height="8.5" fill="#17121F"/><rect x="13.5" y="0" width="3" height="11" fill="#17121F"/></svg><svg width="25" height="12" viewBox="0 0 25 12" shape-rendering="crispEdges"><rect x="1" y="1" width="20" height="10" rx="2.5" fill="none" stroke="#17121F" stroke-width="1.5" opacity=".45"/><rect x="3" y="3" width="13" height="6" rx="1" fill="#17121F"/><rect x="22.5" y="4" width="1.5" height="4" fill="#17121F" opacity=".45"/></svg></span>`;
      app.prepend(os);
      const home = doc.createElement('div'); home.className = 'os-home'; home.setAttribute('aria-hidden', 'true');
      app.appendChild(home);
    }
  }
  function watchScroll() {
    const hdrs = doc.querySelectorAll('.hdr');
    if (!hdrs.length) return;
    const on = () => { const s = scroller(); const y = s === doc.scrollingElement ? window.scrollY : s.scrollTop; hdrs.forEach(h => h.classList.toggle('is-scrolled', y > 4)); };
    const scr = doc.querySelector('.app > .screen');
    if (scr) scr.addEventListener('scroll', on, { passive: true });
    window.addEventListener('scroll', on, { passive: true });
    on();
  }

  function init() {
    frame();
    upgrade(doc);
    chrome();
    watchScroll();
    if (WIDE.addEventListener) WIDE.addEventListener('change', watchScroll);
  }

  window.App = {
    upgrade, pix, face, icon, sticker, glyph, toast, sheet, bar, renderStudyBar, renderTabBar, reduced, scroller,
    SUBJ, PEOPLE, CREATURES, ICONS: Object.keys(ICONS), STICKERS: Object.keys(STK_ART), LOGO, fmt, clock,
    _rowsSVG: rowsSVG
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})();
