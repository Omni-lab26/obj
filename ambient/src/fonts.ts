import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue/400Regular';
import { Doto_800ExtraBold } from '@expo-google-fonts/doto/800ExtraBold';
import { InstrumentSerif_400Regular } from '@expo-google-fonts/instrument-serif/400Regular';
import { JetBrainsMono_200ExtraLight } from '@expo-google-fonts/jetbrains-mono/200ExtraLight';
import { Nunito_300Light } from '@expo-google-fonts/nunito/300Light';
import { SpaceGrotesk_300Light } from '@expo-google-fonts/space-grotesk/300Light';
import { VT323_400Regular } from '@expo-google-fonts/vt323/400Regular';
import type { TextStyle } from 'react-native';

export type FontId = 'system' | 'serif' | 'rounded' | 'grotesk' | 'condensed' | 'mono' | 'dot' | 'terminal';

export type ClockFont = {
  id: FontId;
  /** Shown under the preview in settings. */
  label: string;
  /** Style for the big time digits. fontSize is for a 390pt-wide screen. */
  time: TextStyle;
  /** Seconds are drawn at this fraction of the time size. */
  secondsScale: number;
};

/** Passed to useFonts; the keys become the fontFamily names below. */
export const fontAssets = {
  BebasNeue_400Regular,
  Doto_800ExtraBold,
  InstrumentSerif_400Regular,
  JetBrainsMono_200ExtraLight,
  Nunito_300Light,
  SpaceGrotesk_300Light,
  VT323_400Regular,
};

export const clockFonts: ClockFont[] = [
  {
    id: 'system',
    label: '標準',
    time: { fontSize: 96, fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
    secondsScale: 0.34,
  },
  {
    id: 'serif',
    label: 'セリフ',
    time: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 118, letterSpacing: -2 },
    secondsScale: 0.32,
  },
  {
    id: 'rounded',
    label: 'まる',
    time: { fontFamily: 'Nunito_300Light', fontSize: 96, letterSpacing: -2 },
    secondsScale: 0.34,
  },
  {
    id: 'grotesk',
    label: 'グロテスク',
    time: { fontFamily: 'SpaceGrotesk_300Light', fontSize: 94, letterSpacing: -4 },
    secondsScale: 0.34,
  },
  {
    id: 'condensed',
    label: 'コンデンス',
    time: { fontFamily: 'BebasNeue_400Regular', fontSize: 140, letterSpacing: 0 },
    secondsScale: 0.3,
  },
  {
    id: 'mono',
    label: 'モノ',
    time: { fontFamily: 'JetBrainsMono_200ExtraLight', fontSize: 84, letterSpacing: -4 },
    secondsScale: 0.36,
  },
  {
    id: 'dot',
    label: 'ドット',
    time: { fontFamily: 'Doto_800ExtraBold', fontSize: 100, letterSpacing: -2 },
    secondsScale: 0.36,
  },
  {
    id: 'terminal',
    label: 'ターミナル',
    time: { fontFamily: 'VT323_400Regular', fontSize: 132, letterSpacing: -2 },
    secondsScale: 0.34,
  },
];

export function clockFont(id: FontId): ClockFont {
  return clockFonts.find((f) => f.id === id) ?? clockFonts[0];
}
