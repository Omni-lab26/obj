import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, ReactNode } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { dateKey, parseKey } from '../lib/time';
import { hair, useT } from '../theme';
import { Press, Txt } from './base';
import { Stepper } from './Form';

// Every date, time and length in the app is picked the way the phone picks
// them: on iPhone, the calendar and the wheels from iOS itself, opening right
// under the row you tapped (as in the Calendar app); on Android, its own
// dialog; in a browser, its date and time fields. The rows and what opens
// under them move with one smooth layout motion.

const IOS = Platform.OS === 'ios';
const WEB = Platform.OS === 'web';
/** Rows and what opens under them slide into place together. */
export const SMOOTH = LinearTransition.springify().damping(22).stiffness(220);

const at = (day: Date, min: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(min / 60), min % 60);
const clock = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

/** A browser's own date or time field, dressed like a chip. */
function WebField({ type, value, onChange, min, max, step }: { type: 'date' | 'time'; value: string; onChange: (v: string) => void; min?: string; max?: string; step?: number }) {
  const t = useT();
  return createElement('input', {
    type, value, min, max, step, 'aria-label': type === 'date' ? '日付' : '時刻',
    onChange: (e: { target: { value: string } }) => { if (e.target.value) onChange(e.target.value); },
    style: { font: 'inherit', fontSize: 17, padding: '8px 12px', borderRadius: 10, border: 'none', background: t.sunken, color: t.ink, margin: '10px 14px', alignSelf: 'flex-start' },
  });
}

/** What opens under a row: fades in, and the rows below make room smoothly. */
export function Opens({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(140)} layout={SMOOTH}
      style={{ borderTopWidth: hair, borderTopColor: t.line, alignItems: IOS ? 'center' : 'stretch' }}>
      {children}
    </Animated.View>
  );
}

/** A day: iOS's calendar in the page (Android: its dialog; the web: a date field). onDone: Android's dialog closed. */
export function DatePick({ value, onChange, min, max, onDone }: { value: Date; onChange: (d: Date) => void; min?: Date; max?: Date; onDone?: () => void }) {
  const t = useT();
  if (WEB) return <WebField type="date" value={dateKey(value)} min={min && dateKey(min)} max={max && dateKey(max)} onChange={(v) => onChange(parseKey(v))} />;
  return (
    <DateTimePicker value={value} mode="date" display={IOS ? 'inline' : 'default'} locale="ja-JP" minimumDate={min} maximumDate={max} accentColor={t.blue} themeVariant="light"
      onValueChange={(_, d) => { onChange(d); if (!IOS) onDone?.(); }} onDismiss={onDone} style={IOS ? { width: 340, maxWidth: '100%' } : undefined} />
  );
}

/** A time of day, in minutes from midnight: iOS's wheels, every 5 minutes. */
export function TimePick({ value, onChange, onDone }: { value: number; onChange: (min: number) => void; onDone?: () => void }) {
  const t = useT();
  if (WEB) return <WebField type="time" value={clock(value).padStart(5, '0')} step={300} onChange={(v) => { const [h, m] = v.split(':').map(Number); onChange(h * 60 + m); }} />;
  return (
    <DateTimePicker value={at(new Date(), value)} mode="time" display={IOS ? 'spinner' : 'default'} locale="ja-JP" minuteInterval={5} textColor={t.ink} themeVariant="light"
      onValueChange={(_, d) => { onChange(d.getHours() * 60 + d.getMinutes()); if (!IOS) onDone?.(); }} onDismiss={onDone} style={IOS ? { height: 190 } : undefined} />
  );
}

/** A length, in minutes: iOS's hour and minute wheels (elsewhere, a stepper). */
export function DurationPick({ value, onChange }: { value: number; onChange: (min: number) => void }) {
  const t = useT();
  if (!IOS) return <View style={{ padding: 14 }}><Stepper value={value} min={1} max={600} onChange={onChange} unit="分" label="勉強した時間" /></View>;
  return (
    <DateTimePicker value={at(new Date(), Math.min(23 * 60 + 55, value))} mode="countdown" display="spinner" locale="ja-JP" minuteInterval={5} textColor={t.ink} themeVariant="light"
      onValueChange={(_, d) => onChange(Math.max(1, d.getHours() * 60 + d.getMinutes()))} style={{ height: 190 }} />
  );
}

/** The chip on the right of a row that opens a picker; blue while open, as on iOS. The keyboard goes away as it opens, so the wheels aren't hidden behind it. */
export function PickChip({ label, on, onPress, a11y }: { label: string; on?: boolean; onPress?: () => void; a11y: string }) {
  const t = useT();
  return (
    <Press onPress={() => { Keyboard.dismiss(); onPress?.(); }} disabled={!onPress} scale={0.95} accessibilityLabel={a11y} accessibilityState={{ expanded: !!on }}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: t.sunken }}>
      <Txt num size={16} w="500" color={on ? t.blue : t.ink}>{label}</Txt>
    </Press>
  );
}
