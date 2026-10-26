import { dateKey, mondayIndex } from './time';

// The timetable: what you plan to study on a day from the calendar, by the
// clock if you like ("19:00 から 60分 数学") or with no time at all. Older plans
// may repeat on weekdays. Pure functions, so the study page and its tests read
// them the same way.

/**
 * days: 0 = Monday … 6 = Sunday. start: 'H:MM', or none for a plan with no
 * time (min is then 0). date: 'YYYY-MM-DD' for a plan on that one day only
 * (days is then ignored). note: a memo written with it.
 */
export type Block = { id: string; s: string; t?: string; start?: string; min: number; days: number[]; date?: string; note?: string };
/** Plans with no time go after the timed ones. */
const startOf = (b: Block) => (b.start ? toMin(b.start) : 24 * 60);

/** Whether a block happens on this day: its own date, else its weekdays. */
export const isOn = (b: Block, d: Date) => (b.date ? b.date === dateKey(d) : b.days.includes(mondayIndex(d)));

export const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toClock = (min: number) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')}`;
export const endOf = (b: Block) => (b.start ? toClock(toMin(b.start) + b.min) : '');

/** The blocks that fall on `now`'s weekday, earliest first. */
export function blocksOn(blocks: readonly Block[], now: Date = new Date()): Block[] {
  return blocks.filter((b) => isOn(b, now)).sort((a, b) => startOf(a) - startOf(b));
}

/** The one-day plans set on a date, earliest first (the calendar's dots). */
export const plansOn = (blocks: readonly Block[], d: Date) => blocks.filter((b) => b.date === dateKey(d)).sort((a, b) => startOf(a) - startOf(b));

export type Slot = { block: Block; state: 'past' | 'now' | 'next' | 'later' };

/** Today's blocks, each marked past / now / next / later against the clock (a plan with no time is always 'later'). */
export function slotsOf(blocks: readonly Block[], now: Date = new Date()): Slot[] {
  const t = now.getHours() * 60 + now.getMinutes();
  let nextGiven = false;
  return blocksOn(blocks, now).map((block) => {
    if (!block.start) return { block, state: 'later' as const };
    const a = toMin(block.start), z = a + block.min;
    if (t >= z) return { block, state: 'past' as const };
    if (t >= a) return { block, state: 'now' as const };
    if (!nextGiven) { nextGiven = true; return { block, state: 'next' as const }; }
    return { block, state: 'later' as const };
  });
}

/** What to suggest starting: the block under way, else the next one today. */
export function suggestion(blocks: readonly Block[], now: Date = new Date()): Slot | null {
  const s = slotsOf(blocks, now);
  return s.find((x) => x.state === 'now') ?? s.find((x) => x.state === 'next') ?? null;
}

/** Minutes until a block starts (negative once it has begun). */
export const minutesUntil = (b: Block, now: Date = new Date()) => (b.start ? toMin(b.start) - (now.getHours() * 60 + now.getMinutes()) : 0);
