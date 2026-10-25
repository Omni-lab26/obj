import { View } from 'react-native';

import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Blink, Cut, D, I, N } from './ui';

// ネオン's tab bar: a black strip with a yellow edge. The tab you're on is a
// yellow tag; the middle one runs a session (RUN), and while one runs it turns
// red and counts the minutes.
const CODE: Record<string, string> = { index: 'HOME', timeline: 'FEED', study: 'RUN', community: 'CREW', me: 'USER' };
const codeOf = (it: TabItem) => CODE[it.name] ?? it.name.toUpperCase().slice(0, 6);

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 12 }}>
      <View style={{ height: TAB_BAR_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, gap: 3 }} accessibilityRole="tablist">
        <Cut fill="#070707" stroke={N.cyanLine} cut={16} />
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 18, right: 0, height: 2, backgroundColor: N.yellow, boxShadow: `0px 0px 8px ${N.yellow}` }} />
        {items.map((it) => (it.center ? <Center key={it.key} it={it} running={running} paused={paused} mins={mins} /> : <Tab key={it.key} it={it} />))}
      </View>
    </View>
  );
}

function Tab({ it }: { it: TabItem }) {
  const ink = it.focused ? '#0A0A0A' : N.ink3;
  return (
    <Press onPress={it.onPress} scale={0.9} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: TAB_BAR_H - 14, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      {it.focused ? <Cut fill={N.yellow} cut={8} /> : null}
      <I name={it.icon} size={19} color={ink} filled={it.focused} width={1.8} />
      <D size={10.5} color={ink} style={{ letterSpacing: 1.2 }}>{codeOf(it)}</D>
    </Press>
  );
}

function Center({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const live = running && !paused;
  const fill = running ? (paused ? N.yellow : N.red) : it.focused ? N.yellow : 'transparent';
  const ink = running ? (paused ? '#0A0A0A' : '#FFFFFF') : it.focused ? '#0A0A0A' : N.yellow;
  return (
    <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} react="flicker" scale={0.92} hitSlop={{ top: 8, bottom: 8 }}
      accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
      accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`}
      style={{ flex: 1.3, height: TAB_BAR_H - 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <Cut fill={fill} stroke={running || it.focused ? undefined : N.yellow} cut={10} sw={1.5} />
      {running ? (
        <>
          <Blink on={live}><View style={{ width: 7, height: 7, backgroundColor: ink }} /></Blink>
          <D size={18} color={ink}>{`${mins}M`}</D>
        </>
      ) : (
        <>
          <I name="clock" size={14} color={ink} />
          <D size={15} color={ink} style={{ letterSpacing: 2 }}>{codeOf(it)}</D>
        </>
      )}
    </Press>
  );
}
