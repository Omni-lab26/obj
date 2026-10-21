import { router } from 'expo-router';
import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
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
