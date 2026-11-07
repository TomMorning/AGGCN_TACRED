"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Crosshair } from "lucide-react";
import AppShell, { PageError } from "@/components/app/AppShell";
import { Bar, ScoreRing } from "@/components/ui";
import { api, type Progress } from "@/lib/api";

export default function ProgressPage() {
  const [data, setData] = useState<Progress | null>(null);
  const [error, setError] = useState("");
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => {
    api
      .progress()
      .then((d) => {
        setData(d);
        setDrill(d.recommended_drills[0]?.prompt || null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <p className="eyebrow">Progress</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Concept mastery</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Every graded round moves your mastery on the concepts it tested. Misses pull harder than wins.
      </p>

      {error && (
        <div className="mt-8">
          <PageError message={error} />
        </div>
      )}
      {!data && !error && <div className="skeleton mt-8 h-72" />}

      {data && (
        <>
          <div className="mt-8 grid gap-4 md:grid-cols-[1fr_1.4fr]">
            <div className="card flex flex-col items-center justify-center p-8 text-center">
              <ScoreRing value={data.pass_probability} size={140} label="Readiness" />
              <p className="mt-4 max-w-[220px] text-sm text-muted">
                {data.pass_probability == null
                  ? "Complete a mock interview to get your readiness score."
                  : "Weighted mastery across every concept you've been tested on."}
              </p>
            </div>
            <div className="card p-6">
              <h2 className="font-semibold">By focus area</h2>
              <div className="mt-5 space-y-4">
                {Object.entries(data.category_scores).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span>{data.category_labels[k] || k}</span>
                      <span className="font-mono text-xs text-muted">{v == null ? "untested" : v}</span>
                    </div>
                    <Bar value={v} tone={v != null && v < 50 ? "warn" : "brand"} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.recommended_drills.length > 0 && (
            <div className="card mt-6 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crosshair size={16} className="text-brand" /> Variant drills on your weak concepts
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.recommended_drills.map((d) => (
                  <button
                    key={d.concept_tag}
                    type="button"
                    onClick={() => setDrill(d.prompt)}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      drill === d.prompt ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:border-ink/30"
                    }`}
                  >
                    {d.concept_tag.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
              {drill && <p className="mt-5 rounded-xl bg-paper p-4 text-sm leading-relaxed">{drill}</p>}
            </div>
          )}

          <div className="card mt-6 overflow-hidden">
            <div className="border-b border-line px-6 py-4">
              <h2 className="font-semibold">All concepts</h2>
            </div>
            {data.mastery.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                No concepts tested yet.{" "}
                <Link href="/app" className="font-medium text-brand">
                  Start a mock
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {data.mastery.map((m) => (
                  <li key={m.concept_tag} className="grid grid-cols-[1.4fr_1fr_auto] items-center gap-4 px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.concept_tag.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted">{data.category_labels[m.category] || m.category}</p>
                    </div>
                    <Bar value={m.mastery_score} tone={m.mastery_score < 50 ? "warn" : "brand"} />
                    <span className="w-20 text-right font-mono text-xs text-muted">
                      {m.pass_count}✓ {m.fail_count}✕
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}
