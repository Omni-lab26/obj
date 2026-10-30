import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { DigitColor } from './colors';
import type { FontId } from './fonts';

export type Settings = {
  clock: {
    visible: boolean;
    font: FontId;
    seconds: boolean;
    date: boolean;
    hour24: boolean;
    /** The digits' colour; null follows the scene (white on dark, black on light). */
    color: DigitColor | null;
  };
  /** What the centre shows. */
  mode: 'clock' | 'timer' | 'stopwatch';
  /**
   * Running while endAt is set; otherwise left is what remains (0 = finished). dial
   * is where the rulers stand (the duration, when missing).
   */
  timer: { duration: number; endAt: number | null; left: number; dial?: number };
  /** Running while startAt is set; elapsed is the time banked before it. */
  stopwatch: { startAt: number | null; elapsed: number };
  /** Up to five timer lengths kept for later (ms; null = an empty slot). */
  timerSaves: (number | null)[];
  /**
   * Where the digits sit and how big, the same for all three modes: x and y move them
   * from their usual place by that share of the screen's width and height. One for the
   * phone upright, one for it on its side.
   */
  face: { x: number; y: number; scale: number };
  faceWide: { x: number; y: number; scale: number };
  /** Digital layer: 0 = the raw picture (素), 1 = fully digital. */
  digital: number;
  /** Last scene shown, restored on launch. */
  scene: string;
};

export const defaultSettings: Settings = {
  clock: { visible: true, font: 'system', seconds: false, date: true, hour24: true, color: null },
  mode: 'clock',
  timer: { duration: 5 * 60_000, endAt: null, left: 5 * 60_000 },
  stopwatch: { startAt: null, elapsed: 0 },
  timerSaves: [null, null, null, null, null],
  face: { x: 0, y: 0, scale: 1 },
  faceWide: { x: 0, y: 0, scale: 1 },
  digital: 0.65,
  scene: 'koi',
};

const KEY = 'ambient.settings.v1';

type SettingsContextValue = {
  settings: Settings;
  /** False until stored settings have been read. */
  loaded: boolean;
  update: (change: (s: Settings) => Settings) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

// Stored settings may predate newer keys; fill the gaps from the defaults.
function withDefaults(stored: Partial<Settings>): Settings {
  return {
    ...defaultSettings,
    ...stored,
    clock: { ...defaultSettings.clock, ...stored.clock },
    timer: { ...defaultSettings.timer, ...stored.timer },
    stopwatch: { ...defaultSettings.stopwatch, ...stored.stopwatch },
    timerSaves: defaultSettings.timerSaves.map((d, i) => stored.timerSaves?.[i] ?? d),
    face: { ...defaultSettings.face, ...stored.face },
    faceWide: { ...defaultSettings.faceWide, ...stored.faceWide },
  };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) setSettings(withDefaults(JSON.parse(raw)));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save after the first load so stored values are never overwritten by defaults.
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => AsyncStorage.setItem(KEY, JSON.stringify(settings)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [settings, loaded]);

  const update = useCallback((change: (s: Settings) => Settings) => setSettings(change), []);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
