"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Check, Crosshair, X } from "lucide-react";
import AppShell, { PageError } from "@/components/app/AppShell";
import { Bar, DifficultyTag, ScoreRing, VerdictBadge, scoreTone } from "@/components/ui";
import { ROUND_PLAN } from "@/lib/catalog";
import { api, type Report } from "@/lib/api";

const DIMENSIONS: Record<string, string> = {
  scalability: "Scalability",
  reliability: "Reliability & fault tolerance",
  cost_efficiency: "Cost & latency trade-offs",
  production_readiness: "Production readiness",
};

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    api.report(id).then(setR).catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <AppShell>
        <PageError message={error} />
      </AppShell>
    );
  }
  if (!r) {
    return (
      <AppShell>
        <div className="skeleton h-40" />
        <div className="skeleton mt-4 h-72" />
      </AppShell>
    );
  }

  if (r.status !== "completed") {
    return (
      <AppShell>
        <div className="card p-10 text-center">
          <p className="font-display text-3xl">This interview isn’t finished yet.</p>
          <p className="mt-2 text-sm text-muted">Finish all three rounds to get your graded report.</p>
          {r.scenario && (
            <Link href={`/interview/${r.scenario.slug}?session=${r.id}`} className="btn-primary mt-6">
              Resume interview
            </Link>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/reports" className="text-sm text-muted hover:text-ink">
        ← All reports
      </Link>

      <div className="card mt-4 overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="flex items-center gap-2">
              {r.scenario && <DifficultyTag difficulty={r.scenario.difficulty} />}
              <span className="text-xs text-muted">
                {new Date(r.completed_at || r.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl leading-tight md:text-4xl">{r.scenario?.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={r.verdict} />
              <span
                className={`rounded-full px-2.5 py-1 text-xs ${
                  r.clarify_count > 0 ? "bg-paper text-ink-soft" : "bg-warn-soft text-warn"
                }`}
              >
                {r.clarify_count > 0
                  ? `Asked ${r.clarify_count} clarifying question${r.clarify_count > 1 ? "s" : ""}`
                  : "No clarifying questions asked"}
              </span>
            </div>
            {r.audit_report && <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{r.audit_report}</p>}
          </div>
          <ScoreRing value={r.final_score} size={136} label="Overall" />
        </div>
        <div className="grid grid-cols-3 border-t border-line">
          {ROUND_PLAN.map((p, i) => {
            const score = r.rounds.find((x) => x.round === i + 1)?.score ?? null;
            return (
              <div key={p.name} className="border-r border-line p-5 text-center last:border-r-0">
                <p className={`font-display text-4xl ${scoreTone(score)}`}>{score ?? "—"}</p>
                <p className="mt-1 text-xs text-muted">
                  R{i + 1} · {p.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <section className="card p-6">
          <h2 className="font-semibold">Scorecard</h2>
          <div className="mt-5 space-y-4">
            {Object.entries(DIMENSIONS).map(([k, label]) => {
              const v = r.dimension_scores?.[k] ?? null;
              return (
                <div key={k}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{label}</span>
                    <span className={`font-mono ${scoreTone(v)}`}>{v ?? "—"}</span>
                  </div>
                  <Bar value={v} tone={v != null && v < 50 ? "warn" : "brand"} />
                </div>
              );
            })}
          </div>
          {r.variant_drill && (
            <div className="mt-6 rounded-xl bg-paper p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Crosshair size={15} className="text-brand" /> Drill this next
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.variant_drill.prompt}</p>
            </div>
          )}
        </section>

        <section className="card p-6">
          <h2 className="font-semibold">Round by round</h2>
          <div className="mt-4 space-y-5">
            {r.rounds.map((rd) => (
              <div key={rd.round} className="border-t border-line pt-4 first:border-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Round {rd.round} · {ROUND_PLAN[rd.round - 1]?.name}
                  </p>
                  <span className={`font-mono text-sm ${scoreTone(rd.score)}`}>{rd.score}</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {rd.covered.slice(0, 3).map((c) => (
                    <li key={c} className="flex gap-2 text-ink-soft">
                      <Check size={15} className="mt-0.5 shrink-0 text-brand" /> {c}
                    </li>
                  ))}
                  {rd.missed.slice(0, 3).map((m) => (
                    <li key={m} className="flex gap-2 text-ink-soft">
                      <X size={15} className="mt-0.5 shrink-0 text-danger" /> {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>

      {r.annotations.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-semibold">Line-by-line feedback</h2>
          <p className="mt-1 text-sm text-muted">The moments an interviewer would mark down, and how a strong candidate would say it.</p>
          <ol className="mt-5 space-y-5">
            {r.annotations.map((a, i) => (
              <li key={i} className="grid gap-3 md:grid-cols-[auto_1fr]">
                <span className="hidden h-6 w-6 place-items-center rounded-full bg-paper font-mono text-[11px] text-muted md:grid">
                  {i + 1}
                </span>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="rounded bg-paper px-1.5 py-0.5 font-mono">R{a.round}</span> You said
                  </div>
                  <blockquote className="border-l-2 border-warn/50 pl-3 text-sm italic text-ink-soft">“{a.quote}”</blockquote>
                  {a.issue && (
                    <p className="flex gap-2 text-sm">
                      <X size={15} className="mt-0.5 shrink-0 text-danger" /> {a.issue}
                    </p>
                  )}
                  <p className="flex gap-2 rounded-lg bg-brand-tint px-3 py-2.5 text-sm text-ink">
                    <Check size={15} className="mt-0.5 shrink-0 text-brand" /> {a.better}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {r.strong_answer && r.strong_answer.checklist.length > 0 && (
        <section className="card mt-6 p-6">
          <h2 className="font-semibold">What a strong answer covers</h2>
          <p className="mt-1 text-sm text-muted">From this scenario’s golden rubric.</p>
          <div className="mt-5 grid gap-6 md:grid-cols-2">
            <ol className="space-y-2.5 text-sm">
              {r.strong_answer.checklist.map((c, i) => (
                <li key={c} className="flex gap-3">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink font-mono text-[10px] text-white">
                    {i + 1}
                  </span>
                  {c}
                </li>
              ))}
            </ol>
            {r.strong_answer.tradeoffs.length > 0 && (
              <div className="rounded-xl bg-paper p-4">
                <p className="text-sm font-medium">Trade-offs to defend out loud</p>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {r.strong_answer.tradeoffs.map((t) => (
                    <li key={t}>· {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="card mt-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold"
        >
          Full transcript
          <span className="text-sm font-normal text-muted">{showTranscript ? "Hide" : "Show"}</span>
        </button>
        {showTranscript && (
          <div className="space-y-4 border-t border-line p-6">
            {r.transcript.map((t, i) =>
              t.role === "system" ? (
                <p key={i} className="text-center text-xs text-muted">
                  — Round {t.round} complete{t.round_score != null ? ` · ${t.round_score}` : ""} —
                </p>
              ) : (
                <div key={i} className={t.role === "user" ? "ml-8 rounded-xl bg-paper p-4" : ""}>
                  <p className="text-xs text-muted">
                    {t.role === "user"
                      ? `You · Round ${t.round}${t.kind === "clarify" ? " · question" : ""}`
                      : t.kind === "clarify_answer"
                        ? "Interviewer · clarification"
                        : "Interviewer"}
                  </p>
                  {t.quote && !t.content.includes(t.quote.slice(0, 24)) && (
                    <p className="mt-1 text-sm italic text-muted">“{t.quote}”</p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{t.content}</p>
                </div>
              ),
            )}
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        {r.next_scenario && (
          <Link href={`/interview/${r.next_scenario.slug}`} className="btn-primary">
            Next in your plan: {r.next_scenario.title} <ArrowRight size={16} />
          </Link>
        )}
        {r.scenario && (
          <Link href={`/interview/${r.scenario.slug}`} className="btn-ghost">
            Retake this scenario
          </Link>
        )}
      </div>
    </AppShell>
  );
}
