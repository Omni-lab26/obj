import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

// A plan's icon: a photo from the library, cropped square. On the phone it is
// copied into the app's documents (kept by its name there, since the folder's
// full path changes when iOS updates the app); in a browser it is kept inline.
// Quick to open: the picker isn't asked to crop (asked to, iOS falls back to its
// old, slow photo picker), and takes the photo as it is (no conversion); the
// middle square is cut here and made small (SIZE), which also keeps it light.

const WEB = Platform.OS === 'web';
const DIR = 'plan-icons';

/** How big an icon is kept, in pixels (it shows at most a few hundred points wide). */
const SIZE = 600;

/** Opens the photo library; the picked photo, ready to save on a plan, or null when nothing was picked. */
export async function pickPlanIcon(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  const a = res.canceled ? null : res.assets?.[0];
  if (!a) return null;
  let uri = a.uri, base64: string | undefined, ext = (a.fileName ?? a.uri).split('.').pop()?.toLowerCase() || 'jpg';
  try {
    // the middle square, made small
    const side = Math.min(a.width, a.height);
    const ctx = ImageManipulator.manipulate(a.uri);
    if (side > 0) ctx.crop({ originX: (a.width - side) / 2, originY: (a.height - side) / 2, width: side, height: side }).resize({ width: Math.min(SIZE, side), height: Math.min(SIZE, side) });
    const out = await (await ctx.renderAsync()).saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: WEB });
    uri = out.uri; base64 = out.base64; ext = 'jpg';
  } catch {
    // keep the photo as picked
  }
  if (WEB) return base64 ? `data:image/jpeg;base64,${base64}` : uri;
  try {
    const dir = new Directory(Paths.document, DIR);
    if (!dir.exists) dir.create();
    const name = `${Date.now().toString(36)}.${ext}`;
    new File(uri).copy(new File(dir, name));
    return `${DIR}/${name}`;
  } catch {
    return uri; // still shows until the picker's copy is cleared
  }
}

/** Where to load a saved icon from. */
export function iconUri(icon: string): string {
  if (WEB || icon.includes(':')) return icon;
  return new File(Paths.document, icon).uri;
}
