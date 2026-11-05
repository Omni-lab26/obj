// 色の役割。値は docs/design.md の表と同じにする。数値を画面に直書きしない。
export const colors = {
  bg: '#111214',
  paper: '#000000', // 記事・ジャンルのページの地
  surface: '#1C1D20',
  surface2: '#26272B',
  line: '#34363B',
  hairline: 'rgba(255,255,255,0.07)',
  text: '#F2F2F3',
  textSoft: 'rgba(242,242,243,0.88)',
  muted: '#9A9CA3',
  faint: 'rgba(242,242,243,0.5)',
  accent: '#FF6A1A',
  link: '#7CC0FF',
  tag: '#4AA3FF',
  ok: '#3DDC84',
  alert: '#FF3B30',
  alertSoft: '#FF8A80',
  note: '#2EC4B6',
  noteSoft: '#5FE0D3',
  deep: '#9B7BFF',
  deepSoft: '#C4B0FF',
  youtube: '#FF4D4D',
  glassTint: 'rgba(20,20,24,0.32)',
  glassEdge: 'rgba(255,255,255,0.18)',
  glassEdgeSoft: 'rgba(255,255,255,0.08)',
  scrim: 'rgba(0,0,0,0.4)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// グラフの系列の色（白の濃淡とオレンジ）
export const chartColors = {
  strong: 'rgba(242,242,243,0.9)',
  soft: 'rgba(242,242,243,0.3)',
  accent: '#FF6A1A',
  grid: 'rgba(255,255,255,0.08)',
} as const;
