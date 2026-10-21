import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hm, pad, subj, SUBJ } from '@/data';
import { elapsedOf, getState, setSubject, setTarget, startStudy, togglePause, useNow, useStore } from '@/store';
import { focus, hair } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { recordSheet } from '@/ui/RecordSheet';
import { Rolling } from '@/ui/Rolling';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { TimeScrubber } from '@/ui/TimeScrubber';
import { toast } from '@/ui/Toast';

// Focus timer: always dark. The readout counts down the planned session;
// the ruler (bencho "time scrubber") shows the remaining minutes and drifts as
// time passes — drag or fling it to plan or adjust the session.
const fmt = (sec: number) => {
  const v = Math.max(0, Math.round(sec));
  const h = Math.floor(v / 3600), m = Math.floor(v / 60) % 60, x = v % 60;
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${pad(m)}:${pad(x)}`;
};
const rulerLabel = (m: number) => (m < 60 ? `${m}分` : m % 60 ? `${Math.floor(m / 60)}:${pad(m % 60)}` : `${m / 60}時間`);

export default function Timer() {
  const insets = useSafeAreaInsets();
  useNow();
  const s = useStore((x) => x);
  const e = elapsedOf(s);
  const sj = subj(s.subj);
  const playing = s.running && !s.paused;
  const rem = s.targetMin * 60 - e;
  const over = s.running && rem < 0;

  // One nudge when the planned time is reached.
  const nudged = useRef(false);
  useEffect(() => {
    if (!s.running) nudged.current = false;
    else if (over && !nudged.current) {
      nudged.current = true;
      haptic.success();
      toast(`目標の${Math.round(s.targetMin)}分に届きました`, 'このまま続けても、記録してもOK');
    }
  }, [over, s.running, s.targetMin]);

  const pickSubject = (id: string) => {
    if (id === s.subj) return;
    const cur = getState();
    if (cur.running && elapsedOf(cur) > 60) {
      haptic.warn();
      toast('勉強中の科目は変えられません', '記録してから切り替えましょう');
      return;
    }
    if (cur.running) startStudy(id);
    else setSubject(id);
  };
  const main = () => {
    haptic.firm();
    if (!s.running) startStudy(s.subj);
    else togglePause();
  };
  // Ruler: planned length while idle, remaining minutes while running.
  const rulerValue = s.running ? Math.max(0, rem) / 60 : s.targetMin;
  const onRuler = (m: number) => {
    const cur = getState();
    if (cur.running) setTarget(elapsedOf(cur) / 60 + m);
    else setTarget(Math.max(5, m));
  };
  const side = over ? '超過' : s.running ? '残り' : 'に集中';

  return (
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 16 }}>
      <StatusBar style="light" />
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
        <Press onPress={() => router.back()} scale={0.86} accessibilityLabel="閉じる" hitSlop={6}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ transform: [{ rotate: '-90deg' }] }}>
            <Icon name="back" size={22} color={focus.ink2} />
          </View>
        </Press>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 4 }} accessibilityRole="radiogroup">
        {SUBJ.map((x) => {
          const on = x.id === s.subj;
          return (
            <Pressable key={x.id} onPress={() => pickSubject(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} hitSlop={{ top: 8, bottom: 8 }}
              style={({ pressed }) => ({ height: 30, paddingHorizontal: 10, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 5,
                backgroundColor: on ? 'rgba(255,255,255,0.08)' : 'transparent', borderWidth: hair, borderColor: on ? 'rgba(255,255,255,0.16)' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: x.c, opacity: on ? 1 : 0.6 }} />
              <Txt size={12} w="600" color={on ? '#fff' : 'rgba(255,255,255,0.55)'}>{x.name}</Txt>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />

      {/* readout: the time, with a small word on the right like bencho's "AM" */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, opacity: s.paused ? 0.5 : 1 }}
        accessible accessibilityLabel={`${side} ${fmt(over ? -rem : s.running ? rem : s.targetMin * 60)}`}>
        {over ? <Txt num size={40} w="500" color={focus.green} style={{ marginBottom: 6 }}>+</Txt> : null}
        <Rolling value={fmt(over ? -rem : s.running ? rem : s.targetMin * 60)} size={60} weight="600" color={over ? focus.green : focus.ink} />
        <Txt size={13} w="600" color={over ? focus.green : focus.ink2} style={{ marginBottom: 11 }}>{side}</Txt>
      </View>
      <Txt size={11.5} color={focus.ink3} style={{ textAlign: 'center', marginTop: 2 }}>
        {s.paused ? '一時停止中' : s.running ? `${sj.name} · ${sj.task}` : 'ルーラーを動かして、集中する時間を決めます'}
      </Txt>

      <View style={{ marginTop: 26, marginHorizontal: 20 }}>
        <TimeScrubber value={rulerValue} onChange={onRuler} min={s.running ? 0 : 5} max={180} step={5} tick={1} mid={5} major={15}
          label={rulerLabel} dark a11y={s.running ? '残り時間' : '集中する時間'} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 22, marginTop: 14 }}>
        <Txt size={11.5} color={focus.ink2}>今日 <Txt num size={12} w="600" color="#fff">{hm(s.todayMin)}</Txt></Txt>
        <Txt size={11.5} color={focus.ink2}>目標 <Txt num size={12} w="600" color="#fff">{hm(s.goalMin).replace('00分', '')}</Txt></Txt>
      </View>

      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <Press onPress={main} haptics={false} scale={0.92} accessibilityLabel={playing ? '一時停止' : s.running ? '再開' : '開始'}
          style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center', boxShadow: '0px 0px 0px 6px rgba(255,255,255,0.06)' }}>
          <Icon name={playing ? 'pause' : 'play'} size={24} color={focus.bg} />
        </Press>
      </View>

      <View style={{ flex: 1, minHeight: 24 }} />
      <View style={{ marginHorizontal: 24 }}>
        <SlideToRecord disabled={!s.running} onDone={() => recordSheet({ leaveTimer: true })} />
      </View>
    </Screen>
  );
}
