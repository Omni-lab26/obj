import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hoursIn, SUBJ, subj, Subject } from '@/data';
import { Session, useStore } from '@/store';
import { ease, hair, useT } from '@/theme';
import { Card, Press, SectionHead, SubjCoin, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { sessionSheet } from '@/ui/Editors';
import { Heatmap } from '@/ui/Heatmap';
import { Icon } from '@/ui/Icon';
import { ScoreCard } from '@/ui/ScoreCard';
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

/** One record: when, what, how long. Tap to fix it. */
function SessionRow({ x, first }: { x: Session; first: boolean }) {
  const t = useT();
  const sj = subj(x.s);
  return (
    <Press onPress={() => sessionSheet(x)} scale={0.99} accessibilityLabel={`${x.at} ${sj.name} ${x.min}分。直す`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
      {first ? null : <View style={{ position: 'absolute', top: 0, left: 62, right: 0, height: hair, backgroundColor: t.line }} />}
      <Txt num size={12} tone="ink3" style={{ width: 38 }}>{x.at}</Txt>
      <View style={{ width: 3, alignSelf: 'stretch', borderRadius: 1.5, backgroundColor: sj.c }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={13.5} w="600" lh={18}>{sj.name}{x.manual ? <Txt size={11} tone="ink3">{'  手で追加'}</Txt> : null}</Txt>
        {x.note ? <Txt size={11.5} tone="ink3" numberOfLines={1}>{x.note}</Txt> : null}
      </View>
      <Txt num size={14} w="600">{x.min}<Txt size={11} tone="ink3">分</Txt></Txt>
      <Icon name="chev" size={12} color={t.ink3} />
    </Press>
  );
}

function TodayLog() {
  const t = useT();
  const sessions = useStore((s) => s.sessions);
  const today = sessions.filter((x) => x.day === 0);
  const total = today.reduce((a, x) => a + x.min, 0);
  return (
    <View style={sec}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: 4, marginBottom: 8 }}>
        <Txt size={15} w="600" style={{ flex: 1 }}>今日の記録</Txt>
        <Press onPress={() => sessionSheet()} hitSlop={12} scale={0.94} accessibilityRole="button" accessibilityLabel="記録を手で追加"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center' }}>
          <Icon name="plus" size={12} color={t.greenInk} />
          <Txt size={12.5} w="600" color={t.greenInk}>手で追加</Txt>
        </Press>
      </View>
      <Card pad={0} style={{ paddingVertical: 2 }}>
        {today.length ? today.map((x, i) => <SessionRow key={x.id} x={x} first={i === 0} />) : (
          <View style={{ paddingVertical: 18, alignItems: 'center' }}>
            <Txt size={13} tone="ink3">まだ記録がありません</Txt>
          </View>
        )}
        {today.length ? (
          <View style={{ flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: hair, borderTopColor: t.line }}>
            <Txt size={12} tone="ink3" style={{ flex: 1 }}>{`${today.length}回 · 押すと直せます`}</Txt>
            <Txt num size={12} w="700">{`${Math.floor(total / 60)}時間${total % 60}分`}</Txt>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

export default function Records() {
  const todayMin = useStore((s) => s.todayMin);
  return (
    <Screen>
      <TopBar title="記録" sub={<Summary />} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
          <StackedBars />
        </View>

        <TodayLog />

        <View style={{ paddingHorizontal: 16, paddingTop: 22 }}>
          <View style={{ paddingHorizontal: 4 }}>
            <SectionHead title="模試の偏差値" aux="最終更新 10月14日" />
          </View>
          <ScoreCard />
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
            <Heatmap weeks={26} seed={3} todayLevel={todayMin ? Math.min(4, 1 + Math.floor(todayMin / 60)) : 0} gap={3} />
          </Card>
        </View>
      </ScrollView>
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
