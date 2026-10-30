import type { ThemeKit } from '../types';
import { StudyBar, TabBar } from './bars';
import { home } from './home';

// スタンダード, drawn as its own app after the introduction site (the approved
// mock: docs/app/mock/): warm paper with faint dots, ink drawn 2pt thick, a
// lime that means start and picked, and Inchly's own pixel creatures (ボッ on
// the streak). Cards rest on the outline alone; only what you press stands on
// an ink floor, and pressed, only its face sinks. The standard layout and sizes
// stay. Tokens for the screens it shares with every theme: design.ts THEMES.standard.
//
// Drawn here so far: the home (header, sections), the tab bar and the study bar.
// Still the base renderers' (in this theme's tokens), to be added as kit slots:
// timer: { card } — the deck's card look (src/screens/timer/cards.tsx CardLook, as サイバー's ./cyber/timer.tsx);
// moments — start, ToDo, target, record (src/themes/types.ts MomentKit; ./art.ts has the creatures for them).
const standard: ThemeKit = { home, TabBar, StudyBar };
export default standard;
