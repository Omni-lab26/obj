import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Face } from '@/components/Face';
import { FeedCard } from '@/components/FeedCards';
import { Icon } from '@/components/Icon';
import { Mark } from '@/components/Mark';
import { Page } from '@/components/Page';
import { TopBar, useTopInset } from '@/components/TopBar';
import { useShrinkOnScroll } from '@/hooks/useTabBar';
import { getFeed, getNotices } from '@/lib/data';
import { kindOf } from '@/lib/format';
import { t } from '@/i18n';
import { colors, space } from '@theme';

type Chip = 'latest' | 'slot' | 'breaking' | 'note' | 'deep' | 'hot';
const CHIPS: Chip[] = ['latest', 'slot', 'breaking', 'note', 'deep', 'hot'];
const chipLabel = (c: Chip) => (c === 'latest' ? t('chips.latest') : c === 'hot' ? t('chips.hot') : t(`kind.${c}`));

export default function Home() {
  const top = useTopInset();
  const onScroll = useShrinkOnScroll();
  const [chip, setChip] = useState<Chip>('latest');
  const [brkClosed, setBrkClosed] = useState(false);
  const feed = getFeed();
  const breaking = feed.find((a) => a.brk);
  const unread = getNotices().some((n) => n.unread);

  const list = (() => {
    if (chip === 'latest') return feed.slice(0, 8);
    if (chip === 'hot') return [...feed].sort((a, b) => b.c - a.c).slice(0, 5);
    return feed.filter((a) => kindOf(a) === chip).slice(0, 8);
  })();

  return (
    <Page>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: top, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}>
        {breaking && !brkClosed ? (
          <View style={styles.brkWrap}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/article/[id]', params: { id: breaking.id, c: '1' } })}
              style={styles.brk}>
              <View style={styles.pulse} />
              <View style={{ flex: 1 }}>
                <Text style={styles.brkK}>
                  {t('home.breaking')} · {breaking.tm}
                </Text>
                <Text style={styles.brkT} numberOfLines={2}>
                  {breaking.title}
                </Text>
                <Text style={styles.brkS}>{t('home.talking', { n: breaking.c })}</Text>
              </View>
              <Icon name="next" size={16} color={colors.muted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.close')}
              hitSlop={10}
              onPress={() => setBrkClosed(true)}
              style={styles.brkX}>
              <Icon name="close" size={13} color={colors.muted} />
            </Pressable>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {CHIPS.map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: chip === c }}
              onPress={() => setChip(c)}
              style={[styles.chip, chip === c && styles.chipOn]}>
              <Text style={[styles.chipT, chip === c && styles.chipTOn]}>{chipLabel(c)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {list.length ? (
          list.map((a) => <FeedCard key={a.id} a={a} />)
        ) : (
          <Text style={styles.empty}>{t('home.empty')}</Text>
        )}
      </Animated.ScrollView>

      <TopBar>
        <View style={styles.me} accessibilityLabel="プロフィール">
          <Face who="あなた" size={30} />
        </View>
        <View style={styles.wm}>
          <Mark height={15} />
          <Text style={styles.wmT}>Orchard</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notice.title')}
          hitSlop={8}
          onPress={() => router.push('/notifications')}
          style={styles.bell}>
          <Icon name="bell" size={21} />
          {unread ? <View style={styles.dot} /> : null}
        </Pressable>
      </TopBar>
    </Page>
  );
}

const styles = StyleSheet.create({
  // 速報は上のバーのぼかしにかからないよう、少し下げる
  brkWrap: { marginHorizontal: space.page, marginTop: 14, marginBottom: 6 },
  brk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingLeft: 12,
    paddingRight: 34,
    borderRadius: 16,
    backgroundColor: 'rgba(255,59,48,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.45)',
  },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.alert },
  brkK: { color: colors.alertSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  brkT: { color: colors.text, fontSize: 13, lineHeight: 19 },
  brkS: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  brkX: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { gap: 8, paddingHorizontal: space.page, paddingTop: 8, paddingBottom: 4 },
  chip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, backgroundColor: colors.surface2 },
  chipOn: { backgroundColor: colors.white },
  chipT: { color: '#D7D8DC', fontSize: 11.5, fontWeight: '600' },
  chipTOn: { color: '#111' },
  empty: { color: colors.muted, padding: 20 },
  me: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wm: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wmT: { color: colors.text, fontSize: 18, fontWeight: '700' },
  bell: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 6, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.alert },
});
