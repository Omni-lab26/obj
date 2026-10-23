import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { T } from '@/themes/kit';
import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { useLook } from './look';
import { Cursor, useBlink } from './ui';

// The tab bar as a command window: the tabs are words, the ▶ cursor sits on
// the one you're on. The middle one (勉強) is a box of its own, and shows the
// minutes while you study.
const WORD: Record<string, string> = { index: 'ホーム', timeline: 'ログ', study: '勉強', community: 'なかま', me: 'じぶん' };

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const L = useLook();
  const nick = { position: 'absolute' as const, width: 3, height: 3, backgroundColor: L.page };
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 12 }}>
      <View style={{ height: TAB_BAR_H, backgroundColor: L.win, borderWidth: 2, borderColor: L.edge, padding: 3, boxShadow: `0px 4px 0px ${L.drop}` }}>
        <View accessibilityRole="tablist" style={{ flex: 1, borderWidth: 1.5, borderColor: L.edge, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3 }}>
          {items.map((it) => <Tab key={it.key} it={it} running={running} paused={paused} mins={mins} />)}
        </View>
        <View pointerEvents="none" style={[nick, { top: -2, left: -2 }]} />
        <View pointerEvents="none" style={[nick, { top: -2, right: -2 }]} />
        <View pointerEvents="none" style={[nick, { bottom: -2, left: -2 }]} />
        <View pointerEvents="none" style={[nick, { bottom: -2, right: -2 }]} />
      </View>
    </View>
  );
}

function Tab({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const L = useLook();
  const live = it.center && running;
  const dot = useBlink(live && !paused, 450, 0.2);
  const word = WORD[it.name] ?? it.label;
  const label = it.center ? (running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`) : it.label;
  return (
    <Press onPress={() => { if (it.center) haptic.soft(); it.onPress(); }} haptics={!it.center} scale={0.92} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={label}
      style={{ flex: it.center ? 1.45 : 1, height: TAB_BAR_H - 14, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 3 }, it.center ? { height: 34, paddingHorizontal: 7, borderWidth: 1.5, borderColor: live ? (paused ? L.exp : L.hp) : it.focused ? L.cursor : L.edge, backgroundColor: live ? L.faint : 'transparent' } : null]}>
        <View style={{ width: 7, opacity: it.focused ? 1 : 0 }}><Cursor color={L.cursor} px={1.2} still={!it.focused} /></View>
        {live ? (
          <>
            <Animated.View style={[{ width: 6, height: 6, backgroundColor: paused ? L.exp : L.hp }, dot]} />
            <T size={13} lh={18} color={L.text} numberOfLines={1}>{`${mins}分`}</T>
          </>
        ) : (
          <T size={12.5} lh={18} color={it.focused ? L.text : L.dim} numberOfLines={1}>{word}</T>
        )}
      </View>
    </Press>
  );
}
