import { Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { getState, startStudy } from '@/store';
import { useT } from '@/theme';
import { SheetHost } from '@/ui/Sheet';
import { toast, ToastHost } from '@/ui/Toast';

SplashScreen.preventAutoHideAsync();

// Simulated "someone started studying" pushes, so the live layer is visible in the mock.
const FEED: [string, string][] = [['かいと', '物理'], ['れん', '世界史'], ['ひなた', '数学']];
function useFeed() {
  useEffect(() => {
    let i = 0;
    let id: ReturnType<typeof setTimeout>;
    const next = () => {
      if (i >= FEED.length) return;
      const [n, s] = FEED[i++];
      toast(`${n} が ${s} を始めました`, '東大 理一 2027 · いま5人が勉強中', {
        label: '一緒に始める',
        run: () => {
          if (getState().running) { toast('もう勉強中です'); return; }
          startStudy();
          toast(`${n}と一緒に始めました`, '記録はタイマーを止めたときに残ります');
        },
      });
      id = setTimeout(next, 26000);
    };
    id = setTimeout(next, 9000);
    return () => clearTimeout(id);
  }, []);
}

export default function RootLayout() {
  const t = useT();
  const [loaded] = useFonts({ Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  useEffect(() => { if (loaded) SplashScreen.hideAsync(); }, [loaded]);
  useFeed();
  if (!loaded) return null;
  const nav = t.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...nav, colors: { ...nav.colors, background: t.canvas, card: t.surface, text: t.ink, border: t.line, primary: t.green } }}>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: t.canvas }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="timer" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: '#0F1110' } }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="create-group" />
          <Stack.Screen name="plan-event" />
          <Stack.Screen name="group/[id]" />
        </Stack>
        <SheetHost />
        <ToastHost />
      </View>
    </ThemeProvider>
  );
}
