import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { PERSON_COLOR } from '@/data';
import { AVATAR, PHOTO } from '@/photos';
import { Avatar } from '@/ui/base';
import { hair, useT } from '@/theme';
import { timed } from '@/ui/motion';

// Pieces shared by the community, group and plan-event screens.

/** Which tab a group screen should show the next time it gains focus (set by plan-event). */
let pendingTab: string | null = null;
export const setPendingGroupTab = (t: string) => { pendingTab = t; };
export const takePendingGroupTab = () => { const t = pendingTab; pendingTab = null; return t; };

export const colorOf = (n: string) => PERSON_COLOR[n] ?? '#8C8F95';

/** Four-dot colour mark used as a group's icon. */
export function GroupMark({ colors, size = 40, members, icon }: { colors: string[]; size?: number; members?: string[]; icon?: keyof typeof PHOTO }) {
  const t = useT();
  const r = size * 0.28;
  // a cover photo, or the first four members' icons, like a real group chat
  if (icon) return <Image source={PHOTO[icon]} style={{ width: size, height: size, borderRadius: r, flexShrink: 0, backgroundColor: t.sunken }} resizeMode="cover" />;
  if (members?.length) {
    const half = size / 2;
    return (
      <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap', flexShrink: 0, backgroundColor: t.sunken }}>
        {members.slice(0, 4).map((n) => (
          <View key={n} style={{ width: half, height: half }}>
            {AVATAR[n] ? <Image source={AVATAR[n]} style={{ width: half, height: half }} resizeMode="cover" /> : null}
          </View>
        ))}
      </View>
    );
  }
  const d = size * 0.3;
  const cs = colors.slice(0, 4);
  // Two explicit rows: a wrapped flex row can drop to one column when it rounds.
  return (
    <View style={{ width: size, height: size, flexShrink: 0, borderRadius: r, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line,
      alignItems: 'center', justifyContent: 'center', gap: size * 0.07 }}>
      {[cs.slice(0, 2), cs.slice(2, 4)].map((row, k) => (
        <View key={k} style={{ flexDirection: 'row', gap: size * 0.07 }}>
          {row.map((c, i) => <View key={i} style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c }} />)}
        </View>
      ))}
    </View>
  );
}

/** Small green dot for "live" counts (still: nothing on the page pulses). */
export function LiveDot({ size = 7, color }: { size?: number; color?: string }) {
  const t = useT();
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? t.green }} />;
}

/** Thin progress bar (green fill on a sunken track). */
export function Bar({ pct, h = 5 }: { pct: number; h?: number }) {
  const t = useT();
  const w = useSharedValue(0);
  useEffect(() => { w.value = timed(Math.max(0, Math.min(100, pct)), 500); }, [pct, w]);
  // grown by scaling from the left, not by its width (no layout each frame)
  const a = useAnimatedStyle(() => ({ transform: [{ scaleX: w.value / 100 }] }));
  return (
    <View style={{ height: h, borderRadius: h / 2, backgroundColor: t.sunken, overflow: 'hidden' }}>
      <Animated.View style={[{ width: '100%', height: h, borderRadius: h / 2, backgroundColor: t.green, transformOrigin: 'left' }, a]} />
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
          <View key={n + i} style={{ marginLeft: i ? -7 : 0, zIndex: 4 - i }}>
            <Avatar name={n === 'あなた' ? 'はる' : n} color={colorOf(n)} size={24} ring={ring} />
          </View>
        ))}
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: '600', color: t.ink2 }}>{names.length}人</Text>
    </View>
  );
}
