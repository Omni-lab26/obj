import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { clockFont } from './fonts';
import type { Settings } from './settings';
import { durationLabel, formatDuration, stopwatchElapsed, timerDone, timerLeft, timerRunning } from './timers';

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
};

const FACES = {
  // A soft halo of the background colour keeps digits legible over busy scenes.
  dark: { ink: '#ffffff', inkSoft: 'rgba(255,255,255,0.72)', halo: 'rgba(0,0,0,0.45)' },
  light: { ink: '#111114', inkSoft: 'rgba(17,17,20,0.62)', halo: 'rgba(255,255,255,0.75)' },
};

type Face = { label: string; main: string; small: string; hint: string; dim: boolean };

/** What the centre shows right now, in any of the three modes. */
function faceFor(p: Props, now: number): Face {
  if (p.mode === 'stopwatch') {
    const e = stopwatchElapsed(p.stopwatch, now);
    const running = p.stopwatch.startAt != null;
    return {
      label: 'ストップウォッチ',
      main: formatDuration(e),
      small: e < 3_600_000 ? `.${Math.floor((e % 1000) / 100)}` : '',
      hint: running ? '' : e > 0 ? 'タップで再開・長押しでリセット' : 'タップで開始',
      dim: false,
    };
  }
  if (p.mode === 'timer') {
    const left = timerLeft(p.timer, now);
    if (timerDone(p.timer)) {
      return { label: '時間です', main: formatDuration(0), small: '', hint: 'タップで閉じる', dim: Math.floor(now / 500) % 2 === 1 };
    }
    const running = timerRunning(p.timer);
    return {
      label: `タイマー ${durationLabel(p.timer.duration)}`,
      // Count down in whole seconds that change when a full second has passed.
      main: formatDuration(left + 999),
      small: '',
      hint: running ? '' : left < p.timer.duration ? 'タップで再開・長押しでリセット' : 'タップで開始',
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
  const { clock, mode, timer, stopwatch, tone, fadeMs = 520, onToggle, onReset } = props;
  const fast = (mode === 'stopwatch' && stopwatch.startAt != null) || (mode === 'timer' && (timerRunning(timer) || timerDone(timer)));
  const now = useNow(fast);
  const { width } = useWindowDimensions();
  const [shown] = useState(() => new Animated.Value(clock.visible ? 1 : 0));
  // 0 = colours for a dark scene, 1 = for a light one. Both faces are drawn and
  // crossfaded with the scene, so neither the digits nor their halo flash in the
  // wrong colour over the outgoing background.
  const [toneMix] = useState(() => new Animated.Value(tone === 'light' ? 1 : 0));

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

  const f = faceFor(props, now);
  const font = clockFont(clock.font);
  // Scale with the screen, but stop growing on tablets; longer readings (seconds,
  // hours) get smaller digits so the line never turns long and thin.
  const fit = Math.min(1, 5 / (f.main.length + (f.small ? 1.1 : 0)));
  const scale = Math.min(width / 390, 1.6) * fit;
  const size = (font.time.fontSize ?? 96) * scale;
  const interactive = mode !== 'clock';

  const face = (c: (typeof FACES)['dark']) => (
    <>
      {f.label ? (
        <Text style={[styles.date, { color: c.inkSoft, textShadowColor: c.halo }]} numberOfLines={1}>
          {f.label}
        </Text>
      ) : null}
      <View style={[styles.row, { opacity: f.dim ? 0.3 : 1 }]}>
        <Text
          style={[
            font.time,
            styles.time,
            { fontSize: size, lineHeight: size * 1.08, color: c.ink, textShadowColor: c.halo, letterSpacing: (font.time.letterSpacing ?? 0) * scale },
          ]}
          numberOfLines={1}
        >
          {f.main}
        </Text>
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
      {f.hint ? (
        <Text style={[styles.hint, { color: c.inkSoft, textShadowColor: c.halo }]} numberOfLines={1}>
          {f.hint}
        </Text>
      ) : null}
    </>
  );

  return (
    <View pointerEvents={interactive && clock.visible ? 'box-none' : 'none'} style={styles.layer}>
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
        <Pressable
          disabled={!interactive}
          onPress={onToggle}
          onLongPress={onReset}
          delayLongPress={500}
          hitSlop={16}
          accessibilityRole={interactive ? 'button' : undefined}
          accessibilityLabel={interactive ? `${f.label} ${f.main}` : undefined}
        >
          <Animated.View style={[styles.face, { opacity: toneMix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
            {face(FACES.dark)}
          </Animated.View>
          <Animated.View style={[styles.face, styles.faceOver, { opacity: toneMix }]}>{face(FACES.light)}</Animated.View>
        </Pressable>
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
    textShadowRadius: 18,
    includeFontPadding: false,
  },
  date: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
    marginBottom: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  hint: {
    marginTop: 6,
    fontSize: 13,
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
