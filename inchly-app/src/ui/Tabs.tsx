import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ease, hair, useT } from '../theme';
import { haptic, Txt } from './base';

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
    x.set(withTiming(b.x, { duration: 320, easing: ease.out }));
    w.set(withTiming(b.w, { duration: 320, easing: ease.out }));
  }, [index, boxes, x, w, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, width: w.value, transform: [{ translateX: x.value }] }));
  return { a };
}

/**
 * Segmented control, wallet style: the choice sits in a navy pill that slides.
 * On a pale track by default; `small` drops the track (for use inside cards).
 */
/** `fit`: each segment as wide as its label (for many labels of different lengths), else all the same width. */
export function Segmented<K extends string>({ options, value, onChange, style, small, fit }: { options: Opt<K>[]; value: K; onChange: (v: K) => void; style?: ViewStyle; small?: boolean; fit?: boolean }) {
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
export function UnderTabs<K extends string>({ options, value, onChange }: { options: Opt<K>[]; value: K; onChange: (v: K) => void }) {
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
