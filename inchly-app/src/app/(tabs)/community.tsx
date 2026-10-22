import { router } from 'expo-router';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { hms, hoursIn, PERSON_COLOR, RANK, ROOM, subj } from '@/data';
import { elapsedOf, getState, setState, toggleFollow, useNow, useStore } from '@/store';
import { ease, hair, lift, radius, type, useT } from '@/theme';
import { Avatar, Btn, Card, haptic, Press, Txt } from '@/ui/base';
import { Screen, SearchBtn, TopBar, useTabPad } from '@/ui/Chrome';
import { personSheet } from '@/ui/Editors';
import { Field } from '@/ui/Form';
import { GroupMark, LiveDot } from '@/ui/GroupParts';
import { Icon } from '@/ui/Icon';
import { Rolling } from '@/ui/Rolling';
import { openSheet } from '@/ui/Sheet';
import { Segmented, UnderTabs } from '@/ui/Tabs';
import { Sticker } from '@/ui/Sticker';

type Tab = 'live' | 'rank' | 'groups';

export default function Community() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('live');
  const pad = useTabPad();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const go = (k: Tab) => { setTab(k); scroll.current?.scrollTo({ y: 0, animated: false }); };
  return (
    <Screen>
      <TopBar title="みんな" right={<SearchBtn />} />
      <UnderTabs value={tab} onChange={go} options={[{ v: 'live', label: 'いま勉強中' }, { v: 'rank', label: 'ランキング' }, { v: 'groups', label: 'グループ' }]} />
      <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: t.canvas }} contentContainerStyle={{ paddingBottom: pad }}>
        {tab === 'live' ? <Live /> : tab === 'rank' ? <Rank /> : <Groups />}
      </ScrollView>
    </Screen>
  );
}

// ---------- いま勉強中: a study room, not a list ----------
type RoomFilter = string; // 'all' | 'follow' | a school, e.g. '東大'
function Live() {
  const t = useT();
  const now = useNow();
  const [start] = useState(() => Date.now());
  const since = Math.floor((now - start) / 1000);
  const [count, setCount] = useState(0);
  const [f, setF] = useState<RoomFilter>('all');
  const extra = useStore((x) => x.roomFilters);
  const following = useStore((x) => x.following);
  const me = useStore((x) => x.running && x.showLive);
  const scope = useStore((x) => x.liveScope);
  const myName = useStore((x) => x.account?.name ?? 'はる');
  const blocked = useStore((x) => x.blocked);
  const mineMin = useStore((x) => Math.floor(elapsedOf(x) / 60));
  useEffect(() => {
    const first = setTimeout(() => setCount(1263), 60);
    // Someone joins every few seconds; the digits roll.
    const id = setInterval(() => setCount((c) => c + 1 + Math.floor(Math.random() * 3)), 4200);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);
  const people = ROOM.filter((p) => !blocked.includes(p.n)).filter((p) => (f === 'follow' ? following.includes(p.h) : f === 'all' ? true : p.g.startsWith(f)));
  const chip = (v: RoomFilter, label: string) => (
    <Press key={v} onPress={() => setF(v)} scale={0.94} accessibilityRole="radio" accessibilityState={{ checked: f === v }} hitSlop={{ top: 9, bottom: 9, left: 3, right: 3 }}
      style={{ height: 26, paddingHorizontal: 11, borderRadius: 13, justifyContent: 'center', backgroundColor: f === v ? t.ink : t.surface, borderWidth: hair, borderColor: f === v ? t.ink : t.line2 }}>
      <Txt size={11.5} w="600" color={f === v ? t.onInk : t.ink2}>{label}</Txt>
    </Press>
  );
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 16 }}>
        <LiveDot size={7} />
        <Rolling value={count ? comma(count) : '0,000'} size={type.figure + 2} weight="700" />
        <Txt size={12} tone="ink2" style={{ marginTop: 8 }}>人が机に向かってる</Txt>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 }}>
        {chip('all', 'みんな')}
        {chip('follow', 'フォロー中')}
        {['東大', ...extra].map((x) => chip(x, `${x}志望`))}
        {/* add: search a school to filter by, or people to follow */}
        <Press onPress={() => roomSearch((v) => setF(v))} scale={0.9} hitSlop={9} accessibilityLabel="絞り込みを追加"
          style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface, borderWidth: hair, borderColor: t.line2 }}>
          <Icon name="plus" size={13} color={t.ink} width={2.2} />
        </Press>
      </ScrollView>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 16, marginTop: 8, paddingVertical: 2, borderRadius: radius.card, backgroundColor: t.surface, ...lift(t) }}>
        {me && (scope === 'all' || f === 'follow') ? <Seat name={myName} color={PERSON_COLOR['はる']} label="あなた" sub={subj(getState().subj).name} time={`${mineMin}分`} you /> : null}
        {people.map((p) => <Seat key={p.h} name={p.n} color={p.c} label={p.n} sub={p.s} time={hms(p.t + since).replace(/^00:/, '')} />)}
      </View>
      <Press onPress={() => router.push('/settings')} hitSlop={6} style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Txt size={11.5} tone="ink3">{scope === 'all' ? '勉強中は全員に見えています' : scope === 'followers' ? '勉強中はフォロワーにだけ見えています' : '勉強中は誰にも見えていません'}</Txt>
        <Txt size={11.5} w="600" color={t.blue}>変更</Txt>
      </Press>
    </Animated.View>
  );
}
// ---- "+" in the room: find a school to filter by, or someone to follow ----
const SCHOOLS = ['東大', '京大', '一橋', '科学大', '阪大', '東北大', '早稲田', '慶應', '医学部'];
function roomSearch(pick: (v: string) => void) {
  openSheet((close) => <RoomSearch close={close} pick={pick} />);
}
function RoomSearch({ close, pick }: { close: () => void; pick: (v: string) => void }) {
  const t = useT();
  const [q, setQ] = useState('');
  const extra = useStore((x) => x.roomFilters);
  const following = useStore((x) => x.following);
  const blocked = useStore((x) => x.blocked);
  const schools = SCHOOLS.filter((x) => !q || x.includes(q));
  const people = ROOM.filter((p) => !blocked.includes(p.n) && (!q || (p.n + p.h + p.g).includes(q)));
  const added = (x: string) => x === '東大' || extra.includes(x);
  const add = (x: string) => {
    if (!added(x)) setState((s) => ({ roomFilters: [...s.roomFilters, x] }));
    haptic.success();
    pick(x);
    close();
  };
  return (
    <View style={{ gap: 14 }}>
      <Txt size={17} w="700">絞り込みを追加</Txt>
      <Field label="志望校・名前でさがす" value={q} onChangeText={setQ} max={20} autoFocus />
      <View>
        <Txt size={12} w="600" tone="ink2" style={{ marginBottom: 4 }}>志望校で絞り込む</Txt>
        {schools.length ? schools.map((x, i) => {
          const n = ROOM.filter((p) => p.g.startsWith(x)).length;
          return (
            <Press key={x} onPress={() => add(x)} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
              <Txt size={14} w="600" style={{ flex: 1 }}>{`${x}志望`}</Txt>
              <Txt size={12} tone="ink3">{n ? `${n}人が勉強中` : 'いま勉強中の人はいません'}</Txt>
              {added(x) ? <Icon name="check" size={16} color={t.greenInk} /> : <Icon name="plus" size={16} color={t.ink2} />}
            </Press>
          );
        }) : <Txt size={13} tone="ink3">見つかりませんでした</Txt>}
      </View>
      <View>
        <Txt size={12} w="600" tone="ink2" style={{ marginBottom: 4 }}>人をフォローする</Txt>
        {people.slice(0, 6).map((p, i) => {
          const on = following.includes(p.h);
          return (
            <View key={p.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? hair : 0, borderTopColor: t.line }}>
              <Avatar name={p.n} color={p.c} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600">{p.n}</Txt>
                <Txt size={11.5} tone="ink3" numberOfLines={1}>{`@${p.h} · ${p.g}`}</Txt>
              </View>
              <Btn small kind={on ? 'quiet' : 'primary'} label={on ? 'フォロー中' : 'フォロー'} onPress={() => { haptic.soft(); toggleFollow(p.h); }} />
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** One seat in the room: the person's icon with a live ring, what and how long. */
function Seat({ name, color, label, sub, time, you }: { name: string; color: string; label: string; sub: string; time: string; you?: boolean }) {
  const t = useT();
  return (
    <View style={{ width: '25%' }}>
      <Press onPress={you ? undefined : () => personSheet(name, color)} disabled={you} scale={0.95} style={{ alignItems: 'center', paddingVertical: 10, paddingHorizontal: 2 }} accessibilityLabel={`${label} ${sub} ${time}`}>
        <View style={{ padding: 2, borderRadius: 40, borderWidth: 1.5, borderColor: you ? t.green : t.dark ? '#1F4A30' : '#B5EBC8' }}>
          <Avatar name={name} color={color} size={44} />
        </View>
        <Txt size={12} w="600" lh={16} numberOfLines={1} style={{ marginTop: 5 }}>{label}</Txt>
        <Txt size={11} tone="ink3" lh={14} numberOfLines={1}>{sub}</Txt>
        <Txt num size={11} tone="ink2" lh={14}>{time}</Txt>
      </Press>
    </View>
  );
}

const comma = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ---------- ランキング ----------
const DIST = [2, 4, 7, 11, 16, 22, 27, 31, 33, 32, 29, 25, 21, 17, 13, 10, 7, 5, 3, 2];
const RANK_BY: Record<'w' | 'm' | 't', { rank: number; delta: string; me: number; scale: number }> = {
  w: { rank: 57, delta: '上位18% · 先週から9つ上がりました', me: hoursIn(7), scale: 1 },
  m: { rank: 71, delta: '上位23% · 先月から4つ上がりました', me: 69.3, scale: 3.1 },
  t: { rank: 38, delta: '上位12% · 今日はいい調子です', me: 2.8, scale: 0.13 },
};
function Rank() {
  const t = useT();
  const [p, setP] = useState<'w' | 'm' | 't'>('w');
  const r = RANK_BY[p];
  const blocked = useStore((x) => x.blocked);
  const myName = useStore((x) => x.account?.name ?? 'はる');
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Segmented value={p} onChange={setP} options={[{ v: 'w', label: '今週' }, { v: 'm', label: '今月' }, { v: 't', label: '今日' }]} />
      </View>
      <Card style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12 }} pad={14}>
        <View style={{ flex: 1 }}>
          <Txt size={12} tone="ink2">東大志望 312人の中で</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
            <Rolling value={String(r.rank)} size={type.hero} weight="700" />
            <Txt size={13} w="600" tone="ink3" style={{ marginBottom: 5 }}>位</Txt>
          </View>
          <Txt size={11} w="600" tone="greenInk">{`▲ ${r.delta}`}</Txt>
        </View>
        <Dist pos={Math.round(14 - (r.rank - 57) / 12)} />
      </Card>
      <Card style={{ marginHorizontal: 16, marginTop: 10, paddingVertical: 4 }} pad={0}>
        {RANK.filter((x) => !blocked.includes(x.n)).map((x, i) => (
          <Press key={x.n} onPress={() => personSheet(x.n, x.c)} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 7 }}>
            {i < 3 ? <Sticker name={i === 0 ? 'trophy' : 'star'} size={24} tilt={i === 2 ? 8 : -6} /> : <Txt num size={12} w="600" tone="ink3" style={{ width: 24, textAlign: 'center' }}>{i + 1}</Txt>}
            <Avatar name={x.n} color={x.c} size={30} />
            <Txt size={13.5} w="600" style={{ flex: 1 }}>{x.n}</Txt>
            <Txt num size={13.5} w="600">{(x.h * r.scale).toFixed(1)}<Txt size={11} tone="ink3"> 時間</Txt></Txt>
          </Press>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 7, marginHorizontal: 4, marginTop: 2, marginBottom: 0, borderRadius: radius.inner, backgroundColor: t.greenSoft }}>
          <Txt num size={12} w="700" tone="greenInk" style={{ width: 24, textAlign: 'center' }}>{r.rank}</Txt>
          <Avatar name={myName} color={PERSON_COLOR['はる']} size={30} />
          <Txt size={13.5} w="600" style={{ flex: 1 }}>あなた</Txt>
          <Txt num size={13.5} w="700">{r.me.toFixed(1)}<Txt size={11} tone="ink3"> 時間</Txt></Txt>
        </View>
      </Card>
    </Animated.View>
  );
}
function Dist({ pos }: { pos: number }) {
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1.5, height: 44, width: 110 }} accessibilityLabel="分布の中のあなたの位置">
      {DIST.map((x, i) => <DistBar key={i} h={(x / 33) * 44} on={i === pos} color={i === pos ? t.green : t.sunken} delay={i * 18} />)}
    </View>
  );
}
function DistBar({ h, color, delay, on }: { h: number; color: string; delay: number; on: boolean }) {
  const s = useSharedValue(0);
  useEffect(() => { s.value = 0; s.value = withTiming(1, { duration: 500 + delay, easing: ease.out }); }, [s, delay, on]);
  const a = useAnimatedStyle(() => ({ height: Math.max(2, h * s.value) }));
  return <Animated.View style={[{ flex: 1, borderRadius: 1.5, backgroundColor: color }, a]} />;
}

// ---------- グループ ----------
function Groups() {
  const t = useT();
  const groups = useStore((s) => s.groups);
  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <Btn kind="primary" wide label="グループを作る" icon="plus" onPress={() => router.push('/create-group')} />
      </View>
      <Txt size={type.head} w="600" style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>参加中</Txt>
      <Card style={{ marginHorizontal: 16, paddingVertical: 4 }} pad={0}>
        {groups.map((g, i) => (
          <Press key={g.id} onPress={() => router.push(`/group/${g.id}`)} scale={0.985}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 60, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <GroupMark colors={g.cs} members={g.members} icon={g.icon} size={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13.5} w="600" numberOfLines={1}>{g.n}</Txt>
              <Txt size={11} tone="ink3">{g.m}人 · {g.join}</Txt>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {g.studying.length ? <LiveDot size={5} /> : null}
              <Txt size={11} w="600" tone={g.studying.length ? 'greenInk' : 'ink3'}>{g.studying.length ? `${g.studying.length}人が勉強中` : 'いまは静か'}</Txt>
            </View>
            <Icon name="chev" size={13} color={t.ink3} />
          </Press>
        ))}
      </Card>
    </Animated.View>
  );
}
