import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlockView, FigureCtx } from '@/components/blocks/Blocks';
import { CommentSheet, type BarGeo } from '@/components/CommentSheet';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { Poster } from '@/components/Poster';
import { toast } from '@/components/Toast';
import { useScreen } from '@/hooks/useScreen';
import { useShrinkOnScroll, useTabBar } from '@/hooks/useTabBar';
import { getArticle, getComments, getRelated, isSaved, toggleSave, useDataVersion } from '@/lib/data';
import { countComments, kindOf, readingMinutes } from '@/lib/format';
import { t } from '@/i18n';
import { colors, layout, motion, space, type } from '@theme';

export default function ArticleScreen() {
  useDataVersion();
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const a = getArticle(id);
  const insets = useSafeAreaInsets();
  const { width, height, side } = useScreen();
  const { mini, hidden } = useTabBar();
  const onScroll = useShrinkOnScroll();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const open = useSharedValue(0);
  const [sheet, setSheet] = useState(false);
  const [quote, setQuote] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const miniP = useDerivedValue(() => withTiming(mini.get(), { duration: motion.tabShrink }));

  const openSheet = useCallback(() => {
    setSheet(true);
    hidden.set(1);
    open.set(withTiming(1, { duration: motion.morph }));
  }, [hidden, open]);
  const closeSheet = () => {
    hidden.set(0);
    open.set(withTiming(0, { duration: motion.morph - 60 }));
    setTimeout(() => setSheet(false), motion.morph);
  };

  // 開いたときは、タブを全部出す。「議論をのぞく」から来たら、コメント欄も開く
  useFocusEffect(
    useCallback(() => {
      mini.set(0);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      if (c === '1') setTimeout(openSheet, 380);
      return () => {
        hidden.set(0);
        open.set(0);
        setSheet(false);
      };
    }, [id, c]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!a) return null;
  const k = kindOf(a);
  const total = countComments(getComments(a.id));
  const saved = isSaved(a.id);

  // みんなの声のバー：タブを全部出しているときはタブの上、小さいときは小さいタブと検索の丸の間
  const tabBottom = insets.bottom + layout.tabBarBottom;
  const barFull: BarGeo = {
    left: side + 14,
    right: side + 14,
    bottom: tabBottom + layout.tabBarHeight + 10,
    height: 46,
  };
  const barMini: BarGeo = {
    left: side + 14 + 58 + 8,
    right: side + 14 + layout.tabBarMini + 8,
    bottom: tabBottom,
    height: layout.tabBarMini,
  };

  return (
    <FigureCtx.Provider value={setMenu}>
      <Page bg={colors.paper}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 }}>
          <View>
            <Poster a={a} aspect={k === 'deep' ? 4 / 3 : 1} padTop={insets.top + 64} />
            {/* サムネと地の境目は線を見せず、なめらかに黒へ */}
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.8)', colors.paper]}
              locations={[0, 0.4, 0.75, 1]}
              style={styles.fade}
            />
          </View>
          {a.brk || k === 'deep' ? (
            <View style={[styles.strip, { backgroundColor: a.brk ? colors.alert : '#6A4FD6' }]}>
              <Text style={styles.stripB}>{a.brk ? t('article.breakingBand') : t('article.deepBand')}</Text>
              <Text style={styles.stripT} numberOfLines={1}>
                {a.tm} · {t('home.talking', { n: a.c })}
              </Text>
            </View>
          ) : null}
          <View style={styles.head}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} maxFontSizeMultiplier={type.title.max}>
                {a.title}
              </Text>
              <Text style={styles.when}>
                {a.when} · {t('article.readMin', { n: readingMinutes(a) })}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.save')}
              onPress={() => toast(toggleSave(a.id) ? t('article.saved') : t('article.unsaved'))}
              style={[styles.round, saved && styles.roundOn]}>
              <Icon name={saved ? 'saved' : 'save'} size={18} color={saved ? '#111' : colors.text} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {k === 'note' ? (
              <View style={styles.noteBody}>
                <Text style={styles.noteT}>{a.text}</Text>
              </View>
            ) : null}
            {(a.blocks ?? []).map((b, i) => (
              <BlockView key={i} b={b} />
            ))}
            {k !== 'note' ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.relH}>{t('article.related')}</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={192}
                  decelerationRate="fast"
                  contentContainerStyle={{ gap: 12 }}>
                  {getRelated(a.id).map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => router.replace({ pathname: '/article/[id]', params: { id: r.id } })}
                      style={styles.rel}>
                      <Poster a={r} aspect={4 / 3} compact />
                      <Text style={styles.relT} numberOfLines={3}>
                        {r.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            <Text style={styles.sample}>{t('article.sample')}</Text>
          </View>
        </Animated.ScrollView>

        {/* 戻るボタンと右上のボタンは、スクロールしても動かさない */}
        <View pointerEvents="box-none" style={[styles.topBtns, { top: insets.top + 10 }]}>
          <View style={styles.glassBtn}>
            <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.close')}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={styles.closeIn}>
              <Icon name="down" size={20} />
            </Pressable>
          </View>
          <View style={styles.pill}>
            <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.share')}
              onPress={() => toast('共有（見本）')}
              style={styles.pillBtn}>
              <Icon name="share" size={19} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.lang')}
              onPress={() => toast(t('article.lang'))}
              style={styles.pillBtn}>
              <Text style={styles.lang}>文A</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.more')}
              onPress={() => toast('通報・ミュート（見本）')}
              style={styles.pillBtn}>
              <Icon name="more" size={19} />
            </Pressable>
          </View>
        </View>

        <VoiceBar total={total} barFull={barFull} barMini={barMini} onPress={openSheet} hiddenWhenOpen={sheet} />

        <CommentSheet
          articleId={a.id}
          open={open}
          visible={sheet}
          barFull={barFull}
          barMini={barMini}
          miniP={miniP}
          height={height}
          onClose={closeSheet}
          quote={quote}
          clearQuote={() => setQuote(null)}
        />

        {/* 図を長押ししたときのメニュー */}
        <Modal transparent visible={!!menu} animationType="fade" onRequestClose={() => setMenu(null)}>
          <Pressable style={styles.menuScrim} onPress={() => setMenu(null)}>
            <View style={[styles.menu, { width: width - 32, marginBottom: insets.bottom + 16 }]}>
              <Text style={styles.menuH}>{menu}</Text>
              {[
                ['コメントに付けて話す', () => (setQuote(menu), openSheet())],
                ['グループ・個人に送る', () => toast('送り先を選ぶ画面は次の段階で作ります')],
                ['画像として保存', () => toast('画像として保存しました（見本）')],
              ].map(([label, fn]) => (
                <Pressable
                  key={label as string}
                  onPress={() => {
                    setMenu(null);
                    (fn as () => void)();
                  }}
                  style={styles.menuRow}>
                  <Text style={styles.menuT}>{label as string}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      </Page>
    </FigureCtx.Provider>
  );
}

function VoiceBar({
  total,
  barFull,
  barMini,
  onPress,
  hiddenWhenOpen,
}: {
  total: number;
  barFull: BarGeo;
  barMini: BarGeo;
  onPress: () => void;
  hiddenWhenOpen: boolean;
}) {
  const { mini } = useTabBar();
  const p = useDerivedValue(() => withTiming(mini.get(), { duration: motion.tabShrink }));
  const geo = useAnimatedStyle(() => ({
    left: interpolate(p.get(), [0, 1], [barFull.left, barMini.left]),
    right: interpolate(p.get(), [0, 1], [barFull.right, barMini.right]),
    bottom: interpolate(p.get(), [0, 1], [barFull.bottom, barMini.bottom]),
    height: interpolate(p.get(), [0, 1], [barFull.height, barMini.height]),
  }));
  const sub = useAnimatedStyle(() => ({ opacity: 1 - p.get() }));
  return (
    <Animated.View style={[styles.bar, geo, { opacity: hiddenWhenOpen ? 0 : 1 }]}>
      <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('article.voices', { n: total })}
        onPress={onPress}
        style={styles.barIn}>
        <Icon name="talk" size={17} />
        <Text style={styles.barT} numberOfLines={1}>
          {t('article.voices', { n: total })}
          <Animated.Text style={[styles.barS, sub]}>　s.tanaka「一部に」から「広がり」へ…</Animated.Text>
        </Text>
        <View style={styles.barUp}>
          <Icon name="chevronUp" size={16} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: space.article,
    marginTop: -26,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  stripB: { color: colors.white, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
  stripT: { color: colors.white, fontSize: 11.5, flex: 1 },
  head: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: space.article, marginTop: 4 },
  title: { color: colors.text, fontSize: type.title.fontSize, lineHeight: type.title.lineHeight, fontWeight: '700' },
  when: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 6 },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundOn: { backgroundColor: colors.white, borderColor: colors.white },
  body: { paddingHorizontal: space.article, paddingTop: 18, gap: 16 },
  noteBody: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.28)',
  },
  noteT: { color: colors.text, fontSize: 17, lineHeight: 29, fontWeight: '500' },
  relH: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', marginBottom: 10, letterSpacing: 0.5 },
  rel: { width: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface },
  relT: { color: colors.text, fontSize: 12.5, lineHeight: 18, padding: 10 },
  sample: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 },
  topBtns: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between' },
  closeIn: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  glassBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: { flexDirection: 'row', borderRadius: 999, overflow: 'hidden', height: 42, paddingHorizontal: 4 },
  pillBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  lang: { color: colors.text, fontSize: 14, fontWeight: '600' },
  bar: { position: 'absolute', borderRadius: 999, overflow: 'hidden' },
  barIn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 14, paddingRight: 5 },
  barT: { color: colors.text, fontSize: 12.5, fontWeight: '700', flex: 1 },
  barS: { color: 'rgba(255,255,255,0.65)', fontWeight: '400' },
  barUp: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' },
  menu: {
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  menuH: { color: colors.muted, fontSize: 12, paddingHorizontal: 18, paddingVertical: 10 },
  menuRow: { paddingHorizontal: 18, paddingVertical: 15, borderTopWidth: 1, borderTopColor: colors.line },
  menuT: { color: colors.text, fontSize: 15 },
});
