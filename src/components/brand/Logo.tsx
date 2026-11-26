import Image from "next/image";
import emblem from "@/assets/brand/forgeaxi-emblem.png";
import lockup from "@/assets/brand/forgeaxi-logo.png";
import lockupReversed from "@/assets/brand/forgeaxi-logo-reversed.png";

/**
 * BL-BRAND-FORGEAXI — the ForgeAXI logo (docs/brand/BRAND_GUIDELINES.md §4).
 *
 * The primary logo is the horizontal lockup: emblem left, wordmark
 * right. It is artwork, never typed: these files are built from the
 * owner's master by scripts/build-brand-assets.py. On light surfaces
 * the Midnight lockup shows; on the dark theme the reversed one (white
 * lettering) does, switched in CSS so there is no flash on load. The
 * lockup is never drawn under 160 px wide (§4.7); where there is less
 * room, use `LogoEmblem` (24 px at least). Leave clear space around
 * either (§4.6): nothing closer than a quarter of the emblem's width.
 */
const RATIO = lockup.width / lockup.height;

export function Logo({ height = 34, priority = false, className = "" }: { /** Rendered height in px; the width follows (34 gives the 160 px minimum). */ height?: number; priority?: boolean; className?: string }) {
  const h = Math.max(height, 34);
  const size = { width: Math.round(h * RATIO), height: h };
  return (
    <span className={`inline-flex flex-none ${className}`}>
      <Image src={lockup} alt="ForgeAXI" {...size} priority={priority} className="brand-logo-light" />
      <Image src={lockupReversed} alt="ForgeAXI" {...size} priority={priority} className="brand-logo-reversed" />
    </span>
  );
}

/** The standalone emblem, for compact places: the collapsed rail, small headers. Works on both grounds. */
export function LogoEmblem({ size = 32, className = "" }: { size?: number; className?: string }) {
  const s = Math.max(size, 24);
  return <Image src={emblem} alt="ForgeAXI" width={s} height={s} className={`flex-none ${className}`} />;
}
