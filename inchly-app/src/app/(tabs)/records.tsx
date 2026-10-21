import { useEffect, useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { SUBJ, Subject } from '@/data';
import { ease, useT } from '@/theme';
import { dot, SectionHead, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { Heatmap } from '@/ui/Heatmap';
import { PullCard } from '@/ui/PullCard';
import { StackedBars } from '@/ui/StackedBars';

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
  // The pull card refreshes only when the page is at the top, so it needs the scroll offset
  // and the scroll view's native gesture to run alongside it.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const native = useMemo(() => Gesture.Native(), []);
  return (
    <Screen>
      <TopBar title="記録" />
      <GestureDetector gesture={native}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            <StackedBars />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <SectionHead title="模試の偏差値" aux="下に引くと最新の結果を取得" />
            </View>
            <PullCard scrollY={scrollY} scroll={native} />
          </View>

          <View style={sec}>
            <SectionHead title="科目ごと" aux="今週の目標に対して" />
            {SUBJ.map((s, i) => <SubjRow key={s.id} s={s} i={i} />)}
          </View>

          <View style={sec}>
            <SectionHead title="1年の積み上げ" aux="1,284時間" />
            <Heatmap weeks={26} seed={3} todayLevel={3} gap={3} />
          </View>
        </Animated.ScrollView>
      </GestureDetector>
    </Screen>
  );
}

const sec = { paddingHorizontal: 20, paddingTop: 26 } as const;
