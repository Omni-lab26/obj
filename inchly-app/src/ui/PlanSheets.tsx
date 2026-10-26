import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { SUBJECT_COLORS } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { Block, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, removeBlock, saveBlock, updateSubject, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { DatePick, Opens, PickChip, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { openSheet } from './Sheet';
import { toast } from './Toast';

// Adding to the timetable or a deadline, laid out like a calendar's new event:
// ✕, 予定 / 締切, and ✓ along the top; the title; the start and the end (each
// a day and a time — the end can be the next day), and repeat; then the
// subject with its color (for the charts), and a memo. Days and times are
// picked as on an iPhone, opening right under their row; the keyboard waits
// until you tap a field.

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

type Open = 'date' | 'start' | 'endDate' | 'end' | 'color' | null;
const DAY = 24 * 60;

function Editor({ close, date, existing, kind: kind0 }: { close: () => void; date?: Date; existing?: Block; kind: Kind }) {
  const t = useT();
  const subjects = useSubjects();
  const today = day0(new Date());
  const [kind, setKind] = useState<Kind>(existing ? 'plan' : kind0);
  const [title, setTitle] = useState(existing?.t ?? '');
  const [d, setD] = useState(() => (existing?.date ? parseKey(existing.date) : day0(date ?? new Date())));
  const nextHour = Math.min(22, new Date().getHours() + 1) * 60;
  const [start, setStart] = useState(existing?.start ? toMin(existing.start) : nextHour);
  // the end, in minutes from the start day's midnight: past 24:00 is the next day
  const [end, setEnd] = useState(() => (existing?.start ? toMin(existing.start) + (existing.min || 60) : nextHour + 60));
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
  const endDay = new Date(d.getFullYear(), d.getMonth(), d.getDate() + Math.floor(end / DAY));
  const nextDay = end >= DAY;
  // moving the start keeps the length; an end before the start goes to the next day
  const moveStart = (m: number) => { setEnd(m + (end - start)); setStart(m); };
  const moveEnd = (m: number, offset = Math.floor(end / DAY)) => { let e = offset * DAY + m; if (e <= start) e += DAY; setEnd(Math.min(start + DAY, e)); };
  const typeName = (v: string) => { setName(v); const m = subjects.find((x) => x.name === v.trim()); if (m) setColor(m.c); };

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
    // the subject: one you have (its color follows what you picked), or a new one
    let s = match?.id;
    if (match && match.c !== color) updateSubject(match.id, { c: color });
    if (!s) s = addSubject({ name: name.trim(), area: 'other', c: color });
    saveBlock({
      id: existing?.id, s, t: title.trim(), note: note.trim() || undefined,
      start: toClock(start), min: end - start,
      days: weekly ? (existing && !existing.date ? existing.days : [mondayIndex(d)]) : [], date: weekly ? undefined : dateKey(d),
    });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? `毎週${DOW[mondayIndex(d)]}曜` : shortDate(d)} ${toClock(start)}〜${nextDay ? '翌' : ''}${toClock(end % DAY)} · ${name.trim()}`);
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
              placeholderTextColor={t.ink3} multiline accessibilityLabel={plan ? '何をやるか' : '締切の名前'}
              style={[{ minHeight: 64, margin: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, backgroundColor: t.sunken, fontSize: 21, lineHeight: 28, fontFamily: font.text, fontWeight: '700', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          </Group>
          <Group>
            {plan ? (
              <>
                <Row label="開始" first>
                  <PickChip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="始める日を変える" />
                  <PickChip on={open === 'start'} onPress={() => toggle('start')} label={toClock(start)} a11y="始める時刻を変える" />
                </Row>
                {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
                {open === 'start' ? <Opens><TimePick value={start} onChange={moveStart} onDone={() => setOpen(null)} /></Opens> : null}
                <Row label="終了">
                  <PickChip on={open === 'endDate'} onPress={() => toggle('endDate')} label={shortDate(endDay)} a11y={`終わる日を変える${nextDay ? '（翌日）' : ''}`} />
                  <PickChip on={open === 'end'} onPress={() => toggle('end')} label={toClock(end % DAY)} a11y="終わる時刻を変える" />
                </Row>
                {open === 'endDate' ? (
                  <Opens>
                    <DatePick value={endDay} min={d} max={new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)} onDone={() => setOpen(null)}
                      onChange={(x) => moveEnd(end % DAY, Math.round((day0(x).getTime() - d.getTime()) / 86_400_000))} />
                  </Opens>
                ) : null}
                {open === 'end' ? <Opens><TimePick value={end % DAY} onChange={(m) => moveEnd(m)} onDone={() => setOpen(null)} /></Opens> : null}
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
                  <PickChip on={open === 'date'} onPress={() => toggle('date')} label={shortDate(d)} a11y="日付を変える" />
                </Row>
                {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
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
  return <Animated.View layout={SMOOTH} style={{ backgroundColor: t.surface, borderRadius: 18, overflow: 'hidden' }}>{children}</Animated.View>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Animated.View layout={SMOOTH} style={{ gap: 6 }}>
      <Txt size={13.5} w="600" tone="ink3" style={{ paddingLeft: 12 }}>{title}</Txt>
      {children}
    </Animated.View>
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
