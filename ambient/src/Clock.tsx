import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { clockFont } from './fonts';
import type { Settings } from './settings';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Re-renders on every second boundary. */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = new Date();
      setNow(d);
      t = setTimeout(tick, 1000 - d.getMilliseconds() + 5);
    };
    t = setTimeout(tick, 1000 - new Date().getMilliseconds() + 5);
    return () => clearTimeout(t);
  }, []);
  return now;
}

type Props = {
  clock: Settings['clock'];
  /** Light text over dark scenes, dark text over light ones. */
  tone: 'dark' | 'light';
};

/** The centre clock. It never takes touches; long-press anywhere toggles it. */
export function Clock({ clock, tone }: Props) {
  const now = useNow();
  const { width } = useWindowDimensions();
  const [shown] = useState(() => new Animated.Value(clock.visible ? 1 : 0));

  useEffect(() => {
    Animated.spring(shown, {
      toValue: clock.visible ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: clock.visible ? 6 : 0,
    }).start();
  }, [clock.visible, shown]);

  const font = clockFont(clock.font);
  // Scale with the screen, but stop growing on tablets.
  const scale = Math.min(width / 390, 1.6);
  const size = (font.time.fontSize ?? 96) * scale;
  const h = now.getHours();
  const hours = clock.hour24 ? String(h) : String(h % 12 || 12);
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const date = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}曜日`;

  const ink = tone === 'dark' ? '#ffffff' : '#111114';
  const inkSoft = tone === 'dark' ? 'rgba(255,255,255,0.72)' : 'rgba(17,17,20,0.62)';
  // A soft halo of the background colour keeps digits legible over busy scenes.
  const halo = tone === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.75)';

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View
        style={[
          styles.block,
          {
            opacity: shown,
            transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}
      >
        {clock.date && (
          <Text style={[styles.date, { color: inkSoft, textShadowColor: halo }]} numberOfLines={1}>
            {date}
          </Text>
        )}
        <View style={styles.row}>
          <Text
            style={[
              font.time,
              styles.time,
              { fontSize: size, lineHeight: size * 1.08, color: ink, textShadowColor: halo, letterSpacing: (font.time.letterSpacing ?? 0) * scale },
            ]}
            numberOfLines={1}
          >
            {hours}:{minutes}
          </Text>
          {clock.seconds && (
            <Text
              style={[
                font.time,
                styles.time,
                {
                  fontSize: size * font.secondsScale,
                  lineHeight: size * font.secondsScale * 1.1,
                  color: inkSoft,
                  textShadowColor: halo,
                  letterSpacing: 0,
                  marginLeft: size * 0.06,
                  marginBottom: size * 0.16,
                },
              ]}
            >
              {seconds}
            </Text>
          )}
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
