import { dateKey, mondayIndex } from './time';

// The timetable: what you plan to study and when it starts ("19:00 から 数学").
// A plan runs until the next one starts — there's no end to set; the timer
// just measures, and goes on past the next start until you stop it (the next
// plan's notification still comes). Older plans may carry a length, or no
// time at all, or repeat on weekdays. Pure functions, so the study page and
// its tests read them the same way.

/**
 * days: 0 = Monday … 6 = Sunday. start: 'H:MM' (older plans may have none).
 * min: 0 — it runs until the next plan starts (older plans: their length). date: 'YYYY-MM-DD' for a plan on that one day only
 * (days is then ignored). note: a memo written with it. icon: a photo picked for it (see lib/planIcon); none draws the subject's color and initial.
 */
export type Block = { id: string; s: string; t?: string; start?: string; min: number; days: number[]; date?: string; note?: string; icon?: string };
/** Plans with no time go after the timed ones. */
const startOf = (b: Block) => (b.start ? toMin(b.start) : 24 * 60);

/** Whether a block happens on this day: its own date, else its weekdays. */
export const isOn = (b: Block, d: Date) => (b.date ? b.date === dateKey(d) : b.days.includes(mondayIndex(d)));

export const toMin = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const toClock = (min: number) => `${Math.floor(min / 60) % 24}:${String(min % 60).padStart(2, '0')}`;
/** Where a plan with a length ends, '翌1:00' past midnight; '' for one that runs until the next. */
export const endOf = (b: Block) => (b.start && b.min ? `${toMin(b.start) + b.min >= 24 * 60 ? '翌' : ''}${toClock(toMin(b.start) + b.min)}` : '');

/** The blocks that fall on `now`'s weekday, earliest first. */
export function blocksOn(blocks: readonly Block[], now: Date = new Date()): Block[] {
  return blocks.filter((b) => isOn(b, now)).sort((a, b) => startOf(a) - startOf(b));
}

/** The one-day plans set on a date, earliest first (the calendar's dots). */
export const plansOn = (blocks: readonly Block[], d: Date) => blocks.filter((b) => b.date === dateKey(d)).sort((a, b) => startOf(a) - startOf(b));

export type Slot = { block: Block; state: 'past' | 'now' | 'next' | 'later' };

/** The timed plan after this one on that day, if any. */
export function nextOf(blocks: readonly Block[], b: Block, day: Date): Block | undefined {
  if (!b.start) return undefined;
  const a = toMin(b.start);
  return blocksOn(blocks, day).find((x) => x.id !== b.id && !!x.start && toMin(x.start) > a);
}
/** Where a plan ends, in minutes: its length if it has one, else where the next plan starts (else midnight). */
export function spanEnd(blocks: readonly Block[], b: Block, day: Date): number {
  const a = b.start ? toMin(b.start) : 0;
  if (b.min) return a + b.min;
  const n = nextOf(blocks, b, day);
  return n?.start ? toMin(n.start) : 24 * 60;
}

/** Today's blocks, each marked past / now / next / later against the clock (a plan with no time is always 'later'). */
export function slotsOf(blocks: readonly Block[], now: Date = new Date()): Slot[] {
  const t = now.getHours() * 60 + now.getMinutes();
  let nextGiven = false;
  return blocksOn(blocks, now).map((block) => {
    if (!block.start) return { block, state: 'later' as const };
    const a = toMin(block.start), z = spanEnd(blocks, block, now);
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

/**
 * The day's plans as the timer's cards: first the ones already under way or
 * done but not recorded (`held`, in the order they were stopped, then the
 * one running) — these can't be moved — then the rest, in the order you put
 * them (`order`) or else by time. Plans finished for the day (`done`) are gone.
 */
export function deckOf(x: { blocks: readonly Block[]; day: Date; done: ReadonlySet<string>; held: readonly string[]; live: string | null; order?: readonly string[] }): { list: Block[]; locked: number } {
  const byId = new Map(x.blocks.map((b) => [b.id, b]));
  const first = [...x.held, ...(x.live ? [x.live] : [])].filter((id, i, a) => a.indexOf(id) === i).map((id) => byId.get(id)).filter((b): b is Block => !!b);
  const pinned = new Set(first.map((b) => b.id));
  const rest = blocksOn(x.blocks, x.day).filter((b) => !x.done.has(b.id) && !pinned.has(b.id));
  if (x.order?.length) {
    const at = (b: Block) => { const i = x.order!.indexOf(b.id); return i < 0 ? Infinity : i; };
    rest.sort((a, b) => at(a) - at(b) || startOf(a) - startOf(b));
  }
  return { list: [...first, ...rest], locked: first.length };
}
