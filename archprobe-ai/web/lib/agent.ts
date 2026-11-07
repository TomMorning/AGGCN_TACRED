export type GapAnalysis = {
  covered_points: string[];
  missed_critical_gaps: string[];
  weak_concept_tags: string[];
  strong_concept_tags: string[];
  selected_chaos_attack: string;
  mermaid_diagram: string;
  round_score: number;
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

export function normalizeTag(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

export function tagCategory(tag: string): string {
  if (/token_bucket|rate|hotkey|hot_key|count_min|admission/.test(tag)) return "rate_limiting";
  if (/billing|provider|budget|fallback|gateway|kv_cache|batching|prefill|canary|model/.test(tag))
    return "llm_gateway";
  if (/lua|oversell|idempoten|partition|reservation|ledger|double_entry|outbox|recon|ordering|lease/.test(tag))
    return "consistency";
  if (/citation|graph_rag|arithmetic|abstain|semantic_cache|ann_|vector|filtered|acl|embedding|feature|point_in_time|skew/.test(tag))
    return "graph_rag";
  if (/checkpoint|sandbox|hitl|workflow|sse_backpressure|agent|dead_letter|timing_wheel/.test(tag))
    return "agent_runtime";
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

export type TurnContext = {
  priorAnswers?: string;
  lastQuestion?: string;
  usedAttacks?: string[];
};

export function heuristicGapAnalysis(
  opts: {
    answer: string;
    rubric: Rubric;
    failureModes: FailureMode[];
    round: number;
    referenceMermaid: string;
  } & TurnContext,
): GapAnalysis {
  const answerWords = new Set(keywords(opts.answer));
  const allWords = new Set(keywords(`${opts.priorAnswers || ""} ${opts.answer}`));
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
  const score = clamp(Math.round(25 + coverage * 45 + engagement * 18 + numbers + lengthBonus), 15, 94);

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
  };
}

export function heuristicProbe(round: number, analysis: GapAnalysis) {
  const openers = ["That holds up:", "Fair —", "OK, I'll give you that:"];
  const ack = analysis.covered_points[0]
    ? `${openers[clamp(round, 1, 3) - 1]} ${analysis.covered_points[0].charAt(0).toLowerCase()}${analysis.covered_points[0].slice(1)}.`
    : "I still haven't heard a concrete mechanism for the part that matters.";
  const gap = analysis.missed_critical_gaps[0];
  const press = gap ? `\n\nWhat I have not heard: ${gap.toLowerCase()}.` : "";
  const asks = [
    "Give me the mechanism and a number.",
    "Quantify the blast radius and the recovery time.",
    "Tell me what it costs and what you would cut first.",
  ];
  return `${ack}\n\n${analysis.selected_chaos_attack}${press}\n\n${asks[clamp(round, 1, 3) - 1]}`;
}

export function heuristicFinal(analyses: GapAnalysis[]) {
  const scores = analyses.map((a) => a.round_score);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 40;
  const last = analyses[analyses.length - 1];
  const tag = last?.weak_concept_tags[0] || analyses.flatMap((a) => a.weak_concept_tags)[0] || "failure_bounds";
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
  return {
    dimensions,
    final_score,
    verdict,
    audit_report: `${verdict}. Your strongest round scored ${Math.max(...scores, 0)}. The recurring gap was ${tag.replace(/_/g, " ")}: an interviewer at this bar will keep pulling on it until you state a concrete mechanism and bound.`,
    variant_drill_prompt: variantPrompt(tag),
    top_weak_tag: tag,
  };
}

function hasLiveKey() {
  const key = process.env.LLM_API_KEY?.trim() ?? "";
  return key !== "" && !key.includes("your-deepseek");
}

async function callDeepSeek(messages: Array<{ role: string; content: string }>, jsonMode = false) {
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
      temperature: jsonMode ? 0 : 0.4,
      max_tokens: jsonMode ? 1200 : 450,
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

function strArray(v: unknown, max: number) {
  return Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.slice(0, 240)).slice(0, max)
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
            "You are a Principal Distributed Systems Auditor grading a system design interview. Grade strictly against the golden rubric provided; never invent criteria. Grade cumulatively: credit rubric items covered in earlier answers too, and judge how well the latest answer addresses the interviewer's last question. Respond with json only.",
        },
        {
          role: "user",
          content: `[GOLDEN RUBRIC]: ${JSON.stringify(opts.rubric)}
[FAILURE MODES NOT YET USED]: ${JSON.stringify(unused.length ? unused : opts.failureModes)}
[CURRENT ROUND]: ${opts.round} (${roundName(opts.round)})
[EARLIER ANSWERS]: ${(opts.priorAnswers || "none").slice(0, 3000)}
[INTERVIEWER'S LAST QUESTION]: ${(opts.lastQuestion || "Opening: present requirements and high-level design.").slice(0, 800)}
[LATEST ANSWER]: ${opts.answer}

Return json with exactly these keys:
{
 "covered_points": [rubric mandatory items the latest answer satisfied, quoted from the rubric],
 "missed_critical_gaps": [rubric items still not covered across all answers, or race conditions the candidate missed],
 "weak_concept_tags": [chosen only from rubric concepts],
 "strong_concept_tags": [chosen only from rubric concepts],
 "selected_chaos_attack": "the sharpest unused failure mode attack that exploits a missed gap, rephrased for this candidate's design",
 "mermaid_diagram": "Mermaid graph TD of the candidate's architecture, max 12 nodes, bottlenecks styled stroke:#ef4444,stroke-dasharray: 5 5",
 "round_score": integer 0-100
}`,
        },
      ],
      true,
    );
    const raw = JSON.parse(content) as Record<string, unknown>;
    const allowed = new Set((opts.rubric.concepts || []).map(normalizeTag));
    const filterTags = (v: unknown) => {
      const tags = strArray(v, 6).map(normalizeTag);
      const inRubric = tags.filter((t) => allowed.has(t));
      return (inRubric.length ? inRubric : tags).slice(0, 4);
    };
    const attack = typeof raw.selected_chaos_attack === "string" ? raw.selected_chaos_attack.slice(0, 600) : "";
    return {
      covered_points: strArray(raw.covered_points, 6),
      missed_critical_gaps: strArray(raw.missed_critical_gaps, 5),
      weak_concept_tags: filterTags(raw.weak_concept_tags),
      strong_concept_tags: filterTags(raw.strong_concept_tags),
      selected_chaos_attack: attack || fallback.selected_chaos_attack,
      mermaid_diagram: typeof raw.mermaid_diagram === "string" ? raw.mermaid_diagram : opts.referenceMermaid,
      round_score: clamp(Math.round(Number(raw.round_score) || fallback.round_score), 0, 100),
    };
  } catch {
    return fallback;
  }
}

export async function runProbe(round: number, analysis: GapAnalysis, answer: string) {
  if (!hasLiveKey()) return heuristicProbe(round, analysis);
  try {
    const content = await callDeepSeek([
      {
        role: "system",
        content:
          "You are a battle-tested Staff Engineer running a system design interview. Direct, specific, no praise padding. One sentence on what works, then launch the chaos attack as a concrete quantitative question. Under 150 words. Plain text, no markdown headings.",
      },
      {
        role: "user",
        content: `Round ${round}/3 (${roundName(round)}).
Gaps found: ${JSON.stringify(analysis.missed_critical_gaps)}
What they covered: ${JSON.stringify(analysis.covered_points)}
Candidate answer: ${answer}
Chaos attack to launch: ${analysis.selected_chaos_attack}`,
      },
    ]);
    return content || heuristicProbe(round, analysis);
  } catch {
    return heuristicProbe(round, analysis);
  }
}

export async function runFinalEval(opts: {
  rubric: Rubric;
  candidateAnswers: string[];
  analyses: GapAnalysis[];
}) {
  const fallback = heuristicFinal(opts.analyses);
  if (!hasLiveKey()) return fallback;
  try {
    const answers = opts.candidateAnswers.map((a, i) => `Round ${i + 1}: ${a.slice(0, 2000)}`).join("\n\n");
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

Return json: {"scalability":0-100,"reliability":0-100,"cost_efficiency":0-100,"production_readiness":0-100,"final_score":0-100,"verdict":"Strong hire signal|Leaning hire|Leaning no hire|No hire","audit_report":"3 sentences, direct","variant_drill_prompt":"one follow-up drill on the weakest concept","top_weak_tag":"one rubric concept"}`,
        },
      ],
      true,
    );
    const raw = JSON.parse(content) as Record<string, unknown>;
    const num = (k: string, d: number) => clamp(Math.round(Number(raw[k]) || d), 0, 100);
    const tag = normalizeTag(String(raw.top_weak_tag || "")) || fallback.top_weak_tag;
    const verdicts = ["Strong hire signal", "Leaning hire", "Leaning no hire", "No hire"];
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
    };
  } catch {
    return fallback;
  }
}
