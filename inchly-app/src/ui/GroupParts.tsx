import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { PERSON_COLOR } from '@/data';
import { ease, useT } from '@/theme';

// Pieces shared by the community, group and plan-event screens.

/** Which tab a group screen should show the next time it gains focus (set by plan-event). */
let pendingTab: string | null = null;
export const setPendingGroupTab = (t: string) => { pendingTab = t; };
export const takePendingGroupTab = () => { const t = pendingTab; pendingTab = null; return t; };

export const colorOf = (n: string) => PERSON_COLOR[n] ?? '#8C8F95';

/** Four-dot colour mark used as a group's icon. */
export function GroupMark({ colors, size = 40 }: { colors: string[]; size?: number }) {
  const t = useT();
  const d = size * 0.3;
  const cs = colors.slice(0, 4);
  // Two explicit rows: a wrapped flex row can drop to one column when it rounds.
  return (
    <View style={{ width: size, height: size, flexShrink: 0, borderRadius: size * 0.28, backgroundColor: t.surface, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: t.line,
      alignItems: 'center', justifyContent: 'center', gap: size * 0.07 }}>
      {[cs.slice(0, 2), cs.slice(2, 4)].map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap: size * 0.07 }}>
          {row.map((c, i) => <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c }} />)}
        </View>
      ))}
    </View>
  );
}

/** Small pulsing green dot for "live" counts. */
export function LiveDot({ size = 7 }: { size?: number }) {
  const t = useT();
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withTiming(0.35, { duration: 900, easing: ease.out }), -1, true); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.green }, a]} />;
}

/** Thin progress bar (green fill on a sunken track). */
export function Bar({ pct, h = 5 }: { pct: number; h?: number }) {
  const t = useT();
  const w = useSharedValue(0);
  useEffect(() => { w.value = withTiming(Math.max(0, Math.min(100, pct)), { duration: 700, easing: ease.out }); }, [pct, w]);
  const a = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height: h, borderRadius: h / 2, backgroundColor: t.sunken, overflow: 'hidden' }}>
      <Animated.View style={[{ height: h, borderRadius: h / 2, backgroundColor: t.green }, a]} />
    </View>
  );
}

/** Avatar pile + count, e.g. on events and the "together" card. */
export function PeoplePill({ names, ring }: { names: string[]; ring: string }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingLeft: 3, paddingRight: 10, borderRadius: 15, backgroundColor: t.sunken }}>
      <View style={{ flexDirection: 'row' }}>
        {names.slice(0, 4).map((n, i) => (
          <View key={n + i} style={{ marginLeft: i ? -7 : 0, width: 24, height: 24, borderRadius: 12, backgroundColor: colorOf(n), borderWidth: 2, borderColor: ring, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{n[0]}</Text>
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: t.ink2 }}>{names.length}人</Text>
    </View>
  );
}
