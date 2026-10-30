import type { ComponentType, ReactNode } from 'react';
import type { EdgeInsets } from 'react-native-safe-area-context';

import type { Moment, MomentKind } from '../moments';
import type { RecordSheet } from '../screens/recordSheet';
import type { CardLook } from '../screens/timer/cards';
import type { Block, ExtraKind, Kind, TimerPart, Zone, Zones } from '../screens/layout';
import type { IconName } from '../ui/Icon';

// What a theme app is: how it draws the base layout (src/screens/layout.ts).
// Everything is optional — whatever a theme leaves out is drawn the standard
// way, in the theme's colors and type — so a theme can start small, and a
// section added to the base later shows up in every theme at once.

/** Given to a section: the block it sits in, and its place there. */
export type SectionProps = { block: Block; index: number; count: number };

export type HomeKit = {
  /** The page: background, frame and scrolling. Gets the header and the blocks in order. */
  Page?: ComponentType<{ header: ReactNode; children: ReactNode }>;
  /** What sits at the top and stays put. */
  Header?: ComponentType;
  /** How a block (one section, or a few that belong together) is framed. */
  Frame?: ComponentType<{ block: Block; index: number; children: ReactNode }>;
  /** How each section is drawn. */
  sections?: Partial<Record<Kind, ComponentType<SectionProps>>>;
  /** Rearrange the base blocks: reorder, regroup, set side by side, add the theme's own ('x:…'). */
  arrange?: (base: Block[]) => Block[];
  /** The small handle on the left edge that opens the デザイン page (placed by the theme). */
  DesignHandle?: ComponentType<{ onPress: () => void }>;
  /** The menu home slides aside for (its props as screens/SideMenu's), and home's edge while it's aside (a boxShadow). */
  Menu?: ComponentType<{ close: () => void; leave: () => void }>;
  asideEdge?: string;
};

export type TimerKit = {
  /** The screen: background and how the three zones (top, middle, bottom) sit. */
  Page?: ComponentType<{ zones: Record<Zone, ReactNode> }>;
  /** How each part is drawn. */
  parts?: Partial<Record<TimerPart | ExtraKind, ComponentType>>;
  /** Move parts between zones, or add the theme's own ('x:…'). */
  arrange?: (base: Zones) => Zones;
  /** The standard deck of plan cards, with the theme's own cards (left alone, the theme keeps the deck and draws only these). */
  card?: CardLook;
};

/** One tab, ready to draw. */
export type TabItem = { key: string; name: string; label: string; icon: IconName; focused: boolean; center: boolean; onPress: () => void };
export type TabBarProps = {
  items: TabItem[];
  /** the session, for the middle tab */
  running: boolean; paused: boolean; mins: number;
  insets: EdgeInsets;
};
/**
 * A theme's tab bar. It floats over the screens (position absolute) and must
 * fit within tabBarBottom(insets.bottom) + TAB_BAR_H of the bottom edge,
 * which is the room every screen leaves under its content.
 */
export type TabBarKit = ComponentType<TabBarProps>;
/**
 * A theme's study bar: the mini player that sits on the tab bar on every tab
 * (src/screens/StudyBar.tsx), placed at studyBarBottom(insets.bottom) and
 * STUDY_BAR_H tall, which is the room every screen leaves above the tab bar.
 * Wrap it in SwipeToRecord (src/screens/StudyBar.tsx) so pulling it down stops the time and asks to record.
 */
export type StudyBarKit = ComponentType<{ insets: EdgeInsets }>;

/**
 * How a theme makes something of a moment (src/moments.ts): drawn over
 * everything, untouchable, for a second or two; call done() when finished.
 */
export type MomentKit = { [K in MomentKind]?: ComponentType<{ moment: Extract<Moment, { kind: K }>; done: () => void }> };

/**
 * A theme's record sheet (app/record.tsx): the same sheet — what it knows and
 * does is screens/recordSheet.ts — drawn its own way, the empty state too (r.empty).
 */
export type RecordKit = ComponentType<{ r: RecordSheet }>;

export type ThemeKit = { home?: HomeKit; timer?: TimerKit; TabBar?: TabBarKit; StudyBar?: StudyBarKit; moments?: MomentKit; Record?: RecordKit };
