# ForgeAXI design system — Ice / Midnight

> BL-UI-THEME, BL-BRAND-FORGEAXI. How colour, type and shape work in the
> ForgeAXI UI, where they are defined, and the rules that keep them
> coherent. Read this before adding a colour to a component. The brand
> itself (name, logo, voice, the locked colours) is the owner's standard,
> `docs/brand/BRAND_GUIDELINES.md`; this file is how the product applies it.

## 1. Direction

The interface should feel like the brand: control, connection, momentum.
The proposal text and the data are the hero; chrome stays quiet.

- **Midnight carries the authority.** Ink, headings and primary buttons
  are Midnight; surfaces are white and the palest slates.
- **Ice is the signature, kept scarce.** It marks selection, focus,
  links and what is in progress or live. It is never a wash or a
  decoration (standard §8: 5 to 10% of a composition).
- **Ice is not text on white.** At 1.9:1 it fails; on the light theme
  the readable Ice is a deepened step (`cobalt-500`, 5.5:1) and Ice
  itself is a fill (`cobalt-400`). On the dark theme Ice is 8.8:1 on
  Midnight and is used as it is.
- **Hairlines, not boxes.** Structure comes from 1px rules and small
  labels. Cards are paper with a hairline and a 5px corner; only things
  that float (menus, dialogs) get a shadow.
- **Two voices.** Inter for what you read; Geist Mono for what you
  scan: numbers, times, identifiers, compact labels. Headings are Inter
  SemiBold, the page title Bold.
- **The diamond marks "on".** The small rotated square (`aur-diamond`)
  marks the current nav item, the selected tab, the page eyebrow.
- **The logo is artwork.** `<Logo />` (the horizontal lockup, 160 px
  wide at the least) and `<LogoEmblem />` (24 px at the least) from
  `src/components/brand/Logo.tsx`; the dark theme shows the reversed
  lockup. Never type the name as a logo, recolour it, box it or put a
  tagline inside it (standard §4.11).

**Two themes, one set of names.** The default is **light**: white paper,
Midnight ink and buttons. The **dark** theme has a Midnight ground,
Midnight 800 panels, white ink and Ice for accents and primary buttons.
It sits behind the header toggle (☾ / ☀), is stored per viewer in
`localStorage` as `forge.theme`, and is applied as `data-theme="dark"`
on `<html>` before first paint. Every component is written once; the
variables do the work.

| Family | Role | Brand source |
|---|---|---|
| **Surfaces** (`canvas`, `paper`, `bone`, `concrete`) | Page, cards, quiet panels, cool panels | White, White, Slate 50, Slate 100 · dark: Midnight, Midnight 800, then two raised steps toward Slate 700 |
| **Ink** (`text`, `muted`, `subtle`, `faint`) | Body, secondary, tertiary, hairline-grade | Midnight, Slate 700, a step deeper than Slate 500 (which is 4.45:1 on white), Slate 300 · dark: White, Slate 300, a tier between Slate 300 and 500, Slate 500 |
| **Action** (`action`, `action-hover`, `on-action`) | The primary button's fill and its lettering | Midnight with white lettering, Midnight 800 on hover · dark: Ice with Midnight lettering |
| **Accent** (`accent`) | Eyebrows, links, the focus ring, the diamond | Deepened Ice on light · Ice on dark |
| **Cobalt** (the Ice family) | Selection, "in progress", chart marks | 400 is Ice on light and 500 its readable deep step · on dark 500 is Ice |
| **Green** | Success, won, complete | Success: 400 on light is the brand value, 500 a deeper step for text · lifted on dark |
| **Signal** (`signal-live`, `signal-soft`) | Something live (the header clock and live marker) | Success, with its pale tint |
| **Brass** | Attention, warning, partial | Warning: 400 on light is the brand value (fills only: 2.7:1), 500 a deep step for text · lifted on dark |
| **Red** | Danger, lost, blocked, mandatory | Critical: 400 on light is the brand value, 500 a deeper step · lifted on dark |
| **Indigo** | Analysis and review stages, AI suggestions | FORGE's own: the standard has no equivalent |
| **Plum** | Pink-team review | FORGE's own |

## 2. Where it is defined

**One source for CSS, one mirror for JavaScript, tested against each
other.**

1. `src/app/globals.css`: `:root` (light) and `:root[data-theme="dark"]`
   each declare every colour as an RGB triplet, for example
   `--c-cobalt-500: 11 114 143;`. Families have stops 200–700 (plum
   300–600); surfaces and type are single values. The two blocks declare
   the same names (tested). `--c-action` is the primary-button fill
   and `--c-on-action` its lettering: white on Midnight (light),
   Midnight on Ice (dark). Use `text-on-action` on anything filled with
   `bg-action`, never `text-white`.
2. `tailwind.config.ts`: every Tailwind colour is
   `rgb(var(--c-<name>) / <alpha-value>)`, so `bg-canvas/70`,
   `text-emerald-300`, `border-layer/10` resolve to the variables above
   and alpha modifiers keep working. It also holds the radius
   scale (`rounded-sm` 3px, `rounded-md`/`-lg` 5px, `-xl` 9px, `-2xl`
   14px), the tracking (`tracking-label` 0.06em, `tracking-meta` 0.04em,
   `tracking-title` −0.032em, `tracking-headline` −0.042em; `widest` and
   `wider` follow the labels) and the fonts.
3. `src/lib/theme-colors.ts`: `THEME.*` are **variable references**
   (`rgb(var(--c-cobalt-500))`) for anything in the page that has to be
   a JavaScript value (SVG chart fills, inline status maps, presence
   cursors); they follow the active theme. `THEME_HEX.*` are literal
   hex (the dark values) for contexts with no page variables: HTML
   emails, PDF template defaults, stored data. `withAlpha()` tints
   either kind.
4. `src/app/fonts/`: Inter (variable, wght 100–900) and Geist Mono
   (Regular), self-hosted with their OFL licences; `layout.tsx` binds
   them to `--font-display` and `--font-mono`. The `:root` fallbacks sit
   in a zero-specificity `:where(:root)` block so the loaded fonts
   always win.

**Stops are roles, not lightness.** `200`/`300` are text-on-a-tint tones
(dark on the light theme, light on the dark theme), `400` is a solid mid
tone or gradient start, `500` (`DEFAULT`) is a readable solid on the
canvas, `600`/`700` are deep. So `bg-emerald-500/15 text-emerald-300`
reads correctly on both themes without a `dark:` variant anywhere. On the
light theme every family's 500 reads as text on paper (cobalt, green,
brass, red, indigo and plum all measure 6:1 or better; `muted` 7:1).

The owner's palette (the brand standard's colours by name, with the
token each one maps to) is in `CLAUDE.md` at the repository root.

**`layer` is the ink for translucent layers**: Midnight on light, white
on dark. `border-layer/10` lands near Slate 100 and `border-layer/15`
near Slate 200, the standard's divider.
Never use `bg-white/5`: it is invisible on the light theme, and the token
test rejects it.

## 3. Names you can use in `className`

Semantic names first; the legacy aliases stay so existing components did
not have to change:

| Use this | Legacy aliases that resolve to the same family |
|---|---|
| `cobalt`, `cobalt-200…700` | `teal`, `teal-NNN`, `sky`, `sky-200…400` |
| `brass`, `brass-200…700` | `gold`, `hazard`, `amber`, `amber-NNN` |
| `green`, `green-200…700` | `emerald`, `emerald-NNN`, `signal` (plus `signal-live`, `signal-soft`) |
| `red`, `red-200…700` | `rose`, `rose-NNN`, `blood` |
| `indigo`, `indigo-200…700` | `violet`, `violet-NNN` |
| `plum`, `plum-300…600` | `magenta` |
| `canvas`, `paper`, `bone`, `concrete`, `text`, `muted`, `subtle`, `faint`, `layer`, `action`, `accent` | `ink` (= canvas) |

Utility classes in `globals.css`:

- **Cards:** `aur-card` (paper, hairline, 5px), `aur-card-flat` (the bone
  wash), `aur-card-elevated` (the float shadow, for what lifts off the
  page: dialogs, menus, the palette).
- **Dialogs:** `aur-scrim` is the one backdrop behind a dialog, menu sheet
  or palette (the page frosted under paper); the panel on it is
  `aur-card-elevated`. Code and log blocks sit on `bg-bone` with a
  hairline, never a black slab.
- **Buttons:** three: `aur-btn-primary` (solid: Midnight, Ice on dark),
  `aur-btn` (the light button), `aur-btn-ghost` (text, for toolbar-level
  quiet actions). Also `aur-btn-danger`. One size: no `text-[11px]` or
  `py-2` on a button. A secondary action beside a primary (Cancel, Close,
  Dismiss, Done, Back, Open) is `aur-link`, a text link, not a button.
- **Forms and labels:** `aur-input` (Inter, strong hairline),
  `aur-label` (Geist Mono, uppercase, 0.06em).
- **Chips and dividers:** `aur-chip`, `aur-pill`, `aur-divider`.
- **Marks:** `aur-diamond` (the "on" mark), `aur-brand-mark` (the action
  fill behind a person's initials). The brand's own mark is the logo
  component, not a class.

## 4. Rules

1. **No hex in components.** Use a Tailwind class, or `THEME.*` when the
   value must be JavaScript (SVG, inline style). The theme-tokens test
   fails on a `#RRGGBB` literal in `src/components/ui`,
   `src/components/shell`, the status-map modules and the retouched
   panels. Third-party brand marks (SSO buttons) are the only exception
   and live outside those paths.
2. **Alpha via Tailwind** (`bg-cobalt/15`) or `withAlpha(THEME.cobalt, 0.15)`
   in JS. Never hand-write `rgba(...)` with palette numbers.
3. **One accent.** Ice (`accent` for labels, links, focus and the diamond; `cobalt` for selection and in-progress status) is the only emphasis colour, and stays scarce. Brass
   is attention, not a second accent or a brand colour.
4. **Status means the same thing everywhere.** Green = done / won,
   red = blocked / lost / mandatory, brass = attention / partial /
   desired, cobalt = in progress / assigned, indigo = under analysis or
   review, `muted` = not started / informational. Colour teams, stages and
   categories are not statuses: they use `aur-tag` (`ColorTeamTag`), an ink
   label with the team hue only on the leading diamond (owner, 2026-10-22).
5. **Hairlines before shadows.** A card is a hairline on paper; reach
   for `aur-card-elevated` only for something that floats over the page.
6. **Type roles.** Inter in four weights (standard §9, §10): the page
   title `font-bold` (700), section headings `font-semibold` (600),
   small titles and UI `font-medium` (500), text 400. Nothing heavier,
   and Geist Mono is never given a synthetic bold. Many headings still
   carry `font-normal` from the earlier look; moving them, and lifting
   10 px labels to the standard's 12 px minimum, is the third part of
   BL-BRAND-FORGEAXI. Mono labels use
   `tracking-label`, not wide arbitrary tracking. A page title
   (`PageHeader`) is one line at any width: `text-2xl`, 28px from `md`,
   `tracking-title`, truncated with … and the full title on hover
   (owner, 2026-11-07).
7. **Two ink tiers.** Text is `text-text` or `text-muted` (`text-subtle`
   for the least important line). Don't fade ink with an alpha
   (`text-muted/70`): on paper it drops below a readable contrast.
8. **Adding a colour:** add the `--c-*` triplet(s) to **both** blocks in
   `globals.css`, the Tailwind entry in `tailwind.config.ts`, and, if
   JavaScript needs it, the role in `THEME_VAR_MAP` plus its `THEME_HEX`
   value. Run `npx vitest run tests/design`.
9. **Theme switching:** `ThemeToggle` (`src/components/shell/`) sets
   `data-theme` and `localStorage["forge.theme"]`; the inline script in
   `app/layout.tsx` re-applies it before paint. Never branch on the
   theme in a component; put the difference in the variables.

## 5. Not in this pass

- PDF renderers (`src/lib/pdf-template-render.ts`,
  `src/lib/compliance-crosswalk-render.ts`) keep their own document
  palette and fonts; tenants style their documents through templates.
- `src/components/editor/RichSectionEditor.tsx` keeps one `rgba` comment
  highlight; the editor gets its own pass with BL-AIP-6.
