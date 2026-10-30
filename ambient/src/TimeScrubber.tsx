import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

// Two upright wheels of ticks under a fixed red mark: hours on the left (a day, round
// and round), minutes and seconds on the right (an hour in 15-second ticks, round and
// round). Drag one up or down and the time runs with it; fling it and it coasts and
// clicks into a whole step (an hour, a minute); let go slowly and it settles on the
// nearest tick. The landing is decided on release and one spring carries the wheel
// there from the finger's speed.
//
// Everything that moves runs on the UI thread: the drag, the spring, and the ticks,
// which are a small pool of slots re-labelled as the wheel turns. Only the value
// under the mark comes back to JS, once per tick.

type Wheel = {
  count: number; // ticks round the wheel
  gap: number; // px between ticks
  fling: number; // a flung wheel lands on a multiple of this many ticks
  major: (t: number) => number; // 0 minor, 1 medium, 2 long
  label: (t: number) => string; // '' for none
};

const HOURS: Wheel = {
  count: 24,
  gap: 22,
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

const MIN_SEC: Wheel = {
  count: 240,
  gap: 9,
  fling: 4,
  major: (t) => {
    'worklet';
    return t % 20 === 0 ? 2 : t % 4 === 0 ? 1 : 0;
  },
  label: (t) => {
    'worklet';
    return t % 4 === 0 ? `${t / 4}` : '';
  },
};

const HEIGHT = 168;
const WIDTH = 104;
const SLOTS = Math.ceil(HEIGHT / 2 / 9) + 2;
const COAST = 0.26; // s of the release speed carried into the landing
const SLOW = 260; // px/s: slower than this, it lands on the nearest single tick

const wrap = (v: number, n: number) => {
  'worklet';
  return ((v % n) + n) % n;
};

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

function Slot({ j, wheel, offset, ink, inkSoft }: { j: number; wheel: Wheel; offset: SharedValue<number>; ink: string; inkSoft: string }) {
  // The tick this slot shows right now, and where it sits from the mark.
  const tickStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / wheel.gap;
    const base = Math.round(idx);
    const y = (j - (idx - base)) * wheel.gap;
    const t = wrap(base + j, wheel.count);
    const m = wheel.major(t);
    const d = Math.min(1, Math.abs(y) / (HEIGHT / 2));
    return {
      transform: [{ translateY: y }],
      // Darkest and longest at the mark, falling away toward the ends of the window.
      opacity: (1 - d * d) * (m === 0 ? 0.55 : 1),
      width: (m === 2 ? 22 : m === 1 ? 15 : 9) * (1 - 0.35 * d),
    };
  });
  const labelStyle = useAnimatedStyle(() => {
    const idx = -offset.get() / wheel.gap;
    const base = Math.round(idx);
    const y = (j - (idx - base)) * wheel.gap;
    const d = Math.min(1, Math.abs(y) / (HEIGHT / 2));
    return { transform: [{ translateY: y - 9 }], opacity: 1 - d * d };
  });
  const labelProps = useAnimatedProps(() => {
    const base = Math.round(-offset.get() / wheel.gap);
    const text = wheel.label(wrap(base + j, wheel.count));
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

type WheelProps = {
  wheel: Wheel;
  value: number; // tick index
  ink: string;
  inkSoft: string;
  onPreview: (v: number | null) => void;
  onChange: (v: number) => void;
};

function WheelView({ wheel, value, ink, inkSoft, onPreview, onChange }: WheelProps) {
  const offset = useSharedValue(-value * wheel.gap);
  const start = useSharedValue(0);
  const busy = useSharedValue(false);

  // Follow outside changes (a reset) when idle, turning the short way round.
  useEffect(() => {
    if (busy.get()) return;
    const cur = -offset.get() / wheel.gap;
    const k = Math.round((cur - value) / wheel.count);
    offset.set(-(value + k * wheel.count) * wheel.gap);
  }, [value, wheel, offset, busy]);

  const tick = (v: number, click: boolean) => {
    onPreview(v);
    if (click && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };
  const settled = (v: number) => {
    onChange(v);
    onPreview(null);
  };

  useAnimatedReaction(
    () => Math.round(-offset.get() / wheel.gap),
    (cur, prev) => {
      if (prev === null || cur === prev || !busy.get()) return;
      const click = Math.floor(cur / wheel.fling) !== Math.floor(prev / wheel.fling);
      runOnJS(tick)(wrap(cur, wheel.count), click);
    }
  );

  const pan = usePanGesture({
    minDistance: 2,
    onBegin: () => {
      'worklet';
      busy.set(true);
      start.set(offset.get());
    },
    onUpdate: (e) => {
      'worklet';
      offset.set(start.get() + e.translationY);
    },
    onDeactivate: (e) => {
      'worklet';
      const v = e.velocityY;
      const raw = -(offset.get() + v * COAST) / wheel.gap;
      const unit = Math.abs(v) > SLOW ? wheel.fling : 1;
      const target = Math.round(raw / unit) * unit;
      offset.set(withSpring(-target * wheel.gap, { velocity: v, stiffness: 210, damping: 26, mass: 1 }, (done) => {
        if (!done) return;
        busy.set(false);
        runOnJS(settled)(wrap(target, wheel.count));
      }));
    },
    onFinalize: (e) => {
      'worklet';
      // A touch that never moved: nothing to settle.
      if (e.canceled) busy.set(false);
    },
  });

  const slots = [];
  for (let j = -SLOTS; j <= SLOTS; j++) slots.push(<Slot key={j} j={j} wheel={wheel} offset={offset} ink={ink} inkSoft={inkSoft} />);
  return (
    <GestureDetector gesture={pan}>
      <View style={styles.wheel}>
        <View style={styles.centre}>{slots}</View>
        <View pointerEvents="none" style={styles.mark} />
      </View>
    </GestureDetector>
  );
}

type Props = {
  /** Timer length in seconds. */
  seconds: number;
  tone: 'dark' | 'light';
  ink: string;
  inkSoft: string;
  /** While a wheel is turning: the length it shows, in seconds. */
  onPreview: (seconds: number | null) => void;
  /** Once it has settled. */
  onChange: (seconds: number) => void;
  /** Space between the two wheels (they can stand either side of the digits). */
  spread?: number;
};

/** The timer's wheels: hours on the left, minutes and seconds on the right. */
export function TimeScrubber({ seconds, tone, ink, inkSoft, onPreview, onChange, spread = 14 }: Props) {
  const h = Math.floor(seconds / 3600) % 24;
  const q = Math.round((seconds % 3600) / 15) % 240;
  // Never zero: the shortest timer is 15 seconds.
  const total = (hh: number, qq: number) => Math.max(15, hh * 3600 + qq * 15);
  const dark = tone === 'dark';
  return (
    <View pointerEvents="box-none" style={[styles.pair, { gap: spread }]} accessibilityRole="adjustable" accessibilityLabel="タイマーの時間">
      {[0, 1].map((side) => (
        <View key={side} style={styles.column}>
          <Text style={[styles.caption, { color: inkSoft }]}>{side === 0 ? '時間' : '分'}</Text>
          <View style={styles.panel}>
          <BlurView intensity={dark ? 30 : 50} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(0,0,0,0.32)' : 'rgba(255,255,255,0.55)' }]} />
          {side === 0 ? (
            <WheelView
              wheel={HOURS}
              value={h}
              ink={ink}
              inkSoft={inkSoft}
              onPreview={(v) => onPreview(v == null ? null : total(v, q))}
              onChange={(v) => onChange(total(v, q))}
            />
          ) : (
            <WheelView
              wheel={MIN_SEC}
              value={q}
              ink={ink}
              inkSoft={inkSoft}
              onPreview={(v) => onPreview(v == null ? null : total(h, v))}
              onChange={(v) => onChange(total(h, v))}
            />
          )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
  },
  column: {
    alignItems: 'center',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 4,
  },
  panel: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
  },
  wheel: {
    flex: 1,
  },
  centre: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: HEIGHT / 2,
    height: 0,
  },
  tick: {
    position: 'absolute',
    left: 18,
    top: -1,
    height: 2,
    borderRadius: 1,
  },
  label: {
    position: 'absolute',
    left: 46,
    top: 0,
    width: 44,
    height: 18,
    padding: 0,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  mark: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: HEIGHT / 2 - 1.25,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#e5484d',
  },
});
