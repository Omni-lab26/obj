// 油絵: the brushwork every piece is painted with. A stroke is a closed outline
// around a centerline that swells where the brush was loaded and thins to a
// dry tail, with a few bristle streaks in it; a day's painting is strokes laid
// over a canvas, as many as the minutes say, until the goal covers it. Shapes
// come from a seed, so the same day is always painted the same way.
// (No React Native here, so the painting can be tested.)

export type Pt = [number, number];
export type Brush = 'dab' | 'swirl' | 'wash';

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

const f = (v: number) => String(Math.round(v * 10) / 10);
/** A smooth closed path through the points (Catmull-Rom as cubic Béziers). */
function closed(pts: Pt[]) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}
/** A smooth open path through the points. */
export function open(pts: Pt[]) {
  const n = pts.length;
  if (!n) return '';
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

/** How wide the brush is along a stroke (0 → 1): loaded at the start, full in the middle, a dry tail. */
export const taper = (t: number) => (t < 0.16 ? 0.18 + 0.82 * Math.sqrt(t / 0.16) : t > 0.68 ? 0.12 + 0.88 * Math.pow((1 - t) / 0.32, 0.65) : 1);
/** A flat brush pulled straight: nearly as wide at the ends as in the middle (the chart's bars). */
const blunt = (t: number) => 0.74 + 0.26 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));

const normals = (line: Pt[]) => line.map((p, i) => {
  const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  return [-dy / len, dx / len] as Pt;
});

/** A brush stroke along a centerline, `width` across at its fullest (a flat one, blunt at the ends, for bars). */
export function strokePath(line: Pt[], width: number, seed: string | number, flat = false) {
  const r = rng(seed);
  const ns = normals(line);
  const n = line.length;
  const L: Pt[] = [], R: Pt[] = [];
  line.forEach((p, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const hw = (width / 2) * (flat ? blunt(t) : taper(t));
    const jl = 1 + (r() - 0.5) * 0.24, jr = 1 + (r() - 0.5) * 0.24;
    L.push([p[0] + ns[i][0] * hw * jl, p[1] + ns[i][1] * hw * jl]);
    R.push([p[0] - ns[i][0] * hw * jr, p[1] - ns[i][1] * hw * jr]);
  });
  return closed([...L, ...R.reverse()]);
}

/** The streaks the bristles leave inside a stroke: a light one or two and a dark one. */
export function bristles(line: Pt[], width: number, seed: string | number) {
  const r = rng(`${seed}:b`);
  const ns = normals(line);
  const n = line.length;
  return [-0.26, 0.04, 0.24].map((k, j) => {
    const off = (k + (r() - 0.5) * 0.08) * width;
    const pts = line.map((p, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const o = off * taper(t);
      return [p[0] + ns[i][0] * o, p[1] + ns[i][1] * o] as Pt;
    });
    const a = Math.floor(n * 0.14), z = Math.max(a + 2, Math.ceil(n * 0.8));
    return { d: open(pts.slice(a, z)), light: j !== 1, w: Math.max(0.5, width * (0.035 + r() * 0.035)) };
  });
}

// ---------- a day's painting ----------
/** Minutes in one color; `live` of them are still wet (the session under way). */
export type Part = { id: string; c: string; min: number; live?: number };
/** One stroke of a painting: its centerline and width, its color (`tone` lifts or darkens it a little, as mixed paint does), and whether it's still wet. */
export type Stroke = { key: string; line: Pt[]; width: number; c: string; tone: number; o: number; wet: boolean };

const halton = (i: number, b: number) => { let g = 1, x = 0; while (i > 0) { g /= b; x += g * (i % b); i = Math.floor(i / b); } return x; };
/** Each part's share of n, by minutes (largest remainder); any part with minutes gets one when there are enough to go round. */
export function shares(n: number, mins: number[]) {
  const sum = mins.reduce((a, m) => a + Math.max(0, m), 0);
  if (n <= 0 || sum <= 0) return mins.map(() => 0);
  const raw = mins.map((m) => (n * Math.max(0, m)) / sum);
  const q = raw.map((v) => Math.floor(v));
  let left = n - q.reduce((a, v) => a + v, 0);
  raw.map((v, i) => [v - Math.floor(v), i] as const).sort((x, y) => y[0] - x[0]).forEach(([, i]) => { if (left > 0) { q[i] += 1; left -= 1; } });
  // nobody with minutes goes unpainted while someone has more than one
  const having = mins.map((m) => m > 0);
  if (n >= having.filter(Boolean).length) {
    mins.forEach((m, i) => {
      if (m <= 0 || q[i] > 0) return;
      const most = q.indexOf(Math.max(...q));
      if (q[most] > 1) { q[most] -= 1; q[i] = 1; }
    });
  }
  return q;
}

/**
 * A stroke's centerline and size, by brush, around (cx, cy) on a w × h canvas.
 * `flow` is the way the paint runs at that spot (strokes near each other lie
 * alike, as a painter's hand does); `size` goes from broad at the start of a
 * painting to fine at its end.
 */
function brushwork(brush: Brush, cx: number, cy: number, w: number, h: number, flow: number, size: number, r: () => number) {
  const line: Pt[] = [];
  if (brush === 'swirl') {
    const R = Math.min(w, h) * (0.1 + 0.1 * r()) * size;
    const sweep = (0.55 + 0.5 * r()) * Math.PI * (flow >= 0 ? 1 : -1);
    const a0 = flow * 2.4 + r() * 0.6;
    const mid = a0 + sweep / 2;
    const ox = cx - R * Math.cos(mid), oy = cy - R * Math.sin(mid);
    for (let k = 0; k <= 9; k++) {
      const t = k / 9, a = a0 + sweep * t, rr = R * (1.08 - 0.22 * t);
      line.push([ox + rr * Math.cos(a), oy + rr * Math.sin(a)]);
    }
    return { line, width: h * (0.06 + 0.035 * r()) * size, o: 0.9 + 0.08 * r() };
  }
  if (brush === 'wash') {
    const L = w * (0.3 + 0.2 * r()) * size;
    const th = flow * 0.16 + (r() - 0.5) * 0.06;
    const amp = h * (0.008 + 0.012 * r()), ph = r() * Math.PI * 2;
    for (let k = 0; k <= 8; k++) {
      const t = k / 8, s = (t - 0.5) * L;
      const wave = amp * Math.sin(t * Math.PI * 2 + ph);
      line.push([cx + s * Math.cos(th) - wave * Math.sin(th), cy + s * Math.sin(th) + wave * Math.cos(th)]);
    }
    return { line, width: h * (0.065 + 0.04 * r()) * size, o: 0.82 + 0.1 * r() };
  }
  // dab: short, broad, a little bent, lying the way the paint runs there
  const L = w * (0.12 + 0.1 * r()) * size;
  const th = flow * 0.6 + (r() - 0.5) * 0.25;
  const bend = (r() - 0.5) * 0.35 * L;
  for (let k = 0; k <= 7; k++) {
    const t = k / 7, s = (t - 0.5) * L, b = bend * 4 * t * (1 - t);
    line.push([cx + s * Math.cos(th) - b * Math.sin(th), cy + s * Math.sin(th) + b * Math.cos(th)]);
  }
  return { line, width: h * (0.075 + 0.045 * r()) * size, o: 0.9 + 0.08 * r() };
}

/** How many strokes cover a w × h canvas. */
export const fullCount = (w: number, h: number) => Math.max(14, Math.min(64, Math.round((w * h) / 950)));

/**
 * Paints the day: the goal covers the canvas (past it, a little more paint
 * goes on); each part gets strokes in proportion to its minutes, spread over
 * the canvas and laid in turn, and the last of a part's strokes are wet for
 * the minutes still under way.
 */
export function compose(w: number, h: number, parts: Part[], goal: number, brush: Brush, seed: string) {
  const list = parts.filter((p) => p.min > 0);
  const total = list.reduce((a, p) => a + p.min, 0);
  const cover = total <= 0 ? 0 : goal > 0 ? Math.min(1, total / goal) : 1;
  if (total <= 0 || w <= 0 || h <= 0) return { strokes: [] as Stroke[], cover };
  const full = fullCount(w, h);
  const n = Math.max(1, Math.round(full * (goal > 0 ? Math.min(1.3, total / goal) : 1)));
  const quota = shares(n, list.map((p) => p.min));
  // lay the colors in turn, so each spreads over the canvas
  const credit = list.map(() => 0), used = list.map(() => 0);
  const order: number[] = [];
  for (let k = 0; k < n; k++) {
    list.forEach((_, i) => { credit[i] += quota[i] / n; });
    let pick = -1;
    list.forEach((_, i) => { if (used[i] < quota[i] && (pick < 0 || credit[i] > credit[pick])) pick = i; });
    if (pick < 0) break;
    credit[pick] -= 1; used[pick] += 1; order.push(pick);
  }
  const wet = list.map((p, i) => Math.min(quota[i], Math.round((quota[i] * Math.max(0, p.live ?? 0)) / p.min)));
  const seen = list.map(() => 0);
  const off = hash(seed) % 97;
  // the way the paint runs over this canvas: a slow wave across it
  const ph = (hash(`${seed}:flow`) % 628) / 100;
  const strokes = order.map((i, k) => {
    const r = rng(`${seed}:${k}`);
    const u = halton(k + 1 + off, 2), v = halton(k + 1 + off, 3);
    const cx = w * (0.06 + 0.88 * u) + (r() - 0.5) * w * 0.04, cy = h * (0.08 + 0.84 * v) + (r() - 0.5) * h * 0.04;
    const flow = Math.sin((u * 1.5 + v * 0.8) * Math.PI * 2 + ph);
    // broad strokes block the canvas in first, finer ones go on last
    const size = Math.max(0.72, 1.22 - 0.42 * (k / Math.max(1, full - 1)));
    const b = brushwork(brush, cx, cy, w, h, flow, size, r);
    seen[i] += 1;
    return { key: `${k}`, line: b.line, width: b.width, c: list[i].c, tone: (r() - 0.5) * 0.22, o: b.o, wet: seen[i] > quota[i] - wet[i] };
  });
  return { strokes, cover };
}

// ---------- the brush's other marks ----------
/** A vertical stroke from y0 (bottom) up to y1, for the chart's bars. */
export function barLine(cx: number, y0: number, y1: number, width: number, seed: string | number): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let k = 0; k <= 5; k++) {
    const t = k / 5;
    pts.push([cx + (r() - 0.5) * width * 0.16, y0 + (y1 - y0) * t]);
  }
  return pts;
}

/** A dab of paint on the palette: a soft blob of radius r. */
export function dabPath(cx: number, cy: number, r: number, seed: string | number) {
  const rnd = rng(seed);
  const pts: Pt[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = ((i + (rnd() - 0.5) * 0.5) / n) * Math.PI * 2;
    const k = 1 + (rnd() - 0.5) * 0.28;
    pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.88]);
  }
  return closed(pts);
}

/** The painter's palette: a bean of a board with a thumb hole (fill it even-odd). */
export function palettePath(w: number, h: number) {
  const P: Pt[] = [[0.07, 0.52], [0.12, 0.24], [0.32, 0.07], [0.6, 0.04], [0.85, 0.14], [0.97, 0.4], [0.93, 0.7], [0.74, 0.92], [0.48, 0.97], [0.32, 0.88], [0.3, 0.72], [0.19, 0.66]];
  const outer = closed(P.map(([x, y]) => [x * w, y * h] as Pt));
  const cx = 0.19 * w, cy = 0.79 * h, rr = Math.min(w, h) * 0.075;
  const hole = `M${f(cx + rr)} ${f(cy)}A${f(rr)} ${f(rr)} 0 1 0 ${f(cx - rr)} ${f(cy)}A${f(rr)} ${f(rr)} 0 1 0 ${f(cx + rr)} ${f(cy)}Z`;
  return `${outer}${hole}`;
}
/** Where the week's seven dabs sit on the palette, around its rim. */
export const paletteSpots = (w: number, h: number): Pt[] =>
  ([[0.2, 0.4], [0.33, 0.21], [0.5, 0.15], [0.67, 0.17], [0.82, 0.3], [0.86, 0.52], [0.76, 0.73]] as Pt[]).map(([x, y]) => [x * w, y * h]);

/** A signature: a looping scrawl across w × h, as an open path (and how long it is, roughly). */
export function signature(w: number, h: number, seed: string | number = 'sig') {
  const r = rng(seed);
  const loops = 3.4 + r() * 0.8, ph = r() * 0.8;
  const pts: Pt[] = [];
  const N = 120;
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const x = 8 + t * (w - 22) + Math.min(w * 0.04, 11) * Math.sin(t * Math.PI * 2 * loops + ph);
    const env = 0.55 + 0.45 * Math.sin(t * Math.PI * 1.7 + 0.3);
    const y = h * 0.52 + h * 0.3 * env * Math.sin(t * Math.PI * 2 * loops + 1.2 + ph) - (t > 0.86 ? (t - 0.86) * h * 1.4 : 0);
    pts.push([x, Math.max(2, Math.min(h - 2, y))]);
  }
  let len = 0;
  for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
  return { d: open(pts), len };
}

// ---------- what a variant adds, apart from the data ----------
/** Little lights for the night canvas. */
export function stars(w: number, h: number, count: number, seed: string | number) {
  const r = rng(`${seed}:stars`);
  return Array.from({ length: count }, () => ({ x: w * (0.08 + 0.84 * r()), y: h * (0.06 + 0.5 * r()), r: Math.max(1, Math.min(w, h) * (0.012 + 0.016 * r())) }));
}
/** Light on water: short level strokes. */
export function ripples(w: number, h: number, count: number, seed: string | number) {
  const r = rng(`${seed}:ripples`);
  return Array.from({ length: count }, () => {
    const cx = w * (0.15 + 0.7 * r()), cy = h * (0.35 + 0.55 * r()), L = w * (0.08 + 0.12 * r());
    return { line: [[cx - L / 2, cy], [cx, cy + (r() - 0.5) * 2], [cx + L / 2, cy]] as Pt[], width: Math.max(1, h * 0.018) };
  });
}
/** The pencil underdrawing a canvas starts from, by brush. */
export function underdrawing(brush: Brush, w: number, h: number): string[] {
  if (brush === 'swirl') {
    const out: string[] = [];
    for (let s = 0; s < 3; s++) {
      const cx = w * (0.25 + 0.27 * s), cy = h * (0.3 + 0.1 * (s % 2)), R = Math.min(w, h) * (0.16 - 0.03 * s);
      const pts: Pt[] = [];
      for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 1.7, rr = R * (1 - 0.5 * (k / 16)); pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); }
      out.push(open(pts));
    }
    out.push(open([[0, h * 0.72], [w * 0.35, h * 0.66], [w * 0.7, h * 0.7], [w, h * 0.64]]));
    return out;
  }
  if (brush === 'wash') {
    return [0.42, 0.58, 0.74, 0.88].map((y, i) => open([[w * 0.06, h * y], [w * 0.5, h * (y + (i % 2 ? 0.012 : -0.012))], [w * 0.94, h * y]]))
      .concat([open(ellipse(w * 0.32, h * 0.62, w * 0.12, h * 0.045)), open(ellipse(w * 0.68, h * 0.8, w * 0.1, h * 0.04))]);
  }
  return [
    open([[0, h * 0.6], [w * 0.3, h * 0.56], [w * 0.65, h * 0.61], [w, h * 0.57]]),
    open(ellipse(w * 0.7, h * 0.26, Math.min(w, h) * 0.12, Math.min(w, h) * 0.12)),
    open([[w * 0.1, h * 0.95], [w * 0.4, h * 0.7]]),
    open([[w * 0.55, h * 0.95], [w * 0.75, h * 0.72]]),
  ];
}
const ellipse = (cx: number, cy: number, rx: number, ry: number): Pt[] =>
  Array.from({ length: 17 }, (_, k) => { const a = (k / 16) * Math.PI * 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Pt; });
