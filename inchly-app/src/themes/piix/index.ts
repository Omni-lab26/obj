import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// ピクセル箱 (piix): warm paper, 2px ink, keys that sink, a lime "go", and a
// small box creature — the pal — that lives on the page and cheers you on.
const piix: ThemeKit = { home, timer, TabBar, moments };
export default piix;
