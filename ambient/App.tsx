import { BlurView } from 'expo-blur';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clock, Toast } from './src/Clock';
import { fontAssets } from './src/fonts';
import { ChevronIcon, SlidersIcon } from './src/icons';
import { SceneView } from './src/SceneView';
import { scenes, type Scene } from './src/scenes';
import { SettingsProvider, useSettings } from './src/settings';
import { SettingsSheet } from './src/SettingsSheet';

const CHROME_IDLE_MS = 3500;
const FADE_MS = 520;

type Layer = { key: number; scene: Scene; opacity: Animated.Value };

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

// Waits for stored settings so the app opens on the last scene without a flash.
function Root() {
  const { loaded } = useSettings();
  if (!loaded) return <View style={[styles.root, { backgroundColor: '#121212' }]} />;
  return <Player />;
}

function Player() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const [fontsReady] = useFonts(fontAssets);
  const startIndex = Math.max(0, scenes.findIndex((s) => s.id === settings.scene));
  const [index, setIndex] = useState(startIndex);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { key: 0, scene: scenes[startIndex], opacity: new Animated.Value(1) },
  ]);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  // Photo scenes measure their own brightness once loaded.
  const [measuredTone, setMeasuredTone] = useState<Record<string, 'dark' | 'light'>>({});
  const nextKey = useRef(1);
  const scene = scenes[index];

  // ── chrome: shows on any touch, fades away when left alone ──────────────
  // Shown at launch, so the controls are discoverable; they fade when left alone.
  const [chrome] = useState(() => new Animated.Value(1));
  const [chromeOn, setChromeOn] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hideChrome = useCallback(() => {
    setChromeOn(false);
    Animated.timing(chrome, {
      toValue: 0,
      duration: 600,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chrome]);

  const showChrome = useCallback(() => {
    clearTimeout(hideTimer.current);
    setChromeOn(true);
    Animated.timing(chrome, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    hideTimer.current = setTimeout(hideChrome, CHROME_IDLE_MS);
  }, [chrome, hideChrome]);

  useEffect(() => {
    hideTimer.current = setTimeout(hideChrome, CHROME_IDLE_MS);
    return () => clearTimeout(hideTimer.current);
  }, [hideChrome]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setPaused(s !== 'active'));
    return () => sub.remove();
  }, []);

  // ── switching: the new scene mounts transparent, then fades in when ready ─
  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + scenes.length) % scenes.length;
      setIndex(next);
      update((s) => ({ ...s, scene: scenes[next].id }));
      const key = nextKey.current++;
      setLayers((ls) => [...ls, { key, scene: scenes[next], opacity: new Animated.Value(0) }]);
      showChrome();
    },
    [index, showChrome, update]
  );

  const reveal = useCallback((layer: Layer) => {
    Animated.timing(layer.opacity, {
      toValue: 1,
      duration: FADE_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setLayers((ls) => ls.filter((l) => l.key >= layer.key));
    });
  }, []);

  // Fallback in case a page never reports ready.
  useEffect(() => {
    const top = layers[layers.length - 1];
    if (layers.length < 2) return;
    // Photos wait for their picture; give them longer before showing anyway.
    const t = setTimeout(() => reveal(top), top.scene.kind === 'photo' ? 8000 : 1800);
    return () => clearTimeout(t);
  }, [layers, reveal]);

  // Long-press anywhere: show or hide the clock, like a widget.
  const clockVisible = settings.clock.visible;
  const toggleClock = useCallback(() => {
    const visible = !clockVisible;
    update((s) => ({ ...s, clock: { ...s.clock, visible } }));
    setToast({ text: visible ? '時計を表示しました' : '時計を隠しました・長押しで戻せます', id: Date.now() });
  }, [clockVisible, update]);

  const tone = measuredTone[scene.id] ?? scene.tone;
  const dark = tone === 'dark';
  const ink = dark ? '#ffffff' : '#111114';
  const inkSoft = dark ? 'rgba(255,255,255,0.6)' : 'rgba(17,17,20,0.5)';
  const glassTint = dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight';
  const glassEdge = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)';
  const clock = fontsReady ? settings.clock : { ...settings.clock, font: 'system' as const };

  return (
    <View style={[styles.root, { backgroundColor: layers[0].scene.background }]}>
      <StatusBar hidden animated />
      {layers.map((layer) => (
        <Animated.View key={layer.key} style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]}>
          <SceneView
            scene={layer.scene}
            paused={paused || settingsOpen}
            digital={settings.digital}
            onReady={() => reveal(layer)}
            onTouch={showChrome}
            onLongPress={toggleClock}
            onTone={(t) => setMeasuredTone((m) => (m[layer.scene.id] === t ? m : { ...m, [layer.scene.id]: t }))}
          />
        </Animated.View>
      ))}

      <Clock clock={clock} tone={tone} />
      <Toast toast={toast} tone={tone} />

      <Animated.View
        pointerEvents={chromeOn ? 'box-none' : 'none'}
        style={[
          styles.dock,
          {
            bottom: Math.max(insets.bottom, 12) + 14,
            opacity: chrome,
            transform: [{ translateY: chrome.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
      >
        <View style={styles.dockRow}>
          <View style={[styles.shadow, dark ? styles.shadowDark : styles.shadowLight]}>
            <BlurView intensity={dark ? 40 : 60} tint={glassTint} style={[styles.pill, { borderColor: glassEdge }]}>
              <NavButton direction={-1} color={ink} onPress={() => go(-1)} label="前の背景" />
              <View style={styles.label}>
                <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
                  {scene.title}
                  <Text style={[styles.caption, { color: inkSoft }]}>
                    {'  '}
                    {scene.caption}
                  </Text>
                </Text>
                <Text style={[styles.hint, { color: inkSoft }]} numberOfLines={1}>
                  {scene.hint}
                </Text>
              </View>
              <NavButton direction={1} color={ink} onPress={() => go(1)} label="次の背景" />
            </BlurView>
          </View>
          <View style={[styles.shadow, dark ? styles.shadowDark : styles.shadowLight, styles.round]}>
            <BlurView intensity={dark ? 40 : 60} tint={glassTint} style={[styles.roundGlass, { borderColor: glassEdge }]}>
              <Pressable
                onPress={() => {
                  setSettingsOpen(true);
                  clearTimeout(hideTimer.current);
                }}
                accessibilityRole="button"
                accessibilityLabel="設定"
                style={({ pressed }) => [styles.roundButton, { opacity: pressed ? 0.45 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
              >
                <SlidersIcon color={ink} />
              </Pressable>
            </BlurView>
          </View>
        </View>
        <View style={styles.dots}>
          {scenes.map((s, i) => (
            <View
              key={s.id}
              style={[styles.dot, { backgroundColor: ink, opacity: i === index ? 0.9 : 0.25, width: i === index ? 16 : 6 }]}
            />
          ))}
        </View>
      </Animated.View>

      <SettingsSheet
        open={settingsOpen}
        tone={tone}
        credit={scene.credit}
        onClose={() => {
          setSettingsOpen(false);
          showChrome();
        }}
      />
    </View>
  );
}

function NavButton({ direction, color, onPress, label }: { direction: 1 | -1; color: string; onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.nav, { opacity: pressed ? 0.45 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <ChevronIcon direction={direction} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shadow: {
    borderRadius: 30,
  },
  shadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  shadowLight: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    minWidth: 248,
    paddingHorizontal: 6,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  round: {
    borderRadius: 30,
  },
  roundGlass: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  roundButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nav: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0,
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
    letterSpacing: 0,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
});
