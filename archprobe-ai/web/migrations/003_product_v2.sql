ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS tracks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS focus_areas JSONB DEFAULT '[]'::jsonb;
ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS est_minutes INT DEFAULT 40;

ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS round_scores JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS verdict TEXT;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS variant_drill JSONB;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DELETE FROM user_concept_mastery WHERE concept_tag LIKE 'mentions%';

ALTER TABLE user_quotas ADD COLUMN IF NOT EXISTS period TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS user_plans (
    user_id TEXT PRIMARY KEY,
    track TEXT NOT NULL,
    company_type TEXT NOT NULL,
    level TEXT NOT NULL,
    interview_date DATE,
    scenario_order JSONB NOT NULL DEFAULT '[]'::jsonb,
    focus_weights JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON interview_sessions (user_id, created_at);

UPDATE user_quotas SET monthly_sessions_limit = 5 WHERE plan_tier = 'free' AND monthly_sessions_limit < 5;

UPDATE scenarios SET
  summary = 'Per-tenant token buckets, provider fallback on 429/503, and an exact credit ledger at 50k RPM.',
  tracks = '["ai-infra-engineer","backend-staff"]'::jsonb,
  focus_areas = '["llm_gateway","rate_limiting","consistency"]'::jsonb,
  est_minutes = 40
WHERE slug = 'llm-gateway-sidecar';

UPDATE scenarios SET
  summary = '500k QPS admission control with sub-2ms overhead, hotkey skew, and partition behavior.',
  tracks = '["backend-staff","backend-senior"]'::jsonb,
  focus_areas = '["rate_limiting","high_concurrency","consistency"]'::jsonb,
  est_minutes = 40
WHERE slug = 'distributed-rate-limiter';

UPDATE scenarios SET
  summary = 'Retrieval with citation grounding and deterministic arithmetic checks so numbers are never invented.',
  tracks = '["ai-infra-engineer","ml-platform"]'::jsonb,
  focus_areas = '["graph_rag","llm_gateway"]'::jsonb,
  est_minutes = 40
WHERE slug = 'financial-graph-rag';

UPDATE scenarios SET
  summary = 'Durable agent workflows with sandboxed tools, checkpoints, and human approval gates.',
  tracks = '["ai-infra-engineer"]'::jsonb,
  focus_areas = '["agent_runtime","consistency"]'::jsonb,
  est_minutes = 45
WHERE slug = 'agentic-workflow-engine';

UPDATE scenarios SET
  summary = 'Zero-oversell inventory deduction under 200k concurrent writes with reservation rollback.',
  tracks = '["backend-staff","backend-senior"]'::jsonb,
  focus_areas = '["consistency","high_concurrency"]'::jsonb,
  est_minutes = 40
WHERE slug = 'high-freq-inventory-flash-sale';

UPDATE scenarios SET
  summary = 'Stream ingestion of 10M posts/day with tiered filtering and hard LLM budget governors.',
  tracks = '["ai-infra-engineer","ml-platform"]'::jsonb,
  focus_areas = '["llm_gateway","high_concurrency","agent_runtime"]'::jsonb,
  est_minutes = 40
WHERE slug = 'realtime-social-intent-crawler';

INSERT INTO scenarios (id, slug, category, title, difficulty, is_free, problem_statement, constraints, golden_rubric, failure_modes, reference_mermaid, summary, tracks, focus_areas, est_minutes)
VALUES
(
  'sc_llm_inference',
  'llm-inference-serving',
  'ai_infra',
  'Multi-Model LLM Inference Serving Platform',
  'Staff (L6)',
  true,
  'Design an inference platform serving several open-weight LLMs to 5,000 concurrent streaming sessions. Support continuous batching, KV-cache management for contexts up to 128k tokens, per-tenant latency SLOs, and safe rollout of new model versions. Explain how you keep time-to-first-token low while maximizing GPU utilization.',
  '{"concurrent_streams":"5,000","ttft_p95":"<800ms","context":"up to 128k","gpu_util":">70%"}'::jsonb,
  '{"mandatory":["Continuous batching scheduler with token-level preemption","Paged KV-cache with admission control by memory budget","Separate prefill and decode capacity or chunked prefill","Per-tenant queues with SLO-aware scheduling","Model registry with canary and shadow traffic","Stream resumption or graceful failover on node loss"],"tradeoffs":["Throughput vs time-to-first-token","Long-context isolation vs utilization","Replica count vs cold-start latency"],"concepts":["kv_cache_admission","continuous_batching","prefill_decode_split","tenant_fair_queuing","model_canary_rollout"]}'::jsonb,
  '[{"id":"kv_oom","attack":"A burst of 100k-token prompts arrives and the KV cache hits its memory ceiling. Which requests do you preempt, and how do you avoid thrashing?"},{"id":"hol_blocking","attack":"One tenant sends 128k-token prefills that stall decode for everyone on the node. How do you protect short-prompt TTFT?"},{"id":"node_loss","attack":"A GPU node dies with 300 active streams. What does the client see and how fast do you recover?"},{"id":"bad_canary","attack":"The new model version raises refusal rate by 4 percent but latency looks fine. How does rollout catch it?"}]'::jsonb,
  'graph TD
    Client --> Router[SLO Router]
    Router --> Q[Per-tenant Queues]
    Q --> Sched[Continuous Batching Scheduler]
    Sched --> Prefill[Prefill Pool]
    Sched --> Decode[Decode Pool]
    Decode --> KV[(Paged KV Cache)]
    Router --> Registry[Model Registry]
    style KV stroke:#ef4444,stroke-dasharray: 5 5',
  'Continuous batching, paged KV cache, and SLO-aware scheduling for 5k concurrent streams.',
  '["ai-infra-engineer","ml-platform"]'::jsonb,
  '["llm_gateway","high_concurrency","agent_runtime"]'::jsonb,
  45
),
(
  'sc_vector_search',
  'vector-search-rag-retrieval',
  'ai_infra',
  'Billion-Scale Vector Retrieval for RAG',
  'Senior (L5)',
  true,
  'Design a multi-tenant retrieval service over 1 billion embeddings for RAG. Queries need p99 under 50ms with metadata and ACL filtering, new documents must be searchable within one minute, and you must migrate safely when the embedding model changes.',
  '{"vectors":"1B","p99":"<50ms","freshness":"<60s","tenancy":"ACL filtered"}'::jsonb,
  '{"mandatory":["ANN index choice with sharding strategy (HNSW/IVF-PQ) and memory math","Filtered search strategy that preserves recall","Write path: streaming upserts into a fresh segment plus background merge","ACL enforcement inside retrieval, not after","Dual-index migration for embedding model changes","Hybrid lexical plus vector reranking"],"tradeoffs":["Recall vs latency vs memory","Pre-filter vs post-filter","Per-tenant index vs shared index"],"concepts":["ann_index_sharding","filtered_search_recall","index_freshness","acl_enforcement","embedding_migration"]}'::jsonb,
  '[{"id":"filter_recall","attack":"A tenant filter matches 0.1 percent of vectors and recall drops to 30 percent. What changes in the query plan?"},{"id":"acl_leak","attack":"Post-filtering returns a chunk the user cannot see in the top-k debug logs. Where does the ACL check really belong?"},{"id":"model_swap","attack":"You must move from a 768-dim to a 1024-dim embedding model without downtime. Walk the migration."},{"id":"hot_tenant","attack":"One tenant is 40 percent of QPS and lives on two shards. What happens to everyone else?"}]'::jsonb,
  'graph TD
    Query --> Embed[Query Embedder]
    Embed --> Planner[Filter-aware Planner]
    Planner --> S1[(Shard 1)]
    Planner --> S2[(Shard 2)]
    Ingest --> Fresh[Fresh Segment]
    Fresh --> S1
    Planner --> Rerank[Hybrid Rerank]
    style Planner stroke:#ef4444,stroke-dasharray: 5 5',
  'p99 under 50ms over 1B embeddings with ACL filters, one-minute freshness, and model migration.',
  '["ai-infra-engineer","ml-platform","backend-senior"]'::jsonb,
  '["graph_rag","high_concurrency"]'::jsonb,
  40
),
(
  'sc_chat_presence',
  'realtime-chat-presence',
  'high_concurrency',
  'Real-Time Chat & Presence at 10M Connections',
  'Senior (L5)',
  true,
  'Design the messaging backend for a chat product with 10 million concurrent WebSocket connections. Support 1:1 and group chats up to 50k members, per-conversation ordering, read receipts, presence, and offline delivery.',
  '{"connections":"10M","group_size":"up to 50k","delivery_p99":"<300ms","ordering":"per conversation"}'::jsonb,
  '{"mandatory":["Stateless connection gateways with a session registry","Per-conversation sequence numbers from a partitioned log","Fanout strategy split for small vs very large groups","Presence via heartbeats with coalescing and TTL","Offline inbox plus push notification path","Reconnect with resume-from-sequence"],"tradeoffs":["Fanout on write vs fanout on read","Presence accuracy vs load","Exactly-once display vs at-least-once delivery"],"concepts":["websocket_gateway_registry","per_conversation_ordering","large_group_fanout","presence_coalescing","reconnect_storm"]}'::jsonb,
  '[{"id":"reconnect_storm","attack":"A gateway AZ fails and 2M clients reconnect within 10 seconds. What stops the stampede?"},{"id":"mega_group","attack":"A 50k-member group gets 200 messages per second. Fanout on write melts the queue. What now?"},{"id":"ordering","attack":"Two members send at the same millisecond via different gateways. How is order decided and shown?"},{"id":"presence_flap","attack":"Mobile clients flap online and offline every few seconds. How do you keep presence cheap?"}]'::jsonb,
  'graph TD
    Client --> GW[WS Gateways]
    GW --> Reg[(Session Registry)]
    GW --> Log[Partitioned Message Log]
    Log --> Fanout[Fanout Workers]
    Fanout --> GW
    Fanout --> Inbox[(Offline Inbox)]
    GW --> Presence[Presence Service]
    style Fanout stroke:#ef4444,stroke-dasharray: 5 5',
  '10M WebSockets, per-conversation ordering, large-group fanout, presence, and reconnect storms.',
  '["backend-senior","backend-staff"]'::jsonb,
  '["high_concurrency","consistency"]'::jsonb,
  40
),
(
  'sc_payment_ledger',
  'payment-ledger',
  'high_concurrency',
  'Double-Entry Payment Ledger (20k TPS)',
  'Staff (L6)',
  false,
  'Design a double-entry ledger for a payments platform at 20,000 transactions per second. Every transfer must be exactly-once, balances must never go negative, and daily reconciliation against bank files must close to the cent.',
  '{"tps":"20,000","correctness":"exactly-once","balance":"never negative","reconciliation":"daily, to the cent"}'::jsonb,
  '{"mandatory":["Append-only journal with balanced debit and credit entries","Idempotency keys on every transfer request","Integer minor units, never floats","Hot account strategy (sub-accounts or batching)","Outbox pattern for downstream events","Reconciliation pipeline with break detection"],"tradeoffs":["Strong per-account serialization vs throughput","Synchronous balance check vs reservations","Single region vs multi-region writes"],"concepts":["double_entry_invariant","tool_idempotency","hot_account_contention","outbox_pattern","reconciliation_breaks"]}'::jsonb,
  '[{"id":"hot_account","attack":"A merchant settlement account receives 5k credits per second. Row locks serialize everything. Fix?"},{"id":"retry_double","attack":"The client retries after a timeout and the first attempt actually committed. Prove no double debit."},{"id":"recon_break","attack":"The bank file is 37 cents off from your ledger. How do you find it?"}]'::jsonb,
  'graph TD
    API --> Idem[Idempotency Store]
    Idem --> Journal[(Append-only Journal)]
    Journal --> Bal[Balance Projections]
    Journal --> Outbox[Outbox]
    Outbox --> Events
    Bank --> Recon[Reconciliation]
    Journal --> Recon
    style Bal stroke:#ef4444,stroke-dasharray: 5 5',
  'Exactly-once double-entry transfers at 20k TPS with hot accounts and cent-level reconciliation.',
  '["backend-staff"]'::jsonb,
  '["consistency","high_concurrency"]'::jsonb,
  45
),
(
  'sc_job_scheduler',
  'distributed-job-scheduler',
  'high_concurrency',
  'Distributed Job Scheduler (100M jobs/day)',
  'Staff (L6)',
  false,
  'Design a multi-tenant job scheduler that runs 100 million delayed and cron jobs per day with at-least-once execution, per-tenant fairness, retries with backoff, and visibility into stuck jobs.',
  '{"jobs":"100M/day","timing_skew":"<1s","semantics":"at-least-once","tenancy":"fair share"}'::jsonb,
  '{"mandatory":["Time-bucketed storage (timing wheel or partitioned ready queue)","Lease-based dispatch with heartbeats","Idempotent job handlers and dedupe keys","Per-tenant concurrency limits and weighted fair queuing","Retry policy with backoff and dead-letter queue","Leader election or sharded ownership for due-job scanning"],"tradeoffs":["Precision vs scan cost","Push vs pull workers","Central coordinator vs sharded ownership"],"concepts":["timing_wheel_partitioning","lease_heartbeat","tenant_fair_queuing","dead_letter_queue","thundering_herd_cron"]}'::jsonb,
  '[{"id":"midnight_herd","attack":"Two million cron jobs are scheduled for 00:00 UTC. What happens at midnight?"},{"id":"zombie_worker","attack":"A worker pauses for 90 seconds in GC, its lease expires, and the job runs twice. Mitigation?"},{"id":"tenant_flood","attack":"One tenant enqueues 30M jobs in an hour. How do others keep their timing SLO?"}]'::jsonb,
  'graph TD
    API --> Store[(Time-bucketed Store)]
    Store --> Scanner[Sharded Due Scanner]
    Scanner --> Ready[Fair Ready Queues]
    Ready --> Workers
    Workers --> Lease[Lease and Heartbeat]
    Workers --> DLQ[(Dead Letter)]
    style Scanner stroke:#ef4444,stroke-dasharray: 5 5',
  '100M delayed and cron jobs per day with leases, fairness, retries, and midnight herds.',
  '["backend-staff","backend-senior","ml-platform"]'::jsonb,
  '["high_concurrency","consistency","agent_runtime"]'::jsonb,
  45
),
(
  'sc_feature_store',
  'online-feature-store',
  'ai_infra',
  'Online Feature Store for Real-Time ML',
  'Senior (L5)',
  false,
  'Design an online and offline feature store that serves features for real-time ranking at p99 under 10ms, keeps training and serving consistent with point-in-time correctness, and supports streaming feature updates.',
  '{"read_p99":"<10ms","qps":"300k","freshness":"streaming <5s","correctness":"point-in-time"}'::jsonb,
  '{"mandatory":["Shared feature definitions compiled to batch and streaming","Online KV store keyed by entity with TTLs","Point-in-time joins for training data","Backfill strategy for new features","Feature versioning and monitoring for skew","Fallback defaults when features are missing"],"tradeoffs":["Freshness vs cost","Precompute vs on-demand transforms","Single store vs tiered cache"],"concepts":["point_in_time_join","training_serving_skew","feature_backfill","online_store_hotkey","semantic_cache_invalidation"]}'::jsonb,
  '[{"id":"skew","attack":"Offline AUC is 0.82 but online it behaves like 0.71. Where do you look first?"},{"id":"hot_entity","attack":"A viral item is read 80k times per second. The online store shard is pinned. Fix?"},{"id":"late_events","attack":"Streaming events arrive 20 minutes late. What does that do to point-in-time correctness?"}]'::jsonb,
  'graph TD
    Defs[Feature Definitions] --> Batch[Batch Pipeline]
    Defs --> Stream[Streaming Pipeline]
    Batch --> Offline[(Offline Store)]
    Stream --> Online[(Online KV)]
    Online --> Serving[Ranking Service]
    Offline --> Training
    style Online stroke:#ef4444,stroke-dasharray: 5 5',
  'p99 under 10ms feature serving with point-in-time correctness and training/serving skew control.',
  '["ml-platform","ai-infra-engineer"]'::jsonb,
  '["graph_rag","high_concurrency","consistency"]'::jsonb,
  40
)
ON CONFLICT (id) DO NOTHING;
