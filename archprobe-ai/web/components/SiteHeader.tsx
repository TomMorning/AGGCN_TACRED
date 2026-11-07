import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-white/5 bg-ink-950/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="group flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-tight text-white md:text-[1.7rem]">
            ArchProbe
            <span className="text-signal"> AI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <Link href="/#scenarios" className="hidden hover:text-signal sm:inline">
            Scenarios
          </Link>
          <Link href="/#pricing" className="hidden hover:text-signal sm:inline">
            Pricing
          </Link>
          <Link href="/dashboard" className="hover:text-signal">
            Memory
          </Link>
          <Link
            href="/interview/llm-gateway-sidecar"
            className="rounded-md bg-signal px-3 py-1.5 font-semibold text-ink-950 transition hover:bg-signal-glow"
          >
            Start interview
          </Link>
        </nav>
      </div>
    </header>
  );
}
