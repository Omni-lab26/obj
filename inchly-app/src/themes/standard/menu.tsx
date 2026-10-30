import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { themeOf, useDesign } from '@/design';
import { useStore } from '@/store';
import { T } from '@/themes/kit';
import { haptic } from '@/ui/base';
import { planCalendar } from '@/ui/PlanSheets';
import { TextureFill } from '@/ui/Texture';
import type { IconId } from './art';
import { R, ring, S } from './look';
import { J, Key } from './parts';
import { LogoMark, Pix } from './pixel';

// スタンダード's side menu (home slides aside for it), after the mock (docs/app/mock/menu.html):
// on the dotted paper, the logo and who you are, the places that aren't tabs as rows in one card
// (pixel icons, 1.5pt lines between), and at the bottom 時間割に追加 as a key on its floor. It does
// what the base menu (screens/SideMenu.tsx) does; its props are the same, so home can draw either.
// Home, moved aside, keeps its own edge (screens/home/HomeScreen.tsx).

type Item = { icon: IconId; label: string; sub?: string; go: () => void };

export function Menu({ leave }: { close: () => void; leave: () => void }) {
  const insets = useSafeAreaInsets();
  const account = useStore((s) => s.account);
  const saved = useStore((s) => s.bookmarks.length);
  const theme = useDesign().theme;
  const open = (path: Parameters<typeof router.push>[0]) => () => { leave(); router.push(path); };
  const items: Item[] = [
    { icon: 'gear', label: '設定', go: open('/settings') },
    { icon: 'book', label: '科目と色', go: open('/subjects') },
    { icon: 'bookmark', label: 'ブックマーク', sub: saved ? String(saved) : undefined, go: open('/bookmarks') },
    { icon: 'sun', label: 'テーマ', sub: themeOf(theme).label, go: open('/design') },
  ];
  return (
    <View style={{ flex: 1, backgroundColor: S.paper, paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18, paddingLeft: 20, paddingRight: 18 }}>
      <TextureFill texture="dots-paper" />
      <ScrollView showsVerticalScrollIndicator={false} style={{ marginHorizontal: -8 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8, gap: 22 }}>
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36 }} accessible accessibilityRole="header" accessibilityLabel="Inchly">
            <LogoMark size={30} />
            <T f="groteskBold" size={26} lh={32} ls={-1.2} style={{ marginTop: -2 }}>inchly</T>
          </View>
          {account ? <J size={12.5} lh={17} color={S.ink3} numberOfLines={1}>{`${account.name} · @${account.handle}`}</J> : null}
        </View>

        <View accessibilityRole="menu" style={{ backgroundColor: S.card, borderRadius: R.card, boxShadow: ring(), paddingHorizontal: 14, paddingVertical: 2 }}>
          {items.map((x, i) => <Row key={x.label} x={x} first={i === 0} />)}
        </View>
      </ScrollView>

      {/* at the bottom, a way to plan */}
      <View style={{ paddingTop: 12, alignItems: 'flex-start' }}>
        <Key label="時間割に予定を追加" onPress={() => { leave(); planCalendar(); }} style={{ height: 44 }} face={{ paddingHorizontal: 18 }}>
          <Pix name="plus" />
          <J size={15} w="700" lh={19}>時間割に追加</J>
        </Key>
      </View>
    </View>
  );
}

/** A place in the menu: its icon, its name, what it's set to; pressed, the ground goes paper 2 (rows have no floor). */
function Row({ x, first }: { x: Item; first: boolean }) {
  return (
    <Pressable onPress={() => { haptic.tap(); x.go(); }} accessibilityRole="menuitem" accessibilityLabel={x.sub ? `${x.label}（${x.sub}）` : x.label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 54 }}>
      {({ pressed }) => (
        <>
          {/* pressed: the ground of the row, a little wider than its words */}
          <View pointerEvents="none" style={{ position: 'absolute', left: -8, right: -8, top: 2, bottom: 2, borderRadius: 12, backgroundColor: S.paper2, opacity: pressed ? 1 : 0 }} />
          {first ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1.5, backgroundColor: S.line }} />}
          <View style={{ width: 26, height: 26, alignItems: 'center', justifyContent: 'center' }}><Pix name={x.icon} /></View>
          <J size={16} w="700" lh={21} style={{ flex: 1, minWidth: 0 }} numberOfLines={1}>{x.label}</J>
          {x.sub ? <J size={12} lh={16} color={S.ink3} num>{x.sub}</J> : null}
        </>
      )}
    </Pressable>
  );
}
