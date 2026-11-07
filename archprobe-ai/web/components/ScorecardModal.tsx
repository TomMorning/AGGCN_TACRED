"use client";

import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  finalScore?: number;
  dimensions?: Record<string, number>;
  auditReport?: string;
  variantDrill?: { concept_tag: string; prompt: string };
  passProbability?: number;
};

const LABELS: Record<string, string> = {
  scalability: "Scalability",
  reliability: "Reliability & Fault Tolerance",
  cost_efficiency: "Cost & Latency Trade-offs",
  production_readiness: "Production Readiness",
  ai_governance: "AI Governance",
};

export default function ScorecardModal({
  open,
  onClose,
  finalScore,
  dimensions,
  auditReport,
  variantDrill,
  passProbability,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="panel relative w-full max-w-xl animate-fade-up rounded-2xl p-6 shadow-2xl shadow-signal/10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal">Final scorecard</p>
        <h2 className="mt-2 font-display text-3xl text-white">
          {finalScore ?? "—"}
          <span className="ml-2 text-base text-slate-400">/ 100</span>
        </h2>
        <p className="mt-1 font-mono text-sm text-slate-400">
          Pass probability now {passProbability?.toFixed(1) ?? "—"}%
        </p>

        <div className="mt-6 space-y-3">
          {Object.entries(dimensions || {}).map(([key, value]) => (
            <div key={key}>
              <div className="mb-1 flex justify-between font-mono text-xs text-slate-400">
                <span>{LABELS[key] || key}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-signal-dim to-signal transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {auditReport && (
          <p className="mt-6 border-t border-white/10 pt-4 text-sm leading-relaxed text-slate-300">
            {auditReport}
          </p>
        )}

        {variantDrill && (
          <div className="mt-4 rounded-xl border border-signal/30 bg-signal/5 p-4">
            <p className="font-mono text-[11px] uppercase tracking-wider text-signal">
              Variant drill · {variantDrill.concept_tag}
            </p>
            <p className="mt-2 text-sm text-slate-200">{variantDrill.prompt}</p>
          </div>
        )}
      </div>
    </div>
  );
}
