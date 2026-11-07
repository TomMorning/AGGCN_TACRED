"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { startInterview, submitAnswer, type SubmitResponse } from "@/lib/api";
import { MAX_ANSWER_CHARS } from "@/lib/limits";

const STARTER =
  "Data plane: sidecar gateway with local token buckets + async Redis sync. Control plane: per-tenant quotas. Circuit-breaker fallback across providers with jitter. Append-only credit ledger keyed by request_id for exact billing.";

const PHASES = [
  "Opening session…",
  "Auditing against golden rubric…",
  "Selecting chaos attack…",
  "Staff Engineer drafting probe…",
];

export default function TrialPanel() {
  const [answer, setAnswer] = useState(STARTER);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(0);
  const [error, setError] = useState("");

  async function roast() {
    setBusy(true);
    setError("");
    setResult(null);
    setPhase(0);
    const timer = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 900);
    try {
      const session = await startInterview("llm-gateway-sidecar");
      setPhase(1);
      const res = await submitAnswer(session.id, answer);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  }

  return (
    <div id="trial" className="panel relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-signal/10 blur-3xl" />
      <div className="grid lg:grid-cols-2">
        <div className="border-b border-white/10 p-6 md:p-8 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
            <Sparkles size={14} />
            30-second free roast
          </div>
          <h3 className="mt-3 font-display text-2xl text-white">Design the 50k RPM AI gateway</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            No signup friction on the homepage trial. Defend the architecture — the Staff Engineer audits your
            answer against a locked golden rubric, then fires a chaos probe.
          </p>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_CHARS))}
            rows={8}
            className="mt-5 w-full resize-y rounded-xl border border-white/10 bg-ink-950/80 p-4 font-mono text-[13px] leading-relaxed text-slate-100 outline-none ring-signal/30 transition focus:ring-2"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-slate-500">
              {answer.trim().length}/{MAX_ANSWER_CHARS}
            </span>
            <button
              type="button"
              disabled={busy || answer.trim().length < 40}
              onClick={() => void roast()}
              className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 transition hover:bg-signal-glow disabled:opacity-40"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
              {busy ? PHASES[phase] : "Get roasted"}
            </button>
          </div>
          {error && <p className="mt-3 font-mono text-xs text-rose-300">{error}</p>}
        </div>

        <div className="flex min-h-[320px] flex-col justify-between bg-ink-950/40 p-6 md:p-8">
          {!result && !busy && (
            <div className="flex flex-1 flex-col justify-center">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">Live transcript</p>
              <p className="mt-4 font-display text-xl text-slate-300">
                Submit a defense to hear the first chaos probe.
              </p>
              <ul className="mt-6 space-y-2 font-mono text-xs text-slate-500">
                <li>· Round score against golden rubric</li>
                <li>· Covered vs missed architecture points</li>
                <li>· One Staff-level follow-up question</li>
              </ul>
            </div>
          )}
          {busy && (
            <div className="flex flex-1 flex-col justify-center gap-4">
              <div className="h-2 w-40 animate-pulse rounded-full bg-signal/40" />
              <p className="font-mono text-sm text-signal">{PHASES[phase]}</p>
              <p className="text-sm text-slate-500">Usually 3–8 seconds with DeepSeek-V3.</p>
            </div>
          )}
          {result && (
            <div className="animate-fade-up space-y-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-rose-300">Staff Engineer</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">Round score</p>
                </div>
                <p className="font-display text-4xl text-white">{result.analysis.round_score}</p>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{result.interviewer}</p>
              <div className="flex flex-wrap gap-2">
                {result.analysis.covered_points.slice(0, 3).map((p) => (
                  <span
                    key={p}
                    className="rounded border border-signal/25 bg-signal/10 px-2 py-1 font-mono text-[10px] text-signal"
                  >
                    ✓ {p}
                  </span>
                ))}
                {result.analysis.missed_critical_gaps.slice(0, 2).map((g) => (
                  <span
                    key={g}
                    className="rounded border border-rose-400/25 bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-200"
                  >
                    ✕ {g}
                  </span>
                ))}
              </div>
              <Link
                href="/interview/llm-gateway-sidecar"
                className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-signal hover:text-signal-glow"
              >
                Continue full 3-round interview <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
