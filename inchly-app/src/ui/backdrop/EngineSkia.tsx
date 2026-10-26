import { BlendMode, createPicture, PaintStyle, Skia, type SkColor, type SkRect, type SkRSXform } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { makePond, MARKS, paint, step } from '../../lib/koi';
import { crowdUniforms, makeCrowd, MAX_WALKERS, stepCrowd } from '../../lib/walkers';
import { FLOOR_SKSL, makeAtlas, makeGrid } from './draw';
import { backdropAvoid, backdropPicture, backdropWorld, CELL, GROUND, walkerTags, type World } from './shared';

// The engine: moves the world on, on the UI thread, and draws it into a
// picture — the koi and sharks 24 times a second (a mosaic of tinted tiles and
// marks from one atlas, in one call; the colors made once and reused), the
// glass floor 30 times (one shader). Renders nothing itself.

export type EngineProps = { kind: World['kind']; width: number; height: number };

export default function EngineSkia({ kind, width, height }: EngineProps) {
  const cols = Math.ceil(width / CELL), rows = Math.ceil(height / CELL);
  const pr = Math.min(3, PixelRatio.get());
  const px = Math.round(CELL * pr);
  const sea = kind === 'sea';
  // made once for this size: the atlas and a source rect per slot, a transform per cell, the grid, the paints, the floor's shader
  const fixed = useMemo(() => {
    const atlas = makeAtlas(px);
    const slots = MARKS.map((_, m) => Skia.XYWHRect(m * px, 0, px, px));
    const at: SkRSXform[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) at.push(Skia.RSXform(1 / pr, 0, x * CELL, y * CELL));
    const line = Skia.Paint();
    line.setStyle(PaintStyle.Stroke);
    line.setStrokeWidth(StyleSheet.hairlineWidth);
    line.setColor(Skia.Color(sea ? 'rgba(20,30,40,0.06)' : 'rgba(255,255,255,0.04)'));
    const floor = Skia.Paint();
    return {
      atlas, slots, at, grid: makeGrid(cols, rows, CELL), line, tiles: Skia.Paint(), floor, ground: Skia.Color(GROUND[kind]),
      effect: kind === 'walk' ? Skia.RuntimeEffect.Make(FLOOR_SKSL) : null, bounds: Skia.XYWHRect(0, 0, width, height),
    };
  }, [px, pr, cols, rows, sea, kind, width, height]);
  // until the first frame: the bare ground
  useEffect(() => {
    if (!backdropPicture.value) backdropPicture.value = createPicture((c) => c.drawColor(fixed.ground), fixed.bounds);
  }, [fixed]);

  const acc = useSharedValue(1);
  // colors made once and reused (a color with its strength taken to 1/32): no new objects each frame
  const tints = useSharedValue<Record<number, SkColor> | null>(null);
  const made = useSharedValue(0);
  const count = sea ? Math.max(3, Math.min(5, Math.round((cols * rows) / 1000))) : Math.max(3, Math.min(7, Math.round((cols * rows) / 560)));
  const { atlas, slots, at, grid, line, tiles, floor, ground, effect, bounds } = fixed;

  useFrameCallback((f) => {
    'worklet';
    let w = backdropWorld.value;
    if (!w || w.kind !== kind || w.w !== width || w.h !== height) {
      w = { kind, w: width, h: height, pond: null, crowd: null };
      if (kind === 'walk') {
        const c = makeCrowd(width, height, 11, width * height > 600 * 900 ? 5 : 4);
        for (let i = 0; i < 90; i++) stepCrowd(c, 1 / 30);
        w.crowd = c;
      } else {
        const p = makePond(cols, rows, sea ? 31 : 23, count, sea ? 'shark' : 'koi');
        for (let i = 0; i < 300; i++) step(p, 1 / 30); // already swimming when it shows
        w.pond = p;
      }
      backdropWorld.value = w;
    }
    const dt = (f.timeSincePreviousFrame ?? 16) / 1000;
    const a = backdropAvoid.value;
    if (w.crowd) {
      const c = w.crowd;
      c.avoid = a ? { x0: a.x, y0: a.y, x1: a.x + a.w, y1: a.y + a.h } : null;
      stepCrowd(c, dt);
      acc.value += dt;
      if (acc.value < 1 / 30 || !effect) return;
      acc.value = 0;
      const u = {
        bodies: new Array(MAX_WALKERS * 4).fill(0), heads: new Array(MAX_WALKERS * 4).fill(0), feet: new Array(MAX_WALKERS * 8).fill(0),
      };
      crowdUniforms(c, u);
      const scale = Math.min(1.5, Math.max(0.9, Math.min(width, height) / 393));
      // in the shader's order: pitch, scale, ink, bodies, heads, feet
      floor.setShader(effect.makeShader([3.4, scale, 0.09, 0.09, 0.09, ...u.bodies, ...u.heads, ...u.feet]));
      const rec = Skia.PictureRecorder();
      const cv = rec.beginRecording(bounds);
      cv.drawColor(ground);
      cv.drawPaint(floor);
      backdropPicture.value = rec.finishRecordingAsPicture();
      // the tags: where each walker is and who
      const t = new Array(MAX_WALKERS * 4).fill(0);
      for (let i = 0; i < c.walkers.length && i < MAX_WALKERS; i++) {
        const k = c.walkers[i];
        t[i * 4] = k.x; t[i * 4 + 1] = k.y; t[i * 4 + 2] = Math.min(1, k.age / 1.5); t[i * 4 + 3] = k.id + 1;
      }
      walkerTags.value = t;
      return;
    }
    const p = w.pond;
    if (!p) return;
    p.avoid = a ? { x0: a.x / CELL, y0: a.y / CELL, x1: (a.x + a.w) / CELL, y1: (a.y + a.h) / CELL } : null;
    step(p, dt);
    acc.value += dt;
    if (acc.value < 1 / 24) return;
    acc.value = 0;
    paint(p);
    let cache = tints.value;
    // kept to a size: started afresh when it has grown large
    if (!cache || made.value > 20000) { cache = {}; tints.value = cache; made.value = 0; }
    const S: SkRect[] = [], T: SkRSXform[] = [], C: SkColor[] = [];
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const tl = p.tile[i], mk = p.mark[i];
      if (tl > 0.01) {
        const c = p.tileRGB[i];
        S.push(slots[0]); T.push(at[i]);
        const q = Math.min(31, Math.round(tl * 31)), key = c * 32 + q;
        let col = cache[key];
        if (!col) { col = Float32Array.of(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, q / 31); cache[key] = col; made.value += 1; }
        C.push(col);
      }
      if (mk) {
        const c = p.markRGB[i];
        S.push(slots[mk]); T.push(at[i]);
        const q = Math.min(31, Math.round(p.markA[i] * 31)), key = c * 32 + q;
        let col = cache[key];
        if (!col) { col = Float32Array.of(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, q / 31); cache[key] = col; made.value += 1; }
        C.push(col);
      }
    }
    const rec = Skia.PictureRecorder();
    const cv = rec.beginRecording(bounds);
    cv.drawColor(ground);
    cv.drawPath(grid, line);
    if (S.length && atlas) cv.drawAtlas(atlas, S, T, tiles, BlendMode.DstIn, C);
    backdropPicture.value = rec.finishRecordingAsPicture();
  });
  return null;
}
