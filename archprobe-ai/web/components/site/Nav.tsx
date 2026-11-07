import Link from "next/link";
import { Logo } from "@/components/ui";

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
            <Link href="/#how" className="hover:text-ink">
              How it works
            </Link>
            <Link href="/tracks" className="hover:text-ink">
              Role guides
            </Link>
            <Link href="/#pricing" className="hover:text-ink">
              Pricing
            </Link>
            <Link href="/#faq" className="hover:text-ink">
              FAQ
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app" className="btn hidden px-3 text-ink-soft hover:text-ink sm:inline-flex">
            Open app
          </Link>
          <Link href="/start" className="btn-primary">
            Build my plan
          </Link>
        </div>
      </div>
    </header>
  );
}
