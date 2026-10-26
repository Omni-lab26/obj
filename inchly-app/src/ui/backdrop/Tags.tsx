import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PEOPLE } from '../../data';
import { MAX_WALKERS } from '../../lib/walkers';
import { Txt } from '../base';
import { walkerTags } from './shared';

// On the glass floor, in 眺める: each walker carries a small tag — who they
// are and what they're studying. The words change only when someone comes or
// goes; the tags follow the walkers on the UI thread.

export function WalkerTags() {
  const [who, setWho] = useState<number[]>([]);
  useAnimatedReaction(() => {
    const ids: number[] = [];
    for (let i = 0; i < MAX_WALKERS; i++) ids.push(walkerTags.value[i * 4 + 3] ?? 0);
    return ids.join(',');
  }, (now, before) => { if (now !== before) scheduleOnRN(setWho, now.split(',').map(Number)); });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {who.map((id, i) => (id ? <Tag key={`${i}-${id}`} slot={i} id={id - 1} /> : null))}
    </View>
  );
}

/** A walker's tag: a small bracketed label beside them. */
function Tag({ slot, id }: { slot: number; id: number }) {
  const p = PEOPLE[id % PEOPLE.length];
  const shown = useSharedValue(0);
  useEffect(() => { shown.set(withTiming(1, { duration: 600 })); }, [shown]);
  const a = useAnimatedStyle(() => {
    const t = walkerTags.value;
    const x = t[slot * 4] ?? 0, y = t[slot * 4 + 1] ?? 0, o = t[slot * 4 + 2] ?? 0;
    return { opacity: o * shown.value, transform: [{ translateX: x + 34 }, { translateY: y - 46 }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 6 }, a]}>
      <View style={{ width: 8, height: 8, borderLeftWidth: 1, borderTopWidth: 1, borderColor: 'rgba(20,20,20,0.5)' }} />
      <Txt num size={10.5} w="700" color="rgba(20,20,20,0.75)" style={{ letterSpacing: 1.2 }}>{p.n}</Txt>
      <Txt size={10} color="rgba(20,20,20,0.45)">{`${p.s}を勉強中`}</Txt>
    </Animated.View>
  );
}
