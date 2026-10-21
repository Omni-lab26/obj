import { useColorScheme } from 'react-native';
import { Easing } from 'react-native-reanimated';

// Two surface levels (canvas grey, white), hairlines instead of shadows,
// green reserved for "studied": records, progress, the start action.
const light = {
  canvas: '#F3F3F1',
  surface: '#FFFFFF',
  sunken: '#ECECE9',
  line: 'rgba(23,24,26,0.09)',
  line2: 'rgba(23,24,26,0.16)',
  ink: '#17181A',
  ink2: '#55585E',
  ink3: '#8C8F95',
  onInk: '#FFFFFF',
  green: '#15985A',
  greenInk: '#0E7A46',
  greenSoft: '#E2F3E9',
  amber: '#C7741A',
  amberSoft: '#FBEEDD',
  red: '#D9434A',
  redSoft: '#FBE6E6',
  blue: '#3567D6',
  grass: ['#E7E8E5', '#B4E2C4', '#68C78E', '#2EA463', '#157A46'],
  scrim: 'rgba(10,11,12,0.32)',
  dark: false,
};

const dark: typeof light = {
  canvas: '#111213',
  surface: '#1A1B1D',
  sunken: '#232427',
  line: 'rgba(255,255,255,0.08)',
  line2: 'rgba(255,255,255,0.15)',
  ink: '#ECEDEE',
  ink2: '#A9ACB1',
  ink3: '#73767C',
  onInk: '#111213',
  green: '#2DBE73',
  greenInk: '#4ED48C',
  greenSoft: '#16301F',
  amber: '#E89A45',
  amberSoft: '#33261A',
  red: '#F0676C',
  redSoft: '#3A1F21',
  blue: '#6E95F0',
  grass: ['#25272A', '#1B4D31', '#1F7A47', '#2EA463', '#56D68F'],
  scrim: 'rgba(0,0,0,0.5)',
  dark: true,
};

export type Theme = typeof light;

export function useT(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

// The focus timer is always dark, whatever the system setting.
export const focus = {
  bg: '#0F1110',
  ink: '#F2F3F1',
  ink2: 'rgba(242,243,241,0.62)',
  ink3: 'rgba(242,243,241,0.38)',
  line: 'rgba(255,255,255,0.08)',
  raise: 'rgba(255,255,255,0.08)',
  green: '#2EC471',
};

// Japanese text uses the system face (falls back to Hiragino Sans on iOS); numbers use Inter.
export const font = {
  ui: undefined as string | undefined,
  num: 'Inter_500Medium',
  num6: 'Inter_600SemiBold',
  num7: 'Inter_700Bold',
};

// Motion measured on bencho.dev: press = .2s (.3,.9,.4,1), springy round buttons = .24s (.28,1.3,.36,1).
export const ease = {
  press: Easing.bezier(0.3, 0.9, 0.4, 1),
  spring: Easing.bezier(0.28, 1.3, 0.36, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
};

export const hairline = 1;
