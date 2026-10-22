import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconBtn } from '@/ui/base';
import { NavBar, Screen } from '@/ui/Chrome';
import { MePage } from '@/ui/MePage';

// My Page as its own screen, opened from your icon in the lobby's top bar.
export default function Me() {
  const insets = useSafeAreaInsets();
  return (
    <Screen>
      <NavBar title="マイページ" right={<IconBtn filled name="gear" label="設定" onPress={() => router.push('/settings')} />} />
      <MePage bottomPad={insets.bottom + 24} />
    </Screen>
  );
}
