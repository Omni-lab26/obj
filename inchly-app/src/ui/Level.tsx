import { View } from 'react-native';

import { expOn, GOAL_BONUS, TODO_CAP, TODO_EXP } from '../lib/exp';
import { useLevel, useStore } from '../store';
import { hair, useT } from '../theme';
import { Btn, Press, Txt } from './base';
import { openSheet } from './Sheet';
import { Sticker } from './Sticker';
import { useStd } from './stdLook';

// Level and EXP: a small chip in home's header, and a sheet that says how far
// you are and how EXP is earned. Everything is worked out from your records.

const n = (x: number) => Math.round(x).toLocaleString('ja-JP');

export function LevelChip() {
  const t = useT();
  const l = useLevel();
  return (
    <Press onPress={levelSheet} scale={0.94} hitSlop={6} accessibilityLabel={`レベル${l.lv}。次のレベルまで${n(l.need)} EXP`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingLeft: 8, paddingRight: 9, borderRadius: 13, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
      <Txt num size={12} w="800">{`Lv.${l.lv}`}</Txt>
      <View style={{ width: 34, height: 4, borderRadius: 2, backgroundColor: t.sunken, overflow: 'hidden' }}>
        <View style={{ width: `${l.p * 100}%`, height: 4, borderRadius: 2, backgroundColor: t.ink }} />
      </View>
    </Press>
  );
}

export function levelSheet() {
  openSheet((close) => <LevelSheet close={close} />);
}
function LevelSheet({ close }: { close: () => void }) {
  const t = useT();
  // スタンダード: the ink face is a sheet's one decision; closing isn't one
  const std = useStd();
  const l = useLevel();
  const sessions = useStore((s) => s.sessions);
  const goalMin = useStore((s) => s.goalMin);
  const todoLog = useStore((s) => s.todoLog);
  const today = expOn(sessions, goalMin, todoLog);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Sticker name="star" size={56} tilt={-8} />
        <View style={{ flex: 1 }}>
          <Txt size={12} tone="ink3">レベル</Txt>
          <Txt num size={34} w="800" lh={38}>{`Lv.${l.lv}`}</Txt>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Txt size={12} tone="ink3">今日</Txt>
          <Txt num size={18} w="700">{`+${n(today)}`}<Txt size={11} tone="ink3"> EXP</Txt></Txt>
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <View style={{ height: 10, borderRadius: 5, backgroundColor: t.sunken, overflow: 'hidden' }}>
          <View style={{ width: `${l.p * 100}%`, height: 10, borderRadius: 5, backgroundColor: t.ink }} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          <Txt num size={12} tone="ink2" style={{ flex: 1 }}>{`${n(l.into)} / ${n(l.into + l.need)} EXP`}</Txt>
          <Txt num size={12} w="700">{`Lv.${l.lv + 1} まで あと ${n(l.need)}`}</Txt>
        </View>
      </View>
      <View style={{ borderRadius: 14, backgroundColor: t.sunken, padding: 12, gap: 8 }}>
        <Txt size={13} w="700">EXP のもらい方</Txt>
        {[['勉強 1分', '+1 EXP'], [`1日の目標（${goalMin / 60}時間）を達成した日`, `+${GOAL_BONUS} EXP`], [`ToDoを1つ完了（1日${TODO_CAP}つまで）`, `+${TODO_EXP} EXP`]].map(([k, v]) => (
          <View key={k} style={{ flexDirection: 'row' }}>
            <Txt size={13} tone="ink2" style={{ flex: 1 }}>{k}</Txt>
            <Txt num size={13} w="700">{v}</Txt>
          </View>
        ))}
        <Txt size={11.5} tone="ink3">記録と完了したToDoから計算するので、記録を直すとEXPも変わります。上のレベルほど、次までに少し多く必要です</Txt>
      </View>
      <Txt num size={12} tone="ink3">{`これまでの合計 ${n(l.exp)} EXP`}</Txt>
      <Btn kind={std ? 'quiet' : 'primary'} wide label="閉じる" onPress={close} />
    </View>
  );
}
