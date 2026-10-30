import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// Two rulers under fixed red marks: hours above (0-23), minutes and seconds below (an
// hour in 15-second ticks). Each has two ends, where it gives a little and springs
// back. Drag one sideways and
// the time runs with it. Let go and it carries on the way a scrolled list does on an
// iPhone, slowing down over half a second or so, and comes to rest on a whole step
// (an hour, a minute; a single tick if it was let go slowly). The landing is worked
// out on release from that deceleration, and a spring with no bounce carries the
// ruler there from the finger's speed.
//
// Everything that moves runs on the UI thread: the drag, the glide, and the ticks,
// which are a small pool of slots re-labelled as the ruler turns. Only the value
// under the mark comes back to JS, once per tick.

type Ruler = {
  count: number; // ticks on the ruler (0 to count - 1)
  gap: number; // px between ticks
  fling: number; // a flung ruler lands on a multiple of this many ticks
  major: (t: number) => number; // 0 minor, 1 medium, 2 long
  label: (t: number) => string; // '' for none
};

const HOURS: Ruler = {
  count: 24,
  gap: 20,
  fling: 1,
  major: (t) => {
    'worklet';
    return t % 6 === 0 ? 2 : 1;
  },
  label: (t) => {
    'worklet';
    return `${t}`;
  },
};

const MIN_SEC: Ruler = {
  count: 240,
  gap: 8,
  fling: 4,
  major: (t) => {
    'worklet';
    return t % 20 === 0 ? 2 : t % 4 === 0 ? 1 : 0;
  },
  label: (t) => {
    'worklet';
    return t % 20 === 0 ? `${t / 4}` : '';
  },
};

const ROW = 46;
// An iPhone list slows by this factor every millisecond after a flick, so it travels
// v·k/(1-k) further (≈ half a second's worth of its speed) before it stops.
const DECELERATION = 0.998;
const GLIDE = DECELERATION / (1 - DECELERATION) / 1000;
const SLOW = 220; // px/s: slower than this, it lands on the nearest single tick
const DETENT = 0.45; // how strongly a dragged ruler catches on each step (0 none, under 1)

const clampTick = (v: number, n: number) => {
  'worklet';
  return Math.min(n - 1, Math.max(0, v));
};

// The phone's own clicks; in a browser, a short vibration where there is one.
function buzz(strength: 1 | 2) {
  if (Platform.OS === 'web') {
    globalThis.navigator?.vibrate?.(strength === 2 ? 18 : 8);
    return;
  }
  Haptics.impactAsync(strength === 2 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

function Slot({ j, ruler, offset, half, ink, inkSoft }: { j: number; ruler: Ruler; offset: SharedValue<number>; half: number; ink: string; inkSoft: string }) {
  // The tick this slot shows right now, and where it sits from the mark.
  const tickStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / ruler.gap;
    const base = Math.round(idx);
    const x = (j - (idx - base)) * ruler.gap;
    const t = base + j;
    const m = ruler.major(t);
    const d = Math.min(1, Math.abs(x) / half);
    const on = t >= 0 && t < ruler.count ? 1 : 0;
    return {
      transform: [{ translateX: x }],
      // Darkest and tallest at the mark, falling away toward the ends of the window.
      opacity: on * (1 - d * d) * (m === 0 ? 0.6 : 1),
      height: (m === 2 ? 20 : m === 1 ? 14 : 8) * (1 - 0.3 * d),
    };
  });
  const labelStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / ruler.gap;
    const x = (j - (idx - Math.round(idx))) * ruler.gap;
    const d = Math.min(1, Math.abs(x) / half);
    return { transform: [{ translateX: x - 20 }], opacity: 1 - d * d };
  });
  const labelProps = useAnimatedProps(() => {
    const t = Math.round(-offset.get() / ruler.gap) + j;
    const text = t >= 0 && t < ruler.count ? ruler.label(t) : '';
    return { text, defaultValue: text } as object;
  });
  return (
    <>
      <Animated.View style={[styles.tick, { backgroundColor: ink }, tickStyle]} />
      <AnimatedInput
        editable={false}
        pointerEvents="none"
        underlineColorAndroid="transparent"
        style={[styles.label, { color: inkSoft }, labelStyle]}
        animatedProps={labelProps}
      />
    </>
  );
}

// The ruler's gesture, built once (a rebuilt gesture would drop a drag in progress)
// and calling whatever handlers were set last.
function makeRulerGesture(ruler: Ruler, offset: SharedValue<number>, busy: SharedValue<boolean>, grab: SharedValue<number>) {
  const h = { commit: (_v: number) => {}, rest: () => {} };
  // What the ruler was last sent to, so an outside change (a reset) can be told from
  // its own landing.
  let landing: number | null = null;
  const commit = (v: number) => h.commit(v);
  const rest = () => h.rest();
  const start = { x: 0 };
  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      busy.set(true);
      grab.set(grab.get() + 1);
      start.x = offset.get();
    })
    .onUpdate((e) => {
      // Each step (an hour, a minute) has a slight catch: the ruler lingers over the
      // step's long tick and hurries between, so the finger feels them go by.
      const step = ruler.fling * ruler.gap;
      const catchAt = (px: number) => px - (DETENT * step * Math.sin((2 * Math.PI * px) / step)) / (2 * Math.PI);
      let v = start.x + catchAt(start.x + e.translationX) - catchAt(start.x);
      // Past either end the ruler gives a little, with resistance.
      const lo = -(ruler.count - 1) * ruler.gap;
      if (v > 0) v *= 0.3;
      if (v < lo) v = lo + (v - lo) * 0.3;
      offset.set(v);
    })
    .onEnd((e) => {
      const v = e.velocityX;
      const unit = Math.abs(v) > SLOW ? ruler.fling : 1;
      const target = clampTick(Math.round(-(offset.get() + v * GLIDE) / ruler.gap / unit) * unit, ruler.count);
      // The landing is known now, so the timer takes it at once (a tap mid-glide starts
      // it at that length); the ruler only has to get there.
      runOnJS(commit)(target);
      const mine = grab.get();
      // Critically damped: it glides in and stops, without bouncing back.
      offset.set(
        withSpring(-target * ruler.gap, { velocity: v, stiffness: 90, damping: 19, mass: 1, overshootClamping: true }, () => {
          // Caught again on the way: the new drag owns the ruler now.
          if (grab.get() !== mine) return;
          busy.set(false);
          runOnJS(rest)();
        })
      );
    })
    .onFinalize((_e, ok) => {
      // A touch that never moved: nothing to settle.
      if (!ok) busy.set(false);
    });
  return {
    gesture: pan,
    set(next: typeof h) {
      Object.assign(h, next);
    },
    landed(v: number) {
      landing = v;
    },
    // Follow an outside change (a reset): glide back to it, even mid-glide.
    follow(v: number) {
      if (landing === null || v === landing) {
        landing = v;
        return;
      }
      landing = v;
      grab.set(grab.get() + 1);
      busy.set(false);
      h.rest();
      offset.set(withSpring(-v * ruler.gap, { stiffness: 120, damping: 22, overshootClamping: true }));
    },
  };
}

type RulerProps = {
  ruler: Ruler;
  value: number; // tick index
  width: number;
  ink: string;
  inkSoft: string;
  onPreview: (v: number | null) => void;
  onChange: (v: number) => void;
};

function RulerView({ ruler, value, width, ink, inkSoft, onPreview, onChange }: RulerProps) {
  const offset = useSharedValue(-value * ruler.gap);
  const busy = useSharedValue(false);
  const grab = useSharedValue(0);
  const [g] = useState(() => makeRulerGesture(ruler, offset, busy, grab));
  useEffect(() =>
    g.set({
      commit: (v) => {
        g.landed(v);
        onChange(v);
      },
      rest: () => onPreview(null),
    })
  );
  useEffect(() => g.follow(value), [g, value]);

  // A buzz for every step that passes the mark (each hour, each minute), a firmer one
  // every fifth minute, and the mark gives a little nod with it.
  const nod = useSharedValue(0);
  const tick = (v: number, click: 0 | 1 | 2) => {
    onPreview(v);
    if (click) buzz(click);
  };
  useAnimatedReaction(
    () => Math.round(-offset.get() / ruler.gap),
    (cur, prev) => {
      if (prev === null || cur === prev || !busy.get()) return;
      const at = clampTick(cur, ruler.count);
      const step = Math.floor(cur / ruler.fling) !== Math.floor(prev / ruler.fling) && cur >= 0 && cur < ruler.count;
      if (step) nod.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 160 })));
      runOnJS(tick)(at, step ? (ruler.major(at) === 2 ? 2 : 1) : 0);
    }
  );
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + 0.25 * nod.get() }, { scaleX: 1 + 0.4 * nod.get() }] }));

  const half = width / 2;
  const n = Math.ceil(half / ruler.gap) + 2;
  const slots = [];
  for (let j = -n; j <= n; j++) slots.push(<Slot key={j} j={j} ruler={ruler} offset={offset} half={half} ink={ink} inkSoft={inkSoft} />);
  return (
    <GestureDetector gesture={g.gesture}>
      <View style={[styles.row, { width }]}>
        <View style={[styles.centre, { left: half }]}>{slots}</View>
        <Animated.View pointerEvents="none" style={[styles.mark, { left: half - 1.25 }, markStyle]} />
      </View>
    </GestureDetector>
  );
}

type Props = {
  /** Timer length in seconds. */
  seconds: number;
  width: number;
  tone: 'dark' | 'light';
  ink: string;
  inkSoft: string;
  /** While a ruler is turning: the length it shows, in seconds. */
  onPreview: (seconds: number | null) => void;
  /** Once it has settled. */
  onChange: (seconds: number) => void;
};

/** The timer's rulers: hours above, minutes and seconds below. */
export function TimeScrubber({ seconds, width, tone, ink, inkSoft, onPreview, onChange }: Props) {
  const h = Math.floor(seconds / 3600) % 24;
  const q = Math.round((seconds % 3600) / 15) % 240;
  const total = (hh: number, qq: number) => hh * 3600 + qq * 15;
  const dark = tone === 'dark';
  const inner = width - 52;
  return (
    <View style={[styles.panel, { width }]} accessibilityRole="adjustable" accessibilityLabel="タイマーの時間">
      <BlurView intensity={dark ? 30 : 50} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.55)' }]} />
      {[0, 1].map((r) => (
        <View key={r} style={styles.line}>
          <Text style={[styles.caption, { color: inkSoft }]}>{r === 0 ? '時間' : '分'}</Text>
          {r === 0 ? (
            <RulerView
              ruler={HOURS}
              value={h}
              width={inner}
              ink={ink}
              inkSoft={inkSoft}
              onPreview={(v) => onPreview(v == null ? null : total(v, q))}
              onChange={(v) => onChange(total(v, q))}
            />
          ) : (
            <RulerView
              ruler={MIN_SEC}
              value={q}
              width={inner}
              ink={ink}
              inkSoft={inkSoft}
              onPreview={(v) => onPreview(v == null ? null : total(h, v))}
              onChange={(v) => onChange(total(h, v))}
            />
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 18,
    overflow: 'hidden',
    paddingVertical: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caption: {
    width: 44,
    paddingLeft: 12,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
  },
  row: {
    height: ROW,
  },
  centre: {
    position: 'absolute',
    top: 4,
    width: 0,
    height: ROW - 4,
  },
  tick: {
    position: 'absolute',
    left: -1,
    top: 0,
    width: 2,
    borderRadius: 1,
  },
  label: {
    position: 'absolute',
    left: 0,
    top: 22,
    width: 40,
    height: 16,
    padding: 0,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  mark: {
    position: 'absolute',
    top: 2,
    width: 2.5,
    height: 26,
    borderRadius: 1.25,
    backgroundColor: '#e5484d',
  },
});
