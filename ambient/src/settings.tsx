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
  /** Digital layer: 0 = the raw picture (素), 1 = fully digital. */
  digital: number;
  /** Last scene shown, restored on launch. */
  scene: string;
};

export const defaultSettings: Settings = {
  clock: { visible: true, font: 'system', seconds: false, date: true, hour24: true },
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
