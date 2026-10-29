import type { ThemeKit } from '../types';
import { home } from './home';
import { moments } from './moments';
import { StudyBar, TabBar } from './tabbar';
import { card } from './timer';

// サイバー, drawn as its own app after its parts bible (the HTML kit): a
// study terminal in a city at night. The standard layout and sizes stay; what
// changes is everything else — chamfered panels, yellow / cyan / red / orange
// signals that speak only of state, subjects in colors of their own with
// patterns, Chakra Petch figures, neon kanji tubes (KanjiVG), a rainy alley on
// the timer's cards. Tokens for the screens it shares: design.ts THEMES.cyber.
const cyber: ThemeKit = { home, timer: { card }, TabBar, StudyBar, moments };
export default cyber;
