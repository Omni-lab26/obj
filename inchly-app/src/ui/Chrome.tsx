import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Platform, ScrollViewProps, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { AnimatedRef, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS } from '../data';
import { useStore } from '../store';
import { hair, useT } from '../theme';
import { IconBtn, Txt } from './base';

export function useUnread() {
  const read = useStore((s) => s.notifRead);
  const gone = useStore((s) => s.notifGone);
  return NOTIFS.filter((n) => !read.includes(n.id) && !gone.includes(n.id)).length;
}

/** Room the floating glass tab bar takes at the bottom of a tab screen. */
export function useTabSpace() {
  return useSafeAreaInsets().bottom + 88;
}

/** Full-height screen on the grouped background with the top safe area applied. */
export function Screen({ children, style, bg }: { children: ReactNode; style?: ViewStyle; bg?: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: bg ?? t.canvas, paddingTop: insets.top }, style]}>{children}</View>;
}

const BAR = 52;

/**
 * A tab root, iOS 26 style: the Large Title scrolls with the content; once it
 * is gone a small title fades into the bar, over a soft blur (the scroll edge
 * effect). The bar's buttons are glass circles and stay put.
 */
export function Page({ title, sub, right, children, tab = true, scrollRef, contentStyle, scrollY: extY, ...rest }: {
  title: string; sub?: ReactNode; right?: ReactNode; children: ReactNode; tab?: boolean;
  scrollRef?: AnimatedRef<Animated.ScrollView>; contentStyle?: ViewStyle; scrollY?: SharedValue<number>;
} & Omit<ScrollViewProps, 'contentContainerStyle'>) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabSpace();
  const own = useSharedValue(0);
  const y = extY ?? own;
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const edge = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [4, 40], [0, 1], 'clamp') }));
  const small = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [34, 56], [0, 1], 'clamp') }));
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas }}>
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} {...rest}
        contentContainerStyle={[{ paddingTop: insets.top + BAR, paddingBottom: tab ? tabSpace : insets.bottom + 24 }, contentStyle]}>
        <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
          <Txt size={34} w="700" lh={41} accessibilityRole="header">{title}</Txt>
          {sub ? <View style={{ marginTop: 2 }}>{sub}</View> : null}
        </View>
        {children}
      </Animated.ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + BAR }}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, edge]}>
          <BlurView intensity={Platform.OS === 'web' ? 18 : 30} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(242,242,247,0.72)', borderBottomWidth: hair, borderBottomColor: t.line }]} />
        </Animated.View>
        <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BAR, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, gap: 8 }}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 80, right: 80, alignItems: 'center' }, small]}>
            <Txt size={17} w="600" numberOfLines={1}>{title}</Txt>
          </Animated.View>
          {right}
        </View>
      </View>
    </View>
  );
}

/** The two global actions, for screens that want them. */
export function SearchBtn() {
  return <IconBtn filled name="search" label="さがす" onPress={() => router.push('/search')} />;
}

/** Pushed-screen bar: a glass back button, the title centred, optional glass actions. */
export function NavBar({ title, right }: { title: string; right?: ReactNode; color?: string; border?: boolean }) {
  return (
    <View style={{ height: BAR, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 }}>
      <IconBtn filled name="back" label="戻る" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ position: 'absolute', left: 76, right: 76, alignItems: 'center' }} pointerEvents="none">
        <Txt size={17} w="600" numberOfLines={1}>{title}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
