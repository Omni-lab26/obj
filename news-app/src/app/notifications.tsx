import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { getNotices } from '@/lib/data';
import { t } from '@/i18n';
import { colors, space } from '@theme';

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const list = getNotices();
  const days = [...new Set(list.map((n) => n.day))];
  return (
    <Page>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          style={styles.btn}>
          <Icon name="back" size={18} />
        </Pressable>
        <Text style={styles.title}>{t('notice.title')}</Text>
        <View style={styles.btn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {days.map((d) => (
          <View key={d}>
            <Text style={styles.day}>{d}</Text>
            {list
              .filter((n) => n.day === d)
              .map((n, i) => (
                <Pressable
                  key={i}
                  onPress={() => n.art && router.push({ pathname: '/article/[id]', params: { id: n.art, c: '1' } })}
                  style={[styles.row, n.unread && styles.unread]}>
                  {n.unread ? <View style={styles.dot} /> : <View style={{ width: 6 }} />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.t}>{n.text}</Text>
                    {n.q ? (
                      <Text style={styles.q} numberOfLines={2}>
                        {n.q}
                      </Text>
                    ) : null}
                    <Text style={styles.at}>{n.at}</Text>
                  </View>
                </Pressable>
              ))}
          </View>
        ))}
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.page,
    paddingBottom: 8,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  day: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: space.page,
    paddingTop: 14,
    paddingBottom: 6,
  },
  row: { flexDirection: 'row', gap: 10, paddingHorizontal: space.page, paddingVertical: 12 },
  unread: { backgroundColor: 'rgba(255,255,255,0.03)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent, marginTop: 7 },
  t: { color: colors.text, fontSize: 13.5, lineHeight: 20 },
  q: { color: colors.muted, fontSize: 12.5, lineHeight: 18, marginTop: 2 },
  at: { color: colors.muted, fontSize: 11, marginTop: 4 },
});
