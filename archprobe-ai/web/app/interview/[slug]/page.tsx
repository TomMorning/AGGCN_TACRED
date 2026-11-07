"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Lock, Play, Send } from "lucide-react";
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
import { MAX_ANSWER_CHARS } from "@/lib/limits";

const ROUND_LABELS = [
  "Round 1 · High-Level Design",
  "Round 2 · Chaos Injection",
  "Round 3 · Cost & Edge Cases",
];

const THINKING = [
  "Comparing against golden rubric…",
  "Scoring covered vs missed points…",
  "Selecting sharpest chaos attack…",
  "Drafting Staff Engineer probe…",
];

export default function InterviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const chatRef = useRef<HTMLDivElement>(null);

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [phase, setPhase] = useState<"loading" | "briefing" | "live" | "error">("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [status, setStatus] = useState("in_progress");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [mermaid, setMermaid] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinkIdx, setThinkIdx] = useState(0);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [scorecard, setScorecard] = useState<SubmitResponse | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [lastGaps, setLastGaps] = useState<string[]>([]);
  const [lastCovered, setLastCovered] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      try {
        const sc = await getScenario(slug);
        if (cancelled) return;
        setScenario(sc);
        setMermaid(sc.reference_mermaid || "");
        setPhase(sc.locked ? "briefing" : "briefing");
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load scenario");
          setPhase("error");
        }
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, busy]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setThinkIdx((i) => (i + 1) % THINKING.length), 1100);
    return () => clearInterval(t);
  }, [busy]);

  const constraints = useMemo(() => {
    if (!scenario?.constraints) return [];
    return Object.entries(scenario.constraints);
  }, [scenario]);

  async function begin() {
    if (!scenario || scenario.locked) return;
    setStarting(true);
    setError("");
    try {
      const sess = await startInterview(slug);
      setSessionId(sess.id);
      setRound(sess.current_round);
      setStatus(sess.status);
      setTranscript(sess.transcript || []);
      const lastMermaid = [...(sess.transcript || [])]
        .reverse()
        .find((t) => t.mermaid_code)?.mermaid_code;
      if (lastMermaid) setMermaid(lastMermaid);
      setPhase("live");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setStarting(false);
    }
  }

  async function onSubmit() {
    if (!sessionId || answer.trim().length < 40) return;
    setBusy(true);
    setError("");
    setThinkIdx(0);
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
      setLastGaps(result.analysis.missed_critical_gaps || []);
      setLastCovered(result.analysis.covered_points || []);
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
    <main className="min-h-screen bg-ink-950">
      <div className="flex items-center justify-between border-b border-white/10 bg-ink-950/80 px-4 py-3 backdrop-blur md:px-6">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-xs text-slate-400 hover:text-signal">
          <ArrowLeft size={14} /> ArchProbe AI
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-signal">
          {phase === "live" ? ROUND_LABELS[Math.min(2, Math.max(0, round - 1))] : "Briefing"}
        </p>
        <Link href="/dashboard" className="font-mono text-xs text-slate-400 hover:text-signal">
          Memory →
        </Link>
      </div>

      {phase === "loading" && (
        <div className="mx-auto flex max-w-lg flex-col gap-3 px-6 py-24">
          <div className="h-3 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-white/10" />
          <div className="h-24 w-full animate-pulse rounded-xl bg-white/5" />
        </div>
      )}

      {phase === "error" && (
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <p className="font-display text-2xl text-white">Couldn’t open this scenario</p>
          <p className="mt-3 font-mono text-sm text-rose-300">{error}</p>
          <Link href="/" className="mt-6 inline-block font-mono text-xs text-signal">
            ← Back home
          </Link>
        </div>
      )}

      {phase === "briefing" && scenario && (
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-10 lg:py-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
              {scenario.category} · {scenario.difficulty}
            </p>
            <h1 className="mt-3 font-display text-3xl text-white md:text-5xl">{scenario.title}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
              {scenario.problem_statement}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {constraints.map(([k, v]) => (
                <span
                  key={k}
                  className="rounded border border-signal/25 bg-signal/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-signal"
                >
                  {k}: {v}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {ROUND_LABELS.map((label, i) => (
                <div key={label} className="rounded-xl border border-white/10 bg-ink-900/50 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-signal">0{i + 1}</p>
                  <p className="mt-2 text-sm text-slate-200">{label.replace(/^Round \d · /, "")}</p>
                </div>
              ))}
            </div>

            {scenario.locked ? (
              <div className="mt-8 inline-flex items-center gap-2 rounded-md border border-amber-300/30 bg-amber-500/10 px-4 py-3 font-mono text-xs text-amber-100">
                <Lock size={14} /> Pro scenario — upgrade required to start
              </div>
            ) : (
              <button
                type="button"
                disabled={starting}
                onClick={() => void begin()}
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-signal px-5 py-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow disabled:opacity-50"
              >
                {starting ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                Begin interview · uses 1 session
              </button>
            )}
            {error && <p className="mt-3 font-mono text-xs text-rose-300">{error}</p>}
          </div>
          <div className="panel rounded-2xl p-3">
            <p className="px-3 pt-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
              Reference architecture
            </p>
            <MermaidCanvas chart={mermaid} className="min-h-[320px]" />
          </div>
        </div>
      )}

      {phase === "live" && (
        <div className="grid min-h-[calc(100vh-53px)] lg:grid-cols-2">
          <section className="flex flex-col border-b border-white/10 lg:border-b-0 lg:border-r">
            <div className="space-y-4 border-b border-white/10 p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    {scenario?.category} · {scenario?.difficulty}
                  </p>
                  <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">{scenario?.title}</h1>
                </div>
                <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-400">
                  Live
                </span>
              </div>
              <p className="max-h-28 overflow-y-auto text-sm leading-relaxed text-slate-300 terminal-scroll">
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
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      n <= round ? "bg-signal" : "bg-ink-700"
                    }`}
                  />
                ))}
              </div>
              {(lastCovered.length > 0 || lastGaps.length > 0) && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {lastCovered.slice(0, 2).map((p) => (
                    <span
                      key={p}
                      className="rounded bg-signal/10 px-2 py-1 font-mono text-[10px] text-signal"
                    >
                      ✓ {p}
                    </span>
                  ))}
                  {lastGaps.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="rounded bg-rose-500/10 px-2 py-1 font-mono text-[10px] text-rose-200"
                    >
                      gap · {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 bg-ink-950/40 p-2 md:p-4">
              <p className="mb-2 px-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Live architecture canvas
              </p>
              <MermaidCanvas chart={mermaid} className="panel min-h-[280px] rounded-xl" />
            </div>
          </section>

          <section className="flex flex-col bg-gradient-to-b from-ink-900/50 to-ink-950">
            <div ref={chatRef} className="terminal-scroll flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
              {transcript.map((t, idx) => (
                <div
                  key={`${t.role}-${idx}`}
                  className={`animate-fade-up rounded-2xl border p-4 ${
                    t.role === "user"
                      ? "ml-4 border-white/10 bg-ink-800/70 md:ml-10"
                      : "mr-4 border-rose-400/20 bg-rose-500/[0.06] md:mr-10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      {t.role === "user" ? "You" : "Staff Engineer"} · R{t.round}
                    </p>
                    {t.round_score != null && t.round_score > 0 && (
                      <span className="font-mono text-[10px] text-signal">{t.round_score}/100</span>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{t.content}</p>
                </div>
              ))}
              {busy && (
                <div className="mr-4 rounded-2xl border border-signal/20 bg-signal/5 p-4 md:mr-10">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-signal">Staff Engineer</p>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                    <span className="inline-flex gap-1">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal [animation-delay:150ms]" />
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal [animation-delay:300ms]" />
                    </span>
                    {THINKING[thinkIdx]}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 bg-ink-950/80 p-4 md:p-5">
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
                    onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_CHARS))}
                    rows={5}
                    placeholder="Defend with mechanisms: data structures, failure bounds, consistency model…"
                    className="w-full resize-y rounded-xl border border-white/10 bg-ink-950 p-4 font-mono text-sm text-slate-100 outline-none ring-signal/30 focus:ring-2"
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void onSubmit();
                    }}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <span className="font-mono text-[11px] text-slate-500">
                      {answer.trim().length}/{MAX_ANSWER_CHARS} · ⌘/Ctrl+Enter
                    </span>
                    <button
                      type="button"
                      disabled={busy || !sessionId || answer.trim().length < 40}
                      onClick={() => void onSubmit()}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-signal px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-glow disabled:opacity-40"
                    >
                      {busy ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                      Submit defense
                    </button>
                  </div>
                  {error && <p className="mt-2 font-mono text-xs text-rose-300">{error}</p>}
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
