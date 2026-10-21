import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';

import { dayLog, DEADLINES, hms, pad, PEOPLE, STREAK, SUBJ, subj, TODAY } from '@/data';
import { PHOTO } from '@/photos';
import { elapsedOf, setSubject, startStudy, togglePause, toggleTodo, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, AvatarStack, Btn, haptic, IconBtn, Press, Txt } from '@/ui/base';
import { InchTape, Wordmark } from '@/ui/Brand';
import { Screen, useUnread } from '@/ui/Chrome';
import { MiniSeg, TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

// Home has one lead: how much you studied today, on the tape. Everything else
// is smaller and shaped differently, so the eye has an order to follow.
export default function Home() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const unread = useUnread();
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const done = s.todos.filter((x) => x.d).length;
  const left = Math.max(0, s.goalMin - s.todayMin);

  // Hero digits roll up from zero once the screen is shown.
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';
  const [joined, setJoined] = useState(false);

  const onToggle = (i: number) => {
    const willAll = s.todos.every((x, j) => (j === i ? !x.d : x.d));
    toggleTodo(i);
    if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり'); }
  };
  const joinPeers = () => {
    if (s.running) { toast('もう勉強中です', `${sj.name} ${hms(e)}`); return; }
    startStudy();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  const breakRead = () =>
    openSheet((close) => (
      <View>
        <Galaxy size={180} wide />
        <Txt size={20} w="700" lh={29} style={{ marginTop: 14 }}>宇宙の物質の約85%は、まだ誰も見たことがない</Txt>
        <Txt size={12.5} tone="ink3" style={{ marginTop: 4, marginBottom: 14 }}>ひとやすみ · 物理 · 2分</Txt>
        <Txt size={15} lh={28}>
          1970年代、天文学者ヴェラ・ルービンは、銀河の外側の星が内側と同じ速さで回っていることを見つけました。見えている物質だけでは、重力が足りません。
        </Txt>
        <Txt size={15} lh={28} style={{ marginTop: 14 }}>
          これは高校物理の「円運動」と「万有引力」の式で確かめられます。足りない重力の正体は、まだわかっていません。
        </Txt>
        <Btn label="机に戻る" kind="quiet" wide onPress={close} style={{ marginTop: 22 }} />
      </View>
    ));

  const next = DEADLINES[1]; // the exam everyone is counting down to
  return (
    <Screen>
      {/* header: brand, not a page title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 12, paddingTop: 8, height: 52 }}>
        <Wordmark />
        <View style={{ flex: 1 }} />
        <IconBtn name="search" label="さがす" onPress={() => router.push('/search')} />
        <IconBtn name="bell" label="お知らせ" dot={unread > 0} onPress={() => router.push('/notifications')} />
        <Press onPress={() => router.navigate('/me')} scale={0.9} accessibilityLabel="マイページ" style={{ marginLeft: 4 }}>
          <Avatar name="はる" color="#6E56CF" size={30} />
        </Press>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
          <Txt size={13} tone="ink2">
            {`${TODAY.getMonth() + 1}月${TODAY.getDate()}日 ${WD[TODAY.getDay()]}曜日`}
            <Txt size={13} tone="ink3">{`  ·  ${next.t}まで `}</Txt>
            <Txt size={13} w="700" num>{next.days}</Txt>
            <Txt size={13} tone="ink3">日</Txt>
          </Txt>

          {/* the lead */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10 }} accessible accessibilityLabel={`今日 ${Math.floor(s.todayMin / 60)}時間${s.todayMin % 60}分`}>
            <Rolling value={H} size={76} weight="600" />
            <Txt size={17} w="600" tone="ink3" style={{ marginLeft: 3, marginRight: 12, marginBottom: 11 }}>時間</Txt>
            <Rolling value={M} size={76} weight="600" />
            <Txt size={17} w="600" tone="ink3" style={{ marginLeft: 3, marginBottom: 11 }}>分</Txt>
          </View>
          <Txt size={13.5} tone={left ? 'ink2' : 'greenInk'} w={left ? '400' : '600'} style={{ marginTop: 2, marginBottom: 12 }}>
            {left ? `あと${left}分で今日の3時間` : '今日の3時間、達成'}
          </Txt>
          <InchTape minutes={s.todayMin} goal={s.goalMin} />

          {/* now: one live row when studying, a start button when not — never both */}
          {s.running ? (
            <Press onPress={() => router.push('/timer')} scale={0.98} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`}
              style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 8, borderRadius: 16, backgroundColor: t.surface }}>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: sj.c }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={12} tone="ink3" lh={16}>{s.paused ? '一時停止中' : 'いま'}</Txt>
                <Txt size={15} w="600" numberOfLines={1}>{sj.name}<Txt size={15} tone="ink2">{`  ${sj.task}`}</Txt></Txt>
              </View>
              <Txt num size={20} w="600">{hms(e)}</Txt>
              <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.88} accessibilityLabel={s.paused ? '再開' : '一時停止'}
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={s.paused ? 'play' : 'pause'} size={16} color={t.ink} />
              </Press>
            </Press>
          ) : (
            <View style={{ marginTop: 18 }}>
              <Press onPress={() => { haptic.firm(); startStudy(); }} haptics={false} scale={0.97} accessibilityLabel={`${sj.name}を始める`}
                style={{ height: 54, borderRadius: 16, backgroundColor: t.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Icon name="play" size={17} color="#fff" />
                <Txt size={16} w="700" color="#fff">{sj.name}を始める</Txt>
              </Press>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {SUBJ.map((x) => {
                  const on = x.id === s.subj;
                  return (
                    <Press key={x.id} onPress={() => setSubject(x.id)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 11, borderRadius: 999, backgroundColor: on ? t.ink : 'transparent' }}>
                      <Txt size={13} w={on ? '600' : '400'} color={on ? t.onInk : t.ink2}>{x.name}</Txt>
                    </Press>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* today's list: a plain checklist on the canvas, count in the heading */}
        <View style={{ paddingHorizontal: 20, paddingTop: 30 }}>
          <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 4 }}>{`今日やること  ${done}/${s.todos.length}`}</Txt>
          {s.todos.map((td, i) => <TodoRow key={i} todo={td} first={i === 0} onToggle={() => onToggle(i)} />)}
        </View>

        {/* streak: the number is the heading; the long grass lives in 記録 and on your card */}
        <View style={{ marginHorizontal: 16, marginTop: 28, padding: 16, borderRadius: 20, backgroundColor: t.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Txt num size={28} w="600" lh={30}>{STREAK}</Txt>
            <Txt size={14} w="600" style={{ marginBottom: 3 }}>日連続</Txt>
            <View style={{ flex: 1 }} />
            <Txt size={12} tone="ink3" style={{ marginBottom: 3 }}>休みチケット 2枚</Txt>
          </View>
          <WeekStreak />
        </View>

        {/* deadlines: tickets you can swipe through */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingTop: 14 }}>
          {DEADLINES.map((d) => (
            <View key={d.t} style={{ width: 168, padding: 14, borderRadius: 18, backgroundColor: d.urgent ? t.amberSoft : t.surface }}>
              <Txt size={12} tone={d.urgent ? 'amber' : 'ink3'} w={d.urgent ? '600' : '400'}>{d.urgent ? 'もうすぐ' : d.d}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 2 }}>
                <Txt num size={34} w="600" lh={38} tone={d.urgent ? 'amber' : 'ink'}>{d.days}</Txt>
                <Txt size={13} w="600" tone={d.urgent ? 'amber' : 'ink3'} style={{ marginLeft: 3, marginBottom: 5 }}>日</Txt>
              </View>
              <Txt size={14} w="600" numberOfLines={1} style={{ marginTop: 2 }}>{d.t}</Txt>
              <View style={{ marginTop: 8 }}>
                <MiniSeg done={d.todo[0]} total={Math.min(d.todo[1], 8)} />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* peers */}
        <Press onPress={() => router.navigate('/community')} scale={0.985}
          style={{ marginHorizontal: 16, marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line }}>
          <AvatarStack ring={t.canvas} size={32} max={4} people={[...(joined ? [{ n: 'はる', c: '#6E56CF' }] : []), ...PEOPLE.slice(0, 3)]} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt size={14} w="600" lh={19}>{joined ? 5 : 4}人が勉強中</Txt>
            <Txt size={12} tone="ink3" numberOfLines={1}>mio 英語 · そら 数学 · kaito 物理</Txt>
          </View>
          <Btn label={joined ? '一緒に勉強中' : '一緒に始める'} kind="line" small onPress={joinPeers} disabled={joined} />
        </Press>

        {/* a break, with a picture */}
        <Press onPress={breakRead} scale={0.985} style={{ marginHorizontal: 16, marginTop: 14, borderRadius: 20, backgroundColor: t.surface, padding: 8 }}>
          <Galaxy size={132} wide />
          <View style={{ paddingHorizontal: 8, paddingTop: 10, paddingBottom: 6 }}>
            <Txt size={11.5} tone="ink3">ひとやすみ · 2分で読める</Txt>
            <Txt size={16} w="600" lh={23}>宇宙の物質の約85%は、まだ誰も見たことがない</Txt>
          </View>
        </Press>
      </ScrollView>
    </Screen>
  );
}

/** The break card's picture: a real photo of the Milky Way. */
function Galaxy({ size, wide }: { size: number; wide?: boolean }) {
  return <Image source={PHOTO.space} style={{ width: wide ? '100%' : size, height: size, borderRadius: wide ? 16 : 12 }} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

/** This week as seven days, Monday first: filled when you studied, a ring for today. */
function WeekStreak() {
  const t = useT();
  const back = (TODAY.getDay() + 6) % 7; // days since Monday
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
      {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => {
        const ago = back - i;
        const future = ago < 0;
        const studied = !future && dayLog(ago).min > 0;
        const today = ago === 0;
        return (
          <View key={w} style={{ alignItems: 'center', gap: 6 }}>
            <Txt size={11.5} tone={today ? 'ink' : 'ink3'} w={today ? '700' : '400'}>{w}</Txt>
            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
              backgroundColor: studied ? t.green : 'transparent', borderWidth: studied ? 0 : 1.5, borderColor: future ? t.line : t.line2,
              borderStyle: future ? 'dashed' : 'solid' }}>
              {studied ? <Icon name="check" size={14} color="#fff" width={3} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
