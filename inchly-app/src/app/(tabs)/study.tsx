import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { subj } from '@/data';
import { Deadlines } from '@/screens/home/standard';
import { blocksOn, endOf, slotsOf, type Block, type Slot } from '@/lib/timetable';
import { jpDate, mondayIndex } from '@/lib/time';
import { startBlock } from '@/screens/model';
import { doneOn, getState, useNow, useStore } from '@/store';
import { hair, onColor, type, useT } from '@/theme';
import { Card, haptic, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { blockSheet } from '@/ui/Editors';
import { planCalendar } from '@/ui/PlanSheets';
import { Icon } from '@/ui/Icon';
import { toast } from '@/ui/Toast';

// The middle tab: where studying starts. Plan it here (the timetable and the
// deadlines), and start from what you planned, so the
// subject is always the one you chose. Starting opens the timer on top; while
// it runs, the study bar on the tab bar brings it back.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

/** Start a plan and open the timer. Refused once a different subject has run for over a minute. */
function go(b: Block) {
  if (!startBlock(b)) {
    haptic.warn();
    toast(`いまは${subj(getState().subj).name}を勉強中です`, '記録してから次の科目を始めましょう');
    return;
  }
  haptic.firm();
  router.push('/timer');
}

export default function Study() {
  const t = useT();
  const pad = useTabPad();
  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: pad }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={type.title + 4} w="800">勉強</Txt>
          <Txt size={12} tone="ink3">{jpDate(new Date())}</Txt>
        </View>
        <Timetable />
        <View style={{ paddingHorizontal: 16, paddingTop: 14 }}><Deadlines /></View>
        <View style={{ height: 8, backgroundColor: t.backdrop !== 'none' ? 'transparent' : t.canvas }} />
      </ScrollView>
    </Screen>
  );
}

// ---------- the timetable ----------
function Timetable() {
  const t = useT();
  const now = useNow(30_000);
  const d = new Date(now);
  const today = mondayIndex(d);
  const [day, setDay] = useState(today);
  const blocks = useStore((x) => x.timetable);
  const running = useStore((x) => x.running);
  const doneList = useStore((x) => x.doneBlocks);
  const done = doneOn({ doneBlocks: doneList }, d);
  // the chosen weekday: today with live states, another day as a plain list
  const list: (Slot | { block: Block; state: 'plain' })[] = day === today
    ? slotsOf(blocks, d)
    : blocksOn(blocks, new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day - today))).map((block) => ({ block, state: 'plain' as const }));
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="700" style={{ flex: 1 }}>時間割</Txt>
        <AddLink label="追加" onPress={() => planCalendar()} />
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginHorizontal: 16, marginBottom: 8 }}>
        {DOW.map((w, i) => {
          const on = i === day;
          return (
            <Press key={w} onPress={() => setDay(i)} scale={0.92} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`${w}曜日${i === today ? '（今日）' : ''}`}
              style={{ flex: 1, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : 'transparent' }}>
              <Txt size={12.5} w={i === today || on ? '800' : '500'} color={on ? t.onInk : i === today ? t.ink : t.ink3}>{w}</Txt>
            </Press>
          );
        })}
      </View>
      <Card style={{ marginHorizontal: 16 }} pad={0}>
        {list.length ? list.map(({ block: b, state }, i) => {
          const sj = subj(b.s);
          const finished = day === today && done.has(b.id);
          const past = state === 'past' || finished;
          const live = state === 'now' && !finished;
          return (
            <Press key={b.id} onPress={() => blockSheet(b)} scale={0.99} accessibilityLabel={`${b.start ? `${b.start}から` : '時刻なし'} ${sj.name} ${b.t ?? ''}。編集`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 10, borderTopWidth: i ? hair : 0, borderTopColor: t.line,
                backgroundColor: live ? t.sunken : 'transparent', opacity: past ? 0.45 : 1 }}>
              <View style={{ width: 48 }}>
                {b.start ? (
                  <>
                    <Txt num size={13} w="700" lh={16}>{b.start}</Txt>
                    {b.min ? <Txt num size={11} tone="ink3" lh={14}>{endOf(b)}</Txt> : <Txt size={11} tone="ink3" lh={14}>から</Txt>}
                  </>
                ) : <Txt size={10.5} w="600" tone="ink3" lh={14} numberOfLines={1}>時刻なし</Txt>}
              </View>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: sj.c }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt size={14.5} w="700">{sj.name}</Txt>
                  {live ? <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: t.ink, justifyContent: 'center' }}><Txt size={10} w="800" color={t.onInk}>いま</Txt></View> : null}
                  {finished ? <Txt size={11} w="600" tone="ink3">終わった</Txt> : state === 'next' ? <Txt size={11} w="600" tone="ink3">つぎ</Txt> : null}
                  {b.date ? <Txt size={11} w="600" tone="ink3">この日だけ</Txt> : null}
                </View>
                <Txt size={12} tone="ink2" numberOfLines={1}>{[b.t ?? sj.task, b.min ? `${b.min}分` : ''].filter(Boolean).join(' · ')}</Txt>
                {b.note ? <Txt size={11.5} tone="ink3" numberOfLines={1}>{b.note}</Txt> : null}
              </View>
              {past || state === 'plain' ? null : (
                <Press onPress={() => go(b)} haptics={false} scale={0.9} hitSlop={6} disabled={running}
                  accessibilityLabel={`${sj.name}を始める`}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: live ? sj.c : t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={14} color={live ? onColor(sj.c) : t.ink} />
                </Press>
              )}
            </Press>
          );
        }) : (
          <Press onPress={() => planCalendar()} style={{ paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 4 }}>
            <Txt size={13.5} w="600">{day === today ? '今日の時間割はまだありません' : `${DOW[day]}曜日の時間割はまだありません`}</Txt>
            <Txt size={12} tone="ink3">「追加」で日と始める時刻と科目を決めておくと、1タップで始められます。次の予定の時刻に知らせます</Txt>
          </Press>
        )}
      </Card>
    </>
  );
}

function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} hitSlop={12} scale={0.94} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center' }}>
      <Icon name="plus" size={12} color={t.greenInk} />
      <Txt size={12.5} w="600" color={t.greenInk}>{label}</Txt>
    </Press>
  );
}
