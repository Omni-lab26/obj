import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// 8bit (レトロゲーム, ドットの夜, ピコピコ), drawn as one app: the day as an
// original retro RPG's status screen — windows with a double edge, a ▶ cursor
// that hops between commands, text that types itself out, gauges in segments.
// The three themes are cartridges of it (look.ts); the screens it shares with
// every theme are dressed by design.ts THEMES.
const bit8: ThemeKit = { home, timer, TabBar, moments };
export default bit8;
