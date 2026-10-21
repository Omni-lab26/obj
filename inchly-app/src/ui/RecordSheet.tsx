import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { hm, subj, TODAY } from '../data';
import { commitRecord, elapsedOf, getState } from '../store';
import { useT } from '../theme';
import { Btn, haptic, ListRow, Txt } from './base';
import { Choice, Label } from './Form';
import { Stamp } from './Sticker';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// "Record this study" sheet: the summary as a grouped list, then which ToDo
// moved forward and when to come back to it. Saving lands Inch's stamp.
export function recordSheet(opts?: { leaveTimer?: boolean }) {
  openSheet((close) => <RecordBody close={close} leaveTimer={opts?.leaveTimer} />);
}

function Row({ k, v, first }: { k: string; v: string; first?: boolean }) {
  return <ListRow first={first} title={k} detail={v} />;
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
      <Txt size={22} w="700" lh={28}>この勉強を記録</Txt>
      <Txt size={15} tone="ink2" style={{ marginBottom: 14 }}>{`${date} 21:30`}</Txt>
      <View style={{ backgroundColor: t.surface, borderRadius: 20, overflow: 'hidden' }}>
        <Row first k="科目" v={sj.name} />
        <Row k="勉強した時間" v={`${min}分`} />
        <Row k="予定していた時間" v={`${Math.round(s.targetMin)}分`} />
        <Row k="今日の合計" v={hm(s.todayMin + min)} />
      </View>
      {/* saved: Inch's stamp lands on the summary */}
      {phase === 'done' ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: 2, top: -6 }}>
          <Stamp id="erai" size={76} pop />
        </View>
      ) : null}
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
