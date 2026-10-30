import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pad } from '@/data';
import { updateGroup, useStore } from '@/store';
import { hair, lift, radius, useT } from '@/theme';
import { Btn, haptic, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Field, Label, RadioCards, Stepper } from '@/ui/Form';
import { DatePick, Opens, PickChip, SMOOTH, TimePick } from '@/ui/DateTime';
import { setPendingGroupTab } from '@/ui/GroupParts';
import { toast } from '@/ui/Toast';
import { Pane } from '@/ui/Glass';
import { S, useStd } from '@/ui/stdLook';

const WD = ['日', '月', '火', '水', '木', '金', '土'];
type Kind = 'もくもく自習' | '時間チャレンジ' | '振り返り会';
type Who = 'all' | 'invited';


export default function PlanEvent() {
  const t = useT();
  const std = useStd();
  const insets = useSafeAreaInsets();
  const { g: gid = 'g1' } = useLocalSearchParams<{ g?: string }>();
  const members = useStore((s) => (s.groups.find((x) => x.id === gid) ?? s.groups[0]).m);
  const [kind, setKind] = useState<Kind>('もくもく自習');
  const [d, setD] = useState(() => { const x = new Date(); return new Date(x.getFullYear(), x.getMonth(), x.getDate() + 4); });
  const [minutes, setMinutes] = useState(21 * 60);
  const [open, setOpen] = useState<'date' | 'time' | null>(null);
  const toggle = (k: 'date' | 'time') => { haptic.tap(); setOpen(open === k ? null : k); };
  const [who, setWho] = useState<Who>('all');
  const [cap, setCap] = useState(12);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');

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
            {/* the day and the start, picked as on an iPhone, right under their row */}
            <Animated.View layout={SMOOTH} style={[{ marginHorizontal: 16, borderRadius: radius.card, backgroundColor: t.surface, overflow: 'hidden' }, lift(t)]}>
              <Pane radius={radius.card} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14 }}>
                <Txt size={15.5} style={{ flex: 1 }}>開始</Txt>
                <PickChip on={open === 'date'} onPress={() => toggle('date')} label={`${d.getMonth() + 1}月${d.getDate()}日（${WD[d.getDay()]}）`} a11y="日を変える" />
                <PickChip on={open === 'time'} onPress={() => toggle('time')} label={`${Math.floor(minutes / 60)}:${pad(minutes % 60)}`} a11y="始める時刻を変える" />
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={new Date()} onChange={setD} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'time' ? <Opens><TimePick value={minutes} onChange={setMinutes} onDone={() => setOpen(null)} /></Opens> : null}
            </Animated.View>
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

        <View style={[{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom, 12), backgroundColor: t.canvas, borderTopWidth: hair, borderTopColor: t.line, gap: 10 },
          // スタンダード: an ink line over the footer; room for the key's floor
          std && { borderTopWidth: 2, borderTopColor: S.ink, gap: 12 }]}>
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
