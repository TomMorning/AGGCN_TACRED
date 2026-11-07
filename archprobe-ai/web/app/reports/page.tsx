"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppShell, { PageError } from "@/components/app/AppShell";
import { DifficultyTag, VerdictBadge, scoreTone } from "@/components/ui";
import { api, type SessionListItem } from "@/lib/api";

export default function ReportsPage() {
  const [items, setItems] = useState<SessionListItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .sessions()
      .then((d) => setItems(d.sessions))
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <AppShell>
      <p className="eyebrow">Reports</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Your mock interviews</h1>

      {error && (
        <div className="mt-8">
          <PageError message={error} />
        </div>
      )}
      {!items && !error && <div className="skeleton mt-8 h-64" />}

      {items && items.length === 0 && (
        <div className="card mt-8 p-10 text-center">
          <p className="font-medium">No mock interviews yet.</p>
          <p className="mt-1 text-sm text-muted">Finish one and its graded report lands here.</p>
          <Link href="/app" className="btn-primary mt-6">
            Go to my plan
          </Link>
        </div>
      )}

      {items && items.length > 0 && (
        <div className="card mt-8 overflow-hidden">
          <div className="hidden grid-cols-[2fr_0.8fr_1fr_0.6fr] border-b border-line bg-paper px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted md:grid">
            <span>Scenario</span>
            <span>Date</span>
            <span>Verdict</span>
            <span className="text-right">Score</span>
          </div>
          <ul className="divide-y divide-line">
            {items.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.status === "completed" ? `/report/${s.id}` : `/interview/${s.slug}?session=${s.id}`}
                  className="grid items-center gap-2 px-5 py-4 transition hover:bg-paper md:grid-cols-[2fr_0.8fr_1fr_0.6fr]"
                >
                  <div className="flex items-center gap-3">
                    <DifficultyTag difficulty={s.difficulty} />
                    <span className="font-medium">{s.title}</span>
                  </div>
                  <span className="text-sm text-muted">{new Date(s.created_at).toLocaleDateString()}</span>
                  <span>
                    {s.status === "completed" ? (
                      <VerdictBadge verdict={s.verdict} />
                    ) : (
                      <span className="text-sm text-brand">In progress · resume</span>
                    )}
                  </span>
                  <span className={`text-right font-display text-2xl ${scoreTone(s.final_score)}`}>
                    {s.final_score ?? "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppShell>
  );
}
