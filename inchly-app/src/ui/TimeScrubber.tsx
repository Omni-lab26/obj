import { useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, SharedValue, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { font, useT } from '../theme';
import { haptic } from './base';

// bencho "time scrubber": drag the ruler to set a time; fling it and it coasts
// to the nearest step. Ticks shrink and fade away from the red centre needle
// (measured on bencho: opacity 1-(d/146)², height 1-(d/197)² over a 260 px ruler).
const PX = 10; // px per tick
const NEEDLE = '#E5484D';
const SNAP = Easing.bezier(0.24, 1.34, 0.38, 1);

type Props = {
  value: number; // minutes
  onChange: (m: number) => void; // called with whole minutes while the user moves the ruler
  min: number;
  max: number;
  step: number; // snap step, minutes
  tick: number; // minutes per tick
  mid: number; // taller tick every N minutes
  major: number; // tallest, labelled tick every N minutes
  label: (m: number) => string;
  dark?: boolean;
  a11y: string;
};

function Tick({ m, cur, ppm, half, R1, R2, kind, color, label, labelColor }: {
  m: number; cur: SharedValue<number>; ppm: number; half: number; R1: number; R2: number;
  kind: 0 | 1 | 2; color: string; label?: string; labelColor: string;
}) {
  const h = kind === 2 ? 25 : kind === 1 ? 17 : 10;
  const a = useAnimatedStyle(() => {
    const x = (m - cur.value) * ppm;
    const d = Math.abs(x);
    return {
      opacity: Math.max(0.18, 1 - (d / R1) ** 2),
      transform: [{ translateX: half + x - 1 }, { scaleY: Math.max(0.55, 1 - (d / R2) ** 2) }],
    };
  });
  const la = useAnimatedStyle(() => {
    const x = (m - cur.value) * ppm;
    const d = Math.abs(x);
    return { opacity: Math.max(0, 0.95 - (d / R1) ** 2), transform: [{ translateX: half + x - 40 }] };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', top: 8, left: 0, width: 2, height: h, borderRadius: 1, backgroundColor: color, transformOrigin: 'top' }, a]} />
      {label ? (
        <Animated.View style={[{ position: 'absolute', top: 38, left: 0, width: 80, alignItems: 'center' }, la]}>
          <Text style={{ fontSize: 11, color: labelColor, fontFamily: font.num }}>{label}</Text>
        </Animated.View>
      ) : null}
    </>
  );
}

export function TimeScrubber({ value, onChange, min, max, step, tick, mid, major, label, dark, a11y }: Props) {
  const t = useT();
  const ink = dark ? '#F2F3F1' : t.ink;
  const labelColor = dark ? 'rgba(242,243,241,0.55)' : t.ink3;
  const ppm = PX / tick;
  const [w, setW] = useState(0);
  const half = w / 2;
  const R1 = 146 * (w / 260 || 1);
  const R2 = 197 * (w / 260 || 1);

  const cur = useSharedValue(value);
  const touching = useSharedValue(0); // 1 while dragging or coasting
  const [center, setCenter] = useState(Math.round(value));
  const cb = useRef({ onChange, min, max, step });
  useEffect(() => { cb.current = { onChange, min, max, step }; }, [onChange, min, max, step]);

  // Follow the value from outside (e.g. a countdown) unless the user is holding the ruler.
  useEffect(() => {
    if (touching.get()) return;
    const diff = Math.abs(cur.get() - value);
    if (diff < 0.001) return;
    cur.set(diff <= 0.05 ? withTiming(value, { duration: 1000, easing: Easing.linear }) : withTiming(value, { duration: 420, easing: SNAP }));
  }, [value, cur, touching]);

  // Keep the rendered window of ticks around the needle; report whole minutes while the user moves it.
  const onMinute = (m: number, user: boolean) => {
    setCenter(m);
    if (user) {
      if (m % tick === 0) haptic.tap();
      cb.current.onChange(m);
    }
  };
  useAnimatedReaction(
    () => Math.round(cur.value),
    (m, prev) => { if (m !== prev) scheduleOnRN(onMinute, m, touching.value === 1); },
  );

  const settle = (m: number) => { touching.set(0); cb.current.onChange(m); };
  // The responder is created once; its handlers read refs and shared values only when a gesture fires.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => {
    let start = 0;
    const clamp = (x: number) => Math.max(cb.current.min, Math.min(cb.current.max, x));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { cancelAnimation(cur); touching.set(1); start = cur.get(); },
      onPanResponderMove: (_, g) => { cur.set(clamp(start - g.dx / ppm)); },
      onPanResponderRelease: (_, g) => {
        const { min: lo, max: hi, step: st } = cb.current;
        // px/ms → minutes/s, opposite to the finger
        cur.set(withDecay({ velocity: (-g.vx * 1000) / ppm, deceleration: 0.996, clamp: [lo, hi] }, (finished) => {
          'worklet';
          if (!finished) return; // a new touch took over
          const target = Math.max(lo, Math.min(hi, Math.round(cur.value / st) * st));
          cur.value = withTiming(target, { duration: 260, easing: SNAP }, (done) => { if (done) scheduleOnRN(settle, target); });
        }));
      },
    });
  });

  // Ticks inside the visible window (plus a margin), recalculated as the needle moves.
  const span = w ? Math.ceil(half / ppm) + tick * 3 : 0;
  const first = Math.max(min, Math.ceil((center - span) / tick) * tick);
  const ticks: number[] = [];
  for (let m = first; m <= Math.min(max, center + span); m += tick) ticks.push(m);

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} {...pan.panHandlers}
      style={{ height: 58, overflow: 'hidden' }}
      accessible accessibilityRole="adjustable" accessibilityLabel={a11y} accessibilityValue={{ text: label(Math.round(value)) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const d = e.nativeEvent.actionName === 'increment' ? step : -step;
        const nv = Math.max(min, Math.min(max, Math.round(value / step) * step + d));
        onChange(nv);
      }}>
      {w
        ? ticks.map((m) => (
            <Tick key={m} m={m} cur={cur} ppm={ppm} half={half} R1={R1} R2={R2} color={ink} labelColor={labelColor}
              kind={m % major === 0 ? 2 : m % mid === 0 ? 1 : 0} label={m % major === 0 ? label(m) : undefined} />
          ))
        : null}
      <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: half - 1.5, width: 3, height: 32, borderRadius: 2, backgroundColor: NEEDLE }} />
    </View>
  );
}
