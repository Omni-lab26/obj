import { Children, ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { subj } from '@/data';
import type { Block, Kind } from '@/screens/layout';
import {
  go, hmColon, jpHm, Pick, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak,
} from '@/screens/model';
import type { HomeKit } from '@/themes/types';
import { setChart, useLevel, useStore } from '@/store';
import { haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import type { IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { Rolling } from '@/ui/Rolling';
import { toast } from '@/ui/Toast';
import { Blink, code, Cut, D, Glitch, glow, I, J, Label, Meter, N, Panel } from './ui';

// ネオン's home: a HUD. The readout of today leads, with the launch bar under
// it; streak and level side by side; the log as glowing bars; ToDos as a
// mission list; deadlines and the people online below.

const W = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ---------- page ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 10, paddingBottom: tabPad, gap: 14 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

function SquareBtn({ icon, label, onPress, dot }: { icon: IconName; label: string; onPress: () => void; dot?: boolean }) {
  return (
    <Press onPress={onPress} scale={0.88} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}>
      <Cut fill="#0E0E0E" stroke={N.cyanLine} cut={7} />
      <I name={icon} size={16} color={N.cyan} width={1.8} />
      {dot ? <View style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, backgroundColor: N.red, boxShadow: `0px 0px 6px ${N.red}` }} /> : null}
    </Press>
  );
}

function Header() {
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  const l = useLevel();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingLeft: 14, paddingRight: 12, paddingTop: 6, height: 54, zIndex: 1 }}>
      {/* the slanted brand block */}
      <View style={{ height: 30, paddingLeft: 10, paddingRight: 18, justifyContent: 'center' }}>
        <Cut fill={N.yellow} cut={9} />
        <D size={20} color="#0A0A0A" lh={22} style={{ letterSpacing: 1.5 }}>INCHLY</D>
      </View>
      <Press onPress={levelSheet} scale={0.92} hitSlop={6} accessibilityLabel={`${me}。レベル${l.lv}`} style={{ flexShrink: 1, minWidth: 0 }}>
        <D size={13} color={N.yellow} style={{ letterSpacing: 1 }}>{`LV.${l.lv}`}</D>
        <J size={13} w="700" lh={17} numberOfLines={1}>{me}</J>
      </Press>
      <View style={{ flex: 1 }} />
      <SquareBtn icon="search" label="さがす" onPress={go.search} />
      <SquareBtn icon="bell" label="お知らせ" onPress={go.notifications} dot={unread > 0} />
      <SquareBtn icon="gear" label="設定" onPress={go.settings} />
    </View>
  );
}

/** Blocks sit stacked; a row puts its panels side by side. A section this app doesn't draw gets a panel of its own. */
function makeFrame(drawn: Set<Kind>) {
  return function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
    const kids = Children.toArray(children);
    const wrapped = kids.map((c, i) => (drawn.has(block.sections[i]) ? c : <Panel key={`p${i}`}>{c}</Panel>));
    if (block.row) return <View style={{ flexDirection: 'row', gap: 10 }}>{wrapped.map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}</View>;
    return <View style={{ gap: 8 }}>{wrapped}</View>;
  };
}

/** The handle on the left edge (and a swipe right) opens the デザイン page. */
function DesignHandle({ onPress }: { onPress: () => void }) {
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '42%', width: 14, height: 64, alignItems: 'center', justifyContent: 'center' }}>
      <Cut fill={N.yellow} cut={6} />
      <View style={{ gap: 3 }}>
        {[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 2, backgroundColor: '#0A0A0A' }} />)}
      </View>
    </Press>
  );
}

// ---------- sections ----------
/** Today's readout: the time studied, against yesterday, and a charge meter toward the goal. */
function Today() {
  const today = useToday();
  const [kick, setKick] = useState(0);
  const now = new Date();
  const total = today.min;
  // the meter: 24 cells toward the goal, each in the color of the subject that filled it
  const cells: (string | null)[] = [];
  const n = 24;
  const per = Math.max(1, today.goal) / n;
  for (let i = 0; i < n; i++) {
    const mid = (i + 0.5) * per;
    let acc = 0;
    let c: string | null = null;
    if (mid < total) for (const p of today.parts) { acc += p.min; if (mid < acc) { c = p.c; break; } }
    cells.push(c ?? (mid < total ? N.yellow : null));
  }
  const pct = Math.round((total / Math.max(1, today.goal)) * 100);
  const up = today.diff >= 0;
  const value = hmColon(total);
  return (
    <Press onPress={() => { haptic.soft(); setKick((k) => k + 1); }} haptics={false} react="flicker" scale={0.99}
      accessibilityLabel={`今日 ${jpHm(total)}。昨日より${up ? '' : 'マイナス'}${jpHm(Math.abs(today.diff))}。目標の${pct}%`}>
      <Panel pad={16} cut={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Label>{'// TODAY_LOG'}</Label>
          <View style={{ flex: 1 }} />
          <D size={13} color={N.ink3}>{`${now.getMonth() + 1}.${String(now.getDate()).padStart(2, '0')} ${DAYS[now.getDay()]}`}</D>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }}>
          <Glitch kick={kick} copy={(c) => <D size={74} lh={89} color={c} style={{ letterSpacing: -74 * 0.025 }}>{value}</D>}>
            <Rolling value={value} size={74} weight="700" color={N.yellow} style={glow('rgba(252,238,10,0.55)', 14)} />
          </Glitch>
          <D size={14} color={N.ink3} style={{ marginLeft: 6, marginBottom: 12 }}>H:M</D>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
            <D size={17} color={up ? N.cyan : N.red} style={glow(up ? 'rgba(0,240,255,0.5)' : 'rgba(255,0,60,0.5)', 8)}>{`${up ? '▲ +' : '▼ -'}${hmColon(Math.abs(today.diff))}`}</D>
            <D size={11} color={N.ink3} style={{ letterSpacing: 1 }}>VS YESTERDAY</D>
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Meter cells={cells} />
        </View>
        <View style={{ flexDirection: 'row', marginTop: 8, alignItems: 'baseline' }}>
          <D size={12} color={pct >= 100 ? N.yellow : N.ink2} style={{ letterSpacing: 1 }}>{pct >= 100 ? `GOAL CLEAR · ${pct}%` : `CHARGE ${pct}%`}</D>
          <View style={{ flex: 1 }} />
          <D size={12} color={N.ink3} style={{ letterSpacing: 1 }}>{`GOAL ${hmColon(today.goal)}`}</D>
        </View>
      </Panel>
    </Press>
  );
}

const whenOf = (p: Pick) =>
  p.from === 'now' ? `NOW ${p.start}–${p.end}` : p.from === 'next' ? `NEXT ${p.start} · T-${p.inMin ?? 0}M` : p.from === 'todo' ? 'FROM MISSIONS' : 'LAST TASK';

/** The launch bar: start what's next — or, while a session runs, the live strip with pause and record. */
function Now() {
  const ss = useSession();
  const pick = useNext();
  const [kick, setKick] = useState(0);
  if (ss.running) {
    return (
      <Press onPress={go.timer} scale={0.98} accessibilityLabel={`${ss.subject.name}を勉強中 ${hmColon(ss.elapsed / 60)}。タイマーを開く`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 8 }}>
        <Cut fill="#140006" stroke={ss.paused ? N.yellow : N.red} cut={12} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Blink on={!ss.paused}><View style={{ width: 7, height: 7, backgroundColor: ss.paused ? N.yellow : N.red, boxShadow: `0px 0px 8px ${ss.paused ? N.yellow : N.red}` }} /></Blink>
            <D size={12} color={ss.paused ? N.yellow : N.red} style={{ letterSpacing: 1.5 }} numberOfLines={1}>{ss.paused ? 'PAUSED' : 'LIVE'}</D>
          </View>
          <J size={15} w="800" numberOfLines={1}>{ss.subject.name}<J size={12} w="500" color={N.ink2}>{ss.task ? `  ${ss.task}` : ''}</J></J>
        </View>
        <D size={28} color={N.ink} style={glow('rgba(255,255,255,0.35)', 8)}>{clockText(ss.elapsed)}</D>
        <Press onPress={session.pause} haptics={false} scale={0.86} hitSlop={6} accessibilityLabel={ss.paused ? '再開' : '一時停止'}
          style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Cut fill="#0A0A0A" stroke={N.cyanLine} cut={8} />
          <I name={ss.paused ? 'play' : 'pause'} size={14} color={N.cyan} />
        </Press>
        <Press onPress={session.finish} scale={0.9} hitSlop={6} accessibilityLabel="記録する"
          style={{ height: 38, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Cut fill={N.yellow} cut={8} />
          <J size={12.5} w="800" color="#0A0A0A">記録</J>
        </Press>
      </Press>
    );
  }
  const p = subj(pick.s);
  return (
    <Press onPress={() => { setKick((k) => k + 1); startPick(pick); }} haptics={false} react="flicker" scale={0.97}
      accessibilityLabel={`${p.name}を始める。${pick.what}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 16 }}>
      <Cut fill={N.yellow} cut={14} />
      <Glitch kick={kick} copy={(c) => <I name="play" size={22} color={c} />}>
        <I name="play" size={22} color="#0A0A0A" />
      </Glitch>
      <View style={{ flex: 1, minWidth: 0 }}>
        <D size={11.5} color="rgba(10,10,10,0.62)" style={{ letterSpacing: 1.2 }} numberOfLines={1}>{whenOf(pick)}</D>
        <J size={16} w="800" color="#0A0A0A" numberOfLines={1}>{`起動 :: ${p.name}`}</J>
        {pick.what ? <J size={11.5} w="500" color="rgba(10,10,10,0.7)" numberOfLines={1}>{pick.what}</J> : null}
      </View>
      <D size={20} color="#0A0A0A" style={{ letterSpacing: 2 }}>START</D>
    </Press>
  );
}
const clockText = (sec: number) => {
  const v = Math.max(0, Math.floor(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, s = v % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/** The streak: the count, rest tickets, and the week as cells. */
function Streak() {
  const { streak, tickets, days } = useWeekStreak();
  const [kick, setKick] = useState(0);
  const value = String(streak).padStart(2, '0');
  return (
    <Press onPress={() => { haptic.soft(); setKick((k) => k + 1); }} haptics={false} react="flicker" scale={0.97}
      accessibilityLabel={`${streak}日連続。休み券${tickets}枚`} style={{ flex: 1 }}>
      <Panel pad={12} cut={12} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Label>{'// STREAK'}</Label>
          <View style={{ flex: 1 }} />
          <View style={{ flexDirection: 'row', gap: 3 }} accessibilityElementsHidden>
            {Array.from({ length: 3 }, (_, i) => (
              <View key={i} style={{ width: 9, height: 6, borderWidth: 1, borderColor: i < tickets ? N.cyan : 'rgba(0,240,255,0.25)', backgroundColor: i < tickets ? 'rgba(0,240,255,0.3)' : 'transparent' }} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 }}>
          <Glitch kick={kick} copy={(c) => <D size={40} lh={44} color={c}>{value}</D>}>
            <D size={40} lh={44} color={N.ink} style={glow('rgba(255,255,255,0.3)', 8)}>{value}</D>
          </Glitch>
          <D size={13} color={N.ink3} style={{ letterSpacing: 1 }}>DAYS</D>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 6 }}>
          {days.map((d, i) => (
            <View key={d.date} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
              <View style={{ alignSelf: 'stretch', height: 9, transform: [{ skewX: '-14deg' }],
                backgroundColor: d.studied ? (d.today ? N.yellow : 'rgba(252,238,10,0.6)') : d.rest ? 'rgba(0,240,255,0.35)' : 'transparent',
                borderWidth: d.studied ? 0 : 1, borderColor: d.today ? N.red : 'rgba(255,255,255,0.18)', borderStyle: d.future ? 'dashed' : 'solid' }} />
              <D size={10} color={d.today ? N.yellow : N.ink3}>{W[i]}</D>
            </View>
          ))}
        </View>
      </Panel>
    </Press>
  );
}

/** Level and EXP, beside the streak. */
function Level() {
  const l = useLevel();
  const cells = Array.from({ length: 10 }, (_, i) => (i < Math.round(l.p * 10) ? N.cyan : null));
  return (
    <Press onPress={levelSheet} react="flicker" scale={0.97} accessibilityLabel={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`} style={{ flex: 1 }}>
      <Panel pad={12} cut={12} style={{ flex: 1 }}>
        <Label>{'// LEVEL'}</Label>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
          <D size={14} color={N.ink3}>LV.</D>
          <D size={40} lh={44} color={N.cyan} style={glow('rgba(0,240,255,0.5)', 10)}>{String(l.lv)}</D>
        </View>
        <View style={{ marginTop: 6 }}>
          <Meter cells={cells} h={9} gap={2} off="rgba(0,240,255,0.12)" />
        </View>
        <D size={11} color={N.ink3} style={{ marginTop: 5, letterSpacing: 0.8 }} numberOfLines={1}>{`+${Math.round(l.need).toLocaleString('en-US')} XP TO NEXT`}</D>
      </Panel>
    </Press>
  );
}

/** The log: today hour by hour, or the week day by day, as glowing bars. Tap a bar to read it. */
function Chart() {
  const range = useStore((s) => s.chart.range);
  const c = useCharts();
  const [sel, setSel] = useState<number | null>(null);
  const [lastRange, setLastRange] = useState(range);
  if (lastRange !== range) { setLastRange(range); setSel(null); }
  const day = range === 'day';
  const bars = day
    ? c.hours.map((x) => ({ key: String(x.h), min: x.min, live: x.live, now: x.now, future: x.future, label: x.h % 6 === 0 ? String(x.h).padStart(2, '0') : '' }))
    : c.week.map((x, i) => ({ key: x.date, min: x.min, live: x.live, now: x.today, future: x.future, label: W[i] }));
  const max = day ? 60 : Math.max(c.goal, ...bars.map((b) => b.min), 1);
  // what's recorded, as on the readout above; the session under way is added on, in yellow
  const live = bars.reduce((a, b) => a + b.live, 0);
  const total = bars.reduce((a, b) => a + b.min, 0) - live;
  const picked = sel !== null ? bars[sel] : null;
  const readout = picked
    ? day ? `${String(sel).padStart(2, '0')}:00 · ${Math.round(picked.min)} MIN` : `${W[sel!]} · ${hmColon(picked.min)}`
    : day ? `TOTAL ${hmColon(total)}` : `WEEK ${hmColon(total)}`;
  const H = 96;
  return (
    <Panel pad={14} cut={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label>{'// STUDY_LOG'}</Label>
        <View style={{ flex: 1 }} />
        {(['day', 'week'] as const).map((r) => (
          <Press key={r} onPress={() => setChart({ range: r })} scale={0.9} hitSlop={6} accessibilityRole="tab" accessibilityState={{ selected: range === r }}
            accessibilityLabel={r === 'day' ? '今日を時間ごとに' : '今週を日ごとに'} style={{ height: 22, paddingHorizontal: 9, justifyContent: 'center' }}>
            {range === r ? <Cut fill={N.cyan} cut={5} /> : <Cut fill="transparent" stroke={N.cyanLine} cut={5} />}
            <D size={11.5} color={range === r ? '#0A0A0A' : N.cyan} style={{ letterSpacing: 1.2 }}>{r === 'day' ? 'DAY' : 'WEEK'}</D>
          </Press>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
        <D size={22} color={picked ? N.yellow : N.ink} style={glow('rgba(255,255,255,0.2)', 6)}>{readout}</D>
        {!picked && live >= 1 ? <D size={14} color={N.yellow} style={{ letterSpacing: 1 }}>{`+${hmColon(live)} LIVE`}</D> : null}
      </View>
      <View style={{ height: H, marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: day ? 2 : 8 }}>
        {/* the grid: dotted cyan lines at a quarter, half and three quarters */}
        {[0.25, 0.5, 0.75].map((f) => (
          <View key={f} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: H * f, borderTopWidth: 1, borderColor: 'rgba(0,240,255,0.14)', borderStyle: 'dotted' }} />
        ))}
        {!day ? <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: (H * c.goal) / max, borderTopWidth: 1, borderColor: 'rgba(255,0,60,0.7)', borderStyle: 'dashed' }} /> : null}
        {bars.map((b, i) => {
          const rec = Math.max(0, b.min - b.live);
          const hRec = (Math.min(rec, max) / max) * H;
          const hLive = (Math.min(b.live, Math.max(0, max - rec)) / max) * H;
          const on = sel === i;
          return (
            <Press key={b.key} onPress={() => setSel(on ? null : i)} haptics react="flicker" scale={0.94}
              accessibilityLabel={day ? `${i}時 ${Math.round(b.min)}分` : `${c.week[i].label}曜日 ${jpHm(b.min)}`}
              style={{ flex: 1, height: H, justifyContent: 'flex-end' }}>
              {b.future && !b.min ? <View style={{ height: 3, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderStyle: 'dashed' }} /> : null}
              {hLive > 0 ? <View style={{ height: Math.max(2, hLive), backgroundColor: N.yellow, boxShadow: `0px 0px 8px ${N.yellow}` }} /> : null}
              {hRec > 0 ? <View style={{ height: Math.max(2, hRec), backgroundColor: on ? N.yellow : b.now ? '#7DF9FF' : N.cyan, opacity: on || b.now || sel === null ? 1 : 0.45,
                boxShadow: `0px 0px 8px ${on ? 'rgba(252,238,10,0.7)' : 'rgba(0,240,255,0.55)'}` }} /> : null}
            </Press>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', marginTop: 6, gap: day ? 2 : 8 }}>
        {bars.map((b) => (
          <View key={b.key} style={{ flex: 1, minWidth: 0, overflow: 'visible' }}>
            <D size={10} color={N.ink3} numberOfLines={1} style={day ? { width: 24 } : { textAlign: 'center' }}>{b.label}</D>
          </View>
        ))}
      </View>
    </Panel>
  );
}

/** ToDos as missions: tick them off right here. */
function Todos() {
  const { todos, done, total } = useTodos();
  const shown = todos.slice(0, 5);
  return (
    <Panel pad={14} cut={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Label>{'// MISSIONS'}</Label>
        {total ? <D size={12} color={done === total ? N.yellow : N.ink3} style={{ letterSpacing: 1 }}>{`${done}/${total} CLEAR`}</D> : null}
        <View style={{ flex: 1 }} />
        <Press onPress={() => todoSheet()} scale={0.9} hitSlop={8} accessibilityLabel="ToDoを追加" style={{ height: 24, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Cut fill="transparent" stroke={N.yellow} cut={6} />
          <I name="plus" size={11} color={N.yellow} />
          <D size={11.5} color={N.yellow} style={{ letterSpacing: 1.2 }}>NEW</D>
        </Press>
      </View>
      {total ? null : (
        <Press onPress={() => todoSheet()} scale={0.98} accessibilityLabel="ToDoを追加" style={{ marginTop: 10, paddingVertical: 14, alignItems: 'center', gap: 2 }}>
          <Cut fill="#0D0D0D" stroke="rgba(255,255,255,0.12)" cut={8} />
          <D size={14} color={N.ink3} style={{ letterSpacing: 2 }}>NO ACTIVE MISSIONS</D>
          <J size={12} w="500" color={N.ink3}>やることを入れておくと、すぐ始められます</J>
        </Press>
      )}
      <View style={{ marginTop: total ? 6 : 0 }}>
        {shown.map((td, i) => <Mission key={td.id} id={td.id} n={i} />)}
      </View>
      {total > shown.length ? (
        <Press onPress={go.study} scale={0.97} hitSlop={6} accessibilityLabel={`ほかのToDo ${total - shown.length}件。勉強のページを開く`} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <D size={12} color={N.cyan} style={{ letterSpacing: 1 }}>{`+${total - shown.length} MORE >>`}</D>
        </Press>
      ) : null}
    </Panel>
  );
}
function Mission({ id, n }: { id: string; n: number }) {
  const td = useStore((s) => s.todos.find((x) => x.id === id));
  const [kick, setKick] = useState(0);
  if (!td) return null;
  const sj = subj(td.s);
  const tick = () => { setKick((k) => k + 1); tickTodo(td.id); };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7, borderTopWidth: n ? 1 : 0, borderColor: 'rgba(0,240,255,0.08)' }}>
      <D size={11} color={td.d ? N.ink3 : N.cyan} style={{ width: 30, letterSpacing: 0.5 }}>{`M-${code(n)}`}</D>
      <Press onPress={tick} haptics={false} react="flicker" scale={0.84} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: td.d }}
        accessibilityLabel={`${td.t}${td.d ? 'を未完了に戻す' : 'を完了にする'}`}>
        <Glitch kick={kick} copy={(c) => <View style={{ width: 20, height: 20, borderWidth: 1.5, borderColor: c }} />}>
          <View style={{ width: 20, height: 20, borderWidth: 1.5, borderColor: td.d ? N.yellow : N.cyanLine, backgroundColor: td.d ? N.yellow : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {td.d ? <I name="check" size={13} color="#0A0A0A" width={3} /> : null}
          </View>
        </Glitch>
      </Press>
      <Press onPress={() => todoSheet(td)} scale={0.98} accessibilityLabel={`${td.t}を編集`} style={{ flex: 1, minWidth: 0 }}>
        <J size={13.5} w="600" color={td.d ? N.ink3 : N.ink} numberOfLines={1} style={td.d ? { textDecorationLine: 'line-through' } : null}>{td.t}</J>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 6, height: 6, backgroundColor: sj.c }} />
          <J size={10.5} w="500" color={N.ink3} numberOfLines={1}>{sj.name}</J>
        </View>
      </Press>
      {td.d ? <D size={11} color={N.yellow} style={{ letterSpacing: 1 }}>CLEAR</D> : (
        <Press onPress={() => startPick({ s: td.s, what: td.t, todoId: td.id, from: 'todo' })} scale={0.86} hitSlop={6} accessibilityLabel={`${td.t}を始める`}
          style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <Cut fill="transparent" stroke={N.cyanLine} cut={7} />
          <I name="play" size={12} color={N.cyan} />
        </Press>
      )}
    </View>
  );
}

/** Deadlines as countdowns, with the progress of the ToDos tied to each. */
function Deadlines() {
  const list = useDeadlines();
  return (
    <Panel pad={14} cut={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Label>{'// DEADLINES'}</Label>
        <View style={{ flex: 1 }} />
        <Press onPress={deadlineSheet} scale={0.9} hitSlop={8} accessibilityLabel="締切を追加" style={{ height: 24, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Cut fill="transparent" stroke={N.yellow} cut={6} />
          <I name="plus" size={11} color={N.yellow} />
          <D size={11.5} color={N.yellow} style={{ letterSpacing: 1.2 }}>ADD</D>
        </Press>
      </View>
      {list.length ? null : (
        <Press onPress={deadlineSheet} scale={0.98} accessibilityLabel="締切を追加" style={{ marginTop: 10, paddingVertical: 14, alignItems: 'center', gap: 2 }}>
          <Cut fill="#0D0D0D" stroke="rgba(255,255,255,0.12)" cut={8} />
          <D size={14} color={N.ink3} style={{ letterSpacing: 2 }}>NO DEADLINES SET</D>
          <J size={12} w="500" color={N.ink3}>大事な日を入れておくと、残り日数を数えます</J>
        </Press>
      )}
      {list.map((d, i) => {
        const hot = d.days <= 7;
        const cells = d.total ? Array.from({ length: Math.min(d.total, 10) }, (_, k) => (k < Math.round((d.done / d.total) * Math.min(d.total, 10)) ? N.cyan : null)) : [];
        return (
          <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} react="flicker" scale={0.98} accessibilityLabel={`${d.t} あと${d.days}日`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: 'rgba(0,240,255,0.08)', marginTop: i ? 0 : 6 }}>
            <View style={{ width: 64 }}>
              <D size={24} lh={26} color={hot ? N.red : N.yellow} style={glow(hot ? 'rgba(255,0,60,0.5)' : 'rgba(252,238,10,0.4)', 8)}>{`T-${d.days}`}</D>
              <D size={10} color={N.ink3} style={{ letterSpacing: 1 }}>{`DAYS · ${d.mo}.${String(d.day).padStart(2, '0')}`}</D>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <J size={13.5} w="700" numberOfLines={1}>{d.t}</J>
              {d.total ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}><Meter cells={cells} h={6} gap={2} off="rgba(0,240,255,0.12)" /></View>
                  <D size={11} color={N.ink3}>{`${d.done}/${d.total}`}</D>
                </View>
              ) : <J size={10.5} w="500" color={N.ink3}>ToDoなし</J>}
            </View>
          </Press>
        );
      })}
    </Panel>
  );
}

/** Who's online studying, and joining them. */
function Peers() {
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
    <Press onPress={go.community} react="flicker" scale={0.985} accessibilityLabel={`${count.toLocaleString('ja-JP')}人がオンライン。みんなを開く`}>
      <Panel pad={12} cut={12} marks={N.cyan}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Blink><View style={{ width: 6, height: 6, backgroundColor: N.cyan, boxShadow: `0px 0px 6px ${N.cyan}` }} /></Blink>
              <Label>{`// NETWORK · ${count.toLocaleString('en-US')} ONLINE`}</Label>
            </View>
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 8 }}>
              {peers.map((p) => (
                <View key={p.n} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D0D0D', borderWidth: 1, borderColor: p.c }}>
                  <J size={12} w="800" color={p.c}>{[...p.n][0]}</J>
                </View>
              ))}
              <J size={11} w="500" color={N.ink3} numberOfLines={1} style={{ flex: 1, alignSelf: 'center', marginLeft: 3 }}>{peers.map((p) => p.n).join(' · ')}</J>
            </View>
          </View>
          <Press onPress={join} disabled={joined} scale={0.92} hitSlop={6} accessibilityLabel={joined ? '勉強中' : '一緒に始める'}
            style={{ height: 34, paddingHorizontal: 12, justifyContent: 'center' }}>
            <Cut fill={joined ? 'transparent' : N.cyan} stroke={joined ? N.cyanLine : undefined} cut={8} />
            <J size={12} w="800" color={joined ? N.cyan : '#0A0A0A'}>{joined ? '同期中' : '一緒に始める'}</J>
          </Press>
        </View>
      </Panel>
    </Press>
  );
}

const SECTIONS: HomeKit['sections'] = {
  today: Today, now: Now, streak: Streak, 'x:level': Level, chart: Chart, todos: Todos, deadlines: Deadlines, peers: Peers,
};

export const home: HomeKit = {
  Page,
  Header,
  Frame: makeFrame(new Set(Object.keys(SECTIONS ?? {}) as Kind[])),
  sections: SECTIONS,
  // the readout and the launch bar lead; streak and level side by side; then the log, missions, deadlines and the network
  arrange: () => [
    { id: 'grass', sections: ['grass'] },
    { id: 'stats', sections: ['streak', 'x:level'], row: true },
    { id: 'net', sections: ['peers'] },
    { id: 'readout', sections: ['today'] },
  ],
  DesignHandle,
};
