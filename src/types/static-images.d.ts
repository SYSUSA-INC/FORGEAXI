/**
 * A PNG imported from a component is a Next.js static image. Next's own
 * declaration for this lives in next-env.d.ts, which is generated and not
 * committed, so the type check in CI (which runs before any build) needs
 * it stated here.
 */
declare module "*.png" {
  const content: import("next/image").StaticImageData;
  export default content;
}
