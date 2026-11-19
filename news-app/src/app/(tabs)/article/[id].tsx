import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams, useNavigation, type ErrorBoundaryProps } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
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
import { scheduleOnRN } from 'react-native-worklets';

import { BlockView, FigureCtx } from '@/components/blocks/Blocks';
import { CommentSheet, type BarGeo } from '@/components/CommentSheet';
import { ErrorView } from '@/components/ErrorView';
import { Glass } from '@/components/Glass';
import { Icon } from '@/components/Icon';
import { Page } from '@/components/Page';
import { Poster } from '@/components/Poster';
import { toast } from '@/components/Toast';
import { useScreen } from '@/hooks/useScreen';
import { useShrinkOnScroll, useTabBar } from '@/hooks/useTabBar';
import { getArticle, getComments, getRelated, isSaved, toggleSave, useDataVersion } from '@/lib/data';
import type { Article } from '@/lib/data/types';
import { countComments, kindOf, readingMinutes, sortComments } from '@/lib/format';
import { t } from '@/i18n';
import { colors, layout, motion, space, type } from '@theme';

// 記事の中で思わぬエラーが起きたとき。下のタブは残したまま、ここだけ出し直せるようにする
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <Page bg={colors.paper}>
      <ErrorView title="common.errorTitle" sub="common.errorSub" retry={retry} />
    </Page>
  );
}

export default function ArticleScreen() {
  const { id, c } = useLocalSearchParams<{ id: string; c?: string }>();
  const a = getArticle(id);
  if (!a) {
    return (
      <Page bg={colors.paper}>
        <ErrorView title="article.missing" sub="article.missingSub" />
      </Page>
    );
  }
  // 記事が変わったら中身を作り直す（前の記事のグラフの選択や書きかけを持ちこまない）
  return <ArticleBody key={a.id} a={a} c={c} />;
}

function ArticleBody({ a, c }: { a: Article; c?: string }) {
  useDataVersion();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width, height } = useScreen();
  const { mini, hidden } = useTabBar();
  const onScroll = useShrinkOnScroll();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const open = useSharedValue(0);
  const [sheet, setSheet] = useState(false);
  const [sheetGen, setSheetGen] = useState(0);
  const [quote, setQuote] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const autoOpen = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const underOverlay = useRef(false);
  const miniP = useDerivedValue(() => withTiming(mini.get(), { duration: motion.tabShrink }));

  const openSheet = useCallback(() => {
    setSheet(true);
    hidden.set(1);
    open.set(withTiming(1, { duration: motion.morph }));
  }, [hidden, open]);
  // 閉じ終わったときにだけ外す（途中で開き直したら、そのまま開いておく）
  const closeSheet = useCallback(() => {
    hidden.set(0);
    setQuote(null);
    open.set(
      withTiming(0, { duration: motion.morph - 60 }, (done) => {
        if (done) scheduleOnRN(setSheet, false);
      })
    );
  }, [hidden, open]);

  // 開いたときは、タブを全部出して一番上から。「議論をのぞく」から来たら、コメント欄も開く。
  // 検索など上に重なる画面から戻ったときは、読んでいた位置とコメント欄をそのままにする。
  useFocusEffect(
    useCallback(() => {
      const backFromOverlay = underOverlay.current;
      underOverlay.current = false;
      if (!backFromOverlay) {
        mini.set(0);
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        if (c === '1') autoOpen.current = setTimeout(openSheet, 380);
      }
      return () => {
        clearTimeout(autoOpen.current);
        underOverlay.current = navigation.getParent()?.isFocused() === false;
        if (underOverlay.current) return;
        hidden.set(0);
        open.set(0);
        setSheet(false);
        setQuote(null);
        setMenu(null);
        setSheetGen((g) => g + 1);
      };
    }, [c, openSheet, navigation, mini, hidden, open, scrollRef])
  );

  const k = kindOf(a);
  const total = countComments(getComments(a.id));
  const saved = isSaved(a.id);

  // みんなの声のバー：タブを全部出しているときはタブの上、小さいときは小さいタブと検索の丸の間
  const tabBottom = insets.bottom + layout.tabBarBottom;
  // バーとコメント欄は Page（440 の列）の中に置くので、左右の余りは足さない
  const barFull: BarGeo = {
    left: 14,
    right: 14,
    bottom: tabBottom + layout.tabBarHeight + 10,
    height: layout.voiceBar,
  };
  const barMini: BarGeo = {
    left: 14 + 58 + 8,
    right: 14 + layout.tabBarMini + 8,
    bottom: tabBottom,
    height: layout.tabBarMini,
  };

  return (
    <FigureCtx.Provider value={setMenu}>
      <Page bg={colors.paper}>
        <Animated.ScrollView
          ref={scrollRef}
          accessibilityElementsHidden={sheet}
          importantForAccessibility={sheet ? 'no-hide-descendants' : 'auto'}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 }}>
          <View>
            <Poster
              a={a}
              img={k === 'deep' ? `th${a.img}` : `sq${a.img}`}
              aspect={k === 'deep' ? 4 / 3 : 1}
              padTop={insets.top + 64}
            />
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
                      <Poster a={r} img={`sq${r.img}`} aspect={4 / 3} compact />
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
        <View
          pointerEvents="box-none"
          accessibilityElementsHidden={sheet}
          importantForAccessibility={sheet ? 'no-hide-descendants' : 'auto'}
          style={[styles.topBtns, { top: insets.top + 10 }]}>
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
              onPress={() => toast(t('article.shareSoon'))}
              style={styles.pillBtn}>
              <Icon name="share" size={19} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('article.lang')}
              onPress={() => toast(t('article.langSoon'))}
              style={styles.pillBtn}>
              <Text style={styles.lang}>文A</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.more')}
              onPress={() => toast(t('article.moreSoon'))}
              style={styles.pillBtn}>
              <Icon name="more" size={19} />
            </Pressable>
          </View>
        </View>

        <VoiceBar a={a} total={total} barFull={barFull} barMini={barMini} onPress={openSheet} sheetOpen={sheet} />

        <CommentSheet
          key={sheetGen}
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
                [t('figure.talk'), () => (setQuote(menu), openSheet())],
                [t('figure.send'), () => toast(t('figure.sendSoon'))],
                [t('figure.save'), () => toast(t('figure.saveSoon'))],
              ].map(([label, fn]) => (
                <Pressable
                  key={label as string}
                  accessibilityRole="button"
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
  a,
  total,
  barFull,
  barMini,
  onPress,
  sheetOpen,
}: {
  a: Article;
  total: number;
  barFull: BarGeo;
  barMini: BarGeo;
  onPress: () => void;
  sheetOpen: boolean;
}) {
  const { mini } = useTabBar();
  const { width } = useScreen();
  const p = useDerivedValue(() => withTiming(mini.get(), { duration: motion.tabShrink }));
  const geo = useAnimatedStyle(() => ({
    left: interpolate(p.get(), [0, 1], [barFull.left, barMini.left]),
    right: interpolate(p.get(), [0, 1], [barFull.right, barMini.right]),
    bottom: interpolate(p.get(), [0, 1], [barFull.bottom, barMini.bottom]),
    height: interpolate(p.get(), [0, 1], [barFull.height, barMini.height]),
  }));
  const sub = useAnimatedStyle(() => ({ opacity: 1 - p.get() }));
  // この記事でいちばん支持されている声を、ひとつだけ見せる
  const top = sortComments(getComments(a.id), 'top')[0];
  const label = width < 360 ? t('article.voicesShort', { n: total }) : t('article.voices', { n: total });
  return (
    // コメント欄はこのバーと同じ位置からふくらんで上にかぶさるので、バー自体は消さない
    <Animated.View
      accessibilityElementsHidden={sheetOpen}
      importantForAccessibility={sheetOpen ? 'no-hide-descendants' : 'auto'}
      style={[styles.bar, geo]}>
      <Glass style={[StyleSheet.absoluteFill, { borderRadius: 999 }]} interactive />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('article.voices', { n: total })}
        onPress={onPress}
        style={styles.barIn}>
        <Icon name="talk" size={17} />
        <Text style={styles.barT} numberOfLines={1}>
          {label}
        </Text>
        {top ? (
          <Animated.Text style={[styles.barS, sub]} numberOfLines={1}>
            {t('article.teaser', { who: top.who, text: top.t })}
          </Animated.Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
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
  barT: { color: colors.text, fontSize: 12.5, fontWeight: '700', flexShrink: 0 },
  barS: { color: 'rgba(255,255,255,0.65)', fontSize: 12.5, flex: 1 },
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
