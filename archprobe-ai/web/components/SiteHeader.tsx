import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10">
      <Link href="/" className="group flex items-baseline gap-2">
        <span className="font-display text-2xl tracking-tight text-white md:text-3xl">
          ArchProbe
          <span className="text-signal"> AI</span>
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-slate-500 transition group-hover:text-signal sm:inline">
          Staff bar simulator
        </span>
      </Link>
      <nav className="flex items-center gap-4 font-mono text-xs uppercase tracking-wider text-slate-400 md:gap-6">
        <Link href="/#trial" className="hover:text-signal">
          Free trial
        </Link>
        <Link href="/#pricing" className="hover:text-signal">
          Pricing
        </Link>
        <Link href="/dashboard" className="hover:text-signal">
          Memory
        </Link>
        <Link
          href="/interview/llm-gateway-sidecar"
          className="rounded-md border border-signal/40 bg-signal/10 px-3 py-1.5 text-signal transition hover:bg-signal/20"
        >
          Enter interview
        </Link>
      </nav>
    </header>
  );
}
