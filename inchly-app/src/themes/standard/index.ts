import type { ThemeKit } from '../types';
import { StudyBar, TabBar } from './bars';
import { home } from './home';
import { moments } from './moments';
import { Record } from './record';
import { card } from './timer';

// スタンダード, drawn as its own app after the introduction site (the approved
// mock: docs/app/mock/): warm paper with faint dots, ink drawn 2pt thick, a
// lime that means start and picked, and Inchly's own pixel creatures (ボッ on
// the streak). Cards rest on the outline alone; only what you press stands on
// an ink floor, and pressed, only its face sinks. The standard layout and sizes
// stay. Tokens for the screens it shares with every theme: design.ts THEMES.standard.
//
// Drawn here: the home (header, sections), the tab bar and the study bar, the
// timer's cards (the deck stays the standard one), the moments, and the record sheet.
const standard: ThemeKit = { home, timer: { card }, TabBar, StudyBar, moments, Record };
export default standard;
