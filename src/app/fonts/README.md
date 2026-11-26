# Vendored web fonts

`next build` must not depend on fonts.googleapis.com (BL-QC-fonts). `next/font/local`
in `src/app/layout.tsx` hashes these files and emits them to `/_next/static/media/`.

BL-BRAND-FORGEAXI (2026-11-26): ForgeAXI's typeface is Inter (brand standard
`docs/brand/BRAND_GUIDELINES.md` §9). It replaced Host Grotesk. Geist Mono stays for
numbers, times and compact labels; the standard names no monospace face.

| File | Family / axes | Source | Fetched | Bytes | SHA-256 |
|---|---|---|---|---|---|
| `inter-latin-wght.woff2` | Inter, latin, variable wght 100–900 | npm `@fontsource-variable/inter@5.3.0`, `files/inter-latin-wght-normal.woff2` | 2026-11-26 | 48256 | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| `geist-mono-latin-400.woff2` | Geist Mono v1.701, latin, Regular 400 | https://enablenow-website.vercel.app/assets/fonts/enablenow-6.woff2 | 2026-10-21 | 9864 | `3f98383b122fe015a48536cd4a1cda855a201718923ffe74931a01597107b9b5` |

## Licences

Both families are under the SIL Open Font License 1.1. The licence texts ship next to
the fonts, as the OFL requires: `OFL-Inter.txt` (Copyright 2016 The Inter Project
Authors) and `OFL-GeistMono.txt` (Copyright 2024 The Geist Project Authors). Do not
rename the font families.

## How they are used

One Inter file covers display, body and stencil; `globals.css` aliases `--font-body`
and `--font-stencil` to `--font-display`. The product uses four weights: 400, 500, 600
and 700. Geist Mono ships Regular only and is never given a synthetic bold.

## Refreshing

1. `npm pack @fontsource-variable/inter` and copy `files/inter-latin-wght-normal.woff2`
   and `LICENSE` from the package.
2. Update this table and the manifest in `tests/fonts/vendored-fonts.test.ts`.

## Coverage

Latin only (U+0000–00FF plus common punctuation and currency). Characters outside
that range fall back to Segoe UI, Arial or the system mono.
