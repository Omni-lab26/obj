import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  makeMutable,
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { FaceBackdrop } from './FaceBackdrop';
import { useT } from './settings';

// Two rulers under fixed red marks: hours above (0-23), minutes and seconds below (an
// hour in 15-second ticks), turning like the wheels of the iPhone's own timer. Drag
// one sideways and it stays under the finger, a light click for each step (an hour,
// a minute) that passes the mark. Let go and it carries on with the iPhone's own
// deceleration and comes to rest exactly on a whole step (a single tick if it was let
// go slowly): the landing is worked out on release, and the release speed nudged just
// enough that the same slowing-down ends there, with no spring and no bounce. Each
// has two ends, where it gives a little and eases back. The ticks are drawn round a
// drum: evenly spaced under the mark, closer together and fainter toward the ends.
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
// The caption beside each ruler ("時間", "Hours"): wide enough for the English on one line.
const CAPTION_W = 52;
// An iPhone list slows by this factor every millisecond after a flick, so it travels
// v·k/(1-k) further (≈ half a second's worth of its speed) before it stops.
const DECELERATION = 0.998;
const GLIDE = DECELERATION / (1 - DECELERATION) / 1000;
const SLOW = 220; // px/s: slower than this, it lands on the nearest single tick
// The drum: a tick x px from the mark (along the ruler) is drawn at half·sin(x·a/half)/a,
// so it moves with the finger under the mark and bunches up toward the ends.
const DRUM = 1;

const clampTick = (v: number, n: number) => {
  'worklet';
  return Math.min(n - 1, Math.max(0, v));
};

// The phone's own selection click (what its pickers give for each row); in a browser,
// a short vibration where there is one.
function click() {
  if (Platform.OS === 'web') {
    globalThis.navigator?.vibrate?.(6);
    return;
  }
  Haptics.selectionAsync().catch(() => {});
}

// Where a tick x px along the ruler from the mark is drawn, and how much it faces us.
const drum = (x: number, half: number) => {
  'worklet';
  const th = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, (x * DRUM) / half));
  return { x: (half * Math.sin(th)) / DRUM, face: Math.cos(th) };
};

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

function Slot({ j, ruler, offset, half, ink, inkSoft }: { j: number; ruler: Ruler; offset: SharedValue<number>; half: number; ink: string; inkSoft: string }) {
  // The tick this slot shows right now, and where it sits from the mark.
  const tickStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / ruler.gap;
    const base = Math.round(idx);
    const x = (j - (idx - base)) * ruler.gap;
    const t = base + j;
    const m = ruler.major(t);
    const p = drum(x, half);
    const on = t >= 0 && t < ruler.count ? 1 : 0;
    return {
      transform: [{ translateX: p.x }],
      // Darkest and tallest at the mark, turning away round the drum toward the ends.
      opacity: on * p.face * p.face * (m === 0 ? 0.6 : 1),
      height: (m === 2 ? 20 : m === 1 ? 14 : 8) * (0.7 + 0.3 * p.face),
    };
  });
  const labelStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / ruler.gap;
    const x = (j - (idx - Math.round(idx))) * ruler.gap;
    const p = drum(x, half);
    return { transform: [{ translateX: p.x - 20 }, { scaleX: 0.4 + 0.6 * p.face }], opacity: p.face * p.face };
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
  // Where the drag began. A shared value, not a plain object: each gesture callback
  // runs on the UI thread with its own copy of what it captured, so a plain object
  // set in onBegin would still read 0 in onUpdate.
  const start = makeMutable(0);
  const pan = Gesture.Pan()
    .minDistance(2)
    .onBegin(() => {
      busy.set(true);
      grab.set(grab.get() + 1);
      start.set(offset.get());
    })
    .onUpdate((e) => {
      // Under the finger, one to one.
      let v = start.get() + e.translationX;
      // Past either end the ruler gives a little, with more resistance the further it
      // goes (as an iPhone list does).
      const lo = -(ruler.count - 1) * ruler.gap;
      const give = (d: number) => (d * 120) / (d + 120);
      if (v > 0) v = give(v);
      if (v < lo) v = lo - give(lo - v);
      offset.set(v);
    })
    .onEnd((e) => {
      const x0 = offset.get();
      const v = e.velocityX;
      const fast = Math.abs(v) > SLOW;
      const unit = fast ? ruler.fling : 1;
      const target = clampTick(Math.round(-(x0 + v * GLIDE) / ruler.gap / unit) * unit, ruler.count);
      const to = -target * ruler.gap;
      // The landing is known now, so the timer takes it at once (a tap mid-glide starts
      // it at that length); the ruler only has to get there.
      runOnJS(commit)(target);
      const mine = grab.get();
      const settled = () => {
        'worklet';
        // Caught again on the way: the new drag owns the ruler now.
        if (grab.get() !== mine) return;
        busy.set(false);
        runOnJS(rest)();
      };
      if (fast && (to - x0) * v > 0) {
        // The iPhone's own slowing-down, from a release speed nudged so that it comes to
        // rest right on the step; the last fraction of a pixel is closed at once.
        offset.set(
          withDecay({ velocity: (to - x0) / GLIDE, deceleration: DECELERATION, clamp: x0 < to ? [x0, to] : [to, x0] }, (finished) => {
            if (!finished || grab.get() !== mine) return;
            offset.set(withTiming(to, { duration: 80, easing: Easing.out(Easing.quad) }, settled));
          })
        );
      } else {
        // Let go slowly, or past an end: it eases onto the nearest step.
        offset.set(withTiming(to, { duration: 260, easing: Easing.out(Easing.cubic) }, settled));
      }
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
  /** Kept at the tick under the mark, fractions and all, on the UI thread. */
  position?: SharedValue<number>;
};

function RulerView({ ruler, value, width, ink, inkSoft, onPreview, onChange, position }: RulerProps) {
  const offset = useSharedValue(-value * ruler.gap);
  // Where the ruler is, as it moves (the timer's digits roll with it).
  useAnimatedReaction(
    () => -offset.get() / ruler.gap,
    (v) => position?.set(Math.min(ruler.count - 1, Math.max(0, v)))
  );
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

  // A click for every step that passes the mark (each hour, each minute), and the mark
  // gives a little nod with it.
  const nod = useSharedValue(0);
  const tick = (v: number, step: boolean) => {
    onPreview(v);
    if (step) click();
  };
  useAnimatedReaction(
    () => Math.round(-offset.get() / ruler.gap),
    (cur, prev) => {
      if (prev === null || cur === prev || !busy.get()) return;
      const at = clampTick(cur, ruler.count);
      const step = Math.floor(cur / ruler.fling) !== Math.floor(prev / ruler.fling) && cur >= 0 && cur < ruler.count;
      if (step) nod.set(withSequence(withTiming(1, { duration: 40 }), withTiming(0, { duration: 160 })));
      runOnJS(tick)(at, step);
    }
  );
  const markStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 + 0.25 * nod.get() }, { scaleX: 1 + 0.4 * nod.get() }] }));

  const half = width / 2;
  // (Enough slots to fill the drum to its ends, which reach further along the ruler.)
  const n = Math.ceil((half * Math.PI) / 2 / DRUM / ruler.gap) + 2;
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
  /** Shown under the rulers, on the same veil. */
  footer?: ReactNode;
  /** Where each ruler is as it moves, in ticks (hours; quarter minutes). */
  hoursAt?: SharedValue<number>;
  quartersAt?: SharedValue<number>;
};

/** The timer's rulers: hours above, minutes and seconds below. */
export function TimeScrubber({ seconds, width, tone, ink, inkSoft, onPreview, onChange, footer, hoursAt, quartersAt }: Props) {
  const h = Math.floor(seconds / 3600) % 24;
  const q = Math.round((seconds % 3600) / 15) % 240;
  const total = (hh: number, qq: number) => hh * 3600 + qq * 15;
  const inner = width - CAPTION_W - 8;
  const t = useT();
  return (
    <View style={[styles.panel, { width }]} accessibilityRole="adjustable" accessibilityLabel={t.timerLength}>
      {/* The same veil as behind the digits: a blur that melts into the scene, no card. */}
      <FaceBackdrop tone={tone} spread={{ x: 64, y: 56 }} />
      {[0, 1].map((r) => (
        <View key={r} style={styles.line}>
          <Text style={[styles.caption, { color: inkSoft }]} numberOfLines={1}>
            {r === 0 ? t.hours : t.minutes}
          </Text>
          {r === 0 ? (
            <RulerView
              ruler={HOURS}
              value={h}
              width={inner}
              ink={ink}
              inkSoft={inkSoft}
              onPreview={(v) => onPreview(v == null ? null : total(v, q))}
              onChange={(v) => onChange(total(v, q))}
              position={hoursAt}
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
              position={quartersAt}
            />
          )}
        </View>
      ))}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingVertical: 6,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  caption: {
    width: CAPTION_W,
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
