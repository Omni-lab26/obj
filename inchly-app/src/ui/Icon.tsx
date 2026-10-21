import { SFSymbol, SymbolView } from 'expo-symbols';
import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// 24px line icons, same geometry as the HTML mock.
type El = ['p', string] | ['c', number, number, number] | ['r', number, number, number, number, number];
type Spec = { els: El[]; fill?: boolean; w?: number };

const ICONS = {
  back: { els: [['p', 'M15 5l-7 7 7 7']], w: 2 },
  search: { els: [['c', 11, 11, 6.5], ['p', 'M16 16l4.5 4.5']], w: 1.9 },
  bell: { els: [['p', 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z'], ['p', 'M10 20.5a2 2 0 0 0 4 0']] },
  play: { els: [['p', 'M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z']], fill: true },
  pause: { els: [['r', 6, 5, 4.2, 14, 1.3], ['r', 13.8, 5, 4.2, 14, 1.3]], fill: true },
  stop: { els: [['r', 7, 7, 10, 10, 2.2]], fill: true },
  check: { els: [['p', 'M5 12.5l4.5 4.5L19 7.5']], w: 2.6 },
  arrow: { els: [['p', 'M5 12h14M13 6l6 6-6 6']], w: 2.2 },
  chev: { els: [['p', 'M9 6l6 6-6 6']], w: 2 },
  x: { els: [['p', 'M6 6l12 12M18 6L6 18']], w: 2.4 },
  clock: { els: [['c', 12, 12, 8], ['p', 'M12 8v4l2.5 2']] },
  flag: { els: [['p', 'M5 21V4M5 4h11l-2 4 2 4H5']] },
  userPlus: { els: [['c', 9, 8.5, 3.2], ['p', 'M3.5 19.5c.4-3.2 2.7-5.2 5.5-5.2s5.1 2 5.5 5.2'], ['p', 'M17 8v6M14 11h6']] },
  users: { els: [['c', 9, 8.5, 3.2], ['p', 'M3.5 19.5c.4-3.2 2.7-5.2 5.5-5.2s5.1 2 5.5 5.2'], ['c', 17, 9.5, 2.4], ['p', 'M16.5 14.4c2.2.2 3.7 1.8 4 4.1']] },
  user: { els: [['c', 12, 8.5, 3.8], ['p', 'M4.5 20c.6-3.9 3.7-6.2 7.5-6.2s6.9 2.3 7.5 6.2']] },
  home: { els: [['p', 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z']] },
  bars: { els: [['p', 'M5 20V12M10 20V6M15 20v-9M20 20V9']] },
  cal: { els: [['r', 4, 5, 16, 15, 3], ['p', 'M4 10h16M8 3v4M16 3v4']] },
  bulb: { els: [['p', 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z']] },
  chat: { els: [['p', 'M4 5h16v11H9l-5 4z']] },
  send: { els: [['p', 'M4 11.2 19.2 4.4c.7-.3 1.4.4 1.1 1.1L13.5 20.7c-.3.7-1.3.6-1.5-.1l-1.6-5.9-5.9-1.6c-.7-.2-.8-1.2-.1-1.5z']], fill: true },
  q: { els: [['p', 'M9.2 9a3 3 0 1 1 4.3 2.7c-.9.4-1.5 1.1-1.5 2.1V15'], ['p', 'M12 18.3v.4']], w: 1.9 },
  target: { els: [['c', 12, 12, 8], ['c', 12, 12, 4]] },
  book: { els: [['p', 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5']] },
  sun: { els: [['c', 12, 12, 4], ['p', 'M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4']] },
  cert: { els: [['c', 12, 9, 5], ['p', 'M8.5 13l-1.5 8 5-3 5 3-1.5-8']] },
  heart: { els: [['p', 'M12 20s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.7-7 10-7 10z']] },
  pin: { els: [['p', 'M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z'], ['c', 12, 9.5, 2.5]] },
  note: { els: [['r', 5, 3, 14, 18, 2.5], ['p', 'M8.5 8h7M8.5 12h7M8.5 16h4']] },
  share: { els: [['p', 'M12 15V4M8 8l4-4 4 4'], ['p', 'M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12']] },
  plus: { els: [['p', 'M12 5v14M5 12h14']], w: 2.2 },
  minus: { els: [['p', 'M5 12h14']], w: 2.2 },
  edit: { els: [['p', 'M4 20h4L19 9l-4-4L4 16z']] },
  gear: { els: [['c', 12, 12, 3], ['p', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z']] },
} satisfies Record<string, Spec>;

export type IconName = keyof typeof ICONS;

// On iPhone these are the real SF Symbols (expo-symbols); elsewhere the line
// drawings above, drawn to the same shapes. `filled` = the .fill variant
// (selected tabs).
const SF: Record<IconName, string> = {
  back: 'chevron.left', search: 'magnifyingglass', bell: 'bell', play: 'play.fill', pause: 'pause.fill', stop: 'stop.fill',
  check: 'checkmark', arrow: 'arrow.right', chev: 'chevron.right', x: 'xmark', clock: 'clock', flag: 'flag',
  userPlus: 'person.badge.plus', users: 'person.2', user: 'person', home: 'house', bars: 'chart.bar', cal: 'calendar',
  bulb: 'lightbulb', chat: 'bubble.left', send: 'arrow.up', q: 'questionmark', target: 'target', book: 'book',
  sun: 'sun.max', cert: 'rosette', heart: 'heart', pin: 'mappin', note: 'note.text', share: 'square.and.arrow.up',
  plus: 'plus', minus: 'minus', edit: 'pencil', gear: 'gearshape',
};
const HAS_FILL = new Set<IconName>(['bell', 'flag', 'users', 'user', 'home', 'bars', 'bulb', 'chat', 'book', 'heart', 'gear', 'cal', 'clock', 'note']);

export function Icon({ name, size = 22, color, width, filled }: { name: IconName; size?: number; color: string; width?: number; filled?: boolean }) {
  const spec: Spec = ICONS[name];
  const sw = width ?? spec.w ?? 1.6;
  if (Platform.OS === 'ios') {
    const sym = SF[name] + (filled && HAS_FILL.has(name) && name !== 'cal' && name !== 'clock' ? '.fill' : '');
    const weight = sw >= 2.4 ? 'bold' : sw >= 2 ? 'semibold' : sw >= 1.8 ? 'medium' : 'regular';
    return <SymbolView name={sym as SFSymbol} size={size * 0.92} tintColor={color} weight={weight} style={{ width: size, height: size }} />;
  }
  const solid = spec.fill || (filled && HAS_FILL.has(name) && name !== 'cal' && name !== 'clock');
  const fill = solid ? color : 'none';
  const stroke = spec.fill ? 'none' : color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {spec.els.map((e, i) => {
        const common = { fill, stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        if (e[0] === 'p') return <Path key={i} d={e[1]} {...common} />;
        if (e[0] === 'c') return <Circle key={i} cx={e[1]} cy={e[2]} r={e[3]} {...common} />;
        return <Rect key={i} x={e[1]} y={e[2]} width={e[3]} height={e[4]} rx={e[5]} {...common} />;
      })}
    </Svg>
  );
}
