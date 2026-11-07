"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import MermaidCanvas from "@/components/MermaidCanvas";
import ScorecardModal from "@/components/ScorecardModal";
import {
  getScenario,
  startInterview,
  submitAnswer,
  type Scenario,
  type SubmitResponse,
  type TranscriptEntry,
} from "@/lib/api";

const ROUND_LABELS = [
  "Round 1/3 · High-Level Design",
  "Round 2/3 · Chaos Injection",
  "Round 3/3 · Cost & Edge Cases",
];

export default function InterviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState("loading");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [mermaid, setMermaid] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scorecard, setScorecard] = useState<SubmitResponse | null>(null);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const sc = await getScenario(slug);
        if (cancelled) return;
        setScenario(sc);
        setMermaid(sc.reference_mermaid);
        const sess = await startInterview(slug);
        if (cancelled) return;
        setSessionId(sess.id);
        setRound(sess.current_round);
        setStatus(sess.status);
        setTranscript(sess.transcript || []);
        const lastMermaid = [...(sess.transcript || [])]
          .reverse()
          .find((t) => t.mermaid_code)?.mermaid_code;
        if (lastMermaid) setMermaid(lastMermaid);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to start interview");
          setStatus("error");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const constraints = useMemo(() => {
    if (!scenario?.constraints) return [];
    return Object.entries(scenario.constraints);
  }, [scenario]);

  async function onSubmit() {
    if (!sessionId || answer.trim().length < 20) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitAnswer(sessionId, answer);
      setTranscript((prev) => [
        ...prev,
        { role: "user", content: answer, round: result.round },
        {
          role: "interviewer",
          content: result.interviewer,
          round: result.round,
          detected_gaps: result.analysis.missed_critical_gaps,
          mermaid_code: result.mermaid_diagram,
          round_score: result.analysis.round_score,
        },
      ]);
      setMermaid(result.mermaid_diagram || mermaid);
      setAnswer("");
      setStatus(result.status);
      if (result.status === "completed") {
        setScorecard(result);
        setShowScore(true);
        setRound(3);
      } else {
        setRound(Math.min(3, result.round + 1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs text-slate-400 hover:text-signal">
          <ArrowLeft size={14} /> ArchProbe AI
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
          {ROUND_LABELS[Math.min(2, Math.max(0, round - 1))]}
        </p>
        <Link href="/dashboard" className="font-mono text-xs text-slate-400 hover:text-signal">
          Memory →
        </Link>
      </div>

      {error && status === "error" ? (
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <p className="font-display text-2xl text-white">Backend offline</p>
          <p className="mt-3 font-mono text-sm text-rose-300">{error}</p>
          <p className="mt-4 text-sm text-slate-400">Run `make up` then `make backend` from archprobe-ai/.</p>
        </div>
      ) : (
        <div className="grid min-h-[calc(100vh-53px)] lg:grid-cols-2">
          <section className="flex flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="space-y-4 border-b border-white/10 p-5 md:p-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                {scenario?.category || "…"} · {scenario?.difficulty || "…"}
              </p>
              <h1 className="font-display text-2xl text-white md:text-3xl">{scenario?.title || "Loading scenario…"}</h1>
              <p className="max-h-40 overflow-y-auto text-sm leading-relaxed text-slate-300 terminal-scroll">
                {scenario?.problem_statement}
              </p>
              <div className="flex flex-wrap gap-2">
                {constraints.map(([k, v]) => (
                  <span
                    key={k}
                    className="rounded border border-signal/25 bg-signal/5 px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-signal"
                  >
                    {k}: {v}
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`h-1.5 flex-1 rounded-full ${n <= round ? "bg-signal" : "bg-ink-700"}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 bg-ink-950/40 p-2 md:p-4">
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Live architecture canvas
              </p>
              <MermaidCanvas chart={mermaid} className="panel min-h-[280px] rounded-xl" />
            </div>
          </section>

          <section className="flex flex-col bg-ink-900/40">
            <div className="terminal-scroll flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
              {transcript.length === 0 && (
                <p className="font-mono text-sm text-slate-500">Bootstrapping adversarial session…</p>
              )}
              {transcript.map((t, idx) => (
                <div
                  key={`${t.role}-${idx}`}
                  className={`rounded-xl border p-4 ${
                    t.role === "user"
                      ? "ml-6 border-white/10 bg-ink-800/60"
                      : "mr-6 border-rose-400/20 bg-rose-500/5"
                  }`}
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {t.role === "user" ? "Candidate" : "Staff Engineer"} · R{t.round}
                    {t.round_score ? ` · ${t.round_score}` : ""}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{t.content}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-4 md:p-5">
              {status === "completed" ? (
                <button
                  type="button"
                  onClick={() => setShowScore(true)}
                  className="w-full rounded-md bg-signal py-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950"
                >
                  View final scorecard
                </button>
              ) : (
                <>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    rows={5}
                    placeholder="Defend the architecture: components, trade-offs, failure bounds…"
                    className="w-full resize-y rounded-xl border border-white/10 bg-ink-950/80 p-4 font-mono text-sm text-slate-100 outline-none ring-signal/30 focus:ring-2"
                  />
                  {error && <p className="mt-2 font-mono text-xs text-rose-300">{error}</p>}
                  <button
                    type="button"
                    disabled={busy || !sessionId || answer.trim().length < 20}
                    onClick={() => void onSubmit()}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-signal py-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                    Submit architecture defense
                  </button>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      <ScorecardModal
        open={showScore}
        onClose={() => setShowScore(false)}
        finalScore={scorecard?.final_score}
        dimensions={scorecard?.dimension_scores}
        auditReport={scorecard?.audit_report}
        variantDrill={scorecard?.variant_drill}
        passProbability={scorecard?.pass_probability}
      />
    </main>
  );
}
