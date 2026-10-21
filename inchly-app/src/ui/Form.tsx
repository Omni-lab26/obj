import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { ease, font, hair, noOutline, radius, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Icon } from './Icon';
import { Counter } from './Counter';

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
  const h = multiline ? 100 : 52;
  const la = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - p.value) * (multiline ? 15 : 14) - p.value * 9 }, { scale: 1 - p.value * 0.16 }],
  }));
  const sh = useAnimatedStyle(() => ({ transform: [{ translateX: sx.value }] }));
  const border = error ? t.red : focus ? t.ink : t.line2;
  const surface = bg ?? t.surface;
  return (
    <Animated.View style={sh}>
      <View style={{ minHeight: h, borderRadius: radius.inner, borderWidth: focus || error ? 1.5 : 0, borderColor: error ? border : t.tint, backgroundColor: surface }}>
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
          style={[{ flex: 1, minHeight: h, paddingHorizontal: 14, paddingTop: multiline ? 20 : 12, paddingBottom: multiline ? 10 : 0, fontSize: 17, color: t.ink, fontFamily: font.text, textAlignVertical: multiline ? 'top' : 'center' }, noOutline]}
        />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 10, top: 0, paddingHorizontal: 4, backgroundColor: up ? surface : 'transparent', transformOrigin: 'left center' }, la]}>
          <Txt size={17} tone={error ? 'red' : 'ink3'} w="400">{label}</Txt>
        </Animated.View>
      </View>
      {error || helper || max ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 5 }}>
          <Txt size={13} tone={error ? 'red' : 'ink2'}>{error ?? helper ?? ''}</Txt>
          {max ? <Txt size={13} tone="ink3" num>{value.length} / {max}</Txt> : null}
        </View>
      ) : null}
    </Animated.View>
  );
}

// ---------- stepper: the bencho-style rolling counter ----------
export function Stepper({ value, min, max, onChange, unit, label = '数' }: { value: number; min: number; max: number; onChange: (v: number) => void; unit: string; label?: string }) {
  return <Counter value={value} min={min} max={max} onChange={onChange} unit={unit} label={label} />;
}

// ---------- radio list: an inset grouped list with a checkmark on the choice ----------
export function RadioCards<K extends string>({ options, value, onChange }: { options: { v: K; title: string; sub: string }[]; value: K; onChange: (v: K) => void }) {
  const t = useT();
  return (
    <View style={{ backgroundColor: t.surface, borderRadius: radius.card, overflow: 'hidden' }} accessibilityRole="radiogroup">
      {options.map((o, i) => {
        const on = o.v === value;
        return (
          <Pressable key={o.v} onPress={() => { haptic.tap(); onChange(o.v); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 16, minHeight: 56, backgroundColor: pressed ? 'rgba(60,60,67,0.08)' : 'transparent' })}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 16, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <View style={{ flex: 1 }}>
              <Txt size={17} lh={22}>{o.title}</Txt>
              <Txt size={13} tone="ink2" lh={18}>{o.sub}</Txt>
            </View>
            {on ? <Icon name="check" size={18} color={t.tint} width={2.4} /> : null}
          </Pressable>
        );
      })}
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
          <Press key={o.v} onPress={() => onChange(o.v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 6, bottom: 6 }}
            style={{ height: 36, paddingHorizontal: 15, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? t.tint : t.sunken }}>
            <Txt size={15} w={on ? '600' : '400'} color={on ? '#fff' : t.ink}>{o.label}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

export function Label({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: 8, paddingHorizontal: 4 }}>
      <Txt size={20} w="700" lh={25}>{children}</Txt>
      {sub ? <Txt size={13} tone="ink2">{sub}</Txt> : null}
    </View>
  );
}

export function Checkbox({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const t = useT();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: 'rgba(60,60,67,0.3)' }}>
      {on ? <Icon name="check" size={13} color="#fff" width={2.8} /> : null}
    </Pressable>
  );
}
