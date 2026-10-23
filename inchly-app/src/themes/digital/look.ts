import { themeId, useDesign } from '@/design';
import { Theme, useT } from '@/theme';

// デジタル is one app in three finishes: a grey-green reflective LCD (lcd),
// green phosphor on black (terminal) and a night display in cyan and magenta
// (cyber). The page colors come from the theme (useT); what a device adds —
// the segments, the ghost of unlit ones, the keys, the plastic of the body,
// the window of the stopwatch — is set here, per finish.

type Key = { face: string; faceOn: string; base: string; edge: string; ink: string };
export type Finish = {
  /** lit segments and their unlit ghosts; glow: phosphor that bleeds */
  seg: string; ghost: string; glow: boolean;
  /** alarms, the session under way, over target; and text on it */
  accent: string; onAccent: string;
  /** unlit dots of the dot-matrix log (never green: charts aren't) */
  dotOff: string;
  /** a display panel's recess */
  inset: string;
  /** the device's plastic (tab bar, timer) and the text printed on it */
  body: string; bodyInk: string; bodyInk2: string; bodyInk3: string;
  /** the stopwatch's display window, set in the body */
  win: { bg: string; seg: string; ghost: string; ink: string; ink2: string; edge: string };
  key: Key; keyAccent: Key;
  /** the marquee band */
  band: { bg: string; ink: string };
  /** labels: the face, and how they're written ('TODAY', '> today', '◢ TODAY') */
  labelFace: 'label' | 'plex'; prefix: string; lower: boolean;
};

const FINISH: Record<'lcd' | 'terminal' | 'cyber', Finish> = {
  lcd: {
    seg: '#1F2A16', ghost: 'rgba(31,42,22,0.075)', glow: false,
    accent: '#C2410C', onAccent: '#FFF4EC',
    dotOff: 'rgba(31,42,22,0.1)',
    inset: 'inset 0px 2px 4px rgba(31,42,22,0.2), inset 0px 0px 0px 1.5px rgba(31,42,22,0.42)',
    body: '#2C3227', bodyInk: '#E4E8DA', bodyInk2: 'rgba(228,232,218,0.66)', bodyInk3: 'rgba(228,232,218,0.4)',
    win: { bg: '#C5CCB4', seg: '#1F2A16', ghost: 'rgba(31,42,22,0.08)', ink: '#1F2A16', ink2: '#4A563E', edge: '#11160C' },
    key: { face: '#454D3C', faceOn: '#2A3023', base: '#161A11', edge: 'rgba(255,255,255,0.16)', ink: '#E4E8DA' },
    keyAccent: { face: '#C2410C', faceOn: '#9A3309', base: '#5E1F05', edge: 'rgba(255,255,255,0.28)', ink: '#FFF4EC' },
    band: { bg: '#1F2A16', ink: '#C9D1B6' },
    labelFace: 'label', prefix: '', lower: false,
  },
  terminal: {
    seg: '#8CFFD2', ghost: 'rgba(140,255,210,0.06)', glow: true,
    accent: '#FFB454', onAccent: '#140C02',
    dotOff: 'rgba(255,255,255,0.08)',
    inset: 'inset 0px 0px 0px 1px rgba(140,255,210,0.28), inset 0px 0px 22px rgba(140,255,210,0.05)',
    body: '#040605', bodyInk: '#8CFFD2', bodyInk2: '#62C9A4', bodyInk3: '#3F8A70',
    win: { bg: '#010302', seg: '#8CFFD2', ghost: 'rgba(140,255,210,0.06)', ink: '#8CFFD2', ink2: '#62C9A4', edge: 'rgba(140,255,210,0.34)' },
    key: { face: '#101915', faceOn: '#07100C', base: '#000000', edge: 'rgba(140,255,210,0.3)', ink: '#8CFFD2' },
    keyAccent: { face: '#FFB454', faceOn: '#D98F2E', base: '#6B430D', edge: 'rgba(255,255,255,0.35)', ink: '#140C02' },
    band: { bg: '#000000', ink: '#8CFFD2' },
    labelFace: 'plex', prefix: '> ', lower: true,
  },
  cyber: {
    seg: '#2DE2E6', ghost: 'rgba(45,226,230,0.075)', glow: true,
    accent: '#FF38C8', onAccent: '#16051B',
    dotOff: 'rgba(45,226,230,0.09)',
    inset: 'inset 0px 0px 0px 1px rgba(255,56,200,0.4), inset 0px 0px 24px rgba(45,226,230,0.07)',
    body: '#07061A', bodyInk: '#ECEAFF', bodyInk2: '#ABA5DC', bodyInk3: '#716BA6',
    win: { bg: '#09081E', seg: '#2DE2E6', ghost: 'rgba(45,226,230,0.075)', ink: '#ECEAFF', ink2: '#ABA5DC', edge: 'rgba(255,56,200,0.55)' },
    key: { face: '#1F1C46', faceOn: '#141233', base: '#03020C', edge: 'rgba(45,226,230,0.32)', ink: '#ECEAFF' },
    keyAccent: { face: '#FF38C8', faceOn: '#D41FA4', base: '#6E0D57', edge: 'rgba(255,255,255,0.35)', ink: '#16051B' },
    band: { bg: '#16051B', ink: '#2DE2E6' },
    labelFace: 'label', prefix: '◢ ', lower: false,
  },
};

export type Look = Finish & { t: Theme; id: keyof typeof FINISH };

/** The finish you picked, with the theme's page colors. */
export function useLook(): Look {
  const t = useT();
  const id = themeId(useDesign().theme);
  const k = id === 'terminal' || id === 'cyber' ? id : 'lcd';
  return { ...FINISH[k], t, id: k };
}

/** A label the way this finish writes it. */
export const say = (L: Pick<Finish, 'prefix' | 'lower'>, text: string) => `${L.prefix}${L.lower ? text.toLowerCase() : text.toUpperCase()}`;

/** '10-23 FRI' */
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const stamp = (d: Date) => `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')} ${DOW[d.getDay()]}`;
