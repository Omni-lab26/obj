import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hm, pad, subj, SUBJ } from '@/data';
import { elapsedOf, getState, setSubject, setTarget, startStudy, togglePause, useNow, useStore } from '@/store';
import { focus } from '@/theme';
import { haptic, IconBtn, Press, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { recordSheet } from '@/ui/RecordSheet';
import { Rolling } from '@/ui/Rolling';
import { Segmented } from '@/ui/Tabs';
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
    <Screen bg={focus.bg} style={{ paddingBottom: insets.bottom + 20 }}>
      <StatusBar style="dark" />
      <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 }}>
        <IconBtn filled name="back" label="閉じる" onPress={() => router.back()} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        <Segmented value={s.subj} onChange={pickSubject} options={SUBJ.map((x) => ({ v: x.id, label: x.name }))} />
      </View>

      <View style={{ flex: 1, minHeight: 20 }} />

      {/* the readout: thin digits, like the Clock app */}
      <View style={{ alignItems: 'center', opacity: s.paused ? 0.45 : 1 }} accessible accessibilityLabel={`${side} ${fmt(over ? -rem : s.running ? rem : s.targetMin * 60)}`}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {over ? <Txt num size={52} w="200" color={focus.green} style={{ marginBottom: 8 }}>+</Txt> : null}
          <Rolling value={fmt(over ? -rem : s.running ? rem : s.targetMin * 60)} size={over ? 72 : 84} weight="200" color={over ? focus.green : focus.ink} />
        </View>
        <Txt size={17} color={over ? focus.green : focus.ink2}>{s.paused ? '一時停止中' : over ? '目標を超えて集中中' : s.running ? `残り ・ ${sj.name}` : '集中する時間'}</Txt>
      </View>

      <View style={{ marginTop: 30, marginHorizontal: 16 }}>
        <TimeScrubber value={rulerValue} onChange={onRuler} min={s.running ? 0 : 5} max={180} step={5} tick={1} mid={5} major={15}
          label={rulerLabel} a11y={s.running ? '残り時間' : '集中する時間'} />
      </View>
      <Txt size={15} color={focus.ink2} style={{ textAlign: 'center', marginTop: 12 }}>{`今日 ${hm(s.todayMin)}　目標 ${hm(s.goalMin).replace('00分', '')}`}</Txt>

      <View style={{ flex: 1, minHeight: 20 }} />

      {/* two round buttons, as in the Clock app: record on the left, start / pause on the right */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 28 }}>
        <ClockBtn label="記録" color={focus.ink} bg="rgba(118,118,128,0.16)" disabled={!s.running} onPress={() => recordSheet({ leaveTimer: true })} a11y="記録する" />
        <ClockBtn label={playing ? '一時停止' : s.running ? '再開' : '開始'} color={playing ? '#C46F00' : focus.green} bg={playing ? 'rgba(255,149,0,0.16)' : 'rgba(42,160,90,0.16)'} onPress={main} a11y={playing ? '一時停止' : s.running ? '再開' : '開始'} />
      </View>
    </Screen>
  );
}

/** The Clock app's round button: a pale fill, a thin ring inside, the word in colour. */
function ClockBtn({ label, color, bg, onPress, disabled, a11y }: { label: string; color: string; bg: string; onPress: () => void; disabled?: boolean; a11y: string }) {
  return (
    <Press onPress={() => { haptic.firm(); onPress(); }} haptics={false} disabled={disabled} scale={0.92} accessibilityLabel={a11y} accessibilityRole="button"
      style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 3, left: 3, right: 3, bottom: 3, borderRadius: 41, borderWidth: 2, borderColor: focus.bg }} />
      <Txt size={15} w="500" color={color}>{label}</Txt>
    </Press>
  );
}
