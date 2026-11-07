"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

const FEATURES_FREE = [
  "6 core scenarios",
  "5 graded mock interviews / month",
  "Personalized prep plan",
  "Round-by-round scorecards",
];

const FEATURES_PRO = [
  "All 12 scenarios, new ones monthly",
  "Unlimited graded mock interviews",
  "Strong-answer checklists on every report",
  "Weakness memory & variant drills",
  "Live architecture diagram on every turn",
];

export default function Pricing() {
  const [cycle, setCycle] = useState<"monthly" | "quarterly">("quarterly");
  const pro = cycle === "monthly" ? { price: 29, per: "/mo", note: "Billed monthly" } : { price: 26, per: "/mo", note: "$79 billed every 3 months" };

  return (
    <div>
      <div className="mx-auto mb-10 flex w-fit rounded-xl border border-line bg-surface p-1 text-sm">
        {(["monthly", "quarterly"] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCycle(c)}
            className={`rounded-lg px-4 py-1.5 ${cycle === c ? "bg-ink text-white" : "text-ink-soft"}`}
          >
            {c === "monthly" ? "Monthly" : "Interview season · 3 mo"}
          </button>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-7">
          <p className="text-sm font-medium">Free</p>
          <p className="mt-3 font-display text-5xl">$0</p>
          <p className="mt-1 text-sm text-muted">Everything you need to try a real loop.</p>
          <ul className="mt-6 space-y-3 text-sm">
            {FEATURES_FREE.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-brand" />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/start" className="btn-ghost mt-8 w-full">
            Start free
          </Link>
        </div>
        <div className="relative rounded-2xl border border-ink bg-ink p-7 text-white shadow-lift">
          <span className="absolute right-5 top-5 rounded-full bg-white/10 px-2.5 py-1 text-[11px]">
            {cycle === "quarterly" ? "Best value" : "Flexible"}
          </span>
          <p className="text-sm font-medium">Pro</p>
          <p className="mt-3 font-display text-5xl">
            ${pro.price}
            <span className="text-xl text-white/50">{pro.per}</span>
          </p>
          <p className="mt-1 text-sm text-white/60">{pro.note}</p>
          <ul className="mt-6 space-y-3 text-sm">
            {FEATURES_PRO.map((f) => (
              <li key={f} className="flex gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                {f}
              </li>
            ))}
          </ul>
          <button type="button" disabled className="btn mt-8 w-full bg-white text-ink">
            Pro launches soon
          </button>
        </div>
      </div>
    </div>
  );
}
