import { themeId, useDesign } from '../design';
import type { IconId } from '../themes/standard/art';
import type { IconName } from './Icon';

// スタンダード's look for the screens every theme shares: the shared parts ask
// useStd() and, only then, draw the site's way (paper, 2pt ink, a floor under
// what you press, lime for start and picked). クラシック and the other themes
// never see any of it. The values are the theme's own (src/themes/standard/look).
export { floor, KD, LIFT, R as SR, ring, RING_SOFT, S, STICKER } from '../themes/standard/look';

export const isStd = (id: string) => themeId(id) === 'standard';
/** スタンダード is the theme in use. */
export function useStd() {
  return isStd(useDesign().theme);
}

/** The line icons that have a pixel twin (lines 2pt, like the outlines). */
export const PIX_OF: Partial<Record<IconName, IconId>> = {
  back: 'left', chev: 'right', search: 'search', bell: 'bell', chat: 'chat', gear: 'gear', cal: 'cal', play: 'play', pause: 'pause',
  plus: 'plus', minus: 'minus', check: 'check', x: 'x', heart: 'heart', home: 'home', clock: 'clock', users: 'people', user: 'person',
  edit: 'edit', more: 'more', sort: 'sort', grip: 'grip', feed: 'feed',
};
