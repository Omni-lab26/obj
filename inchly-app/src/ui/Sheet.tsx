import { ReactNode, useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ease, useT } from '../theme';

// Bottom sheet. openSheet(close => <Content/>) from anywhere; drag the grabber
// (or the top of the sheet) down to dismiss, or tap the scrim.
type Render = (close: () => void) => ReactNode;
let setter: ((r: Render | null) => void) | null = null;
let closer: (() => void) | null = null;

export function openSheet(render: Render) {
  setter?.(render);
}
export function closeSheet() {
  closer?.();
}

export function SheetHost() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [render, setRender] = useState<Render | null>(null);
  const H = Dimensions.get('window').height;
  const y = useSharedValue(H);
  const scrim = useSharedValue(0);
  const height = useSharedValue(H);

  const finish = () => setRender(null);
  const close = () => {
    y.set(withTiming(height.get() + 40, { duration: 280, easing: ease.out }, (done) => { if (done) scheduleOnRN(finish); }));
    scrim.set(withTiming(0, { duration: 240 }));
  };
  useEffect(() => {
    setter = (r) => setRender(() => r);
    closer = close;
    return () => { setter = null; closer = null; };
  });
  useEffect(() => {
    if (render) {
      y.set(H);
      y.set(withTiming(0, { duration: 380, easing: ease.out }));
      scrim.set(withTiming(1, { duration: 300 }));
    }
  }, [render, H, y, scrim]);

  const [pan] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { y.set(Math.max(0, g.dy)); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 110 || g.vy > 1.1) closer?.();
        else y.set(withTiming(0, { duration: 260, easing: ease.spring }));
      },
    }),
  );

  const sa = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  const ka = useAnimatedStyle(() => ({ opacity: scrim.value }));
  if (!render) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.scrim }, ka]}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="閉じる" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '90%' }} pointerEvents="box-none">
        <Animated.View
          onLayout={(e) => { height.set(e.nativeEvent.layout.height); }}
          style={[{ backgroundColor: t.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, sa]}
          accessibilityViewIsModal>
          <View {...pan.panHandlers} style={{ paddingTop: 8, paddingBottom: 6, alignItems: 'center' }}>
            <View style={{ width: 38, height: 5, borderRadius: 3, backgroundColor: t.line2 }} />
          </View>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 20 }}>
            {render(close)}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
