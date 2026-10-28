// The faces the timer card's big time can be drawn in (picked by holding the
// time: screens/timer/cards.tsx). size: the font size as a share of the card's
// width, so "39:17" fills about the same width in each. The files are bundled
// and loaded at start (app/_layout); until then the system face stands in.

export type TimeFont = { id: string; name: string; family: string; size: number; spacing: number };

export const TIME_FONTS: TimeFont[] = [
  { id: 'tall', name: '縦長', family: 'Anton_400Regular', size: 0.3657, spacing: -0.01 },
  { id: 'tallthin', name: '縦長・細', family: 'Oswald_300Light', size: 0.34, spacing: -0.01 },
  { id: 'thin', name: '細い', family: 'InterTight_200ExtraLight', size: 0.31, spacing: -0.04 },
  { id: 'bold', name: '太い', family: 'InterTight_800ExtraBold', size: 0.28, spacing: -0.05 },
  { id: 'round', name: '丸い', family: 'Nunito_800ExtraBold', size: 0.28, spacing: -0.02 },
  { id: 'serif', name: '明朝', family: 'InstrumentSerif_400Regular', size: 0.38, spacing: -0.02 },
  { id: 'serifbold', name: '明朝・太', family: 'DMSerifDisplay_400Regular', size: 0.3, spacing: -0.02 },
  { id: 'mono', name: '等幅', family: 'JetBrainsMono_600SemiBold', size: 0.23, spacing: -0.04 },
];

export const timeFontOf = (id?: string) => TIME_FONTS.find((f) => f.id === id) ?? TIME_FONTS[0];
