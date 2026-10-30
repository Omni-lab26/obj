import { useEffect, useLayoutEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { clockFont } from './fonts';
import type { Settings } from './settings';
import { TimeScrubber } from './TimeScrubber';
import { formatFixed, stopwatchElapsed, timerDone, timerLeft, timerRunning } from './timers';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Current time in ms: on every second boundary, or ten times a second when fast. */
function useNow(fast: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const step = fast ? 100 : 1000;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = Date.now();
      setNow(d);
      t = setTimeout(tick, step - (d % step) + 5);
    };
    t = setTimeout(tick, step - (Date.now() % step) + 5);
    return () => clearTimeout(t);
  }, [fast]);
  return now;
}

type Props = {
  clock: Settings['clock'];
  mode: Settings['mode'];
  timer: Settings['timer'];
  stopwatch: Settings['stopwatch'];
  /** Light text over dark scenes, dark text over light ones. */
  tone: 'dark' | 'light';
  /** How long the colours take to follow a tone change (the scene crossfade). */
  fadeMs?: number;
  /** Timer and stopwatch: tap the digits to start or pause, hold to reset. */
  onToggle: () => void;
  onReset: () => void;
  /** Timer: a new length set on the ruler. */
  onSetDuration: (ms: number) => void;
  /** A sideways swipe across the digits: the next or previous mode. */
  onMode: (mode: Settings['mode']) => void;
  /** Clock mode: a tap on the digits (the controls show), a hold (hide the clock). */
  onTouch: () => void;
  onHide: () => void;
};

const MODES: Settings['mode'][] = ['clock', 'timer', 'stopwatch'];
const MODE_NAMES = { clock: '時計', timer: 'タイマー', stopwatch: 'ストップウォッチ' } as const;

// The digits' gestures, built once (the face re-renders ten times a second while
// counting, and a rebuilt gesture would drop a hold in progress); they call whatever
// handlers were set last. A sideways swipe moves the modes like pages on an iPhone:
// the face follows the finger one to one with the next mode coming in beside it, and
// on release it either carries on to that page or settles back, on a spring with no
// bounce. A hold and a tap race the swipe; whichever is recognised first wins.
function makeFaceGesture(swipeX: SharedValue<number>, span: SharedValue<number>) {
  const h = { step: (_dir: number) => {}, hold: () => {}, tap: () => {} };
  const step = (dir: number) => h.step(dir);
  const settle = { stiffness: 340, damping: 37, mass: 1, overshootClamping: true };
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      swipeX.set(e.translationX);
    })
    .onEnd((e) => {
      const w = span.get();
      // Where a flick would carry it, as a page view decides.
      const ahead = e.translationX + e.velocityX * 0.15;
      if (Math.abs(ahead) < w * 0.5 && Math.abs(e.velocityX) < 500) {
        swipeX.set(withSpring(0, { ...settle, velocity: e.velocityX }));
        return;
      }
      const dir = ahead < 0 ? 1 : -1;
      swipeX.set(
        withSpring(-dir * w, { ...settle, velocity: e.velocityX }, (done) => {
          if (done) runOnJS(step)(dir);
        })
      );
    });
  const hold = Gesture.LongPress()
    .minDuration(500)
    .runOnJS(true)
    .onStart(() => h.hold());
  const tap = Gesture.Tap()
    .maxDuration(450)
    .runOnJS(true)
    .onEnd((_e, ok) => {
      if (ok) h.tap();
    });
  return {
    gesture: Gesture.Race(pan, hold, tap),
    set(next: typeof h) {
      Object.assign(h, next);
    },
  };
}

const FACES = {
  // A soft halo of the background colour keeps digits legible over busy scenes.
  dark: { ink: '#ffffff', inkSoft: 'rgba(255,255,255,0.85)', halo: 'rgba(0,0,0,0.7)' },
  light: { ink: '#0b0b0e', inkSoft: 'rgba(11,11,14,0.78)', halo: 'rgba(255,255,255,0.95)' },
};

type Face = { label: string; main: string; small: string; hint: string; dim: boolean };

/** What the centre shows right now, in any of the three modes. */
function faceFor(p: Props, now: number, preview: number | null): Face {
  if (p.mode === 'stopwatch') {
    const e = stopwatchElapsed(p.stopwatch, now);
    const running = p.stopwatch.startAt != null;
    return {
      label: '',
      main: formatFixed(e),
      small: `.${Math.floor((e % 1000) / 100)}`,
      hint: running ? '' : e > 0 ? 'タップで再開・長押しでリセット' : 'タップで開始',
      dim: false,
    };
  }
  if (p.mode === 'timer') {
    // While a ruler turns, the digits follow it (but never over a running count).
    if (preview != null && !timerRunning(p.timer) && !timerDone(p.timer)) {
      return { label: '', main: formatFixed(preview * 1000), small: '', hint: '', dim: false };
    }
    const left = timerLeft(p.timer, now);
    if (timerDone(p.timer)) {
      return { label: '時間です', main: formatFixed(0), small: '', hint: 'タップで閉じる・長押しでリセット', dim: Math.floor(now / 500) % 2 === 1 };
    }
    const running = timerRunning(p.timer);
    return {
      label: '',
      // Count down in whole seconds that change when a full second has passed.
      main: formatFixed(left + 999),
      small: '',
      hint: running
        ? ''
        : p.timer.duration <= 0
          ? '目盛りで時間を合わせて、数字をタップで開始'
          : left < p.timer.duration
            ? 'タップで再開・長押しでリセット'
            : 'タップで開始・長押しでリセット',
      dim: false,
    };
  }
  const d = new Date(now);
  const h = d.getHours();
  return {
    label: p.clock.date ? `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}曜日` : '',
    main: `${p.clock.hour24 ? h : h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`,
    small: p.clock.seconds ? String(d.getSeconds()).padStart(2, '0') : '',
    hint: '',
    dim: false,
  };
}

/** The centre clock, timer or stopwatch. Long-press anywhere else toggles it. */
export function Clock(props: Props) {
  const { clock, mode, timer, stopwatch, tone, fadeMs = 520, onToggle, onReset, onSetDuration, onMode, onTouch, onHide } = props;
  // The length on the rulers while one is being dragged or gliding (seconds).
  const [preview, setPreview] = useState<number | null>(null);
  const fast = (mode === 'stopwatch' && stopwatch.startAt != null) || (mode === 'timer' && (timerRunning(timer) || timerDone(timer)));
  const now = useNow(fast);
  const { width, height } = useWindowDimensions();
  const [shown] = useState(() => new Animated.Value(clock.visible ? 1 : 0));
  // 0 = colours for a dark scene, 1 = for a light one. Both faces are drawn and
  // crossfaded with the scene, so neither the digits nor their halo flash in the
  // wrong colour over the outgoing background.
  const [toneMix] = useState(() => new Animated.Value(tone === 'light' ? 1 : 0));
  // The modes sit side by side like pages; swipeX is how far the row is pulled.
  const swipeX = useSharedValue(0);
  const span = useSharedValue(width);
  useEffect(() => span.set(width), [span, width]);
  // A hold resets the timer or stopwatch (or hides the clock); a tap starts, pauses
  // or shows the controls (see makeFaceGesture).
  const interactive = mode !== 'clock';
  const [faceGesture] = useState(() => makeFaceGesture(swipeX, span));
  useEffect(() =>
    faceGesture.set({
      step: (dir) => onMode(MODES[(MODES.indexOf(mode) + dir + MODES.length) % MODES.length]),
      hold: interactive ? onReset : onHide,
      tap: interactive ? onToggle : onTouch,
    })
  );
  // The new page is now the middle one: the row snaps back under it in the same frame.
  useLayoutEffect(() => {
    swipeX.set(0);
  }, [mode, swipeX]);
  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: swipeX.get() }] }));
  const setting = mode === 'timer' && !timerRunning(timer) && !timerDone(timer);
  const showWheels = useSharedValue(setting ? 1 : 0);
  useEffect(() => showWheels.set(withTiming(setting ? 1 : 0, { duration: 220 })), [setting, showWheels]);
  const wheelsStyle = useAnimatedStyle(() => ({
    opacity: showWheels.get() * interpolate(Math.abs(swipeX.get()), [0, span.get() * 0.4], [1, 0], 'clamp'),
  }));
  // Digit width per point of font size, measured once per font: every digit takes it,
  // so a running count never shifts sideways.
  const [digitPerPt, setDigitPerPt] = useState(0);
  // The mode's name shows above the digits for a moment after a change, then fades
  // away (the line keeps its place, so the digits never jump).
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const [lastMode, setLastMode] = useState(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setFlash(MODE_NAMES[mode]);
  }
  useEffect(() => {
    if (!flash) return;
    flashOpacity.setValue(1);
    const anim = Animated.sequence([
      Animated.delay(1800),
      Animated.timing(flashOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setFlash(null));
    return () => anim.stop();
  }, [flash, flashOpacity]);

  useEffect(() => {
    Animated.spring(shown, {
      toValue: clock.visible ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: clock.visible ? 6 : 0,
    }).start();
  }, [clock.visible, shown]);

  useEffect(() => {
    Animated.timing(toneMix, {
      toValue: tone === 'light' ? 1 : 0,
      duration: fadeMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [tone, toneMix, fadeMs]);

  const font = clockFont(clock.font);
  // Scale with the screen (lying down, the height decides), but stop growing on
  // tablets. Each mode has one fixed size for its longest reading, so the digits never
  // grow or shrink as the count goes on.
  const room = Math.min(width / 390, height / 640, 1.6);
  const sizeFor = (m: Settings['mode']) => {
    const longest = m === 'clock' ? 5 + (clock.seconds ? 1.1 : 0) : m === 'timer' ? 8 : 9.1;
    return (font.time.fontSize ?? 96) * room * Math.min(1, 5 / longest);
  };

  const face = (m: Settings['mode'], f: Face, c: (typeof FACES)['dark'], label: string, labelOpacity: Animated.Value | number) => {
    const size = sizeFor(m);
    const cell = digitPerPt * size;
    return (
      <>
        <Animated.Text style={[styles.date, { color: c.inkSoft, textShadowColor: c.halo, opacity: labelOpacity }]} numberOfLines={1}>
          {label || '\u00a0'}
        </Animated.Text>
        <View style={[styles.row, { height: size * 1.08, opacity: f.dim ? 0.3 : 1 }]}>
          {[...f.main].map((ch, i) => {
            const digit = ch >= '0' && ch <= '9';
            return (
              <View key={i} style={digit && cell ? { width: cell, alignItems: 'center' } : null}>
                <Text style={[font.time, styles.time, { fontSize: size, lineHeight: size * 1.08, color: c.ink, textShadowColor: c.halo, letterSpacing: 0 }]}>
                  {ch}
                </Text>
              </View>
            );
          })}
          {f.small ? (
            <Text
              style={[
                font.time,
                styles.time,
                {
                  fontSize: size * font.secondsScale,
                  lineHeight: size * font.secondsScale * 1.1,
                  color: c.inkSoft,
                  textShadowColor: c.halo,
                  letterSpacing: 0,
                  marginLeft: size * 0.06,
                  marginBottom: size * 0.16,
                },
              ]}
            >
              {f.small}
            </Text>
          ) : null}
        </View>
        {/* The hint's line stays even when empty, so the digits never move. */}
        <Text style={[styles.hint, { color: c.inkSoft, textShadowColor: c.halo }]} numberOfLines={1}>
          {f.hint || '\u00a0'}
        </Text>
      </>
    );
  };

  // One page per mode: this one, and its neighbours either side (round and round).
  const page = (m: Settings['mode']) => {
    const current = m === mode;
    const f = faceFor({ ...props, mode: m }, now, m === 'timer' ? preview : null);
    const label = current ? (flash ?? f.label) : f.label;
    const labelOpacity = current && flash ? flashOpacity : 1;
    return (
      <>
        <Animated.View style={[styles.face, { opacity: toneMix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          {face(m, f, FACES.dark, label, labelOpacity)}
        </Animated.View>
        <Animated.View style={[styles.face, styles.faceOver, { opacity: toneMix }]}>{face(m, f, FACES.light, label, labelOpacity)}</Animated.View>
      </>
    );
  };
  const i = MODES.indexOf(mode);
  const prev = MODES[(i + MODES.length - 1) % MODES.length];
  const next = MODES[(i + 1) % MODES.length];
  const current = faceFor(props, now, preview);

  return (
    <View pointerEvents={clock.visible ? 'box-none' : 'none'} style={styles.layer}>
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.block,
          {
            opacity: shown,
            transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}
      >
        {/* A zero at 100 pt, measured once per font, gives every digit's width. */}
        <Text
          style={[font.time, styles.time, styles.measure, { fontSize: 100, lineHeight: 108, letterSpacing: 0 }]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width / 100;
            if (Math.abs(w - digitPerPt) > 0.001) setDigitPerPt(w);
          }}
        >
          0
        </Text>
        <View style={[styles.stage, { width }]}>
          <GestureDetector gesture={faceGesture.gesture}>
            <Reanimated.View
              style={[styles.pages, { width }, rowStyle]}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${MODE_NAMES[mode]} ${current.main}`}
              accessibilityHint="左右にスワイプで時計・タイマー・ストップウォッチを切り替え"
            >
              <View style={[styles.side, { left: -width, width }]}>{page(prev)}</View>
              <View style={styles.page}>{page(mode)}</View>
              <View style={[styles.side, { left: width, width }]}>{page(next)}</View>
            </Reanimated.View>
          </GestureDetector>
          {/* The timer's rulers stand outside the face's layout, so the digits never
              move when they come and go. They stay mounted, just hidden, while the
              timer runs or another mode shows, and fade as the page is pulled away. */}
          <Reanimated.View pointerEvents={setting ? 'box-none' : 'none'} style={[styles.wheels, wheelsStyle]}>
            <TimeScrubber
              seconds={Math.max(0, Math.round(timer.duration / 1000))}
              width={Math.min(width * 0.88, 380)}
              tone={tone}
              ink={FACES[tone].ink}
              inkSoft={FACES[tone].inkSoft}
              onPreview={setPreview}
              onChange={(sec) => onSetDuration(sec * 1000)}
            />
          </Reanimated.View>
        </View>
      </Animated.View>
    </View>
  );
}

/** A small pill that confirms a long-press toggle, then fades away. */
export function Toast({ toast, tone }: { toast: { text: string; id: number } | null; tone: 'dark' | 'light' }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const text = toast?.text ?? '';

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [toast, opacity]);

  const dark = tone === 'dark';
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity }]}>
      <View style={[styles.toast, { backgroundColor: dark ? 'rgba(40,40,44,0.86)' : 'rgba(255,255,255,0.92)' }]}>
        <Text style={[styles.toastText, { color: dark ? '#fff' : '#111114' }]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    // (No text selection when dragging with a mouse on the web.)
    userSelect: 'none',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '8%',
  },
  block: {
    alignItems: 'center',
  },
  face: {
    alignItems: 'center',
  },
  // The whole width of the swipe area answers taps and holds, not just the digits.
  stage: {
    alignItems: 'center',
  },
  pages: {
    alignItems: 'center',
  },
  page: {
    alignItems: 'center',
  },
  side: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
  },
  wheels: {
    position: 'absolute',
    top: '100%',
    marginTop: 10,
    alignItems: 'center',
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
  },
  faceOver: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  time: {
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
    includeFontPadding: false,
  },
  date: {
    fontSize: 17,
    // (A fixed line, so a Japanese label and an empty one take the same height.)
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  toastWrap: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0,
  },
});
