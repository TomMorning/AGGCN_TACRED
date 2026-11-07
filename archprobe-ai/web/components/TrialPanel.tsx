"use client";

import { useState } from "react";
import { Loader2, Send, Zap } from "lucide-react";
import { startInterview, submitAnswer } from "@/lib/api";

const STARTER =
  "Sidecar gateway with local token buckets synced asynchronously to Redis, circuit-breaker fallback across providers, and an append-only credit ledger keyed by request_id for exact billing.";

export default function TrialPanel() {
  const [answer, setAnswer] = useState(STARTER);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [score, setScore] = useState<number | null>(null);

  async function roast() {
    setBusy(true);
    setError("");
    setReply("");
    try {
      const session = await startInterview("llm-gateway-sidecar");
      const result = await submitAnswer(session.id, answer);
      setReply(result.interviewer);
      setScore(result.analysis.round_score);
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — start Postgres/Redis via make up and the Go API via make backend.`
          : "Request failed",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="trial" className="panel relative overflow-hidden rounded-2xl p-5 md:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-signal/10 blur-3xl" />
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
        <Zap size={14} />
        Zero-signup free roast · llm-gateway-sidecar
      </div>
      <p className="mt-3 max-w-2xl text-sm text-slate-300">
        Drop a high-level design. The Staff Engineer AI runs golden-rubric gap analysis, then fires a chaos probe — usually within one round-trip.
      </p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={5}
        className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-ink-950/80 p-4 font-mono text-sm text-slate-100 outline-none ring-signal/40 focus:ring-2"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || answer.trim().length < 20}
          onClick={() => void roast()}
          className="inline-flex items-center gap-2 rounded-md bg-signal px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 transition hover:bg-signal-glow disabled:opacity-50 animate-pulseGlow"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
          Get roasted
        </button>
        {score !== null && (
          <span className="font-mono text-xs text-slate-400">Round score {score}/100</span>
        )}
      </div>
      {error && <p className="mt-3 font-mono text-xs text-rose-300">{error}</p>}
      {reply && (
        <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-rose-300">Staff Engineer</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{reply}</p>
        </div>
      )}
    </div>
  );
}
