import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { hms, pad, SUBJ, subj } from '@/data';
import { studiedOn } from '@/lib/history';
import { elapsedOf, levelOf, setSubject, startStudy, togglePause, updateTodo, useNow, useStore, useStreak } from '@/store';
import { hair, type, useT } from '@/theme';
import { Card, haptic, Press, Txt } from '@/ui/base';
import { Screen, useTabPad } from '@/ui/Chrome';
import { todoSheet } from '@/ui/Editors';
import { LiveDot } from '@/ui/GroupParts';
import { TodoRow } from '@/ui/HomeParts';
import { Icon } from '@/ui/Icon';
import { PocketCard } from '@/ui/MeCard';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { Sticker } from '@/ui/Sticker';
import { StudyChartCard } from '@/ui/StudyChart';
import { toast } from '@/ui/Toast';

// Home, top to bottom: your card (top left) with the start button beside it,
// the streak, today's (or this week's) study time, and today's ToDos.
export default function Home() {
  const s = useStore((x) => x);
  const tabPad = useTabPad();
  const done = s.todos.filter((x) => x.d).length;
  const hours = useMemo(() => s.sessions.reduce((a, r) => a + r.min, 0) / 60, [s.sessions]);
  const a = s.account;

  const onToggle = (id: string) => {
    const willAll = s.todos.every((x) => (x.id === id ? !x.d : x.d));
    const td = s.todos.find((x) => x.id === id);
    if (td) updateTodo(id, { d: !td.d });
    if (willAll) { haptic.success(); toast('今日のToDo、ぜんぶ終わり'); }
  };
  return (
    <Screen style={{ paddingTop: 0 }}>
      {/* phone-width column, centered, on a tablet or a wide window */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: tabPad, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 6 }}>
          <View style={{ flex: 1.6 }}>
            <PocketCard name={a?.name ?? 'はる'} handle={a?.handle ?? 'haru_study'} lv={levelOf(hours).lv} hours={hours} onPress={() => router.push('/me')} />
          </View>
          <View style={{ flex: 1 }}>
            <StartPanel />
          </View>
        </View>

        <StreakPill />

        <StudyChartCard />

        <View style={{ paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Txt size={type.head} w="600">ToDo</Txt>
          <Txt size={12} w="500" tone="ink3" num style={{ flex: 1 }}>{`${done}/${s.todos.length}`}</Txt>
          <AddLink label="追加" onPress={() => todoSheet()} />
        </View>
        <Card style={{ marginHorizontal: 16 }} pad={0}>
          {s.todos.map((td, i) => <TodoRow key={td.id} todo={td} first={i === 0} onToggle={() => onToggle(td.id)} onEdit={() => todoSheet(td)} />)}
          {s.todos.length ? null : (
            <Press onPress={() => todoSheet()} style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Txt size={13} tone="ink3">やることを1つ決めておくと、始めるのが早くなります</Txt>
            </Press>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

/**
 * Beside the card: the big start button (a game's battle button) and the
 * subject it starts; while studying, the live timer instead — never both.
 */
function StartPanel() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  if (s.running) {
    const e = elapsedOf(s);
    return (
      <Press onPress={() => router.push('/timer')} scale={0.97} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}。タイマーを開く`}
        style={{ flex: 1, borderRadius: 16, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, padding: 10, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <LiveDot size={6} color={s.paused ? t.amber : undefined} />
          <Txt size={11} w="600" tone="ink2">{s.paused ? '一時停止中' : '勉強中'}</Txt>
        </View>
        <View>
          <Txt size={12} w="700" numberOfLines={1}>{sj.name}</Txt>
          <Txt num size={19} w="700" lh={24}>{hms(e)}</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.9} accessibilityLabel={s.paused ? '再開' : '一時停止'} hitSlop={6}
            style={{ flex: 1, height: 30, borderRadius: 15, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={s.paused ? 'play' : 'pause'} size={13} color={t.ink} />
          </Press>
          <View style={{ flex: 1, height: 30, borderRadius: 15, backgroundColor: t.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Txt size={11.5} w="700" color={t.onInk}>開く</Txt>
          </View>
        </View>
      </Press>
    );
  }
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Press onPress={() => { haptic.firm(); startStudy(); router.push('/timer'); }} haptics={false} scale={0.96} accessibilityLabel={`${sj.name}の勉強を始める`}
        style={{ flex: 1, borderRadius: 16, backgroundColor: '#F2B705', alignItems: 'center', justifyContent: 'center', gap: 4,
          boxShadow: 'inset 0px -4px 0px rgba(0,0,0,0.14), 0px 6px 16px rgba(242,183,5,0.35)' }}>
        <Icon name="play" size={20} color="#2E2200" />
        <Txt size={16} w="800" color="#2E2200">スタート</Txt>
      </Press>
      <Press onPress={subjectSheet} scale={0.96} accessibilityLabel={`科目 ${sj.name}。変える`}
        style={{ height: 32, borderRadius: 12, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: sj.c }} />
        <Txt size={12.5} w="700">{sj.name}</Txt>
        <Icon name="chev" size={11} color={t.ink3} />
      </Press>
    </View>
  );
}

function subjectSheet() {
  openSheet((close) => <SubjectPick close={close} />);
}
function SubjectPick({ close }: { close: () => void }) {
  const t = useT();
  const cur = useStore((x) => x.subj);
  return (
    <View style={{ gap: 8 }}>
      <Txt size={18} w="800">何を勉強する？</Txt>
      {SUBJ.map((x) => {
        const on = x.id === cur;
        return (
          <Press key={x.id} onPress={() => { setSubject(x.id); close(); }} scale={0.98} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
              backgroundColor: on ? t.surface : t.sunken, borderWidth: on ? 2 : 0, borderColor: t.ink }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: x.c }} />
            <Txt size={15} w="700" style={{ flex: 1 }}>{x.name}</Txt>
            <Txt size={12} tone="ink3" numberOfLines={1} style={{ flexShrink: 1 }}>{x.task}</Txt>
          </Press>
        );
      })}
    </View>
  );
}

function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useT();
  return (
    <Press onPress={onPress} hitSlop={12} scale={0.94} accessibilityRole="button" accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'center' }}>
      <Icon name="plus" size={12} color={t.ink} />
      <Txt size={12.5} w="600">{label}</Txt>
    </Press>
  );
}

/**
 * The streak, after Caleb Wu's "day streak": a black capsule with the flame,
 * the count, and the week as dots. Tap it and the flame jumps.
 */
const DOW = ['月', '火', '水', '木', '金', '土', '日'];
function StreakPill() {
  const t = useT();
  const back = (new Date().getDay() + 6) % 7; // days since Monday
  const sessions = useStore((x) => x.sessions);
  const streak = useStreak();
  const tickets = useStore((x) => x.restTickets);
  const s = useSharedValue(1);
  const r = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }, { rotate: `${r.value}deg` }] }));
  const jump = () => {
    haptic.soft();
    s.set(withSequence(withTiming(1.3, { duration: 110 }), withSpring(1, { duration: 520, dampingRatio: 0.4 })));
    r.set(withSequence(withTiming(-14, { duration: 110 }), withSpring(0, { duration: 520, dampingRatio: 0.4 })));
  };
  const dim = 'rgba(255,255,255,0.55)';
  return (
    <Press onPress={jump} haptics={false} scale={0.98} accessibilityLabel={`${streak}日連続で勉強中。休み券${tickets}枚`}
      style={{ marginHorizontal: 16, marginTop: 12, height: 58, borderRadius: 29, backgroundColor: t.dark ? '#000' : '#0B0D12', flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 18,
        borderWidth: t.dark ? hair : 0, borderColor: t.line2 }}>
      <Animated.View style={a}><Sticker name="fire" size={42} /></Animated.View>
      <View style={{ marginLeft: 4 }}>
        <Rolling value={pad(streak)} size={17} weight="700" color="#fff" />
        <Txt size={11} color={dim} lh={14}>{`日連続 · 休み券 ${tickets}`}</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {DOW.map((w, i) => {
          const ago = back - i;
          const future = ago < 0;
          const studied = !future && studiedOn(sessions, ago);
          const today = ago === 0;
          return (
            <View key={w} style={{ alignItems: 'center', gap: 5 }}>
              <Txt size={10} w="600" lh={12} color={today ? '#fff' : dim}>{w}</Txt>
              <View style={{ width: 7, height: 7, borderRadius: 4,
                backgroundColor: today && studied ? '#FF7A1A' : studied ? '#fff' : 'transparent',
                borderWidth: studied ? 0 : 1, borderColor: dim, borderStyle: future ? 'dashed' : 'solid' }} />
            </View>
          );
        })}
      </View>
    </Press>
  );
}
