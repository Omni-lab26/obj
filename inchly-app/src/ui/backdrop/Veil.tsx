import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

import { useDesign } from '../../design';

// What lies between the 背景 and the page, so the page reads first and the
// koi stay a soft, slow movement behind it:
// - frost (the pages): a sheet of frosted glass over the whole 背景 — the koi
//   blurred and paled, as much as set (設定 · 背景のぼかし) — so the cards on it
//   need no blur of their own;
// - pale (the timer): the 背景 kept sharp (it's there to be looked at) but a
//   little lighter;
// - clear (眺める): nothing.

export type VeilLook = 'frost' | 'pale' | 'clear';

const web = Platform.OS === 'web';
// Android blurs only what's wrapped for it: there, a thicker white instead
const android = Platform.OS === 'android';

// the frost, as set (設定 · 背景のぼかし): none, light, normal, strong — the blur and the white over it
const BLUR = [0, web ? 22 : 20, web ? 45 : 40, web ? 75 : 70];
const WHITE = android ? [0.3, 0.48, 0.62, 0.75] : [0.12, 0.25, 0.38, 0.55];

/** still: nothing moves behind (the page is out of view), so no blur is needed, only the white. */
export function Veil({ look, still }: { look: VeilLook; still?: boolean }) {
  const frost = useDesign().frost ?? 2;
  if (look === 'clear') return null;
  if (look === 'pale') return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />;
  return (
    <>
      {android || still || !BLUR[frost] ? null : <BlurView pointerEvents="none" intensity={BLUR[frost]} tint="light" style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${WHITE[frost]})` }]} />
    </>
  );
}
