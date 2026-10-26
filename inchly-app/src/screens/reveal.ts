import { makeMutable } from 'react-native-reanimated';

/**
 * How far home has slid aside for the menu: 0 closed, 1 all the way open.
 * Home moves it with the finger; the tab bar steps aside as it comes.
 */
export const designReveal = makeMutable(0);
