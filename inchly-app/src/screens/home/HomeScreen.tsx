import { ComponentType, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { arrange, HOME, Kind, SectionKind } from '@/screens/layout';
import { designReveal } from '@/screens/reveal';
import { MENU_SHARE, SideMenu } from '@/screens/SideMenu';
import type { HomeKit, SectionProps } from '@/themes/types';
import { useT } from '@/theme';
import { haptic } from '@/ui/base';
import { dismiss, present } from '@/ui/motion';
import { STANDARD_SECTIONS, StandardFrame, StandardHeader, StandardPage } from './standard';

// Home, for every theme: the base blocks (layout.ts) in the theme's order,
// each piece drawn by the theme or, where it draws nothing of its own, the
// standard way in its colors. Slide it to the right and it moves aside with
// your finger for the menu underneath (settings, subjects, the theme and the
// 背景). A theme may add a handle on the left edge; the standard home has
// none (VoiceOver gets メニューを開く as an action). Slide home back to the
// left, or tap it, and it returns.

/** Where the menu comes to rest (ui/motion: present / dismiss), keeping a fling's speed (in widths a second) and never going past its end (MOTION.md). */
const settleTo = (open: boolean, done: (finished?: boolean) => void, v = 0) => {
  'worklet';
  return open ? present(1, v) : dismiss(0, v, done);
};
/** Past halfway, or flung, it goes the rest of the way; otherwise it goes back. */
const decide = (at: number, v: number) => {
  'worklet';
  return v > 600 || (v > -600 && at > 0.5);
};

export function HomeScreen({ kit = {} }: { kit?: HomeKit }) {
  const t = useT();
  const blocks = useMemo(() => arrange(HOME, kit.arrange), [kit.arrange]);
  const Page = kit.Page ?? StandardPage;
  const Header = kit.Header ?? StandardHeader;
  const Frame = kit.Frame ?? StandardFrame;
  const Handle = kit.DesignHandle;
  const { width } = useWindowDimensions();
  const menuW = Math.round(width * MENU_SHARE);
  const w = useSharedValue(menuW);
  useEffect(() => { w.set(menuW); }, [menuW, w]);
  // the menu is there: opening, open, or closing
  const [shown, setShown] = useState(false);
  const from = useSharedValue(0);

  const settle = useCallback((open: boolean) => {
    designReveal.set(settleTo(open, (done) => { if (done) scheduleOnRN(setShown, false); }));
  }, []);
  const open = useCallback(() => { setShown(true); haptic.soft(); settle(true); }, [settle]);
  const close = useCallback(() => settle(false), [settle]);
  /** Off to another screen: the menu is put away at once, under it. */
  const leave = useCallback(() => { designReveal.set(0); setShown(false); }, []);

  // home → menu: only a slide to the right, so scrolling and the swipes inside home are left alone
  const [bringIn] = useState(() => Gesture.Pan().activeOffsetX(14).failOffsetY([-22, 22])
    .onStart(() => { from.set(designReveal.get()); scheduleOnRN(setShown, true); })
    .onUpdate((e) => { designReveal.set(Math.min(1, Math.max(0, from.get() + e.translationX / w.get()))); })
    .onFinalize((e) => {
      const go = decide(designReveal.get(), e.velocityX);
      if (go && from.get() < 0.5) scheduleOnRN(haptic.soft);
      designReveal.set(settleTo(go, (done) => { if (done) scheduleOnRN(setShown, false); }, e.velocityX / w.get()));
    }));
  // menu → home: slide home back to the left (or tap it)
  const [takeOut] = useState(() => Gesture.Pan().activeOffsetX(-14).failOffsetY([-22, 22])
    .onUpdate((e) => { designReveal.set(Math.min(1, Math.max(0, 1 + e.translationX / w.get()))); })
    .onFinalize((e) => {
      const stay = decide(designReveal.get(), e.velocityX);
      designReveal.set(settleTo(stay, (done) => { if (done) scheduleOnRN(setShown, false); }, e.velocityX / w.get()));
    }));

  // Android's back button closes it; leaving home puts it away
  useEffect(() => {
    if (!shown) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [shown, close]);
  useEffect(() => () => { designReveal.set(0); }, []);

  // home moves aside by the menu's width, its corner rounds and it dims a little; the menu comes in a little from the left
  const homeAway = useAnimatedStyle(() => ({
    transform: [{ translateX: designReveal.value * w.value }],
    borderRadius: designReveal.value * 28,
  }));
  const dim = useAnimatedStyle(() => ({ opacity: designReveal.value * 0.12 }));
  const menu = useAnimatedStyle(() => ({ opacity: Math.min(1, designReveal.value * 1.6), transform: [{ translateX: (designReveal.value - 1) * w.value * 0.25 }] }));
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      {shown ? (
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, bottom: 0, width: menuW }, menu]}>
          <SideMenu close={close} leave={leave} />
        </Animated.View>
      ) : null}
      <GestureDetector gesture={bringIn}>
        <Animated.View style={[{ flex: 1, overflow: 'hidden', boxShadow: '-6px 0px 30px rgba(0,0,0,0.14)' }, homeAway]} collapsable={false}
          accessibilityActions={[{ name: 'menu', label: 'メニューを開く' }]} onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'menu') open(); }}>
          <Page header={<Header />}>
            {blocks.map((b, i) => (
              <Frame key={b.id} block={b} index={i}>
                {b.sections.map((k, j) => <Section key={k} kind={k} own={kit.sections?.[k]} props={{ block: b, index: j, count: b.sections.length }} />)}
              </Frame>
            ))}
          </Page>
          {Handle ? <Handle onPress={open} /> : null}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, dim]} />
          {/* while the menu is out, a tap on home brings it back */}
          {shown ? (
            <GestureDetector gesture={takeOut}>
              <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel="メニューを閉じる" />
            </GestureDetector>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** A section as the theme draws it, else the standard way; a theme's own ('x:…') only if it draws it. */
function Section({ kind, own, props }: { kind: Kind; own?: ComponentType<SectionProps>; props: SectionProps }) {
  const C = own ?? (kind in STANDARD_SECTIONS ? STANDARD_SECTIONS[kind as SectionKind] : undefined);
  return C ? <C {...props} /> : null;
}
