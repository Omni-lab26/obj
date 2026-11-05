import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@theme';

// 上に短く出る知らせ。どこからでも toast('…') で出せる。
let show: ((s: string) => void) | null = null;
export const toast = (s: string) => show?.(s);

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<{ s: string; k: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    show = (s) => {
      setMsg({ s, k: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 1900);
    };
    return () => {
      show = null;
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <Animated.View
      key={msg.k}
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(200)}
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 8 }]}>
      <Text style={styles.t}>{msg.s}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(40,41,46,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  t: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
});
