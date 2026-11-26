/**
 * BL-BRAND-FORGEAXI 2b — every email opens with the ForgeAXI logo.
 *
 * A mail client loads the image by absolute address, so the file has to
 * exist at the path the email names, be a PNG, keep the lockup's
 * proportions and be shown no narrower than the brand standard's 160 px.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EMAIL_LOGO, emailLogoUrl } from "@/lib/app-url";
import { emailShell } from "@/lib/email";

describe("the email logo", () => {
  it("has an absolute address on the site itself", () => {
    expect(emailLogoUrl({ VERCEL_ENV: "production" })).toBe("https://www.forgeaxi.com/brand/forgeaxi-logo-email.png");
    expect(emailLogoUrl({ NEXT_PUBLIC_APP_URL: "https://forge.example.com/" })).toBe("https://forge.example.com/brand/forgeaxi-logo-email.png");
  });

  it("is a PNG in public/ at twice the size it is shown, and at least 160 px wide", () => {
    const png = readFileSync(join(process.cwd(), "public", EMAIL_LOGO.path));
    expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([EMAIL_LOGO.width * 2, EMAIL_LOGO.height * 2]);
    expect(EMAIL_LOGO.width).toBeGreaterThanOrEqual(160);
    // Colour type 2 is RGB with no alpha: a dark-mode client cannot show the lettering on a dark ground.
    expect(png[25]).toBe(2);
  });

  it("opens every email, as an image with the name as its alternative text", () => {
    const html = emailShell("Title", "<p>Body</p>");
    const img = /<img [^>]+>/.exec(html)?.[0] ?? "";
    expect(img).toContain(`src="${emailLogoUrl()}"`);
    expect(img).toContain('alt="ForgeAXI"');
    expect(img).toContain(`width="${EMAIL_LOGO.width}"`);
    expect(img).toContain(`height="${EMAIL_LOGO.height}"`);
    expect(html.indexOf("<img")).toBeLessThan(html.indexOf("<p>Body</p>"));
    expect(html).toContain("ForgeAXI · Proposal Lifecycle Platform");
    expect(html).not.toMatch(/\bFORGE\b/);
  });
});
