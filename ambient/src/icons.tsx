import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function ChevronIcon({ color, size = 16, direction }: IconProps & { direction: 1 | -1 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d={direction === 1 ? 'm6 3 5 5-5 5' : 'M10 3 5 8l5 5'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three sliders, the SF Symbol "slider.horizontal.3" idea. */
export function SlidersIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M3 5h14M3 10h14M3 15h14" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={7} cy={5} r={2.2} fill={color} />
      <Circle cx={13} cy={10} r={2.2} fill={color} />
      <Circle cx={8.5} cy={15} r={2.2} fill={color} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 14 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <Path d="m3 7.4 2.6 2.6L11 4.4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
