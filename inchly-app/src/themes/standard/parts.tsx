import { ReactNode } from 'react';
import { AccessibilityRole, AccessibilityState, Image, Insets, Pressable, StyleProp, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import type { AreaId } from '@/data';
import { AVATAR } from '@/photos';
import { T } from '@/themes/kit';
import { font } from '@/theme';
import { haptic } from '@/ui/base';
import { press, release } from '@/ui/motion';
import { glyphOf, SubjectGlyph } from '@/ui/SubjectGlyph';
import { KD, LIFT, R, ring, RING_SOFT, S } from './look';
import { Pix } from './pixel';

// The pieces スタンダード is built from, after the mock's parts (docs/app/mock/system.html).
// What rests has the 2pt outline only; what you press stands on an ink floor
// and, pressed, only its face sinks (0.09s down, back in about 0.3s without
// going past: ui/motion press / release) — the floor never moves.

// ---------- text ----------
type TextProps = Parameters<typeof T>[0];
/** Japanese (and body) text: always the system face, whatever the theme's display face. */
export function J(props: TextProps) {
  return <T {...props} style={[props.style, { fontFamily: (props.size ?? 14) >= 20 ? font.display : font.text }]} />;
}
/** Figures 20pt and up: Bricolage Grotesque, tabular. */
export function Num(props: TextProps) {
  return <T f="groteskBold" num ls={-(props.size ?? 24) * 0.02} {...props} />;
}

// ---------- pressing ----------
/** A face that sinks onto its floor while held: the shared value and the face's style. */
export function useSink(depth: number) {
  const p = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: depth * p.value }] }));
  return { style, down: () => p.set(press(1)), up: () => p.set(release(0)) };
}

type KeyProps = {
  onPress?: () => void; label: string; children: ReactNode;
  /** the face's color: card (the usual), lime (start), ink (a sheet's one decision) */
  fill?: string;
  /** the floor's height */ kd?: number;
  /** the floor's color: ink (an ink face stands on lime) */ under?: string;
  radius?: number; disabled?: boolean; role?: AccessibilityRole; state?: AccessibilityState; hitSlop?: Insets | number;
  /** the key's box: size, flex, margins */ style?: StyleProp<ViewStyle>;
  /** the face: padding and how what's on it lies */ face?: StyleProp<ViewStyle>;
  haptics?: boolean;
};
/** A key on an ink floor: pressed, the face sinks onto it. Disabled, the floor goes (no floor: not pressable). */
export function Key({ onPress, label, children, fill = S.card, kd = KD, under = S.ink, radius = R.key, disabled, role = 'button', state, hitSlop, style, face, haptics = true }: KeyProps) {
  const s = useSink(kd - 1);
  return (
    <Pressable accessibilityRole={role} accessibilityLabel={label} accessibilityState={{ disabled, ...state }} disabled={disabled} hitSlop={hitSlop}
      onPressIn={s.down} onPressOut={s.up} onPress={() => { if (haptics) haptic.tap(); onPress?.(); }}
      style={style}>
      {/* the floor: the outline's width wider, kd lower (a shadow, drawn as a plate so it never depends on one) */}
      {disabled ? null : <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: kd - 2, bottom: -kd - 2, borderRadius: radius + 2, backgroundColor: under }} />}
      <Animated.View style={[{ flex: 1, borderRadius: radius, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8,
        backgroundColor: disabled ? S.paper2 : fill, boxShadow: ring(2, disabled ? S.line2 : S.ink) }, face, s.style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** The header's plate: a few icon buttons on one floor (so the top stays quiet), lines between them. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <View style={{ height: 40, flexDirection: 'row' }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: 1, bottom: -5, borderRadius: 14, backgroundColor: S.ink }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 12, backgroundColor: S.card, boxShadow: ring() }} />
      {children}
    </View>
  );
}
/** One button on the plate: only its icon sinks. `dot`: unread. */
export function PlateBtn({ icon, label, dot, onPress, first }: { icon: 'search' | 'bell' | 'chat' | 'gear'; label: string; dot?: boolean; onPress: () => void; first?: boolean }) {
  const s = useSink(2);
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} onPressIn={s.down} onPressOut={s.up} accessibilityRole="button" accessibilityLabel={dot ? `${label}（未読あり）` : label}
      hitSlop={{ top: 2, bottom: 2 }} style={{ width: 44, height: 40, alignItems: 'center', justifyContent: 'center' }}>
      {first ? null : <View pointerEvents="none" style={{ position: 'absolute', left: -1, top: 9, bottom: 9, width: 2, backgroundColor: S.line }} />}
      <Animated.View style={s.style}><Pix name={icon} /></Animated.View>
      {dot ? <View pointerEvents="none" style={{ position: 'absolute', top: 7, right: 8, width: 8, height: 8, backgroundColor: S.unread, boxShadow: ring(1.5) }} /> : null}
    </Pressable>
  );
}

// ---------- resting things ----------
/** A card: it rests, so the outline only. `hero`: the one lead card of a screen, with the lime shadow (it reaches 6 to the right, so it keeps 6 clear). */
export function Card({ children, hero, style }: { children?: ReactNode; hero?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ backgroundColor: S.card, borderRadius: R.card, padding: 16, boxShadow: hero ? LIFT : ring() }, hero && { marginRight: 6 }, style]}>{children}</View>;
}

/** A section's heading: a small square (its accent) and the words in DotGothic16 at its own 16pt; something to the right. */
export function SecHead({ title, accent = S.sun, right, id }: { title: string; accent?: string; right?: ReactNode; id?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 }} nativeID={id}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, flexShrink: 1 }} accessible accessibilityRole="header" accessibilityLabel={title}>
        <View style={{ width: 8, height: 8, backgroundColor: accent, boxShadow: ring() }} />
        <T f="pixel" size={16} lh={20} ls={0.3} numberOfLines={1}>{title}</T>
      </View>
      {right ? <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>{right}</View> : null}
    </View>
  );
}
/** The small words on a heading's right ('今年 253日'): figures bold in ink. */
export function Aux({ children }: { children: ReactNode }) {
  return <J size={12} lh={16} color={S.ink3} num>{children}</J>;
}
export function B({ children }: { children: ReactNode }) {
  return <J size={12} lh={16} w="700" color={S.ink} num>{children}</J>;
}

/** A square dot with an ink edge: green running, crimson paused, amber a deadline, coral unread. */
export function Dot({ c, size = 8 }: { c: string; size?: number }) {
  return <View style={{ width: size, height: size, backgroundColor: c, boxShadow: ring(1.5) }} />;
}

/** A tag: a small notice that isn't pressable ('第4回 記述模試まで 10日'). */
export function Tag({ children, dot }: { children: ReactNode; dot?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 24, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 7, backgroundColor: S.paper2, boxShadow: RING_SOFT, flexShrink: 1 }}>
      {dot ? <Dot c={dot} /> : null}
      <J size={12} lh={16} w="600" color={S.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{children}</J>
    </View>
  );
}

/** A text link: ink, bold, underlined (44pt tall to the finger). */
export function Link({ label, onPress, size = 13 }: { label: string; onPress: () => void; size?: number }) {
  return (
    <Pressable onPress={() => { haptic.tap(); onPress(); }} hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }} accessibilityRole="button" accessibilityLabel={label}>
      {({ pressed }) => (
        <J size={size} lh={size + 5} w="700" style={{ textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>{label}</J>
      )}
    </Pressable>
  );
}

// ---------- subjects and people ----------
/** A subject: its color in a square with an ink edge, its picture drawn in ink. `next`: half strength (not yet). `none`: no plan (a dashed square, a calendar). */
export function SubjSquare({ name, color, area, size = 40, next, none, live, paused, round }: { name?: string; color?: string; area?: AreaId; size?: number; next?: boolean; none?: boolean; live?: boolean; paused?: boolean; /** a coin (the record sheet) */ round?: boolean }) {
  if (none || !name || !color) {
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.25, borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(23,18,31,0.4)', backgroundColor: S.card, alignItems: 'center', justifyContent: 'center' }}>
        <Pix name="cal" />
      </View>
    );
  }
  const g = glyphOf(name, area);
  return (
    <View>
      <View style={{ width: size, height: size, borderRadius: size * (round ? 0.5 : 0.25), backgroundColor: color, boxShadow: ring(), alignItems: 'center', justifyContent: 'center', opacity: next ? 0.5 : 1 }}>
        {g ? <SubjectGlyph glyph={g} size={size * 0.62} color={S.ink} width={2} /> : <J size={size * 0.42} lh={size * 0.5} w="800">{[...name][0]}</J>}
      </View>
      {/* running: a green square at its corner (gone while paused) */}
      {live && !paused ? <View style={{ position: 'absolute', top: -3, left: -3 }}><Dot c={S.run} /></View> : null}
    </View>
  );
}

/** A person: their photo (or their first letter on their color) in a rounded square with an ink edge. */
export function Person({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  const photo = AVATAR[name];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, boxShadow: ring() }}>
      <View style={{ flex: 1, borderRadius: size * 0.3, backgroundColor: color, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {photo ? <Image source={photo} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <J size={size * 0.42} lh={size * 0.5} w="800" color="#FFFFFF">{[...name][0].toUpperCase()}</J>}
      </View>
    </View>
  );
}
