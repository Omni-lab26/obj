import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ease, useT } from '../theme';
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

/** Segmented control on a sunken track; the white thumb slides to the selection. */
export function Segmented<K extends string>({ options, value, onChange, style, small }: { options: Opt<K>[]; value: K; onChange: (v: K) => void; style?: ViewStyle; small?: boolean }) {
  const t = useT();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const index = options.findIndex((o) => o.v === value);
  const { a } = useIndicator(index, boxes);
  const onLayout = (i: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setBoxes((b) => { const n = [...b]; n[i] = { x, w: width }; return n; });
  };
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: t.sunken, borderRadius: small ? 10 : 11, padding: small ? 2 : 3 }, style]} accessibilityRole="tablist">
      <Animated.View
        style={[{ position: 'absolute', top: small ? 2 : 3, bottom: small ? 2 : 3, left: 0, borderRadius: 8, backgroundColor: t.dark ? t.canvas : t.surface,
          borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line }, a]}
      />
      {options.map((o, i) => (
        <Pressable key={o.v} onLayout={onLayout(i)} onPress={() => { if (o.v !== value) { haptic.tap(); onChange(o.v); } }}
          accessibilityRole="tab" accessibilityState={{ selected: o.v === value }}
          style={{ flex: 1, height: small ? 28 : 34, paddingHorizontal: small ? 10 : 0, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={small ? 12 : 13.5} w={small ? '500' : o.v === value ? '600' : '500'} tone={o.v === value ? 'ink' : 'ink3'}>{o.label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

/** Underline tabs for switching sections of a screen. Scrolls if labels overflow. */
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
    <View style={{ borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}>
        {options.map((o, i) => (
          <Pressable key={o.v} onLayout={onLayout(i)} onPress={() => { if (o.v !== value) { haptic.tap(); onChange(o.v); } }}
            accessibilityRole="tab" accessibilityState={{ selected: o.v === value }} style={{ paddingVertical: 11 }}>
            <Txt size={15} w={o.v === value ? '700' : '500'} tone={o.v === value ? 'ink' : 'ink3'}>{o.label}</Txt>
          </Pressable>
        ))}
        <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1, backgroundColor: t.ink }, a]} />
      </ScrollView>
    </View>
  );
}
