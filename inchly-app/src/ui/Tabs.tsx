import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, View, ViewStyle } from 'react-native';
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

/**
 * The iOS segmented control: a grey track, a white thumb with a soft shadow
 * that slides to the choice. Labels stay black (semibold when chosen).
 */
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
    <View style={[{ flexDirection: 'row', backgroundColor: t.sunken, borderRadius: 999, padding: 2 }, style]} accessibilityRole="tablist">
      <Animated.View style={[{ position: 'absolute', top: 2, bottom: 2, left: 0, borderRadius: 999, backgroundColor: '#fff',
        boxShadow: '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04), 0px 0px 0px 0.5px rgba(0,0,0,0.04)' }, a]} />
      {options.map((o, i) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onLayout={onLayout(i)} onPress={() => { if (!on) { haptic.tap(); onChange(o.v); } }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={{ top: 6, bottom: 6 }}
            style={{ flex: 1, height: small ? 28 : 32, paddingHorizontal: small ? 12 : 4, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={small ? 13 : 13.5} w={on ? '600' : '500'} lh={18} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Section switcher for a screen: the same segmented control, full width. */
export function UnderTabs<K extends string>({ options, value, onChange }: { options: Opt<K>[]; value: K; onChange: (v: K) => void }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
      <Segmented options={options} value={value} onChange={onChange} />
    </View>
  );
}
