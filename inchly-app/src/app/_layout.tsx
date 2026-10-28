// one weight per import path, so only these files are bundled (not every weight of each family)
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { DelaGothicOne_400Regular } from '@expo-google-fonts/dela-gothic-one/400Regular';
import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16/400Regular';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { Rajdhani_600SemiBold } from '@expo-google-fonts/rajdhani/600SemiBold';
import { Rajdhani_700Bold } from '@expo-google-fonts/rajdhani/700Bold';
import { Silkscreen_400Regular } from '@expo-google-fonts/silkscreen/400Regular';
// the timer card: its heading (Zen Kaku Gothic) and the faces for its time (ui/timeFonts)
import { Anton_400Regular } from '@expo-google-fonts/anton/400Regular';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display/400Regular';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { InterTight_200ExtraLight } from '@expo-google-fonts/inter-tight/200ExtraLight';
import { InterTight_800ExtraBold } from '@expo-google-fonts/inter-tight/800ExtraBold';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono/600SemiBold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { Oswald_300Light } from '@expo-google-fonts/oswald/300Light';
import { ZenKakuGothicNew_900Black } from '@expo-google-fonts/zen-kaku-gothic-new/900Black';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { MomentHost } from '@/screens/MomentHost';
import { getState, hydrate, startStudy, useDayRollover, useReminders, useStore } from '@/store';
import { bundledFontsLoaded, useT } from '@/theme';
import { BackdropEngine } from '@/ui/backdrop/Backdrop';
import { SheetHost } from '@/ui/Sheet';
import { isRoomShape, StudyRoom } from '@/ui/StudyRoom';
import { toast, ToastHost } from '@/ui/Toast';
import { TourHost } from '@/ui/Tour';

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
  // Nothing to wait for before showing the app: it uses the system face (SF Pro / Hiragino Sans), and the themes' bundled faces (below) swap in when ready.
  // We only wait for what is saved on this phone.
  const [ready, setReady] = useState(false);
  useEffect(() => { hydrate().then(() => setReady(true)); }, []);
  // the themes' bundled faces; until they load, themes use the system face
  const [fonts] = useFonts({
    DotGothic16_400Regular, BricolageGrotesque_500Medium, BricolageGrotesque_800ExtraBold, Silkscreen_400Regular,
    Rajdhani_600SemiBold, Rajdhani_700Bold, DelaGothicOne_400Regular, IBMPlexMono_400Regular, IBMPlexMono_600SemiBold,
    Anton_400Regular, Oswald_300Light, InterTight_200ExtraLight, InterTight_800ExtraBold, Nunito_800ExtraBold, InstrumentSerif_400Regular, DMSerifDisplay_400Regular, JetBrainsMono_600SemiBold,
    ZenKakuGothicNew_900Black,
  });
  useEffect(() => { if (fonts) bundledFontsLoaded(); }, [fonts]);
  const signedIn = useStore((s) => !!s.account);
  // not while the first-run 使い方 is up (a push would cover what it points at)
  const toured = useStore((s) => s.tourDone);
  useFeed(ready && signedIn && toured);
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
        {/* the 背景 runs here, once; every page shows it (ui/backdrop) */}
        <BackdropEngine />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.canvas } }}>
          <Stack.Screen name="(tabs)" />
          {/* the timer draws its own coming up and going down (like Apple Music's player), over the screen it came from */}
          <Stack.Screen name="timer" options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="search" />
          <Stack.Screen name="create-group" />
          <Stack.Screen name="plan-event" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="subjects" />
          <Stack.Screen name="design" options={{ animation: 'slide_from_left' }} />
          <Stack.Screen name="follows" />
          <Stack.Screen name="bookmarks" />
          <Stack.Screen name="record" />
          <Stack.Screen name="welcome" options={{ animation: 'fade', gestureEnabled: false }} />
        </Stack>
        <SheetHost />
        {room ? <StudyRoom /> : null}
        <MomentHost />
        <ToastHost />
        {room ? null : <TourHost />}
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
