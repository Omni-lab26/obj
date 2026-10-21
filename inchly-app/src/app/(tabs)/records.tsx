import { useEffect, useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hoursIn, SUBJ, Subject } from '@/data';
import { ease, useT } from '@/theme';
import { SectionHead, Txt } from '@/ui/base';
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
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Txt size={15} w="500">{s.name}</Txt>
        <Txt size={12} tone="amber" style={{ flex: 1 }}>{low ? `あと${(s.goal - s.week).toFixed(1)}時間` : ''}</Txt>
        <Txt num size={15} w="600">{s.week}<Txt size={12.5} tone="ink3" num> / {s.goal}h</Txt></Txt>
      </View>
      {/* green while on pace, amber when behind — the subject colours stay inside the chart */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: t.grass[0], marginTop: 8, overflow: 'hidden' }}>
        <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: low ? t.amber : t.green }, a]} />
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
      <TopBar title="記録" sub={<Summary />} />
      <GestureDetector gesture={native}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
            <StackedBars />
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
            <View style={{ paddingHorizontal: 4 }}>
              <SectionHead title="模試の偏差値" aux="最終更新 10月14日" />
            </View>
            <PullCard scrollY={scrollY} scroll={native} />
          </View>

          <View style={sec}>
            <SectionHead title="今週の科目" />
            {SUBJ.map((s, i) => <SubjRow key={s.id} s={s} i={i} />)}
          </View>

          <View style={sec}>
            <SectionHead title="この半年" aux={`${Math.round(hoursIn(182))}時間`} />
            <Heatmap weeks={26} seed={3} todayLevel={3} gap={3} />
          </View>
        </Animated.ScrollView>
      </GestureDetector>
    </Screen>
  );
}

const sec = { paddingHorizontal: 20, paddingTop: 26 } as const;

/** One sentence instead of a dashboard header: this week, and how it compares. */
function Summary() {
  const now = hoursIn(7);
  const prev = hoursIn(14) - now;
  const d = Math.round((now - prev) * 10) / 10;
  return (
    <Txt size={15} tone="ink2" lh={22}>
      {'今週は '}<Txt size={15} w="700" num>{now.toFixed(1)}時間</Txt>
      {'。先週より '}<Txt size={15} w="600" num tone={d >= 0 ? 'greenInk' : 'amber'}>{`${Math.abs(d).toFixed(1)}時間${d >= 0 ? '多い' : '少ない'}`}</Txt>
    </Txt>
  );
}
