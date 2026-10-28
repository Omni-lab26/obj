import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay } from 'react-native-reanimated';

import { subj, Subject } from '@/data';
import { dayOf, minutesIn } from '@/lib/history';
import { Session, useStore, useSubjects } from '@/store';
import { hair, useT } from '@/theme';
import { Card, Press, SectionHead, SubjCoin, Txt } from '@/ui/base';
import { sessionSheet } from '@/ui/Editors';
import { Heatmap } from '@/ui/Heatmap';
import { Icon } from '@/ui/Icon';
import { timed } from '@/ui/motion';
import { ScoreCard } from '@/ui/ScoreCard';
import { StackedBars } from '@/ui/StackedBars';

/** One subject, like a token row in a wallet: coin, name and pace, hours (last 7 days) on the right. */
function SubjRow({ s, week, i }: { s: Subject; week: number; i: number }) {
  const t = useT();
  const goal = s.goal ?? 0;
  const p = goal ? Math.min(100, Math.round((week / goal) * 100)) : 100;
  const low = p < 80;
  const w = useSharedValue(0);
  useEffect(() => { w.value = withDelay(i * 50, timed(p, 500)); }, [p, i, w]);
  // grown by scaling from the left, not by its width (no layout each frame)
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: w.value / 100 }] }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 }}>
      {i ? <View style={{ position: 'absolute', top: 0, left: 52, right: 0, height: hair, backgroundColor: t.line }} /> : null}
      <SubjCoin name={s.name} color={s.c} size={28} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={13.5} w="600" style={{ flex: 1 }}>{s.name}</Txt>
          <Txt num size={13.5} w="600">{week.toFixed(1)}<Txt size={11} tone="ink3" num>{goal ? ` / ${goal}h` : ' 時間'}</Txt></Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
          {/* green while on pace, amber when behind */}
          <View style={{ flex: 1, height: 3, borderRadius: 1.5, backgroundColor: t.sunken, overflow: 'hidden' }}>
            <Animated.View style={[{ width: '100%', height: 3, borderRadius: 1.5, backgroundColor: low ? t.amber : t.green, transformOrigin: 'left' }, a]} />
          </View>
          <Txt size={10.5} w="600" num tone={low ? 'amber' : 'greenInk'} style={{ minWidth: 64, textAlign: 'right' }}>{!goal ? '' : low ? `あと${(goal - week).toFixed(1)}時間` : `${p}%`}</Txt>
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
  const lastDay = useStore((s) => s.lastDay);
  const today = sessions.filter((x) => x.date === lastDay);
  const total = today.reduce((a, x) => a + x.min, 0);
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
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

// My Page's data, split into pages. 記録: what you did (today's records, which
// can be fixed, and the half-year grass). グラフ: how it adds up (days and weeks,
// subjects against their goals, the mock-test line).
export function LogPage() {
  const sessions = useStore((s) => s.sessions);
  return (
    <View>
      <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
        <Summary />
      </View>

      <TodayLog />

      <View style={sec}>
        <View style={{ paddingHorizontal: 4 }}>
          <SectionHead title="この半年" aux={`${Math.round(minutesIn(sessions, 182) / 60)}時間`} />
        </View>
        <Card>
          <Heatmap weeks={26} gap={3} />
        </Card>
      </View>
    </View>
  );
}

export function ChartsPage() {
  const subjects = useSubjects();
  const sessions = useStore((x) => x.sessions);
  // hours per subject over the last 7 days
  const hoursBy = useMemo(() => {
    const out: Record<string, number> = {};
    for (let i = 0; i < 7; i++) for (const [k, m] of Object.entries(dayOf(sessions, i).parts)) out[k] = (out[k] ?? 0) + m / 60;
    return out;
  }, [sessions]);
  return (
    <View>
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <StackedBars />
      </View>

      <View style={sec}>
        <View style={{ paddingHorizontal: 4 }}>
          <SectionHead title="この7日間の科目" aux="科目と色を編集" onAux={() => router.push('/subjects')} />
        </View>
        <Card pad={0} style={{ paddingVertical: 4 }}>
          {subjects.map((s, i) => <SubjRow key={s.id} s={s} week={hoursBy[s.id] ?? 0} i={i} />)}
        </Card>
      </View>

      <View style={sec}>
        <View style={{ paddingHorizontal: 4 }}>
          <SectionHead title="模試の偏差値" aux="最終更新 10月14日" />
        </View>
        <ScoreCard />
      </View>
    </View>
  );
}

const sec = { paddingHorizontal: 16, paddingTop: 22 } as const;

/** One sentence instead of a dashboard header: this week, and how it compares. */
function Summary() {
  const sessions = useStore((s) => s.sessions);
  const week = (from: number) => Array.from({ length: 7 }, (_, i) => dayOf(sessions, from + i).min).reduce((x, y) => x + y, 0) / 60;
  const now = week(0);
  const prev = week(7);
  const d = Math.round((now - prev) * 10) / 10;
  return (
    <Txt size={13} tone="ink2" lh={19}>
      {'今週は '}<Txt size={13} w="700" num>{now.toFixed(1)}時間</Txt>
      {'。先週より '}<Txt size={13} w="700" num tone={d >= 0 ? 'greenInk' : 'amber'}>{`${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)}時間`}</Txt>
    </Txt>
  );
}
