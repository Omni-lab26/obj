import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { DEADLINES, hoursIn, SUBJ, Subject } from '@/data';
import { ease, useT } from '@/theme';
import { Card, ListRow, SectionHead, Txt } from '@/ui/base';
import { Page } from '@/ui/Chrome';
import { DateTile } from '@/ui/HomeParts';
import { Heatmap } from '@/ui/Heatmap';
import { PullCard } from '@/ui/PullCard';
import { StackedBars } from '@/ui/StackedBars';

/** One subject, as a list row: its colour, hours this week against the goal, a thin bar. */
function SubjRow({ s, i }: { s: Subject; i: number }) {
  const t = useT();
  const p = Math.min(100, Math.round((s.week / s.goal) * 100));
  const low = p < 80;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(i * 50, withTiming(p, { duration: 700, easing: ease.out })); }, [p, i, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <ListRow first={i === 0} lead={<View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.c }} />}
      title={s.name} a11y={`${s.name} 今週${s.week}時間 目標${s.goal}時間`}
      detail={<Txt size={17} num>{s.week}<Txt size={13} tone="ink2">{` / ${s.goal}時間`}</Txt></Txt>}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.sunken, overflow: 'hidden' }}>
          <Animated.View style={[{ height: 4, borderRadius: 2, backgroundColor: low ? '#FF9500' : t.tint }, a]} />
        </View>
        {low ? <Txt size={13} color={t.amber}>{`あと${(s.goal - s.week).toFixed(1)}時間`}</Txt> : null}
      </View>
    </ListRow>
  );
}

export default function Records() {
  const t = useT();
  return (
    <Page title="記録" sub={<Summary />}>
      <View style={{ paddingHorizontal: 16, gap: 30 }}>
        <StackedBars />

        <View>
          <SectionHead title="科目" aux="今週" />
          <Card pad={0}>{SUBJ.map((s, i) => <SubjRow key={s.id} s={s} i={i} />)}</Card>
        </View>

        <View>
          <SectionHead title="模試" />
          <PullCard />
        </View>

        <View>
          <SectionHead title="締切" />
          <Card pad={0}>
            {DEADLINES.map((d, i) => (
              <ListRow key={d.t} first={i === 0} lead={<DateTile mo={d.mo} d={d.day} />} title={d.t} sub={`ToDo ${d.todo[0]} / ${d.todo[1]} 終わった`}
                detail={<Txt size={17} color={d.urgent ? t.amber : t.ink2}>{`あと${d.days}日`}</Txt>} a11y={`${d.t} あと${d.days}日`} />
            ))}
          </Card>
        </View>

        <View>
          <SectionHead title="この半年" aux={`${Math.round(hoursIn(182))}時間`} />
          <Card>
            <Heatmap weeks={26} seed={3} todayLevel={3} gap={3} />
          </Card>
        </View>
      </View>
    </Page>
  );
}

/** One sentence instead of a dashboard header: this week, and how it compares. */
function Summary() {
  const t = useT();
  const now = hoursIn(7);
  const prev = hoursIn(14) - now;
  const d = Math.round((now - prev) * 10) / 10;
  return (
    <Txt size={15} tone="ink2" lh={21}>
      {`今週は ${now.toFixed(1)}時間。`}
      <Txt size={15} color={d >= 0 ? t.greenInk : t.ink2}>{`先週より ${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}時間`}</Txt>
    </Txt>
  );
}
