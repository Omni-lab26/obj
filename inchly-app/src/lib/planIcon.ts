import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// A plan's icon: a photo from the library, cropped square. On the phone it is
// copied into the app's documents (kept by its name there, since the folder's
// full path changes when iOS updates the app); in a browser it is kept inline.

const WEB = Platform.OS === 'web';
const DIR = 'plan-icons';

/** Opens the photo library; the picked photo, ready to save on a plan, or null when nothing was picked. */
export async function pickPlanIcon(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: WEB });
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  if (WEB) return a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
  try {
    const dir = new Directory(Paths.document, DIR);
    if (!dir.exists) dir.create();
    const name = `${Date.now().toString(36)}.${(a.fileName ?? a.uri).split('.').pop()?.toLowerCase() || 'jpg'}`;
    new File(a.uri).copy(new File(dir, name));
    return `${DIR}/${name}`;
  } catch {
    return a.uri; // still shows until the picker's copy is cleared
  }
}

/** Where to load a saved icon from. */
export function iconUri(icon: string): string {
  if (WEB || icon.includes(':')) return icon;
  return new File(Paths.document, icon).uri;
}
