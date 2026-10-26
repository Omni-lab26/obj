import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';

// What lies between the 背景 and the page, so the page reads first and the
// koi stay a soft, slow movement behind it:
// - frost (the pages): a sheet of frosted glass over the whole 背景 — the koi
//   blurred and paled — so the cards on it need no blur of their own;
// - pale (the timer): the 背景 kept sharp (it's there to be looked at) but a
//   little lighter;
// - clear (眺める): nothing.

export type VeilLook = 'frost' | 'pale' | 'clear';

const web = Platform.OS === 'web';
// Android blurs only what's wrapped for it: there, a thicker white instead
const android = Platform.OS === 'android';

/** still: nothing moves behind (the page is out of view), so no blur is needed, only the white. */
export function Veil({ look, still }: { look: VeilLook; still?: boolean }) {
  if (look === 'clear') return null;
  if (look === 'pale') return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />;
  return (
    <>
      {android || still ? null : <BlurView pointerEvents="none" intensity={web ? 45 : 40} tint="light" style={StyleSheet.absoluteFill} />}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${android ? 0.62 : 0.38})` }]} />
    </>
  );
}
