import { useEffect, useMemo } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hoursIn, SUBJ, Subject } from '@/data';
import { ease, hair, useT } from '@/theme';
import { Card, SectionHead, SubjCoin, Txt } from '@/ui/base';
import { Screen, TopBar, useTabSpace } from '@/ui/Chrome';
import { Heatmap } from '@/ui/Heatmap';
import { PullCard } from '@/ui/PullCard';
import { StackedBars } from '@/ui/StackedBars';

/** One subject, like a token row in a wallet: coin, name and pace, hours on the right. */
function SubjRow({ s, i }: { s: Subject; i: number }) {
  const t = useT();
  const p = Math.min(100, Math.round((s.week / s.goal) * 100));
  const low = p < 80;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(i * 50, withTiming(p, { duration: 700, easing: ease.out })); }, [p, i, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
      {i ? <View style={{ position: 'absolute', top: 0, left: 52, right: 0, height: hair, backgroundColor: t.line }} /> : null}
      <SubjCoin name={s.name} color={s.c} size={28} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={13.5} w="600" style={{ flex: 1 }}>{s.name}</Txt>
          <Txt num size={13.5} w="600">{s.week}<Txt size={11} tone="ink3" num>{` / ${s.goal}h`}</Txt></Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
          {/* green while on pace, amber when behind */}
          <View style={{ flex: 1, height: 3, borderRadius: 1.5, backgroundColor: t.sunken, overflow: 'hidden' }}>
            <Animated.View style={[{ height: 3, borderRadius: 1.5, backgroundColor: low ? t.amber : t.green }, a]} />
          </View>
          <Txt size={10.5} w="600" num tone={low ? 'amber' : 'greenInk'} style={{ minWidth: 64, textAlign: 'right' }}>{low ? `あと${(s.goal - s.week).toFixed(1)}時間` : `${p}%`}</Txt>
        </View>
      </View>
    </View>
  );
}

export default function Records() {
  const tabSpace = useTabSpace();
  // The pull card refreshes only when the page is at the top, so it needs the scroll offset
  // and the scroll view's native gesture to run alongside it.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const native = useMemo(() => Gesture.Native(), []);
  return (
    <Screen>
      <TopBar title="記録" sub={<Summary />} />
      <GestureDetector gesture={native}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabSpace }}>
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
            <View style={{ paddingHorizontal: 4 }}>
              <SectionHead title="今週の科目" aux="目標に対して" />
            </View>
            <Card pad={0} style={{ paddingVertical: 4 }}>
              {SUBJ.map((s, i) => <SubjRow key={s.id} s={s} i={i} />)}
            </Card>
          </View>

          <View style={sec}>
            <View style={{ paddingHorizontal: 4 }}>
              <SectionHead title="この半年" aux={`${Math.round(hoursIn(182))}時間`} />
            </View>
            <Card>
              <Heatmap weeks={26} seed={3} todayLevel={3} gap={3} />
            </Card>
          </View>
        </Animated.ScrollView>
      </GestureDetector>
    </Screen>
  );
}

const sec = { paddingHorizontal: 16, paddingTop: 22 } as const;

/** One sentence instead of a dashboard header: this week, and how it compares. */
function Summary() {
  const now = hoursIn(7);
  const prev = hoursIn(14) - now;
  const d = Math.round((now - prev) * 10) / 10;
  return (
    <Txt size={13} tone="ink2" lh={19}>
      {'今週は '}<Txt size={13} w="700" num>{now.toFixed(1)}時間</Txt>
      {'。先週より '}<Txt size={13} w="700" num tone={d >= 0 ? 'greenInk' : 'amber'}>{`${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}時間`}</Txt>
    </Txt>
  );
}
