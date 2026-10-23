import { makeMutable } from 'react-native-reanimated';

/**
 * How far the デザイン page has slid in over home: 0 gone, 1 all the way.
 * Home moves it with the finger; the tab bar steps aside as it comes.
 */
export const designReveal = makeMutable(0);
