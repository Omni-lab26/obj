import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, TextInputProps, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { font, hair, noOutline, radius, useT } from '../theme';
import { haptic, Press, StdKey, Txt } from './base';
import { Pane } from './Glass';
import { Icon } from './Icon';
import { Counter } from './Counter';
import { micro } from './motion';
import { ring, S, SR, useStd } from './stdLook';

// ---------- floating-label field ----------
// The label sits inside the box and lifts into the top border on focus
// (bencho "label input"). Errors turn the border and helper text red, with a tap you feel (no shake).
export function Field({
  label, value, onChangeText, error, max, multiline, helper, onBlur, autoFocus, inputRef, bg, ...rest
}: { label: string; value: string; onChangeText: (s: string) => void; error?: string; max?: number; multiline?: boolean; helper?: string; bg?: string; inputRef?: React.RefObject<React.ComponentRef<typeof TextInput> | null> } & Omit<TextInputProps, 'value' | 'onChangeText'>) {
  const t = useT();
  const std = useStd();
  const [focus, setFocus] = useState(false);
  const up = focus || value.length > 0;
  const p = useSharedValue(up ? 1 : 0);
  useEffect(() => { p.value = micro(up ? 1 : 0); }, [up, p]);
  const prevErr = useRef(error);
  useEffect(() => {
    if (error && !prevErr.current) haptic.warn();
    prevErr.current = error;
  }, [error]);
  const h = multiline ? 88 : 48;
  const la = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - p.value) * (multiline ? 15 : 14) - p.value * 9 }, { scale: 1 - p.value * 0.16 }],
  }));
  const border = error ? t.red : focus ? t.ink : t.line2;
  const surface = bg ?? t.surface;
  return (
    <View>
      <View style={[{ minHeight: h, borderRadius: radius.inner, borderWidth: focus || error ? 1.25 : hair, borderColor: border, backgroundColor: surface },
        // スタンダード: the card's color, a thin ink outline, the full 2pt one while you type (the crimson-red one for an error)
        std && { borderRadius: SR.key, borderWidth: 0, backgroundColor: bg ?? S.card, boxShadow: ring(focus || error ? 2 : 1.5, error ? S.down : S.ink) }]}>
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
          style={[{ flex: 1, minHeight: h, paddingHorizontal: 14, paddingTop: multiline ? 20 : 12, paddingBottom: multiline ? 10 : 0, fontSize: 16, color: t.ink, fontFamily: font.text, textAlignVertical: multiline ? 'top' : 'center' }, noOutline]}
        />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 10, top: 0, paddingHorizontal: 4, backgroundColor: up ? (std ? bg ?? S.card : surface) : 'transparent', transformOrigin: 'left center' }, la]}>
          <Txt size={14} tone={error ? 'red' : focus ? 'ink' : std && up ? 'ink2' : 'ink3'} w={up ? (std ? '700' : '500') : '400'}>{label}</Txt>
        </Animated.View>
      </View>
      {error || helper || max ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2, paddingTop: 5 }}>
          <Txt size={11} tone={error ? 'red' : 'ink3'}>{error ?? helper ?? ''}</Txt>
          {max ? <Txt size={11} tone="ink3" num>{value.length} / {max}</Txt> : null}
        </View>
      ) : null}
    </View>
  );
}

// ---------- stepper: the bencho-style rolling counter ----------
export function Stepper({ value, min, max, onChange, unit, label = '数' }: { value: number; min: number; max: number; onChange: (v: number) => void; unit: string; label?: string }) {
  return <Counter value={value} min={min} max={max} onChange={onChange} unit={unit} label={label} />;
}

// ---------- radio cards ----------
export function RadioCards<K extends string>({ options, value, onChange }: { options: { v: K; title: string; sub: string }[]; value: K; onChange: (v: K) => void }) {
  const t = useT();
  const std = useStd();
  return (
    <View style={{ gap: std ? 10 : 8 }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Press key={o.v} onPress={() => onChange(o.v)} scale={0.985} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 11, paddingHorizontal: 12, borderRadius: radius.inner, backgroundColor: t.surface,
              borderWidth: on ? 1.25 : hair, borderColor: on ? t.ink : t.line2 },
              // スタンダード: the card with a thin ink outline; the picked one outlined in full and lime behind its words
              std && { borderWidth: 0, borderRadius: SR.mid, backgroundColor: on ? S.lime : S.card, boxShadow: ring(on ? 2 : 1.5) }]}>
            <Pane radius={radius.inner} small />
            <Dot on={on} />
            <View style={{ flex: 1 }}>
              <Txt size={13.5} w="600" lh={19}>{o.title}</Txt>
              <Txt size={11.5} tone="ink3" lh={16}>{o.sub}</Txt>
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
  useEffect(() => { s.value = micro(on ? 1 : 0); }, [on, s]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View style={{ width: 18, height: 18, marginTop: 1, borderRadius: 9, borderWidth: 1.25, borderColor: on ? t.ink : t.ink3, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[{ width: 9, height: 9, borderRadius: 5, backgroundColor: t.ink }, a]} />
    </View>
  );
}

// ---------- chips (single choice) ----------
export function Choice<K extends string>({ options, value, onChange }: { options: { v: K; label: string }[]; value: K; onChange: (v: K) => void }) {
  const t = useT();
  const std = useStd();
  // スタンダード: chips on a 2pt floor; the picked one lime, down on its floor
  if (std) return <StdChips options={options} value={value} onChange={onChange} />;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.v === value;
        return (
          <Press key={o.v} onPress={() => onChange(o.v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 6, bottom: 6 }}
            style={{ height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', backgroundColor: on ? t.ink : t.surface, borderWidth: hair, borderColor: on ? t.ink : t.line2 }}>
            <Txt size={12.5} w={on ? '600' : '500'} color={on ? t.onInk : t.ink2}>{o.label}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

/** スタンダード's chip: a small key on a 2pt floor; picked, it's lime and stays down. */
export function StdChip({ label, on, onPress, role = 'radio', children, a11y }: { label?: string; on?: boolean; onPress: () => void; role?: 'radio' | 'button' | 'checkbox' | 'tab'; children?: ReactNode; a11y?: string }) {
  return (
    <StdKey onPress={onPress} label={a11y ?? label} kd={2} radius={SR.chip} fill={on ? S.lime : S.card} held={on} role={role}
      state={role === 'tab' ? { selected: !!on } : role === 'button' ? undefined : { checked: !!on }} hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      style={{ minHeight: 32, marginBottom: 2 }} face={{ minHeight: 32, paddingHorizontal: 12, gap: 6 }}>
      {children}
      {label ? <Txt size={13} w={on ? '700' : '600'} lh={17} color={S.ink} numberOfLines={1}>{label}</Txt> : null}
    </StdKey>
  );
}
function StdChips<K extends string>({ options, value, onChange }: { options: { v: K; label: string }[]; value: K; onChange: (v: K) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, columnGap: 8 }} accessibilityRole="radiogroup">
      {options.map((o) => <StdChip key={o.v} label={o.label} on={o.v === value} onPress={() => onChange(o.v)} />)}
    </View>
  );
}

export function Label({ children, sub }: { children: ReactNode; sub?: string }) {
  const std = useStd();
  return (
    <View style={{ marginBottom: 8 }}>
      <Txt size={13.5} w={std ? '700' : '600'}>{children}</Txt>
      {sub ? <Txt size={11} tone="ink3">{sub}</Txt> : null}
    </View>
  );
}

export function Checkbox({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const t = useT();
  const std = useStd();
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={[{ width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : 'transparent', borderWidth: on ? 0 : 1.25, borderColor: t.ink3 },
        // スタンダード: an ink square, lime once checked
        std && { borderWidth: 0, backgroundColor: on ? S.lime : S.card, boxShadow: ring() }]}>
      {on ? <Icon name="check" size={13} color={std ? S.ink : t.onInk} width={2.6} /> : null}
    </Pressable>
  );
}
