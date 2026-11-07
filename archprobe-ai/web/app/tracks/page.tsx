import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import { FOCUS_LABELS, TRACKS } from "@/lib/catalog";

export const metadata = { title: "Role guides — ArchProbe" };

export default function TracksPage() {
  return (
    <div className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
        <p className="eyebrow">Role guides</p>
        <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
          What each system design loop tests, and how to prepare.
        </h1>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {TRACKS.map((t) => (
            <Link key={t.slug} href={`/tracks/${t.slug}`} className="card group p-7 transition hover:shadow-lift">
              <p className="eyebrow">{t.levels.join(" · ")}</p>
              <h2 className="mt-3 text-2xl font-semibold group-hover:text-brand">{t.title}</h2>
              <p className="mt-2 text-ink-soft">{t.overview}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.keys(t.weights).map((a) => (
                  <span key={a} className="chip">
                    {FOCUS_LABELS[a]}
                  </span>
                ))}
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand">
                Read guide <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
