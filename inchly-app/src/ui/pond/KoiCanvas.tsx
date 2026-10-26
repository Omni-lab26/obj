import { Atlas, Canvas, createPicture, drawAsImageFromPicture, FillType, Path, Skia, type SkColor, type SkPath, type SkRect, type SkRSXform } from '@shopify/react-native-skia';
import { useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { feed, makePond, MARKS, paint, type Pond, step, WATER } from '../../lib/koi';
import { haptic } from '../base';

// The koi pond drawn with Skia: the pond (lib/koi) moves on and is painted
// into its grid on the UI thread, and the grid is drawn in one call — an atlas
// of white shapes (a tile and the marks), each placed on its cell and tinted.
// Drawn 30 times a second (the marks are a mosaic; the motion stays smooth).

export type PondProps = { width: number; height: number; cell?: number; feedable?: boolean; seed?: number };

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
  }
  return p.build();
}

/** The atlas: slot 0 the tile, then each mark; `px` device pixels a slot. */
function makeAtlas(px: number) {
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

export default function KoiCanvas({ width, height, cell = 11, feedable = false, seed = 7 }: PondProps) {
  const cols = Math.ceil(width / cell), rows = Math.ceil(height / cell);
  const pr = Math.min(3, PixelRatio.get());
  const px = Math.round(cell * pr);
  // made once for this size: the atlas, a source rect per slot, a transform per cell, the faint grid
  const fixed = useMemo(() => {
    const atlas = makeAtlas(px);
    const slots = MARKS.map((_, m) => Skia.XYWHRect(m * px, 0, px, px));
    const at: SkRSXform[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) at.push(Skia.RSXform(1 / pr, 0, x * cell, y * cell));
    const g = Skia.PathBuilder.Make();
    for (let x = 0; x <= cols; x++) { g.moveTo(x * cell, 0); g.lineTo(x * cell, rows * cell); }
    for (let y = 0; y <= rows; y++) { g.moveTo(0, y * cell); g.lineTo(cols * cell, y * cell); }
    return { atlas, slots, at, grid: g.build() };
  }, [px, pr, cols, rows, cell]);

  const pond = useSharedValue<Pond | null>(null);
  const acc = useSharedValue(1);
  const sprites = useSharedValue<SkRect[]>([]);
  const transforms = useSharedValue<SkRSXform[]>([]);
  const colors = useSharedValue<SkColor[]>([]);
  const count = Math.max(3, Math.min(7, Math.round((cols * rows) / 560)));
  const { slots, at } = fixed;

  useFrameCallback((f) => {
    'worklet';
    let p = pond.value;
    if (!p || p.cols !== cols || p.rows !== rows) {
      p = makePond(cols, rows, seed, count);
      for (let i = 0; i < 300; i++) step(p, 1 / 30); // already swimming when it shows
      pond.value = p;
    }
    const dt = (f.timeSincePreviousFrame ?? 16) / 1000;
    step(p, dt);
    acc.value += dt;
    if (acc.value < 1 / 30) return;
    acc.value = 0;
    paint(p);
    const S: SkRect[] = [], T: SkRSXform[] = [], C: SkColor[] = [];
    const n = cols * rows;
    for (let i = 0; i < n; i++) {
      const tl = p.tile[i], mk = p.mark[i];
      if (tl > 0.01) {
        const c = p.tileRGB[i];
        S.push(slots[0]); T.push(at[i]);
        C.push(Float32Array.of(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, tl));
      }
      if (mk) {
        const c = p.markRGB[i];
        S.push(slots[mk]); T.push(at[i]);
        C.push(Float32Array.of(((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255, p.markA[i]));
      }
    }
    sprites.value = S; transforms.value = T; colors.value = C;
  });

  const [tap] = useState(() => Gesture.Tap().maxDuration(400).onEnd((e) => {
    'worklet';
    if (pond.value) { feed(pond.value, e.x / cell, e.y / cell); scheduleOnRN(haptic.soft); }
  }));
  tap.enabled(feedable);

  const water = `#${WATER.toString(16).padStart(6, '0')}`;
  return (
    <GestureDetector gesture={tap}>
      <View pointerEvents={feedable ? 'auto' : 'none'} style={[StyleSheet.absoluteFill, { backgroundColor: water }]}>
        <Canvas style={{ width, height }}>
          <Path path={fixed.grid} style="stroke" strokeWidth={StyleSheet.hairlineWidth} color="rgba(255,255,255,0.04)" />
          <Atlas image={fixed.atlas} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="dstIn" />
        </Canvas>
      </View>
    </GestureDetector>
  );
}
