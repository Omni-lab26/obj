import * as Haptics from 'expo-haptics';
import { createContext, ReactNode, useContext, useRef } from 'react';
import { AccessibilityRole, AccessibilityState, ActivityIndicator, GestureResponderEvent, Image, Insets, Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import type { AreaId } from '../data';
import type { Reaction } from '../design';
import { AVATAR } from '../photos';
import { Creature, Pix } from '../themes/standard/pixel';
import { bundledFace, face, font, hair, lift, onColor, radius, Theme, useT } from '../theme';
import { Pane } from './Glass';
import { glyphOf, SubjectGlyph } from './SubjectGlyph';
import { Icon, IconName } from './Icon';
import { micro, press, release } from './motion';
import { KD, PIX_OF, ring, S, SR, useStd } from './stdLook';
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

// ---------- スタンダード: keys on an ink floor ----------
type KeyProps = {
  onPress?: () => void; label?: string; children: ReactNode;
  /** the face's color: card (the usual), lime (start), ink (a sheet's one decision) */
  fill?: string;
  /** the floor's height and color (an ink face stands on lime) */
  kd?: number; under?: string;
  radius?: number; disabled?: boolean; role?: AccessibilityRole; state?: AccessibilityState; hitSlop?: Insets | number;
  /** the key's box: size, flex, margins */ style?: StyleProp<ViewStyle>;
  /** the face: padding and how what's on it lies */ face?: StyleProp<ViewStyle>;
  haptics?: boolean;
  /** stays down on its floor (a chip that's picked) */ held?: boolean;
  /** a finger down / up (a key you hold to repeat) */ onPressIn?: () => void; onPressOut?: () => void;
};
/**
 * スタンダード's key: a face with a 2pt ink outline on an ink floor (drawn as a
 * plate under it, so it never takes room). Pressed, only the face sinks onto
 * the floor (ui/motion press / release); the floor never moves. Disabled, the
 * floor goes (no floor: not pressable). `held`: down on the floor for good.
 */
export function StdKey({ onPress, label, children, fill = S.card, kd = KD, under = S.ink, radius: r = SR.key, disabled, role = 'button', state, hitSlop, style, face: faceStyle, haptics = true, held, onPressIn, onPressOut }: KeyProps) {
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: held ? kd : (kd - 1) * p.value }] }), [held, kd]);
  return (
    <Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ disabled, ...state }} disabled={disabled} hitSlop={hitSlop}
      onPressIn={() => { p.set(press(1)); onPressIn?.(); }} onPressOut={() => { p.set(release(0)); onPressOut?.(); }} onPress={() => { if (haptics) haptic.tap(); onPress?.(); }}
      style={style}>
      {disabled ? null : <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: kd - 2, bottom: -kd - 2, borderRadius: r + 2, backgroundColor: under }} />}
      <Animated.View style={[{ flexGrow: 1, borderRadius: r, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: disabled ? S.paper2 : fill, boxShadow: ring(2, disabled ? S.line2 : S.ink) }, faceStyle, a]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
/** Words on a key (or a plain text button): bold, one line. */
function KeyText({ size, color, children }: { size: number; color: string; children: ReactNode }) {
  return <Text numberOfLines={1} style={{ fontSize: size, lineHeight: Math.round(size * 1.3), fontWeight: '700', color, fontFamily: font.text }}>{children}</Text>;
}
/** A line icon in スタンダード: its pixel twin when there is one (lines 2pt like the outlines), else the line drawing. */
export function StdIcon({ name, color = S.ink, size = 20 }: { name: IconName; color?: string; size?: number }) {
  const pix = PIX_OF[name];
  return pix ? <Pix name={pix} color={color} /> : <Icon name={name} size={size} color={color} width={2} />;
}

// ---------- buttons ----------
type BtnKind = 'primary' | 'go' | 'ghost' | 'quiet' | 'line' | 'tint';
type BtnProps = { label: string; kind?: BtnKind; icon?: IconName; onPress?: () => void; small?: boolean; wide?: boolean; disabled?: boolean; loading?: boolean; done?: boolean; style?: StyleProp<ViewStyle> };
/** スタンダード's button: a key (an ink face on lime for the one decision, lime to start, card otherwise); `ghost` is words only. */
function StdBtn({ label, kind = 'quiet', icon, onPress, small, wide, disabled, loading, done, style }: BtnProps) {
  const h = small ? 32 : 44;
  const size = small ? 13 : 15;
  if (kind === 'ghost') {
    return (
      <Pressable onPress={() => { haptic.tap(); onPress?.(); }} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={label}
        style={({ pressed }) => [{ minHeight: 44, paddingHorizontal: 8, borderRadius: SR.key, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6,
          backgroundColor: pressed ? 'rgba(23,18,31,0.08)' : 'transparent', opacity: disabled ? 0.4 : 1 }, wide && { alignSelf: 'stretch' }, style]}>
        {icon ? <StdIcon name={icon} /> : null}
        <KeyText size={size} color={S.ink}>{label}</KeyText>
      </Pressable>
    );
  }
  const off = disabled || loading;
  const fill = done ? S.run : kind === 'primary' ? S.ink : kind === 'go' ? S.lime : S.card;
  const fg = off ? S.ink3 : done || kind === 'primary' ? S.onInk : S.ink;
  return (
    <StdKey onPress={onPress} label={label} disabled={off} fill={fill} under={kind === 'primary' ? S.limeDeep : S.ink} kd={small ? 3 : KD}
      hitSlop={small ? { top: 6, bottom: 6, left: 4, right: 4 } : undefined}
      // the floor reaches below the face: room for it, so nothing under the key covers it
      style={[{ minHeight: h, marginBottom: small ? 3 : KD }, wide && { alignSelf: 'stretch' }, style]}
      face={{ minHeight: h, paddingHorizontal: small ? 12 : 18, gap: small ? 6 : 8 }}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {!loading && (icon || done) ? (done ? <Pix name="check" color={fg} /> : <StdIcon name={icon!} color={fg} size={small ? 13 : 16} />) : null}
      {!loading ? <KeyText size={size} color={fg}>{label}</KeyText> : null}
    </StdKey>
  );
}
export function Btn(props: BtnProps) {
  return useStd() ? <StdBtn {...props} /> : <BaseBtn {...props} />;
}
function BaseBtn({ label, kind = 'quiet', icon, onPress, small, wide, disabled, loading, done, style }: BtnProps) {
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
type IconBtnProps = { name: IconName; onPress?: () => void; color?: string; dot?: boolean; label: string; size?: number; filled?: boolean; outline?: boolean };
/** Inside an IconPlate: one button among a few on one plate. */
const OnPlate = createContext<{ first: boolean } | null>(null);
/**
 * A few icon buttons that belong together (a header's right side). スタンダード
 * sets them on one plate with one floor, a line between them, so the top stays
 * quiet; the other themes lay them in a row.
 */
export function IconPlate({ children }: { children: ReactNode }) {
  const std = useStd();
  const list = (Array.isArray(children) ? children : [children]).filter(Boolean);
  if (!std) return <>{children}</>;
  return (
    <View style={{ height: 40, flexDirection: 'row', marginBottom: 3 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: 1, bottom: -5, borderRadius: SR.key + 2, backgroundColor: S.ink }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: SR.key, backgroundColor: S.card, boxShadow: ring() }} />
      {list.map((c, i) => <OnPlate.Provider key={i} value={{ first: i === 0 }}>{c}</OnPlate.Provider>)}
    </View>
  );
}
/** スタンダード's icon button: on a plate of its own (or its IconPlate's), only the icon sinks. */
function StdIconBtn({ name, onPress, dot, label }: IconBtnProps) {
  const at = useContext(OnPlate);
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: 2 * p.value }] }));
  const btn = (
    <Pressable onPress={() => { haptic.tap(); onPress?.(); }} onPressIn={() => p.set(press(1))} onPressOut={() => p.set(release(0))}
      accessibilityRole="button" accessibilityLabel={dot ? `${label}（未読あり）` : label} hitSlop={{ top: 2, bottom: 2 }}
      style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      {at && !at.first ? <View pointerEvents="none" style={{ position: 'absolute', left: -1, top: 9, bottom: 9, width: 2, backgroundColor: S.line }} /> : null}
      <Animated.View style={a}><StdIcon name={name} /></Animated.View>
      {dot ? <View pointerEvents="none" style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, backgroundColor: S.unread, boxShadow: ring(1.5) }} /> : null}
    </Pressable>
  );
  return at ? btn : <IconPlate>{btn}</IconPlate>;
}
export function IconBtn(props: IconBtnProps) {
  return useStd() ? <StdIconBtn {...props} /> : <BaseIconBtn {...props} />;
}
function BaseIconBtn({ name, onPress, color, dot, label, size = 21, filled, outline }: IconBtnProps) {
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
export function Avatar({ name, color, size = 32, ring: edge }: { name: string; color: string; size?: number; ring?: string }) {
  const t = useT();
  const std = useStd();
  const photo = AVATAR[name];
  // スタンダード: a rounded square with an ink edge (their first letter in white on their color)
  if (std) {
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.3, boxShadow: ring(size < 30 ? 1.5 : 2) }} accessibilityLabel={name}>
        <View style={{ flex: 1, borderRadius: size * 0.3, backgroundColor: photo ? S.paper2 : color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          {photo ? <Image source={photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : (
            <Text style={{ color: '#FFFFFF', fontSize: size * 0.42, lineHeight: size * 0.52, fontWeight: '800', fontFamily: font.text }}>{[...name][0].toUpperCase()}</Text>
          )}
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: edge ? 2 : 0, borderColor: edge,
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
  const std = useStd();
  const g = glyphOf(name, area);
  if (std) return <StdSubj name={name} color={color} size={size} area={area} r={size / 2} />;
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
  const std = useStd();
  const g = glyphOf(name, area);
  if (std) return <StdSubj name={name} color={color} size={size} area={area} r={r ?? size * 0.25} />;
  return (
    <View style={{ width: size, height: size, borderRadius: r ?? size * 0.24, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      {g ? <SubjectGlyph glyph={g} size={size * 0.62} color={onColor(color)} width={1.9} /> : (
        <Text style={{ color: onColor(color), fontSize: size * 0.42, lineHeight: size * 0.54, fontWeight: '700', fontFamily: face(size * 0.42) }}>{[...name][0]}</Text>
      )}
    </View>
  );
}
/** スタンダード's subject: its color in a square (or coin) with an ink edge, its picture drawn in ink. */
function StdSubj({ name, color, size, area, r }: { name: string; color: string; size: number; area?: AreaId; r: number }) {
  const g = glyphOf(name, area);
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: color, boxShadow: ring(size < 24 ? 1.5 : 2), alignItems: 'center', justifyContent: 'center' }}>
      {g ? <SubjectGlyph glyph={g} size={size * 0.62} color={S.ink} width={size < 24 ? 1.6 : 2} /> : (
        <Text style={{ color: S.ink, fontSize: size * 0.42, lineHeight: size * 0.54, fontWeight: '800', fontFamily: font.text }}>{[...name][0]}</Text>
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

/** スタンダード's heading words: DotGothic16 at its own 16pt (smaller, it blurs). */
export function PixHead({ children, size = 16, color = S.ink, lines = 1 }: { children: ReactNode; size?: number; color?: string; lines?: number }) {
  useT(); // the face arrives later: render again then
  return (
    <Text numberOfLines={lines} style={{ fontFamily: bundledFace('pixel') ?? font.text, fontSize: size, lineHeight: Math.round(size * 1.25), letterSpacing: 0.3, color }}>{children}</Text>
  );
}
/** スタンダード's section heading: a small square (its accent, sun unless said) and the words in DotGothic16. */
export function StdHead({ title, accent = S.sun, sub, right, style }: { title: string; accent?: string; /** gray words just after the title */ sub?: string; right?: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 }} accessible accessibilityRole="header" accessibilityLabel={title}>
        <View style={{ width: 8, height: 8, backgroundColor: accent, boxShadow: ring() }} />
        <PixHead>{title}</PixHead>
      </View>
      {sub ? <Txt size={12} tone="ink3" lh={16} numberOfLines={1} style={{ flexShrink: 1 }}>{sub}</Txt> : null}
      {right ? <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>{right}</View> : null}
    </View>
  );
}
/** スタンダード's text link: ink, bold, underlined; 44pt tall to the finger. */
export function StdLink({ label, onPress, size = 13 }: { label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <Text style={{ fontSize: size, lineHeight: size + 5, fontWeight: '700', color: S.ink, fontFamily: font.text, textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SectionHead({ title, aux, onAux, accent }: { title: string; aux?: string; onAux?: () => void; /** スタンダード: the heading's square */ accent?: string }) {
  const t = useT();
  const std = useStd();
  if (std) {
    return (
      <StdHead title={title} accent={accent} style={{ marginBottom: 8 }}
        right={aux ? (onAux ? <StdLink label={aux} onPress={onAux} /> : <Txt size={12} tone="ink3" num>{aux}</Txt>) : null} />
    );
  }
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
  const std = useStd();
  return <View style={{ height: std ? 1.5 : hair, backgroundColor: t.line, marginLeft: inset }} />;
}
export const dot = (c: string, s = 7) => <View style={{ width: s, height: s, borderRadius: s / 2, backgroundColor: c }} />;

export function Empty({ title, sub }: { title: string; sub?: string }) {
  const std = useStd();
  // スタンダード: a dashed box with めぶ asleep in it (the empty places and the first days)
  if (std) {
    return (
      <View style={{ padding: 16 }}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 16, borderRadius: SR.mid, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.32)' }}>
          <Creature id="mebu" face="sleep" px={3} />
          <Txt size={15} w="700" style={{ textAlign: 'center' }}>{title}</Txt>
          {sub ? <Txt size={13} tone="ink2" lh={20} style={{ textAlign: 'center' }}>{sub}</Txt> : null}
        </View>
      </View>
    );
  }
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
