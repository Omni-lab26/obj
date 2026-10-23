import { Text, TextProps, TextStyle } from 'react-native';

import { BundledFace, bundledFace, face, useT } from '@/theme';

// Small things every theme app needs. A theme app's own pieces live in its
// folder (src/themes/<id>/); what it shows and does comes from
// src/screens/model.ts, so it only decides how things look.

type TProps = TextProps & {
  /** a bundled face (theme.ts BUNDLED); the theme's face at this size until it has loaded, or when not given */
  f?: BundledFace;
  size?: number; color?: string;
  /** weight, for the system face only (a bundled face is one weight) */
  w?: TextStyle['fontWeight'];
  lh?: number; ls?: number; upper?: boolean; num?: boolean;
};
/** Text in the face a theme app names. */
export function T({ f, size = 14, color, w, lh, ls, upper, num, style, ...rest }: TProps) {
  const t = useT(); // renders again when the faces arrive
  const named = f ? bundledFace(f) : undefined;
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: named ?? face(size), fontSize: size, color: color ?? t.ink, lineHeight: lh ?? Math.round(size * 1.3), letterSpacing: ls },
        upper && { textTransform: 'uppercase' },
        num && { fontVariant: ['tabular-nums'] },
        !named && w ? { fontWeight: w } : null,
        style,
      ]}
    />
  );
}
