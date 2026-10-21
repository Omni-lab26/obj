import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMsg, GEvent, Group, hms, subj } from '@/data';
import { elapsedOf, getState, startStudy, updateGroup, useStore } from '@/store';
import { font, useT } from '@/theme';
import { Avatar, AvatarStack, Btn, Empty, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Bar, PeoplePill, takePendingGroupTab } from '@/ui/GroupParts';
import { Icon, IconName } from '@/ui/Icon';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'chat' | 'events' | 'shared';
const ME = 'あなた';
const QUIZ = { q: 'inevitable の意味は？', o: ['避けられない', 'ありえない', '目に見えない'], a: 0 };

const push = (id: string, ...m: ChatMsg[]) => updateGroup(id, (g) => ({ ...g, msgs: [...g.msgs, ...m] }));

export default function GroupScreen() {
  const t = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useStore((s) => s.groups.find((x) => x.id === id) ?? s.groups[0]);
  const [tab, setTab] = useState<Tab>('chat');
  useFocusEffect(useCallback(() => { const p = takePendingGroupTab(); if (p) setTab(p as Tab); }, []));
  return (
    <Screen>
      <NavBar title={g.n} right={<IconBtn name="userPlus" label="メンバーを招待" onPress={() => toast('招待リンクをコピーしました', `${g.n} · ${g.join}`)} />} />
      <UnderTabs value={tab} onChange={setTab} options={[{ v: 'chat', label: 'チャット' }, { v: 'events', label: 'イベント' }, { v: 'shared', label: '共有' }]} />
      {tab === 'chat' ? <Chat g={g} /> : tab === 'events' ? <Events g={g} /> : <Shared g={g} />}
    </Screen>
  );
}

// ---------- chat ----------
function Chat({ g }: { g: Group }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const running = useStore((s) => s.running);
  const subjId = useStore((s) => s.subj);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [text, setText] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const present = (running ? [[ME, '#6E56CF', subj(subjId).name] as [string, string, string]] : []).concat(g.studying);

  const join = (who: string) => {
    if (getState().running) { toast('もう勉強中です'); return; }
    startStudy();
    haptic.success();
    push(g.id, { kind: 'sys', t: `${ME} が ${who} と一緒に始めました` });
    toast(`${who}と一緒に始めました`, '記録はタイマーを止めたときに残ります');
  };
  const send = () => {
    const v = text.trim();
    if (!v) return;
    haptic.soft();
    push(g.id, { kind: 'me', t: v });
    setText('');
    setTimeout(() => push(g.id, { kind: 'msg', n: 'そら', c: '#4A5BD4', t: 'いいね、一緒にやろう' }), 1300);
  };
  const quick = (q: string) => {
    const s = getState();
    if (q === 'start') {
      if (s.running) { toast('もう勉強中です', `${subj(s.subj).name} ${hms(elapsedOf(s))}`); return; }
      startStudy();
      haptic.success();
      push(g.id, { kind: 'sys', t: `${ME} が ${subj(s.subj).name} を始めました` });
      toast(`${subj(s.subj).name}を始めました`, '記録はタイマーを止めたときに残ります');
    }
    if (q === 'together') {
      push(g.id, { kind: 'card', me: true, card: 'together', joined: [ME] });
      setTimeout(() => {
        updateGroup(g.id, (x) => {
          const msgs = [...x.msgs];
          for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (m.kind === 'card' && m.card === 'together') { msgs[i] = { ...m, joined: [...(m.joined ?? []), 'そら'] }; break; }
          }
          return { ...x, msgs: [...msgs, { kind: 'sys', t: 'そら が参加しました · 2人で勉強中' }] };
        });
        toast('そらが参加しました', '一緒に勉強しよう');
      }, 1800);
    }
    if (q === 'goal') push(g.id, { kind: 'card', me: true, card: 'goal' });
    if (q === 'quiz') push(g.id, { kind: 'card', me: true, card: 'quiz' });
    if (q === 'ask') { setText(`【質問・${subj(s.subj).name}】`); input.current?.focus(); }
  };

  const QA: { q: string; label: string; icon: IconName }[] = [
    { q: 'start', label: '勉強を始める', icon: 'play' },
    { q: 'together', label: '一緒に勉強する', icon: 'userPlus' },
    { q: 'goal', label: '今日の目標を宣言', icon: 'target' },
    { q: 'quiz', label: '問題を出す', icon: 'q' },
    { q: 'ask', label: '質問する', icon: 'chat' },
  ];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* who's studying right now */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: t.surface, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
        <AvatarStack people={present.map((p) => ({ n: p[0], c: p[1] }))} size={26} ring={t.surface} max={3} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13.5} w="600" lh={19}>{present.length}人が勉強中</Txt>
          <Txt size={12} tone="ink3" numberOfLines={1} lh={17}>{present.map((p) => `${p[0]} ${p[2]}`).join(' · ')}</Txt>
        </View>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: mounted.current })} keyboardDismissMode="interactive">
        {g.msgs.map((m, i) => <Msg key={i} m={m} i={i} g={g} onJoin={join} />)}
      </ScrollView>
      {/* dock: quick study actions above the composer */}
      <View style={{ backgroundColor: t.surface, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom, 8) }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingTop: 10 }}>
          {QA.map((a) => {
            const go = a.q === 'start';
            return (
              <Press key={a.q} onPress={() => quick(a.q)} scale={0.94}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 13, borderRadius: 11,
                  backgroundColor: go ? t.green : t.surface, borderWidth: go ? 0 : StyleSheet.hairlineWidth * 2, borderColor: t.line2 }}>
                <Icon name={a.icon} size={15} color={go ? '#fff' : t.ink} />
                <Txt size={13} w="600" color={go ? '#fff' : t.ink}>{a.label}</Txt>
              </Press>
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 8 }}>
          <TextInput ref={input} value={text} onChangeText={setText} placeholder="メッセージ" placeholderTextColor={t.ink3} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="メッセージ"
            style={{ flex: 1, height: 42, borderRadius: 21, paddingHorizontal: 16, backgroundColor: t.sunken, color: t.ink, fontSize: 15, fontFamily: font.ui }} />
          <Press onPress={send} disabled={!text.trim()} scale={0.88} accessibilityLabel="送信"
            style={{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: text.trim() ? t.ink : t.sunken }}>
            <Icon name="send" size={18} color={text.trim() ? t.onInk : t.ink3} />
          </Press>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Msg({ m, i, g, onJoin }: { m: ChatMsg; i: number; g: Group; onJoin: (w: string) => void }) {
  const t = useT();
  const enter = FadeInDown.duration(260);
  if (m.kind === 'sys') {
    return (
      <Animated.View entering={enter} style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: m.join ? 4 : 5, paddingLeft: 12, paddingRight: m.join ? 4 : 12, borderRadius: 14, backgroundColor: t.sunken }}>
        {m.join ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.green }} /> : null}
        <Txt size={12} tone="ink2">{m.t}</Txt>
        {m.join ? (
          <Press onPress={() => onJoin(m.join!)} scale={0.92} haptics={false} style={{ height: 28, paddingHorizontal: 11, borderRadius: 10, backgroundColor: t.surface, justifyContent: 'center' }}>
            <Txt size={12} w="700" tone="greenInk">一緒に始める</Txt>
          </Press>
        ) : null}
      </Animated.View>
    );
  }
  const body = m.kind === 'card' ? <Card m={m} i={i} g={g} /> : (
    <View style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, maxWidth: 260,
      backgroundColor: m.kind === 'me' ? t.ink : t.surface, borderWidth: m.kind === 'me' ? 0 : StyleSheet.hairlineWidth * 2, borderColor: t.line,
      borderBottomRightRadius: m.kind === 'me' ? 5 : 16, borderBottomLeftRadius: m.kind === 'me' ? 16 : 5 }}>
      <Txt size={15} lh={22} color={m.kind === 'me' ? t.onInk : t.ink}>{m.t}</Txt>
    </View>
  );
  if (m.kind === 'me' || (m.kind === 'card' && m.me)) return <Animated.View entering={enter} style={{ alignItems: 'flex-end' }}>{body}</Animated.View>;
  const who = m.kind === 'msg' ? m : { n: 'そら', c: '#4A5BD4' };
  return (
    <Animated.View entering={enter} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Avatar name={who.n} color={who.c} size={28} />
      <View>
        <Txt size={11.5} tone="ink3" style={{ marginLeft: 4, marginBottom: 2 }}>{who.n}</Txt>
        {body}
      </View>
    </Animated.View>
  );
}

function Card({ m, i, g }: { m: Extract<ChatMsg, { kind: 'card' }>; i: number; g: Group }) {
  const t = useT();
  const todayMin = useStore((s) => s.todayMin);
  const subjId = useStore((s) => s.subj);
  const set = (fn: (c: typeof m) => typeof m) => updateGroup(g.id, (x) => ({ ...x, msgs: x.msgs.map((y, k) => (k === i && y.kind === 'card' ? fn(y) : y)) }));
  const box = { width: 264, padding: 14, gap: 10, borderRadius: 16, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line2 } as const;
  if (m.card === 'together') {
    const joined = m.joined ?? [];
    const mine = joined.includes(ME);
    return (
      <View style={box}>
        <View>
          <Txt size={14.5} w="700">一緒に勉強しよう</Txt>
          <Txt size={12.5} tone="ink3">{subj(subjId).name} · 25分×2 · 今から</Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <PeoplePill names={joined} ring={t.sunken} />
          <Btn small kind={mine ? 'quiet' : 'primary'} label={mine ? '参加中' : '参加する'} onPress={() => set((c) => ({ ...c, joined: mine ? joined.filter((n) => n !== ME) : [...joined, ME] }))} />
        </View>
      </View>
    );
  }
  if (m.card === 'goal') {
    const p = Math.min(100, Math.round((todayMin / 180) * 100));
    return (
      <View style={box}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Txt size={14.5} w="700">今日の目標：3時間</Txt>
          <Txt num size={14} w="600" tone="greenInk">{p}%</Txt>
        </View>
        <Bar pct={p} h={6} />
        <Txt size={12} tone="ink3">達成するとグループにお知らせします</Txt>
      </View>
    );
  }
  const ans = m.answered;
  return (
    <View style={box}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt size={14.5} w="700">{QUIZ.q}</Txt>
        <Txt size={12} tone="ink3">英単語</Txt>
      </View>
      <View style={{ gap: 6 }}>
        {QUIZ.o.map((o, k) => {
          const right = ans !== undefined && k === QUIZ.a;
          const wrong = ans !== undefined && k === ans && k !== QUIZ.a;
          return (
            <Press key={o} disabled={ans !== undefined && !right && !wrong} scale={0.97}
              onPress={() => { if (ans !== undefined) return; k === QUIZ.a ? haptic.success() : haptic.warn(); set((c) => ({ ...c, answered: k })); }}
              style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: right ? t.greenSoft : wrong ? t.redSoft : t.sunken }}>
              <Txt size={14} w={right || wrong ? '600' : '500'} tone={right ? 'greenInk' : wrong ? 'red' : 'ink'} style={{ flex: 1 }}>{o}</Txt>
              {right ? <Icon name="check" size={16} color={t.greenInk} width={2.6} /> : wrong ? <Icon name="x" size={14} color={t.red} /> : null}
            </Press>
          );
        })}
      </View>
      {ans !== undefined ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Txt size={12.5} w="600" tone={ans === QUIZ.a ? 'greenInk' : 'red'}>{ans === QUIZ.a ? '正解' : `惜しい。正解は「${QUIZ.o[QUIZ.a]}」`}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------- events ----------
function Events({ g }: { g: Group }) {
  const t = useT();
  // Clear the "just planned" highlight once it has been seen.
  useEffect(() => () => { if (g.events.some((e) => e.fresh)) updateGroup(g.id, (x) => ({ ...x, events: x.events.map((e) => ({ ...e, fresh: false })) })); }, [g.id, g.events]);
  const toggle = (e: GEvent) => {
    const on = !e.me;
    const set = (me: boolean) => updateGroup(g.id, (x) => ({ ...x, events: x.events.map((y) => (y.id === e.id ? { ...y, me } : y)) }));
    set(on);
    if (on) {
      haptic.success();
      toast(`「${e.t}」に参加しました`, `${e.mo}月${e.d}日 ${e.time} · 前日にお知らせします`, { label: '取り消す', run: () => set(false) });
    }
  };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Btn kind="primary" wide icon="plus" label="イベントを企画する" onPress={() => router.push({ pathname: '/plan-event', params: { g: g.id } })} />
      </View>
      {g.events.length ? g.events.map((e) => <EventRow key={e.id} e={e} onToggle={() => toggle(e)} />) : (
        <Empty title="予定されているイベントはありません" sub="もくもく会や時間チャレンジを企画してみましょう" />
      )}
    </ScrollView>
  );
}

function EventRow({ e, onToggle }: { e: GEvent; onToggle: () => void }) {
  const t = useT();
  const glow = useSharedValue(e.fresh ? 1 : 0);
  useEffect(() => { if (e.fresh) glow.value = withDelay(900, withTiming(0, { duration: 1400 })); }, [e.fresh, glow]);
  const ga = useAnimatedStyle(() => ({ opacity: glow.value }));
  const names = (e.me ? [ME] : []).concat(e.joined);
  return (
    <Animated.View entering={e.fresh ? FadeInDown.duration(360) : undefined} layout={LinearTransition.duration(240)}
      style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.greenSoft }, ga]} />
      <View style={{ width: 40, alignItems: 'center' }}>
        <Txt num size={24} w="700" lh={28}>{e.d}</Txt>
        <Txt size={11.5} tone="ink3">{e.mo}月 {e.w}</Txt>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt size={15} w="600">{e.t}</Txt>
        <Txt size={12.5} tone="ink3">{e.type} · {e.time} · 定員{e.cap}人</Txt>
        {e.goal ? (
          <View style={{ marginTop: 6, gap: 5 }}>
            <Bar pct={((e.done ?? 0) / e.goal) * 100} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={12} tone="ink2">みんなの合計 {e.done}時間</Txt>
              <Txt num size={12} tone="ink3">{e.goal}時間</Txt>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {names.length ? <PeoplePill names={names} ring={t.sunken} /> : <Txt size={12.5} tone="ink3">まだ誰も参加していません</Txt>}
          <Btn small kind={e.me ? 'quiet' : 'primary'} label={e.me ? '参加中' : '参加する'} onPress={onToggle} />
        </View>
      </View>
    </Animated.View>
  );
}

// ---------- shared ----------
function Shared({ g }: { g: Group }) {
  const t = useT();
  const [saved, setSaved] = useState<string[]>([]);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Txt size={12.5} tone="ink3" style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>画像（ノートの写真など）はここからだけ共有できます</Txt>
      {g.shared.length ? g.shared.map(([kind, title, meta]) => {
        const on = saved.includes(title);
        return (
          <View key={title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: t.line }}>
            <Thumb video={kind === 'video'} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14.5} w="500" numberOfLines={2} lh={21}>{title}</Txt>
              <Txt size={12} tone="ink3">{meta}</Txt>
            </View>
            <Btn small kind={on ? 'ghost' : 'quiet'} label={on ? '保存済み' : '保存'} done={on}
              onPress={() => { if (on) { setSaved(saved.filter((x) => x !== title)); return; } setSaved([...saved, title]); haptic.success(); toast('保存しました', 'マイページの「保存」から見られます'); }} />
          </View>
        );
      }) : <Empty title="まだ何も共有されていません" sub="ノートの写真や役に立った動画を共有できます" />}
    </ScrollView>
  );
}

function Thumb({ video }: { video: boolean }) {
  const t = useT();
  if (video) {
    return (
      <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: t.dark ? t.sunken : t.ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="play" size={20} color={t.dark ? t.ink : t.onInk} />
      </View>
    );
  }
  return (
    <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line2, paddingHorizontal: 9, paddingTop: 11, gap: 6 }}>
      {[1, 0.8, 1, 0.55].map((w, k) => <View key={k} style={{ height: 2, width: `${w * 100}%`, borderRadius: 1, backgroundColor: t.line2 }} />)}
    </View>
  );
}
