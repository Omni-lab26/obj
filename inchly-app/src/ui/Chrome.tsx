import { router } from 'expo-router';
import { ReactNode, useSyncExternalStore } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';

import { Notif, NOTIFS, ROOM } from '../data';
import { State, useStore } from '../store';
import { hair, type, useT } from '../theme';
import { IconBtn, Txt } from './base';
import { BackdropView } from './backdrop/Backdrop';
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

// The tab bar floats over the content, with the study bar always on top of it
// (the session under way, or the timetable's plan), so tab screens leave room
// under their last item for what's there.
export const TAB_BAR_H = 62;
export const tabBarBottom = (inset: number) => Math.max(inset - 6, 12);
export const STUDY_BAR_H = 56;
/** Where the study bar sits: just above the tab bar. */
export const studyBarBottom = (inset: number) => tabBarBottom(inset) + TAB_BAR_H + 8;
/** The top of the study bar, from the bottom edge: things that float over a tab screen sit above it. */
export const barsTop = (inset: number) => studyBarBottom(inset) + STUDY_BAR_H;
// Swiped down, the study bar stays away until you start again or open the timer.
let barAway = false;
const barSubs = new Set<() => void>();
const setBarAway = (v: boolean) => { if (v === barAway) return; barAway = v; barSubs.forEach((f) => f()); };
const onBarAway = (f: () => void) => { barSubs.add(f); return () => { barSubs.delete(f); }; };
export const hideStudyBar = () => setBarAway(true);
export const showStudyBar = () => setBarAway(false);
/** The study bar is always up (studying, it's the session; otherwise the timetable's plan), unless put away. */
export function useStudyBarShown() {
  const away = useSyncExternalStore(onBarAway, () => barAway, () => barAway);
  return !away;
}
/** The top of what floats at the bottom of a tab screen: the study bar while it's up, else the tab bar. */
export function useBarsTop() {
  const insets = useSafeAreaInsets();
  return useStudyBarShown() ? barsTop(insets.bottom) : tabBarBottom(insets.bottom) + TAB_BAR_H;
}
export function useTabPad() {
  return useBarsTop() + 20;
}

/** Light falling on the gray from the top, fading by the middle: the page reads airy, a little see-through. */
function Haze() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <SvgGradient id="haze" x1="0" y1="0" x2="0.35" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.75} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </SvgGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#haze)" />
      </Svg>
    </View>
  );
}

/** A full-height page with the top safe area applied: on the 背景 if there is one (the same koi on every page), else the canvas color. `bg`: a color of its own instead. */
export function Screen({ children, style, bg }: { children: ReactNode; style?: ViewStyle; bg?: string }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: bg ?? t.canvas, paddingTop: insets.top }, style]}>
      {/* the 背景, or the theme's texture, behind everything (not on screens with their own color, like the timer); without either, a haze of light from the top */}
      {bg ? null : t.backdrop !== 'none' ? <BackdropView /> : t.texture ? <TextureFill texture={t.texture} /> : t.dark ? null : <Haze />}
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
export function NavBar({ title, right, color, border, onBack }: { title: string; right?: ReactNode; color?: string; border?: boolean; onBack?: () => void }) {
  const t = useT();
  return (
    <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, borderBottomWidth: border ? hair : 0, borderBottomColor: t.line }}>
      <IconBtn name="back" label="戻る" color={color} onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))} />
      <View style={{ position: 'absolute', left: 60, right: 60, alignItems: 'center' }} pointerEvents="none">
        <Txt size={15.5} w="600" color={color} numberOfLines={1}>{title}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}
