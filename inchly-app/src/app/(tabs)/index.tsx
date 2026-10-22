import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, pad, PEOPLE, SUBJ, subj } from '@/data';
import { dayOf, studiedOn } from '@/lib/history';
import { jpDate } from '@/lib/time';
import { elapsedOf, setSubject, startStudy, togglePause, updateTodo, useNow, useStore, useStreak } from '@/store';
import { hair, lift, radius, type, useT } from '@/theme';
import { Avatar, AvatarStack, Btn, Card, haptic, IconBtn, Press, SubjCoin, Txt } from '@/ui/base';
import { InchTape, Wordmark } from '@/ui/Brand';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { MiniSeg, TodoRow } from '@/ui/HomeParts';
import { daysUntil, deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { LiveDot } from '@/ui/GroupParts';
import { Sticker } from '@/ui/Sticker';
import { StudyChartCard } from '@/ui/StudyChart';
import { toast } from '@/ui/Toast';


// Home has one lead: how much you studied today, on the tape. Everything else
// is smaller and shaped differently, so the eye has an order to follow.
export default function Home() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const unread = useUnread();
  const tabPad = useTabPad();
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const done = s.todos.filter((x) => x.d).length;
  const me = s.account?.name ?? 'はる';

  // Hero digits roll up from zero once the screen is shown.
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';
  const [joined, setJoined] = useState(false);

  const onToggle = (id: string) => {
    const willAll = s.todos.every((x) => (x.id === id ? !x.d : x.d));
    const td = s.todos.find((x) => x.id === id);
    if (td) updateTodo(id, { d: !td.d });
    if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり'); }
  };
  const joinPeers = () => {
    if (s.running) { toast('もう勉強中です', `${sj.name} ${hms(e)}`); return; }
    startStudy();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  // deadlines, nearest first; progress comes from the ToDos tied to each
  const deadlines = s.deadlines
    .map((d) => {
      const linked = s.todos.filter((x) => x.dl === d.id);
      return { ...d, days: daysUntil(d.mo, d.day), done: linked.filter((x) => x.d).length, total: linked.length };
    })
    .sort((a, b) => a.days - b.days);
  const next = deadlines[0];
  const yesterday = dayOf(s.sessions, 1).min;
  const diff = s.todayMin - yesterday;
  // today's minutes by subject, straight from today's records
  const today = s.sessions.filter((x) => x.date === s.lastDay);
  const parts = SUBJ.map((x) => ({ name: x.name, c: x.c, min: today.filter((r) => r.s === x.id).reduce((a, r) => a + r.min, 0) }));
  const peers = PEOPLE.filter((p) => !s.blocked.includes(p.n)).slice(0, 3);
  return (
    <Screen>
      {/* header: brand, not a page title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 16, paddingTop: 6, height: 52 }}>
        <Wordmark size={19} />
        <View style={{ flex: 1 }} />
        <IconBtn outline name="search" label="さがす" onPress={() => router.push('/search')} />
        <IconBtn outline name="bell" label="お知らせ" dot={unread > 0} onPress={() => router.push('/notifications')} />
        <Press onPress={() => router.navigate('/me')} scale={0.9} accessibilityLabel="マイページ" style={{ marginLeft: 2 }}>
          <Avatar name={me} color="#6E56CF" size={34} />
        </Press>
        {/* everything about the app, one place: the gear at the top right */}
        <IconBtn outline name="gear" label="設定" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabPad }}>
        {/* the lead: today's total, like a wallet's balance card */}
        <Card style={{ marginHorizontal: 16, marginTop: 6 }} pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>{`今日の勉強 · ${jpDate(new Date())}`}</Txt>
            {next ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, height: 20, borderRadius: 6, backgroundColor: t.sunken }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.amber }} />
              <Txt size={10.5} tone="ink2" lh={13}>{`${next.t}まで `}<Txt size={10.5} w="700" num lh={13}>{next.days}</Txt>日</Txt>
            </View> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }} accessible accessibilityLabel={`今日 ${Math.floor(s.todayMin / 60)}時間${s.todayMin % 60}分。昨日より${diff}分`}>
            <Rolling value={H} size={type.hero} weight="700" />
            <Txt size={13} w="600" tone="ink3" style={{ marginLeft: 2, marginRight: 6, marginBottom: 4 }}>時間</Txt>
            <Rolling value={M} size={type.hero} weight="700" />
            <Txt size={13} w="600" tone="ink3" style={{ marginLeft: 2, marginBottom: 4 }}>分</Txt>
            <View style={{ flex: 1 }} />
            {/* gains are green, like "+8.24% (24h)" on a wallet */}
            <View style={{ alignItems: 'flex-end', marginBottom: 3 }}>
              <Txt num size={12} w="700" lh={15} color={diff >= 0 ? t.greenInk : t.red}>{`${diff >= 0 ? '▲' : '▼'} ${Math.floor(Math.abs(diff) / 60)}:${pad(Math.abs(diff) % 60)}`}</Txt>
              <Txt size={10.5} tone="ink3" lh={13}>昨日より</Txt>
            </View>
          </View>
          <View style={{ marginTop: 18 }}>
            <InchTape minutes={s.todayMin} goal={s.goalMin} parts={parts} />
          </View>

          {/* now: one live row when studying, a start button when not — never both */}
          {s.running ? (
            <Press onPress={() => router.push('/timer')} scale={0.98} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`}
              style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 6, borderRadius: radius.inner,
                backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line }}>
              <SubjCoin name={sj.name} color={sj.c} size={30} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <LiveDot size={5} color={s.paused ? t.amber : undefined} />
                  <Txt size={11} tone="ink3" lh={14}>{s.paused ? '一時停止中' : '勉強中'}</Txt>
                </View>
                <Txt size={13} w="600" lh={18} numberOfLines={1}>{sj.name}<Txt size={12} tone="ink2">{`  ${sj.task}`}</Txt></Txt>
              </View>
              <Txt num size={15} w="600">{hms(e)}</Txt>
              <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.88} accessibilityLabel={s.paused ? '再開' : '一時停止'} hitSlop={7}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.paused ? 'play' : 'pause'} size={13} color={t.ink} />
              </Press>
            </Press>
          ) : (
            <View style={{ marginTop: 14 }}>
              <Press onPress={() => { haptic.firm(); startStudy(); }} haptics={false} scale={0.97} accessibilityLabel={`${sj.name}を始める`}
                style={{ height: 44, borderRadius: radius.inner, backgroundColor: t.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Icon name="play" size={13} color={t.onInk} />
                <Txt size={14} w="600" color={t.onInk}>{sj.name}を始める</Txt>
              </Press>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                {SUBJ.map((x) => {
                  const on = x.id === s.subj;
                  return (
                    <Press key={x.id} onPress={() => setSubject(x.id)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 9, bottom: 9, left: 2, right: 2 }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 13,
                        backgroundColor: on ? t.sunken : 'transparent', borderWidth: hair, borderColor: on ? t.line2 : 'transparent' }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c }} />
                      <Txt size={12} w={on ? '600' : '500'} tone={on ? 'ink' : 'ink3'}>{x.name}</Txt>
                    </Press>
                  );
                })}
              </View>
            </View>
          )}
        </Card>

        {/* streak: a small black capsule, the week as dots */}
        <StreakPill />

        {/* today hour by hour, or this week day by day */}
        <StudyChartCard />

        {/* today's list */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">今日やること</Txt>
          <Txt size={12} w="500" tone="ink3" num style={{ flex: 1 }}>{`${done}/${s.todos.length}`}</Txt>
          <AddLink label="追加" onPress={() => todoSheet()} />
        </View>
        <Card style={{ marginHorizontal: 16 }} pad={0}>
          {s.todos.map((td, i) => <TodoRow key={td.id} todo={td} first={i === 0} onToggle={() => onToggle(td.id)} onEdit={() => todoSheet(td)} />)}
          {s.todos.length ? null : (
            <Press onPress={() => todoSheet()} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Txt size={13} tone="ink3">やることを1つ決めておくと、始めるのが早くなります</Txt>
            </Press>
          )}
        </Card>

        {/* deadlines: a portfolio-style list */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">締切</Txt>
          <Txt size={12} w="500" tone="ink3" style={{ flex: 1 }}>ToDoの進み具合</Txt>
          <AddLink label="追加" onPress={deadlineSheet} />
        </View>
        <Card style={{ marginHorizontal: 16 }} pad={0}>
          {deadlines.length ? null : (
            <Press onPress={deadlineSheet} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Txt size={13} tone="ink3">模試や申込の日を入れておきましょう</Txt>
            </Press>
          )}
          {deadlines.map((d, i) => (
            <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityLabel={`${d.t} あと${d.days}日`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
              {i ? <View style={{ position: 'absolute', top: 0, left: 58, right: 0, height: hair, backgroundColor: t.line }} /> : null}
              <Sticker name={d.days <= 21 ? 'flag' : i === 1 ? 'cal' : 'trophy'} size={36} tilt={i % 2 ? 6 : -6} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{d.t}</Txt>
                <Txt size={11} tone="ink3" lh={15}>{`${d.mo}月${d.day}日 · ${d.total ? `ToDo ${d.done}/${d.total}` : 'ToDoなし'}`}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Txt num size={14} w="700" lh={17} color={d.days <= 21 ? t.amber : t.ink}>{d.days}<Txt size={11} w="500" tone="ink3"> 日</Txt></Txt>
                {d.total ? <MiniSeg done={d.done} total={Math.min(d.total, 8)} /> : null}
              </View>
            </Press>
          ))}
        </Card>

        {/* peers */}
        <Press onPress={() => router.navigate('/community')} scale={0.985}
          style={[{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
          <AvatarStack ring={t.surface} size={28} max={4} people={[...(joined ? [{ n: me, c: '#6E56CF' }] : []), ...peers]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <LiveDot size={5} />
              <Txt size={13} w="600" lh={18}>{peers.length + 1 + (joined ? 1 : 0)}人が勉強中</Txt>
            </View>
            <Txt size={11} tone="ink3" numberOfLines={1}>{peers.map((p) => p.n).join(' · ')}</Txt>
          </View>
          <Btn label={joined ? '勉強中' : '一緒に始める'} kind="tint" small onPress={joinPeers} disabled={joined} />
        </Press>

      </ScrollView>
    </Screen>
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

/**
 * The streak, after Caleb Wu's "day streak": a black capsule with the flame,
 * the count, and the week as dots. Tap it and the flame jumps.
 */
const DOW = ['月', '火', '水', '木', '金', '土', '日'];
function StreakPill() {
  const t = useT();
  const back = (new Date().getDay() + 6) % 7; // days since Monday
  const sessions = useStore((x) => x.sessions);
  const streak = useStreak();
  const tickets = useStore((x) => x.restTickets);
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const jump = () => {
    haptic.soft();
    s.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { duration: 520, dampingRatio: 0.4 })));
    r.set(withSequence(withTiming(-14, { duration: 110 }), withSpring(0, { duration: 520, dampingRatio: 0.4 })));
  };
  const dim = 'rgba(255,255,255,0.55)';
  return (
    <Press onPress={jump} haptics={false} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
      style={{ marginHorizontal: 16, marginTop: 12, height: 58, borderRadius: 29, backgroundColor: t.dark ? '#000' : '#0B0D12', flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 18,
        borderWidth: t.dark ? hair : 0, borderColor: t.line2 }}>
      <Animated.View style={a}><Sticker name="fire" size={42} /></Animated.View>
      <View style={{ marginLeft: 4 }}>
        <Rolling value={pad(streak)} size={17} weight="700" color="#fff" />
        <Txt size={11} color={dim} lh={14}>{`日連続 · 休み券 ${tickets}`}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DOW.map((w, i) => {
          const ago = back - i;
          const future = ago < 0;
          const studied = !future && studiedOn(sessions, ago);
          const today = ago === 0;
          return (
            <View key={w} style={{ alignItems: 'center', gap: 5 }}>
              <Txt size={10} w="600" lh={12} color={today ? '#fff' : dim}>{w}</Txt>
              <View style={{ width: 7, height: 7, borderRadius: 4,
                backgroundColor: today && studied ? '#FF7A1A' : studied ? '#fff' : 'transparent',
                borderWidth: studied ? 0 : 1, borderColor: dim, borderStyle: future ? 'dashed' : 'solid' }} />
            </View>
          );
        })}
      </View>
    </Press>
  );
}
