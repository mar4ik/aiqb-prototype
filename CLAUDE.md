# AIQB landing site

Static site: `index.html` + `ai-grager.html` (the one course, «AI գրագեր»; the old `start.html` / `level-up.html` redirect to it in `vercel.json`) + `doctor-register.html` + `join.html` (careers, own inline script), `script.js`, and Tailwind v4.
`tailwind.css` is the source stylesheet; `styles.css` is generated from it (`npm run build:css`) — never edit `styles.css` by hand.
`npm run build` regenerates `styles.css` and copies the site into `dist/` (what Vercel deploys from `master`).

## Brand
**`BRAND.md` is the source of truth** for every design decision it covers (colour, typography and graphic elements so far, from the Figma brandbook). Read it before choosing a colour, size or weight. If a request or existing code conflicts with it, flag the conflict instead of guessing.

## Rules

### Git
- **Never commit or push until I explicitly say so** (e.g. "push", "push live", "commit"). Approval covers that one change only — ask again next time.

### Styling
- **Style only with Tailwind.** All styles go in `tailwind.css`, using the theme tokens: `var(--color-…)`, `--spacing(n)`, `var(--text-…)`, `var(--font-weight-…)`, `var(--radius-…)`, and the semantic `--surface`, `--surface-strong`, `--line`. No inline `style=""`, no hard-coded hex / px values when a token exists, no other CSS files.

### UI components — keep them consistent
There's no component folder: the **atomic components are the shared classes in `tailwind.css`**, and each one must look the same everywhere it appears. Before building any UI, look for the atom below and reuse it as it is.

| Atom | Classes | Use for |
|---|---|---|
| Button | `.btn` + one colour: `--primary` · `--dark` · `--white` · `--outline` · `--ghost` (no fill, inherits the text colour: a secondary action beside a filled one, e.g. Copy link) · `--line` (the ghost with a hairline in the text colour: a secondary action on its own on a colour band, e.g. «Գնել առաջին 3 դասը» on the course page); one size: `--sm` (40px) · `--base` (48px, same as the floating buttons) · `--md` (56px) · `--lg` (64px, hero only); optional `--block`; `--inline`: a word inside a headline that is the button (keeps the headline's type, cut to the brand chat bubble by `script.js`; not on the page at the moment) | every clickable action (links styled as buttons too) |
| Pill / tag | `.pill` + `--deal` (Orange, white −%) · `--save` (pale green) · `--gift` (violet, white text) — the Bundle's own colours · `--zoom` (grey) · `--black` (white text: a tag on a colour, e.g. «Խաղարկություն» on Hero B's Orange bubble); one size step: `--lg` (40px, Body S SemiBold) | discounts, labels, badges |
| Icon | `.ic` + `.ic--calendar` · `--calendar-plus` (register) · `--clock` · `--video` (live format) · `--check` · `--x` · `--shield` · `--chev-left/right/down` · `--external` · `--link` (copy link) · `--phone` · `--arrow-up` · brand logos `--telegram` · `--whatsapp` · `--instagram`; one size step: `--lg` (24px) | every icon: masks tinted by `currentColor` |
| Floating button | `.fab` (48px circle) + `--label` (icon + text pill) · `--contact` (webinar campaign green, opens the group; becomes the ✕) · `--top` (back to top); `.fab-group` = several `.fab` in one 48px glass pill (phone / Telegram / WhatsApp), its toggle stays outside it | the fixed buttons bottom right (the row appears on scroll, like the webinar bar) |
| Dismiss | `.dismiss` (28px round, holds `.ic--x`) | the ✕ that hides a banner (e.g. `.pkg-spot`) |
| Modal | `.modal` (a native `<dialog>`, `showModal()`) + `__panel` (a `<form>`), `__head` with `__title` and a `.dismiss` (✕), `__group` (a `<fieldset>`: one person's `.field`s two to a row, `__legend`, `__wide` spans both); opened by `[data-open="<id>"]`, closed by `[data-close]`, Escape or the backdrop (`script.js` → friendsForm) | popup forms (the 3-friends signup) |
| Round arrow | `.pro-card__arrow` / `.teachers__arrow` (`.courses__arrow` on Black) | circular arrow buttons |
| Tabs | `.pill-tabs` + `.pill-tabs__tab` | any segmented toggle |
| Chip | `.chip` (in `.chips`) | filter / topic chips |
| Tool logo | `.tool-pill` (`--lg`), `.tool-stack` | AI-tool logos |
| Form field | `.field`, `.field__label`, `.field__input` (`--grouped`), `.field__prefix` | every input |
| Nav link | `.nav__link`, `.subnav__link` | navigation text links |
| Section title | `.section-title` | every section heading |
| Avatar | `.avatar` (`--letter`), `.face-pile`. Letters: initials real Armenian names start with (no Ը, Ր, Ց…) | people |
| Eyes | `.eyes` (inline 96 × 50 SVG: `.eyes__white`, `.eyes__pupil`) + `data-look` (left · right · up · down · up-left · up-right · down-left · down-right · `you` = at rest, both pupils leaning in by 3.78 as BRAND.md → Eyes; none = straight ahead); `.is-blink` closes them | the brand's eyes as a character: peeking from just outside a bubble's corner, never on the shape (BRAND.md → Bubble construction: Peek). On the learn tiles `script.js` (learnShapes) places them; they come out on hover and follow the pointer. `.crowd`: a row of eyes drifting under the mission headline (missionCrowd), blinking, glancing, looking at the pointer |
| Bubble shape | elements cut into a brand shape by `script.js` (`shapeElement`): the learn tiles (learnShapes: tail / step / slit per tile, nothing cut over the course line and title; cut in as the row scrolls into view, a little deeper on hover) and the chat-bubble button `.btn--inline` (heroBubble); `.shape-ring` shows keyboard focus | shaping containers themselves, never patterns inside them (BRAND.md → Graphic elements) |

Rules:
- **Never restyle an atom locally.** Don't give one button a new padding, radius, colour or font size inside a section. If something is really needed, add a **variant** to the atom (e.g. `.btn--ghost`, `.pill--info`) next to its siblings in `tailwind.css`, so it's reusable.
- **Same meaning → same atom.** A primary action is always `.btn--primary`; a discount is always `.pill--deal`; an "opens in a new tab" link is always `.ic--external`. Don't mix `<img>` icons and `.ic` for the same icon.
- **Only size exceptions come from the atom's own size scale** (`--sm/base/md/lg`), never a custom size. The one existing exception is compact pills inside dense lists (e.g. `.subnav__link .pill`); keep those to height and padding only.
- **New atom only if nothing fits.** Put it in `@layer components` with a short comment, build it from tokens, and add it to this table.
- **Links vs buttons:** text links (nav, sub nav, footer) change **colour only** on hover; background and pill hover states are for buttons.

### Consistency
- **Typography:** `BRAND.md` → Typography. Adelle Sans ARM only, in three cuts: ExtraBold Italic for headlines, Regular for text, SemiBold for details (`--font-weight-headline / -text / -detail`). Tailwind's default sizes, weights, tracking and line heights are switched off; only the AQB text styles exist.
  - **Set type with one line:** `@apply text-aqb-<style>;` (display-xxl 192 · display-xl 128 · display-l 96 · headline-h1 64 · headline-h2 48 · subhead 32 · body-l 28 · body-m 24 · body-s 20 · label 16 · caption 14). It brings size, line height (102% headlines / 112% text) and tracking (−2.4% from 24px up). Display and headline styles also take `italic`.
  - **Pick by job, not by looks:** headlines (section titles, names, big numbers) → display / headline; card and form titles → subhead; reading text → body (body-s is the default and the smallest text size); nav, buttons, dates, times, formats → label; small print, pills, footer → caption. Kicker → regular, headline → ExtraBold Italic, detail → SemiBold, one of each per composition; sentence case.
  - **Phones** step down the same scale, never to in-between sizes: display → headline-h1 / display-l, headline-h1 → headline-h2. headline-h2 (48) is the smallest headline, so a long word that doesn't fit gets a soft hyphen (`&shy;`) at a syllable break (see the mission title).
  - The only non-type `line-height` allowed is a layout box (`--spacing(n)`) that sets a control's height (buttons, tabs, the phone pill); say so in a comment.
- **Colour:** brand colours only (`BRAND.md`). Tailwind's stock palette is switched off (`--color-*: initial`), so `slate`, `zinc`, `green-600`… don't exist. Use:
  - **Text:** `--color-ink-900` (headings, body) · `700` (copy) · `600` (secondary) · `400` (muted). Every step is Ink lightened toward white and reaches WCAG AA on white and on `--surface`; don't go lighter.
  - **Surfaces:** `--surface` / `--surface-strong` / `--line` (Grey tints, `--color-grey-*`).
  - **Brand:** `--color-primary` (Blue), `--color-accent` (Orange); feed colours (`--color-feed-*`) and Violet / Tan (`--color-limited-*`) always carry black text; white on Orange only for text of 24px and up.
  - **Campaign colours:** `--color-campaign-*` (BRAND.md lets a campaign bring its own), e.g. `--color-campaign-green` on the webinar bar and floating buttons, and `--color-campaign-bundle-*`: the Bundle card's own colours.
  - No raw hex / `rgb()` / named colours outside `@theme`, and no gradients on brand colours. New shades are derived from brand tokens with `color-mix()`. `npm run lint:colors` enforces all of this.
- **Spacing:** use the existing rhythm (`--page-x`, `--section-y`, `--card-gap`, `--title-gap`) and `--spacing(n)` steps already used for similar elements. Similar things get identical spacing.

### Before saying you're done
1. **Navbar and menu work on desktop and mobile.** Check in the browser at desktop width (≥1024px) and mobile width (375px):
   - Desktop: the «Դասընթացներ» sub nav opens on hover and on click, and closes on link click, Escape and outside click.
   - Mobile: the burger opens and closes the menu, the «Դասընթացներ» accordion expands, tapping a link closes the menu, and nothing scrolls sideways.
2. **Run lint and tests** and report the results. `npm run lint` runs the brand check (`scripts/lint-brand.mjs`: colour and typography against `BRAND.md`; `lint:colors` / `lint:type` run one half); there are no tests yet. Run `npm run lint` and `npm run build`, confirm both succeed, and say plainly that there's no test setup.
