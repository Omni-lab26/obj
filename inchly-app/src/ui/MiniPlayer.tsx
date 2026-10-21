import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, LinearTransition, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { elapsedOf, togglePause, useNow, useStore } from '../store';
import { hms, subj } from '../data';
import { ease, useT } from '../theme';
import { haptic, Press, Txt } from './base';
import { Icon } from './Icon';
import { recordSheet } from './RecordSheet';

// "Now studying" bar above the tab bar, like Apple Music's mini player.
// Tap the bar to expand controls; the four segments are this session's pomodoros.
const BLOCK = 1500;

export function MiniPlayer() {
  const t = useT();
  useNow();
  const s = useStore((x) => x);
  const [open, setOpen] = useState(false);
  const e = elapsedOf(s);
  const sj = subj(s.subj);
  useEffect(() => { if (!s.running) setOpen(false); }, [s.running]);
  if (!s.running) return null;
  const idx = Math.min(3, Math.floor(e / BLOCK));
  const w = e - idx * BLOCK;
  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(200)} layout={LinearTransition.duration(260)}
      style={{ marginHorizontal: 10, marginTop: 8, borderRadius: 14, backgroundColor: t.ink, overflow: 'hidden' }}>
      <Press onPress={() => setOpen((o) => !o)} scale={0.985} accessibilityLabel={`${sj.name}を勉強中 ${hms(e)}`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 52 }}>
        <Live paused={s.paused} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt size={13.5} w="600" color={t.onInk} numberOfLines={1}>{sj.name} · {sj.task}</Txt>
          <View style={{ flexDirection: 'row', gap: 3, marginTop: 5, width: 120 }}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: t.dark ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.18)', overflow: 'hidden' }}>
                <View style={{ height: 3, width: `${i < idx ? 100 : i === idx ? (w / BLOCK) * 100 : 0}%`, backgroundColor: '#2EC471' }} />
              </View>
            ))}
          </View>
        </View>
        <Txt num size={17} w="600" color={t.onInk}>{hms(e)}</Txt>
        <Press onPress={() => { haptic.soft(); togglePause(); }} scale={0.85} accessibilityLabel={s.paused ? '再開' : '一時停止'} haptics={false}
          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: t.dark ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.1)' }}>
          <Icon name={s.paused ? 'play' : 'pause'} size={16} color={t.onInk} />
        </Press>
      </Press>
      {open ? (
        <Animated.View entering={FadeInDown.duration(200)} style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(127,127,127,.25)', paddingTop: 10 }}>
          <Press onPress={() => { setOpen(false); router.push('/timer'); }} style={pill(t.dark)}>
            <Txt size={13} w="600" color={t.onInk}>タイマーを開く</Txt>
          </Press>
          <View style={{ flex: 1 }} />
          <Press onPress={() => { setOpen(false); recordSheet(); }} style={[pill(t.dark), { backgroundColor: '#2EC471' }]}>
            <Txt size={13} w="700" color="#08130C">記録する</Txt>
          </Press>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}
const pill = (dark: boolean) => ({ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: 'center' as const, backgroundColor: dark ? 'rgba(0,0,0,.08)' : 'rgba(255,255,255,.12)' });

function Live({ paused }: { paused: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    o.value = paused ? withTiming(0.35) : withRepeat(withTiming(0.35, { duration: 900, easing: ease.out }), -1, true);
  }, [paused, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#2EC471' }, a]} />;
}
