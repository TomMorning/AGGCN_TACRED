import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { COMPANY_TYPES, FOCUS_LABELS, TRACKS, trackBySlug } from "@/lib/catalog";

export function generateStaticParams() {
  return TRACKS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = trackBySlug(slug);
  return { title: t ? `${t.title} system design interview guide — ArchProbe` : "Guide — ArchProbe" };
}

export default async function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const track = trackBySlug(slug);
  if (!track) notFound();
  const total = track.rounds.reduce((a, r) => a + r.minutes, 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <Link href="/tracks" className="text-sm text-muted hover:text-ink">
          ← Role guides
        </Link>
        <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">{track.levels.join(" · ")} · System design</p>
            <h1 className="mt-3 font-display text-5xl leading-tight md:text-6xl">{track.title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-soft">{track.overview}</p>

            <h2 className="mt-14 text-xl font-semibold">How the loop runs</h2>
            <p className="mt-1 text-sm text-muted">Roughly {total} minutes across three rounds.</p>
            <ol className="mt-6 space-y-3">
              {track.rounds.map((r, i) => (
                <li key={r.name} className="card flex gap-4 p-5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">{r.name}</h3>
                      <span className="inline-flex items-center gap-1 text-xs text-muted">
                        <Clock size={13} /> {r.minutes} min
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{r.tests}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="mt-14 text-xl font-semibold">Where candidates lose points</h2>
            <ul className="mt-5 space-y-3">
              {track.pitfalls.map((p) => (
                <li key={p} className="flex gap-3 rounded-xl border border-warn/20 bg-warn-soft px-4 py-3 text-sm">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <p className="eyebrow">What this loop tests</p>
              <div className="mt-5 space-y-4">
                {Object.entries(track.weights).map(([area, w]) => (
                  <div key={area}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{FOCUS_LABELS[area]}</span>
                      <span className="font-mono text-muted">{w}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EFECE6]">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${(w || 0) * 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-6">
              <p className="font-semibold">Get a plan for this role</p>
              <p className="mt-1 text-sm text-muted">Pick your company type and we order the scenarios for you.</p>
              <div className="mt-4 grid gap-2">
                {COMPANY_TYPES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/start?track=${track.slug}&company=${c.slug}`}
                    className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm hover:border-ink/30"
                  >
                    {c.label}
                    <ArrowRight size={14} className="text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}
