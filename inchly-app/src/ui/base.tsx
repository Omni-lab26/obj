import * as Haptics from 'expo-haptics';
import { ReactNode } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AVATAR } from '../photos';
import { ease, face, hair, lift, radius, Theme, useT } from '../theme';
import { Glass } from './Glass';
import { Inch } from './Sticker';
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
export function Txt({ size = 17, w = '400', tone = 'ink', color, num, lh, style, ...rest }: TxtProps) {
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
// iOS 26 button styles, all capsules: prominent (filled tint), tinted (pale tint
// fill), gray (system fill), glass, plain text.
type BtnKind = 'primary' | 'go' | 'ghost' | 'quiet' | 'line' | 'tint' | 'glass';
export function Btn({
  label, kind = 'quiet', icon, onPress, small, wide, disabled, loading, done, style,
}: { label: string; kind?: BtnKind; icon?: IconName; onPress?: () => void; small?: boolean; wide?: boolean; disabled?: boolean; loading?: boolean; done?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useT();
  const bg = { primary: t.tint, go: t.tint, ghost: 'transparent', quiet: t.sunken, line: t.sunken, tint: t.tintSoft, glass: 'transparent' }[kind];
  const fg = { primary: '#FFFFFF', go: '#FFFFFF', ghost: t.tint, quiet: t.tint, line: t.tint, tint: t.tint, glass: t.ink }[kind];
  const h = small ? 34 : 50;
  const body = (
    <>
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {!loading && (icon || done) ? <Icon name={done ? 'check' : icon!} size={small ? 14 : 17} color={done ? '#fff' : fg} width={2.2} /> : null}
      {!loading ? <Txt size={small ? 15 : 17} w="600" color={done ? '#fff' : fg} lh={small ? 20 : 22}>{label}</Txt> : null}
    </>
  );
  const shape: ViewStyle = { height: h, paddingHorizontal: small ? 14 : 22, borderRadius: h / 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 };
  return (
    <Press onPress={onPress} disabled={disabled || loading} hitSlop={small ? { top: 5, bottom: 5, left: 4, right: 4 } : undefined}
      accessibilityRole="button" accessibilityLabel={label} scale={small ? 0.94 : 0.97}
      style={[kind === 'glass' ? null : [shape, { backgroundColor: done ? t.tint : bg }], wide && { alignSelf: 'stretch' }, style]}>
      {kind === 'glass' ? <Glass interactive style={[shape, wide && { alignSelf: 'stretch' }]}>{body}</Glass> : body}
    </Press>
  );
}

/**
 * Round icon button. In a bar it is a 44pt glass circle (`filled` / `outline`,
 * the iOS 26 toolbar button); without either it is a bare glyph.
 */
export function IconBtn({ name, onPress, color, dot, label, size = 20, filled, outline }: { name: IconName; onPress?: () => void; color?: string; dot?: boolean; label: string; size?: number; filled?: boolean; outline?: boolean }) {
  const t = useT();
  const glass = filled || outline;
  const glyph = (
    <>
      <Icon name={name} size={size} color={color ?? t.ink} width={1.9} />
      {dot ? <View style={{ position: 'absolute', top: 9, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: t.red }} /> : null}
    </>
  );
  return (
    <Press onPress={onPress} scale={0.88} accessibilityLabel={label} accessibilityRole="button" hitSlop={4}>
      {glass ? (
        <Glass interactive style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{glyph}</Glass>
      ) : (
        <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{glyph}</View>
      )}
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
/** A white group on the grouped background (inset grouped, radius 26). No shadow: only glass floats. */
export function Card({ children, style, pad = 16 }: { children?: ReactNode; style?: StyleProp<ViewStyle>; pad?: number }) {
  const t = useT();
  return <View style={[{ backgroundColor: t.surface, borderRadius: radius.card, padding: pad, borderCurve: 'continuous' }, style]}>{children}</View>;
}

/**
 * One row of an inset grouped list, like Settings: optional leading view,
 * title (17) with an optional subtitle (13), trailing detail, chevron.
 * At least 44pt tall; the separator starts where the text starts.
 */
export function ListRow({ lead, title, sub, detail, trail, chevron, onPress, first, inset = 16, children, a11y }: {
  lead?: ReactNode; title?: ReactNode; sub?: ReactNode; detail?: ReactNode; trail?: ReactNode; chevron?: boolean; onPress?: () => void;
  first?: boolean; inset?: number; children?: ReactNode; a11y?: string;
}) {
  const t = useT();
  const leadW = lead ? 46 : 0;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingVertical: 10, paddingHorizontal: inset, gap: 12 }}>
      {first ? null : <View style={{ position: 'absolute', top: 0, right: 0, left: inset + leadW, height: hair, backgroundColor: t.line }} />}
      {lead ? <View style={{ width: 34, alignItems: 'center' }}>{lead}</View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt size={17} lh={22} numberOfLines={1}>{title}</Txt> : title}
        {typeof sub === 'string' ? <Txt size={13} tone="ink2" lh={18} numberOfLines={2}>{sub}</Txt> : sub}
        {children}
      </View>
      {typeof detail === 'string' ? <Txt size={17} tone="ink2" num>{detail}</Txt> : detail}
      {trail}
      {chevron ? <Icon name="chev" size={14} color={t.ink3} width={2.2} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={a11y}
      style={({ pressed }) => ({ backgroundColor: pressed ? 'rgba(60,60,67,0.08)' : 'transparent' })}>{inner}</Pressable>
  ) : <View accessible={!!a11y} accessibilityLabel={a11y}>{inner}</View>;
}

/** Section header on a summary screen (Health / Fitness style): Title 3 bold, optional tint link. */
export function SectionHead({ title, aux, onAux }: { title: string; aux?: string; onAux?: () => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 4 }}>
      <Txt size={20} w="700" lh={25}>{title}</Txt>
      {aux ? (
        onAux ? (
          <Press onPress={onAux} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Txt size={15} color={t.tint}>{aux}</Txt>
          </Press>
        ) : (
          <Txt size={15} tone="ink2">{aux}</Txt>
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

/** Empty state: Inch, the inchworm, resting — and one plain sentence. */
export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ paddingVertical: 44, paddingHorizontal: 32, alignItems: 'center', gap: 4 }}>
      <Inch pose="flat" eyes="closed" prop="zzz" size={84} />
      <Txt size={17} w="600" style={{ textAlign: 'center', marginTop: 6 }}>{title}</Txt>
      {sub ? <Txt size={15} tone="ink2" style={{ textAlign: 'center' }}>{sub}</Txt> : null}
    </View>
  );
}

export const styles = (t: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: t.surface, borderRadius: radius.card, ...lift(t) },
  });
