import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono/600SemiBold';
import { useFonts } from 'expo-font';
import { DarkTheme, SplashScreen, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/Toast';
import { TabBarProvider } from '@/hooks/useTabBar';
import { colors } from '@theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.line,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({ GeistMono_500Medium, GeistMono_600SemiBold });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <ThemeProvider value={theme}>
          <TabBarProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
              <Stack.Screen name="notifications" options={{ animation: 'fade' }} />
            </Stack>
            <ToastHost />
          </TabBarProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
