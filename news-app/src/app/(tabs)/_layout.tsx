import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { colors } from '@theme';

export default function TabsLayout() {
  return (
    <Tabs
      backBehavior="history"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
      <Tabs.Screen name="people" />
      <Tabs.Screen name="chat" />
      {/* 記事はタブの中に開く（下のタブとみんなの声のバーを出したまま読むため）。タブのボタンは TabBar が決めるので、ここでは隠さない */}
      <Tabs.Screen name="article/[id]" />
    </Tabs>
  );
}
