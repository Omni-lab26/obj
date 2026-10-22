import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { hms, SUBJ, subj } from '@/data';
import { blocksOn, endOf, minutesUntil, slotsOf, suggestion, type Block, type Slot } from '@/lib/timetable';
import { jpDate, mondayIndex } from '@/lib/time';
import { elapsedOf, getState, setTarget, setTimerMode, startFrom, toggleTodo, togglePause, useNow, useStore } from '@/store';
import { focus, hair, radius, type, useT } from '@/theme';
import { Card, haptic, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { blockSheet, todoSheet } from '@/ui/Editors';
import { LiveDot } from '@/ui/GroupParts';
import { TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

// The middle tab: where studying starts. Plan it here (the timetable, the
// ToDos, how the timer counts), and start from what you planned, so the
// subject is always the one you chose. The timer itself opens on top.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];

/** Start from a plan and open the timer. Refused once a different subject has run for over a minute. */
function go(x: { s: string; todoId?: string; min?: number }) {
  if (!startFrom(x)) {
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
        <Now />
        <Timetable />
        <Todos />
        <TimerPrefs />
        <View style={{ height: 8, backgroundColor: t.canvas }} />
      </ScrollView>
    </Screen>
  );
}

// ---------- now: what you're studying, or what's next ----------
function Now() {
  const t = useT();
  const now = useNow();
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  if (s.running) {
    const e = elapsedOf(s, now);
    const todo = s.todos.find((x) => x.id === s.studyTodo);
    return (
      <Press onPress={() => router.push('/timer')} scale={0.98} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`}
        style={{ marginHorizontal: 16, marginTop: 10, borderRadius: radius.card + 4, backgroundColor: focus.bg, padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <LiveDot size={6} color={s.paused ? t.amber : undefined} />
          <Txt size={12} w="600" color={focus.ink2}>{s.paused ? '一時停止中' : '勉強中'}</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: sj.c }} />
          <Txt size={26} w="800" color={focus.ink}>{sj.name}</Txt>
          <Txt size={13} color={focus.ink2} numberOfLines={1} style={{ flex: 1 }}>{todo?.t ?? sj.task}</Txt>
        </View>
        <Txt num size={40} w="600" lh={46} color={focus.ink}>{hms(e)}</Txt>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.92} accessibilityLabel={s.paused ? '再開' : '一時停止'}
            style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={s.paused ? 'play' : 'pause'} size={16} color={focus.bg} />
          </Press>
          <Press onPress={() => router.push('/timer')} scale={0.96} style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: focus.raise, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={14} w="700" color={focus.ink}>タイマーを開く</Txt>
          </Press>
          <Press onPress={() => { const c = getState(); if (c.running && !c.paused) togglePause(); router.push('/record'); }} scale={0.96}
            style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: '#F2B705', alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={14} w="800" color="#2E2200">終わって記録</Txt>
          </Press>
        </View>
      </Press>
    );
  }
  // not studying: suggest the timetable's block, else the first open ToDo
  const d = new Date(now);
  const slot = suggestion(s.timetable, d);
  const todo = s.todos.find((x) => !x.d);
  const pick = slot ? { s: slot.block.s, what: slot.block.t ?? subj(slot.block.s).task, min: slot.block.min, when: whenOf(slot, d) }
    : todo ? { s: todo.s, what: todo.t, todoId: todo.id, when: 'ToDo の一番上' } : null;
  return (
    <Card style={{ marginHorizontal: 16, marginTop: 10 }} pad={16}>
      {pick ? (
        <View style={{ gap: 12 }}>
          <View style={{ gap: 2 }}>
            <Txt size={12} w="600" tone="ink3">{`次は · ${pick.when}`}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: subj(pick.s).c }} />
              <Txt size={26} w="800">{subj(pick.s).name}</Txt>
              <Txt size={13} tone="ink2" numberOfLines={1} style={{ flex: 1 }}>{pick.what}</Txt>
            </View>
          </View>
          <Press onPress={() => go({ s: pick.s, min: 'min' in pick ? pick.min : undefined, todoId: 'todoId' in pick ? pick.todoId : undefined })} haptics={false} scale={0.97}
            accessibilityLabel={`${subj(pick.s).name}を始める`}
            style={{ height: 54, borderRadius: 27, backgroundColor: subj(pick.s).c, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Icon name="play" size={16} color="#fff" />
            <Txt size={16} w="800" color="#fff">{`${subj(pick.s).name}を始める`}</Txt>
          </Press>
        </View>
      ) : (
        <Txt size={14} w="700">何から始める？</Txt>
      )}
      {/* or any subject, in one tap */}
      <Txt size={11.5} tone="ink3" style={{ marginTop: 14, marginBottom: 8 }}>{pick ? 'ほかの科目ですぐ始める' : '科目を押すとすぐ始まります'}</Txt>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {SUBJ.map((x) => (
          <Press key={x.id} onPress={() => go({ s: x.id })} haptics={false} scale={0.94} accessibilityLabel={`${x.name}を始める`}
            style={{ flex: 1, height: 40, borderRadius: 12, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
            <Txt size={13} w="700">{x.name}</Txt>
          </Press>
        ))}
      </View>
    </Card>
  );
}

function whenOf(slot: Slot, now: Date) {
  const b = slot.block;
  if (slot.state === 'now') return `いま（${b.start}〜${endOf(b)}）`;
  const m = minutesUntil(b, now);
  return `${b.start}から（あと${m >= 60 ? `${Math.floor(m / 60)}時間${m % 60 ? `${m % 60}分` : ''}` : `${m}分`}）`;
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
  // the chosen weekday: today with live states, another day as a plain list
  const list: (Slot | { block: Block; state: 'plain' })[] = day === today
    ? slotsOf(blocks, d)
    : blocksOn(blocks, new Date(d.getFullYear(), d.getMonth(), d.getDate() + (day - today))).map((block) => ({ block, state: 'plain' as const }));
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="700" style={{ flex: 1 }}>時間割</Txt>
        <AddLink label="追加" onPress={() => blockSheet()} />
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
          const past = state === 'past';
          const live = state === 'now';
          return (
            <Press key={b.id} onPress={() => blockSheet(b)} scale={0.99} accessibilityLabel={`${b.start}から${b.min}分 ${sj.name} ${b.t ?? ''}。編集`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 10, borderTopWidth: i ? hair : 0, borderTopColor: t.line,
                backgroundColor: live ? t.sunken : 'transparent', opacity: past ? 0.45 : 1 }}>
              <View style={{ width: 42 }}>
                <Txt num size={13} w="700" lh={16}>{b.start}</Txt>
                <Txt num size={11} tone="ink3" lh={14}>{endOf(b)}</Txt>
              </View>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: sj.c }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt size={14.5} w="700">{sj.name}</Txt>
                  {live ? <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: t.ink, justifyContent: 'center' }}><Txt size={10} w="800" color={t.onInk}>いま</Txt></View> : null}
                  {state === 'next' ? <Txt size={11} w="600" tone="ink3">つぎ</Txt> : null}
                </View>
                <Txt size={12} tone="ink2" numberOfLines={1}>{`${b.t ?? sj.task} · ${b.min}分`}</Txt>
              </View>
              {past || state === 'plain' ? null : (
                <Press onPress={() => go({ s: b.s, min: b.min })} haptics={false} scale={0.9} hitSlop={6} disabled={running}
                  accessibilityLabel={`${sj.name}を始める`}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: live ? sj.c : t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="play" size={14} color={live ? '#fff' : t.ink} />
                </Press>
              )}
            </Press>
          );
        }) : (
          <Press onPress={() => blockSheet()} style={{ paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 4 }}>
            <Txt size={13.5} w="600">{day === today ? '今日の時間割はまだありません' : `${DOW[day]}曜日の時間割はまだありません`}</Txt>
            <Txt size={12} tone="ink3">時間と科目を決めておくと、その時間に1タップで始められます</Txt>
          </Press>
        )}
      </Card>
    </>
  );
}

// ---------- ToDos, each startable ----------
function Todos() {
  const t = useT();
  const todos = useStore((x) => x.todos);
  const running = useStore((x) => x.running);
  const done = todos.filter((x) => x.d).length;
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="700">ToDo</Txt>
        <Txt size={12} w="500" tone="ink3" num style={{ flex: 1 }}>{`${done}/${todos.length}`}</Txt>
        <AddLink label="追加" onPress={() => todoSheet()} />
      </View>
      <Card style={{ marginHorizontal: 16 }} pad={0}>
        {todos.map((td, i) => (
          <View key={td.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <TodoRow todo={td} first={i === 0} onToggle={() => { const exp = toggleTodo(td.id); if (exp) toast('ToDoを完了しました', `+${exp} EXP`); }} onEdit={() => todoSheet(td)} />
            </View>
            {td.d ? <View style={{ width: 48 }} /> : (
              <Press onPress={() => go({ s: td.s, todoId: td.id })} haptics={false} scale={0.9} hitSlop={6} disabled={running}
                accessibilityLabel={`${td.t}を始める`}
                style={{ width: 34, height: 34, marginRight: 12, borderRadius: 17, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="play" size={12} color={t.ink} />
              </Press>
            )}
          </View>
        ))}
        {todos.length ? null : (
          <Press onPress={() => todoSheet()} style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Txt size={13} tone="ink3">やることを1つ決めておくと、始めるのが早くなります</Txt>
          </Press>
        )}
      </Card>
    </>
  );
}

// ---------- how the timer counts ----------
function TimerPrefs() {
  const t = useT();
  const mode = useStore((x) => x.timerMode);
  const target = useStore((x) => x.targetMin);
  const running = useStore((x) => x.running);
  return (
    <>
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 }}>
        <Txt size={type.head} w="700">タイマー</Txt>
      </View>
      <Card style={{ marginHorizontal: 16, gap: 14 }} pad={14}>
        <View style={{ gap: 8 }}>
          <Txt size={13} w="600">数え方</Txt>
          <Segmented value={mode} onChange={setTimerMode} options={[{ v: 'up', label: '勉強した時間（増える）' }, { v: 'goal', label: '目安まで（減る）' }]} />
          <Txt size={11.5} tone="ink3">{mode === 'up' ? '0から数えます。この時間がそのまま記録になります' : '決めた長さから数え下げます。目盛りで残りを直せます'}</Txt>
        </View>
        <View style={{ gap: 8 }}>
          <Txt size={13} w="600">{running ? '目安（いまの勉強）' : '目安'}</Txt>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[25, 50, 90, 120].map((m) => {
              const on = Math.round(target) === m;
              return (
                <Press key={m} onPress={() => { haptic.tap(); setTarget(m); }} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  style={{ flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : t.sunken }}>
                  <Txt num size={13} w="700" color={on ? t.onInk : t.ink}>{m >= 60 ? `${m / 60}時間` : `${m}分`}</Txt>
                </Press>
              );
            })}
          </View>
          <Txt size={11.5} tone="ink3">目安の時間になったら知らせます。時間割から始めると、その長さが目安になります</Txt>
        </View>
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
