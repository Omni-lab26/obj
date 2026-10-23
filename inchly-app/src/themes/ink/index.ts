import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

/** インク: paint your day. Every minute lands as ink on today's patch of asphalt. */
const ink: ThemeKit = { home, timer, TabBar, moments };
export default ink;
