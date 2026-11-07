import { Check, Lock, X } from "lucide-react";

export function InterviewRoomMock() {
  return (
    <div className="night overflow-hidden rounded-2xl border border-black/10 bg-night text-white shadow-lift">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="ml-3 text-xs text-white/60">Multi-Tenant AI Agent Gateway · Round 2 of 3</span>
        </div>
        <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[11px] text-white/80">09:41</span>
      </div>
      <div className="grid md:grid-cols-[1fr_1.15fr]">
        <div className="hidden border-r border-white/10 p-4 md:block">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Your architecture</p>
          <div className="mt-3 space-y-2 font-mono text-[11px]">
            {["Client", "Gateway sidecar", "Token bucket", "Circuit breaker", "Credit ledger"].map((n, i) => (
              <div
                key={n}
                className={`rounded-md border px-2.5 py-1.5 ${
                  i === 2 ? "border-dashed border-rose-400/70 text-rose-200" : "border-white/15 text-white/80"
                }`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="rounded-xl bg-white/[0.06] p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Interviewer</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/90">
              Local batching works. Now: 50 sidecars spike at once against a single Redis key. Bound the global
              over-admission error for me — as a number.
            </p>
          </div>
          <div className="ml-6 rounded-xl border border-white/10 p-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">You</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">
              Each sidecar leases 2% of the tenant budget per 100ms window, so worst case is N × lease…
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-300/90">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" /> Grading against rubric…
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportMock() {
  const dims = [
    ["Scalability", 82],
    ["Reliability", 64],
    ["Cost & latency", 71],
    ["Production readiness", 58],
  ] as const;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow">Scorecard</p>
          <p className="mt-1 text-sm font-medium">Global Rate Limiter · 500k QPS</p>
        </div>
        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-deep">Leaning hire</span>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-y border-line py-4 text-center">
        {[
          ["R1 Design", 78],
          ["R2 Chaos", 61],
          ["R3 Cost", 72],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="font-display text-3xl">{v}</p>
            <p className="text-[11px] text-muted">{k}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {dims.map(([k, v]) => (
          <div key={k}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-ink-soft">{k}</span>
              <span className="font-mono">{v}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#EFECE6]">
              <div className="h-full rounded-full bg-brand" style={{ width: `${v}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2 text-[13px]">
        <p className="flex gap-2 text-ink-soft">
          <Check size={15} className="mt-0.5 shrink-0 text-brand" /> Key sharding with salted hot keys
        </p>
        <p className="flex gap-2 text-ink-soft">
          <X size={15} className="mt-0.5 shrink-0 text-danger" /> No fail-open policy during Redis partition
        </p>
      </div>
    </div>
  );
}

export function JourneyMock() {
  const stops = [
    { t: "AI Agent Gateway", s: "done", score: 74 },
    { t: "LLM Inference Serving", s: "next" },
    { t: "Billion-Scale Vector Retrieval", s: "upcoming" },
    { t: "Stateful Agent Runtime", s: "locked" },
  ];
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Your plan</p>
          <p className="mt-1 text-sm font-medium">AI Infra Engineer · AI lab · Staff</p>
        </div>
        <p className="text-xs text-muted">12 days left</p>
      </div>
      <ol className="relative mt-5 space-y-3 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-line">
        {stops.map((st, i) => (
          <li key={st.t} className="relative flex items-center gap-3">
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border text-[11px] font-medium ${
                st.s === "done"
                  ? "border-brand bg-brand text-white"
                  : st.s === "next"
                    ? "border-ink bg-ink text-white"
                    : "border-line bg-surface text-muted"
              }`}
            >
              {st.s === "done" ? <Check size={13} /> : st.s === "locked" ? <Lock size={11} /> : i + 1}
            </span>
            <div
              className={`flex flex-1 items-center justify-between rounded-xl border px-3 py-2 ${
                st.s === "next" ? "border-ink/80 bg-paper" : "border-line"
              }`}
            >
              <span className={`text-[13px] ${st.s === "locked" ? "text-muted" : ""}`}>{st.t}</span>
              {st.score && <span className="font-mono text-xs text-brand">{st.score}</span>}
              {st.s === "next" && <span className="text-[11px] font-medium">Start →</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
