import { useState } from 'react';
import { Keyboard, ScrollView, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AREAS, guessArea, OTHER_COLORS, shadeFor, subj } from '../data';
import { dateKey, mondayIndex, parseKey } from '../lib/time';
import { pickPlanIcon } from '../lib/planIcon';
import { Block, toClock, toMin } from '../lib/timetable';
import { addDeadline, addSubject, dropFavorite, dropIcon, type Fav, keepIcon, removeBlock, saveBlock, useStore, useSubjects } from '../store';
import { font, hair, noOutline, useT } from '../theme';
import { haptic, Press, StdKey, SubjTile, Txt } from './base';
import { ContentHints } from './ContentHints';
import { DatePick, Opens, PickChip, SMOOTH, TimePick } from './DateTime';
import { Icon } from './Icon';
import { PlanArt } from './PlanArt';
import { openSheet } from './Sheet';
import { toast } from './Toast';
import { Pix } from '../themes/standard/pixel';
import { ring, S, SR, useStd } from './stdLook';

// Adding to the timetable, or a deadline (each its own sheet): やめる, what this
// is and 追加 along the top, then only what a plan needs, top to bottom: its icon
// (app-icon size) beside the 教科 over the メモ (as its row in the timetable), the
// day (a week of days in a row, the calendar for later), the time.
// The icon is the subject: tap it to pick one from the subjects' pictures (化学
// is a flask …) or make a new one; 足す (always last) picks a photo to stand in
// for the picture, and keeps it as your own icon — next time it's in the grid,
// with the subject it was picked with (long press takes it off). The times are
// optional: no start, the plan is just for its day; no end, it runs until the
// next one. A plan is for its day (no 毎週). Things move
// with iOS's curve, never a bounce.
// Drawn the way iOS draws a new event, and kept low in contrast: やめる and 追加
// as blue text, small grey names over white groups, 日付 and 時刻 (start 〜 end)
// as Calendar's rows, in grey chips that open iOS's pickers.
// The plan's メモ is the one line under its subject everywhere (saved as what to
// do; an older plan's separate memo is folded into it when it's edited).
// A new plan starts with よく使う: the plans kept with ♡ on their timer card,
// in a row; a tap fills the form in with one (long press lets it go).
// The keyboard waits for a tap.

const DOW = ['月', '火', '水', '木', '金', '土', '日'];
const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shortDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日（${DOW[mondayIndex(d)]}）`;
// the day in its chip, as compact as Calendar's
const chipDate = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日(${DOW[mondayIndex(d)]})`;
const DEADLINE_RED = '#FF3B30';

type Kind = 'plan' | 'deadline';
/** noDay: no 曜日 row (the plan being studied, edited from its timer card: it stays on its day). */
export function planSheet(o: { date?: Date; existing?: Block; kind?: Kind; noDay?: boolean } = {}) {
  openSheet((close) => <Editor close={close} date={o.date} existing={o.existing} kind={o.kind ?? 'plan'} noDay={o.noDay} />, { grouped: true, center: true, corner: 12 });
}
/** The timetable's 追加: a new plan for today (the day can be changed in the sheet). */
export const planCalendar = () => planSheet({ date: new Date() });

type Open = 'date' | 'start' | 'end' | 'subject' | 'new' | null;
const DAY = 24 * 60;

function Editor({ close, date, existing, kind: kind0, noDay }: { close: () => void; date?: Date; existing?: Block; kind: Kind; noDay?: boolean }) {
  const t = useT();
  const std = useStd();
  const subjects = useSubjects();
  const today = day0(new Date());
  const kind: Kind = existing ? 'plan' : kind0;
  // a plan's メモ (what to do; an older separate memo comes first), or the deadline's name
  const [title, setTitle] = useState(existing ? existing.note || existing.t || '' : '');
  const [d, setD] = useState(() => (existing?.date ? parseKey(existing.date) : day0(date ?? new Date())));
  const nextHour = Math.min(22, new Date().getHours() + 1) * 60;
  // the start is optional too (null: no time — the plan is just for its day)
  const [start, setStartAt] = useState<number | null>(existing?.start ? toMin(existing.start) : null);
  const setStart = (m: number) => setStartAt(m);
  // the end is optional: a length in minutes, 0 for none (the plan then runs until the next one starts).
  // Moving the start keeps the length, as in Calendar.
  const [len, setLen] = useState(existing?.start ? existing.min ?? 0 : 0);
  const at = start ?? 0;
  const end = at + len;
  // the end picked on its wheel, after the start (past midnight: the next day)
  const setEnd = (m: number) => setLen(((m - at + DAY) % DAY) || DAY);
  // a plan is for its day; one made weekly before (no date) stays weekly, on its days until its day is changed
  const weekly = !!existing && !existing.date;
  const [moved, setMoved] = useState(false);
  const days = existing && !existing.date && !moved ? existing.days : [mondayIndex(d)];
  const daysLabel = `毎週${days.map((i) => DOW[i]).join('・')}曜`;
  const known = existing ? subjects.find((x) => x.id === existing.s) : undefined;
  const [name, setName] = useState(known?.name ?? '');
  const [color, setColor] = useState(known?.c ?? OTHER_COLORS[0]);
  const [note, setNote] = useState(existing?.note ?? '');
  const [icon, setIcon] = useState(existing?.icon);
  const [open, setOpen] = useState<Open>(null);
  const mine = useStore((x) => x.myIcons);
  const favs = useStore((x) => x.favorites);
  // a kept plan: everything it was, on the day this sheet is for
  const takeFav = (f: Fav) => {
    haptic.tap();
    const sj = subj(f.s);
    setName(sj.name); setColor(sj.c); setTitle(f.note || f.t || ''); setIcon(f.icon);
    setStartAt(f.start ? toMin(f.start) : null); setLen(f.start ? f.min ?? 0 : 0);
    setOpen(null);
  };

  const plan = kind === 'plan';
  const match = subjects.find((x) => x.name === name.trim());
  const toggle = (k: Open) => { haptic.tap(); if (k !== 'new') Keyboard.dismiss(); setOpen(open === k ? null : k); };
  // typing closes whatever picker is open, as in Calendar
  const typing = () => { if (open && open !== 'new') setOpen(null); };
  const nextDay = end >= DAY;
  const choose = async () => {
    Keyboard.dismiss();
    setOpen(null);
    const got = await pickPlanIcon().catch(() => null);
    // kept as your own icon, with the subject chosen now, to pick again next time
    if (got) { haptic.soft(); setIcon(got); keepIcon(got, match?.id); }
  };

  const save = () => {
    if (!plan) {
      if (!title.trim()) { haptic.warn(); toast('締切の名前を入れてください'); return; }
      const days = Math.round((day0(d).getTime() - day0(new Date()).getTime()) / 86_400_000);
      addDeadline({ t: title.trim(), mo: d.getMonth() + 1, day: d.getDate(), urgent: days <= 21, note: note.trim() || undefined });
      haptic.success();
      close();
      toast('締切を追加しました', `${shortDate(d)} · あと${days}日`);
      return;
    }
    if (!name.trim()) { haptic.warn(); setOpen('subject'); toast('教科を選んでください', '記録とグラフは教科ごとに分かれます'); return; }
    // the subject: one you have, or a new one
    let s = match?.id;
    // a new one goes in the 教科 its name points to, in that 教科's color (colors are fixed: data.ts)
    if (!s) s = addSubject({ name: name.trim(), area: guessArea(name), c: color });
    saveBlock({
      id: existing?.id, s, t: title.trim() || undefined, note: undefined, icon,
      start: start === null ? undefined : toClock(start), min: start === null ? 0 : len,
      days: weekly ? days : [], date: weekly ? undefined : dateKey(d),
    });
    haptic.success();
    close();
    toast(existing ? '予定を保存しました' : '予定を追加しました', `${weekly ? daysLabel : shortDate(d)}${start === null ? '' : ` ${toClock(start)}から${len ? `${nextDay ? '翌' : ''}${toClock(end % DAY)}まで` : ''}`} · ${name.trim()}`);
  };

  const lenLabel = len % 60 === 0 ? `${len / 60}時間` : len > 60 ? `${Math.floor(len / 60)}時間${len % 60}分` : `${len}分`;
  const daysLeft = Math.round((day0(d).getTime() - today.getTime()) / 86_400_000);
  const accent = plan ? t.blue : DEADLINE_RED;

  return (
    <View style={{ gap: 16, paddingTop: 2 }}>
      {/* やめる · what this is · 追加, as text buttons the way iOS lays a new event out */}
      {std ? (
        // スタンダード: やめる in words, the title, and the sheet's one decision as a small ink key (on lime)
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
          <Press onPress={close} scale={0.94} hitSlop={8} accessibilityLabel="やめる" style={{ minWidth: 64, minHeight: 44, justifyContent: 'center' }}>
            <Txt size={15} w="700">やめる</Txt>
          </Press>
          <Txt size={17} w="800" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{plan ? (existing ? '予定を編集' : '予定を追加') : '締切を追加'}</Txt>
          <View style={{ minWidth: 64, alignItems: 'flex-end' }}>
            <StdKey onPress={save} label={existing ? '保存する' : '追加する'} fill={S.ink} under={S.limeDeep} kd={3} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={{ minHeight: 34, marginBottom: 3 }} face={{ minHeight: 34, paddingHorizontal: 14 }}>
              <Txt size={14} w="700" lh={18} color={S.onInk}>{existing ? '保存' : '追加'}</Txt>
            </StdKey>
          </View>
        </View>
      ) : (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
        <Press onPress={close} scale={0.94} hitSlop={8} accessibilityLabel="やめる" style={{ minWidth: 64 }}>
          <Txt size={16} color={accent}>やめる</Txt>
        </Press>
        <Txt size={16} w="600" accessibilityRole="header" style={{ flex: 1, textAlign: 'center' }}>{plan ? (existing ? '予定を編集' : '予定を追加') : '締切を追加'}</Txt>
        <Press onPress={save} scale={0.94} hitSlop={8} accessibilityLabel={existing ? '保存する' : '追加する'} style={{ minWidth: 64, alignItems: 'flex-end' }}>
          <Txt size={16} w="600" color={accent}>{existing ? '保存' : '追加'}</Txt>
        </Press>
      </View>
      )}

      {/* よく使う: the plans kept with ♡, a tap fills the form in */}
      {plan && !existing && favs.length ? (
        <Field label="よく使う">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {favs.map((f) => {
              const sj = subj(f.s);
              return (
                <Press key={f.id} onPress={() => takeFav(f)} onLongPress={() => { haptic.firm(); dropFavorite(f.id); toast('よく使う予定から外しました', `${sj.name} · ${f.t}`); }} scale={0.96}
                  accessibilityLabel={`よく使う予定：${sj.name} ${f.t}${f.start ? ` ${f.start}から` : ''}。押すと入ります`} accessibilityHint="長押しで外せます"
                  style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 14, height: 52, borderRadius: 12, backgroundColor: t.surface, maxWidth: 240 },
                    std && { marginVertical: 3, marginHorizontal: 2, backgroundColor: S.card, boxShadow: ring(1.5) }]}>
                  <PlanArt icon={f.icon} name={sj.name} color={sj.c} size={40} radius={8} />
                  <View style={{ minWidth: 0, flexShrink: 1 }}>
                    <Txt size={14} w="600" numberOfLines={1}>{f.t || sj.name}</Txt>
                    <Txt size={11.5} tone="ink3" numberOfLines={1}>{`${sj.name}${f.start ? ` · ${f.start}${f.min ? ` · ${f.min}分` : ''}` : ''}`}</Txt>
                  </View>
                  <Icon name="heart" size={13} color="#FF2D55" filled />
                </Press>
              );
            })}
          </ScrollView>
        </Field>
      ) : null}

      {plan ? (
        <>
          {/* the icon (app-icon size; it is the subject) on the left; on the right the 教科 over the メモ, as the plan's row in the timetable */}
          <Group>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 14, paddingRight: 6, paddingVertical: 12 }}>
              <Press onPress={() => toggle('subject')} scale={0.94} accessibilityLabel={name.trim() ? `アイコン（教科）：${name.trim()}。変える` : 'アイコン（教科）を選ぶ'} accessibilityState={{ expanded: open === 'subject' }}>
                {name.trim() || icon ? (
                  std ? (
                    // スタンダード: the subject's square in ink (a photo edged in ink); open, a lime ring around it
                    <View style={{ margin: 3, borderRadius: 13, boxShadow: open === 'subject' ? `0px 0px 0px 2px ${S.ink}, 0px 0px 0px 5px ${S.lime}, 0px 0px 0px 7px ${S.ink}` : ring() }}>
                      {icon ? <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={56} radius={13} /> : <SubjTile name={name.trim() || '？'} color={color} size={56} radius={13} />}
                    </View>
                  ) : (
                  <View style={{ borderRadius: 16, borderWidth: 2, borderColor: open === 'subject' ? t.blue : 'transparent', padding: 1.5 }}>
                    <PlanArt icon={icon} name={name.trim() || '？'} color={color} size={58} radius={13} />
                  </View>
                  )
                ) : (
                  <View style={[{ width: 63, height: 63, borderRadius: 15, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center' },
                    std && { borderWidth: 2, borderColor: 'rgba(23,18,31,0.4)', backgroundColor: S.card }]}>
                    {std ? <Pix name="plus" px={3} /> : <Icon name="plus" size={20} color={t.ink2} />}
                  </View>
                )}
              </Press>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Press onPress={() => toggle('subject')} scale={0.98} accessibilityLabel={name.trim() ? `教科：${name.trim()}。変える` : '教科を選ぶ'}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingRight: 8 }}>
                  <Txt size={18} w="700" tone={name.trim() ? 'ink' : 'ink3'} numberOfLines={1} style={{ flexShrink: 1 }}>{name.trim() || '教科'}</Txt>
                  <View style={{ transform: [{ rotate: open === 'subject' ? '-90deg' : '90deg' }] }}><Icon name="chev" size={13} color={t.ink3} /></View>
                </Press>
                <View style={{ height: std ? 1.5 : hair, backgroundColor: t.line }} />
                <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder={std ? 'メモ（例：例題41〜50）' : 'メモ（例：青チャート 例題41〜50）'}
                  placeholderTextColor={t.ink3} onFocus={typing} accessibilityLabel="メモ" returnKeyType="done"
                  style={[{ height: 34, paddingVertical: 0, paddingRight: 8, fontSize: 15, fontFamily: font.text, color: t.ink }, noOutline]} />
              </View>
            </View>
            {/* what you've written before (plans' メモ, records' contents), one row: a tap puts it in */}
            <View style={{ paddingHorizontal: 12, paddingBottom: 10, marginTop: -4 }}>
              <ContentHints s={match?.id ?? null} typed={title} onPick={(w) => setTitle(w.slice(0, 40))} />
            </View>
              {/* the subjects as the icons to pick; a photo can stand in for the picture */}
              {open === 'subject' ? (
                <Opens>
                  <View style={{ alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 }} accessibilityRole="radiogroup">
                    {subjects.map((x) => {
                      const on = match?.id === x.id;
                      return (
                        <Press key={x.id} onPress={() => { haptic.tap(); setName(x.name); setColor(x.c); setOpen(null); }} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x.name}にする`}
                          style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                          <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: on ? t.blue : 'transparent' }}>
                            <SubjTile name={x.name} color={x.c} area={x.area} size={38} radius={5} />
                          </View>
                          <Txt size={11.5} w={on ? '600' : '400'} color={on ? t.blue : t.ink2} numberOfLines={1}>{x.name}</Txt>
                        </Press>
                      );
                    })}
                    {/* your own icons: photos picked before, each with the subject it was picked with (long press: remove) */}
                    {mine.map((x) => {
                      const on = icon === x.icon;
                      const xs = x.s ? subjects.find((y) => y.id === x.s) : undefined;
                      return (
                        <Press key={x.id} onPress={() => { haptic.tap(); setIcon(x.icon); if (xs) { setName(xs.name); setColor(xs.c); } setOpen(null); }}
                          onLongPress={() => { haptic.warn(); dropIcon(x.id); toast('アイコンを外しました', 'この予定の写真はそのまま'); }}
                          scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`自分のアイコン${xs ? `（${xs.name}）` : ''}にする。長押しで外す`}
                          style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                          <View style={{ padding: 2, borderRadius: 8, borderWidth: 2, borderColor: on ? t.blue : 'transparent' }}>
                            <PlanArt icon={x.icon} name={xs?.name ?? '？'} color={xs?.c ?? color} size={38} radius={5} />
                          </View>
                          <Txt size={11.5} w={on ? '600' : '400'} color={on ? t.blue : t.ink2} numberOfLines={1}>{xs?.name ?? '写真'}</Txt>
                        </Press>
                      );
                    })}
                    {/* 足す, always last: a photo of your own, kept as an icon to use again */}
                    <Press onPress={choose} scale={0.92} accessibilityLabel="写真からアイコンを作る"
                      style={{ width: '25%', alignItems: 'center', gap: 4, paddingVertical: 6 }}>
                      <View style={{ padding: 2 }}>
                        <View style={{ width: 38, height: 38, borderRadius: 5, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
                          <Icon name="plus" size={15} color={t.ink2} />
                        </View>
                      </View>
                      <Txt size={11.5} tone="ink2">足す</Txt>
                    </Press>
                  </View>
                  <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: hair, borderTopColor: t.line }}>
                    <Press onPress={() => toggle('new')} hitSlop={8} scale={0.94} accessibilityLabel="科目を足す" style={{ flex: 1, height: 30, justifyContent: 'center' }}>
                      <Txt size={13} w="500" color={t.blue}>新しい科目をつくる</Txt>
                    </Press>
                    {icon ? (
                      <Press onPress={() => { haptic.tap(); setIcon(undefined); }} hitSlop={8} scale={0.94} accessibilityLabel="アイコンの写真を外す"
                        style={{ height: 30, paddingHorizontal: 12, borderRadius: 6, backgroundColor: t.sunken, justifyContent: 'center' }}>
                        <Txt size={13} w="500" color={t.ink2}>写真を外す</Txt>
                      </Press>
                    ) : null}
                  </View>
                </Opens>
              ) : null}
              {open === 'new' ? <Opens><NewSubject onAdd={(x) => { setName(x.name); setColor(x.c); setOpen(null); }} /></Opens> : null}
          </Group>

          {/* 曜日: the coming week in a row (one tap), the calendar for a later day (not for the plan being studied) */}
          {noDay ? null : <Group>
            <WeekRow d={d} today={today} calendar={open === 'date'} onPick={(x) => { haptic.tap(); setD(x); setMoved(true); if (open === 'date') setOpen(null); }} onCalendar={() => toggle('date')} />
            {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => { setD(day0(x)); setMoved(true); }} onDone={() => setOpen(null)} /></Opens> : null}
          </Group>}

          {/* 時刻: the start and the end side by side, as grey chips that open iOS's pickers under the row; the end can stay empty */}
          <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 10, minHeight: 52 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16}>時刻</Txt>
                  {len ? <Txt num size={12} tone="ink3" numberOfLines={1}>{`${nextDay ? '翌日まで · ' : ''}${lenLabel}`}</Txt> : null}
                </View>
                {/* neither is needed: なし until you tap it (then the next hour, or an hour after the start) */}
                <PickChip label={start === null ? 'なし' : toClock(start)} on={open === 'start'} a11y={start === null ? '始める時刻を入れる' : '始める時刻を変える'}
                  onPress={() => { if (start === null) setStartAt(nextHour); toggle('start'); }} />
                {start === null ? null : (
                  <>
                    <Txt size={15} tone="ink3">〜</Txt>
                    <PickChip label={len ? toClock(end % DAY) : 'なし'} on={open === 'end'} a11y={len ? '終わる時刻を変える' : '終わる時刻を入れる'}
                      onPress={() => { if (!len) setLen(60); toggle('end'); }} />
                    {/* ×: takes off the end, else the start */}
                    <Press onPress={() => { haptic.tap(); if (len) setLen(0); else setStartAt(null); setOpen(null); }} hitSlop={10} scale={0.9}
                      accessibilityLabel={len ? '終わる時刻を消す' : '始める時刻を消す'}
                      style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }, std && { width: 26, height: 26, borderRadius: 7, backgroundColor: S.paper2 }]}>
                      {std ? <Pix name="x" px={1} /> : <Icon name="x" size={11} color={t.ink3} />}
                    </Press>
                  </>
                )}
              </View>
              {open === 'start' && start !== null ? <Opens><TimePick value={start} onChange={setStart} onDone={() => setOpen(null)} /></Opens> : null}
              {open === 'end' && len ? <Opens><TimePick value={end % DAY} onChange={setEnd} onDone={() => setOpen(null)} /></Opens> : null}
          </Group>
        </>
      ) : (
        <>
          <Field label="締切">
            <Group>
              <TextInput value={title} onChangeText={(v) => setTitle(v.slice(0, 40))} placeholder="英検 申込"
                placeholderTextColor={t.ink3} multiline onFocus={typing} accessibilityLabel="締切の名前"
                style={[{ minHeight: 56, paddingHorizontal: 16, paddingTop: 15, paddingBottom: 12, fontSize: 17, lineHeight: 24, fontFamily: font.text, fontWeight: '600', color: t.ink, textAlignVertical: 'top' }, noOutline]} />
            </Group>
          </Field>
          <Field>
            <Group>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 10, minHeight: 56 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt size={16}>締切日</Txt>
                  <Txt num size={12} w={std && daysLeft <= 3 ? '700' : '400'} color={daysLeft <= 3 ? (std ? '#A65F00' : DEADLINE_RED) : t.ink3}>{daysLeft <= 0 ? '今日' : `あと${daysLeft}日`}</Txt>
                </View>
                <PickChip label={chipDate(d)} on={open === 'date'} onPress={() => toggle('date')} a11y="日付を変える" />
              </View>
              {open === 'date' ? <Opens><DatePick value={d} min={today} onChange={(x) => setD(day0(x))} onDone={() => setOpen(null)} /></Opens> : null}
            </Group>
          </Field>
        </>
      )}

      {plan ? null : (
      <Field label="メモ">
        <Group>
          <TextInput value={note} onChangeText={(v) => setNote(v.slice(0, 200))} placeholder="受付の時間、持ち物など" placeholderTextColor={t.ink3}
            multiline onFocus={typing} accessibilityLabel="締切のメモ" style={[{ minHeight: 76, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, lineHeight: 22, fontFamily: font.text, color: t.ink, textAlignVertical: 'top' }, noOutline]} />
          <Txt num size={11} tone="ink3" style={{ textAlign: 'right', paddingHorizontal: 12, paddingBottom: 8 }}>{`${note.length}/200`}</Txt>
        </Group>
      </Field>
      )}

      {existing ? (std ? (
        // スタンダード: a key whose words are crimson (taking something away)
        <StdKey onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} label="この予定を削除" style={{ minHeight: 48, marginBottom: 4 }} face={{ minHeight: 48 }}>
          <Txt size={15} w="700" color={S.pause}>予定を削除</Txt>
        </StdKey>
      ) : (
        <Group>
          <Press onPress={() => { removeBlock(existing.id); haptic.warn(); close(); toast('予定を削除しました'); }} accessibilityLabel="この予定を削除"
            style={{ height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={16} color={DEADLINE_RED}>予定を削除</Txt>
          </Press>
        </Group>
      )) : null}
    </View>
  );
}

/** The coming week as a row of days (今日 first), one tap each; the last cell opens the calendar (and shows a later day picked there). */
function WeekRow({ d, today, calendar, onPick, onCalendar }: { d: Date; today: Date; calendar: boolean; onPick: (x: Date) => void; onCalendar: () => void }) {
  const t = useT();
  const std = useStd();
  // スタンダード: the picked day lime with an ink edge (what's picked), its words in ink
  const pick = std ? { backgroundColor: S.lime, boxShadow: ring() } : { backgroundColor: t.ink };
  const onFg = std ? S.ink : t.onInk;
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
  const later = !week.some((x) => x.getTime() === d.getTime());
  const cell = { flex: 1, height: 54, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 1 };
  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 8 }} accessibilityRole="radiogroup">
      {week.map((x, i) => {
        const on = x.getTime() === d.getTime();
        return (
          <Press key={i} onPress={() => onPick(x)} scale={0.92} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${i === 0 ? '今日 ' : ''}${shortDate(x)}`}
            style={[cell, on ? pick : { backgroundColor: 'transparent' }, std && { borderRadius: 10 }]}>
            <Txt size={10.5} w={std && i === 0 ? '800' : '600'} lh={13} color={on ? onFg : i === 0 ? t.blue : mondayIndex(x) >= 5 ? t.ink2 : t.ink3}>{i === 0 ? '今日' : DOW[mondayIndex(x)]}</Txt>
            <Txt num size={17} w={on ? '700' : '600'} lh={21} color={on ? onFg : t.ink}>{String(x.getDate())}</Txt>
          </Press>
        );
      })}
      <Press onPress={onCalendar} scale={0.92} accessibilityLabel={later ? `${shortDate(d)}。カレンダーで変える` : 'もっと先の日をカレンダーで選ぶ'} accessibilityState={{ expanded: calendar }}
        style={[cell, later ? pick : { backgroundColor: t.sunken }, std && { borderRadius: 10 }, std && !later && calendar && { backgroundColor: S.lime, boxShadow: ring() }]}>
        {later ? (
          <>
            <Txt size={10.5} w="600" lh={13} color={onFg}>{`${d.getMonth() + 1}月`}</Txt>
            <Txt num size={17} w="700" lh={21} color={onFg}>{String(d.getDate())}</Txt>
          </>
        ) : std ? <Pix name="cal" /> : <Icon name="cal" size={18} color={calendar ? t.blue : t.ink2} />}
      </Press>
    </View>
  );
}

/** Adds a subject on the spot, and hands it back to put on the plan. Its 教科 comes from its name (日本史 → 社会) and with it its fixed color; only one in その他 has a color to pick. */
function NewSubject({ onAdd }: { onAdd: (x: { name: string; c: string }) => void }) {
  const t = useT();
  const subjects = useSubjects();
  const [name, setName] = useState('');
  const area = guessArea(name);
  const [mine, setMine] = useState(() => shadeFor('other', subjects));
  const c = area === 'other' ? mine : shadeFor(area, subjects);
  const add = () => {
    const n = name.trim();
    if (!n) { haptic.warn(); toast('科目の名前を入れてください'); return; }
    const same = subjects.find((x) => x.name === n);
    if (same) { haptic.tap(); toast(`「${n}」はもうあります`, 'その科目にしました'); onAdd({ name: same.name, c: same.c }); return; }
    const id = addSubject({ name: n, area, c });
    haptic.success();
    toast(`科目に「${n}」を足しました`, `${AREAS.find((a) => a.id === area)!.name}の色 · 設定 › 科目と色 から直せます`);
    onAdd({ name: n, c: subj(id).c });
  };
  return (
    <View style={{ alignSelf: 'stretch', padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: c }} />
        <TextInput value={name} onChangeText={(v) => setName(v.slice(0, 12))} placeholder="新しい科目（例：日本史）" placeholderTextColor={t.ink3} accessibilityLabel="新しい科目の名前"
          onSubmitEditing={add} returnKeyType="done"
          style={[{ flex: 1, minWidth: 0, fontSize: 16, fontFamily: font.text, color: t.ink, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, backgroundColor: t.sunken }, noOutline]} />
        <Press onPress={add} scale={0.94} accessibilityLabel="この科目を足す"
          style={{ height: 38, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}>
          <Txt size={16} w="600" color={t.blue}>足す</Txt>
        </Press>
      </View>
      {area === 'other' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {OTHER_COLORS.map((x) => (
            <Press key={x} onPress={() => { haptic.tap(); setMine(x); }} scale={0.88} accessibilityRole="radio" accessibilityState={{ checked: x === c }} accessibilityLabel={`色 ${x}`}
              style={{ width: 26, height: 26, borderRadius: 5, backgroundColor: x, borderWidth: x === c ? 3 : 0, borderColor: t.surface, boxShadow: x === c ? `0px 0px 0px 2px ${x}` : undefined }} />
          ))}
        </View>
      ) : (
        <Txt size={12} tone="ink3">{`${AREAS.find((a) => a.id === area)!.name}の科目として、${AREAS.find((a) => a.id === area)!.name}の色になります`}</Txt>
      )}
    </View>
  );
}

/** A card on the frosted pane: near-white, square-ish, a hairline edge, no shadow. */
function Group({ children }: { children: React.ReactNode }) {
  const t = useT();
  const std = useStd();
  // スタンダード: a card with the 2pt ink outline (on the outer view: the inner one clips its rows)
  if (std) {
    return (
      <Animated.View layout={SMOOTH} style={{ borderRadius: SR.mid, backgroundColor: S.card, boxShadow: ring() }}>
        <View style={{ borderRadius: SR.mid, overflow: 'hidden' }}>{children}</View>
      </Animated.View>
    );
  }
  return (
    <Animated.View layout={SMOOTH} style={{ backgroundColor: t.dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)', borderRadius: 10, overflow: 'hidden' }}>
      {children}
    </Animated.View>
  );
}
/** A part of the form: its name (if the row doesn't say it), small and grey as over a group in iOS's Settings, then its card. */
function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  const std = useStd();
  return (
    <Animated.View layout={SMOOTH} style={{ gap: 6 }}>
      {label ? <Txt size={13} w={std ? '700' : '400'} tone={std ? 'ink2' : 'ink3'} style={{ paddingLeft: std ? 4 : 16 }}>{label}</Txt> : null}
      {children}
    </Animated.View>
  );
}
