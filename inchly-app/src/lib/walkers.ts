// People walking over the study screen, as if it were a glass floor seen from
// below: each step a shoe sole comes down sharp and dark on the glass, then
// lifts and blurs as it swings forward; the body above is a soft shadow. They
// come in from an edge, cross at a walking pace (now and then one stops for a
// while), and leave; a few at a time. Kept off the card, like the koi.
//
// Plain worklet functions over plain data (in points), like lib/koi: `stepCrowd`
// moves them on, `crowdUniforms` packs them for the halftone shader.

export const MAX_WALKERS = 6;

export type Foot = { x: number; y: number; a: number; lift: number; fx: number; fy: number; tx: number; ty: number };
export type Walker = {
  id: number; x: number; y: number; a: number; v: number; speed: number;
  phase: number; swing: number; feet: Foot[];
  stride: number; stance: number; size: number;
  pause: number; nextPause: number; seed: number; age: number;
};
export type Crowd = {
  w: number; h: number; t: number; r: number; seq: number;
  walkers: Walker[]; max: number; spawnIn: number;
  avoid: { x0: number; y0: number; x1: number; y1: number } | null;
};

function rand(c: Crowd) {
  'worklet';
  c.r = (c.r + 0x6d2b79f5) | 0;
  let x = c.r;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const clamp = (v: number, a: number, b: number) => {
  'worklet';
  return v < a ? a : v > b ? b : v;
};
const angleTo = (from: number, to: number) => {
  'worklet';
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export function makeCrowd(w: number, h: number, seed = 3, max = 3): Crowd {
  'worklet';
  const c: Crowd = { w, h, t: 0, r: seed | 0, seq: 0, walkers: [], max: Math.min(MAX_WALKERS, max), spawnIn: 0, avoid: null };
  return c;
}

/** Someone coming in from an edge, headed across. */
function spawn(c: Crowd, inside = false) {
  'worklet';
  const size = clamp(Math.min(c.w, c.h) / 393, 0.85, 1.6);
  const side = Math.floor(rand(c) * 4), m = 70 * size;
  let x = 0, y = 0;
  if (inside) { x = c.w * (0.15 + rand(c) * 0.7); y = c.h * (0.1 + rand(c) * 0.8); }
  else if (side === 0) { x = -m; y = c.h * (0.1 + rand(c) * 0.8); }
  else if (side === 1) { x = c.w + m; y = c.h * (0.1 + rand(c) * 0.8); }
  else if (side === 2) { x = c.w * (0.1 + rand(c) * 0.8); y = -m; }
  else { x = c.w * (0.1 + rand(c) * 0.8); y = c.h + m; }
  // toward somewhere across the floor
  const gx = c.w * (0.2 + rand(c) * 0.6), gy = c.h * (0.2 + rand(c) * 0.6);
  const a = Math.atan2(gy - y, gx - x);
  const stride = (30 + rand(c) * 8) * size, stance = (8 + rand(c) * 2) * size;
  const speed = (46 + rand(c) * 18) * size;
  const px = -Math.sin(a), py = Math.cos(a);
  const foot = (s: number, back: number): Foot => {
    const fx = x + px * stance * s - Math.cos(a) * back, fy = y + py * stance * s - Math.sin(a) * back;
    return { x: fx, y: fy, a, lift: 0, fx, fy, tx: fx, ty: fy };
  };
  c.walkers.push({
    id: c.seq++, x, y, a, v: speed, speed, phase: rand(c), swing: 0, feet: [foot(-1, 0), foot(1, stride * 0.5)],
    stride, stance, size, pause: 0, nextPause: 6 + rand(c) * 18, seed: rand(c) * 100, age: 0,
  });
}

export function stepCrowd(c: Crowd, dtIn: number) {
  'worklet';
  const dt = Math.min(0.05, Math.max(0, dtIn));
  c.t += dt;
  if (!c.walkers.length && c.t < 0.2) {
    // someone already on the floor when it opens
    spawn(c, true);
  }
  c.spawnIn -= dt;
  if (c.walkers.length < c.max && c.spawnIn <= 0) { spawn(c); c.spawnIn = 1.5 + rand(c) * 3.5; }
  for (let i = c.walkers.length - 1; i >= 0; i--) {
    const w = c.walkers[i];
    w.age += dt;
    // stopping for a while, now and then (after finishing the step)
    w.nextPause -= dt;
    if (w.nextPause <= 0 && w.pause <= 0 && w.x > 0 && w.x < c.w && w.y > 0 && w.y < c.h) { w.pause = 2 + rand(c) * 4; w.nextPause = 14 + rand(c) * 20; }
    const stopping = w.pause > 0;
    if (stopping) w.pause -= dt;
    // a slow drift in the way they walk, and around the card
    let dx = Math.cos(w.a), dy = Math.sin(w.a);
    const drift = Math.sin(c.t * 0.35 + w.seed) * 0.25;
    dx += -Math.sin(w.a) * drift; dy += Math.cos(w.a) * drift;
    if (c.avoid) {
      const b = c.avoid, reach = 60 * w.size;
      for (let look = 0; look < 2; look++) {
        const hx = w.x + Math.cos(w.a) * 50 * w.size * look, hy = w.y + Math.sin(w.a) * 50 * w.size * look;
        const qx = clamp(hx, b.x0, b.x1), qy = clamp(hy, b.y0, b.y1);
        const ox = hx - qx, oy = hy - qy, d = Math.sqrt(ox * ox + oy * oy);
        if (d < 0.5) {
          // inside: out the short way
          const cx = (b.x0 + b.x1) / 2;
          dx += (hx < cx ? -1 : 1) * 3;
        } else if (d < reach) {
          const f = (1 - d / reach) * (look ? 2.4 : 3.2);
          dx += (ox / d) * f; dy += (oy / d) * f;
        }
      }
    }
    for (const o of c.walkers) {
      if (o === w) continue;
      const ox = w.x - o.x, oy = w.y - o.y, d = Math.sqrt(ox * ox + oy * oy), r = 70 * w.size;
      if (d < r && d > 0.01) { dx += (ox / d) * (1 - d / r) * 1.5; dy += (oy / d) * (1 - d / r) * 1.5; }
    }
    const turn = clamp(angleTo(w.a, Math.atan2(dy, dx)), -0.9 * dt, 0.9 * dt);
    w.a += turn;
    // the pace: walking, or easing to a stop
    const want = stopping ? 0 : w.speed;
    w.v += (want - w.v) * Math.min(1, dt * 2.5);
    w.x += Math.cos(w.a) * w.v * dt;
    w.y += Math.sin(w.a) * w.v * dt;
    // the feet: one planted while the other swings to its next place
    const moving = w.v > 4;
    const T = w.stride / Math.max(w.v, w.speed * 0.6);
    if (moving || w.phase < 1) w.phase += dt / T;
    const sw = w.feet[w.swing];
    if (w.phase >= 1) {
      // the swinging foot comes down; the other one lifts next
      sw.x = sw.tx; sw.y = sw.ty; sw.lift = 0; sw.fx = sw.x; sw.fy = sw.y;
      if (moving) {
        w.phase -= 1;
        w.swing = 1 - w.swing;
        const nf = w.feet[w.swing];
        const s = w.swing ? 1 : -1;
        nf.fx = nf.x; nf.fy = nf.y;
        // where it will land: a half stride ahead of where the body will be
        const ahead = w.stride * 0.5 + w.v * T * 0.5;
        nf.tx = w.x + Math.cos(w.a) * ahead - Math.sin(w.a) * w.stance * s;
        nf.ty = w.y + Math.sin(w.a) * ahead + Math.cos(w.a) * w.stance * s;
        nf.a = w.a;
      } else {
        w.phase = 1;
      }
    } else {
      const e = w.phase * w.phase * (3 - 2 * w.phase);
      sw.x = sw.fx + (sw.tx - sw.fx) * e;
      sw.y = sw.fy + (sw.ty - sw.fy) * e;
      sw.lift = Math.pow(Math.sin(Math.PI * w.phase), 0.8);
    }
    // gone off the floor
    const out = 160 * w.size;
    if (w.age > 3 && (w.x < -out || w.x > c.w + out || w.y < -out || w.y > c.h + out)) c.walkers.splice(i, 1);
  }
}

/**
 * The crowd for the shader: per walker the body's shadow (x, y, radius,
 * strength) and its heading (cos, sin), per foot (x, y, angle, lift). Unused
 * places are empty (strength 0, lifted out of sight).
 */
export function crowdUniforms(c: Crowd, out: { bodies: number[]; heads: number[]; feet: number[] }) {
  'worklet';
  for (let i = 0; i < MAX_WALKERS; i++) {
    const w = c.walkers[i];
    if (!w) {
      out.bodies[i * 4] = -999; out.bodies[i * 4 + 1] = -999; out.bodies[i * 4 + 2] = 1; out.bodies[i * 4 + 3] = 0;
      out.heads[i * 4] = 1; out.heads[i * 4 + 1] = 0; out.heads[i * 4 + 2] = 0; out.heads[i * 4 + 3] = 0;
      for (let f = 0; f < 2; f++) { const j = (i * 2 + f) * 4; out.feet[j] = -999; out.feet[j + 1] = -999; out.feet[j + 2] = 0; out.feet[j + 3] = 1; }
      continue;
    }
    const fade = Math.min(1, w.age / 1.2);
    const mx = (w.feet[0].x + w.feet[1].x) / 2, my = (w.feet[0].y + w.feet[1].y) / 2;
    out.bodies[i * 4] = mx * 0.6 + w.x * 0.4; out.bodies[i * 4 + 1] = my * 0.6 + w.y * 0.4;
    out.bodies[i * 4 + 2] = 52 * w.size; out.bodies[i * 4 + 3] = 0.34 * fade;
    out.heads[i * 4] = Math.cos(w.a); out.heads[i * 4 + 1] = Math.sin(w.a); out.heads[i * 4 + 2] = w.size; out.heads[i * 4 + 3] = fade;
    for (let f = 0; f < 2; f++) {
      const ft = w.feet[f], j = (i * 2 + f) * 4;
      out.feet[j] = ft.x; out.feet[j + 1] = ft.y; out.feet[j + 2] = ft.a; out.feet[j + 3] = fade < 1 ? Math.max(ft.lift, 1 - fade) : ft.lift;
    }
  }
}
