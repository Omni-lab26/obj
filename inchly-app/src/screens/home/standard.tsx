import { ComponentType, ReactNode, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, pad, subj } from '@/data';
import { useDesign } from '@/design';
import { jpDate } from '@/lib/time';
import { Friends } from '@/screens/home/Friends';
import { SectionKind } from '@/screens/layout';
import { go, pickLabel, session, startPick, useDeadlines, useNext, usePeers, useSession, useToday, useTodos, useWeekStreak } from '@/screens/model';
import type { SectionProps } from '@/themes/types';
import { useStore } from '@/store';
import { hair, lift, onColor, radius, type, useT } from '@/theme';
import { Avatar, AvatarStack, Btn, Card, haptic, IconBtn, Press, SubjCoin, Txt } from '@/ui/base';
import { InchTape, Wordmark } from '@/ui/Brand';
import { Screen, useTabPad, useUnread } from '@/ui/Chrome';
import { deadlineActions, deadlineSheet, todoSheet } from '@/ui/Editors';
import { LiveDot } from '@/ui/GroupParts';
import { Badges, useGrowth } from '@/ui/Growth';
import { Heatmap } from '@/ui/Heatmap';
import { MiniSeg } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { LevelChip } from '@/ui/Level';
import { Rolling } from '@/ui/Rolling';
import { Sticker } from '@/ui/Sticker';
import { StudyChart } from '@/ui/StudyChart';
import { toast } from '@/ui/Toast';

// The standard home, as sections. It is the base layout's own drawing — and
// what any theme falls back to for a section it doesn't draw itself (in that
// theme's colors and type). Sections leave outer spacing to the page and
// framing to the block, so they fit wherever a theme puts them.

// ---------- page, header, frame ----------
export function StandardPage({ header, children }: { header: ReactNode; children: ReactNode }) {
  const tabPad = useTabPad();
  return (
    <Screen>
      {header}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: tabPad, gap: 12 }}>
        {children}
      </ScrollView>
    </Screen>
  );
}

export function StandardHeader() {
  const unread = useUnread();
  const me = useStore((s) => s.account?.name ?? 'はる');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 18, paddingRight: 16, paddingTop: 6, height: 52 }}>
      <Wordmark size={19} />
      <LevelChip />
      <View style={{ flex: 1 }} />
      <IconBtn outline name="search" label="さがす" onPress={go.search} />
      <IconBtn outline name="bell" label="お知らせ" dot={unread > 0} onPress={go.notifications} />
      <Press onPress={go.me} scale={0.9} accessibilityLabel="マイページ" style={{ marginLeft: 2 }}>
        <Avatar name={me} color="#6E56CF" size={34} />
      </Press>
      {/* everything about the app, one place: the gear at the top right */}
      <IconBtn outline name="gear" label="設定" onPress={go.settings} />
    </View>
  );
}

/** Sections that need a surface of their own when they stand alone. */
const CARDED: SectionKind[] = ['grass', 'today', 'chart', 'now'];
/** A block of several sections is one card; a lone section brings its own shape (or gets a card). */
export function StandardFrame({ block, children }: { block: { sections: string[]; row?: boolean }; children: ReactNode }) {
  if (block.row) return <View style={{ flexDirection: 'row', gap: 12 }}>{wrapEach(children)}</View>;
  if (block.sections.length > 1 || CARDED.includes(block.sections[0] as SectionKind)) return <Card pad={14}>{children}</Card>;
  return <>{children}</>;
}
const wrapEach = (children: ReactNode) => (Array.isArray(children) ? children : [children]).map((c, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{c}</View>);

// ---------- sections ----------
/** The grass, first: every day studied fills a square. Press and drag to read a day. */
function Grass() {
  const days = useStore((s) => s.sessions.filter((x) => x.date.startsWith(String(new Date().getFullYear()))).reduce((a, x) => a.add(x.date), new Set<string>()).size);
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={13.5} w="600" style={{ flex: 1 }}>勉強した日</Txt>
        <Txt size={12} tone="ink3" num>{`今年 ${days}日`}</Txt>
      </View>
      <Heatmap weeks={18} gap={3} />
    </View>
  );
}

/** The lead: today's total, like a wallet's balance card. */
function Today() {
  const t = useT();
  const today = useToday();
  const deadlines = useDeadlines();
  const next = deadlines[0];
  // hero digits roll up from zero once the screen is shown
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setShown(true), 120); return () => clearTimeout(id); }, []);
  const H = shown ? String(Math.floor(today.min / 60)) : '0';
  const M = shown ? pad(today.min % 60) : '00';
  const diff = today.diff;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt size={12} w="500" tone="ink2" style={{ flex: 1 }}>{`今日の勉強 · ${jpDate(new Date())}`}</Txt>
        {next ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, height: 20, borderRadius: 6, backgroundColor: t.sunken }}>
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.amber }} />
          <Txt size={10.5} tone="ink2" lh={13}>{`${next.t}まで `}<Txt size={10.5} w="700" num lh={13}>{next.days}</Txt>日</Txt>
        </View> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 }} accessible accessibilityLabel={`今日 ${Math.floor(today.min / 60)}時間${today.min % 60}分。昨日より${diff}分`}>
        <Rolling value={H} size={type.hero} weight="700" />
        <Txt size={13} w="600" tone="ink3" style={{ marginLeft: 2, marginRight: 6, marginBottom: 4 }}>時間</Txt>
        <Rolling value={M} size={type.hero} weight="700" />
        <Txt size={13} w="600" tone="ink3" style={{ marginLeft: 2, marginBottom: 4 }}>分</Txt>
        <View style={{ flex: 1 }} />
        {/* gains are green, like "+8.24% (24h)" on a wallet */}
        <View style={{ alignItems: 'flex-end', marginBottom: 3 }}>
          <Txt num size={12} w="700" lh={15} color={diff >= 0 ? t.greenInk : t.red}>{`${diff >= 0 ? '▲' : '▼'} ${Math.floor(Math.abs(diff) / 60)}:${pad(Math.abs(diff) % 60)}`}</Txt>
          <Txt size={10.5} tone="ink3" lh={13}>昨日より</Txt>
        </View>
      </View>
      <View style={{ marginTop: 18 }}>
        <InchTape minutes={today.min} goal={today.goal} parts={today.parts} />
      </View>
    </View>
  );
}

/** Today by the hour, or this week by the day. */
function Chart({ index }: SectionProps) {
  const t = useT();
  return (
    <View style={index ? { marginTop: 16, paddingTop: 14, borderTopWidth: hair, borderTopColor: t.line } : null}>
      <StudyChart />
    </View>
  );
}

/** One line: the session under way, or what's next with a start button (starting lives on the study page). */
function Now({ index }: SectionProps) {
  const t = useT();
  const ss = useSession();
  const pick = useNext();
  const box = { marginTop: index ? 14 : 0, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 8, paddingLeft: 8, paddingRight: 6, borderRadius: radius.inner,
    backgroundColor: t.canvas, borderWidth: hair, borderColor: t.line };
  if (ss.running) {
    return (
      <Press onPress={go.timer} scale={0.98} accessibilityLabel={`${ss.subject.name}を勉強中 ${hms(ss.elapsed)}。タイマーを開く`} style={box}>
        <SubjCoin name={ss.subject.name} color={ss.subject.c} size={30} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <LiveDot size={5} color={ss.paused ? t.amber : undefined} />
            <Txt size={11} tone="ink3" lh={14}>{ss.paused ? '一時停止中' : '勉強中'}</Txt>
          </View>
          <Txt size={13} w="600" lh={18} numberOfLines={1}>{ss.subject.name}<Txt size={12} tone="ink2">{ss.task ? `  ${ss.task}` : ''}</Txt></Txt>
        </View>
        <Txt num size={15} w="600">{hms(ss.elapsed)}</Txt>
        <Press onPress={session.pause} haptics={false} scale={0.88} accessibilityLabel={ss.paused ? '再開' : '一時停止'} hitSlop={7}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={ss.paused ? 'play' : 'pause'} size={13} color={t.ink} />
        </Press>
      </Press>
    );
  }
  const p = subj(pick.s);
  return (
    <Press onPress={go.study} scale={0.98} accessibilityLabel={`${pickLabel(pick)} ${p.name} ${pick.what}。勉強のページを開く`} style={box}>
      <SubjCoin name={p.name} color={p.c} size={30} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={11} tone="ink3" lh={14}>{pickLabel(pick)}</Txt>
        <Txt size={13} w="600" lh={18} numberOfLines={1}>{p.name}<Txt size={12} tone="ink2">{pick.what ? `  ${pick.what}` : ''}</Txt></Txt>
      </View>
      <Press onPress={() => startPick(pick)} haptics={false} scale={0.9} hitSlop={7} accessibilityLabel={`${p.name}を始める`}
        style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: p.c, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Icon name="play" size={11} color={onColor(p.c)} />
        <Txt size={12.5} w="700" color={onColor(p.c)}>始める</Txt>
      </Press>
    </Press>
  );
}

/**
 * The streak, after Caleb Wu's "day streak": a capsule with the flame, the
 * count, and the week as dots. Tap it and the flame jumps.
 */
function Streak() {
  const t = useT();
  const { streak, tickets, days } = useWeekStreak();
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const jump = () => {
    haptic.soft();
    s.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { duration: 520, dampingRatio: 0.4 })));
    r.set(withSequence(withTiming(-14, { duration: 110 }), withSpring(0, { duration: 520, dampingRatio: 0.4 })));
  };
  // the capsule's look, from the デザイン page: black, the main color, or white
  const look = useDesign().streak;
  const light = look === 'white';
  const fg = light ? t.ink : '#fff';
  const dim = light ? t.ink3 : 'rgba(255,255,255,0.55)';
  return (
    <Press onPress={jump} haptics={false} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
      style={{ height: 58, borderRadius: 29, backgroundColor: look === 'ink' ? t.ink : light ? t.surface : '#0B0D12', flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 18,
        borderWidth: light ? hair : 0, borderColor: t.line2, ...(light ? lift(t) : null) }}>
      <Animated.View style={a}><Sticker name="fire" size={42} /></Animated.View>
      <View style={{ marginLeft: 4 }}>
        <Rolling value={pad(streak)} size={17} weight="700" color={fg} />
        <Txt size={11} color={dim} lh={14}>{`日連続 · 休み券 ${tickets}`}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {days.map((d) => (
          <View key={d.label} style={{ alignItems: 'center', gap: 5 }}>
            <Txt size={10} w="600" lh={12} color={d.today ? fg : dim}>{d.label}</Txt>
            <View style={{ width: 7, height: 7, borderRadius: 4,
              backgroundColor: d.today && d.studied ? '#FF7A1A' : d.studied ? fg : 'transparent',
              borderWidth: d.studied ? 0 : 1, borderColor: dim, borderStyle: d.future ? 'dashed' : 'solid' }} />
          </View>
        ))}
      </View>
    </Press>
  );
}

/** How many ToDos are left and the next one; the list itself is on the study page. */
function Todos() {
  const t = useT();
  const { total, done, next } = useTodos();
  const box = [{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)];
  if (!total) {
    return (
      <Press onPress={() => todoSheet()} scale={0.985} accessibilityLabel="ToDoを追加" style={[box, { gap: 10 }]}>
        <Icon name="plus" size={14} color={t.ink} />
        <Txt size={13.5} w="600" style={{ flex: 1 }}>ToDoを追加</Txt>
        <Txt size={11.5} tone="ink3">やることを決めておくと始めやすい</Txt>
      </Press>
    );
  }
  return (
    <Press onPress={go.study} scale={0.985} accessibilityLabel={`ToDo のこり${total - done}つ。勉強のページを開く`} style={box}>
      <View>
        <Txt size={11} tone="ink3" lh={14}>ToDo</Txt>
        <Txt num size={17} w="700" lh={21}>{done}<Txt size={12} tone="ink3">{` / ${total}`}</Txt></Txt>
      </View>
      <View style={{ width: hair, alignSelf: 'stretch', backgroundColor: t.line }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={11} tone="ink3" lh={14}>{next ? '次のToDo' : 'ぜんぶ終わり'}</Txt>
        <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{next ? next.t : '今日のToDoは全部完了しました'}</Txt>
      </View>
      <Icon name="chev" size={14} color={t.ink3} />
    </Press>
  );
}

/** Deadlines, a portfolio-style list (on the study page; themes may still put it on home). */
export function Deadlines() {
  const t = useT();
  const deadlines = useDeadlines();
  return (
    <View>
      <View style={{ paddingHorizontal: 4, paddingTop: 10, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Txt size={type.head} w="600">締切</Txt>
        <Txt size={12} w="500" tone="ink3" style={{ flex: 1 }}>ToDoの進み具合</Txt>
        <AddLink label="追加" onPress={deadlineSheet} />
      </View>
      <Card pad={0}>
        {deadlines.length ? null : (
          <Press onPress={deadlineSheet} style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Txt size={13} tone="ink3">模試や申込の日を入れておきましょう</Txt>
          </Press>
        )}
        {deadlines.map((d, i) => (
          <Press key={d.id} onPress={() => deadlineActions(d.id, d.t)} scale={0.99} accessibilityLabel={`${d.t} あと${d.days}日`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 }}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 58, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <Sticker name={d.days <= 21 ? 'flag' : i === 1 ? 'cal' : 'trophy'} size={36} tilt={i % 2 ? 6 : -6} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13.5} w="600" lh={18} numberOfLines={1}>{d.t}</Txt>
              <Txt size={11} tone="ink3" lh={15}>{`${d.mo}月${d.day}日 · ${d.total ? `ToDo ${d.done}/${d.total}` : 'ToDoなし'}`}</Txt>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Txt num size={14} w="700" lh={17} color={d.days <= 21 ? t.amber : t.ink}>{d.days}<Txt size={11} w="500" tone="ink3"> 日</Txt></Txt>
              {d.total ? <MiniSeg done={d.done} total={Math.min(d.total, 8)} /> : null}
            </View>
          </Press>
        ))}
      </Card>
    </View>
  );
}

/** The badges you've collected, at the bottom of home. */
function HomeBadges() {
  const g = useGrowth(useStore((s) => s.sessions));
  return <Badges total={g.total} />;
}

/** People studying now, and studying along with them (the one-line version; home shows Friends). */
export function Peers() {
  const t = useT();
  const { people } = usePeers();
  const peers = people.slice(0, 3);
  const me = useStore((s) => s.account?.name ?? 'はる');
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
    <Press onPress={go.community} scale={0.985}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, borderRadius: radius.card, backgroundColor: t.surface }, lift(t)]}>
      <AvatarStack ring={t.surface} size={28} max={4} people={[...(joined ? [{ n: me, c: '#6E56CF' }] : []), ...peers]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <LiveDot size={5} />
          <Txt size={13} w="600" lh={18}>{peers.length + 1 + (joined ? 1 : 0)}人が勉強中</Txt>
        </View>
        <Txt size={11} tone="ink3" numberOfLines={1}>{peers.map((p) => p.n).join(' · ')}</Txt>
      </View>
      <Btn label={joined ? '勉強中' : '一緒に始める'} kind="tint" small onPress={join} disabled={joined} />
    </Press>
  );
}

function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} hitSlop={12} scale={0.94} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center' }}>
      <Icon name="plus" size={12} color={t.greenInk} />
      <Txt size={12.5} w="600" color={t.greenInk}>{label}</Txt>
    </Press>
  );
}

/** The standard drawing of every base section. */
export const STANDARD_SECTIONS: Record<SectionKind, ComponentType<SectionProps>> = {
  grass: Grass, streak: Streak, today: Today, peers: Friends, badges: HomeBadges, chart: Chart, now: Now, todos: Todos, deadlines: Deadlines,
};

/** The handle on the left edge that opens the デザイン page. */
export function StandardHandle({ onPress }: { onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} hitSlop={{ top: 20, bottom: 20, left: 4, right: 14 }} scale={0.9} accessibilityRole="button" accessibilityLabel="デザインを変える"
      style={{ position: 'absolute', left: 0, top: '42%', width: 14, height: 56, borderTopRightRadius: 8, borderBottomRightRadius: 8, backgroundColor: t.surface,
        borderWidth: hair, borderLeftWidth: 0, borderColor: t.line2, alignItems: 'center', justifyContent: 'center', ...lift(t) }}>
      <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: t.ink3 }} />
    </Press>
  );
}
