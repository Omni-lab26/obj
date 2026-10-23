import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// デジタル, drawn as its own app: a pocket device with 7-segment displays,
// in three finishes — LCD, ターミナル and サイバー (look.ts). Tokens for the
// screens it shares: design.ts THEMES.lcd / terminal / cyber.
const digital: ThemeKit = { home, timer, TabBar, moments };
export default digital;
