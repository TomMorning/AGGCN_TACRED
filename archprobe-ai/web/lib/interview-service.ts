import { randomUUID } from "node:crypto";
import { sql } from "./db";
import {
  answerClarification,
  normalizeTag,
  runFinalEval,
  runGapAnalysis,
  runInterviewerTurn,
  tagCategory,
  variantPrompt,
  type Annotation,
  type Clarification,
  type FailureMode,
  type GapAnalysis,
  type Rubric,
} from "./agent";
import { COMPANY_TYPES, FOCUS_LABELS, LEVELS, TRACKS } from "./catalog";
import { buildScenarioOrder, mergeWeights } from "./plans";
import { sanitizeMermaid, validateAnswer, validateQuestion } from "./sanitize";

type HttpError = Error & { status: number };

function httpError(message: string, status: number): HttpError {
  return Object.assign(new Error(message), { status });
}

type ScenarioRow = {
  id: string;
  slug: string;
  category: string;
  title: string;
  difficulty: string;
  is_free: boolean;
  problem_statement: string;
  constraints: unknown;
  golden_rubric: unknown;
  failure_modes: unknown;
  reference_mermaid: string;
  summary: string | null;
  tracks: unknown;
  focus_areas: unknown;
  est_minutes: number | null;
  clarifications: unknown;
};

export type TranscriptEntry = {
  role: "user" | "interviewer" | "system";
  kind?: "opening" | "answer" | "clarify" | "clarify_answer" | "followup" | "round_score" | "closing";
  content: string;
  round: number;
  quote?: string;
  detected_gaps?: string[];
  numeric_issues?: string[];
  mermaid_code?: string;
  diagram?: string;
  round_score?: number;
};

type RoundRecord = {
  round: number;
  score: number;
  covered: string[];
  missed: string[];
  weak: string[];
  strong: string[];
  attack?: string;
  quote?: string;
  numeric_issues?: string[];
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

const SCENARIO_COLUMNS = `id, slug, category, title, difficulty, is_free, problem_statement, constraints,
  golden_rubric, failure_modes, reference_mermaid, summary, tracks, focus_areas, est_minutes, clarifications`;

function currentPeriod() {
  return new Date().toISOString().slice(0, 7);
}

export async function ensureQuota(userId: string) {
  await sql(
    `INSERT INTO user_quotas (user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit, period)
     VALUES ($1, 'free', 0, 5, $2) ON CONFLICT (user_id) DO NOTHING`,
    [userId, currentPeriod()],
  );
  const rows = await sql<{
    plan_tier: string;
    monthly_sessions_used: number;
    monthly_sessions_limit: number;
    period: string | null;
  }>(
    `SELECT plan_tier, monthly_sessions_used, monthly_sessions_limit, period FROM user_quotas WHERE user_id = $1`,
    [userId],
  );
  const q = rows[0];
  const used = q?.period === currentPeriod() ? Number(q.monthly_sessions_used) : 0;
  return {
    plan_tier: q?.plan_tier || "free",
    monthly_sessions_used: used,
    monthly_sessions_limit: Number(q?.monthly_sessions_limit ?? 5),
  };
}

/** Atomically consumes one session from the monthly quota, resetting it when the month rolls over. */
async function claimSession(userId: string) {
  await ensureQuota(userId);
  const period = currentPeriod();
  const rows = await sql<{ monthly_sessions_used: number }>(
    `UPDATE user_quotas SET
       monthly_sessions_used = CASE WHEN period = $2 THEN monthly_sessions_used + 1 ELSE 1 END,
       period = $2,
       updated_at = NOW()
     WHERE user_id = $1 AND (period IS DISTINCT FROM $2 OR monthly_sessions_used < monthly_sessions_limit)
     RETURNING monthly_sessions_used`,
    [userId, period],
  );
  if (rows.length === 0) {
    throw httpError("You have used all mock interviews for this month on the Free plan.", 402);
  }
}

async function refundSession(userId: string) {
  await sql(
    `UPDATE user_quotas SET monthly_sessions_used = GREATEST(0, monthly_sessions_used - 1) WHERE user_id = $1`,
    [userId],
  );
}

function toSummary(r: ScenarioRow, planTier: string) {
  return {
    id: r.id,
    slug: r.slug,
    category: r.category,
    title: r.title,
    difficulty: r.difficulty,
    is_free: r.is_free,
    locked: !r.is_free && planTier === "free",
    summary: r.summary || "",
    tracks: parseJson<string[]>(r.tracks, []),
    focus_areas: parseJson<string[]>(r.focus_areas, []),
    est_minutes: Number(r.est_minutes || 40),
    constraints: parseJson<Record<string, string>>(r.constraints, {}),
  };
}

async function allScenarioRows() {
  return sql<ScenarioRow>(`SELECT ${SCENARIO_COLUMNS} FROM scenarios ORDER BY is_free DESC, title ASC`);
}

async function scenarioRowBySlug(slug: string) {
  const rows = await sql<ScenarioRow>(`SELECT ${SCENARIO_COLUMNS} FROM scenarios WHERE slug = $1`, [slug]);
  return rows[0] || null;
}

async function scenarioRowById(id: string) {
  const rows = await sql<ScenarioRow>(`SELECT ${SCENARIO_COLUMNS} FROM scenarios WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function listScenarios(userId: string) {
  const [rows, quota, best] = await Promise.all([
    allScenarioRows(),
    ensureQuota(userId),
    bestScores(userId),
  ]);
  return {
    scenarios: rows.map((r) => ({ ...toSummary(r, quota.plan_tier), best_score: best[r.slug] ?? null })),
    quota,
  };
}

/** Client-safe scenario payload. Never includes golden rubrics or failure modes. */
export async function getScenarioForViewer(userId: string, slug: string) {
  const r = await scenarioRowBySlug(slug);
  if (!r) return null;
  const quota = await ensureQuota(userId);
  const base = toSummary(r, quota.plan_tier);
  if (base.locked) return { ...base, constraints: {}, problem_statement: "", quota };
  return { ...base, problem_statement: r.problem_statement, quota };
}

export async function passProbability(userId: string): Promise<number | null> {
  const rows = await sql<{ mastery_score: number; fail_count: number; pass_count: number }>(
    `SELECT mastery_score, fail_count, pass_count FROM user_concept_mastery WHERE user_id = $1`,
    [userId],
  );
  if (rows.length === 0) return null;
  const avg = rows.reduce((s, r) => s + Number(r.mastery_score), 0) / rows.length;
  let penalty = 0;
  for (const r of rows) {
    if (Number(r.fail_count) > Number(r.pass_count)) penalty += 1.5;
  }
  return Math.round(Math.max(5, Math.min(98, avg - penalty)));
}

const MAX_ANSWERS_PER_ROUND = 2;
const MAX_CLARIFY = 6;

const OPENING =
  "I'm your interviewer today. Three rounds: high-level design, then I'll break things, then cost and edge cases. Ask me anything you need to scope the problem first — I have details that aren't in the prompt. When you're ready, walk me through requirements and the high-level architecture.";

type SessionRow = {
  id: string;
  scenario_id: string;
  current_round: number;
  round_turn: number;
  clarify_count: number;
  status: string;
  transcript: unknown;
  round_scores: unknown;
};

function sessionView(s: {
  id: string;
  current_round: number;
  round_turn: number;
  clarify_count: number;
  status: string;
  transcript: TranscriptEntry[];
}) {
  return {
    id: s.id,
    current_round: Math.min(3, Number(s.current_round)),
    round_turn: Number(s.round_turn || 0),
    clarify_left: Math.max(0, MAX_CLARIFY - Number(s.clarify_count || 0)),
    max_answers_per_round: MAX_ANSWERS_PER_ROUND,
    status: s.status === "grading" ? "in_progress" : s.status,
    transcript: s.transcript,
  };
}

export async function startInterview(userId: string, slug: string) {
  const r = await scenarioRowBySlug(slug);
  if (!r) throw httpError("Scenario not found", 404);
  const quota = await ensureQuota(userId);
  if (!r.is_free && quota.plan_tier === "free") {
    throw httpError("This scenario is part of Pro.", 402);
  }

  const open = await sql<SessionRow>(
    `SELECT id, scenario_id, current_round, round_turn, clarify_count, status, transcript, round_scores
     FROM interview_sessions
     WHERE user_id = $1 AND scenario_id = $2 AND status IN ('in_progress', 'grading')
       AND created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC LIMIT 1`,
    [userId, r.id],
  );
  if (open[0]) {
    return sessionView({ ...open[0], transcript: parseJson<TranscriptEntry[]>(open[0].transcript, []) });
  }

  await claimSession(userId);

  const id = randomUUID();
  const transcript: TranscriptEntry[] = [{ role: "interviewer", kind: "opening", content: OPENING, round: 1 }];

  try {
    await sql(
      `INSERT INTO interview_sessions (id, user_id, scenario_id, current_round, round_turn, clarify_count, status, transcript, round_scores)
       VALUES ($1, $2, $3, 1, 0, 0, 'in_progress', $4::jsonb, '[]'::jsonb)`,
      [id, userId, r.id, JSON.stringify(transcript)],
    );
  } catch (e) {
    await refundSession(userId);
    throw e;
  }

  return sessionView({ id, current_round: 1, round_turn: 0, clarify_count: 0, status: "in_progress", transcript });
}

async function upsertMastery(userId: string, tag: string, delta: number, failed: boolean) {
  await sql(
    `INSERT INTO user_concept_mastery (user_id, concept_tag, category, mastery_score, fail_count, pass_count, last_tested_at)
     VALUES ($1, $2, $3, GREATEST(0, LEAST(100, 50 + $4)), $5, $6, NOW())
     ON CONFLICT (user_id, concept_tag) DO UPDATE SET
       mastery_score = GREATEST(0, LEAST(100, user_concept_mastery.mastery_score + $4)),
       fail_count = user_concept_mastery.fail_count + $5,
       pass_count = user_concept_mastery.pass_count + $6,
       last_tested_at = NOW(),
       category = EXCLUDED.category`,
    [userId, tag, tagCategory(tag), delta, failed ? 1 : 0, failed ? 0 : 1],
  );
}

/** Atomically locks the session for one turn so concurrent requests cannot double-spend LLM calls. */
async function claimTurn(userId: string, sessionId: string) {
  const claimed = await sql<SessionRow>(
    `UPDATE interview_sessions SET status = 'grading', updated_at = NOW()
     WHERE id = $1 AND user_id = $2
       AND (status = 'in_progress' OR (status = 'grading' AND updated_at < NOW() - INTERVAL '3 minutes'))
     RETURNING id, scenario_id, current_round, round_turn, clarify_count, status, transcript, round_scores`,
    [sessionId, userId],
  );
  if (claimed[0]) return claimed[0];
  const existing = await sql<{ status: string }>(
    `SELECT status FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  if (!existing[0]) throw httpError("Interview not found", 404);
  if (existing[0].status === "grading") throw httpError("Your previous answer is still being graded.", 409);
  throw httpError("This interview is already complete.", 409);
}

async function releaseTurn(userId: string, sessionId: string) {
  await sql(
    `UPDATE interview_sessions SET status = 'in_progress', updated_at = NOW() WHERE id = $1 AND user_id = $2 AND status = 'grading'`,
    [sessionId, userId],
  );
}

type TurnState = {
  sess: SessionRow;
  scenario: ScenarioRow;
  rubric: Rubric;
  failureModes: FailureMode[];
  transcript: TranscriptEntry[];
  rounds: RoundRecord[];
  round: number;
  roundTurn: number;
  clarifyCount: number;
};

async function loadTurn(sess: SessionRow): Promise<TurnState> {
  const scenario = await scenarioRowById(sess.scenario_id);
  if (!scenario) throw httpError("Scenario missing", 500);
  return {
    sess,
    scenario,
    rubric: parseJson<Rubric>(scenario.golden_rubric, {}),
    failureModes: parseJson<FailureMode[]>(scenario.failure_modes, []),
    transcript: parseJson<TranscriptEntry[]>(sess.transcript, []),
    rounds: parseJson<RoundRecord[]>(sess.round_scores, []),
    round: Math.min(3, Number(sess.current_round)),
    roundTurn: Number(sess.round_turn || 0),
    clarifyCount: Number(sess.clarify_count || 0),
  };
}

function answersByRound(transcript: TranscriptEntry[]) {
  const out: Record<number, string[]> = {};
  for (const t of transcript) if (t.role === "user" && t.kind !== "clarify") (out[t.round] ||= []).push(t.content);
  return out;
}

function recordToAnalysis(r: RoundRecord): GapAnalysis {
  return {
    covered_points: r.covered,
    missed_critical_gaps: r.missed,
    weak_concept_tags: r.weak,
    strong_concept_tags: r.strong,
    selected_chaos_attack: r.attack || "",
    mermaid_diagram: "",
    round_score: r.score,
    quote: r.quote || "",
    numeric_issues: [],
  };
}

/** Ends the current round: opens the next one with a new attack, or grades the whole interview after round 3. */
async function closeRound(st: TurnState, lastAnswer: string) {
  const record = st.rounds.find((r) => r.round === st.round);
  if (st.round < 3) {
    const nextRound = st.round + 1;
    const probe = await runInterviewerTurn({
      mode: "next_round",
      round: nextRound,
      analysis: record
        ? { ...recordToAnalysis(record) }
        : { covered_points: [], missed_critical_gaps: [], selected_chaos_attack: st.failureModes[0]?.attack || "", quote: "" },
      answer: lastAnswer,
      rubric: st.rubric,
    });
    st.transcript.push({ role: "interviewer", kind: "opening", content: probe, round: nextRound });
    return { status: "in_progress", nextRound, roundTurn: 0, final: null };
  }

  const ordered = [1, 2, 3].map((n) => st.rounds.find((r) => r.round === n)).filter((r): r is RoundRecord => Boolean(r));
  const final = await runFinalEval({
    rubric: st.rubric,
    answersByRound: answersByRound(st.transcript),
    analyses: ordered.map(recordToAnalysis),
    clarifyCount: st.clarifyCount,
  });
  st.transcript.push({
    role: "interviewer",
    kind: "closing",
    content: "That's time. Thanks — I'm writing up the scorecard now.",
    round: 3,
  });
  return { status: "completed", nextRound: 4, roundTurn: 0, final };
}

async function persistTurn(
  userId: string,
  st: TurnState,
  next: { status: string; nextRound: number; roundTurn: number; final: Awaited<ReturnType<typeof runFinalEval>> | null },
) {
  const { final } = next;
  await sql(
    `UPDATE interview_sessions SET current_round = $2, round_turn = $3, clarify_count = $4, status = $5,
       transcript = $6::jsonb, round_scores = $7::jsonb,
       final_score = COALESCE($8, final_score), dimension_scores = COALESCE($9::jsonb, dimension_scores),
       audit_report = COALESCE($10, audit_report), verdict = COALESCE($11, verdict),
       variant_drill = COALESCE($12::jsonb, variant_drill), annotations = COALESCE($13::jsonb, annotations),
       completed_at = CASE WHEN $5 = 'completed' THEN NOW() ELSE completed_at END,
       updated_at = NOW()
     WHERE id = $1 AND user_id = $14`,
    [
      st.sess.id,
      next.nextRound,
      next.roundTurn,
      st.clarifyCount,
      next.status,
      JSON.stringify(st.transcript),
      JSON.stringify(st.rounds),
      final?.final_score ?? null,
      final ? JSON.stringify(final.dimensions) : null,
      final?.audit_report ?? null,
      final?.verdict ?? null,
      final
        ? JSON.stringify({ concept_tag: final.top_weak_tag, prompt: final.variant_drill_prompt || variantPrompt(final.top_weak_tag) })
        : null,
      final ? JSON.stringify(final.annotations) : null,
      userId,
    ],
  );
  return sessionView({
    id: st.sess.id,
    current_round: next.nextRound,
    round_turn: next.roundTurn,
    clarify_count: st.clarifyCount,
    status: next.status,
    transcript: st.transcript,
  });
}

export async function submitTurn(
  userId: string,
  sessionId: string,
  input: { message: string; mode: "answer" | "clarify"; diagram?: string | null },
) {
  const message = input.mode === "clarify" ? validateQuestion(input.message) : validateAnswer(input.message);
  const diagram = input.diagram ? sanitizeMermaid(input.diagram) : "";
  const st = await loadTurn(await claimTurn(userId, sessionId));

  try {
    if (input.mode === "clarify") {
      if (st.clarifyCount >= MAX_CLARIFY) throw httpError("You've used all your clarifying questions. State an assumption and move on.", 400);
      const facts = parseJson<Clarification[]>(st.scenario.clarifications, []);
      const reply = await answerClarification({ question: message, facts, title: st.scenario.title });
      st.clarifyCount += 1;
      st.transcript.push(
        { role: "user", kind: "clarify", content: message, round: st.round },
        { role: "interviewer", kind: "clarify_answer", content: reply, round: st.round },
      );
      return {
        ...(await persistTurn(userId, st, { status: "in_progress", nextRound: st.round, roundTurn: st.roundTurn, final: null })),
        last: { kind: "clarify_answer", round_closed: false },
      };
    }

    const reference = sanitizeMermaid(st.scenario.reference_mermaid);
    const usedAttacks = st.rounds.map((r) => r.attack).filter((a): a is string => Boolean(a));
    const analysis = await runGapAnalysis({
      rubric: st.rubric,
      failureModes: st.failureModes,
      round: st.round,
      answer: message,
      referenceMermaid: reference,
      priorAnswers: st.transcript
        .filter((t) => t.role === "user" && t.kind !== "clarify")
        .map((t) => t.content)
        .join("\n\n"),
      lastQuestion: [...st.transcript].reverse().find((t) => t.role === "interviewer" && t.kind !== "clarify_answer")?.content,
      usedAttacks,
      diagram,
      clarifyCount: st.clarifyCount,
    });
    analysis.mermaid_diagram = diagram || sanitizeMermaid(analysis.mermaid_diagram, reference);

    for (const tag of analysis.weak_concept_tags) await upsertMastery(userId, normalizeTag(tag), -12, true);
    for (const tag of analysis.strong_concept_tags) await upsertMastery(userId, normalizeTag(tag), 8, false);

    const record: RoundRecord = {
      round: st.round,
      score: analysis.round_score,
      covered: [...new Set([...(st.rounds.find((r) => r.round === st.round)?.covered || []), ...analysis.covered_points])].slice(0, 8),
      missed: analysis.missed_critical_gaps,
      weak: analysis.weak_concept_tags,
      strong: analysis.strong_concept_tags,
      attack: analysis.selected_chaos_attack,
      quote: analysis.quote,
      numeric_issues: analysis.numeric_issues,
    };
    st.rounds = [...st.rounds.filter((r) => r.round !== st.round), record].sort((a, b) => a.round - b.round);

    st.transcript.push({
      role: "user",
      kind: "answer",
      content: message,
      round: st.round,
      diagram: diagram || undefined,
    });

    const roundTurn = st.roundTurn + 1;
    let next;
    if (roundTurn < MAX_ANSWERS_PER_ROUND) {
      const probe = await runInterviewerTurn({ mode: "followup", round: st.round, analysis, answer: message, rubric: st.rubric });
      st.transcript.push({
        role: "interviewer",
        kind: "followup",
        content: probe,
        round: st.round,
        quote: analysis.quote || undefined,
        detected_gaps: analysis.missed_critical_gaps,
        numeric_issues: analysis.numeric_issues,
        mermaid_code: analysis.mermaid_diagram,
        round_score: analysis.round_score,
      });
      next = { status: "in_progress", nextRound: st.round, roundTurn, final: null };
    } else {
      st.transcript.push({
        role: "system",
        kind: "round_score",
        content: `Round ${st.round} scored ${analysis.round_score}`,
        round: st.round,
        detected_gaps: analysis.missed_critical_gaps,
        numeric_issues: analysis.numeric_issues,
        mermaid_code: analysis.mermaid_diagram,
        round_score: analysis.round_score,
      });
      next = await closeRound(st, message);
    }

    return {
      ...(await persistTurn(userId, st, next)),
      last: { kind: next.status === "completed" ? "closing" : next.nextRound !== st.round ? "opening" : "followup", round_closed: next.nextRound !== st.round },
    };
  } catch (e) {
    await releaseTurn(userId, sessionId);
    throw e;
  }
}

/** Candidate chooses to skip the follow-up and move to the next round. */
export async function advanceRound(userId: string, sessionId: string) {
  const st = await loadTurn(await claimTurn(userId, sessionId));
  try {
    if (st.roundTurn < 1) throw httpError("Answer this round at least once before moving on.", 400);
    const record = st.rounds.find((r) => r.round === st.round);
    st.transcript.push({
      role: "system",
      kind: "round_score",
      content: `Round ${st.round} scored ${record?.score ?? 0}`,
      round: st.round,
      detected_gaps: record?.missed,
      round_score: record?.score,
    });
    const lastAnswer = [...st.transcript].reverse().find((t) => t.role === "user" && t.kind !== "clarify")?.content || "";
    const next = await closeRound(st, lastAnswer);
    return { ...(await persistTurn(userId, st, next)), last: { kind: next.status === "completed" ? "closing" : "opening", round_closed: true } };
  } catch (e) {
    await releaseTurn(userId, sessionId);
    throw e;
  }
}

export async function getSession(userId: string, sessionId: string) {
  const rows = await sql<SessionRow>(
    `SELECT id, scenario_id, current_round, round_turn, clarify_count, status, transcript, round_scores
     FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  const s = rows[0];
  if (!s) return null;
  return sessionView({ ...s, transcript: parseJson<TranscriptEntry[]>(s.transcript, []) });
}

async function bestScores(userId: string) {
  const rows = await sql<{ slug: string; best: number }>(
    `SELECT sc.slug, MAX(s.final_score) AS best
     FROM interview_sessions s JOIN scenarios sc ON sc.id = s.scenario_id
     WHERE s.user_id = $1 AND s.status = 'completed'
     GROUP BY sc.slug`,
    [userId],
  );
  return Object.fromEntries(rows.map((r) => [r.slug, Number(r.best)])) as Record<string, number>;
}

export async function listSessions(userId: string) {
  const rows = await sql<{
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    status: string;
    current_round: number;
    final_score: number | null;
    verdict: string | null;
    created_at: string | Date;
  }>(
    `SELECT s.id, sc.slug, sc.title, sc.difficulty, s.status, s.current_round, s.final_score, s.verdict, s.created_at
     FROM interview_sessions s JOIN scenarios sc ON sc.id = s.scenario_id
     WHERE s.user_id = $1
     ORDER BY s.created_at DESC
     LIMIT 50`,
    [userId],
  );
  return rows.map((r) => ({
    ...r,
    current_round: Number(r.current_round),
    final_score: r.final_score == null ? null : Number(r.final_score),
    created_at: new Date(r.created_at).toISOString(),
  }));
}

export async function getReport(userId: string, sessionId: string) {
  const rows = await sql<{
    id: string;
    scenario_id: string;
    status: string;
    current_round: number;
    transcript: unknown;
    round_scores: unknown;
    final_score: number | null;
    dimension_scores: unknown;
    audit_report: string | null;
    verdict: string | null;
    variant_drill: unknown;
    annotations: unknown;
    clarify_count: number | null;
    created_at: string | Date;
    completed_at: string | Date | null;
  }>(
    `SELECT id, scenario_id, status, current_round, transcript, round_scores, final_score, dimension_scores,
            audit_report, verdict, variant_drill, annotations, clarify_count, created_at, completed_at
     FROM interview_sessions WHERE id = $1 AND user_id = $2`,
    [sessionId, userId],
  );
  const s = rows[0];
  if (!s) return null;
  const scenario = await scenarioRowById(s.scenario_id);
  const rubric = parseJson<Rubric>(scenario?.golden_rubric, {});
  const completed = s.status === "completed";

  const plan = await getPlanRow(userId);
  const best = await bestScores(userId);
  const nextSlug =
    plan?.scenario_order.find((slug) => slug !== scenario?.slug && best[slug] == null) || null;
  const next = nextSlug ? await scenarioRowBySlug(nextSlug) : null;

  return {
    id: s.id,
    status: s.status,
    current_round: Number(s.current_round),
    scenario: scenario
      ? { slug: scenario.slug, title: scenario.title, difficulty: scenario.difficulty, category: scenario.category }
      : null,
    transcript: parseJson<TranscriptEntry[]>(s.transcript, []),
    rounds: parseJson<RoundRecord[]>(s.round_scores, []),
    final_score: s.final_score == null ? null : Number(s.final_score),
    dimension_scores: parseJson<Record<string, number> | null>(s.dimension_scores, null),
    audit_report: s.audit_report,
    verdict: s.verdict,
    variant_drill: parseJson<{ concept_tag: string; prompt: string } | null>(s.variant_drill, null),
    annotations: parseJson<Annotation[]>(s.annotations, []),
    clarify_count: Number(s.clarify_count || 0),
    strong_answer: completed
      ? { checklist: rubric.mandatory || [], tradeoffs: rubric.tradeoffs || [] }
      : null,
    next_scenario: next ? { slug: next.slug, title: next.title } : null,
    created_at: new Date(s.created_at).toISOString(),
    completed_at: s.completed_at ? new Date(s.completed_at).toISOString() : null,
  };
}

async function masteryRows(userId: string) {
  return sql<{
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
}

export async function dashboard(userId: string) {
  const mastery = await masteryRows(userId);
  const buckets: Record<string, number[]> = {};
  for (const m of mastery) (buckets[m.category] ||= []).push(Number(m.mastery_score));
  const categoryScores: Record<string, number | null> = {
    rate_limiting: null,
    llm_gateway: null,
    consistency: null,
    graph_rag: null,
    agent_runtime: null,
    high_concurrency: null,
  };
  for (const [cat, scores] of Object.entries(buckets)) {
    categoryScores[cat] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }
  const drills = mastery
    .filter((m) => Number(m.fail_count) > 0)
    .slice(0, 5)
    .map((m) => ({ concept_tag: m.concept_tag, category: m.category, prompt: variantPrompt(m.concept_tag) }));

  return {
    pass_probability: await passProbability(userId),
    mastery: mastery.map((m) => ({
      ...m,
      mastery_score: Number(m.mastery_score),
      fail_count: Number(m.fail_count),
      pass_count: Number(m.pass_count),
    })),
    category_scores: categoryScores,
    category_labels: FOCUS_LABELS,
    recommended_drills: drills,
  };
}

type PlanRow = {
  track: string;
  company_type: string;
  level: string;
  interview_date: string | null;
  scenario_order: string[];
  focus_weights: Record<string, number>;
};

async function getPlanRow(userId: string): Promise<PlanRow | null> {
  const rows = await sql<{
    track: string;
    company_type: string;
    level: string;
    interview_date: string | Date | null;
    scenario_order: unknown;
    focus_weights: unknown;
  }>(
    `SELECT track, company_type, level, interview_date, scenario_order, focus_weights FROM user_plans WHERE user_id = $1`,
    [userId],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    track: r.track,
    company_type: r.company_type,
    level: r.level,
    interview_date: r.interview_date ? new Date(r.interview_date).toISOString().slice(0, 10) : null,
    scenario_order: parseJson<string[]>(r.scenario_order, []),
    focus_weights: parseJson<Record<string, number>>(r.focus_weights, {}),
  };
}

export async function savePlan(
  userId: string,
  input: { track?: string; company_type?: string; level?: string; interview_date?: string | null },
) {
  const track = TRACKS.find((t) => t.slug === input.track);
  const company = COMPANY_TYPES.find((c) => c.slug === input.company_type);
  const level = LEVELS.find((l) => l.slug === input.level);
  if (!track || !company || !level) throw httpError("Pick a role, company type and level.", 400);

  let interviewDate: string | null = null;
  if (input.interview_date) {
    const d = new Date(input.interview_date);
    const days = (d.getTime() - Date.now()) / 86_400_000;
    if (Number.isNaN(d.getTime()) || days < -1 || days > 365) throw httpError("Interview date looks off.", 400);
    interviewDate = d.toISOString().slice(0, 10);
  }

  const rows = await allScenarioRows();
  const weights = mergeWeights(track.slug, company.slug);
  const order = buildScenarioOrder(
    rows.map((r) => ({
      slug: r.slug,
      difficulty: r.difficulty,
      is_free: r.is_free,
      tracks: parseJson<string[]>(r.tracks, []),
      focus_areas: parseJson<string[]>(r.focus_areas, []),
    })),
    track.slug,
    weights,
    level.slug,
  );

  await sql(
    `INSERT INTO user_plans (user_id, track, company_type, level, interview_date, scenario_order, focus_weights, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET track = EXCLUDED.track, company_type = EXCLUDED.company_type,
       level = EXCLUDED.level, interview_date = EXCLUDED.interview_date, scenario_order = EXCLUDED.scenario_order,
       focus_weights = EXCLUDED.focus_weights, updated_at = NOW()`,
    [userId, track.slug, company.slug, level.slug, interviewDate, JSON.stringify(order), JSON.stringify(weights)],
  );
  return getHome(userId);
}

export async function getHome(userId: string) {
  const plan = await getPlanRow(userId);
  const [rows, quota, best, sessions, mastery, readiness] = await Promise.all([
    allScenarioRows(),
    ensureQuota(userId),
    bestScores(userId),
    listSessions(userId),
    masteryRows(userId),
    passProbability(userId),
  ]);

  const inProgress = new Map<string, string>();
  for (const s of sessions) if (s.status !== "completed" && !inProgress.has(s.slug)) inProgress.set(s.slug, s.id);

  let stops: Array<Record<string, unknown>> = [];
  let focus: Array<{ area: string; label: string; weight: number; mastery: number | null }> = [];

  if (plan) {
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const ordered = plan.scenario_order.map((slug) => bySlug.get(slug)).filter((r): r is ScenarioRow => Boolean(r));
    const isLocked = (r: ScenarioRow) => !r.is_free && quota.plan_tier === "free";
    let nextAssigned = false;
    stops = [...ordered.filter((r) => !isLocked(r)), ...ordered.filter(isLocked)]
      .map((r, i) => {
        const summary = toSummary(r, quota.plan_tier);
        const done = best[r.slug] != null;
        let state: "done" | "next" | "locked" | "upcoming" = "upcoming";
        if (done) state = "done";
        else if (summary.locked) state = "locked";
        else if (!nextAssigned) {
          state = "next";
          nextAssigned = true;
        }
        return {
          index: i + 1,
          slug: r.slug,
          title: r.title,
          summary: summary.summary,
          difficulty: r.difficulty,
          est_minutes: summary.est_minutes,
          is_free: r.is_free,
          state,
          best_score: best[r.slug] ?? null,
          resume_session_id: inProgress.get(r.slug) || null,
        };
      });

    const buckets: Record<string, number[]> = {};
    for (const m of mastery) (buckets[m.category] ||= []).push(Number(m.mastery_score));
    focus = Object.entries(plan.focus_weights).map(([area, weight]) => ({
      area,
      label: FOCUS_LABELS[area] || area,
      weight,
      mastery: buckets[area]
        ? Math.round(buckets[area].reduce((a, b) => a + b, 0) / buckets[area].length)
        : null,
    }));
  }

  const daysToInterview = plan?.interview_date
    ? Math.ceil((new Date(plan.interview_date).getTime() - Date.now()) / 86_400_000)
    : null;

  return {
    plan: plan
      ? {
          track: plan.track,
          track_title: TRACKS.find((t) => t.slug === plan.track)?.title || plan.track,
          company_type: plan.company_type,
          company_label: COMPANY_TYPES.find((c) => c.slug === plan.company_type)?.label || plan.company_type,
          level: plan.level,
          level_label: LEVELS.find((l) => l.slug === plan.level)?.label || plan.level,
          interview_date: plan.interview_date,
          days_to_interview: daysToInterview,
        }
      : null,
    stops,
    focus,
    readiness,
    quota,
    completed_count: sessions.filter((s) => s.status === "completed").length,
    recent: sessions.slice(0, 5),
  };
}
