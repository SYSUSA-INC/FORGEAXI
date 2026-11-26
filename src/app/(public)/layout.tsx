import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Logo } from "@/components/brand/Logo";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const signedIn = !!session?.user;

  return (
    <div className="aur-topline relative min-h-screen overflow-hidden bg-canvas text-text">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Logo height={34} priority />
          <span className="hidden font-mono text-[10px] uppercase tracking-label text-muted sm:inline">Proposal Lifecycle Platform</span>
        </Link>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/pricing"
            className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-text"
          >
            Pricing
          </Link>
          {signedIn ? (
            <Link href="/" className="aur-btn aur-btn-primary">
              Go to app →
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="font-mono text-[11px] uppercase tracking-widest text-muted hover:text-text"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="aur-btn aur-btn-primary"
              >
                Get started →
              </Link>
            </>
          )}
        </nav>
      </header>
      <main className="relative z-10 px-4 pb-20">{children}</main>
      <footer className="relative z-10 border-t border-layer/5 px-6 py-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted md:px-10">
        © {new Date().getFullYear()} ForgeAXI · Proposal Lifecycle Platform
      </footer>
    </div>
  );
}
