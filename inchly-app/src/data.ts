// Sample data. Every number, person and post here is made up for the mock.

export type Subject = { id: string; name: string; c: string; task: string; week: number; goal: number };
export const SUBJ: Subject[] = [
  { id: 'en', name: '英語', c: '#3E8C78', task: '長文読解 第3講', week: 6.5, goal: 7 },
  { id: 'ma', name: '数学', c: '#C47A55', task: '青チャート 数III 例題41〜50', week: 5.8, goal: 8 },
  { id: 'ph', name: '物理', c: '#5D6DB8', task: '名問の森 電磁気 15', week: 4.1, goal: 5 },
  { id: 'ch', name: '化学', c: '#B39548', task: '有機 構造決定 演習', week: 2.9, goal: 3 },
  { id: 'ja', name: '国語', c: '#8E6283', task: '古文単語 315 · 61〜80', week: 1.6, goal: 3 },
];
export const subj = (id: string) => SUBJ.find((s) => s.id === id) ?? SUBJ[0];

export type Person = { n: string; h: string; c: string; s: string; t: number; g: string };
export const PEOPLE: Person[] = [
  { n: 'mio', h: 'mio.k', c: '#C47A55', s: '英語', t: 4380, g: '東大 文一' },
  { n: 'そら', h: 'sora_06', c: '#5D6DB8', s: '数学', t: 2885, g: '東大 理一' },
  { n: 'kaito', h: 'kaito', c: '#3E8C78', s: '物理', t: 1730, g: '科学大' },
  { n: 'ゆなっぴ', h: 'yuna', c: '#8E6283', s: '化学', t: 950, g: '東大 理二' },
  { n: 'れん', h: 'ren.d', c: '#4B7A3B', s: '世界史', t: 520, g: '一橋' },
];
// More people in the study room — not everyone is someone you follow.
export const ROOM: Person[] = [
  ...PEOPLE,
  { n: 'taku', h: 'taku_1203', c: '#8A6D3B', s: '数学', t: 6120, g: '京大 工' },
  { n: 'さき', h: 'saki.ozw', c: '#B4545C', s: '生物', t: 3310, g: '医学部' },
  { n: 'ゆうき', h: 'yk_ronin', c: '#5B7B8E', s: '日本史', t: 2140, g: '早稲田' },
  { n: 'つばさ', h: 'tsubasa_t', c: '#5D6DB8', s: '英語', t: 1405, g: '東大 理一' },
  { n: 'あおい', h: 'aoi_07', c: '#3E8C78', s: '現代文', t: 660, g: '阪大' },
  { n: 'ひなた', h: 'hinata.s', c: '#B39548', s: '化学', t: 205, g: '東大 理二' },
];

export const RANK = [
  { n: 'ひなた', c: '#C99A22', h: 42.5 },
  { n: 'つばさ', c: '#4A5BD4', h: 39.8 },
  { n: 'mio', c: '#D9653B', h: 38.1 },
  { n: 'あおい', c: '#1F8A70', h: 36.4 },
  { n: 'そら', c: '#4A5BD4', h: 35.9 },
];

export type Post = { n: string; c: string; m: string; t: string; tags: string[]; u: number; r: number; img?: 'noteBook' | 'noteDesk' };
export const POSTS: Post[] = [
  { n: 'mio', c: '#C47A55', m: '高3 · 12分前', t: '古文の参考書、やっと1周。2周目は音読しながらやる', tags: ['#古文'], u: 23, r: 4, img: 'noteBook' },
  { n: 'りん', c: '#4B7A3B', m: '東大 理一 1年 · 先輩 · 2時間前', t: '東大英語の要約(1A)は毎年出るので、過去問15年分を1日1題。要約したあと音読までやると、本番で時間が余った。量より回数。', tags: ['#東京大学', '#英語'], u: 128, r: 14 },
  { n: 'taku', c: '#8A6D3B', m: '京大志望 · 3時間前', t: 'もう無理、今日は寝る。明日5時起き', tags: [], u: 7, r: 2 },
  { n: 'そら', c: '#5D6DB8', m: '高3 · 5時間前', t: '置換積分、何を t に置くかから説明してる15分の動画でやっとわかった。休憩中にちょうどいい長さ', tags: ['#数学', '#おすすめ動画'], u: 86, r: 9 },
  { n: 'kaito', c: '#3E8C78', m: '高3 · 昨日', t: '電磁気、エッセンスと名問の森どっちから入るのがいい？ 力学はエッセンスでなんとかなった', tags: ['#物理', '#質問'], u: 21, r: 17 },
];

export type IconName = 'flag' | 'clock' | 'users' | 'bulb' | 'cal' | 'target' | 'userPlus';
export type Notif = {
  id: number; day: string; kind: '' | 'imp' | 'study'; icon: IconName; title: string; sub: string; time: string;
  cta?: string; join?: string; follow?: string;
};
export const NOTIFS: Notif[] = [
  { id: 1, day: '今日', kind: 'imp', icon: 'flag', title: '第4回 記述模試の申込締切まで あと2日', sub: '10月23日（金）23:59まで · 河合塾', cta: '申込ページを開く', time: '9:00' },
  { id: 2, day: '今日', kind: 'study', icon: 'clock', title: 'kaito が 物理 を始めました', sub: '東大 理一 2027 · いま5人が勉強中', join: 'kaito', time: '21:12' },
  { id: 3, day: '今日', kind: 'study', icon: 'userPlus', title: 'そら と mio が勉強を始めました', sub: '数学 · 英語 · まとめて表示しています', join: 'そら', time: '20:48' },
  { id: 4, day: '今日', kind: '', icon: 'bulb', title: 'あなたの投稿に「役に立った」が12件', sub: '「模試の偏差値、3か月で +6.6…」', time: '19:30' },
  { id: 5, day: '昨日', kind: '', icon: 'cal', title: '日曜もくもく会 に参加が決まりました', sub: '10月25日（日）9:00〜12:00 · 前日にお知らせします', time: '22:05' },
  { id: 6, day: '昨日', kind: 'imp', icon: 'target', title: '今週の英語がペースより遅れています', sub: '目標7時間のうち 6.5時間 · あと30分', cta: '英語を始める', time: '21:00' },
  { id: 7, day: '昨日', kind: '', icon: 'users', title: 'ゆなっぴ があなたをフォローしました', sub: '東大 理二志望', follow: 'yuna', time: '18:12' },
];

export type Uni = { n: string; f: string; dev: number; fans: number; days: number; avg: number; p: string };
export const UNIS: Uni[] = [
  { n: '東京大学', f: '理科一類', dev: 67.5, fans: 1920, days: 127, avg: 26.1, p: '東京都文京区' },
  { n: '京都大学', f: '工学部', dev: 65.0, fans: 1310, days: 127, avg: 24.8, p: '京都府京都市' },
  { n: '東京科学大学', f: '工学院', dev: 62.5, fans: 980, days: 127, avg: 23.9, p: '東京都目黒区' },
  { n: '東北大学', f: '工学部', dev: 60.0, fans: 640, days: 127, avg: 21.7, p: '宮城県仙台市' },
  { n: '大阪大学', f: '基礎工学部', dev: 62.5, fans: 870, days: 127, avg: 23.2, p: '大阪府吹田市' },
];

export const JUKU = [
  { n: '明星ゼミ 本郷教室', sub: '高校生 · 東大対策 · 徒歩8分', pr: true },
  { n: '個別指導 ソラノ', sub: '中高生 · 自習室あり · 徒歩12分', pr: false },
  { n: '理数アカデミー 駒込校', sub: '高校生 · 理系専門 · 徒歩15分', pr: false },
];

export const DEADLINES = [
  { t: '第4回 記述模試', d: '11月8日（日）', todo: [4, 6], days: 18, urgent: true },
  { t: '共通テスト', d: '1月16日（土）', todo: [7, 12], days: 87, urgent: false },
  { t: '東大 二次試験', d: '2月25日（木）', todo: [3, 12], days: 127, urgent: false },
];

// Fixed "today" for the mock so dates and countdowns stay consistent.
export const TODAY = new Date(2026, 9, 21);

export type ChatMsg =
  | { kind: 'sys'; t: string; join?: string }
  | { kind: 'msg'; n: string; c: string; t: string }
  | { kind: 'me'; t: string }
  | { kind: 'card'; me: boolean; card: 'together' | 'goal' | 'quiz'; joined?: string[]; answered?: number };

export type GEvent = {
  id: string; mo: number; d: number; w: string; t: string; time: string; type: string;
  joined: string[]; me: boolean; cap: number; goal?: number; done?: number; fresh?: boolean;
};
export type Group = {
  id: string; n: string; m: number; join: '招待制' | '公開'; cs: string[];
  studying: [string, string, string][]; msgs: ChatMsg[]; events: GEvent[];
  shared: ['note' | 'video', string, string][];
  members?: string[]; // icon collage
  icon?: 'morning' | 'noteBook'; // or a cover photo
};

export const GROUPS: Group[] = [
  {
    id: 'g1', n: '東大 理一 2027', m: 24, join: '招待制', members: ['mio', 'そら', 'kaito', 'ゆなっぴ'], cs: ['#4A5BD4', '#1F8A70', '#D9653B', '#C99A22'],
    studying: [['mio', '#D9653B', '英語'], ['そら', '#4A5BD4', '数学'], ['ゆなっぴ', '#9A4D7E', '化学']],
    msgs: [
      { kind: 'sys', t: 'そら が 数学 を45分 記録しました' },
      { kind: 'msg', n: 'mio', c: '#D9653B', t: '英語の要約、時間を測ったら18分だった。目標は15分' },
      { kind: 'msg', n: 'そら', c: '#4A5BD4', t: '段落ごとに一文メモを先に作ると速くなるよ' },
      { kind: 'me', t: '日曜のもくもく会、9時からでいい？' },
      { kind: 'msg', n: 'ゆなっぴ', c: '#9A4D7E', t: 'OK、参加する' },
      { kind: 'sys', t: 'kaito が 物理 を始めました', join: 'kaito' },
    ],
    events: [
      { id: 'e1', mo: 10, d: 25, w: '日', t: '日曜もくもく会', time: '9:00〜12:00', type: 'もくもく自習', joined: ['mio', 'そら', 'ゆなっぴ'], me: true, cap: 12 },
      { id: 'e2', mo: 10, d: 31, w: '土', t: '10月 合計200時間チャレンジ', time: '10/1〜10/31', type: '時間チャレンジ', joined: ['kaito', 'れん', 'mio', 'そら'], me: true, cap: 24, goal: 200, done: 142 },
      { id: 'e3', mo: 11, d: 8, w: '日', t: '模試の振り返り会', time: '20:00〜21:00', type: '振り返り会', joined: ['ゆなっぴ', 'れん'], me: false, cap: 8 },
    ],
    shared: [['note', '電磁気 まとめノート p.12', 'kaito · 今日'], ['video', '置換積分の「置き方」がわかる15分', 'そら · 昨日'], ['note', '東大英語 要約メモ', 'mio · 2日前']],
  },
  {
    id: 'g2', n: '朝活 6:00 スタート', m: 12, join: '公開', icon: 'morning', cs: ['#C99A22', '#9A4D7E', '#4B7A3B', '#4A5BD4'],
    studying: [['れん', '#4B7A3B', '世界史']],
    msgs: [{ kind: 'sys', t: 'れん が 世界史 を30分 記録しました' }, { kind: 'msg', n: 'れん', c: '#4B7A3B', t: 'おはよう。今日は論述1題から' }],
    events: [], shared: [],
  },
  {
    id: 'g3', n: '英語長文 毎日1題', m: 41, join: '公開', icon: 'noteBook', cs: ['#1F8A70', '#D9653B', '#9A4D7E', '#4B7A3B'],
    studying: [['mio', '#D9653B', '英語'], ['あおい', '#1F8A70', '英語']],
    msgs: [{ kind: 'sys', t: '今日のお題：長文 第8講' }],
    events: [], shared: [],
  },
];

export const PERSON_COLOR: Record<string, string> = {
  mio: '#C47A55', そら: '#5D6DB8', kaito: '#3E8C78', ゆなっぴ: '#8E6283', れん: '#4B7A3B', あおい: '#3E8C78', ひなた: '#B39548', あなた: '#8E6283', はる: '#8E6283',
  taku: '#8A6D3B', さき: '#B4545C', ゆうき: '#5B7B8E', つばさ: '#5D6DB8', りん: '#4B7A3B',
};

// Deterministic pseudo-random, so grass and charts look the same on every launch.
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// ---------- the study diary ----------
// One deterministic record per day, shared by the grass, the bars and the totals, so every
// screen tells the same story: lighter in spring, a family trip in August, a mock-exam week,
// longer weekends, one to three subjects a day, and a 23-day streak up to today.
const SUBJ_WEIGHT = [0.3, 0.3, 0.17, 0.13, 0.1]; // en, ma, ph, ch, ja
const TODAY_PARTS = [95, 40, 0, 0, 30]; // today's 165 minutes
export const STREAK = 23;
export type Day = { min: number; parts: number[] };
const cache = new Map<number, Day>();
export function dayLog(daysAgo: number): Day {
  const hit = cache.get(daysAgo);
  if (hit) return hit;
  let out: Day;
  if (daysAgo === 0) out = { min: 165, parts: TODAY_PARTS };
  else {
    const r = rng(2026 + daysAgo * 7919);
    const d = new Date(TODAY);
    d.setDate(TODAY.getDate() - daysAgo);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const rest = daysAgo === STREAK || (daysAgo > STREAK && (r() < 0.13 || (daysAgo >= 61 && daysAgo <= 66)));
    if (rest) out = { min: 0, parts: [0, 0, 0, 0, 0] };
    else {
      let min = weekend ? 140 + r() * 200 : 50 + r() * 150;
      if (daysAgo > 150) min *= 0.55 + r() * 0.2; // still building the habit in spring
      if (daysAgo >= 16 && daysAgo <= 19) min += 70; // the week before the mock exam
      min = Math.round(min / 5) * 5 + (r() < 0.4 ? 3 : 0);
      // pick 1–3 subjects, weighted, without repeats
      const k = 1 + (r() < 0.6 ? 1 : 0) + (weekend && r() < 0.5 ? 1 : 0);
      const pool = SUBJ_WEIGHT.map((w, idx) => ({ w: w * (0.5 + r()), idx })).sort((a, b) => b.w - a.w).slice(0, k);
      const tot = pool.reduce((a, b) => a + b.w, 0);
      const parts = [0, 0, 0, 0, 0];
      let left = min;
      pool.forEach((p, n) => { const m = n === pool.length - 1 ? left : Math.round((p.w / tot) * min / 5) * 5; parts[p.idx] = m; left -= m; });
      out = { min, parts };
    }
  }
  cache.set(daysAgo, out);
  return out;
}
const levelOf = (min: number) => (min === 0 ? 0 : min < 60 ? 1 : min < 120 ? 2 : min < 200 ? 3 : 4);
/** Grass levels for the last `weeks` weeks, oldest first, ending today. */
export function grass(weeks: number, _seed?: number, todayLevel?: number): number[] {
  const n = weeks * 7;
  return Array.from({ length: n }, (_, i) => (i === n - 1 && todayLevel !== undefined ? todayLevel : levelOf(dayLog(n - 1 - i).min)));
}
/** Total hours in the last `days` days. */
export const hoursIn = (days: number) => Math.round(Array.from({ length: days }, (_, i) => dayLog(i).min).reduce((a, b) => a + b, 0) / 6) / 10;
export const YEAR_HOURS = hoursIn(365);

export const pad = (n: number) => String(n).padStart(2, '0');
export const hms = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
export const hm = (min: number) => `${Math.floor(min / 60)}時間${pad(min % 60)}分`;
