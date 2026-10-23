import { HomeScreen } from '@/screens/home/HomeScreen';
import { useThemeKit } from '@/themes';

// Home is the theme's (src/themes), drawn on the base layout (src/screens/layout.ts).
export default function Home() {
  return <HomeScreen kit={useThemeKit().home} />;
}
