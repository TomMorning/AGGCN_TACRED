import Link from "next/link";
import { ArrowRight, BrainCircuit, ShieldAlert, Sparkles } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import TrialPanel from "@/components/TrialPanel";

const SCENARIOS = [
  { slug: "llm-gateway-sidecar", title: "AI Agent Gateway · 50k RPM", free: true },
  { slug: "distributed-rate-limiter", title: "Global Rate Limiter · 500k QPS", free: true },
  { slug: "financial-graph-rag", title: "Zero-Hallucination GraphRAG", free: true },
  { slug: "agentic-workflow-engine", title: "Stateful Agent Runtime", free: false },
  { slug: "high-freq-inventory-flash-sale", title: "Flash Sale Inventory", free: false },
  { slug: "realtime-social-intent-crawler", title: "Social Intent Pipeline", free: false },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-0 h-[55vh] w-px bg-gradient-to-b from-signal/40 via-signal/10 to-transparent" />
        <div className="absolute inset-x-0 top-[42%] h-px bg-gradient-to-r from-transparent via-sky-400/20 to-transparent" />
        <div className="animate-scan absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-signal/5 to-transparent opacity-40" />
      </div>

      <SiteHeader />

      <section className="relative mx-auto grid max-w-6xl gap-10 px-6 pb-16 pt-8 md:px-10 md:pt-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          <p className="animate-fade-up font-mono text-xs uppercase tracking-[0.28em] text-signal">
            High-concurrency · AI-native · Staff bar
          </p>
          <h1 className="animate-fade-up-delayed mt-5 font-display text-4xl leading-[1.05] tracking-tight text-white md:text-6xl lg:text-[4.25rem]">
            ArchProbe <span className="text-signal">AI</span>
          </h1>
          <p className="animate-fade-up-late mt-5 max-w-xl text-lg leading-relaxed text-slate-300 md:text-xl">
            Stop memorizing 2015 system design templates. Survive a real 2026 AI &amp; high-concurrency Staff
            Engineer interview.
          </p>
          <div className="animate-fade-up-late mt-8 flex flex-wrap gap-3">
            <Link
              href="#trial"
              className="inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow"
            >
              Start free roast <ArrowRight size={14} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-white/15 px-5 py-3 font-mono text-xs uppercase tracking-wider text-slate-200 hover:border-signal/40 hover:text-signal"
            >
              View L3 memory
            </Link>
          </div>
        </div>

        <div className="animate-fade-up-late relative hidden min-h-[280px] lg:block">
          <div className="absolute inset-0 rounded-[2rem] border border-white/10 bg-gradient-to-br from-signal/15 via-ink-800/40 to-sky-500/10" />
          <div className="absolute inset-4 overflow-hidden rounded-[1.5rem] border border-white/10 bg-ink-950/70 p-5 font-mono text-[11px] leading-6 text-slate-400">
            <div className="text-signal">$ archprobe probe --round 2 --chaos hotkey</div>
            <div className="mt-3 text-slate-300">
              Selected attack: Redis shard NIC saturation @ 100k QPS.
            </div>
            <div className="mt-2">
              Bound the global over-admission error when 50 sidecars spike. No hand-waving.
            </div>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-signal/50 to-transparent" />
            <div className="mt-4 flex gap-6 text-slate-500">
              <span>scalability 72</span>
              <span>reliability 61</span>
              <span className="text-rose-300">gap: lua_atomicity</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20 md:px-10">
        <TrialPanel />
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Scenario bay</p>
            <h2 className="mt-2 font-display text-3xl text-white">Flagship drills</h2>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => (
            <Link
              key={s.slug}
              href={`/interview/${s.slug}`}
              className="group border-b border-white/10 py-4 transition hover:border-signal/40"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  {s.free ? "Free" : "Pro"}
                </span>
                <ArrowRight size={14} className="text-slate-600 transition group-hover:text-signal" />
              </div>
              <p className="mt-2 text-lg text-slate-100 group-hover:text-signal">{s.title}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-3 md:px-10">
        {[
          {
            icon: ShieldAlert,
            title: "Adversarial 3-round FSM",
            body: "Architecture → chaos injection → cost/edge cases. No cheerleading.",
          },
          {
            icon: BrainCircuit,
            title: "L1/L2/L3 weakness memory",
            body: "DeepTutor-style concept graph updates after every turn; pass probability compounds.",
          },
          {
            icon: Sparkles,
            title: "Golden-rubric grounding",
            body: "DeepSeek-V3 never invents grading criteria — PostgreSQL rubrics are the immutable prefix.",
          },
        ].map((item) => (
          <div key={item.title} className="border-t border-white/10 pt-5">
            <item.icon className="text-signal" size={20} />
            <h3 className="mt-4 font-display text-xl text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24 md:px-10">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">Pricing</p>
        <h2 className="mt-2 font-display text-3xl text-white">Clear tiers. High margin. No fluff.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              per: "",
              points: ["3 core scenarios", "Homepage roast", "Basic Mermaid updates"],
            },
            {
              name: "Pro",
              price: "$29",
              per: "/mo",
              points: ["Unlimited 40+ scenarios", "Chaos probing", "Mermaid auto-draw", "L3 memory dashboard"],
            },
            {
              name: "Pass Guarantee",
              price: "$79",
              per: "/quarter",
              points: ["Everything in Pro", "Variant drills on weak nodes", "Priority rubric packs"],
            },
          ].map((tier) => (
            <div key={tier.name} className="panel rounded-2xl p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-signal">{tier.name}</p>
              <p className="mt-3 font-display text-4xl text-white">
                {tier.price}
                <span className="text-base text-slate-500">{tier.per}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-300">
                {tier.points.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center font-mono text-[11px] text-slate-500 md:px-10">
        ArchProbe AI · DeepSeek-V3 · Golden-context GraphRAG interview engine
      </footer>
    </main>
  );
}
