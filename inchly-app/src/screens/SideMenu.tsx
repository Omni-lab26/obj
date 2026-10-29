import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BACKDROPS, BACKDROPS_OPEN, themeId, themeOf, useDesign } from '@/design';
import { useStore } from '@/store';
import { useT } from '@/theme';
import { Press, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Icon, type IconName } from '@/ui/Icon';
import { planCalendar } from '@/ui/PlanSheets';
import { BackdropView } from '@/ui/backdrop/Backdrop';
import { backdropSheet } from '@/ui/BackdropSheet';
import { Pane } from '@/ui/Glass';

// The menu that home slides aside for (slide home to the right): the app's places that aren't tabs — settings,
// subjects and colors, saved posts, the テーマ and the 背景 — and at the bottom
// a way to plan. (Studying that isn't in the timetable starts from the study
// bar's 勉強を開始; お知らせ is home's bell, フォロー is on マイページ.)
// What it opens is there at once: the menu is put away under it and the page
// shows without sliding in (a page coming from the right, with the menu on the
// left, felt backwards).

/** How much of the screen the menu takes; home stays in view to its right. */
export const MENU_SHARE = 0.78;

type Item = { icon: IconName; label: string; sub?: string; go?: () => void };

export function SideMenu({ close, leave }: { close: () => void; leave: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const account = useStore((s) => s.account);
  const saved = useStore((s) => s.bookmarks.length);
  const d = useDesign();
  const standard = themeId(d.theme) === 'standard';
  const open = (path: Parameters<typeof router.push>[0]) => () => { leave(); router.push(path); };
  const items: Item[] = [
    { icon: 'gear', label: '設定', go: open('/settings') },
    { icon: 'book', label: '科目と色', go: open('/subjects') },
    { icon: 'bookmark', label: 'ブックマーク', sub: saved ? String(saved) : undefined, go: open('/bookmarks') },
    // the look (the デザイン page), and what moves behind the pages (with the standard theme; closed for now: design.ts BACKDROPS_OPEN)
    { icon: 'sun', label: 'テーマ', sub: themeOf(d.theme).label, go: open('/design') },
    ...(BACKDROPS_OPEN ? [{ icon: 'waves' as const, label: '背景', sub: standard ? BACKDROPS[d.backdrop].label : 'スタンダードのみ', go: () => { leave(); backdropSheet(); } }] : []),
  ];
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14, overflow: 'hidden' }}>
      <BackdropView />
      {/* over the 背景, the menu is a sheet of glass */}
      {t.backdrop !== 'none' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.surface }]}><Pane radius={0} /></View> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 22 }}>
        <View style={{ gap: 6 }}>
          <Wordmark size={24} />
          {account ? <Txt size={12.5} tone="ink3">{`${account.name} · @${account.handle}`}</Txt> : null}
        </View>

        <View accessibilityRole="menu">
          {items.map((x) => (
            <Press key={x.label} onPress={x.go ?? (() => {})} disabled={!x.go} scale={0.97} accessibilityRole="menuitem" accessibilityLabel={x.sub ? `${x.label}（${x.sub}）` : x.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, opacity: x.go ? 1 : 0.45 }}>
              <Icon name={x.icon} size={21} color={t.ink} />
              <Txt size={16} w="600" style={{ flex: 1 }}>{x.label}</Txt>
              {x.sub ? <Txt size={11.5} tone="ink3">{x.sub}</Txt> : null}
            </Press>
          ))}
        </View>
      </ScrollView>

      {/* at the bottom, a way to plan */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Press onPress={() => { leave(); planCalendar(); }} scale={0.96} accessibilityLabel="時間割に予定を追加"
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: t.ink }}>
          <Icon name="plus" size={14} color={t.onInk} />
          <Txt size={14} w="700" color={t.onInk}>時間割に追加</Txt>
        </Press>
      </View>
    </View>
  );
}
