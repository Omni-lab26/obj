import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// ガリ版: the app as a one-ink zine, run off a stencil duplicator (see print.tsx).
const riso: ThemeKit = { home, timer, TabBar, moments };
export default riso;
