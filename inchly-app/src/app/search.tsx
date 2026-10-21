import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hoursIn, PEOPLE, Uni, UNIS } from '@/data';
import { toggleFollow, toggleIn, useStore } from '@/store';
import { ease, font, hair, noOutline, radius, useT } from '@/theme';
import { Avatar, Btn, Empty, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { Checkbox } from '@/ui/Form';
import { Icon } from '@/ui/Icon';
import { openSheet } from '@/ui/Sheet';
import { Segmented } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Kind = 'uni' | 'user';
const RECENT = ['東京大学 理科一類', '青チャート 数III', 'もくもく会'];
const COLS = [56, 64, 54, 30];

function Skeleton() {
  const t = useT();
  const o = useSharedValue(1);
  useEffect(() => { o.value = withRepeat(withTiming(0.45, { duration: 650 }), -1, true); }, [o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={a} accessibilityLabel="読み込み中">
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ paddingHorizontal: 20, paddingVertical: 14, gap: 8, borderBottomWidth: hair, borderBottomColor: t.line }}>
          <View style={{ width: '60%', height: 12, borderRadius: 6, backgroundColor: t.sunken }} />
          <View style={{ width: '35%', height: 12, borderRadius: 6, backgroundColor: t.sunken }} />
        </View>
      ))}
    </Animated.View>
  );
}

function NumCell({ v, unit, w }: { v: string; unit?: string; w: number }) {
  return (
    <View style={{ width: w, alignItems: 'flex-end' }}>
      <Txt num size={14} w="600">{v}</Txt>
      {unit ? <Txt size={10.5} tone="ink3" lh={14}>{unit}</Txt> : null}
    </View>
  );
}

function compareSheet(us: Uni[]) {
  openSheet((close) => <CompareTable us={us} close={close} />);
}
function CompareTable({ us, close }: { us: Uni[]; close: () => void }) {
  const t = useT();
  const me = hoursIn(7);
  const maxFans = Math.max(...us.map((u) => u.fans));
  const minAvg = Math.min(...us.map((u) => u.avg));
  const rows: { k: string; cells: { v: string; best?: boolean }[] }[] = [
    { k: '偏差値', cells: us.map((u) => ({ v: u.dev.toFixed(1) })) },
    { k: 'このアプリの志望者', cells: us.map((u) => ({ v: `${u.fans.toLocaleString()}人`, best: u.fans === maxFans })) },
    { k: '先輩の週平均', cells: us.map((u) => ({ v: `${u.avg.toFixed(1)}時間` })) },
    { k: 'あなたとの差', cells: us.map((u) => { const d = me - u.avg; return { v: `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}時間`, best: u.avg === minAvg }; }) },
    { k: '二次試験まで', cells: us.map((u) => ({ v: `${u.days}日` })) },
  ];
  const line = { borderBottomWidth: hair, borderBottomColor: t.line };
  return (
    <View>
      <Txt size={18} w="700">{us.length}校を比べる</Txt>
      <Txt size={12.5} tone="ink3">いちばん良い値を緑で示しています</Txt>
      <View style={[{ flexDirection: 'row', marginTop: 12, paddingVertical: 10 }, line]}>
        <View style={{ flex: 1.2 }} />
        {us.map((u) => (
          <View key={u.n} style={{ flex: 1, alignItems: 'flex-end' }}>
            <Txt size={13} w="700" numberOfLines={1}>{u.n}</Txt>
            <Txt size={11.5} tone="ink3" numberOfLines={1}>{u.f}</Txt>
          </View>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.k} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }, line]}>
          <Txt size={13} tone="ink3" style={{ flex: 1.2 }}>{r.k}</Txt>
          {r.cells.map((c, i) => (
            <Txt key={i} num size={13.5} w={c.best ? '700' : '500'} color={c.best ? t.greenInk : t.ink} style={{ flex: 1, textAlign: 'right' }}>{c.v}</Txt>
          ))}
        </View>
      ))}
      <Btn kind="primary" wide label="閉じる" onPress={close} style={{ marginTop: 18 }} />
    </View>
  );
}

function Tray({ picked, onGo }: { picked: string[]; onGo: () => void }) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const show = picked.length >= 2;
  const y = useSharedValue(200);
  useEffect(() => { y.value = withTiming(show ? 0 : 200, { duration: 360, easing: ease.out }); }, [show, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View pointerEvents={show ? 'auto' : 'none'}
      style={[{ position: 'absolute', left: 12, right: 12, bottom: insets.bottom + 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingRight: 8, paddingLeft: 14, borderRadius: radius.card, backgroundColor: t.ink }, a]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Txt size={13} w="700" color={t.onInk}>{picked.length}校を比べる</Txt>
        <Txt size={12} color={t.onInk} style={{ opacity: 0.6 }} numberOfLines={1}>{picked.join(' · ')}</Txt>
      </View>
      <Press onPress={onGo} scale={0.94} style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: t.onInk, justifyContent: 'center' }}>
        <Txt size={13} w="700" color={t.ink}>比べる</Txt>
      </Press>
    </Animated.View>
  );
}

export default function Search() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('uni');
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const following = useStore((s) => s.following);
  const blocked = useStore((s) => s.blocked);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  // Debounced search with a short skeleton, like a real request.
  // `loading` is switched on by the input/tab handlers below; this only ends it.
  useEffect(() => {
    const id = setTimeout(() => { setQ(text.trim()); setLoading(false); }, text.trim() ? 550 : 350);
    return () => clearTimeout(id);
  }, [text, kind]);

  const changeText = (v: string) => { setText(v); setLoading(true); };
  const changeKind = (k: Kind) => { setKind(k); setLoading(true); };

  const pick = (n: string) => {
    if (!picked.includes(n) && picked.length >= 3) { haptic.warn(); toast('比べられるのは3校までです'); return; }
    setPicked((p) => toggleIn(p, n));
  };

  let body: React.ReactNode = null;
  if (!q && kind !== 'uni' && !text) {
    body = (
      <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
        <Txt size={12} w="600" tone="ink2" style={{ paddingTop: 12, paddingBottom: 4 }}>最近の検索</Txt>
        {RECENT.map((r) => (
          <Pressable key={r} onPress={() => { haptic.tap(); changeText(r.split(' ')[0]); }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, borderBottomWidth: hair, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
            <Icon name="clock" size={14} color={t.ink3} />
            <Txt size={13.5} tone="ink2">{r}</Txt>
          </Pressable>
        ))}
      </View>
    );
  } else if (loading) {
    body = <Skeleton />;
  } else if (kind === 'uni') {
    const list = UNIS.filter((u) => !q || (u.n + u.f).includes(q));
    body = list.length ? (
      <Animated.View entering={FadeIn.duration(180)}>
        {list.map((u) => (
          <View key={u.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: hair, borderBottomColor: t.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13.5} w="600" numberOfLines={1}>{u.n}</Txt>
              <Txt size={11} tone="ink3" numberOfLines={1}>{u.f} · {u.p}</Txt>
            </View>
            <NumCell w={COLS[0]} v={u.dev.toFixed(1)} />
            <NumCell w={COLS[1]} v={u.fans.toLocaleString()} unit="人" />
            <NumCell w={COLS[2]} v={String(u.days)} unit="日" />
            <View style={{ width: COLS[3], alignItems: 'flex-end' }}>
              <Checkbox on={picked.includes(u.n)} onPress={() => pick(u.n)} label={`${u.n}を比べる`} />
            </View>
          </View>
        ))}
        <Txt size={11} tone="ink3" style={{ paddingHorizontal: 20, paddingVertical: 12 }}>偏差値は河合塾の目安（サンプル）</Txt>
      </Animated.View>
    ) : <Empty title={`「${q}」に合う大学はありません`} sub="「東大」「工学部」みたいに短くすると見つかりやすい" />;
  } else {
    const list = PEOPLE.filter((p) => !blocked.includes(p.n) && (!q || (p.n + p.h + p.g).includes(q)));
    body = list.length ? (
      <Animated.View entering={FadeIn.duration(180)} style={{ paddingTop: 4 }}>
        {list.map((p) => {
          const on = following.includes(p.h);
          return (
            <View key={p.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 10 }}>
              <Avatar name={p.n} color={p.c} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600">{p.n}</Txt>
                <Txt size={11} tone="ink3" numberOfLines={1}>@{p.h} · {p.g} · 今週 {(p.t / 400).toFixed(1)}時間</Txt>
              </View>
              <Btn small kind={on ? 'quiet' : 'primary'} label={on ? 'フォロー中' : 'フォロー'} onPress={() => toggleFollow(p.h)} />
            </View>
          );
        })}
      </Animated.View>
    ) : <Empty title={`「${q}」に合うユーザーはいません`} sub="ニックネーム、@ID、志望校でも探せます" />;
  }

  const showHeader = kind === 'uni' && !loading && UNIS.some((u) => !q || (u.n + u.f).includes(q));

  return (
    <Screen>
      <NavBar title="さがす" />
      <View style={{ marginHorizontal: 16, marginTop: 2, height: 42, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: radius.inner, backgroundColor: t.surface,
        borderWidth: focused ? 1.25 : hair, borderColor: focused ? t.ink : t.line2 }}>
        <Icon name="search" size={16} color={t.ink3} />
        <TextInput ref={inputRef} value={text} onChangeText={changeText} autoFocus placeholder="大学・ユーザー" placeholderTextColor={t.ink3}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} returnKeyType="search" clearButtonMode="never" autoCorrect={false}
          accessibilityLabel="検索" style={[{ flex: 1, minWidth: 0, fontSize: 16, color: t.ink, fontFamily: font.text, height: 42 }, noOutline]} />
        {text ? (
          <Pressable onPress={() => { changeText(''); inputRef.current?.focus(); }} hitSlop={10} accessibilityLabel="消す"
            style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.sunken, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={11} color={t.ink3} width={2.6} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }}>
        <Segmented value={kind} onChange={changeKind} options={[{ v: 'uni', label: '大学' }, { v: 'user', label: 'ユーザー' }]} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" stickyHeaderIndices={showHeader ? [0] : undefined}
        contentContainerStyle={{ paddingBottom: insets.bottom + (picked.length >= 2 ? 96 : 24) }}>
        {showHeader ? (
          <View style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, backgroundColor: t.canvas, borderBottomWidth: hair, borderBottomColor: t.line }}>
            <Txt size={11.5} tone="ink3" style={{ flex: 1 }}>大学・学部</Txt>
            <Txt size={11.5} tone="ink3" style={{ width: COLS[0], textAlign: 'right' }}>偏差値</Txt>
            <Txt size={11.5} tone="ink3" style={{ width: COLS[1], textAlign: 'right' }}>志望者</Txt>
            <Txt size={11.5} tone="ink3" style={{ width: COLS[2], textAlign: 'right' }}>二次まで</Txt>
            <View style={{ width: COLS[3] }} />
          </View>
        ) : null}
        {body}
      </ScrollView>
      {kind === 'uni' ? <Tray picked={picked} onGo={() => compareSheet(UNIS.filter((u) => picked.includes(u.n)))} /> : null}
    </Screen>
  );
}
