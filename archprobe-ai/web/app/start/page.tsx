"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui";
import { COMPANY_TYPES, FOCUS_LABELS, LEVELS, TRACKS } from "@/lib/catalog";
import { mergeWeights } from "@/lib/plans";
import { api } from "@/lib/api";

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [track, setTrack] = useState(params.get("track") || "");
  const [company, setCompany] = useState(params.get("company") || "");
  const [level, setLevel] = useState("");
  const [date, setDate] = useState("");
  const [step, setStep] = useState(params.get("track") && params.get("company") ? 2 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canNext = [Boolean(track), Boolean(company), Boolean(level)][step];
  const weights = track && company ? mergeWeights(track, company) : null;

  async function finish() {
    setSaving(true);
    setError("");
    try {
      await api.savePlan({ track, company_type: company, level, interview_date: date || null });
      router.push("/app");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your plan");
      setSaving(false);
    }
  }

  const steps = ["Role", "Company", "Level & date"];

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 md:px-8">
        <Logo />
        <div className="flex items-center gap-2 text-xs text-muted">
          {steps.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              <span
                className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                  i < step ? "bg-brand text-white" : i === step ? "bg-ink text-white" : "bg-line text-muted"
                }`}
              >
                {i < step ? <Check size={11} /> : i + 1}
              </span>
              <span className={`hidden sm:inline ${i === step ? "text-ink" : ""}`}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" />}
            </span>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-10 px-5 pb-20 pt-6 md:px-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {step === 0 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl md:text-5xl">Which role are you interviewing for?</h1>
              <div className="mt-8 grid gap-3">
                {TRACKS.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => setTrack(t.slug)}
                    className={`card flex items-start justify-between gap-4 p-5 text-left transition ${
                      track === t.slug ? "border-ink ring-1 ring-ink" : "hover:border-ink/30"
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="mt-1 text-sm text-muted">{t.tagline}</p>
                    </div>
                    {track === t.slug && <Check size={18} className="text-brand" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl md:text-5xl">What kind of company?</h1>
              <p className="mt-3 text-ink-soft">Every company type tests different things. Your plan is weighted to match.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {COMPANY_TYPES.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCompany(c.slug)}
                    className={`card p-5 text-left transition ${
                      company === c.slug ? "border-ink ring-1 ring-ink" : "hover:border-ink/30"
                    }`}
                  >
                    <p className="font-semibold">{c.label}</p>
                    <p className="mt-1 text-sm text-muted">{c.hint}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="animate-fade-up">
              <h1 className="font-display text-4xl md:text-5xl">Level and timing</h1>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.slug}
                    type="button"
                    onClick={() => setLevel(l.slug)}
                    className={`card p-5 text-left transition ${
                      level === l.slug ? "border-ink ring-1 ring-ink" : "hover:border-ink/30"
                    }`}
                  >
                    <p className="font-semibold">{l.label}</p>
                    <p className="mt-1 text-sm text-muted">
                      {l.slug === "staff" ? "Quantified bounds, blast radius, org-level trade-offs" : "Complete scalable designs and core failure handling"}
                    </p>
                  </button>
                ))}
              </div>
              <label className="mt-8 block">
                <span className="text-sm font-medium">Interview date (optional)</span>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 block w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2.5 text-sm outline-none focus:border-ink"
                />
              </label>
            </section>
          )}

          {error && <p className="mt-6 text-sm text-danger">{error}</p>}

          <div className="mt-10 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}
              className="btn px-0 text-ink-soft hover:text-ink"
            >
              <ArrowLeft size={16} /> Back
            </button>
            {step < 2 ? (
              <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="btn-primary px-6">
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button type="button" disabled={!canNext || saving} onClick={() => void finish()} className="btn-brand px-6">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Build my plan
              </button>
            )}
          </div>
        </div>

        <aside className="lg:pt-16">
          <div className="card p-6">
            <p className="eyebrow">Your plan so far</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Role</dt>
                <dd className="text-right font-medium">{TRACKS.find((t) => t.slug === track)?.title || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Company</dt>
                <dd className="text-right font-medium">{COMPANY_TYPES.find((c) => c.slug === company)?.label || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Level</dt>
                <dd className="text-right font-medium">{LEVELS.find((l) => l.slug === level)?.label || "—"}</dd>
              </div>
            </dl>
            {weights && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium">What your loop will weight</p>
                <div className="mt-4 space-y-3">
                  {Object.entries(weights).map(([a, w]) => (
                    <div key={a}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-ink-soft">{FOCUS_LABELS[a]}</span>
                        <span className="font-mono text-muted">{w}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#EFECE6]">
                        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.min(100, w * 2)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={null}>
      <Wizard />
    </Suspense>
  );
}
