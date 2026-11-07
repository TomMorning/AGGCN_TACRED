"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Lock, Search } from "lucide-react";
import AppShell, { PageError } from "@/components/app/AppShell";
import { DifficultyTag, scoreTone } from "@/components/ui";
import { FOCUS_LABELS, TRACKS } from "@/lib/catalog";
import { api, type ScenarioSummary } from "@/lib/api";

export default function LibraryPage() {
  const [items, setItems] = useState<ScenarioSummary[] | null>(null);
  const [error, setError] = useState("");
  const [track, setTrack] = useState("all");
  const [level, setLevel] = useState("all");
  const [access, setAccess] = useState("all");
  const [q, setQ] = useState("");

  useEffect(() => {
    api
      .scenarios()
      .then((d) => setItems(d.scenarios))
      .catch((e: Error) => setError(e.message));
  }, []);

  const filtered = useMemo(() => {
    return (items || []).filter((s) => {
      if (track !== "all" && !s.tracks.includes(track)) return false;
      if (level !== "all" && !s.difficulty.toLowerCase().includes(level)) return false;
      if (access === "free" && !s.is_free) return false;
      if (q && !`${s.title} ${s.summary}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, track, level, access, q]);

  const select = "rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-ink";

  return (
    <AppShell>
      <p className="eyebrow">Scenario library</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">Golden scenarios</h1>
      <p className="mt-3 max-w-xl text-ink-soft">
        Every scenario has a written rubric, the failure modes an interviewer will inject, and a three-round format.
      </p>

      <div className="mt-8 flex flex-wrap gap-2">
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 focus-within:border-ink">
          <Search size={15} className="text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search scenarios"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <select value={track} onChange={(e) => setTrack(e.target.value)} className={select}>
          <option value="all">All roles</option>
          {TRACKS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={select}>
          <option value="all">All levels</option>
          <option value="senior">Senior</option>
          <option value="staff">Staff</option>
        </select>
        <select value={access} onChange={(e) => setAccess(e.target.value)} className={select}>
          <option value="all">Free & Pro</option>
          <option value="free">Free only</option>
        </select>
      </div>

      {error && (
        <div className="mt-8">
          <PageError message={error} />
        </div>
      )}

      {!items && !error && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-44" />
          ))}
        </div>
      )}

      {items && (
        <>
          <p className="mt-6 text-sm text-muted">{filtered.length} scenarios</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {filtered.map((s) => (
              <Link
                key={s.slug}
                href={`/interview/${s.slug}`}
                className={`card group flex flex-col p-5 transition hover:shadow-lift ${s.locked ? "opacity-80" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <DifficultyTag difficulty={s.difficulty} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Clock size={12} /> {s.est_minutes} min
                    </span>
                  </div>
                  {s.locked ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted">
                      <Lock size={12} /> Pro
                    </span>
                  ) : s.best_score != null ? (
                    <span className={`font-mono text-sm ${scoreTone(s.best_score)}`}>Best {s.best_score}</span>
                  ) : (
                    <span className="text-xs font-medium text-brand">{s.is_free ? "Free" : "Pro"}</span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-snug group-hover:text-brand">{s.title}</h3>
                <p className="mt-1.5 flex-1 text-sm text-ink-soft">{s.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {s.focus_areas.slice(0, 3).map((a) => (
                    <span key={a} className="rounded-md bg-paper px-2 py-0.5 text-[11px] text-ink-soft">
                      {FOCUS_LABELS[a] || a}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
