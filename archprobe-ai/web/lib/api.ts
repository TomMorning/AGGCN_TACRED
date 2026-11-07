export type Quota = { plan_tier: string; monthly_sessions_used: number; monthly_sessions_limit: number };

export type ScenarioSummary = {
  id: string;
  slug: string;
  category: string;
  title: string;
  difficulty: string;
  is_free: boolean;
  locked: boolean;
  summary: string;
  tracks: string[];
  focus_areas: string[];
  est_minutes: number;
  constraints: Record<string, string>;
  best_score?: number | null;
};

export type ScenarioDetail = ScenarioSummary & {
  problem_statement: string;
  quota: Quota;
};

export type TranscriptEntry = {
  role: string;
  content: string;
  round: number;
  detected_gaps?: string[];
  mermaid_code?: string;
  round_score?: number;
};

export type SessionState = {
  id: string;
  current_round: number;
  status: string;
  transcript: TranscriptEntry[];
};

export type SubmitResponse = {
  session_id: string;
  round: number;
  next_round: number;
  status: string;
  interviewer: string;
  analysis: {
    covered_points: string[];
    missed_critical_gaps: string[];
    weak_concept_tags: string[];
    round_score: number;
  };
  mermaid_diagram: string;
};

export type Stop = {
  index: number;
  slug: string;
  title: string;
  summary: string;
  difficulty: string;
  est_minutes: number;
  is_free: boolean;
  state: "done" | "next" | "locked" | "upcoming";
  best_score: number | null;
  resume_session_id: string | null;
};

export type SessionListItem = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  status: string;
  current_round: number;
  final_score: number | null;
  verdict: string | null;
  created_at: string;
};

export type Home = {
  viewer_name: string;
  plan: null | {
    track: string;
    track_title: string;
    company_type: string;
    company_label: string;
    level: string;
    level_label: string;
    interview_date: string | null;
    days_to_interview: number | null;
  };
  stops: Stop[];
  focus: Array<{ area: string; label: string; weight: number; mastery: number | null }>;
  readiness: number | null;
  quota: Quota;
  completed_count: number;
  recent: SessionListItem[];
};

export type Report = {
  id: string;
  status: string;
  current_round: number;
  scenario: { slug: string; title: string; difficulty: string; category: string } | null;
  transcript: TranscriptEntry[];
  rounds: Array<{ round: number; score: number; covered: string[]; missed: string[]; weak: string[]; strong: string[] }>;
  final_score: number | null;
  dimension_scores: Record<string, number> | null;
  audit_report: string | null;
  verdict: string | null;
  variant_drill: { concept_tag: string; prompt: string } | null;
  strong_answer: { checklist: string[]; tradeoffs: string[] } | null;
  next_scenario: { slug: string; title: string } | null;
  created_at: string;
  completed_at: string | null;
};

export type Progress = {
  pass_probability: number | null;
  mastery: Array<{ concept_tag: string; category: string; mastery_score: number; fail_count: number; pass_count: number }>;
  category_scores: Record<string, number | null>;
  category_labels: Record<string, string>;
  recommended_drills: Array<{ concept_tag: string; prompt: string; category: string }>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`, res.status);
  return data as T;
}

export const api = {
  scenarios: () => request<{ scenarios: ScenarioSummary[]; quota: Quota }>("/api/scenarios"),
  scenario: (slug: string) => request<ScenarioDetail>(`/api/scenarios/${encodeURIComponent(slug)}`),
  start: (slug: string) =>
    request<SessionState>("/api/interviews/start", { method: "POST", body: JSON.stringify({ slug }) }),
  session: (id: string) => request<SessionState>(`/api/interviews/${encodeURIComponent(id)}`),
  submit: (id: string, answer: string) =>
    request<SubmitResponse>(`/api/interviews/${encodeURIComponent(id)}/submit`, {
      method: "POST",
      body: JSON.stringify({ answer }),
    }),
  home: () => request<Home>("/api/plan"),
  savePlan: (body: { track: string; company_type: string; level: string; interview_date: string | null }) =>
    request<Home>("/api/plan", { method: "POST", body: JSON.stringify(body) }),
  sessions: () => request<{ sessions: SessionListItem[] }>("/api/sessions"),
  report: (id: string) => request<Report>(`/api/reports/${encodeURIComponent(id)}`),
  progress: () => request<Progress>("/api/dashboard/memory"),
};
