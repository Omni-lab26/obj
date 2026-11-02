import { Redirect, router } from 'expo-router';

import { THEMES_OPEN } from '@/design';
import { DesignPage } from '@/screens/DesignPage';

// デザイン (the theme fitting room) as a page of its own: from settings 「見た目」 and the side menu's テーマ.
// While theme switching is closed (design.ts THEMES_OPEN), there's no page: a link here goes home.
export default function Design() {
  if (!THEMES_OPEN) return <Redirect href="/" />;
  return <DesignPage onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
