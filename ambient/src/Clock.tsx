import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, type TouchData } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  Easing as Ease,
  makeMutable,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colorHex, luminance, withAlpha } from './colors';
import { FaceBackdrop } from './FaceBackdrop';
import { clockFont } from './fonts';
import type { Settings } from './settings';
import { TimerSaves } from './TimerSaves';
import { TimeScrubber } from './TimeScrubber';
import { formatFixed, stopwatchElapsed, timerDial, timerDone, timerLeft, timerRunning } from './timers';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

/** Current time in ms: on every second boundary, or ten times a second when fast. */
function useNow(fast: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const step = fast ? 100 : 1000;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const d = Date.now();
      setNow(d);
      t = setTimeout(tick, step - (d % step) + 5);
    };
    t = setTimeout(tick, step - (Date.now() % step) + 5);
    return () => clearTimeout(t);
  }, [fast]);
  return now;
}

type Props = {
  clock: Settings['clock'];
  mode: Settings['mode'];
  timer: Settings['timer'];
  stopwatch: Settings['stopwatch'];
  /** Light text over dark scenes, dark text over light ones. */
  tone: 'dark' | 'light';
  /** How long the colours take to follow a tone change (the scene crossfade). */
  fadeMs?: number;
  /** Timer and stopwatch: tap the digits to start or pause, hold to reset. */
  onToggle: () => void;
  onReset: () => void;
  /** Timer: a new length set on the ruler. */
  onSetDuration: (ms: number) => void;
  /** A sideways swipe across the digits: the next or previous mode. */
  onMode: (mode: Settings['mode']) => void;
  /** Clock mode: a tap on the digits (the controls show), a hold (hide the clock). */
  onTouch: () => void;
  onHide: () => void;
  /** Timer: the five saved lengths, and what a tap or hold on a slot does. */
  saves: (number | null)[];
  onSave: (i: number) => void;
  onLoad: (i: number) => void;
  onDelete: (i: number) => void;
  /** Where the digits sit and how big (all modes), and whether they are being edited. */
  face: Settings['face'];
  edit: boolean;
  onFace: (face: Settings['face']) => void;
};

const MARGIN = 12; // kept clear above and below the digits at the screen's edges
const EDGE = 6; // kept clear beside the edit frame at the screen's sides
// The buttons in the top corners (in App: the pen on the left, settings on the
// right): the digits stay out from under them.
const TOOLS = { left: 186, right: 64, height: 54 };
const MIN_SCALE = 0.35;
// The edit frame's reach past the digits' line, sideways and up and down.
const FRAME = { x: 12, y: 10 };
// The lines above and below the digits are boxes of fixed height, whatever they hold
// (a date, a mode's name, a hint, nothing): a text coming or going never moves the
// digits.
const LABEL = { height: 23, gap: 2 };
const HINT = { height: 18, gap: 6 };
const LABEL_LINE = LABEL.height + LABEL.gap; // the date's line above the digits, with its gap
// The longest hint each mode shows, in characters, for room beside the digits that
// doesn't change as hints come and go.
const HINT_CHARS = { clock: 0, timer: 21, stopwatch: 15 } as const;
/** What the digits' place depends on: the screen, the block as laid out (its digits'
 *  row, the widest of its other lines, and its height), the rulers' height, and how far
 *  the scale may go from the one laid out. */
type Limits = {
  W: number;
  H: number;
  rowW: number;
  rowH: number;
  sideW: number;
  /** The date above the digits, when there is one: its width (0 when none). */
  labelW: number;
  bh: number;
  cy0: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  need: number;
  kMin: number;
  kMax: number;
};

// Only the digits grow and shrink under a zoom; the label and hint keep their size
// and move apart to make room. The width counts the edit frame around the digits, so
// that stays whole on screen too. (Defined before the worklets that use them: a worklet takes in
// what it refers to when it is defined.)
function blockW(k: number, p: Limits) {
  'worklet';
  return Math.max(p.rowW * k + 2 * FRAME.x, p.sideW);
}
function blockH(k: number, p: Limits) {
  'worklet';
  return p.bh + p.rowH * (k - 1);
}

/**
 * Where the digits may sit (px from their usual place) at k times the laid-out
 * size: the whole block on screen, clear of the corner buttons, with room for the
 * timer's rulers above or below. A worklet, so a drag can use it on the UI thread.
 */
function clampPlace(x: number, y: number, k: number, p: Limits) {
  'worklet';
  const bw = blockW(k, p);
  const bh = blockH(k, p);
  const dx = Math.max(0, p.W / 2 - EDGE - bw / 2);
  const cx = Math.min(dx, Math.max(-dx, x));
  const l = p.W / 2 + cx - bw / 2;
  const underTools = l < Math.max(p.left, 12) + TOOLS.left || l + bw > p.W - Math.max(p.right, 12) - TOOLS.right;
  const ceiling = underTools ? Math.max(p.top, 12) + TOOLS.height + 8 : p.top + MARGIN;
  const top = ceiling + bh / 2 - p.cy0;
  const bottom = p.H - p.bottom - MARGIN - bh / 2 - p.cy0;
  if (top > bottom) return { x: cx, y: (top + bottom) / 2 };
  let cy = Math.min(bottom, Math.max(top, y));
  // Leave the timer's rulers room on one side or the other (in every mode, so the
  // digits never jump on the way to the timer): no hanging in a middle too short
  // for them either way.
  const lowest = bottom - p.need; // rulers below fit while above this
  const highest = p.top + MARGIN + bh / 2 - p.cy0 + p.need; // rulers above fit while below this
  if (cy > lowest && cy < highest) {
    const low = lowest >= top;
    const high = highest <= bottom;
    if (low && (!high || cy - lowest < highest - cy)) cy = lowest;
    else if (high) cy = highest;
  }
  return { x: cx, y: Math.min(bottom, Math.max(top, cy)) };
}

const MODES: Settings['mode'][] = ['clock', 'timer', 'stopwatch'];
const MODE_NAMES = { clock: '時計', timer: 'タイマー', stopwatch: 'ストップウォッチ' } as const;

/** Where the page in this slot sits, in page widths from the middle of the screen,
 *  with the row at `pos`: the three modes go round and round, so each is never more
 *  than a page and a half away. */
function ringOffset(slot: number, pos: number) {
  'worklet';
  const d = (slot - pos) % MODES.length;
  return ((d + MODES.length * 1.5) % MODES.length) - MODES.length / 2;
}

// The digits' gestures, built once (the face re-renders ten times a second while
// counting, and a rebuilt gesture would drop a hold in progress); they call whatever
// handlers were set last. A sideways swipe moves the modes like pages on an iPhone:
// the row follows the finger one to one, and on release it carries on to the next
// page or settles back, on a spring with no bounce. Where the row is lives on the UI
// thread as a page position that only ever counts on (0, 1, 2, 3 … round the three
// modes), so a swipe caught mid-glide carries on from where the row is, and the mode
// it lands on is worked out from that, never from a mode that hasn't caught up yet.
// A hold and a tap race the swipe; whichever is recognised first wins.
function makeFaceGesture(pos: SharedValue<number>, span: SharedValue<number>) {
  const h = { land: (_page: number) => {}, hold: () => {}, tap: () => {} };
  const land = (page: number) => h.land(page);
  const settle = { stiffness: 340, damping: 37, mass: 1, overshootClamping: true };
  // (A shared value, not a plain object: each callback gets its own copy of those.)
  const from = makeMutable(0);
  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .onStart(() => {
      cancelAnimation(pos);
      from.set(pos.get());
    })
    .onUpdate((e) => {
      pos.set(from.get() - e.translationX / span.get());
    })
    .onEnd((e) => {
      const w = span.get();
      const v = -e.velocityX / w; // pages a second
      // The page it started nearest, and where a flick would carry it from here.
      const base = Math.round(from.get());
      const ahead = pos.get() + v * 0.15 - base;
      let page = base + (ahead > 0.5 ? 1 : ahead < -0.5 ? -1 : 0);
      if (Math.abs(e.velocityX) > 500) page = base + (v > 0 ? 1 : -1);
      pos.set(withSpring(page, { ...settle, velocity: v }));
      runOnJS(land)(page);
    });
  const hold = Gesture.LongPress()
    .minDuration(500)
    .runOnJS(true)
    .onStart(() => h.hold());
  const tap = Gesture.Tap()
    .maxDuration(450)
    .runOnJS(true)
    .onEnd((_e, ok) => {
      if (ok) h.tap();
    });
  return {
    gesture: Gesture.Race(pan, hold, tap),
    set(next: typeof h) {
      Object.assign(h, next);
    },
    // Off while the digits are being edited.
    enable(on: boolean) {
      pan.enabled(on);
      hold.enabled(on);
      tap.enabled(on);
    },
  };
}

/** One mode's page in the row, placed round the ring on the UI thread. The current
 *  mode's page is laid out in the flow (it gives the row its height); the others sit
 *  over it, centred, wherever the ring puts them. */
function PageSlot({ slot, pos, width, here, children }: { slot: number; pos: SharedValue<number>; width: number; here: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: ringOffset(slot, pos.get()) * width }] }));
  return <Reanimated.View style={[here ? styles.slotHere : styles.slotAway, { width }, style]}>{children}</Reanimated.View>;
}

// While editing, the digits' gestures give way to this, on a layer over the whole
// screen (both stay attached, each on and off in turn: swapping one for the other on
// the same view can leave a gesture stuck on the web). It follows the fingers themselves: one moves the digits, two
// also pinch them bigger or smaller, and a finger added or lifted mid-way just
// carries on from there (so a drag can turn into a pinch without letting go). It all
// runs on the UI thread, and only the result goes back to JS, once, when the last
// finger lifts: nothing re-renders while editing.
function makeEditGesture(px: SharedValue<number>, py: SharedValue<number>, zoom: SharedValue<number>, lim: SharedValue<Limits>, busy: SharedValue<number>) {
  const h = { done: (_x: number, _y: number, _k: number) => {} };
  const done = (x: number, y: number, k: number) => h.done(x, y, k);
  // Where the fingers were when their number last changed, and the digits then.
  // (A shared value, not a plain object: each callback gets its own copy of those.)
  const at = makeMutable({ n: 0, x: 0, y: 0, k: 1, mx: 0, my: 0, d: 1 });
  const fingers = (t: TouchData[]) => {
    'worklet';
    const n = Math.min(2, t.length);
    const a = t[0];
    const b = n === 2 ? t[1] : a;
    return {
      n,
      mx: n ? (a.absoluteX + b.absoluteX) / 2 : 0,
      my: n ? (a.absoluteY + b.absoluteY) / 2 : 0,
      d: n === 2 ? Math.max(1, Math.hypot(a.absoluteX - b.absoluteX, a.absoluteY - b.absoluteY)) : 1,
    };
  };
  const anchor = (t: TouchData[]) => {
    'worklet';
    const f = fingers(t);
    at.set({ n: f.n, x: px.get(), y: py.get(), k: zoom.get(), mx: f.mx, my: f.my, d: f.d });
  };
  const gesture = Gesture.Manual()
    .enabled(false)
    .onTouchesDown((e, manager) => {
      if (busy.get() === 0) {
        busy.set(1);
        manager.activate();
      }
      anchor(e.allTouches);
    })
    .onTouchesMove((e) => {
      const s = at.get();
      const f = fingers(e.allTouches);
      if (f.n !== s.n) {
        anchor(e.allTouches);
        return;
      }
      const p = lim.get();
      const k = f.n === 2 ? Math.min(p.kMax, Math.max(p.kMin, (s.k * f.d) / s.d)) : s.k;
      const c = clampPlace(s.x + f.mx - s.mx, s.y + f.my - s.my, k, p);
      zoom.set(k);
      px.set(c.x);
      py.set(c.y);
    })
    .onTouchesUp((e, manager) => {
      const left = e.allTouches.filter((t) => !e.changedTouches.some((c) => c.id === t.id));
      if (left.length === 0) manager.end();
      else anchor(left);
    })
    .onTouchesCancelled((_e, manager) => manager.end())
    .onFinalize(() => {
      if (busy.get() === 0) return;
      busy.set(0);
      runOnJS(done)(px.get(), py.get(), zoom.get());
    });
  return {
    gesture,
    set(next: typeof h) {
      Object.assign(h, next);
    },
    // On only while the digits are being edited.
    enable(on: boolean) {
      gesture.enabled(on);
    },
  };
}

const FACES = {
  // A soft halo of the background colour keeps digits legible over busy scenes.
  dark: { ink: '#ffffff', inkSoft: 'rgba(255,255,255,0.85)', halo: 'rgba(0,0,0,0.7)' },
  light: { ink: '#0b0b0e', inkSoft: 'rgba(11,11,14,0.78)', halo: 'rgba(255,255,255,0.95)' },
};

type Face = { label: string; main: string; small: string; hint: string; dim: boolean };

/** What the centre shows right now, in any of the three modes. */
function faceFor(p: Props, now: number, preview: number | null): Face {
  if (p.mode === 'stopwatch') {
    const e = stopwatchElapsed(p.stopwatch, now);
    const running = p.stopwatch.startAt != null;
    return {
      label: '',
      main: formatFixed(e),
      small: `.${Math.floor((e % 1000) / 100)}`,
      hint: running ? '' : e > 0 ? 'タップで再開・長押しでリセット' : 'タップで開始',
      dim: false,
    };
  }
  if (p.mode === 'timer') {
    // While a ruler turns, the digits follow it (but never over a running count).
    if (preview != null && !timerRunning(p.timer) && !timerDone(p.timer)) {
      return { label: '', main: formatFixed(preview * 1000), small: '', hint: '', dim: false };
    }
    const left = timerLeft(p.timer, now);
    if (timerDone(p.timer)) {
      return { label: '時間です', main: formatFixed(0), small: '', hint: 'タップで閉じる・長押しでリセット', dim: Math.floor(now / 500) % 2 === 1 };
    }
    const running = timerRunning(p.timer);
    return {
      label: '',
      // Count down in whole seconds that change when a full second has passed.
      main: formatFixed(left + 999),
      small: '',
      hint: running
        ? ''
        : p.timer.duration <= 0
          ? '目盛りで時間を合わせて、数字をタップで開始'
          : left < p.timer.duration
            ? 'タップで再開・長押しでリセット'
            : 'タップで開始・長押しでリセット',
      dim: false,
    };
  }
  const d = new Date(now);
  const h = d.getHours();
  return {
    label: p.clock.date ? `${d.getMonth() + 1}月${d.getDate()}日 ${WEEKDAYS[d.getDay()]}曜日` : '',
    main: `${p.clock.hour24 ? h : h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`,
    small: p.clock.seconds ? String(d.getSeconds()).padStart(2, '0') : '',
    hint: '',
    dim: false,
  };
}

/** The centre clock, timer or stopwatch. Long-press anywhere else toggles it. */
export function Clock(props: Props) {
  const { clock, mode, timer, stopwatch, tone, fadeMs = 520, onToggle, onReset, onSetDuration, onMode, onTouch, onHide } = props;
  const { saves, onSave, onLoad, onDelete, face: placed, edit, onFace } = props;
  const insets = useSafeAreaInsets();
  // The length on the rulers while one is being dragged or gliding (seconds).
  const [preview, setPreview] = useState<number | null>(null);
  const fast = (mode === 'stopwatch' && stopwatch.startAt != null) || (mode === 'timer' && (timerRunning(timer) || timerDone(timer)));
  const now = useNow(fast);
  const { width, height } = useWindowDimensions();
  const [shown] = useState(() => new Animated.Value(clock.visible ? 1 : 0));
  // 0 = colours for a dark scene, 1 = for a light one. Both faces are drawn and
  // crossfaded with the scene, so neither the digits nor their halo flash in the
  // wrong colour over the outgoing background.
  const [toneMix] = useState(() => new Animated.Value(tone === 'light' ? 1 : 0));
  // The modes sit round a ring like pages; pos is where the row is (0 clock, 1 timer,
  // 2 stopwatch, then round again).
  const pos = useSharedValue(MODES.indexOf(mode));
  const span = useSharedValue(width);
  useEffect(() => span.set(width), [span, width]);
  // A hold resets the timer or stopwatch (or hides the clock); a tap starts, pauses
  // or shows the controls (see makeFaceGesture).
  const interactive = mode !== 'clock';
  const [faceGesture] = useState(() => makeFaceGesture(pos, span));
  useEffect(() =>
    faceGesture.set({
      land: (page) => {
        const next = MODES[((page % MODES.length) + MODES.length) % MODES.length];
        if (next !== mode) onMode(next);
      },
      hold: interactive ? onReset : onHide,
      tap: interactive ? onToggle : onTouch,
    })
  );
  // The rulers belong to the timer's page: they slide in and out with it (so they
  // never show over another mode), and fade while the timer runs.
  const timerIdle = !timerRunning(timer) && !timerDone(timer);
  const setting = mode === 'timer' && timerIdle;
  // (Out of the way, with the saves, while the digits are being edited.)
  const showWheels = useSharedValue(timerIdle && !edit ? 1 : 0);
  useEffect(() => showWheels.set(withTiming(timerIdle && !edit ? 1 : 0, { duration: 220 })), [timerIdle, edit, showWheels]);
  const wheelsX = useSharedValue(0);
  const wheelsY = useSharedValue(0);
  const wheelsStyle = useAnimatedStyle(() => ({
    opacity: showWheels.get(),
    transform: [{ translateX: wheelsX.get() + ringOffset(MODES.indexOf('timer'), pos.get()) * span.get() }, { translateY: wheelsY.get() }],
  }));
  // Digit width per point of font size, measured once per font: every digit takes it,
  // so a running count never shifts sideways.
  const [digitPerPt, setDigitPerPt] = useState(0);
  const [colonPerPt, setColonPerPt] = useState(0);
  // The current page's lines as laid out: the widest of its label and hint, and its
  // digits' line (with the scale it was laid out at).
  const [side, setSide] = useState({ label: 0 });
  const [row, setRow] = useState({ w: 0, scale: 1 });
  // The current page's block (label, digits, hint) and the rulers' panel, as laid out,
  // with the scale the block was laid out at.
  const [block, setBlock] = useState({ w: 0, h: 0, scale: 1 });
  const [wheelsH, setWheelsH] = useState(0);
  // The digits' place and a zoom on top of their laid-out size, on the UI thread:
  // an edit moves these directly, and they follow the settings otherwise.
  const px = useSharedValue(0);
  const py = useSharedValue(0);
  const zoom = useSharedValue(1);
  const busy = useSharedValue(0);
  const lim = useSharedValue<Limits>({ W: width, H: height, rowW: 0, rowH: 0, sideW: 0, labelW: 0, bh: 0, cy0: 0, top: 0, bottom: 0, left: 0, right: 0, need: 170, kMin: 1, kMax: 1 });
  const [editGesture] = useState(() => makeEditGesture(px, py, zoom, lim, busy));
  const placeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: px.get() }, { translateY: py.get() }] }));
  // Under a zoom the digits scale about their centre, and the label above and the hint
  // below move out (or in) by as much as the digits' line grows (or shrinks).
  const digitsStyle = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  const aboveStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (-lim.get().rowH * (zoom.get() - 1)) / 2 }] }));
  const belowStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (lim.get().rowH * (zoom.get() - 1)) / 2 }] }));
  // The edit frame hangs on the digits' own box as laid out, and stretches with them
  // while a pinch zooms them (a transform, not a new layout). It grows evenly about
  // its middle: the digits grow about theirs, and the date above moves up by as much
  // as the frame's bottom moves down.
  const frameStyle = useAnimatedStyle(() => {
    const p = lim.get();
    const k = zoom.get();
    const line = p.labelW ? LABEL_LINE : 0;
    const w0 = Math.max(p.rowW, p.labelW) + 2 * FRAME.x;
    const h0 = p.rowH + line + 2 * FRAME.y;
    return {
      transform: [{ scaleX: (Math.max(p.rowW * k, p.labelW) + 2 * FRAME.x) / w0 }, { scaleY: (h0 + p.rowH * (k - 1)) / h0 }],
    };
  });
  // The mode's name shows above the digits for a moment after a change, then fades
  // away (the line keeps its place, so the digits never jump).
  const [flash, setFlash] = useState<string | null>(null);
  const [flashOpacity] = useState(() => new Animated.Value(0));
  const [lastMode, setLastMode] = useState(mode);
  if (mode !== lastMode) {
    setLastMode(mode);
    setFlash(MODE_NAMES[mode]);
  }
  useEffect(() => {
    if (!flash) return;
    flashOpacity.setValue(1);
    const anim = Animated.sequence([
      Animated.delay(1800),
      Animated.timing(flashOpacity, { toValue: 0, duration: 500, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && setFlash(null));
    return () => anim.stop();
  }, [flash, flashOpacity]);

  useEffect(() => {
    Animated.spring(shown, {
      toValue: clock.visible ? 1 : 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: clock.visible ? 6 : 0,
    }).start();
  }, [clock.visible, shown]);

  useEffect(() => {
    Animated.timing(toneMix, {
      toValue: tone === 'light' ? 1 : 0,
      duration: fadeMs,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [tone, toneMix, fadeMs]);

  const font = clockFont(clock.font);
  // Scale with the screen (lying down, the height decides), but stop growing on
  // tablets. Each mode has one fixed size for its longest reading, so the digits never
  // grow or shrink as the count goes on; the chosen scale multiplies them all.
  const room = Math.min(width / 390, height / 640, 1.6);
  const baseSize = (m: Settings['mode']) => {
    const longest = m === 'clock' ? 5 + (clock.seconds ? 1.1 : 0) : m === 'timer' ? 8 : 9.1;
    return (font.time.fontSize ?? 96) * room * Math.min(1, 5 / longest);
  };
  // The widest each mode's digits get at a size: every digit takes a fixed cell.
  const rowWidth = (m: Settings['mode'], size: number) => {
    const cell = digitPerPt * size;
    const colon = colonPerPt * size;
    const small = digitPerPt * size * font.secondsScale;
    if (m === 'clock') return 4 * cell + colon + (clock.seconds ? 2 * small + size * 0.06 : 0);
    const w = 6 * cell + 2 * colon;
    return m === 'stopwatch' ? w + 1.6 * small + size * 0.06 : w;
  };
  // The biggest scale at which every mode's digits still fit across the screen, and
  // their lines (with the label and hint, about 50 pt) fit top to bottom, the timer's
  // with its rulers too.
  const tall = height - insets.top - insets.bottom - 2 * MARGIN;
  const need = (wheelsH || 160) + 10;
  const fit = digitPerPt
    ? Math.min(
        ...MODES.map((m) => (width - 2 * EDGE - 2 * FRAME.x) / rowWidth(m, baseSize(m))),
        ...MODES.map((m) => (tall - 50) / (baseSize(m) * 1.08)),
        (tall - 50 - need) / (baseSize('timer') * 1.08)
      )
    : 1;
  const clampScale = (v: number) => Math.min(fit, Math.max(MIN_SCALE, v));
  const scale = clampScale(placed.scale);
  const sizeFor = (m: Settings['mode']) => baseSize(m) * scale;
  // The block at this scale: its digits' row (worked out), its other lines (as laid
  // out), and its height (as laid out, adjusted if that was at another scale).
  const rowW = row.w ? (row.w * scale) / row.scale : digitPerPt ? rowWidth(mode, sizeFor(mode)) : block.w;
  const rowH = sizeFor(mode) * 1.08;
  const labelW = faceFor(props, now, preview).label ? side.label : 0;
  const sideW = Math.max(labelW, HINT_CHARS[mode] * 13.2);
  const bh = block.h + baseSize(mode) * 1.08 * (scale - block.scale);
  // The digits' usual centre (the layer centres them above an 8%-of-width pad).
  const cy0 = (height - 0.08 * width) / 2;
  const limits: Limits = {
    W: width,
    H: height,
    rowW,
    rowH,
    sideW,
    labelW,
    bh,
    cy0,
    top: insets.top,
    bottom: insets.bottom,
    left: insets.left,
    right: insets.right,
    need,
    kMin: MIN_SCALE / scale,
    kMax: fit / scale,
  };
  const at = clampPlace(placed.x * width, placed.y * height, 1, limits);
  // The UI thread follows the settings (and the screen), except mid-edit. What the
  // fingers just left is taken as it is; any other change (a reset, a turn of the
  // screen, another mode's size) glides there.
  const shownAt = useRef<{ x: number; y: number; scale: number; byHand: boolean } | null>(null);
  useLayoutEffect(() => {
    lim.set(limits);
    if (busy.get()) return;
    const was = shownAt.current;
    shownAt.current = { x: at.x, y: at.y, scale, byHand: false };
    if (was && Math.abs(was.x - at.x) < 0.5 && Math.abs(was.y - at.y) < 0.5 && Math.abs(was.scale - scale) < 1e-3) return;
    if (!was || was.byHand) {
      px.set(at.x);
      py.set(at.y);
      zoom.set(1);
      return;
    }
    const glide = { duration: 320, easing: Ease.out(Ease.cubic) };
    px.set(withTiming(at.x, glide));
    py.set(withTiming(at.y, glide));
    // The digits are laid out at the new size already: start them at the old one.
    zoom.set(was.scale / scale);
    zoom.set(withTiming(1, glide));
  });
  useEffect(() =>
    editGesture.set({
      done: (x, y, k) => {
        if (shownAt.current) shownAt.current.byHand = true;
        onFace({ x: x / width, y: y / height, scale: clampScale(scale * k) });
      },
    })
  );
  // The rulers go under the digits, or over them when there is more room there; and
  // slide sideways as far as they must to stay on screen.
  const blockTop = cy0 + at.y - bh / 2;
  const roomBelow = height - insets.bottom - MARGIN - (blockTop + bh) - 10;
  const roomAbove = blockTop - insets.top - MARGIN - 10;
  const wheelsAbove = wheelsH > roomBelow && roomAbove > roomBelow;
  // Neither side quite big enough: the rulers stay on screen, over the digits' edge.
  const wheelsLift = wheelsAbove ? Math.max(0, wheelsH - roomAbove) : -Math.max(0, wheelsH - roomBelow);
  const rulerWidth = Math.min(width * 0.88, 380);
  const rulerLeft = width / 2 + at.x - rulerWidth / 2;
  const wheelsShift =
    rulerLeft < MARGIN ? MARGIN - rulerLeft : rulerLeft + rulerWidth > width - MARGIN ? width - MARGIN - rulerLeft - rulerWidth : 0;
  // (Under the timer's page, wherever the ring has that: see wheelsStyle.)
  useLayoutEffect(() => {
    wheelsX.set(wheelsShift);
    wheelsY.set(wheelsLift);
  }, [wheelsX, wheelsY, wheelsShift, wheelsLift]);

  const face = (
    m: Settings['mode'],
    f: Face,
    c: (typeof FACES)['dark'],
    label: string,
    labelOpacity: Animated.Value | number,
    measure: boolean,
    framed: boolean
  ) => {
    const size = sizeFor(m);
    const cell = digitPerPt * size;
    // The date's width (not a mode's name, which shows only for a moment).
    const measureLabel =
      measure && !flash
        ? (e: { nativeEvent: { layout: { width: number } } }) => {
            const w = e.nativeEvent.layout.width;
            if (Math.abs(w - side.label) > 0.5) setSide({ label: w });
          }
        : undefined;
    return (
      <>
        <Reanimated.View style={[styles.line, styles.labelLine, aboveStyle]}>
          <Animated.Text
            style={[styles.date, { color: c.inkSoft, textShadowColor: c.halo, opacity: labelOpacity }]}
            numberOfLines={1}
            onLayout={measureLabel}
          >
            {label || '\u00a0'}
          </Animated.Text>
        </Reanimated.View>
        {/* The digits, in a box the edit frame hangs on (so it is always round them). */}
        <View>
          <Reanimated.View
            style={[styles.row, { height: size * 1.08, opacity: f.dim ? 0.3 : 1 }, digitsStyle]}
            onLayout={
              measure
                ? (e) => {
                    const w = e.nativeEvent.layout.width;
                    if (Math.abs(w - row.w) > 0.5 || row.scale !== scale) setRow({ w, scale });
                  }
                : undefined
            }
          >
            {[...f.main].map((ch, i) => {
              const digit = ch >= '0' && ch <= '9';
              return (
                <View key={i} style={digit && cell ? { width: cell, alignItems: 'center' } : null}>
                  <Text style={[font.time, styles.time, { fontSize: size, lineHeight: size * 1.08, color: c.ink, textShadowColor: c.halo, letterSpacing: 0 }]}>
                    {ch}
                  </Text>
                </View>
              );
            })}
            {f.small ? (
              <Text
                style={[
                  font.time,
                  styles.time,
                  {
                    fontSize: size * font.secondsScale,
                    lineHeight: size * font.secondsScale * 1.1,
                    color: c.inkSoft,
                    textShadowColor: c.halo,
                    letterSpacing: 0,
                    marginLeft: size * 0.06,
                    marginBottom: size * 0.16,
                  },
                ]}
              >
                {f.small}
              </Text>
            ) : null}
          </Reanimated.View>
          {framed && edit ? (
            <Reanimated.View
              pointerEvents="none"
              style={[
                styles.frame,
                {
                  // Round the digits, and the date above them when there is one (as
                  // wide as that is, if wider).
                  top: -FRAME.y - (labelW ? LABEL_LINE : 0),
                  bottom: -FRAME.y,
                  left: -FRAME.x - Math.max(0, (labelW - rowW) / 2),
                  right: -FRAME.x - Math.max(0, (labelW - rowW) / 2),
                  borderColor: c.inkSoft,
                },
                frameStyle,
              ]}
            />
          ) : null}
        </View>
        {/* The hint's line stays even when empty, so the digits never move (and it
            steps aside while editing, which its taps and holds have no part in). */}
        <Reanimated.View style={[styles.line, styles.hintLine, belowStyle, { opacity: edit ? 0 : 1 }]}>
          <Text style={[styles.hint, { color: c.inkSoft, textShadowColor: c.halo }]} numberOfLines={1}>
            {f.hint || '\u00a0'}
          </Text>
        </Reanimated.View>
      </>
    );
  };

  // A colour chosen in settings takes over from the scene's, on both faces. The halo
  // stays the scene's, unless the colour is as dark as a dark scene (or as light as a
  // light one): then it turns over, to set the digits off.
  const custom = clock.color ? colorHex(clock.color) : null;
  const inks = custom
    ? {
        dark: { ink: custom, inkSoft: withAlpha(custom, 0.82), halo: luminance(custom) < 0.08 ? FACES.light.halo : FACES.dark.halo },
        light: { ink: custom, inkSoft: withAlpha(custom, 0.82), halo: luminance(custom) > 0.6 ? FACES.dark.halo : FACES.light.halo },
      }
    : FACES;

  // One page per mode, round a ring. The pages that aren't showing carry their mode's
  // name, so it is there as soon as one slides in, and stays a moment once it lands.
  const page = (m: Settings['mode']) => {
    const current = m === mode;
    const f = faceFor({ ...props, mode: m }, now, m === 'timer' ? preview : null);
    const label = current ? (flash ?? f.label) : MODE_NAMES[m];
    const labelOpacity = current && flash ? flashOpacity : 1;
    return (
      <>
        <FaceBackdrop tone={tone} />
        <Animated.View style={[styles.face, { opacity: toneMix.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          {face(m, f, inks.dark, label, labelOpacity, current, current)}
        </Animated.View>
        <Animated.View style={[styles.face, styles.faceOver, { opacity: toneMix }]}>{face(m, f, inks.light, label, labelOpacity, false, current)}</Animated.View>
      </>
    );
  };
  const current = faceFor(props, now, preview);
  // (Set before the detectors render, which is when they read their gestures.)
  faceGesture.enable(!edit);
  editGesture.enable(!!edit);

  return (
    <View pointerEvents={clock.visible ? 'box-none' : 'none'} style={styles.layer}>
      <Reanimated.View pointerEvents="box-none" style={[styles.block, placeStyle]}>
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.block,
            {
              opacity: shown,
              transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
            },
          ]}
        >
          {/* A zero at 100 pt, measured once per font, gives every digit's width. */}
          <Text
            style={[font.time, styles.time, styles.measure, { fontSize: 100, lineHeight: 108, letterSpacing: 0 }]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width / 100;
              if (Math.abs(w - digitPerPt) > 0.001) setDigitPerPt(w);
            }}
          >
            0
          </Text>
          <Text
            style={[font.time, styles.time, styles.measure, { fontSize: 100, lineHeight: 108, letterSpacing: 0 }]}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width / 100;
              if (Math.abs(w - colonPerPt) > 0.001) setColonPerPt(w);
            }}
          >
            :
          </Text>
          <View style={[styles.stage, { width }]}>
            <GestureDetector gesture={faceGesture.gesture}>
              <Reanimated.View
                style={[styles.pages, { width }]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${MODE_NAMES[mode]} ${current.main}`}
                accessibilityHint="左右にスワイプで時計・タイマー・ストップウォッチを切り替え"
              >
                {MODES.map((m, slot) => (
                  <PageSlot key={m} slot={slot} pos={pos} width={width} here={m === mode}>
                    <View
                      style={styles.page}
                      onLayout={
                        m === mode
                          ? (e) => {
                              const { width: w, height: h } = e.nativeEvent.layout;
                              if (Math.abs(w - block.w) > 0.5 || Math.abs(h - block.h) > 0.5 || block.scale !== scale) setBlock({ w, h, scale });
                            }
                          : undefined
                      }
                    >
                      {page(m)}
                    </View>
                  </PageSlot>
                ))}
              </Reanimated.View>
            </GestureDetector>
            {/* The timer's rulers stand outside the face's layout, so the digits never
                move when they come and go. They stay mounted, just hidden, while the
                timer runs, and slide with the timer's page when it is swiped. */}
            <Reanimated.View
              pointerEvents={setting && !edit ? 'box-none' : 'none'}
              style={[styles.wheels, wheelsAbove ? styles.wheelsAbove : styles.wheelsBelow, wheelsStyle]}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (Math.abs(h - wheelsH) > 0.5) setWheelsH(h);
              }}
            >
              <TimeScrubber
                seconds={Math.max(0, Math.round(timerDial(timer) / 1000))}
                width={rulerWidth}
                tone={tone}
                ink={FACES[tone].ink}
                inkSoft={FACES[tone].inkSoft}
                onPreview={setPreview}
                onChange={(sec) => onSetDuration(sec * 1000)}
                footer={
                  <TimerSaves
                    saves={saves}
                    dial={timerDial(timer)}
                    ink={FACES[tone].ink}
                    inkSoft={FACES[tone].inkSoft}
                    onSave={onSave}
                    onLoad={onLoad}
                    onDelete={onDelete}
                  />
                }
              />
            </Reanimated.View>
          </View>
        </Animated.View>
      </Reanimated.View>
      {/* While editing, the whole screen takes the fingers (a second finger can land
          anywhere, however far from the digits); otherwise it lets everything through. */}
      <GestureDetector gesture={editGesture.gesture}>
        <View pointerEvents={edit ? 'auto' : 'none'} style={StyleSheet.absoluteFill} collapsable={false} />
      </GestureDetector>
    </View>
  );
}

/** A small pill that confirms a long-press toggle, then fades away. */
export function Toast({ toast, tone }: { toast: { text: string; id: number } | null; tone: 'dark' | 'light' }) {
  const [opacity] = useState(() => new Animated.Value(0));
  const text = toast?.text ?? '';

  useEffect(() => {
    if (!toast) return;
    opacity.setValue(0);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 420, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [toast, opacity]);

  const dark = tone === 'dark';
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { opacity }]}>
      <View style={[styles.toast, { backgroundColor: dark ? 'rgba(40,40,44,0.86)' : 'rgba(255,255,255,0.92)' }]}>
        <Text style={[styles.toastText, { color: dark ? '#fff' : '#111114' }]}>{text}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    // (No text selection when dragging with a mouse on the web.)
    userSelect: 'none',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '8%',
  },
  block: {
    alignItems: 'center',
  },
  face: {
    alignItems: 'center',
  },
  // The whole width of the swipe area answers taps and holds, not just the digits.
  stage: {
    alignItems: 'center',
  },
  pages: {
    alignItems: 'center',
  },
  page: {
    alignItems: 'center',
  },
  slotHere: {
    alignItems: 'center',
  },
  slotAway: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheels: {
    position: 'absolute',
    alignItems: 'center',
  },
  wheelsBelow: {
    top: '100%',
    marginTop: 10,
  },
  wheelsAbove: {
    bottom: '100%',
    marginBottom: 10,
  },
  frame: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
  },
  measure: {
    position: 'absolute',
    opacity: 0,
    top: 0,
  },
  faceOver: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  time: {
    textAlign: 'center',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 22,
    includeFontPadding: false,
  },
  line: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelLine: {
    height: LABEL.height,
    marginBottom: LABEL.gap,
  },
  hintLine: {
    height: HINT.height,
    marginTop: HINT.gap,
  },
  date: {
    fontSize: 17,
    lineHeight: LABEL.height,
    fontWeight: '600',
    letterSpacing: 0,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  hint: {
    fontSize: 13,
    lineHeight: HINT.height,
    fontWeight: '500',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  toastWrap: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 18,
  },
  toastText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0,
  },
});
