import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isSaved, toggleSave, useDataVersion } from '@/lib/data';
import type { Article } from '@/lib/data/types';
import { kfmt, kindOf, readingMinutes } from '@/lib/format';
import { t } from '@/i18n';
import { colors, fonts, radius, space, type } from '@theme';

import { Icon } from './Icon';
import { Mark } from './Mark';
import { Poster } from './Poster';

const KIND_STYLE = {
  slot: { bg: 'rgba(255,255,255,0.1)', fg: '#E6E6E8', line: undefined },
  breaking: { bg: colors.alert, fg: colors.white, line: colors.alert },
  note: { bg: 'rgba(46,196,182,0.18)', fg: colors.noteSoft, line: colors.note },
  deep: { bg: 'rgba(155,123,255,0.2)', fg: colors.deepSoft, line: colors.deep },
} as const;

const open = (id: string, comments?: boolean) =>
  router.push({ pathname: '/article/[id]', params: comments ? { id, c: '1' } : { id } });

function By({ a }: { a: Article }) {
  const k = kindOf(a);
  return (
    <View style={styles.by}>
      <View style={styles.av}>
        <Mark height={11} />
      </View>
      <Text style={styles.nm}>Orchard</Text>
      <Text style={styles.hd}>· {a.tm}</Text>
      <View style={[styles.chip, { backgroundColor: KIND_STYLE[k].bg }]}>
        <Text style={[styles.chipT, { color: KIND_STYLE[k].fg }]}>{t(`kind.${k}`)}</Text>
      </View>
    </View>
  );
}

function Acts({ a, go, onGo }: { a: Article; go: string; onGo: () => void }) {
  useDataVersion();
  const saved = isSaved(a.id);
  return (
    <View style={styles.acts}>
      <View style={styles.act} accessibilityLabel={`反応 ${a.r}`}>
        <Icon name="up" size={15} color={colors.faint} strokeWidth={1.9} />
        <Text style={styles.actT}>{kfmt(a.r)}</Text>
      </View>
      <View style={styles.act} accessibilityLabel={`声 ${a.c}`}>
        <Icon name="talk" size={15} color={colors.faint} strokeWidth={1.9} />
        <Text style={styles.actT}>{kfmt(a.c)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('article.save')}
        hitSlop={8}
        onPress={() => toggleSave(a.id)}
        style={styles.act}>
        <Icon
          name={saved ? 'saved' : 'save'}
          size={15}
          color={saved ? colors.accent : colors.faint}
          strokeWidth={1.9}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onGo}
        style={({ pressed }) => [styles.go, pressed && { opacity: 0.6 }]}>
        <Text style={styles.goT}>{go}</Text>
      </Pressable>
    </View>
  );
}

export function SlotCard({ a }: { a: Article }) {
  const k = kindOf(a);
  return (
    <View
      style={[styles.item, KIND_STYLE[k].line ? { borderLeftWidth: 3, borderLeftColor: KIND_STYLE[k].line } : null]}>
      <By a={a} />
      <Pressable accessibilityRole="link" accessibilityLabel={a.title} onPress={() => open(a.id)} style={styles.thumb}>
        <Poster a={a} img={`sq${a.img}`} />
        {k === 'slot' && a.vlen ? (
          <View style={styles.yt}>
            <Icon name="play" size={11} color={colors.white} />
            <Text style={styles.ytT}>
              {t('home.youtube')} · {a.vlen}
            </Text>
          </View>
        ) : null}
        {k === 'breaking' ? (
          <View style={styles.brk}>
            <Text style={styles.brkT}>{t('kind.breaking')}</Text>
          </View>
        ) : null}
      </Pressable>
      <View style={styles.lab}>
        <Text style={styles.labT}>{(a.lab ?? '').toUpperCase()}</Text>
        <Text style={styles.tag}>{a.tag}</Text>
      </View>
      <Pressable onPress={() => open(a.id)}>
        <Text style={styles.title} maxFontSizeMultiplier={type.headline.max}>
          {a.title}
        </Text>
      </Pressable>
      <Acts a={a} go={t('home.peek')} onGo={() => open(a.id, true)} />
    </View>
  );
}

export function NoteCard({ a }: { a: Article }) {
  return (
    <View style={[styles.item, { borderLeftWidth: 3, borderLeftColor: colors.note }]}>
      <By a={a} />
      <Pressable accessibilityRole="button" onPress={() => open(a.id, true)} style={styles.note}>
        <Text style={styles.q}>“</Text>
        <Text style={styles.noteT} maxFontSizeMultiplier={type.body.max}>
          {a.text}
        </Text>
      </Pressable>
      <Text style={[styles.tag, { marginTop: 10 }]}>{a.tag}</Text>
      <Acts a={a} go={t('home.talk')} onGo={() => open(a.id, true)} />
    </View>
  );
}

export function DeepCard({ a }: { a: Article }) {
  return (
    <View style={[styles.item, { borderLeftWidth: 3, borderLeftColor: colors.deep }]}>
      <By a={a} />
      <Pressable accessibilityRole="link" accessibilityLabel={a.title} onPress={() => open(a.id)} style={styles.thumb}>
        <Poster a={a} img={`th${a.img}`} aspect={16 / 9} compact />
        <View style={styles.band}>
          <Text style={styles.bandT}>
            {t('kind.deep')} · {t('article.readMin', { n: readingMinutes(a) })}
          </Text>
        </View>
      </Pressable>
      <Pressable onPress={() => open(a.id)}>
        <Text style={styles.title}>{a.title}</Text>
        {a.lead ? <Text style={styles.lead}>{a.lead}</Text> : null}
      </Pressable>
      <Acts a={a} go={t('home.read')} onGo={() => open(a.id)} />
    </View>
  );
}

export function FeedCard({ a }: { a: Article }) {
  const k = kindOf(a);
  return k === 'note' ? <NoteCard a={a} /> : k === 'deep' ? <DeepCard a={a} /> : <SlotCard a={a} />;
}

const styles = StyleSheet.create({
  item: {
    paddingHorizontal: space.page,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  by: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  av: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#2C2D31',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nm: { color: colors.text, fontSize: 13, fontWeight: '700' },
  hd: { color: colors.muted, fontFamily: fonts.mono, fontSize: 11.5 },
  chip: { marginLeft: 'auto', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
  chipT: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 },
  thumb: { marginTop: 12, borderRadius: radius.thumb, overflow: 'hidden' },
  yt: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(12,12,14,0.66)',
  },
  ytT: { color: colors.white, fontSize: 11, fontWeight: '600' },
  brk: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: colors.alert,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  brkT: { color: colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  band: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(70,50,140,0.62)',
    borderWidth: 1,
    borderColor: 'rgba(196,176,255,0.45)',
  },
  bandT: { color: colors.white, fontSize: 11, fontWeight: '700' },
  lab: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  labT: { color: colors.faint, fontFamily: fonts.monoBold, fontSize: 10.5, letterSpacing: 1.2 },
  tag: { color: colors.tag, fontSize: 11, fontWeight: '600' },
  title: {
    color: colors.text,
    fontSize: type.headline.fontSize,
    lineHeight: type.headline.lineHeight,
    fontWeight: '700',
    marginTop: 6,
  },
  lead: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 4 },
  note: {
    marginTop: 12,
    padding: 16,
    paddingTop: 10,
    borderRadius: radius.card,
    backgroundColor: 'rgba(46,196,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,196,182,0.28)',
  },
  q: { color: colors.note, fontSize: 34, lineHeight: 34, fontWeight: '700', height: 22 },
  noteT: { color: colors.text, fontSize: 16, lineHeight: 27, fontWeight: '500' },
  acts: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: -8 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 7 },
  actT: { color: colors.faint, fontFamily: fonts.mono, fontSize: 12.5 },
  go: {
    marginLeft: 'auto',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  goT: { color: colors.text, fontSize: 11.5, fontWeight: '600' },
});
