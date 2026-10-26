import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PEOPLE } from '@/data';
import { toggleFollow, useStore } from '@/store';
import { hair, useT } from '@/theme';
import { Avatar, haptic, Press, Txt } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { personSheet } from '@/ui/Editors';
import { UnderTabs } from '@/ui/Tabs';
import { Pane } from '@/ui/Glass';

type Tab = 'following' | 'followers';

function FollowBtn({ h, back }: { h: string; back?: boolean }) {
  const t = useT();
  const on = useStore((s) => s.following.includes(h));
  return (
    <Press onPress={() => { haptic.soft(); toggleFollow(h); }} scale={0.95} accessibilityRole="button" accessibilityState={{ selected: on }}
      hitSlop={{ top: 7, bottom: 7 }} style={{ height: 30, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', backgroundColor: on ? t.surface : t.ink, borderWidth: hair, borderColor: on ? t.line2 : t.ink }}>
      <Txt size={12} w="600" color={on ? t.ink2 : t.onInk}>{on ? 'フォロー中' : back ? 'フォローを返す' : 'フォロー'}</Txt>
    </Press>
  );
}

// Who you follow and who follows you, opened from the counts on My Page.
export default function Follows() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [tab, setTab] = useState<Tab>(params.tab === 'followers' ? 'followers' : 'following');
  const handle = useStore((s) => s.account?.handle ?? 'haru_study');
  const following = useStore((s) => s.following);
  const blocked = useStore((s) => s.blocked);
  const list = (tab === 'following' ? PEOPLE.filter((p) => following.includes(p.h)) : [...PEOPLE].reverse()).filter((p) => !blocked.includes(p.n));
  return (
    <Screen>
      <NavBar title={`@${handle}`} />
      <UnderTabs value={tab} onChange={setTab} options={[{ v: 'following', label: 'フォロー' }, { v: 'followers', label: 'フォロワー' }]} />
      <View style={{ flex: 1, backgroundColor: t.surface }}>
      <Pane radius={0} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        {list.map((p, i) => (
          <Press key={p.h} onPress={() => personSheet(p.n, p.c)} scale={0.99}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
            {i ? <View style={{ position: 'absolute', top: 0, left: 68, right: 0, height: hair, backgroundColor: t.line }} /> : null}
            <Avatar name={p.n} color={p.c} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={14} w="700">{p.n}</Txt>
              <Txt size={12} tone="ink3" numberOfLines={1}>{`@${p.h} · ${p.g}`}</Txt>
            </View>
            <FollowBtn h={p.h} back={tab === 'followers'} />
          </Press>
        ))}
        {list.length ? null : <Txt size={13} tone="ink3" style={{ textAlign: 'center', paddingTop: 40 }}>まだいません</Txt>}
      </ScrollView>
      </View>
    </Screen>
  );
}
