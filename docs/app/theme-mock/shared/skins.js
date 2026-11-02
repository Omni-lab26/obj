/*!
 * Inchly テーマの見本 — 3つのテーマのホームとタイマーを描く（shared/app.js の App を使う）
 *
 *   Skins.THEMES / Skins.ORDER          テーマの名前・ひとこと・変わるもの
 *   Skins.mount(box, th, view, {scale, height, live})   box の中に 390 幅の画面を zoom で入れる
 *   Skins.play(skEl)                    その画面で「記録した」の演出を1回（Promise）
 *   Skins.motif(th, px)                 テーマの絵（棚のカード・チップ用）
 *   Skins.picks / Skins.setPick(k, v) / Skins.picksUI(opts)   クラシックの4つの選択
 *   Skins.current / Skins.setCurrent(th)   いまのテーマ（見本の中だけ。保存はしない）
 */
(() => {
  'use strict';
  const A = window.App;
  const doc = document;
  const reduced = () => A.reduced();

  /* ---------- テーマ ---------- */
  const THEMES = {
    standard: {
      name: 'スタンダード', role: 'メイン',
      line: '紙とインクに、ライムの差し色。ドット絵の住人がいる',
      ground: '#F3EEE3',
      changes: [
        ['色', '紙の地に、黒いインクの輪郭。始める所だけライム'],
        ['字', '大きな数字は太い英字、見出しはドットの字'],
        ['タイマー', '科目の色の紙に、ライムの影のカード'],
        ['演出', '紙のカードに住人。顔が1回だけ変わる']
      ]
    },
    cyber: {
      name: 'サイバー', role: '',
      line: '夜の街の勉強端末。黒い画面に、黄色とシアンの光',
      ground: '#03060A',
      changes: [
        ['色', '黒い画面に、黄・シアン・赤・橙の光'],
        ['字', '数字は角ばった英字、ラベルは端末の字'],
        ['タイマー', '雨の路地に、科目のネオン看板が点く'],
        ['演出', '黄色い画面に「済」のはんこ']
      ]
    },
    classic: {
      name: 'クラシック', role: 'サブ',
      line: '前の見た目。白いカードと、すりガラスのバー',
      ground: '#ECEDF0',
      changes: [
        ['色', '地の色とメインの色を、自分で選べる'],
        ['字', 'いつもの iPhone の字'],
        ['タイマー', '暗い地（色を自分で選べる）'],
        ['演出', '白いフチの「えらい！」のシール']
      ]
    }
  };
  const ORDER = ['standard', 'cyber', 'classic'];

  /* いまのテーマ（見本の中だけ） */
  let current = 'standard';
  const setCurrent = th => { current = th; doc.dispatchEvent(new CustomEvent('skins:current', { detail: th })); };

  /* ---------- クラシックの4つの選択（design.ts の BGS / INKS / CORNERS / TIMERS） ---------- */
  const PICKS = {
    bg: { label: '地の色', cols: 5, items: { cool: ['クール', '#ECEDF0'], warm: ['ウォーム', '#F6F3EE'], white: ['ホワイト', '#FFFFFF'], lilac: ['ラベンダー', '#F5F3FB'], sky: ['スカイ', '#F0F5FB'] } },
    ink: { label: 'メインの色', sub: '文字とボタンの色', cols: 5, items: { black: ['ブラック', '#121417'], navy: ['ネイビー', '#16244A'], indigo: ['インディゴ', '#2A2870'], plum: ['プラム', '#3B1D4A'], cocoa: ['ココア', '#3A2A1E'] } },
    corners: { label: 'カードの角', cols: 3, items: { s: ['小さめ', 10, 8], m: ['ふつう', 16, 12], l: ['大きめ', 22, 16] } },
    timer: { label: 'タイマーの色', cols: 5, items: { night: ['ナイト', '#0B0F17'], black: ['ブラック', '#000000'], indigo: ['インディゴ', '#15133A'], plum: ['プラム', '#26102C'], cocoa: ['ココア', '#1F150D'] } }
  };
  const PICK_DEFAULT = { bg: 'cool', ink: 'black', corners: 'm', timer: 'night' };
  const picks = Object.assign({}, PICK_DEFAULT);
  function applyPicks() {
    const r = doc.documentElement.style;
    r.setProperty('--pk-canvas', PICKS.bg.items[picks.bg][1]);
    r.setProperty('--pk-ink', PICKS.ink.items[picks.ink][1]);
    r.setProperty('--pk-r', PICKS.corners.items[picks.corners][1] + 'px');
    r.setProperty('--pk-ri', PICKS.corners.items[picks.corners][2] + 'px');
    r.setProperty('--pk-timer', PICKS.timer.items[picks.timer][1]);
  }
  function setPick(k, v) {
    if (!PICKS[k] || !(v in PICKS[k].items)) return;
    picks[k] = v; applyPicks();
    doc.querySelectorAll(`.pk-o[data-k="${k}"]`).forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === v)));
    doc.dispatchEvent(new CustomEvent('skins:picks', { detail: { k, v } }));
  }
  function resetPicks() { Object.keys(PICK_DEFAULT).forEach(k => setPick(k, PICK_DEFAULT[k])); }

  /** クラシックの選択（アプリのデザインのページと同じ並び：絵とその下の名前）。compact は小さな絵 */
  function picksUI(opt = {}) {
    const el = doc.createElement('div');
    el.className = 'pk' + (opt.compact ? ' compact' : '');
    el.innerHTML = Object.entries(PICKS).map(([k, g]) => `
      <section class="pk-g" aria-labelledby="pk-${k}-${opt.id || ''}">
        <h3 class="pk-h" id="pk-${k}-${opt.id || ''}">${g.label}${g.sub ? `<small>${g.sub}</small>` : ''}</h3>
        <div class="pk-opts c${g.cols}" role="radiogroup" aria-labelledby="pk-${k}-${opt.id || ''}">
          ${Object.entries(g.items).map(([v, it]) => `<button type="button" class="pk-o" role="radio" aria-checked="${picks[k] === v}" data-k="${k}" data-v="${v}" aria-label="${it[0]}">${swatch(k, it)}<span class="pk-l">${it[0]}</span></button>`).join('')}
        </div>
      </section>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('.pk-o'); if (b) setPick(b.dataset.k, b.dataset.v); });
    return el;
  }
  function swatch(k, it) {
    if (k === 'bg') return `<span class="sw sw-bg" style="background:${it[1]}"><i></i></span>`;
    if (k === 'ink') return `<span class="sw sw-ink" style="background:${it[1]}">あ</span>`;
    if (k === 'corners') return `<span class="sw sw-cn" style="border-radius:${it[1] * .7}px"></span>`;
    return `<span class="sw sw-tm" style="background:${it[1]}">39:14</span>`;
  }

  /* ---------- 線のアイコン（クラシック・サイバー） ---------- */
  const LINE = {
    home: 'M4 11 12 4.5 20 11v9h-5.5v-5.5h-5V20H4z',
    feed: 'M4.5 4.5h15v15h-15zM8 9h8M8 12.5h8M8 16h5',
    clock: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 7.5V12l3 2',
    people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.5 19.5c.6-3.2 2.8-4.8 5.5-4.8s4.9 1.6 5.5 4.8M16 11.2a2.7 2.7 0 1 0 0-5.4M17.6 14.8c1.8.5 2.8 2 3.1 4.6',
    person: 'M12 11.5a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2zM5 20c.8-3.8 3.6-5.6 7-5.6s6.2 1.8 7 5.6',
    search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.4 15.4 20 20',
    bell: 'M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.7H4.4zM10 21h4',
    chat: 'M6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5v-3.5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z',
    pencil: 'M5 19l1.1-4.2L15.6 5.3a2 2 0 0 1 2.8 0l.3.3a2 2 0 0 1 0 2.8L9.2 17.9zM14 7l3 3',
    check: 'M5 12.5l4.5 4.5L19 7.5',
    heart: 'M12 19.5s-7.5-4.6-7.5-9.7A4 4 0 0 1 12 7.6a4 4 0 0 1 7.5 2.2c0 5.1-7.5 9.7-7.5 9.7z',
    sort: 'M8 18.5v-13M4.8 8.7 8 5.5l3.2 3.2M16 5.5v13M12.8 15.3l3.2 3.2 3.2-3.2',
    chev: 'M9.5 6l6 6-6 6'
  };
  const ic = (n, w = 1.9, cap = 'round') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="${cap === 'round' ? 'round' : 'miter'}" aria-hidden="true"><path d="${LINE[n]}"/></svg>`;
  const icc = n => ic(n, 2, 'square');
  const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.2v9.6L10.5 6z" fill="currentColor"/></svg>';
  const PAUSE = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z" fill="currentColor"/></svg>';
  const TICKS = '<svg viewBox="0 0 24 22" aria-hidden="true"><rect x="0" y="14" width="3.4" height="8" rx="1.2" fill="#E5484D"/><rect x="5.1" y="11" width="3.4" height="11" rx="1.2" fill="#F2C46D"/><rect x="10.2" y="8" width="3.4" height="14" rx="1.2" fill="#9AB8DB"/><rect x="15.3" y="4.5" width="3.4" height="17.5" rx="1.2" fill="#5B8DEF"/><rect x="20.4" y="1" width="3.4" height="21" rx="1.2" fill="#9D7BF5"/></svg>';
  const SLASH = '<svg viewBox="0 0 26 16" aria-hidden="true"><path d="M0 16l3-5h3l-3 5zM5.5 16l5-9h3l-5 9zM11 16l7-13h3l-7 13zM16.5 16l8-15H26l-8 15z" fill="#000"/></svg>';

  const sb = (color, dark) => `<div class="sk-sb" style="--sb:${color}"><span>7:32</span><span class="r"><svg width="17" height="11" viewBox="0 0 17 11"><rect x="0" y="7" width="3" height="4" fill="${color}"/><rect x="4.5" y="5" width="3" height="6" fill="${color}"/><rect x="9" y="2.5" width="3" height="8.5" fill="${color}"/><rect x="13.5" y="0" width="3" height="11" fill="${color}"/></svg><svg width="25" height="12" viewBox="0 0 25 12"><rect x="1" y="1" width="20" height="10" rx="2.5" fill="none" stroke="${color}" stroke-width="1.5" opacity=".45"/><rect x="3" y="3" width="13" height="6" rx="1" fill="${color}"/><rect x="22.5" y="4" width="1.5" height="4" fill="${color}" opacity=".45"/></svg></span></div>`;

  /* ---------- 見本のデータ（docs/app/mock と同じ はる のアカウント） ---------- */
  const FR = [
    { n: 'mio', c: '#C47A55', s: 'en', t: [4, 11], d: [1, 4], up: true, pts: '0,15 12,22 24,23 36,16 48,5' },
    { n: 'kaito', c: '#3E8C78', s: 'ph', t: [3, 12], d: [0, 8], up: false, pts: '0,6 8,22 18,14 28,12 38,5 48,7' },
    { n: 'ゆなっぴ', c: '#8E6283', s: 'ch', t: [2, 36], d: [1, 10], up: true, pts: '0,18 10,10 20,20 30,15 40,9 48,6' }
  ];
  const CYS = { en: ['EN', '01', '#4E7BFF'], ma: ['MA', '02', '#C49BFF'], ja: ['JA', '03', '#FF6FC8'], ph: ['PH', '03', '#9FB9FF'], ch: ['CH', '04', '#C9CEDB'] };
  const TODAY = [['en', 95], ['ma', 40], ['ja', 30]];
  const WEEK = ['月', '火', '水', '木', '金', '土', '日'];
  const pad = n => String(n).padStart(2, '0');

  /* ======================= スタンダード ======================= */
  function stdHome() {
    const spark = (pts, up) => `<svg class="spark" width="48" height="26" viewBox="0 0 48 26" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up ? 'var(--ink)' : 'var(--down)'}" stroke-width="2"/><rect x="${pts.split(' ').pop().split(',')[0] - 3}" y="${pts.split(' ').pop().split(',')[1] - 3}" width="6" height="6" fill="${up ? 'var(--ink)' : 'var(--down)'}"/></svg>`;
    return `<div class="sk-scroll">${sb('#17121F')}
      <header class="sk-hdr"><span class="logo">${A.LOGO}<span class="logo-word">inchly</span></span>
        <span class="key key-sm lv"><span class="face"><span class="lv-n">Lv.25</span><span class="lv-bar"><i style="--p:.4"></i></span></span></span>
        <span class="kgroup"><span><i class="pi">${A.icon('search')}</i></span><span><i class="pi">${A.icon('bell')}</i><span class="udot"></span></span><span><i class="pi">${A.icon('chat')}</i><span class="udot"></span></span></span></header>
      <div class="sk-stack">
        <section class="card"><div class="sec-h" style="margin-bottom:12px"><span class="sec-t" style="--accent:var(--g3)">勉強した日</span><span class="sec-a">今年 <b>253</b>日</span></div><div class="grass" aria-hidden="true"></div></section>
        <section class="card streak"><span class="flame" data-days="23"></span><div class="streak-n"><p><span class="mid">23</span><span class="unit">日連続</span></p><p class="streak-s">休み券 2</p></div>
          <div class="wk">${WEEK.map((d, i) => `<span class="wk-d ${i < 3 ? 'is-done' : i === 3 ? 'is-today' : 'is-future'}"><i>${i <= 3 ? `<b class="pi">${A.icon('check')}</b>` : ''}</i>${d}</span>`).join('')}</div></section>
        <section class="card fr"><div class="sec-h"><span class="sec-t" style="--accent:var(--run)">いま勉強中の友達</span><span class="fr-tools"><span class="chip"><span class="face">勉強時間順<i class="pi">${A.icon('down', 1.5)}</i></span></span><span class="lk">もっと見る</span></span></div>
          <div class="rows">${FR.map(f => `<div class="row fr-row"><span class="av" style="--c:${f.c}">${f.n[0].toUpperCase()}</span><span class="row-main"><span class="row-t">${f.n}</span><span class="row-s"><i class="dot" style="--c:${A.SUBJ[f.s].c}"></i>${A.SUBJ[f.s].name}を勉強中</span></span><span class="row-end"><span class="row-v">${f.t[0]}:${pad(f.t[1])}</span><span class="delta ${f.up ? 'up' : 'down'}">${f.d[0]}:${pad(f.d[1])}</span></span>${spark(f.pts, f.up)}<svg class="grip" viewBox="0 0 20 14" aria-hidden="true"><path d="M1 2h18M1 7h18M1 12h18" stroke="currentColor" stroke-width="2"/></svg></div>`).join('')}</div></section>
        <section class="card hero blk-today"><div class="sec-h"><span class="sec-t" style="--accent:var(--ink)">今日の勉強</span><span class="tag"><i class="dot due"></i>第4回 記述模試まで <b>10</b>日</span></div>
          <p class="today-d">10月29日（木）</p>
          <div class="today-num"><span class="big">2</span><span class="unit">時間</span><span class="big">45</span><span class="unit">分</span><span class="today-diff"><span class="delta up">1:17</span><small>昨日より</small></span></div>
          <div class="tape" data-goal="180" data-parts="en:95,ma:40,ja:30"></div></section>
        <section class="card"><div class="sec-h" style="margin-bottom:12px"><span class="sec-t" style="--accent:var(--sun)">バッジ</span><span class="sec-a"><b>7</b> / 11</span></div>
          <div class="badges"><div class="badge"><span data-stk="trophy"></span><b>100時間</b><small>達成</small></div><div class="badge"><span data-stk="trophy"></span><b>300時間</b><small>達成</small></div><div class="badge"><span data-stk="flame"></span><b>7日連続</b><small>達成</small></div><div class="badge"><span data-stk="star"></span><b>1日5時間</b><small>達成</small></div></div></section>
      </div></div>
      <div class="sk-chrome">
        <div class="sbar" data-state="idle"><div class="sbar-face"><span class="sbar-main"><span class="subj is-next" data-s="en" aria-hidden="true"></span><span class="sbar-txt"><span class="sbar-t">英語 · 長文読解</span><span class="sbar-s">次 · 17:00から</span></span></span><span class="key key-lime key-sm sbar-go"><span class="face"><i class="pi">${A.icon('play')}</i>勉強を開始</span></span></div></div>
        <div class="tabbar">${['home', 'feed', 'clock', 'people', 'person'].map((t, i) => `<span class="tab"${i === 0 ? ' aria-current="page"' : ''}><span class="tab-plate"><i class="pi">${A.icon(t)}</i></span></span>`).join('')}</div>
      </div><span class="sk-home" style="--sb:#17121F"></span>`;
  }
  function stdTimer() {
    return `<div class="st-tm">${sb('#17121F')}
      <div class="tm-top"><span class="tm-grab"></span><p class="tm-state"><i class="dot run"></i>国語を勉強中</p></div>
      <div class="tm-head"><span class="tm-title"><span class="h">今日の時間割<i class="pi">${A.icon('right')}</i></span><span class="d">10月29日（木）</span></span><span class="key key-sm"><span class="face"><i class="pi">${A.icon('sort')}</i>並べ替え</span></span></div>
      <div class="st-deck"><div class="st-side l"></div>
        <div class="tcard"><div class="tart" style="--c:var(--s-ja)"><span class="tchip"><i class="dot run"></i>勉強中</span><span class="tart-g">${A.glyph('book', 1.6)}</span><span class="tart-n">国語</span></div>
          <div class="tname"><div><h3>国語</h3><p>古文単語</p></div><i class="pi">${A.icon('heart-o')}</i></div>
          <div class="tclock"><div class="tline"><i></i></div><div class="truler">${[0, 1, 2, 3, 4, 5, 6].map(i => `<i style="left:${(i / 6 * 100).toFixed(2)}%"></i>`).join('')}</div><div class="ttime"><span class="tbig">40:03</span><span class="trest">−19:57</span></div></div>
          <div class="tkeys"><span class="tk-side"><i class="pi">${A.icon('edit')}</i></span><span class="key key-round" style="--d:68px"><span class="face"><i class="pi">${A.icon('pause', 3)}</i></span></span><span class="tk-side"><i class="pi">${A.icon('check', 3)}</i></span></div>
        </div><div class="st-side r"></div></div>
      <div class="pager"><span class="pg-dots"><i class="add"></i><i class="on"></i><i></i><i></i></span><span class="pg-l">1 / 3</span></div>
      <div class="ad"><span>広告</span></div>
    </div><span class="sk-home" style="--sb:#17121F"></span>`;
  }
  function stdMoment() {
    return `<div class="mo mo-std"><div class="mo-card"><div class="mo-well"><span class="pix" data-pix="penta" data-face="idle" data-scale="6"></span></div><div class="mo-txt"><p>国語 39分</p><b>+39<small>EXP</small></b></div></div></div>`;
  }

  /* ======================= クラシック ======================= */
  const FIRE = '<svg class="cl-fire" viewBox="0 0 44 48" aria-hidden="true"><g stroke-linejoin="round"><path d="M22 4c3 8 13 12 13 25a13 13 0 0 1-26 0c0-6 3-10 6-13 0 5 2 8 5 8-1-7 0-14 2-20z" fill="#fff" stroke="#fff" stroke-width="7" transform="translate(0 2)" opacity=".18"/><path d="M22 4c3 8 13 12 13 25a13 13 0 0 1-26 0c0-6 3-10 6-13 0 5 2 8 5 8-1-7 0-14 2-20z" fill="#fff" stroke="#fff" stroke-width="7"/><path d="M22 4c3 8 13 12 13 25a13 13 0 0 1-26 0c0-6 3-10 6-13 0 5 2 8 5 8-1-7 0-14 2-20z" fill="#FF7A1A"/><path d="M22 24c3 4 6 6 6 10a6 6 0 0 1-12 0c0-4 3-6 6-10z" fill="#FFC23D"/></g></svg>';
  function clHome() {
    const spark = (pts, up) => { const l = pts.split(' ').pop().split(','); return `<svg class="cl-spark" viewBox="0 0 48 26" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${up ? '#2F6BFF' : '#E5484D'}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${l[0]}" cy="${l[1]}" r="3" fill="${up ? '#2F6BFF' : '#E5484D'}"/></svg>`; };
    const end = 240, x = m => (m / end * 100).toFixed(2) + '%';
    let at = 0;
    const tape = TODAY.map(([s, m]) => { const h = `<i style="--c:${A.SUBJ[s].c};width:${x(m)}"></i>`; at += m; return h; }).join('');
    return `<div class="sk-scroll">${sb('#121417')}
      <header class="cl-hdr"><span class="cl-logo">${TICKS}inchly</span><span class="cl-lv">Lv.25<i><b></b></i></span>
        <span class="cl-ibs"><span class="cl-ib">${ic('search')}</span><span class="cl-ib">${ic('bell')}<i></i></span><span class="cl-ib">${ic('chat')}<i></i></span></span></header>
      <div class="cl-stack">
        <section class="cl-card"><div class="cl-h"><b>勉強した日</b><span class="r">今年 253日</span></div><div class="grass" aria-hidden="true"></div></section>
        <section class="cl-streak">${FIRE}<div class="cl-st-n"><b>23</b><span>日連続 · 休み券 2</span></div>
          <div class="cl-wk">${WEEK.map((d, i) => `<span class="${i === 3 ? 'now' : i > 3 ? 'fu' : ''}">${d}<i></i></span>`).join('')}</div></section>
        <section class="cl-card"><div class="cl-h"><b>いま勉強中の友達<i class="cl-gd"></i></b><span class="cl-pill">勉強時間順 ⌄</span><span class="cl-link">もっと見る</span></div>
          ${FR.map(f => `<div class="cl-row"><span class="cl-av" style="--c:${f.c}">${f.n[0]}</span><div class="cl-rm"><b>${f.n}</b><span><i></i>${A.SUBJ[f.s].name}を勉強中</span></div><div class="cl-re"><b>${f.t[0]}:${pad(f.t[1])}</b><span class="${f.up ? 'up' : 'down'}">${f.up ? '▲' : '▼'} ${f.d[0]}:${pad(f.d[1])}</span></div>${spark(f.pts, f.up)}<svg class="cl-grip" viewBox="0 0 18 12" aria-hidden="true"><path d="M1 1.5h16M1 6h16M1 10.5h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div>`).join('')}</section>
        <section class="cl-card"><div class="cl-h"><span class="cl-sub">今日の勉強 · 10月29日（木）</span><span class="cl-tag"><i></i>第4回 記述模試まで <b>10</b>日</span></div>
          <div class="cl-num"><b>2</b><span>時間</span><b>45</b><span>分</span><span class="cl-diff">▲ 1:17<small>昨日より</small></span></div>
          <div class="cl-tape">${tape}</div>
          <div class="cl-rule"><span style="left:0;transform:none">0</span><span style="left:25%">1h</span><span style="left:50%">2h</span><i class="gl" style="left:75%"></i><span class="g" style="left:75%">目標 3h</span><span style="left:100%;transform:translateX(-100%)">4h</span></div></section>
        <section class="cl-card"><div class="cl-h"><b>バッジ</b><span class="r">7 / 11</span></div><div class="cl-badges">${['100時間', '300時間', '7日連続', '1日5時間'].map((b, i) => `<span class="cl-badge">${i === 2 ? FIRE : starSVG()}${b}<small>達成</small></span>`).join('')}</div></section>
      </div></div>
      <div class="sk-chrome">
        <div class="cl-sbar cl-glass"><span class="cl-tile" style="--c:#5856D6">${A.glyph('bubble', 1.8)}</span><span class="cl-sb-t"><b>英語 · 長文読解</b><small>次 · 17:00から</small></span><span class="cl-go">${PLAY}勉強を開始</span></div>
        <div class="cl-tab cl-glass">${['home', 'feed', 'clock', 'people', 'person'].map((t, i) => `<span${i === 0 ? ' class="on"' : ''}>${ic(t)}</span>`).join('')}</div>
      </div><span class="sk-home" style="--sb:#121417"></span>`;
  }
  function clTimer() {
    return `<div class="cl-tm">${sb('#FFFFFF')}
      <div class="cl-tm-top"><span class="cl-grab"></span><span class="cl-tm-st">勉強中</span></div>
      <div class="cl-tm-head"><div><b>今日の時間割 ›</b><small>10月29日（木）</small></div><span class="cl-sort">${ic('sort')}並べ替え</span></div>
      <div class="cl-deck"><div class="cl-side l"></div>
        <div class="cl-tcard"><div class="cl-art"><span class="cl-chip"><i></i>勉強中</span><span class="g">${A.glyph('book', 1.5)}</span><b>国語</b></div>
          <div class="cl-tname"><div><b>国語</b><small>古文単語</small></div>${ic('heart', 1.8)}</div>
          <div class="cl-line"><i></i></div>
          <div class="cl-time"><b>40:03</b><span>−19:57</span></div>
          <div class="cl-keys"><span>${ic('pencil', 1.8)}</span><span class="m">${PAUSE}</span><span>${ic('check', 2)}</span></div>
        </div><div class="cl-side r"></div></div>
      <div class="cl-pager"><i></i>1 / 3</div>
      <div class="ad"><span>広告</span></div>
    </div><span class="sk-home" style="--sb:#FFFFFF"></span>`;
  }
  /* えらい！のシール：星（ポップな黄色）に、太い白いフチと、まっすぐ下のやわらかい影（ui/Sticker.tsx） */
  function starSVG() {
    const cx = 24, cy = 25.5, R = 20.5, r = 9.8;
    const p = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r : R; p.push(`${(cx + q * Math.cos(a)).toFixed(2)} ${(cy + q * Math.sin(a)).toFixed(2)}`); }
    const d = `M${p.join('L')}z`;
    const o = (c, w, ex = '') => `<path d="${d}" fill="${c}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" ${ex}/>`;
    return `<svg viewBox="-5 -5 58 58" aria-hidden="true">${o('#0F172A', 12.3, 'opacity=".08" transform="translate(0 3.5)"')}${o('#0F172A', 9.8, 'opacity=".1" transform="translate(0 1.6)"')}${o('#FFFFFF', 9.8)}${o('#FFC23D', 3)}<path d="M17.5 20.5l3-6" stroke="#fff" stroke-width="2.8" stroke-linecap="round" opacity=".6"/></svg>`;
  }
  function clMoment() {
    return `<div class="mo mo-cl"><div class="mo-cl-toast"><i>${ic('check', 2.6)}</i>国語 39分を記録しました<small>+39 EXP</small></div><div class="mo-cl-stk">${starSVG()}<span class="mo-cl-lab">えらい！</span></div></div>`;
  }

  /* ======================= サイバー ======================= */
  const FLAME = '<svg class="cy-flame" viewBox="0 0 46 56" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round" aria-hidden="true"><path d="M23 4c2.5 8 12.5 12 12.5 27a12.5 12.5 0 0 1-25 0c0-7 3.5-11 6.5-14 0 5 2 8.5 5 8.5-1.5-8 0-15 1-21.5z"/><path d="M23 30c2.5 3.5 5 6 5 10a5 5 0 0 1-10 0c0-4 2.5-6.5 5-10z" stroke="#FFD9A8"/></svg>';
  function cyHome() {
    const osc = (pts, up) => `<svg class="cy-osc" viewBox="0 0 58 34" aria-hidden="true"><polyline points="${pts.split(' ').map(q => { const [a, b] = q.split(','); return `${(+a * 1.08 + 3).toFixed(1)},${(+b * 1.1 + 3).toFixed(1)}`; }).join(' ')}" fill="none" stroke="${up ? '#00F0FF' : '#FF2D55'}" stroke-width="1.6" style="filter:drop-shadow(0 0 2px ${up ? '#00F0FF' : '#FF2D55'})"/></svg>`;
    let cells = '', n = 0;
    TODAY.forEach(([s, m]) => { const k = Math.round(m / 240 * 36); for (let i = 0; i < k; i++, n++) cells += `<i class="l" style="--c:${CYS[s][2]}"></i>`; });
    for (; n < 36; n++) cells += '<i></i>';
    return `<div class="sk-scroll">
      <div class="cy-band">${sb('#000000')}
        <div class="cy-top"><span class="cy-logo">${SLASH}inchly</span><span class="cy-lv"><small>LV</small>25</span>
          <span class="cy-ibs"><span class="cy-ib">${icc('search')}</span><span class="cy-ib">${icc('bell')}<b>7</b></span><span class="cy-ib">${icc('chat')}<b>1</b></span></span></div>
        <div class="cy-meta"><span>INCH/OS&nbsp; 10.29 THU&nbsp; 7:32</span><span class="sp"></span><span>UPTIME 23D</span><i class="cy-bc"></i></div>
      </div>
      <div class="cy-stack">
        <section class="cy-panel"><div class="cy-h"><span class="sl">///</span><span class="md">MOD.01</span><b>勉強した日</b><span class="r">253D / 2026</span></div><div class="grass" aria-hidden="true"></div></section>
        <section class="cy-panel cy-up">${FLAME}<div class="cy-up-n"><span class="cy-mono">UPTIME</span><p><b class="cy-num">23</b><span>日連続</span></p></div>
          <div class="cy-up-r"><div class="cy-days">${WEEK.map((d, i) => `<span class="${i < 3 ? 'on' : i === 3 ? 'now' : ''}">${d}<i></i></span>`).join('')}</div><div class="cy-tix"><i></i><i></i><span>休み券 ×2</span></div></div></section>
        <section class="cy-panel"><div class="cy-h"><span class="sl">///</span><span class="md">MOD.03</span><b>勉強中の友達</b><span class="lk"><span>≡ 時間順</span><span>もっと見る ›</span></span></div>
          ${FR.map(f => `<div class="cy-row"><span class="cy-hex"><span>${f.n[0]}</span></span><div class="cy-rm"><b>${f.n}</b><span><i class="cy-code" style="--c:${CYS[f.s][2]}">${CYS[f.s][0]}<br>${CYS[f.s][1]}</i>${A.SUBJ[f.s].name}を勉強中</span></div><div class="cy-re"><b class="cy-num">${f.t[0]}<small>h</small>${pad(f.t[1])}</b><span class="${f.up ? 'up' : 'down'}">${f.up ? '▲' : '▼'}${f.d[0] ? `${f.d[0]}h${pad(f.d[1])}` : `${f.d[1]}分`}</span></div>${osc(f.pts, f.up)}</div>`).join('')}</section>
        <section class="cy-panel cy-mach"><div class="mh"><span>/// MOD.04</span><b>今日の勉強</b><span class="r">10.29 THU</span></div>
          <div class="mn"><b class="cy-num">2<small>h</small>45</b><span class="vs"><small>VS 昨日</small>▲1h17</span></div>
          <div class="cy-win"><div class="cy-led">${cells}<span class="goal" style="left:75%"></span></div>
            <div class="cy-wk">${TODAY.map(([s, m]) => `<span><i style="--c:${CYS[s][2]};background:${CYS[s][2]}"></i>${CYS[s][0]} ${Math.floor(m / 60)}h${pad(m % 60)}</span>`).join('')}<span style="margin-left:auto">GOAL 3h00</span></div></div></section>
      </div></div>
      <div class="sk-chrome">
        <div class="cy-panel cy-sbar"><span class="cy-tile" style="--c:#4E7BFF">EN<small>01</small></span><span class="cy-sb-t"><b>英語 · 長文読解</b><small>次発 · 17:00</small></span><span class="cy-go">${PLAY}勉強を開始</span></div>
        <div class="cy-tab">${[['home', 'ホーム'], ['feed', 'タイムライン'], ['clock', '時間割'], ['people', 'みんな'], ['person', 'マイページ']].map(([t, l], i) => `<span class="${i === 0 ? 'on' : ''}${i === 2 ? ' mid' : ''}"><em>0${i + 1}</em>${icc(t)}<small>${l}</small></span>`).join('')}</div>
      </div><span class="sk-home" style="--sb:#E6F4F5"></span>`;
  }
  /* 雨の路地：電柱と電線、街の窓、自販機、ぬれた地面。看板（国語）はネオン管 */
  function alley() {
    const r = (() => { let a = 7; return () => { a = (a * 9301 + 49297) % 233280; return a / 233280; }; })();
    let win = '';
    [[0, 70, 92], [74, 52, 64], [212, 60, 84]].forEach(([x0, w, h]) => { for (let y = 260 - h + 10; y < 238; y += 11) for (let x = x0 + 6; x < x0 + w - 6; x += 10) if (r() > .55) win += `<rect x="${x}" y="${y}" width="5" height="6" fill="#FFE3A6" opacity="${(.25 + r() * .6).toFixed(2)}"/>`; });
    let far = '';
    for (let x = 0; x < 300; x += 18 + Math.floor(r() * 20)) far += `<rect x="${x}" y="${110 + Math.floor(r() * 60)}" width="${16 + Math.floor(r() * 22)}" height="200" fill="#0C1620"/>`;
    return `<svg class="al" viewBox="0 0 300 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs><linearGradient id="wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D1A26"/><stop offset="1" stop-color="#03060A"/></linearGradient>
      <radialGradient id="vend" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#00F0FF" stop-opacity=".35"/><stop offset="1" stop-color="#00F0FF" stop-opacity="0"/></radialGradient></defs>
      ${far}
      <rect x="0" y="168" width="70" height="92" fill="#08101A"/><rect x="74" y="196" width="52" height="64" fill="#0A131D"/><rect x="212" y="176" width="88" height="84" fill="#08101A"/>
      ${win}
      <rect x="0" y="238" width="300" height="22" fill="url(#wet)"/>
      <path d="M150 238V40" stroke="#1B2A35" stroke-width="5"/><path d="M136 56h28M139 66h22" stroke="#1B2A35" stroke-width="3"/>
      <path d="M0 58Q75 82 150 56T300 70M0 70Q80 96 150 66T300 84" stroke="#1B2A35" stroke-width="1.4" fill="none"/>
      <circle cx="244" cy="214" r="40" fill="url(#vend)"/><rect x="230" y="188" width="30" height="50" fill="#0B1D26" stroke="#00F0FF" stroke-opacity=".7"/><rect x="234" y="193" width="22" height="18" fill="#00F0FF" opacity=".35"/>
      <rect x="0" y="246" width="300" height="2" fill="#FF6FC8" opacity=".12"/><rect x="226" y="246" width="40" height="3" fill="#00F0FF" opacity=".18"/>
    </svg>`;
  }
  function cyTimer() {
    const prog = Array.from({ length: 30 }, (_, i) => `<i${i < 20 ? ' class="l"' : ''}></i>`).join('');
    return `<div class="cy-tm">${sb('#E6F4F5')}
      <div class="cy-tm-top"><span class="cy-grab"></span><span class="cy-rec"><i></i>計測中 // 国語</span></div>
      <div class="cy-tm-head"><div><span class="cy-mono">TODAY // 10.29 THU</span><b>今日の時間割 ›</b></div><span class="cy-btn">${icc('sort')}並べ替え</span></div>
      <div class="cy-deck"><div class="cy-side l"></div>
        <div class="cy-panel cy-card"><div class="cy-art">${alley()}<div class="cy-sign"><b>国</b><b>語</b></div><div class="cy-rain"><i class="b"></i><i class="f"></i></div><span class="cy-art-tag"><i></i>LIVE</span></div>
          <div class="cy-tname"><span class="cy-code" style="--c:#FF6FC8">JA<br>03</span><div><b>国語</b><small>古文単語</small></div></div>
          <div class="cy-prog">${prog}</div>
          <div class="cy-time"><b class="cy-num"><span>4</span><span>0</span><span class="c">:</span><span>0</span><span>3</span></b><em>−19:57</em></div>
          <div class="cy-keys"><span class="cy-k">${icc('pencil')}</span><span class="cy-k m">${PAUSE}</span><span class="cy-k">${icc('check')}</span></div>
        </div><div class="cy-side r"></div></div>
      <div class="cy-pager"><i></i><i class="on"></i><i></i><i></i><span>01 / 03</span></div>
      <div class="ad"><span>AD // 広告</span></div>
    </div><span class="sk-home" style="--sb:#E6F4F5"></span>`;
  }
  /* 済：赤いはんこ。太い四角の輪の中に明朝の字 */
  const STAMP = '<svg class="mo-stamp" viewBox="0 0 96 96" aria-hidden="true"><defs><filter id="rough"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs><g filter="url(#rough)" fill="#E3242B"><path d="M6 6h84v84H6zM13 13v70h70V13z" fill-rule="evenodd"/><text x="48" y="72" text-anchor="middle" font-family="\'Noto Serif JP\',\'Noto Serif CJK JP\',\'Hiragino Mincho ProN\',serif" font-weight="900" font-size="62">済</text></g></svg>';
  function cyMoment() {
    return `<div class="mo mo-cy"><span class="ev">EV.02 // 記録</span><span class="lg">LOGGED // 国語</span><span class="big">+39${STAMP}</span><p>国語 39分を記録しました</p><span class="xp">+39 XP</span><span class="gl">GOAL 3h00</span><span class="bc"></span></div>`;
  }

  const DRAW = {
    standard: { home: stdHome, timer: stdTimer, moment: stdMoment },
    cyber: { home: cyHome, timer: cyTimer, moment: cyMoment },
    classic: { home: clHome, timer: clTimer, moment: clMoment }
  };

  /**
   * box の中に、そのテーマの画面（390 幅）を入れる。
   * scale：縮める割合（zoom）。height：box の高さ（px）。画面の高さは height / scale。
   * live：サイバーの雨を流す（真ん中のカードの1枚だけ）。
   */
  function mount(box, th, view = 'home', o = {}) {
    const s = o.scale || 1, h = Math.round((o.height || 844 * s) / s);
    box.innerHTML = '';
    const z = doc.createElement('div');
    z.className = 'sk-z';
    z.style.zoom = s;
    const sk = doc.createElement('div');
    sk.className = `sk sk-${th}${o.live ? ' is-live' : ''}${h < 740 ? ' is-short' : ''}${h < 640 ? ' is-tiny' : ''}`;
    sk.dataset.th = th; sk.dataset.view = view;
    sk.style.height = h + 'px';
    sk.setAttribute('role', 'img');
    sk.setAttribute('aria-label', `${THEMES[th].name}の${view === 'home' ? 'ホーム' : 'タイマー'}（見本）`);
    sk.innerHTML = DRAW[th][view]();
    [...sk.children].forEach(c => c.setAttribute('aria-hidden', 'true'));
    z.appendChild(sk);
    box.appendChild(z);
    A.upgrade(sk);
    return sk;
  }
  function setLive(sk, on) { if (sk) sk.classList.toggle('is-live', !!on); }

  /** 記録した の演出を1回。終わったら resolve */
  function play(sk) {
    if (!sk || sk._playing) return sk ? sk._playing : Promise.resolve();
    const th = sk.dataset.th;
    const wrap = doc.createElement('div');
    wrap.innerHTML = DRAW[th].moment();
    const mo = wrap.firstElementChild;
    sk.appendChild(mo);
    A.upgrade(mo);
    const hold = th === 'cyber' ? 1900 : 1700;
    const R = reduced();
    sk._playing = new Promise(res => {
      requestAnimationFrame(() => requestAnimationFrame(() => mo.classList.add('is-in')));
      if (th === 'standard') { const px = mo.querySelector('.pix'); setTimeout(() => A.face(px, 'happy'), R ? 0 : 450); }
      if (th === 'cyber') setTimeout(() => mo.classList.add('is-stamp'), R ? 0 : 320);
      setTimeout(() => { mo.classList.add('is-out'); }, hold);
      setTimeout(() => { mo.remove(); sk._playing = null; res(); }, hold + (R ? 0 : 200));
    });
    return sk._playing;
  }

  /** テーマの絵（棚のカード・チップ） */
  function motif(th) {
    if (th === 'standard') return `<span class="mt mt-standard" aria-hidden="true"><i class="card-b"></i><i class="ground"></i><span class="pix">${A.pix('mebu', 'happy', 5)}</span></span>`;
    if (th === 'cyber') return `<span class="mt mt-cyber" aria-hidden="true"><span class="rec">● REC</span><span class="plate"><b>勉強中</b></span><span class="led">${Array.from({ length: 12 }, (_, i) => `<i${i < 8 ? ' class="l"' : ''}></i>`).join('')}</span></span>`;
    return `<span class="mt mt-classic" aria-hidden="true"><span class="glass">${TICKS}</span></span>`;
  }

  applyPicks();
  window.Skins = { THEMES, ORDER, PICKS, picks, setPick, resetPicks, picksUI, mount, setLive, play, motif, get current() { return current; }, setCurrent, ic };
})();
