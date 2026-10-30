import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clockFonts } from './fonts';
import { CloseIcon } from './icons';
import { scenes } from './scenes';
import { useSettings } from './settings';

// Settings in the app's own manner rather than a system list: the scene stays behind
// frosted glass, each group is a card, a choice that is on is filled with ink, and the
// fonts are shown as the digits themselves. It opens from the button at the top
// right, and the close button takes that button's place.

// The digital layer only acts on photo backgrounds; without any, its setting is hidden.
const hasPhotos = scenes.some((s) => s.kind === 'photo');

type Props = {
  open: boolean;
  onClose: () => void;
  tone: 'dark' | 'light';
  /** Credit of the photo behind the sheet, when the current background is a photo. */
  credit?: string;
};

function palette(tone: 'dark' | 'light') {
  return tone === 'dark'
    ? {
        veil: 'rgba(8,8,10,0.5)',
        ink: '#ffffff',
        onInk: '#0b0b0e',
        soft: 'rgba(255,255,255,0.72)',
        faint: 'rgba(255,255,255,0.45)',
        card: 'rgba(30,30,34,0.72)',
        tile: 'rgba(255,255,255,0.08)',
        track: 'rgba(255,255,255,0.25)',
        glass: 'dark' as const,
      }
    : {
        veil: 'rgba(250,250,248,0.45)',
        ink: '#0b0b0e',
        onInk: '#ffffff',
        soft: 'rgba(11,11,14,0.7)',
        faint: 'rgba(11,11,14,0.45)',
        card: 'rgba(255,255,255,0.82)',
        tile: 'rgba(11,11,14,0.06)',
        track: 'rgba(11,11,14,0.2)',
        glass: 'light' as const,
      };
}
type Colors = ReturnType<typeof palette>;

const tick = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

export function SettingsSheet({ open, onClose, tone, credit }: Props) {
  const { settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const c = palette(tone);
  const [progress] = useState(() => new Animated.Value(0));
  // The page stays mounted while it fades away after being closed.
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
  }
  const mounted = open || closing;

  useEffect(() => {
    if (open) {
      Animated.timing(progress, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(
        ({ finished }) => finished && setClosing(false)
      );
    }
  }, [open, progress]);

  // The slider stays uncontrolled while the page is open so dragging never fights props.
  const initialDigital = useMemo(() => settings.digital, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setClock = (patch: Partial<typeof settings.clock>) => {
    tick();
    update((s) => ({ ...s, clock: { ...s.clock, ...patch } }));
  };

  const rise = progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const top = Math.max(insets.top, 12) + 10;

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurView intensity={60} tint={c.glass} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.veil }]} />

        <Animated.View style={[styles.page, { transform: [{ translateY: rise }] }]}>
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: top + 2, paddingBottom: insets.bottom + 36 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: c.ink }]}>設定</Text>

            <Card title="表示" c={c}>
              <View style={styles.tiles}>
                <Toggle label="時計" note="中央に出す" on={settings.clock.visible} onChange={(v) => setClock({ visible: v })} c={c} />
                <Toggle label="日付" note="時計の上に" on={settings.clock.date} onChange={(v) => setClock({ date: v })} c={c} />
                <Toggle label="24時間" note="午後も13時から" on={settings.clock.hour24} onChange={(v) => setClock({ hour24: v })} c={c} />
                <Toggle label="秒" note="時計だけ" on={settings.clock.seconds} onChange={(v) => setClock({ seconds: v })} c={c} />
              </View>
              <Text style={[styles.note, { color: c.faint }]}>画面のどこかを長押しすると、いつでも時計を出したり隠したりできます。</Text>
            </Card>

            <Card title="フォント" c={c}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fonts}>
                {clockFonts.map((f) => {
                  const selected = settings.clock.font === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setClock({ font: f.id, visible: true })}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`フォント ${f.label}`}
                      style={({ pressed }) => [
                        styles.font,
                        { backgroundColor: selected ? c.ink : c.tile },
                        { transform: [{ scale: pressed ? 0.96 : 1 }] },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          f.time,
                          {
                            fontSize: (f.time.fontSize ?? 96) * 0.4,
                            letterSpacing: (f.time.letterSpacing ?? 0) * 0.4,
                            color: selected ? c.onInk : c.ink,
                            includeFontPadding: false,
                          },
                        ]}
                      >
                        12:34
                      </Text>
                      <Text style={[styles.fontLabel, { color: selected ? c.onInk : c.soft }]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>

            {hasPhotos ? (
              <Card title="デジタルレイヤー" value={`${Math.round(settings.digital * 100)}%`} c={c}>
                <View style={[styles.slab, { backgroundColor: c.tile }]}>
                  <Text style={[styles.end, { color: c.ink }]}>素</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    value={initialDigital}
                    onValueChange={(v) => update((s) => ({ ...s, digital: v }))}
                    minimumTrackTintColor={c.ink}
                    maximumTrackTintColor={c.track}
                    thumbTintColor={c.ink}
                    accessibilityLabel="デジタルレイヤーの強さ"
                  />
                  <Text style={[styles.end, { color: c.ink }]}>デジタル</Text>
                </View>
                <Text style={[styles.note, { color: c.faint }]}>
                  写真の背景にかける加工の強さ。左端は元の写真そのまま、右に行くほど文字・網点・ドットなどのデジタル表現が強くなります。
                </Text>
              </Card>
            ) : null}
            {credit ? <Text style={[styles.note, styles.credit, { color: c.soft }]}>いまの背景の写真: {credit}</Text> : null}
          </ScrollView>
        </Animated.View>

        {/* Where the settings button was. */}
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="設定を閉じる"
          style={({ pressed }) => [
            styles.close,
            { top, right: Math.max(insets.right, 12) + 4, backgroundColor: c.card },
            { opacity: pressed ? 0.5 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
        >
          <CloseIcon color={c.ink} />
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function Card({ title, value, c, children }: { title: string; value?: string; c: Colors; children: ReactNode }) {
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardTitle, { color: c.ink }]}>{title}</Text>
        {value ? <Text style={[styles.cardValue, { color: c.soft }]}>{value}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A tile that fills with ink when on: a dot, the label and a short note. */
function Toggle({ label, note, on, onChange, c }: { label: string; note: string; on: boolean; onChange: (v: boolean) => void; c: Colors }) {
  const fg = on ? c.onInk : c.ink;
  return (
    <Pressable
      onPress={() => onChange(!on)}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.tile, { backgroundColor: on ? c.ink : c.tile }, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.dot, { borderColor: on ? c.onInk : c.faint, backgroundColor: on ? c.onInk : 'transparent' }]} />
      <View style={styles.tileText}>
        <Text style={[styles.tileLabel, { color: fg }]}>{label}</Text>
        <Text style={[styles.tileNote, { color: on ? c.onInk : c.faint, opacity: on ? 0.7 : 1 }]} numberOfLines={1}>
          {on ? note : 'オフ'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  title: {
    fontSize: 32,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: 0,
    marginBottom: 6,
    // (Clear of the close button at the right.)
    marginRight: 56,
  },
  card: {
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 62,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  tileText: {
    flex: 1,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0,
  },
  tileNote: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },
  fonts: {
    gap: 8,
  },
  font: {
    width: 108,
    height: 92,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  fontLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
  },
  slab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  end: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0,
  },
  note: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0,
  },
  credit: {
    marginTop: 18,
    marginHorizontal: 6,
  },
  close: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
