// The words the app shows, in Japanese and English, and the numeral systems the
// clock can be drawn in. The language follows settings (first the phone's own).

export type Lang = 'ja' | 'en';

const ja = {
  // modes
  modeClock: '時計',
  modeTimer: 'タイマー',
  modeStopwatch: 'ストップウォッチ',
  swipeHint: '左右にスワイプで時計・タイマー・ストップウォッチを切り替え',
  // hints under the digits
  tapToStart: 'タップで開始',
  tapToResume: 'タップで再開・長押しでリセット',
  tapToStartOrReset: 'タップで開始・長押しでリセット',
  setWithRulers: '目盛りで時間を合わせて、数字をタップで開始',
  timeUp: '時間です',
  tapToCloseOrReset: 'タップで閉じる・長押しでリセット',
  date: (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日 ${'日月火水木金土'[d.getDay()]}曜日`,
  // toasts
  clockShown: '時計を表示しました',
  clockHidden: '時計を隠しました・長押しで戻せます',
  reset: 'リセットしました',
  timerDone: 'タイマーが終わりました',
  setBeforeSaving: '目盛りで時間を合わせてから保存してください',
  saved: (d: string) => `${d} を保存しました・長押しで削除`,
  saveDeleted: '保存を削除しました',
  faceReset: '位置と大きさを元に戻しました',
  // controls
  prevScene: '前の背景',
  nextScene: '次の背景',
  editFace: '数字の位置と大きさを変える',
  resetFace: '位置と大きさをリセット',
  resetShort: 'リセット',
  done: '完了',
  settings: '設定',
  editHint: '1本指で移動・2本指でつまんで大きさ',
  // timer
  timerLength: 'タイマーの時間',
  hours: '時間',
  minutes: '分',
  saveEmpty: (i: number) => `保存 ${i}: 空き`,
  saveFull: (i: number, d: string) => `保存 ${i}: ${d}`,
  saveHintEmpty: 'いまの時間を保存',
  saveHintFull: 'この時間にする・長押しで削除',
  // settings
  closeSettings: '設定を閉じる',
  display: '表示',
  showClock: '時計',
  showClockNote: '中央に出す',
  showDate: '日付',
  showDateNote: '時計の上に',
  hour24: '24時間',
  hour24Note: '午後も13時から',
  seconds: '秒',
  secondsNote: '時計だけ',
  off: 'オフ',
  longPressNote: '画面のどこかを長押しすると、いつでも時計を出したり隠したりできます。',
  font: 'フォント',
  fontNamed: (n: string) => `フォント ${n}`,
  numerals: '数字の種類',
  colour: '色',
  auto: '自動',
  autoColour: '色を自動にする',
  colourField: '数字の色',
  timeNowInColour: 'いまの時刻（この色で）',
  digital: 'デジタルレイヤー',
  digitalRaw: '素',
  digitalFull: 'デジタル',
  digitalStrength: 'デジタルレイヤーの強さ',
  digitalNote: '写真の背景にかける加工の強さ。左端は元の写真そのまま、右に行くほど文字・網点・ドットなどのデジタル表現が強くなります。',
  photoCredit: (c: string) => `いまの背景の写真: ${c}`,
  language: '言語',
  howTo: '使い方',
  showHowTo: '使い方を見る',
  showHowToNote: 'ボタンや操作を吹き出しで案内します',
  // first-time bubbles
  tips: [
    {
      title: '← 横にスライドで機能を切り替え →',
      body: '数字を左右にスライドすると、時計 → タイマー → ストップウォッチ と切り替わります（ぐるっと一周）。タイマーとストップウォッチは数字をタップで開始、長押しでリセット',
    },
    { title: '数字の位置と大きさ', body: 'ペンを押して、1本指で移動・2本指でつまんで大きさ' },
    { title: '設定', body: 'フォント・数字の種類・色・言語など' },
    { title: '背景を切り替え', body: '‹ › で前後の背景へ。画面のどこかを長押しすると時計を隠す・出す' },
  ],
  tipsNext: 'タップで次へ',
  tipsLast: 'タップで閉じる',
  tipsNextLabel: '次の説明へ',
  tipsClose: '使い方を閉じる',
  skip: 'スキップ',
  skipTips: '使い方をスキップ',
};

const en: typeof ja = {
  modeClock: 'Clock',
  modeTimer: 'Timer',
  modeStopwatch: 'Stopwatch',
  swipeHint: 'Swipe sideways for the clock, timer and stopwatch',
  tapToStart: 'Tap to start',
  tapToResume: 'Tap to resume · hold to reset',
  tapToStartOrReset: 'Tap to start · hold to reset',
  setWithRulers: 'Set the time on the rulers, then tap the digits',
  timeUp: "Time's up",
  tapToCloseOrReset: 'Tap to close · hold to reset',
  date: (d: Date) =>
    `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]}, ${
      ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getMonth()]
    } ${d.getDate()}`,
  clockShown: 'Clock shown',
  clockHidden: 'Clock hidden · hold to bring it back',
  reset: 'Reset',
  timerDone: 'Timer done',
  setBeforeSaving: 'Set a time on the rulers first',
  saved: (d: string) => `Saved ${d} · hold to delete`,
  saveDeleted: 'Save deleted',
  faceReset: 'Place and size reset',
  prevScene: 'Previous background',
  nextScene: 'Next background',
  editFace: 'Move and resize the digits',
  resetFace: 'Reset place and size',
  resetShort: 'Reset',
  done: 'Done',
  settings: 'Settings',
  editHint: 'Drag with one finger · pinch to resize',
  timerLength: 'Timer length',
  hours: 'Hours',
  minutes: 'Min',
  saveEmpty: (i: number) => `Save ${i}: empty`,
  saveFull: (i: number, d: string) => `Save ${i}: ${d}`,
  saveHintEmpty: 'Keep the time set now',
  saveHintFull: 'Use this time · hold to delete',
  closeSettings: 'Close settings',
  display: 'Display',
  showClock: 'Clock',
  showClockNote: 'In the middle',
  showDate: 'Date',
  showDateNote: 'Above the clock',
  hour24: '24-hour',
  hour24Note: '13:00, not 1 PM',
  seconds: 'Seconds',
  secondsNote: 'Clock only',
  off: 'Off',
  longPressNote: 'Hold anywhere on the screen to show or hide the clock at any time.',
  font: 'Font',
  fontNamed: (n: string) => `Font ${n}`,
  numerals: 'Numerals',
  colour: 'Colour',
  auto: 'Auto',
  autoColour: 'Automatic colour',
  colourField: 'Digit colour',
  timeNowInColour: 'The time now, in this colour',
  digital: 'Digital layer',
  digitalRaw: 'Raw',
  digitalFull: 'Digital',
  digitalStrength: 'Digital layer strength',
  digitalNote: 'How strongly photo backgrounds are reworked: at the left the photo as it is, further right more text, halftone and dot effects.',
  photoCredit: (c: string) => `Photo: ${c}`,
  language: 'Language',
  howTo: 'How to use',
  showHowTo: 'Show how to use',
  showHowToNote: 'Speech bubbles point out the buttons and gestures',
  tips: [
    {
      title: '← Slide sideways to switch →',
      body: 'Slide the digits left or right: Clock → Timer → Stopwatch, and round again. Tap the timer or stopwatch to start; hold to reset',
    },
    { title: 'Place and size', body: 'Tap the pen, then drag with one finger and pinch with two' },
    { title: 'Settings', body: 'Font, numerals, colour, language and more' },
    { title: 'Backgrounds', body: '‹ › for the previous or next. Hold anywhere to hide or show the clock' },
  ],
  tipsNext: 'Tap for the next',
  tipsLast: 'Tap to close',
  tipsNextLabel: 'Next tip',
  tipsClose: 'Close the tips',
  skip: 'Skip',
  skipTips: 'Skip the tips',
};

export const STRINGS = { ja, en };
export type Strings = typeof ja;

/** The phone's language, if it is one of ours (else English). */
export function deviceLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    return locale.toLowerCase().startsWith('ja') ? 'ja' : 'en';
  } catch {
    return 'ja';
  }
}

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ja', label: '日本語' },
  { id: 'en', label: 'English' },
];

/**
 * The numeral systems the clock can be drawn in: the ones an iPhone's Lock Screen
 * offers. zero is the system's digit 0; the rest follow it in Unicode.
 */
export type NumeralId = 'latn' | 'arab' | 'deva' | 'beng' | 'gujr' | 'guru' | 'knda' | 'mlym' | 'orya' | 'mtei' | 'khmr' | 'mymr';
export const NUMERALS: { id: NumeralId; zero: number; ja: string; en: string }[] = [
  { id: 'latn', zero: 0x30, ja: 'アラビア（西）', en: 'Arabic, Western' },
  { id: 'arab', zero: 0x660, ja: 'アラビア（東）', en: 'Arabic, Eastern' },
  { id: 'deva', zero: 0x966, ja: 'デーヴァナーガリー', en: 'Devanagari' },
  { id: 'beng', zero: 0x9e6, ja: 'ベンガル', en: 'Bangla' },
  { id: 'gujr', zero: 0xae6, ja: 'グジャラート', en: 'Gujarati' },
  { id: 'guru', zero: 0xa66, ja: 'グルムキー', en: 'Gurmukhi' },
  { id: 'knda', zero: 0xce6, ja: 'カンナダ', en: 'Kannada' },
  { id: 'mlym', zero: 0xd66, ja: 'マラヤーラム', en: 'Malayalam' },
  { id: 'orya', zero: 0xb66, ja: 'オリヤー', en: 'Odia' },
  { id: 'mtei', zero: 0xabf0, ja: 'メイテイ', en: 'Meitei' },
  { id: 'khmr', zero: 0x17e0, ja: 'クメール', en: 'Khmer' },
  { id: 'mymr', zero: 0x1040, ja: 'ビルマ', en: 'Burmese' },
];

/** The same text with its digits 0-9 in the given numeral system. */
export function numerals(text: string, id: NumeralId): string {
  if (id === 'latn') return text;
  const zero = (NUMERALS.find((n) => n.id === id) ?? NUMERALS[0]).zero;
  return text.replace(/[0-9]/g, (d) => String.fromCharCode(zero + d.charCodeAt(0) - 48));
}
