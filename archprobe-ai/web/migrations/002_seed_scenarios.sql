INSERT INTO scenarios (id, slug, category, title, difficulty, is_free, problem_statement, constraints, golden_rubric, failure_modes, reference_mermaid)
VALUES
(
  'sc_llm_gateway',
  'llm-gateway-sidecar',
  'ai_infra',
  'Multi-Tenant AI Agent Gateway (50k RPM)',
  'Staff (L6)',
  true,
  'Design a multi-tenant AI Agent Gateway handling 50k RPM with token-bucket rate limiting, automatic provider fallback (429/503), and an exact credit billing ledger. Defend quota correctness and noisy-neighbor isolation.',
  '{"rpm":"50,000","p99_latency":"<80ms gateway overhead","tenants":"2,000+","billing":"exact credit ledger"}'::jsonb,
  '{"mandatory":["Separate data-plane from control-plane","Token-bucket/GCRA with local batching + Redis sync","Per-tenant + global nested limits","Idempotent credit debit ledger keyed by request_id","Provider circuit breaker + weighted fallback","Tenant fair queuing"],"concepts":["token_bucket_race_condition","redis_hotkey","exact_credit_billing","provider_fallback_storm","tenant_fair_queuing"]}'::jsonb,
  '[{"id":"hotkey_saturation","attack":"Under 100k QPS, a single Redis key for the global token bucket saturates one shard NIC. How do you bound global over-admission when 50 sidecars spike?"},{"id":"double_debit","attack":"Provider returns 200 but client times out and retries. How does your ledger avoid double-charging?"},{"id":"fallback_cascade","attack":"Primary returns 503; all tenants stampede to secondary. Prevention?"}]'::jsonb,
  'graph TD
    Client --> GW[AI Gateway Sidecar]
    GW --> TB[Token Bucket Admission]
    TB --> CB[Circuit Breaker]
    CB --> P1[Provider A]
    CB --> P2[Provider B]
    GW --> Ledger[(Credit Ledger)]
    TB --> Redis[(Redis Quota)]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5'
),
(
  'sc_rate_limiter',
  'distributed-rate-limiter',
  'high_concurrency',
  'Global E-commerce Rate Limiter (500k QPS)',
  'Staff (L6)',
  true,
  'Design a global e-commerce abnormal-traffic & rate-limiting platform at 500k QPS with <2ms P99 overhead. Survive Redis hotkey skew and cluster network partitions.',
  '{"qps":"500,000","p99_overhead":"<2ms","consistency":"bounded over-admission","regions":"3 multi-AZ"}'::jsonb,
  '{"mandatory":["Local sliding window/token bucket with async reconciliation","Key sharding + salting","Atomic Lua/CAS where needed","Partition fail-open vs fail-closed policy","Shadow mode + canary rules"],"concepts":["redis_hotkey","token_bucket_race_condition","redis_lua_atomicity","partition_fail_open"]}'::jsonb,
  '[{"id":"hotkey_sku","attack":"A flash-sale SKU concentrates 40% of QPS on one rate-limit key. Redis shard CPU hits 100%. What changes?"},{"id":"partition_split","attack":"AZ-A cannot reach Redis primary for 12s. Fail-open? Quantify over-admission risk."}]'::jsonb,
  'graph TD
    Edge --> Local[Local Token Bucket]
    Local --> Decide{Admit?}
    Decide -->|yes| App
    Decide -->|no| Reject
    Local --> Sync[Async Reconciler]
    Sync --> Redis[(Sharded Redis)]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5'
),
(
  'sc_graph_rag',
  'financial-graph-rag',
  'ai_infra',
  'Zero-Hallucination Financial GraphRAG',
  'Staff (L6)',
  true,
  'Design a zero-hallucination Financial Statement & Equity Valuation RAG engine with deterministic arithmetic verification and citation grounding. Prevent fabricated numbers.',
  '{"hallucination":"0 fabricated numeric claims","citation":"page+span required","latency":"p95 < 4s"}'::jsonb,
  '{"mandatory":["Retrieve-then-verify with deterministic parsers","Citation objects with doc_id/page/span","Arithmetic sandbox for derived metrics","Graph index for issuer relationships","Abstain path when evidence insufficient"],"concepts":["citation_grounding","deterministic_arithmetic_verify","semantic_cache_invalidation","graph_rag_multihop"]}'::jsonb,
  '[{"id":"table_split","attack":"A 10-K income statement is split across two PDF pages. How do numbers stay correct?"},{"id":"fabricated_cite","attack":"Model cites page 42 but span text does not contain the number. Reject how?"}]'::jsonb,
  'graph TD
    Q[Query] --> Retriever
    Retriever --> Hybrid[BM25 + Vector + Graph]
    Hybrid --> Verify[Numeric Verifier]
    Verify --> Cite[Citation Guard]
    Cite --> LLM[Narration LLM]
    style Verify stroke:#ef4444,stroke-dasharray: 5 5'
),
(
  'sc_agent_engine',
  'agentic-workflow-engine',
  'ai_infra',
  'Stateful Agentic Workflow Engine',
  'Staff (L6)',
  false,
  'Design a long-running stateful AI agent execution engine with sandboxed tool execution, checkpointing, and human-in-the-loop pause/resume.',
  '{"runtime":"hours-long workflows","tools":"sandboxed","hitl":"pause/resume"}'::jsonb,
  '{"mandatory":["Durable workflow state machine","Idempotency keys on side-effecting tools","Sandbox with egress policy","HITL wait states","Replay-safe event log"],"concepts":["workflow_checkpointing","tool_idempotency","sandbox_egress_policy","hitl_wait_state"]}'::jsonb,
  '[{"id":"crash_mid_tool","attack":"Worker dies after tool succeeds but before checkpoint. Does the tool run twice on resume?"},{"id":"secret_exfil","attack":"Prompt injection asks the tool runner to curl an internal metadata IP. Egress policy?"}]'::jsonb,
  'graph TD
    API --> Orchestrator
    Orchestrator --> SM[State Machine]
    SM --> Workers
    Workers --> Sandbox[Tool Sandbox]
    SM --> HITL[Human Approval]
    style Sandbox stroke:#ef4444,stroke-dasharray: 5 5'
),
(
  'sc_flash_sale',
  'high-freq-inventory-flash-sale',
  'high_concurrency',
  'Flash Sale Inventory Pipeline (200k writes)',
  'Senior (L5)',
  false,
  'Design an ultra-low latency flash-sale & inventory deduction pipeline preventing overselling under 200k concurrent writes.',
  '{"concurrent_writes":"200,000","oversell":"0","p99_deduct":"<10ms"}'::jsonb,
  '{"mandatory":["Atomic deduct via Lua/conditional update","Reservation vs payment confirmation","TTL rollback","Hotspot isolation","Idempotent place-order"],"concepts":["redis_lua_atomicity","inventory_oversell","reservation_ttl","hotspot_sku_queue"]}'::jsonb,
  '[{"id":"oversell_race","attack":"Two regions both read stock=1 and both sell. Where is atomicity?"},{"id":"hot_sku","attack":"1 SKU absorbs 80% traffic. Redis key CPU-bound. Mitigation?"}]'::jsonb,
  'graph TD
    User --> Gateway
    Gateway --> OrderAPI
    OrderAPI --> Reserve[Atomic Reserve]
    Reserve --> Redis[(Sharded Stock)]
    OrderAPI --> Pay[Payment]
    style Redis stroke:#ef4444,stroke-dasharray: 5 5'
),
(
  'sc_social_intent',
  'realtime-social-intent-crawler',
  'ai_infra',
  'Cost-Controlled Social Intent Pipeline',
  'Senior (L5)',
  false,
  'Design a multi-platform stream ingestion & cost-controlled LLM intent filtering pipeline processing 10M posts/day with <60s lag for priority brands.',
  '{"volume":"10M posts/day","lag":"<60s priority","llm_budget":"hard daily cap"}'::jsonb,
  '{"mandatory":["Tiered cheap filters before LLM","Budget governors with degrade modes","Backpressure to ingest","Dedupe keys","Priority lanes"],"concepts":["sse_backpressure","llm_budget_governor","ingest_dedupe","priority_lane_fairness"]}'::jsonb,
  '[{"id":"viral_burst","attack":"Celebrity post triggers 50x ingest. LLM budget burns in 8 minutes. Degrade plan?"},{"id":"backpressure","attack":"LLM workers stall; Kafka lag hits 20 minutes. How do priority brands still see <60s?"}]'::jsonb,
  'graph TD
    Streams --> Ingest
    Ingest --> Heuristic[Cheap Filters]
    Heuristic --> Embed[Embedding Prefilter]
    Embed --> LLM[LLM Intent Workers]
    LLM --> Budget[Budget Governor]
    style Budget stroke:#ef4444,stroke-dasharray: 5 5'
)
ON CONFLICT (id) DO NOTHING;
