import { dateKey, mondayIndex } from './time';

// The timetable: blocks of study you plan by the clock ("19:00 から 60分 数学"),
// repeating on the weekdays you pick, or set on one day from the calendar.
// Pure functions, so the study page and its tests read them the same way.

/** days: 0 = Monday … 6 = Sunday. start: 'H:MM'. date: 'YYYY-MM-DD' for a plan on that one day only (days is then ignored). */
export type Block = { id: string; s: string; t?: string; start: string; min: number; days: number[]; date?: string };

/** Whether a block happens on this day: its own date, else its weekdays. */
export const isOn = (b: Block, d: Date) => (b.date ? b.date === dateKey(d) : b.days.includes(mondayIndex(d)));

export const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toClock = (min: number) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')}`;
export const endOf = (b: Block) => toClock(toMin(b.start) + b.min);

/** The blocks that fall on `now`'s weekday, earliest first. */
export function blocksOn(blocks: readonly Block[], now: Date = new Date()): Block[] {
  return blocks.filter((b) => isOn(b, now)).sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** The one-day plans set on a date, earliest first (the calendar's dots). */
export const plansOn = (blocks: readonly Block[], d: Date) => blocks.filter((b) => b.date === dateKey(d)).sort((a, b) => toMin(a.start) - toMin(b.start));

export type Slot = { block: Block; state: 'past' | 'now' | 'next' | 'later' };

/** Today's blocks, each marked past / now / next / later against the clock. */
export function slotsOf(blocks: readonly Block[], now: Date = new Date()): Slot[] {
  const t = now.getHours() * 60 + now.getMinutes();
  let nextGiven = false;
  return blocksOn(blocks, now).map((block) => {
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
export const minutesUntil = (b: Block, now: Date = new Date()) => toMin(b.start) - (now.getHours() * 60 + now.getMinutes());
