import { useState } from 'react';
import { Image, Switch, View, useWindowDimensions } from 'react-native';

import { PEOPLE, PERSON_COLOR, SUBJ, YEAR_HOURS } from '@/data';
import { PHOTO } from '@/photos';
import { setState, toggleFollow, useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Avatar, Btn, Card, haptic, IconBtn, Press, RingAvatar, SubjCoin, Txt } from '@/ui/base';
import { Page } from '@/ui/Chrome';
import { HoloCard } from '@/ui/MeCard';
import { openSheet } from '@/ui/Sheet';
import { UnderTabs } from '@/ui/Tabs';
import { toast } from '@/ui/Toast';

type Tab = 'grid' | 'following' | 'followers';

// Instagram's profile: the photo with its ring, three counts, name and bio,
// two grey buttons, highlights, then a three-up grid of what you posted and
// recorded. The study card lives behind "カードを共有".
function Setting({ label, sub, k }: { label: string; sub: string; k: 'showLive' | 'showRank' }) {
  const t = useT();
  const on = useStore((x) => x[k]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: hair, borderBottomColor: t.line }}>
      <View style={{ flex: 1 }}>
        <Txt size={14} w="500">{label}</Txt>
        <Txt size={11.5} tone="ink3">{sub}</Txt>
      </View>
      <Switch value={on} onValueChange={(v) => { haptic.tap(); setState({ [k]: v }); }} trackColor={{ true: t.green, false: t.line2 }} thumbColor="#fff" ios_backgroundColor={t.line2} accessibilityLabel={label} />
    </View>
  );
}
const openSettings = () =>
  openSheet(() => (
    <View>
      <Txt size={18} w="700" style={{ marginBottom: 4 }}>見せ方</Txt>
      <Setting k="showLive" label="勉強中をみんなに見せる" sub="「みんな」の自習室に並びます" />
      <Setting k="showRank" label="順位を公開する" sub="オフでも自分の順位は見られます" />
      <Txt size={12.5} tone="ink3" style={{ marginTop: 14 }}>Inchly 1.0（モック）</Txt>
    </View>
  ));
const openCard = () =>
  openSheet((close) => (
    <View style={{ marginHorizontal: -16 }}>
      <HoloCard name="はる" handle="haru_study" goal="東大 理一 志望"
        stats={[{ v: String(Math.round(YEAR_HOURS)), from: '000', label: '時間 / 1年' }, { v: '23', from: '00', label: '日連続' }, { v: '57', from: '00', label: '位 / 今週' }]} />
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Btn kind="primary" wide label="画像を保存" onPress={() => { haptic.success(); close(); toast('カードの画像を保存しました'); }} />
      </View>
    </View>
  ));

// the grid: photos you posted and the days you recorded
const GRID: ({ kind: 'photo'; img: keyof typeof PHOTO } | { kind: 'rec'; s: number; min: number; d: string })[] = [
  { kind: 'rec', s: 0, min: 165, d: '今日' },
  { kind: 'photo', img: 'noteDesk' },
  { kind: 'rec', s: 1, min: 88, d: '昨日' },
  { kind: 'photo', img: 'morning' },
  { kind: 'rec', s: 4, min: 132, d: '10/19' },
  { kind: 'photo', img: 'noteBook' },
  { kind: 'rec', s: 2, min: 210, d: '10/18' },
  { kind: 'photo', img: 'space' },
  { kind: 'rec', s: 3, min: 47, d: '10/17' },
];

function FollowBtn({ h, back }: { h: string; back?: boolean }) {
  const on = useStore((s) => s.following.includes(h));
  return <Btn small kind={on ? 'quiet' : 'blue'} label={on ? 'フォロー中' : back ? 'フォローバック' : 'フォローする'} onPress={() => { haptic.soft(); toggleFollow(h); }} />;
}

export default function Me() {
  const t = useT();
  const following = useStore((s) => s.following);
  const running = useStore((s) => s.running);
  const [tab, setTab] = useState<Tab>('grid');
  const { width } = useWindowDimensions();
  const cell = (width - 32 - 4) / 3;

  const count = (n: string, label: string, v?: Tab) => (
    <Press onPress={() => v && setTab(v)} scale={0.95} hitSlop={6} style={{ alignItems: 'center', flex: 1 }} accessibilityLabel={`${label} ${n}`}>
      <Txt num size={17} w="700" lh={21}>{n}</Txt>
      <Txt size={12.5} lh={16}>{label}</Txt>
    </Press>
  );

  return (
    <Page title="haru_study" right={<IconBtn name="gear" label="設定" onPress={openSettings} />}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <RingAvatar name="はる" color={PERSON_COLOR['はる']} size={80} live={running} />
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {count('56', '投稿', 'grid')}
            {count('342', 'フォロワー', 'followers')}
            {count(String(following.length + 125), 'フォロー中', 'following')}
          </View>
        </View>
        <Txt size={14} w="600" style={{ marginTop: 10 }}>はる</Txt>
        <Txt size={12.5} tone="ink3">高3・東大 理一 志望</Txt>
        <Txt size={13.5} lh={20} style={{ marginTop: 2 }}>数学は青チャート2周目。朝型にしたい（今は夜型）。</Txt>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          <Btn kind="quiet" small label="プロフィールを編集" style={{ flex: 1 }} onPress={() => toast('プロフィールの編集はもうすぐ')} />
          <Btn kind="quiet" small label="カードを共有" style={{ flex: 1 }} onPress={openCard} />
        </View>
      </View>

      {/* highlights: one circle per subject */}
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: 16, paddingTop: 16 }}>
        {SUBJ.map((s) => (
          <Press key={s.id} onPress={() => toast(`${s.name}：今週 ${s.week}時間`, `目標 ${s.goal}時間`)} scale={0.94} style={{ alignItems: 'center', gap: 4 }} accessibilityLabel={`${s.name}のハイライト`}>
            <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: hair, borderColor: t.line2, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface }}>
              <SubjCoin name={s.name} color={s.c} size={48} />
            </View>
            <Txt size={11.5}>{s.name}</Txt>
          </Press>
        ))}
      </View>

      <View style={{ marginTop: 14 }}>
        <UnderTabs value={tab} onChange={setTab} options={[{ v: 'grid', label: '投稿と記録' }, { v: 'following', label: 'フォロー中' }, { v: 'followers', label: 'フォロワー' }]} />
      </View>

      {tab === 'grid' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 16, paddingTop: 12 }}>
          {GRID.map((g, i) => {
            const radius = i === 0 ? { borderTopLeftRadius: 14 } : i === 2 ? { borderTopRightRadius: 14 } : i === 6 ? { borderBottomLeftRadius: 14 } : i === 8 ? { borderBottomRightRadius: 14 } : null;
            if (g.kind === 'photo') return <Image key={i} source={PHOTO[g.img]} style={[{ width: cell, height: cell, backgroundColor: t.sunken }, radius]} resizeMode="cover" />;
            const s = SUBJ[g.s];
            return (
              <View key={i} style={[{ width: cell, height: cell, backgroundColor: s.c, padding: 10, justifyContent: 'space-between' }, radius]}>
                <Txt size={11} w="600" color="rgba(255,255,255,0.85)">{g.d}</Txt>
                <View>
                  <Txt num size={24} w="700" lh={28} color="#fff" style={{ letterSpacing: -0.6 }}>{`${Math.floor(g.min / 60)}:${String(g.min % 60).padStart(2, '0')}`}</Txt>
                  <Txt size={11} w="600" color="rgba(255,255,255,0.85)">{s.name}</Txt>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Card style={{ marginHorizontal: 16, marginTop: 12, paddingVertical: 2 }} pad={0}>
          {(tab === 'following' ? PEOPLE : [...PEOPLE].reverse()).map((p, i) => (
            <View key={p.h} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
              {i ? <View style={{ position: 'absolute', top: 0, left: 58, right: 0, height: hair, backgroundColor: t.line }} /> : null}
              <Avatar name={p.n} color={p.c} size={34} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={13.5} w="600">{p.n}</Txt>
                <Txt size={11.5} tone="ink3" numberOfLines={1}>{`${p.h}・${p.g}`}</Txt>
              </View>
              <FollowBtn h={p.h} back={tab === 'followers'} />
            </View>
          ))}
        </Card>
      )}
    </Page>
  );
}
