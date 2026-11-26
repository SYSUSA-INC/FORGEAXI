# CLAUDE.md — FORGE

Read `AGENTS.md` first: it holds the agent guidelines, the conventions
and the pointers to `docs/ENGINEERING_STANDARDS.md`. This file adds the
brand so it is in front of you whenever you touch the UI.

@AGENTS.md

## The ForgeAXI brand (owner, 2026-11-26)

The product is **ForgeAXI**, a proposal lifecycle platform. The owner's
brand standard is `docs/brand/BRAND_GUIDELINES.md`: read its §16 (locked
decisions) and §17 (instructions for AI systems) before any brand, logo
or copy work. It replaces the EnableNow palette of 2026-10-21. If a
request conflicts with the standard, say so; do not quietly change it.

- **Name:** always **ForgeAXI**, capitalised exactly so. Descriptor:
  "Proposal Lifecycle Platform". Brand line: "One connected pursuit.
  From opportunity to submission."
- **Logo:** artwork only, never typed and never redrawn. Use
  `<Logo />` or `<LogoEmblem />` from `src/components/brand/Logo.tsx`.
  The lockup is at least 160 px wide, the emblem at least 24 px, each
  with clear space around it. The files are built from the owner's
  artwork by `scripts/build-brand-assets.py`.
- **Type:** Inter (400, 500, 600, 700). Geist Mono for numbers, times
  and compact labels.
- **Voice:** clear, confident, human, about outcomes. No "revolutionary",
  "game-changing", "effortless", "AI-powered", sparkles or robots.

## Brand palette

These are the standard's colours. In components, never write the hex:
use the FORGE token on the right (a Tailwind class, or `THEME.*` in
JavaScript). The token names are older than the brand (the Ice family is
still called `cobalt`); the names stay so no component has to change.
The rules and the full token list are in `docs/DESIGN_SYSTEM.md`.

**Primary brand colours**

| Colour | Hex | FORGE token |
|---|---|---|
| Midnight | `#101D35` | `text`, `layer`, `action` (light); `canvas` (dark); `on-action` (dark) |
| Ice | `#45CBE8` | `cobalt-400` (light): fills, bars, chart marks; `cobalt` / `cobalt-500`, `accent`, `action` (dark) |
| White | `#FFFFFF` | `canvas`, `paper`, `on-action` (light); `text` (dark) |

Ice on white is 1.9:1, so on the light theme it is never text, a link, a
focus ring or a thin mark. The readable Ice there is `cobalt` /
`cobalt-500` and `accent`: a deepened Ice, `#0B728F` (5.5:1), which is
FORGE's own extension of the standard.

**Supporting neutrals**

| Colour | Hex | FORGE token |
|---|---|---|
| Midnight 800 | `#182943` | `paper` (dark), `action-hover` (light) |
| Slate 700 | `#34465D` | `muted` (light) |
| Slate 500 | `#69798D` | `faint` (dark); on light `subtle` is a step deeper, `#5A6A7E`, to reach 4.5:1 |
| Slate 300 | `#B6C0CC` | `faint` (light), `muted` (dark) |
| Slate 200 | `#D6DDE5` | not a token: `border-layer/15` lands on it |
| Slate 100 | `#EDF1F5` | `concrete` (light) |
| Slate 50 | `#F7F9FB` | `bone` (light) |

**Functional colours** — for state only, never as a second brand colour.

| Colour | Hex | FORGE token |
|---|---|---|
| Success | `#16865C` | `green-400` (light), `green-700` (dark); `green` / `green-500` is a deeper step for text |
| Warning | `#D98B16` | `brass-400` (light), `brass-600` (dark); `brass` / `brass-500` is a deeper step for text (the brand value is 2.7:1 on white) |
| Critical | `#C83E4D` | `red-400` (light), `red-600` (dark); `red` / `red-500` is a deeper step for text |
| Information | `#45CBE8` | the Ice family (`cobalt`) |

Review (`indigo`) and pink team (`plum`) have no colour in the standard
and keep FORGE's own hues.

Light and dark use the same names. Where a row says "(light)" or
"(dark)", that theme's `globals.css` block holds the value. The other
theme holds the matching colour for its ground.

**The rules that make it read as one system** (`docs/DESIGN_SYSTEM.md` §4):

- **Midnight carries the authority, Ice is the signature.** Ink,
  headings and primary buttons are Midnight (on the dark theme the
  ground is Midnight and primary buttons are Ice). Ice marks selection,
  focus and what is live, and stays scarce: never a wash, never
  decoration.
- **Hairlines, not boxes.** A card is paper with a 1px hairline. Only
  menus and dialogs float with a shadow.
- **Status means the same thing everywhere.**
  - green: done or won;
  - red: blocked, lost or mandatory;
  - brass: attention or partial;
  - cobalt (the Ice family): in progress;
  - indigo: analysis or review;
  - plum: pink team;
  - muted: not started.
- **No hex or `rgba(...)` palette values in components.** For alpha, use
  `bg-cobalt/15` in classes and `withAlpha(THEME.cobalt, 0.15)` in
  JavaScript. Never append hex alpha to a `THEME.*` value: it is a
  `var()` reference, so `${THEME.cobalt}1A` is invalid CSS.
