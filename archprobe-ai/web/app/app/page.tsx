"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, Lock, Play, RotateCcw } from "lucide-react";
import AppShell, { PageError } from "@/components/app/AppShell";
import { Bar, DifficultyTag, ScoreRing, VerdictBadge, scoreTone } from "@/components/ui";
import { api, type Home, type Stop } from "@/lib/api";

function stopHref(s: Stop) {
  return s.resume_session_id ? `/interview/${s.slug}?session=${s.resume_session_id}` : `/interview/${s.slug}`;
}

export default function AppHome() {
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.home().then(setHome).catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <AppShell>
        <PageError message={error} />
      </AppShell>
    );
  }

  if (!home) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="skeleton h-10 w-72" />
          <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
            <div className="skeleton h-48" />
            <div className="skeleton h-48" />
          </div>
          <div className="skeleton h-72" />
        </div>
      </AppShell>
    );
  }

  const first = home.viewer_name?.split(" ")[0];

  if (!home.plan) {
    return (
      <AppShell>
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-[1.3fr_1fr]">
            <div className="p-8 md:p-10">
              <p className="eyebrow">Welcome{first ? `, ${first}` : ""}</p>
              <h1 className="mt-3 font-display text-4xl md:text-5xl">Let’s build your prep plan.</h1>
              <p className="mt-4 max-w-md text-ink-soft">
                Three questions — role, company type, level — and we’ll order the scenarios your loop is most likely to test.
              </p>
              <Link href="/start" className="btn-primary mt-8 px-6">
                Build my plan <ArrowRight size={16} />
              </Link>
            </div>
            <div className="border-t border-line bg-paper p-8 md:border-l md:border-t-0">
              <p className="text-sm font-medium">Or jump straight in</p>
              <Link
                href="/interview/llm-gateway-sidecar"
                className="mt-4 block rounded-xl border border-line bg-surface p-4 transition hover:border-ink/30"
              >
                <p className="font-medium">Multi-Tenant AI Agent Gateway</p>
                <p className="mt-1 text-sm text-muted">Free · 40 min · Staff</p>
              </Link>
              <Link href="/library" className="mt-4 inline-block text-sm font-medium text-brand">
                Browse all scenarios →
              </Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const next = home.stops.find((s) => s.state === "next");
  const done = home.stops.filter((s) => s.state === "done").length;
  const left = Math.max(0, home.quota.monthly_sessions_limit - home.quota.monthly_sessions_used);

  return (
    <AppShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{first ? `Welcome back, ${first}` : "Welcome back"}</p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl">{home.plan.track_title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="chip">{home.plan.company_label}</span>
            <span className="chip">{home.plan.level_label}</span>
            {home.plan.days_to_interview != null && (
              <span className="chip border-ink/20 font-medium text-ink">
                <Clock size={12} />
                {home.plan.days_to_interview > 0 ? `${home.plan.days_to_interview} days to interview` : "Interview day"}
              </span>
            )}
          </div>
        </div>
        <Link href={`/start?track=${home.plan.track}&company=${home.plan.company_type}`} className="btn-ghost">
          Edit plan
        </Link>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-[1.5fr_1fr]">
        {next ? (
          <div className="relative overflow-hidden rounded-2xl bg-ink p-7 text-white">
            <p className="text-xs uppercase tracking-wider text-white/50">Up next · Stop {next.index}</p>
            <h2 className="mt-3 font-display text-3xl leading-tight">{next.title}</h2>
            <p className="mt-2 max-w-md text-sm text-white/70">{next.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link href={stopHref(next)} className="btn bg-white px-5 text-ink hover:bg-white/90">
                {next.resume_session_id ? <RotateCcw size={16} /> : <Play size={16} />}
                {next.resume_session_id ? "Resume interview" : "Start mock interview"}
              </Link>
              <span className="text-xs text-white/60">
                {next.est_minutes} min · 3 rounds · {next.difficulty.includes("Staff") ? "Staff" : "Senior"}
              </span>
            </div>
          </div>
        ) : (
          <div className="card p-7">
            <p className="eyebrow">Plan complete</p>
            <h2 className="mt-3 font-display text-3xl">You’ve worked through every free stop.</h2>
            <p className="mt-2 text-sm text-ink-soft">Re-run your weakest scenario or drill your weak concepts.</p>
            <Link href="/progress" className="btn-primary mt-6">
              See weak concepts
            </Link>
          </div>
        )}
        <div className="card flex items-center gap-6 p-6">
          <ScoreRing value={home.readiness} size={104} label="Readiness" />
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted">Plan progress</p>
              <p className="font-medium">
                {done} of {home.stops.length} stops
              </p>
            </div>
            <div>
              <p className="text-muted">Mocks left this month</p>
              <p className="font-medium">
                {left} of {home.quota.monthly_sessions_limit}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Your roadmap</h3>
            <span className="text-xs text-muted">Ordered by what your loop weights most</span>
          </div>
          <ol className="relative mt-5 space-y-2.5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-line">
            {home.stops.map((s) => (
              <li key={s.slug} className="relative flex items-center gap-3">
                <span
                  className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-medium ${
                    s.state === "done"
                      ? "border-brand bg-brand text-white"
                      : s.state === "next"
                        ? "border-ink bg-ink text-white"
                        : "border-line bg-surface text-muted"
                  }`}
                >
                  {s.state === "done" ? <Check size={14} /> : s.state === "locked" ? <Lock size={12} /> : s.index}
                </span>
                {s.state === "locked" ? (
                  <div className="flex flex-1 items-center justify-between rounded-xl border border-dashed border-line px-4 py-3">
                    <span className="text-sm text-muted">{s.title}</span>
                    <span className="text-[11px] text-muted">Pro</span>
                  </div>
                ) : (
                  <Link
                    href={stopHref(s)}
                    className={`flex flex-1 items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:border-ink/30 ${
                      s.state === "next" ? "border-ink bg-paper" : "border-line"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{s.est_minutes} min</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <DifficultyTag difficulty={s.difficulty} />
                      {s.best_score != null && (
                        <span className={`font-mono text-sm ${scoreTone(s.best_score)}`}>{s.best_score}</span>
                      )}
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>

        <div className="space-y-6">
          <section className="card p-6">
            <h3 className="font-semibold">Focus areas</h3>
            <p className="mt-1 text-xs text-muted">Weight in your loop · your current mastery</p>
            <div className="mt-5 space-y-4">
              {home.focus.map((f) => (
                <div key={f.area}>
                  <div className="mb-1.5 flex justify-between gap-3 text-sm">
                    <span>{f.label}</span>
                    <span className="font-mono text-xs text-muted">
                      {f.weight}% · {f.mastery == null ? "untested" : f.mastery}
                    </span>
                  </div>
                  <Bar value={f.mastery} tone={f.mastery != null && f.mastery < 50 ? "warn" : "brand"} />
                </div>
              ))}
            </div>
          </section>

          <section className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent mocks</h3>
              <Link href="/reports" className="text-xs font-medium text-brand">
                All reports
              </Link>
            </div>
            {home.recent.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Your graded reports will show up here.</p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {home.recent.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.status === "completed" ? `/report/${r.id}` : `/interview/${r.slug}?session=${r.id}`}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{r.title}</p>
                        <p className="text-xs text-muted">
                          {r.status === "completed" ? new Date(r.created_at).toLocaleDateString() : `In progress · round ${Math.min(3, r.current_round)}`}
                        </p>
                      </div>
                      {r.status === "completed" ? (
                        <span className={`font-mono text-sm ${scoreTone(r.final_score)}`}>{r.final_score}</span>
                      ) : (
                        <span className="text-xs font-medium text-brand">Resume</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {home.recent[0]?.verdict && (
              <div className="mt-2">
                <VerdictBadge verdict={home.recent[0].verdict} />
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
