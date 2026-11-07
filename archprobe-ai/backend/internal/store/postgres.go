package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"archprobe/backend/internal/model"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("not found")
var ErrQuotaExceeded = errors.New("quota exceeded")
var ErrProRequired = errors.New("pro plan required")

type Store struct {
	pool *pgxpool.Pool
}

func New(ctx context.Context, databaseURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() {
	s.pool.Close()
}

func (s *Store) EnsureQuota(ctx context.Context, userID uuid.UUID) (*model.UserQuota, error) {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_quotas (user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit)
		VALUES ($1, 'free', 0, 3)
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	if err != nil {
		return nil, err
	}
	return s.GetQuota(ctx, userID)
}

func (s *Store) GetQuota(ctx context.Context, userID uuid.UUID) (*model.UserQuota, error) {
	var q model.UserQuota
	err := s.pool.QueryRow(ctx, `
		SELECT user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit, updated_at
		FROM user_quotas WHERE user_id = $1
	`, userID).Scan(&q.UserID, &q.PlanTier, &q.MonthlySessionsUsed, &q.MonthlySessionsLimit, &q.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return s.EnsureQuota(ctx, userID)
	}
	if err != nil {
		return nil, err
	}
	return &q, nil
}

func (s *Store) UpgradePlan(ctx context.Context, userID uuid.UUID, planTier string) error {
	limit := 3
	switch planTier {
	case "pro":
		limit = 1000
	case "pass_guarantee":
		limit = 5000
	default:
		planTier = "free"
		limit = 3
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_quotas (user_id, plan_tier, monthly_sessions_used, monthly_sessions_limit, updated_at)
		VALUES ($1, $2, 0, $3, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			plan_tier = EXCLUDED.plan_tier,
			monthly_sessions_limit = EXCLUDED.monthly_sessions_limit,
			updated_at = NOW()
	`, userID, planTier, limit)
	return err
}

func (s *Store) ListScenarios(ctx context.Context) ([]model.ScenarioSummary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, slug, category, title, difficulty, is_free, constraints
		FROM scenarios ORDER BY is_free DESC, title ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.ScenarioSummary
	for rows.Next() {
		var sc model.ScenarioSummary
		if err := rows.Scan(&sc.ID, &sc.Slug, &sc.Category, &sc.Title, &sc.Difficulty, &sc.IsFree, &sc.Constraints); err != nil {
			return nil, err
		}
		out = append(out, sc)
	}
	return out, rows.Err()
}

func (s *Store) GetScenarioBySlug(ctx context.Context, slug string) (*model.Scenario, error) {
	return s.scanScenario(ctx, `SELECT id, slug, category, title, difficulty, is_free, problem_statement,
		constraints, golden_rubric, failure_modes, reference_mermaid, created_at
		FROM scenarios WHERE slug = $1`, slug)
}

func (s *Store) GetScenarioByID(ctx context.Context, id uuid.UUID) (*model.Scenario, error) {
	return s.scanScenario(ctx, `SELECT id, slug, category, title, difficulty, is_free, problem_statement,
		constraints, golden_rubric, failure_modes, reference_mermaid, created_at
		FROM scenarios WHERE id = $1`, id)
}

func (s *Store) scanScenario(ctx context.Context, query string, arg any) (*model.Scenario, error) {
	var sc model.Scenario
	err := s.pool.QueryRow(ctx, query, arg).Scan(
		&sc.ID, &sc.Slug, &sc.Category, &sc.Title, &sc.Difficulty, &sc.IsFree,
		&sc.ProblemStatement, &sc.Constraints, &sc.GoldenRubric, &sc.FailureModes,
		&sc.ReferenceMermaid, &sc.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &sc, nil
}

func (s *Store) StartInterview(ctx context.Context, userID, scenarioID uuid.UUID, isFree bool) (*model.InterviewSession, error) {
	quota, err := s.EnsureQuota(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !isFree && quota.PlanTier == "free" {
		return nil, ErrProRequired
	}
	if quota.MonthlySessionsUsed >= quota.MonthlySessionsLimit {
		return nil, ErrQuotaExceeded
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var sess model.InterviewSession
	var transcript []byte
	err = tx.QueryRow(ctx, `
		INSERT INTO interview_sessions (user_id, scenario_id, current_round, status, transcript)
		VALUES ($1, $2, 1, 'in_progress', '[]'::jsonb)
		RETURNING id, user_id, scenario_id, current_round, status, transcript, final_score, dimension_scores, audit_report, created_at, updated_at
	`, userID, scenarioID).Scan(
		&sess.ID, &sess.UserID, &sess.ScenarioID, &sess.CurrentRound, &sess.Status,
		&transcript, &sess.FinalScore, &sess.DimensionScores, &sess.AuditReport,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(transcript, &sess.Transcript); err != nil {
		sess.Transcript = []model.TranscriptEntry{}
	}

	_, err = tx.Exec(ctx, `
		UPDATE user_quotas SET monthly_sessions_used = monthly_sessions_used + 1, updated_at = NOW()
		WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	if sess.Transcript == nil {
		sess.Transcript = []model.TranscriptEntry{}
	}
	return &sess, nil
}

func (s *Store) GetSession(ctx context.Context, id uuid.UUID) (*model.InterviewSession, error) {
	var sess model.InterviewSession
	var transcript []byte
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, scenario_id, current_round, status, transcript, final_score,
			dimension_scores, audit_report, created_at, updated_at
		FROM interview_sessions WHERE id = $1
	`, id).Scan(
		&sess.ID, &sess.UserID, &sess.ScenarioID, &sess.CurrentRound, &sess.Status,
		&transcript, &sess.FinalScore, &sess.DimensionScores, &sess.AuditReport,
		&sess.CreatedAt, &sess.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(transcript, &sess.Transcript); err != nil {
		sess.Transcript = []model.TranscriptEntry{}
	}
	return &sess, nil
}

func (s *Store) UpdateSession(ctx context.Context, sess *model.InterviewSession) error {
	transcript, err := json.Marshal(sess.Transcript)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx, `
		UPDATE interview_sessions SET
			current_round = $2,
			status = $3,
			transcript = $4,
			final_score = $5,
			dimension_scores = $6,
			audit_report = $7,
			updated_at = NOW()
		WHERE id = $1
	`, sess.ID, sess.CurrentRound, sess.Status, transcript, sess.FinalScore, sess.DimensionScores, sess.AuditReport)
	return err
}

func (s *Store) UpsertMastery(ctx context.Context, userID uuid.UUID, tag, category string, delta int, failed bool) error {
	failInc := 0
	passInc := 0
	if failed {
		failInc = 1
	} else {
		passInc = 1
	}
	_, err := s.pool.Exec(ctx, `
		INSERT INTO user_concept_mastery (user_id, concept_tag, category, mastery_score, fail_count, pass_count, last_tested_at)
		VALUES ($1, $2, $3, GREATEST(0, LEAST(100, 50 + $4)), $5, $6, NOW())
		ON CONFLICT (user_id, concept_tag) DO UPDATE SET
			mastery_score = GREATEST(0, LEAST(100, user_concept_mastery.mastery_score + $4)),
			fail_count = user_concept_mastery.fail_count + $5,
			pass_count = user_concept_mastery.pass_count + $6,
			last_tested_at = NOW(),
			category = EXCLUDED.category
	`, userID, tag, category, delta, failInc, passInc)
	return err
}

func (s *Store) ListMastery(ctx context.Context, userID uuid.UUID) ([]model.ConceptMastery, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT user_id, concept_tag, category, mastery_score, fail_count, pass_count, last_tested_at
		FROM user_concept_mastery WHERE user_id = $1 ORDER BY mastery_score ASC, fail_count DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []model.ConceptMastery
	for rows.Next() {
		var m model.ConceptMastery
		if err := rows.Scan(&m.UserID, &m.ConceptTag, &m.Category, &m.MasteryScore, &m.FailCount, &m.PassCount, &m.LastTestedAt); err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (s *Store) PassProbability(ctx context.Context, userID uuid.UUID) (float64, error) {
	rows, err := s.ListMastery(ctx, userID)
	if err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 42.0, nil // baseline before any interviews
	}
	sum := 0
	for _, r := range rows {
		sum += r.MasteryScore
	}
	avg := float64(sum) / float64(len(rows))
	// Weight recent failures slightly downward
	failPenalty := 0.0
	for _, r := range rows {
		if r.FailCount > r.PassCount {
			failPenalty += 1.5
		}
	}
	p := avg - failPenalty
	if p < 5 {
		p = 5
	}
	if p > 98 {
		p = 98
	}
	return p, nil
}

func (s *Store) Ping(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	return s.pool.Ping(ctx)
}

func (s *Store) Health(ctx context.Context) error {
	if err := s.Ping(ctx); err != nil {
		return fmt.Errorf("postgres: %w", err)
	}
	return nil
}
