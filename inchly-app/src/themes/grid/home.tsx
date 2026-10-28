import { ComponentType, Fragment, ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line, Rect } from 'react-native-svg';

import { subj } from '@/data';
import { Block, Kind } from '@/screens/layout';
import {
  clock, go, hmColon, jpHm, pickLabel, session, startPick, tickTodo, useCharts, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak,
} from '@/screens/model';
import { setChart, useLevel, useNow, useStore } from '@/store';
import type { HomeKit, SectionProps } from '@/themes/types';
import { useT } from '@/theme';
import { Avatar, haptic, Press } from '@/ui/base';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { Icon, IconName } from '@/ui/Icon';
import { levelSheet } from '@/ui/Level';
import { press as pressDown, release } from '@/ui/motion';
import { toast } from '@/ui/Toast';
import { Barcode, Blink, Dash, FRAME, Gradient, HatchDef, J, M, pad2, PINK, ScreenFrame, stamp, useScramble, useSvgId, Window, WarpGrid } from './parts';

// 方眼 home: a desk of windows on lavender graph paper. Each section is a
// file — today.log, hours.plot, streak.txt, todo.txt … — with its name on
// top; tap a name and the window folds away. Figures are monospaced, the
// hours rise out of a bent grid, and the one black pill starts the next thing.

// ---------- page ----------
function Page({ header, children }: { header: ReactNode; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const tabPad = useTabPad();
  return (
    <Screen>
      <ScreenFrame top={insets.top + 2} />
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: tabPad, gap: 12 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

/** The time, to the second. Only this ticks. */
function Clock() {
  const t = useT();
  const now = new Date(useNow());
  return <M size={12} lh={16} num color={t.ink2}>{`${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`}</M>;
}

function Square({ icon, label, onPress, dot, children }: { icon?: IconName; label: string; onPress: () => void; dot?: boolean; children?: ReactNode }) {
  const t = useT();
  return (
    <Press onPress={onPress} scale={0.9} hitSlop={4} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: 32, height: 32, borderRadius: 4, borderWidth: 1, borderColor: FRAME, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
      {children ?? (icon ? <Icon name={icon} size={16} color={t.ink} width={1.6} /> : null)}
      {dot ? <View style={{ position: 'absolute', top: 4, right: 4, width: 6, height: 6, backgroundColor: PINK }} /> : null}
    </Press>
  );
}

/** Level as a tag: LV.12 and five cells for the way to the next. */
function LevelTag() {
  const t = useT();
  const l = useLevel();
  const filled = Math.floor(l.p * 5);
  return (
    <Press onPress={levelSheet} scale={0.94} hitSlop={6} accessibilityRole="button" accessibilityLabel={`レベル${l.lv}。次のレベルまで${Math.round(l.need)} EXP`}
      style={{ height: 26, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, borderColor: t.ink, backgroundColor: t.surface }}>
      <M b size={11} lh={14}>{`LV.${l.lv}`}</M>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {[0, 1, 2, 3, 4].map((i) => <View key={i} style={{ width: 5, height: 8, borderWidth: 1, borderColor: t.ink, backgroundColor: i < filled ? t.ink : 'transparent' }} />)}
      </View>
    </Press>
  );
}

function Header() {
  const t = useT();
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  return (
    <View style={{ paddingLeft: 18, paddingRight: 16, paddingTop: 10, paddingBottom: 2, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <M b size={15} lh={20}>inchly</M>
        <M size={15} lh={20} color={t.ink3}>/home</M>
        <View style={{ flex: 1 }} />
        <Clock />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <LevelTag />
        <View style={{ flex: 1 }} />
        <Square icon="search" label="さがす" onPress={go.search} />
        <Square icon="bell" label="お知らせ" dot={unread > 0} onPress={go.notifications} />
        <Square label="マイページ" onPress={go.me}><Avatar name={me} color="#6E56CF" size={24} /></Square>
        <Square icon="gear" label="設定" onPress={go.settings} />
      </View>
    </View>
  );
}

// ---------- windows ----------
const FILES: Partial<Record<Kind, string>> = { today: 'today.log', now: 'next.cal', streak: 'streak.txt', todos: 'todo.txt', deadlines: 'deadline.cal', peers: 'peers.net' };
// What a window's bar says on the right; each reads only what it needs.
function Meta({ color, children }: { color: string; children: string }) {
  return <M size={10.5} lh={14} num color={color} numberOfLines={1} style={{ flexShrink: 1 }}>{children}</M>;
}
function TodayMeta({ color }: { color: string }) {
  return <Meta color={color}>{`goal ${hmColon(useToday().goal)}`}</Meta>;
}
function ChartMeta({ color }: { color: string }) {
  const range = useStore((s) => s.chart.range);
  const c = useCharts();
  const today = useToday();
  return <Meta color={color}>{`Σ ${hmColon(range === 'week' ? c.weekTotal : today.min)}`}</Meta>;
}
function StreakMeta({ color }: { color: string }) {
  return <Meta color={color}>{`${useWeekStreak().streak}d`}</Meta>;
}
function TodosMeta({ color }: { color: string }) {
  const { done, total } = useTodos();
  return <Meta color={color}>{total ? `${done}/${total}` : '0'}</Meta>;
}
function DeadlinesMeta({ color }: { color: string }) {
  const n = useDeadlines().length;
  return <Meta color={color}>{`${n} ${n === 1 ? 'item' : 'items'}`}</Meta>;
}
function PeersMeta({ color }: { color: string }) {
  return <Meta color={color}>{`${usePeers().people.slice(0, 3).length + 1} live`}</Meta>;
}
const METAS: Partial<Record<Kind, ComponentType<{ color: string }>>> = {
  today: TodayMeta, chart: ChartMeta, streak: StreakMeta, todos: TodosMeta, deadlines: DeadlinesMeta, peers: PeersMeta,
};
const metaOf = (k: Kind) => {
  const C = METAS[k];
  return C ? (color: string) => <C color={color} /> : undefined;
};

/** A block is a window; side by side, each section gets its own. The theme's own extras stand bare. */
function Frame({ block, children }: { block: Block; index: number; children: ReactNode }) {
  const range = useStore((s) => s.chart.range);
  const kids = Array.isArray(children) ? children : [children];
  const title = (k: Kind) => (k === 'chart' ? (range === 'week' ? 'week.plot' : 'hours.plot') : FILES[k] ?? `${k.replace(/^x:/, '')}.txt`);
  if (block.sections.every((k) => k.startsWith('x:'))) return <>{children}</>;
  if (block.row) {
    return (
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {block.sections.map((k, i) => (
          <Window key={k} id={k} row title={title(k)} meta={metaOf(k)} style={{ flex: 1, minWidth: 0 }}>{kids[i]}</Window>
        ))}
      </View>
    );
  }
  return (
    <Window id={block.id} title={title(block.sections[0])} meta={metaOf(block.sections[0])}>
      {kids.map((c, i) => <Fragment key={i}>{i ? <Dash inset={12} /> : null}{c}</Fragment>)}
    </Window>
  );
}

// ---------- today.log ----------
/** Today's total, big and monospaced; tap it and the figures work themselves out again. */
function Today() {
  const t = useT();
  const today = useToday();
  const [run, setRun] = useState(0);
  const shown = useScramble(`${pad2(Math.floor(today.min / 60))}:${pad2(today.min % 60)}`, run);
  const up = today.diff >= 0;
  return (
    <View style={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <J size={11} color={t.ink2} style={{ flex: 1 }}>今日の勉強</J>
        <M size={10.5} color={t.ink3}>{stamp(new Date())}</M>
      </View>
      <Press onPress={() => setRun((r) => r + 1)} scale={0.99} accessibilityRole="button"
        accessibilityLabel={`今日 ${jpHm(today.min)}。昨日より${up ? '' : 'マイナス'}${jpHm(Math.abs(today.diff))}`}
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <M b size={56} lh={62} ls={-2} num>{shown}</M>
        <View style={{ marginBottom: 9, gap: 1 }}>
          <M size={10} lh={12} color={t.ink3}>HH:MM</M>
          <M b size={12} lh={16} num color={up ? t.ink : PINK}>{`${up ? '+' : '−'}${hmColon(Math.abs(today.diff))}`}</M>
          <J size={10} lh={13} color={t.ink3}>昨日より</J>
        </View>
      </Press>
      <GoalRuler min={today.min} goal={today.goal} parts={today.parts} />
    </View>
  );
}

/** Today on a ruler: the subjects' minutes end to end, ticks every half hour, the goal marked. */
function GoalRuler({ min, goal, parts }: { min: number; goal: number; parts: { id: string; c: string; min: number }[] }) {
  const t = useT();
  const [w, setW] = useState(0);
  const max = Math.max(goal, Math.ceil(min / 60) * 60, 60);
  const x = (m: number) => (w * m) / max;
  // each subject's stretch, end to end
  const spans = parts.map((p, i) => {
    const from = parts.slice(0, i).reduce((a, q) => a + q.min, 0);
    return { id: p.id, c: p.c, from, to: from + p.min };
  });
  const hours = Array.from({ length: Math.floor(max / 60) + 1 }, (_, i) => i);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={`目標 ${jpHm(goal)} のうち ${jpHm(min)}`} style={{ height: 40 }}>
      {w ? (
        <>
          <Svg width={w} height={24}>
            {spans.map((p) => <Rect key={p.id} x={x(p.from)} y={1} width={Math.max(0, x(p.to) - x(p.from))} height={11} fill={p.c} />)}
            <Rect x={0.5} y={0.5} width={w - 1} height={12} fill="none" stroke={t.ink} strokeWidth={1} />
            {Array.from({ length: Math.floor(max / 30) + 1 }, (_, i) => {
              const xx = Math.min(w - 0.5, Math.max(0.5, x(i * 30)));
              return <Line key={i} x1={xx} y1={13} x2={xx} y2={i % 2 ? 16 : 19} stroke={t.ink} strokeWidth={1} />;
            })}
            {/* the goal: a mark through the bar */}
            <Line x1={Math.min(w - 1, x(goal))} y1={-2} x2={Math.min(w - 1, x(goal))} y2={24} stroke={PINK} strokeWidth={2} />
          </Svg>
          {hours.map((h) => (
            <M key={h} size={9} lh={12} color={t.ink3} style={{ position: 'absolute', top: 24, left: Math.min(w - 18, Math.max(0, x(h * 60) - (h ? 9 : 0))), width: 18, textAlign: h ? 'center' : 'left' }}>{`${h}h`}</M>
          ))}
        </>
      ) : null}
    </View>
  );
}

/** The black pill: it fills with the gradient while held, and its arrow leans out. */
function StartPill({ onPress, label, text = 'START' }: { onPress: () => void; label: string; text?: string }) {
  const t = useT();
  const id = useSvgId('start');
  const p = useSharedValue(0);
  const fill = useAnimatedStyle(() => ({ opacity: p.value }));
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateX: 2 * p.value }, { translateY: -2 * p.value }] }));
  return (
    <Pressable onPressIn={() => p.set(pressDown(1))} onPressOut={() => p.set(release(0))} onPress={onPress} hitSlop={8}
      accessibilityRole="button" accessibilityLabel={label}
      style={{ height: 38, paddingHorizontal: 15, borderRadius: 19, backgroundColor: t.ink, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fill]}><Gradient id={id} /></Animated.View>
      <M b size={13} lh={16} color={t.canvas}>{text}</M>
      <Animated.View style={arrow}><M b size={13} lh={16} color={t.canvas}>↗</M></Animated.View>
    </Pressable>
  );
}

/** What's under way (the clock, REC, pause) or what's next (the pill starts it). */
function Now() {
  const t = useT();
  const ss = useSession();
  const pick = useNext();
  if (ss.running) {
    return (
      <Press onPress={go.timer} scale={0.99} accessibilityRole="button" accessibilityLabel={`${ss.subject.name}を勉強中 ${clock(ss.elapsed)}。タイマーを開く`}
        style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 10, height: 10, backgroundColor: ss.subject.c }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Blink on={!ss.paused} />
            <M size={10.5} lh={14} color={ss.paused ? t.ink3 : PINK}>{ss.paused ? 'PAUSED' : 'REC'}</M>
          </View>
          <J size={14} w="700" lh={20} numberOfLines={1}>{ss.subject.name}<J size={12} color={t.ink2}>{ss.task ? `  ${ss.task}` : ''}</J></J>
        </View>
        <M b size={18} lh={22} num>{clock(ss.elapsed)}</M>
        <Press onPress={session.pause} haptics={false} scale={0.88} hitSlop={7} accessibilityRole="button" accessibilityLabel={ss.paused ? '再開' : '一時停止'}
          style={{ width: 32, height: 32, borderRadius: 4, borderWidth: 1, borderColor: t.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: t.canvas }}>
          <Icon name={ss.paused ? 'play' : 'pause'} size={12} color={t.ink} />
        </Press>
      </Press>
    );
  }
  const p = subj(pick.s);
  // the timetable's block (and how soon), a ToDo, or nothing to say for the last subject
  const when = pick.from === 'now' ? `いま · ${pick.start}〜${pick.end}`
    : pick.from === 'next' ? `${pick.start}から${pick.inMin != null ? ` · あと${jpHm(pick.inMin)}` : ''}`
    : pick.from === 'todo' ? 'ToDo' : '';
  return (
    <Press onPress={go.study} scale={0.99} accessibilityRole="button" accessibilityLabel={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`} style={{ padding: 12, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <M size={10.5} lh={14} color={t.ink3}>NEXT</M>
        <J size={11} lh={15} color={t.ink2} numberOfLines={1} style={{ flex: 1 }}>{when}</J>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 10, height: 10, backgroundColor: p.c }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <J size={15} w="700" lh={21} numberOfLines={1}>{p.name}</J>
          {pick.what ? <J size={12} lh={17} color={t.ink2} numberOfLines={1}>{pick.what}</J> : null}
        </View>
        <StartPill onPress={() => startPick(pick)} label={`${p.name}を始める`} />
      </View>
    </Press>
  );
}

// ---------- hours.plot / week.plot ----------
/**
 * Today by the hour or the week by the day, rising out of a bent grid. Tap a
 * bar for a crosshair and its figure; tap it again to clear.
 */
function Chart() {
  const t = useT();
  const range = useStore((s) => s.chart.range);
  const c = useCharts();
  const [sel, setSel] = useState<{ range: string; i: number } | null>(null);
  const [w, setW] = useState(0);
  const hatch = useSvgId('live');
  const day = range === 'day';
  const H = 116;
  const items = day
    ? c.hours.map((x) => ({ key: String(x.h), min: x.min, live: x.live, parts: x.parts, now: x.now, future: x.future, label: x.h % 3 ? '' : String(x.h), name: `${x.h}:00` }))
    : c.week.map((x) => ({ key: x.date, min: x.min, live: x.live, parts: x.parts, now: x.today, future: x.future, label: x.label, name: x.label }));
  const n = items.length;
  const max = Math.max(day ? 60 : c.goal, 1, ...items.map((x) => x.min));
  const slot = w / n;
  const barW = day ? Math.max(3, slot - 4) : Math.min(24, slot - 12);
  const y = (m: number) => H - (H - 10) * Math.min(1, m / max);
  const picked = sel && sel.range === range ? sel.i : null;
  const pickedItem = picked !== null ? items[picked] : null;
  const segs = (x: (typeof items)[number], i: number) => {
    const cx = slot * i + slot / 2;
    let acc = 0;
    const out = x.parts.map((p) => {
      const y1 = y(acc + p.min), y0 = y(acc);
      acc += p.min;
      return <Rect key={p.id} x={cx - barW / 2} y={y1} width={barW} height={Math.max(0, y0 - y1)} fill={p.c} />;
    });
    if (x.live > 0.5) {
      const y1 = y(acc + x.live), y0 = y(acc);
      out.push(<Rect key="live" x={cx - barW / 2} y={y1} width={barW} height={Math.max(0, y0 - y1)} fill={`url(#${hatch})`} stroke={t.ink} strokeWidth={0.75} />);
    }
    return out;
  };
  return (
    <View style={{ padding: 12, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {(['day', 'week'] as const).map((r) => {
          const on = r === range;
          return (
            <Press key={r} onPress={() => { if (!on) { haptic.tap(); setChart({ range: r }); } }} haptics={false} scale={0.94} hitSlop={6}
              accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={r === 'day' ? '今日を時間ごとに' : '今週を日ごとに'}
              style={{ height: 24, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: t.ink, backgroundColor: on ? t.ink : 'transparent', justifyContent: 'center' }}>
              <M b size={10.5} lh={13} color={on ? t.canvas : t.ink}>{r === 'day' ? '24H' : '7D'}</M>
            </Press>
          );
        })}
        <View style={{ flex: 1 }} />
        {pickedItem ? (
          <M size={10.5} lh={14} num color={t.ink}>{`${pickedItem.name} · ${jpHm(pickedItem.min)}`}</M>
        ) : (
          <M size={10.5} lh={14} color={t.ink3}>{day ? `max ${max}m/h` : `goal ${hmColon(c.goal)}`}</M>
        )}
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ height: H }}>
        {w ? (
          <>
            <WarpGrid w={w} h={H} color={t.line2} cols={day ? 12 : 7} rows={5} />
            <Svg width={w} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
              <HatchDef id={hatch} color={t.ink} />
              {/* week: the day's goal as a dashed line */}
              {day ? null : <Line x1={0} y1={y(c.goal)} x2={w} y2={y(c.goal)} stroke={PINK} strokeWidth={1} strokeDasharray="4 3" />}
              {items.map((x, i) => (
                x.min > 0 ? <Fragment key={x.key}>{segs(x, i)}</Fragment>
                  : <Rect key={x.key} x={slot * i + slot / 2 - barW / 2} y={H - 1} width={barW} height={1} fill={x.future ? t.line2 : t.ink3} />
              ))}
              {/* now */}
              {items.map((x, i) => (x.now ? <Line key={`now${x.key}`} x1={slot * i + slot / 2} y1={0} x2={slot * i + slot / 2} y2={H} stroke={t.ink} strokeWidth={1} strokeDasharray="2 3" /> : null))}
              {/* the crosshair on the picked bar */}
              {picked !== null && pickedItem ? (
                <>
                  <Line x1={slot * picked + slot / 2} y1={0} x2={slot * picked + slot / 2} y2={H} stroke={PINK} strokeWidth={1} />
                  <Line x1={0} y1={y(pickedItem.min)} x2={w} y2={y(pickedItem.min)} stroke={PINK} strokeWidth={1} />
                  <Rect x={slot * picked + slot / 2 - barW / 2 - 3} y={y(pickedItem.min) - 3} width={barW + 6} height={H - y(pickedItem.min) + 3} fill="none" stroke={PINK} strokeWidth={1} strokeDasharray="3 2" />
                </>
              ) : null}
            </Svg>
            <View style={[StyleSheet.absoluteFill, { flexDirection: 'row' }]}>
              {items.map((x, i) => (
                <Pressable key={x.key} onPress={() => { haptic.tap(); setSel(picked === i ? null : { range, i }); }} style={{ flex: 1 }}
                  accessibilityRole="button" accessibilityLabel={`${x.name} ${jpHm(x.min)}`} />
              ))}
            </View>
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', marginTop: -4 }}>
        {items.map((x) => (
          <View key={x.key} style={{ flex: 1, alignItems: 'center' }}>
            {day ? <M size={9} lh={12} color={x.now ? t.ink : t.ink3} numberOfLines={1} style={{ width: 22, textAlign: 'center' }}>{x.label}</M>
              : <J size={10} lh={13} w={x.now ? '700' : '400'} color={x.now ? t.ink : t.ink3}>{x.label}</J>}
          </View>
        ))}
      </View>
    </View>
  );
}

// ---------- streak.txt ----------
/** The run in days, and the week as cells; tap it and a scan line passes over the week. */
function Streak() {
  const t = useT();
  const { streak, tickets, days } = useWeekStreak();
  const sweep = useSharedValue(-1);
  const [w, setW] = useState(0);
  const line = useAnimatedStyle(() => ({ opacity: sweep.value < 0 ? 0 : 1, transform: [{ translateX: Math.max(0, sweep.value) * w }] }), [w]);
  const scan = () => {
    haptic.soft();
    sweep.set(0);
    sweep.set(withTiming(1, { duration: 560, easing: Easing.linear }, (done) => { if (done) sweep.set(-1); }));
  };
  return (
    <Press onPress={scan} haptics={false} scale={0.99} accessibilityRole="button" accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`} style={{ padding: 12, gap: 8, flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <M b size={34} lh={40} num>{pad2(streak)}</M>
        <J size={11} color={t.ink2}>日連続</J>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {days.map((d) => (
          <View key={d.date} style={{ alignItems: 'center', gap: 3 }}>
            <J size={9.5} lh={12} w={d.today ? '700' : '400'} color={d.today ? t.ink : t.ink3}>{d.label}</J>
            <View style={{ width: 13, height: 13, borderWidth: 1, borderColor: d.studied || d.today ? t.ink : FRAME, borderStyle: d.future ? 'dashed' : 'solid',
              backgroundColor: d.studied ? t.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {d.rest && !d.studied ? <View style={{ width: 7, height: 1, backgroundColor: t.ink, transform: [{ rotate: '-45deg' }] }} /> : null}
            </View>
          </View>
        ))}
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: -2, bottom: -2, width: 2, backgroundColor: PINK }, line]} />
      </View>
      <M size={10} lh={13} color={t.ink3}>{`ticket ×${tickets}`}</M>
    </Press>
  );
}

// ---------- todo.txt ----------
/** The next few ToDos as [ ] lines; tick one and it shows [x] for a moment before it goes. */
function Todos() {
  const t = useT();
  const { todos, total } = useTodos();
  const [recent, setRecent] = useState<string[]>([]);
  const shown = todos.filter((x) => !x.d || recent.includes(x.id)).slice(0, 3);
  const tick = (id: string) => {
    setRecent((r) => [...r, id]);
    tickTodo(id);
    setTimeout(() => setRecent((r) => r.filter((x) => x !== id)), 900);
  };
  if (!total) {
    return (
      <Press onPress={() => todoSheet()} scale={0.99} accessibilityRole="button" accessibilityLabel="ToDoを追加" style={{ padding: 12, gap: 6, flex: 1 }}>
        <M b size={13} lh={17}>[+] add</M>
        <J size={11} lh={16} color={t.ink3}>やることを決めておくと始めやすい</J>
      </Press>
    );
  }
  return (
    <View style={{ padding: 12, paddingBottom: 8, gap: 6, flex: 1 }}>
      {shown.length ? shown.map((x) => (
        <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Press onPress={() => { if (!x.d) tick(x.id); }} react="step" scale={0.85} hitSlop={8}
            accessibilityRole="checkbox" accessibilityState={{ checked: x.d }} accessibilityLabel={`${x.t}を完了にする`}>
            <M b size={12} lh={16} color={x.d ? PINK : t.ink}>{x.d ? '[x]' : '[ ]'}</M>
          </Press>
          <J size={12} lh={16} numberOfLines={1} color={x.d ? t.ink3 : t.ink} style={[{ flex: 1 }, x.d && { textDecorationLine: 'line-through' }]}>{x.t}</J>
        </View>
      )) : <J size={12} lh={16} color={t.ink2}>今日のToDoは全部完了</J>}
      <View style={{ flex: 1 }} />
      <Press onPress={go.study} scale={0.96} hitSlop={6} accessibilityRole="button" accessibilityLabel="ToDoをすべて見る" style={{ alignSelf: 'flex-start' }}>
        <M size={10.5} lh={14} color={t.ink2}>{'open →'}</M>
      </Press>
    </View>
  );
}

// ---------- deadline.cal ----------
function Cells({ done, total }: { done: number; total: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: total }, (_, i) => <View key={i} style={{ width: 5, height: 9, borderWidth: 1, borderColor: t.ink, backgroundColor: i < done ? t.ink : 'transparent' }} />)}
    </View>
  );
}

function Deadlines() {
  const t = useT();
  const list = useDeadlines();
  return (
    <View style={{ paddingTop: 2, paddingBottom: 10 }}>
      {list.length ? list.map((d, i) => (
        <Fragment key={d.id}>
          {i ? <Dash inset={12} color={t.line2} /> : null}
          <Press onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityRole="button" accessibilityLabel={`${d.t} あと${d.days}日`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9 }}>
            <M b size={13} lh={17} num color={d.days <= 21 ? PINK : t.ink} style={{ width: 46 }}>{`D-${d.days}`}</M>
            <J size={13} w="600" lh={18} numberOfLines={1} style={{ flex: 1 }}>{d.t}</J>
            <M size={11} lh={14} num color={t.ink3}>{`${pad2(d.mo)}/${pad2(d.day)}`}</M>
            {d.total ? <Cells done={d.done} total={Math.min(d.total, 6)} /> : null}
          </Press>
        </Fragment>
      )) : (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, gap: 2 }}>
          <M size={11} lh={14} color={t.ink3}>no entries</M>
          <J size={12} lh={17} color={t.ink2}>締め切りの日を入れておくと、残りの日数がわかります</J>
        </View>
      )}
      <Press onPress={deadlineSheet} scale={0.98} accessibilityRole="button" accessibilityLabel="締切を追加"
        style={{ marginHorizontal: 12, marginTop: 6, height: 30, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: FRAME, alignItems: 'center', justifyContent: 'center' }}>
        <M size={11} lh={14}>+ add deadline</M>
      </Press>
    </View>
  );
}

// ---------- peers.net ----------
function Peers() {
  const t = useT();
  const { people } = usePeers();
  const peers = people.slice(0, 3);
  const running = useStore((s) => s.running);
  const [joined, setJoined] = useState(false);
  const count = peers.length + 1 + (joined ? 1 : 0);
  const join = () => {
    if (running) { toast('もう勉強中です'); return; }
    session.start();
    setJoined(true);
    haptic.success();
    toast('みんなと一緒に始めました');
  };
  return (
    <Press onPress={go.community} scale={0.99} accessibilityRole="button" accessibilityLabel={`${count}人が勉強中。みんなのページを開く`}
      style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Blink />
          <M b size={13} lh={17}>{`${count} online`}</M>
        </View>
        <J size={11} lh={16} color={t.ink3} numberOfLines={1}>{peers.map((p) => p.n).join(' · ')}</J>
      </View>
      <Press onPress={join} disabled={joined} scale={0.94} hitSlop={6} accessibilityRole="button" accessibilityLabel={joined ? '勉強中' : '一緒に始める'}
        style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: t.ink, justifyContent: 'center' }}>
        <M b size={11} lh={14}>{joined ? 'joined' : 'join ↗'}</M>
      </Press>
    </Press>
  );
}

// ---------- the footer ----------
/** inchly / time / log, and today as a code; tap it and a beam reads it. */
function Footer() {
  const t = useT();
  const today = useToday();
  const d = new Date();
  const code = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(Math.floor(today.min / 60))}${pad2(today.min % 60)}`;
  const beam = useSharedValue(-1);
  const [w, setW] = useState(0);
  const a = useAnimatedStyle(() => ({ opacity: beam.value < 0 ? 0 : 1, transform: [{ translateX: Math.max(0, beam.value) * w }] }), [w]);
  const read = () => {
    haptic.soft();
    beam.set(0);
    beam.set(withTiming(1, { duration: 560, easing: Easing.linear }, (done) => { if (done) beam.set(-1); }));
  };
  return (
    <Press onPress={read} haptics={false} scale={1} accessibilityRole="button" accessibilityLabel={`今日の記録コード ${code}`} style={{ paddingTop: 4, paddingBottom: 6, paddingHorizontal: 2, gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <M size={10.5} lh={14} color={t.ink3} style={{ flex: 1 }} numberOfLines={1}>inchly / time / log</M>
        <M size={10.5} lh={14} num color={t.ink3}>{`№ ${code}`}</M>
      </View>
      <View style={{ alignSelf: 'flex-start' }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Barcode code={code} color={t.ink} />
        <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: -2, top: -3, bottom: -3, width: 3, backgroundColor: PINK }, a]} />
      </View>
    </Press>
  );
}

/** The left-edge handle to the デザイン page: a bordered tab with three rules. */
function Handle({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} react="step" scale={0.9} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '42%', width: 14, height: 56, backgroundColor: t.surface, borderWidth: 1, borderLeftWidth: 0, borderColor: t.ink,
        borderTopRightRadius: 3, borderBottomRightRadius: 3, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
      {[0, 1, 2].map((i) => <View key={i} style={{ width: 6, height: 1, backgroundColor: t.ink }} />)}
    </Press>
  );
}

const SECTIONS: Partial<Record<Kind, ComponentType<SectionProps>>> = {
  today: Today, now: Now, chart: Chart, streak: Streak, todos: Todos, deadlines: Deadlines, peers: Peers, 'x:footer': Footer,
};

export const home: HomeKit = {
  Page, Header, Frame, sections: SECTIONS, DesignHandle: Handle,
  // today and what's next in one window, the plot under it, streak and ToDos side by side, then the rest
  arrange: () => [
    { id: 'grass', sections: ['grass'] },
    { id: 'streak', sections: ['streak'] },
    { id: 'peers', sections: ['peers'] },
    { id: 'today', sections: ['today'] },
    { id: 'footer', sections: ['x:footer'] },
  ],
};
