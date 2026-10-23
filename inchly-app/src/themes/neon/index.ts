import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// ネオン, drawn as its own app: a night-city HUD (after cyberpunk.net's mood,
// none of its marks). Tokens for the screens it shares: design.ts THEMES.neon.
const neon: ThemeKit = { home, timer, TabBar, moments };
export default neon;
