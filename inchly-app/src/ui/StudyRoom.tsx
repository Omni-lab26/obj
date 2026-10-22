import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hms, ROOM, SUBJ, subj } from '../data';
import { elapsedOf, setSubject, startStudy, togglePause, useNow, useStore } from '../store';
import { focus, hair } from '../theme';
import { Avatar, haptic, Press, Txt } from './base';
import { LiveDot } from './GroupParts';
import { Icon } from './Icon';

// Turn the phone on its side and the app becomes a study room, the way Apple
// Music turns into a cover wall: your timer large on the left, everyone else
// at their desks on the right. Always dark, nothing to manage — just the clock
// and the people. Turn it back upright to record.

/** Phone held sideways: wider than tall, and short (an iPad or a desktop window stays as is). */
export const isRoomShape = (w: number, h: number) => w > h && h < 500;

export function StudyRoom() {
  const insets = useSafeAreaInsets();
  const now = useNow();
  const [opened] = useState(() => Date.now());
  const since = Math.floor((now - opened) / 1000);
  const s = useStore((x) => x);
  const sj = subj(s.subj);
  const e = elapsedOf(s, now);
  const people = ROOM.filter((p) => !s.blocked.includes(p.n));
  const today = s.todayMin + (s.running ? Math.floor(e / 60) : 0);
  return (
    <Animated.View entering={FadeIn.duration(260)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: focus.bg, flexDirection: 'row',
      paddingLeft: Math.max(insets.left, 20), paddingRight: Math.max(insets.right, 16), paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 12) }}>
      {/* you */}
      <View style={{ flex: 1, justifyContent: 'center', paddingRight: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {s.running ? <LiveDot size={7} color={s.paused ? '#F5A524' : undefined} /> : null}
          <Txt size={13} w="600" color={focus.ink2}>{s.running ? `${s.paused ? '一時停止中' : '勉強中'} · ${sj.name}` : '勉強部屋'}</Txt>
        </View>
        <Txt num size={64} w="700" lh={72} color={focus.ink} style={{ marginTop: 4, letterSpacing: -1.5 }} accessibilityLabel={s.running ? `経過 ${hms(e)}` : 'まだ始めていません'}>
          {hms(s.running ? e : 0)}
        </Txt>
        <Txt size={12.5} color={focus.ink3}>{`今日 ${Math.floor(today / 60)}時間${today % 60}分 · 目標 ${s.goalMin / 60}時間`}</Txt>
        {/* today against the goal */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: focus.raise, marginTop: 10, overflow: 'hidden', maxWidth: 300 }}>
          <View style={{ width: `${Math.min(100, (today / s.goalMin) * 100)}%`, height: 4, borderRadius: 2, backgroundColor: focus.ink }} />
        </View>

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
            <View style={{ flexDirection: 'row', gap: 6 }} accessibilityRole="radiogroup">
              {SUBJ.map((x) => {
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
          {s.running ? <Desk name={s.account?.name ?? 'はる'} label="あなた" sub={sj.name} time={hms(e).replace(/^00:/, '')} you /> : null}
          {people.map((p) => <Desk key={p.h} name={p.n} label={p.n} sub={p.s} time={hms(p.t + since).replace(/^00:/, '')} />)}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

function Desk({ name, label, sub, time, you }: { name: string; label: string; sub: string; time: string; you?: boolean }) {
  return (
    <View style={{ width: '25%', alignItems: 'center', gap: 3 }} accessible accessibilityLabel={`${label} ${sub} ${time}`}>
      <View style={{ borderRadius: 26, borderWidth: 2, borderColor: you ? '#F2B705' : 'transparent', padding: 2 }}>
        <Avatar name={name} color="#6E56CF" size={40} />
      </View>
      <Txt size={11.5} w="700" color={focus.ink} numberOfLines={1}>{label}</Txt>
      <Txt num size={10.5} color={focus.ink3} numberOfLines={1}>{`${sub} · ${time}`}</Txt>
    </View>
  );
}
