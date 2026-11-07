package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"archprobe/backend/internal/config"
	"archprobe/backend/internal/model"
	"archprobe/backend/internal/store"

	"github.com/google/uuid"
	openai "github.com/sashabaranov/go-openai"
)

type Orchestrator struct {
	cfg    config.Config
	store  *store.Store
	memory *MemoryEngine
	client *openai.Client
}

func NewOrchestrator(cfg config.Config, st *store.Store, mem *MemoryEngine) *Orchestrator {
	oaiCfg := openai.DefaultConfig(cfg.LLMAPIKey)
	oaiCfg.BaseURL = strings.TrimRight(cfg.LLMBaseURL, "/")
	return &Orchestrator{
		cfg:    cfg,
		store:  st,
		memory: mem,
		client: openai.NewClientWithConfig(oaiCfg),
	}
}

func (o *Orchestrator) ProcessTurn(ctx context.Context, sess *model.InterviewSession, scenario *model.Scenario, answer string) (*model.SubmitResponse, error) {
	analysis, err := o.stepA(ctx, scenario, sess.CurrentRound, answer)
	if err != nil {
		return nil, err
	}

	probe, err := o.stepB(ctx, sess.CurrentRound, analysis, answer)
	if err != nil {
		return nil, err
	}

	if err := o.memory.ApplyTurn(ctx, sess.UserID, *analysis, scenario.Category); err != nil {
		return nil, err
	}

	sess.Transcript = append(sess.Transcript,
		model.TranscriptEntry{Role: "user", Content: answer, Round: sess.CurrentRound},
		model.TranscriptEntry{
			Role:         "interviewer",
			Content:      probe,
			Round:        sess.CurrentRound,
			DetectedGaps: analysis.MissedCriticalGaps,
			MermaidCode:  analysis.MermaidDiagram,
			RoundScore:   analysis.RoundScore,
		},
	)

	resp := &model.SubmitResponse{
		SessionID:      sess.ID,
		Round:          sess.CurrentRound,
		Status:         sess.Status,
		Interviewer:    probe,
		Analysis:       *analysis,
		MermaidDiagram: analysis.MermaidDiagram,
	}

	if sess.CurrentRound >= 3 {
		final, err := o.finalEval(ctx, scenario, sess, analysis)
		if err != nil {
			return nil, err
		}
		sess.Status = "completed"
		sess.CurrentRound = 4
		sess.FinalScore = &final.FinalScore
		dimJSON, _ := json.Marshal(final.Dimensions)
		sess.DimensionScores = dimJSON
		sess.AuditReport = &final.AuditReport
		resp.Status = "completed"
		resp.Round = 3
		resp.DimensionScores = &final.Dimensions
		resp.FinalScore = &final.FinalScore
		resp.AuditReport = &final.AuditReport
		resp.VariantDrill = &model.VariantDrill{
			ConceptTag: final.TopWeakTag,
			Category:   TagCategory(final.TopWeakTag),
			Prompt:     final.VariantPrompt,
		}
	} else {
		sess.CurrentRound++
		resp.Round = sess.CurrentRound - 1
		resp.Status = "in_progress"
	}

	if err := o.store.UpdateSession(ctx, sess); err != nil {
		return nil, err
	}

	pass, err := o.memory.PassProbability(ctx, sess.UserID)
	if err != nil {
		return nil, err
	}
	resp.PassProbability = pass
	resp.SessionID = sess.ID
	return resp, nil
}

func (o *Orchestrator) stepA(ctx context.Context, scenario *model.Scenario, round int, answer string) (*model.GapAnalysis, error) {
	if o.cfg.LLMAPIKey == "" || strings.Contains(o.cfg.LLMAPIKey, "your-deepseek") {
		return o.heuristicAnalysis(scenario, round, answer), nil
	}

	prompt := BuildGapAnalysisPrompt(string(scenario.GoldenRubric), string(scenario.FailureModes), round, answer)
	req := openai.ChatCompletionRequest{
		Model:       o.cfg.LLMModelEvaluator,
		Temperature: 0,
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You are a Principal Distributed Systems Auditor. Always respond with json."},
			{Role: openai.ChatMessageRoleUser, Content: prompt},
		},
	}
	res, err := o.client.CreateChatCompletion(ctx, req)
	if err != nil {
		// Fall back so local demos still work if the key is invalid.
		return o.heuristicAnalysis(scenario, round, answer), nil
	}
	if len(res.Choices) == 0 {
		return o.heuristicAnalysis(scenario, round, answer), nil
	}
	var analysis model.GapAnalysis
	if err := json.Unmarshal([]byte(res.Choices[0].Message.Content), &analysis); err != nil {
		return o.heuristicAnalysis(scenario, round, answer), nil
	}
	if analysis.MermaidDiagram == "" {
		analysis.MermaidDiagram = scenario.ReferenceMermaid
	}
	return &analysis, nil
}

func (o *Orchestrator) heuristicAnalysis(scenario *model.Scenario, round int, answer string) *model.GapAnalysis {
	raw := HeuristicGapAnalysis(answer, scenario.ReferenceMermaid, round, string(scenario.FailureModes))
	b, _ := json.Marshal(raw)
	var analysis model.GapAnalysis
	_ = json.Unmarshal(b, &analysis)
	return &analysis
}

func (o *Orchestrator) stepB(ctx context.Context, round int, analysis *model.GapAnalysis, answer string) (string, error) {
	if o.cfg.LLMAPIKey == "" || strings.Contains(o.cfg.LLMAPIKey, "your-deepseek") {
		return o.heuristicProbe(round, analysis), nil
	}

	analysisJSON, _ := json.Marshal(analysis)
	req := openai.ChatCompletionRequest{
		Model:       o.cfg.LLMModelProber,
		Temperature: 0.4,
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: BuildProbeSystemPrompt()},
			{Role: openai.ChatMessageRoleUser, Content: BuildProbeUserPrompt(round, string(analysisJSON), answer, analysis.SelectedChaosAttack)},
		},
	}
	res, err := o.client.CreateChatCompletion(ctx, req)
	if err != nil || len(res.Choices) == 0 {
		return o.heuristicProbe(round, analysis), nil
	}
	return strings.TrimSpace(res.Choices[0].Message.Content), nil
}

func (o *Orchestrator) heuristicProbe(round int, analysis *model.GapAnalysis) string {
	ack := "Your sketch names some of the right boxes, but the critical path is still underspecified."
	if len(analysis.CoveredPoints) > 0 {
		ack = fmt.Sprintf("Acknowledged: %s.", analysis.CoveredPoints[0])
	}
	gap := "the hottest shared coordination point"
	if len(analysis.MissedCriticalGaps) > 0 {
		gap = analysis.MissedCriticalGaps[0]
	}
	return fmt.Sprintf("%s Round %d probe — %s Blind spot I'm exploiting: %s. Give the concrete mechanism and the numerical bound.",
		ack, round, analysis.SelectedChaosAttack, gap)
}

type finalEvalResult struct {
	Dimensions    model.DimensionScores
	FinalScore    int
	AuditReport   string
	VariantPrompt string
	TopWeakTag    string
}

func (o *Orchestrator) finalEval(ctx context.Context, scenario *model.Scenario, sess *model.InterviewSession, analysis *model.GapAnalysis) (*finalEvalResult, error) {
	fallback := o.heuristicFinal(analysis)
	if o.cfg.LLMAPIKey == "" || strings.Contains(o.cfg.LLMAPIKey, "your-deepseek") {
		return fallback, nil
	}

	transcript, _ := json.Marshal(sess.Transcript)
	analysisJSON, _ := json.Marshal(analysis)
	req := openai.ChatCompletionRequest{
		Model:       o.cfg.LLMModelEvaluator,
		Temperature: 0,
		ResponseFormat: &openai.ChatCompletionResponseFormat{
			Type: openai.ChatCompletionResponseFormatTypeJSONObject,
		},
		Messages: []openai.ChatCompletionMessage{
			{Role: openai.ChatMessageRoleSystem, Content: "You finalize Staff interview scorecards. Respond with json only."},
			{Role: openai.ChatMessageRoleUser, Content: BuildFinalEvalPrompt(string(scenario.GoldenRubric), string(transcript), string(analysisJSON))},
		},
	}
	res, err := o.client.CreateChatCompletion(ctx, req)
	if err != nil || len(res.Choices) == 0 {
		return fallback, nil
	}

	var raw struct {
		Scalability         int    `json:"scalability"`
		Reliability         int    `json:"reliability"`
		CostEfficiency      int    `json:"cost_efficiency"`
		ProductionReadiness int    `json:"production_readiness"`
		AIGovernance        int    `json:"ai_governance"`
		FinalScore          int    `json:"final_score"`
		AuditReport         string `json:"audit_report"`
		VariantDrillPrompt  string `json:"variant_drill_prompt"`
		TopWeakTag          string `json:"top_weak_tag"`
	}
	if err := json.Unmarshal([]byte(res.Choices[0].Message.Content), &raw); err != nil {
		return fallback, nil
	}
	tag := raw.TopWeakTag
	if tag == "" && len(analysis.WeakConceptTags) > 0 {
		tag = analysis.WeakConceptTags[0]
	}
	prompt := raw.VariantDrillPrompt
	if prompt == "" {
		prompt = variantPrompt(tag)
	}
	return &finalEvalResult{
		Dimensions: model.DimensionScores{
			Scalability:     raw.Scalability,
			Reliability:     raw.Reliability,
			CostEfficiency:  raw.CostEfficiency,
			ProductionReady: raw.ProductionReadiness,
			AIGovernance:    raw.AIGovernance,
		},
		FinalScore:    raw.FinalScore,
		AuditReport:   raw.AuditReport,
		VariantPrompt: prompt,
		TopWeakTag:    tag,
	}, nil
}

func (o *Orchestrator) heuristicFinal(analysis *model.GapAnalysis) *finalEvalResult {
	base := analysis.RoundScore
	tag := "underspecified_architecture"
	if len(analysis.WeakConceptTags) > 0 {
		tag = analysis.WeakConceptTags[0]
	}
	dims := model.DimensionScores{
		Scalability:     clamp(base-5, 20, 95),
		Reliability:     clamp(base-8, 20, 95),
		CostEfficiency:  clamp(base-10, 20, 95),
		ProductionReady: clamp(base-12, 20, 95),
		AIGovernance:    clamp(base-6, 20, 95),
	}
	final := (dims.Scalability + dims.Reliability + dims.CostEfficiency + dims.ProductionReady) / 4
	report := fmt.Sprintf(
		"Debrief: strongest signal was partial coverage of core boxes; weakest was %s. You would not clear a Staff bar until the chaos bound and failure mode for that gap are explicit.",
		tag,
	)
	return &finalEvalResult{
		Dimensions:    dims,
		FinalScore:    final,
		AuditReport:   report,
		VariantPrompt: variantPrompt(tag),
		TopWeakTag:    tag,
	}
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

// StreamProbe writes an SSE-friendly probe. Currently ProcessTurn is used for
// the JSON API; this helper supports the streaming endpoint.
func (o *Orchestrator) StreamProbe(ctx context.Context, w io.Writer, sessID uuid.UUID, text string) error {
	_, err := fmt.Fprintf(w, "event: probe\ndata: %s\n\n", jsonEscape(text))
	return err
}

func jsonEscape(s string) string {
	b, _ := json.Marshal(s)
	return string(b)
}
