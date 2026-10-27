// What you've written as what you studied (a record's contents, a plan's memo
// or やること), offered again as you type, so the same thing is written the
// same way each time — 相対性理論, not 相対論 one day and 相対性理論 the next
// — and adds up as one in a chart's breakdown.

type Rec = { s: string; what?: string };
type Plan = { s: string; t?: string; note?: string };

/**
 * Past contents to offer: those that contain what's typed (all of them while
 * nothing is), the subject's own first, then the most written; never what's
 * already typed exactly.
 */
export function pastContents(recs: readonly Rec[], plans: readonly Plan[], s: string | null, typed: string, max = 6): string[] {
  const seen = new Map<string, { n: number; mine: boolean }>();
  const add = (text: string | undefined, of: string) => {
    const w = text?.trim();
    if (!w) return;
    const x = seen.get(w) ?? { n: 0, mine: false };
    x.n += 1;
    if (s && of === s) x.mine = true;
    seen.set(w, x);
  };
  for (const r of recs) add(r.what, r.s);
  for (const p of plans) { add(p.note, p.s); add(p.t, p.s); }
  const q = typed.trim().toLowerCase();
  return [...seen]
    .filter(([w]) => w.toLowerCase() !== q && (!q || w.toLowerCase().includes(q)))
    .sort(([, a], [, b]) => Number(b.mine) - Number(a.mine) || b.n - a.n)
    .slice(0, max)
    .map(([w]) => w);
}
