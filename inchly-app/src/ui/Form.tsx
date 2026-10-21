import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ease, font, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Icon, IconName } from './Icon';
import { Rolling } from './Rolling';

// ---------- floating-label field ----------
// The label sits inside the box and lifts into the top border on focus
// (bencho "label input"). Errors turn the border and helper text red and shake once.
export type FieldHandle = { shake: () => void };
export function Field({
  label, value, onChangeText, error, max, multiline, helper, onBlur, autoFocus, inputRef, bg, ...rest
}: { label: string; value: string; onChangeText: (s: string) => void; error?: string; max?: number; multiline?: boolean; helper?: string; bg?: string; inputRef?: React.RefObject<React.ComponentRef<typeof TextInput> | null> } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const t = useT();
  const [focus, setFocus] = useState(false);
  const up = focus || value.length > 0;
  const p = useSharedValue(up ? 1 : 0);
  const sx = useSharedValue(0);
  useEffect(() => { p.value = withTiming(up ? 1 : 0, { duration: 200, easing: ease.out }); }, [up, p]);
  const prevErr = useRef(error);
  useEffect(() => {
    if (error && !prevErr.current) {
      haptic.warn();
      sx.value = withSequence(withTiming(-6, { duration: 50 }), withTiming(6, { duration: 70 }), withTiming(-3, { duration: 60 }), withTiming(0, { duration: 60 }));
    }
    prevErr.current = error;
  }, [error, sx]);
  const h = multiline ? 96 : 54;
  const la = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - p.value) * (multiline ? 18 : 17) - p.value * 9 }, { scale: 1 - p.value * 0.16 }],
  }));
  const sh = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }] }));
  const border = error ? t.red : focus ? t.ink : t.line2;
  const surface = bg ?? t.surface;
  return (
    <Animated.View style={sh}>
      <View style={{ minHeight: h, borderRadius: 12, borderWidth: focus || error ? 1.6 : StyleSheet.hairlineWidth * 2, borderColor: border, backgroundColor: surface }}>
        <TextInput
          ref={inputRef}
          {...rest}
          value={value}
          onChangeText={(s) => onChangeText(max ? s.slice(0, max) : s)}
          onFocus={() => setFocus(true)}
          onBlur={(e) => { setFocus(false); onBlur?.(e); }}
          multiline={multiline}
          autoFocus={autoFocus}
          placeholderTextColor={t.ink3}
          style={{ flex: 1, minHeight: h, paddingHorizontal: 14, paddingTop: multiline ? 22 : 14, paddingBottom: multiline ? 12 : 0, fontSize: 16, color: t.ink, fontFamily: font.ui, textAlignVertical: multiline ? 'top' : 'center' }}
        />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 10, top: 0, paddingHorizontal: 4, backgroundColor: up ? surface : 'transparent', transformOrigin: 'left center' }, la]}>
          <Txt size={15} tone={error ? 'red' : focus ? 'ink' : 'ink3'} w={up ? '500' : '400'}>{label}</Txt>
        </Animated.View>
      </View>
      {error || helper || max ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 5 }}>
          <Txt size={12} tone={error ? 'red' : 'ink3'}>{error ?? helper ?? ''}</Txt>
          {max ? <Txt size={12} tone="ink3" num>{value.length} / {max}</Txt> : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ---------- stepper: hold to repeat, accelerating ----------
export function Stepper({ value, min, max, onChange, unit }: { value: number; min: number; max: number; onChange: (v: number) => void; unit: string }) {
  const t = useT();
  const v = useRef(value);
  useEffect(() => { v.current = value; }, [value]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const step = (d: number) => {
    const nv = Math.max(min, Math.min(max, v.current + d));
    if (nv !== v.current) { v.current = nv; onChange(nv); haptic.tap(); }
  };
  const start = (d: number) => {
    step(d);
    let n = 0;
    const rep = () => { n++; step(d); timer.current = setTimeout(rep, Math.max(45, 200 - n * 18)); };
    timer.current = setTimeout(rep, 380);
  };
  const stop = () => clearTimeout(timer.current);
  useEffect(() => stop, []);
  const btn = (d: number, icon: IconName, disabled: boolean) => (
    <Press haptics={false} onPressIn={() => !disabled && start(d)} onPressOut={stop} disabled={disabled} scale={0.9}
      accessibilityLabel={d > 0 ? '増やす' : '減らす'}
      style={{ width: 46, height: 46, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={t.ink} />
    </Press>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 6, borderRadius: 14, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line }}>
      {btn(-1, 'minus', value <= min)}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Rolling value={String(value)} size={28} />
        <Txt size={13} tone="ink3" style={{ marginBottom: 3 }}>{unit}</Txt>
      </View>
      {btn(1, 'plus', value >= max)}
    </View>
  );
}

// ---------- radio cards ----------
export function RadioCards<K extends string>({ options, value, onChange }: { options: { v: K; title: string; sub: string }[]; value: K; onChange: (v: K) => void }) {
  const t = useT();
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Press key={o.v} onPress={() => onChange(o.v)} scale={0.985} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, borderRadius: 12, backgroundColor: t.surface,
              borderWidth: on ? 1.6 : StyleSheet.hairlineWidth * 2, borderColor: on ? t.ink : t.line }}>
            <Dot on={on} />
            <View style={{ flex: 1 }}>
              <Txt size={14.5} w="600">{o.title}</Txt>
              <Txt size={12.5} tone="ink3">{o.sub}</Txt>
            </View>
          </Press>
        );
      })}
    </View>
  );
}
function Dot({ on }: { on: boolean }) {
  const t = useT();
  const s = useSharedValue(on ? 1 : 0);
  useEffect(() => { s.value = withTiming(on ? 1 : 0, { duration: 260, easing: ease.spring }); }, [on, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ width: 20, height: 20, marginTop: 2, borderRadius: 10, borderWidth: 1.6, borderColor: on ? t.ink : t.line2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.ink }, a]} />
    </View>
  );
}

// ---------- chips (single choice) ----------
export function Choice<K extends string>({ options, value, onChange }: { options: { v: K; label: string }[]; value: K; onChange: (v: K) => void }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Press key={o.v} onPress={() => onChange(o.v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ height: 36, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', backgroundColor: on ? t.ink : t.sunken }}>
            <Txt size={13.5} w={on ? '600' : '500'} color={on ? t.onInk : t.ink2}>{o.label}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

export function Label({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Txt size={14} w="700">{children}</Txt>
      {sub ? <Txt size={12} tone="ink3">{sub}</Txt> : null}
    </View>
  );
}

export function Checkbox({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : 'transparent', borderWidth: on ? 0 : 1.6, borderColor: t.line2 }}>
      {on ? <Icon name="check" size={15} color={t.onInk} width={2.8} /> : null}
    </Pressable>
  );
}
