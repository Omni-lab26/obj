import { useWindowDimensions, View } from 'react-native';

import type { TabBarProps, TabItem } from '@/themes/types';
import { haptic } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { useLook } from './look';
import { Ann, Blink, Key, Seg } from './parts';

// デジタル's tab bar: a row of keys along the bottom of the case. The tab
// you're on stays down with its light on; the middle key starts things, and
// while a session runs it shows the minutes in segments.

const CODE: Record<string, string> = { index: 'HOME', timeline: 'FEED', study: 'STUDY', community: 'CREW', me: 'ME' };
const codeOf = (it: TabItem) => CODE[it.name] ?? it.name.toUpperCase().slice(0, 5);

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const L = useLook();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: tabBarBottom(insets.bottom), paddingHorizontal: 12 }}>
      <View accessibilityRole="tablist"
        style={{ height: TAB_BAR_H, borderRadius: 12, backgroundColor: L.body, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, gap: 6,
          boxShadow: `0px 6px 18px rgba(0,0,0,0.28), inset 0px 1px 0px rgba(255,255,255,0.09), 0px 0px 0px 1px ${L.key.base}` }}>
        {items.map((it) => (it.center ? <Center key={it.key} it={it} running={running} paused={paused} mins={mins} /> : <Tab key={it.key} it={it} />))}
      </View>
    </View>
  );
}

function Tab({ it }: { it: TabItem }) {
  const L = useLook();
  return (
    <Key onPress={it.onPress} label={it.label} role="tab" selected={it.focused} latched={it.focused} h={44} depth={3} style={{ flex: 1 }}
      face={{ flexDirection: 'column', gap: 2, paddingHorizontal: 0 }}>
      <View style={{ position: 'absolute', top: 5, right: 7, width: 5, height: 5, borderRadius: 3, backgroundColor: it.focused ? L.seg : L.key.base }} />
      <View><Icon name={it.icon} size={17} color={it.focused ? L.bodyInk : L.key.ink} filled={it.focused} width={1.8} /></View>
      <Ann plain size={8} color={it.focused ? L.bodyInk : L.bodyInk2}>{codeOf(it)}</Ann>
    </Key>
  );
}

function Center({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const L = useLook();
  const narrow = useWindowDimensions().width < 360; // the unit goes on a small phone; the figures stay
  const ink = running && paused ? L.key.ink : L.keyAccent.ink;
  return (
    <Key onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} tone={running && paused ? 'plain' : 'accent'} role="tab" selected={it.focused}
      label={running ? `${it.label} · 勉強中 ${mins}分` : `${it.label}（時間割・ToDo・タイマー）`} h={44} depth={3} style={{ flex: 1.35 }}
      face={{ gap: 5, paddingHorizontal: 6 }}>
      {running ? (
        <>
          <Blink on={!paused} period={1000}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: ink }} /></Blink>
          <Seg text={String(Math.min(999, mins))} h={20} color={ink} ghost="transparent" />
          {narrow ? null : <Ann plain size={8} color={ink}>MIN</Ann>}
        </>
      ) : (
        <>
          <View><Icon name="play" size={14} color={ink} /></View>
          <Ann plain size={9} color={ink}>{it.focused ? 'START' : codeOf(it)}</Ann>
        </>
      )}
    </Key>
  );
}
