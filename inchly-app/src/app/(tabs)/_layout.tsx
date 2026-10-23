import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TABS } from '@/screens/layout';
import { TabBar } from '@/screens/tabs';
import { useStore } from '@/store';

export default function TabLayout() {
  // first launch (or after deleting the account): set up before anything else
  const signedIn = useStore((s) => !!s.account);
  if (!signedIn) return <Redirect href="/welcome" />;
  // the tab bar is the theme's (src/screens/tabs.tsx); the tabs themselves are the base layout's
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      {TABS.map((x) => <Tabs.Screen key={x.name} name={x.name} />)}
    </Tabs>
  );
}
