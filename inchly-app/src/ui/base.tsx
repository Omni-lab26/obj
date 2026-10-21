import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AVATAR } from '../photos';
import { ease, face, hair, lift, radius, Theme, useT } from '../theme';
import { Icon, IconName } from './Icon';

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

// ---------- press feedback: scale down on press (bencho: .2s, cubic-bezier(.3,.9,.4,1)) ----------
type PressProps = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; scale?: number; children?: ReactNode; haptics?: boolean };
// Layout keys that must live on the outer Pressable, or flex/margins would apply inside it.
const OUTER = ['flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex'] as const;
function split(style: StyleProp<ViewStyle>) {
  const flat = { ...(StyleSheet.flatten(style) ?? {}) } as Record<string, unknown>;
  const outer: Record<string, unknown> = {};
  for (const k of OUTER) if (k in flat) { outer[k] = flat[k]; delete flat[k]; }
  return { outer: outer as ViewStyle, inner: flat as ViewStyle };
}

export function Press({ style, scale = 0.96, children, onPressIn, onPressOut, onPress, haptics = true, disabled, ...rest }: PressProps) {
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const { outer, inner } = split(style);
  return (
    <Pressable
      {...rest}
      style={outer}
      disabled={disabled}
      onPressIn={(e) => { s.set(withTiming(scale, { duration: 120, easing: ease.press })); onPressIn?.(e); }}
      onPressOut={(e) => { s.set(withTiming(1, { duration: 240, easing: ease.spring })); onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic.tap(); onPress?.(e); }}>
      <Animated.View style={[inner, a, disabled && { opacity: 0.4 }]}>{children}</Animated.View>
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
export function SubjCoin({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#fff', fontSize: size * 0.44, lineHeight: size * 0.56, fontWeight: '700', fontFamily: face(size * 0.44) }}>{[...name][0]}</Text>
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
/** White card on the cool canvas: rounded 20, soft shadow, no border. */
export function Card({ children, style, pad = 14 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const t = useT();
  return <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, padding: pad }, lift(t), style]}>{children}</View>;
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
