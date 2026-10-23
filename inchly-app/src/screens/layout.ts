import type { IconName } from '../ui/Icon';

// The base layout, in one place. Every theme draws from these lists, so a
// change here (a new section, a different order, another tab) reaches every
// theme: a theme decides how each piece looks — and may rearrange them — but
// it never owns the list.

// ---------- home ----------
/** The sections the home screen is made of. */
export type SectionKind = 'today' | 'chart' | 'now' | 'streak' | 'todos' | 'deadlines' | 'peers';
/** A theme's own extra section (drawn only by that theme), e.g. 'x:ticker'. */
export type ExtraKind = `x:${string}`;
export type Kind = SectionKind | ExtraKind;
/**
 * One block of a screen: a section, or sections that belong together (drawn as
 * one unit — a card, a panel, a window). `row` puts them side by side.
 */
export type Block = { id: string; sections: Kind[]; row?: boolean };

/** The home screen, top to bottom. The header sits above it and stays put. */
export const HOME: Block[] = [
  { id: 'today', sections: ['today', 'chart', 'now'] },
  { id: 'streak', sections: ['streak'] },
  { id: 'todos', sections: ['todos'] },
  { id: 'deadlines', sections: ['deadlines'] },
  { id: 'peers', sections: ['peers'] },
];

/**
 * A theme's arrangement, made safe against changes to the base: the blocks
 * the theme lists come in its order (minus sections the base no longer has,
 * and any it lists twice); a base section it doesn't mention is kept, placed
 * after the rest of its base block — or, if the theme kept none of it, after
 * the nearest base block before it.
 */
export function arrange(base: Block[], mine?: (base: Block[]) => Block[]): Block[] {
  if (!mine) return base;
  const has = new Set(base.flatMap((b) => b.sections));
  const seen = new Set<Kind>();
  const out = mine(base)
    .map((b) => ({ ...b, sections: b.sections.filter((k) => (k.startsWith('x:') || has.has(k)) && !seen.has(k) && !!seen.add(k)) }))
    .filter((b) => b.sections.length);
  /** the last output block holding any of these sections (-1: none) */
  const lastWith = (ks: Kind[]) => {
    let at = -1;
    out.forEach((o, n) => { if (o.sections.some((k) => ks.includes(k))) at = n; });
    return at;
  };
  base.forEach((b, i) => {
    const missing = b.sections.filter((k) => !seen.has(k));
    if (!missing.length) return;
    let at = lastWith(b.sections);
    for (let j = i - 1; j >= 0 && at < 0; j--) at = lastWith(base[j].sections);
    out.splice(at + 1, 0, { id: `${b.id}+`, sections: missing, row: b.row });
    missing.forEach((k) => seen.add(k));
  });
  return out;
}

// ---------- timer ----------
/** The parts of the timer screen. */
export type TimerPart = 'top' | 'subject' | 'switcher' | 'readout' | 'progress' | 'today' | 'main' | 'record';
/** The timer in three zones: along the top, in the middle, along the bottom. */
export type Zone = 'head' | 'center' | 'foot';
export type Zones = Record<Zone, (TimerPart | ExtraKind)[]>;
export const TIMER: Zones = {
  head: ['top', 'subject', 'switcher'],
  center: ['readout', 'progress', 'today', 'main'],
  foot: ['record'],
};
const ZONES: Zone[] = ['head', 'center', 'foot'];
/** A theme's zones, made safe the same way: a base part it leaves out stays in its base zone, after the part before it. */
export function arrangeZones(base: Zones, mine?: (base: Zones) => Zones): Zones {
  if (!mine) return base;
  const has = new Set(ZONES.flatMap((z) => base[z]));
  const m = mine(base);
  const seen = new Set<string>();
  const out = {} as Zones;
  for (const z of ZONES) out[z] = (m[z] ?? []).filter((p) => (p.startsWith('x:') || has.has(p)) && !seen.has(p) && !!seen.add(p));
  for (const z of ZONES) {
    base[z].forEach((p, i) => {
      if (seen.has(p)) return;
      const prev = base[z].slice(0, i).reverse().find((q) => out[z].includes(q));
      out[z].splice(prev ? out[z].indexOf(prev) + 1 : 0, 0, p);
      seen.add(p);
    });
  }
  return out;
}

// ---------- tabs ----------
/** The tabs, left to right. 'study' is the middle one (it shows the running minutes). */
export const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'ホーム', icon: 'home' },
  { name: 'timeline', label: 'タイムライン', icon: 'feed' },
  { name: 'study', label: '勉強', icon: 'play' },
  { name: 'community', label: 'みんな', icon: 'users' },
  { name: 'me', label: 'マイページ', icon: 'user' },
];
