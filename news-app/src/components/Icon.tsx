import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@theme';

// 線のアイコン（絵文字は使わない）
export type IconName =
  | 'home'
  | 'library'
  | 'people'
  | 'chat'
  | 'search'
  | 'bell'
  | 'plus'
  | 'up'
  | 'talk'
  | 'save'
  | 'saved'
  | 'down'
  | 'back'
  | 'next'
  | 'share'
  | 'more'
  | 'close'
  | 'pen'
  | 'send'
  | 'play'
  | 'link'
  | 'chevronUp';

type Props = { name: IconName; size?: number; color?: string; strokeWidth?: number };

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 1.8 }: Props) {
  const p = {
    stroke: color,
    strokeWidth,
    fill: 'none',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path {...p} d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />}
      {name === 'library' && (
        <>
          <Rect {...p} x={4} y={4} width={6.5} height={6.5} rx={1.5} />
          <Rect {...p} x={13.5} y={4} width={6.5} height={6.5} rx={1.5} />
          <Rect {...p} x={4} y={13.5} width={6.5} height={6.5} rx={1.5} />
          <Rect {...p} x={13.5} y={13.5} width={6.5} height={6.5} rx={1.5} />
        </>
      )}
      {name === 'people' && (
        <>
          <Circle {...p} cx={9} cy={9} r={3.2} />
          <Path {...p} d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6" />
          <Circle {...p} cx={17} cy={8} r={2.4} />
          <Path {...p} d="M16 13.6c2.4 0 4 1.3 4.5 3.9" />
        </>
      )}
      {(name === 'chat' || name === 'talk') && (
        <Path {...p} d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4 3.5V16H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      )}
      {name === 'search' && (
        <>
          <Circle {...p} cx={11} cy={11} r={6} />
          <Path {...p} d="M15.5 15.5L20 20" />
        </>
      )}
      {name === 'bell' && (
        <>
          <Path {...p} d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
          <Path {...p} d="M10 20.5a2 2 0 0 0 4 0" />
        </>
      )}
      {name === 'plus' && <Path {...p} d="M12 5v14M5 12h14" />}
      {name === 'up' && <Path {...p} d="M12 5l7 12H5z" />}
      {name === 'save' && <Path {...p} d="M7 4h10v16l-5-3.5L7 20z" />}
      {name === 'saved' && <Path {...p} fill={color} d="M7 4h10v16l-5-3.5L7 20z" />}
      {name === 'down' && <Path {...p} d="M6 9l6 6 6-6" />}
      {name === 'chevronUp' && <Path {...p} d="M6 15l6-6 6 6" />}
      {name === 'back' && <Path {...p} d="M15 5l-7 7 7 7" />}
      {name === 'next' && <Path {...p} d="M9 5l7 7-7 7" />}
      {name === 'share' && (
        <>
          <Path {...p} d="M12 15V4M7.5 8.5L12 4l4.5 4.5" />
          <Path {...p} d="M6 12v7h12v-7" />
        </>
      )}
      {name === 'more' && (
        <>
          <Circle cx={6} cy={12} r={1.6} fill={color} />
          <Circle cx={12} cy={12} r={1.6} fill={color} />
          <Circle cx={18} cy={12} r={1.6} fill={color} />
        </>
      )}
      {name === 'close' && <Path {...p} d="M6 6l12 12M18 6L6 18" />}
      {name === 'pen' && <Path {...p} d="M4 20h4L19 9l-4-4L4 16z" />}
      {name === 'send' && <Path {...p} d="M4 12l16-8-6 16-2.5-6.5z" />}
      {name === 'play' && <Path fill={color} d="M8 5.5v13l11-6.5z" />}
      {name === 'link' && <Path {...p} d="M8 16L16 8M10 8h6v6" />}
    </Svg>
  );
}
