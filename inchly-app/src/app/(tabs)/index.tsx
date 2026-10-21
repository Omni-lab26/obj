import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { dayLog, DEADLINES, hms, pad, STREAK, SUBJ, subj, TODAY } from '@/data';
import { elapsedOf, setSubject, startStudy, togglePause, toggleTodo, useNow, useStore } from '@/store';
import { useT } from '@/theme';
import { Avatar, Btn, Card, haptic, IconBtn, ListRow, Press, SectionHead, SubjCoin, Txt } from '@/ui/base';
import { InchTape } from '@/ui/Brand';
import { Page, useUnread } from '@/ui/Chrome';
import { Glass } from '@/ui/Glass';
import { LiveDot } from '@/ui/GroupParts';
import { DateTile, TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

const WD = ['日', '月', '火', '水', '木', '金', '土'];

// Home holds three things only: today, today's list, this week.
// Today's number is the one deliberate exception to the grouped layout: no
// card, thin and very large, like the Clock app's digits.
export default function Home() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const unread = useUnread();
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const done = s.todos.filter((x) => x.d).length;
  const left = Math.max(0, s.goalMin - s.todayMin);
  const diff = s.todayMin - dayLog(1).min;

  // digits roll up from zero once the screen is shown
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(s.todayMin / 60)) : '0';
  const M = shown ? pad(s.todayMin % 60) : '00';

  // today's minutes by subject; anything recorded since the morning goes to the current subject
  const today0 = dayLog(0);
  const parts = SUBJ.map((x, k) => ({ name: x.name, c: x.c, min: today0.parts[k] + (x.id === s.subj ? Math.max(0, s.todayMin - today0.min) : 0) }));

  const onToggle = (i: number) => {
    const willAll = s.todos.every((x, j) => (j === i ? !x.d : x.d));
    toggleTodo(i);
    if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり'); }
  };
  const next = DEADLINES[0];

  return (
    <Page title="今日" sub={<Txt size={15} tone="ink2">{`${TODAY.getMonth() + 1}月${TODAY.getDate()}日 ${WD[TODAY.getDay()]}曜日`}</Txt>}
      right={(
        <>
          <IconBtn filled name="search" label="さがす" onPress={() => router.push('/search')} />
          <IconBtn filled name="bell" label="お知らせ" dot={unread > 0} onPress={() => router.push('/notifications')} />
          <Press onPress={() => router.navigate('/me')} scale={0.9} accessibilityLabel="マイページ">
            <Avatar name="はる" color="#6E56CF" size={44} />
          </Press>
        </>
      )}>
      {/* 1. today: the number, one sentence, the ruler */}
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} accessible accessibilityLabel={`今日 ${Math.floor(s.todayMin / 60)}時間${s.todayMin % 60}分`}>
          <Rolling value={H} size={84} weight="200" />
          <Txt size={20} w="500" tone="ink2" style={{ marginLeft: 4, marginRight: 10, marginBottom: 14 }}>時間</Txt>
          <Rolling value={M} size={84} weight="200" />
          <Txt size={20} w="500" tone="ink2" style={{ marginLeft: 4, marginBottom: 14 }}>分</Txt>
        </View>
        <Txt size={15} tone="ink2" lh={21}>
          {left ? `目標の3時間まで あと${left}分。` : '今日の3時間、達成。'}
          <Txt size={15} color={diff >= 0 ? t.greenInk : t.ink2}>{`昨日より ${diff >= 0 ? '+' : '−'}${Math.floor(Math.abs(diff) / 60)}時間${Math.abs(diff) % 60}分`}</Txt>
        </Txt>
        <View style={{ marginTop: 34 }}>
          <InchTape minutes={s.todayMin} goal={s.goalMin} parts={parts} />
        </View>
      </View>

      {/* now: one live row while studying, the start button when not */}
      <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
        {s.running ? (
          <Card pad={0}>
            <Press onPress={() => router.push('/timer')} scale={0.985} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 12 }}>
              <SubjCoin name={sj.name} color={sj.c} size={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <LiveDot size={7} color={s.paused ? t.amber : undefined} />
                  <Txt size={13} tone="ink2">{s.paused ? '一時停止中' : '勉強中'}</Txt>
                </View>
                <Txt size={17} w="600" lh={22} numberOfLines={1}>{sj.name}<Txt size={15} tone="ink2">{`  ${sj.task}`}</Txt></Txt>
              </View>
              <Txt num size={20} w="300">{hms(e)}</Txt>
              <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.88} accessibilityLabel={s.paused ? '再開' : '一時停止'}>
                <Glass interactive style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={s.paused ? 'play' : 'pause'} size={17} color={t.ink} />
                </Glass>
              </Press>
            </Press>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            <Segmented value={s.subj} onChange={(v) => setSubject(v)} options={SUBJ.map((x) => ({ v: x.id, label: x.name }))} />
            <Btn kind="primary" wide icon="play" label={`${sj.name}を始める`} onPress={() => { haptic.firm(); startStudy(); }} />
          </View>
        )}
      </View>

      {/* 2. today's list */}
      <View style={{ paddingHorizontal: 16, paddingTop: 30 }}>
        <SectionHead title="今日やること" aux={`${done} / ${s.todos.length}`} />
        <Card pad={0}>
          {s.todos.map((td, i) => <TodoRow key={i} todo={td} first={i === 0} onToggle={() => onToggle(i)} />)}
        </Card>
      </View>

      {/* 3. this week: the streak as a ruler, and the next deadline */}
      <View style={{ paddingHorizontal: 16, paddingTop: 30 }}>
        <SectionHead title="今週" />
        <Card pad={0}>
          <ListRow first title={<Txt size={17} w="600" lh={22}>{`${STREAK}日続いています`}</Txt>} sub="休みチケットはあと2枚" trail={<WeekRuler />}
            a11y={`${STREAK}日連続。休みチケットあと2枚`} />
          <ListRow
            lead={<DateTile mo={next.mo} d={next.day} />}
            title={next.t}
            sub={`ToDo ${next.todo[0]} / ${next.todo[1]} 終わった`}
            detail={<Txt size={17} color={t.amber}>{`あと${next.days}日`}</Txt>}
            chevron onPress={() => router.navigate('/records')} a11y={`${next.t} あと${next.days}日`} />
        </Card>
      </View>
    </Page>
  );
}

/** This week on a ruler: a tall tick for a day you studied, a short one for a day still to come. */
function WeekRuler() {
  const t = useT();
  const back = (TODAY.getDay() + 6) % 7; // days since Monday
  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'flex-end' }}>
      {['月', '火', '水', '木', '金', '土', '日'].map((w, i) => {
        const ago = back - i;
        const future = ago < 0;
        const studied = !future && dayLog(ago).min > 0;
        const today = ago === 0;
        return (
          <View key={w} style={{ alignItems: 'center', gap: 4 }}>
            <View style={{ width: 3, height: studied ? 20 : 8, borderRadius: 1.5, backgroundColor: studied ? t.tint : 'rgba(60,60,67,0.18)' }} />
            <Txt size={11} lh={13} w={today ? '700' : '400'} tone={today ? 'ink' : 'ink3'}>{w}</Txt>
          </View>
        );
      })}
    </View>
  );
}
