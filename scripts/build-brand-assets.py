#!/usr/bin/env python3
"""
Build the ForgeAXI logo files the app serves from the artwork the owner
supplied (docs/brand/forgeaxi-logo-source.webp, 2026-11-26).

Shapes are never touched: the artwork is cropped to its own bounds and
its three colours are moved onto the locked brand values
(docs/brand/BRAND_GUIDELINES.md §16): the supplied file measures Ice
#2CB7D3 and Midnight #0B182A, the standard says #45CBE8 and #101D35.
The reversed lockup (§4.9: white lettering, Ice X, Ice emblem) is the
same pixels with Midnight moved to white. Replace all of this with the
production vector masters (§15) when they exist.

    python3 scripts/build-brand-assets.py      # needs Pillow and numpy
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/brand/forgeaxi-logo-source.webp"
OUT = ROOT / "src/assets/brand"
APP = ROOT / "src/app"

SRC_MIDNIGHT = np.array([11, 24, 42], float)
SRC_ICE = np.array([44, 183, 211], float)
WHITE = np.array([255, 255, 255], float)
MIDNIGHT = np.array([0x10, 0x1D, 0x35], float)
ICE = np.array([0x45, 0xCB, 0xE8], float)


def weights(rgb: np.ndarray) -> np.ndarray:
    """Each pixel as a mix of the artwork's Midnight, Ice and white (least squares, clipped, summing to 1)."""
    basis = np.stack([SRC_MIDNIGHT - WHITE, SRC_ICE - WHITE], axis=1)  # 3x2
    sol, *_ = np.linalg.lstsq(basis, (rgb.reshape(-1, 3) - WHITE).T, rcond=None)
    w = np.clip(sol.T, 0, 1)
    over = w.sum(1, keepdims=True)
    w = w / np.maximum(over, 1)
    return np.concatenate([w, 1 - w.sum(1, keepdims=True)], axis=1).reshape(rgb.shape[0], rgb.shape[1], 3)


def recolour(rgba: np.ndarray, lettering: np.ndarray) -> Image.Image:
    w = weights(rgba[..., :3].astype(float))
    rgb = w[..., 0:1] * lettering + w[..., 1:2] * ICE + w[..., 2:3] * WHITE
    alpha = np.where(rgba[..., 3] < 8, 0, rgba[..., 3])  # drop stray near-transparent specks
    return Image.fromarray(np.dstack([np.rint(rgb), alpha]).astype(np.uint8), "RGBA")


def main() -> None:
    src = np.asarray(Image.open(SOURCE).convert("RGBA"))
    solid = src[..., 3] >= 8
    ys, xs = np.where(solid)
    top, bottom, left, right = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    art = src[top:bottom, left:right]
    # The emblem is the first run of columns; the gap after it is empty.
    cols = solid[top:bottom, left:right].any(0)
    emblem_right = int(np.argmin(cols))

    OUT.mkdir(parents=True, exist_ok=True)
    light = recolour(art, MIDNIGHT)
    light.save(OUT / "forgeaxi-logo.png", optimize=True)
    recolour(art, WHITE).save(OUT / "forgeaxi-logo-reversed.png", optimize=True)

    emblem = light.crop((0, 0, emblem_right, light.height))
    side = max(emblem.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(emblem, ((side - emblem.width) // 2, (side - emblem.height) // 2))
    square.save(OUT / "forgeaxi-emblem.png", optimize=True)
    # Next.js file conventions: the browser tab icon and the home-screen icon.
    square.resize((96, 96), Image.LANCZOS).save(APP / "icon.png", optimize=True)
    square.resize((180, 180), Image.LANCZOS).save(APP / "apple-icon.png", optimize=True)
    print(f"lockup {light.size}, emblem {square.size}")


if __name__ == "__main__":
    main()
