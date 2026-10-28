import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { font, useT } from '../theme';
import { haptic } from './base';
import { M, move } from './motion';

// A ruler you drag to set a time; fling it and it coasts, then snaps to the
// nearest step without going past it. Everything that moves runs on the UI thread: the ticks are one
// static strip slid by a single transform, and the edges fade under a gradient,
// so a drag never waits on React. React only hears about whole steps (for the
// readout and a haptic tick) and the final value when the ruler comes to rest.
const NEEDLE = '#E5484D';
const H = 58;

type Props = {
  value: number; // in the ruler's unit (minutes or hours)
  onChange: (v: number) => void; // once, when the ruler comes to rest after the user moved it
  onPreview?: (v: number | null) => void; // whole steps while the user moves it; null when done
  min: number;
  max: number;
  step: number; // snap step
  px: number; // px per unit
  minor: number; // units per tick
  mid: number; // taller tick every N units
  major: number; // labelled tick every N units
  label: (v: number) => string;
  bg: string; // the background the edges fade into
  dark?: boolean; // light ticks for a dark background
  a11y: string;
};

export const TimeScrubber = memo(function TimeScrubber({ value, onChange, onPreview, min, max, step, px, minor, mid, major, label, bg, dark, a11y }: Props) {
  const t = useT();
  const ink = dark ? '#F2F3F1' : t.ink;
  const soft = dark ? 'rgba(242,243,241,0.7)' : t.ink2;
  const labelColor = dark ? 'rgba(242,243,241,0.6)' : t.ink3;
  const [w, setW] = useState(0);
  const half = w / 2;
  const cur = useSharedValue(value);
  const touching = useSharedValue(0); // 1 while the user drags or the ruler coasts
  const start = useSharedValue(0);
  const cb = useRef({ onChange, onPreview });
  useEffect(() => { cb.current = { onChange, onPreview }; }, [onChange, onPreview]);

  // Follow the value from outside (a countdown, or a change elsewhere) unless the user holds the ruler.
  useEffect(() => {
    if (touching.get()) return;
    const diff = Math.abs(cur.get() - value);
    if (diff < 0.001) return;
    // a countdown's second glides at an even pace, like a clock's hand; a jump slides there
    cur.set(diff <= 0.05 ? withTiming(value, { duration: 1000, easing: Easing.linear }) : move(value));
  }, [value, cur, touching]);

  const stepTo = (v: number) => { haptic.tap(); cb.current.onPreview?.(v); };
  const settle = (v: number) => { cb.current.onPreview?.(null); cb.current.onChange(v); };
  useAnimatedReaction(
    () => Math.round(cur.value / step) * step,
    (v, prev) => { if (prev !== null && v !== prev && touching.value === 1) scheduleOnRN(stepTo, v); },
  );

  const pan = useMemo(() => {
    return Gesture.Pan()
      .activeOffsetX([-3, 3])
      .failOffsetY([-14, 14])
      .onBegin(() => {
        cancelAnimation(cur);
        touching.value = 1;
        start.value = cur.value;
      })
      .onUpdate((e) => {
        cur.value = Math.max(min, Math.min(max, start.value - e.translationX / px));
      })
      .onEnd((e) => {
        cur.value = withDecay({ velocity: -e.velocityX / px, deceleration: 0.995, clamp: [min, max] }, (finished) => {
          if (!finished) return; // a new touch took over
          const target = Math.max(min, Math.min(max, Math.round(cur.value / step) * step));
          cur.value = withTiming(target, M.micro, (done) => {
            if (!done) return;
            touching.value = 0;
            scheduleOnRN(settle, target);
          });
        });
      })
      .onFinalize((_, ok) => {
        if (ok) return;
        // a tap without a drag: snap where it is
        const target = Math.max(min, Math.min(max, Math.round(cur.value / step) * step));
        cur.value = withTiming(target, M.micro, (done) => { if (done) { touching.value = 0; } });
      });
    // gesture callbacks are worklets; settle/stepTo read the latest callbacks from a ref
  }, [min, max, step, px, cur, touching, start]);

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: -(cur.value - min) * px }] }));

  // The ticks are drawn once per size; only the strip's transform moves.
  const ticks = useMemo(() => {
    const n = Math.round((max - min) / minor);
    const per = (k: number) => Math.round(k / minor);
    const out = [];
    for (let i = 0; i <= n; i++) {
      const v = min + i * minor;
      const big = i % per(major) === 0, middle = i % per(mid) === 0;
      out.push(
        <View key={i} style={{ position: 'absolute', left: i * minor * px - 1, top: 8, width: 2, height: big ? 26 : middle ? 17 : 10, borderRadius: 1, backgroundColor: big ? ink : soft }} />,
      );
      if (big) {
        out.push(
          <Text key={'l' + i} style={{ position: 'absolute', left: i * minor * px - 40, top: 38, width: 80, textAlign: 'center', fontSize: 11, color: labelColor, fontFamily: font.text, fontWeight: '500', fontVariant: ['tabular-nums'] }}>
            {label(Math.round(v * 100) / 100)}
          </Text>,
        );
      }
    }
    return out;
  }, [min, max, minor, mid, major, px, label, ink, soft, labelColor]);

  const fade = Math.min(110, half * 0.8);
  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H, overflow: 'hidden' }}
        accessible accessibilityRole="adjustable" accessibilityLabel={a11y} accessibilityValue={{ text: label(Math.round(value / step) * step) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const d = e.nativeEvent.actionName === 'increment' ? step : -step;
          onChange(Math.max(min, Math.min(max, Math.round(value / step) * step + d)));
        }}>
        {w ? (
          <>
            <Animated.View style={[{ position: 'absolute', left: half, top: 0, bottom: 0 }, strip]}>{ticks}</Animated.View>
            {/* the ends fade out, so the ruler reads as a dial under the needle */}
            <Svg pointerEvents="none" width={w} height={H} style={{ position: 'absolute' }}>
              <Defs>
                <LinearGradient id="fadeL" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={bg} stopOpacity={1} />
                  <Stop offset="1" stopColor={bg} stopOpacity={0} />
                </LinearGradient>
                <LinearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0">
                  <Stop offset="0" stopColor={bg} stopOpacity={0} />
                  <Stop offset="1" stopColor={bg} stopOpacity={1} />
                </LinearGradient>
              </Defs>
              <Rect x={0} y={0} width={fade} height={H} fill="url(#fadeL)" />
              <Rect x={w - fade} y={0} width={fade} height={H} fill="url(#fadeR)" />
            </Svg>
            <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: half - 1.5, width: 3, height: 34, borderRadius: 2, backgroundColor: NEEDLE }} />
          </>
        ) : null}
      </View>
    </GestureDetector>
  );
});
