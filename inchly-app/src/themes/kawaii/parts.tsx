import { memo, ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Ellipse, G, Line, Path, Pattern, Rect } from 'react-native-svg';

import { themeId, useDesign } from '@/design';
import { T } from '@/themes/kit';
import { font, useT } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { alpha, CLOUD, flowerPetals, HEART, MOCHI, Mood, Piece, Stamp, STAR, Variant, variantOf } from './look';

// The pieces the sticker diary is made of: the colorway, rounded figures,
// stickers (hearts, stars, flowers, clouds), washi tape, paper cards, speech
// bubbles, heart checkboxes, soft pill buttons — and the mochi, who lives on
// the page, breathes, hops while you study, and squishes when you poke it.

/** The colorway you picked (ゆめかわ, ミルクティー or ソーダ). */
export function useV(): Variant {
  return variantOf(themeId(useDesign().theme));
}

/** Figures and Latin in the rounded system face, heavy (SF Pro Rounded on an iPhone). */
export function R(props: Parameters<typeof T>[0]) {
  return <T w="800" {...props} style={[{ fontFamily: font.rounded }, props.style]} />;
}

// ---------- stickers ----------
/** A sticker shape filling a square box. */
export const Shape = memo(function Shape({ kind, size, fill, stroke, sw = 6 }: { kind: Stamp | 'sparkle'; size: number; fill: string; stroke?: string; sw?: number }) {
  const common = { fill, stroke, strokeWidth: stroke ? sw : 0, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="-4 -4 108 108">
      {kind === 'heart' ? <Path d={HEART} {...common} /> : null}
      {kind === 'star' ? <Path d={STAR} {...common} /> : null}
      {kind === 'cloud' ? <Path d={CLOUD} {...common} /> : null}
      {kind === 'sparkle' ? <Path d="M50 6 C54 38 62 46 94 50 C62 54 54 62 50 94 C46 62 38 54 6 50 C38 46 46 38 50 6 Z" {...common} /> : null}
      {kind === 'flower' ? (
        <G>
          {/* outlines first, then the fills over them, so petals don't show each other's edges */}
          {stroke ? flowerPetals().map((p, i) => <Circle key={`o${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={stroke} stroke={stroke} strokeWidth={sw} />) : null}
          {flowerPetals().map((p, i) => <Circle key={i} cx={p.cx} cy={p.cy} r={p.r - (stroke ? 0.5 : 0)} fill={fill} />)}
          <Circle cx={50} cy={52} r={13} fill="#FFFFFF" stroke={stroke} strokeWidth={stroke ? sw * 0.8 : 0} />
        </G>
      ) : null}
    </Svg>
  );
});

/** A strip of washi tape with torn ends and dots, laid over an edge. */
export function Tape({ color, w = 76, angle = -7, style }: { color: string; w?: number; angle?: number; style?: StyleProp<ViewStyle> }) {
  const h = 20;
  const teeth = 4;
  const zig = (x0: number, dir: 1 | -1) => Array.from({ length: teeth * 2 + 1 }, (_, i) => `${x0 + (i % 2 ? 3 * dir : 0)} ${(i * h) / (teeth * 2)}`);
  const left = zig(0, 1), right = zig(w, -1).reverse();
  const d = `M${left.join(' L')} L${right.join(' L')} Z`;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: w, height: h, transform: [{ rotate: `${angle}deg` }] }, style]}>
      <Svg width={w} height={h}>
        <Path d={d} fill={alpha(color, 0.88)} />
        {Array.from({ length: Math.floor((w - 12) / 12) }, (_, i) => <Circle key={i} cx={10 + i * 12} cy={i % 2 ? 7 : 13} r={1.8} fill="rgba(255,255,255,0.75)" />)}
      </Svg>
    </View>
  );
}

/** A paper card, sitting a little raised, with a soft colored edge. */
export function Card({ children, style, pad = 16, tape, tapeAt = 'left' }: { children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number; tape?: string; tapeAt?: 'left' | 'right' }) {
  const t = useT();
  const v = useV();
  return (
    <View style={[{ backgroundColor: t.surface, borderRadius: 24, padding: pad, boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.3)}, 0px 5px 0px 0px ${alpha(v.accent, 0.2)}` }, style]}>
      {children}
      {tape ? <Tape color={tape} angle={tapeAt === 'left' ? -8 : 7} style={tapeAt === 'left' ? { top: -9, left: 18 } : { top: -9, right: 18 }} /> : null}
    </View>
  );
}

/** A speech bubble; the tail points at whoever's talking. */
export function Bubble({ text, tail = 'right', style, size = 12.5 }: { text: string; tail?: 'right' | 'left' | 'down'; style?: StyleProp<ViewStyle>; size?: number }) {
  const t = useT();
  const v = useV();
  const edge = alpha(v.accent, 0.55);
  const tailPos: ViewStyle = tail === 'right' ? { right: -6, bottom: 10 } : tail === 'left' ? { left: -6, bottom: 10 } : { bottom: -6, alignSelf: 'center' };
  const tailBorder: ViewStyle = tail === 'right' ? { borderTopWidth: 2, borderRightWidth: 2 } : tail === 'left' ? { borderBottomWidth: 2, borderLeftWidth: 2 } : { borderBottomWidth: 2, borderRightWidth: 2 };
  return (
    <View style={[{ maxWidth: 190, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: t.surface, borderWidth: 2, borderColor: edge }, style]}>
      <View style={[{ position: 'absolute', width: 11, height: 11, backgroundColor: t.surface, borderColor: edge, transform: [{ rotate: '45deg' }] }, tailPos, tailBorder]} />
      <T size={size} lh={Math.round(size * 1.4)} color={t.ink} numberOfLines={2}>{text}</T>
    </View>
  );
}

/** Wiggles when tapped, like a sticker you flick. */
export function Wiggle({ children, onPress, label, style, amount = 8, role = 'button' }: { children: ReactNode; onPress?: () => void; label: string; style?: StyleProp<ViewStyle>; amount?: number; role?: 'button' | 'image' }) {
  const r = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const press = () => {
    haptic.soft();
    r.set(withSequence(withTiming(-amount, { duration: 70 }), withTiming(amount, { duration: 100 }), withTiming(-amount / 2, { duration: 90 }), withSpring(0, { duration: 420, dampingRatio: 0.4 })));
    onPress?.();
  };
  return (
    <Pressable onPress={press} accessibilityRole={role === 'image' ? 'image' : 'button'} accessibilityLabel={label} hitSlop={6} style={style}>
      <Animated.View style={a}>{children}</Animated.View>
    </Pressable>
  );
}

/** A soft pill button. `deep` buttons carry white text; the rest sit on the paper. */
export function Pill({ label, a11y, icon, onPress, kind = 'deep', h = 44, style, disabled, grow }: {
  label: string; a11y?: string; icon?: ReactNode; onPress?: () => void; kind?: 'deep' | 'soft' | 'paper'; h?: number; style?: StyleProp<ViewStyle>; disabled?: boolean; grow?: boolean;
}) {
  const t = useT();
  const v = useV();
  const bg = kind === 'deep' ? v.deep : kind === 'soft' ? v.soft : t.surface;
  const fg = kind === 'deep' ? '#FFFFFF' : t.ink;
  const edge = kind === 'deep' ? alpha(v.deep, 0.35) : alpha(v.accent, 0.35);
  return (
    <Press onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={a11y ?? label} hitSlop={h < 36 ? 8 : 4}
      style={[{ height: h, paddingHorizontal: h < 36 ? 12 : 18, borderRadius: h / 2, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        boxShadow: kind === 'paper' ? `0px 0px 0px 2px ${edge}, 0px 3px 0px 0px ${alpha(v.accent, 0.22)}` : `0px 4px 0px 0px ${edge}` }, grow && { flexGrow: 1 }, style]}>
      {icon}
      <T size={h < 36 ? 12.5 : 15} w="800" lh={h < 36 ? 16 : 20} color={fg} numberOfLines={1}>{label}</T>
    </Press>
  );
}

/** A round icon button on the paper. */
export function Bubbly({ children, label, onPress, size = 36, dot }: { children: ReactNode; label: string; onPress: () => void; size?: number; dot?: boolean }) {
  const t = useT();
  const v = useV();
  return (
    <Press onPress={onPress} scale={0.86} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 0px 0px 2px ${alpha(v.accent, 0.35)}, 0px 3px 0px 0px ${alpha(v.accent, 0.2)}` }}>
      {children}
      {dot ? <View style={{ position: 'absolute', top: 4, right: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: v.deep, borderWidth: 2, borderColor: t.surface }} /> : null}
    </Press>
  );
}

// ---------- heart checkboxes ----------
function Floater({ i, color }: { i: number; color: string }) {
  const p = useSharedValue(0);
  useEffect(() => { p.set(withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })); }, [p]);
  const dx = (i - 1) * 12;
  const a = useAnimatedStyle(() => ({ opacity: 1 - p.value, transform: [{ translateX: dx * p.value }, { translateY: -26 * p.value }, { scale: 0.6 + 0.5 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 5, top: 2 }, a]}><Shape kind="heart" size={14} fill={color} /></Animated.View>;
}
/** A heart to tick: it fills, pops, and lets a few small hearts float up. */
export function HeartCheck({ on, onPress, label, size = 28 }: { on: boolean; onPress: () => void; label: string; size?: number }) {
  const t = useT();
  const v = useV();
  const s = useSharedValue(1);
  const [burst, setBurst] = useState(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const press = () => {
    if (!on) {
      s.set(withSequence(withTiming(1.35, { duration: 110 }), withSpring(1, { duration: 480, dampingRatio: 0.35 })));
      setBurst((b) => b + 1);
    }
    onPress();
  };
  return (
    <Pressable onPress={press} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} hitSlop={10}>
      <Animated.View style={a}>
        <Shape kind="heart" size={size} fill={on ? v.accent : t.surface} stroke={on ? v.deep : alpha(v.deep, 0.45)} sw={7} />
      </Animated.View>
      {burst ? [0, 1, 2].map((i) => <Floater key={`${burst}-${i}`} i={i} color={i === 1 ? v.accent2 : v.accent} />) : null}
    </Pressable>
  );
}

// ---------- the mochi ----------
function Face({ mood, ink, cheek }: { mood: Mood; ink: string; cheek: string }) {
  const line = { stroke: ink, strokeWidth: 3.2, fill: 'none', strokeLinecap: 'round' as const };
  const dots = (ry: number) => (
    <G>
      <Ellipse cx={36} cy={52} rx={4} ry={ry} fill={ink} />
      <Ellipse cx={64} cy={52} rx={4} ry={ry} fill={ink} />
      <Circle cx={34.6} cy={50} r={1.4} fill="#FFFFFF" />
      <Circle cx={62.6} cy={50} r={1.4} fill="#FFFFFF" />
    </G>
  );
  return (
    <G>
      <Ellipse cx={25} cy={61} rx={7} ry={4.2} fill={cheek} opacity={0.85} />
      <Ellipse cx={75} cy={61} rx={7} ry={4.2} fill={cheek} opacity={0.85} />
      {mood === 'idle' ? <G>{dots(5)}<Path d="M45 60 Q50 65 55 60" {...line} /></G> : null}
      {mood === 'work' ? <G>{dots(4)}<Path d="M46 61 Q50 63.5 54 61" {...line} /></G> : null}
      {mood === 'sleep' ? (
        <G>
          <Path d="M30 52 Q36 57 42 52" {...line} />
          <Path d="M58 52 Q64 57 70 52" {...line} />
          <Ellipse cx={50} cy={62} rx={2.6} ry={2.2} fill={ink} />
        </G>
      ) : null}
      {mood === 'happy' || mood === 'cheer' ? (
        <G>
          <Path d="M30 54 Q36 46 42 54" {...line} />
          <Path d="M58 54 Q64 46 70 54" {...line} />
          <Path d="M43.5 58.5 Q50 71 56.5 58.5 Z" fill={ink} stroke={ink} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M46.5 64 Q50 67.5 53.5 64 Z" fill={cheek} />
        </G>
      ) : null}
    </G>
  );
}
const MochiArt = memo(function MochiArt({ mood, v, ink, size }: { mood: Mood; v: Variant; ink: string; size: number }) {
  const m = v.mochi;
  const edge = { stroke: ink, strokeWidth: 3.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  return (
    <Svg width={size} height={size * 0.9} viewBox="-6 -8 112 101">
      {mood === 'cheer' ? (
        <G>
          <Path d="M13 58 Q1 46 7 32" {...edge} fill="none" strokeWidth={4} />
          <Path d="M87 58 Q99 46 93 32" {...edge} fill="none" strokeWidth={4} />
        </G>
      ) : null}
      <Path d={MOCHI} fill={m.body} />
      <Ellipse cx={50} cy={78} rx={33} ry={7} fill={m.shade} />
      {m.extra === 'drip' ? (
        <Path d="M20 42 C24 24 38 17 50 17 C62 17 76 24 80 42 C77 40 74 46 70 45 C66 44 66 37 61 38 C57 39 58 47 53 47 C48 47 50 38 45 38 C41 38 40 44 36 44 C32 44 32 37 28 38 C25 39 23 43 20 42 Z" fill={m.extraColor} opacity={0.9} />
      ) : null}
      <Path d={MOCHI} fill="none" {...edge} />
      {mood === 'work' ? (
        <G>
          <Path d="M15 40 C30 31 70 31 85 40 L84 47 C70 39 30 39 16 47 Z" fill={v.deep} {...edge} strokeWidth={2.4} />
          <Path d="M84 42 L97 35 M84 45 L98 48" {...edge} stroke={v.deep} strokeWidth={4} />
        </G>
      ) : null}
      <Face mood={mood} ink={ink} cheek={m.cheek} />
      {m.extra === 'ribbon' ? (
        <G>
          <Path d="M70 20 L57 11 L58 29 Z" fill={m.extraColor} {...edge} strokeWidth={2.4} />
          <Path d="M70 20 L83 11 L82 29 Z" fill={m.extraColor} {...edge} strokeWidth={2.4} />
          <Circle cx={70} cy={20} r={4.2} fill={m.extraColor} {...edge} strokeWidth={2.4} />
        </G>
      ) : null}
      {m.extra === 'bubble' ? (
        <G>
          <Circle cx={78} cy={6} r={6} fill="rgba(255,255,255,0.7)" stroke={m.extraColor} strokeWidth={2.6} />
          <Circle cx={90} cy={-2} r={3.6} fill="rgba(255,255,255,0.7)" stroke={m.extraColor} strokeWidth={2.2} />
          <Circle cx={76.5} cy={4} r={1.6} fill="#FFFFFF" />
        </G>
      ) : null}
      {mood === 'sleep' ? <Path d="M80 14 L88 14 L80 22 L88 22 M92 2 L97 2 L92 7 L97 7" {...edge} fill="none" strokeWidth={2.4} /> : null}
    </Svg>
  );
});

/**
 * The mochi. It breathes, hops while you study, and squishes when poked —
 * then says something for a moment. `line` is what it says the rest of the time.
 */
export function Mochi({ mood, size = 72, line, poke = true, bubbleSide = 'left', lift = 0.55 }: { mood: Mood; size?: number; line?: string; poke?: boolean; bubbleSide?: 'left' | 'right'; lift?: number }) {
  const t = useT();
  const v = useV();
  const breathe = useSharedValue(0);
  const hop = useSharedValue(0);
  const sq = useSharedValue(0);
  const [said, setSaid] = useState<string | null>(null);
  const n = useRef(0);
  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true));
    return () => cancelAnimation(breathe);
  }, [breathe]);
  useEffect(() => {
    if (mood === 'work' || mood === 'cheer') {
      const up = mood === 'cheer' ? -11 : -7;
      hop.set(withRepeat(withSequence(withTiming(up, { duration: 200, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 240, easing: Easing.in(Easing.quad) }), withTiming(0, { duration: mood === 'cheer' ? 260 : 900 })), -1));
    } else {
      cancelAnimation(hop);
      hop.set(withTiming(0, { duration: 200 }));
    }
    return () => cancelAnimation(hop);
  }, [mood, hop]);
  useEffect(() => {
    if (!said) return;
    const id = setTimeout(() => setSaid(null), 2200);
    return () => clearTimeout(id);
  }, [said]);
  const h = size * 0.9;
  const a = useAnimatedStyle(() => {
    const b = (breathe.value - 0.5) * 2; // -1..1
    const sy = 1 + 0.025 * b - 0.2 * sq.value;
    const sx = 1 - 0.015 * b + 0.17 * sq.value;
    return { transform: [{ translateY: hop.value + ((1 - sy) * h) / 2 }, { scaleX: sx }, { scaleY: sy }] };
  });
  const press = () => {
    haptic.soft();
    sq.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, { duration: 650, dampingRatio: 0.3 })));
    const lines = v.lines[mood];
    setSaid(lines[n.current % lines.length]);
    n.current += 1;
  };
  const text = said ?? line;
  const art = <Animated.View style={a}><MochiArt mood={mood} v={v} ink={t.ink} size={size} /></Animated.View>;
  return (
    <View style={{ width: size, height: h }}>
      {text ? (
        <View pointerEvents="none" style={[{ position: 'absolute', bottom: h * lift, width: 190 }, bubbleSide === 'left' ? { right: size * 0.82, alignItems: 'flex-end' } : { left: size * 0.82, alignItems: 'flex-start' }]}>
          <Bubble text={text} tail={bubbleSide === 'left' ? 'right' : 'left'} />
        </View>
      ) : null}
      {poke ? (
        <Pressable onPress={press} accessibilityRole="button" accessibilityLabel={`${v.mochi.name}${text ? `「${text}」` : ''}。つつく`} hitSlop={6}>{art}</Pressable>
      ) : art}
    </View>
  );
}

/** A few sparkles that twinkle in place, for decoration. */
export function Twinkle({ color, size = 14, delay = 0, style }: { color: string; size?: number; delay?: number; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(withDelay(delay, withRepeat(withSequence(withTiming(0.55, { duration: 700 }), withTiming(1, { duration: 700 })), -1)));
    return () => cancelAnimation(s);
  }, [delay, s]);
  const a = useAnimatedStyle(() => ({ opacity: 0.5 + 0.5 * s.value, transform: [{ scale: s.value }] }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, style, a]}><Shape kind="sparkle" size={size} fill={color} /></Animated.View>;
}

// ---------- small things ----------
/** A dashed rule, drawn (a dashed border on one side only won't show on an iPhone). */
export function Dashed({ color, style }: { color: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ height: 2 }, style]}>
      <Svg width="100%" height={2}><Line x1={1} y1={1} x2="100%" y2={1} stroke={color} strokeWidth={2} strokeDasharray="5 6" strokeLinecap="round" /></Svg>
    </View>
  );
}

/** A small rounded tag. */
export function Chip({ bg, children, color }: { bg: string; children: string; color?: string }) {
  const t = useT();
  return (
    <View style={{ height: 24, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 10, borderRadius: 12, backgroundColor: bg, justifyContent: 'center' }}>
      <T size={11.5} w="700" lh={15} color={color ?? t.ink} numberOfLines={1}>{children}</T>
    </View>
  );
}

/** A section's title on the page: a sticker, the words, and an action at the end. */
export function Title({ sticker, text, sub, action }: { sticker: Stamp | 'sparkle'; text: string; sub?: string; action?: ReactNode }) {
  const t = useT();
  const v = useV();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 30 }}>
      <Shape kind={sticker} size={20} fill={sticker === 'star' || sticker === 'sparkle' ? v.sun : v.accent} stroke={t.ink} sw={7} />
      <T size={16} w="800" lh={22} color={t.ink}>{text}</T>
      {sub ? <T size={12} w="700" lh={16} color={t.ink3} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</T> : null}
      <View style={{ flex: 1 }} />
      {action}
    </View>
  );
}

/** A slow pulse, for whatever is under way. */
export function usePulse(on: boolean) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (!on) { o.set(1); return; }
    o.set(withRepeat(withSequence(withTiming(0.45, { duration: 800 }), withTiming(1, { duration: 800 })), -1));
    return () => cancelAnimation(o);
  }, [on, o]);
  return o;
}

/**
 * The candy bar: the day in each subject's color with candy stripes over it,
 * the session under way glowing at its end, and a heart where the goal is.
 */
export function Candy({ pieces, goalAt, h = 20 }: { pieces: Piece[]; goalAt: number; h?: number }) {
  const t = useT();
  const v = useV();
  const id = `cs${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const pulse = usePulse(pieces.some((p) => p.live));
  const live = useAnimatedStyle(() => ({ opacity: 0.35 + 0.4 * pulse.value }));
  const heart = h + 4;
  return (
    <View style={{ height: h + 8, justifyContent: 'center' }}>
      <View style={{ height: h, borderRadius: h / 2, backgroundColor: v.soft, overflow: 'hidden', flexDirection: 'row' }}>
        {pieces.map((p, i) => (p.live
          ? <Animated.View key={i} style={[{ width: `${p.f * 100}%`, backgroundColor: p.c }, live]} />
          : <View key={i} style={{ width: `${p.f * 100}%`, backgroundColor: p.c }} />))}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
          <Svg width="100%" height={h}>
            <Defs>
              <Pattern id={id} patternUnits="userSpaceOnUse" width={14} height={h} patternTransform="rotate(28)">
                <Rect x={0} y={0} width={5} height={h} fill="rgba(255,255,255,0.32)" />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height={h} fill={`url(#${id})`} />
            <Rect x={h / 2} y={h * 0.16} width="60%" height={h * 0.18} rx={h * 0.09} fill="rgba(255,255,255,0.45)" />
          </Svg>
        </View>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${goalAt * 100}%`, top: (h + 8 - heart) / 2, marginLeft: -heart / 2 }}>
        <Shape kind="heart" size={heart} fill={v.deep} stroke={t.surface} sw={12} />
      </View>
    </View>
  );
}
