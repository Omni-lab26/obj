import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, Keyframe } from 'react-native-reanimated';

import { radius, useT } from '../theme';
import { Press, Txt } from './base';
import { Icon } from './Icon';

// A card in the middle of the screen, over the page blurred and a little
// darker: it fades in with a slight lift, and closes from ✕, a tap outside or back.
const SETTLE = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.97 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(180);

export function Dialog({ open, close, title, aside, children }: { open: boolean; close: () => void; title: string; aside?: string; children: ReactNode }) {
  const t = useT();
  const { height } = useWindowDimensions();
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={close} statusBarTranslucent>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {open ? (
          <Animated.View entering={FadeIn.duration(160)} style={StyleSheet.absoluteFill}>
            <BlurView intensity={Platform.OS === 'web' ? 28 : 40} tint={t.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.dark ? 'rgba(0,0,0,0.35)' : 'rgba(17,20,23,0.18)' }]} />
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="閉じる" />
          </Animated.View>
        ) : null}
        <View pointerEvents="box-none" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          {open ? (
            <Animated.View entering={SETTLE} accessibilityViewIsModal
              style={{ width: '100%', maxWidth: 420, maxHeight: height * 0.72, borderRadius: radius.card + 6, backgroundColor: t.surface, boxShadow: t.shadow2, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 8 }}>
                <Txt size={17} w="700">{title}</Txt>
                <Txt num size={13} tone="ink3" style={{ flex: 1 }}>{aside ?? ''}</Txt>
                <Press onPress={close} hitSlop={10} scale={0.9} accessibilityRole="button" accessibilityLabel="閉じる"
                  style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="x" size={13} color={t.ink2} />
                </Press>
              </View>
              {children}
            </Animated.View>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
