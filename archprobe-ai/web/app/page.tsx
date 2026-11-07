import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";
import Nav from "@/components/site/Nav";
import Footer from "@/components/site/Footer";
import HeroPlanPicker from "@/components/site/HeroPlanPicker";
import { InterviewRoomMock, JourneyMock, ReportMock } from "@/components/site/Mocks";
import RoiCalculator from "@/components/site/RoiCalculator";
import Pricing from "@/components/site/Pricing";
import { FOCUS_LABELS, TRACKS } from "@/lib/catalog";

const TOPICS = [
  "LLM gateways",
  "Inference serving",
  "Vector retrieval",
  "Agent runtimes",
  "Rate limiting",
  "Payment ledgers",
  "Chat at 10M connections",
  "Job schedulers",
  "Feature stores",
  "Flash-sale inventory",
];

const FAQ = [
  {
    q: "What is ArchProbe?",
    a: "An interview simulator for system design loops at the senior and staff level. Tell us your target role, company type and level; we build a prep plan, then run timed three-round mock interviews where an AI interviewer pushes on your design and grades every round.",
  },
  {
    q: "Why not just practice with ChatGPT?",
    a: "A chat window will discuss a design with you. It will not interview you. ArchProbe runs a fixed loop — design, failure injection, cost and edge cases — grades each round against a written rubric for that exact scenario, and tracks the concepts you keep missing across sessions.",
  },
  {
    q: "How is grading done?",
    a: "Every scenario has a golden rubric: the mechanisms a strong answer must include, the trade-offs it should defend, and the failure modes an interviewer will test. The grader compares your answer to that rubric rather than inventing criteria on the fly.",
  },
  {
    q: "What happens to my answers?",
    a: "Your answers are sent to the DeepSeek API to be graded, together with the scenario rubric. Avoid pasting confidential employer details. Transcripts and scores are stored in your account so you can review reports.",
  },
  {
    q: "Which roles are covered?",
    a: "AI Infrastructure Engineer, Senior Backend Engineer, Staff Backend Engineer and ML Platform Engineer, across Big Tech, AI labs, fintech, e-commerce and AI-native startups.",
  },
  {
    q: "Can I practice for free?",
    a: "Yes. The free plan includes six core scenarios, a personalized plan and five graded mock interviews a month.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <Nav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_15%_0%,rgba(14,122,97,0.10),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24">
          <div>
            <p className="eyebrow animate-fade-up">For senior & staff backend and AI engineers</p>
            <h1 className="mt-5 animate-fade-up-2 font-display text-[52px] leading-[0.98] tracking-tight md:text-[72px]">
              Walk into your system design loop having already done it.
            </h1>
            <p className="mt-6 max-w-lg animate-fade-up-3 text-lg leading-relaxed text-ink-soft">
              A prep plan weighted to your target role and company, then timed mock interviews with an AI interviewer
              that breaks your design and grades every round like a hiring committee would.
            </p>
            <div className="mt-8 animate-fade-up-3">
              <HeroPlanPicker />
              <p className="mt-3 text-xs text-muted">Free plan · 6 scenarios · 5 graded mocks a month</p>
            </div>
          </div>
          <div className="animate-fade-up-3">
            <InterviewRoomMock />
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
          <p className="text-center text-sm text-muted">The systems senior and staff loops actually ask you to design</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {TOPICS.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:px-8">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight md:text-5xl">
          A prep plan built for the loop you are walking into.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            ["Tell us your target", "Role, company type, level and interview date. Every loop weights skills differently."],
            ["Get a weighted plan", "Scenarios ordered by what your loop tests most, with focus areas you can see."],
            ["Rehearse the real thing", "Timed three-round mocks, a graded report after each, and drills on what you missed."],
          ].map(([t, d], i) => (
            <div key={t} className="card p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-ink font-mono text-xs text-white">
                {i + 1}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow">Graded reports</p>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Know your score before the real one.</h2>
            <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
              Each round is scored against the scenario rubric. The report breaks your performance into scalability,
              reliability, cost and production readiness, shows exactly which mechanisms you named and which you missed,
              and gives you the checklist a strong candidate would cover.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {["Per-round scores for design, chaos and cost", "Hire / no-hire style verdict", "Strong-answer checklist after every mock"].map(
                (f) => (
                  <li key={f} className="flex gap-2">
                    <Check size={16} className="mt-0.5 text-brand" /> {f}
                  </li>
                ),
              )}
            </ul>
          </div>
          <ReportMock />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:px-8 lg:grid-cols-2 lg:items-center">
        <div className="order-2 lg:order-1">
          <JourneyMock />
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">Your roadmap</p>
          <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">Stop guessing what to practice next.</h2>
          <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
            Your plan orders scenarios by what your target loop weights most. Finish a stop and the next one is queued. Weak
            concepts carry over between sessions, so the interviewer keeps pressing where you are soft.
          </p>
          <Link href="/start" className="btn-primary mt-8">
            Build my plan <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Role guides</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">What your loop actually tests.</h2>
            </div>
            <Link href="/tracks" className="text-sm font-medium text-brand hover:text-brand-deep">
              All role guides →
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {TRACKS.map((t) => (
              <Link key={t.slug} href={`/tracks/${t.slug}`} className="card group p-6 transition hover:shadow-lift">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold group-hover:text-brand">{t.title}</h3>
                    <p className="mt-1 text-sm text-muted">{t.tagline}</p>
                  </div>
                  <ArrowRight size={18} className="mt-1 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
                <div className="mt-5 space-y-2.5">
                  {Object.entries(t.weights).map(([area, w]) => (
                    <div key={area} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
                      <div>
                        <div className="mb-1 text-ink-soft">{FOCUS_LABELS[area]}</div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#EFECE6]">
                          <div className="h-full rounded-full bg-ink" style={{ width: `${(w || 0) * 2}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-muted">{w}%</span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <p className="eyebrow">Why not just ChatGPT?</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight md:text-5xl">
          A chat window can discuss a design. It can’t interview you.
        </h2>
        <div className="card mt-10 overflow-hidden">
          <div className="grid grid-cols-[1.6fr_1fr_1fr] border-b border-line bg-paper px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted">
            <span />
            <span className="text-center">Generic chatbot</span>
            <span className="text-center text-ink">ArchProbe</span>
          </div>
          {[
            "Fixed three-round loop with a clock",
            "Interviewer injects failures you did not plan for",
            "Graded against a written rubric per scenario",
            "Scores tracked across sessions",
            "Plan weighted to your role and company",
          ].map((row) => (
            <div key={row} className="grid grid-cols-[1.6fr_1fr_1fr] items-center border-b border-line px-5 py-3.5 text-sm last:border-0">
              <span>{row}</span>
              <span className="flex justify-center text-muted">
                <Minus size={16} />
              </span>
              <span className="flex justify-center text-brand">
                <Check size={18} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
        <RoiCalculator />
      </section>

      <section id="pricing" className="scroll-mt-20 bg-surface">
        <div className="mx-auto max-w-4xl px-5 py-24 md:px-8">
          <p className="eyebrow text-center">Pricing</p>
          <h2 className="mt-3 text-center font-display text-4xl md:text-5xl">Simple pricing. Cancel anytime.</h2>
          <div className="mt-10">
            <Pricing />
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24 md:px-8">
        <h2 className="text-center font-display text-4xl md:text-5xl">Frequently asked questions</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium">
                {f.q}
                <span className="text-xl text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24 md:px-8">
        <div className="mx-auto max-w-6xl rounded-3xl bg-ink px-8 py-16 text-center text-white md:py-20">
          <h2 className="mx-auto max-w-2xl font-display text-4xl leading-tight md:text-6xl">
            Make the real interview feel like one more rep.
          </h2>
          <Link href="/start" className="btn mt-8 bg-white px-6 text-ink hover:bg-white/90">
            Build my free plan <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
