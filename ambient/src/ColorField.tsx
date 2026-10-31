import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { makeMutable, runOnJS, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colorHex, type DigitColor } from './colors';
import { useT } from './settings';

// A field of every colour: hue across, and down it from white through the pure hue
// to black. Touch or drag anywhere to pick; the ring shows where. The ring follows the
// finger on the UI thread, every frame, whatever the rest of the app is doing; the
// colour under it is passed on a little less often (the live time beside the field
// many times a second, the digits behind a few times a second) and once more when the
// finger lifts.

const HUES = [0, 60, 120, 180, 240, 300, 360];
const LIVE_MS = 40;
const PASS_MS = 150;
const RING = 26;

function makeFieldGesture(x: SharedValue<number>, y: SharedValue<number>, size: SharedValue<{ w: number; h: number }>) {
  const h = { pick: (_c: DigitColor, _end: boolean, _pass: boolean) => {} };
  const pick = (c: DigitColor, end: boolean, pass: boolean) => h.pick(c, end, pass);
  // (A shared value, not a plain object: each callback would get its own copy.)
  const last = makeMutable({ live: 0, pass: 0 });
  const at = (ex: number, ey: number, end: boolean) => {
    'worklet';
    const { w, h: fh } = size.get();
    if (!w) return;
    const cx = Math.min(w, Math.max(0, ex));
    const cy = Math.min(fh, Math.max(0, ey));
    x.set(cx);
    y.set(cy);
    const c = { h: Math.min(359.9, (cx / w) * 360), l: 1 - cy / fh };
    const now = Date.now();
    const was = last.get();
    const pass = end || now - was.pass > PASS_MS;
    if (pass || now - was.live > LIVE_MS) {
      last.set({ live: now, pass: pass ? now : was.pass });
      runOnJS(pick)(c, end, pass);
    }
  };
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => at(e.x, e.y, false))
    .onUpdate((e) => at(e.x, e.y, false))
    .onFinalize((e) => at(e.x, e.y, true));
  return {
    gesture: pan,
    set(next: typeof h) {
      Object.assign(h, next);
    },
  };
}

type Props = {
  value: DigitColor | null;
  onChange: (c: DigitColor) => void;
  /** The colour under the finger as it moves (null once it lifts). */
  onLive?: (c: DigitColor | null) => void;
  height?: number;
};

export function ColorField({ value, onChange, onLive, height = 150 }: Props) {
  const [width, setWidth] = useState(0);
  const size = useSharedValue({ w: 0, h: height });
  // Where the ring is (in the field), and whether a finger is on it.
  const x = useSharedValue(-1);
  const y = useSharedValue(-1);
  const [touching, setTouching] = useState(false);
  const [g] = useState(() => makeFieldGesture(x, y, size));
  const t = useT();
  useEffect(() =>
    g.set({
      pick: (c, end, pass) => {
        setTouching(!end);
        onLive?.(end ? null : c);
        if (pass) onChange(c);
      },
    })
  );
  useEffect(() => size.set({ w: width, h: height }), [width, height, size]);
  // Not touched, the ring stands on the colour chosen (or hides, on 自動).
  useEffect(() => {
    if (touching || !width) return;
    x.set(value ? (value.h / 360) * width : -1);
    y.set(value ? (1 - value.l) * height : -1);
  }, [value, width, height, touching, x, y]);
  const ringStyle = useAnimatedStyle(() => {
    const { w, h } = size.get();
    const cx = x.get();
    const cy = y.get();
    if (cx < 0 || !w) return { opacity: 0 };
    return {
      opacity: 1,
      backgroundColor: colorHex({ h: Math.min(359.9, (cx / w) * 360), l: 1 - cy / h }),
      // (Kept whole inside the field, even at its edges.)
      transform: [
        { translateX: Math.min(w - RING, Math.max(0, cx - RING / 2)) },
        { translateY: Math.min(h - RING, Math.max(0, cy - RING / 2)) },
      ],
    };
  });
  return (
    <GestureDetector gesture={g.gesture}>
      <View
        style={[styles.field, { height }]}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.colourField}
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="digit-hues" x1="0" y1="0" x2="1" y2="0">
              {HUES.map((hue) => (
                <Stop key={hue} offset={hue / 360} stopColor={colorHex({ h: hue % 360, l: 0.5 })} />
              ))}
            </LinearGradient>
            <LinearGradient id="digit-white" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={1} />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
            <LinearGradient id="digit-black" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.5" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#digit-hues)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#digit-white)" />
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#digit-black)" />
        </Svg>
        <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
