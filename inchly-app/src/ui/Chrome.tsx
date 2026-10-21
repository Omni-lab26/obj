import { router } from 'expo-router';
import { ReactNode } from 'react';
import { ScrollViewProps, View, ViewStyle } from 'react-native';
import Animated, { AnimatedRef, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS } from '../data';
import { useStore } from '../store';
import { hair, type, useT } from '../theme';
import { IconBtn, Txt } from './base';

export function useUnread() {
  const read = useStore((s) => s.notifRead);
  const gone = useStore((s) => s.notifGone);
  return NOTIFS.filter((n) => !read.includes(n.id) && !gone.includes(n.id)).length;
}

/** Room the floating tab bar takes at the bottom of a tab screen. */
export function useTabSpace() {
  return useSafeAreaInsets().bottom + 84;
}

/**
 * A tab root, Instagram-style: a slim fixed header (the wordmark or a bold
 * title on the left, plain icons on the right) over a scrolling feed. A
 * hairline appears under the header once the feed moves under it.
 */
export function Page({ title, brand, right, children, scrollRef, contentStyle, ...rest }: {
  title?: string; brand?: ReactNode; right?: ReactNode; children: ReactNode;
  scrollRef?: AnimatedRef<Animated.ScrollView>; contentStyle?: ViewStyle;
} & Omit<ScrollViewProps, 'contentContainerStyle'>) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabSpace();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const rule = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 12], [0, 1], 'clamp') }));
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas, paddingTop: insets.top }}>
      <View style={{ height: 50, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 10, gap: 2, backgroundColor: t.canvas, zIndex: 2 }}>
        <View style={{ flex: 1 }}>{brand ?? <Txt size={type.title} w="700" lh={28}>{title}</Txt>}</View>
        {right}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: hair, backgroundColor: t.line2 }, rule]} />
      </View>
      <Animated.ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} {...rest}
        contentContainerStyle={[{ paddingBottom: tabSpace }, contentStyle]}>
        {children}
      </Animated.ScrollView>
    </View>
  );
}

/** Full-height screen on the canvas colour with the top safe area applied. */
export function Screen({ children, style, bg }: { children: ReactNode; style?: ViewStyle; bg?: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: bg ?? t.canvas, paddingTop: insets.top }, style]}>{children}</View>;
}

/** Large title for tab roots. Each tab brings only the actions it needs (or none). */
export function TopBar({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40 }}>
        <Txt size={type.title} w="700" lh={30} style={{ flex: 1 }}>{title}</Txt>
        {right}
      </View>
      {sub ? <View style={{ marginTop: 2 }}>{sub}</View> : null}
    </View>
  );
}

/** The two global actions, for screens that want them. */
export function SearchBtn({ filled }: { filled?: boolean }) {
  return <IconBtn name="search" label="さがす" filled={filled} onPress={() => router.push('/search')} />;
}
export function BellBtn({ filled }: { filled?: boolean }) {
  const unread = useUnread();
  return <IconBtn name="bell" label="お知らせ" filled={filled} dot={unread > 0} onPress={() => router.push('/notifications')} />;
}

/** Pushed-screen header: back, centered title, optional right action. */
export function NavBar({ title, right, color, border }: { title: string; right?: ReactNode; color?: string; border?: boolean }) {
  const t = useT();
  return (
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: border ? hair : 0, borderBottomColor: t.line }}>
      <IconBtn name="back" label="戻る" color={color} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ position: 'absolute', left: 60, right: 60, alignItems: 'center' }} pointerEvents="none">
        <Txt size={15.5} w="600" color={color} numberOfLines={1}>{title}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
