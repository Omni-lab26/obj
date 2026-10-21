import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { hm, hms, pad, subj, SUBJ } from '@/data';
import { adjustElapsed, elapsedOf, getState, setSubject, startStudy, togglePause, useNow, useStore } from '@/store';
import { focus } from '@/theme';
import { haptic, Press, Txt } from '@/ui/base';
import { Screen } from '@/ui/Chrome';
import { Icon } from '@/ui/Icon';
import { recordSheet } from '@/ui/RecordSheet';
import { SlideToRecord } from '@/ui/SlideToRecord';
import { toast } from '@/ui/Toast';

// Focus timer: always dark. The dial's green arc is progress through the
// current 25-minute pomodoro; four blocks make a session.
const BLOCK = 1500;
const SIZE = 286;
const C = SIZE / 2;
const R = 118;
const L = 2 * Math.PI * R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2 - Math.PI / 2;
  const major = i % 5 === 0;
  const r1 = 140, r2 = major ? 131 : 135;
  return { major, x1: C + Math.cos(a) * r1, y1: C + Math.sin(a) * r1, x2: C + Math.cos(a) * r2, y2: C + Math.sin(a) * r2 };
});

function Dial({ e, running, paused }: { e: number; running: boolean; paused: boolean }) {
  const idx = Math.min(3, Math.floor(e / BLOCK));
  const w = e - idx * BLOCK;
  const off = useSharedValue(L * (1 - w / BLOCK));
  useEffect(() => {
    const target = L * (1 - w / BLOCK);
    // Ease over the second between ticks; jump when a new block starts or time is adjusted.
    if (Math.abs(target - off.value) > L * 0.02) off.value = withTiming(target, { duration: 420, easing: Easing.out(Easing.cubic) });
    else off.value = withTiming(target, { duration: 1000, easing: Easing.linear });
  }, [w, off]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: off.value }));
  const blink = useSharedValue(1);
  useEffect(() => {
    blink.value = paused ? withRepeat(withSequence(withTiming(0.25, { duration: 0 }), withTiming(0.25, { duration: 700 }), withTiming(1, { duration: 0 }), withTiming(1, { duration: 700 })), -1) : withTiming(1, { duration: 150 });
  }, [paused, blink]);
  const ba = useAnimatedStyle(() => ({ opacity: blink.value }));
  const left = BLOCK - w;
  return (
    <View style={{ width: SIZE, height: SIZE, alignSelf: 'center', marginTop: 22 }}>
      <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {TICKS.map((k, i) => (
          <Line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke={k.major ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)'} strokeWidth={k.major ? 2 : 1.5} />
        ))}
        <Circle cx={C} cy={C} r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
        <AnimatedCircle cx={C} cy={C} r={R} fill="none" stroke={focus.green} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${L} ${L}`} animatedProps={arc} transform={`rotate(-90 ${C} ${C})`} opacity={running ? 1 : 0} />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Animated.View style={ba}>
          <Txt num size={46} w="500" color={focus.ink} lh={52} accessibilityLabel={`経過 ${hms(e)}`}>{hms(e)}</Txt>
        </Animated.View>
        <Txt size={13} color={focus.ink2}>
          {running ? `ポモドーロ ${idx + 1}/4 · 休憩まで ${pad(Math.floor(left / 60))}:${pad(left % 60)}` : 'まだ始めていません'}
        </Txt>
      </View>
    </View>
  );
}

function Side({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Press onPress={onPress} scale={0.9} accessibilityLabel={a11y}
      style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: focus.raise, alignItems: 'center', justifyContent: 'center' }}>
      <Txt num size={14} w="600" color={focus.ink}>{label}</Txt>
    </Press>
  );
}

export default function Timer() {
  const insets = useSafeAreaInsets();
  useNow();
  const s = useStore((x) => x);
  const e = elapsedOf(s);
  const sj = subj(s.subj);
  const playing = s.running && !s.paused;

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
            <Pressable key={x.id} onPress={() => pickSubject(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={({ pressed }) => ({ height: 32, paddingHorizontal: 12, borderRadius: 9, justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.1)' : 'transparent', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <Txt size={13} w={on ? '700' : '400'} color={on ? '#fff' : 'rgba(255,255,255,0.6)'}>{x.name}</Txt>
            </Pressable>
          );
        })}
      </View>

      <Dial e={e} running={s.running} paused={s.paused} />

      <View style={{ alignItems: 'center', marginTop: 6, gap: 4 }}>
        <Txt size={12.5} color={focus.ink2}>{sj.task}</Txt>
        <View style={{ flexDirection: 'row', gap: 22 }}>
          <Txt size={12.5} color={focus.ink2}>今日 <Txt num size={13} w="600" color="#fff">{hm(s.todayMin)}</Txt></Txt>
          <Txt size={12.5} color={focus.ink2}>目標 <Txt num size={13} w="600" color="#fff">{hm(s.goalMin).replace('00分', '')}</Txt></Txt>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, marginTop: 22 }}>
        <Side label="−5" a11y="5分戻す" onPress={() => { adjustElapsed(-300); haptic.soft(); }} />
        <Press onPress={main} haptics={false} scale={0.92} accessibilityLabel={playing ? '一時停止' : '開始'}
          style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: focus.ink, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={playing ? 'pause' : 'play'} size={30} color={focus.bg} />
        </Press>
        <Side label="+5" a11y="5分進める" onPress={() => { adjustElapsed(300); haptic.soft(); }} />
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ marginHorizontal: 24, marginTop: 30 }}>
        <SlideToRecord disabled={!s.running} onDone={() => recordSheet({ leaveTimer: true })} />
      </View>
    </Screen>
  );
}
