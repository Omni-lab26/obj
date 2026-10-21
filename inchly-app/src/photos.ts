import { ImageSourcePropType } from 'react-native';

// Sample photos (Unsplash, via Lorem Picsum — see assets/photos/CREDITS.md).
// Like real student accounts, most icons are a pet, the sky, a drink or a flower, not a face.
export const AVATAR: Record<string, ImageSourcePropType> = {
  はる: require('../assets/photos/av-haru.jpg'),
  mio: require('../assets/photos/av-mio.jpg'),
  そら: require('../assets/photos/av-sora.jpg'),
  kaito: require('../assets/photos/av-kaito.jpg'),
  ゆなっぴ: require('../assets/photos/av-yuna.jpg'),
  れん: require('../assets/photos/av-ren.jpg'),
  ひなた: require('../assets/photos/av-hinata.jpg'),
  つばさ: require('../assets/photos/av-tsubasa.jpg'),
  りん: require('../assets/photos/av-rin.jpg'),
  taku: require('../assets/photos/av-taku.jpg'),
  さき: require('../assets/photos/av-saki.jpg'),
  ゆうき: require('../assets/photos/av-yuki.jpg'),
};
AVATAR['あなた'] = AVATAR['はる'];

export const PHOTO = {
  noteBook: require('../assets/photos/note-book.jpg'),
  noteDesk: require('../assets/photos/note-desk.jpg'),
  noteVideo: require('../assets/photos/note-video.jpg'),
  space: require('../assets/photos/read-space.jpg'),
  morning: require('../assets/photos/g-morning.jpg'),
} satisfies Record<string, ImageSourcePropType>;
