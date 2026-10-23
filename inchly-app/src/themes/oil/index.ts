import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// 油絵, drawn as its own app: a painter's studio, for ひまわり, 星月夜 and 睡蓮
// alike (what each variant adds is in look.ts). Today is a canvas on the easel
// that's finished — framed — at the day's goal; see home.tsx.
const oil: ThemeKit = { home, timer, TabBar, moments };
export default oil;
