import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clock, Toast } from './src/Clock';
import { fontAssets } from './src/fonts';
import { ChevronIcon, PenIcon, SlidersIcon, UndoIcon } from './src/icons';
import { SceneView } from './src/SceneView';
import { scenes, type Scene } from './src/scenes';
import { SettingsProvider, useSettings } from './src/settings';
import { SettingsSheet } from './src/SettingsSheet';
import {
  resetStopwatch,
  formatDuration,
  resetTimer,
  setTimerDuration,
  timerDial,
  toggleStopwatch,
  toggleTimer,
  useTimerAlarm,
} from './src/timers';

const CHROME_IDLE_MS = 3500;
const FADE_MS = 520;

type Layer = { key: number; scene: Scene; opacity: Animated.Value };

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <Root />
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
  // The scene on screen: it changes when the new one starts fading in, so the
  // clock and controls change colour together with the picture.
  const [shownId, setShownId] = useState(scenes[startIndex].id);
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
  // Moving or resizing the digits (the pen and the arrows at the top left); the
  // controls stay up until it is done.
  const [edit, setEdit] = useState(false);
  const editing = useRef(false);
  useEffect(() => {
    editing.current = edit;
  });

  const hideChrome = useCallback(() => {
    if (editing.current) return;
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
    setShownId(layer.scene.id);
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

  const shown = scenes.find((s) => s.id === shownId) ?? scene;
  // ── timer and stopwatch: tap the digits to start/pause, hold to reset ──────
  const toggleCount = useCallback(() => {
    const now = Date.now();
    update((s) =>
      s.mode === 'timer'
        ? { ...s, timer: toggleTimer(s.timer, now) }
        : s.mode === 'stopwatch'
          ? { ...s, stopwatch: toggleStopwatch(s.stopwatch, now) }
          : s
    );
  }, [update]);
  const resetCount = useCallback(() => {
    update((s) =>
      s.mode === 'timer' ? { ...s, timer: resetTimer(s.timer) } : s.mode === 'stopwatch' ? { ...s, stopwatch: resetStopwatch() } : s
    );
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setToast({ text: 'リセットしました', id: Date.now() });
  }, [update]);
  useTimerAlarm(settings.timer, update, () => setToast({ text: 'タイマーが終わりました', id: Date.now() }));
  // ── timer saves: five slots under the rulers ──────────────────────────────
  const tick = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
  };
  const saveTimer = (i: number) => {
    const ms = timerDial(settings.timer);
    if (ms <= 0) {
      setToast({ text: '目盛りで時間を合わせてから保存してください', id: Date.now() });
      return;
    }
    update((s) => ({ ...s, timerSaves: s.timerSaves.map((v, j) => (j === i ? ms : v)) }));
    tick();
    setToast({ text: `${formatDuration(ms)} を保存しました・長押しで削除`, id: Date.now() });
  };
  const loadTimer = (i: number) => {
    const ms = settings.timerSaves[i];
    if (ms == null) return;
    update((s) => ({ ...s, timer: setTimerDuration(ms) }));
    tick();
  };
  const deleteTimer = (i: number) => {
    update((s) => ({ ...s, timerSaves: s.timerSaves.map((v, j) => (j === i ? null : v)) }));
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setToast({ text: '保存を削除しました', id: Date.now() });
  };

  // ── editing the digits' place and size ────────────────────────────────────
  const startEdit = () => {
    setEdit(true);
    editing.current = true;
    showChrome();
  };
  const endEdit = () => {
    setEdit(false);
    editing.current = false;
    showChrome();
  };

  const setMode = (mode: typeof settings.mode) => update((s) => ({ ...s, mode, clock: { ...s.clock, visible: true } }));

  const tone = measuredTone[shown.id] ?? shown.tone;
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

      <Clock
        clock={clock}
        mode={settings.mode}
        timer={settings.timer}
        stopwatch={settings.stopwatch}
        tone={tone}
        fadeMs={FADE_MS}
        onToggle={toggleCount}
        onReset={resetCount}
        onSetDuration={(ms) => update((s) => ({ ...s, timer: setTimerDuration(ms) }))}
        onMode={setMode}
        onTouch={showChrome}
        onHide={toggleClock}
        saves={settings.timerSaves}
        onSave={saveTimer}
        onLoad={loadTimer}
        onDelete={deleteTimer}
        face={settings.face}
        edit={settings.clock.visible && edit}
        onFace={(face) => update((s) => ({ ...s, face }))}
      />
      <Toast toast={toast} tone={tone} />

      <Animated.View
        // (Out of the way while the digits are being moved.)
        pointerEvents={chromeOn && !edit ? 'box-none' : 'none'}
        style={[
          styles.dock,
          {
            bottom: Math.max(insets.bottom, 12) + 14,
            opacity: edit ? 0 : chrome,
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

      {/* Top left: the pen, to move and resize the digits (all modes). While editing
          it is joined by undo and done, and everything else steps aside. */}
      {settings.clock.visible ? (
        <Animated.View
          pointerEvents={chromeOn || edit ? 'box-none' : 'none'}
          style={[styles.corner, { top: Math.max(insets.top, 12) + 10, left: Math.max(insets.left, 12) + 4, opacity: edit ? 1 : chrome }]}
        >
          <View style={[styles.shadow, dark ? styles.shadowDark : styles.shadowLight, styles.toolsShadow]}>
            <BlurView intensity={dark ? 40 : 60} tint={glassTint} style={[styles.toolsGlass, { borderColor: glassEdge }]}>
              {edit ? (
                <>
                  <ToolButton label="元の位置と大きさに戻す" color={ink} onPress={() => update((s) => ({ ...s, face: { x: 0, y: 0, scale: 1 } }))}>
                    <UndoIcon color={ink} />
                  </ToolButton>
                  <Pressable
                    onPress={endEdit}
                    accessibilityRole="button"
                    accessibilityLabel="完了"
                    style={({ pressed }) => [styles.doneButton, { backgroundColor: ink, opacity: pressed ? 0.6 : 1 }]}
                  >
                    <Text style={[styles.doneText, { color: dark ? '#0b0b0e' : '#ffffff' }]}>完了</Text>
                  </Pressable>
                </>
              ) : (
                <ToolButton label="数字の位置と大きさを変える" color={ink} onPress={startEdit}>
                  <PenIcon color={ink} />
                </ToolButton>
              )}
            </BlurView>
          </View>
        </Animated.View>
      ) : null}
      {edit ? (
        // (On the side of the screen away from the digits.)
        <View
          pointerEvents="none"
          style={[
            styles.editHint,
            settings.face.y > 0 ? { top: Math.max(insets.top, 12) + 66 } : { bottom: Math.max(insets.bottom, 12) + 24 },
          ]}
        >
          <Text style={[styles.editHintText, { color: ink, textShadowColor: dark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.95)' }]}>
            1本指で移動・2本指でつまんで大きさ
          </Text>
        </View>
      ) : null}

      {/* Top right: settings. */}
      <Animated.View
        pointerEvents={chromeOn && !edit ? 'box-none' : 'none'}
        style={[styles.corner, { top: Math.max(insets.top, 12) + 10, right: Math.max(insets.right, 12) + 4, opacity: edit ? 0 : chrome }]}
      >
        <View style={[styles.shadow, dark ? styles.shadowDark : styles.shadowLight, styles.toolsShadow]}>
          <BlurView intensity={dark ? 40 : 60} tint={glassTint} style={[styles.cornerGlass, { borderColor: glassEdge }]}>
            <ToolButton
              label="設定"
              color={ink}
              onPress={() => {
                setSettingsOpen(true);
                clearTimeout(hideTimer.current);
              }}
            >
              <SlidersIcon color={ink} size={18} />
            </ToolButton>
          </BlurView>
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

function ToolButton({ label, active, color, onPress, children }: { label: string; active?: boolean; color: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      style={({ pressed }) => [
        styles.tool,
        active ? { backgroundColor: color === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(17,17,20,0.12)' } : null,
        { opacity: pressed ? 0.45 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
      ]}
    >
      {children}
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
  corner: {
    position: 'absolute',
  },
  cornerGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editHint: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  editHintText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  doneButton: {
    height: 32,
    paddingHorizontal: 14,
    marginHorizontal: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
  },
  toolsShadow: {
    borderRadius: 22,
  },
  toolsGlass: {
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 3,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  tool: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
