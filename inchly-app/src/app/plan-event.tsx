import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pad, TODAY } from '@/data';
import { updateGroup, useStore } from '@/store';
import { hair, lift, radius, type, useT } from '@/theme';
import { Btn, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Field, Label, RadioCards, Stepper } from '@/ui/Form';
import { setPendingGroupTab } from '@/ui/GroupParts';
import { Rolling } from '@/ui/Rolling';
import { TimeScrubber } from '@/ui/TimeScrubber';
import { toast } from '@/ui/Toast';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
const DAYS = Array.from({ length: 7 }, (_, i) => { const d = new Date(TODAY); d.setDate(TODAY.getDate() + i); return d; });
type Kind = 'もくもく自習' | '時間チャレンジ' | '振り返り会';
type Who = 'all' | 'invited';

// Start time: 6:00–24:00, snapping to 15 minutes.
const START = 6 * 60;
const END = 24 * 60;
const hourMark = (m: number) => `${m / 60}時`;

export default function PlanEvent() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { g: gid = 'g1' } = useLocalSearchParams<{ g?: string }>();
  const members = useStore((s) => (s.groups.find((x) => x.id === gid) ?? s.groups[0]).m);
  const [kind, setKind] = useState<Kind>('もくもく自習');
  const [day, setDay] = useState(4);
  const [minutes, setMinutes] = useState(21 * 60);
  const showMinutes = useCallback((v: number | null) => { if (v !== null) setMinutes(v); }, []);
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
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 16, gap: 22, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
          <View style={{ paddingHorizontal: 16 }}>
            <Label>1. 何をする？</Label>
            <RadioCards value={kind} onChange={setKind} options={[
              { v: 'もくもく自習', title: 'もくもく自習', sub: '時間を決めて、みんなで一斉に始める。カメラなし' },
              { v: '時間チャレンジ', title: '時間チャレンジ', sub: '期間中の合計時間を、みんなで目指す' },
              { v: '振り返り会', title: '振り返り会', sub: '模試のあと、間違えた問題を持ち寄る' },
            ]} />
          </View>

          <View>
            <View style={{ paddingHorizontal: 16 }}><Label>2. いつ？</Label></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {DAYS.map((x, i) => {
                const on = i === day;
                return (
                  <Press key={i} onPress={() => setDay(i)} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ width: 46, paddingVertical: 6, borderRadius: radius.inner, alignItems: 'center', backgroundColor: on ? t.ink : t.surface,
                      borderWidth: hair, borderColor: on ? t.ink : t.line2 }}>
                    <Txt size={10.5} color={on ? t.onInk : t.ink3} lh={14}>{WD[x.getDay()]}</Txt>
                    <Txt num size={16} w="700" color={on ? t.onInk : t.ink} lh={20}>{x.getDate()}</Txt>
                    <Txt size={10} color={on ? t.onInk : t.ink3} lh={13}>{i === 0 ? '今日' : `${x.getMonth() + 1}月`}</Txt>
                  </Press>
                );
              })}
            </ScrollView>
            {/* bencho time scrubber: readout on top, fisheye ruler below */}
            <View style={[{ marginHorizontal: 16, marginTop: 10, borderRadius: radius.card, backgroundColor: t.surface, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 10 }, lift(t)]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 }}>
                <Rolling value={time} size={type.figure + 2} weight="700" />
                <Txt size={12} w="600" tone="ink3" style={{ marginBottom: 4 }}>から</Txt>
              </View>
              <View style={{ marginTop: 16 }}>
                <TimeScrubber value={minutes} onChange={setMinutes} onPreview={showMinutes} min={START} max={END} step={15} px={2} minor={5} mid={15} major={60}
                  label={hourMark} bg={t.surface} a11y="開始時刻" />
              </View>
            </View>
          </View>

          <View style={{ paddingHorizontal: 16 }}>
            <Label>3. だれと？</Label>
            <RadioCards value={who} onChange={setWho} options={[
              { v: 'all', title: 'グループの全員', sub: `${members}人にお知らせが届きます` },
              { v: 'invited', title: '招待した人だけ', sub: 'あとでメンバーを選びます' },
            ]} />
            <View style={{ marginTop: 10 }}>
              <Stepper value={cap} min={2} max={24} onChange={setCap} unit="人まで" label="定員" />
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 14 }}>
            <Label>4. 名前とひとこと</Label>
            <Field label="イベント名" value={title} onChangeText={setTitle} max={30} />
            <Field label="ひとこと（任意）" value={note} onChangeText={setNote} multiline max={120} />
          </View>
        </ScrollView>

        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.canvas, borderTopWidth: hair, borderTopColor: t.line, gap: 10 }}>
          <Txt size={12} tone="ink2" numberOfLines={1}>
            <Txt size={12} w="700">{`${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）${time}`}</Txt>
            {`  · ${kind} · ${cap}人まで`}
          </Txt>
          <Btn kind="primary" wide label={phase === 'done' ? '企画しました' : '企画する'} disabled={!title.trim()} loading={phase === 'saving'} done={phase === 'done'} onPress={plan} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
