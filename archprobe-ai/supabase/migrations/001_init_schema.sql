CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Golden Scenarios (Zero-hallucination Ground Truth repository)
CREATE TABLE scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(32) NOT NULL, -- 'high_concurrency' | 'ai_infra'
    title VARCHAR(200) NOT NULL,
    difficulty VARCHAR(20) NOT NULL, -- 'Senior (L5)' | 'Staff (L6)'
    is_free BOOLEAN DEFAULT false,
    problem_statement TEXT NOT NULL,
    constraints JSONB NOT NULL, -- e.g., {"qps": "100,000", "p99_latency": "<15ms", "consistency": "strict"}
    golden_rubric JSONB NOT NULL, -- Ground-truth architecture checklist & mandatory trade-offs
    failure_modes JSONB NOT NULL, -- Pre-defined chaos injection scenarios for Round 2 & 3 probing
    reference_mermaid TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Interview Sessions (Stateful 3-Round ReAct / Probing FSM)
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scenario_id UUID REFERENCES scenarios(id) ON DELETE CASCADE,
    current_round INT DEFAULT 1, -- Round 1: High-level, Round 2: Bottleneck/Chaos, Round 3: Cost/Edge-case, 4: Completed
    status VARCHAR(20) DEFAULT 'in_progress',
    transcript JSONB DEFAULT '[]'::jsonb, -- Array of {role, content, round, detected_gaps, mermaid_code}
    final_score INT,
    dimension_scores JSONB, -- {"scalability": 85, "reliability": 70, "cost_efficiency": 90, "ai_governance": 80}
    audit_report TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interview_sessions_user ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_scenario ON interview_sessions(scenario_id);

-- 3. DeepTutor L1/L2/L3 User Concept Memory & Mastery Graph
CREATE TABLE user_concept_mastery (
    user_id UUID NOT NULL,
    concept_tag VARCHAR(64) NOT NULL, -- e.g., 'token_bucket_race_condition', 'semantic_cache_invalidation', 'redis_hotkey'
    category VARCHAR(32) NOT NULL,
    mastery_score INT DEFAULT 50, -- 0-100动态调整
    fail_count INT DEFAULT 0,
    pass_count INT DEFAULT 0,
    last_tested_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, concept_tag)
);

-- 4. User Quotas & Subscriptions
CREATE TABLE user_quotas (
    user_id UUID PRIMARY KEY,
    plan_tier VARCHAR(20) DEFAULT 'free', -- 'free' (3 free scenarios), 'pro' ($29/mo), 'pass_guarantee' ($79/quarter)
    monthly_sessions_used INT DEFAULT 0,
    monthly_sessions_limit INT DEFAULT 3,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed demo free-tier quota for local trial user
INSERT INTO user_quotas (user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit)
VALUES ('00000000-0000-4000-8000-000000000001', 'free', 0, 3)
ON CONFLICT (user_id) DO NOTHING;
