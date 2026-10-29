/*!
 * Inchly pix.js — the little residents of the Inchly site.
 * One rAF loop (stops when idle), one overlay layer (pointer-events:none
 * except the creatures themselves), feet-anchored integer positioning,
 * frames baked once, pixels as strings. No dependencies.
 *
 * Elements:
 *   <inch-pal kind do on at scale edge side length speed hue>
 *   <inch-face name size scale look>
 *   <inch-crowd mode text count height>
 * API: window.InchPix = { spawn, clear, deliver, impact, drawFrame, poke,
 *                         setLook, setCrowd, size, version }
 */
(() => {
  'use strict';
  if (window.InchPix && window.InchPix.version) return;
  const VERSION = '1.1.0';

  /* =====================================================================
   * 1. ART — every sprite is drawn here as strings. '.' is transparent,
   *    every other character is a key in the sprite's palette.
   * ===================================================================== */
  const INK = '#17121f';
  const R = s => s.trim().split(/\s+/);
  const pts = (rows, list) => {
    const g = rows.map(r => r.split(''));
    for (const [x, y, c] of list) if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
    return g.map(r => r.join(''));
  };
  const blank = w => '.'.repeat(w);
  const rowAt = (w, xs, ch = 'k') => { const a = Array(w).fill('.'); xs.forEach(x => { if (x >= 0 && x < w) a[x] = ch; }); return a.join(''); };
  const flipV = rows => rows.slice().reverse();
  const shiftX = (rows, dx) => rows.map(r => dx > 0 ? '.'.repeat(dx) + r.slice(0, r.length - dx) : r.slice(-dx) + '.'.repeat(-dx));
  const padX = (rows, n) => rows.map(r => '.'.repeat(n) + r + '.'.repeat(n));
  const swap = (rows, map) => rows.map(r => r.replace(/./g, c => (c in map ? map[c] : c)));
  const splice = (rows, at, repl) => { const o = rows.slice(); repl.forEach((r, i) => { o[at + i] = r; }); return o; };

  /* ---------- ペンタ: the pencil (head = the pink eraser end) ---------- */
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
  const pentaLegs = t => t === 'a' ? [rowAt(20, PL), rowAt(20, [5, 10, 12, 17])]
    : t === 'b' ? [rowAt(20, PL), rowAt(20, [7, 8, 14, 15])]
      : t === 'tuck' ? [rowAt(20, PL.map(x => x - 1)), blank(20)]
        : [rowAt(20, PL), rowAt(20, PL)];
  const penta = (eyes, legs, crouch) => {
    const body = pts(PENTA_BODY, PE[eyes]);
    return crouch ? [blank(20), ...body, rowAt(20, PL)] : [...body, ...pentaLegs(legs || 'idle')];
  };
  const pentaFlip = alt => [rowAt(20, alt ? [7, 8, 14, 15] : [5, 10, 12, 17]), rowAt(20, PL), ...flipV(pts(PENTA_BODY, PE.wide))];

  /* ---------- ボッ: the streak flame ---------- */
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
  const BO_TIP = {
    a: BO.slice(0, 3),
    b: R(`
......k......
.....kyk.....
.....kyrk....`),
    c: R(`
........k....
.......kyk...
......kyork..`)
  };
  const BO_EYE = {
    open: [BO[8], BO[9], BO[10]],
    blink: ['.kyoooooooork', 'kyookkookkork', BO[10]],
    up: ['.kyowkoowkork', 'kyoowwoowwork', BO[10]],
    happy: ['.kyokoookoork', 'kyokokokokork', BO[10]],
    dizzy: ['.kykokokokork', 'kyookoookoork', 'kyokykykykork']
  };
  const BO_MOUTH = {
    smile: [BO[11], BO[12]],
    open: ['kroyYYkkYYork', '.kroyYkkYyrk.'],
    calm: ['kroyYYYYYYork', BO[12]]
  };
  const bo = (tip = 'a', eye = 'open', mouth = 'smile') => [...BO_TIP[tip], ...BO.slice(3, 8), ...BO_EYE[eye], ...BO_MOUTH[mouth], ...BO.slice(13)];
  const boFlare = (tip, eye) => { const f = bo(tip, eye, 'open'); return [f[0], f[1], f[1], f[2], f[2], f[3], ...f.slice(3)]; };

  /* ---------- めぶ: the sprout in a pot ---------- */
  const MEBU_LEAF = {
    n: R(`
.kkk....kkk.
kGGgk..kgGGk
kGgggkkgggGk
.kgggkkgggk.
..kkkhhkkk..`),
    up: R(`
..kk....kk..
.kGgk..kgGk.
.kGgk..kgGk.
..kggkkggk..
...kkhhkk...`)
  };
  MEBU_LEAF.l = [...shiftX(MEBU_LEAF.n.slice(0, 4), -1), MEBU_LEAF.n[4]];
  MEBU_LEAF.r = [...shiftX(MEBU_LEAF.n.slice(0, 4), 1), MEBU_LEAF.n[4]];
  const MEBU_POT = R(`
.....hh.....
kkkkkkkkkkkk
kTTTTTTTTTtk
ktttttttttuk
.kkkkkkkkkk.
.kTttttttuk.`);
  const MEBU_FACE = {
    open: R(`.kTwkttwkuk. .kTkkttkkuk. .kbttkkttbk.`),
    blink: R(`.kTttttttuk. .kTkkttkkuk. .kbttkkttbk.`),
    shy: R(`.kTttttttuk. .kTkkttkkuk. .kbbtkktbbk.`),
    back: R(`.kTttttttuk. .kTttttttuk. .kttttttttk.`)
  };
  const MEBU_BASE = R(`..kttttttk.. ...kkkkkk...`);
  const MEBU_BOOK = R(`kppppkkppppk kccccCCcccck .kkkkkkkkkk.`);
  const mebu = (leaf = 'n', face = 'open', book = false, page = false) => {
    let f = [...MEBU_LEAF[leaf], ...MEBU_POT, ...MEBU_FACE[face], ...MEBU_BASE];
    if (book) f = splice(f, 13, MEBU_BOOK);
    if (page) f = pts(f, [[9, 12, 'p'], [10, 12, 'k']]);
    return f;
  };

  /* ---------- ジリ: the alarm clock ---------- */
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
  const jiri = (eye = 'open', feet = 0, ring = false) => {
    let f = JIRI.slice();
    if (eye === 'blink') { f[7] = '.kRrwwwwwwwrek.'; f[8] = '.kRrkkwwwkkrek.'; }
    if (eye === 'scared') { f[7] = '.kRrwwwwwwwrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwkkkwgek..'; }
    if (eye === 'happy') { f[7] = '.kRrwkwwwkwrek.'; f[8] = '.kRrkwkwkwkrek.'; f[10] = '..krwwkkkwwrk..'; f[11] = '..kerwwwwwgek..'; }
    if (feet) f[14] = '....kk...kk....';
    if (ring) {
      for (let y = 0; y < 3; y++) { const r = f[y]; f[y] = r.slice(1, 7) + '.' + r[7] + '.' + r.slice(8, 14); }
      f[10] = '..krwwkkkwwrk..';
    }
    return f;
  };

  /* ---------- ふせん: the sticky note ---------- */
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
  const FUSEN_EYE = { c: [0, 0], l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1], ul: [-1, -1], ur: [1, -1] };
  const fusen = (look = 'c', mode = 'open') => {
    if (mode === 'blink') return pts(FUSEN, [[4, 6, 'k'], [5, 6, 'k'], [8, 6, 'k'], [9, 6, 'k']]);
    if (mode === 'eep') return pts(FUSEN, [[4, 5, 'k'], [9, 5, 'k'], [6, 8, 'k'], [7, 8, 'k'], [6, 9, 'k'], [7, 9, 'k']]);
    const [dx, dy] = FUSEN_EYE[look];
    const e = [];
    for (const ex of [4, 8]) {
      const x = ex + dx, y = 4 + dy;
      e.push([x, y, 'w'], [x + 1, y, 'k'], [x, y + 1, 'k'], [x + 1, y + 1, 'k'], [x, y + 2, 'k'], [x + 1, y + 2, 'k']);
    }
    return pts(FUSEN, e);
  };

  /* ---------- つる: the paper crane ---------- */
  const TSURU = {
    sit: R(`
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
....kkkkkkkkk.....`),
    up: R(`
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
...kkkkkkkkkk.....`),
    down: R(`
..............kkk.
.............kwkwk
..............kwkr
..............kwk.
.............kwk..
.............kwk..
k...........kwk...
kwk.........kwk...
.kwkkkkkkkkkkwk...
..kwwwwwwgggggk...
...kgwwwwwgggk....
....kgwwwwggk.....
.....kgwwggk......
......kgggk.......
.......kkk........`)
  };
  TSURU.blink = pts(TSURU.sit, [[15, 1, 'w']]);
  TSURU.peck = splice(TSURU.sit, 0, ['..................', '......kk......kkk.', '.....kwgk....kwkwk', '.....kwgk.....kwkr']);
  TSURU.look = pts(TSURU.sit, [[17, 0, 'r'], [17, 2, '.']]);

  /* ---------- けしごむ: the eraser toy ---------- */
  const ERASER = R(`
.kkkkkkkkkk.
kwwwwBBBBBBk
kwwwwbbbbbbk
kwwwwbwwwbbk
kgwwwbbbbbbk
kggggddddddk
.kkkkkkkkkk.`);

  /* ---------- みんな: the crowd kids (no ink: they live on a dark stage) ---------- */
  const KID = R(`
.Hcccc.
.ckckc.
.ckckc.
.ccccd.
.ddddd.
..d.d..`);
  const kid = (legs, arm, eyes) => {
    let f = KID.slice();
    if (legs === 1) f[5] = '.d...d.';
    if (legs === 2) f[5] = '..d.d..';
    if (arm === 1) f = pts(f, [[6, 0, 'c'], [6, 1, 'c']]);
    if (arm === 2) f = pts(f, [[6, 1, 'c'], [6, 2, 'c']]);
    if (eyes === 'dizzy') f = pts(f, [[2, 1, 'H'], [4, 1, 'H'], [2, 2, 'k'], [4, 2, 'k']]);
    if (eyes === 'happy') f = pts(f, [[2, 2, 'c'], [4, 2, 'c']]);
    return f;
  };

  const PAL = {
    penta: { k: INK, L: '#5a5468', n: '#f7d3a1', N: '#d9995a', Y: '#fff2a6', y: '#ffd23f', o: '#f2a91c', O: '#cf8410', M: '#f4f2fa', m: '#c9c5d6', q: '#8d88a2', P: '#ffc9db', p: '#ff8fb6', r: '#e0588a', w: '#ffffff' },
    bo: { k: INK, R: '#d8341c', r: '#ff5b2e', o: '#ff8a1f', y: '#ffc93a', Y: '#fff1a8', w: '#ffffff' },
    mebu: { k: INK, G: '#c4f27a', g: '#7bd63a', h: '#3f9a2a', T: '#f4a46b', t: '#de7740', u: '#ad4f22', c: '#58a6ff', C: '#2f6fd8', p: '#f6f1e4', w: '#ffffff', b: '#ff8fa8' },
    jiri: { k: INK, R: '#ff8a80', r: '#f2433f', e: '#c02336', y: '#ffd23f', Y: '#fff2a8', o: '#e0a10e', w: '#ffffff', g: '#dcd7e6', b: '#ff9cc2' },
    fusen: { k: INK, a: '#f6d443', Y: '#fff6b0', y: '#ffe55c', o: '#f2c21b', O: '#d29a0a', w: '#ffffff', b: '#ff9cb0' },
    tsuru: { k: INK, w: '#ffffff', g: '#e3dfee', r: '#ff4d6d' },
    eraser: { k: INK, w: '#ffffff', g: '#d9d5e3', B: '#7fb2ff', b: '#3b82f6', d: '#2459c4' }
  };

  /* clips: { name: [fps, frames, loop=true] } */
  const SPR = {
    penta: {
      w: 20, h: 9, scale: 3, does: 'crawl', pal: PAL.penta,
      clips: {
        idle: [3, [penta('open'), penta('open'), penta('open'), penta('blink')]],
        walk: [10, [penta('open', 'a'), penta('open', 'b')]],
        sniff: [4, [penta('down'), penta('down', 'idle', true), penta('down'), penta('down', 'idle', true)]],
        look: [2, [penta('back'), penta('back'), penta('up'), penta('open')]],
        alarm: [12, [penta('wide', 'idle', true)]],
        hop: [1, [penta('open', 'tuck')]],
        flip: [12, [pentaFlip(0), pentaFlip(1)]],
        happy: [3, [penta('happy')]]
      },
      alias: { read: 'idle', scared: 'alarm', fly: 'hop', carry: 'hop', held: 'flip', dizzy: 'flip' }
    },
    bo: {
      w: 13, h: 18, scale: 4, does: 'bounce', pal: PAL.bo,
      clips: {
        idle: [5, [bo('a'), bo('b'), bo('a'), bo('c'), bo('a', 'blink'), bo('c')]],
        air: [8, [bo('a', 'open', 'open'), bo('b', 'open', 'open')]],
        rise: [8, [bo('a', 'up'), bo('c', 'up')]],
        land: [6, [bo('a', 'happy'), bo('b', 'happy')]],
        held: [8, [bo('b', 'blink', 'open'), bo('c', 'blink', 'open')]],
        dizzy: [6, [bo('a', 'dizzy', 'calm'), bo('b', 'dizzy', 'calm')]],
        flare: [10, [boFlare('a', 'happy'), boFlare('c', 'happy')]],
        happy: [6, [bo('a', 'happy'), bo('c', 'happy')]],
        scared: [10, [bo('b', 'up', 'open'), bo('c', 'up', 'open')]]
      },
      alias: { walk: 'idle', read: 'idle', look: 'rise', alarm: 'scared', hop: 'rise', fly: 'rise', carry: 'rise', ring: 'flare' }
    },
    mebu: {
      w: 12, h: 16, scale: 3, does: 'sit', pal: PAL.mebu,
      clips: {
        idle: [2, [mebu(), mebu(), mebu(), mebu('n', 'blink')]],
        read: [1, [mebu('n', 'blink', true)]],
        flip: [7, [mebu('n', 'blink', true, true), mebu('n', 'blink', true), mebu('n', 'blink', true, true)]],
        sway: [4, [mebu('l', 'blink', true), mebu('n', 'blink', true), mebu('r', 'blink', true), mebu('n', 'blink', true)]],
        look: [2, [mebu('n', 'open'), mebu('n', 'open'), mebu('n', 'open'), mebu('n', 'blink')]],
        shy: [2, [mebu('n', 'shy'), mebu('l', 'shy')]],
        doze: [1, [mebu('n', 'blink', true)]],
        back: [1, [mebu('n', 'back')]],
        carry: [8, [mebu('up', 'open'), mebu('n', 'open')]],
        hover: [10, [mebu('up', 'open'), mebu('n', 'open')]],
        happy: [4, [mebu('up', 'shy'), mebu('n', 'shy')]]
      },
      alias: { walk: 'carry', hop: 'carry', fly: 'hover', alarm: 'look', scared: 'shy', held: 'shy', dizzy: 'shy' }
    },
    jiri: {
      w: 15, h: 15, scale: 3, does: 'hang', pal: PAL.jiri,
      clips: {
        idle: [2, [jiri(), jiri(), jiri(), jiri('blink')]],
        wiggle: [9, [jiri('open', 0), jiri('open', 1)]],
        scared: [14, [jiri('scared', 0), jiri('scared', 1)]],
        ring: [16, [jiri('happy', 0, true), jiri('happy', 1)]],
        happy: [3, [jiri('happy')]]
      },
      alias: { walk: 'wiggle', read: 'idle', look: 'idle', alarm: 'scared', hop: 'wiggle', fly: 'wiggle', carry: 'wiggle', held: 'scared', dizzy: 'scared', flare: 'ring' }
    },
    fusen: {
      w: 14, h: 13, scale: 3, does: 'peek', pal: PAL.fusen,
      clips: Object.assign(
        Object.fromEntries(Object.keys(FUSEN_EYE).map(k => [k, [1, [fusen(k)]]])),
        { idle: [2, [fusen('c'), fusen('c'), fusen('c'), fusen('c', 'blink')]], blink: [1, [fusen('c', 'blink')]], eep: [1, [fusen('c', 'eep')]] }
      ),
      alias: { walk: 'idle', read: 'd', look: 'u', alarm: 'eep', scared: 'eep', hop: 'eep', fly: 'eep', held: 'eep', happy: 'blink' }
    },
    tsuru: {
      w: 18, h: 15, scale: 3, does: 'perch', pal: PAL.tsuru,
      clips: {
        idle: [3, [TSURU.sit, TSURU.sit, TSURU.sit, TSURU.blink]],
        peck: [8, [TSURU.peck, TSURU.sit]],
        look: [2, [TSURU.look]],
        preen: [6, [TSURU.peck, TSURU.look, TSURU.peck, TSURU.sit]],
        fly: [12, [TSURU.up, TSURU.down]]
      },
      alias: { walk: 'idle', read: 'idle', alarm: 'look', scared: 'fly', hop: 'fly', carry: 'fly', held: 'fly', happy: 'preen' }
    },
    eraser: {
      w: 12, h: 7, scale: 3, does: 'toy', pal: PAL.eraser,
      clips: { idle: [1, [ERASER]] }
    }
  };

  /* bubble icons (their own palette) */
  const IPAL = { k: '#1b1226', r: '#ff4d6d', b: '#3fc8ff', y: '#ffc93f', o: '#e09a0e', g: '#4fb52a', p: '#ff8fb1', w: '#ffffff' };
  const hcat = (a, b, gap = 1) => { const h = Math.max(a.length, b.length); const A = [...Array(h - a.length).fill(blank(a[0].length)), ...a]; const B = [...Array(h - b.length).fill(blank(b[0].length)), ...b]; return A.map((r, i) => r + blank(gap) + B[i]); };
  const ICONS = {
    '!': R(`kk kk kk kk .. kk`),
    '?': R(`.kkk. kk.kk ...kk ..kk. ..... ..kk.`),
    '...': R(`kk.kk.kk kk.kk.kk`),
    heart: R(`.rr.rr. rwrrrrr rrrrrrr .rrrrr. ..rrr.. ...r...`),
    zz: R(`kkkk.... ...k.kkk ..k....k .k....k. kkkk.kkk`),
    note: R(`..kkk ..k.k ..k.. ..k.. kkk.. kkk..`),
    sweat: R(`.b.. .bb. bbbb bwbb .bb.`),
    star: R(`..y.. ..y.. yyyyy .yyy. .y.y.`),
    grr: R(`.r.r. rr.rr ..... rr.rr .r.r.`),
    shy: R(`..p..p..p .p..p..p. p..p..p..`),
    up: R(`..k.. .kkk. kkkkk ..k.. ..k..`),
    check: R(`....g ...gg g.gg. ggg.. .g...`),
    leaf: R(`..ggg .gggg ggg.. g....`),
    kira: R(`..y.. ..y.. yyyyy ..y.. ..y..`),
    mail: R(`kkkkkkkkk kgwwwwwgk kwgwwwgwk kwwgrgwwk kwwwwwwwk kkkkkkkkk`)
  };
  ICONS['!?'] = hcat(ICONS['!'], ICONS['?']);
  ICONS['!!'] = hcat(ICONS['!'], ICONS['!']);

  /* ---------- 科目の顔: twelve 16×16 subject faces ---------- */
  const FACES = {
    en: {
      pal: { v: '#5856D6', V: '#8a88f0', d: '#3c38a8' }, eyes: [[4, 8], [10, 8]], rows: R(`
................
..kkkkkkkkkkkk..
.kVVVVVVVVVVVVk.
kVVvvvvwwvvvvvdk
kVvvvvwvvwvvvvdk
kVvvvvwwwwvvvvdk
kVvvvvwvvwvvvvdk
kVvvvvwvvwvvvvdk
kVvvvvvvvvvvvvdk
kVvvvvvvvvvvvvdk
kVvbvvvvvvvvbvdk
.kvvvvvvvvvvvdk.
..kddkkkkkkkkk..
.kdk............
.kk.............
................`)
    },
    ma: {
      /* π on the forehead (where 英語 wears its A), the eyes and a smile below it */
      pal: { o: '#FF9500', O: '#ffbe5c', d: '#d07600' }, eyes: [[5, 7], [9, 7]], rows: R(`
................
......kkkk......
....kkOOOOkk....
...kOwwwwwwdk...
..kOoowoowoodk..
.kOoowwoowwoodk.
.kOoooooooooodk.
.kOoooooooooodk.
.kOoooooooooodk.
.kOoboooooobodk.
.kOoookookooodk.
..kdoookkooodk..
...kdoooooodk...
....kkddddkk....
......kkkk......
................`)
    },
    ja: {
      pal: { o: '#D9A300', O: '#f5c84a', d: '#9c7400', p: '#f6f1e4', g: '#ddd3bd', l: '#c4b9a3' }, eyes: [[3, 7], [11, 7]], rows: R(`
................
................
.kkkk......kkkk.
kppppkk..kkppppk
kppppppkkppppppk
kplllppggpplllpk
kppppppggppppppk
kppppppggppppppk
kppppppggppppppk
kpbppppggppppbpk
kppppppkkppppppk
kplllppggpplllpk
kkkkkkkkkkkkkkkk
kOoooooddooooodk
.kkkkkkkkkkkkkk.
................`)
    },
    ph: {
      pal: { n: '#3B82F6', N: '#86b6ff', d: '#2459c4', C: '#5e9cf5', y: '#ffc93f' }, eyes: [[5, 6], [9, 6]], rows: R(`
......CCCC......
.....C....y.....
.....C....C.....
.....CkkkkC.....
....kkNNNNkk....
...CkNnnnnndkC..
.CCkNnnnnnndkCC.
y..kNnnnnnndk..C
C..kNnnnnnndk..y
.CCkNnnkknndkCC.
...CkdnnnndkC...
....kkddddkk....
.....CkkkkC.....
.....C....C.....
.....y....C.....
......CCCC......`)
    },
    ch: {
      pal: { g: '#dfe8f2', e: '#10B981', E: '#6ee7c1', d: '#0a8a60', c: '#c58b52' }, eyes: [[5, 10], [9, 10]], rows: R(`
.....kkkkkkk....
.....kccccck....
......kkkkk.....
......kwwgk.....
......kwwgk.....
......kwwgk.....
.....kwwwwgk....
....kwwwwwwgk...
...kwEEEEEEEgk..
..kEEeeeeeweedk.
..kEeeeeeeeeedk.
.kEeeeeeeeeeeedk
.kEebeeeeeebeedk
.kdeeeeeeeeeeddk
..kkkkkkkkkkkkk.
................`)
    },
    bi: {
      pal: { g: '#22C55E', G: '#86efac', d: '#15803d', h: '#a16207' }, eyes: [[4, 6], [8, 6]], rows: R(`
................
..........kkkk..
.......kkkGGGk..
.....kkGGGgggk..
....kGGgggggdk..
...kGgggggggdk..
..kGggggggggdk..
..kGggggggggdk..
..kGbgggbgggk...
..kGgggggggdk...
..kggggggggdk...
..kdgggggddk....
.kkkddddddk.....
khk.kkkkkk......
kk..............
................`)
    },
    es: {
      /* two brown peaks with snow, a smaller one behind, on a strip of grass */
      pal: { m: '#A16207', M: '#c98a2c', n: '#7d4c0c', s: '#dce4ee', g: '#6aa83a', G: '#4f8a2b' }, eyes: [[3, 8], [8, 8]], rows: R(`
................
.....kk.........
....kwsk........
...kwwssk.......
..kwMwsmsk.kk...
.kMMMMmmmmkwsk..
kMMMMMmmmmmmsnk.
kMMMMMmmmmmmmnnk
kMMMMMmmmmmmmmnk
kMMMMMmmmmmmmmmk
kMbMMMmmmmbmmmmk
kMMMMMmmmmmmmmmk
kggggggggggggggk
kGGGGGGGGGGGGGGk
kkkkkkkkkkkkkkkk
................`)
    },
    wh: {
      pal: { r: '#C2410C', R: '#ea7a45', d: '#8a2e07', s: '#f6e3d3', S: '#dcc0aa' }, eyes: [[4, 5], [10, 5]], rows: R(`
.......kk.......
.....kkRRkk.....
...kkRRrrrrkk...
.kkRRrrrrrrrrkk.
kkkkkkkkkkkkkkkk
kRrrrrrrrrrrrrdk
kRrrrrrrrrrrrrdk
kRrbrrrrrrrrbrdk
kkkkkkkkkkkkkkkk
.ksk.ksk.ksk.ksk
.ksk.ksk.ksk.ksk
.kSk.kSk.kSk.kSk
kkkkkkkkkkkkkkkk
kRrrrrrrrrrrrrdk
kkkkkkkkkkkkkkkk
................`)
    },
    jh: {
      pal: { r: '#DC2626', R: '#ff6b6b', d: '#a11b1b' }, eyes: [[4, 3], [10, 3]], rows: R(`
................
kk............kk
kRkkkkkkkkkkkkRk
kRRRRRRRRRRRRRRk
.kRrrrrrrrrrrdk.
.kRbrrrrrrrrbdk.
.kddddddddddddk.
...kRk.kk.kRk...
..kkRkkRdkkRkk..
..kRRRRRRRRRRdk.
..kddddddddddk..
...kRk....kRk...
...kRk....kRk...
...kRk....kRk...
...kdk....kdk...
...kkk....kkk...`)
    },
    ge: {
      pal: { B: '#a5e4ff', d: '#2bb3ee', g: '#7cc95c', r: '#ff4d6d' }, eyes: [[5, 5], [8, 5]], rows: R(`
................
kkkkk.....kkkkk.
kBBBkkk.kkkBBBk.
kBgBBdkkkdBBgBk.
kBggBdddddBBggk.
kBBBBdddddBBBBk.
kBBBBdddddBBBBk.
kBrBBdddddBBBBk.
kBBrBdddddBrBBk.
kBBBrdddddrBBBk.
kBgBBdrrrdBBgBk.
kBggBdddddBBggk.
kBBBkkddkkdBBBk.
kkkk...kk..kkkk.
................
................`)
    },
    ci: {
      pal: { n: '#6366F1', N: '#a5a7ff', d: '#3f3fb8', y: '#ffd23f' }, eyes: [[5, 2], [9, 2]], rows: R(`
....kkkkkkkk....
...kNNNnnnnnk...
...kNnnnnnndk...
...kNnnnnnndk...
...kNbnnnnbdk...
....kddddddk....
kkkkkkkkkkkkkkkk
kNnnnnnnnnnnnndk
kkkkkkkkkkkkkkkk
.k....kNdk....k.
.k....kNdk....k.
kyyyk.kNdk.kyyyk
.kkk..kNdk..kkk.
....kkNNddkk....
...kNnnnnnndk...
...kkkkkkkkkk...`)
    },
    it: {
      pal: { s: '#64748B', S: '#a3b1c6', d: '#3f4b5f', c: '#d9eeff', C: '#a9d6ff' }, eyes: [[4, 4], [9, 4]], rows: R(`
................
..kkkkkkkkkkkk..
..kSSSSSSSSSSk..
..kScccccccCdk..
..kScccccccCdk..
..kScccccccCdk..
..kScbccccbCdk..
..kSccckkccCdk..
..kScccccccCdk..
..kSdddddddddk..
..kkkkkkkkkkkk..
.kSSSSSSSSSSSSk.
kSsdsdsdsdsdssdk
kSssssssssssssdk
kkkkkkkkkkkkkkkk
................`)
    }
  };
  for (const f of Object.values(FACES)) { f.pal = Object.assign({ k: INK, w: '#ffffff', b: '#ff9cc2' }, f.pal); }

  const CROWD_COLORS = ['#c6f432', '#E5484D', '#F2C46D', '#9AB8DB', '#5B8DEF', '#9D7BF5', '#1FA35B', '#f4f1fa'];
  const KIND_ALIAS = { pen: 'penta', pencil: 'penta', flame: 'bo', fire: 'bo', sprout: 'mebu', clock: 'jiri', note: 'fusen', crane: 'tsuru', toy: 'eraser' };

  /* =====================================================================
   * 2. BAKING — frames become tiny canvases once, then only drawImage.
   * ===================================================================== */
  const hexRGB = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (h, t, a) => { const A = hexRGB(h), B = hexRGB(t); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * a).toString(16).padStart(2, '0')).join(''); };
  function bakeRows(rows, pal, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d');
    const img = x.createImageData(w, h);
    const rw = Math.max(...rows.map(r => r.length));
    const ox = Math.floor((w - rw) / 2), oy = h - rows.length;
    const cache = {};
    rows.forEach((r, y) => {
      for (let i = 0; i < r.length; i++) {
        const ch = r[i];
        if (ch === '.' || !pal[ch]) continue;
        const px = ox + i, py = oy + y;
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const rgb = cache[ch] || (cache[ch] = hexRGB(pal[ch]));
        const o = (py * w + px) * 4;
        img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
      }
    });
    x.putImageData(img, 0, 0);
    return c;
  }
  function clipOf(spr, name) {
    if (spr.clips[name]) return name;
    if (spr.alias && spr.clips[spr.alias[name]]) return spr.alias[name];
    return 'idle';
  }
  function baked(spr, name) {
    spr._b || (spr._b = {});
    if (!spr._b[name]) spr._b[name] = spr.clips[name][1].map(f => bakeRows(f, spr.pal, spr.w, spr.h));
    return spr._b[name];
  }
  const kidCache = new Map();
  function kidFrame(ci, legs, arm, eyes) {
    const k = ci + '|' + legs + '|' + arm + '|' + eyes;
    let c = kidCache.get(k);
    if (!c) {
      const col = CROWD_COLORS[ci % CROWD_COLORS.length];
      c = bakeRows(kid(legs, arm, eyes), { c: col, H: mix(col, '#ffffff', .45), d: mix(col, '#000000', .3), k: INK }, 7, 6);
      kidCache.set(k, c);
    }
    return c;
  }
  const iconCache = {};
  function iconCanvas(name) {
    if (!iconCache[name]) { const r = ICONS[name]; iconCache[name] = bakeRows(r, IPAL, Math.max(...r.map(x => x.length)), r.length); }
    return iconCache[name];
  }

  /* =====================================================================
   * 3. CORE — one loop, one pointer, one scroll.
   * ===================================================================== */
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = a => a[(Math.random() * a.length) | 0];
  const ease = (k, dt) => 1 - Math.exp(-k * dt);
  const now = () => performance.now();
  const RMQ = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  /* the OS setting, or the page's own 動きを止める (html.calm) */
  const reduced = () => RMQ.matches || document.documentElement.classList.contains('calm');
  const touchy = () => (window.matchMedia && matchMedia('(hover: none)').matches) || innerWidth < 640;
  const phone = () => innerWidth < 640;
  const scaleFor = base => phone() ? Math.round(Math.max(2, base * .75)) : base;

  let SX = scrollX, SY = scrollY, VW = innerWidth, VH = innerHeight;
  const scroll = { v: 0, a: 0, last: scrollY, dv: 0 };
  const ptr = { cx: -1e5, cy: -1e5, lcx: -1e5, lcy: -1e5, x: -1e5, y: -1e5, vx: 0, vy: 0, t: 0, touch: false, down: false, tx: -1e5, ty: -1e5, tt: -1e5 };
  let lastInput = now();
  const ptrIn = () => ptr.cx > -1e4;

  const subs = new Set();
  let raf = 0, lastT = 0;
  function sub(fn) { subs.add(fn); if (!raf) { lastT = now(); raf = requestAnimationFrame(frame); } }
  function unsub(fn) { subs.delete(fn); }
  function frame(t) {
    const dt = Math.min(.05, Math.max(.001, (t - lastT) / 1000));
    lastT = t;
    SX = scrollX; SY = scrollY; VW = innerWidth; VH = innerHeight;
    const v = (SY - scroll.last) / dt; scroll.last = SY;
    const pv = scroll.v; scroll.v = lerp(scroll.v, v, .25); scroll.dv = scroll.v - pv; scroll.a = scroll.dv / dt;
    if (ptrIn()) {
      if (ptr.lcx > -1e4) { ptr.vx = lerp(ptr.vx, (ptr.cx - ptr.lcx) / dt, .35); ptr.vy = lerp(ptr.vy, (ptr.cy - ptr.lcy) / dt, .35); }
      ptr.lcx = ptr.cx; ptr.lcy = ptr.cy;
      ptr.x = ptr.cx + SX; ptr.y = ptr.cy + SY;
    } else { ptr.vx *= .8; ptr.vy *= .8; ptr.x = ptr.y = -1e5; ptr.lcx = -1e5; }
    rectCache.clear();
    for (const fn of [...subs]) { let r; try { r = fn(dt, t); } catch (e) { r = false; if (window.console) console.warn('[InchPix]', e); } if (r === false) subs.delete(fn); }
    raf = subs.size ? requestAnimationFrame(frame) : 0;
  }

  const gone = () => { ptr.cx = ptr.cy = -1e5; };
  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && !ptr.down) return;
    ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.t = now(); ptr.touch = e.pointerType === 'touch'; lastInput = ptr.t; wakeAll();
  }, { passive: true, capture: true });
  addEventListener('pointerdown', e => {
    ptr.down = true; ptr.cx = e.clientX; ptr.cy = e.clientY; ptr.t = now(); ptr.touch = e.pointerType === 'touch'; lastInput = ptr.t; wakeAll();
  }, { passive: true, capture: true });
  /* a finger leaves no hover; the faces remember where it tapped for a moment */
  const up = e => {
    ptr.down = false;
    if (e.pointerType === 'touch') { if (e.type === 'pointerup') { ptr.tx = e.clientX; ptr.ty = e.clientY; ptr.tt = now(); } gone(); }
  };
  addEventListener('pointerup', up, { passive: true, capture: true });
  addEventListener('pointercancel', up, { passive: true, capture: true });
  document.addEventListener('mouseleave', gone);
  document.documentElement.addEventListener('mouseleave', gone);
  addEventListener('blur', gone);
  addEventListener('scroll', () => { lastInput = now(); wakeAll(); }, { passive: true });
  addEventListener('keydown', () => { lastInput = now(); }, { passive: true });
  let wasPhone = phone();
  addEventListener('resize', () => {
    wakeAll();
    if (phone() !== wasPhone) { wasPhone = phone(); document.querySelectorAll('inch-pal').forEach(p => p._remount && p._remount()); document.querySelectorAll('inch-face').forEach(f => f._setup && f._setup()); document.querySelectorAll('inch-crowd').forEach(c => c._resize && c._resize(true)); }
  }, { passive: true });
  ['transitionend', 'animationend'].forEach(ev => document.addEventListener(ev, () => wakeAll(), { passive: true, capture: true }));
  let fontsVer = 0;
  if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => { fontsVer++; wakeAll(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fontsVer++; wakeAll(); });

  /* geometry, measured at most once per frame per element */
  const rectCache = new Map();
  function rect(el) {
    let r = rectCache.get(el);
    if (!r) {
      const b = el.getBoundingClientRect();
      r = { l: b.left + SX, t: b.top + SY, r: b.right + SX, b: b.bottom + SY, w: b.width, h: b.height, ct: b.top, cl: b.left };
      rectCache.set(el, r);
    }
    return r;
  }
  const docW = () => Math.max(document.documentElement.clientWidth, 0);
  const docH = () => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
  const fixedCache = new WeakMap();
  function fixedCtx(el) {
    if (fixedCache.has(el)) return fixedCache.get(el);
    let res = null;
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.position === 'fixed') { res = { el: e, fixed: true }; break; }
      if (cs.position === 'sticky') { res = { el: e, sticky: true, top: parseFloat(cs.top) || 0 }; break; }
    }
    fixedCache.set(el, res);
    return res;
  }
  function pinned(el) {
    const c = el && fixedCtx(el);
    if (!c) return false;
    if (c.fixed) return true;
    return Math.abs(rect(c.el).ct - c.top) < 1.5;
  }
  const inView = r => r.w > 0 && r.b > SY && r.t < SY + VH && r.r > SX && r.l < SX + VW;

  /* =====================================================================
   * 4. SURFACES — the real outline of text, boxes and the wordmark.
   * ===================================================================== */
  const measureCtx = document.createElement('canvas').getContext('2d');
  const glyphCache = new Map();
  function glyphTop(font, ch) {
    const k = font + '|' + ch;
    let v = glyphCache.get(k);
    if (v === undefined) {
      measureCtx.font = font;
      const m = measureCtx.measureText(ch);
      const fa = m.fontBoundingBoxAscent != null ? m.fontBoundingBoxAscent : m.actualBoundingBoxAscent;
      v = fa - m.actualBoundingBoxAscent;
      if (!isFinite(v)) v = 0;
      if (glyphCache.size > 5000) glyphCache.clear();
      glyphCache.set(k, v);
    }
    return v;
  }
  const profCache = new WeakMap();
  const SKIP = 'inch-pal,inch-face,inch-crowd,script,style,noscript';
  function textProfile(el, t) {
    const r = rect(el);
    const key = Math.round(r.l) + ',' + Math.round(r.t) + ',' + Math.round(r.w) + ',' + Math.round(r.h) + ',' + fontsVer;
    const c = profCache.get(el);
    if (c && (c.key === key || t - c.t < 60)) return c.p;
    const segs = [];
    const range = document.createRange();
    const fonts = new Map();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && n.parentElement.closest(SKIP)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let n, count = 0;
    while ((n = walker.nextNode()) && count < 400) {
      const pe = n.parentElement;
      let font = fonts.get(pe);
      if (!font) { const cs = getComputedStyle(pe); font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; fonts.set(pe, font); }
      const s = n.data;
      for (let i = 0; i < s.length && count < 400;) {
        const cp = s.codePointAt(i), len = cp > 0xffff ? 2 : 1, ch = s.substr(i, len);
        if (!/\s/.test(ch)) {
          range.setStart(n, i); range.setEnd(n, i + len);
          const rr = range.getClientRects()[0];
          if (rr && rr.width > .5) { segs.push({ x0: rr.left + SX, x1: rr.right + SX, y: rr.top + SY + glyphTop(font, ch), lt: rr.top, lh: rr.height }); count++; }
        }
        i += len;
      }
    }
    let p = null;
    if (segs.length) {
      const first = Math.min(...segs.map(s => s.lt));
      const lh = segs[0].lh || 20;
      const line = segs.filter(s => s.lt < first + lh * .5).sort((a, b) => a.x0 - b.x0);
      p = { segs: line, x0: line[0].x0, x1: Math.max(...line.map(s => s.x1)) };
    }
    profCache.set(el, { key, t, p });
    return p;
  }
  const hasText = el => /\S/.test(el.textContent || '');

  /* a surface: at(x) → y | null, plus x0/x1 extents and readiness */
  function makeSurface(target, edge) {
    const markEl = (target.id === 'mark') ? target
      : (target.classList && target.classList.contains('wordmark')) ? (target.querySelector('canvas') || target)
        : null;
    const isMark = !!markEl;
    const born = now();
    const S = {
      isMark, el: markEl || target, ok: false, ready: false, x0: 0, x1: 0, top: 0, bottom: 0,
      edge: edge || (isMark ? 'mark' : (hasText(target) ? 'text' : 'box')),
      fn: () => null,
      update(t) {
        const el = S.el;
        if (!el.isConnected) { S.ok = false; return false; }
        const r = rect(el);
        if (!r.w && !r.h) { S.ok = false; return false; }
        S.ok = true; S.top = r.t; S.bottom = r.b;
        if (isMark) {
          const M = window.inchMark;
          if (M && typeof M.surface === 'function') {
            S.ready = M.settled !== false;
            S.x0 = r.l; S.x1 = r.r;
            S.fn = x => { const y = M.surface(x); return (y == null || !isFinite(y)) ? null : y; };
          } else {
            S.ready = now() - born > 2500;
            S.x0 = r.l; S.x1 = r.r; S.fn = () => r.t;
          }
          return true;
        }
        S.ready = true;
        if (S.edge === 'text') {
          const p = textProfile(el, t || now());
          if (!p) { S.x0 = r.l; S.x1 = r.r; S.fn = () => r.t; return true; }
          S.x0 = p.x0; S.x1 = p.x1;
          const segs = p.segs;
          S.fn = x => { for (const s of segs) if (x >= s.x0 && x < s.x1) return s.y; return null; };
          S.segs = segs;
        } else {
          S.x0 = r.l; S.x1 = r.r; S.fn = () => r.t; S.segs = null;
        }
        return true;
      },
      at(x) { return S.fn(x); },
      /* the highest point under [xa, xb] */
      peak(xa, xb) {
        let best = null;
        const step = Math.max(2, (xb - xa) / 12);
        for (let x = xa; x <= xb + .01; x += step) { const y = S.fn(x); if (y != null && (best == null || y < best)) best = y; }
        return best;
      },
      nearest(x) {
        if (S.segs && S.segs.length) {
          let best = null, bd = 1e9;
          for (const s of S.segs) { const cx = clamp(x, s.x0 + 1, s.x1 - 1), d = Math.abs(cx - x); if (d < bd) { bd = d; best = { x: cx, y: s.y }; } }
          return best;
        }
        for (let d = 0; d < 400; d += 3) { for (const sgn of [1, -1]) { const xx = x + d * sgn, y = S.fn(xx); if (y != null && xx >= S.x0 && xx <= S.x1) return { x: xx, y }; } }
        return null;
      }
    };
    return S;
  }
  let inImpact = false;
  function markImpact(x, y, p) {
    const M = window.inchMark;
    if (!M || typeof M.impact !== 'function' || inImpact) return;
    inImpact = true;
    try { M.impact(x, y, p); } catch (e) { /* the wordmark is optional */ }
    inImpact = false;
  }

  /* =====================================================================
   * 5. OVERLAY LAYERS and ACTORS
   * ===================================================================== */
  const LAYER_CSS = `
.a{position:absolute;left:0;top:0;will-change:transform;contain:layout style;pointer-events:none}
.a.fx{position:fixed}
.bd{position:absolute;left:0;top:0}
:host(.dark) .bd{filter:drop-shadow(0 0 1px rgba(255,255,255,.55))}
canvas.spr{position:absolute;left:0;top:0;display:block;pointer-events:auto;cursor:pointer;image-rendering:pixelated;image-rendering:crisp-edges;transform-origin:50% 100%;touch-action:pan-y;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none}
.a.grab canvas.spr{cursor:grab}
.a.held canvas.spr{cursor:grabbing}
.silk{position:absolute;left:50%;top:0;width:var(--sw,1px);margin-left:calc(var(--sw,1px) / -2);background:#1b1226;opacity:.75}
:host(.dark) .silk{background:#f2eef8;opacity:.6}
.bub{position:absolute;left:50%;bottom:100%;margin-bottom:var(--g);transform:translateX(-50%) scale(0);transform-origin:50% 100%;transition:transform .14s steps(3);background:#fffdf5;padding:var(--p);box-shadow:var(--u) 0 0 #1b1226,calc(var(--u) * -1) 0 0 #1b1226,0 var(--u) 0 #1b1226,0 calc(var(--u) * -1) 0 #1b1226;line-height:0;pointer-events:none;white-space:nowrap}
.bub.on{transform:translateX(-50%) scale(1)}
.bub::after{content:"";position:absolute;left:50%;top:100%;width:var(--u);height:var(--u);margin-left:calc(var(--u) / -2);margin-top:var(--u);background:#1b1226}
.bub canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
.prop{position:absolute;left:50%;top:100%;image-rendering:pixelated;image-rendering:crisp-edges;pointer-events:none}
@media (prefers-reduced-motion:reduce){.bub{transition:none}}`;
  const layers = {};
  function getLayer(top) {
    const key = top ? 'top' : 'main';
    if (layers[key] && layers[key].host.isConnected) return layers[key];
    const host = document.createElement('div');
    host.setAttribute('data-inchpix', top ? 'top' : '');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = `position:absolute;left:0;top:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:${top ? 'var(--inchpix-top-z,70)' : 'var(--inchpix-z,40)'}`;
    const root = host.attachShadow({ mode: 'open' });
    let done = false;
    try { if (root.adoptedStyleSheets !== undefined && typeof CSSStyleSheet === 'function') { const sh = new CSSStyleSheet(); sh.replaceSync(LAYER_CSS); root.adoptedStyleSheets = [sh]; done = true; } } catch (e) { done = false; }
    if (!done) { const st = document.createElement('style'); st.textContent = LAYER_CSS; root.appendChild(st); }
    document.body.appendChild(host);
    host.classList.toggle('dark', isDark());
    layers[key] = { host, root, ox: 0, oy: 0 };
    return layers[key];
  }
  const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

  /* The world runs on rAF only while something on screen is moving (walking,
     flying, falling, swinging, being held). When everything in view is just
     breathing through its idle frames, it naps and ticks every NAP ms instead;
     off-screen residents nearby tick at that slow rate too. Big gaps are cut
     into ≤50ms sub-steps so the physics stays the same at any rate. */
  const actors = new Set();
  const NAP = 125;
  let worldOn = false, stillFrames = 0, worldLast = 0, napT = 0;
  function wakeWorld() {
    if (napT) { clearTimeout(napT); napT = 0; }
    if (actors.size && !worldOn) { worldOn = true; stillFrames = 0; sub(world); }
  }
  function wakeAll() { wakeWorld(); wakeFaces(); wakeCrowds(); }
  const onScreen = (a, m = 0) => {
    if (a.hidden || a.x < -9000) return false;
    const w = a.W * a.s, h = a.H * a.s;
    return a.x + w / 2 > SX - m && a.x - w / 2 < SX + VW + m && a.y > SY - m && a.y - h < SY + VH + m;
  };
  function tickActor(a, real, t) {
    const n = Math.max(1, Math.ceil(real / .05 - 1e-6)), sdt = real / n;
    for (let i = 0; i < n; i++) {
      try { a.ctl.tick(sdt, t); } catch (e) { a.hidden = true; if (window.console) console.warn('[InchPix]', a.kind, e); break; }
    }
    a.step(real);
  }
  function world(dt, t) {
    const real = worldLast ? clamp((t - worldLast) / 1000, .001, .25) : dt;
    worldLast = t;
    for (const k in layers) { const L = layers[k]; if (L.host.isConnected) { const b = L.host.getBoundingClientRect(); L.ox = b.left + SX; L.oy = b.top + SY; } }
    let fast = false, any = false, changed = false;
    for (const a of actors) {
      if (a.dead) continue;
      const awake = !!(a.ctl.awake && a.ctl.awake());
      const near = a.first || a.y < -9000 || a.held || a.fixed || awake || Math.abs(a.y - (SY + VH / 2)) < VH * 1.5;
      if (!near) continue;
      any = true;
      const seen = a.first || a.held || onScreen(a, 100);   /* just outside the edge counts: it is fresh when it scrolls in */
      /* nearby but out of sight: a few ticks a second keep it ready */
      a._acc = (a._acc || 0) + real;
      if (!seen && !awake && a._acc < NAP / 1000) continue;
      const span = Math.min(.25, a._acc); a._acc = 0;
      a.first = false;
      tickActor(a, span, t);
      if (a.render()) changed = true;
      if (a.held || ((awake || a._moved) && onScreen(a))) fast = true;   /* only what you can actually see moving */
    }
    if (reduced() && !changed) stillFrames++; else stillFrames = 0;
    if (fast && !(reduced() && stillFrames > 45)) return;
    worldOn = false;
    /* nap: idle frames and timers carry on at a few ticks a second (nothing at all when motion is reduced) */
    if (any && !reduced()) napT = setTimeout(() => { napT = 0; wakeWorld(); }, NAP);
    return false;
  }

  class Actor {
    constructor(kind, s, opt = {}) {
      this.kind = kind; this.spr = SPR[kind]; this.s = s;
      this.W = this.spr.w; this.H = this.spr.h;
      this.x = -1e4; this.y = -1e4; this.face = 1; this.sx = 1; this.sy = 1; this.rot = 0; this.op = 1;
      this.hidden = false; this.fixed = false; this.clipDepth = 0; this.first = true; this.held = false;
      this.L = getLayer(!!opt.top);
      const n = this.node = document.createElement('div'); n.className = 'a';
      const bd = this.body = document.createElement('div'); bd.className = 'bd';
      const c = this.cv = document.createElement('canvas'); c.className = 'spr';
      c.width = this.W; c.height = this.H;
      const w = this.W * s, h = this.H * s;
      n.style.width = bd.style.width = c.style.width = w + 'px';
      n.style.height = bd.style.height = c.style.height = h + 'px';
      bd.appendChild(c); n.appendChild(bd); this.L.root.appendChild(n);
      this.ctx = c.getContext('2d');
      this.clip = null; this.fi = 0; this.ft = 0; this.fps = 0; this.once = false;
      this.play('idle');
      if (opt.hue) this.cv.style.filter = `hue-rotate(${+opt.hue}deg)`;
    }
    has(name) { return !!this.spr.clips[name] || !!(this.spr.alias && this.spr.alias[name] && this.spr.clips[this.spr.alias[name]]); }
    play(name, o) {
      const c = clipOf(this.spr, name);
      const fps = (o && o.fps) || 0;
      if (this.clip === c && !(o && o.restart)) { this.fps = fps; return; }
      this.clip = c; this.fi = 0; this.ft = 0; this.fps = fps; this.once = !!(o && o.once);
    }
    step(dt) {
      if (reduced()) return;
      const cl = this.spr.clips[this.clip];
      const n = cl[1].length; if (n < 2) return;
      const per = 1 / (this.fps || cl[0] || 6);
      this.ft += dt;
      while (this.ft >= per) { this.ft -= per; if (this.fi < n - 1) this.fi++; else if (!this.once) this.fi = 0; else break; }
    }
    addSilk() {
      if (this.silk) return;
      this.silk = document.createElement('div'); this.silk.className = 'silk';
      this.silk.style.setProperty('--sw', Math.max(1, Math.round(this.s / 2)) + 'px');
      this.node.insertBefore(this.silk, this.body);
    }
    render() {
      const n = this.node;
      this._moved = false;
      if (this.hidden) { if (!this._h) { n.style.display = 'none'; this._h = true; return true; } return false; }
      let changed = false;
      if (this._h !== false) { n.style.display = ''; this._h = false; changed = true; }
      /* a resident living inside a .reveal card fades in with that card, never before it */
      let vop = 1;
      if (this.veil) {
        vop = this.veil.isConnected ? +getComputedStyle(this.veil).opacity : 1;
        if (!(vop < .999)) { vop = 1; this.veil = null; }
      }
      const vis = vop < .02 ? 'hidden' : '';
      if (vis !== this._vis) { n.style.visibility = this._vis = vis; changed = true; }
      const frames = baked(this.spr, this.clip);
      const fr = frames[Math.min(this.fi, frames.length - 1)];
      if (fr !== this._fr) { this.ctx.clearRect(0, 0, this.W, this.H); this.ctx.drawImage(fr, 0, 0); this._fr = fr; changed = true; }
      const before = changed;  /* everything below is movement on the page */
      changed = false;
      if (this.fixed !== this._fx) { n.classList.toggle('fx', this.fixed); this._fx = this.fixed; changed = true; }
      const s = this.s, w = this.W * s, h = this.H * s;
      const ox = this.fixed ? SX : this.L.ox, oy = this.fixed ? SY : this.L.oy;
      let tr;
      if (this.hang) {
        const H = this.hang;
        const L = Math.round(H.ax - w / 2 - ox), T = Math.round(H.ay - oy);
        tr = `translate3d(${L}px,${T}px,0) rotate(${(-H.th * 57.2958).toFixed(1)}deg)`;
        const len = Math.round(H.L);
        if (len !== this._len) { this.silk.style.height = Math.max(0, len) + 'px'; this.body.style.top = len + 'px'; this._len = len; changed = true; }
        if (!this._ho) { n.style.transformOrigin = '50% 0'; this._ho = true; }
      } else {
        let left = this.x - w / 2, top = this.y - h;
        if (!this.fixed) { const dw = docW(); left = clamp(left, 0, Math.max(0, dw - w)); top = Math.min(top, docH() - h); }
        tr = `translate3d(${Math.round(left - ox)}px,${Math.round(top - oy)}px,0)`;
      }
      if (tr !== this._tr) { n.style.transform = this._tr = tr; changed = true; }
      const ct = `scale(${(this.face * this.sx).toFixed(3)},${this.sy.toFixed(3)}) rotate(${this.rot.toFixed(1)}deg)`;
      if (ct !== this._ct) { this.cv.style.transform = this._ct = ct; changed = true; }
      const cd = Math.round(this.clipDepth);
      if (cd !== this._cd) { n.style.clipPath = cd > 0 ? `inset(-400px -400px ${cd}px -400px)` : ''; this._cd = cd; changed = true; }
      const op = this.op * vop;
      if (op !== this._op) { n.style.opacity = op; this._op = op; changed = true; }
      this._moved = changed;
      return changed || before;
    }
    say(icon, ms = 1200) {
      if (!ICONS[icon]) return;
      let b = this.bub;
      if (!b) { b = this.bub = document.createElement('div'); b.className = 'bub'; b.appendChild(document.createElement('canvas')); this.body.appendChild(b); }
      const s = this.s, u = Math.max(2, s >> 1), p = Math.max(3, s), g = Math.max(6, 2 * s), iu = Math.max(2, Math.round(s * .75));
      b.style.setProperty('--u', u + 'px'); b.style.setProperty('--p', p + 'px'); b.style.setProperty('--g', g + 'px');
      const src = iconCanvas(icon), cv = b.firstChild;
      cv.width = src.width; cv.height = src.height;
      cv.style.width = src.width * iu + 'px'; cv.style.height = src.height * iu + 'px';
      cv.getContext('2d').drawImage(src, 0, 0);
      b.classList.remove('on');
      void b.offsetWidth;
      b.classList.add('on');
      clearTimeout(this._bt);
      if (ms) this._bt = setTimeout(() => this.hush(), ms);
    }
    hush() { if (this.bub) this.bub.classList.remove('on'); }
    prop(name, on) {
      if (!this._prop) {
        const src = iconCanvas(name), c = this._prop = document.createElement('canvas');
        c.className = 'prop'; c.width = src.width; c.height = src.height;
        const u = Math.max(2, Math.round(this.s * .7));
        c.style.width = src.width * u + 'px'; c.style.height = src.height * u + 'px';
        c.style.marginLeft = -src.width * u / 2 + 'px'; c.style.marginTop = -u + 'px';
        c.getContext('2d').drawImage(src, 0, 0);
        this.body.appendChild(c);
      }
      this._prop.style.display = on ? '' : 'none';
    }
    destroy() { this.dead = true; clearTimeout(this._bt); this.node.remove(); actors.delete(this); }
  }

  /* hearing: hard landings tell everyone around */
  function shout(type, x, y, radius, from) {
    for (const b of actors) {
      if (b === from || b.dead || !b.ctl.hear) continue;
      const d = Math.hypot(b.x - x, (b.y - b.H * b.s / 2) - y);
      if (d < radius) { try { b.ctl.hear(type, { x, y }, d); } catch (e) { /* ignore */ } }
    }
  }

  /* press, drag and throw: 5px makes a drag; a 90ms pause makes a drop.
     A finger is different: a swipe that starts on a resident scrolls the page,
     a tap pokes it, and a 300ms hold picks it up. */
  function bindPointer(a) {
    const c = a.cv;
    let holding = false;
    /* once a finger holds a resident, the page must not scroll under it */
    c.addEventListener('touchmove', ev => { if (holding && ev.cancelable) ev.preventDefault(); }, { passive: false });
    const told = () => { if (a.host) a.host.dispatchEvent(new CustomEvent('inch:poke', { bubbles: true, detail: { kind: a.kind } })); };
    c.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const finger = e.pointerType === 'touch';
      const ctl = a.ctl;
      if (!finger) { e.preventDefault(); told(); if (!ctl.grab) { ctl.poke && ctl.poke(e); return; } }
      const sx = e.clientX, sy = e.clientY;
      let moved = false, vx = 0, vy = 0, lx = sx, ly = sy, lt = now(), lastMove = now(), holdT = 0;
      holding = !finger;
      if (finger && ctl.grab) holdT = setTimeout(() => { holding = true; a.sx = .9; a.sy = 1.12; wakeAll(); }, 300);
      try { c.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
      const move = ev => {
        const t = now(), dtt = Math.max(1, t - lt);
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > (finger ? 8 : 5)) {
          if (!holding || !ctl.grab) { clearTimeout(holdT); return; }   /* a finger swiping by: let the page scroll */
          if (finger) told();
          moved = true; a.held = true; a.node.classList.add('held'); ctl.grab.start();
        }
        if (moved) {
          const dx = ev.clientX - lx, dy = ev.clientY - ly;
          vx = clamp(lerp(vx, dx / dtt * 1000, .5), -2600, 2600);
          vy = clamp(lerp(vy, dy / dtt * 1000, .5), -2600, 2600);
          if (Math.abs(dx) + Math.abs(dy) > .5) lastMove = t;
          ctl.grab.move(ev.clientX + scrollX, ev.clientY + scrollY);
          wakeAll();
        }
        lx = ev.clientX; ly = ev.clientY; lt = t;
      };
      const end = ev => {
        c.removeEventListener('pointermove', move); c.removeEventListener('pointerup', end); c.removeEventListener('pointercancel', end);
        clearTimeout(holdT); holding = false;
        try { c.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (moved) {
          if (now() - lastMove > 90) vx = vy = 0;
          a.held = false; a.node.classList.remove('held'); ctl.grab.end(vx, vy);
        } else if (ev.type === 'pointerup' && Math.hypot(ev.clientX - sx, ev.clientY - sy) <= 8) { if (finger) told(); ctl.poke && ctl.poke(ev); }
        wakeAll();
      };
      c.addEventListener('pointermove', move); c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    });
  }

  /* =====================================================================
   * 6. BEHAVIOURS — crawl, bounce, sit, hang, peek, perch, hoist, toy
   * ===================================================================== */
  const BEH = {};

  /* crawl: walk the real outline; ≤2.5s steps walk, larger ones hop */
  BEH.crawl = (a, o) => {
    const s = a.s, S = s / 3, hw = a.W * s / 2, H = a.H * s;
    const surf = makeSurface(o.target, o.edge);
    const speed = 30 * S * (o.speed || 1);
    const at = o.at != null ? o.at : (surf.isMark ? .35 : .5);
    let st = 'wait', T = 0, hop = null, walkT = rnd(2, 4), runT = 0, fleeX = 0, lastHeart = 0, entered = false;
    a.hidden = true;
    const lo = () => surf.x0 + hw * .5, hi = () => surf.x1 - hw * .5;
    const go = next => { st = next; if (next === 'walk') { walkT = rnd(3, 7); a.play('walk'); } };
    const startHop = (x1, y1, dur, next, lift) => {
      hop = { x0: a.x, y0: a.y, x1, y1, t: 0, dur, next, cy: Math.min(a.y, y1) - (lift != null ? lift : Math.max(10 * S, Math.abs(y1 - a.y) + 8 * S) * 1.4) };
      st = 'hop'; a.play('hop');
    };
    const turn = () => { a.face *= -1; st = 'look'; T = rnd(.8, 1.6); a.play('look'); };
    const idlePick = () => {
      const r = Math.random();
      if (r < .4) { st = 'sniff'; T = rnd(1, 1.8); a.play('sniff'); }
      else if (r < .75) { st = 'look'; T = rnd(1.2, 2.2); a.play('look'); if (Math.random() < .4) a.face *= -1; }
      else { st = 'idle'; T = rnd(1, 2.4); a.play('idle'); }
    };
    const enter = () => {
      entered = true;
      a.x = clamp(surf.x0 + at * (surf.x1 - surf.x0), lo(), Math.max(lo(), hi()));
      let y = surf.at(a.x);
      if (y == null) { const n = surf.nearest(a.x); if (n) { a.x = n.x; y = n.y; } else y = surf.top; }
      a.face = Math.random() < .5 ? 1 : -1;
      if (reduced()) { a.y = y; go('walk'); return; }
      if (surf.isMark || o.drop) { a.y = y - (surf.isMark ? 160 : 120) * S; startHop(a.x, y, .55, 'walk', 4 * S); hop.track = true; }
      else { a.y = y; go('walk'); }
    };
    return {
      tick(dt, t) {
        if (!surf.update(t)) { a.hidden = true; return; }
        if (!surf.ready) { a.hidden = true; return; }
        if (!entered) enter();
        a.hidden = false;
        const k = ease(14, dt);
        a.sx = lerp(a.sx, 1, k); a.sy = lerp(a.sy, 1, k);
        if (reduced()) {
          hop = null; st = st === 'flip' ? 'flip' : 'walk';
          const y = surf.at(a.x); if (y != null) a.y = y; else { const n = surf.nearest(a.x); if (n) { a.x = n.x; a.y = n.y; } }
          a.play('idle'); a.sx = a.sy = 1; return;
        }
        if (st === 'hop') {
          hop.t += dt;
          const p = Math.min(1, hop.t / hop.dur);
          let y1 = hop.y1;
          if (hop.track) { const yy = surf.at(hop.x1); if (yy != null) y1 = yy; }
          a.x = lerp(hop.x0, hop.x1, p);
          a.y = (1 - p) * (1 - p) * hop.y0 + 2 * (1 - p) * p * hop.cy + p * p * y1;
          if (p < 1) { a.sx = .94; a.sy = 1.08; return; }
          a.sx = 1.15; a.sy = .8;
          if (surf.isMark) markImpact(a.x, a.y, .45);
          const nx = hop.next; hop = null;
          if (nx === 'flip') { st = 'flip'; T = rnd(1.4, 2); a.play('flip'); }
          else if (nx === 'scurry') { st = 'scurry'; a.play('walk', { fps: 20 }); }
          else if ((nx || 'walk') === 'walk' && walkT > 0) { st = 'walk'; a.play('walk'); }
          else go(nx || 'walk');
          return;
        }
        let y = surf.at(a.x);
        if (y == null) {
          const n = surf.nearest(a.x);
          if (n) startHop(n.x, n.y, .4, 'walk'); else a.hidden = true;
          return;
        }
        a.y = y;
        /* shy of the cursor */
        const cx = a.x, cy = a.y - H / 2;
        if (st !== 'alarm' && st !== 'scurry' && st !== 'flip' && Math.hypot(ptr.x - cx, ptr.y - cy) < 46 * S + hw) {
          st = 'alarm'; T = .32; fleeX = ptr.x; a.face = ptr.x > cx ? 1 : -1; a.play('alarm'); a.say('!', 800); return;
        }
        if (st === 'alarm') {
          T -= dt; if (T <= 0) { st = 'scurry'; runT = rnd(.9, 1.4); a.face = fleeX > a.x ? -1 : 1; a.play('walk', { fps: 20 }); }
          return;
        }
        if (st === 'walk' || st === 'scurry') {
          const v = speed * (st === 'scurry' ? 3.4 : 1);
          const nx = a.x + a.face * v * dt;
          if (nx < lo() || nx > hi()) { if (st === 'scurry') { a.face *= -1; } else turn(); return; }
          const ny = surf.at(nx);
          if (ny != null && Math.abs(ny - a.y) <= 2.5 * s) { a.x = nx; a.y = ny; }
          else {
            let gap = ny == null, found = null;
            for (let d = 2; d <= 34 * s; d += 2) {
              const x2 = a.x + a.face * d;
              if (x2 < lo() || x2 > hi()) break;
              const y2 = surf.at(x2);
              if (y2 == null) { gap = true; continue; }
              if (gap || Math.abs(y2 - a.y) > 2.5 * s) {
                const x3 = clamp(x2 + a.face * Math.min(hw * .5, 8 * S), lo(), hi()), y3 = surf.at(x3);
                found = (y3 != null && Math.abs(y3 - y2) <= 2.5 * s) ? { x: x3, y: y3 } : { x: x2, y: y2 };
                break;
              }
            }
            if (found) startHop(found.x, found.y, clamp(.28 + Math.abs(found.x - a.x) / 500, .28, .6), st);
            else if (st === 'scurry') { a.face *= -1; }
            else turn();
            return;
          }
          if (st === 'walk') { walkT -= dt; if (walkT <= 0) idlePick(); }
          else { runT -= dt; if (runT <= 0) go('walk'); }
          /* two pencils face to face */
          if (t - lastHeart > 4000) {
            for (const b of actors) {
              if (b === a || b.kind !== a.kind || !b.ctl.crawler || b.hidden) continue;
              if (Math.abs(b.x - a.x) < a.W * s * .85 && Math.abs(b.y - a.y) < 6 && a.face === (b.x > a.x ? 1 : -1) && b.face === -a.face) {
                lastHeart = t; b.ctl.meet && b.ctl.meet(t);
                a.say('heart', 1100); st = 'idle'; T = .9; a.play('happy');
                setTimeout(() => { a.face *= -1; }, 700);
                break;
              }
            }
          }
          return;
        }
        if (st === 'flip') { T -= dt; if (T <= 0) startHop(a.x, a.y, .3, 'walk', 14 * S); return; }
        T -= dt; if (T <= 0) go('walk');
      },
      crawler: true,
      meet(t) { lastHeart = t; if (st === 'walk' || st === 'idle') { a.say('heart', 1100); st = 'idle'; T = .9; a.play('happy'); setTimeout(() => { a.face *= -1; }, 700); } },
      poke() {
        if (st === 'flip' || st === 'hop') { a.say('sweat', 700); return; }
        a.say(pick(['!?', '!', 'sweat']), 900);
        if (reduced()) return;
        startHop(a.x, a.y, .3, 'flip', 16 * S);
      },
      nudge(icon) { a.say(icon || '!', 900); if (!reduced() && st !== 'hop') startHop(a.x, a.y, .35, 'walk', 18 * S); },
      hear(type, from) { if (st === 'hop' || st === 'flip' || reduced()) return; st = 'alarm'; T = .25; fleeX = from.x; a.play('alarm'); if (Math.random() < .5) a.say('!', 600); }
    };
  };

  /* bounce: fall in, hop, leap at the cursor, get thrown, get dizzy */
  BEH.bounce = (a, o) => {
    const s = a.s, S = s / 4, rS = Math.sqrt(S), hw = a.W * s / 2, H = a.H * s;
    const surf = makeSurface(o.target, o.edge || (o.target.id === 'mark' ? null : 'box'));
    const G = 2400 * S;
    const at = o.at != null ? o.at : .5;
    let started = false, ground = false, vx = 0, vy = 0, wait = rnd(.15, .9), sq = 0, sqv = 0, spin = 0;
    let dizzy = 0, hard = 0, willDizzy = false, landT = 0, flare = 0, gx = 0, gy = 0, held = false;
    a.cv.parentNode.parentNode.classList.add('grab');
    const lo = () => surf.x0 + hw * .7, hi = () => Math.max(surf.x0 + hw * .7, surf.x1 - hw * .7);
    const floorAt = (x, yNow) => { const y = surf.at(x); if (y != null && (yNow == null || yNow <= y + 14)) return y; return (surf.isMark || surf.edge === 'text') ? surf.bottom : y; };
    const settle = () => { ground = true; vy = 0; vx = 0; wait = rnd(.15, .9); landT = .25; spin = 0; a.rot = ((a.rot % 360) + 540) % 360 - 180; };
    const land = (imp, fy) => {
      a.y = fy;
      const big = imp > 600 * rS;
      if (imp > 2100 * rS || hard >= 3 || willDizzy) { dizzy = 2.2; a.say('star', 1600); hard = 0; willDizzy = false; settle(); }
      else if (big) { vy = -imp * .45; vx *= .8; hard++; a.y = fy - .5; }
      else { settle(); hard = 0; }
      sq = -clamp(imp / 2200, .12, .42); sqv = 0;
      if (big) shout('thud', a.x, a.y, 170 * S * clamp(imp / 1200, .6, 1.8), a);
      if (surf.isMark) markImpact(a.x, a.y, clamp(imp / 1500, .3, 1.6));
    };
    const hop = (mult = 1) => {
      const big = Math.random() < .15, pw = (big ? 1.35 : rnd(.55, 1)) * mult;
      vy = -rnd(560, 760) * rS * pw;
      vx = (Math.random() < .5 ? -1 : 1) * 110 * S * rnd(.4, 1);
      if (a.x - lo() < 30 * S) vx = Math.abs(vx);
      if (hi() - a.x < 30 * S) vx = -Math.abs(vx);
      ground = false; wait = rnd(.15, .9);
    };
    return {
      awake: () => held || (!ground && started && Math.abs(a.y - (SY + VH / 2)) < VH * 3),
      tick(dt) {
        if (!surf.update()) { a.hidden = true; return; }
        if (!surf.ready) { a.hidden = true; return; }
        if (!started) {
          started = true;
          a.x = clamp(surf.x0 + at * (surf.x1 - surf.x0), lo(), hi());
          const fy = floorAt(a.x); const y0 = fy != null ? fy : surf.top;
          if (reduced()) { a.y = y0; ground = true; } else { a.y = y0 - (o.drop ? 260 : 200) * S; ground = false; vy = 0; }
        }
        a.hidden = false;
        if (held) {
          a.x = clamp(gx, lo() - 40, hi() + 40);
          a.y = gy + H * .65;
          a.play('held'); a.rot *= .85; sq = lerp(sq, 0, .2); a.sx = 1 - .7 * sq; a.sy = 1 + sq;
          return;
        }
        if (reduced()) {
          a.x = clamp(a.x, lo(), hi());
          const fy = floorAt(a.x, a.y); if (fy != null) a.y = fy;
          ground = true; a.rot = 0; a.sx = a.sy = 1; a.play('idle'); return;
        }
        if (dizzy > 0) dizzy -= dt;
        if (flare > 0) flare -= dt;
        if (!ground) {
          const py = a.y;
          vy += G * dt;
          a.x += vx * dt; a.y += vy * dt;
          if (a.x < lo()) { a.x = lo(); vx = Math.abs(vx) * .7; }
          if (a.x > hi()) { a.x = hi(); vx = -Math.abs(vx) * .7; }
          a.rot += spin * dt; spin *= Math.pow(.2, dt);
          const fy = floorAt(a.x, py);
          if (fy != null && vy > 0 && a.y >= fy && py <= fy + Math.max(6, vy * dt + 3)) land(vy, fy);
          else if (a.y > docH() + 400) { a.y = (fy != null ? fy : surf.top) - 300 * S; vy = 0; }
          if (!ground) {
            sq = lerp(sq, clamp(Math.abs(vy) / 2600, 0, 1) * .22, ease(12, dt)); sqv = 0;
            a.play(flare > 0 ? 'flare' : dizzy > 0 ? 'dizzy' : vy < 0 ? 'rise' : 'air');
          }
        } else {
          const fy = floorAt(a.x, a.y);
          if (fy == null) { ground = false; vy = 0; }
          else a.y = fy;
          sqv += (-260 * sq - 14 * sqv) * dt; sq += sqv * dt;
          a.rot = lerp(a.rot, 0, ease(12, dt));
          if (landT > 0) landT -= dt;
          a.play(dizzy > 0 ? 'dizzy' : flare > 0 ? 'flare' : landT > 0 ? 'land' : 'idle');
          if (dizzy <= 0) {
            wait -= dt;
            if (ptrIn() && ptr.y < a.y - H * .5 && a.y - ptr.y < 170 * S * 1.4 && Math.abs(ptr.x - a.x) < 170 * S && wait < .45) {
              vx = clamp((ptr.x - a.x) * 1.6, -380 * S, 380 * S); vy = -rnd(560, 760) * rS * 1.15; ground = false; wait = rnd(.4, 1);
              if (Math.random() < .4) a.say(pick(['heart', 'note']), 900);
            } else if (wait <= 0) hop();
          }
        }
        a.sx = 1 - .7 * sq; a.sy = 1 + sq;
      },
      poke() {
        a.say('!', 800); flare = .9;
        if (reduced()) return;
        vy = -760 * rS * 1.6; vx = rnd(-60, 60) * S; spin = (Math.random() < .5 ? -1 : 1) * 720; ground = false;
      },
      nudge(icon) {
        a.say(icon || '!', 900); flare = .8;
        if (reduced()) return;
        vy = -760 * rS * 1.5; vx = rnd(-40, 40) * S; spin = (Math.random() < .5 ? -1 : 1) * 360; ground = false; dizzy = 0;
      },
      hear() { if (ground && dizzy <= 0 && !reduced()) { hop(.6); if (Math.random() < .3) a.say('!', 600); } },
      grab: {
        start() { held = true; dizzy = 0; a.say('sweat', 800); },
        move(x, y) { gx = x; gy = y; },
        end(vx2, vy2) {
          held = false; ground = false; vx = vx2; vy = vy2; spin = clamp(vx2 * .9, -900, 900);
          if (Math.hypot(vx2, vy2) > 1600) { a.say('!?', 900); willDizzy = true; }
        }
      }
    };
  };

  /* sit: read on the end of a line; shy when watched; moves after 3 pokes */
  BEH.sit = (a, o) => {
    const s = a.s, S = s / 3, hw = a.W * s / 2, H = a.H * s;
    const surf = makeSurface(o.target, o.edge);
    let at = o.at != null ? o.at : (o.side === 'left' ? 0 : 1);
    let st = 'read', T = rnd(4, 8), readFor = 0, watch = 0, swayT = rnd(5, 10), sway = 0, pokes = [], mv = null, bob = 0;
    const isReader = a.kind === 'mebu';
    const seat = () => {
      const span = Math.max(0, surf.x1 - surf.x0 - 2 * hw);
      const x = surf.x0 + hw + at * span;
      let y = surf.peak(x - hw * .55, x + hw * .55);
      if (y == null) { const n = surf.nearest(x); y = n ? n.y : surf.top; }
      return { x, y };
    };
    const back = () => { st = 'read'; T = rnd(4, 9); a.play(isReader ? 'read' : 'idle'); };
    a.play(isReader ? 'read' : 'idle');
    return {
      tick(dt, t) {
        if (!surf.update(t) || !surf.ready) { a.hidden = true; return; }
        a.hidden = false;
        if (mv) {
          mv.t += dt; const p = Math.min(1, mv.t / mv.dur);
          at = lerp(mv.a0, mv.a1, p);
          const sp = seat();
          a.x = sp.x; a.y = sp.y - Math.sin(Math.PI * p) * 50 * S;
          a.sx = .95; a.sy = 1.06;
          if (p >= 1) { mv = null; a.sx = 1.15; a.sy = .8; st = 'shy'; T = 1.2; a.play('back'); a.face = at > .5 ? -1 : 1; }
          return;
        }
        const sp = seat();
        a.x = sp.x; a.y = sp.y;
        if (reduced()) { a.play(isReader ? 'read' : 'idle'); a.sx = a.sy = 1; return; }
        const k = ease(14, dt); a.sx = lerp(a.sx, 1, k); a.sy = lerp(a.sy, 1, k);
        if (bob > 0) { bob -= dt; a.y -= Math.sin(Math.PI * clamp(1 - bob / .35, 0, 1)) * 14 * S; }
        const d = Math.hypot(ptr.x - a.x, ptr.y - (a.y - H / 2));
        watch = d < 110 * S ? watch + dt : 0;
        if (st === 'read') {
          readFor += dt; T -= dt;
          if (watch > 1.1) { st = 'look'; T = 1.4; a.play('look'); a.say(Math.random() < .5 ? '...' : 'shy', 1300); return; }
          if (sway > 0) { sway -= dt; if (sway <= 0) a.play(isReader ? 'read' : 'idle'); }
          else { swayT -= dt; if (swayT <= 0) { swayT = rnd(6, 12); sway = 1.2; a.play('sway'); } }
          if (T <= 0) {
            if (readFor > 18 && Math.random() < .5) { st = 'doze'; T = rnd(5, 9); readFor = 0; a.play('doze'); a.say('zz', 0); }
            else { st = 'flip'; T = .5; a.play('flip', { restart: true }); }
          }
        } else if (st === 'flip') { T -= dt; if (T <= 0) back(); }
        else if (st === 'look') { T -= dt; if (T <= 0 && watch < 1.1) { a.hush(); back(); } else if (T <= 0) T = .6; }
        else if (st === 'doze') { if (watch > .6) { a.hush(); a.say('!', 700); st = 'look'; T = 1.2; a.play('look'); } else { T -= dt; if (T <= 0) { a.hush(); back(); } } }
        else { T -= dt; if (T <= 0) back(); }
      },
      poke() {
        if (mv) return;
        const t = now(); pokes = pokes.filter(p => t - p < 4000); pokes.push(t);
        if (st === 'doze') a.hush();
        if (pokes.length >= 3 && !reduced()) {
          pokes = [];
          a.say('sweat', 900);
          const a1 = at > .5 ? rnd(.05, .35) : rnd(.65, .95);
          const w = surf.x1 - surf.x0;
          mv = { a0: at, a1, t: 0, dur: clamp(Math.abs(a1 - at) * w / 700, .45, .9) };
          a.face = a1 > at ? 1 : -1; a.play('carry'); st = 'move';
          return;
        }
        a.say(pokes.length === 2 ? 'sweat' : pick(['!', 'shy']), 900);
        st = 'shy'; T = 1.1; a.play('shy'); bob = .35;
      },
      nudge(icon) { a.say(icon || '!', 900); bob = .35; st = 'shy'; T = .9; a.play(isReader ? 'happy' : 'idle'); },
      hear() { if (mv) return; a.say(pick(['!?', '!']), 700); st = 'shy'; T = .8; a.play('shy'); }
    };
  };

  /* hang: a pendulum on a thread under the nav; zips up when reached for.
     Where the page leaves a gutter beside its column, it hangs in the gutter.
     On touch screens, once you are past the first screen, it keeps its thread
     short (just under the nav), and a tap sends it up out of the way for 15s. */
  BEH.hang = (a, o) => {
    const s = a.s, S = s / 3, H = a.H * s, Wd = a.W * s;
    const tgt = o.target;
    const at = o.at != null ? o.at : .72;
    const rest = (o.length != null ? o.length : 84) * S;
    const tuck = 4 * S;
    const col = tgt.querySelector && tgt.querySelector('.wrap');
    const hero = document.getElementById('top');
    let th = 0, w = 0, L = rest, Lv = 0, st = 'lower', T = 0, ring = 0, away = 0, axS = null;
    a.addSilk(); a.hang = { ax: 0, ay: 0, L: rest, th: 0 };
    a.play('idle');
    const tucked = () => touchy() && !!hero && rect(hero).b < SY + rect(tgt).h + VH * .25;
    return {
      tick(dt, t) {
        if (!tgt.isConnected) { a.hidden = true; return; }
        const r = rect(tgt);
        if (!r.w) { a.hidden = true; return; }
        a.hidden = false;
        a.fixed = pinned(tgt);
        const tk = tucked();
        let ax = r.l + at * r.w;
        if (col) { const c = rect(col), gut = r.r - c.r; if (gut >= Wd + 24) ax = c.r + gut / 2; else if (tk) ax = Math.max(ax, r.r - Wd / 2 - 6); }
        /* slide along the nav when its spot changes (tucking, resizing) rather than jump */
        axS = axS == null || reduced() || Math.abs(axS - ax) > VW ? ax : lerp(axS, ax, ease(6, dt));
        if (Math.abs(axS - ax) < .3) axS = ax;
        ax = axS;
        const ay = r.b;
        const home = tk ? tuck : rest;
        if (away > 0) away -= dt;
        if (reduced()) {
          th = 0; w = 0; L = away > 0 ? -H * .8 : home; Lv = 0;
          a.play(ring > 0 ? 'ring' : 'idle'); ring = Math.max(0, ring - dt);
        } else {
          const idle = now() - lastInput > 4000;
          const len = Math.max(20, L + H * .5);
          /* a still page lets it come to rest; input brings back the little kicks */
          w += (-(9.8 * 160 / len) * Math.sin(th) - (idle ? 3 : 1.1) * w) * dt;
          w += clamp(-scroll.dv * .0006, -1.2, 1.2);
          if (!idle && Math.random() < dt * .4) w += rnd(-.15, .15);
          const cx = ax + Math.sin(th) * (L + H / 2), cy = ay + Math.cos(th) * (L + H / 2);
          if (Math.abs(ptr.x - cx) < 40 * S && Math.abs(ptr.y - cy) < 60 * S) w += clamp(ptr.vx * .00009, -.25, .25);
          th = clamp(th + w * dt, -1.2, 1.2);
          /* the window's edges are walls: a big scroll kick never swings it out of sight */
          const reach = Math.max(1, L + H), maxR = (SX + VW - Wd / 2 - 2 - ax) / reach, maxL = (ax - SX - Wd / 2 - 2) / reach;
          if (maxR < 1 && Math.sin(th) > maxR) { th = Math.asin(Math.max(-1, maxR)); if (w > 0) w = -w * .5; }
          if (maxL < 1 && -Math.sin(th) > maxL) { th = -Math.asin(Math.max(-1, maxL)); if (w < 0) w = -w * .5; }
          if (idle && Math.abs(th) < .004 && Math.abs(w) < .02) { th = 0; w = 0; }
          const d = Math.hypot(ptr.x - cx, ptr.y - cy);
          if (away > 0) st = 'flee';
          else if (st === 'lower' && d < 75 * S) { st = 'flee'; a.say(pick(['!', 'sweat']), 700); }
          else if (st === 'flee' && d > 75 * S * 1.4) { st = 'wait'; T = rnd(1.2, 2.2); }
          else if (st === 'wait') { if (d < 75 * S) st = 'flee'; else if ((T -= dt) <= 0) st = 'lower'; }
          /* sent away by a tap: up behind the nav (the residents' layer sits under it), feet showing */
          const goal = away > 0 ? -H * .8 : st === 'lower' ? home + (idle || home === tuck ? 0 : Math.sin(t / 1600) * 10 * S) : Math.min(10 * S, home);
          const kk = st === 'lower' ? 18 : 140, cc = st === 'lower' ? 6 : 18;
          Lv += (kk * (goal - L) - cc * Lv) * dt; L = clamp(L + Lv * dt, away > 0 ? -H : 2 * S, rest * 3.2);
          if (idle && Math.abs(goal - L) < .3 && Math.abs(Lv) < 1) { L = goal; Lv = 0; }
          if (ring > 0) ring -= dt;
          a.play(ring > 0 ? 'ring' : st === 'flee' && away <= 0 ? 'scared' : Math.abs(Lv) > 30 ? 'wiggle' : 'idle');
        }
        a.hang.ax = ax; a.hang.ay = ay; a.hang.L = L; a.hang.th = th;
        a.x = ax + Math.sin(th) * (L + H); a.y = ay + Math.cos(th) * (L + H);
      },
      poke() {
        ring = 1.1; a.say('note', 1000);
        /* a finger cannot shoo it away by coming near, so a tap does: up for 15s */
        if (touchy()) { away = 15; st = 'flee'; return; }
        if (reduced()) return;
        Lv += 520 * S; w += rnd(-1.2, 1.2); st = 'lower';
      },
      nudge(icon) { ring = 1.1; a.say(icon || 'note', 1000); if (!reduced()) { Lv += 300 * S; w += rnd(-.6, .6); } },
      hear() { if (reduced()) return; w += rnd(-1, 1); a.say('sweat', 700); }
    };
  };

  /* peek: behind the top edge of a box; rises in steps; ducks when near */
  BEH.peek = (a, o) => {
    const s = a.s, S = s / 3, hw = a.W * s / 2, Hh = a.H * s;
    const tgt = o.target;
    let at = o.at != null ? o.at : .74;
    let depth = Hh, goal = Hh, st = 'hidden', T = rnd(.6, 1.6), blinkT = rnd(2.2, 5.2), blink = 0, eep = 0;
    const shyR = 95 * S + hw;
    return {
      tick(dt) {
        if (!tgt.isConnected) { a.hidden = true; return; }
        const r = rect(tgt);
        if (!r.w) { a.hidden = true; return; }
        a.hidden = false;
        a.fixed = pinned(tgt);
        a.x = r.l + clamp(at * r.w, hw + 4, r.w - hw - 4);
        if (reduced()) { depth = Hh - 7 * s; a.clipDepth = depth; a.y = r.t + depth; a.play('c'); return; }
        const vis = Hh - depth, cy = r.t - vis / 2;
        const d = Math.hypot(ptr.x - a.x, ptr.y - cy);
        if (st !== 'hidden' && st !== 'duck' && d < shyR) {
          if (st === 'out' && Math.random() < .35) a.say(pick(['!', 'sweat']), 600);
          st = 'duck'; T = rnd(1, 3);
        }
        T -= dt;
        if (st === 'hidden') { goal = Hh; if (T <= 0 && d > shyR * 1.4) { st = 'top'; T = rnd(.5, 1.1); } }
        else if (st === 'top') { goal = Hh - 3 * s; if (T <= 0) { st = 'eyes'; T = rnd(.5, 1); } }
        else if (st === 'eyes') { goal = Hh - 7 * s; if (T <= 0) { st = 'out'; T = rnd(4, 9); } }
        else if (st === 'out') { goal = 0; if (T <= 0) { st = 'duck'; T = rnd(1, 3); } }
        else if (st === 'duck') {
          goal = Hh;
          if (T <= 0) { at = clamp(at + (Math.random() < .5 ? -1 : 1) * rnd(.2, .5), .06, .94); st = 'hidden'; T = rnd(.6, 1.6); }
        }
        depth += (goal - depth) * ease(goal > depth ? 14 : 3.2, dt);
        const snapped = Math.round(depth / s) * s;
        a.clipDepth = snapped; a.y = r.t + snapped;
        if (blink > 0) blink -= dt; else { blinkT -= dt; if (blinkT <= 0) { blink = .14; blinkT = rnd(2.2, 5.2); } }
        if (eep > 0) eep -= dt;
        let look = 'c';
        if (ptrIn()) {
          const eyeY = r.t - (Hh - snapped) + 5 * s, dx = ptr.x - a.x, dy = ptr.y - eyeY;
          const h = dx < -40 ? 'l' : dx > 40 ? 'r' : '';
          look = dy < -40 ? 'u' + h : dy > 60 ? 'd' : (h || 'c');
        }
        a.play(eep > 0 ? 'eep' : blink > 0 ? 'blink' : look);
      },
      poke() { eep = .35; a.say(pick(['!', 'sweat']), 800); if (!reduced()) { st = 'duck'; T = rnd(2.5, 4); } },
      nudge(icon) { a.say(icon || '!', 900); if (!reduced()) { st = 'out'; T = rnd(3, 5); } },
      hear() { if (!reduced() && st !== 'hidden') { st = 'duck'; T = rnd(1, 2); } }
    };
  };

  /* perch: sit on buttons; leave on hover (before the click); land on another */
  BEH.perch = (a, o) => {
    const s = a.s, S = s / 3, H = a.H * s;
    const flyer = !!a.spr.clips.fly;
    let perches = o.targets.slice(), cur = null, last = null, off = rnd(.25, .75), st = 'init', T = 0, act = 0;
    let vx = 0, vy = 0, calm = 0, cx = 0, cy = 0, orb = 0, tgtP = null, hopv = null, queried = 0, startled = false;
    const requery = t => { if (o.selector && t - queried > 2000) { queried = t; try { perches = [...document.querySelectorAll(o.selector)]; } catch (e) { /* keep */ } } };
    const threatened = p => {
      if (!ptrIn() || !p.isConnected) return false;
      const r = rect(p), m = 26 * S;
      return ptr.x > r.l - m && ptr.x < r.r + m && ptr.y > r.t - m - H && ptr.y < r.b + m;
    };
    const nearBird = () => ptrIn() && Math.hypot(ptr.x - a.x, ptr.y - (a.y - H / 2)) < 50 * S;
    const taken = p => { for (const b of actors) if (b !== a && b.ctl.perchOf && b.ctl.perchOf() === p) return true; return false; };
    /* a perch inside a stuck nav only works when the bird fits inside that bar */
    const roomy = p => { const c = fixedCtx(p); if (!c || !pinned(p)) return true; return rect(p).ct - H * .9 >= rect(c.el).ct; };
    const choose = () => {
      const ok = perches.filter(p => p.isConnected && rect(p).w > 0 && roomy(p) && !threatened(p) && !taken(p));
      if (!ok.length) return null;
      const vis = ok.filter(p => inView(rect(p)));
      let pool = vis.length ? vis : ok;
      if (pool.length > 1 && last && Math.random() < .75) pool = pool.filter(p => p !== last);
      if (!vis.length) { pool.sort((p, q) => Math.abs(rect(p).t - a.y) - Math.abs(rect(q).t - a.y)); return pool[0]; }
      return pick(pool);
    };
    const sitAt = p => { const r = rect(p); a.fixed = pinned(p); a.x = r.l + off * r.w; a.y = r.t; };
    const takeoff = loud => {
      if (!cur && st !== 'land') return;
      if (!flyer && startled && !loud) return;
      last = cur || last; cur = null; a.fixed = false;
      if (loud || Math.random() < .4) a.say('!', 700);
      if (!flyer) {
        const next = choose();
        if (next && next !== last) { off = rnd(.25, .75); const r = rect(next); hopv = { x0: a.x, y0: a.y, p: next, t: 0, dur: clamp(Math.hypot(r.l + off * r.w - a.x, r.t - a.y) / 600, .35, .8) }; st = 'hop'; a.play('hop'); }
        else { startled = true; cur = last; hopv = { x0: a.x, y0: a.y, p: cur, t: 0, dur: .35 }; st = 'hop'; a.play('hop'); }
        return;
      }
      st = 'fly'; calm = 0; orb = rnd(0, 6.28);
      const away = ptr.x > a.x ? -1 : 1;
      vy = -320 * S; vx = away * 160 * S;
      cx = clamp(a.x + away * 120 * S, SX + 90 * S, SX + VW - 90 * S); cy = Math.max(a.y - rnd(110, 190) * S, SY + VH * .2 + H);
      a.play('fly');
    };
    return {
      perchOf: () => cur,
      awake: () => st === 'fly' || st === 'land' || st === 'hop',
      tick(dt, t) {
        requery(t);
        if (st === 'init') {
          const vis = perches.filter(p => p.isConnected && rect(p).w > 0 && roomy(p));
          const p0 = vis.find(p => inView(rect(p)) && !taken(p)) || vis.find(p => !taken(p)) || vis[0];
          if (!p0) { a.hidden = true; return; }
          cur = last = p0; st = 'sit'; T = rnd(1.5, 4); a.face = Math.random() < .5 ? 1 : -1;
        }
        a.hidden = false;
        const k = ease(14, dt); a.sx = lerp(a.sx, 1, k); a.sy = lerp(a.sy, 1, k);
        if (reduced()) {
          if (!cur) cur = last || perches[0];
          if (!cur || !cur.isConnected || !rect(cur).w) { a.hidden = true; return; }
          st = 'sit'; sitAt(cur); a.rot = 0; a.play('idle'); return;
        }
        if (st === 'sit') {
          if (!cur || !cur.isConnected || !rect(cur).w || !roomy(cur)) { takeoff(false); if (st !== 'fly') a.hidden = true; return; }
          sitAt(cur);
          if (threatened(cur) || nearBird()) {
            if (!flyer && startled) { a.play('scared'); act = .2; return; }
            takeoff(false); return;
          }
          startled = false;
          a.rot = lerp(a.rot, 0, k);
          if (act > 0) { act -= dt; if (act <= 0) a.play('idle'); }
          T -= dt;
          if (T <= 0) {
            T = rnd(1.5, 4); const r = Math.random();
            if (r < .35) { a.play('peck', { restart: true }); act = .7; }
            else if (r < .6) { a.play('look'); act = 1.2; }
            else if (r < .75) { a.face *= -1; }
            else if (r < .85) { a.play('preen', { restart: true }); act = 1; }
            else if (r < .9) { a.say('note', 1000); }
          }
          return;
        }
        if (st === 'hop') {
          hopv.t += dt; const p = Math.min(1, hopv.t / hopv.dur), r = rect(hopv.p);
          const tx = r.l + off * r.w, ty = r.t;
          a.face = tx >= hopv.x0 ? 1 : -1;
          a.x = lerp(hopv.x0, tx, p); a.y = lerp(hopv.y0, ty, p) - Math.sin(Math.PI * p) * 40 * S;
          if (p >= 1) { cur = hopv.p; hopv = null; st = 'sit'; T = rnd(1.5, 4); a.sx = 1.15; a.sy = .8; a.play('idle'); }
          return;
        }
        let tx, ty;
        if (st === 'fly') {
          orb += 2.4 * dt;
          tx = cx + Math.cos(orb) * 70 * S; ty = cy + Math.sin(2 * orb) * 22 * S;
          const dvx = (tx - a.x) * 3, dvy = (ty - a.y) * 3;
          vx = lerp(vx, dvx, ease(4.5, dt)); vy = lerp(vy, dvy, ease(4.5, dt));
          const anyThreat = (last && threatened(last)) || nearBird();
          calm = anyThreat ? 0 : calm + dt;
          if (nearBird()) { cx += (a.x - ptr.x) * dt * 2; cy += (a.y - ptr.y) * dt * 2; }
          cy = clamp(cy, SY + VH * .15 + H, SY + VH - 40); cx = clamp(cx, SX + 80 * S, SX + VW - 80 * S);
          if (calm > 1.1) { const p = choose(); if (p) { tgtP = p; off = rnd(.25, .75); st = 'land'; } else calm = .5; }
        } else if (st === 'land') {
          if (!tgtP.isConnected || threatened(tgtP)) { st = 'fly'; calm = 0; cx = a.x; cy = a.y - 60 * S; }
          else {
            const r = rect(tgtP); tx = r.l + off * r.w; ty = r.t;
            const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
            if (d < 4) {
              cur = last = tgtP; tgtP = null; st = 'sit'; T = rnd(1.5, 4); vx = vy = 0; a.rot = 0;
              a.sx = 1.15; a.sy = .8; a.play('idle'); sitAt(cur); return;
            }
            const sp = Math.min(560 * S, d * 5 + 40);
            vx = lerp(vx, dx / d * sp, ease(4.5, dt)); vy = lerp(vy, dy / d * sp, ease(4.5, dt));
            if (d < 30) { vx = dx / dt * .25; vy = dy / dt * .25; }
          }
        }
        a.x += vx * dt; a.y += vy * dt;
        a.y = Math.max(a.y, H + 4);
        if (Math.abs(vx) > 8) a.face = vx > 0 ? 1 : -1;
        a.rot = clamp(vy * .03, -12, 12) * a.face;
        a.play('fly', { fps: vy < 0 ? 16 : 11 });
      },
      poke() { if (st === 'sit') takeoff(true); else a.say('!', 600); },
      nudge(icon) { a.say(icon || 'note', 1000); if (st === 'sit' && !reduced()) { a.sx = .9; a.sy = 1.15; } },
      hear(type, from, d) { if (st === 'sit' && d < 130 * S && !reduced()) takeoff(false); }
    };
  };

  /* hoist: hold one end of the ribbon and ride its sway */
  BEH.hoist = (a, o) => {
    const s = a.s, S = s / 3, H = a.H * s;
    const tgt = o.target;
    const at = o.at != null ? o.at : (o.side === 'left' ? .08 : o.side === 'right' ? .92 : .5);
    const len = o.length != null ? o.length : -7;
    let lean = 0, cheer = 0;
    const clip = a.spr.clips.fly ? 'fly' : a.spr.clips.hover ? 'hover' : 'idle';
    a.play(clip);
    return {
      tick(dt, t) {
        if (!tgt.isConnected) { a.hidden = true; return; }
        const r = rect(tgt);
        if (!r.w) { a.hidden = true; return; }
        a.hidden = false;
        a.fixed = pinned(tgt);
        a.face = at > .5 ? -1 : 1;
        a.x = r.l + at * r.w;
        const base = r.t - len * S;
        if (reduced()) { a.y = base; a.rot = 0; a.play(clip); return; }
        const bobY = Math.sin(t / 380 + at * 5.3) * 2 * S;
        if (ptrIn() && Math.abs(ptr.x - a.x) < 60 * S && Math.abs(ptr.y - (a.y - H / 2)) < 60 * S) lean += ptr.vx * .002 * dt * 60;
        lean = clamp(lean * Math.exp(-4 * dt), -14 * S, 14 * S);
        a.rot = lean * .6 / S;
        let cy = 0;
        if (cheer > 0) { cheer -= dt; cy = -Math.abs(Math.sin(cheer * 12)) * 4 * S; }
        a.y = base + bobY + cy;
        a.play(cheer > 0 && a.spr.clips.happy ? 'happy' : clip);
      },
      poke() { cheer = .9; a.say(pick(['!', 'heart']), 900); },
      nudge(icon) { cheer = .9; a.say(icon || 'heart', 900); }
    };
  };

  /* toy: falls onto real headings, paragraphs and buttons; rolls; gets batted */
  BEH.toy = (a, o) => {
    const s = a.s, S = s / 4, hw = a.W * s / 2, H = a.H * s, G = 2400 * S;
    const box = o.target;
    let plats = [], platT = 0, started = false, ground = null, vx = 0, vy = 0, spin = 0, gx = 0, gy = 0, held = false, mark = null;
    a.cv.parentNode.parentNode.classList.add('grab');
    const refresh = t => {
      if (t - platT < 250 && plats.length) return;
      platT = t; plats = [];
      const els = box.querySelectorAll('h1,h2,h3,p,.btn,button,.window,.ribbon,kbd,.hint,.status,img');
      for (const el of els) {
        if (el.closest('inch-pal,inch-face,inch-crowd')) continue;
        const r = rect(el);
        if (r.w < 12 || r.h < 4) continue;
        plats.push({ el, x0: r.l, x1: r.r, y: r.t });
      }
      const m = box.querySelector('#mark');
      mark = m && window.inchMark && typeof window.inchMark.surface === 'function' ? m : null;
    };
    const markY = x => { if (!mark) return null; const r = rect(mark); if (x < r.l || x > r.r) return null; const y = window.inchMark.surface(x); return y == null || !isFinite(y) ? null : y; };
    return {
      awake: () => held || !ground,
      tick(dt, t) {
        if (!box.isConnected) { a.hidden = true; return; }
        const B = rect(box);
        if (!B.w) { a.hidden = true; return; }
        a.hidden = false;
        refresh(t);
        const lo = B.l + hw, hi = B.r - hw, floor = B.b;
        if (!started) {
          started = true;
          a.x = clamp(o.x != null ? o.x : rnd(B.l + B.w * .15, B.r - B.w * .15), lo, hi);
          a.y = Math.max(B.t + H, SY + 40);
          vx = rnd(-80, 80) * S; spin = rnd(-400, 400);
        }
        if (held) { a.x = gx; a.y = gy + H * .6; a.rot *= .9; return; }
        if (reduced() && !ground) {
          let best = floor;
          for (const p of plats) if (a.x >= p.x0 && a.x <= p.x1 && p.y >= a.y - 2 && p.y < best) best = p.y;
          const my = markY(a.x); if (my != null && my >= a.y - 2 && my < best) best = my;
          a.y = best; ground = { y: best }; a.rot = 0; return;
        }
        if (reduced()) return;
        if (!ground) {
          const py = a.y;
          vy += G * dt; a.x += vx * dt; a.y += vy * dt;
          a.rot += spin * dt;
          if (a.x < lo) { a.x = lo; vx = Math.abs(vx) * .5; }
          if (a.x > hi) { a.x = hi; vx = -Math.abs(vx) * .5; }
          if (vy > 0) {
            let hit = null;
            for (const p of plats) if (a.x >= p.x0 && a.x <= p.x1 && py <= p.y + 1 && a.y >= p.y && (!hit || p.y < hit.y)) hit = p;
            const my = markY(a.x);
            if (my != null && py <= my + 1 && a.y >= my && (!hit || my < hit.y)) hit = { mark: true, y: my, x0: B.l, x1: B.r };
            if (!hit && a.y >= floor) hit = { floor: true, y: floor, x0: B.l, x1: B.r };
            if (hit) {
              const v = vy; a.y = hit.y;
              if (v > 900) shout('thud', a.x, a.y, 140 * S, a);
              if (hit.mark) markImpact(a.x, a.y, clamp(v / 1500, .3, 1.2));
              if (v > 320) { vy = -v * .35; vx *= .8; spin *= .6; a.y -= .5; }
              else { vy = 0; ground = hit; }
            }
          }
        } else {
          let y = ground.y;
          if (ground.el) { const r = rect(ground.el); ground.x0 = r.l; ground.x1 = r.r; y = r.t; if (!r.w) { ground = null; return; } }
          if (ground.mark) { const my = markY(a.x); if (my == null) { ground = null; return; } y = my; }
          if (ground.floor) y = floor;
          a.y = y;
          const fr = 900 * S * dt;
          vx = Math.abs(vx) <= fr ? 0 : vx - Math.sign(vx) * fr;
          a.x += vx * dt;
          if (a.x < lo) { a.x = lo; vx = Math.abs(vx) * .5; }
          if (a.x > hi) { a.x = hi; vx = -Math.abs(vx) * .5; }
          if (a.x < ground.x0 - 2 || a.x > ground.x1 + 2) { ground = null; vy = 0; return; }
          if (Math.abs(vx) > 12) a.rot += vx * dt / (H / 2) * 57.3;
          else { const tgt = Math.round(a.rot / 180) * 180; a.rot = lerp(a.rot, tgt, ease(10, dt)); }
        }
        if (ptrIn() && Math.hypot(ptr.vx, ptr.vy) > 900 && Math.hypot(ptr.x - a.x, ptr.y - (a.y - H / 2)) < hw + 14) {
          vx = clamp(vx + ptr.vx * .4, -1400, 1400); vy = -rnd(300, 500) * Math.sqrt(S); spin = vx; ground = null;
        }
      },
      poke() { if (reduced()) return; vx = (Math.random() < .5 ? -1 : 1) * rnd(150, 260) * S; vy = -rnd(380, 520) * S; spin = vx * 2; ground = null; },
      nudge() { this.poke(); },
      hear() { if (ground && !reduced()) { vy = -rnd(150, 250) * S; vx += rnd(-80, 80) * S; ground = null; } },
      grab: {
        start() { held = true; ground = null; },
        move(x, y) { gx = x; gy = y; },
        end(vx2, vy2) { held = false; vx = vx2; vy = vy2; spin = clamp(vx2, -900, 900); ground = null; }
      }
    };
  };

  const DEFAULT_DO = { penta: 'crawl', bo: 'bounce', mebu: 'sit', jiri: 'hang', fusen: 'peek', tsuru: 'perch', eraser: 'toy' };

  /* =====================================================================
   * 7. <inch-pal>
   * ===================================================================== */
  const spawned = [];
  class InchPal extends HTMLElement {
    static get observedAttributes() { return ['kind', 'do', 'on', 'at', 'scale', 'edge', 'side', 'length', 'speed', 'hue']; }
    connectedCallback() { this.style.display = 'none'; this._schedule(); }
    disconnectedCallback() { this._unmount(); clearTimeout(this._retry); }
    attributeChangedCallback(n, ov, nv) {
      if (!this.isConnected || ov === nv || !this._actor) return;
      if (n === 'hue') { this._actor.cv.style.filter = nv ? `hue-rotate(${+nv}deg)` : ''; return; }
      this._remount();
    }
    _remount() { this._unmount(); this._schedule(); }
    _schedule() {
      clearTimeout(this._retry);
      const tok = this._tok = {};
      requestAnimationFrame(() => requestAnimationFrame(() => { if (this._tok === tok) this._mount(0); }));
    }
    _targets() {
      const on = this.getAttribute('on');
      if (this._target) return [this._target];
      if (on) { try { return [...document.querySelectorAll(on)]; } catch (e) { return []; } }
      return this.parentElement && this.parentElement !== document.body ? [this.parentElement] : [];
    }
    _mount(tries) {
      if (!this.isConnected || this._actor) return;
      const kindA = this.getAttribute('kind') || 'penta';
      const kind = KIND_ALIAS[kindA] || kindA;
      if (!SPR[kind]) return;
      const targets = this._targets();
      if (!targets.length) { if (tries < 80) this._retry = setTimeout(() => this._mount(tries + 1), 125); return; }
      const num = n => { const v = this.getAttribute(n); return v == null || v === '' || isNaN(+v) ? null : +v; };
      const doA = this.getAttribute('do') || SPR[kind].does || DEFAULT_DO[kind];
      const beh = BEH[doA] ? doA : DEFAULT_DO[kind];
      const base = num('scale') || SPR[kind].scale || 3;
      const a = new Actor(kind, scaleFor(base), { top: this.hasAttribute('data-top'), hue: num('hue') });
      a.host = this;
      a.veil = this.closest('.reveal');
      const opts = {
        target: targets[0], targets, selector: this.getAttribute('on'),
        at: num('at'), edge: this.getAttribute('edge'), side: this.getAttribute('side'),
        length: num('length'), speed: num('speed'), drop: this.hasAttribute('data-drop'), x: this._x
      };
      try { a.ctl = BEH[beh](a, opts); } catch (e) { a.destroy(); if (window.console) console.warn('[InchPix]', e); return; }
      bindPointer(a);
      this._actor = a;
      actors.add(a);
      wakeAll();
      this.dispatchEvent(new CustomEvent('inch:ready', { bubbles: true, detail: { kind } }));
    }
    _unmount() { if (this._actor) { this._actor.destroy(); this._actor = null; } this._tok = null; }
    poke(icon) { const a = this._actor; if (a && a.ctl) { (a.ctl.nudge || a.ctl.poke).call(a.ctl, icon); wakeAll(); } }
  }

  /* =====================================================================
   * 8. <inch-face> — inline subject faces: gaze, blink, breath, hop
   * ===================================================================== */
  /* Faces tick every frame only while the pointer is about (they follow it) or
     one is hopping; otherwise blinks and breaths need ~8 ticks a second. With
     motion reduced they only turn their eyes to the pointer, so input drives them. */
  const faceSet = new Set(), faceLive = new Set();
  let faceOn = false, globalLook = 'square', faceLast = 0, faceT = 0;
  const faceIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) faceLive.add(e.target); else faceLive.delete(e.target); });
    wakeFaces();
  }, { rootMargin: '120px' }) : null;
  function wakeFaces() {
    if (faceT) { clearTimeout(faceT); faceT = 0; }
    if (faceLive.size && !faceOn) { faceOn = true; sub(faceLoop); }
  }
  function faceLoop(dt, t) {
    if (!faceLive.size) { faceOn = false; return false; }
    const real = faceLast ? clamp((t - faceLast) / 1000, .001, .3) : dt;
    faceLast = t;
    let busy = false;
    for (const f of faceLive) { try { if (f._tick(real, t)) busy = true; } catch (e) { /* keep going */ } }
    const R = reduced(), lively = now() - ptr.t < 4000 || now() - ptr.tt < 2600;
    if (busy || (lively && !R)) return;
    faceOn = false;
    if (!R) faceT = setTimeout(() => { faceT = 0; wakeFaces(); }, 120);
    return false;
  }
  function drawFace(ctx, face, cell, look, eye) {
    const g = face.rows.map(r => r.split(''));
    const [[x1, y1], [x2, y2]] = face.eyes;
    for (const [ex, ey] of [[x1, y1], [x2, y2]]) {
      if (eye.mode === 'happy') { [[ex - 1, ey + 1], [ex, ey], [ex + 1, ey], [ex + 2, ey + 1]].forEach(([x, y]) => { if (g[y]) g[y][x] = 'k'; }); }
      else if (eye.mode === 'blink' || eye.mode === 'sleep') { const x = ex + (eye.mode === 'sleep' ? 0 : eye.dx), y = ey + 1 + (eye.mode === 'sleep' ? 0 : eye.dy); g[y][x] = 'k'; g[y][x + 1] = 'k'; }
      else { const x = ex + eye.dx, y = ey + eye.dy; g[y][x] = 'w'; g[y][x + 1] = 'k'; g[y + 1][x] = 'k'; g[y + 1][x + 1] = 'k'; }
    }
    const W = 16 * cell;
    ctx.clearRect(0, 0, W, W);
    const byColor = new Map();
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const c = g[y][x]; if (c === '.' || !face.pal[c]) continue;
      const col = face.pal[c]; let l = byColor.get(col); if (!l) byColor.set(col, l = []); l.push(x, y);
    }
    for (const [col, l] of byColor) {
      ctx.fillStyle = col;
      if (look === 'square') { for (let i = 0; i < l.length; i += 2) ctx.fillRect(l[i] * cell, l[i + 1] * cell, cell, cell); }
      else {
        const rad = cell * (look === 'round' ? .5 : .33);
        ctx.beginPath();
        for (let i = 0; i < l.length; i += 2) { const cx = (l[i] + .5) * cell, cy = (l[i + 1] + .5) * cell; ctx.moveTo(cx + rad, cy); ctx.arc(cx, cy, rad, 0, Math.PI * 2); }
        ctx.fill();
      }
    }
  }
  class InchFace extends HTMLElement {
    static get observedAttributes() { return ['name', 'size', 'scale', 'look']; }
    connectedCallback() {
      if (!this._cv) {
        this._cv = document.createElement('canvas');
        this._cv.setAttribute('aria-hidden', 'true');
        this.appendChild(this._cv);
        this._z = document.createElement('i'); this._z.className = 'ip-z'; this._z.setAttribute('aria-hidden', 'true');
        this.appendChild(this._z);
        this._cv.addEventListener('click', () => { if (!this.closest('button')) this.hop(); });
        if (!this.closest('button') && !this.hasAttribute('role')) { this.setAttribute('role', 'img'); }
      }
      this._setup();
      faceSet.add(this);
      if (faceIO) faceIO.observe(this); else faceLive.add(this);
      wakeFaces();
    }
    disconnectedCallback() { faceSet.delete(this); faceLive.delete(this); if (faceIO) faceIO.unobserve(this); }
    attributeChangedCallback() { if (this._cv) { this._setup(); wakeFaces(); } }
    _setup() {
      const name = this.getAttribute('name') || 'en';
      this._face = FACES[name] || FACES.en;
      this._look = this.getAttribute('look') || globalLook;
      const sz = parseFloat(this.getAttribute('size')), sc = parseFloat(this.getAttribute('scale'));
      let s;
      if (sc) s = phone() ? Math.round(Math.max(2, sc * .8)) : sc;
      else if (sz) s = Math.max(2, Math.floor(sz * (phone() ? .48 : 1) / 16));
      else s = 4;
      this._big = !!sz;
      this._s = s;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const css = 16 * s;
      this._cell = s * dpr;
      this._cv.width = this._cv.height = css * dpr;
      this._cv.style.width = this._cv.style.height = css + 'px';
      this._z.style.width = this._z.style.height = Math.max(8, s * 2) + 'px';
      this._key = '';
      if (!this._st) this._st = { blinkT: rnd(2.4, 6), blink: 0, hop: 0, happy: 0, gx: 0, gy: 0, wx: 0, wy: 0, wT: 0, tilt: 0, shy: 0 };
      if (this.getAttribute('role') === 'img' && !this.hasAttribute('aria-label')) this.setAttribute('aria-label', FACE_LABEL[name] || '科目の顔');
      this._paint({ dx: 0, dy: 0, mode: 'open' });
      this._tr = '';
    }
    _paint(eye) {
      const key = eye.dx + ',' + eye.dy + ',' + eye.mode + ',' + this._look;
      if (key === this._key) return;
      this._key = key;
      drawFace(this._cv.getContext('2d'), this._face, this._cell, this._look, eye);
    }
    hop() {
      if (!this._st) return;
      if (!reduced()) this._st.hop = .46;
      this._st.happy = .65;
      lastInput = now();
      this.dispatchEvent(new CustomEvent('inch:poke', { bubbles: true, detail: { face: this.getAttribute('name') } }));
      wakeFaces();
    }
    _tick(dt, t) {
      const st = this._st, R = reduced(), s = this._s;
      const b = this._cv.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height * .45;
      const idleMs = now() - ptr.t;
      /* the pointer, or for a moment the spot a finger tapped */
      const tapped = !ptrIn() && now() - ptr.tt < 2500;
      const px = tapped ? ptr.tx : ptr.cx, py = tapped ? ptr.ty : ptr.cy;
      if ((ptrIn() && idleMs < 4000) || tapped) {
        st.gx = clamp((px - cx) / (Math.max(b.width, 40) * 1.4), -1, 1);
        st.gy = clamp((py - cy) / (Math.max(b.height, 40) * 1.4), -1, 1);
      } else if (R) { st.gx = st.gy = 0; }
      else {
        st.wT -= dt;
        if (st.wT <= 0) { st.wT = rnd(1.2, 3); st.wx = rnd(-1, 1); st.wy = rnd(-.6, .6); }
        st.gx = lerp(st.gx, st.wx, ease(6, dt)); st.gy = lerp(st.gy, st.wy, ease(6, dt));
      }
      const sleep = !R && now() - lastInput > 25000;
      if (R) st.blink = 0;
      else if (st.blink > 0) st.blink -= dt; else { st.blinkT -= dt; if (st.blinkT <= 0) { st.blink = .13; st.blinkT = rnd(2.4, 6); } }
      if (st.happy > 0) st.happy -= dt;
      const dx = st.gx > .3 ? 1 : st.gx < -.3 ? -1 : 0, dy = st.gy > .45 ? 1 : st.gy < -.45 ? -1 : 0;
      this._paint(st.happy > 0 ? { dx: 0, dy: 0, mode: 'happy' } : sleep ? { dx: 0, dy: 0, mode: 'sleep' } : st.blink > 0 ? { dx, dy, mode: 'blink' } : { dx, dy, mode: 'open' });
      /* z when napping */
      const zOn = sleep && !R;
      if (zOn !== this._zOn) { this._zOn = zOn; this._z.style.display = zOn ? 'block' : 'none'; }
      if (zOn) { const step = Math.floor(t / 700) % 4; this._z.style.transform = `translate(${step * Math.max(1, s >> 1)}px,${-step * s}px)`; this._z.style.opacity = step === 3 ? .4 : 1; }
      let ty = 0, sx = 1, sy = 1, rot = 0, shx = 0;
      if (!R) {
        const per = sleep ? 1400 : 760;
        ty = (Math.floor(t / per) % 2) ? -s : 0;
        if (st.hop > 0) {
          st.hop -= dt; const p = clamp(1 - st.hop / .46, 0, 1);
          ty += -Math.sin(Math.PI * p) * 16 * s * .35;
          const q = Math.sin(2 * Math.PI * p) * .08; sy = 1 + q; sx = 1 - .6 * q;
        }
        if (this._big && ptrIn()) {
          st.tilt = lerp(st.tilt, clamp((ptr.cx - cx) / (VW * .4), -1, 1) * 8, .1);
          const d = Math.hypot(ptr.cx - cx, ptr.cy - cy), lim = b.width * 1.2;
          st.shy = lerp(st.shy, d < lim ? -Math.sign(ptr.cx - cx || 1) * (1 - d / lim) * .18 * b.width : 0, .18);
        } else { st.tilt = lerp(st.tilt, 0, .1); st.shy = lerp(st.shy, 0, .18); }
        rot = st.tilt; shx = st.shy;
      }
      const tr = `translate(${shx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;
      if (tr !== this._tr) { this._cv.style.transform = this._tr = tr; }
      /* true while something here needs every frame (a hop, or tilting after the pointer) */
      return !R && (st.hop > 0 || Math.abs(st.tilt) > .05 || Math.abs(st.shy) > .3);
    }
  }
  const FACE_LABEL = { en: '英語の顔', ma: '数学の顔', ja: '国語の顔', ph: '物理の顔', ch: '化学の顔', bi: '生物の顔', es: '地学の顔', wh: '世界史の顔', jh: '日本史の顔', ge: '地理の顔', ci: '公民の顔', it: '情報の顔' };

  /* =====================================================================
   * 9. <inch-crowd> — a stage of tiny square people
   * ===================================================================== */
  /* A crowd that has finished spelling its word (and has no pointer over it)
     only waves now and then: it ticks ~12 times a second instead of every frame. */
  const crowdLive = new Set();
  let crowdOn = false, crowdT = 0;
  const crowdIO = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) crowdLive.add(e.target); else crowdLive.delete(e.target); });
    wakeCrowds();
  }, { rootMargin: '100px' }) : null;
  function wakeCrowds() {
    if (crowdT) { clearTimeout(crowdT); crowdT = 0; }
    if (crowdLive.size && !crowdOn) { crowdOn = true; sub(crowdLoop); }
  }
  function crowdLoop(dt, t) {
    if (!crowdLive.size) { crowdOn = false; return false; }
    let fast = false, slow = false;
    for (const c of crowdLive) {
      let r = false;
      try { r = c._tick(dt, t); } catch (e) { /* keep going */ }
      if (r === 'slow') slow = true; else if (r !== false) fast = true;
    }
    if (fast) return;
    crowdOn = false;
    if (slow) crowdT = setTimeout(() => { crowdT = 0; wakeCrowds(); }, 83);
    return false;
  }
  /* [desktop, phone]: on a phone the word is set in two lines, so it needs a few more people */
  const COUNTS = { form: [240, 140], wander: [110, 60], swarm: [160, 70] };
  class InchCrowd extends HTMLElement {
    static get observedAttributes() { return ['mode', 'text', 'count', 'height']; }
    connectedCallback() {
      if (!this._cv) {
        const c = this._cv = document.createElement('canvas');
        c.style.cssText = 'display:block;width:100%;touch-action:pan-y;cursor:pointer;-webkit-tap-highlight-color:transparent';
        this.appendChild(c);
        this._ctx = c.getContext('2d');
        this._agents = []; this._fx = []; this._spots = []; this._mode = 'form'; this._t = 0;
        if (!this.hasAttribute('role')) this.setAttribute('role', 'img');
        if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', `小さなドットの人たちが「${this.getAttribute('text') || 'がんばろ'}」の字にならぶ見本`);
        this._bind();
        if ('ResizeObserver' in window) { this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(this); }
      }
      this._resize(true);
      if (crowdIO) crowdIO.observe(this); else crowdLive.add(this);
      const txt = this.getAttribute('text') || 'がんばろ';
      if (document.fonts && document.fonts.load) {
        document.fonts.load(`900 100px "M PLUS 1"`, txt).then(() => { this._sample(); this._assign(); this._dirty = true; wakeCrowds(); }).catch(() => { /* fallback font is fine */ });
      }
      wakeCrowds();
    }
    disconnectedCallback() { crowdLive.delete(this); if (crowdIO) crowdIO.unobserve(this); }
    attributeChangedCallback(n) {
      if (!this._cv) return;
      if (n === 'text') { this._sample(); this._assign(); }
      if (n === 'mode' || n === 'count') this._setMode(this.getAttribute('mode') || 'form');
      if (n === 'height') this._resize(true);
      this._dirty = true; wakeCrowds();
    }
    get _ks() { return phone() ? 2 : 3; }
    _count(mode) {
      const c = parseInt(this.getAttribute('count'), 10);
      const d = COUNTS[mode] || COUNTS.form;
      const n = (c > 0 && mode === (this._initMode || mode)) ? c : d[0];
      return phone() ? Math.min(n, d[1]) : n;
    }
    _resize(force) {
      const w = Math.max(200, this.clientWidth || this.getBoundingClientRect().width || 600);
      const hA = parseFloat(this.getAttribute('height')) || 380;
      const h = phone() ? Math.min(hA, 320) : hA;
      if (!force && w === this._w && h === this._h) return;
      const first = !this._w;
      this._w = w; this._h = h;
      const dpr = this._dpr = Math.min(2, window.devicePixelRatio || 1);
      this._cv.width = Math.round(w * dpr); this._cv.height = Math.round(h * dpr);
      this._cv.style.height = h + 'px';
      if (first) { this._initMode = this.getAttribute('mode') || 'form'; this._setMode(this._initMode, true); }
      else { this._sample(); this._assign(); for (const g of this._agents) { g.x = clamp(g.x, 8, w - 8); g.y = clamp(g.y, this._ks * 7, h - 6); } }
      this._dirty = true; wakeCrowds();
    }
    _setMode(mode, init) {
      if (!COUNTS[mode]) mode = 'form';
      this._mode = mode;
      const n = this._count(mode);
      const A = this._agents;
      while (A.length < n) A.push(this._agent(init));
      if (A.length > n) A.splice(n);
      this._sample(); this._assign();
      for (const g of A) { g.st = 'go'; g.t = 0; g.wp = null; }
      if (reduced() || init) for (const g of A) { if (g.sx != null && (reduced() || init)) { if (init && !reduced()) { /* walk in from where they stand */ } else { g.x = g.sx; g.y = g.sy; } } }
      this._dirty = true;
    }
    _agent(init) {
      const w = this._w, h = this._h;
      return { x: rnd(10, w - 10), y: rnd(h * .25, h - 8), z: init ? 0 : rnd(150, 260), vx: 0, vy: 0, vz: 0, c: (Math.random() * CROWD_COLORS.length) | 0, face: Math.random() < .5 ? 1 : -1, st: 'go', t: rnd(0, 9), ph: rnd(0, 6), dizzy: 0, wave: 0, sx: null, sy: null, wp: null };
    }
    _sample() {
      const text = this.getAttribute('text') || 'がんばろ';
      const w = this._w, h = this._h, N = Math.max(1, this._count('form'));
      const F = 120;
      const font = `900 ${F}px "M PLUS 1","Hiragino Sans","Noto Sans JP","Noto Sans CJK JP",sans-serif`;
      const c = document.createElement('canvas'), x = c.getContext('2d', { willReadFrequently: true });
      x.font = font;
      /* a narrow stage sets a word of 4+ characters in two lines, so it fills the height and stays legible */
      const chars = [...text], two = w < 520 && chars.length >= 4;
      const lines = two ? [chars.slice(0, Math.ceil(chars.length / 2)).join(''), chars.slice(Math.ceil(chars.length / 2)).join('')] : [text];
      const widths = lines.map(l => x.measureText(l).width);
      const tw = Math.max(1, Math.ceil(Math.max(...widths)));
      c.width = tw + 8; c.height = Math.ceil(F * (two ? 2.4 : 1.25));
      x.font = font; x.textBaseline = 'middle'; x.fillStyle = '#000';
      if (two) lines.forEach((l, i) => x.fillText(l, 4 + (tw - widths[i]) / 2, F * (i ? 1.75 : .65)));
      else x.fillText(text, 4, c.height / 2);
      const data = x.getImageData(0, 0, c.width, c.height).data;
      const lit = (px, py) => data[(py * c.width + px) * 4 + 3] > 110;
      let minY = c.height, maxY = 0;
      for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px += 2) if (lit(px, py)) { if (py < minY) minY = py; if (py > maxY) maxY = py; }
      if (maxY <= minY) { this._spots = []; return; }
      const th = maxY - minY + 1;
      const ks = this._ks;
      const m = two ? Math.min(w * .9 / c.width, (h - 30) * .9 / th) : Math.min(w * .88 / c.width, (h - 40) * .78 / th);
      const ox = (w - c.width * m) / 2, oy = (h - th * m) / 2 + ks * 6 * .5 - minY * m;
      let best = null;
      /* a fine grid over the strokes (about 1.6 candidates a person), then keep the N
         that are farthest apart: the people spread evenly over every stroke */
      for (let step = Math.max(2, Math.round(F / 6)); step >= 2; step--) {
        const pts = [];
        for (let py = minY + (step >> 1); py <= maxY; py += step) for (let px = step >> 1; px < c.width; px += step) if (lit(px, py)) pts.push([px, py]);
        best = pts;
        if (pts.length >= N * 1.6) break;
      }
      let spots = best.map(([px, py]) => ({ x: ox + px * m, y: oy + py * m + ks * 3 }));
      if (spots.length > N) {
        const M = spots.length, dmin = new Float64Array(M).fill(Infinity), keep = [];
        let at = 0;
        for (let i = 1; i < M; i++) if (spots[i].y < spots[at].y || (spots[i].y === spots[at].y && spots[i].x < spots[at].x)) at = i;
        for (let k = 0; k < N; k++) {
          const q = spots[at]; keep.push(q); dmin[at] = -1;
          let far = -1, fd = -1;
          for (let i = 0; i < M; i++) {
            if (dmin[i] < 0) continue;
            const dx = spots[i].x - q.x, dy = (spots[i].y - q.y) * 1.15, dd = dx * dx + dy * dy;
            if (dd < dmin[i]) dmin[i] = dd;
            if (dmin[i] > fd) { fd = dmin[i]; far = i; }
          }
          if (far < 0) break;
          at = far;
        }
        spots = keep;
      }
      this._spots = spots;
    }
    _assign() {
      const A = this._agents.slice().sort((p, q) => p.x - q.x);
      const sp = this._spots.slice().sort((p, q) => p.x - q.x || p.y - q.y);
      A.forEach((g, i) => {
        if (i < sp.length) { g.sx = sp[i].x; g.sy = sp[i].y; }
        else { g.sx = rnd(12, this._w - 12); g.sy = this._h - rnd(6, 26); }
      });
    }
    _bind() {
      const c = this._cv;
      let grab = null, lp = null, start = null;
      const pos = e => { const b = c.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
      const hit = p => { let best = null; const ks = this._ks; for (const g of this._agents) { if (Math.abs(p.x - g.x) < ks * 4 && p.y > g.y - g.z - ks * 7 && p.y < g.y - g.z + 2) { if (!best || g.y > best.y) best = g; } } return best; };
      c.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        const p = pos(e); start = { ...p, t: now(), id: e.pointerId, touch: e.pointerType === 'touch' };
        const g = hit(p);
        if (g) {
          const begin = () => { grab = { g, ly: g.y, lx: p.x, lyp: p.y, vx: 0, vy: 0, lt: now() }; g.st = 'held'; try { c.setPointerCapture(start.id); } catch (er) { /* */ } c.style.cursor = 'grabbing'; };
          if (start.touch) lp = setTimeout(begin, 320); else { e.preventDefault(); begin(); }
        }
        wakeCrowds();
      });
      c.addEventListener('pointermove', e => {
        const p = pos(e);
        if (lp && start && Math.hypot(p.x - start.x, p.y - start.y) > 8) { clearTimeout(lp); lp = null; }
        if (!grab) return;
        const t = now(), dtt = Math.max(1, t - grab.lt);
        grab.vx = lerp(grab.vx, (p.x - grab.lx) / dtt * 1000, .5); grab.vy = lerp(grab.vy, (p.y - grab.lyp) / dtt * 1000, .5);
        grab.lx = p.x; grab.lyp = p.y; grab.lt = t;
        const g = grab.g; g.x = clamp(p.x, 6, this._w - 6); g.z = Math.max(0, g.y - p.y - this._ks * 3);
        this._dirty = true; wakeCrowds();
      });
      const end = e => {
        clearTimeout(lp); lp = null;
        const p = pos(e);
        if (grab) {
          const g = grab.g; g.st = 'air'; g.vx = clamp(grab.vx * .6, -500, 500); g.vy = 0; g.vz = clamp(-grab.vy * .6, -200, 900);
          if (now() - grab.lt > 90) { g.vx = 0; g.vz = 0; }
          grab = null; c.style.cursor = 'pointer';
        } else if (e.type === 'pointerup' && start && Math.hypot(p.x - start.x, p.y - start.y) < 8 && !hit(p)) {
          this._floor(p);
        }
        start = null; this._dirty = true; wakeCrowds();
      };
      c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
    }
    _floor(p) {
      if (reduced()) return;
      if (this._mode === 'form') {
        for (const g of this._agents) { g.st = 'air'; g.vx = rnd(-300, 300); g.vy = rnd(-200, 200); g.vz = rnd(150, 320); g.t = 0; }
        this._regroup = 1.4;
      } else if (this._agents.length < 600) {
        const g = this._agent(false); g.x = p.x; g.y = clamp(p.y + 20, 20, this._h - 6); g.z = 220; g.st = 'air'; g.vz = 0;
        this._agents.push(g);
      }
    }
    _tick(dt0, t) {
      const R = reduced();
      if (R && !this._dirty) { this._lt = 0; return false; }
      const dt = this._lt ? clamp((t - this._lt) / 1000, .001, .1) : dt0;
      this._lt = t;
      this._t += dt;
      const A = this._agents, w = this._w, h = this._h, ks = this._ks;
      const b = this._cv.getBoundingClientRect();
      const px = ptrIn() ? ptr.cx - b.left : -1e5, py = ptrIn() ? ptr.cy - b.top : -1e5;
      const inside = px > -20 && px < w + 20 && py > -20 && py < h + 20;
      if (this._regroup > 0) { this._regroup -= dt; if (this._regroup <= 0) for (const g of A) if (g.st !== 'held' && g.st !== 'air') g.st = 'go'; }
      if (!R) {
        /* neighbours, cursor, goals */
        const grid = new Map(), cell = 16;
        for (const g of A) { const k = ((g.x / cell) | 0) + ',' + ((g.y / cell) | 0); let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(g); }
        for (const g of A) {
          if (g.st === 'held') continue;
          if (g.st === 'air' || g.z > 0) {
            g.vz -= 1400 * dt; g.z += g.vz * dt; g.x += g.vx * dt; g.y += g.vy * dt;
            if (g.x < 6 || g.x > w - 6) { g.vx *= -.6; g.x = clamp(g.x, 6, w - 6); }
            if (g.y < ks * 7 || g.y > h - 4) { g.vy *= -.6; g.y = clamp(g.y, ks * 7, h - 4); }
            if (g.z <= 0) {
              if (g.vz < -260) { g.vz = -g.vz * .35; g.z = .1; this._fx.push({ type: 'dust', x: g.x, y: g.y, t: 0 }); if (g.vz > 240) g.dizzy = 1.2; }
              else { g.z = 0; g.vz = 0; g.vx = 0; g.vy = 0; g.st = this._regroup > 0 ? 'scatter' : 'go'; }
            }
            continue;
          }
          if (g.dizzy > 0) { g.dizzy -= dt; continue; }
          let tx = g.x, ty = g.y, speed = 0;
          if (g.st === 'scatter') speed = 0;
          else if (this._mode === 'form') { tx = g.sx; ty = g.sy; const d = Math.hypot(tx - g.x, ty - g.y); speed = Math.min(80, d * 4); if (d < 1.5) { g.x = tx; g.y = ty; speed = 0; } }
          else if (this._mode === 'swarm' && inside) {
            const dx = px - g.x, dy = (py + ks * 3) - g.y, d = Math.hypot(dx, dy) || 1;
            if (d > 30) { tx = g.x + dx / d * 40; ty = g.y + dy / d * 40; speed = 70; }
          } else {
            g.t -= dt;
            if (g.wave > 0) { g.wave -= dt; }
            else if (!g.wp || g.t <= 0 || Math.hypot(g.wp.x - g.x, g.wp.y - g.y) < 3) {
              if (Math.random() < .35) { g.wave = rnd(.8, 2.5) * (Math.random() < .5 ? 1 : .99); g.wp = null; g.t = g.wave; g.waving = g.wave % 1 > .5 || Math.random() < .5; }
              else { g.wp = { x: clamp(g.x + rnd(-120, 120), 10, w - 10), y: clamp(g.y + rnd(-70, 70), ks * 8, h - 6) }; g.t = rnd(2, 6); g.waving = false; }
            }
            if (g.wp && g.wave <= 0) { tx = g.wp.x; ty = g.wp.y; speed = this._mode === 'swarm' ? 30 : 34; }
          }
          let vx = 0, vy = 0;
          if (speed > 0) { const dx = tx - g.x, dy = ty - g.y, d = Math.hypot(dx, dy) || 1; vx = dx / d * speed; vy = dy / d * speed; }
          if (inside) {
            const dx = g.x - px, dy = g.y - (py + ks * 3), d = Math.hypot(dx, dy);
            if (d < 56 && d > .1) { const f = 900 / Math.max(d / 14, 1); vx += dx / d * f * .25; vy += dy / d * f * .25; }
          }
          const gx = (g.x / cell) | 0, gy = (g.y / cell) | 0;
          for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            const l = grid.get((gx + i) + ',' + (gy + j)); if (!l) continue;
            for (const o2 of l) {
              if (o2 === g) continue;
              const dx = g.x - o2.x, dy = (g.y - o2.y) * 1.6, d = Math.hypot(dx, dy);
              if (d < ks * 4.2 && d > .01 && !(this._mode === 'form' && speed === 0)) { vx += dx / d * 40; vy += dy / d * 25; }
              if (this._mode === 'wander' && d < 14 && g.wave <= 0 && o2.wave <= 0 && Math.random() < .02 * dt * 60 * .1) { g.wave = o2.wave = .5; g.waving = o2.waving = true; this._fx.push({ type: 'five', x: (g.x + o2.x) / 2, y: (g.y + o2.y) / 2 - ks * 6, t: 0 }); }
            }
          }
          g.x = clamp(g.x + vx * dt, 6, w - 6); g.y = clamp(g.y + vy * dt, ks * 7, h - 4);
          g.moving = Math.abs(vx) + Math.abs(vy) > 6;
          if (Math.abs(vx) > 4) g.face = vx > 0 ? 1 : -1;
        }
      } else if (this._dirty) {
        for (const g of A) { if (this._mode === 'form' && g.sx != null) { g.x = g.sx; g.y = g.sy; } g.z = 0; g.moving = false; }
      }
      this._draw(t, R);
      this._dirty = false;
      if (R) return true;
      /* settled: every one of them on its spot, nothing in the air, no pointer over the stage */
      if (this._mode === 'form' && !inside && !this._fx.length && !(this._regroup > 0) &&
          A.every(g => g.st !== 'held' && g.st !== 'air' && !(g.z > 0) && !(g.dizzy > 0) && g.sx != null && g.x === g.sx && g.y === g.sy)) return 'slow';
      return true;
    }
    _draw(t, R) {
      const x = this._ctx, dpr = this._dpr, ks = this._ks, w = this._w, h = this._h;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.imageSmoothingEnabled = false;
      x.clearRect(0, 0, w, h);
      const A = this._agents.slice().sort((p, q) => p.y - q.y);
      x.fillStyle = 'rgba(0,0,0,.32)';
      for (const g of A) { const sw = Math.max(2, ks * 5 * (1 - Math.min(.7, g.z / 300))); x.fillRect(Math.round(g.x - sw / 2), Math.round(g.y - 1), Math.round(sw), ks); }
      const tt = this._t;
      for (const g of A) {
        let legs = 0, arm = 0, bob = 0, eyes = '';
        if (!R) {
          if (g.st === 'held' || g.z > 0) { arm = 1; legs = 1; }
          else if (g.dizzy > 0) eyes = 'dizzy';
          else if (g.moving) { const f = Math.floor(tt * 9 + g.ph) % 2; legs = f ? 1 : 2; bob = f ? -1 : 0; }
          else if (this._mode === 'form' && ((tt - g.x / 400) % 9 + 9) % 9 < .4) { arm = Math.floor(tt * 6) % 2 ? 1 : 2; eyes = 'happy'; }
          else if (g.wave > 0 && g.waving) { arm = Math.floor(tt * 6 + g.ph) % 2 ? 1 : 2; eyes = 'happy'; }
        }
        const fr = kidFrame(g.c, legs, arm, eyes);
        const X = Math.round(g.x - 3.5 * ks), Y = Math.round(g.y - 6 * ks - g.z + bob * ks);
        if (g.face < 0) { x.save(); x.translate(X + 7 * ks, Y); x.scale(-1, 1); x.drawImage(fr, 0, 0, 7 * ks, 6 * ks); x.restore(); }
        else x.drawImage(fr, X, Y, 7 * ks, 6 * ks);
      }
      /* bursts and dust */
      for (let i = this._fx.length - 1; i >= 0; i--) {
        const f = this._fx[i]; f.t += 1 / 60;
        const p = f.t / .5; if (p >= 1 || R) { this._fx.splice(i, 1); continue; }
        const r = lerp(4, 18, p);
        x.fillStyle = f.type === 'five' ? '#ffd23f' : 'rgba(220,214,232,' + (1 - p) + ')';
        for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; x.fillRect(Math.round(f.x + Math.cos(an) * r) - ks / 2, Math.round(f.y + Math.sin(an) * r * (f.type === 'dust' ? .4 : 1)) - ks / 2, ks, ks); }
      }
    }
  }

  /* =====================================================================
   * 10. Courier: the crane brings notification cards (deliver)
   * ===================================================================== */
  const courier = { a: null, cards: [], queue: [], st: 'idle' };
  function toastBox() {
    let b = document.getElementById('toasts');
    if (!b) { b = document.createElement('div'); b.id = 'toasts'; b.className = 'ip-made'; b.setAttribute('aria-live', 'polite'); document.body.appendChild(b); }
    return b;
  }
  function makeCard(text, ms) {
    const card = document.createElement('div');
    card.className = 'ip-toast'; card.setAttribute('role', 'status');
    const ic = document.createElement('canvas'); ic.setAttribute('aria-hidden', 'true');
    const src = iconCanvas('mail'); ic.width = src.width; ic.height = src.height; ic.getContext('2d').drawImage(src, 0, 0);
    const sp = document.createElement('span'); sp.textContent = text;
    card.append(ic, sp);
    let left = ms, last = now(), paused = false;
    card.addEventListener('pointerenter', () => { paused = true; });
    card.addEventListener('pointerleave', () => { paused = false; last = now(); });
    card._tickClose = () => {
      const t = now(); if (!paused) left -= t - last; last = t;
      if (left <= 0 && !card._closing) closeCard(card);
    };
    return card;
  }
  function closeCard(card) {
    card._closing = true;
    const done = () => { card.remove(); courier.cards = courier.cards.filter(c => c !== card); };
    if (reduced()) { done(); return; }
    card.classList.add('out');
    card.addEventListener('animationend', done, { once: true });
    setTimeout(done, 400);
  }
  function deliver(text, ms) {
    ms = ms > 0 ? ms : 4200;
    const box = toastBox();
    const card = makeCard(String(text == null ? '' : text), ms);
    courier.cards.push(card);
    if (reduced() || !document.body) { box.appendChild(card); ensureCourierLoop(); return card; }
    courier.queue.push(card);
    ensureCourier();
    return card;
  }
  let cardLoopOn = false;
  function ensureCourierLoop() { if (!cardLoopOn) { cardLoopOn = true; sub(cardLoop); } }
  function cardLoop() {
    for (const c of courier.cards) if (c.isConnected && c._tickClose) c._tickClose();
    if (!courier.cards.length && !courier.queue.length && courier.st === 'idle') { cardLoopOn = false; return false; }
  }
  function ensureCourier() {
    ensureCourierLoop();
    if (courier.a) { courier.a.ctl.wake(); return; }
    const a = new Actor('tsuru', phone() ? 2 : 3, { top: true });
    a.fixed = true; a.hidden = true;
    const s = a.s, S = s / 3, H = a.H * s;
    let st = 'next', p = 0, from = null, to = null, carrying = null, T = 0, dur = .6;
    const box = toastBox();
    const anchor = () => {
      const cards = courier.cards.filter(c => c.isConnected && !c._closing);
      if (cards.length) { const r = cards[0].getBoundingClientRect(); return { x: r.left + Math.min(48, r.width * .22), y: r.top, ok: true }; }
      const r = box.getBoundingClientRect();
      return { x: (r.width ? r.right : VW - 16) - 40, y: (r.height ? r.top : 84) + 6, ok: false };
    };
    a.ctl = {
      awake: () => st !== 'perch' && st !== 'gone',
      wake() { if (st === 'perch' || st === 'gone') { st = 'next'; } },
      tick(dt, t) {
        const R = reduced();
        if (st === 'next') {
          if (courier.queue.length) {
            carrying = courier.queue.shift();
            const c = a.hidden ? { x: VW + 40, y: VH * .75 } : { x: a.x - SX, y: a.y - SY };
            if (a.hidden && courier.cards.filter(x => x.isConnected).length) { c.x = VW + 40; c.y = VH * .6; }
            from = c; const an = anchor();
            const r = box.getBoundingClientRect();
            const last = [...box.children].filter(x => x.classList.contains('ip-toast')).pop();
            to = last ? { x: an.x, y: last.getBoundingClientRect().bottom + 30 } : { x: (r.width ? r.right : VW - 16) - 40, y: (r.height ? r.top : 84) + 30 };
            a.hidden = false; a.prop('mail', true); st = 'in'; p = 0; dur = R ? .01 : .6; a.play('fly'); a.face = -1;
          } else if (courier.cards.some(c => c.isConnected && !c._closing)) { st = 'perch'; T = rnd(2.5, 6); }
          else if (!a.hidden) { st = 'out'; p = 0; from = { x: a.x - SX, y: a.y - SY }; }
          else { st = 'gone'; }
        }
        if (st === 'in') {
          p = Math.min(1, p + dt / dur);
          const e = 1 - Math.pow(1 - p, 3);
          const cx = lerp(from.x, to.x, e), cy = lerp(from.y, to.y, e) - Math.sin(Math.PI * e) * 40 * S;
          a.x = cx + SX; a.y = cy + SY; a.rot = -6;
          if (p >= 1) {
            a.prop('mail', false);
            box.appendChild(carrying); carrying = null; a.sx = 1.15; a.sy = .8; a.rot = 0;
            st = courier.queue.length ? 'next' : 'perch'; T = rnd(2.5, 6);
            if (st === 'next') { a.hidden = false; }
          }
        } else if (st === 'perch') {
          const an = anchor();
          if (!an.ok) { st = courier.queue.length ? 'next' : 'out'; p = 0; from = { x: a.x - SX, y: a.y - SY }; return; }
          a.x = an.x + SX; a.y = an.y + SY; a.face = -1;
          a.sx = lerp(a.sx, 1, ease(14, dt)); a.sy = lerp(a.sy, 1, ease(14, dt)); a.rot = 0;
          T -= dt;
          if (a.clip === 'peck' && T < 0) a.play('idle');
          if (T <= 0 && !R) { a.play('peck', { restart: true }); T = rnd(2.5, 6); setTimeout(() => { if (a.clip === 'peck') a.play('idle'); }, 600); }
          else if (a.clip !== 'peck') a.play('idle');
          if (courier.queue.length) st = 'next';
        } else if (st === 'out') {
          p = Math.min(1, p + dt / (R ? .01 : .7));
          const e = p * p;
          a.face = 1; a.play('fly');
          a.x = lerp(from.x, VW + 60, e) + SX; a.y = lerp(from.y, -60, e) + SY;
          if (p >= 1) { a.hidden = true; st = 'gone'; }
        } else if (st === 'gone') {
          if (courier.queue.length) st = 'next';
          else { a.destroy(); courier.a = null; courier.st = 'idle'; }
        }
        courier.st = st === 'gone' ? 'idle' : st;
      }
    };
    courier.a = a; courier.st = 'next';
    actors.add(a);
    wakeAll();
  }

  /* =====================================================================
   * 11. Document styles (light DOM), theme watch, segmented controls
   * ===================================================================== */
  const DOC_CSS = `
inch-pal{display:none!important}
inch-face{display:inline-block;position:relative;line-height:0;vertical-align:bottom;-webkit-tap-highlight-color:transparent}
inch-face canvas{display:block;transform-origin:50% 100%;image-rendering:pixelated;cursor:pointer}
button inch-face canvas{cursor:inherit}
html[data-theme=dark] inch-face canvas,.bigstage inch-face canvas{filter:drop-shadow(0 0 1px rgba(255,255,255,.5))}
inch-face .ip-z{display:none;position:absolute;right:-4%;top:-6%;width:8px;height:8px;pointer-events:none;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'%3E%3Cpath fill='%23cfc8db' d='M0 0h4v1H2v1h1v1H0V2h1V1h2V0z'/%3E%3C/svg%3E")}
html:not([data-theme=dark]) inch-face .ip-z{filter:brightness(.45)}
.bigstage inch-face .ip-z{filter:none}
inch-crowd{display:block;position:relative}
.ip-toast{position:relative;display:flex;align-items:center;gap:10px;box-sizing:border-box;min-width:220px;max-width:min(340px,calc(100vw - 32px));margin:0 0 10px;padding:12px 16px 12px 16px;background:var(--card,#fff);color:var(--ink,#17121f);border:2px solid var(--ink,#17121f);border-radius:12px;box-shadow:0 4px 0 0 var(--ink,#17121f);font:600 14.5px/1.4 var(--f-sans,system-ui,sans-serif);pointer-events:auto;transform-origin:100% 0;animation:ip-in .22s steps(4) both;overflow:hidden}
.ip-toast::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:#2fa36b}
.ip-toast canvas{flex:none;width:27px;height:18px;image-rendering:pixelated;image-rendering:crisp-edges}
.ip-toast.out{animation:ip-out .16s steps(3) forwards}
#toasts.ip-made{position:fixed;top:84px;right:16px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none}
@keyframes ip-in{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes ip-out{to{transform:scale(.5);opacity:0}}
@media (prefers-reduced-motion:reduce){.ip-toast,.ip-toast.out{animation:none!important}}
html.calm .ip-toast,html.calm .ip-toast.out{animation:none!important}`;
  function injectDocCSS() {
    if (document.querySelector('style[data-inchpix]')) return;
    const st = document.createElement('style'); st.setAttribute('data-inchpix', ''); st.textContent = DOC_CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  function setLook(look) {
    if (!/^(square|round|dot)$/.test(look)) look = 'square';
    globalLook = look;
    document.querySelectorAll('inch-face').forEach(f => f.setAttribute('look', look));
    document.querySelectorAll('.seg[data-face-look] button[data-look]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.look === look)));
  }
  function setCrowd(mode) {
    if (!COUNTS[mode]) mode = 'form';
    document.querySelectorAll('inch-crowd').forEach(c => { c.removeAttribute('count'); c.setAttribute('mode', mode); });
    document.querySelectorAll('.seg[data-crowd] button[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  }

  /* =====================================================================
   * 12. API
   * ===================================================================== */
  function spawn(kind, opts = {}) {
    kind = KIND_ALIAS[kind] || kind;
    if (!SPR[kind] || !document.body) return null;
    const el = document.createElement('inch-pal');
    el.setAttribute('kind', kind);
    const mark = document.getElementById('mark');
    const visible = sel => [...document.querySelectorAll(sel)].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.bottom > 0 && b.top < innerHeight; });
    /* somewhere you can see: the big letters if they are on screen, else a heading below the nav, else the spawn buttons */
    const navB = (() => { const n = document.getElementById('nav'); return n ? n.getBoundingClientRect().bottom : 0; })();
    const markOn = !!mark && visible('#mark').length > 0;
    const goodHead = e => { const t = e.getBoundingClientRect().top; return t > navB + 24 && t < innerHeight * .8; };
    const seenHead = () => visible('h1, h2').find(goodHead);
    const spawnRow = () => { const r = document.querySelector('.spawns'); if (r) el.setAttribute('edge', 'box'); return r; };
    if (opts.on === '#mark' && !markOn) opts = Object.assign({}, opts, { on: null });   /* a hint we cannot see */
    if (opts.on) el.setAttribute('on', opts.on);
    if (kind === 'eraser') {
      el.setAttribute('do', 'toy');
      if (!opts.on) el._target = document.querySelector(opts.box || '#top') || document.querySelector('main') || document.body;
      if (opts.x != null) el._x = opts.x;
    } else if (kind === 'penta') {
      el.setAttribute('do', 'crawl'); el.setAttribute('data-drop', '');
      if (!opts.on) {
        const heads = visible('h1, h2').filter(goodHead);
        el._target = (markOn && (Math.random() < .6 || !heads.length)) ? mark : heads.length ? pick(heads) : (spawnRow() || document.querySelector('h1'));
      }
      el.setAttribute('hue', String(opts.hue != null ? opts.hue : ((Math.random() * 12) | 0) * 30));
    } else if (kind === 'bo') {
      el.setAttribute('do', 'bounce'); el.setAttribute('data-drop', '');
      if (!opts.on) el._target = markOn ? mark : (seenHead() || spawnRow() || document.querySelector('h1'));
      if (opts.hue != null) el.setAttribute('hue', String(opts.hue));
    } else if (opts.do) el.setAttribute('do', opts.do);
    if (opts.scale) el.setAttribute('scale', String(opts.scale));
    el.setAttribute('at', String(opts.at != null ? opts.at : rnd(.12, .88).toFixed(2)));
    if (!el._target && !opts.on) el._target = document.querySelector('h1') || document.body;
    document.body.appendChild(el);
    spawned.push(el);
    while (spawned.length > 24) spawned.shift().remove();
    return el;
  }
  function clear() { spawned.splice(0).forEach(e => e.remove()); }
  function impact(x, y, power = 1) {
    const p = clamp(+power || 1, .1, 3);
    shout('thud', x, y, 120 + 100 * p, null);
    const m = document.getElementById('mark');
    if (m) { const b = m.getBoundingClientRect(); const X = x - scrollX, Y = y - scrollY; if (X >= b.left && X <= b.right && Y >= b.top - 60 && Y <= b.bottom) markImpact(x, y, p); }
    wakeAll();
  }
  function poke(target, icon) {
    let els = [];
    if (typeof target === 'string') {
      try { els = [...document.querySelectorAll(target)]; } catch (e) { els = []; }
      const k = KIND_ALIAS[target] || target;
      if (!els.length && SPR[k]) { for (const a of actors) if (a.kind === k && a.ctl) (a.ctl.nudge || a.ctl.poke).call(a.ctl, icon); wakeAll(); return; }
    } else if (target instanceof Element) els = [target];
    else if (target && target.length) els = [...target];
    for (const el of els) {
      const pals = el.matches('inch-pal') ? [el] : [...el.querySelectorAll('inch-pal')];
      pals.forEach(p => p.poke && p.poke(icon));
      if (el.matches('inch-face')) el.hop(); else el.querySelectorAll('inch-face').forEach(f => f.hop());
      for (const a of actors) if (a.ctl && a.host && a.host !== el && !pals.includes(a.host) && a.ctl.perchOf && a.ctl.perchOf() && el.contains(a.ctl.perchOf())) (a.ctl.nudge || a.ctl.poke).call(a.ctl, icon);
    }
    wakeAll();
  }
  function drawFrame(ctx, kind, frame, x, y, scale, opts) {
    kind = KIND_ALIAS[kind] || kind;
    scale = scale || 1;
    let c;
    if (kind === 'kid') {
      const f = String(frame == null ? 'idle' : frame);
      const n = parseInt(f.split(':')[1] || f, 10) || 0;
      const ci = opts && opts.color != null ? opts.color : 0;
      c = /walk/.test(f) ? kidFrame(ci, n % 2 ? 2 : 1, 0, '') : /wave/.test(f) ? kidFrame(ci, 0, n % 2 ? 2 : 1, 'happy') : kidFrame(ci, 0, 0, '');
    } else {
      const spr = SPR[kind]; if (!spr) return null;
      let name = 'idle', i = 0;
      if (typeof frame === 'number') { name = spr.clips.walk ? 'walk' : 'idle'; i = frame; }
      else if (frame) { const [n, k] = String(frame).split(':'); name = n; i = parseInt(k, 10) || 0; }
      name = clipOf(spr, name);
      const fr = baked(spr, name); c = fr[((i % fr.length) + fr.length) % fr.length];
    }
    const prev = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x), Math.round(y), c.width * scale, c.height * scale);
    ctx.imageSmoothingEnabled = prev;
    return { w: c.width * scale, h: c.height * scale };
  }
  function size(kind) { kind = KIND_ALIAS[kind] || kind; if (kind === 'kid') return { w: 7, h: 6 }; const s = SPR[kind]; return s ? { w: s.w, h: s.h } : null; }

  window.InchPix = {
    spawn, clear, deliver, impact, drawFrame, poke, setLook, setCrowd, size, version: VERSION,
    get count() { return spawned.length; },
    _art: { SPR, FACES, ICONS, CROWD_COLORS, baked, iconCanvas, kidFrame, drawFace, actors }
  };

  /* =====================================================================
   * 13. Boot
   * ===================================================================== */
  function boot() {
    injectDocCSS();
    const syncTheme = () => { const d = isDark(); for (const k in layers) layers[k].host.classList.toggle('dark', d); };
    new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const motionChanged = () => { stillFrames = 0; document.querySelectorAll('inch-crowd').forEach(c => { c._dirty = true; }); wakeAll(); };
    if (RMQ.addEventListener) RMQ.addEventListener('change', motionChanged);
    /* the page's own pause (html.calm) works like the OS setting */
    let calmWas = reduced();
    new MutationObserver(() => { const r = reduced(); if (r !== calmWas) { calmWas = r; motionChanged(); } })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('click', e => {
      const t = e.target;
      if (!t || !t.closest) return;
      const lb = t.closest('.seg[data-face-look] button[data-look]');
      if (lb) setLook(lb.dataset.look);
      const cb = t.closest('.seg[data-crowd] button[data-mode]');
      if (cb) setCrowd(cb.dataset.mode);
      const cell = t.closest('button.shelf-cell');
      if (cell) cell.querySelectorAll('inch-face').forEach(f => f.hop());
    });
    const pressed = document.querySelector('.seg[data-face-look] button[data-look][aria-pressed="true"]');
    if (pressed) globalLook = pressed.dataset.look;
    customElements.get('inch-pal') || customElements.define('inch-pal', InchPal);
    customElements.get('inch-face') || customElements.define('inch-face', InchFace);
    customElements.get('inch-crowd') || customElements.define('inch-crowd', InchCrowd);
  }
  if (document.body) boot(); else document.addEventListener('DOMContentLoaded', boot, { once: true });
})();
