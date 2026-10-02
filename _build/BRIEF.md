# Objects catalog — builder brief (read fully before writing code)

## What we are making
A **single-file HTML catalog** (`/home/user/obj/index.html`) of Apple-quality UI objects for app development.
The user (Japanese, wants **"ハイクオリティ" / Apple 感**) picks objects by ID ("BTN-02 の色を変えて").
Each object is built **alone, as a self-contained unit** and shown in its own card. Quality bar: it should look and
feel like it shipped in iOS 18–26 / visionOS — precise metrics, refined motion, perfect in light **and** dark.

Each object also has a **design vector** (デザインの方向性) — honour it, the catalog deliberately covers many directions:
- **Clean** — iOS standard. System colors, grouped surfaces, hierarchy by spacing.
- **Glass** — translucent Liquid-Glass-like material: blur + saturation, specular inner highlight, hairline edge, soft shadow; show something colorful *behind* it so the translucency reads.
- **Vivid** — bold gradients (`--grad-*`), saturated color, playful springy motion, glows.
- **Immersive** — dark, full-bleed media, white type over imagery, scrims for legibility, content first.
- **Editorial** — typography is the hero: big type, tight tracking on display sizes, magazine rhythm, whitespace.
- **Soft** — pastel/tinted surfaces, larger radii, rounded font for numbers, gentle diffuse shadows.

## Files
- `/home/user/obj/_build/objects.json` — master spec. Read the entries for your IDs (`name`, `ja`, `desc`, `vector`, `size`, `bg`, `spec`). The `spec` is the minimum; exceed it.
- `/home/user/obj/_build/shell.html` — design tokens + catalog chrome. **Read its `:root` token section** to know every variable.
- `/home/user/obj/_build/parts/<ID>.html` — **your output, one file per object.** Only edit your own IDs.
- `/home/user/obj/_build/parts/BTN-01.html` — reference example of the format.
- Do **not** edit `shell.html`, `lib.mjs`, tools, `objects.json`, or other objects' parts. Put any shell suggestions in your final report.

## Part file format
```html
<!-- ═══════════ SNS-03 · Stories Row ═══════════ -->
<style>
#SNS-03 .sns03-row { … }            /* EVERY selector starts with #ID */
@keyframes sns03-spin { … }          /* keyframes prefixed with slug (id lowercase, no hyphen) + "-" */
</style>
<article class="obj" id="SNS-03" data-name="Stories Row" data-ja="ストーリーズ一覧" data-vector="Vivid" data-size="m" data-desc="(exactly the desc from objects.json)">
  <div class="obj-stage" data-bg="plain">
    … the object …
  </div>
  <ul class="obj-notes"><li>タップで既読に</li><li>横にドラッグ</li></ul>   <!-- 2–4 short Japanese interaction hints -->
</article>
<script>
(() => {
  const root = document.getElementById('SNS-03');
  …
})();
</script>
```
- `data-*` attributes must equal objects.json (`data-vector` = vectors joined by a space). The catalog builds the card header (ID chip, names, vector tag) from them — **do not put a title inside the stage.**
- `data-bg` on `.obj-stage`: `plain` | `grouped` | `wallpaper` | `dark` (use the one from objects.json unless you have a strong reason).
- Class names: prefix with the slug (`sns03-…`) so they're greppable.

## Hard rules (enforced by `node _build/lint.mjs`)
1. Every CSS selector is scoped with `#ID` (first token). No global/element selectors, no `:root`, no `@font-face`/`@import`.
2. `@keyframes` names start with `<slug>-`; `@property` names with `--<slug>-`.
3. **No `position: fixed`.** Overlays (alerts, sheets, menus, toasts, scrims) are `position:absolute` inside `.obj-stage` (it is `position:relative; overflow:hidden; isolation:isolate`) or inside a `.phone-screen`.
4. Element `id`s inside the object must start with `ID-` (SVG gradient / clipPath / mask ids too).
5. JS: one IIFE per object; query only inside `root`. No globals, never touch `document.body`/`html`. A document-level listener is OK only for outside-click/Escape and must check `root.contains(...)` / be cheap.
6. No external resources (no remote images, fonts, CDNs, libraries).

## Design system (use it — consistency across 56 objects is the point)
- **Color**: tokens only for UI (`--blue --green --indigo --orange --pink --purple --red --teal --cyan --mint --yellow --brown --gray..--gray6`, `--accent`, `--label/-2/-3/-4`, `--bg --bg-2 --bg-3`, `--bg-grouped/-2/-3`, `--bg-elevated`, `--fill/-2/-3/-4`, `--separator --separator-op --scrim`, `--segment-bg --segment-thumb`, `--bubble-in --bubble-out`, materials `--mat-ultrathin/thin/regular/thick/chrome` + `--mat-blur`, glass `--glass-bg --glass-bg-strong --glass-edge --glass-border --glass-shadow --glass-blur`, focus `--focus-ring`, `--shadow-1/2/3`, `--wallpaper`, gradients `--grad-vivid/story/ocean/mint/sunset/berry/night`, `--on-accent`).
  Tints: `color-mix(in srgb, var(--pink) 15%, transparent)`. One-off theme-specific values: `light-dark(#xxx, #yyy)` (works — root `color-scheme` follows the theme switch). Hard-coded colors are fine for media/immersive content (white type on imagery, gradients).
  Sub-trees that must always be dark (immersive UIs) can use class `force-dark` (re-maps all tokens to dark); `force-light` likewise.
- **Type**: `--font-text`, `--font-display` (≥20px), `--font-rounded` (numbers/timers/badges in Soft/Vivid), `--font-mono`, `--font-emoji`. iOS scale tokens `--fs-largetitle 34 / title1 28 / title2 22 / title3 20 / headline 17 (600) / body 17 / callout 16 / subhead 15 / footnote 13 / caption1 12 / caption2 11`.
  Tracking: Latin display sizes get negative tracking (34px ≈ -0.4px, 17px ≈ -0.4px, 13px ≈ -0.08px). **Japanese text: `letter-spacing: 0`** (negative tracking looks cramped on kana). Changing numbers: `font-variant-numeric: tabular-nums`.
- **Radius** `--r-xs 6 / s 10 / m 14 / l 20 / xl 28 / full`. **Spacing** 4/8pt grid (`--sp-1..8`).
- **Motion**: `--ease-ios` (sheets, navigation), `--ease-spring` (presses, pops; overshoot), `--ease-out`; durations `--dur-1 160 / 2 280 / 3 450 / 4 650ms`. Animate transform/opacity (and filter sparingly). Press = scale(.96–.97) with fast in / springy out. Never linear for UI motion. Respect reduced motion: `@media (prefers-reduced-motion: reduce)` and `ObjKit.reducedMotion`.
- **Hairlines**: 0.5px (`box-shadow: inset 0 -.5px 0 var(--separator)` or `border: .5px solid`). List separators inset to the text start.
- **Glass**: utility class `.glass` (bg + blur + edge highlight + shadow) or the tokens directly. Add a subtle specular gradient for Liquid-Glass feel.
- **Shared imagery** (no real photos exist): `<div class="art art-1">` … `art-8` = sunset hills, ocean horizon, misty green hills, city-night bokeh, desert dunes, aurora, pastel abstract, latte top-view. `background-size: 100% 100%` by default — you may override `background-size`/`background-position` (e.g. `200% 200%` + different positions) to get more variety, and apply filters (hue-rotate, saturate) for extra variations.
- **Avatars**: `<span class="av av-1" style="width:40px;height:40px;font-size:16px">H</span>` — gradients `av-1`..`av-8`; white rounded-font initial. You may also use an `art-N` inside a circle as a "photo" avatar.
- **Demo cast** (reuse for consistency): `haru.photo` 佐藤 春 (av-1, "H", verified photographer) · `mio_k` 小林 美緒 (av-2, "M") · `kaito.dev` 高橋 海斗 (av-3, "K") · `yuna` 山本 結菜 (av-4, "Y") · `sora_travel` 中村 空 (av-5, "S") · `ren.design` 伊藤 蓮 (av-6, "R") · `aoi` 渡辺 葵 (av-7, "A") · self あなた (av-8, "Me"). Today is 2026年10月2日(金), time 9:41.
- **Copy**: Japanese, natural iOS Japanese-locale wording (キャンセル, 完了, 編集, 共有, 削除, 設定…). No lorem ipsum.

### Icons (SVG sprite, drawn concurrently by another agent)
Use: `<svg class="i" aria-hidden="true"><use href="#i-heart-fill"/></svg>` — color = `currentColor`, size = `font-size` (or width/height). viewBox 24×24, glyph ≈ 20px live area, SF-Symbols-like regular weight.
Available ids:
`i-chevron-right i-chevron-left i-chevron-down i-chevron-up i-xmark i-xmark-circle-fill i-plus i-plus-circle-fill i-minus i-checkmark i-checkmark-circle-fill i-circle i-ellipsis i-ellipsis-circle i-magnifyingglass i-mic-fill i-square-and-arrow-up i-square-and-pencil i-pencil i-trash i-trash-fill i-doc-on-doc i-link i-info-circle i-exclamationmark-triangle-fill i-arrow-up i-arrow-up-right i-arrow-clockwise i-arrow-2-squarepath i-line-3-horizontal-decrease i-sidebar-left i-gearshape-fill i-slider-horizontal-3 i-eye i-eye-slash i-lock-fill i-globe i-house-fill i-square-grid-2x2-fill i-play-rectangle-fill i-tray-fill i-folder-fill i-archivebox-fill i-flag-fill i-tag-fill i-pin-fill i-bookmark i-bookmark-fill i-calendar i-clock-fill i-timer i-bell-fill i-bell-slash-fill i-envelope-fill i-phone-fill i-video-fill i-camera-fill i-photo i-square-on-square i-location-fill i-mappin i-cart-fill`
`i-play-fill i-pause-fill i-forward-fill i-backward-fill i-music-note i-waveform i-speaker-fill i-speaker-wave-2-fill i-sun-max-fill i-moon-fill i-flashlight-on-fill i-airplane i-wifi i-antenna-radiowaves i-dot-radiowaves i-bolt-fill i-cloud-sun-fill i-heart i-heart-fill i-star i-star-fill i-flame-fill i-hand-thumbsup-fill i-face-smiling i-at i-number i-chart-bar-fill i-checkmark-seal-fill i-sparkles i-gift-fill i-person-fill i-person-2-fill i-person-crop-circle-fill i-person-badge-plus i-message-fill i-bubble-right i-paperplane i-paperplane-fill i-eye-fill`
If you need another glyph, draw it inline (24 grid, same weight). Until the sprite lands, icons render blank in screenshots — that's expected; re-shoot later.

### Phone frame (for screen-level objects)
```html
<div class="phone" data-status="light" style="--phone-h: 640px"><div class="phone-screen"> … </div></div>
```
340×700 by default (screen ≈ 322×682, corner radius 45). Status bar (9:41, signal, Wi-Fi, battery), Dynamic Island and home indicator are **injected automatically** (z-index ~1000) — leave `var(--phone-safe-top)` (54px) at the top and `var(--phone-safe-bottom)` (28px) at the bottom. `data-status="light"` = white status bar for dark content. `.phone-screen` is `position:relative; overflow:hidden` → your sheets/overlays live inside it. On ≤420px viewports the phone is 316px wide — don't hard-code inner widths.

### Stage & responsiveness
`.obj-stage` is a centered flex column (gap 20px, padding 32px 20px, min-height 280). Card widths: size `m` ≈ 330px (phone) … ~560px (desktop); `l` spans 2 columns (~1100px max) on wide screens, single column on narrow; `xl` full width. **Nothing may overflow horizontally at a 390px viewport** (stage inner width ≈ 318px). Use `width: min(100%, 360px)`, flex-wrap, etc.

### Interaction & a11y
Pointer events (mouse + touch; `setPointerCapture`; `touch-action` set appropriately), real `<button>`s, keyboard where sensible (Enter/Space/arrows/Escape), ARIA roles/labels, `:focus-visible` rings. Hover styles only inside `@media (hover: hover)`. `-webkit-tap-highlight-color: transparent`; `user-select: none` on controls.
Pause continuous loops (rAF/intervals) when off-screen: `ObjKit.onVisible(root, (v) => v ? start() : stop())`. Measure layout lazily (on interaction / in rAF), never assume fonts are loaded at parse time; the catalog may hide cards (`hidden`) while filtering.

### Performance
56 objects share one page. Keep DOM lean (<~400 nodes/object), only a handful of `backdrop-filter` layers per object, no large animated blurs/shadows, no work while off-screen.

## Quality checklist (Apple feel)
- Exact iOS metrics: list row 44 (11pt vertical text inset, 16/20 side insets), nav bar 44 (+ large title 52), tab bar 49 + safe area, toolbar 44, switch 51×31, segmented 32, slider knob 28, icon squircles (60/radius 13.5, settings 29/radius 7), alert 270 wide, etc.
- Clear hierarchy (label/label-2/label-3), optical alignment of icons, 4/8pt rhythm, consistent paddings.
- Every tappable thing has a pressed state; disabled states where relevant; transitions on state changes (no snapping).
- Dark mode is designed, not inverted: check contrast, elevated surfaces (`--bg-grouped-2`), adapted shadows; nothing white-on-white or black-on-black.
- Realistic content, tasteful details (hairlines, inner highlights, subtle gradients), no generic "web" look (no thick borders, no Material ripples, no default blue outlines).

## Mandatory verification before you finish
Run from `/home/user/obj`:
1. `node _build/lint.mjs <IDs>` → all ✓ and no `data-*` warnings.
2. `node _build/shot.mjs <IDs>` → **Read the PNGs** (`_build/shots/<ID>-light.png`, `-dark.png`) and critique them hard against the spec and this checklist. Iterate until excellent.
3. `node _build/shot.mjs <IDs> --mobile --theme light` → no clipping/overflow at 390px.
4. Exercise interactions and look at the result: `--do "<js>" --tag <name>` (has `root`, `stage`, `sleep(ms)`) for clicks, or a small Playwright script in `_build/tmp/` for drags:
   ```js
   import { openPage } from '/home/user/obj/_build/lib.mjs';
   const { browser, page, errors } = await openPage({ theme: 'dark', only: ['LST-02'] }); // only = include just these parts
   const row = page.locator('#LST-02 .lst02-row').first(); await row.scrollIntoViewIfNeeded();
   const b = await row.boundingBox();
   await page.mouse.move(b.x + b.width - 20, b.y + b.height / 2); await page.mouse.down();
   await page.mouse.move(b.x + 80, b.y + b.height / 2, { steps: 12 });
   await page.locator('#LST-02').screenshot({ path: '/home/user/obj/_build/shots/LST-02-drag.png' });
   await page.mouse.up(); console.log(errors); await browser.close();
   ```
   Make sure there are **no console errors** (the shot tool prints them).
5. Final answer (your return value): short report — per object: what's included, interactions, known limitations; plus any suggested shell changes. No need to paste code.
