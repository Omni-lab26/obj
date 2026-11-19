import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { t, type Key } from '@/i18n';
import { colors, space } from '@theme';

type Props = {
  title: Key;
  sub: Key;
  /** あるときは「もう一度」を出す（画面を作り直す） */
  retry?: () => void;
};

/** 画面が出せないときの受け皿（エラー・見つからない記事やページ）。開発者向けの文は出さない */
export function ErrorView({ title, sub, retry }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header">
        {t(title)}
      </Text>
      <Text style={styles.sub}>{t(sub)}</Text>
      <View style={styles.row}>
        {retry ? (
          <Pressable accessibilityRole="button" onPress={retry} style={[styles.btn, styles.btnOn]}>
            <Text style={[styles.btnT, styles.btnTOn]}>{t('common.retry')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={[styles.btn, !retry && styles.btnOn]}>
          <Text style={[styles.btnT, !retry && styles.btnTOn]}>{t('common.home')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxxl, gap: space.sm },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.lg },
  btn: {
    minHeight: 44,
    paddingHorizontal: space.xl,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  btnOn: { backgroundColor: colors.white, borderColor: colors.white },
  btnT: { color: colors.text, fontSize: 14, fontWeight: '700' },
  btnTOn: { color: '#111' },
});
