import { router, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useRef, useState } from 'react';
import { KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pad, TODAY } from '@/data';
import { updateGroup, useStore } from '@/store';
import { useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Field, Label, RadioCards, Stepper } from '@/ui/Form';
import { setPendingGroupTab } from '@/ui/GroupParts';
import { Rolling } from '@/ui/Rolling';
import { toast } from '@/ui/Toast';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const DAYS = Array.from({ length: 7 }, (_, i) => { const d = new Date(TODAY); d.setDate(TODAY.getDate() + i); return d; });
type Kind = 'もくもく自習' | '時間チャレンジ' | '振り返り会';
type Who = 'all' | 'invited';

// Time ruler: 6:00–24:00 in 15-minute steps.
const STEP = 12;
const START = 6 * 60;
const COUNT = (24 - 6) * 4 + 1;

export default function PlanEvent() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { g: gid = 'g1' } = useLocalSearchParams<{ g?: string }>();
  const members = useStore((s) => (s.groups.find((x) => x.id === gid) ?? s.groups[0]).m);
  const [kind, setKind] = useState<Kind>('もくもく自習');
  const [day, setDay] = useState(4);
  const [minutes, setMinutes] = useState(21 * 60);
  const [who, setWho] = useState<Who>('all');
  const [cap, setCap] = useState(12);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');

  const d = DAYS[day];
  const time = `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

  const plan = () => {
    if (!title.trim()) return;
    setPhase('saving');
    setTimeout(() => {
      updateGroup(gid, (g) => ({
        ...g,
        events: [{ id: 'e' + Date.now(), mo: d.getMonth() + 1, d: d.getDate(), w: WD[d.getDay()], t: title.trim(), time: `${time}〜`, type: kind, joined: [], me: true, cap, fresh: true }, ...g.events],
        msgs: [...g.msgs, { kind: 'sys', t: `あなた がイベント「${title.trim()}」を企画しました` }],
      }));
      haptic.success();
      setPhase('done');
      setTimeout(() => {
        setPendingGroupTab('events');
        router.back();
        toast('イベントを企画しました', who === 'all' ? 'グループの全員にお知らせしました' : '招待する人をあとで選べます');
      }, 550);
    }, 800);
  };

  return (
    <Screen>
      <NavBar title="イベントを企画" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 20, gap: 28, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 20 }}>
            <Label>1. 何をする？</Label>
            <RadioCards value={kind} onChange={setKind} options={[
              { v: 'もくもく自習', title: 'もくもく自習', sub: '決めた時間にみんなで勉強を始めます。カメラは使いません' },
              { v: '時間チャレンジ', title: '時間チャレンジ', sub: '期間中の合計時間の目標を、みんなで目指します' },
              { v: '振り返り会', title: '振り返り会', sub: '模試のあとなどに、間違えた問題を持ち寄ります' },
            ]} />
          </View>

          <View>
            <View style={{ paddingHorizontal: 20 }}><Label>2. いつ？</Label></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
              {DAYS.map((x, i) => {
                const on = i === day;
                return (
                  <Press key={i} onPress={() => setDay(i)} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ width: 52, paddingVertical: 8, borderRadius: 12, alignItems: 'center', backgroundColor: on ? t.ink : t.surface,
                      borderWidth: on ? 0 : StyleSheet.hairlineWidth * 2, borderColor: t.line }}>
                    <Txt size={11.5} color={on ? t.onInk : t.ink3}>{WD[x.getDay()]}</Txt>
                    <Txt num size={19} w="700" color={on ? t.onInk : t.ink} lh={24}>{x.getDate()}</Txt>
                    <Txt size={10.5} color={on ? t.onInk : t.ink3}>{i === 0 ? '今日' : `${x.getMonth() + 1}月`}</Txt>
                  </Press>
                );
              })}
            </ScrollView>
            <View style={{ marginHorizontal: 20, marginTop: 12, borderRadius: 14, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingTop: 14 }}>
                <Rolling value={time} size={34} weight="700" />
                <Txt size={13} tone="ink3" style={{ marginBottom: 5 }}>から</Txt>
              </View>
              <Ruler minutes={minutes} onChange={setMinutes} />
            </View>
            <Txt size={12} tone="ink3" style={{ paddingHorizontal: 20, marginTop: 8 }}>ルーラーを左右に動かして時刻を選びます（15分刻み）</Txt>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <Label>3. だれと？</Label>
            <RadioCards value={who} onChange={setWho} options={[
              { v: 'all', title: 'グループの全員', sub: `${members}人にお知らせが届きます` },
              { v: 'invited', title: '招待した人だけ', sub: 'あとでメンバーを選びます' },
            ]} />
            <View style={{ marginTop: 10 }}>
              <Stepper value={cap} min={2} max={24} onChange={setCap} unit="人まで" />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20, gap: 14 }}>
            <Label>4. 名前とひとこと</Label>
            <Field label="イベント名" value={title} onChangeText={setTitle} max={30} />
            <Field label="ひとこと（任意）" value={note} onChangeText={setNote} multiline max={120} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.canvas, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line, gap: 10 }}>
          <Txt size={13} tone="ink2" numberOfLines={1}>
            <Txt size={13} w="700">{`${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）${time}`}</Txt>
            {`  · ${kind} · ${cap}人まで`}
          </Txt>
          <Btn kind="primary" wide label={phase === 'done' ? '企画しました' : '企画する'} disabled={!title.trim()} loading={phase === 'saving'} done={phase === 'done'} onPress={plan} style={{ height: 52 }} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Horizontal ruler with native momentum and snapping; the red needle marks the chosen time. */
function Ruler({ minutes, onChange }: { minutes: number; onChange: (m: number) => void }) {
  const t = useT();
  const [w, setW] = useState(0);
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const last = useRef(minutes);
  const placed = useRef(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.max(0, Math.min(COUNT - 1, Math.round(e.nativeEvent.contentOffset.x / STEP)));
    const m = START + i * 15;
    if (m !== last.current) { last.current = m; haptic.tap(); onChange(m); }
  };
  return (
    <View style={{ height: 64, marginTop: 6 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessibilityRole="adjustable" accessibilityLabel="開始時刻" accessibilityValue={{ text: `${Math.floor(minutes / 60)}時${minutes % 60}分` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const m = Math.max(START, Math.min(24 * 60, minutes + (e.nativeEvent.actionName === 'increment' ? 15 : -15)));
        ref.current?.scrollTo({ x: ((m - START) / 15) * STEP, animated: true });
      }}>
      {w ? (
        <ScrollView ref={ref} horizontal contentOffset={{ x: ((minutes - START) / 15) * STEP, y: 0 }}
          onLayout={() => { if (!placed.current) { placed.current = true; ref.current?.scrollTo({ x: ((minutes - START) / 15) * STEP, animated: false }); } }} showsHorizontalScrollIndicator={false} snapToInterval={STEP} decelerationRate="fast" scrollEventThrottle={16} onScroll={onScroll}
          contentContainerStyle={{ paddingHorizontal: w / 2 - STEP / 2, alignItems: 'flex-start' }}>
          {Array.from({ length: COUNT }, (_, i) => {
            const m = START + i * 15;
            const hour = m % 60 === 0;
            const half = m % 30 === 0;
            return (
              <View key={i} style={{ width: STEP, alignItems: 'center' }}>
                <View style={{ width: hour ? 2 : 1.2, height: hour ? 22 : half ? 14 : 9, borderRadius: 1, backgroundColor: hour ? t.ink2 : t.line2, marginTop: 4 }} />
                {hour ? <Txt num size={11} tone="ink3" style={{ position: 'absolute', top: 30, left: (STEP - 30) / 2, width: 30, textAlign: 'center' }}>{m / 60}</Txt> : null}
              </View>
            );
          })}
        </ScrollView>
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: w / 2 - 1, top: 0, width: 2, height: 32, borderRadius: 1, backgroundColor: t.red }} />
    </View>
  );
}
