import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// 方眼: a desk of windows on lavender graph paper — files with names on top,
// monospaced figures, a frame round the screen, one pink-to-blue gradient.
const grid: ThemeKit = { home, timer, TabBar, moments };
export default grid;
