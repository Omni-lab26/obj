import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ease, font, Theme, useT } from '../theme';
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
type TxtProps = TextProps & { size?: number; w?: '400' | '500' | '600' | '700'; tone?: Tone; color?: string; num?: boolean; lh?: number };
export function Txt({ size = 15, w = '400', tone = 'ink', color, num, lh, style, ...rest }: TxtProps) {
  const t = useT();
  const fam = num ? (w === '700' ? font.num7 : w === '600' ? font.num6 : font.num) : font.ui;
  return (
    <Text
      {...rest}
      style={[
        { fontSize: size, color: color ?? t[tone], fontFamily: fam, fontWeight: num ? undefined : w, lineHeight: lh ?? Math.round(size * (num ? 1.2 : 1.55)) },
        num && { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'], letterSpacing: size > 24 ? -size * 0.03 : 0 },
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
      onPressIn={(e) => { s.value = withTiming(scale, { duration: 120, easing: ease.press }); onPressIn?.(e); }}
      onPressOut={(e) => { s.value = withTiming(1, { duration: 240, easing: ease.spring }); onPressOut?.(e); }}
      onPress={(e) => { if (haptics) haptic.tap(); onPress?.(e); }}>
      <Animated.View style={[inner, a, disabled && { opacity: 0.4 }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- buttons ----------
type BtnKind = 'primary' | 'go' | 'ghost' | 'quiet' | 'line';
export function Btn({
  label, kind = 'quiet', icon, onPress, small, wide, disabled, loading, done, style,
}: { label: string; kind?: BtnKind; icon?: IconName; onPress?: () => void; small?: boolean; wide?: boolean; disabled?: boolean; loading?: boolean; done?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const bg = { primary: t.ink, go: t.green, ghost: 'transparent', quiet: t.sunken, line: t.surface }[kind];
  const fg = { primary: t.onInk, go: '#FFFFFF', ghost: t.ink, quiet: t.ink, line: t.ink }[kind];
  const h = small ? 34 : 48;
  return (
    <Press
      onPress={onPress}
      disabled={disabled || loading}
      scale={small ? 0.94 : 0.97}
      style={[
        { height: h, paddingHorizontal: small ? 14 : 20, borderRadius: small ? 10 : 13, backgroundColor: done ? t.green : bg, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
        kind === 'line' && { borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line2 },
        wide && { alignSelf: 'stretch' },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {!loading && (icon || done) ? <Icon name={done ? 'check' : icon!} size={small ? 15 : 18} color={done ? '#fff' : fg} width={done ? 2.6 : undefined} /> : null}
      {!loading ? <Txt size={small ? 13 : 15} w="600" color={done ? '#fff' : fg}>{label}</Txt> : null}
    </Press>
  );
}

export function IconBtn({ name, onPress, color, dot, label, size = 22 }: { name: IconName; onPress?: () => void; color?: string; dot?: boolean; label: string; size?: number }) {
  const t = useT();
  return (
    <Press onPress={onPress} scale={0.86} accessibilityLabel={label} accessibilityRole="button" hitSlop={6}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size} color={color ?? t.ink} />
      {dot ? <View style={{ position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: t.red, borderWidth: 1.5, borderColor: t.canvas }} /> : null}
    </Press>
  );
}

// ---------- avatar ----------
export function Avatar({ name, color, size = 32, ring }: { name: string; color: string; size?: number; ring?: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center', borderWidth: ring ? 2 : 0, borderColor: ring }}>
      <Text style={{ color: '#fff', fontSize: size * 0.42, fontWeight: '700' }}>{name[0]}</Text>
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
export function SectionHead({ title, aux, onAux }: { title: string; aux?: string; onAux?: () => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <Txt size={16} w="700">{title}</Txt>
      {aux ? (
        onAux ? (
          <Press onPress={onAux} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt size={13} tone="ink2">{aux}</Txt>
            <Icon name="chev" size={14} color={t.ink2} />
          </Press>
        ) : (
          <Txt size={12.5} tone="ink3">{aux}</Txt>
        )
      ) : null}
    </View>
  );
}
export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useT();
  return <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: t.line, marginLeft: inset }} />;
}
export const dot = (c: string, s = 7) => <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: c }} />;

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ paddingVertical: 56, paddingHorizontal: 32, alignItems: 'center', gap: 6 }}>
      <Txt size={15} w="600" style={{ textAlign: 'center' }}>{title}</Txt>
      {sub ? <Txt size={13} tone="ink3" style={{ textAlign: 'center' }}>{sub}</Txt> : null}
    </View>
  );
}

export const styles = (t: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line },
  });
