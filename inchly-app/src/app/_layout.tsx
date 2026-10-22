import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { getState, hydrate, startStudy, useDayRollover, useReminders, useStore } from '@/store';
import { focus, useT } from '@/theme';
import { SheetHost } from '@/ui/Sheet';
import { isRoomShape, StudyRoom } from '@/ui/StudyRoom';
import { toast, ToastHost } from '@/ui/Toast';

// Simulated "someone started studying" pushes, so the live layer is visible in the mock.
const FEED: [string, string][] = [['kaito', '物理'], ['れん', '世界史'], ['ひなた', '数学']];
function useFeed(on: boolean) {
  useEffect(() => {
    if (!on) return;
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
  }, [on]);
}

export default function RootLayout() {
  const t = useT();
  // No font files to wait for: the app uses the system face (SF Pro / Hiragino Sans).
  // We only wait for what is saved on this phone.
  const [ready, setReady] = useState(false);
  useEffect(() => { hydrate().then(() => setReady(true)); }, []);
  const signedIn = useStore((s) => !!s.account);
  useFeed(ready && signedIn);
  useDayRollover();
  useReminders();
  // sideways, the whole app becomes the study room (see StudyRoom)
  const { width, height } = useWindowDimensions();
  const room = ready && signedIn && isRoomShape(width, height);
  if (!ready) return null;
  const nav = t.dark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...nav, colors: { ...nav.colors, background: t.canvas, card: t.surface, text: t.ink, border: t.line, primary: t.ink } }}>
      <StatusBar style={room ? 'light' : t.dark ? 'light' : 'dark'} hidden={room} />
      {/* userSelect: dragging sliders and charts with a mouse shouldn't select text on web */}
      <GestureHandlerRootView style={[{ flex: 1, backgroundColor: t.canvas }, Platform.OS === 'web' && ({ userSelect: 'none' } as object)]}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.canvas } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="timer" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom', contentStyle: { backgroundColor: focus.bg } }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="create-group" />
          <Stack.Screen name="plan-event" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="follows" />
          <Stack.Screen name="me" />
          <Stack.Screen name="record" />
          <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <SheetHost />
        {room ? <StudyRoom /> : null}
        <ToastHost />
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
