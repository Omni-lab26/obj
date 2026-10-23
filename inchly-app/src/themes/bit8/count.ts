// 8bit's arithmetic and words, with nothing else imported, so they can be tested:
// minutes as blocks for the gauges and the stair-step chart, and what the
// message window says about the day.

/** A color with alpha, from #RRGGBB. */
export const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** Minutes in words the way the windows say them: '2時間45分', '45分', '0分'. */
export const say = (min: number) => {
  const m = Math.max(0, Math.round(min));
  return m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`;
};

/**
 * Minutes as `unit`-minute blocks, part after part (the live part last), each
 * in its color. `up`: a column of the chart, where any minutes show as a block
 * (the total rounded up); otherwise a gauge, which fills only whole blocks.
 */
export type Brick = { c: string; live?: boolean };
export function bricks(parts: { c: string; min: number }[], live: number, liveColor: string, unit: number, up = true): Brick[] {
  const out: Brick[] = [];
  let acc = 0;
  const at = (m: number) => (up ? Math.ceil(m / unit - 1e-9) : Math.floor(m / unit + 1e-9));
  const add = (min: number, c: string, isLive?: boolean) => {
    const n = at(acc + min) - at(acc);
    for (let i = 0; i < n; i++) out.push({ c, live: isLive });
    acc += min;
  };
  for (const p of parts) if (p.min > 0) add(p.min, p.c);
  if (live > 0) add(live, liveColor, true);
  return out;
}
/** A block size (in minutes, a multiple of 5) so the tallest column fits in `rows` blocks. */
export const unitFor = (max: number, rows: number) => Math.max(5, Math.ceil(max / rows / 5) * 5);

/** What the message window says about the day, a page (one or two lines) at a time. */
export function messagePages(x: {
  name: string; running: boolean; paused: boolean; subject: string; min: number; goal: number; streak: number; next?: string;
}): string[] {
  const pages: string[] = [];
  const left = Math.max(0, x.goal - x.min);
  if (x.running) pages.push(x.paused ? `${x.name}は ひとやすみ している。\n${x.subject}は とちゅうのまま。` : `${x.name}は ${x.subject}を 勉強している！\nこのちょうしで いこう。`);
  if (x.min >= x.goal && x.goal > 0) pages.push(`もくひょうの ${say(x.goal)}を たっせいした！\nきょうは ${say(x.min)} 勉強した。`);
  else if (x.min > 0) pages.push(`きょうは ${say(x.min)} 勉強した。\nもくひょうまで あと ${say(left)}。`);
  else if (!x.running) pages.push(`${x.name}の きょうが はじまった。\nまずは 5分だけ やってみよう。`);
  if (x.streak >= 2) pages.push(`${x.streak}日 れんぞくで つづけている！`);
  if (!x.running && x.next) pages.push(`つぎは ${x.next}。\n▶ はじめる で スタート！`);
  return pages;
}
