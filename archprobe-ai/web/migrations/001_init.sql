CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    is_free BOOLEAN DEFAULT false,
    problem_statement TEXT NOT NULL,
    constraints JSONB NOT NULL,
    golden_rubric JSONB NOT NULL,
    failure_modes JSONB NOT NULL,
    reference_mermaid TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    scenario_id TEXT REFERENCES scenarios(id) ON DELETE CASCADE,
    current_round INT DEFAULT 1,
    status TEXT DEFAULT 'in_progress',
    transcript JSONB DEFAULT '[]'::jsonb,
    final_score INT,
    dimension_scores JSONB,
    audit_report TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_concept_mastery (
    user_id TEXT NOT NULL,
    concept_tag TEXT NOT NULL,
    category TEXT NOT NULL,
    mastery_score INT DEFAULT 50,
    fail_count INT DEFAULT 0,
    pass_count INT DEFAULT 0,
    last_tested_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, concept_tag)
);

CREATE TABLE IF NOT EXISTS user_quotas (
    user_id TEXT PRIMARY KEY,
    plan_tier TEXT DEFAULT 'free',
    monthly_sessions_used INT DEFAULT 0,
    monthly_sessions_limit INT DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
