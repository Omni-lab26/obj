import { Image, StyleSheet, View } from 'react-native';

import type { Texture } from '../design';

// The theme's texture (canvas weave, scan lines, pixels, polka dots, the paper's faint dots), tiled
// behind content. Absolutely placed and untouchable, so it never moves or
// blocks anything.
const TILES: Record<Texture, number> = {
  oil: require('../../assets/textures/oil.png'),
  'oil-dark': require('../../assets/textures/oil-dark.png'),
  scan: require('../../assets/textures/scan.png'),
  'scan-dark': require('../../assets/textures/scan-dark.png'),
  pixel: require('../../assets/textures/pixel.png'),
  'pixel-dark': require('../../assets/textures/pixel-dark.png'),
  'dots-pink': require('../../assets/textures/dots-pink.png'),
  'dots-brown': require('../../assets/textures/dots-brown.png'),
  'dots-blue': require('../../assets/textures/dots-blue.png'),
  'dots-paper': require('../../assets/textures/dots-paper.png'),
  splat: require('../../assets/textures/splat.png'),
  warp: require('../../assets/textures/warp.png'),
  riso: require('../../assets/textures/riso.png'),
};
/** White halftone dots, tiled over a colored fill (the ガリ版 theme's bars). */
export const HALFTONE: number = require('../../assets/textures/halftone.png');

export function TextureFill({ texture, radius = 0, opacity = 1 }: { texture: Texture | null; radius?: number; opacity?: number }) {
  if (!texture) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden', opacity }]}>
      {/* sized as well as placed: on the web an image with only its edges set keeps its own size and tiles once */}
      <Image source={TILES[texture]} resizeMode="repeat" style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} />
    </View>
  );
}
