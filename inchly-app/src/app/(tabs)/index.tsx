import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { DEADLINES, hms, pad, PEOPLE, SUBJ, subj } from '@/data';
import { elapsedOf, setSubject, startStudy, toggleTodo, useNow, useStore } from '@/store';
import { ease, useT } from '@/theme';
import { AvatarStack, Btn, dot, haptic, Press, SectionHead, Txt } from '@/ui/base';
import { Screen, TopBar } from '@/ui/Chrome';
import { Heatmap } from '@/ui/Heatmap';
import { DayTile, MiniSeg, TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

const DAYS = ['木', '金', '土', '日', '月', '火', '水'];

export default function Home() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const pct = Math.min(100, (s.todayMin / s.goalMin) * 100);
  const left = Math.max(0, s.goalMin - s.todayMin);
  const todayLevel = Math.min(4, 1 + Math.floor(s.todayMin / 60));
  const done = s.todos.filter((x) => x.d).length;

  // Hero digits roll up from zero once the screen is shown.
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';

  const bar = useSharedValue(0);
  useEffect(() => { bar.value = withTiming(pct, { duration: 800, easing: ease.out }); }, [pct, bar]);
  const barA = useAnimatedStyle(() => ({ width: `${bar.value}%` }));

  const [joined, setJoined] = useState(false);

  const pick = (id: string) => {
    if (s.running && id !== s.subj) { toast('勉強中の科目は変えられません', '記録してから切り替えましょう'); return; }
    setSubject(id);
  };
  const onToggle = (i: number) => {
    const willAll = s.todos.every((x, j) => (j === i ? !x.d : x.d));
    toggleTodo(i);
    if (willAll) { haptic.success(); toast('今日のToDoをすべて終えました'); }
  };
  const joinPeers = () => {
    if (s.running) { toast('もう勉強中です', `${sj.name} ${hms(e)}`); return; }
    startStudy();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました', '記録はタイマーを止めたときに残ります');
  };
  const breakRead = () =>
    openSheet((close) => (
      <View>
        <Txt size={19} w="700" lh={28}>宇宙の物質の約85%は、まだ誰も見たことがない</Txt>
        <Txt size={12.5} tone="ink3" style={{ marginTop: 4, marginBottom: 14 }}>ひとやすみ · 宇宙 · 2分</Txt>
        <Txt size={15} lh={28}>
          1970年代、天文学者ヴェラ・ルービンは、銀河の外側の星が内側と同じ速さで回っていることを見つけました。見えている物質だけでは、重力が足りません。
        </Txt>
        <Txt size={15} lh={28} style={{ marginTop: 14 }}>
          この発見は、高校物理の「円運動」と「万有引力」の式で理解できます。正体はまだわかっていません。
        </Txt>
        <Btn label="勉強に戻る" kind="quiet" wide onPress={close} style={{ marginTop: 22 }} />
      </View>
    ));

  return (
    <Screen>
      <TopBar title="今日の勉強" date="10月21日（水）" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* hero */}
        <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 6 }} accessible accessibilityLabel={`今日の勉強 ${Math.floor(s.todayMin / 60)}時間${s.todayMin % 60}分`}>
            <Rolling value={H} size={68} />
            <Txt size={18} w="500" tone="ink3" style={{ marginLeft: 4, marginRight: 14, marginBottom: 8 }}>時間</Txt>
            <Rolling value={M} size={68} />
            <Txt size={18} w="500" tone="ink3" style={{ marginLeft: 4, marginBottom: 8 }}>分</Txt>
          </View>
          <View style={{ marginTop: 14 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: t.grass[0], overflow: 'hidden' }}>
              <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: t.green }, barA]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
              <Txt size={12.5} tone="ink2">{left ? `目標の3時間まで あと${left}分` : '今日の目標を達成しました'}</Txt>
              <Txt size={12.5} tone="ink2" num>{Math.round(pct)}%</Txt>
            </View>
          </View>
          <Press onPress={() => (s.running ? router.push('/timer') : (haptic.firm(), startStudy()))} scale={0.97} haptics={false}
            accessibilityLabel={s.running ? `${sj.name}を勉強中 ${hms(e)}。タイマーを開く` : `${sj.name}を始める`}
            style={{ marginTop: 18, height: 54, borderRadius: 14, backgroundColor: t.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name={s.running ? (s.paused ? 'play' : 'pause') : 'play'} size={18} color="#fff" />
              <Txt size={16} w="700" color="#fff">{s.running ? `${sj.name}を勉強中` : `${sj.name}を始める`}</Txt>
            </View>
            {s.running ? <Txt num size={17} w="600" color="rgba(255,255,255,.88)">{hms(e)}</Txt> : null}
          </Press>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginHorizontal: -20 }} contentContainerStyle={{ gap: 6, paddingHorizontal: 20 }}>
            {SUBJ.map((x) => {
              const on = x.id === s.subj;
              return (
                <Press key={x.id} onPress={() => pick(x.id)} scale={0.95} accessibilityRole="radio" accessibilityState={{ checked: on }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 10, backgroundColor: t.surface,
                    borderWidth: on ? 1.6 : StyleSheet.hairlineWidth * 2, borderColor: on ? t.ink : t.line }}>
                  {dot(x.c)}
                  <Txt size={13.5} w={on ? '700' : '400'}>{x.name}</Txt>
                </Press>
              );
            })}
          </ScrollView>
        </View>

        {/* today */}
        <View style={sec}>
          <SectionHead title="今日やること" aux={`${done} / ${s.todos.length}`} />
          {s.todos.map((td, i) => <TodoRow key={i} todo={td} first={i === 0} onToggle={() => onToggle(i)} />)}
        </View>

        {/* streak */}
        <View style={sec}>
          <SectionHead title="積み上げ" aux="23日連続 · お休みチケット 2枚" />
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
            {DAYS.map((d, i) => (
              <DayTile key={d} index={i} label={d} today={i === 6} ticket={i === 2} level={[2, 3, 0, 4, 1, 3, todayLevel][i]} />
            ))}
          </View>
          <View style={{ marginTop: 16 }}>
            <Heatmap weeks={18} seed={9} todayLevel={todayLevel} />
          </View>
        </View>

        {/* deadlines */}
        <View style={sec}>
          <SectionHead title="締切" aux="予定を見る" onAux={() => router.navigate('/records')} />
          {DEADLINES.map((d, i) => (
            <View key={d.t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderTopWidth: i ? StyleSheet.hairlineWidth * 2 : 0, borderTopColor: t.line }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={14.5} w="500">{d.t}</Txt>
                <Txt size={12.5} tone="ink3">{d.d} · ToDo {d.todo[0]}/{d.todo[1]}</Txt>
                {d.urgent ? <MiniSeg done={d.todo[0]} total={d.todo[1]} /> : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', minWidth: 60, justifyContent: 'flex-end' }}>
                <Txt num size={22} w="600" tone={d.urgent ? 'amber' : 'ink'}>{d.days}</Txt>
                <Txt size={12} tone="ink3" style={{ marginLeft: 2, marginBottom: 2 }}>日</Txt>
              </View>
            </View>
          ))}
        </View>

        {/* peers */}
        <View style={sec}>
          <SectionHead title="いま勉強中の仲間" aux="みんな" onAux={() => router.navigate('/community')} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AvatarStack ring={t.canvas} size={34} max={5} people={[...(joined ? [{ n: 'H', c: '#6E56CF' }] : []), ...PEOPLE.slice(0, 4)]} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13} lh={18}><Txt size={13} w="700" num>{joined ? 5 : 4}人</Txt>が勉強中</Txt>
              <Txt size={12} tone="ink3" numberOfLines={1}>みお 英語 · そら 数学 · かいと 物理</Txt>
            </View>
            <Btn label={joined ? '勉強中' : '一緒に始める'} kind="line" small onPress={joinPeers} disabled={joined} />
          </View>
        </View>

        {/* break read */}
        <View style={[sec, { paddingTop: 22 }]}>
          <Press onPress={breakRead} scale={0.98}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: t.line }}>
            <View style={{ flex: 1 }}>
              <Txt size={12.5} tone="ink3">休憩に読む · 2分</Txt>
              <Txt size={15} w="600">宇宙の物質の約85%は、まだ誰も見たことがない</Txt>
            </View>
            <Icon name="chev" size={16} color={t.ink3} />
          </Press>
        </View>
      </ScrollView>
    </Screen>
  );
}

const sec = { paddingHorizontal: 20, paddingTop: 26 } as const;
