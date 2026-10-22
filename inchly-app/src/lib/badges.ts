import { byDay, Rec, SUBJECT_IDS } from './history';
import { addDays, dateKey, parseKey } from './time';

// Badges, earned from your own records. Each has a rarity (how hard it is),
// a category, and progress toward it, all computed here from the data, so a
// badge can never say "earned" for something that didn't happen.

export type Rarity = 'common' | 'rare' | 'epic' | 'legend';
export type Badge = {
  id: string; cat: string; name: string; how: string; sticker: string; rarity: Rarity;
  cur: number; tot: number; got: boolean;
};

export type BadgeInput = {
  sessions: readonly (Rec & { at: string })[];
  restDays: readonly string[];
  goalMin: number;
  todosDone: number;
  following: number;
  posts: number;
  helpfulReceived: number;
  groupsJoined: number;
  now?: Date;
};

/** Facts about your history the badges need. */
export function statsOf(x: BadgeInput) {
  const days = byDay(x.sessions);
  const keys = [...days.keys()].sort();
  const set = new Set(keys);
  const rest = new Set(x.restDays);
  const totalMin = x.sessions.reduce((a, r) => a + r.min, 0);
  // the longest run ever, rest-ticket days bridging gaps
  let best = 0, run = 0, prev = '';
  const timeline = [...new Set([...keys, ...x.restDays])].sort();
  for (const k of timeline) {
    run = prev && addDays(prev, 1) === k ? run : 0;
    if (set.has(k)) run += 1;
    else if (!rest.has(k)) run = 0;
    best = Math.max(best, run);
    prev = k;
  }
  const startMin = (r: { at: string; min: number }) => {
    const [h, m] = r.at.split(':').map(Number);
    return Number.isFinite(h) ? h * 60 + (m || 0) - r.min : NaN;
  };
  const bySubj = SUBJECT_IDS.map((id) => x.sessions.filter((r) => r.s === id).reduce((a, r) => a + r.min, 0));
  const now = x.now ?? new Date();
  const last7 = new Set(x.sessions.filter((r) => r.date > addDays(dateKey(now), -7)).map((r) => r.s));
  // most study days within any calendar month
  const perMonth = new Map<string, number>();
  for (const k of keys) perMonth.set(k.slice(0, 7), (perMonth.get(k.slice(0, 7)) ?? 0) + 1);
  // the last 17 weeks, day by day
  let wall = 0;
  for (let i = 0; i < 17 * 7; i++) if (set.has(addDays(dateKey(now), -i))) wall += 1;
  return {
    totalH: totalMin / 60,
    bestStreak: best,
    bestDay: Math.max(0, ...[...days.values()].map((d) => d.min)),
    goalDays: [...days.values()].filter((d) => d.min >= x.goalMin).length,
    longDays: [...days.values()].filter((d) => d.min >= 240).length,
    early: x.sessions.filter((r) => startMin(r) < 7 * 60).length,
    lunch: x.sessions.filter((r) => { const s = startMin(r); return s >= 12 * 60 && s < 13 * 60 && r.min >= 15; }).length,
    sundayMorning: x.sessions.filter((r) => parseKey(r.date).getDay() === 0 && startMin(r) < 9 * 60).length,
    subjH: bySubj.map((m) => m / 60),
    weakest: Math.min(...bySubj) / 60,
    subjectsThisWeek: last7.size,
    bestMonth: Math.max(0, ...perMonth.values()),
    wall,
    april1: keys.some((k) => k.endsWith('-04-01')),
    newYear: x.sessions.some((r) => r.date.endsWith('-12-31') && startMin(r) + r.min >= 23 * 60),
    records: x.sessions.length,
  };
}

type Def = [id: string, cat: string, name: string, how: string, sticker: string, rarity: Rarity, cur: (s: ReturnType<typeof statsOf>, x: BadgeInput) => number, tot: number];

const DEFS: Def[] = [
  ['first', '特別', '最初の記録', 'はじめて記録する', 'pencil', 'common', (s) => s.records, 1],
  ['h1', '時間', 'はじめの1時間', '合計1時間', 'clap', 'common', (s) => s.totalH, 1],
  ['h10', '時間', '10時間', '合計10時間', 'trophy', 'common', (s) => s.totalH, 10],
  ['h50', '時間', '50時間', '合計50時間', 'trophy', 'common', (s) => s.totalH, 50],
  ['h100', '時間', '100時間', '合計100時間', 'trophy', 'rare', (s) => s.totalH, 100],
  ['h300', '時間', '300時間', '合計300時間', 'trophy', 'rare', (s) => s.totalH, 300],
  ['h500', '時間', '500時間', '合計500時間', 'trophy', 'epic', (s) => s.totalH, 500],
  ['h700', '時間', '700時間', '合計700時間', 'trophy', 'epic', (s) => s.totalH, 700],
  ['h1000', '時間', '1000時間', '合計1000時間', 'sparkle', 'legend', (s) => s.totalH, 1000],
  ['s3', '連続', '3日連続', '3日続けて勉強する', 'fire', 'common', (s) => s.bestStreak, 3],
  ['s7', '連続', '7日連続', '7日続けて勉強する', 'fire', 'common', (s) => s.bestStreak, 7],
  ['s14', '連続', '14日連続', '14日続けて', 'fire', 'rare', (s) => s.bestStreak, 14],
  ['s21', '連続', '21日連続', '21日続けて', 'fire', 'rare', (s) => s.bestStreak, 21],
  ['s30', '連続', '30日連続', '30日続けて', 'fire', 'epic', (s) => s.bestStreak, 30],
  ['s100', '連続', '100日連続', '100日続けて', 'fire', 'legend', (s) => s.bestStreak, 100],
  ['d3', '1日', '1日3時間', '1日で3時間', 'star', 'common', (s) => s.bestDay / 60, 3],
  ['d5', '1日', '1日5時間', '1日で5時間', 'star', 'rare', (s) => s.bestDay / 60, 5],
  ['d8', '1日', '1日8時間', '1日で8時間', 'star', 'epic', (s) => s.bestDay / 60, 8],
  ['goal7', '1日', '目標を7日達成', '1日の目標を7日', 'target', 'rare', (s) => s.goalDays, 7],
  ['goal30', '1日', '目標を30日達成', '1日の目標を30日', 'target', 'epic', (s) => s.goalDays, 30],
  ['early10', '時間帯', '朝勉 10回', '7時までに始める', 'sun', 'rare', (s) => s.early, 10],
  ['early50', '時間帯', '朝型の人', '7時までに50回', 'sun', 'epic', (s) => s.early, 50],
  ['lunch', '時間帯', '昼休みの15分', '12時台に15分以上', 'coffee', 'common', (s) => s.lunch, 1],
  ['sunday', '時間帯', '日曜の朝', '日曜の9時までに始める', 'sun', 'common', (s) => s.sundayMorning, 1],
  ['en50', '科目', '英語 50時間', '英語を合計50時間', 'book', 'rare', (s) => s.subjH[0], 50],
  ['ma50', '科目', '数学 50時間', '数学を合計50時間', 'book', 'rare', (s) => s.subjH[1], 50],
  ['ph30', '科目', '物理 30時間', '物理を合計30時間', 'book', 'common', (s) => s.subjH[2], 30],
  ['ch30', '科目', '化学 30時間', '化学を合計30時間', 'book', 'common', (s) => s.subjH[3], 30],
  ['ja30', '科目', '国語 30時間', '国語を合計30時間', 'book', 'common', (s) => s.subjH[4], 30],
  ['all5', '科目', '5科目そろい', '7日のうちに5科目すべて', 'sparkle', 'epic', (s) => s.subjectsThisWeek, 5],
  ['weak', '科目', '苦手も20時間', 'いちばん少ない科目も20時間', 'target', 'rare', (s) => s.weakest, 20],
  ['todo10', 'ToDo', 'ToDo 10個', 'ToDoを10個完了', 'done', 'common', (_, x) => x.todosDone, 10],
  ['todo100', 'ToDo', 'ToDo 100個', 'ToDoを100個完了', 'done', 'rare', (_, x) => x.todosDone, 100],
  ['todo500', 'ToDo', 'ToDo 500個', 'ToDoを500個完了', 'done', 'legend', (_, x) => x.todosDone, 500],
  ['follow5', '仲間', '仲間が5人', '5人フォローする', 'person', 'common', (_, x) => x.following, 5],
  ['post1', '仲間', 'はじめての投稿', '1回投稿する', 'chat', 'common', (_, x) => x.posts, 1],
  ['helpful50', '仲間', '役に立った 50', '投稿に「役に立った」が50', 'heart', 'rare', (_, x) => x.helpfulReceived, 50],
  ['group', '仲間', 'グループの一員', 'グループに参加する', 'person', 'common', (_, x) => x.groupsJoined, 1],
  ['month20', '草', '草 20日', '1か月に20日勉強', 'globe', 'common', (s) => s.bestMonth, 20],
  ['month30', '草', '草 毎日', '1か月すべての日に勉強', 'globe', 'epic', (s) => s.bestMonth, 30],
  ['deep10', '草', '濃い草 10日', '4時間以上の日を10日', 'globe', 'rare', (s) => s.longDays, 10],
  ['wall', '草', '草の壁', '17週間すべての日に勉強', 'globe', 'legend', (s) => s.wall, 119],
  ['april1', '季節', '桜の日', '4月1日に勉強', 'flag', 'common', (s) => (s.april1 ? 1 : 0), 1],
  ['newyear', '季節', '年越し勉強', '大みそかの23時台まで勉強', 'moon', 'epic', (s) => (s.newYear ? 1 : 0), 1],
];

export function badgesOf(x: BadgeInput): Badge[] {
  const s = statsOf(x);
  return DEFS.map(([id, cat, name, how, sticker, rarity, f, tot]) => {
    const cur = Math.min(tot, Math.floor(f(s, x) * 10) / 10);
    return { id, cat, name, how, sticker, rarity, cur, tot, got: cur >= tot };
  });
}

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'コモン', color: '#7C879A' },
  rare: { label: 'レア', color: '#F07B1D' },
  epic: { label: 'エピック', color: '#8B5CF6' },
  legend: { label: 'レジェンド', color: '#D99A00' },
};
