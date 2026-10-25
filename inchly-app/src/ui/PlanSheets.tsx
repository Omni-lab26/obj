import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { subj } from '../data';
import { dateKey, jpDate, mondayIndex, parseKey } from '../lib/time';
import { Block, endOf, plansOn, toClock, toMin } from '../lib/timetable';
import { getState, removeBlock, saveBlock, toggleIn, useStore, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Choice, Stepper } from './Form';
import { Icon, IconName } from './Icon';
import { closeSheet, openSheet } from './Sheet';
import { toast } from './Toast';

// Planning on the calendar: 追加 opens a month, a day opens a short post-like
// form (what you'll do, then the subject, time, length and repeat as tools
// under it), and 追加する puts it on the timetable.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const lenLabel = (m: number) => (m >= 60 ? `${m / 60}時間` : `${m}分`);
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// one sheet closes before the next comes up
const next = (open: () => void) => { closeSheet(); setTimeout(open, 320); };

export function planCalendar(month?: Date) {
  openSheet((close) => <PlanCalendar close={close} start={month} />);
}
export function planSheet(o: { date?: Date; existing?: Block }) {
  openSheet((close) => <PlanForm close={close} date={o.date} existing={o.existing} />);
}

// ---------- the month ----------
function PlanCalendar({ close, start }: { close: () => void; start?: Date }) {
  const t = useT();
  const blocks = useStore((x) => x.timetable);
  const today = day0(new Date());
  const [m, setM] = useState(() => { const d = start ?? today; return new Date(d.getFullYear(), d.getMonth(), 1); });
  const lead = mondayIndex(m);
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const atThisMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
  const shift = (by: number) => { haptic.tap(); setM(new Date(m.getFullYear(), m.getMonth() + by, 1)); };
  const monthPlans = cells.filter((d): d is Date => !!d).flatMap((d) => plansOn(blocks, d).map((b) => ({ d, b })));
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt size={18} w="700" style={{ flex: 1 }}>予定を追加</Txt>
        <Press onPress={() => shift(-1)} disabled={atThisMonth} hitSlop={8} scale={0.9} accessibilityLabel="前の月"
          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.sunken, opacity: atThisMonth ? 0.35 : 1 }}>
          <Icon name="back" size={15} color={t.ink} />
        </Press>
        <Txt num size={15} w="700" style={{ minWidth: 92, textAlign: 'center' }}>{`${m.getFullYear()}年${m.getMonth() + 1}月`}</Txt>
        <Press onPress={() => shift(1)} hitSlop={8} scale={0.9} accessibilityLabel="次の月"
          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.sunken }}>
          <Icon name="chev" size={15} color={t.ink} />
        </Press>
      </View>
      <View>
        <View style={{ flexDirection: 'row' }}>
          {DOW.map((w, i) => <Txt key={w} size={11.5} w="700" tone={i >= 5 ? 'ink2' : 'ink3'} style={{ width: `${100 / 7}%`, textAlign: 'center', paddingBottom: 6 }}>{w}</Txt>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 50 }} />;
            const past = d < today, isToday = d.getTime() === today.getTime();
            const dots = plansOn(blocks, d).slice(0, 3);
            return (
              <Press key={dateKey(d)} onPress={() => next(() => planSheet({ date: d }))} disabled={past} scale={0.9}
                accessibilityLabel={`${jpDate(d)}${isToday ? '（今日）' : ''}に予定を追加${dots.length ? `。予定${dots.length}件` : ''}`}
                style={{ width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center', gap: 3, opacity: past ? 0.3 : 1 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? t.ink : 'transparent' }}>
                  <Txt num size={14.5} w={isToday ? '800' : '600'} color={isToday ? t.onInk : t.ink}>{d.getDate()}</Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: 2, height: 5 }}>
                  {dots.map((b) => <View key={b.id} style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: subj(b.s).c }} />)}
                </View>
              </Press>
            );
          })}
        </View>
      </View>
      <Txt size={12} tone="ink3">日付を押すと、その日の予定を書けます</Txt>
      {monthPlans.length ? (
        <View style={{ borderTopWidth: hair, borderTopColor: t.line }}>
          {monthPlans.map(({ d, b }) => (
            <Press key={b.id} onPress={() => next(() => planSheet({ existing: b }))} scale={0.99} accessibilityLabel={`${jpDate(d)} ${b.start} ${subj(b.s).name}。編集`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: hair, borderBottomColor: t.line }}>
              <Txt num size={12.5} w="700" numberOfLines={1} style={{ width: 96 }}>{jpDate(d)}</Txt>
              <View style={{ width: 4, height: 26, borderRadius: 2, backgroundColor: subj(b.s).c }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="700" numberOfLines={1}>{b.t ? `${subj(b.s).name} · ${b.t}` : subj(b.s).name}</Txt>
                <Txt num size={11.5} tone="ink3">{`${b.start}〜${endOf(b)}`}</Txt>
              </View>
              <Icon name="chev" size={12} color={t.ink3} />
            </Press>
          ))}
        </View>
      ) : null}
      <Press onPress={close} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 4 }}><Txt size={13} w="600" tone="ink3">閉じる</Txt></Press>
    </View>
  );
}

// ---------- the post-like form ----------
type Tool = 'subj' | 'time' | 'len' | 'repeat';
const TOOLS: { k: Tool; icon: IconName; label: string }[] = [
  { k: 'subj', icon: 'book', label: '科目' },
  { k: 'time', icon: 'clock', label: '時刻' },
  { k: 'len', icon: 'target', label: '長さ' },
  { k: 'repeat', icon: 'cal', label: 'くり返し' },
];
function PlanForm({ close, date, existing }: { close: () => void; date?: Date; existing?: Block }) {
  const t = useT();
  const subjects = useSubjects();
  const weekly = !!existing && !existing.date;
  const d = existing?.date ? parseKey(existing.date) : day0(date ?? new Date());
  const startMin = existing ? toMin(existing.start) : 19 * 60;
  const [s, setS] = useState(existing?.s ?? getState().subj);
  const [hour, setHour] = useState(Math.floor(startMin / 60));
  const [minute, setMinute] = useState(String((Math.round((startMin % 60) / 15) * 15) % 60));
  const [len, setLen] = useState(String(existing?.min ?? 60));
  const [repeat, setRepeat] = useState<'once' | 'weekly'>(weekly ? 'weekly' : 'once');
  const [days, setDays] = useState<number[]>(existing && !existing.date ? existing.days : [mondayIndex(d)]);
  const [memo, setMemo] = useState(existing?.t ?? '');
  const [tool, setTool] = useState<Tool | null>(null);
  const sj = subj(s);
  const start = `${hour}:${minute.padStart(2, '0')}`;
  const when = repeat === 'once' ? `${jpDate(d)}だけ` : `毎週 ${[...days].sort().map((i) => DOW[i]).join('・') || '—'}`;
  const pick = (k: Tool) => { haptic.tap(); setTool(tool === k ? null : k); };
  const save = () => {
    if (repeat === 'weekly' && !days.length) { haptic.warn(); setTool('repeat'); toast('くり返す曜日を1つ以上選んでください'); return; }
    saveBlock({ id: existing?.id, s, t: memo.trim() || undefined, start, min: Number(len), days: repeat === 'weekly' ? [...days].sort() : [], date: repeat === 'once' ? dateKey(d) : undefined });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${when} ${start}〜 ${sj.name}`);
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Press onPress={close} hitSlop={10} scale={0.9} accessibilityLabel="閉じる" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={18} color={t.ink} />
        </Press>
        <View style={{ flex: 1 }} />
        {existing ? (
          <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} hitSlop={8} accessibilityLabel="この予定を削除">
            <Txt size={13} w="700" tone="red">削除</Txt>
          </Press>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Press onPress={() => pick('subj')} scale={0.92} accessibilityLabel={`科目：${sj.name}。変える`}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: sj.c, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={17} w="800" color="#fff">{[...sj.name][0]}</Txt>
        </Press>
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <Press onPress={() => next(() => planCalendar(d))} scale={0.96} accessibilityLabel={`${jpDate(d)}。日付を変える`}
            style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 11, borderRadius: 14, borderWidth: 1, borderColor: t.line2 }}>
            <Txt size={13} w="700" color={t.blue}>{repeat === 'once' ? jpDate(d) : '毎週'}</Txt>
            <Icon name="chev" size={10} color={t.blue} />
          </Press>
          <TextInput value={memo} onChangeText={(v) => setMemo(v.slice(0, 40))} placeholder="何をやる？（例：青チャート 例題41〜50）" placeholderTextColor={t.ink3}
            multiline autoFocus={!existing} accessibilityLabel="何をやるか"
            style={[{ minHeight: 70, fontSize: 19, lineHeight: 27, color: t.ink, fontFamily: font.text, textAlignVertical: 'top', padding: 0 }, noOutline]} />
        </View>
      </View>
      <Press onPress={() => pick('time')} scale={0.99} accessibilityLabel={`${sj.name} ${start}から${lenLabel(Number(len))}、${when}。時刻を変える`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 56 }}>
        <Icon name="clock" size={14} color={t.blue} />
        <Txt num size={13} w="700" color={t.blue} numberOfLines={1} style={{ flexShrink: 1 }}>{`${sj.name} · ${start}〜${toClock(hour * 60 + Number(minute) + Number(len))} · ${when}`}</Txt>
      </Press>
      {tool ? (
        <View style={{ backgroundColor: t.sunken, borderRadius: 14, padding: 12, gap: 10 }}>
          {tool === 'subj' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {subjects.map((x) => {
                const on = x.id === s;
                return (
                  <Press key={x.id} onPress={() => { haptic.tap(); setS(x.id); }} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: on ? x.c : t.surface }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? '#fff' : x.c }} />
                    <Txt size={13} w="700" color={on ? '#fff' : t.ink}>{x.name}</Txt>
                  </Press>
                );
              })}
            </View>
          ) : tool === 'time' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Stepper value={hour} min={0} max={23} onChange={setHour} unit="時" label="時" />
              <Choice value={minute} onChange={setMinute} options={['0', '15', '30', '45'].map((x) => ({ v: x, label: `${x.padStart(2, '0')}分` }))} />
            </View>
          ) : tool === 'len' ? (
            <Choice value={len} onChange={setLen} options={['30', '45', '60', '90', '120'].map((x) => ({ v: x, label: lenLabel(Number(x)) }))} />
          ) : (
            <>
              <Choice value={repeat} onChange={setRepeat} options={[{ v: 'once', label: `${jpDate(d, false)}だけ` }, { v: 'weekly', label: '毎週くり返す' }]} />
              {repeat === 'weekly' ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {DOW.map((w, i) => {
                    const on = days.includes(i);
                    return (
                      <Press key={w} onPress={() => setDays((x) => toggleIn(x, i))} scale={0.92} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${w}曜日`}
                        style={{ flex: 1, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.ink : t.surface }}>
                        <Txt size={13} w="700" color={on ? t.onInk : t.ink2}>{w}</Txt>
                      </Press>
                    );
                  })}
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      <View style={{ height: hair, backgroundColor: t.line }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
        {TOOLS.map((x) => {
          const on = tool === x.k;
          return (
            <Press key={x.k} onPress={() => pick(x.k)} scale={0.9} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={x.label}
              style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.blueSoft : 'transparent' }}>
              <Icon name={x.icon} size={19} color={t.blue} />
            </Press>
          );
        })}
        <View style={{ flex: 1 }} />
        <Press onPress={save} scale={0.95} accessibilityRole="button" accessibilityLabel={existing ? '保存する' : '追加する'}
          style={{ height: 40, paddingHorizontal: 20, borderRadius: 20, backgroundColor: t.blue, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={14.5} w="800" color="#fff">{existing ? '保存する' : '追加する'}</Txt>
        </Press>
      </View>
    </View>
  );
}
