import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import type { DigitColor } from './colors';
import { clockFonts, type FontId } from './fonts';
import { deviceLang, LANGS, STRINGS, type Lang } from './i18n';

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
  /** The language of everything shown: the phone's own until one is chosen in settings. */
  lang: Lang;
  /** A language has been chosen in settings (else lang follows the phone). */
  langChosen?: boolean;
  /** The first-time bubbles that explain the buttons have been seen. */
  tipsSeen: boolean;
  /** Digital layer: 0 = the raw picture (素), 1 = fully digital. */
  digital: number;
  /** Last scene shown, restored on launch. */
  scene: string;
};

export const defaultSettings: Settings = {
  clock: { visible: true, font: 'condensed', seconds: false, date: true, hour24: true, color: null },
  mode: 'clock',
  timer: { duration: 5 * 60_000, endAt: null, left: 5 * 60_000 },
  stopwatch: { startAt: null, elapsed: 0 },
  timerSaves: [null, null, null, null, null],
  face: { x: 0, y: 0, scale: 1 },
  faceWide: { x: 0, y: 0, scale: 1 },
  lang: deviceLang(),
  tipsSeen: false,
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

// Stored settings may predate newer keys, or (after a crash mid-write, or a hand edit)
// hold the wrong kind of value: anything missing or not what the app itself would have
// written falls back to the default, so a bad file can never keep the app from starting.
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const numOrNull = (v: unknown, d: number | null) => (v === null ? null : typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const oneOf = <T extends string>(v: unknown, all: readonly T[], d: T): T => (all.includes(v as T) ? (v as T) : d);
const MODES: Settings['mode'][] = ['clock', 'timer', 'stopwatch'];
const FONT_IDS = clockFonts.map((f) => f.id);
const LANG_IDS = LANGS.map((l) => l.id);

function place(v: unknown, d: Settings['face']): Settings['face'] {
  const p = obj(v);
  return { x: num(p.x, d.x), y: num(p.y, d.y), scale: num(p.scale, d.scale) };
}

function withDefaults(stored: unknown): Settings {
  const s = obj(stored);
  const D = defaultSettings;
  const clock = obj(s.clock);
  const color = obj(clock.color);
  const timer = obj(s.timer);
  const stopwatch = obj(s.stopwatch);
  const saves = Array.isArray(s.timerSaves) ? s.timerSaves : [];
  const langChosen = bool(s.langChosen, false);
  return {
    clock: {
      visible: bool(clock.visible, D.clock.visible),
      font: oneOf(clock.font, FONT_IDS, D.clock.font),
      seconds: bool(clock.seconds, D.clock.seconds),
      date: bool(clock.date, D.clock.date),
      hour24: bool(clock.hour24, D.clock.hour24),
      color: typeof color.h === 'number' && typeof color.l === 'number' && Number.isFinite(color.h) && Number.isFinite(color.l) ? { h: color.h, l: color.l } : null,
    },
    mode: oneOf(s.mode, MODES, D.mode),
    timer: {
      duration: num(timer.duration, D.timer.duration),
      endAt: numOrNull(timer.endAt, null),
      left: num(timer.left, num(timer.duration, D.timer.left)),
      ...(typeof timer.dial === 'number' && Number.isFinite(timer.dial) ? { dial: timer.dial } : {}),
    },
    stopwatch: { startAt: numOrNull(stopwatch.startAt, null), elapsed: num(stopwatch.elapsed, 0) },
    timerSaves: D.timerSaves.map((d, i) => {
      const v = numOrNull(saves[i], d);
      return v != null && v > 0 ? v : null;
    }),
    face: place(s.face, D.face),
    faceWide: place(s.faceWide, D.faceWide),
    // (Saved languages that were never chosen came from an older guess at the phone's.)
    lang: langChosen && LANG_IDS.includes(s.lang as Lang) ? (s.lang as Lang) : deviceLang(),
    langChosen,
    tipsSeen: bool(s.tipsSeen, D.tipsSeen),
    digital: num(s.digital, D.digital),
    scene: typeof s.scene === 'string' ? s.scene : D.scene,
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

/** The words to show, in the language chosen in settings. */
export function useT() {
  return STRINGS[useSettings().settings.lang] ?? STRINGS.ja;
}
