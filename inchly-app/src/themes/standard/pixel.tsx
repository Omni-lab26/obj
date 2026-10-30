import { memo, useEffect, useMemo, useState } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { fadeIn, M } from '@/ui/motion';
import { CREATURES, type CreatureId, type Face, faceOf, greyed, ICONS, type IconId, type Palette, type Rows, STICKER_PAL, stickerRows, STICKERS, type StickerId } from './art';
import { S } from './look';

// Pixel art from rows of letters (./art.ts): the creatures, the stickers, the
// pixel icons and the logo's mark. Everything here stands still; a creature
// changes its face with one short fade (MOTION.md), nothing hops or blinks.

// ---------- drawing rows ----------
/**
 * Rows like '..kkyy..' — one letter a pixel, '.' empty — in the palette's
 * colors: each color is one path, its runs merged. `w` / `h` give a box the
 * rows sit in (centered across, standing on its floor), so faces of a
 * creature that differ in size stay in place.
 */
export const PixelArt = memo(function PixelArt({ rows, px, colors, w, h }: { rows: Rows; px: number; colors: Palette; w?: number; h?: number }) {
  const rw = Math.max(0, ...rows.map((r) => r.length));
  const W = w ?? rw, H = h ?? rows.length;
  const ox = Math.floor((W - rw) / 2), oy = H - rows.length;
  const paths = useMemo(() => {
    const by: Record<string, string[]> = {};
    rows.forEach((r, y) => {
      let x = 0;
      while (x < r.length) {
        const ch = r[x];
        if (!colors[ch]) { x++; continue; }
        let e = x + 1;
        while (e < r.length && r[e] === ch) e++;
        (by[ch] ??= []).push(`M${ox + x} ${oy + y}h${e - x}v1h${x - e}z`);
        x = e;
      }
    });
    return Object.keys(colors).filter((k) => by[k]).map((k) => ({ k, fill: colors[k], d: by[k].join('') }));
  }, [rows, colors, ox, oy]);
  return (
    <Svg width={W * px} height={H * px} viewBox={`0 0 ${W} ${H}`}>
      {paths.map((p) => <Path key={p.k} d={p.d} fill={p.fill} />)}
    </Svg>
  );
});

// ---------- icons ----------
/** A pixel icon (a pixel 2pt by default: its lines as thick as the outlines), in `color`. */
export function Pix({ name, color = S.ink, px = 2 }: { name: IconId; color?: string; px?: number }) {
  const colors = useMemo(() => ({ k: color }), [color]);
  return <PixelArt rows={ICONS[name]} px={px} colors={colors} />;
}

// ---------- creatures ----------
/**
 * One of Inchly's creatures, still. A new face fades in over the old one
 * (0.2s, once) — nothing moves or changes size. `grey`: unlit (the streak at 0).
 */
export function Creature({ id, face = 'idle', px = 3, grey, style }: { id: CreatureId; face?: Face; px?: number; grey?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = CREATURES[id];
  const pal = useMemo(() => (grey ? greyed(c.pal) : c.pal), [c, grey]);
  // the face under the new one, until the new one has faded in
  const [under, setUnder] = useState(face);
  const [now, setNow] = useState(face);
  if (now !== face) { setNow(face); setUnder(now); }
  useEffect(() => {
    if (under === face) return;
    const id2 = setTimeout(() => setUnder(face), M.fadeIn);
    return () => clearTimeout(id2);
  }, [under, face]);
  const art = (f: Face) => <PixelArt rows={faceOf(id, f)} px={px} colors={pal} w={c.w} h={c.h} />;
  return (
    <View style={[{ width: c.w * px, height: c.h * px }, style]} aria-hidden>
      {art(under)}
      {under !== face ? <Animated.View key={face} entering={fadeIn()} style={{ position: 'absolute', left: 0, top: 0 }}>{art(face)}</Animated.View> : null}
    </View>
  );
}

// ---------- stickers ----------
const STICKER_ROWS = Object.fromEntries((Object.keys(STICKERS) as StickerId[]).map((k) => [k, stickerRows(STICKERS[k].rows)])) as Record<StickerId, Rows>;
const STICKER_COLORS = Object.fromEntries((Object.keys(STICKERS) as StickerId[]).map((k) => [k, { ...STICKER_PAL, ...STICKERS[k].pal }])) as Record<StickerId, Palette>;
const STICKER_GREY = Object.fromEntries((Object.keys(STICKERS) as StickerId[]).map((k) => [k, greyed(STICKER_COLORS[k])])) as Record<StickerId, Palette>;
/** A sticker on the paper: the picture, a white rim, an ink outline and a faint slanted shadow. `locked`: grey and faint (not earned yet). */
export function PixSticker({ name, px = 2, locked, tilt = 0 }: { name: StickerId; px?: number; locked?: boolean; tilt?: number }) {
  return (
    <View style={{ opacity: locked ? 0.38 : 1, transform: tilt ? [{ rotate: `${tilt}deg` }] : undefined }}>
      <PixelArt rows={STICKER_ROWS[name]} px={px} colors={locked ? STICKER_GREY[name] : STICKER_COLORS[name]} />
    </View>
  );
}

// ---------- the logo ----------
/** The logo's mark: an ink tile, five ticks of rising height in the brand's colors, and a lime sprout on the tallest. */
export function LogoMark({ size = 26 }: { size?: number }) {
  const t = S.ticks;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Rect width={16} height={16} rx={3} fill={S.ink} />
      <Rect x={1} y={10} width={2} height={3} fill={t[0]} />
      <Rect x={4} y={8} width={2} height={5} fill={t[1]} />
      <Rect x={7} y={6} width={2} height={7} fill={t[2]} />
      <Rect x={10} y={4} width={2} height={9} fill={t[3]} />
      <Rect x={13} y={2} width={2} height={11} fill={t[4]} />
      <Rect x={13} y={0} width={2} height={1} fill={S.lime} />
    </Svg>
  );
}
