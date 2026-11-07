package agent

import (
	"context"
	"fmt"
	"sort"
	"strings"

	"archprobe/backend/internal/model"
	"archprobe/backend/internal/store"

	"github.com/google/uuid"
)

// Category weights for pass-probability radar.
var categoryWeights = map[string]float64{
	"rate_limiting":   1.2,
	"llm_gateway":     1.2,
	"consistency":     1.1,
	"graph_rag":       1.0,
	"agent_runtime":   1.0,
	"high_concurrency": 1.1,
	"ai_infra":        1.0,
}

func TagCategory(tag string) string {
	switch {
	case strings.Contains(tag, "token_bucket"), strings.Contains(tag, "rate"), strings.Contains(tag, "hotkey"), strings.Contains(tag, "count_min"):
		return "rate_limiting"
	case strings.Contains(tag, "billing"), strings.Contains(tag, "provider"), strings.Contains(tag, "budget"), strings.Contains(tag, "fallback"):
		return "llm_gateway"
	case strings.Contains(tag, "lua"), strings.Contains(tag, "oversell"), strings.Contains(tag, "idempoten"), strings.Contains(tag, "partition"), strings.Contains(tag, "reservation"):
		return "consistency"
	case strings.Contains(tag, "citation"), strings.Contains(tag, "graph_rag"), strings.Contains(tag, "arithmetic"), strings.Contains(tag, "abstain"), strings.Contains(tag, "semantic_cache"):
		return "graph_rag"
	case strings.Contains(tag, "checkpoint"), strings.Contains(tag, "sandbox"), strings.Contains(tag, "hitl"), strings.Contains(tag, "workflow"), strings.Contains(tag, "sse_backpressure"):
		return "agent_runtime"
	default:
		return "high_concurrency"
	}
}

type MemoryEngine struct {
	store *store.Store
}

func NewMemoryEngine(st *store.Store) *MemoryEngine {
	return &MemoryEngine{store: st}
}

func (m *MemoryEngine) ApplyTurn(ctx context.Context, userID uuid.UUID, analysis model.GapAnalysis, scenarioCategory string) error {
	seen := map[string]struct{}{}
	for _, tag := range analysis.WeakConceptTags {
		tag = strings.TrimSpace(tag)
		if tag == "" {
			continue
		}
		seen[tag] = struct{}{}
		cat := TagCategory(tag)
		if cat == "high_concurrency" && scenarioCategory != "" {
			cat = scenarioCategory
		}
		if err := m.store.UpsertMastery(ctx, userID, tag, cat, -12, true); err != nil {
			return err
		}
	}
	for _, point := range analysis.CoveredPoints {
		tag := slugifyConcept(point)
		if tag == "" {
			continue
		}
		if _, ok := seen[tag]; ok {
			continue
		}
		cat := TagCategory(tag)
		if cat == "high_concurrency" && scenarioCategory != "" {
			cat = scenarioCategory
		}
		if err := m.store.UpsertMastery(ctx, userID, tag, cat, 8, false); err != nil {
			return err
		}
	}
	return nil
}

func slugifyConcept(point string) string {
	p := strings.ToLower(point)
	replacer := strings.NewReplacer(
		" ", "_",
		"/", "_",
		"-", "_",
		",", "",
		".", "",
		":", "",
		"'", "",
		"\"", "",
	)
	p = replacer.Replace(p)
	if len(p) > 64 {
		p = p[:64]
	}
	return p
}

func (m *MemoryEngine) PassProbability(ctx context.Context, userID uuid.UUID) (float64, error) {
	return m.store.PassProbability(ctx, userID)
}

func (m *MemoryEngine) Dashboard(ctx context.Context, userID uuid.UUID) (*model.DashboardResponse, error) {
	mastery, err := m.store.ListMastery(ctx, userID)
	if err != nil {
		return nil, err
	}
	pass, err := m.store.PassProbability(ctx, userID)
	if err != nil {
		return nil, err
	}

	catBuckets := map[string][]int{}
	for _, row := range mastery {
		catBuckets[row.Category] = append(catBuckets[row.Category], row.MasteryScore)
	}
	// Ensure radar has the four product dimensions even if empty.
	for _, c := range []string{"rate_limiting", "llm_gateway", "consistency", "graph_rag"} {
		if _, ok := catBuckets[c]; !ok {
			catBuckets[c] = []int{50}
		}
	}

	categoryScores := map[string]float64{}
	for cat, scores := range catBuckets {
		sum := 0
		for _, s := range scores {
			sum += s
		}
		avg := float64(sum) / float64(len(scores))
		if w, ok := categoryWeights[cat]; ok {
			avg = avg*0.85 + (avg*w)*0.15/w // mild emphasis, keep 0-100
		}
		categoryScores[cat] = avg
	}

	sort.Slice(mastery, func(i, j int) bool {
		return mastery[i].MasteryScore < mastery[j].MasteryScore
	})

	weakest := []string{}
	drills := []model.VariantDrill{}
	for i, row := range mastery {
		if i >= 5 {
			break
		}
		weakest = append(weakest, row.ConceptTag)
		drills = append(drills, model.VariantDrill{
			ConceptTag: row.ConceptTag,
			Category:   row.Category,
			Prompt:     variantPrompt(row.ConceptTag),
		})
	}
	if len(drills) == 0 {
		drills = []model.VariantDrill{{
			ConceptTag: "redis_hotkey",
			Category:   "rate_limiting",
			Prompt:     variantPrompt("redis_hotkey"),
		}}
		weakest = []string{"redis_hotkey"}
	}

	return &model.DashboardResponse{
		PassProbability:   pass,
		Mastery:           mastery,
		CategoryScores:    categoryScores,
		RecommendedDrills: drills,
		WeakestTags:       weakest,
	}, nil
}

func variantPrompt(tag string) string {
	return fmt.Sprintf(
		"Variant drill on [%s]: Redesign the component that previously failed this concept. State the consistency/latency bound numerically, name the failure mode you are hardening against, and sketch the Mermaid data path in ≤8 nodes.",
		tag,
	)
}
