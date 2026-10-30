import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration } from './timers';

type Props = {
  saves: (number | null)[];
  /** The length on the rulers now (ms): its slot, if saved, is marked. */
  dial: number;
  ink: string;
  inkSoft: string;
  onSave: (i: number) => void;
  onLoad: (i: number) => void;
  onDelete: (i: number) => void;
};

/** Five slots under the timer's rulers: tap an empty one to keep the length set now,
 *  a full one to set it again; hold a full one to empty it. */
export function TimerSaves({ saves, dial, ink, inkSoft, onSave, onLoad, onDelete }: Props) {
  return (
    <View style={styles.row}>
      {saves.map((ms, i) => {
        const on = ms != null && ms === dial;
        return (
          <Pressable
            key={i}
            onPress={() => (ms == null ? onSave(i) : onLoad(i))}
            onLongPress={ms == null ? undefined : () => onDelete(i)}
            delayLongPress={450}
            accessibilityRole="button"
            accessibilityLabel={ms == null ? `保存 ${i + 1}: 空き` : `保存 ${i + 1}: ${formatDuration(ms)}`}
            accessibilityHint={ms == null ? 'いまの時間を保存' : 'この時間にする・長押しで削除'}
            style={({ pressed }) => [
              styles.slot,
              ms == null ? [styles.empty, { borderColor: inkSoft }] : { backgroundColor: on ? ink : 'rgba(127,127,127,0.16)' },
              { opacity: pressed ? 0.55 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.text, { color: ms == null ? inkSoft : on ? (ink === '#ffffff' ? '#0b0b0e' : '#ffffff') : ink }]}
            >
              {ms == null ? '＋' : formatDuration(ms)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 6,
  },
  slot: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    fontVariant: ['tabular-nums'],
  },
});
