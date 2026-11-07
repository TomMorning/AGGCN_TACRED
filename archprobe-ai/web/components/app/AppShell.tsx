"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Compass, FileText, Map } from "lucide-react";
import { Logo } from "@/components/ui";

const NAV = [
  { href: "/app", label: "My plan", icon: Map },
  { href: "/library", label: "Scenario library", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/tracks", label: "Role guides", icon: Compass },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const active = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="px-5 py-5">
          <Logo />
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active(href) ? "bg-paper font-medium text-ink" : "text-ink-soft hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon size={16} className={active(href) ? "text-brand" : "text-muted"} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="m-3 rounded-xl border border-line bg-paper p-4">
          <p className="text-sm font-medium">Pro is coming</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">All 12 scenarios, unlimited mocks and strong-answer checklists.</p>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Logo />
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
                  active(href) ? "bg-ink text-white" : "bg-surface text-ink-soft"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-medium">We couldn’t load this page.</p>
      <p className="mt-2 text-sm text-muted">{message}</p>
    </div>
  );
}
