/**
 * Which episode to build. Chosen when rendering:
 *   REMOTION_EPISODE=enyasu npx remotion render Talk …
 * Without it, the first episode (denkidai) is built.
 */
export const EPISODE = process.env.REMOTION_EPISODE ?? "denkidai";
export const ENYASU = EPISODE === "enyasu";
