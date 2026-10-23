import { router } from 'expo-router';

import { DesignPage } from '@/screens/DesignPage';

// デザイン as a page of its own (from settings). From home it slides in over home instead.
export default function Design() {
  return <DesignPage swipeBack onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))} />;
}
