import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { SUBJECT_COLORS } from '../data';
import { dateKey, jpDate, mondayIndex, parseKey } from '../lib/time';
import { Block, plansOn, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, updateSubject, useStore, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Choice, Stepper } from './Form';
import { Icon } from './Icon';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable or a deadline, laid out like a calendar's new event:
// ✕, 予定 / 締切, and ✓ along the top; the title; the day and the times (a
// switch for no time, and repeat); then the subject with its color (for the
// charts), and a memo. Dates and times open right under their row.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[mondayIndex(d)]}）`;
const DEADLINE_RED = '#FF3B30';

type Kind = 'plan' | 'deadline';
export function planSheet(o: { date?: Date; existing?: Block; kind?: Kind } = {}) {
  openSheet((close) => <Editor close={close} date={o.date} existing={o.existing} kind={o.kind ?? 'plan'} />, { grouped: true });
}
/** The timetable's 追加: a new plan for today (the day can be changed in the sheet). */
export const planCalendar = () => planSheet({ date: new Date() });

type Open = 'date' | 'start' | 'end' | 'color' | null;

function Editor({ close, date, existing, kind: kind0 }: { close: () => void; date?: Date; existing?: Block; kind: Kind }) {
  const t = useT();
  const subjects = useSubjects();
  const blocks = useStore((x) => x.timetable);
  const [kind, setKind] = useState<Kind>(existing ? 'plan' : kind0);
  const [title, setTitle] = useState(existing?.t ?? '');
  const [d, setD] = useState(() => (existing?.date ? parseKey(existing.date) : day0(date ?? new Date())));
  const nextHour = Math.min(22, new Date().getHours() + 1) * 60;
  const [timed, setTimed] = useState(existing ? !!existing.start : true);
  const [start, setStart] = useState(existing?.start ? toMin(existing.start) : nextHour);
  const [end, setEnd] = useState(existing?.start ? toMin(existing.start) + existing.min : nextHour + 60);
  const [weekly, setWeekly] = useState(!!existing && !existing.date);
  const known = existing ? subjects.find((x) => x.id === existing.s) : undefined;
  const [name, setName] = useState(known?.name ?? '');
  const [color, setColor] = useState(known?.c ?? SUBJECT_COLORS[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [open, setOpen] = useState<Open>(null);

  const plan = kind === 'plan';
  const match = subjects.find((x) => x.name === name.trim());
  const accent = plan ? color : DEADLINE_RED;
  const toggle = (k: Open) => { haptic.tap(); setOpen(open === k ? null : k); };
  const typeName = (v: string) => { setName(v); const m = subjects.find((x) => x.name === v.trim()); if (m) setColor(m.c); };
  const moveStart = (m: number) => { const len = end - start; setStart(m); setEnd(Math.min(24 * 60 - 15, m + Math.max(15, len))); };

  const save = () => {
    if (!title.trim()) { haptic.warn(); toast(plan ? '何をやるかを入れてください' : '締切の名前を入れてください'); return; }
    if (!plan) {
      const days = Math.round((day0(d).getTime() - day0(new Date()).getTime()) / 86_400_000);
      addDeadline({ t: title.trim(), mo: d.getMonth() + 1, day: d.getDate(), urgent: days <= 21, note: note.trim() || undefined });
      haptic.success();
      close();
      toast('締切を追加しました', `${shortDate(d)} · あと${days}日`);
      return;
    }
    if (!name.trim()) { haptic.warn(); toast('科目を入れてください', '記録とグラフは科目ごとに分かれます'); return; }
    if (timed && end <= start) { haptic.warn(); setOpen('end'); toast('終わりの時刻を開始より後にしてください'); return; }
    // the subject: one you have (its color follows what you picked), or a new one
    let s = match?.id;
    if (match && match.c !== color) updateSubject(match.id, { c: color });
    if (!s) s = addSubject({ name: name.trim(), area: 'other', c: color });
    saveBlock({
      id: existing?.id, s, t: title.trim(), note: note.trim() || undefined,
      start: timed ? toClock(start) : undefined, min: timed ? end - start : 0,
      days: weekly ? (existing && !existing.date ? existing.days : [mondayIndex(d)]) : [], date: weekly ? undefined : dateKey(d),
    });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? `毎週${DOW[mondayIndex(d)]}曜` : shortDate(d)}${timed ? ` ${toClock(start)}〜${toClock(end)}` : ''} · ${name.trim()}`);
  };

  return (
    <View style={{ gap: 14, paddingTop: 2 }}>
      {/* ✕, what you're adding, ✓ */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Press onPress={close} scale={0.9} hitSlop={6} accessibilityLabel="閉じる"
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="x" size={17} color={t.ink} />
        </Press>
        <View style={{ flex: 1, flexDirection: 'row', height: 40, borderRadius: 20, backgroundColor: t.surface, padding: 3 }} accessibilityRole="tablist">
          {([['plan', '予定'], ['deadline', '締切']] as const).map(([k, label]) => {
            const on = kind === k;
            return (
              <Press key={k} onPress={() => { if (!existing) { haptic.tap(); setKind(k); setOpen(null); } }} disabled={!!existing && !on} scale={0.96}
                accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={{ flex: 1, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.sunken : 'transparent' }}>
                <Txt size={14} w={on ? '700' : '500'} tone={on ? 'ink' : 'ink2'}>{label}</Txt>
              </Press>
            );
          })}
        </View>
        <Press onPress={save} scale={0.9} hitSlop={6} accessibilityLabel={existing ? '保存する' : '追加する'}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accent, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={18} color="#fff" />
        </Press>
      </View>

      {/* the title and the when, with the subject's color down the side */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ width: 4, borderRadius: 2, backgroundColor: accent }} />
        <View style={{ flex: 1, minWidth: 0, gap: 12 }}>
          <Group>
            <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder={plan ? '何をやる？（例：青チャート 例題41〜50）' : '締切の名前（例：英検 申込）'}
              placeholderTextColor={t.ink3} multiline autoFocus={!existing} accessibilityLabel={plan ? '何をやるか' : '締切の名前'}
              style={[{ minHeight: 64, margin: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: t.sunken, fontSize: 21, lineHeight: 28, fontFamily: font.text, fontWeight: '700', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          </Group>
          <Group>
            {plan ? (
              <>
                <Row label="開始" first>
                  <Chip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="日付を変える" />
                  {timed ? <Chip on={open === 'start'} onPress={() => toggle('start')} label={toClock(start)} a11y="開始の時刻を変える" /> : null}
                </Row>
                {open === 'date' ? <Month value={d} onPick={(x) => { setD(x); setOpen(null); }} dots={(x) => plansOn(blocks, x).length} /> : null}
                {open === 'start' ? <TimePick value={start} onChange={moveStart} /> : null}
                {timed ? (
                  <>
                    <Row label="終了">
                      <Chip label={shortDate(d)} a11y="終わりの日付（開始と同じ日）" />
                      <Chip on={open === 'end'} onPress={() => toggle('end')} label={toClock(end)} a11y="終わりの時刻を変える" />
                    </Row>
                    {open === 'end' ? <TimePick value={end} onChange={setEnd} /> : null}
                  </>
                ) : null}
                <Row label="時刻なし" icon="clock">
                  <Switch on={!timed} onChange={(v) => { setTimed(!v); setOpen(null); }} label="時刻を決めない" />
                </Row>
                <Row label="繰り返し" icon="cal">
                  <Press onPress={() => { haptic.tap(); setWeekly(!weekly); }} hitSlop={8} accessibilityLabel={`繰り返し：${weekly ? '毎週' : 'しない'}。変える`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Txt size={15} tone="ink2">{weekly ? `毎週${DOW[mondayIndex(d)]}曜` : 'しない'}</Txt>
                    <Icon name="chev" size={11} color={t.ink3} />
                  </Press>
                </Row>
              </>
            ) : (
              <>
                <Row label="日付" first>
                  <Chip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="日付を変える" />
                </Row>
                {open === 'date' ? <Month value={d} onPick={(x) => { setD(x); setOpen(null); }} /> : null}
              </>
            )}
          </Group>
        </View>
      </View>

      {plan ? (
        <Section title="科目">
          <Group>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 10, minHeight: 64 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <TextInput value={name} onChangeText={(v) => typeName(v.slice(0, 12))} placeholder="科目（例：数学）" placeholderTextColor={t.ink3} accessibilityLabel="科目"
                  style={[{ fontSize: 16, fontFamily: font.text, fontWeight: '600', color: t.ink, paddingVertical: 8 }, noOutline]} />
                <Txt size={12} tone="ink3">{name.trim() ? (match ? 'いまの科目' : '新しい科目として足します') : '色はグラフでその科目の色になります'}</Txt>
              </View>
              <Press onPress={() => toggle('color')} scale={0.92} accessibilityLabel="科目の色を選ぶ"
                style={{ width: 52, height: 44, borderRadius: 12, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="edit" size={15} color="#fff" />
              </Press>
            </View>
            {open === 'color' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 14, paddingBottom: 12 }}>
                {SUBJECT_COLORS.map((c) => (
                  <Press key={c} onPress={() => { haptic.tap(); setColor(c); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: c === color }} accessibilityLabel={`色 ${c}`}
                    style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: t.surface, boxShadow: c === color ? `0px 0px 0px 2px ${c}` : undefined }} />
                ))}
              </View>
            ) : null}
            {subjects.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
                {subjects.map((x) => (
                  <Press key={x.id} onPress={() => { haptic.tap(); setName(x.name); setColor(x.c); }} scale={0.94} accessibilityLabel={`${x.name}にする`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: match?.id === x.id ? t.sunken : 'transparent', borderWidth: hair, borderColor: t.line2 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.c }} />
                    <Txt size={12.5} w="600" tone="ink2">{x.name}</Txt>
                  </Press>
                ))}
              </View>
            ) : null}
          </Group>
        </Section>
      ) : null}

      <Section title="メモ">
        <Group>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder={plan ? '持ち物、気をつけること、前回の続きなど' : '受付の時間、持ち物など'} placeholderTextColor={t.ink3}
            multiline accessibilityLabel="メモ" style={[{ minHeight: 80, padding: 14, fontSize: 15, lineHeight: 22, fontFamily: font.text, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
        </Group>
      </Section>

      {existing ? (
        <Group>
          <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} accessibilityLabel="この予定を削除"
            style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={15} w="600" color={DEADLINE_RED}>予定を削除</Txt>
          </Press>
        </Group>
      ) : null}
    </View>
  );
}

/** A white rounded card on the sheet's gray. */
function Group({ children }: { children: React.ReactNode }) {
  const t = useT();
  return <View style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>{children}</View>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13.5} w="600" tone="ink3" style={{ paddingLeft: 12 }}>{title}</Txt>
      {children}
    </View>
  );
}
/** A labeled line of a group: the label on the left, what it's set to on the right. */
function Row({ label, icon, first, children }: { label: string; icon?: 'clock' | 'cal'; first?: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderTopWidth: first ? 0 : hair, borderTopColor: t.line }}>
      {icon ? <Icon name={icon} size={16} color={t.ink2} /> : null}
      <Txt size={15.5} style={{ flex: 1 }}>{label}</Txt>
      {children}
    </View>
  );
}
function Chip({ label, on, onPress, a11y }: { label: string; on?: boolean; onPress?: () => void; a11y: string }) {
  const t = useT();
  return (
    <Press onPress={onPress ?? (() => {})} disabled={!onPress} scale={0.95} accessibilityLabel={a11y}
      style={{ height: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.blueSoft : t.sunken }}>
      <Txt num size={14.5} w="500" color={on ? t.blue : t.ink}>{label}</Txt>
    </Press>
  );
}
function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useT();
  return (
    <Press onPress={() => { haptic.tap(); onChange(!on); }} haptics={false} scale={0.95} accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ width: 52, height: 32, borderRadius: 16, padding: 3, backgroundColor: on ? '#34C759' : t.line2, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', boxShadow: '0px 1px 3px rgba(0,0,0,0.2)' }} />
    </Press>
  );
}
/** A time, in 15 minutes: the hour, then the minutes. */
function TimePick({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  const t = useT();
  const h = Math.floor(value / 60), m = value % 60;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: t.canvas }}>
      <Stepper value={h} min={0} max={23} onChange={(x) => onChange(x * 60 + m)} unit="時" label="時" />
      <Choice value={String(m - (m % 15))} onChange={(x) => onChange(h * 60 + Number(x))} options={['0', '15', '30', '45'].map((x) => ({ v: x, label: `${x.padStart(2, '0')}分` }))} />
    </View>
  );
}
/** A month to pick a day from (not before today); dots for the plans already on a day. */
function Month({ value, onPick, dots }: { value: Date; onPick: (d: Date) => void; dots?: (d: Date) => number }) {
  const t = useT();
  const today = day0(new Date());
  const [m, setM] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const lead = mondayIndex(m);
  const count = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => new Date(m.getFullYear(), m.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const atThisMonth = m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth();
  const shift = (by: number) => { haptic.tap(); setM(new Date(m.getFullYear(), m.getMonth() + by, 1)); };
  return (
    <View style={{ paddingHorizontal: 10, paddingBottom: 10, backgroundColor: t.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 }}>
        <Txt num size={15} w="700" style={{ flex: 1 }}>{`${m.getFullYear()}年${m.getMonth() + 1}月`}</Txt>
        <Press onPress={() => shift(-1)} disabled={atThisMonth} hitSlop={8} scale={0.9} accessibilityLabel="前の月" style={{ padding: 6, opacity: atThisMonth ? 0.3 : 1 }}>
          <Icon name="back" size={16} color={t.blue} />
        </Press>
        <Press onPress={() => shift(1)} hitSlop={8} scale={0.9} accessibilityLabel="次の月" style={{ padding: 6 }}>
          <Icon name="chev" size={16} color={t.blue} />
        </Press>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DOW.map((w) => <Txt key={w} size={11} w="700" tone="ink3" style={{ width: `${100 / 7}%`, textAlign: 'center', paddingBottom: 4 }}>{w}</Txt>)}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((x, i) => {
          if (!x) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, height: 42 }} />;
          const past = x < today, on = dateKey(x) === dateKey(value), isToday = x.getTime() === today.getTime();
          const n = dots?.(x) ?? 0;
          return (
            <Press key={dateKey(x)} onPress={() => { haptic.tap(); onPick(x); }} disabled={past} scale={0.9} accessibilityLabel={`${jpDate(x)}${n ? `。予定${n}件` : ''}`}
              style={{ width: `${100 / 7}%`, height: 42, alignItems: 'center', justifyContent: 'center', opacity: past ? 0.3 : 1 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.blue : 'transparent' }}>
                <Txt num size={14.5} w={on || isToday ? '700' : '500'} color={on ? '#fff' : isToday ? t.blue : t.ink}>{x.getDate()}</Txt>
              </View>
              {n ? <View style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: 2, backgroundColor: t.ink3 }} /> : null}
            </Press>
          );
        })}
      </View>
    </View>
  );
}
