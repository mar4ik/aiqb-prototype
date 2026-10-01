# AI քեզ բան — brand rules

The source of truth for every design and for the code. Distilled from the brandbook in Figma,
[Brand · AI Qez Ban · v3](https://www.figma.com/design/MYvaqFtPgZ9e6J28NM4Fk9/-Brand--AI-Qez-Ban-Brand-_-v3?node-id=1-1237): [Colour](https://www.figma.com/design/MYvaqFtPgZ9e6J28NM4Fk9/-Brand--AI-Qez-Ban-Brand-_-v3?node-id=1-1237) (slides 17–22), [Typography](https://www.figma.com/design/MYvaqFtPgZ9e6J28NM4Fk9/-Brand--AI-Qez-Ban-Brand-_-v3?node-id=1-1500) (slides 23–28).
If code, a design or a request conflicts with this file, flag it instead of guessing.
Colour and typography are here so far; logo and voice come from the same Figma file.

## Colour

Blue leads, Orange accents and Black grounds everything; the Feed colours rotate across posts, each post
its own colour. This is the default, not a limit: a campaign can bring its own colour scheme when it needs
one. Every text pairing must reach WCAG AA.

Each colour is a Tailwind token in `tailwind.css` (`@theme`), named after its Figma variable, so design and
code use the same names (`bg-brand-blue`, `var(--color-feed-teal)`, …).

| Tier | Name | Hex | Token | Figma variable |
|---|---|---|---|---|
| Primary | Blue — the primary colour | `#1E66EE` | `--color-brand-blue` | Brand/Blue |
| Primary | Orange — the accent | `#FF5E16` | `--color-brand-orange` | Brand/Orange |
| Neutral | Black — the default ground | `#000000` | `--color-neutral-black` | Neutral/Black |
| Neutral | Ink | `#1E1E21` | `--color-neutral-ink` | Neutral/Ink |
| Neutral | Grey | `#D1D1D1` | `--color-neutral-grey` | Neutral/Grey |
| Neutral | White | `#FFFFFF` | `--color-neutral-white` | Neutral/White |
| Feed | Teal | `#00C4B1` | `--color-feed-teal` | Feed/Teal |
| Feed | Yellow | `#FFCA53` | `--color-feed-yellow` | Feed/Yellow |
| Feed | Sky | `#A2D4FF` | `--color-feed-sky` | Feed/Sky |
| Feed | Pink | `#FFB0E8` | `--color-feed-pink` | Feed/Pink |
| Occasional | Violet | `#6868E4` | `--color-limited-violet` | Limited/Violet |
| Occasional | Tan | `#BD8164` | `--color-limited-tan` | Limited/Tan |

### Text on colour

| Background | Text |
|---|---|
| Blue, Black, Ink | White |
| Orange | White for headlines of 24px and up; Black for anything smaller |
| Teal, Yellow, Sky, Pink, Violet, Tan | Black |

### Don'ts

- No white text on Teal, Yellow, Sky, Pink or Grey.
- No white text under 24px on Orange.
- No gradients on brand colours.

### Campaign colours in use

A campaign can bring its own colours. They live in code as `--color-campaign-*` tokens:

- **Green** — Tailwind's green-600, `oklch(62.7% 0.194 149.214)`, token `--color-campaign-green`: the webinar bar and the floating buttons.
- **Bundle** — the Bundle card keeps its original colours (`--color-campaign-bundle-*`): a light-blue wash fading to white, the animated ribbon border (Blue, light blue, Orange, violet), the white-on-Orange «−20%» pill, the pale green «Խնայիր» pill and the violet «Նվեր» pill. Two deliberate exceptions to the rules above: the gradients, and white text under 24px on Orange.

## Typography

**Adelle Sans ARM is the only typeface**, for Armenian and Latin. Three weights, three jobs:

- **ExtraBold Italic** (800 italic) for headlines
- **Regular** (400) for text
- **SemiBold** (600) for details

### Type scale

Every size is saved as an AQB text style in Figma and is a `--text-aqb-*` token in `tailwind.css`.
The utility `text-aqb-…` sets size, line height, tracking and weight together; headlines still need `italic`.

| Role | Size (px) | Weight | Line height | Tracking | Token | Figma text style |
|---|---|---|---|---|---|---|
| Display | 192 | ExtraBold Italic | 102% | −2.4% | `--text-aqb-display-xxl` | AQB/Display XXL |
| Display | 128 | ExtraBold Italic | 102% | −2.4% | `--text-aqb-display-xl` | AQB/Display XL |
| Display | 96 | ExtraBold Italic | 102% | −2.4% | `--text-aqb-display-l` | AQB/Display L |
| Headline | 64 | ExtraBold Italic | 102% | −2.4% | `--text-aqb-headline-h1` | AQB/Headline H1 |
| Headline | 48 | ExtraBold Italic | 102% | −2.4% | `--text-aqb-headline-h2` | AQB/Headline H2 |
| Subhead | 32 | SemiBold | 112% | −2.4% | `--text-aqb-subhead` | AQB/Subhead |
| Body | 28 | Regular | 112% | −2.4% | `--text-aqb-body-l` | AQB/Body L |
| Body | 24 | Regular | 112% | −2.4% | `--text-aqb-body-m` | AQB/Body M |
| Body | 20 | Regular | 112% | 0% | `--text-aqb-body-s` | AQB/Body S |
| Label | 16 | SemiBold | 112% | 0% | `--text-aqb-label` | AQB/Label — **open:** the Figma style is Bold, the rules say SemiBold for details |
| Caption | 14 | SemiBold | 112% | 0% | `--text-aqb-caption` | AQB/Caption |

### Tracking and line height

Start from these: tracking −2.4% at 24px and up, 0% below; headlines at 102% line height, text at 112%.
Break them on purpose when the idea needs it, never by accident.

### Hierarchy

One kicker, one headline and one detail line per composition. Size and weight carry the hierarchy.

| Line | Weight | Job |
|---|---|---|
| Kicker | Regular | Sets the scene in a few words |
| Headline | ExtraBold Italic | The one message; the biggest thing on the page |
| Detail | SemiBold | Date, time, place or format |

### Case

Mostly sentence case, not all caps. The designer can switch to caps whenever it works better.

### Play with type

Experiment with type: tilt it, shadow it, push the contrast. The designer decides. The one wrong move is the
ordinary one. (The brandbook's "Don't play it safe" slide is still TBD.)

## Graphic elements

### Bubble construction

([Figma](https://www.figma.com/design/MYvaqFtPgZ9e6J28NM4Fk9/-Brand--AI-Qez-Ban-Brand-_-v3?node-id=1-2164), slide 40.)
Stack 3–5 rounded rectangles and merge them. Outer corners 20 px, inner corners 10 px on a 1080 canvas.
Add one straight, angled tail.

1. **Stack** — 3–5 rounded rectangles, 20 px corners
2. **Merge** — union them; inner corners 10 px
3. **Cut** — add one straight, angled tail
4. **Peek** — the eyes sit just outside a corner

On the site the bubble shapes the containers themselves, never a pattern inside them: each «Ի՞նչ սովորել» tile
is cut into a bubble for its size (`script.js` → learnShapes: corners 24 / 12, the same 2:1 ratio, a tail at a top
corner, a stepped corner, a slit on the tall tiles), and nothing is cut where the title sits.

### Chat bubble

A speech bubble with straight sides and small corners (8 on a 240 × 302 drawing). At the bottom-right the side steps
in a little and drops into one angled tail pointing down; from the tail the bottom edge falls away to the bottom-left
corner. On the site it is the hero's «Սովորի՛ր» button (`.btn--inline`, shaped by `script.js` → heroBubble for the
word's real size, the tail's proportions kept).

### Eyes

Two white ovals with black pupils (96 × 50), no outline. As a character on the site (the hero walk) they never
carry the ™. Their directions ([Figma](https://www.figma.com/design/MYvaqFtPgZ9e6J28NM4Fk9/-Brand--AI-Qez-Ban-Brand-_-v3?node-id=1-317)):
the pupils move on an oval, 9 sideways and 10.54 up or down from the centre of each eye (in the 96 × 50 drawing's
units); «at rest», looking at you, both lean in by 3.78.
