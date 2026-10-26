// The koi pond behind the study screen: a few koi swimming slowly in dark
// water, drawn on a grid of small tiles and marks (a mosaic, not a picture).
// Each koi is a spine that follows its head, with a body that swells behind
// the head and tapers to a fanned tail, pectoral fins, a tail that beats as
// it swims, and the patterns of real varieties (紅白, 大正三色, 昭和, 黄金, 浅黄,
// 茶鯉). Some swim deeper, dimmer and under the others. Lily pads drift on top.
// Tap the water: a ripple, and food the koi come for.
//
// The same water, made a pale sea (school 'shark'): sharks instead of koi —
// シュモクザメ with its hammer, ジンベエザメ spotted, トラフザメ with its long
// tail, ヨシキリザメ slim and blue — slower and stiffer, with swept-back fins,
// and the light on the water as short dashes.
//
// Pure functions over plain data and typed arrays, marked as worklets, so the
// same code runs on the UI thread in the app (Reanimated + Skia) and in a
// browser (the prototype). `step` moves things on; `paint` fills the grid.

/** Marks, from faint to dense; index 0 is none. Drawn as small shapes, not letters. */
export const MARKS = ['', 'dot', 'dot2', 'colon', 'tri', 'plus', 'cross', 'ring', 'star', 'hash', 'grid', 'disc', 'block', 'dash'] as const;
/** The marks from faint to dense end at 'block'; 'dash' is the sea's own light on the water. */
const RAMP = 12, DASH = 13;
export type Mark = (typeof MARKS)[number];

const N = 11; // spine points
const RIPPLE_LIFE = 2.8;
const FOOD_LIFE = 14;

export type Koi = {
  x: number; y: number; a: number; v: number; turn: number;
  len: number; w: number; depth: number; kind: number; seed: number;
  sx: Float32Array; sy: Float32Array; phase: number; hunger: number; boost: number;
  /** seconds until it next comes up to touch the surface (a small ring at its mouth) */
  kiss: number;
  /** its pattern, worked out once: PU steps along the body by PV across */
  pat: Uint32Array;
  /** how far its widest part (head or fins) reaches out, in units of its width */
  wide: number;
};
const PU = 48, PV = 9;
export type Pad = { x: number; y: number; r: number; a: number; spin: number; vx: number; vy: number; flower: boolean };
export type Pond = {
  cols: number; rows: number; t: number; r: number; acc: number;
  koi: Koi[];
  food: { x: number; y: number; t: number }[];
  ripples: { x: number; y: number; t: number; s: number }[];
  pads: Pad[];
  /** per cell: the tile (0..1) and its color, the mark (index into MARKS), its color and strength */
  tile: Float32Array; tileRGB: Uint32Array; mark: Uint8Array; markRGB: Uint32Array; markA: Float32Array;
  /** per cell: how strongly a fish is drawn there already (to layer them) */
  cover: Float32Array;
  /** a place the koi keep clear of (the card on the study screen), in cells */
  avoid: { x0: number; y0: number; x1: number; y1: number } | null;
  /** scratch, per cell: the nearest point on the koi being drawn (distance², how far along, which side) */
  nd: Float32Array; nu: Float32Array; ns: Float32Array;
  /** the light on the water, worked out a few times a second (it moves slowly) and copied into each frame */
  wm: Uint8Array; wa: Float32Array; wAt: number;
  /** the water: the koi pond (dark) or the sea with sharks (light) */
  sea: boolean; water: number; hi: number; deepTo: number;
};

// ---------- small math ----------
function rand(p: Pond) {
  'worklet';
  // mulberry32
  p.r = (p.r + 0x6d2b79f5) | 0;
  let x = p.r;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
function hash(x: number, y: number, z: number) {
  'worklet';
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t: number) => {
  'worklet';
  return t * t * (3 - 2 * t);
};
/** Smooth value noise, 0..1. */
export function noise(x: number, y: number, z: number) {
  'worklet';
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = fade(x - ix), fy = fade(y - iy), fz = fade(z - iz);
  const a0 = hash(ix, iy, iz), b0 = hash(ix + 1, iy, iz), c0 = hash(ix, iy + 1, iz), d0 = hash(ix + 1, iy + 1, iz);
  const a1 = hash(ix, iy, iz + 1), b1 = hash(ix + 1, iy, iz + 1), c1 = hash(ix, iy + 1, iz + 1), d1 = hash(ix + 1, iy + 1, iz + 1);
  const e0 = a0 + (b0 - a0) * fx, f0 = c0 + (d0 - c0) * fx, g0 = e0 + (f0 - e0) * fy;
  const e1 = a1 + (b1 - a1) * fx, f1 = c1 + (d1 - c1) * fx, g1 = e1 + (f1 - e1) * fy;
  return g0 + (g1 - g0) * fz;
}
const clamp = (v: number, a: number, b: number) => {
  'worklet';
  return v < a ? a : v > b ? b : v;
};
const smooth = (a: number, b: number, v: number) => {
  'worklet';
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const rgb = (r: number, g: number, b: number) => {
  'worklet';
  return ((clamp(Math.round(r), 0, 255) << 16) | (clamp(Math.round(g), 0, 255) << 8) | clamp(Math.round(b), 0, 255)) >>> 0;
};
/** Mixes two colors (0xRRGGBB). */
export function mixRGB(a: number, b: number, t: number) {
  'worklet';
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  return rgb(ar + (((b >> 16) & 255) - ar) * t, ag + (((b >> 8) & 255) - ag) * t, ab + ((b & 255) - ab) * t);
}
const angleTo = (from: number, to: number) => {
  'worklet';
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

// ---------- colors ----------
export const WATER = 0x0b1117;
const WATER_HI = 0x7fa6bd; // light on the water
const WHITE = 0xf1ebe0, RED = 0xd8442a, DEEP_RED = 0xb8321f, INK = 0x1d1b1a, GOLD = 0xe2b04a, GOLD_HI = 0xf7dd8e;
const ASAGI = 0x7488a6, ASAGI_HI = 0xa9b7cc, ORANGE = 0xde7a3c, CHA = 0xa3713f, CHA_HI = 0xc8955b;
const PAD = 0x3d6b3c, PAD_HI = 0x5d8c4f, PAD_DARK = 0x2a4a2b, PETAL = 0xeaa6bd, PETAL_HI = 0xfbd9e3, FOOD = 0xd9a659;

export const SEA = 0xf5f5f3;
const SEA_HI = 0xaeb6c0; // the light on a pale sea, as dashes
const HAM = 0x6f7a8a, HAM_HI = 0xaeb7c3, WHALE = 0x485463, WHALE_SPOT = 0xe9ebee, LEO = 0xbfae90, LEO_DARK = 0x5c4d3b, BLUE = 0x5878a3, BLUE_HI = 0xa6bbd6;
/** シュモクザメ, ジンベエザメ, トラフザメ, ヨシキリザメ (kinds 6 to 9) */
export const SHARKS = ['シュモクザメ', 'ジンベエザメ', 'トラフザメ', 'ヨシキリザメ'] as const;
const isShark = (kind: number) => {
  'worklet';
  return kind >= 6;
};

/** 紅白, 大正三色, 昭和, 黄金, 浅黄, 茶鯉 */
export const VARIETIES = ['紅白', '大正三色', '昭和三色', '黄金', '浅黄', '茶鯉'] as const;

/** The color of a koi at u (0 head .. 1 tail) and v (-1 .. 1 across), by its variety and its own pattern. */
function skin(kind: number, seed: number, u: number, v: number) {
  'worklet';
  const n = noise(u * 5.2 + seed * 7.1, v * 1.6 + seed * 3.3, seed * 1.7);
  const m = noise(u * 9 + seed * 2.3, v * 2.6 - seed, 5 + seed);
  const av = Math.abs(v);
  switch (kind) {
    case 0: { // 紅白: white with red patches, a red cap on the head
      if (u < 0.13) return u > 0.035 && av < 0.6 ? RED : WHITE;
      return n > 0.47 && u < 0.86 && av < 0.92 ? (n > 0.62 ? DEEP_RED : RED) : WHITE;
    }
    case 1: { // 大正三色: 紅白 with small black spots on the back
      if (u < 0.12) return WHITE;
      if (m > 0.72 && u > 0.2 && u < 0.8) return INK;
      return n > 0.5 && u < 0.86 && av < 0.9 ? RED : WHITE;
    }
    case 2: { // 昭和三色: black with red and white
      if (u < 0.12) return n > 0.5 ? RED : INK;
      if (m > 0.55) return WHITE;
      return n > 0.48 && u < 0.86 ? RED : INK;
    }
    case 3: // 黄金: gold, brighter along the back
      return mixRGB(GOLD, GOLD_HI, clamp(1 - av * 1.3, 0, 1) * 0.8);
    case 4: // 浅黄: blue-grey back with a net, orange cheeks and sides
      if (av > 0.62 || (u < 0.12 && av > 0.3)) return ORANGE;
      return (Math.floor(u * 26) + Math.floor(v * 3 + 3)) % 2 ? ASAGI : ASAGI_HI;
    case 5: // 茶鯉: bronze
      return mixRGB(CHA, CHA_HI, clamp(1 - av, 0, 1) * 0.6 + (n - 0.5) * 0.3);
    // the sharks, seen from above: darker along the back, paler to the sides
    case 6: // シュモクザメ: grey
      return mixRGB(HAM, HAM_HI, clamp(av * 0.9 + (n - 0.5) * 0.3, 0, 1));
    case 7: { // ジンベエザメ: dark slate with rows of pale spots and thin bars
      const row = Math.floor(u * 34), col = Math.floor((v + 1) * 3.5);
      if ((row + col) % 2 === 0 && m > 0.42 && u > 0.04 && u < 0.86) return WHALE_SPOT;
      if (u * 15 - Math.floor(u * 15) < 0.07 && u > 0.12 && u < 0.7) return mixRGB(WHALE, WHALE_SPOT, 0.55);
      return mixRGB(WHALE, 0x8592a1, av * 0.5);
    }
    case 8: // トラフザメ: sand with dark spots
      return m > 0.64 && u > 0.08 ? LEO_DARK : mixRGB(LEO, 0xe2d8c4, av * 0.5 + (n - 0.5) * 0.2);
    default: // ヨシキリザメ: blue
      return mixRGB(BLUE, BLUE_HI, clamp(av * 0.85, 0, 1));
  }
}

/** A fish's half width at u along it (in units of its widest body). */
function width(kind: number, u: number) {
  'worklet';
  if (!isShark(kind)) {
    if (u < 0.12) return 0.55 + 0.45 * Math.sqrt(u / 0.12); // the round head
    if (u < 0.38) return 1;
    if (u < 0.84) return 1 - 0.66 * Math.pow((u - 0.38) / 0.46, 1.3); // down to the tail's root
    return 0.34 + 0.86 * ((u - 0.84) / 0.16); // the tail fans out
  }
  if (kind === 6) {
    if (u < 0.075) return u < 0.012 ? 1.3 : 2.3; // the hammer, a wide bar across the head
    if (u < 0.13) return 0.42; // and its neck
  } else if (kind === 7) {
    if (u < 0.08) return 0.82 + 0.18 * (u / 0.08); // a broad, blunt head
  } else if (kind === 8) {
    // a long, thin tail, half its length
    if (u < 0.14) return 0.32 + 0.68 * Math.pow(u / 0.14, 0.6);
    if (u < 0.34) return 1;
    if (u < 0.56) return 1 - 0.62 * ((u - 0.34) / 0.22);
    if (u < 0.86) return 0.38 - 0.24 * ((u - 0.56) / 0.3);
    return 0.14 + 0.16 * Math.sin((Math.PI * (u - 0.86)) / 0.14);
  }
  if (u < 0.14) return 0.32 + 0.68 * Math.pow(u / 0.14, 0.6); // a pointed snout
  if (u < 0.36) return 1;
  if (u < 0.8) return 1 - 0.82 * Math.pow((u - 0.36) / 0.44, 1.1); // down to the tail's root
  return 0.18 + 0.3 * Math.sin((Math.PI * (u - 0.8)) / 0.2); // the tail, a narrow blade from above
}
/** Where a fish's tail fin starts (it's drawn thinner). */
const tailAt = (kind: number) => {
  'worklet';
  return !isShark(kind) ? 0.84 : kind === 8 ? 0.86 : 0.8;
};

// ---------- making a pond ----------
export function makePond(cols: number, rows: number, seed = 7, count = 6, school: 'koi' | 'shark' = 'koi'): Pond {
  'worklet';
  const sea = school === 'shark';
  const size = cols * rows;
  const p: Pond = {
    cols, rows, t: 0, r: seed | 0, acc: 0, koi: [], food: [], ripples: [], pads: [],
    tile: new Float32Array(size), tileRGB: new Uint32Array(size), mark: new Uint8Array(size), markRGB: new Uint32Array(size), markA: new Float32Array(size),
    cover: new Float32Array(size), avoid: null,
    nd: new Float32Array(size), nu: new Float32Array(size), ns: new Float32Array(size),
    wm: new Uint8Array(size), wa: new Float32Array(size), wAt: -1,
    sea, water: sea ? SEA : WATER, hi: sea ? SEA_HI : WATER_HI, deepTo: sea ? 0xdfe4e9 : 0x16303a,
  };
  const kinds = sea ? [6, 7, 9, 8, 6, 9, 7] : [0, 3, 1, 4, 2, 0, 5, 1];
  // how wide each kind is for its length
  const slim = [0.17, 0.17, 0.17, 0.17, 0.17, 0.17, 0.095, 0.13, 0.09, 0.08];
  // koi in proportion to the pond (a low, wide band of a pond has smaller ones)
  const scale = clamp(Math.min(cols, rows * 1.1) / 36, 0.6, 1.6);
  for (let i = 0; i < count; i++) {
    const kind = kinds[i % kinds.length];
    const len = (sea ? (14.5 + rand(p) * 5) * (kind === 7 ? 1.2 : 1) : 12.5 + rand(p) * 5) * scale;
    const a = rand(p) * Math.PI * 2;
    const k: Koi = {
      x: 4 + rand(p) * (cols - 8), y: rows * (0.3 + rand(p) * 0.4), a: rows < cols * 0.6 ? (rand(p) < 0.5 ? 0 : Math.PI) + (rand(p) - 0.5) * 0.6 : a, v: 1.6, turn: 0,
      len, w: len * (slim[kind] + rand(p) * (sea ? 0.012 : 0.025)), depth: i === count - 1 ? 0.55 : i === count - 2 ? 0.35 : rand(p) * 0.2,
      kind, seed: rand(p) * 100, sx: new Float32Array(N), sy: new Float32Array(N), phase: rand(p) * 6, hunger: 0.5 + rand(p) * 0.5, boost: 0, kiss: 8 + rand(p) * 30,
      pat: new Uint32Array(PU * PV), wide: kind === 6 ? 2.5 : isShark(kind) ? 2.9 : 2.2,
    };
    for (let a2 = 0; a2 < PU; a2++) for (let b2 = 0; b2 < PV; b2++) k.pat[a2 * PV + b2] = skin(k.kind, k.seed, a2 / (PU - 1), (b2 / (PV - 1)) * 2 - 1);
    for (let j = 0; j < N; j++) { k.sx[j] = k.x - Math.cos(a) * (len * j) / (N - 1); k.sy[j] = k.y - Math.sin(a) * (len * j) / (N - 1); }
    p.koi.push(k);
  }
  // the deep ones first, so the ones near the surface are drawn over them
  p.koi.sort((a, b) => b.depth - a.depth);
  // lily pads on the pond (not out at sea)
  const pads = sea ? 0 : Math.max(2, Math.round((cols * rows) / 900));
  for (let i = 0; i < pads; i++) {
    const side = i % 2;
    p.pads.push({
      x: side ? cols * (0.72 + rand(p) * 0.22) : cols * (0.06 + rand(p) * 0.22), y: rows * (0.12 + (i / pads) * 0.8 + rand(p) * 0.06),
      r: (2.4 + rand(p) * 1.8) * scale, a: rand(p) * 6.28, spin: (rand(p) - 0.5) * 0.04, vx: (rand(p) - 0.5) * 0.08, vy: (rand(p) - 0.5) * 0.06, flower: i === 0,
    });
  }
  return p;
}

/** Food where the water was tapped (in cells): a ripple, and a few pellets the koi come for. */
export function feed(p: Pond, x: number, y: number) {
  'worklet';
  p.ripples.push({ x, y, t: 0, s: 1 });
  const n = 3 + Math.floor(rand(p) * 3);
  for (let i = 0; i < n; i++) p.food.push({ x: x + (rand(p) - 0.5) * 3, y: y + (rand(p) - 0.5) * 3, t: -i * 0.12 });
  for (const k of p.koi) k.hunger = Math.min(1, k.hunger + 0.35);
}

// ---------- moving on ----------
export function step(p: Pond, dtIn: number) {
  'worklet';
  const dt = Math.min(0.05, Math.max(0, dtIn));
  p.t += dt;
  const { cols, rows } = p;
  for (const k of p.koi) {
    // where it would go: its own slow wandering, back from the edges, apart from others, to food
    const wander = (noise(p.t * 0.06, k.seed, 3.7) - 0.5) * 2;
    let dx = Math.cos(k.a + wander * 0.7), dy = Math.sin(k.a + wander * 0.7);
    // in a low, wide pond they mostly swim across it
    dy *= clamp((rows / cols) * 1.8, 0.3, 1);
    // back from the edges (a little of the koi may slip past them, as from under a bank)
    const m = Math.min(k.len * 0.75, cols * 0.3);
    const mv = Math.min(k.len * 0.75, rows * 0.36);
    if (k.x < m) dx += ((m - k.x) / m) * 1.6;
    if (k.x > cols - m) dx -= ((k.x - (cols - m)) / m) * 1.6;
    if (k.y < mv) dy += ((mv - k.y) / mv) * 2.2;
    if (k.y > rows - mv) dy -= ((k.y - (rows - mv)) / mv) * 2.2;
    // around the card, never under it: from the head, and from a little ahead of it
    if (p.avoid) {
      const b = p.avoid, reach = k.w * 2 + 3;
      for (let look = 0; look < 2; look++) {
        const hx = k.x + Math.cos(k.a) * k.len * 0.45 * look, hy = k.y + Math.sin(k.a) * k.len * 0.45 * look;
        const qx = clamp(hx, b.x0, b.x1), qy = clamp(hy, b.y0, b.y1);
        let ox = hx - qx, oy = hy - qy, d = Math.sqrt(ox * ox + oy * oy);
        if (d < 0.01) {
          // inside it: out by the nearest side
          const l = hx - b.x0, rr = b.x1 - hx, t = hy - b.y0, bt = b.y1 - hy, m = Math.min(l, rr, t, bt);
          ox = m === l ? -1 : m === rr ? 1 : 0; oy = m === t ? -1 : m === bt ? 1 : 0; d = 0.01;
          dx += ox * 4; dy += oy * 4;
        } else if (d < reach) {
          const f = (1 - d / reach) * (look ? 2.2 : 3);
          dx += (ox / d) * f; dy += (oy / d) * f;
        }
      }
    }
    for (const o of p.koi) {
      if (o === k || Math.abs(o.depth - k.depth) > 0.3) continue;
      const ox = k.x - o.x, oy = k.y - o.y, d2 = ox * ox + oy * oy, r = (k.w + o.w) * 2.2;
      if (d2 < r * r && d2 > 0.01) { const d = Math.sqrt(d2); dx += (ox / d) * (1 - d / r) * 1.4; dy += (oy / d) * (1 - d / r) * 1.4; }
    }
    let goal = -1, best = 1e9;
    if (k.hunger > 0.15) {
      for (let i = 0; i < p.food.length; i++) {
        const f = p.food[i];
        if (f.t < 0) continue;
        const fx = f.x - k.x, fy = f.y - k.y, d2 = fx * fx + fy * fy;
        if (d2 < best && d2 < 26 * 26) { best = d2; goal = i; }
      }
    }
    if (goal >= 0) {
      const f = p.food[goal], d = Math.sqrt(best);
      dx += ((f.x - k.x) / d) * 3 * k.hunger; dy += ((f.y - k.y) / d) * 3 * k.hunger;
      if (d < Math.max(0.9, k.w * 0.6)) {
        p.food.splice(goal, 1);
        p.ripples.push({ x: k.x, y: k.y, t: 0, s: 0.45 });
        k.hunger = Math.max(0, k.hunger - 0.3);
        k.boost = 1.2;
      }
    }
    // turn toward it, never sharply: a koi turns in a slow arc
    const want = Math.atan2(dy, dx);
    const maxTurn = clamp(((goal >= 0 ? 2.4 : 1) * k.v) / (0.42 * k.len), 0.12, 1.4);
    const target = clamp(angleTo(k.a, want) * 1.8, -maxTurn, maxTurn);
    k.turn += (target - k.turn) * Math.min(1, dt * 2.2);
    k.a += k.turn * dt;
    const cruise = 1.3 + noise(p.t * 0.07, k.seed + 11, 1.3) * 1.3;
    k.boost = Math.max(0, k.boost - dt * 0.6);
    const speed = (cruise + (goal >= 0 ? 1.4 : 0) + k.boost * 1.6) * (k.len / 13) * (1 - k.depth * 0.25) * (isShark(k.kind) ? 0.72 : 1);
    k.v += (speed - k.v) * Math.min(1, dt * 1.5);
    k.x += Math.cos(k.a) * k.v * dt;
    k.y += Math.sin(k.a) * k.v * dt;
    k.hunger = Math.min(1, k.hunger + dt * 0.012);
    // now and then, one near the surface comes up and touches it
    k.kiss -= dt;
    if (k.kiss <= 0) {
      if (k.depth < 0.3 && k.x > 0 && k.y > 0 && k.x < cols && k.y < rows) p.ripples.push({ x: k.x + Math.cos(k.a) * 0.6, y: k.y + Math.sin(k.a) * 0.6, t: 0, s: 0.38 });
      k.kiss = 18 + rand(p) * 40;
    }
    k.phase += dt * (isShark(k.kind) ? 1.3 + k.v * 0.8 : 2.2 + k.v * 1.5 + Math.abs(k.turn) * 2);
    // the body follows the head, each point a fixed step behind the one before,
    // and bends only so much at each joint (a koi's body is supple, not a rope)
    const seg = k.len / (N - 1);
    k.sx[0] = k.x; k.sy[0] = k.y;
    let prev = k.a + Math.PI; // the way back along the body
    for (let j = 1; j < N; j++) {
      let a = Math.atan2(k.sy[j] - k.sy[j - 1], k.sx[j] - k.sx[j - 1]);
      const bend = angleTo(prev, a);
      const lim = isShark(k.kind) ? (j < 3 ? 0.06 : 0.12) : j < 3 ? 0.1 : 0.17;
      if (bend > lim) a = prev + lim; else if (bend < -lim) a = prev - lim;
      k.sx[j] = k.sx[j - 1] + Math.cos(a) * seg;
      k.sy[j] = k.sy[j - 1] + Math.sin(a) * seg;
      prev = a;
    }
  }
  for (let i = p.food.length - 1; i >= 0; i--) {
    const f = p.food[i];
    f.t += dt;
    f.x += Math.sin(p.t * 0.7 + i) * dt * 0.08;
    if (f.t > FOOD_LIFE) p.food.splice(i, 1);
  }
  for (let i = p.ripples.length - 1; i >= 0; i--) {
    p.ripples[i].t += dt;
    if (p.ripples[i].t > RIPPLE_LIFE) p.ripples.splice(i, 1);
  }
  for (const d of p.pads) {
    d.x += d.vx * dt; d.y += d.vy * dt; d.a += d.spin * dt;
    if (d.x < -d.r * 0.4 || d.x > cols + d.r * 0.4) d.vx = -d.vx;
    if (d.y < d.r || d.y > rows - d.r) d.vy = -d.vy;
  }
}

// ---------- drawing into the grid ----------
/** Tiles start at this strength; below it, a mark alone. */
const TILE_AT = 0.42;

/** part: 0 the body (tiles), 1 a fin (faint tiles), 2 the halo around a koi (marks only). */
function put(p: Pond, i: number, s: number, color: number, part: number) {
  'worklet';
  // a cell keeps the stronger of what's drawn there (the deep fish first, so the near ones win where they're solid)
  if (s < 0.05 || s < p.cover[i] * 0.85) return;
  p.cover[i] = s;
  const cx = i % p.cols, cy = (i / p.cols) | 0;
  // the marks shimmer a little, a few times a second
  const j = hash(cx, cy, Math.floor(p.t * 2.5)) - 0.5;
  const fin = part === 1;
  if (s >= TILE_AT && part === 0) {
    p.tile[i] = 0.5 + smooth(TILE_AT, 0.85, s) * 0.46;
    p.tileRGB[i] = color;
    const light = ((color >> 16) & 255) + ((color >> 8) & 255) + (color & 255) > 380;
    p.markRGB[i] = mixRGB(color, light ? 0x2a2420 : 0xffffff, light ? 0.5 : 0.35);
    p.mark[i] = clamp(Math.round(4 + s * 8 + j * 3), 1, RAMP);
    p.markA[i] = 0.75;
  } else {
    p.tile[i] = fin ? s * 0.45 : 0;
    p.tileRGB[i] = color;
    p.markRGB[i] = color;
    p.mark[i] = clamp(Math.round(1 + s * 6 + j * 2.5), 1, RAMP);
    p.markA[i] = clamp(s * 1.7, 0, 1);
  }
}

export function paint(p: Pond) {
  'worklet';
  const { cols, rows, t } = p;
  p.tile.fill(0); p.cover.fill(0);
  // the water: light moving over it, here and there (worked out five times a second)
  if (p.wAt < 0 || t - p.wAt > 0.2) {
    p.wAt = t;
    p.wm.fill(0); p.wa.fill(0);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = noise(x * 0.16 + t * 0.05, y * 0.16 - t * 0.03, t * 0.08);
        if (p.sea) {
          // a pale sea: the light lies on it as short dashes, sparse
          if (c > 0.74) { const i = y * cols + x; p.wm[i] = DASH; p.wa[i] = (c - 0.74) * 1.6; }
        } else if (c > 0.7) {
          const i = y * cols + x;
          p.wm[i] = c > 0.83 ? 3 : c > 0.77 ? 2 : 1;
          p.wa[i] = (c - 0.7) * 0.9;
        }
      }
    }
  }
  p.mark.set(p.wm); p.markA.set(p.wa); p.markRGB.fill(p.hi);
  // rings where the water was touched
  for (const r of p.ripples) {
    const life = 1 - r.t / RIPPLE_LIFE;
    for (let ring = 0; ring < 2; ring++) {
      const rad = r.t * (4.2 - ring * 1.6) * r.s + 0.4;
      const x0 = Math.max(0, Math.floor(r.x - rad - 2)), x1 = Math.min(cols - 1, Math.ceil(r.x + rad + 2));
      const y0 = Math.max(0, Math.floor(r.y - rad - 2)), y1 = Math.min(rows - 1, Math.ceil(r.y + rad + 2));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot(x + 0.5 - r.x, y + 0.5 - r.y);
          const k = (1 - Math.abs(d - rad) / 0.85) * life * (ring ? 0.55 : 1);
          if (k <= 0) continue;
          const i = y * cols + x;
          if (k * 0.9 > p.markA[i]) { p.mark[i] = k > 0.6 ? 7 : k > 0.35 ? 3 : 2; p.markRGB[i] = p.sea ? 0x8e99a6 : 0xbfd6e4; p.markA[i] = k * 0.9; }
        }
      }
    }
  }
  // food, floating
  for (const f of p.food) {
    if (f.t < 0) continue;
    const x = Math.floor(f.x), y = Math.floor(f.y + Math.sin(t * 2 + f.x) * 0.15);
    if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
    const i = y * cols + x;
    const a = Math.min(1, f.t * 4) * Math.min(1, (FOOD_LIFE - f.t) / 2);
    p.tile[i] = 0.5 * a; p.tileRGB[i] = FOOD; p.mark[i] = 11; p.markRGB[i] = 0xf6d79a; p.markA[i] = a;
  }
  // the koi, deep ones first
  for (const k of p.koi) {
    const shark = isShark(k.kind);
    const amp = (0.28 + Math.min(1, k.v / 3) * 0.22 + Math.abs(k.turn) * 0.15) * (k.w / 1.8) * (shark ? 0.75 : 1);
    // the spine as drawn: the tail swings side to side, more toward its end
    const px = new Float32Array(N), py = new Float32Array(N);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let j = 0; j < N; j++) {
      const a = j < N - 1 ? Math.atan2(k.sy[j] - k.sy[j + 1], k.sx[j] - k.sx[j + 1]) : Math.atan2(k.sy[j - 1] - k.sy[j], k.sx[j - 1] - k.sx[j]);
      const f = j / (N - 1);
      const off = Math.sin(k.phase - j * 0.62) * amp * Math.pow(f, 1.5);
      px[j] = k.sx[j] - Math.sin(a) * off;
      py[j] = k.sy[j] + Math.cos(a) * off;
      if (px[j] < minX) minX = px[j]; if (px[j] > maxX) maxX = px[j];
      if (py[j] < minY) minY = py[j]; if (py[j] > maxY) maxY = py[j];
    }
    const pad = k.w * k.wide + 1;
    const x0 = Math.max(0, Math.floor(minX - pad)), x1 = Math.min(cols - 1, Math.ceil(maxX + pad));
    const y0 = Math.max(0, Math.floor(minY - pad)), y1 = Math.min(rows - 1, Math.ceil(maxY + pad));
    const deep = 1 - k.depth * 0.4;
    const flap = Math.sin(k.phase * 0.5) * 0.25;
    // the nearest point on the spine for each cell near the koi: only the cells near each segment are tried
    const reach = k.w * k.wide + 1.4, far = reach * reach;
    const tailFrom = tailAt(k.kind);
    for (let y = y0; y <= y1; y++) p.nd.fill(1e9, y * cols + x0, y * cols + x1 + 1);
    for (let j = 0; j < N - 1; j++) {
      const ax = px[j], ay = py[j], bx = px[j + 1] - ax, by = py[j + 1] - ay;
      const l2 = bx * bx + by * by || 1;
      const sx0 = Math.max(x0, Math.floor(Math.min(ax, px[j + 1]) - reach)), sx1 = Math.min(x1, Math.ceil(Math.max(ax, px[j + 1]) + reach));
      const sy0 = Math.max(y0, Math.floor(Math.min(ay, py[j + 1]) - reach)), sy1 = Math.min(y1, Math.ceil(Math.max(ay, py[j + 1]) + reach));
      for (let y = sy0; y <= sy1; y++) {
        const cy = y + 0.5;
        for (let x = sx0; x <= sx1; x++) {
          const cx = x + 0.5;
          const tt = clamp(((cx - ax) * bx + (cy - ay) * by) / l2, 0, 1);
          const qx = ax + bx * tt - cx, qy = ay + by * tt - cy;
          const d = qx * qx + qy * qy;
          const i = y * cols + x;
          if (d < p.nd[i]) { p.nd[i] = d; p.nu[i] = (j + tt) / (N - 1); p.ns[i] = bx * (cy - ay) - by * (cx - ax); }
        }
      }
    }
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * cols + x;
        const bd = p.nd[i];
        if (bd > far) continue;
        const bu = p.nu[i], side = p.ns[i];
        const d = Math.sqrt(bd);
        const W = Math.max(0.6, k.w * width(k.kind, bu));
        const v = clamp((side < 0 ? -d : d) / W, -1, 1);
        if (d < W + 0.5) {
          let s = clamp((W + 0.5 - d) / 0.9, 0, 1);
          const tail = bu > tailFrom;
          // a koi's tail is forked: a shallow notch at its very end
          if (!shark && tail && bu > 0.97 && Math.abs(v) < 0.25) s *= 0.3;
          let c = k.pat[Math.round(bu * (PU - 1)) * PV + Math.round((v + 1) * 0.5 * (PV - 1))];
          // the eyes (a hammerhead's at the ends of its hammer)
          const av = Math.abs(v);
          if (k.kind === 6 ? bu > 0.02 && bu < 0.06 && av > 0.86 : bu > 0.04 && bu < 0.1 && av > 0.45 && av < 0.85) c = mixRGB(c, INK, shark ? 0.6 : 0.75);
          if (shark) {
            // seen from above: the back darker, the edges catching the light
            c = mixRGB(c, 0x1b2230, 0.12 * (1 - v * v));
            c = mixRGB(c, 0xffffff, 0.16 * av * av);
            if (tail) c = mixRGB(c, p.water, 0.25);
          } else {
            // light along the back, shade at the sides
            c = mixRGB(c, 0xffffff, 0.14 * (1 - v * v));
            c = mixRGB(c, 0x000000, 0.22 * Math.pow(av, 3));
            if (tail) c = mixRGB(c, 0xffffff, 0.3);
          }
          // deeper is dimmer, into the water's own color
          c = mixRGB(c, p.deepTo, k.depth * 0.5);
          s *= (0.78 + 0.22 * (1 - v * v)) * deep;
          // the tail fin is thin: lighter, and the water shows through
          put(p, i, tail ? s * 0.62 : s, c, tail ? 1 : 0);
        } else if (d < W + (shark ? 1.1 : 1.9) && bu > 0.02 && bu < 0.98) {
          // the halo: a few marks just outside the body, fading out (a shark's is closer, its outline cleaner)
          const c = mixRGB(mixRGB(k.pat[Math.round(bu * (PU - 1)) * PV + (side < 0 ? 0 : PV - 1)], p.water, 0.25), p.deepTo, k.depth * 0.5);
          put(p, y * cols + x, (shark ? 0.22 : 0.3) * (1 - (d - W - 0.5) / (shark ? 0.6 : 1.4)) * deep, c, 2);
        }
        if (shark && d >= W + 0.3) {
          // a shark's fins, stiff and swept back: a pair of pectorals (long and narrow on the blue shark), and small pelvics
          // further back. Each is a triangle off the body: its root from u0 to u1, its tip `reach` out and swept back.
          const out = d - W;
          for (let f2 = 0; f2 < 2; f2++) {
            const u0 = f2 ? 0.56 : k.kind === 9 ? 0.23 : 0.2, u1 = f2 ? 0.63 : k.kind === 9 ? 0.31 : 0.34;
            const reach = k.w * (f2 ? 0.8 : k.kind === 9 ? 2.3 : k.kind === 7 ? 1.4 : 1.7);
            const g = out / reach;
            if (g >= 1) continue;
            const back = (reach * 1.25) / k.len; // how far back the tip is, along the body
            if (bu < u0 + g * back || bu > u1 + g * (u0 + back - u1)) continue;
            const c = mixRGB(mixRGB(k.pat[Math.round(((u0 + u1) / 2) * (PU - 1)) * PV + (side < 0 ? 0 : PV - 1)], 0x1b2230, 0.12), p.deepTo, k.depth * 0.5);
            put(p, i, (0.8 - 0.3 * g) * deep, c, 0);
            break;
          }
        } else if (d >= W + 0.5 && bu > 0.17 && bu < 0.32) {
          // pectoral fins, out to the sides, rowing slowly
          const reach = k.w * (0.95 + flap * (side < 0 ? 1 : -1));
          const out = d - W;
          const along = 1 - Math.abs(bu - 0.22) / 0.1;
          if (out < reach * along && along > 0) {
            const c = mixRGB(mixRGB(k.pat[Math.round(0.3 * (PU - 1)) * PV + (side < 0 ? 0 : PV - 1)], 0xffffff, 0.45), 0x1d3b44, k.depth * 0.55);
            put(p, i, 0.55 * along * deep * (1 - out / (reach + 0.01)), c, 1);
          }
        }
      }
    }
  }
  // lily pads, on the surface, over everything
  for (const d of p.pads) {
    const x0 = Math.max(0, Math.floor(d.x - d.r - 1)), x1 = Math.min(cols - 1, Math.ceil(d.x + d.r + 1));
    const y0 = Math.max(0, Math.floor(d.y - d.r - 1)), y1 = Math.min(rows - 1, Math.ceil(d.y + d.r + 1));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ox = x + 0.5 - d.x, oy = y + 0.5 - d.y, r = Math.hypot(ox, oy);
        const s = clamp((d.r + 0.4 - r) / 0.8, 0, 1);
        if (s <= 0) continue;
        const ang = Math.abs(angleTo(d.a, Math.atan2(oy, ox)));
        if (ang < 0.32 && r > d.r * 0.2) continue; // the notch
        const i = y * cols + x;
        const vein = Math.abs(Math.sin((Math.atan2(oy, ox) - d.a) * 4.5)) < 0.22 && r > d.r * 0.25;
        const c = mixRGB(PAD, PAD_HI, clamp(1 - r / d.r, 0, 1) * 0.5 + (noise(x * 0.5, y * 0.5, 9) - 0.5) * 0.4);
        p.cover[i] = 1;
        p.tile[i] = 0.25 + s * 0.68; p.tileRGB[i] = c;
        p.mark[i] = vein ? 5 : clamp(Math.round(6 + s * 3), 1, RAMP); p.markRGB[i] = vein ? PAD_HI : PAD_DARK; p.markA[i] = vein ? 0.8 : 0.6;
        if (d.flower && r < d.r * 0.42) {
          const petal = r < d.r * 0.16 ? 0xf5d76e : mixRGB(PETAL, PETAL_HI, 1 - r / (d.r * 0.42));
          p.tile[i] = 0.92; p.tileRGB[i] = petal; p.mark[i] = r < d.r * 0.16 ? 11 : 8; p.markRGB[i] = mixRGB(petal, 0xffffff, 0.5); p.markA[i] = 0.8;
        }
      }
    }
  }
}
