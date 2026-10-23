import { router } from 'expo-router';
import { ReactNode } from 'react';
import { View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notif, NOTIFS, ROOM } from '../data';
import { State, useStore } from '../store';
import { hair, type, useT } from '../theme';
import { IconBtn, Txt } from './base';
import { TextureFill } from './Texture';

/** Notices the settings let through: the kind is switched on and nobody in it is blocked. */
export const allowed = (s: Pick<State, 'notify' | 'blocked'>) => (n: Notif) => {
  if (n.topic && !s.notify[n.topic]) return false;
  const who = n.join ?? (n.follow ? ROOM.find((p) => p.h === n.follow)?.n : undefined);
  return !who || !s.blocked.includes(who);
};
export function useUnread() {
  const read = useStore((s) => s.notifRead);
  const gone = useStore((s) => s.notifGone);
  const notify = useStore((s) => s.notify);
  const blocked = useStore((s) => s.blocked);
  return NOTIFS.filter(allowed({ notify, blocked })).filter((n) => !read.includes(n.id) && !gone.includes(n.id)).length;
}

// The tab bar floats over the content, so tab screens leave room under their last item.
export const TAB_BAR_H = 62;
export const tabBarBottom = (inset: number) => Math.max(inset - 6, 12);
export function useTabPad() {
  const insets = useSafeAreaInsets();
  return tabBarBottom(insets.bottom) + TAB_BAR_H + 20;
}

/** Full-height screen on the canvas colour with the top safe area applied. */
export function Screen({ children, style, bg }: { children: ReactNode; style?: ViewStyle; bg?: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: bg ?? t.canvas, paddingTop: insets.top }, style]}>
      {/* the theme's texture, behind everything (not on screens with their own color, like the timer) */}
      {bg ? null : <TextureFill texture={t.texture} />}
      {children}
    </View>
  );
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
