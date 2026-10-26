import { BlurView } from 'expo-blur';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SceneView } from './src/SceneView';
import { scenes, type Scene } from './src/scenes';

const CHROME_IDLE_MS = 3500;
const FADE_MS = 520;

type Layer = { key: number; scene: Scene; opacity: Animated.Value };

export default function App() {
  return (
    <SafeAreaProvider>
      <Player />
    </SafeAreaProvider>
  );
}

function Player() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { key: 0, scene: scenes[0], opacity: new Animated.Value(1) },
  ]);
  const [paused, setPaused] = useState(false);
  const nextKey = useRef(1);
  const scene = scenes[index];

  // ── chrome: shows on any touch, fades away when left alone ──────────────
  const chrome = useRef(new Animated.Value(0)).current;
  const [chromeOn, setChromeOn] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showChrome = useCallback(() => {
    clearTimeout(hideTimer.current);
    setChromeOn(true);
    Animated.timing(chrome, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    hideTimer.current = setTimeout(() => {
      setChromeOn(false);
      Animated.timing(chrome, {
        toValue: 0,
        duration: 600,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, CHROME_IDLE_MS);
  }, [chrome]);

  useEffect(() => {
    showChrome();
    return () => clearTimeout(hideTimer.current);
  }, [showChrome]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setPaused(s !== 'active'));
    return () => sub.remove();
  }, []);

  // ── switching: the new scene mounts underneath-transparent, then fades in ─
  const go = useCallback(
    (delta: number) => {
      const next = (index + delta + scenes.length) % scenes.length;
      setIndex(next);
      const key = nextKey.current++;
      setLayers((ls) => [...ls, { key, scene: scenes[next], opacity: new Animated.Value(0) }]);
      showChrome();
    },
    [index, showChrome]
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
    const t = setTimeout(() => reveal(top), 1800);
    return () => clearTimeout(t);
  }, [layers, reveal]);

  const dark = scene.tone === 'dark';
  const ink = dark ? '#ffffff' : '#111114';
  const inkSoft = dark ? 'rgba(255,255,255,0.6)' : 'rgba(17,17,20,0.5)';

  return (
    <View style={[styles.root, { backgroundColor: layers[0].scene.background }]}>
      <StatusBar hidden animated />
      {layers.map((layer) => (
        <Animated.View key={layer.key} style={[StyleSheet.absoluteFill, { opacity: layer.opacity }]}>
          <SceneView
            scene={layer.scene}
            paused={paused}
            onReady={() => reveal(layer)}
            onTouch={showChrome}
          />
        </Animated.View>
      ))}

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
        <View style={[styles.pillShadow, dark ? styles.pillShadowDark : styles.pillShadowLight]}>
          <BlurView
            intensity={dark ? 40 : 60}
            tint={dark ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
            style={[styles.pill, { borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)' }]}
          >
            <NavButton direction={-1} color={ink} onPress={() => go(-1)} label="前の背景" />
            <View style={styles.label}>
              <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
                {scene.title}
                <Text style={[styles.caption, { color: inkSoft }]}>{'  '}{scene.caption}</Text>
              </Text>
              <Text style={[styles.hint, { color: inkSoft }]} numberOfLines={1}>
                {scene.hint}
              </Text>
            </View>
            <NavButton direction={1} color={ink} onPress={() => go(1)} label="次の背景" />
          </BlurView>
        </View>
        <View style={styles.dots}>
          {scenes.map((s, i) => (
            <View
              key={s.id}
              style={[
                styles.dot,
                { backgroundColor: ink, opacity: i === index ? 0.9 : 0.25, width: i === index ? 16 : 6 },
              ]}
            />
          ))}
        </View>
      </Animated.View>
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
      <View
        style={[
          styles.chevron,
          { borderColor: color, transform: [{ rotate: direction === 1 ? '45deg' : '-135deg' }] },
        ]}
      />
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
  pillShadow: {
    borderRadius: 30,
  },
  pillShadowDark: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  pillShadowLight: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    minWidth: 264,
    paddingHorizontal: 6,
    borderRadius: 30,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  nav: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 9,
    height: 9,
    borderTopWidth: 1.8,
    borderRightWidth: 1.8,
    borderRadius: 1,
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
