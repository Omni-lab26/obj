import { useScrollToTop } from 'expo-router';
import { useRef } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Face } from '@/components/Face';
import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { StatusFade } from '@/components/StatusFade';
import { useShrinkOnScroll } from '@/hooks/useTabBar';
import { getPosts, roleOf } from '@/lib/data';
import { ago, kfmt } from '@/lib/format';
import { t } from '@/i18n';
import { colors, feedback, fonts, space } from '@theme';

// みんなの投稿。ページ左上の題名と説明は出さない（オーナー指定）。
export default function People() {
  const insets = useSafeAreaInsets();
  const onScroll = useShrinkOnScroll();
  const ref = useRef<React.ComponentRef<typeof Animated.ScrollView>>(null);
  useScrollToTop(ref);
  const posts = getPosts();
  return (
    <Page>
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}>
        {posts.length ? null : <Text style={styles.empty}>{t('people.empty')}</Text>}
        {posts.map((p) => (
          <View key={p.id} style={styles.post}>
            <View style={styles.by}>
              <Face who={p.who} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={styles.who}>{p.who}</Text>
                <Text style={styles.meta}>
                  {roleOf(p.who)} · {ago(p.min)}
                </Text>
              </View>
            </View>
            <Text style={styles.t}>{p.t}</Text>
            {p.link ? (
              <Pressable
                accessibilityRole="link"
                onPress={() => p.link && Linking.openURL(`https://${p.link.dom}/`)}
                style={({ pressed }) => [styles.link, pressed && { opacity: feedback.pressedOpacity }]}>
                <Icon name="link" size={14} color={colors.muted} />
                <Text style={styles.linkT} numberOfLines={1}>
                  {p.link.title} · {p.link.dom}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.acts}>
              <Text style={styles.tag}>{p.tag}</Text>
              <View style={styles.act}>
                <Icon name="up" size={14} color={colors.faint} />
                <Text style={styles.actT}>{kfmt(p.up)}</Text>
              </View>
            </View>
          </View>
        ))}
      </Animated.ScrollView>
      <StatusFade />
    </Page>
  );
}

const styles = StyleSheet.create({
  post: {
    paddingHorizontal: space.page,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
    gap: 8,
  },
  by: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  av: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avT: { color: colors.text, fontWeight: '700' },
  who: { color: colors.text, fontSize: 13.5, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11 },
  t: { color: colors.text, fontSize: 14, lineHeight: 22 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  linkT: { color: colors.text, fontSize: 12.5, flex: 1 },
  acts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { color: colors.tag, fontSize: 12 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actT: { color: colors.faint, fontFamily: fonts.mono, fontSize: 12.5 },
  empty: { color: colors.muted, fontSize: 13, padding: space.page },
});
