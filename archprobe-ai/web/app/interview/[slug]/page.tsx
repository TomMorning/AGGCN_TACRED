"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Clock, Loader2, Lock, Mic, MicOff, Play, Send, ShieldCheck } from "lucide-react";
import MermaidCanvas from "@/components/MermaidCanvas";
import { DifficultyTag, Logo } from "@/components/ui";
import { ROUND_PLAN } from "@/lib/catalog";
import { MAX_ANSWER_CHARS, MIN_ANSWER_CHARS } from "@/lib/limits";
import { api, ApiError, type ScenarioDetail, type TranscriptEntry } from "@/lib/api";

const ROUND_FOCUS = [
  "Requirements, API, data model and the core architecture. Say where state lives.",
  "The interviewer injects a failure. Give the mechanism, the bound and the recovery path.",
  "Cost, consistency edge cases and what you would cut. Close the loop.",
];

const SECTIONS = ["Requirements", "API", "Data model", "Architecture", "Scaling", "Failure modes", "Trade-offs"];

const THINKING = ["Reading your answer…", "Checking it against the rubric…", "Choosing where to push…", "Writing the follow-up…"];

type SpeechRec = {
  start: () => void;
  stop: () => void;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
};

function fmt(sec: number) {
  const s = Math.abs(sec);
  return `${sec < 0 ? "+" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Room() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const resumeId = params.get("session");

  const [scenario, setScenario] = useState<ScenarioDetail | null>(null);
  const [phase, setPhase] = useState<"loading" | "briefing" | "live" | "finishing" | "error">("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [diagram, setDiagram] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [thinkIdx, setThinkIdx] = useState(0);
  const [tab, setTab] = useState<"problem" | "diagram">("problem");
  const [roundStart, setRoundStart] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const enterLive = useCallback((id: string, roundNo: number, t: TranscriptEntry[]) => {
    setSessionId(id);
    setRound(Math.min(3, Math.max(1, roundNo)));
    setTranscript(t);
    const lastDiagram = [...t].reverse().find((e) => e.mermaid_code)?.mermaid_code;
    if (lastDiagram) setDiagram(lastDiagram);
    setRoundStart(Date.now());
    setPhase("live");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sc = await api.scenario(slug);
        if (cancelled) return;
        setScenario(sc);
        if (resumeId) {
          const s = await api.session(resumeId);
          if (cancelled) return;
          if (s.status === "completed") {
            router.replace(`/report/${s.id}`);
            return;
          }
          enterLive(s.id, s.current_round, s.transcript);
        } else {
          setPhase("briefing");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load this scenario");
          setPhase("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, resumeId, router, enterLive]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setThinkIdx((i) => Math.min(i + 1, THINKING.length - 1)), 1600);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [transcript, busy]);

  const remaining = ROUND_PLAN[round - 1].minutes * 60 - Math.floor((now - roundStart) / 1000);
  const constraints = useMemo(() => Object.entries(scenario?.constraints || {}), [scenario]);
  const mocksLeft = scenario ? scenario.quota.monthly_sessions_limit - scenario.quota.monthly_sessions_used : 0;

  async function begin() {
    setStarting(true);
    setError("");
    try {
      const s = await api.start(slug);
      router.replace(`/interview/${slug}?session=${s.id}`);
      enterLive(s.id, s.current_round, s.transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the interview");
    } finally {
      setStarting(false);
    }
  }

  async function submit() {
    if (!sessionId || busy || answer.trim().length < MIN_ANSWER_CHARS) return;
    recRef.current?.stop();
    setBusy(true);
    setError("");
    setThinkIdx(0);
    const text = answer;
    try {
      const res = await api.submit(sessionId, text);
      setTranscript((prev) => [
        ...prev,
        { role: "user", content: text, round: res.round },
        {
          role: "interviewer",
          content: res.interviewer,
          round: res.round,
          detected_gaps: res.analysis.missed_critical_gaps,
          mermaid_code: res.mermaid_diagram,
          round_score: res.analysis.round_score,
        },
      ]);
      if (res.mermaid_diagram) setDiagram(res.mermaid_diagram);
      setAnswer("");
      if (res.status === "completed") {
        setPhase("finishing");
        setTimeout(() => router.push(`/report/${sessionId}`), 1400);
      } else {
        setRound(Math.min(3, res.next_round));
        setRoundStart(Date.now());
      }
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  function insertSection(name: string) {
    const prefix = answer && !answer.endsWith("\n") ? "\n\n" : "";
    const next = `${answer}${prefix}${name}:\n`;
    setAnswer(next.slice(0, MAX_ANSWER_CHARS));
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function toggleDictation() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Dictation is not supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setAnswer((a) => `${a}${a && !a.endsWith(" ") ? " " : ""}${text.trim()}`.slice(0, MAX_ANSWER_CHARS));
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-5xl px-5 py-16">
        <div className="skeleton h-6 w-40" />
        <div className="skeleton mt-4 h-12 w-3/4" />
        <div className="skeleton mt-8 h-64" />
      </div>
    );
  }

  if (phase === "error" || !scenario) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <p className="font-display text-3xl">We couldn’t open this interview.</p>
        <p className="mt-3 text-sm text-muted">{error}</p>
        <Link href="/library" className="btn-primary mt-8">
          Back to library
        </Link>
      </div>
    );
  }

  if (phase === "briefing") {
    return (
      <div className="min-h-screen">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
            <Logo />
            <Link href="/library" className="text-sm text-ink-soft hover:text-ink">
              ← Library
            </Link>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:px-8 lg:grid-cols-[1.5fr_1fr]">
          <div className="animate-fade-up">
            <div className="flex items-center gap-2">
              <DifficultyTag difficulty={scenario.difficulty} />
              <span className="text-xs text-muted">{scenario.est_minutes} min · 3 rounds</span>
            </div>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">{scenario.title}</h1>
            <p className="mt-3 text-lg text-ink-soft">{scenario.summary}</p>

            {scenario.locked ? (
              <div className="card mt-10 p-8">
                <Lock size={20} className="text-muted" />
                <p className="mt-4 text-lg font-semibold">This scenario is part of Pro.</p>
                <p className="mt-1 text-sm text-muted">The full prompt, constraints and graded mock unlock with Pro.</p>
                <Link href="/library" className="btn-ghost mt-6">
                  Browse free scenarios
                </Link>
              </div>
            ) : (
              <>
                <div className="card mt-8 p-6">
                  <p className="eyebrow">The prompt</p>
                  <p className="mt-3 whitespace-pre-line leading-relaxed">{scenario.problem_statement}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {constraints.map(([k, v]) => (
                      <span key={k} className="rounded-md border border-line bg-paper px-2.5 py-1 font-mono text-[11px]">
                        <span className="text-muted">{k.replace(/_/g, " ")}</span> {v}
                      </span>
                    ))}
                  </div>
                </div>
                <h2 className="mt-10 font-semibold">How this interview runs</h2>
                <ol className="mt-4 grid gap-3 sm:grid-cols-3">
                  {ROUND_PLAN.map((r, i) => (
                    <li key={r.name} className="card p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted">Round {i + 1}</span>
                        <span className="text-xs text-muted">{r.minutes} min</span>
                      </div>
                      <p className="mt-2 font-medium">{r.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{ROUND_FOCUS[i]}</p>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>

          {!scenario.locked && (
            <aside className="lg:sticky lg:top-8 lg:self-start">
              <div className="card p-6">
                <p className="font-semibold">Ready when you are</p>
                <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                  <li>· The clock is a guide — it won’t cut you off.</li>
                  <li>· Write like you’d talk: mechanisms, numbers, trade-offs.</li>
                  <li>· You get a graded report at the end.</li>
                </ul>
                <button
                  type="button"
                  onClick={() => void begin()}
                  disabled={starting || mocksLeft <= 0}
                  className="btn-brand mt-6 w-full py-3"
                >
                  {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Start interview
                </button>
                <p className="mt-3 text-center text-xs text-muted">
                  {mocksLeft > 0
                    ? `Uses 1 of your ${mocksLeft} remaining mocks this month`
                    : "You've used this month's free mocks"}
                </p>
                {error && <p className="mt-3 text-center text-sm text-danger">{error}</p>}
              </div>
              <div className="mt-4 flex gap-3 rounded-xl border border-line bg-surface p-4 text-xs leading-relaxed text-muted">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand" />
                Your answers are sent to the DeepSeek API for grading. Don’t paste confidential details from an employer.
              </div>
            </aside>
          )}
        </div>
      </div>
    );
  }

  const timerTone = remaining < 0 ? "text-rose-300" : remaining < 120 ? "text-amber-300" : "text-white/80";

  return (
    <div className="night flex h-screen flex-col bg-night text-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/app" className="text-white/50 hover:text-white" aria-label="Leave interview">
            <ArrowLeft size={18} />
          </Link>
          <span className="truncate text-sm font-medium">{scenario.title}</span>
        </div>
        <div className="hidden items-center gap-1.5 md:flex">
          {ROUND_PLAN.map((r, i) => (
            <span
              key={r.name}
              className={`rounded-full px-3 py-1 text-xs ${
                i + 1 === round ? "bg-white text-night" : i + 1 < round ? "bg-white/15 text-white/80" : "text-white/40"
              }`}
            >
              {i + 1}. {r.name}
            </span>
          ))}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1 font-mono text-sm ${timerTone}`}>
          <Clock size={14} /> {fmt(remaining)}
        </span>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <section className="hidden min-h-0 flex-col border-r border-white/10 lg:flex">
          <div className="flex gap-1 border-b border-white/10 px-4 pt-3">
            {(["problem", "diagram"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-t-md px-3 py-2 text-sm ${tab === t ? "bg-night-3 text-white" : "text-white/50 hover:text-white"}`}
              >
                {t === "problem" ? "Problem" : "Your architecture"}
              </button>
            ))}
          </div>
          <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-night-3/40 p-5">
            {tab === "problem" ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-300/80">This round</p>
                  <p className="mt-1 text-sm text-white/85">{ROUND_FOCUS[round - 1]}</p>
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">{scenario.problem_statement}</p>
                <div className="flex flex-wrap gap-2">
                  {constraints.map(([k, v]) => (
                    <span key={k} className="rounded-md border border-white/10 px-2 py-1 font-mono text-[11px] text-white/70">
                      <span className="text-white/40">{k.replace(/_/g, " ")}</span> {v}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <MermaidCanvas chart={diagram} dark className="rounded-xl border border-white/10 bg-night-2" />
            )}
          </div>
        </section>

        <section className="flex min-h-0 flex-col">
          <div ref={chatRef} className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-6 md:px-8">
            {transcript.map((t, i) =>
              t.role === "interviewer" ? (
                <div key={i} className="flex animate-fade-up gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-300">
                    SE
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <span>Interviewer · Staff Engineer (AI)</span>
                      {t.round_score != null && t.round_score > 0 && (
                        <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-white/70">R{t.round} · {t.round_score}</span>
                      )}
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-white/90">{t.content}</p>
                    {t.detected_gaps && t.detected_gaps.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {t.detected_gaps.slice(0, 3).map((g) => (
                          <span key={g} className="rounded-md bg-rose-400/10 px-2 py-1 text-[11px] text-rose-200/90">
                            Gap · {g}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="ml-11 animate-fade-up rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-xs text-white/40">You · Round {t.round}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{t.content}</p>
                </div>
              ),
            )}
            {busy && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-xs font-semibold text-emerald-300">
                  SE
                </span>
                <p className="flex items-center gap-2 pt-1.5 text-sm text-white/60">
                  <Loader2 size={14} className="animate-spin" /> {THINKING[thinkIdx]}
                </p>
              </div>
            )}
            {phase === "finishing" && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-center">
                <p className="font-medium">Interview complete.</p>
                <p className="mt-1 text-sm text-white/70">Opening your graded report…</p>
              </div>
            )}
          </div>

          {phase === "live" && (
            <div className="shrink-0 border-t border-white/10 bg-night-2 p-3 md:p-4">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SECTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => insertSection(s)}
                    className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:border-white/30 hover:text-white"
                  >
                    + {s}
                  </button>
                ))}
              </div>
              <textarea
                ref={inputRef}
                value={answer}
                onChange={(e) => setAnswer(e.target.value.slice(0, MAX_ANSWER_CHARS))}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
                }}
                rows={6}
                placeholder="Answer the interviewer. Name mechanisms, give numbers, defend trade-offs…"
                className="scroll-thin w-full resize-none rounded-xl border border-white/10 bg-night p-4 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-white/30"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleDictation}
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs ${
                      listening ? "bg-rose-500/20 text-rose-200" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {listening ? <MicOff size={14} /> : <Mic size={14} />}
                    {listening ? "Stop dictation" : "Dictate"}
                  </button>
                  <span className="font-mono text-[11px] text-white/35">
                    {answer.trim().length}/{MAX_ANSWER_CHARS} · ⌘↵ to send
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={busy || answer.trim().length < MIN_ANSWER_CHARS}
                  className="btn bg-white text-night hover:bg-white/90"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {round === 3 ? "Submit final round" : "Submit answer"}
                </button>
              </div>
              {error && <p className="mt-2 text-sm text-rose-300">{error}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function InterviewPage() {
  return (
    <Suspense fallback={null}>
      <Room />
    </Suspense>
  );
}
