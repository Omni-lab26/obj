import * as Haptics from 'expo-haptics';
import { ReactNode, useRef } from 'react';
import { ActivityIndicator, GestureResponderEvent, Image, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { AreaId } from '../data';
import type { Reaction } from '../design';
import { AVATAR } from '../photos';
import { face, hair, lift, onColor, radius, Theme, useT } from '../theme';
import { Pane } from './Glass';
import { glyphOf, SubjectGlyph } from './SubjectGlyph';
import { Icon, IconName } from './Icon';
import { micro, press, release } from './motion';
import { TextureFill } from './Texture';

export const haptic = {
  tap: () => Platform.OS !== 'web' && Haptics.selectionAsync().catch(() => {}),
  soft: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  firm: () => Platform.OS !== 'web' && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}),
  success: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warn: () => Platform.OS !== 'web' && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
};

// ---------- text ----------
type Tone = 'ink' | 'ink2' | 'ink3' | 'green' | 'greenInk' | 'amber' | 'red' | 'onInk';
type TxtProps = TextProps & { size?: number; w?: '200' | '300' | '400' | '500' | '600' | '700' | '800'; tone?: Tone; color?: string; num?: boolean; lh?: number };
// SF Pro (Text below 20pt, Display above) with Hiragino Sans for Japanese.
// Figures are tabular so counters don't jitter; big ones are set a little tighter.
export function Txt({ size = 14, w = '400', tone = 'ink', color, num, lh, style, ...rest }: TxtProps) {
  const t = useT();
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, color: color ?? t[tone], fontFamily: face(size), fontWeight: w, lineHeight: lh ?? Math.round(size * (num ? 1.2 : 1.5)) },
        size >= 22 && { letterSpacing: -size * 0.015 },
        num && { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'], letterSpacing: size >= 22 ? -size * 0.025 : 0 },
        style,
      ]}
    />
  );
}

// ---------- press feedback: each theme answers a tap its own way (design.ts Reaction) ----------
type PressProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number; children?: ReactNode; haptics?: boolean;
  /** answer differently from the theme (a theme app's own objects) */ react?: Reaction };
// Layout keys that must live on the outer Pressable, or flex/margins would apply inside it.
const OUTER = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex'] as const;
function split(style: StyleProp<ViewStyle>) {
  const flat = { ...(StyleSheet.flatten(style) ?? {}) } as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  for (const k of OUTER) if (k in flat) { outer[k] = flat[k]; delete flat[k]; }
  // a percentage width is of the parent, so it belongs outside too (the inner view stretches to it)
  if (typeof flat.width === 'string' && flat.width.endsWith('%')) { outer.width = flat.width; delete flat.width; }
  return { outer: outer as ViewStyle, inner: flat as ViewStyle };
}

const STEPS = Easing.steps(3);
/**
 * Something you tap. `scale` is how much it gives (0.86 for a small icon, 0.98
 * for a big card); the theme decides how it gives — shrinking, sinking,
 * flickering … Down quickly, back with a spring that never goes past (ui/motion:
 * press / release — no wobble, whatever the theme). Only movement and
 * opacity, so nothing around it shifts.
 */
export function Press({ style, scale = 0.96, react, children, onPressIn, onPressOut, onPress, haptics = true, disabled, ...rest }: PressProps) {
  const t = useT();
  const kind = react ?? t.press;
  const p = useSharedValue(0); // 0 at rest, 1 held down
  const f = useSharedValue(1); // the flicker's brightness
  const { outer, inner } = split(style);
  const give = 1 - scale;
  // a disabled one is faded; otherwise it keeps the opacity it was given
  const dim = disabled ? 0.4 : typeof inner.opacity === 'number' ? inner.opacity : 1;
  const a = useAnimatedStyle(() => {
    const v = p.value;
    switch (kind) {
      case 'sink': return { opacity: dim, transform: [{ translateY: 3 * v }] };
      case 'misprint': return { opacity: dim * (1 - 0.16 * v), transform: [{ translateX: 1.5 * v }, { translateY: v }] };
      case 'squish': return { opacity: dim, transform: [{ scaleX: 1 + give * 0.8 * v }, { scaleY: 1 - give * 1.4 * v }] };
      case 'soft': return { opacity: dim, transform: [{ scale: 1 - give * 0.5 * v }] };
      case 'flicker': return { opacity: dim * f.value, transform: [{ scale: 1 - give * 0.5 * v }] };
      case 'select': return { opacity: dim, transform: [{ scale: 1 }] }; // the box says it
      default: return { opacity: dim, transform: [{ scale: 1 - give * v }] }; // scale, step, bounce
    }
  }, [kind, give, dim]);
  const box = useAnimatedStyle(() => ({ opacity: p.value }));
  const down = () => {
    switch (kind) {
      case 'step': p.set(withTiming(1, { duration: 150, easing: STEPS })); break;
      case 'sink': case 'misprint': case 'select': p.set(withTiming(1, { duration: 60 })); break;
      case 'flicker':
        p.set(press(1));
        f.set(withSequence(withTiming(0.3, { duration: 40 }), withTiming(1, { duration: 40 }), withTiming(0.55, { duration: 50 }), withTiming(1, { duration: 70 })));
        break;
      default: p.set(press(1));
    }
  };
  const up = () => {
    switch (kind) {
      case 'step': p.set(withTiming(0, { duration: 180, easing: STEPS })); break;
      case 'sink': case 'misprint': p.set(withTiming(0, { duration: 90 })); break;
      case 'select': p.set(micro(0)); break;
      // squish, bounce, soft and the rest: back without going past
      default: p.set(release(0));
    }
  };
  // where the finger came down: a finger that travelled (a swipe that happens to start and end on a wide button) isn't a tap
  const start = useRef<{ x: number; y: number; at: number } | null>(null);
  const travelled = (e: GestureResponderEvent) => {
    const s0 = start.current;
    start.current = null;
    return !!s0 && Date.now() - s0.at < 3000 && Math.hypot(e.nativeEvent.pageX - s0.x, e.nativeEvent.pageY - s0.y) > 12;
  };
  return (
    <Pressable
      {...rest}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => { start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, at: Date.now() }; down(); onPressIn?.(e); }}
      onPressOut={(e) => { up(); onPressOut?.(e); }}
      onPress={(e) => { if (travelled(e)) return; if (haptics) haptic.tap(); onPress?.(e); }}>
      <Animated.View style={[inner, a]}>
        {children}
        {kind === 'select' ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: typeof inner.borderRadius === 'number' ? inner.borderRadius : 0,
            borderWidth: 1, borderStyle: 'dashed', borderColor: t.ink, backgroundColor: t.dark ? 'rgba(255,255,255,0.08)' : 'rgba(16,16,22,0.06)' }, box]} />
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

// ---------- buttons ----------
type BtnKind = 'primary' | 'go' | 'ghost' | 'quiet' | 'line' | 'tint';
export function Btn({
  label, kind = 'quiet', icon, onPress, small, wide, disabled, loading, done, style,
}: { label: string; kind?: BtnKind; icon?: IconName; onPress?: () => void; small?: boolean; wide?: boolean; disabled?: boolean; loading?: boolean; done?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const bg = { primary: t.ink, go: t.green, ghost: 'transparent', quiet: t.sunken, line: t.surface, tint: t.blueSoft }[kind];
  const fg = { primary: t.onInk, go: '#FFFFFF', ghost: t.ink, quiet: t.ink, line: t.ink, tint: t.blue }[kind];
  const h = small ? 30 : 44;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={small ? { top: 7, bottom: 7, left: 4, right: 4 } : undefined}
      accessibilityRole="button"
      scale={small ? 0.94 : 0.97}
      style={[
        { height: h, paddingHorizontal: small ? 12 : 18, borderRadius: small ? 15 : radius.inner, backgroundColor: done ? t.green : bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
        kind === 'line' && { borderWidth: hair, borderColor: t.line2 },
        wide && { alignSelf: 'stretch' },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {!loading && (icon || done) ? <Icon name={done ? 'check' : icon!} size={small ? 13 : 16} color={done ? '#fff' : fg} width={done ? 2.4 : undefined} /> : null}
      {!loading ? <Txt size={small ? 12 : 14} w="600" color={done ? '#fff' : fg}>{label}</Txt> : null}
    </Press>
  );
}

/**
 * Round icon button. `filled` sits it on a white disc; `outline` is a hairline
 * ring, like the small controls under bencho's streak.
 */
export function IconBtn({ name, onPress, color, dot, label, size = 21, filled, outline }: { name: IconName; onPress?: () => void; color?: string; dot?: boolean; label: string; size?: number; filled?: boolean; outline?: boolean }) {
  const t = useT();
  const ring = filled || outline;
  return (
    <Press onPress={onPress} scale={0.86} accessibilityLabel={label} accessibilityRole="button" hitSlop={6}
      style={[{ width: ring ? 34 : 38, height: ring ? 34 : 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
        filled && [{ backgroundColor: t.surface }, lift(t)], outline && { borderWidth: hair, borderColor: t.line2, backgroundColor: t.surface }]}>
      <Icon name={name} size={ring ? 17 : size} color={color ?? t.ink} width={ring ? 1.6 : undefined} />
      {dot ? <View style={{ position: 'absolute', top: ring ? 7 : 8, right: ring ? 8 : 9, width: 7, height: 7, borderRadius: 4, backgroundColor: t.red, borderWidth: 1.5, borderColor: ring ? t.surface : t.canvas }} /> : null}
    </Press>
  );
}

/** Image-1 quick action: a blue glyph on a pale blue disc, label underneath. */
export function QuickBtn({ icon, label, onPress }: { icon: IconName; label: string; onPress?: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} scale={0.92} accessibilityRole="button" accessibilityLabel={label} style={{ alignItems: 'center', gap: 6, minWidth: 64 }}>
      <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={21} color={t.blue} width={2} />
      </View>
      <Txt size={12} w="500" tone="ink2" lh={15}>{label}</Txt>
    </Press>
  );
}

// ---------- avatar ----------
// The person's photo when they have set one; otherwise the plain "not set" look
// every real app has: their first character on a quiet tint.
export function Avatar({ name, color, size = 32, ring }: { name: string; color: string; size?: number; ring?: string }) {
  const t = useT();
  const photo = AVATAR[name];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: ring ? 2 : 0, borderColor: ring,
      backgroundColor: photo ? t.sunken : t.dark ? '#262D3A' : '#E3E8F0', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel={name}>
      {photo ? (
        <Image source={photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <Text style={{ color: color, fontSize: size * 0.42, fontWeight: '600' }}>{[...name][0]}</Text>
      )}
    </View>
  );
}
/** A subject's coin, like a wallet's token icon: its first character, white on the subject colour. */
export function SubjCoin({ name, color, size = 36, area }: { name: string; color: string; size?: number; area?: AreaId }) {
  const g = glyphOf(name, area);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {g ? <SubjectGlyph glyph={g} size={size * 0.6} color="#fff" width={2} /> : (
        <Text style={{ color: '#fff', fontSize: size * 0.44, lineHeight: size * 0.56, fontWeight: '700', fontFamily: face(size * 0.44) }}>{[...name][0]}</Text>
      )}
    </View>
  );
}
/** A subject's square: its color, with its picture (SubjectGlyph) or first letter. */
export function SubjTile({ name, color, size = 40, area, radius: r }: { name: string; color: string; size?: number; area?: AreaId; radius?: number }) {
  const g = glyphOf(name, area);
  return (
    <View style={{ width: size, height: size, borderRadius: r ?? size * 0.24, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {g ? <SubjectGlyph glyph={g} size={size * 0.62} color={onColor(color)} width={1.9} /> : (
        <Text style={{ color: onColor(color), fontSize: size * 0.42, lineHeight: size * 0.54, fontWeight: '700', fontFamily: face(size * 0.42) }}>{[...name][0]}</Text>
      )}
    </View>
  );
}
export function AvatarStack({ people, size = 28, ring, max = 4 }: { people: { n: string; c: string }[]; size?: number; ring: string; max?: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {people.slice(0, max).map((p, i) => (
        <View key={p.n + i} style={{ marginLeft: i ? -size * 0.32 : 0, zIndex: max - i }}>
          <Avatar name={p.n} color={p.c} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}

// ---------- layout helpers ----------
/** White card on the cool canvas: rounded, a faint edge, no border — or, over a 背景, glass (Pane). */
export function Card({ children, style, pad = 14 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const t = useT();
  return (
    <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, padding: pad }, lift(t), style]}>
      <Pane radius={radius.card} />
      {t.cardTexture ? <TextureFill texture={t.texture} radius={radius.card} opacity={0.7} /> : null}
      {children}
    </View>
  );
}

export function SectionHead({ title, aux, onAux }: { title: string; aux?: string; onAux?: () => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
      <Txt size={15} w="600">{title}</Txt>
      {aux ? (
        onAux ? (
          <Press onPress={onAux} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt size={12} w="500" color={t.blue}>{aux}</Txt>
            <Icon name="chev" size={12} color={t.blue} />
          </Press>
        ) : (
          <Txt size={11} tone="ink3">{aux}</Txt>
        )
      ) : null}
    </View>
  );
}
export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useT();
  return <View style={{ height: hair, backgroundColor: t.line, marginLeft: inset }} />;
}
export const dot = (c: string, s = 7) => <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: c }} />;

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ paddingVertical: 56, paddingHorizontal: 32, alignItems: 'center', gap: 6 }}>
      <Txt size={14} w="600" style={{ textAlign: 'center' }}>{title}</Txt>
      {sub ? <Txt size={12} tone="ink3" style={{ textAlign: 'center' }}>{sub}</Txt> : null}
    </View>
  );
}

export const styles = (t: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.card, ...lift(t) },
  });
