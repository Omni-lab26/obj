import { BlendMode, BlurStyle, createPicture, PaintStyle, Skia, type SkColor, type SkRect, type SkRSXform } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { PixelRatio, StyleSheet } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { makePond, MARKS, paint, soft, step } from '../../lib/koi';
import { crowdUniforms, makeCrowd, MAX_WALKERS, stepCrowd } from '../../lib/walkers';
import { FLOOR_SKSL, makeAtlas, makeGrid } from './draw';
import { backdropAvoid, backdropClock, backdropHeld, backdropPicture, backdropSoft, backdropWorld, CELL, GROUND, sharpUsers, softUsers, walkerTags, type World } from './shared';

// The engine: moves the world on, on the UI thread, 30 times a second, and
// draws only what someone shows (shared.ts):
// - soft, behind the frosted pages: each fish as round shapes in its colors,
//   blurred as they're drawn (Skia's blurred circles are cheap on the GPU), so
//   no view has to blur the screen live; 30 times a second.
// - sharp, the mosaic (the timer, 眺める): thousands of tinted tiles and marks
//   from one atlas, in one call — the costly part — 15 times a second, and
//   only every fourth time (7.5) while a finger is moving something.
// The glass floor is one shader either way (soft: its shadows smooth).
// Renders nothing itself.

export type EngineProps = { kind: World['kind']; width: number; height: number; /** the soft drawing's blur, points */ blur: number };

export default function EngineSkia({ kind, width, height, blur }: EngineProps) {
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
    line.setColor(Skia.Color('rgba(20,34,40,0.06)'));
    return {
      atlas, slots, at, grid: makeGrid(cols, rows, CELL), line, tiles: Skia.Paint(), floor: Skia.Paint(), ground: Skia.Color(GROUND[kind]),
      effect: kind === 'walk' ? Skia.RuntimeEffect.Make(FLOOR_SKSL) : null, bounds: Skia.XYWHRect(0, 0, width, height),
    };
  }, [px, pr, cols, rows, kind, width, height]);
  // the soft drawing's paints: a blurred fill, and a blurred ring for the ripples
  const softPaints = useMemo(() => {
    const sigma = Math.max(1, blur);
    const fill = Skia.Paint();
    fill.setAntiAlias(true);
    fill.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, sigma, true));
    const ring = Skia.Paint();
    ring.setAntiAlias(true);
    ring.setStyle(PaintStyle.Stroke);
    ring.setStrokeWidth(2.5);
    ring.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, Math.max(1, sigma * 0.5), true));
    return { fill, ring };
  }, [blur]);
  // until the first frame: the bare ground. A picture drawn by another engine (the 背景 before this one)
  // holds that engine's atlas and paints, which go when it does — so it's never shown again (on the phone,
  // drawing it after would crash); and when this engine goes, its pictures and its world go with it.
  useEffect(() => {
    const bare = createPicture((c) => c.drawColor(fixed.ground), fixed.bounds);
    backdropPicture.value = bare;
    backdropSoft.value = bare;
    return () => { backdropPicture.value = null; backdropSoft.value = null; backdropWorld.value = null; };
  }, [fixed]);

  const acc = useSharedValue(1);
  // -1: the mosaic is drawn on the very first tick too
  const ticks = useSharedValue(-1);
  // nothing drawn yet: the first pictures are drawn even while the 背景 is held (a tap just picked it)
  const fresh = useSharedValue(true);
  // colors made once and reused (a color with its strength taken to 1/32): no new objects each frame
  const tints = useSharedValue<Record<number, SkColor> | null>(null);
  const made = useSharedValue(0);
  const count = sea ? Math.max(3, Math.min(5, Math.round((cols * rows) / 1000))) : Math.max(3, Math.min(7, Math.round((cols * rows) / 560)));
  const { atlas, slots, at, grid, line, tiles, floor, ground, effect, bounds } = fixed;
  const { fill, ring } = softPaints;

  useFrameCallback((f) => {
    'worklet';
    backdropClock.value = f.timestamp;
    // a finger on the screen, or something moving (holdBackdrop): the world stands still, so the thread is all the gesture's
    if (!fresh.value && f.timestamp < backdropHeld.value) { acc.value = 0; return; }
    // 30 times a second, however fast the screen refreshes
    acc.value += (f.timeSincePreviousFrame ?? 16) / 1000;
    if (acc.value < 1 / 30) return;
    const dt = acc.value;
    acc.value = 0;
    fresh.value = false;
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
    const wantSoft = softUsers.value > 0, wantSharp = sharpUsers.value > 0;
    const a = backdropAvoid.value;
    let cache = tints.value;
    // kept to a size: started afresh when it has grown large
    if (!cache || made.value > 20000) { cache = {}; tints.value = cache; made.value = 0; }
    const tint = (c: number, s: number) => {
      const q = Math.min(31, Math.round(s * 31)), key = c * 32 + q;
      let col = cache![key];
      if (!col) { col = Float32Array.of(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, q / 31); cache![key] = col; made.value += 1; }
      return col;
    };

    if (w.crowd) {
      const c = w.crowd;
      c.avoid = a ? { x0: a.x, y0: a.y, x1: a.x + a.w, y1: a.y + a.h } : null;
      stepCrowd(c, dt);
      if (!effect || !(wantSoft || wantSharp)) return;
      const u = {
        bodies: new Array(MAX_WALKERS * 4).fill(0), heads: new Array(MAX_WALKERS * 4).fill(0), feet: new Array(MAX_WALKERS * 8).fill(0),
      };
      crowdUniforms(c, u);
      const scale = Math.min(1.5, Math.max(0.9, Math.min(width, height) / 393));
      // in the shader's order: pitch, scale, ink, soft, bodies, heads, feet
      const draw = (softly: boolean) => {
        floor.setShader(effect.makeShader([3.4, scale, 0.09, 0.09, 0.09, softly ? 1 : 0, ...u.bodies, ...u.heads, ...u.feet]));
        const rec = Skia.PictureRecorder();
        const cv = rec.beginRecording(bounds);
        cv.drawColor(ground);
        cv.drawPaint(floor);
        return rec.finishRecordingAsPicture();
      };
      if (wantSharp) backdropPicture.value = draw(false);
      if (wantSoft) backdropSoft.value = draw(true);
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

    if (wantSoft) {
      const n = soft(p), o = p.shapes;
      const rec = Skia.PictureRecorder();
      const cv = rec.beginRecording(bounds);
      cv.drawColor(ground);
      for (let i = 0; i < n; i++) {
        const j = i * 5, s = o[j + 4];
        if (s > -0.01 && s < 0.01) continue;
        const pt = s < 0 ? ring : fill;
        pt.setColor(tint(o[j + 3], Math.abs(s)));
        cv.drawCircle(o[j] * CELL, o[j + 1] * CELL, o[j + 2] * CELL, pt);
      }
      backdropSoft.value = rec.finishRecordingAsPicture();
    }

    if (!wantSharp) return;
    ticks.value += 1;
    if (ticks.value % 2 !== 0) return;
    paint(p);
    const S: SkRect[] = [], T: SkRSXform[] = [], C: SkColor[] = [];
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const tl = p.tile[i], mk = p.mark[i];
      if (tl > 0.01) { S.push(slots[0]); T.push(at[i]); C.push(tint(p.tileRGB[i], tl)); }
      if (mk) { S.push(slots[mk]); T.push(at[i]); C.push(tint(p.markRGB[i], p.markA[i])); }
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
