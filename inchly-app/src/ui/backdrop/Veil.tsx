import { StyleSheet, View } from 'react-native';

import { useDesign } from '../../design';

// What lies between the 背景 and the page, so the page reads first and the
// koi stay a soft, slow movement behind it:
// - frost (the pages): a white film. The blur is in the drawing itself (the
//   engine's soft picture: shared.ts), as much as set (設定 · 背景のぼかし),
//   so nothing blurs the screen live — the costly way it used to be done;
// - pale (the timer): the 背景 kept sharp (it's there to be looked at) but a
//   little lighter;
// - clear (眺める): nothing.

export type VeilLook = 'frost' | 'pale' | 'clear';

// the white over the pages, by 背景のぼかし: off, light, normal, strong
const WHITE = [0.12, 0.26, 0.4, 0.54];

export function Veil({ look }: { look: VeilLook }) {
  const frost = useDesign().frost ?? 2;
  if (look === 'clear') return null;
  const white = look === 'pale' ? 0.3 : WHITE[frost];
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,255,255,${white})` }]} />;
}
