import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colorHex, type DigitColor } from './colors';
import { useT } from './settings';

// A field of every colour: hue across, and down it from white through the pure hue
// to black. Touch or drag anywhere to pick; the ring shows where. The ring follows the
// finger at once, and the pick is passed on a few times a second while dragging and
// once more when the finger lifts (the digits behind needn't redraw on every move).

const HUES = [0, 60, 120, 180, 240, 300, 360];
const PASS_MS = 120;

function makeFieldGesture() {
  const h = { pick: (_x: number, _y: number, _end: boolean) => {} };
  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => h.pick(e.x, e.y, false))
    .onUpdate((e) => h.pick(e.x, e.y, false))
    .onFinalize((e) => h.pick(e.x, e.y, true));
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
  /** The colour under the finger as it moves, every move (null once it lifts). */
  onLive?: (c: DigitColor | null) => void;
  height?: number;
};

export function ColorField({ value, onChange, onLive, height = 150 }: Props) {
  const [width, setWidth] = useState(0);
  // The pick under the finger, ahead of what has been passed on.
  const [live, setLive] = useState<DigitColor | null>(null);
  const [passed, setPassed] = useState(0);
  const [g] = useState(makeFieldGesture);
  const t = useT();
  useEffect(() =>
    g.set({
      pick: (x, y, end) => {
        if (!width) return;
        const c = {
          h: Math.min(359.9, Math.max(0, (x / width) * 360)),
          l: Math.min(1, Math.max(0, 1 - y / height)),
        };
        setLive(end ? null : c);
        onLive?.(end ? null : c);
        const now = Date.now();
        if (end || now - passed > PASS_MS) {
          setPassed(now);
          onChange(c);
        }
      },
    })
  );
  const shown = live ?? value;
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
        {shown && width ? (
          <View
            pointerEvents="none"
            style={[
              styles.ring,
              {
                // (Kept whole inside the field, even at its edges.)
                left: Math.min(width - 26, Math.max(0, (shown.h / 360) * width - 13)),
                top: Math.min(height - 26, Math.max(0, (1 - shown.l) * height - 13)),
                backgroundColor: colorHex(shown),
              },
            ]}
          />
        ) : null}
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
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
