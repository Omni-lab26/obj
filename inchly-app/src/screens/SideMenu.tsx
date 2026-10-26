import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { startSubject } from '@/screens/model';
import { getState, useStore, useSubjects } from '@/store';
import { hair, useT } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Wordmark } from '@/ui/Brand';
import { Icon, type IconName } from '@/ui/Icon';
import { planCalendar } from '@/ui/PlanSheets';
import { THEME_NAMES, themeSheet } from '@/ui/StudyTheme';

// The menu that home slides aside for (slide home to the right, or press the
// handle on its left edge): the app's places that aren't tabs — settings,
// subjects and colors, saved posts, the study screen's theme — then each subject, one tap to start it
// (studying that isn't in the timetable starts here), and at the bottom a way
// to plan.

/** How much of the screen the menu takes; home stays in view to its right. */
export const MENU_SHARE = 0.78;

type Item = { icon: IconName; label: string; sub?: string; go?: () => void };

export function SideMenu({ close, leave }: { close: () => void; leave: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const account = useStore((s) => s.account);
  const subjects = useSubjects();
  const running = useStore((s) => s.running);
  const saved = useStore((s) => s.bookmarks.length);
  const theme = useStore((s) => s.studyBg);
  const open = (path: Parameters<typeof router.push>[0]) => () => { leave(); router.push(path); };
  const items: Item[] = [
    { icon: 'gear', label: '設定', go: open('/settings') },
    { icon: 'book', label: '科目と色', go: open('/subjects') },
    { icon: 'bookmark', label: 'ブックマーク', sub: saved ? String(saved) : undefined, go: open('/bookmarks') },
    { icon: 'bell', label: 'お知らせ', go: open('/notifications') },
    { icon: 'users', label: 'フォロー', go: open('/follows') },
    // the study screen's theme: 鯉の池, 歩く人, 科目の色
    { icon: 'sun', label: 'テーマ', sub: THEME_NAMES[theme], go: () => { close(); setTimeout(themeSheet, 280); } },
  ];
  // its plan if it has one now, else it goes into today's timetable from now
  const start = (id: string) => {
    startSubject(id);
    haptic.firm();
    leave();
    router.push('/timer');
  };
  return (
    <View style={{ flex: 1, backgroundColor: t.canvas, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 14 }}>
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

        <View style={{ height: hair, backgroundColor: t.line }} />

        <View style={{ gap: 4 }}>
          <Txt size={12} w="700" tone="ink3">すぐ始める</Txt>
          {subjects.map((x) => (
            <Press key={x.id} onPress={() => start(x.id)} haptics={false} scale={0.97} accessibilityLabel={`${x.name}を始める`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 14, height: 44 }}>
              <View style={{ width: 21, alignItems: 'center' }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.c }} />
              </View>
              <Txt size={15.5} w="500" style={{ flex: 1 }} numberOfLines={1}>{x.name}</Txt>
              {running && getState().subj === x.id ? <Txt size={11.5} w="700" color={t.greenInk}>勉強中</Txt> : <Icon name="play" size={11} color={t.ink3} filled />}
            </Press>
          ))}
        </View>
      </ScrollView>

      {/* at the bottom, a way to plan */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Press onPress={() => { close(); setTimeout(() => planCalendar(), 280); }} scale={0.96} accessibilityLabel="時間割に予定を追加"
          style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: t.ink }}>
          <Icon name="plus" size={14} color={t.onInk} />
          <Txt size={14} w="700" color={t.onInk}>時間割に追加</Txt>
        </Press>
      </View>
    </View>
  );
}
