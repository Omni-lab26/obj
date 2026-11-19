import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { toast } from '@/components/Toast';
import { getNotices, markNoticesRead } from '@/lib/data';
import type { Notice } from '@/lib/data/types';
import { t } from '@/i18n';
import { colors, feedback, space } from '@theme';

export default function Notifications() {
  const insets = useSafeAreaInsets();
  // 開いたときの未読の印は、この画面にいる間は残す。閉じたら既読にする（ベルの点も消える）
  const [list] = useState(getNotices);
  useEffect(() => () => markNoticesRead(), []);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = (n: Notice) => {
    if (n.art) router.dismissTo({ pathname: '/article/[id]', params: { id: n.art, c: '1' } });
    else if (n.type === 'approve') router.dismissTo('/people');
    else toast(t('common.soon'));
  };
  const days = [...new Set(list.map((n) => n.day))];
  return (
    <Page>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} style={styles.btn}>
          <Icon name="back" size={18} />
        </Pressable>
        <Text style={styles.title}>{t('notice.title')}</Text>
        {/* 題名を真ん中に置くための空き（設定の画面ができたら歯車を置く） */}
        <View style={styles.spacer} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {list.length ? null : <Text style={styles.empty}>{t('notice.empty')}</Text>}
        {days.map((d) => (
          <View key={d}>
            <Text style={styles.day}>{d}</Text>
            {list
              .filter((n) => n.day === d)
              .map((n, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${n.unread ? `${t('notice.unread')}、` : ''}${n.text}${n.q ? `、${n.q}` : ''}、${n.at}`}
                  onPress={() => go(n)}
                  style={({ pressed }) => [
                    styles.row,
                    n.unread && styles.unread,
                    pressed && { opacity: feedback.pressedOpacity },
                  ]}>
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
  spacer: { width: 40, height: 40 },
  empty: { color: colors.muted, fontSize: 13, padding: space.page },
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
