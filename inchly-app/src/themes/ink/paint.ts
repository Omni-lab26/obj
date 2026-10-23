// インク: the colors, and the splats every piece is drawn with. Shapes come
// from a seed, so the same thing is always splashed the same way. (No React
// Native here, so the painting can be tested.)

export const INK = {
  pink: '#FF3E8A',
  yellow: '#FFE03A',
  blue: '#3A5BFF',
  orange: '#FF7A00',
  purple: '#9B4DFF',
  cyan: '#28C8F0',
  black: '#0E0E0E',
  asphalt: '#161616',
  white: '#FFFFFF',
};
/** A hard drop shadow, like a sticker lifted off the asphalt. */
export const HARD = '3px 4px 0px rgba(0,0,0,0.5)';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
/** Numbers in [0, 1) that are the same every time for the same seed. */
export function rng(seed: string | number) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (v: number) => v.toFixed(1);
/** A smooth closed path through the points (Catmull-Rom as cubic Béziers). */
function closed(pts: [number, number][]) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

/** A splat of radius about r around (cx, cy): a wobbly blob with a few bulges. */
export function splatPath(cx: number, cy: number, r: number, seed: string | number, o: { points?: number; wobble?: number; bulges?: number } = {}) {
  const rnd = rng(seed);
  const n = o.points ?? 11, wob = o.wobble ?? 0.14, bul = o.bulges ?? 0.3;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = ((i + (rnd() - 0.5) * 0.4) / n) * Math.PI * 2;
    let k = 1 + (rnd() - 0.5) * 2 * wob;
    if (rnd() < bul) k *= 1.12 + rnd() * 0.16;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]);
  }
  return closed(pts);
}

/** Droplets thrown around a splat of radius r. */
export function drops(cx: number, cy: number, r: number, seed: string | number, count = 5) {
  const rnd = rng(`${seed}:drops`);
  return Array.from({ length: count }, () => {
    const a = rnd() * Math.PI * 2, d = r * (1.2 + rnd() * 0.4);
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: r * (0.06 + rnd() * 0.08) };
  });
}

/** A w × h blob that stays inside its box: a rounded rectangle with wobbly, hand-painted edges. */
export function blobRect(w: number, h: number, seed: string | number, wob = 3) {
  const rnd = rng(seed);
  const n = Math.max(18, Math.round((w + h) / 14));
  const a = w / 2 - wob - 1, b = h / 2 - wob - 1;
  const e = 2 / 5; // superellipse exponent: rounded-rectangle corners
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = a * Math.sign(c) * Math.abs(c) ** e, y = b * Math.sign(s) * Math.abs(s) ** e;
    const len = Math.hypot(x, y) || 1, j = (rnd() - 0.5) * 2 * wob;
    pts.push([w / 2 + x + (x / len) * j, h / 2 + y + (y / len) * j]);
  }
  return closed(pts);
}

/** A subject's ink: its color, lifted when it would sink into the asphalt. */
export function inky(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  if (Number.isNaN(n)) return INK.pink;
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.3) return hex;
  const k = 0.45; // mix toward white
  const m = (c: number) => Math.round(c + (255 - c) * k).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

// ---------- the turf: today, painted ----------
/** Minutes in one color; `live` of them are still wet (the session under way). */
export type TurfPart = { id: string; c: string; min: number; live?: number };
export type TurfCell = { i: number; x: number; y: number; c: string; live: boolean };

/**
 * Paints the day onto a cols × rows turf: the goal covers it all; each part
 * grows its own blob from a seed of its own, in proportion to its minutes.
 * The cells a part takes last are its wet ones.
 */
export function paintTurf(cols: number, rows: number, parts: TurfPart[], goal: number): { cells: TurfCell[]; covered: number; total: number } {
  const total = Math.max(0, cols * rows);
  const list = parts.filter((p) => p.min > 0);
  const sum = list.reduce((a, p) => a + p.min, 0);
  if (!total || sum <= 0) return { cells: [], covered: 0, total };
  const covered = Math.min(total, Math.max(1, Math.round((sum / Math.max(1, goal)) * total)));
  // each part's share of the covered cells (largest remainder)
  const raw = list.map((p) => (covered * p.min) / sum);
  const quota = raw.map((v) => Math.floor(v));
  let left = covered - quota.reduce((a, q) => a + q, 0);
  raw.map((v, i) => [v - Math.floor(v), i] as const).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left > 0) { quota[i] += 1; left -= 1; } });

  const r = rng('turf');
  const noise = Array.from({ length: total }, () => r());
  const owner = new Array<number>(total).fill(-1);
  const order: number[][] = list.map(() => []);
  const xy = (i: number) => [i % cols, Math.floor(i / cols)] as const;
  const near = (i: number) => {
    const [x, y] = xy(i);
    const out: number[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) out.push(ny * cols + nx);
    }
    return out;
  };
  list.forEach((_, k) => {
    if (!quota[k]) return;
    // seeds spread across the turf, alternating high and low
    const sx = Math.round(((k + 0.5) / list.length) * (cols - 1)), sy = Math.round((rows - 1) * (k % 2 ? 0.3 : 0.68));
    const dist = (i: number) => { const [x, y] = xy(i); return Math.hypot(x - sx, (y - sy) * 1.3); };
    const free = () => owner.map((o, i) => (o < 0 ? i : -1)).filter((i) => i >= 0);
    let seed = sy * cols + sx;
    if (owner[seed] >= 0) seed = free().sort((a, b) => dist(a) - dist(b))[0];
    if (seed === undefined) return;
    owner[seed] = k; order[k].push(seed);
    while (order[k].length < quota[k]) {
      const edge = new Set<number>();
      order[k].forEach((i) => near(i).forEach((j) => { if (owner[j] < 0) edge.add(j); }));
      const pool = edge.size ? [...edge] : free();
      if (!pool.length) break;
      const next = pool.reduce((best, i) => (dist(i) + noise[i] * 1.8 < dist(best) + noise[best] * 1.8 ? i : best));
      owner[next] = k; order[k].push(next);
    }
  });
  const cells: TurfCell[] = [];
  list.forEach((p, k) => {
    const wet = Math.min(order[k].length, Math.round((order[k].length * Math.max(0, p.live ?? 0)) / p.min));
    order[k].forEach((i, n) => { const [x, y] = xy(i); cells.push({ i, x, y, c: p.c, live: n >= order[k].length - wet }); });
  });
  return { cells, covered: cells.length, total };
}

/** Droplets around the turf's painted edges, where ink would have splashed. */
export function edgeDrops(cells: TurfCell[], cols: number, rows: number) {
  const taken = new Set(cells.map((c) => c.i));
  const r = rng('edge');
  const out: { x: number; y: number; c: string; s: number }[] = [];
  for (const c of cells) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = c.x + dx, ny = c.y + dy;
      const roll = r();
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || taken.has(ny * cols + nx) || roll > 0.2) continue;
      out.push({ x: c.x + dx * (0.55 + r() * 0.3), y: c.y + dy * (0.55 + r() * 0.3), c: c.c, s: 0.12 + r() * 0.14 });
    }
  }
  return out;
}
