package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Scenario struct {
	ID               uuid.UUID       `json:"id"`
	Slug             string          `json:"slug"`
	Category         string          `json:"category"`
	Title            string          `json:"title"`
	Difficulty       string          `json:"difficulty"`
	IsFree           bool            `json:"is_free"`
	ProblemStatement string          `json:"problem_statement"`
	Constraints      json.RawMessage `json:"constraints"`
	GoldenRubric     json.RawMessage `json:"golden_rubric"`
	FailureModes     json.RawMessage `json:"failure_modes"`
	ReferenceMermaid string          `json:"reference_mermaid"`
	CreatedAt        time.Time       `json:"created_at"`
}

type ScenarioSummary struct {
	ID         uuid.UUID       `json:"id"`
	Slug       string          `json:"slug"`
	Category   string          `json:"category"`
	Title      string          `json:"title"`
	Difficulty string          `json:"difficulty"`
	IsFree     bool            `json:"is_free"`
	Constraints json.RawMessage `json:"constraints"`
}

type TranscriptEntry struct {
	Role          string   `json:"role"`
	Content       string   `json:"content"`
	Round         int      `json:"round"`
	DetectedGaps  []string `json:"detected_gaps,omitempty"`
	MermaidCode   string   `json:"mermaid_code,omitempty"`
	RoundScore    int      `json:"round_score,omitempty"`
}

type InterviewSession struct {
	ID              uuid.UUID         `json:"id"`
	UserID          uuid.UUID         `json:"user_id"`
	ScenarioID      uuid.UUID         `json:"scenario_id"`
	CurrentRound    int               `json:"current_round"`
	Status          string            `json:"status"`
	Transcript      []TranscriptEntry `json:"transcript"`
	FinalScore      *int              `json:"final_score,omitempty"`
	DimensionScores json.RawMessage   `json:"dimension_scores,omitempty"`
	AuditReport     *string           `json:"audit_report,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
	Scenario        *Scenario         `json:"scenario,omitempty"`
}

type UserQuota struct {
	UserID               uuid.UUID `json:"user_id"`
	PlanTier             string    `json:"plan_tier"`
	MonthlySessionsUsed  int       `json:"monthly_sessions_used"`
	MonthlySessionsLimit int       `json:"monthly_sessions_limit"`
	UpdatedAt            time.Time `json:"updated_at"`
}

type ConceptMastery struct {
	UserID       uuid.UUID `json:"user_id"`
	ConceptTag   string    `json:"concept_tag"`
	Category     string    `json:"category"`
	MasteryScore int       `json:"mastery_score"`
	FailCount    int       `json:"fail_count"`
	PassCount    int       `json:"pass_count"`
	LastTestedAt time.Time `json:"last_tested_at"`
}

type GapAnalysis struct {
	CoveredPoints      []string `json:"covered_points"`
	MissedCriticalGaps []string `json:"missed_critical_gaps"`
	WeakConceptTags    []string `json:"weak_concept_tags"`
	SelectedChaosAttack string  `json:"selected_chaos_attack"`
	MermaidDiagram     string   `json:"mermaid_diagram"`
	RoundScore         int      `json:"round_score"`
}

type DimensionScores struct {
	Scalability       int `json:"scalability"`
	Reliability       int `json:"reliability"`
	CostEfficiency    int `json:"cost_efficiency"`
	ProductionReady   int `json:"production_readiness"`
	AIGovernance      int `json:"ai_governance,omitempty"`
}

type SubmitRequest struct {
	Answer string `json:"answer"`
}

type StartInterviewRequest struct {
	ScenarioID string `json:"scenario_id"`
	Slug       string `json:"slug"`
}

type BillingWebhookRequest struct {
	UserID   string `json:"user_id"`
	PlanTier string `json:"plan_tier"`
	Secret   string `json:"secret"`
}

type ScenariosResponse struct {
	Scenarios      []ScenarioSummary `json:"scenarios"`
	PassProbability float64          `json:"pass_probability"`
	Quota          *UserQuota        `json:"quota,omitempty"`
}

type DashboardResponse struct {
	PassProbability   float64                    `json:"pass_probability"`
	Mastery           []ConceptMastery           `json:"mastery"`
	CategoryScores    map[string]float64         `json:"category_scores"`
	RecommendedDrills []VariantDrill             `json:"recommended_drills"`
	WeakestTags       []string                   `json:"weakest_tags"`
}

type VariantDrill struct {
	ConceptTag string `json:"concept_tag"`
	Prompt     string `json:"prompt"`
	Category   string `json:"category"`
}

type SubmitResponse struct {
	SessionID       uuid.UUID        `json:"session_id"`
	Round           int              `json:"round"`
	Status          string           `json:"status"`
	Interviewer     string           `json:"interviewer"`
	Analysis        GapAnalysis      `json:"analysis"`
	MermaidDiagram  string           `json:"mermaid_diagram"`
	PassProbability float64          `json:"pass_probability"`
	DimensionScores *DimensionScores `json:"dimension_scores,omitempty"`
	FinalScore      *int             `json:"final_score,omitempty"`
	VariantDrill    *VariantDrill    `json:"variant_drill,omitempty"`
	AuditReport     *string          `json:"audit_report,omitempty"`
}
