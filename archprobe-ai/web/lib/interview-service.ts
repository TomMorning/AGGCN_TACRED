import { randomUUID } from "node:crypto";
import { sql } from "./db";
import {
  runFinalEval,
  runGapAnalysis,
  runProbe,
  tagCategory,
  variantPrompt,
  type GapAnalysis,
} from "./agent";
import { sanitizeMermaid, validateAnswer } from "./sanitize";

export type ScenarioRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  difficulty: string;
  is_free: boolean;
  problem_statement: string;
  constraints: Record<string, string> | string;
  golden_rubric: unknown;
  failure_modes: unknown;
  reference_mermaid: string;
};

export type TranscriptEntry = {
  role: string;
  content: string;
  round: number;
  detected_gaps?: string[];
  mermaid_code?: string;
  round_score?: number;
};

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

export async function ensureQuota(userId: string) {
  await sql(
    `INSERT INTO user_quotas (user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit)
     VALUES ($1, 'free', 0, 3) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  const rows = await sql<{
    user_id: string;
    plan_tier: string;
    monthly_sessions_used: number;
    monthly_sessions_limit: number;
  }>(
    `SELECT user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit FROM user_quotas WHERE user_id = $1`,
    [userId],
  );
  return rows[0];
}

export async function listScenarios() {
  const rows = await sql<{
    id: string;
    slug: string;
    category: string;
    title: string;
    difficulty: string;
    is_free: boolean;
    constraints: unknown;
  }>(
    `SELECT id, slug, category, title, difficulty, is_free, constraints
     FROM scenarios ORDER BY is_free DESC, title ASC`,
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    category: r.category,
    title: r.title,
    difficulty: r.difficulty,
    is_free: r.is_free,
    constraints: parseJson(r.constraints, {}),
  }));
}

export async function getScenarioBySlug(slug: string) {
  const rows = await sql<ScenarioRow>(
    `SELECT id, slug, category, title, difficulty, is_free, problem_statement,
            constraints, golden_rubric, failure_modes, reference_mermaid
     FROM scenarios WHERE slug = $1`,
    [slug],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...r,
    constraints: parseJson(r.constraints, {}),
    golden_rubric: parseJson(r.golden_rubric, {}),
    failure_modes: parseJson(r.failure_modes, []),
  };
}

/** Client-safe scenario payload — never leaks golden rubrics / failure modes. */
export async function getScenarioForViewer(userId: string, slug: string) {
  const scenario = await getScenarioBySlug(slug);
  if (!scenario) return null;
  const quota = await ensureQuota(userId);
  const plan = quota?.plan_tier || "free";
  const unlocked = scenario.is_free || plan !== "free";

  return {
    id: scenario.id,
    slug: scenario.slug,
    category: scenario.category,
    title: scenario.title,
    difficulty: scenario.difficulty,
    is_free: scenario.is_free,
    locked: !unlocked,
    plan_tier: plan,
    constraints: unlocked ? scenario.constraints : {},
    problem_statement: unlocked
      ? scenario.problem_statement
      : "This is a Pro scenario. Upgrade to unlock the full problem statement, chaos probing, and Mermaid auto-draw.",
    reference_mermaid: unlocked
      ? sanitizeMermaid(scenario.reference_mermaid)
      : "graph TD\n  Locked[Pro scenario locked] --> Upgrade",
    blurb: scenario.problem_statement.slice(0, 140) + "…",
  };
}

function publicScenario(scenario: Awaited<ReturnType<typeof getScenarioBySlug>>) {
  if (!scenario) return null;
  return {
    id: scenario.id,
    slug: scenario.slug,
    category: scenario.category,
    title: scenario.title,
    difficulty: scenario.difficulty,
    is_free: scenario.is_free,
    problem_statement: scenario.problem_statement,
    constraints: scenario.constraints,
    reference_mermaid: sanitizeMermaid(scenario.reference_mermaid),
  };
}

export async function passProbability(userId: string) {
  const rows = await sql<{ mastery_score: number; fail_count: number; pass_count: number }>(
    `SELECT mastery_score, fail_count, pass_count FROM user_concept_mastery WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return 42;
  const avg = rows.reduce((s, r) => s + Number(r.mastery_score), 0) / rows.length;
  let penalty = 0;
  for (const r of rows) {
    if (Number(r.fail_count) > Number(r.pass_count)) penalty += 1.5;
  }
  return Math.max(5, Math.min(98, avg - penalty));
}

export async function startInterview(userId: string, slug: string) {
  const scenario = await getScenarioBySlug(slug);
  if (!scenario) throw Object.assign(new Error("scenario not found"), { status: 404 });
  const quota = await ensureQuota(userId);
  if (!scenario.is_free && quota?.plan_tier === "free") {
    throw Object.assign(new Error("pro plan required"), { status: 402 });
  }
  if ((quota?.monthly_sessions_used ?? 0) >= (quota?.monthly_sessions_limit ?? 3)) {
    throw Object.assign(new Error("quota exceeded"), { status: 402 });
  }

  const id = randomUUID();
  const opening =
    "Staff Engineer online. Round 1/3 — High-level design. Walk the data plane, control plane, and the single hardest consistency/latency trade-off. No buzzword salad.";
  const transcript: TranscriptEntry[] = [
    { role: "interviewer", content: opening, round: 1, mermaid_code: scenario.reference_mermaid },
  ];

  await sql(
    `INSERT INTO interview_sessions (id, user_id, scenario_id, current_round, status, transcript)
     VALUES ($1, $2, $3, 1, 'in_progress', $4::jsonb)`,
    [id, userId, scenario.id, JSON.stringify(transcript)],
  );
  await sql(
    `UPDATE user_quotas SET monthly_sessions_used = monthly_sessions_used + 1, updated_at = NOW() WHERE user_id = $1`,
    [userId],
  );

  return {
    id,
    user_id: userId,
    scenario_id: scenario.id,
    current_round: 1,
    status: "in_progress",
    transcript,
    scenario: publicScenario(scenario),
  };
}

async function upsertMastery(
  userId: string,
  tag: string,
  category: string,
  delta: number,
  failed: boolean,
) {
  await sql(
    `INSERT INTO user_concept_mastery (user_id, concept_tag, category, mastery_score, fail_count, pass_count, last_tested_at)
     VALUES ($1, $2, $3, GREATEST(0, LEAST(100, 50 + $4)), $5, $6, NOW())
     ON CONFLICT (user_id, concept_tag) DO UPDATE SET
       mastery_score = GREATEST(0, LEAST(100, user_concept_mastery.mastery_score + $4)),
       fail_count = user_concept_mastery.fail_count + $5,
       pass_count = user_concept_mastery.pass_count + $6,
       last_tested_at = NOW(),
       category = EXCLUDED.category`,
    [userId, tag, category, delta, failed ? 1 : 0, failed ? 0 : 1],
  );
}

export async function submitAnswer(userId: string, sessionId: string, answer: string) {
  const cleanAnswer = validateAnswer(answer);
  const sessions = await sql<{
    id: string;
    user_id: string;
    scenario_id: string;
    current_round: number;
    status: string;
    transcript: unknown;
  }>(
    `SELECT id, user_id, scenario_id, current_round, status, transcript FROM interview_sessions WHERE id = $1`,
    [sessionId],
  );
  const sess = sessions[0];
  if (!sess) throw Object.assign(new Error("not found"), { status: 404 });
  if (sess.user_id !== userId) throw Object.assign(new Error("forbidden"), { status: 403 });
  if (sess.status !== "in_progress") {
    throw Object.assign(new Error("session already completed"), { status: 409 });
  }

  const scenarioRows = await sql<ScenarioRow>(
    `SELECT id, slug, category, title, difficulty, is_free, problem_statement,
            constraints, golden_rubric, failure_modes, reference_mermaid
     FROM scenarios WHERE id = $1`,
    [sess.scenario_id],
  );
  const scenario = scenarioRows[0];
  if (!scenario) throw Object.assign(new Error("scenario missing"), { status: 500 });

  const round = Number(sess.current_round);
  const analysis = await runGapAnalysis({
    goldenRubric: JSON.stringify(scenario.golden_rubric),
    failureModes: JSON.stringify(scenario.failure_modes),
    round,
    answer: cleanAnswer,
    referenceMermaid: scenario.reference_mermaid,
  });
  analysis.mermaid_diagram = sanitizeMermaid(
    analysis.mermaid_diagram,
    sanitizeMermaid(scenario.reference_mermaid),
  );
  const probe = await runProbe(round, analysis, cleanAnswer);

  for (const tag of analysis.weak_concept_tags) {
    await upsertMastery(userId, tag, tagCategory(tag) || scenario.category, -12, true);
  }
  for (const point of analysis.covered_points.slice(0, 3)) {
    const tag = point
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 64);
    if (tag) await upsertMastery(userId, tag, tagCategory(tag) || scenario.category, 8, false);
  }

  const transcript = parseJson<TranscriptEntry[]>(sess.transcript, []);
  transcript.push(
    { role: "user", content: cleanAnswer, round },
    {
      role: "interviewer",
      content: probe,
      round,
      detected_gaps: analysis.missed_critical_gaps,
      mermaid_code: analysis.mermaid_diagram,
      round_score: analysis.round_score,
    },
  );

  let status = "in_progress";
  let nextRound = round + 1;
  let finalScore: number | null = null;
  let dimensionScores: Record<string, number> | null = null;
  let auditReport: string | null = null;
  let variantDrill: { concept_tag: string; prompt: string; category: string } | null = null;

  if (round >= 3) {
    const final = await runFinalEval({
      goldenRubric: JSON.stringify(scenario.golden_rubric),
      transcript,
      analysis,
    });
    status = "completed";
    nextRound = 4;
    finalScore = final.final_score;
    dimensionScores = final.dimensions;
    auditReport = final.audit_report;
    variantDrill = {
      concept_tag: final.top_weak_tag,
      prompt: final.variant_drill_prompt || variantPrompt(final.top_weak_tag),
      category: tagCategory(final.top_weak_tag),
    };
  }

  await sql(
    `UPDATE interview_sessions SET current_round = $2, status = $3, transcript = $4::jsonb,
       final_score = $5, dimension_scores = $6::jsonb, audit_report = $7, updated_at = NOW()
     WHERE id = $1`,
    [
      sessionId,
      nextRound,
      status,
      JSON.stringify(transcript),
      finalScore,
      dimensionScores ? JSON.stringify(dimensionScores) : null,
      auditReport,
    ],
  );

  return {
    session_id: sessionId,
    round,
    status,
    interviewer: probe,
    analysis,
    mermaid_diagram: analysis.mermaid_diagram,
    pass_probability: await passProbability(userId),
    dimension_scores: dimensionScores || undefined,
    final_score: finalScore ?? undefined,
    variant_drill: variantDrill || undefined,
    audit_report: auditReport || undefined,
  };
}

export async function dashboard(userId: string) {
  const mastery = await sql<{
    concept_tag: string;
    category: string;
    mastery_score: number;
    fail_count: number;
    pass_count: number;
  }>(
    `SELECT concept_tag, category, mastery_score, fail_count, pass_count
     FROM user_concept_mastery WHERE user_id = $1
     ORDER BY mastery_score ASC, fail_count DESC`,
    [userId],
  );

  const categoryScores: Record<string, number> = {
    rate_limiting: 50,
    llm_gateway: 50,
    consistency: 50,
    graph_rag: 50,
  };
  const buckets: Record<string, number[]> = {};
  for (const m of mastery) {
    (buckets[m.category] ||= []).push(Number(m.mastery_score));
  }
  for (const [cat, scores] of Object.entries(buckets)) {
    categoryScores[cat] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  const drills = mastery.slice(0, 5).map((m) => ({
    concept_tag: m.concept_tag,
    category: m.category,
    prompt: variantPrompt(m.concept_tag),
  }));
  if (drills.length === 0) {
    drills.push({
      concept_tag: "redis_hotkey",
      category: "rate_limiting",
      prompt: variantPrompt("redis_hotkey"),
    });
  }

  return {
    pass_probability: await passProbability(userId),
    mastery,
    category_scores: categoryScores,
    recommended_drills: drills,
    weakest_tags: mastery.slice(0, 5).map((m) => m.concept_tag),
  };
}

export type { GapAnalysis };
