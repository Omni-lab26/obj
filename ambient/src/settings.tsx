import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { FontId } from './fonts';

export type Settings = {
  clock: {
    visible: boolean;
    font: FontId;
    seconds: boolean;
    date: boolean;
    hour24: boolean;
  };
  /** What the centre shows. */
  mode: 'clock' | 'timer' | 'stopwatch';
  /**
   * Running while endAt is set; otherwise left is what remains (0 = finished). dial
   * is where the rulers stand: a reset clears the count but leaves them there.
   */
  timer: { duration: number; endAt: number | null; left: number; dial?: number };
  /** Running while startAt is set; elapsed is the time banked before it. */
  stopwatch: { startAt: number | null; elapsed: number };
  /** Digital layer: 0 = the raw picture (素), 1 = fully digital. */
  digital: number;
  /** Last scene shown, restored on launch. */
  scene: string;
};

export const defaultSettings: Settings = {
  clock: { visible: true, font: 'system', seconds: false, date: true, hour24: true },
  mode: 'clock',
  timer: { duration: 5 * 60_000, endAt: null, left: 5 * 60_000 },
  stopwatch: { startAt: null, elapsed: 0 },
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
