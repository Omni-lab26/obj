import { router } from 'expo-router';
import { ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hm, pad, SUBJ, subj } from '@/data';
import { commitRecord, elapsedOf, getState, useStore } from '@/store';
import { ease, hair, lift, radius, useT } from '@/theme';
import { Btn, Card, Empty, haptic, Press, SubjCoin, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Choice, Field } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { Stamp } from '@/ui/Sticker';
import { canNotify, notificationsAllowed, scheduleReminder } from '@/lib/notify';
import { NextChoice as Next, nextTimeAt, nextTimeLabel } from '@/lib/reminders';
import { toast } from '@/ui/Toast';

// "Record this study": opened by sliding to record on the timer (the clock is
// paused). One screen, top to bottom: what you did and for how long (fixable),
// what it does to today's total, which ToDo it moved, an optional note, and
// when you'll come back to it. One button at the bottom saves it all.

const clock = (d: Date) => `${d.getHours()}:${pad(d.getMinutes())}`;

export default function Record() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const running = useStore((s) => s.running);
  const todos = useStore((s) => s.todos);
  const goal = useStore((s) => s.goalMin);
  const before = useStore((s) => s.todayMin);
  const [sid] = useState(() => getState().subj);
  const sj = subj(sid);
  const [min, setMin] = useState(() => Math.max(1, Math.round(elapsedOf(getState()) / 60)));
  const [end] = useState(() => new Date());
  const start = new Date(end.getTime() - min * 60_000);
  // undone ToDos, this subject's first; the one you started from (else this subject's first) is picked for you
  const [open] = useState(() => {
    const s = getState();
    return [...s.todos.filter((x) => !x.d && x.s === s.subj), ...s.todos.filter((x) => !x.d && x.s !== s.subj)];
  });
  const [todo, setTodo] = useState<string>(() => open.find((x) => x.id === getState().studyTodo)?.id ?? open.find((x) => x.s === getState().subj)?.id ?? 'none');
  const [note, setNote] = useState('');
  const [next, setNext] = useState<Next>('tomorrow');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');

  if (!running && phase === 'idle') {
    return (
      <Screen>
        <NavBar title="この勉強を記録" />
        <Empty title="記録する勉強がありません" sub="タイマーで勉強を始めると、ここで記録できます" />
      </Screen>
    );
  }

  const after = before + min;
  const picked = todos.find((x) => x.id === todo);
  const when = nextTimeLabel(next, start);
  const choices: { v: Next; label: string }[] = [];
  for (const v of ['tomorrow', 'tonight', 'weekend'] as const) {
    const label = nextTimeLabel(v, start);
    if (label) choices.push({ v, label }); // 'tonight' drops out after 22:00
  }
  const adjust = (d: number) => { haptic.tap(); setMin((m) => Math.max(1, Math.min(600, m + d))); };

  const save = async () => {
    setPhase('saving');
    // the "next time" reminder: asks for permission here, the moment it's needed
    const at = nextTimeAt(next, start);
    let reminded: boolean | null = null;
    if (at && when) {
      reminded = (await notificationsAllowed(true)) && (await scheduleReminder({ id: 'next', at, title: `${sj.name}の続きの時間です`, body: picked ? picked.t : `${when}にやると決めた勉強` }));
    }
    const { min: m, ticket, exp, levelUp } = commitRecord({ todoId: picked?.id, note: note.trim() || undefined, min });
    haptic.success();
    setPhase('done');
    setTimeout(() => {
      router.dismissAll();
      const notice = reminded === null ? '' : reminded ? `${when}にお知らせします` : canNotify ? '通知が許可されていないので、お知らせは届きません' : '';
      const sub = [`+${exp} EXP`, ticket ? '7日連続！休み券を1枚もらいました' : '', notice].filter(Boolean).join(' · ');
      toast(levelUp ? `レベルアップ！ Lv.${levelUp}` : `${sj.name} ${m}分を記録しました`, levelUp ? `${sj.name} ${m}分を記録 · ${sub}` : sub);
    }, 1100); // long enough to see the stamp land
  };

  return (
    <Screen>
      <NavBar title="この勉強を記録" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 22 }}>

          {/* what and how long */}
          <Card pad={16}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <SubjCoin name={sj.name} color={sj.c} size={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={17} w="700">{sj.name}</Txt>
                <Txt size={12} tone="ink3" numberOfLines={1}>{sj.task}</Txt>
              </View>
              <Txt num size={12.5} tone="ink2">{`${clock(start)}〜${clock(end)}`}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }} accessible accessibilityLabel={`勉強した時間 ${min}分`}>
                <Rolling value={String(min)} size={56} weight="700" />
                <Txt size={16} w="600" tone="ink2" style={{ marginBottom: 10 }}>分</Txt>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Round icon="minus" label="5分へらす" onPress={() => adjust(-5)} />
                  <Round icon="plus" label="5分ふやす" onPress={() => adjust(5)} />
                </View>
                <Txt size={11} tone="ink3">5分ずつ直せます</Txt>
              </View>
            </View>
            <TodayBar before={before} add={min} goal={goal} />
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 8 }}>
              <Txt size={12.5} tone="ink2" style={{ flex: 1 }}>今日の合計</Txt>
              <Txt num size={12.5} tone="ink3">{`${hm(before)} → `}</Txt>
              <Txt num size={14} w="700">{hm(after)}</Txt>
            </View>
            <Txt size={12.5} w="600" color={after >= goal ? t.greenInk : t.ink2} style={{ marginTop: 4 }}>
              {after >= goal ? (before < goal ? `この記録で、今日の目標 ${goal / 60}時間 に届きます` : `今日の目標 ${goal / 60}時間 は達成ずみです`) : `目標の ${goal / 60}時間 まで、あと${goal - after}分`}
            </Txt>
          </Card>

          {/* which ToDo moved */}
          <Section n={1} title="進めたToDo" sub={picked ? '記録すると、このToDoは完了になります' : 'ToDoに入っていない勉強も記録できます'}>
            <View style={[{ borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]} accessibilityRole="radiogroup">
              {[...open.map((x) => ({ id: x.id, label: x.t, s: x.s })), { id: 'none', label: 'どれでもない', s: '' }].map((x, i) => {
                const on = todo === x.id;
                const xs = x.s ? SUBJ.find((k) => k.id === x.s) : undefined;
                return (
                  <Press key={x.id} onPress={() => { haptic.tap(); setTodo(x.id); }} scale={0.99} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : 'transparent', borderWidth: on ? 0 : 1.5, borderColor: t.line2 }}>
                      {on ? <Icon name="check" size={13} color={t.onInk} width={3} /> : null}
                    </View>
                    <Txt size={14} w={on ? '600' : '400'} tone={x.id === 'none' ? 'ink2' : 'ink'} style={{ flex: 1 }} numberOfLines={2}>{x.label}</Txt>
                    {xs ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: xs.c }} />
                        <Txt size={11.5} tone="ink3">{xs.name}</Txt>
                      </View>
                    ) : null}
                  </Press>
                );
              })}
            </View>
          </Section>

          {/* a note */}
          <Section n={2} title="メモ" sub="なくてもOK。空のときはToDoの名前が入ります">
            <Field label={picked ? picked.t : 'やったこと（例：長文 2題）'} value={note} onChangeText={setNote} max={40} bg={t.surface} />
          </Section>

          {/* when next */}
          <Section n={3} title="次はいつやる？" sub={when ? (canNotify ? `${when}にこのスマホへお知らせします` : `${when}（このブラウザではお知らせは届きません）`) : '決めずに記録します'}>
            <Choice<Next> value={next} onChange={setNext} options={[...choices, { v: 'none', label: '決めない' }]} />
          </Section>
        </ScrollView>

        {/* one button, always in reach */}
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, backgroundColor: t.surface, borderTopWidth: hair, borderTopColor: t.line }}>
          <Btn kind="primary" wide label={phase === 'done' ? '記録しました' : `${sj.name} ${min}分を記録する`} loading={phase === 'saving'} done={phase === 'done'} onPress={save} />
        </View>
      </KeyboardAvoidingView>

      {phase === 'done' ? (
        <Animated.View entering={FadeIn.duration(150)} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(244,245,248,0.6)' }}>
          <Stamp id="erai" size={150} pop />
        </Animated.View>
      ) : null}
    </Screen>
  );
}

function Section({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) {
  const t = useT();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Txt num size={12} w="700" color={t.onInk}>{n}</Txt>
        </View>
        <Txt size={16} w="700">{title}</Txt>
      </View>
      {children}
      {sub ? <Txt size={12} tone="ink3" style={{ paddingHorizontal: 2 }}>{sub}</Txt> : null}
    </View>
  );
}

function Round({ icon, label, onPress }: { icon: 'plus' | 'minus'; label: string; onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} haptics={false} scale={0.9} accessibilityLabel={label}
      style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={18} color={t.ink} />
    </Press>
  );
}

/** Today's bar: what was there before (ink), this session (green), and the goal line. */
function TodayBar({ before, add, goal }: { before: number; add: number; goal: number }) {
  const t = useT();
  const scale = Math.max(goal, before + add) * 1.08;
  const grow = useSharedValue(0);
  useEffect(() => { grow.set(withDelay(150, withTiming(1, { duration: 650, easing: ease.out }))); }, [grow]);
  const a = useAnimatedStyle(() => ({ width: `${(add / scale) * 100 * grow.value}%` }));
  return (
    <View style={{ marginTop: 16 }} accessible accessibilityLabel={`今日の合計 ${before + add}分、目標 ${goal}分`}>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: t.sunken, flexDirection: 'row', overflow: 'hidden' }}>
        <View style={{ width: `${(before / scale) * 100}%`, backgroundColor: t.ink }} />
        <Animated.View style={[{ backgroundColor: t.green }, a]} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${(goal / scale) * 100}%`, top: -4, width: 2, height: 20, marginLeft: -1, borderRadius: 1, backgroundColor: t.amber }} />
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
        <Legend color={t.ink} label="今日これまで" />
        <Legend color={t.green} label="この記録" />
        <Legend color={t.amber} label="目標" />
      </View>
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
      <Txt size={11} tone="ink3">{label}</Txt>
    </View>
  );
}
