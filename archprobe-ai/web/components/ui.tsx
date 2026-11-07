import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-md bg-ink text-white">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 18 L12 4 L20 18" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
          <circle cx="12" cy="14" r="2.2" fill="#34D399" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">ArchProbe</span>
    </Link>
  );
}

export function ScoreRing({ value, size = 88, label }: { value: number | null; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const color = value == null ? "#E6E3DC" : v >= 70 ? "#0E7A61" : v >= 50 ? "#B45309" : "#B91C1C";
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EFECE6" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-[28px] leading-none">{value == null ? "—" : Math.round(v)}</div>
        {label && <div className="mt-1 text-[10px] uppercase tracking-wider text-muted">{label}</div>}
      </div>
    </div>
  );
}

export function Bar({ value, tone = "brand" }: { value: number | null; tone?: "brand" | "ink" | "warn" }) {
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const colors = { brand: "bg-brand", ink: "bg-ink", warn: "bg-warn" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE6]">
      <div className={`h-full rounded-full ${colors[tone]} transition-all duration-700`} style={{ width: `${v}%` }} />
    </div>
  );
}

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict) return null;
  const good = verdict.startsWith("Strong") || verdict === "Leaning hire";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        good ? "bg-brand-soft text-brand-deep" : "bg-danger-soft text-danger"
      }`}
    >
      {verdict}
    </span>
  );
}

export function DifficultyTag({ difficulty }: { difficulty: string }) {
  const staff = difficulty.includes("Staff");
  return (
    <span
      className={`rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
        staff ? "bg-ink text-white" : "bg-[#EFECE6] text-ink-soft"
      }`}
    >
      {staff ? "Staff" : "Senior"}
    </span>
  );
}

export function scoreTone(v: number | null) {
  if (v == null) return "text-muted";
  return v >= 70 ? "text-brand" : v >= 50 ? "text-warn" : "text-danger";
}
