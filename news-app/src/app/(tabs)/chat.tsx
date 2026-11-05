import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/components/Face';
import { Page } from '@/components/Page';
import { toast } from '@/components/Toast';
import { useShrinkOnScroll } from '@/hooks/useTabBar';
import { getRooms } from '@/lib/data';
import { t } from '@/i18n';
import { colors, fonts, space } from '@theme';

// チャット。ページ左上の題名は出さない（オーナー指定）。上で「すべて・個人・グループ」を切りかえる。
export default function Chat() {
  const insets = useSafeAreaInsets();
  const onScroll = useShrinkOnScroll();
  const [f, setF] = useState<'all' | 'dm' | 'group'>('all');
  const rooms = getRooms().filter((r) => f === 'all' || r.kind === f);
  return (
    <Page>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}>
        <View style={styles.seg}>
          {(['all', 'dm', 'group'] as const).map((k) => (
            <Pressable key={k} onPress={() => setF(k)} style={[styles.chip, f === k && styles.chipOn]}>
              <Text style={[styles.chipT, f === k && { color: '#111' }]}>{t(`chat.${k}`)}</Text>
            </Pressable>
          ))}
        </View>
        {rooms.map((r) => (
          <Pressable key={r.id} onPress={() => toast(t('chat.soon'))} style={styles.row}>
            <Face who={r.name} size={48} img={r.icon ? `sq${r.icon}` : undefined} square={r.kind === 'group'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {r.name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {r.sub}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Text style={styles.at}>{r.at < 60 ? `${r.at}分前` : `${Math.floor(r.at / 60)}時間前`}</Text>
              {r.n ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeT}>{r.n}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </Animated.ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: 'row', gap: 6, paddingHorizontal: space.page, paddingBottom: 8 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface2 },
  chipOn: { backgroundColor: colors.white },
  chipT: { color: '#D7D8DC', fontSize: 11.5, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.page, paddingVertical: 12 },
  ic: { width: 48, height: 48, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' },
  icT: { color: colors.text, fontWeight: '700', fontSize: 16 },
  name: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  at: { color: colors.muted, fontSize: 11, fontFamily: fonts.mono },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeT: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
