export type GapAnalysis = {
  covered_points: string[];
  missed_critical_gaps: string[];
  weak_concept_tags: string[];
  selected_chaos_attack: string;
  mermaid_diagram: string;
  round_score: number;
};

export type DimensionScores = {
  scalability: number;
  reliability: number;
  cost_efficiency: number;
  production_readiness: number;
  ai_governance: number;
};

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function tagCategory(tag: string): string {
  if (/token_bucket|rate|hotkey|count_min/.test(tag)) return "rate_limiting";
  if (/billing|provider|budget|fallback/.test(tag)) return "llm_gateway";
  if (/lua|oversell|idempoten|partition|reservation/.test(tag)) return "consistency";
  if (/citation|graph_rag|arithmetic|abstain|semantic_cache/.test(tag)) return "graph_rag";
  if (/checkpoint|sandbox|hitl|workflow|sse_backpressure/.test(tag)) return "agent_runtime";
  return "high_concurrency";
}

export function variantPrompt(tag: string) {
  return `Variant drill on [${tag}]: Redesign the component that previously failed this concept. State the consistency/latency bound numerically, name the failure mode, and sketch the Mermaid data path in ≤8 nodes.`;
}

export function heuristicGapAnalysis(
  userInput: string,
  referenceMermaid: string,
  round: number,
  failureModesJSON: string,
): GapAnalysis {
  const lower = userInput.toLowerCase();
  const covered: string[] = [];
  const missed: string[] = [];
  const weak: string[] = [];
  const checks: Array<{ keys: string[]; point: string; tag: string }> = [
    { keys: ["token bucket", "rate limit", "leaky bucket", "gcra"], point: "Mentions rate limiting / token bucket", tag: "token_bucket_race_condition" },
    { keys: ["redis", "cache"], point: "Mentions Redis/cache tier", tag: "redis_hotkey" },
    { keys: ["lua", "atomic", "cas"], point: "Mentions atomicity primitive", tag: "redis_lua_atomicity" },
    { keys: ["fallback", "circuit", "retry"], point: "Mentions fallback/circuit breaking", tag: "provider_fallback_storm" },
    { keys: ["ledger", "billing", "idempoten"], point: "Mentions billing/idempotency", tag: "exact_credit_billing" },
    { keys: ["shard", "partition", "hotkey", "hot key"], point: "Mentions sharding/hotkey handling", tag: "redis_hotkey" },
    { keys: ["checkpoint", "saga", "state machine"], point: "Mentions durable workflow state", tag: "workflow_checkpointing" },
    { keys: ["citation", "ground", "verify", "calculator"], point: "Mentions grounding/verification", tag: "citation_grounding" },
    { keys: ["backpressure", "queue", "kafka"], point: "Mentions backpressure/queues", tag: "sse_backpressure" },
    { keys: ["budget", "cost", "token"], point: "Mentions cost/budget control", tag: "llm_budget_governor" },
  ];

  for (const c of checks) {
    if (c.keys.some((k) => lower.includes(k))) covered.push(c.point);
    else {
      missed.push(`Missing: ${c.point}`);
      weak.push(c.tag);
    }
  }
  if (covered.length === 0) {
    missed.unshift("No concrete mechanisms named — design is too hand-wavy");
    weak.unshift("underspecified_architecture");
  }

  let score = 40 + covered.length * 8 - Math.min(5, missed.length) * 3 + (3 - round) * 2;
  score = clamp(score, 20, 92);

  let chaos =
    "Under peak load, your shared coordination point becomes a hotspot. Quantify the inconsistency bound and name the concrete mitigation.";
  if (failureModesJSON.includes("hotkey")) {
    chaos =
      "Under 100k QPS, your single Redis key for shared limit state saturates one shard NIC. If you switch to local memory batching, how do you bound global over-admission when many nodes spike simultaneously?";
  } else if (failureModesJSON.includes("citation") || failureModesJSON.includes("hallucination")) {
    chaos =
      "The model cites a page whose span does not contain the claimed number. Where in the pipeline do you reject the answer before it reaches the user?";
  } else if (failureModesJSON.includes("oversell")) {
    chaos =
      "Two regions both read stock=1 and both attempt to sell. Where is the single atomic source of truth?";
  }

  return {
    covered_points: covered.slice(0, 6),
    missed_critical_gaps: missed.slice(0, 5),
    weak_concept_tags: [...new Set(weak)].slice(0, 4),
    selected_chaos_attack: chaos,
    mermaid_diagram:
      referenceMermaid ||
      "graph TD\n  Candidate --> Bottleneck\n  style Bottleneck stroke:#ef4444,stroke-dasharray: 5 5",
    round_score: score,
  };
}

export function heuristicProbe(round: number, analysis: GapAnalysis) {
  const ack =
    analysis.covered_points[0] != null
      ? `Acknowledged: ${analysis.covered_points[0]}.`
      : "Your sketch names some of the right boxes, but the critical path is still underspecified.";
  const gap = analysis.missed_critical_gaps[0] || "the hottest shared coordination point";
  return `${ack} Round ${round} probe — ${analysis.selected_chaos_attack} Blind spot I'm exploiting: ${gap}. Give the concrete mechanism and the numerical bound.`;
}

export function heuristicFinal(analysis: GapAnalysis) {
  const base = analysis.round_score;
  const tag = analysis.weak_concept_tags[0] || "underspecified_architecture";
  const dimensions: DimensionScores = {
    scalability: clamp(base - 5, 20, 95),
    reliability: clamp(base - 8, 20, 95),
    cost_efficiency: clamp(base - 10, 20, 95),
    production_readiness: clamp(base - 12, 20, 95),
    ai_governance: clamp(base - 6, 20, 95),
  };
  const final_score = Math.round(
    (dimensions.scalability +
      dimensions.reliability +
      dimensions.cost_efficiency +
      dimensions.production_readiness) /
      4,
  );
  return {
    dimensions,
    final_score,
    audit_report: `Debrief: strongest signal was partial coverage of core boxes; weakest was ${tag}. You would not clear a Staff bar until the chaos bound for that gap is explicit.`,
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
      messages,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function runGapAnalysis(opts: {
  goldenRubric: string;
  failureModes: string;
  round: number;
  answer: string;
  referenceMermaid: string;
}): Promise<GapAnalysis> {
  const fallback = heuristicGapAnalysis(
    opts.answer,
    opts.referenceMermaid,
    opts.round,
    opts.failureModes,
  );
  if (!hasLiveKey()) return fallback;
  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "You are a Principal Distributed Systems Auditor. Always respond with json. Never invent grading criteria outside the golden rubric.",
        },
        {
          role: "user",
          content: `Compare the candidate against the Golden Rubric and Failure Modes. Output json.

[GOLDEN RUBRIC]: ${opts.goldenRubric}
[FAILURE MODES]: ${opts.failureModes}
[CURRENT ROUND]: ${opts.round}
[CANDIDATE ANSWER]: ${opts.answer}

Schema: {"covered_points":[],"missed_critical_gaps":[],"weak_concept_tags":[],"selected_chaos_attack":"","mermaid_diagram":"","round_score":78}`,
        },
      ],
      true,
    );
    const parsed = JSON.parse(content) as GapAnalysis;
    if (!parsed.mermaid_diagram) parsed.mermaid_diagram = opts.referenceMermaid;
    return parsed;
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
          "You are a battle-tested Staff Engineer. Direct tone. No fluff. No cheerleading. Acknowledge in 1 sentence, then launch the chaos probe. Under 180 words.",
      },
      {
        role: "user",
        content: `Round ${round}/3.\nGap analysis: ${JSON.stringify(analysis)}\nCandidate answer: ${answer}\nChaos attack: ${analysis.selected_chaos_attack}\nWrite the interviewer probe now.`,
      },
    ]);
    return content || heuristicProbe(round, analysis);
  } catch {
    return heuristicProbe(round, analysis);
  }
}

export async function runFinalEval(opts: {
  goldenRubric: string;
  transcript: unknown;
  analysis: GapAnalysis;
}) {
  const fallback = heuristicFinal(opts.analysis);
  if (!hasLiveKey()) return fallback;
  try {
    const content = await callDeepSeek(
      [
        {
          role: "system",
          content: "You finalize Staff interview scorecards. Respond with json only.",
        },
        {
          role: "user",
          content: `[GOLDEN RUBRIC]: ${opts.goldenRubric}
[TRANSCRIPT]: ${JSON.stringify(opts.transcript)}
[GAP ANALYSIS]: ${JSON.stringify(opts.analysis)}

Produce json: {"scalability":0,"reliability":0,"cost_efficiency":0,"production_readiness":0,"ai_governance":0,"final_score":0,"audit_report":"","variant_drill_prompt":"","top_weak_tag":""}`,
        },
      ],
      true,
    );
    const raw = JSON.parse(content) as Record<string, unknown>;
    const tag =
      String(raw.top_weak_tag || "") ||
      opts.analysis.weak_concept_tags[0] ||
      "underspecified_architecture";
    return {
      dimensions: {
        scalability: Number(raw.scalability) || fallback.dimensions.scalability,
        reliability: Number(raw.reliability) || fallback.dimensions.reliability,
        cost_efficiency: Number(raw.cost_efficiency) || fallback.dimensions.cost_efficiency,
        production_readiness:
          Number(raw.production_readiness) || fallback.dimensions.production_readiness,
        ai_governance: Number(raw.ai_governance) || fallback.dimensions.ai_governance,
      },
      final_score: Number(raw.final_score) || fallback.final_score,
      audit_report: String(raw.audit_report || fallback.audit_report),
      variant_drill_prompt: String(raw.variant_drill_prompt || variantPrompt(tag)),
      top_weak_tag: tag,
    };
  } catch {
    return fallback;
  }
}
