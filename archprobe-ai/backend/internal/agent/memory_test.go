package agent

import "testing"

func TestTagCategory(t *testing.T) {
	cases := map[string]string{
		"token_bucket_race_condition": "rate_limiting",
		"exact_credit_billing":        "llm_gateway",
		"redis_lua_atomicity":         "consistency",
		"citation_grounding":          "graph_rag",
		"workflow_checkpointing":      "agent_runtime",
	}
	for tag, want := range cases {
		if got := TagCategory(tag); got != want {
			t.Fatalf("TagCategory(%q)=%q want %q", tag, got, want)
		}
	}
}

func TestHeuristicGapAnalysis(t *testing.T) {
	raw := HeuristicGapAnalysis(
		"We use a Redis token bucket with Lua atomicity and provider fallback plus an append-only billing ledger.",
		"graph TD; A-->B",
		1,
		`[{"id":"hotkey_saturation","attack":"hotkey"}]`,
	)
	covered, _ := raw["covered_points"].([]string)
	if len(covered) < 2 {
		t.Fatalf("expected covered points, got %#v", raw["covered_points"])
	}
	score, _ := raw["round_score"].(int)
	if score < 40 {
		t.Fatalf("unexpected low score %d", score)
	}
}
