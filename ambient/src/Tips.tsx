import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from './settings';

// The first time the app opens, speech bubbles point, one after another, at what
// matters: the digits (swipe between the clock, timer and stopwatch; tap and hold),
// the pen (move and resize the digits), settings, and the background switcher. A tap
// goes on to the next; "スキップ" puts them all away. Settings can bring them back.

type Props = {
  open: boolean;
  tone: 'dark' | 'light';
  /** Where the digits sit, as a share of the screen from their usual place. */
  face: { x: number; y: number };
  onClose: () => void;
};

export function Tips({ open, tone, face, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const words = useT();
  const STEPS = words.tips;
  const { width, height } = useWindowDimensions();
  const [shown] = useState(() => new Animated.Value(0));
  const [mounted, setMounted] = useState(open);
  const [step, setStep] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMounted(true);
      setStep(0);
    }
  }
  useEffect(() => {
    Animated.timing(shown, { toValue: open ? 1 : 0, duration: open ? 360 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(
      ({ finished }) => finished && !open && setMounted(false)
    );
  }, [open, shown]);
  // Each bubble comes in with a little rise.
  const [rise] = useState(() => new Animated.Value(0));
  useEffect(() => {
    rise.setValue(0);
    Animated.timing(rise, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, rise]);
  if (!mounted) return null;

  // Bubbles stand out from the scene: white over a dark one, near-black over a light one.
  const dark = tone === 'dark';
  const paper = dark ? '#ffffff' : '#141416';
  const ink = dark ? '#111114' : '#ffffff';
  const W = Math.min(260, width - 32);

  // What each bubble points at (as App lays the buttons out), and from which side.
  const barTop = Math.max(insets.top, 12) + 10;
  const dockTop = height - (Math.max(insets.bottom, 12) + 14) - 60 - 18;
  const digitsX = width / 2 + face.x * width;
  const digitsY = (height - 0.08 * width) / 2 + face.y * height;
  const roomAbove = digitsY - 70 - (barTop + 44);
  const targets = [
    // The digits: above them if there is room, else below.
    roomAbove > 120 ? { x: digitsX, y: digitsY - 70, point: 'down' as const } : { x: digitsX, y: digitsY + 70, point: 'up' as const },
    { x: Math.max(insets.left, 12) + 4 + 22, y: barTop + 44 + 10, point: 'up' as const },
    { x: width - (Math.max(insets.right, 12) + 4 + 22), y: barTop + 44 + 10, point: 'up' as const },
    { x: width / 2, y: dockTop - 10, point: 'down' as const },
  ];
  const t = targets[step];
  const left = Math.min(width - 16 - W, Math.max(16, t.x - W / 2));
  const place = t.point === 'up' ? { top: t.y } : { bottom: height - t.y };
  const last = step === STEPS.length - 1;
  const next = () => (last ? onClose() : setStep(step + 1));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: shown }]}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={next} accessibilityRole="button" accessibilityLabel={last ? words.tipsClose : words.tipsNextLabel} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.bubble,
          place,
          { left, width: W, backgroundColor: paper },
          { opacity: rise, transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [t.point === 'up' ? 6 : -6, 0] }) }] },
        ]}
      >
        <View style={[styles.nub, { left: t.x - left - 7, backgroundColor: paper }, t.point === 'up' ? styles.nubUp : styles.nubDown]} />
        <Text style={[styles.title, { color: ink }]}>{STEPS[step].title}</Text>
        <Text style={[styles.body, { color: ink }]}>{STEPS[step].body}</Text>
        <Text style={[styles.count, { color: ink }]}>
          {step + 1} / {STEPS.length}・{last ? words.tipsLast : words.tipsNext}
        </Text>
      </Animated.View>
      {last ? null : (
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={words.skipTips}
          // (Top middle, between the pen and settings: clear of every bubble.)
          style={({ pressed }) => [styles.skip, { top: barTop + 4, backgroundColor: paper, opacity: pressed ? 0.7 : 0.92 }]}
        >
          <Text style={[styles.skipText, { color: ink }]}>{words.skip}</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bubble: {
    position: 'absolute',
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  // The point: a small square turned on its corner, half behind the bubble.
  nub: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  nubUp: {
    top: -6,
  },
  nubDown: {
    bottom: -6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  body: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    letterSpacing: 0,
  },
  count: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    opacity: 0.55,
  },
  skip: {
    position: 'absolute',
    alignSelf: 'center',
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
  },
});
