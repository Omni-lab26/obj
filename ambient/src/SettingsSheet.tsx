import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { clockFonts } from './fonts';
import { CheckIcon } from './icons';
import { useSettings } from './settings';

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
        sheet: 'rgba(28,28,30,0.74)',
        group: 'rgba(255,255,255,0.08)',
        label: '#ffffff',
        secondary: 'rgba(235,235,245,0.6)',
        separator: 'rgba(84,84,88,0.55)',
        accent: '#0A84FF',
        track: 'rgba(120,120,128,0.36)',
        blur: 'systemChromeMaterialDark' as const,
      }
    : {
        sheet: 'rgba(242,242,247,0.82)',
        group: 'rgba(255,255,255,0.9)',
        label: '#000000',
        secondary: 'rgba(60,60,67,0.6)',
        separator: 'rgba(60,60,67,0.22)',
        accent: '#007AFF',
        track: 'rgba(120,120,128,0.2)',
        blur: 'systemChromeMaterialLight' as const,
      };
}

export function SettingsSheet({ open, onClose, tone, credit }: Props) {
  const { settings, update } = useSettings();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const c = palette(tone);
  const [progress] = useState(() => new Animated.Value(0));
  // The sheet stays mounted while it slides away after being closed.
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
  }
  const mounted = open || closing;

  useEffect(() => {
    if (open) {
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 2 }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => finished && setClosing(false));
    }
  }, [open, progress]);

  // The slider stays uncontrolled while the sheet is open so dragging never fights props.
  const initialDigital = useMemo(() => settings.digital, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const setClock = (patch: Partial<typeof settings.clock>) =>
    update((s) => ({ ...s, clock: { ...s.clock, ...patch } }));

  const sheetHeight = Math.min(height * 0.78, 640);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [sheetHeight + 40, 0] });

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="設定を閉じる" />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { height: sheetHeight, width: Math.min(width, 560), transform: [{ translateY }] },
        ]}
      >
        <BlurView intensity={80} tint={c.blur} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.sheet }]} />

        <View style={styles.grabber}>
          <View style={[styles.grabberBar, { backgroundColor: c.secondary }]} />
        </View>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.label }]}>設定</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.done} accessibilityRole="button">
            <Text style={[styles.doneText, { color: c.accent }]}>完了</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}
          showsVerticalScrollIndicator={false}
        >
          <SectionTitle color={c.secondary}>時計</SectionTitle>
          <Group color={c.group}>
            <ToggleRow label="時計を表示" value={settings.clock.visible} onChange={(v) => setClock({ visible: v })} c={c} />
            <ToggleRow label="日付" value={settings.clock.date} onChange={(v) => setClock({ date: v })} c={c} />
            <ToggleRow label="秒" value={settings.clock.seconds} onChange={(v) => setClock({ seconds: v })} c={c} />
            <ToggleRow label="24時間表示" value={settings.clock.hour24} onChange={(v) => setClock({ hour24: v })} c={c} last />
          </Group>

          <SectionTitle color={c.secondary}>フォント</SectionTitle>
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
                    styles.fontCard,
                    {
                      backgroundColor: c.group,
                      borderColor: selected ? c.accent : 'transparent',
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      f.time,
                      {
                        fontSize: (f.time.fontSize ?? 96) * 0.36,
                        letterSpacing: (f.time.letterSpacing ?? 0) * 0.36,
                        color: c.label,
                        includeFontPadding: false,
                      },
                    ]}
                  >
                    9:41
                  </Text>
                  <Text style={[styles.fontLabel, { color: selected ? c.accent : c.secondary }]}>{f.label}</Text>
                  {selected && (
                    <View style={[styles.badge, { backgroundColor: c.accent }]}>
                      <CheckIcon color="#fff" size={10} />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
          <Footnote color={c.secondary}>画面のどこかを長押しすると、いつでも時計を出したり隠したりできます。</Footnote>

          <View style={styles.sectionRow}>
            <SectionTitle color={c.secondary}>デジタルレイヤー</SectionTitle>
            <Text style={[styles.value, { color: c.secondary }]}>{Math.round(settings.digital * 100)}%</Text>
          </View>
          <Group color={c.group}>
            <View style={styles.sliderRow}>
              <Text style={[styles.sliderEnd, { color: c.label }]}>素</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={initialDigital}
                onValueChange={(v) => update((s) => ({ ...s, digital: v }))}
                minimumTrackTintColor={c.accent}
                maximumTrackTintColor={c.track}
                accessibilityLabel="デジタルレイヤーの強さ"
              />
              <Text style={[styles.sliderEnd, { color: c.label }]}>デジタル</Text>
            </View>
          </Group>
          <Footnote color={c.secondary}>
            写真の背景にかける加工の強さです。左端は元の写真そのまま、右に行くほど文字・網点・ドットなどのデジタル表現が強くなります。
          </Footnote>
          {credit ? <Footnote color={c.secondary}>いまの背景の写真: {credit}</Footnote> : null}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

type Colors = ReturnType<typeof palette>;

function SectionTitle({ children, color }: { children: ReactNode; color: string }) {
  return <Text style={[styles.section, { color }]}>{children}</Text>;
}

function Footnote({ children, color }: { children: ReactNode; color: string }) {
  return <Text style={[styles.footnote, { color }]}>{children}</Text>;
}

function Group({ children, color }: { children: ReactNode; color: string }) {
  return <View style={[styles.group, { backgroundColor: color }]}>{children}</View>;
}

function ToggleRow({
  label,
  value,
  onChange,
  c,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  c: Colors;
  last?: boolean;
}) {
  return (
    <View style={styles.rowWrap}>
      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: c.label }]}>{label}</Text>
        <Switch value={value} onValueChange={onChange} accessibilityLabel={label} />
      </View>
      {!last && <View style={[styles.separator, { backgroundColor: c.separator }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  grabber: {
    alignItems: 'center',
    paddingTop: 8,
  },
  grabberBar: {
    width: 36,
    height: 5,
    borderRadius: 3,
    opacity: 0.5,
  },
  header: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  done: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  doneText: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0,
  },
  section: {
    fontSize: 13,
    letterSpacing: 0,
    marginTop: 22,
    marginBottom: 7,
    marginLeft: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: 13,
    marginBottom: 7,
    marginRight: 16,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0,
    marginTop: 8,
    marginHorizontal: 16,
  },
  group: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowWrap: {
    paddingLeft: 16,
  },
  row: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 14,
  },
  rowLabel: {
    fontSize: 16,
    letterSpacing: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  fonts: {
    gap: 10,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  fontCard: {
    width: 104,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fontLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    minHeight: 54,
    gap: 8,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderEnd: {
    fontSize: 14,
    letterSpacing: 0,
  },
});
