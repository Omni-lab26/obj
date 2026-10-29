// Sample data. Every number, person and post here is made up for the mock.

/** 教科: the big groups subjects belong to. A subject's area decides how "教科ごと" charts add it up. */
export type AreaId = 'en' | 'ma' | 'ja' | 'sci' | 'soc' | 'info' | 'other';
export const AREAS: { id: AreaId; name: string; c: string }[] = [
  { id: 'en', name: '英語', c: '#5856D6' },
  { id: 'ma', name: '数学', c: '#FF9500' },
  { id: 'ja', name: '国語', c: '#D9A300' },
  { id: 'sci', name: '理科', c: '#30B0C7' },
  { id: 'soc', name: '社会', c: '#A0522D' },
  { id: 'info', name: '情報', c: '#64748B' },
  { id: 'other', name: 'その他', c: '#8C93A0' },
];
export const area = (id: AreaId) => AREAS.find((g) => g.id === id) ?? AREAS[AREAS.length - 1];

// Colors are fixed, so a chart reads at a glance and means the same everywhere:
// each 教科 has its hue, and its subjects take its shades in turn (英語 the
// first purple, 英単語 the next …), given once when the subject is made and
// never changed (an icon likewise follows the subject: ui/SubjectGlyph). Only
// a subject in その他 has a color you pick — from hues no 教科 uses. No greens
// (green is the grass and the timer's line).
export const AREA_SHADES: Record<AreaId, string[]> = {
  en: ['#5856D6', '#7B79E8', '#3E3CB0', '#9E9CF2', '#2C2A8C'],
  ma: ['#FF9500', '#D97706', '#FFB547', '#B45309', '#FFCB7A'],
  ja: ['#D9A300', '#B88600', '#E9C24A', '#8F6A00'],
  sci: ['#30B0C7', '#1F7FB0', '#0EA5E9', '#16607A'],
  soc: ['#A0522D', '#C2410C', '#7A3A1C', '#C8865A', '#5E2A12'],
  info: ['#64748B', '#475569', '#94A3B8'],
  other: [],
};
/** The colors to pick for a subject in その他: none of a 教科's hues. */
export const OTHER_COLORS = ['#EC4899', '#D946EF', '#FF2D55', '#E5484D', '#A855F7', '#7E22CE', '#C8A27A', '#3F3F46'];

/** The color a new subject in `area` gets: the first of its 教科's shades no other subject there has (round again when all are taken). */
export function shadeFor(area: AreaId, others: readonly { area: AreaId; c: string }[]): string {
  const shades = AREA_SHADES[area];
  if (!shades.length) {
    const used = new Set(others.map((x) => x.c));
    return OTHER_COLORS.find((c) => !used.has(c)) ?? OTHER_COLORS[others.length % OTHER_COLORS.length];
  }
  const mine = others.filter((x) => x.area === area);
  const used = new Set(mine.map((x) => x.c));
  return shades.find((c) => !used.has(c)) ?? shades[mine.length % shades.length];
}

/** Puts every subject on its 教科's colors: one already on a free shade of its 教科 keeps it; the rest take the next free one, in order. (For saves from before colors were fixed.) */
export function fixColors<T extends { area: AreaId; c: string }>(list: readonly T[]): T[] {
  const out: T[] = [];
  for (const x of list) {
    const shades = AREA_SHADES[x.area] ?? [];
    if (!shades.length) { out.push(x); continue; }
    const taken = out.some((y) => y.area === x.area && y.c === x.c);
    out.push(shades.includes(x.c) && !taken ? x : { ...x, c: shadeFor(x.area, out) });
  }
  return out;
}

/** Which 教科 a subject's name points to (数IA → 数学, 日本史 → 社会 …), その他 when it can't tell. */
export function guessArea(name: string): AreaId {
  const n = name.trim();
  const preset = PRESETS.find((p) => p.name === n);
  if (preset) return preset.area;
  if (/英|リスニング|TOEIC|TOEFL|IELTS|English/i.test(n)) return 'en';
  if (/数|算/.test(n)) return 'ma';
  if (/国語|現代文|現文|古文|漢文|古典|小論/.test(n)) return 'ja';
  if (/物理|化学|生物|地学|理科|物基|化基|生基/.test(n)) return 'sci';
  if (/史|地理|政|経|倫理|公共|社会/.test(n)) return 'soc';
  if (/情報|プログラ/.test(n)) return 'info';
  return 'other';
}

/** A subject you study. task: what you're on in it (sample text); week/goal: sample hours for the weekly view. */
export type Subject = { id: string; name: string; c: string; area: AreaId; task?: string; week?: number; goal?: number; hidden?: boolean;
  /** 略称: up to 4 characters, for where a long name doesn't fit (サイバー's signs) */
  short?: string };
/** The starting five. Their ids are what older records point to, so they never change. */
export const SUBJ: Subject[] = [
  { id: 'en', name: '英語', c: '#5856D6', area: 'en', task: '長文読解 第3講', week: 6.5, goal: 7 },
  { id: 'ma', name: '数学', c: '#FF9500', area: 'ma', task: '青チャート 数III 例題41〜50', week: 5.8, goal: 8 },
  { id: 'ph', name: '物理', c: '#30B0C7', area: 'sci', task: '名問の森 電磁気 15', week: 4.1, goal: 5 },
  { id: 'ch', name: '化学', c: '#1F7FB0', area: 'sci', task: '有機 構造決定 演習', week: 2.9, goal: 3 },
  { id: 'ja', name: '国語', c: '#D9A300', area: 'ja', task: '古文単語 315 · 61〜80', week: 1.6, goal: 3 },
];
/** Subjects people often split into, offered as one-tap additions. */
export const PRESETS: { name: string; area: AreaId }[] = [
  { name: '英単語', area: 'en' }, { name: '英文法', area: 'en' }, { name: '長文読解', area: 'en' }, { name: 'リスニング', area: 'en' }, { name: '英作文', area: 'en' },
  { name: '数IA', area: 'ma' }, { name: '数IIB', area: 'ma' }, { name: '数III', area: 'ma' }, { name: '数C', area: 'ma' },
  { name: '現代文', area: 'ja' }, { name: '古文', area: 'ja' }, { name: '漢文', area: 'ja' },
  { name: '物理', area: 'sci' }, { name: '化学', area: 'sci' }, { name: '生物', area: 'sci' }, { name: '地学', area: 'sci' },
  { name: '日本史', area: 'soc' }, { name: '世界史', area: 'soc' }, { name: '地理', area: 'soc' }, { name: '政治・経済', area: 'soc' }, { name: '倫理', area: 'soc' }, { name: '公共', area: 'soc' },
  { name: '情報I', area: 'info' },
];

/**
 * How the theme in use shows a subject's color. Most themes show it as it is;
 * サイバー keeps every subject off its four signal colors, giving each the
 * same place in its own shades (design.ts ThemeDef.subjects). The saved color
 * never changes; theme.ts sets this when the theme changes.
 */
type Tone = (x: { c: string; area: AreaId }) => string;
let tone: Tone | null = null;
export const setSubjectTone = (f: Tone | null) => { tone = f; toned = null; };
/** A subject's (or a 教科's) color as the theme in use shows it. */
export const toneOf = (x: { c: string; area: AreaId }) => (tone ? tone(x) : x.c);
/** A 教科's color as the theme shows it (its first shade). */
export const areaTone = (id: AreaId) => toneOf({ c: area(id).c, area: id });

// The live list. The store keeps it in step (setSubjects) so subj() can be
// called anywhere, even outside React.
let current: Subject[] = SUBJ;
let toned: Subject[] | null = null;
export const setSubjects = (list: Subject[]) => { current = list; toned = null; };
/** Every subject, hidden ones included (charts still need their names and colors), in the theme's colors. */
export const allSubjects = () => {
  if (!tone) return current;
  if (!toned) toned = current.map((x) => ({ ...x, c: toneOf(x) }));
  return toned;
};
const GONE: Subject = { id: '?', name: '削除した科目', c: '#8C93A0', area: 'other' };
/**
 * 自習: studying started with no plan to hand (勉強を開始 when none's time
 * has come) — no subject yet. The subject, and what it was, are written when
 * it's recorded (the record page); until then it shows as 自習, in grey.
 */
export const FREE = '_free';
const FREE_SUBJECT: Subject = { id: FREE, name: '自習', c: '#8C93A0', area: 'other' };
/** A subject by id, with task always a string (subjects you add have none). */
export const subj = (id: string): Subject & { task: string } => {
  const x = current.find((s) => s.id === id) ?? (id === FREE ? FREE_SUBJECT : id === '?' ? GONE : { ...GONE, id });
  return { ...x, c: toneOf(x), task: x.task ?? '' };
};

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

/** A post on the timeline. `rec` attaches a study record (subject id, minutes). `mine` = written by you. */
export type Post = {
  id: string; n: string; h: string; c: string; m: string; w: string; t: string; tags: string[]; u: number; r: number;
  mine?: boolean; rec?: { s: string; min: number; note?: string };
};
export const POSTS: Post[] = [
  { id: 'p1', n: 'kaito', h: 'kaito', c: '#3E8C78', m: '高3', w: '8分前', t: '電磁気、名問の森で流れがやっとつかめてきた。コンデンサーはまだあやしい', tags: ['#物理'], u: 12, r: 2, rec: { s: 'ph', min: 70, note: '名問の森 15〜18' } },
  { id: 'p2', n: 'mio', h: 'mio.k', c: '#C47A55', m: '高3', w: '12分前', t: '古文の参考書、やっと1周。2周目は音読しながらやる', tags: ['#古文'], u: 23, r: 4 },
  { id: 'p3', n: 'nnn_0w0', h: 'nnn_0w0', c: '#8A8A8E', m: '浪人', w: '40分前', t: 'ベクトル全然わからん　内積のとこから誰か助けて', tags: [], u: 0, r: 1 },
  { id: 'p4', n: 'そら', h: 'sora_06', c: '#5D6DB8', m: '高3', w: '1時間前', t: '朝の数学おわり。例題60まで来た', tags: [], u: 31, r: 3, rec: { s: 'ma', min: 95, note: '青チャート 数III 例題52〜60' } },
  { id: 'p5', n: 'りん', h: 'rin_todai', c: '#4B7A3B', m: '東大 理一 1年（先輩）', w: '2時間前', t: '東大英語の要約(1A)は毎年出るので、過去問15年分を1日1題。要約したあと音読までやると、本番で時間が余った。量より回数。', tags: ['#東京大学', '#英語'], u: 128, r: 14 },
  { id: 'm1', n: 'はる', h: 'haru_study', c: '#6E56CF', m: '高3', w: '2時間前', t: '模試の偏差値、3か月で +6.6。数学の「次にやること」を毎回決めるようにしてから、机に向かうまでが早くなった。', tags: [], u: 54, r: 6, mine: true },
  { id: 'p6', n: 'taku', h: 'taku_1203', c: '#8A6D3B', m: '京大志望', w: '3時間前', t: 'もう無理、今日は寝る。明日5時起き', tags: [], u: 7, r: 2 },
  { id: 'p7', n: 'そら', h: 'sora_06', c: '#5D6DB8', m: '高3', w: '5時間前', t: '置換積分、何を t に置くかから説明してる15分の動画でやっとわかった。休憩中にちょうどいい長さ', tags: ['#数学', '#おすすめ動画'], u: 86, r: 9 },
  { id: 'p8', n: 'kaito', h: 'kaito', c: '#3E8C78', m: '高3', w: '昨日', t: '電磁気、エッセンスと名問の森どっちから入るのがいい？ 力学はエッセンスでなんとかなった', tags: ['#物理', '#質問'], u: 21, r: 17 },
  { id: 'm2', n: 'はる', h: 'haru_study', c: '#6E56CF', m: '高3', w: '昨日', t: '古文単語、朝の10分だけでも草が埋まるのがうれしい。', tags: [], u: 31, r: 1, mine: true, rec: { s: 'ja', min: 10, note: '古文単語 41〜60' } },
];

export type IconName = 'flag' | 'clock' | 'users' | 'bulb' | 'cal' | 'target' | 'userPlus';
export type Notif = {
  id: number; day: string; kind: '' | 'imp' | 'study'; icon: IconName; title: string; sub: string; time: string;
  cta?: string; join?: string; follow?: string;
  topic?: 'peers' | 'deadlines' | 'goal'; // which setting turns it off
};
export const NOTIFS: Notif[] = [
  { id: 1, day: '今日', kind: 'imp', icon: 'flag', title: '第4回 記述模試の申込締切まで あと2日', sub: '10月23日（金）23:59まで · 河合塾', cta: '申込ページを開く', time: '9:00', topic: 'deadlines' },
  { id: 2, day: '今日', kind: 'study', icon: 'clock', title: 'kaito が 物理 を始めました', sub: '東大 理一 2027 · いま5人が勉強中', join: 'kaito', time: '21:12', topic: 'peers' },
  { id: 3, day: '今日', kind: 'study', icon: 'userPlus', title: 'そら と mio が勉強を始めました', sub: '数学 · 英語 · まとめて表示しています', join: 'そら', time: '20:48', topic: 'peers' },
  { id: 4, day: '今日', kind: '', icon: 'bulb', title: 'あなたの投稿に「役に立った」が12件', sub: '「模試の偏差値、3か月で +6.6…」', time: '19:30' },
  { id: 5, day: '昨日', kind: '', icon: 'cal', title: '日曜もくもく会 に参加が決まりました', sub: '10月25日（日）9:00〜12:00 · 前日にお知らせします', time: '22:05' },
  { id: 6, day: '昨日', kind: 'imp', icon: 'target', title: '今週の英語がペースより遅れています', sub: '目標7時間のうち 6.5時間 · あと30分', cta: '英語を始める', time: '21:00', topic: 'goal' },
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

export type ChatMsg =
  | { kind: 'sys'; t: string; join?: string }
  | { kind: 'msg'; n: string; c: string; t: string }
  | { kind: 'me'; t: string }
  | { kind: 'stamp'; s: string; n?: string; c?: string } // n: sender (none = you)
  | { kind: 'card'; me: boolean; card: 'together' | 'goal'; joined?: string[] };

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
      { kind: 'stamp', s: 'ganbaro', n: 'mio', c: '#D9653B' },
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
    msgs: [{ kind: 'sys', t: 'れん が 世界史 を30分 記録しました' }, { kind: 'stamp', s: 'ohayo', n: 'れん', c: '#4B7A3B' }, { kind: 'msg', n: 'れん', c: '#4B7A3B', t: '今日は論述1題から' }],
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
// ---------- the sample account's past ----------
// Only the sample account starts with a history. One deterministic diary,
// counted back from the real today: lighter in spring, a family trip in the
// summer, a mock-exam week, longer weekends, one to three subjects a day, and a
// rest day 23 days ago so the streak reads 23 with today's study.
const SUBJ_IDS = ['en', 'ma', 'ph', 'ch', 'ja'];
const SUBJ_WEIGHT = [0.3, 0.3, 0.17, 0.13, 0.1];
/** What the sample records were about, per subject (as a plan's memo would say). */
const SUBJ_WHAT = [
  ['長文読解', '英単語', '英文法', 'リスニング'],
  ['数III 微分', 'ベクトル', '確率', '整数'],
  ['相対性理論', '電磁気', '波動', '力学'],
  ['有機 構造決定', '理論 化学平衡', '無機'],
  ['古文単語', '漢文 句法', '現代文 評論'],
];
export const DEMO_STREAK_GAP = 23;
export function demoHistory(now: Date): { s: string; min: number; daysAgo: number; at: string; what: string }[] {
  const out: { s: string; min: number; daysAgo: number; at: string; what: string }[] = [];
  for (let daysAgo = 2; daysAgo < 365; daysAgo++) {
    const r = rng(2026 + daysAgo * 7919);
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const rest = daysAgo === DEMO_STREAK_GAP || (daysAgo > DEMO_STREAK_GAP && (r() < 0.13 || (daysAgo >= 61 && daysAgo <= 66)));
    if (rest) continue;
    let min = weekend ? 140 + r() * 200 : 50 + r() * 150;
    if (daysAgo > 150) min *= 0.55 + r() * 0.2; // still building the habit in spring
    if (daysAgo >= 16 && daysAgo <= 19) min += 70; // the week before the mock exam
    min = Math.round(min / 5) * 5 + (r() < 0.4 ? 3 : 0);
    // 1–3 subjects, weighted, without repeats
    const k = 1 + (r() < 0.6 ? 1 : 0) + (weekend && r() < 0.5 ? 1 : 0);
    const pool = SUBJ_WEIGHT.map((w, idx) => ({ w: w * (0.5 + r()), idx })).sort((a, b) => b.w - a.w).slice(0, k);
    const tot = pool.reduce((a, b) => a + b.w, 0);
    let left = min;
    let hour = weekend ? 9 : 17;
    pool.forEach((p, n) => {
      const m = n === pool.length - 1 ? left : Math.round(((p.w / tot) * min) / 5) * 5;
      left -= m;
      const topics = SUBJ_WHAT[p.idx];
      if (m > 0) out.push({ s: SUBJ_IDS[p.idx], min: m, daysAgo, at: `${hour}:${n % 2 ? '30' : '00'}`, what: topics[Math.floor(r() * topics.length)] });
      hour += Math.max(1, Math.round(m / 60));
    });
  }
  return out;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const hms = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(Math.floor(s) % 60)}`;
export const hm = (min: number) => `${Math.floor(min / 60)}時間${pad(min % 60)}分`;
