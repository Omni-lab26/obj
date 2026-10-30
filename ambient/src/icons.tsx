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

/** A pen: move the digits. */
export function PenIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M13.6 3.4a1.9 1.9 0 0 1 2.7 0l.3.3a1.9 1.9 0 0 1 0 2.7L7.4 15.6 3.5 16.5l.9-3.9 9.2-9.2Z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="m12 5 3 3" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

/** Two arrows pulling apart corner to corner: make the digits bigger or smaller. */
export function ResizeIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M11.5 3.5h5v5M8.5 16.5h-5v-5M16.5 3.5l-5 5M3.5 16.5l5-5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** An arrow coming round: back to how it was. */
export function UndoIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path d="M4.5 8.5a6 6 0 1 1 1.3 6.2" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M4 4v4.5h4.5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A cross: close. */
export function CloseIcon({ color, size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path d="m3.5 3.5 9 9m0-9-9 9" stroke={color} strokeWidth={1.7} strokeLinecap="round" />
    </Svg>
  );
}
