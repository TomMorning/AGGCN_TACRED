const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type ScenarioSummary = {
  id: string;
  slug: string;
  category: string;
  title: string;
  difficulty: string;
  is_free: boolean;
  constraints: Record<string, string>;
};

export type Scenario = ScenarioSummary & {
  problem_statement: string;
  reference_mermaid: string;
  locked?: boolean;
  plan_tier?: string;
  blurb?: string;
};

export type TranscriptEntry = {
  role: string;
  content: string;
  round: number;
  detected_gaps?: string[];
  mermaid_code?: string;
  round_score?: number;
};

export type InterviewSession = {
  id: string;
  current_round: number;
  status: string;
  transcript: TranscriptEntry[];
  scenario?: Scenario;
  final_score?: number;
  dimension_scores?: Record<string, number>;
  audit_report?: string;
};

export type SubmitResponse = {
  session_id: string;
  round: number;
  status: string;
  interviewer: string;
  analysis: {
    covered_points: string[];
    missed_critical_gaps: string[];
    weak_concept_tags: string[];
    selected_chaos_attack: string;
    mermaid_diagram: string;
    round_score: number;
  };
  mermaid_diagram: string;
  pass_probability: number;
  dimension_scores?: Record<string, number>;
  final_score?: number;
  variant_drill?: { concept_tag: string; prompt: string; category: string };
  audit_report?: string;
};

export type DashboardData = {
  pass_probability: number;
  mastery: Array<{
    concept_tag: string;
    category: string;
    mastery_score: number;
    fail_count: number;
    pass_count: number;
  }>;
  category_scores: Record<string, number>;
  recommended_drills: Array<{ concept_tag: string; prompt: string; category: string }>;
  weakest_tags: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export function listScenarios() {
  return request<{
    scenarios: ScenarioSummary[];
    pass_probability: number;
    quota?: { plan_tier: string; monthly_sessions_used: number; monthly_sessions_limit: number };
  }>("/api/scenarios");
}

export function getScenario(slug: string) {
  return request<Scenario>(`/api/scenarios/${slug}`);
}

export function startInterview(slug: string) {
  return request<InterviewSession>("/api/interviews/start", {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
}

export function submitAnswer(sessionId: string, answer: string) {
  return request<SubmitResponse>(`/api/interviews/${sessionId}/submit`, {
    method: "POST",
    body: JSON.stringify({ answer }),
  });
}

export function getDashboard() {
  return request<DashboardData>("/api/dashboard/memory");
}
