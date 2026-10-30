import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, Text, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { font, hair, useT } from '../theme';
import { haptic, Txt } from './base';
import { move } from './motion';
import { ring, S, SR, useStd } from './stdLook';

type Opt<K extends string> = { v: K; label: string };
type Box = { x: number; w: number };

function useIndicator(index: number, boxes: Box[]) {
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const o = useSharedValue(0);
  const placed = useRef(false);
  useEffect(() => {
    const b = boxes[index];
    if (!b) return;
    // First measurement: jump into place and fade in; afterwards slide.
    if (!placed.current) { x.set(b.x); w.set(b.w); o.set(1); placed.current = true; return; }
    // slides; its width changes only where the labels differ in length (fit), a single small view
    x.set(move(b.x));
    w.set(b.w === w.get() ? b.w : move(b.w));
  }, [index, boxes, x, w, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, width: w.value, transform: [{ translateX: x.value }] }));
  return { a };
}

/**
 * Segmented control, wallet style: the choice sits in a navy pill that slides.
 * On a pale track by default; `small` drops the track (for use inside cards).
 */
/** `fit`: each segment as wide as its label (for many labels of different lengths), else all the same width. */
type SegProps<K extends string> = { options: Opt<K>[]; value: K; onChange: (v: K) => void; style?: ViewStyle; small?: boolean; fit?: boolean };
/**
 * スタンダード's switch: one plate on an ink floor, the parts split by ink
 * lines, the picked one lime. `small`: 32 high on a 2pt floor (44 to the finger).
 */
function StdSegmented<K extends string>({ options, value, onChange, style, small, fit }: SegProps<K>) {
  const h = small ? 32 : 44;
  const kd = small ? 2 : 3;
  return (
    <View style={[{ flexDirection: 'row', marginBottom: kd }, small && { alignSelf: 'flex-start' }, style]} accessibilityRole="tablist">
      <View pointerEvents="none" style={{ position: 'absolute', left: -2, right: -2, top: kd - 2, bottom: -kd - 2, borderRadius: SR.key + 2, backgroundColor: S.ink }} />
      <View style={[{ flexDirection: 'row', borderRadius: SR.key, backgroundColor: S.card, boxShadow: ring(), overflow: 'hidden' }, !small && { flex: 1 }]}>
        {options.map((o, i) => {
          const on = o.v === value;
          return (
            <Pressable key={o.v} onPress={() => { if (!on) { haptic.tap(); onChange(o.v); } }}
              accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={small ? { top: 6, bottom: 6 } : undefined}
              style={({ pressed }) => [{ height: h, alignItems: 'center', justifyContent: 'center', paddingHorizontal: small ? 8 : 10, backgroundColor: on ? S.lime : pressed ? S.paper2 : 'transparent' },
                small ? { minWidth: 44 } : fit ? { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' } : { flex: 1 },
                i > 0 && { borderLeftWidth: 2, borderLeftColor: S.ink }]}>
              <Text numberOfLines={1} style={{ fontSize: small ? 13 : 14, lineHeight: small ? 17 : 18, fontWeight: on ? '700' : '600', color: on ? S.ink : S.ink2, fontFamily: font.text }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
export function Segmented<K extends string>(props: SegProps<K>) {
  return useStd() ? <StdSegmented {...props} /> : <BaseSegmented {...props} />;
}
function BaseSegmented<K extends string>({ options, value, onChange, style, small, fit }: SegProps<K>) {
  const t = useT();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const index = options.findIndex((o) => o.v === value);
  const { a } = useIndicator(index, boxes);
  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setBoxes((b) => { const n = [...b]; n[i] = { x, w: width }; return n; });
  };
  const pad = small ? 0 : 2;
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: small ? 'transparent' : t.sunken, borderRadius: 999, padding: pad }, style]} accessibilityRole="tablist">
      <Animated.View style={[{ position: 'absolute', top: pad, bottom: pad, left: 0, borderRadius: 999, backgroundColor: t.ink }, a]} />
      {options.map((o, i) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onLayout={onLayout(i)} onPress={() => { if (!on) { haptic.tap(); onChange(o.v); } }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={small ? { top: 10, bottom: 10 } : { top: 7, bottom: 7 }}
            style={[{ flex: 1, height: small ? 24 : 30, paddingHorizontal: small ? 10 : 0, alignItems: 'center', justifyContent: 'center' }, fit && { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', paddingHorizontal: 5 }]}>
            <Txt size={small ? 11 : 12} w="600" color={on ? t.onInk : t.ink3} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Underline tabs for switching sections of a screen, centered. Scrolls if labels overflow. */
type UnderProps<K extends string> = { options: Opt<K>[]; value: K; onChange: (v: K) => void };
/** スタンダード's page tabs: as wide as the page, each a share of it; the picked one bold with a 3pt ink line under it. */
function StdUnderTabs<K extends string>({ options, value, onChange }: UnderProps<K>) {
  return (
    <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 16, borderBottomWidth: 2, borderBottomColor: S.line }} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => { if (!on) { haptic.tap(); onChange(o.v); } }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, minWidth: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text numberOfLines={1} style={{ fontSize: 15, lineHeight: 19, fontWeight: on ? '700' : '600', color: on ? S.ink : S.ink3, fontFamily: font.text }}>{o.label}</Text>
            {on ? <View pointerEvents="none" style={{ position: 'absolute', left: '18%', right: '18%', bottom: -2, height: 3, backgroundColor: S.ink }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
export function UnderTabs<K extends string>(props: UnderProps<K>) {
  return useStd() ? <StdUnderTabs {...props} /> : <BaseUnderTabs {...props} />;
}
function BaseUnderTabs<K extends string>({ options, value, onChange }: UnderProps<K>) {
  const t = useT();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const index = options.findIndex((o) => o.v === value);
  const { a } = useIndicator(index, boxes);
  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setBoxes((b) => { const n = [...b]; n[i] = { x, w: width }; return n; });
  };
  return (
    <View style={{ borderBottomWidth: hair, borderBottomColor: t.line }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 24 }}>
        {options.map((o, i) => (
          <Pressable key={o.v} onLayout={onLayout(i)} onPress={() => { if (o.v !== value) { haptic.tap(); onChange(o.v); } }}
            accessibilityRole="tab" accessibilityState={{ selected: o.v === value }} style={{ paddingVertical: 10 }}>
            <Txt size={13.5} w="600" tone={o.v === value ? 'ink' : 'ink3'}>{o.label}</Txt>
          </Pressable>
        ))}
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1, backgroundColor: t.ink }, a]} />
      </ScrollView>
    </View>
  );
}
