# AIQB landing site

Static site: `index.html` + `doctor-register.html`, `script.js`, and Tailwind v4.
`tailwind.css` is the source stylesheet; `styles.css` is generated from it (`npm run build:css`) — never edit `styles.css` by hand.
`npm run build` regenerates `styles.css` and copies the site into `dist/` (what Vercel deploys from `master`).

## Rules

### Git
- **Never commit or push until I explicitly say so** (e.g. "push", "push live", "commit"). Approval covers that one change only — ask again next time.

### Styling
- **Style only with Tailwind.** All styles go in `tailwind.css`, using the theme tokens: `var(--color-…)`, `--spacing(n)`, `var(--text-…)`, `var(--font-weight-…)`, `var(--radius-…)`, and the semantic `--surface`, `--surface-strong`, `--line`. No inline `style=""`, no hard-coded hex / px values when a token exists, no other CSS files.

### UI components — keep them consistent
There's no component folder: the **atomic components are the shared classes in `tailwind.css`**, and each one must look the same everywhere it appears. Before building any UI, look for the atom below and reuse it as it is.

| Atom | Classes | Use for |
|---|---|---|
| Button | `.btn` + one colour: `--primary` · `--dark` · `--white` · `--outline`; one size: `--sm` (40px) · `--md` (56px) · `--lg` (64px, hero only); optional `--block` | every clickable action (links styled as buttons too) |
| Pill / tag | `.pill` + `--deal` (orange −%) · `--save` (green) · `--gift` (violet) · `--zoom` (grey) | discounts, labels, badges |
| Icon | `.ic` + `.ic--calendar` · `--clock` · `--check` · `--x` · `--shield` · `--chev-left/right/down` · `--external` | every icon: masks tinted by `currentColor` |
| Round arrow | `.pro-card__arrow` / `.teachers__arrow` | circular arrow buttons |
| Tabs | `.pill-tabs` + `.pill-tabs__tab` | any segmented toggle |
| Chip | `.chip` (in `.chips`) | filter / topic chips |
| Tool logo | `.tool-pill` (`--lg`), `.tool-stack` | AI-tool logos |
| Form field | `.field`, `.field__label`, `.field__input` (`--grouped`), `.field__prefix` | every input |
| Nav link | `.nav__link`, `.subnav__link` | navigation text links |
| Section title | `.section-title` | every section heading |
| Avatar | `.avatar` (`--letter`), `.face-pile` | people |

Rules:
- **Never restyle an atom locally.** Don't give one button a new padding, radius, colour or font size inside a section. If something is really needed, add a **variant** to the atom (e.g. `.btn--ghost`, `.pill--info`) next to its siblings in `tailwind.css`, so it's reusable.
- **Same meaning → same atom.** A primary action is always `.btn--primary`; a discount is always `.pill--deal`; an "opens in a new tab" link is always `.ic--external`. Don't mix `<img>` icons and `.ic` for the same icon.
- **Only size exceptions come from the atom's own size scale** (`--sm/md/lg`), never a custom size. The one existing exception is compact pills inside dense lists (e.g. `.subnav__link .pill`); keep those to height and padding only.
- **New atom only if nothing fits.** Put it in `@layer components` with a short comment, build it from tokens, and add it to this table.
- **Links vs buttons:** text links (nav, sub nav, footer) change **colour only** on hover; background and pill hover states are for buttons.

### Consistency
- **Font hierarchy:** match the existing type scale and weights — section titles, card names (`.pkg__name`), body text, labels. Don't add new sizes or weights for one element; reuse what a comparable element already uses. Font is always Adelle Sans ARM (`--font-sans`).
- **Colour roles** (from the header of `tailwind.css`): text is slate (900 headings/body, 700 copy, 600 secondary, 400 muted); surfaces are zinc via `--surface` / `--surface-strong` / `--line`; brand is `--color-primary` (blue) and `--color-accent` (orange). Don't bring in other colours for text or surfaces.
- **Spacing:** use the existing rhythm (`--page-x`, `--section-y`, `--card-gap`, `--title-gap`) and `--spacing(n)` steps already used for similar elements. Similar things get identical spacing.

### Before saying you're done
1. **Navbar and menu work on desktop and mobile.** Check in the browser at desktop width (≥1024px) and mobile width (375px):
   - Desktop: the «Դասընթացներ» sub nav opens on hover and on click, and closes on link click, Escape and outside click.
   - Mobile: the burger opens and closes the menu, the «Դասընթացներ» accordion expands, tapping a link closes the menu, and nothing scrolls sideways.
2. **Run lint and tests** and report the results. No lint or test scripts exist yet (`package.json` has only `build`, `build:css` and `dev`). Until they're added, run `npm run build`, confirm it succeeds, and say plainly that there's no lint or test setup.
