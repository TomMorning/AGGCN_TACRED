import Link from "next/link";
import { ArrowRight, BrainCircuit, ShieldAlert, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import TrialPanel from "@/components/TrialPanel";

const SCENARIOS = [
  {
    slug: "llm-gateway-sidecar",
    title: "Multi-Tenant AI Agent Gateway",
    meta: "50k RPM · exact billing",
    free: true,
    cat: "AI Infra",
  },
  {
    slug: "distributed-rate-limiter",
    title: "Global E-commerce Rate Limiter",
    meta: "500k QPS · <2ms P99",
    free: true,
    cat: "High Concurrency",
  },
  {
    slug: "financial-graph-rag",
    title: "Zero-Hallucination Financial GraphRAG",
    meta: "citation + arithmetic verify",
    free: true,
    cat: "AI Infra",
  },
  {
    slug: "agentic-workflow-engine",
    title: "Stateful Agentic Workflow Engine",
    meta: "HITL · sandboxed tools",
    free: false,
    cat: "AI Infra",
  },
  {
    slug: "high-freq-inventory-flash-sale",
    title: "Flash Sale Inventory Pipeline",
    meta: "200k writes · zero oversell",
    free: false,
    cat: "High Concurrency",
  },
  {
    slug: "realtime-social-intent-crawler",
    title: "Cost-Controlled Social Intent Pipeline",
    meta: "10M posts/day · budget caps",
    free: false,
    cat: "AI Infra",
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-10%] h-[70vh] w-[70vh] rounded-full bg-signal/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-[20%] h-[50vh] w-[50vh] rounded-full bg-sky-500/10 blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/40 to-transparent" />
      </div>

      <SiteHeader />

      <section className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-center px-6 pb-16 pt-14 md:px-10 md:pt-20">
        <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.28em] text-signal">
          Staff-bar interview simulator
        </p>
        <h1 className="animate-fade-up-delayed mt-5 max-w-4xl font-display text-5xl leading-[0.98] tracking-tight text-white md:text-7xl">
          ArchProbe <span className="text-signal">AI</span>
        </h1>
        <p className="animate-fade-up-late mt-6 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">
          Stop memorizing 2015 system design templates. Survive a real 2026 high-concurrency &amp; AI Staff
          Engineer interview.
        </p>
        <div className="animate-fade-up-late mt-9 flex flex-wrap gap-3">
          <Link
            href="/interview/llm-gateway-sidecar"
            className="inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow"
          >
            Enter free interview <ArrowRight size={14} />
          </Link>
          <Link
            href="#trial"
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-signal/40 hover:text-signal"
          >
            30-second roast
          </Link>
        </div>
        <div className="animate-fade-up-late mt-14 grid max-w-3xl gap-6 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500 sm:grid-cols-3">
          <div>
            <p className="text-signal">01</p>
            <p className="mt-1 text-slate-300">Golden-rubric grounded</p>
          </div>
          <div>
            <p className="text-signal">02</p>
            <p className="mt-1 text-slate-300">3-round chaos FSM</p>
          </div>
          <div>
            <p className="text-signal">03</p>
            <p className="mt-1 text-slate-300">L3 weakness memory</p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <TrialPanel />
      </section>

      <section id="scenarios" className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Scenario bay</p>
            <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Flagship drills</h2>
          </div>
          <Link href="/dashboard" className="hidden font-mono text-xs text-signal hover:text-signal-glow sm:inline">
            Your memory graph →
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s, i) => (
            <Link
              key={s.slug}
              href={`/interview/${s.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-ink-900/50 p-5 transition hover:border-signal/35 hover:bg-ink-800/60"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{s.cat}</span>
                <span
                  className={`font-mono text-[10px] uppercase tracking-wider ${
                    s.free ? "text-signal" : "text-amber-300/80"
                  }`}
                >
                  {s.free ? "Free" : "Pro"}
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl leading-snug text-white transition group-hover:text-signal">
                {s.title}
              </h3>
              <p className="mt-2 font-mono text-xs text-slate-500">{s.meta}</p>
              <span className="mt-6 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-slate-400 transition group-hover:text-signal">
                Open workspace <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 md:grid-cols-3 md:px-10">
        {[
          {
            icon: ShieldAlert,
            title: "Adversarial 3-round FSM",
            body: "Architecture → chaos injection → cost/edge cases. Direct Staff tone. No cheerleading.",
          },
          {
            icon: BrainCircuit,
            title: "L1/L2/L3 weakness memory",
            body: "Every turn updates your concept graph. Pass probability compounds across drills.",
          },
          {
            icon: Sparkles,
            title: "Golden-rubric grounding",
            body: "DeepSeek-V3 never invents grading criteria. PostgreSQL rubrics are the immutable prefix.",
          },
        ].map((item) => (
          <div key={item.title} className="border-t border-white/10 pt-6">
            <item.icon className="text-signal" size={22} />
            <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-28 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Pricing</p>
        <h2 className="mt-2 font-display text-3xl text-white md:text-4xl">Simple tiers. Serious practice.</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              per: "",
              points: ["3 core scenarios", "Homepage roast", "Basic Mermaid updates"],
              cta: "Start free",
              href: "/interview/llm-gateway-sidecar",
              highlight: false,
            },
            {
              name: "Pro",
              price: "$29",
              per: "/mo",
              points: ["Unlimited scenarios", "Full chaos probing", "Mermaid auto-draw", "L3 memory dashboard"],
              cta: "Coming soon",
              href: "#pricing",
              highlight: true,
            },
            {
              name: "Pass Guarantee",
              price: "$79",
              per: "/quarter",
              points: ["Everything in Pro", "Variant drills on weak nodes", "Priority rubric packs"],
              cta: "Coming soon",
              href: "#pricing",
              highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-signal/40 bg-signal/5 shadow-[0_0_40px_rgba(52,211,153,0.08)]"
                  : "border-white/10 bg-ink-900/40"
              }`}
            >
              <p className="font-mono text-xs uppercase tracking-wider text-signal">{tier.name}</p>
              <p className="mt-3 font-display text-4xl text-white">
                {tier.price}
                <span className="text-base text-slate-500">{tier.per}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                {tier.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-signal">·</span> {p}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className={`mt-6 inline-flex rounded-md px-4 py-2 font-mono text-xs uppercase tracking-wider ${
                  tier.highlight
                    ? "bg-signal text-ink-950 hover:bg-signal-glow"
                    : "border border-white/15 text-slate-200 hover:border-signal/40 hover:text-signal"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center font-mono text-[11px] text-slate-500 md:px-10">
        ArchProbe AI · DeepSeek-V3 · Golden-context interview engine
      </footer>
    </main>
  );
}
