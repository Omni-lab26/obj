import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMsg, GEvent, Group, hms, subj } from '@/data';
import { PHOTO } from '@/photos';
import { elapsedOf, getState, startStudy, updateGroup, useStore } from '@/store';
import { font, hair, lift, noOutline, radius, useT } from '@/theme';
import { Avatar, AvatarStack, Btn, Empty, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Bar, LiveDot, PeoplePill, takePendingGroupTab } from '@/ui/GroupParts';
import { Icon, IconName } from '@/ui/Icon';
import { DateTile } from '@/ui/HomeParts';
import { Inch, Stamp, STAMPS } from '@/ui/Sticker';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'chat' | 'events' | 'shared';
const ME = 'あなた';
const QUIZ = { q: 'inevitable の意味は？', o: ['避けられない', 'ありえない', '目に見えない'], a: 0 };

const push = (id: string, ...m: ChatMsg[]) => updateGroup(id, (g) => ({ ...g, msgs: [...g.msgs, ...m] }));

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const g = useStore((s) => s.groups.find((x) => x.id === id) ?? s.groups[0]);
  const [tab, setTab] = useState<Tab>('chat');
  useFocusEffect(useCallback(() => { const p = takePendingGroupTab(); if (p) setTab(p as Tab); }, []));
  return (
    <Screen>
      <NavBar title={g.n} right={<IconBtn filled name="userPlus" label="メンバーを招待" onPress={() => toast('招待リンクをコピーしました', `${g.n} · ${g.join}`)} />} />
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
  const [tray, setTray] = useState(false);
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
  // A stamp goes out at once; someone usually answers with one of their own.
  const REPLY: Record<string, string> = { ganbaro: 'erai', phone: 'erai', ohayo: 'ohayo', oyasumi: 'oyasumi', muri: 'ganbaro', arigato: 'ok', issho: 'ok', otsu: 'otsu' };
  const sendStamp = (id: string) => {
    haptic.soft();
    push(g.id, { kind: 'stamp', s: id });
    const back = REPLY[id];
    if (back) setTimeout(() => push(g.id, { kind: 'stamp', s: back, n: 'そら', c: '#4A5BD4' }), 1500);
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
    { q: 'goal', label: '今日の目標', icon: 'target' },
    { q: 'quiz', label: '問題を出す', icon: 'q' },
    { q: 'ask', label: '質問する', icon: 'chat' },
  ];
  const can = !!text.trim();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: 16, gap: 8 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: mounted.current })} keyboardDismissMode="interactive">
        {/* who's studying right now */}
        <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <AvatarStack people={present.map((p) => ({ n: p[0], c: p[1] }))} size={22} ring={t.canvas} max={4} />
          <LiveDot size={6} />
          <Txt size={12} tone="ink2">{`${present.length}人が勉強中`}</Txt>
        </View>
        {g.msgs.map((m, i) => <Msg key={i} m={m} i={i} g={g} onJoin={join} prev={g.msgs[i - 1]} />)}
      </ScrollView>
      {/* the composer floats on glass, quick study actions above it */}
      <View style={{ paddingBottom: Math.max(insets.bottom, 10), gap: 8 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
          {QA.map((a) => (
            <Press key={a.q} onPress={() => quick(a.q)} scale={0.94} hitSlop={{ top: 6, bottom: 6 }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
              <Icon name={a.icon} size={14} color={a.q === 'start' ? t.green : t.ink} width={2} />
              <Txt size={12.5} w="600">{a.label}</Txt>
            </Press>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }}>
          {/* Instagram's DM bar: a round button on the left (stamps), the field, "送信" in blue */}
          <View style={{ flex: 1, height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 5, paddingRight: 14, borderRadius: 23, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
            <Press onPress={() => { haptic.tap(); setTray((x) => !x); }} haptics={false} scale={0.88} accessibilityLabel={tray ? 'スタンプを閉じる' : 'スタンプ'} accessibilityState={{ expanded: tray }}
              style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: tray ? t.sunken : t.blue }}>
              {tray ? <Icon name="x" size={15} color={t.ink} width={2.4} /> : <Inch pose="up" eyes="happy" size={34} border={false} />}
            </Press>
            <TextInput ref={input} onFocus={() => setTray(false)} value={text} onChangeText={setText} placeholder="メッセージ..." placeholderTextColor={t.ink3} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="メッセージ"
              style={[{ flex: 1, height: 44, color: t.ink, fontSize: 15, fontFamily: font.text }, noOutline]} />
            {can ? (
              <Press onPress={send} scale={0.9} hitSlop={8} accessibilityLabel="送信"><Txt size={15} w="700" color={t.blue}>送信</Txt></Press>
            ) : null}
          </View>
        </View>
        {tray ? (
          <Animated.View entering={FadeInDown.duration(200)} style={{ marginHorizontal: 8 }}>
            <View style={[{ flexDirection: 'row', flexWrap: 'wrap', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 24, backgroundColor: t.surface }, lift(t, 2)]}>
              {STAMPS.map((x) => (
                <View key={x.id} style={{ width: '25%', alignItems: 'center', paddingVertical: 4 }}>
                  <Press onPress={() => sendStamp(x.id)} haptics={false} scale={0.86} accessibilityLabel={`スタンプ「${x.label}」を送る`}>
                    <Stamp id={x.id} size={72} />
                  </Press>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

// Messages-style thread: your bubbles in the tint, others' in system grey,
// system lines as small grey text, stamps without a bubble.
function Msg({ m, i, g, onJoin, prev }: { m: ChatMsg; i: number; g: Group; onJoin: (w: string) => void; prev?: ChatMsg }) {
  const t = useT();
  const enter = FadeInDown.duration(260);
  if (m.kind === 'sys') {
    return (
      <Animated.View entering={enter} style={{ alignSelf: 'center', alignItems: 'center', gap: 6, marginVertical: 6 }}>
        <Txt size={12} tone="ink3" style={{ textAlign: 'center' }}>{m.t}</Txt>
        {m.join ? <Btn small kind="tint" icon="play" label="一緒に始める" onPress={() => onJoin(m.join!)} /> : null}
      </Animated.View>
    );
  }
  const mine = m.kind === 'me' || (m.kind === 'card' && m.me) || (m.kind === 'stamp' && !m.n);
  const body = m.kind === 'card' ? <Card m={m} i={i} g={g} /> : m.kind === 'stamp' ? <Stamp id={m.s} size={104} pop /> : (
    <View style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, maxWidth: 260, backgroundColor: mine ? t.ink : '#EFEFF1' }}>
      <Txt size={14.5} lh={20} color={mine ? '#fff' : t.ink}>{m.t}</Txt>
    </View>
  );
  if (mine) return <Animated.View entering={enter} style={{ alignItems: 'flex-end' }}>{body}</Animated.View>;
  const who = m.kind === 'msg' ? m : m.kind === 'stamp' && m.n ? { n: m.n, c: m.c ?? '#4A5BD4' } : { n: 'そら', c: '#4A5BD4' };
  const prevWho = prev && (prev.kind === 'msg' || (prev.kind === 'stamp' && prev.n)) ? (prev as { n: string }).n : null;
  return (
    <Animated.View entering={enter} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <Avatar name={who.n} color={who.c} size={26} />
      <View>
        {prevWho === who.n ? null : <Txt size={11.5} tone="ink3" style={{ marginLeft: 12, marginBottom: 2 }}>{who.n}</Txt>}
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
  const box = { width: 264, padding: 14, gap: 10, borderRadius: 20, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line } as const;
  if (m.card === 'together') {
    const joined = m.joined ?? [];
    const mine = joined.includes(ME);
    return (
      <View style={box}>
        <View>
          <Txt size={14} w="700">一緒に勉強しよう</Txt>
          <Txt size={13} tone="ink3">{subj(subjId).name} · 25分×2 · 今から</Txt>
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
          <Txt size={14} w="700">今日の目標：3時間</Txt>
          <Txt num size={13} w="600" tone="greenInk">{p}%</Txt>
        </View>
        <Bar pct={p} h={6} />
        <Txt size={13} tone="ink3">達成するとグループにお知らせします</Txt>
      </View>
    );
  }
  const ans = m.answered;
  return (
    <View style={box}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Txt size={14} w="700">{QUIZ.q}</Txt>
        <Txt size={13} tone="ink3">英単語</Txt>
      </View>
      <View style={{ gap: 6 }}>
        {QUIZ.o.map((o, k) => {
          const right = ans !== undefined && k === QUIZ.a;
          const wrong = ans !== undefined && k === ans && k !== QUIZ.a;
          return (
            <Press key={o} disabled={ans !== undefined && !right && !wrong} scale={0.97}
              onPress={() => { if (ans !== undefined) return; if (k === QUIZ.a) haptic.success(); else haptic.warn(); set((c) => ({ ...c, answered: k })); }}
              style={{ height: 40, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: hair, borderColor: t.line,
                backgroundColor: right ? t.greenSoft : wrong ? t.redSoft : t.sunken }}>
              <Txt size={16} w={right || wrong ? '600' : '500'} tone={right ? 'greenInk' : wrong ? 'red' : 'ink'} style={{ flex: 1 }}>{o}</Txt>
              {right ? <Icon name="check" size={16} color={t.greenInk} width={2.6} /> : wrong ? <Icon name="x" size={14} color={t.red} /> : null}
            </Press>
          );
        })}
      </View>
      {ans !== undefined ? (
        <Animated.View entering={FadeIn.duration(200)}>
          <Txt size={12} w="600" tone={ans === QUIZ.a ? 'greenInk' : 'red'}>{ans === QUIZ.a ? '正解' : `惜しい。正解は「${QUIZ.o[QUIZ.a]}」`}</Txt>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------- events ----------
function Events({ g }: { g: Group }) {
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
      <View style={{ padding: 16, paddingBottom: 14 }}>
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
      style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 10, padding: 16, borderRadius: radius.card, backgroundColor: t.surface }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.greenSoft, borderRadius: radius.card }, ga]} />
      <DateTile mo={e.mo} d={e.d} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Txt size={14.5} w="600">{e.t}</Txt>
        <Txt size={13} tone="ink3">{e.type} · {e.time} · 定員{e.cap}人</Txt>
        {e.goal ? (
          <View style={{ marginTop: 6, gap: 5 }}>
            <Bar pct={((e.done ?? 0) / e.goal) * 100} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Txt size={13} tone="ink2">みんなの合計 {e.done}時間</Txt>
              <Txt num size={13} tone="ink3">{e.goal}時間</Txt>
            </View>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          {names.length ? <PeoplePill names={names} ring={t.sunken} /> : <Txt size={13} tone="ink3">まだ誰も参加していません</Txt>}
          <Btn small kind={e.me ? 'quiet' : 'primary'} label={e.me ? '参加中' : '参加する'} onPress={onToggle} />
        </View>
      </View>
    </Animated.View>
  );
}

// ---------- shared ----------
// The one place pictures live: a grid of what people shared, photo first.
const SHARED_PHOTO = [PHOTO.noteDesk, PHOTO.noteVideo, PHOTO.noteBook];
function Shared({ g }: { g: Group }) {
  const t = useT();
  const [saved, setSaved] = useState<string[]>([]);
  const cell = Math.floor((useWindowDimensions().width - 28 - 10) / 2);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {g.shared.length ? g.shared.map(([kind, title, meta], i) => {
        const on = saved.includes(title);
        return (
          <View key={title} style={{ width: cell }}>
            <View>
              <Image source={SHARED_PHOTO[i % SHARED_PHOTO.length]} style={{ width: cell, height: cell, borderRadius: radius.inner, backgroundColor: t.sunken }} resizeMode="cover" />
              {kind === 'video' ? (
                <View style={{ position: 'absolute', left: 8, bottom: 8, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                  <Icon name="play" size={13} color="#fff" />
                  <Txt num size={13} w="600" color="#fff">15:02</Txt>
                </View>
              ) : null}
              <Press onPress={() => { if (on) { setSaved(saved.filter((x) => x !== title)); return; } setSaved([...saved, title]); haptic.success(); toast('保存しました'); }}
                scale={0.86} haptics={false} accessibilityLabel={on ? '保存済み' : '保存'}
                style={{ position: 'absolute', right: 8, top: 8, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.green : 'rgba(0,0,0,0.45)' }}>
                <Icon name={on ? 'check' : 'plus'} size={15} color="#fff" width={2.4} />
              </Press>
            </View>
            <Txt size={13} w="600" numberOfLines={2} lh={18} style={{ marginTop: 7 }}>{title}</Txt>
            <Txt size={13} tone="ink3">{meta}</Txt>
          </View>
        );
      }) : <View style={{ width: '100%' }}><Empty title="まだ何も共有されていません" sub="ノートの写真や、役に立った動画をここに" /></View>}
    </ScrollView>
  );
}
