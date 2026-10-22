import { router } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { levelOf, useStore } from '../store';
import { hair, useT } from '../theme';
import { Avatar, Press, Txt } from './base';
import { useUnread } from './Chrome';
import { Icon } from './Icon';

// The lobby's top bar, on every page like a game's resource bar: who you are
// and your level (from total hours), your coins, notices, and settings.
// (The streak lives on home, under your card.)

export function Coin({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Circle cx={12} cy={12} r={10.5} fill="#F2B705" stroke="#fff" strokeWidth={1.5} />
      <Circle cx={12} cy={12} r={6.5} fill="none" stroke="#FFE07A" strokeWidth={1.4} />
      <Path d="M10.4 8.6v6.8M13.6 8.6v6.8M8.8 10.6h6.4M8.8 13.4h6.4" stroke="#8A6300" strokeWidth={1.3} strokeLinecap="round" />
    </Svg>
  );
}

export function Hud({ onCoins }: { onCoins?: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const a = useStore((s) => s.account);
  const sessions = useStore((s) => s.sessions);
  const coins = useStore((s) => s.coins);
  const unread = useUnread();
  const hours = useMemo(() => sessions.reduce((x, r) => x + r.min, 0) / 60, [sessions]);
  const lv = levelOf(hours);
  const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, height: 34, paddingLeft: 6, paddingRight: 11, borderRadius: 17, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 };
  return (
    <View style={{ paddingTop: insets.top + 6, paddingBottom: 6, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.canvas }}>
      <Press onPress={() => router.push('/me')} scale={0.96} accessibilityLabel={`${a?.name ?? ''} レベル${lv.lv}。マイページを開く`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, flexShrink: 1 }}>
        <Avatar name={a?.name ?? 'はる'} color="#6E56CF" size={38} />
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt size={14} w="700" lh={17} numberOfLines={1}>{a?.name ?? ''}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt num size={11} w="700" tone="ink2" lh={13}>{`Lv.${lv.lv}`}</Txt>
            <View style={{ width: 64, height: 5, borderRadius: 3, backgroundColor: t.sunken, overflow: 'hidden' }}>
              <View style={{ width: `${lv.p * 100}%`, height: 5, borderRadius: 3, backgroundColor: t.ink }} />
            </View>
          </View>
        </View>
      </Press>
      <View style={{ flex: 1 }} />
      <Press onPress={onCoins} scale={0.94} style={pill} accessibilityLabel={`コイン ${coins}枚。ストアを開く`}>
        <Coin />
        <Txt num size={13} w="700">{coins.toLocaleString('ja-JP')}</Txt>
      </Press>
      <Press onPress={() => router.push('/notifications')} scale={0.9} hitSlop={4} accessibilityLabel={unread ? `お知らせ 未読${unread}件` : 'お知らせ'}
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="bell" size={17} color={t.ink} />
        {unread ? <View style={{ position: 'absolute', top: 7, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: t.red, borderWidth: 1.5, borderColor: t.surface }} /> : null}
      </Press>
      {/* everything about the app, one place: the gear at the top right */}
      <Press onPress={() => router.push('/settings')} scale={0.9} hitSlop={4} accessibilityLabel="設定"
        style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="gear" size={17} color={t.ink} />
      </Press>
    </View>
  );
}
