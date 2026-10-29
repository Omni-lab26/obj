import { BlendMode, Group, Path, Skia, TileMode, type SkImageFilter, type SkPaint, type SkPath } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { type SharedValue, useDerivedValue } from 'react-native-reanimated';

import { LATW, SMALL, strokesOf } from './sign';

// Neon kanji in Skia, after サイバー's parts bible: one tube per stroke, along
// the stroke centrelines of KanjiVG (© Ulrich Apel, CC BY-SA 3.0). A later
// stroke's middle (9–91% of its length) cuts the tubes before it, as a real
// sign's tube passes behind; strokes are joined by short painted-over tubes;
// the core is near white and the glow is the sign's color, blurred three times
// (3%, 10% twice, 26% of the size), as one filter over the whole sign. A sign
// that can't be tubes (a character without strokes) is an acrylic box instead
// (Lightbox, ui side) — the caller decides with tubesOf(): null means a box.

/** A sign's strokes, worked out once: each character's stroke centrelines (in writing order), the middles that cut, and the joins. */
export type Tubes = {
  W: number; H: number; size: number;
  chars: { strokes: SkPath[]; mids: SkPath[]; joins: SkPath | null }[];
  /** strokes in all */
  total: number;
};

const cache = new Map<string, Tubes | null>();
/** The tubes of a sign at a size (vertical: one character under another), or null when a character has no strokes. */
export function tubesOf(text: string, size: number, vert = true): Tubes | null {
  const key = `${text}|${size}|${vert ? 'v' : 'h'}`;
  if (cache.has(key)) return cache.get(key)!;
  const ch = [...text];
  if (!ch.length || ch.some((c) => !strokesOf(c))) { cache.set(key, null); return null; }
  const n = ch.length, gap = Math.round(size * 0.08), s = size / 109;
  const adv = ch.map((c) => (vert ? 1 : LATW[c] ?? 1) * size);
  const at = adv.map((_, i) => adv.slice(0, i).reduce((x, y) => x + y + gap, 0));
  const W = vert ? size : at[n - 1] + adv[n - 1], H = vert ? n * size + (n - 1) * gap : size;
  let total = 0;
  const chars = ch.map((c, i) => {
    const m = Skia.Matrix().translate(vert ? 0 : at[i], vert ? at[i] : 0).scale(s);
    // in a vertical sign, small kana sit at the upper right and the long-vowel mark stands up
    if (vert && SMALL.includes(c)) m.translate(11.5, -25.5).translate(54.5, 69.5).scale(0.8).translate(-54.5, -69.5);
    if (vert && c === 'ー') m.translate(54.5, 54.5).rotate(Math.PI / 2).translate(-54.5, -54.5);
    const strokes = strokesOf(c)!.map((d) => Skia.PathBuilder.MakeFromPath(Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make()).transform(m).build());
    total += strokes.length;
    // only the middle of a later stroke cuts: a stroke that merely ends on another (a T) leaves it whole
    const mids = strokes.map((p) => Skia.Path.Trim(p, 0.09, 0.91, false) ?? Skia.Path.Make());
    // a glass bender paints only short hops between strokes (a third of the character); a long one goes behind the plate
    const b = Skia.PathBuilder.Make();
    let any = false;
    for (let k = 0; k < strokes.length - 1; k++) {
      const a = strokes[k].getLastPt(), z = strokes[k + 1].getPoint(0);
      if (Math.hypot(z.x - a.x, z.y - a.y) <= 36 * s) { b.moveTo(a.x, a.y).lineTo(z.x, z.y); any = true; }
    }
    return { strokes, mids, joins: any ? b.build() : null };
  });
  const t: Tubes = { W, H, size, chars, total };
  cache.set(key, t);
  return t;
}

/** The color mixed toward white: a tube's core is the sign's color at 26%. */
export function mixWhite(hex: string, share = 0.26) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * share + 255 * (1 - share)));
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
/** Tubes that aren't lit, and the paint over the joins. */
export const DIM = '#2B3944';
const JOIN = '#18212A';

/** The glow: the tubes' shape in the sign's color, blurred at 26%, 10% (twice) and 3% of the size, under the tubes themselves. */
function glowPaint(color: string, size: number): SkPaint {
  const k = Skia.ImageFilter.MakeColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(color), BlendMode.SrcIn), null);
  const blur = (sg: number) => Skia.ImageFilter.MakeBlur(sg, sg, TileMode.Decal, k);
  // one over another, the tubes last (a merge, written as blends: the web's Skia has no merge filter)
  const over = (under: SkImageFilter, top: SkImageFilter | null) => Skia.ImageFilter.MakeBlend(BlendMode.SrcOver, under, top);
  const p = Skia.Paint();
  p.setImageFilter(over(over(over(over(blur(size * 0.26), blur(size * 0.1)), blur(size * 0.1)), blur(size * 0.03)), null));
  return p;
}
/** The room the glow needs around a sign (3σ of the widest blur). */
export const glowMargin = (size: number) => Math.ceil(size * 0.85);

/**
 * A sign's tubes as Skia drawing (inside a Canvas), at x, y. off: unlit
 * (paused, or a sign that's out). power: 0 → 1 lights the tubes one stroke at
 * a time in writing order (the start's power-on); left out, all lit.
 */
export function NeonTubes({ tubes, color, off, x = 0, y = 0, power }: { tubes: Tubes; color: string; off?: boolean; x?: number; y?: number; power?: SharedValue<number> }) {
  const core = tubes.size * 0.05;
  const glow = useMemo(() => (off ? Skia.Paint() : glowPaint(color, tubes.size)), [off, color, tubes.size]);
  const ink = off ? DIM : mixWhite(color);
  // each stroke's place in writing order across the sign
  const first = tubes.chars.map((_, i) => tubes.chars.slice(0, i).reduce((a, c) => a + c.strokes.length, 0));
  return (
    <Group transform={[{ translateX: x }, { translateY: y }]}>
      {/* the painted-over joins, never lit */}
      {tubes.chars.map((c, i) => (c.joins ? <Path key={`j${i}`} path={c.joins} style="stroke" strokeWidth={core} strokeCap="round" color={JOIN} /> : null))}
      {/* while powering on, the tubes not yet lit show dark */}
      {power ? <Strokes tubes={tubes} ink={DIM} core={core} /> : null}
      {/* a layer of its own, so a cut only takes away tube (and the glow is one filter over the whole sign) */}
      <Group layer={glow}>
        <Strokes tubes={tubes} ink={ink} core={core} power={power} first={first} />
      </Group>
    </Group>
  );
}

/** Every stroke in writing order; before each, the middle of it cuts what's drawn already (the tubes it passes in front of). */
function Strokes({ tubes, ink, core, power, first }: { tubes: Tubes; ink: string; core: number; power?: SharedValue<number>; first?: number[] }) {
  return (
    <Group layer>
      {tubes.chars.map((c, i) => c.strokes.map((p, k) => (
        <Group key={`${i}-${k}`}>
          {k ? <Path path={c.mids[k]} style="stroke" strokeWidth={core * 2.4} color="#000" blendMode="clear" /> : null}
          {power && first ? <LitStroke path={p} ink={ink} core={core} power={power} at={(first[i] + k) / tubes.total} />
            : <Path path={p} style="stroke" strokeWidth={core} strokeCap="round" strokeJoin="round" color={ink} />}
        </Group>
      )))}
    </Group>
  );
}

/** A stroke that lights at its turn (one step, no fade: a tube catching). */
function LitStroke({ path, ink, core, power, at }: { path: SkPath; ink: string; core: number; power: SharedValue<number>; at: number }) {
  const on = useDerivedValue(() => (power.value > at ? 1 : 0.06));
  return <Path path={path} style="stroke" strokeWidth={core} strokeCap="round" strokeJoin="round" color={ink} opacity={on} />;
}
