import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, pad, PEOPLE, subj } from '@/data';
import { dayOf, studiedOn } from '@/lib/history';
import { jpDate } from '@/lib/time';
import { endOf, suggestion } from '@/lib/timetable';
import { elapsedOf, startFrom, startStudy, togglePause, useNow, useStore, useStreak } from '@/store';
import { hair, lift, onColor, radius, type, useT } from '@/theme';
import { Avatar, AvatarStack, Btn, Card, haptic, IconBtn, Press, SubjCoin, Txt } from '@/ui/base';
import { InchTape, Wordmark } from '@/ui/Brand';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { MiniSeg } from '@/ui/HomeParts';
import { daysUntil, deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon } from '@/ui/Icon';
import { LevelChip } from '@/ui/Level';
import { Rolling } from '@/ui/Rolling';
import { LiveDot } from '@/ui/GroupParts';
import { Sticker } from '@/ui/Sticker';
import { StudyChart } from '@/ui/StudyChart';
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
  const me = s.account?.name ?? 'はる';

  // Hero digits roll up from zero once the screen is shown.
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';
  const [joined, setJoined] = useState(false);

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
  const parts = s.subjects.map((x) => ({ name: x.name, c: x.c, min: today.filter((r) => r.s === x.id).reduce((a, r) => a + r.min, 0) })).filter((x) => x.min > 0);
  const peers = PEOPLE.filter((p) => !s.blocked.includes(p.n)).slice(0, 3);
  return (
    <Screen>
      {/* header: brand, not a page title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 16, paddingTop: 6, height: 52 }}>
        <Wordmark size={19} />
        <LevelChip />
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

          {/* the graph, under the total: today by the hour, or this week by the day */}
          <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: hair, borderTopColor: t.line }}>
            <StudyChart />
          </View>

          {/* now, in one line: the session under way, or what's next (starting lives on the study page) */}
          <NowLine />
        </Card>

        {/* streak: a small black capsule, the week as dots */}
        <StreakPill />

        {/* ToDos live on the study page; here, how many are left and the next one */}
        <TodoLine />

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

/** One line at the foot of the 今日の勉強 card: studying now, or what's next with a start button. */
function NowLine() {
  const t = useT();
  const now = useNow();
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  const box = { marginTop: 14, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 6, borderRadius: radius.inner,
    backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line };
  if (s.running) {
    const e = elapsedOf(s, now);
    return (
      <Press onPress={() => router.push('/timer')} scale={0.98} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`} style={box}>
        <SubjCoin name={sj.name} color={sj.c} size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LiveDot size={5} color={s.paused ? t.amber : undefined} />
            <Txt size={11} tone="ink3" lh={14}>{s.paused ? '一時停止中' : '勉強中'}</Txt>
          </View>
          <Txt size={13} w="600" lh={18} numberOfLines={1}>{sj.name}<Txt size={12} tone="ink2">{`  ${s.todos.find((x) => x.id === s.studyTodo && x.s === s.subj)?.t ?? sj.task}`}</Txt></Txt>
        </View>
        <Txt num size={15} w="600">{hms(e)}</Txt>
        <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.88} accessibilityLabel={s.paused ? '再開' : '一時停止'} hitSlop={7}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={s.paused ? 'play' : 'pause'} size={13} color={t.ink} />
        </Press>
      </Press>
    );
  }
  // the timetable's block, else the first open ToDo, else the last subject
  const slot = suggestion(s.timetable, new Date(now));
  const todo = s.todos.find((x) => !x.d);
  const pick = slot ? { s: slot.block.s, what: slot.block.t ?? subj(slot.block.s).task, min: slot.block.min, when: slot.state === 'now' ? `いま · ${slot.block.start}〜${endOf(slot.block)}` : `次は · ${slot.block.start}から` }
    : todo ? { s: todo.s, what: todo.t, todoId: todo.id, when: '次は · ToDo' }
    : { s: s.subj, what: sj.task, when: '次は' };
  const p = subj(pick.s);
  const go = () => {
    startFrom({ s: pick.s, min: 'min' in pick ? pick.min : undefined, todoId: 'todoId' in pick ? pick.todoId : undefined });
    haptic.firm();
    router.push('/timer');
  };
  return (
    <Press onPress={() => router.navigate('/study')} scale={0.98} accessibilityLabel={`${pick.when} ${p.name} ${pick.what}。勉強のページを開く`} style={box}>
      <SubjCoin name={p.name} color={p.c} size={30} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={11} tone="ink3" lh={14}>{pick.when}</Txt>
        <Txt size={13} w="600" lh={18} numberOfLines={1}>{p.name}<Txt size={12} tone="ink2">{`  ${pick.what}`}</Txt></Txt>
      </View>
      <Press onPress={go} haptics={false} scale={0.9} hitSlop={7} accessibilityLabel={`${p.name}を始める`}
        style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: p.c, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="play" size={11} color={onColor(p.c)} />
        <Txt size={12.5} w="700" color={onColor(p.c)}>始める</Txt>
      </Press>
    </Press>
  );
}

/** How many ToDos are left and the next one; the list itself is on the study page. */
function TodoLine() {
  const t = useT();
  const todos = useStore((x) => x.todos);
  const done = todos.filter((x) => x.d).length;
  const next = todos.find((x) => !x.d);
  if (!todos.length) {
    return (
      <Press onPress={() => todoSheet()} scale={0.985} accessibilityLabel="ToDoを追加"
        style={[{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
        <Icon name="plus" size={14} color={t.ink} />
        <Txt size={13.5} w="600" style={{ flex: 1 }}>ToDoを追加</Txt>
        <Txt size={11.5} tone="ink3">やることを決めておくと始めやすい</Txt>
      </Press>
    );
  }
  return (
    <Press onPress={() => router.navigate('/study')} scale={0.985} accessibilityLabel={`ToDo のこり${todos.length - done}つ。勉強のページを開く`}
      style={[{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
      <View>
        <Txt size={11} tone="ink3" lh={14}>ToDo</Txt>
        <Txt num size={17} w="700" lh={21}>{done}<Txt size={12} tone="ink3">{` / ${todos.length}`}</Txt></Txt>
      </View>
      <View style={{ width: hair, alignSelf: 'stretch', backgroundColor: t.line }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={11} tone="ink3" lh={14}>{next ? '次のToDo' : 'ぜんぶ終わり'}</Txt>
        <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{next ? next.t : '今日のToDoは全部完了しました'}</Txt>
      </View>
      <Icon name="chev" size={14} color={t.ink3} />
    </Press>
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
