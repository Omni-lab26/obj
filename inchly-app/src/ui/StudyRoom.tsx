import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hms, ROOM, subj } from '../data';
import { elapsedOf, setSubject, startStudy, togglePause, useNow, useStore, useSubjects } from '../store';
import { focus, hair } from '../theme';
import { Avatar, haptic, Press, Txt } from './base';
import { LiveDot } from './GroupParts';
import { Icon } from './Icon';
import { fadeIn } from './motion';

// Turn the phone on its side and the app becomes a study room, the way Apple
// Music turns into a cover wall: your timer large on the left, everyone else
// at their desks on the right. Always dark, nothing to manage — just the clock
// and the people. Turn it back upright to record.

/** Phone held sideways: wider than tall, and short (an iPad or a desktop window stays as is). */
export const isRoomShape = (w: number, h: number) => w > h && h < 500;

export function StudyRoom() {
  const insets = useSafeAreaInsets();
  const [opened] = useState(() => Date.now());
  // only what the room shows; the times that change every second are read by their own small parts (YourTime, DeskTime)
  const s = { subj: useStore((x) => x.subj), running: useStore((x) => x.running), paused: useStore((x) => x.paused), blocked: useStore((x) => x.blocked), you: useStore((x) => x.account?.name) };
  const sj = subj(s.subj);
  const subjects = useSubjects();
  const people = ROOM.filter((p) => !s.blocked.includes(p.n));
  return (
    <Animated.View entering={fadeIn()} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: focus.bg, flexDirection: 'row',
      paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 16), paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 12) }}>
      {/* you */}
      <View style={{ flex: 1, justifyContent: 'center', paddingRight: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {s.running ? <LiveDot size={7} color={s.paused ? '#F5A524' : undefined} /> : null}
          <Txt size={13} w="600" color={focus.ink2}>{s.running ? `${s.paused ? '一時停止中' : '勉強中'} · ${sj.name}` : '勉強部屋'}</Txt>
        </View>
        <YourTime />

        {s.running ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 }}>
            <Press onPress={() => { haptic.soft(); togglePause(); }} haptics={false} scale={0.92} accessibilityLabel={s.paused ? '再開' : '一時停止'}
              style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.paused ? 'play' : 'pause'} size={20} color={focus.bg} />
            </Press>
            <Txt size={12} color={focus.ink3} style={{ flexShrink: 1 }}>縦に戻すと記録できます</Txt>
          </View>
        ) : (
          <View style={{ marginTop: 18, gap: 10 }}>
            <Press onPress={() => { haptic.firm(); startStudy(); }} haptics={false} scale={0.96} accessibilityLabel={`${sj.name}の勉強を始める`}
              style={{ alignSelf: 'flex-start', height: 50, paddingHorizontal: 26, borderRadius: 25, backgroundColor: '#F2B705', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="play" size={17} color="#2E2200" />
              <Txt size={16} w="800" color="#2E2200">スタート</Txt>
            </Press>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }} accessibilityRole="radiogroup">
              {subjects.map((x) => {
                const on = x.id === s.subj;
                return (
                  <Press key={x.id} onPress={() => setSubject(x.id)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: on }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: on ? focus.ink : focus.raise }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c }} />
                    <Txt size={12} w="600" color={on ? focus.bg : focus.ink2}>{x.name}</Txt>
                  </Press>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* everyone else */}
      <View style={{ flex: 1.25, borderLeftWidth: hair, borderLeftColor: focus.line, paddingLeft: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
          <LiveDot size={6} />
          <Txt size={12} w="600" color={focus.ink2}>{`いま ${people.length + (s.running ? 1 : 0)}人が同じ部屋に`}</Txt>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
          {s.running ? <Desk name={s.you ?? 'はる'} label="あなた" sub={sj.name} you /> : null}
          {people.map((p) => <Desk key={p.h} name={p.n} label={p.n} sub={p.s} base={p.t} opened={opened} />)}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

/** Your time, today's total and the line toward the goal: the one part of the left side that changes every second. */
function YourTime() {
  const now = useNow();
  const st = useStore((x) => x);
  const e = elapsedOf(st, now);
  const today = st.todayMin + (st.running ? Math.floor(e / 60) : 0);
  return (
    <>
      <Txt num size={64} w="700" lh={72} color={focus.ink} style={{ marginTop: 4, letterSpacing: -1.5 }} accessibilityLabel={st.running ? `経過 ${hms(e)}` : 'まだ始めていません'}>
        {hms(st.running ? e : 0)}
      </Txt>
      <Txt size={12.5} color={focus.ink3}>{`今日 ${Math.floor(today / 60)}時間${today % 60}分 · 目標 ${st.goalMin / 60}時間`}</Txt>
      {/* today against the goal */}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: focus.raise, marginTop: 10, overflow: 'hidden', maxWidth: 300 }}>
        <View style={{ width: `${Math.min(100, (today / st.goalMin) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: focus.ink }} />
      </View>
    </>
  );
}

/** A desk's time, ticking on its own (yours from the session, the others' from when the room opened). */
function DeskTime({ sub, label, base, opened, you }: { sub: string; label: string; base?: number; opened?: number; you?: boolean }) {
  const now = useNow();
  const st = useStore((x) => (you ? x : null));
  const sec = you && st ? elapsedOf(st, now) : (base ?? 0) + Math.floor((now - (opened ?? now)) / 1000);
  const time = hms(sec).replace(/^00:/, '');
  return <Txt num size={10.5} color={focus.ink3} numberOfLines={1} accessibilityLabel={`${label} ${sub} ${time}`}>{`${sub} · ${time}`}</Txt>;
}

function Desk({ name, label, sub, base, opened, you }: { name: string; label: string; sub: string; base?: number; opened?: number; you?: boolean }) {
  return (
    <View style={{ width: '25%', alignItems: 'center', gap: 3 }}>
      <View style={{ borderRadius: 26, borderWidth: 2, borderColor: you ? '#F2B705' : 'transparent', padding: 2 }}>
        <Avatar name={name} color="#6E56CF" size={40} />
      </View>
      <Txt size={11.5} w="700" color={focus.ink} numberOfLines={1}>{label}</Txt>
      <DeskTime sub={sub} label={label} base={base} opened={opened} you={you} />
    </View>
  );
}
