import { createPicture, drawAsImageFromPicture, FillType, Skia, type SkPath } from '@shopify/react-native-skia';

import { MARKS } from '../../lib/koi';
import { MAX_WALKERS } from '../../lib/walkers';

// What the engine draws with, made once: the koi's atlas (a tile and the
// marks, white, to be tinted) and the glass floor's shader.

/** A mark's shape, white, in a cell `s` across. */
function markPath(kind: string, s: number): SkPath {
  const p = Skia.PathBuilder.Make();
  const c = s / 2;
  const dot = (x: number, y: number, r: number) => p.addCircle(x, y, r);
  const bar = (x: number, y: number, w: number, h: number) => p.addRect(Skia.XYWHRect(x - w / 2, y - h / 2, w, h));
  const rot = (w: number, h: number, a: number) => {
    const co = Math.cos(a), si = Math.sin(a);
    const pt = (x: number, y: number) => Skia.Point(c + x * co - y * si, c + x * si + y * co);
    p.addPoly([pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)], true);
  };
  switch (kind) {
    case 'dot': dot(c, c, s * 0.07); break;
    case 'dot2': dot(c, c, s * 0.11); break;
    case 'colon': dot(c, c - s * 0.16, s * 0.075); dot(c, c + s * 0.16, s * 0.075); break;
    case 'tri': dot(c, c - s * 0.16, s * 0.07); dot(c - s * 0.15, c + s * 0.11, s * 0.07); dot(c + s * 0.15, c + s * 0.11, s * 0.07); break;
    case 'plus': bar(c, c, s * 0.42, s * 0.09); bar(c, c, s * 0.09, s * 0.42); break;
    case 'cross': rot(s * 0.42, s * 0.09, Math.PI / 4); rot(s * 0.42, s * 0.09, -Math.PI / 4); break;
    case 'ring': p.addCircle(c, c, s * 0.2); p.addCircle(c, c, s * 0.12); p.setFillType(FillType.EvenOdd); break;
    case 'star': bar(c, c, s * 0.44, s * 0.08); bar(c, c, s * 0.08, s * 0.44); rot(s * 0.38, s * 0.08, Math.PI / 4); rot(s * 0.38, s * 0.08, -Math.PI / 4); break;
    case 'hash': bar(c - s * 0.11, c, s * 0.075, s * 0.46); bar(c + s * 0.11, c, s * 0.075, s * 0.46); bar(c, c - s * 0.11, s * 0.46, s * 0.075); bar(c, c + s * 0.11, s * 0.46, s * 0.075); break;
    case 'grid': p.addRect(Skia.XYWHRect(c - s * 0.22, c - s * 0.22, s * 0.44, s * 0.44)); p.addRect(Skia.XYWHRect(c - s * 0.14, c - s * 0.14, s * 0.28, s * 0.28)); dot(c, c, s * 0.06); p.setFillType(FillType.EvenOdd); break;
    case 'disc': dot(c, c, s * 0.21); break;
    case 'block': p.addRRect(Skia.RRectXY(Skia.XYWHRect(c - s * 0.23, c - s * 0.23, s * 0.46, s * 0.46), s * 0.08, s * 0.08)); break;
    case 'dash': bar(c, c, s * 0.46, s * 0.08); break;
  }
  return p.build();
}

/** The atlas: slot 0 the tile, then each mark; `px` device pixels a slot. */
export function makeAtlas(px: number) {
  const n = MARKS.length;
  const pic = createPicture((canvas) => {
    const paint = Skia.Paint();
    paint.setColor(Skia.Color('white'));
    paint.setAntiAlias(true);
    const inset = Math.max(1, px * 0.07);
    canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(inset, inset, px - inset * 2, px - inset * 2), px * 0.18, px * 0.18), paint);
    for (let m = 1; m < n; m++) {
      canvas.save();
      canvas.translate(m * px, 0);
      canvas.drawPath(markPath(MARKS[m], px), paint);
      canvas.restore();
    }
  }, Skia.XYWHRect(0, 0, px * n, px));
  return drawAsImageFromPicture(pic, { width: px * n, height: px });
}

/** The faint grid the koi swim on: a line every `cell` points. */
export function makeGrid(cols: number, rows: number, cell: number) {
  const g = Skia.PathBuilder.Make();
  for (let x = 0; x <= cols; x++) { g.moveTo(x * cell, 0); g.lineTo(x * cell, rows * cell); }
  for (let y = 0; y <= rows; y++) { g.moveTo(0, y * cell); g.lineTo(cols * cell, y * cell); }
  return g.build();
}

// The glass floor, seen from below: a fine halftone screen of dots at 45°,
// darker where someone's shadow falls; a sole on the glass is solid ink with a
// crisp edge, and blurs into dots as it lifts.
export const FLOOR_SKSL = `
uniform float pitch;
uniform float scale;
uniform float3 ink;
uniform float4 bodies[${MAX_WALKERS}];
uniform float4 heads[${MAX_WALKERS}];
uniform float4 feet[${MAX_WALKERS * 2}];

float sole(float2 p, float2 b, float r) {
  float2 q = abs(p) - b + float2(r);
  return length(max(q, float2(0.0))) + min(max(q.x, q.y), 0.0) - r;
}

half4 main(float2 xy) {
  float shade = 0.0;
  for (int i = 0; i < ${MAX_WALKERS}; i++) {
    float4 b = bodies[i];
    float2 d = xy - b.xy;
    // only near someone (most of the floor is far from everyone)
    if (b.w > 0.0 && dot(d, d) < b.z * b.z * 7.0) {
      float4 h = heads[i];
      // shoulders wider than deep
      float along = dot(d, h.xy) / (b.z * 0.72);
      float across = dot(d, float2(-h.y, h.x)) / (b.z * 1.1);
      shade += b.w * exp(-(along * along + across * across) * 0.9);
    }
  }
  float solid = 0.0;
  for (int i = 0; i < ${MAX_WALKERS * 2}; i++) {
    float4 f = feet[i];
    float2 d = xy - f.xy;
    float near = 22.0 * scale + f.w * 26.0 * scale;
    if (dot(d, d) < near * near) {
      float c = cos(f.z);
      float s = sin(f.z);
      float2 p = float2(c * d.x + s * d.y, -s * d.x + c * d.y);
      float L = 14.0 * scale;
      float W = 5.6 * scale;
      // a little rounder and wider toward the toe
      float sd = sole(p - float2(1.5 * scale, 0.0), float2(L, W + p.x * 0.05), W * 0.95);
      float lift = f.w;
      float blur = 1.0 + lift * 20.0 * scale;
      shade += (1.0 - smoothstep(-blur, blur, sd)) * (0.95 - lift * 0.55);
      solid = max(solid, (1.0 - smoothstep(-0.7, 0.7, sd)) * (1.0 - smoothstep(0.02, 0.16, lift)));
    }
  }
  if (shade <= 0.001 && solid <= 0.0) {
    return half4(0.0);
  }
  shade = clamp(shade, 0.0, 1.0);
  float2 g = float2(xy.x + xy.y, xy.y - xy.x) * 0.70710678 / pitch;
  float2 cell = fract(g) - 0.5;
  // dots grow with the shade and fade out at its rim, so the shadow has no edge
  float r = pow(shade, 0.8) * 0.64;
  float dotv = 1.0 - smoothstep(r - 0.12, r + 0.12, length(cell));
  float a = max(dotv * smoothstep(0.0, 0.05, shade), solid) * 0.88;
  return half4(half3(ink) * a, a);
}
`;
