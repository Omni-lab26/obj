import { router } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NOTIFS } from '../data';
import { useStore } from '../store';
import { useT } from '../theme';
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

/** Large title for tab roots, with search and notifications on the right. */
export function TopBar({ title, date }: { title: string; date?: string }) {
  const unread = useUnread();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 4 }}>
      <View style={{ flex: 1 }}>
        {date ? <Txt size={13} tone="ink3">{date}</Txt> : null}
        <Txt size={28} w="700" lh={36}>{title}</Txt>
      </View>
      <IconBtn name="search" label="さがす" onPress={() => router.push('/search')} />
      <IconBtn name="bell" label="お知らせ" dot={unread > 0} onPress={() => router.push('/notifications')} />
    </View>
  );
}

/** Pushed-screen header: back, centered title, optional right action. */
export function NavBar({ title, right, color, border }: { title: string; right?: ReactNode; color?: string; border?: boolean }) {
  const t = useT();
  return (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: border ? StyleSheet.hairlineWidth * 2 : 0, borderBottomColor: t.line }}>
      <IconBtn name="back" label="戻る" color={color} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={{ position: 'absolute', left: 60, right: 60, alignItems: 'center' }} pointerEvents="none">
        <Txt size={16.5} w="700" color={color} numberOfLines={1}>{title}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
