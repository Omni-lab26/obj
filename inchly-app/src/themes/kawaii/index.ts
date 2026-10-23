import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { TabBar } from './tabbar';
import { timer } from './timer';

// かわいい, drawn as its own app: a sticker diary with a mochi that keeps you
// company. One kit for the family's three colorways (ゆめかわ, ミルクティー,
// ソーダ); each brings its accents, its stamps and its own mochi (look.ts).
const kawaii: ThemeKit = { home, timer, TabBar, moments };
export default kawaii;
