import { View } from 'react-native';

import { subj } from '../data';
import { type Contents, contentsOf } from '../lib/history';
import { dateKey } from '../lib/time';
import { useStore } from '../store';
import { hair, useT } from '../theme';
import { Btn, SubjTile, Txt } from './base';
import { openSheet } from './Sheet';

// What was studied, not only which subject: a chart's column opened up —
// each subject with what its records were about (the plan's memo or やること,
// or the memo written when recording: lib/history contentOf), longest first.
// Under a chart (StudyChart) or in a sheet (the graph cards: breakdownSheet).

const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const jpHm = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}時間${r % 60 ? `${r % 60}分` : ''}` : `${r}分`;
};

/** A tapped column's contents: each subject with what it was about (the plan's memo or やること, or the record's memo), longest first. */
export function Breakdown({ list, live }: { list: Contents; live: { s: string; what: string; min: number } | null }) {
  const t = useT();
  const SHOW = 4;
  if (!list.length && !live) return <Txt size={12} tone="ink3" style={{ marginTop: 12 }}>この時間の記録はありません</Txt>;
  return (
    <View style={{ marginTop: 12, paddingTop: 10, borderTopWidth: hair, borderTopColor: t.line, gap: 10 }} accessibilityLabel="勉強した内容の内訳">
      {list.map((x) => {
        const sj = subj(x.s);
        const rest = x.items.slice(SHOW);
        return (
          <View key={x.s} style={{ gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SubjTile name={sj.name} color={sj.c} area={sj.area} size={18} radius={4} />
              <Txt size={13} w="600" style={{ flex: 1 }} numberOfLines={1}>{sj.name}</Txt>
              <Txt num size={12.5} w="600">{jpHm(x.min)}</Txt>
            </View>
            {x.items.slice(0, SHOW).map((it) => (
              <View key={it.what || '-'} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingLeft: 26 }}>
                <Txt size={12} tone={it.what ? 'ink2' : 'ink3'} style={{ flex: 1 }} numberOfLines={1}>{it.what || '内容の記録なし'}</Txt>
                <Txt num size={11.5} tone="ink3">{jpHm(it.min)}</Txt>
              </View>
            ))}
            {rest.length ? (
              <Txt size={11.5} tone="ink3" style={{ paddingLeft: 26 }}>{`ほか${rest.length}件 · ${jpHm(rest.reduce((n, i) => n + i.min, 0))}`}</Txt>
            ) : null}
          </View>
        );
      })}
      {live ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Txt size={12} tone="ink2" style={{ flex: 1 }} numberOfLines={1}>{`勉強中 · ${subj(live.s).name}${live.what ? `　${live.what}` : ''}`}</Txt>
          <Txt num size={11.5} tone="ink3">{jpHm(live.min)}</Txt>
        </View>
      ) : null}
    </View>
  );
}

/** A day's contents in a sheet (from a graph card's bar). */
export function breakdownSheet(day: Date) {
  openSheet((close) => <DaySheet day={day} close={close} />);
}
function DaySheet({ day, close }: { day: Date; close: () => void }) {
  const sessions = useStore((s) => s.sessions);
  const running = useStore((s) => s.running);
  const list = contentsOf(sessions, dateKey(day));
  const total = list.reduce((n, x) => n + x.min, 0);
  const today = dateKey(day) === dateKey(new Date());
  return (
    <View style={{ gap: 4 }}>
      <Txt size={17} w="700" accessibilityRole="header">{`${day.getMonth() + 1}月${day.getDate()}日（${DOW[day.getDay()]}）`}</Txt>
      <Txt size={12.5} tone="ink3">{total ? `${jpHm(total)} · 何を勉強したか` : '記録なし'}</Txt>
      {total ? <Breakdown list={list} live={null} /> : null}
      {today && running ? <Txt size={11.5} tone="ink3" style={{ marginTop: 8 }}>勉強中の分は、記録すると入ります</Txt> : null}
      <Btn kind="primary" label="閉じる" onPress={close} style={{ marginTop: 14 }} />
    </View>
  );
}
