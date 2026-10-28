import { BlurView } from 'expo-blur';
import { ReactNode, useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../theme';
import { dismiss, M, move, present, timed } from './motion';

// Bottom sheet. openSheet(close => <Content/>) from anywhere; drag the grabber
// (or the top of the sheet) down to dismiss, or tap the scrim. A screen shown
// over everything (the timer) mounts its own host; the newest host opens it.
type Render = (close: () => void) => ReactNode;
/** corner: the centered pane's corner radius (26 unless said). */
type Opts = { grouped?: boolean; center?: boolean; corner?: number };
type Host = { open: (r: Render, o: Opts) => void; close: () => void };
const hosts: Host[] = [];
const top = () => hosts[hosts.length - 1];

/**
 * grouped: the sheet's ground is the page gray, for white grouped cards inside (like a calendar's new-event sheet).
 * center: not from the bottom but in the middle of the screen, a pane of frosted glass over the blurred page.
 */
export function openSheet(render: Render, opts?: Opts) {
  top()?.open(render, opts ?? {});
}
export function closeSheet() {
  top()?.close();
}

export function SheetHost() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [render, setRender] = useState<Render | null>(null);
  const [grouped, setGrouped] = useState(false);
  const [center, setCenter] = useState(false);
  const [corner, setCorner] = useState(26);
  const pop = useSharedValue(0); // the centered pane: 0 away, 1 here
  const H = Dimensions.get('window').height;
  const y = useSharedValue(H);
  const scrim = useSharedValue(0);
  const height = useSharedValue(H);

  const finish = () => setRender(null);
  const close = () => {
    y.set(withTiming(height.get() + 40, M.leave, (done) => { if (done) scheduleOnRN(finish); }));
    pop.set(dismiss(0));
    scrim.set(dismiss(0));
  };
  // pulled down and let go fast: it goes on at the finger's speed, and the host clears once it's out of sight
  const thrown = (vy: number) => {
    y.set(dismiss(height.get() + 40, vy));
    scrim.set(dismiss(0));
    setTimeout(finish, M.dismiss.duration * 1.5);
  };
  useEffect(() => {
    // close only moves shared values and clears this host, so the first one stays right
    const me: Host = { open: (r, o) => { setGrouped(!!o.grouped); setCenter(!!o.center); setCorner(o.corner ?? 26); setRender(() => r); }, close };
    hosts.push(me);
    return () => { hosts.splice(hosts.indexOf(me), 1); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (render) {
      y.set(H);
      y.set(present(0));
      pop.set(0);
      pop.set(present(1));
      scrim.set(timed(1, 330));
    }
  }, [render, H, y, scrim, pop]);

  // the grabber: the sheet follows the finger down on the UI thread, then goes or comes back keeping its speed
  const [pan] = useState(() => Gesture.Pan()
    .activeOffsetY(6)
    .failOffsetX([-12, 12])
    .onUpdate((e) => { y.value = Math.max(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationY > 110 || e.velocityY > 1100) scheduleOnRN(thrown, e.velocityY);
      else y.value = move(0, e.velocityY);
    }));

  const sa = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const ka = useAnimatedStyle(() => ({ opacity: scrim.value }));
  // the centered pane fades in from a touch smaller, settling without going past
  const pa = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.98 + pop.value * 0.02 }] }));
  if (!render) return null;
  if (center) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* the page behind, blurred and a little dimmed */}
        <Animated.View style={[StyleSheet.absoluteFill, ka]}>
          <BlurView intensity={Platform.OS === 'web' ? 18 : 28} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(30,33,40,0.18)' }]} />
          <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="閉じる" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none"
          style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12, paddingHorizontal: 12 }]}>
          <Animated.View accessibilityViewIsModal
            style={[{ width: '100%', maxWidth: 440, maxHeight: '100%', borderRadius: corner, overflow: 'hidden', boxShadow: '0px 0px 0px 0.5px rgba(255,255,255,0.7), 0px 24px 60px rgba(20,24,32,0.22)' }, pa]}>
            {/* frosted glass: the blurred page through a milky film */}
            <BlurView intensity={Platform.OS === 'web' ? 30 : 60} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.dark ? 'rgba(20,26,34,0.72)' : 'rgba(246,247,249,0.72)' }]} />
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ padding: 16 }}>
              {render(close)}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }, ka]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="閉じる" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%' }} pointerEvents="box-none">
        <Animated.View
          onLayout={(e) => { height.set(e.nativeEvent.layout.height); }}
          style={[{ backgroundColor: t.backdrop !== 'none' ? (t.dark ? 'rgba(16,22,30,0.62)' : 'rgba(246,247,249,0.66)') : grouped ? t.canvas : t.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, sa]}
          accessibilityViewIsModal>
          {t.backdrop !== 'none' ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', zIndex: -1 }]}>
              <BlurView intensity={Platform.OS === 'web' ? 40 : 70} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            </View>
          ) : null}
          <GestureDetector gesture={pan}>
            <View style={{ paddingTop: 8, paddingBottom: 6, alignItems: 'center' }}>
              <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: t.line2 }} />
            </View>
          </GestureDetector>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
            {render(close)}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
