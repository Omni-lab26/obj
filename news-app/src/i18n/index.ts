import { getLocales } from 'expo-localization';

import { en } from './en';
import { ja, type Dict } from './ja';

// 言語の判定は expo-localization（Intl の既定に頼らない）。日本語以外は英語。
const pick = (): Dict => (getLocales()[0]?.languageCode === 'ja' ? ja : en);

let dict: Dict = pick();
export const refreshLocale = () => {
  dict = pick();
};

type Leaf<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaf<T[K], `${P}${K}.`>;
}[keyof T & string];
export type Key = Leaf<Dict>;

/** t('home.talking', { n: 3 }) → 「3人が話しています」 */
export const t = (key: Key, vars?: Record<string, string | number>): string => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], dict);
  const s = typeof v === 'string' ? v : key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
};
