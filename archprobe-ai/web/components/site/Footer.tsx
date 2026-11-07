import Link from "next/link";
import { Logo } from "@/components/ui";
import { TRACKS } from "@/lib/catalog";

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">
            System design interview prep for senior and staff backend and AI engineers.
          </p>
        </div>
        <div>
          <p className="eyebrow">Role guides</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            {TRACKS.map((t) => (
              <li key={t.slug}>
                <Link href={`/tracks/${t.slug}`} className="hover:text-ink">
                  {t.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>
              <Link href="/start" className="hover:text-ink">
                Build a prep plan
              </Link>
            </li>
            <li>
              <Link href="/library" className="hover:text-ink">
                Scenario library
              </Link>
            </li>
            <li>
              <Link href="/#pricing" className="hover:text-ink">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-ink">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-muted md:px-8">© {new Date().getFullYear()} ArchProbe</p>
      </div>
    </footer>
  );
}
