import Link from "next/link";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Logo } from "@/components/brand/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aur-topline relative min-h-screen overflow-hidden bg-canvas text-text">
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <Logo height={34} priority />
        </Link>
        <ThemeToggle />
      </header>
      <main className="relative z-10 px-4 pb-12">{children}</main>
    </div>
  );
}
