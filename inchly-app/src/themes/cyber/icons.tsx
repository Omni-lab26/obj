import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { C } from './look';

// サイバー's icons, from its parts bible: a 24 grid, lines 2 thick with square
// ends and sharp corners, only level, upright or at 45°; closed shapes have
// their top left corner cut by 3; things, places and people carry one lit
// pixel (a window, a cursor, a keyhole), on an even grid point. The lit
// pixel is cyan as a rule; picked, the whole icon is yellow.

type Def = [stroke: string | null, lit?: [number, number, number, number][] | null, fill?: string];
const IC = {
  home: ['M3 12L12 3L21 12V21H3Z M10 21V15H14V21', [[11, 9, 2, 2]]],
  feed: ['M6 4H21V16H11L7 20V16H3V7Z M7 8H17 M7 12H11', [[13, 11, 2, 2]]],
  study: ['M9 2H15L19 6V11L15 15H9L5 11V6Z M12 5V9H15 M2 20H22 M5 20V17 M19 20V17', [[11, 17, 2, 2]]],
  users: ['M1 5V1H5 M19 1H23V5 M23 19V23H19 M5 23H1V19 M8 6H11L12 7V10L11 11H8L7 10V7Z M4 20V17L6 15H13L15 17V20 M16 4H18L19 5V7L18 8H16L15 7V5Z M16 11H18L20 13V16', [[9, 17, 2, 2]]],
  user: ['M11 2H16V9H8V5Z M4 21V16L6 14H18L20 16V21', [[11, 17, 2, 2]]],
  search: ['M7 3H13L17 7V13L13 17H7L3 13V7Z M16 16L21 21', [[7, 7, 2, 2]]],
  bell: ['M6 18V10L10 6H14L18 10V18L20 20H4Z', [[11, 21, 2, 2]]],
  chat: ['M6 4H21V16H9L5 20V16H3V7Z', [[7, 8, 2, 4]]],
  gear: ['M9 4H15L20 9V15L15 20H9L4 15V9Z M10 4V1H14V4 M20 10H23V14H20 M14 20V23H10V20 M4 14H1V10H4', [[10, 10, 4, 4]]],
  edit: ['M4 20V16L15 5L19 9L8 20Z M13 7L17 11', [[19, 1, 2, 2]]],
  check: ['M4 12L9 17L20 6'],
  play: [null, null, 'M6 3L15 12L6 21Z'],
  pause: [null, null, 'M6 5H10V19H6Z M14 5H18V19H14Z'],
  plus: ['M12 4V20 M4 12H20'],
  x: ['M5 5L19 19 M19 5L5 19'],
  heart: ['M12 20L3 11V7L7 3H9L12 6L15 3H17L21 7V11Z', [[7, 7, 2, 2]]],
  flag: ['M4 22V4 M4 4H19L15 8L19 12H4', [[3, 1, 2, 2]]],
  cal: ['M6 5H21V21H3V8Z M3 10H21 M8 3V7 M16 3V7', [[15, 15, 2, 2]]],
  chev: ['M9 4L17 12L9 20'],
  sort: ['M8 3V21 M4 7L8 3L12 7 M16 21V3 M12 17L16 21L20 17'],
  book: ['M6 4H10L12 6L14 4H21V19H14L12 21L10 19H3V7Z M12 6V21', [[15, 3, 2, 6]]],
  lock: ['M8 10H19V21H5V13Z M8 10V6L11 3H13L16 6V10', [[11, 14, 2, 4]]],
  ticket: ['M6 6H21V10L19 12L21 14V18H3V14L5 12L3 10V9Z M9 6V8 M9 11V13 M9 16V18', [[13, 11, 2, 2]]],
  signal: [null, [[17, 4, 3, 16]], 'M4 16H7V20H4Z M8.5 12H11.5V20H8.5Z M13 8H16V20H13Z'],
} satisfies Record<string, Def>;
export type CIconName = keyof typeof IC;

/** One of サイバー's icons. accent: the lit pixel (cyan unless given; the icon's own color when picked). filled: a closed shape filled in (a favorite's heart). */
export function CIcon({ name, size = 22, color = C.t1, accent = C.c, filled }: { name: CIconName; size?: number; color?: string; accent?: string; filled?: boolean }) {
  const [d, lit, fill] = IC[name] as Def;
  // in a view of its own, so it's drawn over a panel's shape on the web too
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {d ? <Path d={d} fill={filled ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter" /> : null}
        {fill ? <Path d={fill} fill={color} /> : null}
        {(lit ?? []).map(([x, y, w, h]) => <Rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} fill={accent} />)}
      </Svg>
    </View>
  );
}
