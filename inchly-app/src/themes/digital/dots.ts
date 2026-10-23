// How minutes become lit dots and cells on the デジタル app's displays. Plain
// numbers (no React), so it's tested.

type Part = { c: string; min: number };

const colorAt = (parts: Part[], at: number) => {
  let acc = 0;
  for (const p of parts) { acc += p.min; if (at < acc) return p.c; }
  return parts[parts.length - 1]?.c ?? null;
};

/**
 * The dots one column lights for some minutes split by subject, bottom up:
 * one per `unit` minutes (at least one for any time at all, at most `rows`),
 * each in the color of the subject at its middle.
 */
export function litDots(parts: Part[], unit: number, rows: number): string[] {
  const total = parts.reduce((a, p) => a + p.min, 0);
  if (total <= 0 || unit <= 0) return [];
  const n = Math.min(rows, Math.max(1, Math.round(total / unit)));
  return Array.from({ length: n }, (_, k) => colorAt(parts, ((k + 0.5) / n) * total) as string);
}

/** The dots the session under way adds on top: one per `unit` minutes, at least one, within the room left. */
export const liveDots = (live: number, unit: number, room: number) => (live > 0 && unit > 0 ? Math.max(0, Math.min(room, Math.max(1, Math.round(live / unit)))) : 0);

/** A bar of `n` cells toward the goal, each in the color of the subject that filled it (null: not yet). */
export function meter(parts: Part[], goal: number, n: number): (string | null)[] {
  const total = parts.reduce((a, p) => a + p.min, 0);
  const per = Math.max(1, goal) / n;
  return Array.from({ length: n }, (_, i) => {
    const mid = (i + 0.5) * per;
    return mid < total ? colorAt(parts, mid) : null;
  });
}
