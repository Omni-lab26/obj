import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { dayLog, DEADLINES, hms, pad, POSTS, RECS, STREAK, SUBJ, subj, TODAY } from '@/data';
import { elapsedOf, setSubject, startStudy, togglePause, toggleTodo, useNow, useStore } from '@/store';
import { hair, radius, type, useT } from '@/theme';
import { Card, haptic, IconBtn, Press, SubjCoin, Txt } from '@/ui/base';
import { InchTape, Wordmark } from '@/ui/Brand';
import { Page, useUnread } from '@/ui/Chrome';
import { LiveDot } from '@/ui/GroupParts';
import { DateTile, MiniSeg, TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { PhotoPost, RecordPost, Stories } from '@/ui/Post';
import { Rolling } from '@/ui/Rolling';
import { Inch } from '@/ui/Sticker';
import { toast } from '@/ui/Toast';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

// Home reads like Instagram: stories of who is studying, then your own card
// for today, your list, and a feed of what the people you follow recorded.
export default function Home() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const unread = useUnread();
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const done = s.todos.filter((x) => x.d).length;

  // Hero digits roll up from zero once the screen is shown.
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';
  const onToggle = (i: number) => {
    const willAll = s.todos.every((x, j) => (j === i ? !x.d : x.d));
    toggleTodo(i);
    if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり'); }
  };
  const next = DEADLINES[1]; // the exam everyone is counting down to
  const diff = s.todayMin - dayLog(1).min;
  // today's minutes by subject; whatever was recorded since the morning goes to the current subject
  const today0 = dayLog(0);
  const parts = SUBJ.map((x, k) => ({ name: x.name, c: x.c, min: today0.parts[k] + (x.id === s.subj ? Math.max(0, s.todayMin - today0.min) : 0) }));
  return (
    <Page brand={<Wordmark size={21} />}
      right={(
        <>
          <IconBtn name="search" label="さがす" onPress={() => router.push('/search')} />
          <IconBtn name="heart" label="お知らせ" dot={unread > 0} onPress={() => router.push('/notifications')} />
        </>
      )}>
        {/* stories: who is at their desk right now */}
        <Stories running={s.running} />

        {/* the lead: today's total, like a wallet's balance card */}
        <Card style={{ marginHorizontal: 16, marginTop: 6 }} pad={14}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>{`今日の勉強 · ${TODAY.getMonth() + 1}月${TODAY.getDate()}日（${WD[TODAY.getDay()]}）`}</Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, height: 20, borderRadius: 6, backgroundColor: t.sunken }}>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.amber }} />
              <Txt size={10.5} tone="ink2" lh={13}>{`${next.t}まで `}<Txt size={10.5} w="700" num lh={13}>{next.days}</Txt>日</Txt>
            </View>
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

        {/* today's list */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">今日やること</Txt>
          <Txt size={12} w="500" tone="ink3" num>{`${done}/${s.todos.length}`}</Txt>
        </View>
        <Card style={{ marginHorizontal: 16 }} pad={0}>
          {s.todos.map((td, i) => <TodoRow key={i} todo={td} first={i === 0} onToggle={() => onToggle(i)} />)}
        </Card>

        {/* deadlines: a portfolio-style list */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">締切</Txt>
          <Txt size={12} w="500" tone="ink3">ToDoの進み具合</Txt>
        </View>
        <Card style={{ marginHorizontal: 16 }} pad={0}>
          {DEADLINES.map((d, i) => (
            <View key={d.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
              {i ? <View style={{ position: 'absolute', top: 0, left: 58, right: 0, height: hair, backgroundColor: t.line }} /> : null}
              <DateTile mo={d.mo} d={d.day} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{d.t}</Txt>
                <Txt size={11} tone="ink3" lh={15}>{d.d}</Txt>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Txt num size={14} w="700" lh={17} color={d.urgent ? t.amber : t.ink}>{d.days}<Txt size={11} w="500" tone="ink3"> 日</Txt></Txt>
                <MiniSeg done={d.todo[0]} total={Math.min(d.todo[1], 8)} />
              </View>
            </View>
          ))}
        </Card>

        {/* the feed: what the people you follow recorded */}
        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">フォロー中の記録</Txt>
        </View>
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {RECS.slice(0, 2).map((r) => <RecordPost key={r.n} r={r} />)}
          <PhotoPost p={POSTS[0]} />
          <RecordPost r={RECS[2]} />
        </View>
    </Page>
  );
}

/**
 * The streak, after Caleb Wu's "day streak": a black capsule with the flame,
 * the count, and the week as dots. Tap it and the flame jumps.
 */
const DOW = ['月', '火', '水', '木', '金', '土', '日'];
function StreakPill() {
  const t = useT();
  const back = (TODAY.getDay() + 6) % 7; // days since Monday
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
    <Press onPress={jump} haptics={false} scale={0.98} accessibilityLabel={`${STREAK}日連続で勉強中。休みチケット2枚`}
      style={{ marginHorizontal: 16, marginTop: 12, height: 58, borderRadius: 29, backgroundColor: t.dark ? '#000' : '#0B0D12', flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 18,
        borderWidth: t.dark ? hair : 0, borderColor: t.line2 }}>
      <Animated.View style={a}><Inch pose="arch" eyes="dot" mouth="open" prop="flame" size={46} /></Animated.View>
      <View style={{ marginLeft: 4 }}>
        <Rolling value={pad(STREAK)} size={17} weight="700" color="#fff" />
        <Txt size={11} color={dim} lh={14}>日連続 · 休み券 2</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DOW.map((w, i) => {
          const ago = back - i;
          const future = ago < 0;
          const studied = !future && dayLog(ago).min > 0;
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
