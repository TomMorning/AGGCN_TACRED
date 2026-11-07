export type GapAnalysis = {
  covered_points: string[];
  missed_critical_gaps: string[];
  weak_concept_tags: string[];
  strong_concept_tags: string[];
  selected_chaos_attack: string;
  mermaid_diagram: string;
  round_score: number;
  quote: string;
  numeric_issues: string[];
};

export type DimensionScores = {
  scalability: number;
  reliability: number;
  cost_efficiency: number;
  production_readiness: number;
};

export type Rubric = {
  mandatory?: string[];
  tradeoffs?: string[];
  concepts?: string[];
};

export type FailureMode = { id: string; attack: string };

export type Clarification = { topic: string; keywords: string[]; answer: string };

export type Annotation = { round: number; quote: string; issue: string; better: string };

export type TurnContext = {
  priorAnswers?: string;
  lastQuestion?: string;
  usedAttacks?: string[];
  diagram?: string;
  clarifyCount?: number;
};

const STOPWORDS = new Set(
  "with from that this into over under your their them they when what which where while than then also only each every about after before between plus without across using used make makes keep keeps such very more most less like just into onto upon does have been were will would could should must".split(
    " ",
  ),
);

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function keywords(text: string) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s/-]/g, " ")
        .split(/[\s/-]+/)
        .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
    ),
  ];
}

function sentences(text: string) {
  return text
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().replace(/^[-*•\s]+/, ""))
    .filter((s) => s.length > 12);
}

function lowerFirst(s: string) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

export function normalizeTag(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function tagCategory(tag: string): string {
  if (/token_bucket|rate|hotkey|hot_key|count_min|admission/.test(tag)) return "rate_limiting";
  if (/billing|provider|budget|fallback|gateway|kv_cache|batching|prefill|canary|model/.test(tag)) return "llm_gateway";
  if (/lua|oversell|idempoten|partition|reservation|ledger|double_entry|outbox|recon|ordering|lease/.test(tag))
    return "consistency";
  if (/citation|graph_rag|arithmetic|abstain|semantic_cache|ann_|vector|filtered|acl|embedding|feature|point_in_time|skew/.test(tag))
    return "graph_rag";
  if (/checkpoint|sandbox|hitl|workflow|sse_backpressure|agent|dead_letter|timing_wheel/.test(tag)) return "agent_runtime";
  return "high_concurrency";
}

export function variantPrompt(tag: string) {
  return `Variant drill on ${tag.replace(/_/g, " ")}: redesign the component that failed this concept. State the bound numerically, name the failure mode you are hardening against, and sketch the data path in at most 8 nodes.`;
}

function covers(item: string, words: Set<string>) {
  const kws = keywords(item);
  const hits = kws.filter((k) => words.has(k) || [...words].some((w) => w.startsWith(k.slice(0, 5)))).length;
  return hits >= 2 || (kws.length > 0 && hits / kws.length >= 0.4);
}

/** Picks the sentence an interviewer would push on: one that touches a gap or makes a numeric claim. */
export function pickQuote(answer: string, focus: string[]) {
  const focusWords = new Set(focus.flatMap(keywords));
  const ranked = sentences(answer)
    .map((s) => ({
      s,
      score: keywords(s).filter((w) => focusWords.has(w)).length * 2 + (/\d/.test(s) ? 2 : 0) + Math.min(s.length, 160) / 160,
    }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0]?.s || "";
  return best.length > 150 ? `${best.slice(0, 147).trimEnd()}…` : best;
}

export function heuristicGapAnalysis(
  opts: {
    answer: string;
    rubric: Rubric;
    failureModes: FailureMode[];
    round: number;
    referenceMermaid: string;
  } & TurnContext,
): GapAnalysis {
  const answerWords = new Set(keywords(`${opts.answer} ${opts.diagram || ""}`));
  const allWords = new Set(keywords(`${opts.priorAnswers || ""} ${opts.answer} ${opts.diagram || ""}`));
  const mandatory = opts.rubric.mandatory || [];
  const concepts = (opts.rubric.concepts || []).map(normalizeTag);

  const coveredNow: string[] = [];
  const missed: string[] = [];
  const strong: string[] = [];
  const weak: string[] = [];
  let coveredTotal = 0;

  mandatory.forEach((item, i) => {
    const tag = concepts.length ? concepts[i % concepts.length] : normalizeTag(item);
    const now = covers(item, answerWords);
    if (now) {
      coveredNow.push(item);
      strong.push(tag);
    }
    if (now || covers(item, allWords)) coveredTotal++;
    else {
      missed.push(item);
      weak.push(tag);
    }
  });

  const coverage = mandatory.length ? coveredTotal / mandatory.length : 0;
  const engagement = opts.lastQuestion
    ? Math.min(1, keywords(opts.lastQuestion).filter((k) => answerWords.has(k)).length / 3)
    : coverage;
  const numbers = /\d/.test(opts.answer) ? 4 : 0;
  const lengthBonus = clamp(Math.floor(opts.answer.length / 300), 0, 5);
  const clarifyBonus = opts.round === 1 ? Math.min(8, (opts.clarifyCount || 0) * 3) : 0;
  const score = clamp(Math.round(22 + coverage * 45 + engagement * 18 + numbers + lengthBonus + clarifyBonus), 15, 94);

  const used = new Set(opts.usedAttacks || []);
  const modes = opts.failureModes.length
    ? opts.failureModes
    : [{ id: "generic", attack: "Your busiest shared component fails at peak. Walk me through what the user sees and how you recover." }];
  const fresh = modes.filter((m) => !used.has(m.attack));
  const pool = fresh.length ? fresh : modes;
  const missedWords = new Set(missed.flatMap(keywords));
  const ranked = [...pool].sort(
    (a, b) =>
      keywords(b.attack).filter((w) => missedWords.has(w)).length - keywords(a.attack).filter((w) => missedWords.has(w)).length,
  );

  return {
    covered_points: coveredNow.slice(0, 6),
    missed_critical_gaps: missed.slice(0, 5),
    weak_concept_tags: [...new Set(weak)].slice(0, 4),
    strong_concept_tags: [...new Set(strong)].slice(0, 4),
    selected_chaos_attack: ranked[0].attack,
    mermaid_diagram: opts.referenceMermaid,
    round_score: score,
    quote: pickQuote(opts.answer, missed),
    numeric_issues: [],
  };
}

export type ProbeMode = "followup" | "next_round";

export function heuristicProbe(opts: {
  mode: ProbeMode;
  round: number;
  analysis: Pick<GapAnalysis, "covered_points" | "missed_critical_gaps" | "selected_chaos_attack" | "quote">;
  rubric: Rubric;
}) {
  const { analysis } = opts;
  const gap = analysis.missed_critical_gaps[0];
  if (opts.mode === "followup") {
    if (gap) {
      return `Stay on that for a second. It doesn't yet cover ${lowerFirst(gap)}. Walk me through exactly how that works in your design, with a number I can check.`;
    }
    const noGap = [
      "Take one request end to end through that design. Where does it block, and what's the p99 cost of each hop?",
      "When that fails, what does the user actually see, and how long until you've recovered? Give me the number.",
      "Which part of that cost grows fastest as traffic grows, and what would you change at 10x?",
    ];
    return noGap[clamp(opts.round, 1, 3) - 1];
  }
  if (opts.round === 2) {
    const ack = analysis.covered_points[0] ? `Let's move on. You covered ${lowerFirst(analysis.covered_points[0])}. ` : "Let's move on. ";
    return `${ack}Now I'm going to break something.\n\n${analysis.selected_chaos_attack}`;
  }
  const tradeoff = (opts.rubric.tradeoffs || [])[0];
  const costAsk = tradeoff
    ? `Last round: cost and edge cases. Take the trade-off "${lowerFirst(tradeoff)}" — which side do you pick at this scale, what does it cost, and what would you cut first if the budget were halved?`
    : "Last round: cost and edge cases. What does this design cost to run at peak, and what would you cut first if the budget were halved?";
  return gap ? `${costAsk}\n\nAlso still open from earlier: ${lowerFirst(gap)}.` : costAsk;
}

export function answerClarificationHeuristic(question: string, facts: Clarification[]) {
  const q = question.toLowerCase();
  const scored = facts
    .map((f) => ({ f, hits: f.keywords.filter((k) => q.includes(k.toLowerCase())).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  if (scored.length === 0) {
    return "That isn't specified. State the assumption you'd make and why, then keep going — strong candidates say their assumptions out loud.";
  }
  return scored
    .slice(0, 2)
    .map((x) => x.f.answer)
    .join(" ");
}

export function heuristicFinal(analyses: GapAnalysis[], answersByRound: Record<number, string[]>, rubric: Rubric) {
  const scores = analyses.map((a) => a.round_score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 40;
  const allWeak = analyses.flatMap((a) => a.weak_concept_tags);
  const counts = allWeak.reduce<Record<string, number>>((m, t) => ((m[t] = (m[t] || 0) + 1), m), {});
  const tag = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "failure_bounds";
  const r1 = scores[0] ?? avg;
  const r2 = scores[1] ?? avg;
  const r3 = scores[2] ?? avg;
  const dimensions: DimensionScores = {
    scalability: clamp(Math.round(r1 * 0.6 + avg * 0.4), 10, 95),
    reliability: clamp(Math.round(r2 * 0.6 + avg * 0.4), 10, 95),
    cost_efficiency: clamp(Math.round(r3 * 0.6 + avg * 0.4), 10, 95),
    production_readiness: clamp(Math.round(avg - 4), 10, 95),
  };
  const final_score = Math.round(
    (dimensions.scalability + dimensions.reliability + dimensions.cost_efficiency + dimensions.production_readiness) / 4,
  );
  const verdict =
    final_score >= 75 ? "Strong hire signal" : final_score >= 60 ? "Leaning hire" : final_score >= 45 ? "Leaning no hire" : "No hire";

  const annotations: Annotation[] = [];
  analyses.forEach((a, i) => {
    const round = i + 1;
    const text = (answersByRound[round] || []).join(" ");
    a.missed_critical_gaps.slice(0, 2).forEach((gap) => {
      const quote = pickQuote(text, [gap]);
      if (!quote) return;
      annotations.push({
        round,
        quote,
        issue: `This is where ${lowerFirst(gap)} should have come up, and it didn't.`,
        better: `Name it explicitly: "${gap}" — then give the mechanism and one number (a bound, a rate or a size) that shows it holds at this scale.`,
      });
    });
  });

  return {
    dimensions,
    final_score,
    verdict,
    audit_report: `${verdict}. Your strongest round scored ${Math.max(...scores, 0)}. The gap that kept coming back was ${tag.replace(/_/g, " ")}: an interviewer at this bar will keep pulling on it until you state a concrete mechanism and bound.${
      (rubric.tradeoffs || []).length ? ` Practise defending "${lowerFirst((rubric.tradeoffs || [])[0])}" out loud.` : ""
    }`,
    variant_drill_prompt: variantPrompt(tag),
    top_weak_tag: tag,
    annotations: annotations.slice(0, 6),
  };
}

function hasLiveKey() {
  const key = process.env.LLM_API_KEY?.trim() ?? "";
  return key !== "" && !key.includes("your-deepseek");
}

async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  opts: { json?: boolean; maxTokens?: number; timeoutMs?: number } = {},
) {
  const base = (process.env.LLM_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.LLM_MODEL_PROBER || "deepseek-chat";
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      temperature: opts.json ? 0 : 0.4,
      max_tokens: opts.maxTokens ?? (opts.json ? 1200 : 400),
      messages,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 25_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function strArray(v: unknown, max: number, len = 240) {
  return Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === "string" && x.trim() !== "")
        .map((x) => x.slice(0, len))
        .slice(0, max)
    : [];
}

function roundName(round: number) {
  return ["Architecture & data flow", "Chaos / failure injection", "Cost, consistency & edge cases"][clamp(round, 1, 3) - 1];
}

export async function runGapAnalysis(
  opts: {
    rubric: Rubric;
    failureModes: FailureMode[];
    round: number;
    answer: string;
    referenceMermaid: string;
  } & TurnContext,
): Promise<GapAnalysis> {
  const fallback = heuristicGapAnalysis(opts);
  if (!hasLiveKey()) return fallback;
  const unused = opts.failureModes.filter((m) => !(opts.usedAttacks || []).includes(m.attack));
  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "You are a Principal Distributed Systems Auditor grading a system design interview. Grade strictly against the golden rubric; never invent criteria. Grade cumulatively: credit rubric items covered in earlier answers, and judge how well the latest answer addresses the interviewer's last question. Check every number the candidate states (capacity math, rates, sizes) and flag ones that are wrong or inconsistent. Respond with json only.",
        },
        {
          role: "user",
          content: `[GOLDEN RUBRIC]: ${JSON.stringify(opts.rubric)}
[FAILURE MODES NOT YET USED]: ${JSON.stringify(unused.length ? unused : opts.failureModes)}
[CURRENT ROUND]: ${opts.round} (${roundName(opts.round)})
[CLARIFYING QUESTIONS ASKED SO FAR]: ${opts.clarifyCount || 0}
[EARLIER ANSWERS]: ${(opts.priorAnswers || "none").slice(0, 3000)}
[INTERVIEWER'S LAST QUESTION]: ${(opts.lastQuestion || "Opening: present requirements and high-level design.").slice(0, 800)}
[CANDIDATE'S DIAGRAM (mermaid)]: ${(opts.diagram || "none").slice(0, 2000)}
[LATEST ANSWER]: ${opts.answer}

Return json with exactly these keys:
{
 "covered_points": [rubric mandatory items the latest answer satisfied, quoted from the rubric],
 "missed_critical_gaps": [rubric items still not covered across all answers, or race conditions the candidate missed],
 "weak_concept_tags": [chosen only from rubric concepts],
 "strong_concept_tags": [chosen only from rubric concepts],
 "quote": "the exact sentence fragment (max 25 words, copied verbatim from LATEST ANSWER) an interviewer should push on",
 "numeric_issues": ["short note for each wrong or unjustified number, empty if none"],
 "selected_chaos_attack": "the sharpest unused failure mode attack that exploits a missed gap, rephrased for this candidate's design",
 "mermaid_diagram": "Mermaid graph TD of the candidate's architecture, max 12 nodes, bottlenecks styled stroke:#ef4444,stroke-dasharray: 5 5",
 "round_score": integer 0-100 (in round 1, asking good clarifying questions is part of the score)
}`,
        },
      ],
      { json: true },
    );
    const raw = JSON.parse(content) as Record<string, unknown>;
    const allowed = new Set((opts.rubric.concepts || []).map(normalizeTag));
    const filterTags = (v: unknown) => {
      const tags = strArray(v, 6).map(normalizeTag);
      const inRubric = tags.filter((t) => allowed.has(t));
      return (inRubric.length ? inRubric : tags).slice(0, 4);
    };
    const attack = typeof raw.selected_chaos_attack === "string" ? raw.selected_chaos_attack.slice(0, 600) : "";
    const quote = typeof raw.quote === "string" ? raw.quote.slice(0, 220) : "";
    return {
      covered_points: strArray(raw.covered_points, 6),
      missed_critical_gaps: strArray(raw.missed_critical_gaps, 5),
      weak_concept_tags: filterTags(raw.weak_concept_tags),
      strong_concept_tags: filterTags(raw.strong_concept_tags),
      selected_chaos_attack: attack || fallback.selected_chaos_attack,
      mermaid_diagram: typeof raw.mermaid_diagram === "string" ? raw.mermaid_diagram : opts.referenceMermaid,
      round_score: clamp(Math.round(Number(raw.round_score) || fallback.round_score), 0, 100),
      quote: quote && opts.answer.toLowerCase().includes(quote.slice(0, 20).toLowerCase()) ? quote : fallback.quote,
      numeric_issues: strArray(raw.numeric_issues, 3, 200),
    };
  } catch {
    return fallback;
  }
}

export async function runInterviewerTurn(opts: {
  mode: ProbeMode;
  round: number;
  analysis: Pick<GapAnalysis, "covered_points" | "missed_critical_gaps" | "selected_chaos_attack" | "quote"> & {
    numeric_issues?: string[];
  };
  answer: string;
  rubric: Rubric;
}) {
  const fallback = heuristicProbe(opts);
  if (!hasLiveKey()) return fallback;
  const brief =
    opts.mode === "followup"
      ? `Stay in round ${opts.round} (${roundName(opts.round)}). Push on the quoted part of their answer. Quote it back in double quotes, then ask one sharp follow-up about the biggest gap. If a number looks wrong, challenge the math.`
      : opts.round === 2
        ? "Open round 2 (failure injection). One short sentence closing round 1, then launch the chaos attack against their specific design as a concrete quantitative question."
        : `Open round 3 (cost, consistency and edge cases). One short sentence closing round 2, then ask about cost at peak and one trade-off from: ${JSON.stringify(opts.rubric.tradeoffs || [])}.`;
  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "You are a battle-tested Staff Engineer running a live system design interview. Speak like a real interviewer: direct, specific, no praise padding, no lists, no headings. Ask exactly one question. Never reveal the rubric. Under 110 words.",
        },
        {
          role: "user",
          content: `${brief}
Candidate's latest answer: ${opts.answer.slice(0, 2500)}
Sentence to push on: ${opts.analysis.quote || "(pick one)"}
Gaps: ${JSON.stringify(opts.analysis.missed_critical_gaps)}
Number issues: ${JSON.stringify(opts.analysis.numeric_issues || [])}
Chaos attack: ${opts.analysis.selected_chaos_attack}`,
        },
      ],
      { maxTokens: 300, timeoutMs: 20_000 },
    );
    return content || fallback;
  } catch {
    return fallback;
  }
}

export async function answerClarification(opts: { question: string; facts: Clarification[]; title: string }) {
  const fallback = answerClarificationHeuristic(opts.question, opts.facts);
  if (!hasLiveKey()) return fallback;
  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "You are the interviewer in a system design interview answering a candidate's clarifying question. Answer only from the facts provided, in 1-3 plain sentences. If the facts don't cover it, say it's not specified and ask them to state an assumption. Never suggest a design or reveal what a good answer is.",
        },
        {
          role: "user",
          content: `Scenario: ${opts.title}\nFacts: ${JSON.stringify(opts.facts.map((f) => f.answer))}\nCandidate asks: ${opts.question}`,
        },
      ],
      { maxTokens: 160, timeoutMs: 15_000 },
    );
    return content || fallback;
  } catch {
    return fallback;
  }
}

export async function runFinalEval(opts: {
  rubric: Rubric;
  answersByRound: Record<number, string[]>;
  analyses: GapAnalysis[];
  clarifyCount: number;
}) {
  const fallback = heuristicFinal(opts.analyses, opts.answersByRound, opts.rubric);
  if (!hasLiveKey()) return fallback;
  try {
    const answers = Object.entries(opts.answersByRound)
      .map(([r, list]) => `Round ${r}:\n${list.map((a) => a.slice(0, 1500)).join("\n---\n")}`)
      .join("\n\n");
    const content = await callDeepSeek(
      [
        { role: "system", content: "You finalize Staff-level system design scorecards. Respond with json only." },
        {
          role: "user",
          content: `[GOLDEN RUBRIC]: ${JSON.stringify(opts.rubric)}
[CANDIDATE ANSWERS]:
${answers}
[ROUND SCORES]: ${JSON.stringify(opts.analyses.map((a) => a.round_score))}
[GAPS]: ${JSON.stringify(opts.analyses.flatMap((a) => a.missed_critical_gaps).slice(0, 10))}
[CLARIFYING QUESTIONS ASKED]: ${opts.clarifyCount}

Return json: {"scalability":0-100,"reliability":0-100,"cost_efficiency":0-100,"production_readiness":0-100,"final_score":0-100,"verdict":"Strong hire signal|Leaning hire|Leaning no hire|No hire","audit_report":"3 sentences, direct","variant_drill_prompt":"one follow-up drill on the weakest concept","top_weak_tag":"one rubric concept","annotations":[{"round":1-3,"quote":"verbatim fragment from the candidate, max 25 words","issue":"what an interviewer would mark down","better":"how a strong candidate would say it, 1-2 sentences"}] (4 to 6 items, the most instructive moments)}`,
        },
      ],
      { json: true, maxTokens: 1800, timeoutMs: 35_000 },
    );
    const raw = JSON.parse(content) as Record<string, unknown>;
    const num = (k: string, d: number) => clamp(Math.round(Number(raw[k]) || d), 0, 100);
    const tag = normalizeTag(String(raw.top_weak_tag || "")) || fallback.top_weak_tag;
    const verdicts = ["Strong hire signal", "Leaning hire", "Leaning no hire", "No hire"];
    const annotations: Annotation[] = Array.isArray(raw.annotations)
      ? (raw.annotations as Array<Record<string, unknown>>)
          .filter((a) => a && typeof a.quote === "string" && typeof a.better === "string")
          .slice(0, 6)
          .map((a) => ({
            round: clamp(Math.round(Number(a.round) || 1), 1, 3),
            quote: String(a.quote).slice(0, 220),
            issue: String(a.issue || "").slice(0, 300),
            better: String(a.better).slice(0, 400),
          }))
      : [];
    return {
      dimensions: {
        scalability: num("scalability", fallback.dimensions.scalability),
        reliability: num("reliability", fallback.dimensions.reliability),
        cost_efficiency: num("cost_efficiency", fallback.dimensions.cost_efficiency),
        production_readiness: num("production_readiness", fallback.dimensions.production_readiness),
      },
      final_score: num("final_score", fallback.final_score),
      verdict: verdicts.includes(String(raw.verdict)) ? String(raw.verdict) : fallback.verdict,
      audit_report: String(raw.audit_report || fallback.audit_report).slice(0, 1200),
      variant_drill_prompt: String(raw.variant_drill_prompt || variantPrompt(tag)).slice(0, 600),
      top_weak_tag: tag,
      annotations: annotations.length ? annotations : fallback.annotations,
    };
  } catch {
    return fallback;
  }
}
