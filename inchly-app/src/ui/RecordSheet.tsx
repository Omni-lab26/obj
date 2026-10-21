import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { hm, subj, TODAY } from '../data';
import { commitRecord, elapsedOf, getState } from '../store';
import { ease, hair, useT } from '../theme';
import { Btn, haptic, Txt } from './base';
import { Choice, Label } from './Form';
import { Stamp } from './Sticker';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// "Record this study" sheet. The summary prints out of a slot like a receipt,
// then you pick which ToDo moved forward and when to come back to it.
export function recordSheet(opts?: { leaveTimer?: boolean }) {
  openSheet((close) => <RecordBody close={close} leaveTimer={opts?.leaveTimer} />);
}

function Row({ k, v, num }: { k: string; v: string; num?: boolean }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: hair, borderBottomColor: t.line, borderStyle: 'dashed' }}>
      <Txt size={13.5} tone="ink2">{k}</Txt>
      <Txt size={14} w="600" num={num}>{v}</Txt>
    </View>
  );
}

function RecordBody({ close, leaveTimer }: { close: () => void; leaveTimer?: boolean }) {
  const t = useT();
  const s = getState();
  const sj = subj(s.subj);
  const e = elapsedOf(s);
  const min = Math.max(1, Math.round(e / 60));
  const [todo, setTodo] = useState<'task' | 'review' | 'none'>('task');
  const [next, setNext] = useState<'tomorrow' | 'dinner' | 'later'>('tomorrow');
  const [phase, setPhase] = useState<'idle' | 'saving' | 'done'>('idle');
  const [h, setH] = useState(0);
  const y = useSharedValue(-1);
  useEffect(() => {
    if (h) y.value = withDelay(120, withTiming(0, { duration: 900, easing: ease.out }));
  }, [h, y]);
  const pa = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * (h || 260) }] }));

  const commit = () => {
    setPhase('saving');
    setTimeout(() => {
      const m = commitRecord();
      haptic.success();
      setPhase('done');
      setTimeout(() => {
        close();
        if (leaveTimer && router.canGoBack()) router.back();
        toast(`${sj.name} ${m}分を記録しました`, '今日の草が1段濃くなりました');
      }, 1300); // long enough to see the stamp land
    }, 600);
  };
  const date = TODAY.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' });
  return (
    <View>
      {/* slot the receipt comes out of */}
      <View style={{ height: 6, borderRadius: 3, backgroundColor: t.ink, marginHorizontal: 6 }} />
      <View style={{ overflow: 'hidden', marginHorizontal: 14 }}>
        <Animated.View onLayout={(ev) => !h && setH(ev.nativeEvent.layout.height)} style={[{ backgroundColor: t.dark ? t.sunken : '#FAFBFD', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderWidth: hair, borderTopWidth: 0, borderColor: t.line }, pa]}>
          <Txt size={17} w="700">この勉強を記録</Txt>
          <Txt size={12.5} tone="ink3">{date} · 21:30</Txt>
          <View style={{ marginTop: 10 }}>
            <Row k="科目" v={sj.name} />
            <Row k="勉強した時間" v={`${min}分`} num />
            <Row k="予定していた時間" v={`${Math.round(s.targetMin)}分`} num />
            <Row k="今日の合計" v={hm(s.todayMin + min)} num />
          </View>
          {/* saved: a pop stamp lands on the receipt */}
          {phase === 'done' ? (
            <View pointerEvents="none" style={{ position: 'absolute', right: 8, top: 4 }}>
              <Stamp id="erai" size={60} pop />
            </View>
          ) : null}
        </Animated.View>
      </View>
      <View style={{ marginTop: 22 }}>
        <Label>どのToDoを進めた？</Label>
        <Choice value={todo} onChange={setTodo} options={[{ v: 'task', label: sj.task }, { v: 'review', label: '復習キュー' }, { v: 'none', label: 'なし' }]} />
      </View>
      <View style={{ marginTop: 18 }}>
        <Label>次はいつやる？</Label>
        <Choice value={next} onChange={setNext} options={[{ v: 'tomorrow', label: '明日の同じ時間' }, { v: 'dinner', label: '夕食のあと' }, { v: 'later', label: 'あとで決める' }]} />
      </View>
      <Btn kind="primary" wide label={phase === 'done' ? '記録しました' : '記録する'} loading={phase === 'saving'} done={phase === 'done'} onPress={commit} style={{ marginTop: 24 }} />
    </View>
  );
}
