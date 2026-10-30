import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, View } from 'react-native';

// Rulers under a fixed centre mark. Drag one and the value runs with it; fling it
// and it coasts and clicks into a mark ten ticks apart; let go slowly and it settles
// on the nearest single tick. The landing is decided on release, and one spring
// carries the ruler there starting at the finger's speed.
//
// The ticks are a small pool that repeats: only enough to fill the window, slid by
// the offset modulo one period (where the pattern repeats), so a ruler of thousands
// of ticks costs about a hundred views, and everything moves on the native driver.
// Only the value under the mark (and the few labels near it) comes back to JS.

const COAST = 260; // ms of the release speed carried into the landing
const FLICK = 0.15; // px/ms: faster than this, it lands on a tenth tick

type RulerSpec = {
  max: number;
  gap: number; // px per tick
  period: number; // ticks after which tick heights repeat (a multiple of 10)
  height: (t: number) => number; // tick height by index within a period
  label: (t: number) => string | null; // label for tick t, if any
  labelEvery: number;
};

function makeRuler(offset: Animated.Value, spec: RulerSpec, value: number) {
  const at = (v: number) => -v * spec.gap;
  const clampV = (v: number) => Math.min(spec.max, Math.max(0, v));
  const g = {
    last: value,
    start: 0,
    moving: false,
    onPreview: (_v: number | null) => {},
    onChange: (_v: number) => {},
  };
  const settle = (dx: number, vx: number) => {
    const raw = -(g.start + dx + vx * COAST) / spec.gap;
    const target = clampV(Math.abs(vx) > FLICK ? Math.round(raw / 10) * 10 : Math.round(raw));
    Animated.spring(offset, {
      toValue: at(target),
      velocity: vx,
      stiffness: 190,
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
      const lo = at(spec.max);
      const hi = at(0);
      if (v > hi) v = hi + (v - hi) * 0.3;
      if (v < lo) v = lo + (v - lo) * 0.3;
      offset.setValue(v);
    },
    onPanResponderRelease: (_, d) => settle(d.dx, d.vx),
    onPanResponderTerminate: (_, d) => settle(d.dx, d.vx),
  });
  return {
    pan,
    handlers(onPreview: (v: number | null) => void, onChange: (v: number) => void) {
      g.onPreview = onPreview;
      g.onChange = onChange;
    },
    // Follow outside changes (a reset) when idle.
    follow(v: number) {
      if (g.moving) return;
      g.last = v;
      offset.setValue(at(v));
    },
    listen() {
      const id = offset.addListener(({ value: o }) => {
        if (!g.moving) return;
        const v = clampV(Math.round(-o / spec.gap));
        if (v === g.last) return;
        // A click at every tenth tick.
        if (Platform.OS !== 'web' && Math.floor(v / 10) !== Math.floor(g.last / 10)) Haptics.selectionAsync().catch(() => {});
        g.last = v;
        g.onPreview(v);
      });
      return () => offset.removeListener(id);
    },
  };
}

// The tick pool for a ruler: slots slid by (offset mod period), each fading toward
// the edges and hidden beyond either end of the ruler.
function makePool(offset: Animated.Value, spec: RulerSpec, half: number) {
  const P = spec.period * spec.gap;
  const u = Animated.modulo(offset, P);
  const first = -Math.ceil((half + P) / spec.gap);
  const last = Math.ceil(half / spec.gap);
  const range = [-half, -half * 0.45, 0, half * 0.45, half];
  const slots = [];
  for (let j = first; j <= last; j++) {
    const pos = Animated.add(u, j * spec.gap); // from the centre mark
    // Tallest and darkest under the mark, falling away toward the edges.
    const fade = pos.interpolate({ inputRange: range, outputRange: [0, 0.55, 1, 0.55, 0], extrapolate: 'clamp' });
    const lean = pos.interpolate({ inputRange: range, outputRange: [0.55, 0.8, 1, 0.8, 0.55], extrapolate: 'clamp' });
    const along = Animated.subtract(pos, offset);
    const inside = along.interpolate({
      inputRange: [-spec.gap * 0.5, 0, spec.max * spec.gap, spec.max * spec.gap + spec.gap * 0.5],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });
    slots.push({ j, pos, opacity: Animated.multiply(fade, inside), lean });
  }
  return slots;
}

type RulerProps = {
  spec: RulerSpec;
  value: number;
  width: number;
  ink: string;
  inkSoft: string;
  onPreview: (v: number | null) => void;
  onChange: (v: number) => void;
};

function Ruler({ spec, value, width, ink, inkSoft, onPreview, onChange }: RulerProps) {
  const half = width / 2;
  const [offset] = useState(() => new Animated.Value(-value * spec.gap));
  const [ruler] = useState(() => makeRuler(offset, spec, value));
  const [pool] = useState(() => makePool(offset, spec, half));
  // The value the labels gather round (follows the drag).
  const [near, setNear] = useState(value);
  useEffect(() =>
    ruler.handlers(
      (v) => {
        if (v != null) setNear(v);
        onPreview(v);
      },
      (v) => {
        setNear(v);
        onChange(v);
      }
    )
  );
  useEffect(() => ruler.follow(value), [ruler, value]);
  useEffect(() => ruler.listen(), [ruler]);

  // Labels: only the few around the value, on the moving strip.
  const step = spec.labelEvery;
  const span = Math.ceil(half / spec.gap / step) + 1;
  const base = Math.round(near / step) * step;
  const labels = [];
  for (let k = -span; k <= span; k++) {
    const t = base + k * step;
    const text = t >= 0 && t <= spec.max ? spec.label(t) : null;
    if (!text) continue;
    const c = -t * spec.gap;
    const fade = offset.interpolate({ inputRange: [c - half, c, c + half], outputRange: [0, 1, 0], extrapolate: 'clamp' });
    labels.push(
      <Animated.Text key={t} style={[styles.label, { left: t * spec.gap - 30, color: inkSoft, opacity: fade }]}>
        {text}
      </Animated.Text>
    );
  }

  return (
    <View style={[styles.wrap, { width }]} {...ruler.pan.panHandlers}>
      <View style={[styles.strip, { left: half }]}>
        {pool.map(({ j, pos, opacity, lean }) => {
          const h = spec.height(((j % spec.period) + spec.period) % spec.period);
          return (
            <Animated.View key={j} style={[styles.tickBox, { opacity, transform: [{ translateX: pos }] }]}>
              <Animated.View style={[styles.tick, { height: h, backgroundColor: ink, opacity: h > 14 ? 0.9 : 0.5, transform: [{ scaleY: lean }] }]} />
            </Animated.View>
          );
        })}
      </View>
      <Animated.View style={[styles.strip, { left: half, transform: [{ translateX: offset }] }]}>{labels}</Animated.View>
      <View pointerEvents="none" style={[styles.mark, { left: half - 1.25 }]} />
    </View>
  );
}

const HOURS: RulerSpec = {
  max: 100,
  gap: 12,
  period: 10,
  height: (t) => (t === 0 ? 24 : t === 5 ? 18 : 12),
  label: (t) => (t % 10 === 0 ? `${t}時間` : null),
  labelEvery: 10,
};

const SECONDS: RulerSpec = {
  max: 3599,
  gap: 7,
  period: 60,
  height: (t) => (t === 0 ? 24 : t % 10 === 0 ? 17 : 9),
  label: (t) => (t % 60 === 0 ? `${t / 60}分` : null),
  labelEvery: 60,
};

type Props = {
  /** Timer length in seconds. */
  seconds: number;
  width: number;
  ink: string;
  inkSoft: string;
  /** While a ruler is dragged or coasting: the length it shows, in seconds. */
  onPreview: (seconds: number | null) => void;
  /** Once it has settled. */
  onChange: (seconds: number) => void;
};

/** Two rulers for a timer: hours above (0-100), minutes and seconds below. */
export function TimeScrubber({ seconds, width, ink, inkSoft, onPreview, onChange }: Props) {
  const h = Math.floor(seconds / 3600);
  const s = seconds % 3600;
  // Never zero: the shortest timer is a second.
  const total = (hh: number, ss: number) => Math.max(1, hh * 3600 + ss);
  return (
    <View accessibilityRole="adjustable" accessibilityLabel="タイマーの時間">
      <Ruler
        spec={HOURS}
        value={h}
        width={width}
        ink={ink}
        inkSoft={inkSoft}
        onPreview={(v) => onPreview(v == null ? null : total(v, s))}
        onChange={(v) => onChange(total(v, s))}
      />
      <Ruler
        spec={SECONDS}
        value={s}
        width={width}
        ink={ink}
        inkSoft={inkSoft}
        onPreview={(v) => onPreview(v == null ? null : total(h, v))}
        onChange={(v) => onChange(total(h, v))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 50,
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
    left: -10,
    width: 20,
    height: 26,
    alignItems: 'center',
  },
  tick: {
    width: 2,
    borderRadius: 1,
  },
  label: {
    position: 'absolute',
    top: 30,
    width: 60,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  mark: {
    position: 'absolute',
    top: 0,
    width: 2.5,
    height: 30,
    borderRadius: 1.25,
    backgroundColor: '#e5484d',
  },
});
