import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';

// A ruler of minutes under a fixed centre mark. Drag it and the time runs with it;
// fling it and it coasts, then settles on a whole minute. The landing is decided on
// release (where the ruler would coast to, rounded), and one spring carries it there
// starting at the finger's speed, so a flick and a slow release are the same motion.
// The ruler and its fading ticks move on the native driver; only the minute count
// comes back to JS.

const MIN = 1;
const MAX = 120;
const GAP = 11; // px per minute
const COAST = 220; // ms of the release speed carried into the landing

type Props = {
  minutes: number;
  width: number;
  ink: string;
  inkSoft: string;
  /** While dragging or coasting: the minute under the mark. */
  onPreview: (minutes: number | null) => void;
  /** Once it has settled. */
  onChange: (minutes: number) => void;
};

const clampMin = (m: number) => Math.min(MAX, Math.max(MIN, m));
const at = (m: number) => -m * GAP;

// The ruler's gesture and spring, kept outside React's render: drag, fling, settle,
// and report the minute under the mark as it changes.
function makeRuler(offset: Animated.Value, minutes: number) {
  const g = {
    last: minutes,
    start: 0,
    moving: false,
    onPreview: (_m: number | null) => {},
    onChange: (_m: number) => {},
  };
  const settle = (dx: number, vx: number) => {
    const target = clampMin(Math.round(-(g.start + dx + vx * COAST) / GAP));
    Animated.spring(offset, {
      toValue: at(target),
      velocity: vx,
      stiffness: 170,
      damping: 26,
      mass: 1,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      g.moving = false;
      g.last = target;
      g.onChange(target);
      g.onPreview(null);
    });
  };
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => {
      g.moving = true;
      offset.stopAnimation((v) => {
        g.start = v;
      });
    },
    onPanResponderMove: (_, d) => {
      // Past either end the ruler gives a little, with resistance.
      let v = g.start + d.dx;
      const lo = at(MAX);
      const hi = at(MIN);
      if (v > hi) v = hi + (v - hi) * 0.3;
      if (v < lo) v = lo + (v - lo) * 0.3;
      offset.setValue(v);
    },
    onPanResponderRelease: (_, d) => settle(d.dx, d.vx),
    onPanResponderTerminate: (_, d) => settle(d.dx, d.vx),
  });
  return {
    pan,
    handlers(onPreview: (m: number | null) => void, onChange: (m: number) => void) {
      g.onPreview = onPreview;
      g.onChange = onChange;
    },
    // Follow outside changes (a reset) when idle.
    follow(m: number) {
      if (g.moving) return;
      g.last = m;
      offset.setValue(at(m));
    },
    listen() {
      const id = offset.addListener(({ value }) => {
        if (!g.moving) return;
        const m = clampMin(Math.round(-value / GAP));
        if (m === g.last) return;
        g.last = m;
        g.onPreview(m);
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
      });
      return () => offset.removeListener(id);
    },
  };
}

export function TimeScrubber({ minutes, width, ink, inkSoft, onPreview, onChange }: Props) {
  const [offset] = useState(() => new Animated.Value(at(minutes)));
  const [ruler] = useState(() => makeRuler(offset, minutes));
  useEffect(() => ruler.handlers(onPreview, onChange));
  useEffect(() => ruler.follow(minutes), [ruler, minutes]);
  useEffect(() => ruler.listen(), [ruler]);
  const { pan } = ruler;

  // Every minute is a tick; every 5th is taller, every 10th carries its number. Ticks
  // stand tallest and darkest under the mark and fall away toward the edges, so the
  // strip reads as the face of a wheel.
  const half = width / 2;
  const ticks = useMemo(() => {
    const out = [];
    for (let m = 0; m <= MAX; m++) {
      const centre = at(m);
      const range = [centre - half, centre - half * 0.45, centre, centre + half * 0.45, centre + half];
      const fade = offset.interpolate({ inputRange: range, outputRange: [0, 0.55, 1, 0.55, 0], extrapolate: 'clamp' });
      const lean = offset.interpolate({ inputRange: range, outputRange: [0.55, 0.8, 1, 0.8, 0.55], extrapolate: 'clamp' });
      out.push({ m, fade, lean });
    }
    return out;
  }, [offset, half]);

  return (
    <View style={[styles.wrap, { width }]} {...pan.panHandlers} accessibilityRole="adjustable" accessibilityLabel={`タイマー ${minutes}分`}>
      <Animated.View style={[styles.strip, { left: half, transform: [{ translateX: offset }] }]}>
        {ticks.map(({ m, fade, lean }) => {
          const major = m % 5 === 0;
          const h = m % 10 === 0 ? 26 : major ? 20 : 13;
          return (
            <Animated.View key={m} style={[styles.tickBox, { left: m * GAP - 10, opacity: fade }]}>
              <Animated.View style={[styles.tick, { height: h, backgroundColor: ink, opacity: major ? 0.9 : 0.55, transform: [{ scaleY: lean }] }]} />
              {m % 10 === 0 && m > 0 ? <Text style={[styles.label, { color: inkSoft }]}>{m}</Text> : null}
            </Animated.View>
          );
        })}
      </Animated.View>
      <View pointerEvents="none" style={[styles.mark, { left: half - 1.25 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 58,
    overflow: 'hidden',
  },
  strip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 0,
  },
  tickBox: {
    position: 'absolute',
    top: 4,
    width: 20,
    height: 50,
    alignItems: 'center',
  },
  tick: {
    width: 2.5,
    borderRadius: 1.25,
  },
  label: {
    position: 'absolute',
    top: 31,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  mark: {
    position: 'absolute',
    top: 0,
    width: 2.5,
    height: 34,
    borderRadius: 1.25,
    backgroundColor: '#e5484d',
  },
});
