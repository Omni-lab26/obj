import { TimerScreen } from '@/screens/timer/TimerScreen';
import { useThemeKit } from '@/themes';

// The timer is the theme's (src/themes), drawn on the base layout (src/screens/layout.ts).
export default function Timer() {
  return <TimerScreen kit={useThemeKit().timer} />;
}
