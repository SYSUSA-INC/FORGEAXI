/**
 * BL-UI-THEME — the palette for JavaScript (BL-BRAND-FORGEAXI: the
 * ForgeAXI brand standard's values; see src/app/globals.css).
 *
 * Two exports, two jobs:
 *
 *  - `THEME` — CSS-variable references (`rgb(var(--c-cobalt-500))`) for
 *    anything rendered in the page: SVG chart fills, inline `style`
 *    status maps, presence cursors. They follow the active theme (light
 *    default, dark via `data-theme="dark"`) because the browser resolves
 *    the variable at paint time. Combine with `withAlpha` for tints.
 *
 *  - `THEME_HEX` — literal hex for contexts that have no access to the
 *    page's variables: HTML emails, the PDF renderer's template
 *    defaults, values stored in the database. These are the dark-theme
 *    values (the email shell is dark) and are tested against the
 *    `[data-theme="dark"]` block in globals.css.
 *
 * Both are keyed by ROLE (cobalt / cobaltLight / cobaltDeep, text / muted
 * …), never by lightness, so a constant reads correctly on either theme.
 * Pure constants — no "server-only" so client components and charts can
 * import it.
 */

const v = (name: string) => `rgb(var(--c-${name}))`;

/** Which `--c-*` variable each role maps to. */
export const THEME_VAR_MAP = {
  canvas: "canvas",
  paper: "paper",
  bone: "bone",
  concrete: "concrete",
  layer: "layer",
  text: "text",
  muted: "muted",
  subtle: "subtle",
  faint: "faint",
  cobalt: "cobalt-500",
  cobaltLight: "cobalt-400",
  cobaltDeep: "cobalt-600",
  brass: "brass-500",
  brassLight: "brass-400",
  brassDeep: "brass-600",
  green: "green-500",
  greenLight: "green-400",
  greenDeep: "green-600",
  red: "red-500",
  redLight: "red-400",
  redDeep: "red-600",
  indigo: "indigo-500",
  indigoLight: "indigo-400",
  plum: "plum-500",
  plumDeep: "plum-600",
} as const;

export type ThemeColor = keyof typeof THEME_VAR_MAP;

/** Theme-following colour values for the DOM. */
export const THEME: Record<ThemeColor, string> = Object.fromEntries(
  Object.entries(THEME_VAR_MAP).map(([k, name]) => [k, v(name)]),
) as Record<ThemeColor, string>;

/**
 * Fixed colours for print and exported SVGs (white ground). They do not
 * follow either theme, so a theme re-tune cannot wash out a diagram.
 */
export const PRINT_HEX = {
  ink: "#181B23",
  muted: "#626B7D",
  paper: "#FFFFFF",
  stroke: "#2E5CE9",
  band: "#4583FF",
  accent: "#B98C36",
} as const;

/**
 * Email colours (ForgeAXI, light). Email clients cannot read CSS
 * variables or follow a theme, so mail uses these literals: white card on
 * the Slate 50 wash, Midnight ink and slate text, a Midnight button.
 */
export const EMAIL_HEX = {
  page: "#F7F9FB",
  card: "#FFFFFF",
  ink: "#101D35",
  muted: "#5A6A7E",
  line: "#D6DDE5",
  accent: "#101D35",
  onAccent: "#FFFFFF",
  tint: "#EDF1F5",
  brass: "#855409",
  green: "#11704D",
} as const;

/** Literal hex (dark-theme values) for emails, PDFs and stored data. */
export const THEME_HEX: Record<ThemeColor, string> = {
  canvas: "#101D35",
  paper: "#182943",
  bone: "#1F324F",
  concrete: "#293C5A",
  layer: "#FFFFFF",
  text: "#FFFFFF",
  muted: "#B6C0CC",
  subtle: "#8A98AA",
  faint: "#69798D",
  cobalt: "#45CBE8",
  cobaltLight: "#7DDBF0",
  cobaltDeep: "#26A6C4",
  brass: "#E8A43D",
  brassLight: "#ECAF50",
  brassDeep: "#D98B16",
  green: "#3EB886",
  greenLight: "#62CD9E",
  greenDeep: "#1E9669",
  red: "#EE707E",
  redLight: "#F18692",
  redDeep: "#C83E4D",
  indigo: "#8090E8",
  indigoLight: "#98A5EF",
  plum: "#B984CC",
  plumDeep: "#9D6AB0",
};

/**
 * Ordered categorical series for charts (funnel stages, pie slices).
 * Alternates hue families so adjacent series stay distinguishable
 * without leaving the corporate register.
 */
export const CHART_SERIES: readonly string[] = [
  THEME.cobaltLight,
  THEME.cobalt,
  THEME.cobaltDeep,
  THEME.brassLight,
  THEME.brass,
  THEME.indigo,
  THEME.plum,
  THEME.plumDeep,
  THEME.green,
];

/**
 * Collaboration presence cursors. Literal hex because the colour is
 * broadcast to other clients through Yjs awareness and must mean the
 * same thing on every screen. Twelve hues a viewer can tell apart.
 */
export const PRESENCE_PALETTE: readonly string[] = [
  THEME_HEX.cobalt,
  THEME_HEX.brass,
  THEME_HEX.green,
  THEME_HEX.plum,
  THEME_HEX.red,
  THEME_HEX.indigo,
  THEME_HEX.cobaltDeep,
  THEME_HEX.brassDeep,
  THEME_HEX.greenDeep,
  THEME_HEX.redDeep,
  THEME_HEX.plumDeep,
  "#4A9EC9", // steel blue — completes the dozen without repeating a family
];

/** `#RRGGBB` → `r g b` (the `--c-*` variable format). */
export function hexToRgbTriplet(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`Not a 6-digit hex color: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

const VAR_RE = /^rgb\((var\(--c-[a-z0-9-]+\))\)$/;

/**
 * Add alpha to a THEME value or a hex literal, for inline styles.
 *   withAlpha(THEME.cobalt, 0.15)      → "rgb(var(--c-cobalt-500) / 0.15)"
 *   withAlpha(THEME_HEX.cobalt, 0.15)  → "rgba(69, 131, 255, 0.15)"
 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.min(1, Math.max(0, alpha));
  const m = VAR_RE.exec(color.trim());
  if (m) return `rgb(${m[1]} / ${a})`;
  const [r, g, b] = hexToRgbTriplet(color).split(" ");
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
