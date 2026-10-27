import { BlurView } from 'expo-blur';
import { ReactNode, useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ease, useT } from '../theme';

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
    y.set(withTiming(height.get() + 40, { duration: 280, easing: ease.out }, (done) => { if (done) scheduleOnRN(finish); }));
    pop.set(withTiming(0, { duration: 200 }));
    scrim.set(withTiming(0, { duration: 240 }));
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
      y.set(withTiming(0, { duration: 380, easing: ease.out }));
      pop.set(0);
      pop.set(withTiming(1, { duration: 320, easing: ease.out }));
      scrim.set(withTiming(1, { duration: 300 }));
    }
  }, [render, H, y, scrim, pop]);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { y.set(Math.max(0, g.dy)); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) close();
        else y.set(withTiming(0, { duration: 260, easing: ease.spring }));
      },
    }),
  );

  const sa = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const ka = useAnimatedStyle(() => ({ opacity: scrim.value }));
  const pa = useAnimatedStyle(() => ({ opacity: pop.value, transform: [{ scale: 0.96 + pop.value * 0.04 }, { translateY: (1 - pop.value) * 12 }] }));
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
          <View {...pan.panHandlers} style={{ paddingTop: 8, paddingBottom: 6, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: t.line2 }} />
          </View>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
            {render(close)}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
