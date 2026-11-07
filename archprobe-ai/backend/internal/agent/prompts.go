package agent

import (
	"fmt"
	"strings"
)

func BuildGapAnalysisPrompt(goldenRubric, failureModes string, round int, userInput string) string {
	return fmt.Sprintf(`You are a Principal Distributed Systems Auditor. Compare the candidate's architecture proposal against the Golden Rubric and Failure Modes below.
You must output valid json only. The word json appears here intentionally so the response is machine-parseable.

[GOLDEN RUBRIC]: %s
[FAILURE MODES]: %s
[CURRENT ROUND]: %d (1=Architecture & Data Flow, 2=Chaos/Failure Injection, 3=Cost/Consistency Edge Cases)
[CANDIDATE ANSWER]: %s

Output strict JSON with this schema:
{
  "covered_points": ["list of rubric items satisfied"],
  "missed_critical_gaps": ["specific architectural blind spots or race conditions"],
  "weak_concept_tags": ["e.g., redis_lua_atomicity", "sse_backpressure"],
  "selected_chaos_attack": "Pick the sharpest failure mode from [FAILURE MODES] that exploits the candidate's missed_critical_gaps",
  "mermaid_diagram": "Updated Mermaid.js graph TD representing the candidate's current architecture with red dashed nodes on bottleneck components",
  "round_score": 78
}`, goldenRubric, failureModes, round, userInput)
}

func BuildProbeSystemPrompt() string {
	return `You are a battle-tested Staff Engineer conducting an adversarial system design interview.
Tone: Direct. No fluff. No "Great job!" cheerleading. No corporate softness.
Structure every reply as:
1) One sentence acknowledging what actually works in the candidate's design.
2) Immediately launch the selected chaos attack / probe as a concrete, quantitative question.
3) Demand a specific mechanism (data structure, consistency protocol, failure bound), not vibes.

Keep replies under 180 words. Prefer sharp questions over lectures.`
}

func BuildProbeUserPrompt(round int, analysisJSON, userAnswer, chaosAttack string) string {
	return fmt.Sprintf(`Round %d of 3.

Gap analysis JSON:
%s

Candidate's latest answer:
%s

Selected chaos attack to launch:
%s

Write the interviewer probe now.`, round, analysisJSON, userAnswer, chaosAttack)
}

func BuildFinalEvalPrompt(goldenRubric, transcript, analysisJSON string) string {
	return fmt.Sprintf(`You are finishing a Staff-level system design interview. Output valid json only.

[GOLDEN RUBRIC]: %s
[FULL TRANSCRIPT]: %s
[LATEST GAP ANALYSIS]: %s

Produce JSON:
{
  "scalability": 0-100,
  "reliability": 0-100,
  "cost_efficiency": 0-100,
  "production_readiness": 0-100,
  "ai_governance": 0-100,
  "final_score": 0-100,
  "audit_report": "2-4 sentence hard-nosed debrief",
  "variant_drill_prompt": "One sibling drill question targeting their #1 weak concept",
  "top_weak_tag": "concept_tag"
}`, goldenRubric, transcript, analysisJSON)
}

func HeuristicGapAnalysis(userInput, referenceMermaid string, round int, failureModesJSON string) map[string]any {
	lower := strings.ToLower(userInput)
	covered := []string{}
	missed := []string{}
	weak := []string{}

	checks := []struct {
		keys    []string
		point   string
		tag     string
	}{
		{[]string{"token bucket", "rate limit", "leaky bucket", "gcra"}, "Mentions rate limiting / token bucket", "token_bucket_race_condition"},
		{[]string{"redis", "cache"}, "Mentions Redis/cache tier", "redis_hotkey"},
		{[]string{"lua", "atomic", "cas", "compare-and-swap"}, "Mentions atomicity primitive", "redis_lua_atomicity"},
		{[]string{"fallback", "circuit", "retry"}, "Mentions fallback/circuit breaking", "provider_fallback_storm"},
		{[]string{"ledger", "billing", "idempoten"}, "Mentions billing/idempotency", "exact_credit_billing"},
		{[]string{"shard", "partition", "hotkey", "hot key"}, "Mentions sharding/hotkey handling", "redis_hotkey"},
		{[]string{"checkpoint", "saga", "state machine"}, "Mentions durable workflow state", "workflow_checkpointing"},
		{[]string{"citation", "ground", "verify", "calculator"}, "Mentions grounding/verification", "citation_grounding"},
		{[]string{"backpressure", "queue", "kafka"}, "Mentions backpressure/queues", "sse_backpressure"},
		{[]string{"budget", "cost", "token"}, "Mentions cost/budget control", "llm_budget_governor"},
	}

	for _, c := range checks {
		hit := false
		for _, k := range c.keys {
			if strings.Contains(lower, k) {
				hit = true
				break
			}
		}
		if hit {
			covered = append(covered, c.point)
		} else {
			missed = append(missed, "Missing: "+c.point)
			weak = append(weak, c.tag)
		}
	}

	if len(weak) > 4 {
		weak = weak[:4]
	}
	if len(missed) > 5 {
		missed = missed[:5]
	}
	if len(covered) == 0 {
		missed = append([]string{"No concrete mechanisms named — design is too hand-wavy"}, missed...)
		weak = append([]string{"underspecified_architecture"}, weak...)
	}

	score := 40 + len(covered)*8 - len(missed)*3
	if score < 20 {
		score = 20
	}
	if score > 92 {
		score = 92
	}
	score += (3 - round) * 2

	chaos := "Under peak load, your shared coordination point becomes a hotspot. Quantify the over-admission or inconsistency bound and name the concrete mitigation."
	if strings.Contains(failureModesJSON, "hotkey") {
		chaos = "Under 100k QPS, your single Redis key for shared limit state saturates one shard NIC. If you switch to local memory batching, how do you bound global over-admission when many nodes spike simultaneously?"
	} else if strings.Contains(failureModesJSON, "hallucination") || strings.Contains(failureModesJSON, "citation") {
		chaos = "The model cites a page whose span does not contain the claimed number. Where in the pipeline do you reject the answer before it reaches the user?"
	} else if strings.Contains(failureModesJSON, "oversell") {
		chaos = "Two regions both read stock=1 and both attempt to sell. Where is the single atomic source of truth, and what is your oversell bound if that store partitions?"
	}

	mermaid := referenceMermaid
	if mermaid == "" {
		mermaid = "graph TD\n  Candidate --> Bottleneck\n  style Bottleneck stroke:#ef4444,stroke-dasharray: 5 5"
	}

	return map[string]any{
		"covered_points":       covered,
		"missed_critical_gaps": missed,
		"weak_concept_tags":    weak,
		"selected_chaos_attack": chaos,
		"mermaid_diagram":      mermaid,
		"round_score":          score,
	}
}
