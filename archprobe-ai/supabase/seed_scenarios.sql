-- Flagship golden scenarios (3 free + 3 pro)
INSERT INTO scenarios (
  slug, category, title, difficulty, is_free,
  problem_statement, constraints, golden_rubric, failure_modes, reference_mermaid
) VALUES
(
  'llm-gateway-sidecar',
  'ai_infra',
  'Multi-Tenant AI Agent Gateway (50k RPM)',
  'Staff (L6)',
  true,
  $ps$Design a multi-tenant AI Agent Gateway that sits as a sidecar / edge service in front of multiple LLM providers.

Requirements:
1. Enforce per-tenant token-bucket rate limits at 50k RPM aggregate.
2. Automatic provider fallback on 429/503 with bounded retry storms.
3. Exact credit billing ledger (no soft-float drift) for prompt + completion tokens.
4. Tenant isolation so one noisy neighbor cannot starve others.
5. Observability: per-tenant latency, cost, and admission reject metrics.

You have 25 minutes. Start with the data plane + control plane split, then defend quota + billing correctness.$ps$,
  '{"rpm":"50,000","p99_latency":"<80ms gateway overhead","tenants":"2,000+","billing":"exact credit ledger","fallback":"429/503 automatic"}'::jsonb,
  $rubric${
    "mandatory": [
      "Separate data-plane (admission + proxy) from control-plane (quota config + billing)",
      "Token-bucket or GCRA with local batching + periodic Redis sync to avoid hotkeys",
      "Per-tenant + global nested limits",
      "Idempotent credit debit with ledger append-only events keyed by request_id",
      "Provider circuit breaker + weighted fallback with jittered retries",
      "Tenant isolation via separate buckets / fair queuing"
    ],
    "tradeoffs": [
      "Local memory batching vs exact global admission (bounded over-admission error)",
      "Sync debit vs async debit with reconciliation",
      "Sidecar vs centralized gateway for blast radius"
    ],
    "concepts": [
      "token_bucket_race_condition",
      "redis_hotkey",
      "exact_credit_billing",
      "provider_fallback_storm",
      "tenant_fair_queuing"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"hotkey_saturation","attack":"Under 100k QPS, a single Redis key for the global token bucket saturates one shard NIC. How do you bound global over-admission when 50 sidecars spike?"},
    {"id":"double_debit","attack":"Provider returns 200 but client times out and retries. How does your ledger avoid double-charging while still billing successful completions?"},
    {"id":"fallback_cascade","attack":"Primary provider returns 503; all tenants stampede to secondary. How do you prevent a secondary meltdown?"},
    {"id":"clock_skew_bucket","attack":"Sidecar clocks skew by 800ms. How does token refill stay correct?"},
    {"id":"cost_rounding","attack":"Fractional token prices cause floating-point drift over 10M requests/day. How do you keep ledger exact?"}
  ]$fm$::jsonb,
  $m$graph TD
    Client --> GW[AI Gateway Sidecar]
    GW --> TB[Token Bucket Admission]
    TB --> CB[Circuit Breaker]
    CB --> P1[Provider A]
    CB --> P2[Provider B]
    GW --> Ledger[(Append-only Credit Ledger)]
    TB --> Redis[(Redis Quota State)]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5$m$
),
(
  'distributed-rate-limiter',
  'high_concurrency',
  'Global E-commerce Rate Limiter (500k QPS)',
  'Staff (L6)',
  true,
  $ps$Design a global e-commerce abnormal-traffic & rate-limiting platform.

SLAs:
- 500k QPS admission decisions
- <2ms P99 overhead on the critical path
- Survive Redis hotkey skew and cluster network partitions
- Support per-user, per-SKU, per-IP, and composite rules

Defend how you keep false negatives (over-admission) and false positives (false blocks) within budget during partitions.$ps$,
  '{"qps":"500,000","p99_overhead":"<2ms","consistency":"bounded over-admission","regions":"3 multi-AZ"}'::jsonb,
  $rubric${
    "mandatory": [
      "Local sliding window / token bucket with async reconciliation",
      "Key sharding + salting to eliminate hotkeys",
      "Lua or atomic CAS for multi-dimension counters where needed",
      "Partition mode: fail-open with soft caps vs fail-closed for payment paths",
      "Shadow mode + canary rule rollout",
      "Exact-count vs approximate (Count-Min / HyperLogLog) trade-off documented"
    ],
    "tradeoffs": [
      "Central Redis vs edge local decisions",
      "Accuracy vs latency under partition",
      "Rule evaluation order and short-circuiting"
    ],
    "concepts": [
      "redis_hotkey",
      "token_bucket_race_condition",
      "redis_lua_atomicity",
      "partition_fail_open",
      "count_min_sketch"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"hotkey_sku","attack":"A flash-sale SKU concentrates 40% of QPS on one rate-limit key. Your Redis shard CPU hits 100%. What changes?"},
    {"id":"partition_split","attack":"AZ-A cannot reach Redis primary for 12s. Do you fail-open? Quantify oversell / over-admission risk."},
    {"id":"clock_jump","attack":"NTP steps a node backward 3 seconds. Sliding windows reopen. How do you detect and neutralize?"},
    {"id":"rule_explosion","attack":"10k composite rules evaluated per request blow P99 to 8ms. How do you keep <2ms?"},
    {"id":"replay_storm","attack":"A bot replays signed requests with slight UA changes. Which dimension still catches them without harming mobile NATs?"}
  ]$fm$::jsonb,
  $m$graph TD
    Edge --> Local[Local Token Bucket]
    Local --> Decide{Admit?}
    Decide -->|yes| App
    Decide -->|no| Reject
    Local --> Sync[Async Reconciler]
    Sync --> Redis[(Sharded Redis)]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5$m$
),
(
  'financial-graph-rag',
  'ai_infra',
  'Zero-Hallucination Financial GraphRAG',
  'Staff (L6)',
  true,
  $ps$Design a zero-hallucination Financial Statement & Equity Valuation RAG engine.

Must support:
- Deterministic arithmetic verification for ratios (ROE, margins, DCF intermediates)
- Citation grounding to filing page/span
- Multi-hop retrieval over entity graphs (issuer → subsidiary → segment)
- Refusal when evidence is insufficient

Explain how you prevent the LLM from inventing numbers that look plausible.$ps$,
  '{"hallucination":"0 fabricated numeric claims","citation":"page+span required","latency":"p95 < 4s","corpus":"10y 10-K/10-Q"}'::jsonb,
  $rubric${
    "mandatory": [
      "Retrieve-then-verify: numbers extracted by deterministic parsers, LLM only narrates",
      "Citation objects with doc_id, page, char span, checksum",
      "Arithmetic sandbox / calculator tool for all derived metrics",
      "Graph index for issuer relationships + segment rollups",
      "Abstain / insufficient-evidence path",
      "Eval harness with golden Q&A and numeric exact-match"
    ],
    "tradeoffs": [
      "Chunk size vs table integrity",
      "Vector-only vs hybrid BM25+vector+graph",
      "Online verification latency vs cached metric store"
    ],
    "concepts": [
      "citation_grounding",
      "deterministic_arithmetic_verify",
      "semantic_cache_invalidation",
      "graph_rag_multihop",
      "abstain_policy"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"table_split","attack":"A 10-K income statement is split across two PDF pages; your chunker severs the row. How do numbers stay correct?"},
    {"id":"unit_mismatch","attack":"Filing reports in millions; model answers in thousands. Where is the unit check?"},
    {"id":"stale_cache","attack":"Amended 10-K lands; semantic cache still serves old ROE. Invalidation strategy?"},
    {"id":"entity_collision","attack":"Two issuers share a ticker historically. How does graph disambiguation work?"},
    {"id":"fabricated_cite","attack":"Model cites page 42 but span text does not contain the number. How do you reject the answer?"}
  ]$fm$::jsonb,
  $m$graph TD
    Q[Query] --> Retriever
    Retriever --> Hybrid[BM25 + Vector + Graph]
    Hybrid --> Verify[Numeric Verifier]
    Verify --> Cite[Citation Guard]
    Cite --> LLM[Narration LLM]
    style Verify stroke:#ef4444,stroke-dasharray: 5 5$m$
),
(
  'agentic-workflow-engine',
  'ai_infra',
  'Stateful Agentic Workflow Engine',
  'Staff (L6)',
  false,
  $ps$Design a long-running stateful AI agent execution engine with:
- Sandboxed tool execution
- Checkpointing & exactly-once side effects where required
- Human-in-the-loop pause/resume
- Multi-tenant fairness and cost ceilings

Focus on failure recovery: agent crashes mid-tool-call, duplicate webhooks, and operator approvals that arrive late.$ps$,
  '{"runtime":"hours-long workflows","tools":"sandboxed","hitl":"pause/resume","side_effects":"idempotent"}'::jsonb,
  $rubric${
    "mandatory": [
      "Explicit workflow state machine with durable checkpoints",
      "Idempotency keys on all side-effecting tools",
      "Sandbox (gVisor/Firecracker/WASM) with network egress policy",
      "HITL wait states that do not hold worker threads",
      "Replay-safe event log",
      "Per-tenant concurrency + token budget governors"
    ],
    "tradeoffs": [
      "Step functions style orchestration vs embedded durable workflows",
      "Sync tool calls vs async job queue",
      "Checkpoint frequency vs storage cost"
    ],
    "concepts": [
      "workflow_checkpointing",
      "tool_idempotency",
      "sandbox_egress_policy",
      "hitl_wait_state",
      "sse_backpressure"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"crash_mid_tool","attack":"Worker dies after tool succeeds but before checkpoint. On resume, does the tool run twice?"},
    {"id":"late_approval","attack":"Human approves an action whose precondition expired. How do you revalidate?"},
    {"id":"runaway_loop","attack":"Agent plans an infinite tool loop. Where is the circuit breaker?"},
    {"id":"tenant_starve","attack":"One tenant schedules 10k workflows. How do others retain latency SLO?"},
    {"id":"secret_exfil","attack":"Prompt injection asks the tool runner to curl an internal metadata IP. Egress policy?"}
  ]$fm$::jsonb,
  $m$graph TD
    API --> Orchestrator
    Orchestrator --> SM[State Machine + Checkpoints]
    SM --> Workers
    Workers --> Sandbox[Tool Sandbox]
    SM --> HITL[Human Approval Queue]
    SM --> Events[(Event Log)]
    style Sandbox stroke:#ef4444,stroke-dasharray: 5 5$m$
),
(
  'high-freq-inventory-flash-sale',
  'high_concurrency',
  'Flash Sale Inventory Pipeline (200k writes)',
  'Senior (L5)',
  false,
  $ps$Design an ultra-low latency flash-sale & inventory deduction pipeline that prevents overselling under 200k concurrent writes.

Cover: pre-warm caches, sharding, atomic deduct, order creation, payment timeout rollback, and hotspot SKUs.$ps$,
  '{"concurrent_writes":"200,000","oversell":"0","p99_deduct":"<10ms","payment_timeout":"15m"}'::jsonb,
  $rubric${
    "mandatory": [
      "Shard inventory by SKU with atomic Lua/DECR or DB conditional update",
      "Separate stock reservation from payment confirmation",
      "TTL-based reservation rollback",
      "Hotspot isolation (queue / segmented stock)",
      "Idempotent place-order API",
      "Replay-safe reconciliation job"
    ],
    "tradeoffs": [
      "Redis stock vs DB as source of truth",
      "Synchronous payment vs async finalization",
      "Fairness vs raw throughput"
    ],
    "concepts": [
      "redis_lua_atomicity",
      "inventory_oversell",
      "reservation_ttl",
      "hotspot_sku_queue",
      "idempotent_order"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"oversell_race","attack":"Two regions both read stock=1 and both sell. Where is the single source of atomicity?"},
    {"id":"payment_timeout","attack":"User pays at T+14:59 but reservation expires at T+15:00. State machine?"},
    {"id":"hot_sku","attack":"1 SKU absorbs 80% traffic. Redis key CPU-bound. Mitigation?"},
    {"id":"refund_double","attack":"Refund webhook delivered twice restores +2 stock. Fix?"},
    {"id":"clock_ttl","attack":"Reservation TTL depends on Redis volatile-lru eviction under memory pressure. What breaks?"}
  ]$fm$::jsonb,
  $m$graph TD
    User --> Gateway
    Gateway --> OrderAPI
    OrderAPI --> Reserve[Atomic Reserve]
    Reserve --> Redis[(Sharded Stock)]
    OrderAPI --> Pay[Payment]
    Pay --> Confirm[Confirm Deduct]
    Reserve --> TTL[TTL Rollback]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5$m$
),
(
  'realtime-social-intent-crawler',
  'ai_infra',
  'Cost-Controlled Social Intent Pipeline',
  'Senior (L5)',
  false,
  $ps$Design a multi-platform stream ingestion & cost-controlled LLM intent filtering pipeline processing 10M posts/day.

Goals: classify intent, control LLM spend, handle bursty viral events, and keep end-to-end lag under 60s for priority brands.$ps$,
  '{"volume":"10M posts/day","lag":"<60s priority","llm_budget":"hard daily cap","platforms":"3+"}'::jsonb,
  $rubric${
    "mandatory": [
      "Tiered filtering: cheap heuristics/embeddings before LLM",
      "Token & $ budget governors with degrade modes",
      "Backpressure from LLM workers to ingest (SSE/queue)",
      "Exactly-once / at-least-once with dedupe keys",
      "Priority lanes for paying brands",
      "Prompt+model versioning and shadow eval"
    ],
    "tradeoffs": [
      "Recall vs LLM cost",
      "Batching for cost vs latency SLO",
      "Multi-tenant fair share vs priority"
    ],
    "concepts": [
      "sse_backpressure",
      "llm_budget_governor",
      "semantic_cache_invalidation",
      "ingest_dedupe",
      "priority_lane_fairness"
    ]
  }$rubric$::jsonb,
  $fm$[
    {"id":"viral_burst","attack":"A celebrity post triggers 50x ingest for 10 minutes. LLM budget would burn in 8 minutes. Degrade plan?"},
    {"id":"dup_cross_platform","attack":"Same text appears on X and Instagram with different IDs. Dedupe strategy?"},
    {"id":"backpressure","attack":"LLM workers stall; Kafka lag hits 20 minutes. How do priority brands still see <60s?"},
    {"id":"prompt_drift","attack":"New model version flips intent labels. How do you detect before full cutover?"},
    {"id":"cost_leak","attack":"A tenant sends empty-but-long posts that pass heuristics and burn tokens. Guardrail?"}
  ]$fm$::jsonb,
  $m$graph TD
    Streams --> Ingest
    Ingest --> Heuristic[Cheap Filters]
    Heuristic --> Embed[Embedding Prefilter]
    Embed --> LLM[LLM Intent Workers]
    LLM --> Budget[Budget Governor]
    Budget --> Out[Intent Store]
    style Budget stroke:#ef4444,stroke-dasharray: 5 5$m$
);
