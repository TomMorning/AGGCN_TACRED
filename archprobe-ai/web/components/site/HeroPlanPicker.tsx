"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { COMPANY_TYPES, TRACKS } from "@/lib/catalog";

export default function HeroPlanPicker() {
  const router = useRouter();
  const [track, setTrack] = useState(TRACKS[0].slug);
  const [company, setCompany] = useState(COMPANY_TYPES[1].slug);

  return (
    <div className="card w-full max-w-2xl p-2 shadow-lift">
      <div className="grid gap-2 sm:grid-cols-[1.15fr_1fr_auto]">
        <label className="rounded-xl bg-paper px-4 py-2.5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Role</span>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="mt-0.5 w-full cursor-pointer bg-transparent text-sm font-medium outline-none"
          >
            {TRACKS.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
        <label className="rounded-xl bg-paper px-4 py-2.5">
          <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Company type</span>
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="mt-0.5 w-full cursor-pointer bg-transparent text-sm font-medium outline-none"
          >
            {COMPANY_TYPES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => router.push(`/start?track=${track}&company=${company}`)}
          className="btn-brand rounded-xl px-5"
        >
          Build plan <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
