import { ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { T } from '@/themes/kit';
import { hair } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Icon, IconName } from '@/ui/Icon';
import { shade, Tier, TIERS, useOil } from './look';
import { bristles, compose, dabPath, open, Part, Pt, ripples, rng, stars, strokePath, underdrawing } from './paint';

// What the studio is made of: canvases painted stroke by stroke, the easel,
// frames that get grander, museum labels, a palette, a sketchbook's ink
// checks — and things that answer a tap like paint: a smear where you touch,
// a frame knocked a little crooked.

export const useSvgId = () => useId().replace(/[^a-zA-Z0-9]/g, '');

// ---------- the painting ----------
/**
 * A canvas painted with these minutes: raw canvas and its pencil underdrawing
 * at first, a ground wash and strokes as the minutes come, covered at the goal.
 * Strokes still wet (a session under way) carry a gloss.
 */
export function Painting({ w, h, parts, goal, seed, detail = true }: { w: number; h: number; parts: Part[]; goal: number; seed: string; detail?: boolean }) {
  const { v } = useOil();
  const id = useSvgId();
  // the parts as a key, to the minute, so a running clock doesn't repaint every second
  const key = parts.map((p) => `${p.id}:${p.c}:${Math.floor(p.min)}:${Math.floor(p.live ?? 0)}`).join('|');
  const art = useMemo(() => {
    const { strokes, cover } = compose(w, h, parts, goal, v.brush, seed);
    return {
      cover,
      strokes: strokes.map((s) => ({ ...s, fill: shade(s.c, s.tone), d: strokePath(s.line, s.width, `${seed}:${s.key}`), hairs: detail ? bristles(s.line, s.width, `${seed}:${s.key}`) : [] })),
      sketch: underdrawing(v.brush, w, h),
      lights: v.deco === 'stars' && cover > 0.2 ? stars(w, h, Math.round(9 * cover), seed) : [],
      water: v.deco === 'ripples' && cover > 0.2 ? ripples(w, h, Math.round(6 * cover), seed).map((r, i) => strokePath(r.line, r.width * 2.4, `${seed}:rip${i}`)) : [],
    };
    // `key` stands for the parts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, key, goal, v.brush, v.deco, seed, detail]);
  return (
    <Svg width={w} height={h}>
      <Defs>
        <Pattern id={`${id}weave`} patternUnits="userSpaceOnUse" width={3} height={3}>
          <Rect x={0} y={0} width={3} height={0.8} fill="#000000" opacity={0.022} />
          <Rect x={0} y={0} width={0.8} height={3} fill="#000000" opacity={0.018} />
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={v.raw} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}weave)`} />
      {art.cover < 1 ? art.sketch.map((d, i) => <Path key={`s${i}`} d={d} stroke="#6F6352" strokeWidth={detail ? 0.9 : 0.6} fill="none" opacity={0.5 * (1 - art.cover)} />) : null}
      {art.cover > 0 ? <Rect x={0} y={0} width={w} height={h} fill={v.ground} opacity={0.2 + 0.62 * art.cover} /> : null}
      {art.strokes.map((s) => (
        <G key={s.key}>
          <Path d={s.d} fill={s.fill} opacity={s.o} />
          {s.hairs.map((b, j) => <Path key={j} d={b.d} stroke={b.light ? '#FFFFFF' : '#000000'} strokeWidth={b.w} fill="none" opacity={b.light ? 0.13 : 0.1} strokeLinecap="round" />)}
          {s.wet ? <Path d={s.hairs[0]?.d ?? s.d} stroke="#FFFFFF" strokeWidth={Math.max(0.7, s.width * 0.07)} fill="none" opacity={0.34} strokeLinecap="round" /> : null}
        </G>
      ))}
      {art.water.map((d, i) => <Path key={`w${i}`} d={d} fill="#FFFFFF" opacity={0.4} />)}
      {art.lights.map((s, i) => (
        <G key={`l${i}`}>
          <Circle cx={s.x} cy={s.y} r={s.r * 2.6} fill={v.accent} opacity={0.2} />
          <Circle cx={s.x} cy={s.y} r={s.r} fill={v.accent} />
        </G>
      ))}
    </Svg>
  );
}

/** An easel with a w × h canvas on it: legs splayed behind, the canvas on a ledge, a clamp at the top. */
export function Easel({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const { v } = useOil();
  const W = w + 44, H = h + 54, top = 12, cx = W / 2;
  return (
    <View style={{ width: W, height: H }}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Path d={`M${cx} ${top}L${cx + 7} ${H - 2}`} stroke={v.woodDark} strokeWidth={6} strokeLinecap="round" />
        <Path d={`M${cx - 9} ${top - 2}L9 ${H - 2}`} stroke={v.wood} strokeWidth={7} strokeLinecap="round" />
        <Path d={`M${cx + 9} ${top - 2}L${W - 9} ${H - 2}`} stroke={v.wood} strokeWidth={7} strokeLinecap="round" />
        <Path d={`M${W * 0.2} ${H - 16}L${W * 0.8} ${H - 16}`} stroke={v.woodDark} strokeWidth={4} strokeLinecap="round" />
      </Svg>
      <View style={{ position: 'absolute', left: 22, top, width: w, height: h, boxShadow: '2px 5px 12px rgba(0,0,0,0.3)' }}>
        {children}
        {/* the canvas's side */}
        <View pointerEvents="none" style={{ position: 'absolute', right: -4, top: 3, bottom: -1, width: 4, backgroundColor: shade(v.raw, -0.3) }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: cx - 20, top: top - 7, width: 40, height: 11, borderRadius: 2, backgroundColor: v.woodLight, borderBottomWidth: 2, borderBottomColor: v.woodDark }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 8, right: 8, top: top + h - 3, height: 11, borderRadius: 2, backgroundColor: v.woodLight, borderBottomWidth: 3, borderBottomColor: v.woodDark }} />
    </View>
  );
}

// ---------- frames and labels ----------
/** The width a frame of this thickness adds on each side. */
export const frameEdge = (thick: number) => thick + 1;
/** A frame, beveled like a moulding; the grandest has ornaments at the corners. */
export function GiltFrame({ tier, thick = 8, children, style }: { tier: Tier; thick?: number; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const g = TIERS[tier];
  const a = Math.max(2, Math.round(thick * 0.6)), b = Math.max(1, thick - a);
  const orn = Math.max(4, Math.round(thick * 0.9));
  return (
    <View style={[{ borderWidth: a, borderTopColor: g.hi, borderLeftColor: g.hi, borderBottomColor: g.lo, borderRightColor: g.lo, backgroundColor: g.mid, boxShadow: '1px 3px 7px rgba(0,0,0,0.3)' }, style]}>
      <View style={{ borderWidth: b, borderTopColor: g.lo, borderLeftColor: g.lo, borderBottomColor: g.hi, borderRightColor: g.hi }}>
        <View style={{ borderWidth: 1, borderColor: g.line, overflow: 'hidden' }}>{children}</View>
      </View>
      {tier === 'grand' ? ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).map(([x, y]) => (
        <View key={`${x}${y}`} pointerEvents="none" style={{ position: 'absolute', width: orn, height: orn, backgroundColor: g.hi, borderWidth: 1, borderColor: g.lo, transform: [{ rotate: '45deg' }],
          [x < 0 ? 'left' : 'right']: -a - orn / 2 + a / 2, [y < 0 ? 'top' : 'bottom']: -a - orn / 2 + a / 2 }} />
      )) : null}
    </View>
  );
}
/** A frame's bevel laid over something that's already there (so nothing moves when it's framed). */
export function FrameOver({ tier, thick = 7 }: { tier: Tier; thick?: number }) {
  const g = TIERS[tier];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderWidth: thick, borderTopColor: g.hi, borderLeftColor: g.hi, borderBottomColor: g.lo, borderRightColor: g.lo }]}>
      <View style={[StyleSheet.absoluteFill, { borderWidth: 1, borderColor: g.line }]} />
    </View>
  );
}

/** A museum label: a small card of paper on the wall. */
export function Placard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { v } = useOil();
  return (
    <View style={[{ backgroundColor: v.paper, paddingHorizontal: 14, paddingVertical: 11, borderWidth: hair, borderColor: 'rgba(0,0,0,0.12)',
      boxShadow: '0px 1px 2px rgba(0,0,0,0.14), 0px 5px 12px rgba(0,0,0,0.1)' }, style]}>
      {children}
    </View>
  );
}

/** A section's title, with a short stroke of paint under it. */
export function Heading({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  const { t, v } = useOil();
  const d = useMemo(() => strokePath([[2, 4], [16, 3.4], [30, 4.4], [44, 3.6]], 6, `h${title}`), [title]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
      <View style={{ flexShrink: 0 }}>
        <T size={20} lh={26}>{title}</T>
        <Svg width={46} height={8} style={{ marginTop: 1 }}><Path d={d} fill={v.accent} opacity={0.85} /></Svg>
      </View>
      {sub ? <T size={11.5} color={t.ink3} numberOfLines={1} style={{ flex: 1, marginBottom: 10 }}>{sub}</T> : <View style={{ flex: 1 }} />}
      {right ? <View style={{ marginBottom: 8 }}>{right}</View> : null}
    </View>
  );
}

// ---------- paint you can touch ----------
type Smear = { id: number; x: number; y: number; c: string };
let smearSeq = 0;
/**
 * Something painted that answers a tap like paint: a smear where you touch it
 * (in one of `colors`), and a little knock that leaves it crooked a moment.
 * A press that travelled (a swipe) doesn't count as a tap.
 */
export function PaintTap({ children, onPress, a11y, colors, tilt = 1.6, smear = true, role, style }: {
  children: ReactNode; onPress?: () => void; a11y: string; colors: string[]; tilt?: number; smear?: boolean;
  role?: 'button' | 'image' | 'link'; style?: StyleProp<ViewStyle>;
}) {
  const [smears, setSmears] = useState<Smear[]>([]);
  const r = useSharedValue(0);
  const at = useRef({ x: 0, y: 0 });
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const down = (e: GestureResponderEvent) => {
    const { locationX: x, locationY: y, pageX, pageY } = e.nativeEvent;
    at.current = { x: pageX, y: pageY };
    r.set(withSequence(withTiming(-tilt, { duration: 90, easing: Easing.out(Easing.quad) }), withSpring(0, { duration: 760, dampingRatio: 0.28 })));
    if (!smear || !colors.length) return;
    const id = ++smearSeq;
    setSmears((s) => [...s.slice(-2), { id, x, y, c: colors[id % colors.length] }]);
    setTimeout(() => setSmears((s) => s.filter((m) => m.id !== id)), 1000);
  };
  return (
    <Pressable onPressIn={down}
      onPress={(e) => { if (Math.hypot(e.nativeEvent.pageX - at.current.x, e.nativeEvent.pageY - at.current.y) > 12) return; haptic.tap(); onPress?.(); }}
      accessibilityRole={role ?? (onPress ? 'button' : 'image')} accessibilityLabel={a11y} style={style}>
      <Animated.View style={a}>
        {/* the pieces inside don't take the touch, so where it lands is measured on this */}
        <View pointerEvents="none">{children}</View>
        {smears.map((s) => <SmearMark key={s.id} {...s} />)}
      </Animated.View>
    </Pressable>
  );
}
function SmearMark({ id, x, y, c }: Smear) {
  const o = useSharedValue(0.95);
  const d = useMemo(() => {
    const r = rng(id);
    const th = (r() - 0.5) * 0.9, L = 52 + r() * 16;
    const line: Pt[] = Array.from({ length: 7 }, (_, k) => { const s = (k / 6 - 0.5) * L; return [38 + s * Math.cos(th), 20 + s * Math.sin(th) + Math.sin(k) * 1.8] as Pt; });
    return { body: strokePath(line, 17, id), hairs: bristles(line, 17, id) };
  }, [id]);
  useEffect(() => { o.set(withDelay(300, withTiming(0, { duration: 700, easing: Easing.in(Easing.quad) }))); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x - 38, top: y - 20, width: 76, height: 40 }, a]}>
      <Svg width={76} height={40}>
        <Path d={d.body} fill={shade(c, 0.18)} />
        <Path d={d.body} fill="none" stroke={shade(c, -0.35)} strokeWidth={0.8} opacity={0.5} />
        {d.hairs.map((b, j) => <Path key={j} d={b.d} stroke={b.light ? '#FFFFFF' : '#000000'} strokeWidth={b.w * 1.4} fill="none" opacity={b.light ? 0.5 : 0.18} strokeLinecap="round" />)}
      </Svg>
    </Animated.View>
  );
}

// ---------- buttons, checks, dabs ----------
/** A button painted as one stroke of the brush. */
export function StrokeButton({ label, onPress, color, ink, a11y, h = 40, icon, disabled, style }: {
  label: string; onPress: () => void; color: string; ink: string; a11y?: string; h?: number; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  const d = useMemo(() => {
    if (!w) return '';
    const line: Pt[] = Array.from({ length: 8 }, (_, k) => [2 + (k / 7) * (w - 4), h / 2 + Math.sin(k * 1.3) * 1.2] as Pt);
    return strokePath(line, h * 0.98, `btn${label}${Math.round(w)}`);
  }, [w, h, label]);
  return (
    <Press onPress={onPress} disabled={disabled} scale={0.95} accessibilityRole="button" accessibilityLabel={a11y ?? label} onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={[{ height: h, minWidth: h * 2, paddingHorizontal: Math.round(h * 0.5), alignItems: 'center', justifyContent: 'center' }, style]}>
      {d ? <Svg width={w} height={h} style={StyleSheet.absoluteFill}><Path d={d} fill={color} /></Svg> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 }}>
        {icon ? <Icon name={icon} size={Math.round(h * 0.3)} color={ink} /> : null}
        <T size={h >= 40 ? 14.5 : 13} lh={h >= 40 ? 19 : 17} color={ink} numberOfLines={1}>{label}</T>
      </View>
    </Press>
  );
}

/** A box drawn by hand in ink; ticked, a check is drawn into it. */
export function InkCheck({ on, size = 22, color }: { on: boolean; size?: number; color: string }) {
  const p = useSharedValue(on ? 1 : 0);
  const was = useRef(on);
  useEffect(() => {
    if (on && !was.current) { p.set(0); p.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) })); }
    else if (!on) p.set(0);
    was.current = on;
  }, [on, p]);
  const box = useMemo(() => {
    const r = rng(`box${size}`);
    const j = () => (r() - 0.5) * size * 0.08;
    return open([[2 + j(), 3 + j()], [size - 2 + j(), 2 + j()], [size - 3 + j(), size - 2 + j()], [2 + j(), size - 3 + j()], [2.5 + j(), 1.5 + j()]]);
  }, [size]);
  const tick = useMemo(() => open([[size * 0.16, size * 0.52], [size * 0.42, size * 0.8], [size * 1.05, size * 0.02]]), [size]);
  const clip = useAnimatedStyle(() => ({ width: p.value * size * 1.2 }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}><Path d={box} stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" opacity={0.75} /></Svg>
      <Animated.View style={[{ position: 'absolute', left: 0, top: -4, height: size + 6, overflow: 'hidden' }, clip]}>
        <Svg width={size * 1.2} height={size + 6}><Path d={tick} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 4)" /></Svg>
      </Animated.View>
    </View>
  );
}

/** A dab of paint, with a little light on it. */
export function Dab({ size, color, seed, style }: { size: number; color: string; seed: string | number; style?: StyleProp<ViewStyle> }) {
  const d = useMemo(() => dabPath(size / 2, size / 2, size * 0.42, seed), [size, seed]);
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Path d={d} fill={color} />
        <Circle cx={size * 0.38} cy={size * 0.36} r={size * 0.09} fill="#FFFFFF" opacity={0.45} />
      </Svg>
    </View>
  );
}

/** A tube of paint (a rest ticket): full, or squeezed out. */
export function Tube({ full, color, ink }: { full: boolean; color: string; ink: string }) {
  return (
    <Svg width={34} height={15}>
      <Path d="M3 2.5L8 2.5L8 12.5L3 12.5L5 10L3 7.5L5 5Z" fill={full ? ink : 'none'} stroke={ink} strokeWidth={1} opacity={full ? 0.8 : 0.45} />
      <Path d="M8 2L25 3.5Q27 4 27 7.5Q27 11 25 11.5L8 13Z" fill={full ? color : 'none'} stroke={ink} strokeWidth={1} strokeDasharray={full ? undefined : '2 2'} opacity={full ? 1 : 0.5} />
      <Path d="M27 5L32 5.5L32 9.5L27 10Z" fill={full ? ink : 'none'} stroke={ink} strokeWidth={1} opacity={full ? 0.85 : 0.45} />
    </Svg>
  );
}

/** The デザイン page's handle: a brush hanging off the left edge, its tip dipped in paint. */
export function BrushHandle({ onPress }: { onPress: () => void }) {
  const { v } = useOil();
  return (
    <Press onPress={onPress} react="soft" scale={0.9} hitSlop={{ top: 16, bottom: 16, left: 4, right: 12 }} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '44%', width: 14, height: 76 }}>
      <Svg width={14} height={76}>
        <Rect x={0} y={0} width={9} height={42} rx={4} fill={v.wood} />
        <Rect x={0} y={4} width={3} height={34} rx={1.5} fill={v.woodLight} opacity={0.7} />
        <Rect x={0} y={41} width={10} height={11} fill="#B9B4A8" />
        <Path d="M0 51.5L10 51.5Q13 60 7 76Q2 68 0 64Z" fill={v.accent} />
      </Svg>
    </Press>
  );
}

/** The wall behind a painting on the timer: a soft pool of light from one lamp. */
export function Spotlight({ w, h, color }: { w: number; h: number; color: string }) {
  const id = useSvgId();
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id={`${id}lamp`} cx="50%" cy="40%" r="58%" fx="50%" fy="36%">
          <Stop offset="0" stopColor={color} stopOpacity={0.17} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.06} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}lamp)`} />
    </Svg>
  );
}
