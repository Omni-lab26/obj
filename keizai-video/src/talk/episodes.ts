import { ENYASU } from "./episode";
import { ENYASU_PACING } from "./enyasu.pacing";
import { ENYASU_SHOTS } from "./enyasu.shots";
import { PACING as DENKIDAI_PACING } from "./pacing";
import { Shot, SHOTS as DENKIDAI_SHOTS } from "./shots";

/** The shot list and pause table of the episode being built. */
export const SHOTS: Shot[] = ENYASU ? ENYASU_SHOTS : DENKIDAI_SHOTS;
export const PACING: Record<string, { before?: number; after?: number }> =
  ENYASU ? ENYASU_PACING : DENKIDAI_PACING;
