import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { SUBJ, Subject } from '@/data';
import { ease, useT } from '@/theme';
import { dot, SectionHead, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { Heatmap } from '@/ui/Heatmap';
import { DeviationChart, Period, StackedBars } from '@/ui/RecordsChart';
import { Rolling } from '@/ui/Rolling';
import { Segmented } from '@/ui/Tabs';

const DATA: Record<'week' | 'month', Period & { tot: string; d: string }> = {
  week: { key: 'week', x: ['木', '金', '土', '日', '月', '火', '水'], v: [3.2, 2.5, 5.4, 4.1, 3.6, 2.8, 2.75], tot: '24.4', d: '先週より +2.6時間' },
  month: {
    key: 'month',
    x: Array.from({ length: 21 }, (_, i) => String(i + 1)),
    v: [2.1, 3.4, 2.8, 4.2, 0, 3.1, 3.9, 2.2, 4.8, 3.3, 2.6, 5.1, 3.8, 1.9, 3.6, 4.4, 3.2, 2.5, 5.4, 4.1, 2.75],
    tot: '69.3',
    d: '先月同時期より +8.4時間',
  },
};

function SubjRow({ s, i }: { s: Subject; i: number }) {
  const t = useT();
  const p = Math.min(100, Math.round((s.week / s.goal) * 100));
  const low = p < 80;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(i * 50, withTiming(p, { duration: 700, easing: ease.out })); }, [p, i, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: i ? StyleSheet.hairlineWidth * 2 : 0, borderTopColor: t.line }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {dot(s.c)}
          <Txt size={15} w="500">{s.name}</Txt>
        </View>
        <Txt size={12} tone={low ? 'amber' : 'ink3'} style={{ flex: 1 }}>{low ? 'ペースが遅れています' : '順調'}</Txt>
        <Txt num size={15} w="600">{s.week}<Txt size={12.5} tone="ink3" num> / {s.goal}h</Txt></Txt>
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: t.grass[0], marginTop: 8, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: s.c }, a]} />
      </View>
    </View>
  );
}

export default function Records() {
  const [k, setK] = useState<'week' | 'month'>('week');
  const d = DATA[k];
  // Total rolls up from zero on first show, then between periods.
  const [tot, setTot] = useState('00.0');
  useEffect(() => { const id = setTimeout(() => setTot(d.tot), 120); return () => clearTimeout(id); }, [d.tot]);
  return (
    <Screen>
      <TopBar title="記録" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Segmented value={k} onChange={setK} options={[{ v: 'week', label: '今週' }, { v: 'month', label: '今月' }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Rolling value={tot} size={44} />
            <Txt size={15} w="500" tone="ink3" style={{ marginLeft: 4, marginBottom: 5 }}>時間</Txt>
          </View>
          <Txt size={13} w="600" tone="greenInk" style={{ marginBottom: 5 }}>{d.d}</Txt>
        </View>
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <StackedBars key={k} period={d} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingTop: 10 }}>
          {SUBJ.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {dot(s.c)}
              <Txt size={11.5} tone="ink3">{s.name}</Txt>
            </View>
          ))}
        </View>

        <View style={sec}>
          <SectionHead title="科目ごと" aux="今週の目標に対して" />
          {SUBJ.map((s, i) => <SubjRow key={s.id} s={s} i={i} />)}
        </View>

        <View style={sec}>
          <SectionHead title="1年の積み上げ" aux="1,284時間" />
          <Heatmap weeks={26} seed={3} todayLevel={3} gap={3} />
        </View>

        <View style={sec}>
          <SectionHead title="模試の偏差値" aux="総合 · 東大 理一" />
          <DeviationChart />
        </View>
      </ScrollView>
    </Screen>
  );
}

const sec = { paddingHorizontal: 20, paddingTop: 26 } as const;
