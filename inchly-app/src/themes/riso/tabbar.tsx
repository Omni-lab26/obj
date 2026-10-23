import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { subj } from '@/data';
import type { TabBarProps, TabItem } from '@/themes/types';
import { useStore } from '@/store';
import { haptic, Press } from '@/ui/base';
import { TAB_BAR_H, tabBarBottom } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { P, paint, Patterns, useInk, usePlates, useSvgId } from './print';

// The tab bar as the foot of the page: a rule, the tabs as filled icons with
// small serif labels, and in the middle a tiny cover — blank halftone while
// idle, the subject's plate and the minutes while studying.

export function TabBar({ items, running, paused, mins, insets }: TabBarProps) {
  const k = useInk();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: tabBarBottom(insets.bottom) + TAB_BAR_H, backgroundColor: k.paper }}>
      <View style={{ height: 1.5, backgroundColor: k.ink }} />
      <View style={{ height: TAB_BAR_H - 1.5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }} accessibilityRole="tablist">
        {items.map((it) => (it.center ? <Middle key={it.key} it={it} running={running} paused={paused} mins={mins} /> : <Tab key={it.key} it={it} />))}
      </View>
    </View>
  );
}

function Tab({ it }: { it: TabItem }) {
  const k = useInk();
  const c = it.focused ? k.ink : k.ink2;
  return (
    <Press onPress={it.onPress} react="misprint" scale={0.9} accessibilityRole="tab" accessibilityState={{ selected: it.focused }} accessibilityLabel={it.label}
      style={{ flex: 1, height: TAB_BAR_H - 8, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      <Icon name={it.icon} size={22} color={c} filled={it.focused} width={it.focused ? 1.9 : 1.6} />
      <P f="title" size={9.5} lh={12} color={c} numberOfLines={1}>{it.label}</P>
      {it.focused ? <View style={{ position: 'absolute', bottom: 0, width: 18, height: 2, backgroundColor: k.ink }} /> : null}
    </Press>
  );
}

function Middle({ it, running, paused, mins }: { it: TabItem; running: boolean; paused: boolean; mins: number }) {
  const k = useInk();
  const id = useSvgId();
  const sid = useStore((s) => s.subj);
  const pl = usePlates()(sid);
  const kind = running ? (pl.kind === 'none' ? 'halftone' : pl.kind) : 'halftone';
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Press onPress={() => { haptic.soft(); it.onPress(); }} haptics={false} react="misprint" scale={0.92} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="tab" accessibilityState={{ selected: it.focused }}
        accessibilityLabel={running ? `${it.label} · 勉強中 ${mins}分（${subj(sid).name}）` : `${it.label}（時間割・ToDo・タイマー）`}
        style={{ width: 42, height: 50 }}>
        <View style={{ width: 42, height: 50, borderWidth: 1, borderColor: k.ink, backgroundColor: k.sheet, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={42} height={50} style={StyleSheet.absoluteFill}>
            <Patterns id={id} ink={k.ink} />
            <Rect x={0} y={0} width={42} height={50} fill={paint(id, kind, k.ink)} opacity={running ? pl.shade * 0.8 : 0.35} />
          </Svg>
          {running ? (
            <View style={{ paddingHorizontal: 3, minWidth: 30, alignItems: 'center', backgroundColor: paused ? k.sheet : k.ink, borderWidth: 1, borderColor: k.ink }}>
              <P f="sansB" size={10.5} lh={14} num color={paused ? k.ink : k.paper}>{`${mins}分`}</P>
            </View>
          ) : (
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: k.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="play" size={12} color={k.paper} />
            </View>
          )}
        </View>
        {it.focused ? <View style={{ position: 'absolute', bottom: -5, left: 12, right: 12, height: 2, backgroundColor: k.ink }} /> : null}
      </Press>
    </View>
  );
}
