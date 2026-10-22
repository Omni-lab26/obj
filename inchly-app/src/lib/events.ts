import { Rec } from './history';
import { addDays, dateKey, mondayIndex } from './time';

// Limited-time challenges, renewed every week (Monday to Sunday). Progress is
// read from your records; the reward is paid once per week.

export type GameEvent = { id: string; key: string; name: string; how: string; cur: number; tot: number; unit: string; coin: number; ends: string; sticker: string };

export function eventsOf(recs: readonly (Rec & { at: string })[], now: Date = new Date()): GameEvent[] {
  const today = dateKey(now);
  const monday = addDays(today, -mondayIndex(now));
  const sunday = addDays(monday, 6);
  const sat = addDays(monday, 5);
  const week = recs.filter((r) => r.date >= monday && r.date <= sunday);
  const weekend = week.filter((r) => r.date >= sat).reduce((a, r) => a + r.min, 0);
  const early = week.filter((r) => {
    const [h, m] = r.at.split(':').map(Number);
    return h * 60 + (m || 0) - r.min < 7 * 60;
  }).length;
  const days = new Set(week.map((r) => r.date)).size;
  return [
    { id: 'weekend10', key: `weekend10:${monday}`, name: '週末10時間チャレンジ', how: '今週の土日で合計10時間', cur: Math.min(600, weekend) / 60, tot: 10, unit: '時間', coin: 300, ends: sunday, sticker: 'flag' },
    { id: 'morning5', key: `morning5:${monday}`, name: '朝活ウィーク', how: '今週、7時までに5回始める', cur: Math.min(5, early), tot: 5, unit: '回', coin: 200, ends: sunday, sticker: 'sun' },
    { id: 'every7', key: `every7:${monday}`, name: '毎日机に向かう週', how: '今週7日すべて勉強する', cur: days, tot: 7, unit: '日', coin: 250, ends: sunday, sticker: 'cal' },
  ];
}
