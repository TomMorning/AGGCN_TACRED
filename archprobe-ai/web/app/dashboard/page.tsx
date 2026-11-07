"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Crosshair, RefreshCw } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { getDashboard, type DashboardData } from "@/lib/api";

const CATEGORY_LABELS: Record<string, string> = {
  rate_limiting: "Rate Limiting & Traffic Governance",
  llm_gateway: "LLM Gateway & Cost Control",
  consistency: "Distributed Consistency",
  graph_rag: "GraphRAG & Agent State Machines",
  agent_runtime: "Agent Runtime",
  high_concurrency: "High Concurrency",
  ai_infra: "AI Infra",
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeDrill, setActiveDrill] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const dash = await getDashboard();
      setData(dash);
      if (dash.recommended_drills[0]) setActiveDrill(dash.recommended_drills[0].prompt);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const categories = Object.entries(data?.category_scores || {});

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-6 pb-20 pt-8 md:px-10">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs text-slate-400 hover:text-signal">
          <ArrowLeft size={14} /> Home
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-signal">L3 concept memory</p>
            <h1 className="mt-2 font-display text-4xl text-white md:text-5xl">Pass probability</h1>
            <p className="mt-3 max-w-xl text-sm text-slate-400">
              Weak tags pull harder than wins. Drill the bottom nodes until the Staff bar stops exploiting them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-md border border-white/15 px-3 py-2 font-mono text-xs text-slate-300 hover:border-signal/40 hover:text-signal"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {error && <p className="mt-6 font-mono text-sm text-rose-300">{error}</p>}

        {loading && !data ? (
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : data ? (
          <>
            <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="panel relative overflow-hidden rounded-2xl p-6 md:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-signal/15 blur-3xl" />
                <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Overall</p>
                <p className="mt-3 font-display text-6xl text-signal md:text-7xl">
                  {data.pass_probability.toFixed(0)}
                  <span className="text-3xl text-slate-500">%</span>
                </p>
                <div className="mt-8 space-y-4">
                  {categories.map(([key, value]) => (
                    <div key={key}>
                      <div className="mb-1 flex justify-between gap-3 font-mono text-[11px] text-slate-400">
                        <span>{CATEGORY_LABELS[key] || key}</span>
                        <span>{value.toFixed(0)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-signal transition-all duration-700"
                          style={{ width: `${Math.min(100, value)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-signal">
                  <Crosshair size={14} /> One-click variant drill
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-200">
                  {activeDrill || "Complete an interview turn to unlock weak-node drills."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {data.recommended_drills.map((d) => (
                    <button
                      key={d.concept_tag}
                      type="button"
                      onClick={() => setActiveDrill(d.prompt)}
                      className="rounded-md border border-white/10 px-3 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-signal/40 hover:text-signal"
                    >
                      {d.concept_tag}
                    </button>
                  ))}
                </div>
                <Link
                  href="/interview/distributed-rate-limiter"
                  className="mt-6 inline-flex rounded-md bg-signal px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow"
                >
                  Launch twin drill
                </Link>
              </div>
            </div>

            <div className="mt-12">
              <h2 className="font-display text-2xl text-white">Weakness knowledge graph</h2>
              <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
                {(data.mastery.length ? data.mastery : []).map((m) => (
                  <div
                    key={m.concept_tag}
                    className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-3 bg-ink-900/30 px-4 py-3 md:grid-cols-[1.6fr_1fr_0.6fr_0.6fr] md:px-5"
                  >
                    <div>
                      <p className="font-mono text-sm text-slate-100">{m.concept_tag}</p>
                      <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                        {CATEGORY_LABELS[m.category] || m.category}
                      </p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                      <div
                        className="h-full rounded-full bg-signal/80"
                        style={{ width: `${m.mastery_score}%` }}
                      />
                    </div>
                    <p className="hidden font-mono text-xs text-slate-400 md:block">pass {m.pass_count}</p>
                    <p className="text-right font-mono text-xs text-rose-300/90">fail {m.fail_count}</p>
                  </div>
                ))}
                {data.mastery.length === 0 && (
                  <p className="bg-ink-900/20 px-5 py-10 font-mono text-sm text-slate-500">
                    No mastery rows yet. Finish a roast or interview turn to seed L3 memory.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
