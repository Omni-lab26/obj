import { Children, ReactNode, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { subj } from '@/data';
import type { Block, Kind } from '@/screens/layout';
import {
  go, hmColon, jpHm, Pick, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak,
} from '@/screens/model';
import type { HomeKit } from '@/themes/types';
import { setChart, useLevel, useStore } from '@/store';
import { radius } from '@/theme';
import { haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon, IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { toast } from '@/ui/Toast';
import { litDots, liveDots, meter } from './dots';
import { stamp, useLook } from './look';
import { Ann, Battery, Blink, Cells, Column, J, Key, M, Marquee, Matrix, Panel, Seg, useFlicker } from './parts';

// デジタル's home: a pocket device. The display leads — today in big
// 7-segment figures, the goal as a row of segments, and what's under way or
// next with a key to start it — then a ticker band, the log as a dot matrix,
// the streak and level as two small displays, ToDos as memos, deadlines as
// alarms, and the link to people studying now.

const W = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const two = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, '0');
/** '39:10' or '1:02:03' */
const clock = (sec: number) => {
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600);
  return h ? `${h}:${two((v / 60) % 60)}:${two(v % 60)}` : `${two(v / 60)}:${two(v % 60)}`;
};

// ---------- page ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: tabPad, gap: 12 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function SmallKey({ icon, label, onPress, dot }: { icon: IconName; label: string; onPress: () => void; dot?: boolean }) {
  const L = useLook();
  return (
    <Key onPress={onPress} label={label} h={32} depth={2} face={{ width: 34, paddingHorizontal: 0 }}>
      <View><Icon name={icon} size={15} color={L.key.ink} width={1.8} /></View>
      {dot ? <View style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: L.accent }} /> : null}
    </Key>
  );
}

/** The top of the case: the maker's mark, the level, the battery (today toward its goal), and three keys. */
function Header() {
  const L = useLook();
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const l = useLevel();
  const today = useToday();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 14, paddingTop: 6, height: 54 }}>
      <Press onPress={levelSheet} scale={0.96} hitSlop={6} accessibilityLabel={`${me}。レベル${l.lv}`} style={{ flexShrink: 1, minWidth: 0 }}>
        <M b size={17} lh={20} color={L.t.ink} ls={2}>INCHLY</M>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ann plain color={L.t.ink3}>{`IN-${two(l.lv)}`}</Ann>
          <J size={11} w="600" color={L.t.ink2} numberOfLines={1} style={{ flexShrink: 1 }}>{me}</J>
        </View>
      </Press>
      <View style={{ flex: 1 }} />
      <View accessible accessibilityLabel={`今日の目標の${Math.round((today.min / Math.max(1, today.goal)) * 100)}%`} style={{ marginRight: 4 }}>
        <Battery p={today.min / Math.max(1, today.goal)} color={L.t.ink2} />
      </View>
      <SmallKey icon="search" label="さがす" onPress={go.search} />
      <SmallKey icon="bell" label="お知らせ" onPress={go.notifications} dot={unread > 0} />
      <SmallKey icon="gear" label="設定" onPress={go.settings} />
    </View>
  );
}

/**
 * Blocks sit stacked; a row puts its displays side by side. Sections that
 * aren't displays of their own (today, now — and any this app doesn't draw)
 * share one display, with a printed rule between them.
 */
function makeFrame(own: Set<Kind>) {
  return function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
    const kids = Children.toArray(children);
    if (block.row) {
      return (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {kids.map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{own.has(block.sections[i]) ? c : <Panel>{c}</Panel>}</View>)}
        </View>
      );
    }
    if (block.sections.every((k) => own.has(k))) return <View style={{ gap: 12 }}>{kids}</View>;
    return <Panel pad={14}>{kids.map((c, i) => <Divided key={i} first={i === 0}>{c}</Divided>)}</Panel>;
  };
}
function Divided({ first, children }: { first: boolean; children: ReactNode }) {
  const L = useLook();
  if (first) return <>{children}</>;
  return <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: L.t.line2, borderStyle: 'dashed' }}>{children}</View>;
}

/** A side key on the left edge (and a swipe right): the デザイン page. */
function DesignHandle({ onPress }: { onPress: () => void }) {
  const L = useLook();
  return (
    <Press onPress={onPress} react="sink" scale={0.9} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '42%', width: 12, height: 60, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: L.key.face,
        boxShadow: `2px 2px 0px ${L.key.base}`, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 5, height: 1.5, backgroundColor: L.key.ink, opacity: 0.6 }} />)}
    </Press>
  );
}

// ---------- the display: today, and what's under way or next ----------
function Today() {
  const L = useLook();
  const today = useToday();
  const { width } = useWindowDimensions();
  const [flick, kick] = useFlicker();
  const total = today.min;
  const value = hmColon(total).padStart(5, ' ');
  const pct = Math.round((total / Math.max(1, today.goal)) * 100);
  const up = today.diff >= 0;
  const h = Math.max(48, Math.min(84, (width - 160) / 2.75));
  const n = width < 360 ? 20 : 24;
  return (
    <Press onPress={() => { haptic.soft(); kick(); }} haptics={false} react="flicker" scale={0.99}
      accessibilityLabel={`今日 ${jpHm(total)}。昨日より${up ? '' : 'マイナス'}${jpHm(Math.abs(today.diff))}。目標の${pct}%`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ann on color={L.t.ink}>TODAY</Ann>
        <View style={{ flex: 1 }} />
        <M size={11} color={L.t.ink3} ls={1}>{stamp(new Date())}</M>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8 }}>
        <Animated.View style={flick}>
          <Seg text={value} h={h} color={L.seg} ghost={L.ghost} glow={L.glow} />
        </Animated.View>
        <View style={{ marginLeft: 6, marginBottom: 2, gap: 2 }}>
          <Ann plain>HR</Ann>
          <Ann plain>MIN</Ann>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ alignItems: 'flex-end', marginBottom: 2 }}>
          <M b size={15} lh={19} color={up ? L.t.ink : L.accent}>{`${up ? '▲' : '▼'} ${hmColon(Math.abs(today.diff))}`}</M>
          <Ann plain>VS YDAY</Ann>
        </View>
      </View>
      <Cells cells={meter(today.parts, today.goal, n)} h={9} gap={2.5} off={L.dotOff} style={{ marginTop: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
        <Ann plain color={pct >= 100 ? L.accent : L.t.ink3}>{pct >= 100 ? 'GOAL CLEAR' : `GOAL ${hmColon(today.goal)}`}</Ann>
        <View style={{ flex: 1 }} />
        <M size={11} color={pct >= 100 ? L.accent : L.t.ink2}>{`${pct}%`}</M>
      </View>
    </Press>
  );
}

const whenOf = (p: Pick) =>
  p.from === 'now' ? `NOW ${p.start}-${p.end}` : p.from === 'next' ? `NEXT ${p.start} T-${p.inMin ?? 0}M` : p.from === 'todo' ? 'FROM TODO' : 'LAST';

function Now() {
  const L = useLook();
  const ss = useSession();
  const pick = useNext();
  if (ss.running) {
    return (
      <Press onPress={go.timer} react="flicker" scale={0.99} accessibilityLabel={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Blink on={!ss.paused}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: L.accent }} /></Blink>
            <Ann plain color={L.accent}>{ss.paused ? 'PAUSE' : 'REC'}</Ann>
          </View>
          <J size={15} w="800" numberOfLines={1}>{ss.subject.name}<J size={12} w="500" color={L.t.ink2}>{ss.task ? `  ${ss.task}` : ''}</J></J>
        </View>
        <Blink on={ss.paused} period={1200}>
          <Seg text={clock(ss.elapsed)} h={24} color={L.seg} ghost={L.ghost} glow={L.glow} />
        </Blink>
        <Key onPress={session.pause} label={ss.paused ? '再開' : '一時停止'} h={34} depth={2} haptics={false} face={{ width: 38, paddingHorizontal: 0 }}>
          <View><Icon name={ss.paused ? 'play' : 'pause'} size={13} color={L.key.ink} /></View>
        </Key>
        <Key onPress={session.finish} label="記録する" tone="accent" h={34} depth={2} face={{ paddingHorizontal: 11 }}>
          <J size={12.5} w="800" color={L.keyAccent.ink}>記録</J>
        </Key>
      </Press>
    );
  }
  const p = subj(pick.s);
  return (
    <Press onPress={go.study} react="flicker" scale={0.99} accessibilityLabel={`${p.name} ${pick.what}。勉強のページを開く`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 1, backgroundColor: p.c }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Ann>{whenOf(pick)}</Ann>
        <J size={15} w="800" numberOfLines={1}>{p.name}<J size={12} w="500" color={L.t.ink2}>{pick.what ? `  ${pick.what}` : ''}</J></J>
      </View>
      <Key onPress={() => startPick(pick)} label={`${p.name}を始める`} tone="accent" h={38} haptics={false} face={{ paddingHorizontal: 14 }}>
        <View><Icon name="play" size={12} color={L.keyAccent.ink} /></View>
        <M b size={13} color={L.keyAccent.ink} ls={1.5}>START</M>
      </Key>
    </Press>
  );
}

// ---------- the ticker ----------
function Ticker() {
  const L = useLook();
  const today = useToday();
  const { streak } = useWeekStreak();
  const l = useLevel();
  const c = useCharts();
  const pick = useNext();
  const ss = useSession();
  const now = ss.running ? `REC ${ss.subject.name}` : `${pick.from === 'now' ? 'NOW' : 'NEXT'} ${subj(pick.s).name}${pick.start ? ` ${pick.start}` : ''}`;
  const text = `TODAY ${hmColon(today.min)}  ◆  STREAK ${streak}D  ◆  LV.${l.lv}  ◆  WEEK ${hmColon(c.weekTotal)}  ◆  ${now}  ◆  `;
  return <Marquee text={text} bg={L.band.bg} ink={L.band.ink} label={`今日 ${jpHm(today.min)}、${streak}日連続、レベル${l.lv}、今週 ${jpHm(c.weekTotal)}`} />;
}

// ---------- the log ----------
function Chart() {
  const L = useLook();
  const range = useStore((s) => s.chart.range);
  const c = useCharts();
  const { width } = useWindowDimensions();
  const [sel, setSel] = useState<number | null>(null);
  const [lastRange, setLastRange] = useState(range);
  if (lastRange !== range) { setLastRange(range); setSel(null); }
  const day = range === 'day';
  const inner = width - 28 - 28;
  // today: 24 columns, a dot per 10 minutes. The week: 7 columns three dots wide, the tallest day (or the goal) filling it.
  const rows = day ? 6 : 10;
  const span = day ? 1 : 3;
  const gap = day ? 0 : 1;
  const count = day ? 24 : 7;
  const pitch = Math.min(day ? 14 : 13, inner / (count * (span + gap) - gap));
  const unit = day ? 10 : Math.max(c.goal, ...c.week.map((x) => x.min), 1) / rows;
  const src = day
    ? c.hours.map((x) => ({ min: x.min, live: x.live, parts: x.parts, future: x.future, today: x.now }))
    : c.week.map((x) => ({ min: x.min, live: x.live, parts: x.parts, future: x.future, today: x.today }));
  const data: Column[] = src.map((x, i) => {
    const lit = litDots(x.parts, unit, rows);
    // a column whose parts round to nothing still shows its live dots
    return { lit, live: liveDots(x.live, unit, rows - lit.length), future: x.future && !x.min, picked: sel === null ? undefined : sel === i };
  });
  const live = src.reduce((a, x) => a + x.live, 0);
  const total = src.reduce((a, x) => a + x.min, 0) - live;
  const picked = sel !== null ? src[sel] : null;
  const readout = picked ? (day ? `${two(sel!)}H  ${Math.round(picked.min)} MIN` : `${W[sel!]}  ${hmColon(picked.min)}`) : `${day ? 'TOTAL' : 'WEEK'} ${hmColon(total)}`;
  const colW = pitch * (span + gap);
  const onPress = (x: number) => {
    const i = Math.max(0, Math.min(count - 1, Math.floor(x / colW)));
    haptic.tap();
    setSel(sel === i ? null : i);
  };
  return (
    <Panel pad={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ann color={L.t.ink2}>LOG</Ann>
        <View style={{ flex: 1 }} />
        {(['day', 'week'] as const).map((r) => (
          <Key key={r} onPress={() => setChart({ range: r })} label={r === 'day' ? '今日を時間ごとに' : '今週を日ごとに'} role="tab" selected={range === r}
            latched={range === r} h={24} depth={2} face={{ paddingHorizontal: 9 }}>
            <M b size={10.5} color={L.key.ink} ls={1}>{r === 'day' ? 'DAY' : 'WEEK'}</M>
          </Key>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <M b size={17} lh={22} color={picked ? L.accent : L.t.ink}>{readout}</M>
        {!picked && live >= 1 ? <M size={12} color={L.accent}>{`+${hmColon(live)} LIVE`}</M> : null}
      </View>
      <Pressable onPress={(e) => onPress(e.nativeEvent.locationX)} accessibilityRole="button"
        accessibilityLabel={day ? `今日の時間ごとの記録。合計 ${jpHm(total)}` : `今週の日ごとの記録。合計 ${jpHm(total)}`}
        style={{ marginTop: 10, alignSelf: 'flex-start' }}>
        <View pointerEvents="none">
          <Matrix data={data} rows={rows} pitch={pitch} span={span} gap={gap} off={L.dotOff} live={L.accent}
            goalRow={day ? undefined : c.goal / unit} goalColor={L.accent} />
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', marginTop: 5, width: colW * count }}>
        {src.map((x, i) => (
          <View key={i} style={{ width: colW, alignItems: day ? 'flex-start' : 'center' }}>
            {day ? (i % 6 === 0 ? <M size={9.5} color={L.t.ink3} style={{ width: 24 }}>{two(i)}</M> : null)
              : <M size={10} color={x.today ? L.accent : L.t.ink3} style={{ marginRight: gap * pitch }}>{W[i]}</M>}
          </View>
        ))}
      </View>
    </Panel>
  );
}

// ---------- streak and level ----------
function Streak() {
  const L = useLook();
  const { streak, tickets, days } = useWeekStreak();
  const [flick, kick] = useFlicker();
  return (
    <Press onPress={() => { haptic.soft(); kick(); }} haptics={false} react="flicker" scale={0.98} accessibilityLabel={`${streak}日連続。休み券${tickets}枚`} style={{ flex: 1 }}>
      <Panel pad={12} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ann color={L.t.ink2}>STREAK</Ann>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 2 }} accessibilityElementsHidden>
            {Array.from({ length: 3 }, (_, i) => <View key={i} style={{ width: 7, height: 9, borderRadius: 1, backgroundColor: i < tickets ? L.t.ink2 : L.dotOff }} />)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 6 }}>
          <Animated.View style={flick}>
            <Seg text={String(Math.min(999, streak)).padStart(2, ' ')} h={36} color={L.seg} ghost={L.ghost} glow={L.glow} />
          </Animated.View>
          <Ann plain>DAYS</Ann>
        </View>
        <View style={{ flexDirection: 'row', gap: 3, marginTop: 8 }}>
          {days.map((d, i) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
              <View style={{ alignSelf: 'stretch', height: 9, borderRadius: 1,
                backgroundColor: d.studied ? (d.today ? L.accent : L.seg) : d.rest ? L.t.line2 : 'transparent',
                borderWidth: d.studied ? 0 : 1, borderColor: d.today ? L.accent : L.t.line2, borderStyle: d.future ? 'dashed' : 'solid' }} />
              <M size={9} color={d.today ? L.accent : L.t.ink3}>{W[i]}</M>
            </View>
          ))}
        </View>
      </Panel>
    </Press>
  );
}

function Level() {
  const L = useLook();
  const l = useLevel();
  const cells = Array.from({ length: 10 }, (_, i) => (i < Math.round(l.p * 10) ? L.seg : null));
  return (
    <Press onPress={levelSheet} react="flicker" scale={0.98} accessibilityLabel={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`} style={{ flex: 1 }}>
      <Panel pad={12} style={{ flex: 1 }}>
        <Ann color={L.t.ink2}>LEVEL</Ann>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5, marginTop: 6 }}>
          <Ann plain>LV</Ann>
          <Seg text={String(Math.min(999, l.lv)).padStart(2, ' ')} h={36} color={L.seg} ghost={L.ghost} glow={L.glow} />
        </View>
        <Cells cells={cells} h={9} gap={2} off={L.dotOff} style={{ marginTop: 8 }} />
        <M size={9.5} color={L.t.ink3} style={{ marginTop: 4 }} numberOfLines={1}>{`+${Math.round(l.need).toLocaleString('en-US')} EXP`}</M>
      </Panel>
    </Press>
  );
}

// ---------- memos, alarms, link ----------
function Head({ title, extra, add, addLabel }: { title: string; extra?: string; add: () => void; addLabel: string }) {
  const L = useLook();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ann color={L.t.ink2}>{title}</Ann>
      {extra ? <M size={11} color={L.t.ink3}>{extra}</M> : null}
      <View style={{ flex: 1 }} />
      <Key onPress={add} label={addLabel} h={24} depth={2} face={{ paddingHorizontal: 8, gap: 4 }}>
        <View><Icon name="plus" size={10} color={L.key.ink} /></View>
        <M b size={10.5} color={L.key.ink} ls={1}>NEW</M>
      </Key>
    </View>
  );
}
function Empty({ title, sub, onPress, label }: { title: string; sub: string; onPress: () => void; label: string }) {
  const L = useLook();
  return (
    <Press onPress={onPress} react="flicker" scale={0.99} accessibilityLabel={label}
      style={{ marginTop: 10, paddingVertical: 14, alignItems: 'center', gap: 3, borderRadius: radius.inner, borderWidth: 1, borderStyle: 'dashed', borderColor: L.t.line2 }}>
      <M b size={13} color={L.t.ink3} ls={2}>{title}</M>
      <J size={11.5} w="500" color={L.t.ink3}>{sub}</J>
    </Press>
  );
}

function Todos() {
  const { todos, done, total } = useTodos();
  const shown = todos.slice(0, 5);
  const L = useLook();
  return (
    <Panel pad={14}>
      <Head title="TODO" extra={total ? `${done}/${total}` : undefined} add={() => todoSheet()} addLabel="ToDoを追加" />
      {total ? null : <Empty title="NO MEMO" sub="やることを入れておくと、すぐ始められます" onPress={() => todoSheet()} label="ToDoを追加" />}
      <View style={{ marginTop: total ? 6 : 0 }}>
        {shown.map((td, i) => <Memo key={td.id} id={td.id} n={i} />)}
      </View>
      {total > shown.length ? (
        <Press onPress={go.study} scale={0.97} hitSlop={6} accessibilityLabel={`ほかのToDo ${total - shown.length}件。勉強のページを開く`} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <M size={11.5} color={L.t.ink2}>{`+${total - shown.length} MORE >`}</M>
        </Press>
      ) : null}
    </Panel>
  );
}
function Memo({ id, n }: { id: string; n: number }) {
  const L = useLook();
  const td = useStore((s) => s.todos.find((x) => x.id === id));
  const [flick, kick] = useFlicker();
  if (!td) return null;
  const sj = subj(td.s);
  return (
    <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6, borderTopWidth: n ? 1 : 0, borderColor: L.t.line }, flick]}>
      <M size={10.5} color={L.t.ink3} style={{ width: 18 }}>{two(n + 1)}</M>
      <Key onPress={() => { kick(); tickTodo(td.id); }} label={`${td.t}${td.d ? 'を未完了に戻す' : 'を完了にする'}`} role="checkbox" checked={td.d} haptics={false}
        latched={td.d} h={24} depth={2} face={{ width: 26, paddingHorizontal: 0 }}>
        {td.d ? <View><Icon name="check" size={13} color={L.key.ink} width={2.6} /></View> : null}
      </Key>
      <Press onPress={() => todoSheet(td)} scale={0.99} accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <J size={13.5} w="600" color={td.d ? L.t.ink3 : L.t.ink} numberOfLines={1} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</J>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: sj.c }} />
          <J size={10.5} w="500" color={L.t.ink3} numberOfLines={1}>{sj.name}</J>
        </View>
      </Press>
      {td.d ? <Ann plain color={L.accent}>OK</Ann> : (
        <Key onPress={() => startPick({ s: td.s, what: td.t, todoId: td.id, from: 'todo' })} label={`${td.t}を始める`} h={28} depth={2} face={{ width: 32, paddingHorizontal: 0 }}>
          <View><Icon name="play" size={11} color={L.key.ink} /></View>
        </Key>
      )}
    </Animated.View>
  );
}

function Deadlines() {
  const L = useLook();
  const list = useDeadlines();
  return (
    <Panel pad={14}>
      <Head title="ALARM" extra={list.length ? String(list.length) : undefined} add={deadlineSheet} addLabel="締切を追加" />
      {list.length ? null : <Empty title="NO ALARM" sub="大事な日を入れておくと、残り日数を数えます" onPress={deadlineSheet} label="締切を追加" />}
      {list.map((d, i) => {
        const hot = d.days <= 7;
        const cells = d.total ? Array.from({ length: Math.min(d.total, 10) }, (_, k) => (k < Math.round((d.done / d.total) * Math.min(d.total, 10)) ? L.seg : null)) : [];
        return (
          <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} react="flicker" scale={0.99} accessibilityLabel={`${d.t} あと${d.days}日`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderColor: L.t.line, marginTop: i ? 0 : 6 }}>
            <View style={{ width: 66 }}>
              <Ann plain color={hot ? L.accent : L.t.ink3}>{`AL${i + 1}`}</Ann>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                <Blink on={hot && d.days <= 3}>
                  <Seg text={String(Math.min(999, Math.max(0, d.days))).padStart(3, ' ')} h={20} color={hot ? L.accent : L.seg} ghost={L.ghost} glow={L.glow} />
                </Blink>
                <Ann plain>D</Ann>
              </View>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <J size={13.5} w="700" numberOfLines={1}>{d.t}</J>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <M size={10.5} color={L.t.ink3}>{`${d.mo}/${two(d.day)}`}</M>
                {d.total ? <Cells cells={cells} h={5} gap={2} off={L.dotOff} style={{ flex: 1 }} /> : <J size={10.5} w="500" color={L.t.ink3}>ToDoなし</J>}
                {d.total ? <M size={10.5} color={L.t.ink3}>{`${d.done}/${d.total}`}</M> : null}
              </View>
            </View>
          </Press>
        );
      })}
    </Panel>
  );
}

function Peers() {
  const L = useLook();
  const { people, count } = usePeers();
  const peers = people.slice(0, 4);
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  return (
    <Press onPress={go.community} react="flicker" scale={0.99} accessibilityLabel={`${count.toLocaleString('ja-JP')}人が勉強中。みんなを開く`}>
      <Panel pad={12}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Blink period={1600}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: L.seg }} /></Blink>
              <Ann color={L.t.ink2}>LINK</Ann>
              <Seg text={String(Math.min(99999, count))} h={16} color={L.seg} ghost={L.ghost} glow={L.glow} />
              <Ann plain>ONLINE</Ann>
            </View>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 8, alignItems: 'center' }}>
              {peers.map((p) => (
                <View key={p.n} style={{ width: 26, height: 26, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.c }}>
                  <J size={11.5} w="800" color={p.c}>{[...p.n][0]}</J>
                </View>
              ))}
              <J size={11} w="500" color={L.t.ink3} numberOfLines={1} style={{ flex: 1, marginLeft: 3 }}>{peers.map((p) => p.n).join(' · ')}</J>
            </View>
          </View>
          <Key onPress={join} disabled={joined} label={joined ? '勉強中' : '一緒に始める'} tone={joined ? 'plain' : 'accent'} h={34} haptics={false} face={{ paddingHorizontal: 11 }}>
            <J size={12} w="800" color={joined ? L.key.ink : L.keyAccent.ink}>{joined ? '同期中' : '一緒に始める'}</J>
          </Key>
        </View>
      </Panel>
    </Press>
  );
}

const SECTIONS: HomeKit['sections'] = {
  today: Today, now: Now, 'x:ticker': Ticker, chart: Chart, streak: Streak, 'x:level': Level, todos: Todos, deadlines: Deadlines, peers: Peers,
};
/** Sections that are displays (or a band) of their own; today and now share one display. */
const OWN = new Set<Kind>(['x:ticker', 'chart', 'streak', 'x:level', 'todos', 'deadlines', 'peers']);

export const home: HomeKit = {
  Page,
  Header,
  Frame: makeFrame(OWN),
  sections: SECTIONS,
  arrange: () => [
    { id: 'display', sections: ['today', 'now'] },
    { id: 'ticker', sections: ['x:ticker'] },
    { id: 'log', sections: ['chart'] },
    { id: 'stats', sections: ['streak', 'x:level'], row: true },
    { id: 'memo', sections: ['todos'] },
    { id: 'alarm', sections: ['deadlines'] },
    { id: 'link', sections: ['peers'] },
  ],
  DesignHandle,
};
