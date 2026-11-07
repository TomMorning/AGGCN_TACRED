ALTER TABLE scenarios ADD COLUMN IF NOT EXISTS clarifications JSONB DEFAULT '[]'::jsonb;

ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS round_turn INT DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS clarify_count INT DEFAULT 0;
ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS annotations JSONB;

UPDATE scenarios SET clarifications = '[
  {"topic":"traffic","keywords":["rpm","traffic","peak","load","requests","qps","burst"],"answer":"50k RPM average across all tenants, peaks at 3x for about 10 minutes during US business hours. The top 1 percent of tenants generate about 40 percent of traffic."},
  {"topic":"tenants","keywords":["tenant","customers","noisy","isolation","plans","tiers"],"answer":"About 2,000 tenants on three plans. Each plan has a requests-per-minute limit and a monthly credit budget. Enterprise tenants can buy dedicated capacity."},
  {"topic":"providers","keywords":["provider","openai","anthropic","model","fallback","upstream","vendor"],"answer":"Three upstream LLM providers. Each has its own per-key rate limits and returns 429 when exceeded; 503 outages happen a few times a month and usually last under 15 minutes."},
  {"topic":"billing","keywords":["billing","credit","charge","price","invoice","ledger","cost","tokens"],"answer":"Tenants are billed per prompt and completion token at per-model prices with up to 6 decimal places. Finance requires the ledger to reconcile to the cent every month."},
  {"topic":"latency","keywords":["latency","p99","slo","overhead","streaming","stream"],"answer":"Gateway overhead budget is under 80ms at p99, excluding provider time. Most traffic is streaming responses."},
  {"topic":"regions","keywords":["region","multi-region","geo","datacenter","az"],"answer":"Two regions today, active-active. Tenants are not pinned to a region."}
]'::jsonb WHERE slug = 'llm-gateway-sidecar';

UPDATE scenarios SET clarifications = '[
  {"topic":"traffic","keywords":["qps","traffic","peak","load","requests","burst"],"answer":"500k QPS at peak across 3 regions; normal is around 150k. Flash sales can send 40 percent of traffic to a single SKU for a few minutes."},
  {"topic":"rules","keywords":["rule","rules","dimension","key","user","ip","sku","composite"],"answer":"Rules key on user, IP, device, SKU and combinations of them. About 10k active rules, changed several times a day by the risk team."},
  {"topic":"accuracy","keywords":["accuracy","exact","approximate","over-admission","false","tolerance","error"],"answer":"Up to 5 percent over-admission is acceptable on browse paths. Checkout and payment paths must not exceed the limit."},
  {"topic":"latency","keywords":["latency","p99","overhead","budget"],"answer":"The limiter adds at most 2ms at p99 on the request path, including the network hop."},
  {"topic":"partition","keywords":["partition","redis","outage","failure","down","fail-open","fail-closed"],"answer":"Redis partitions of 10 to 30 seconds happen a few times a quarter. The business prefers fail-open on browse and fail-closed on payment."}
]'::jsonb WHERE slug = 'distributed-rate-limiter';

UPDATE scenarios SET clarifications = '[
  {"topic":"corpus","keywords":["corpus","documents","filings","10-k","10-q","data","size","how many"],"answer":"Ten years of 10-K and 10-Q filings for about 4,000 public companies, roughly 3 million pages, mostly PDF with tables."},
  {"topic":"queries","keywords":["query","questions","users","analysts","who","qps"],"answer":"Equity analysts ask about 20k questions a day, e.g. compare operating margin trends or compute ROE for a segment. Peak is about 5 QPS."},
  {"topic":"accuracy","keywords":["accuracy","hallucination","wrong","error","tolerance","refuse","abstain"],"answer":"Any fabricated number is a severity-1 incident. Refusing to answer is acceptable when evidence is missing."},
  {"topic":"freshness","keywords":["fresh","update","amend","new filing","latency"],"answer":"New filings must be queryable within 1 hour of publication. Amended filings supersede the originals."},
  {"topic":"latency","keywords":["latency","p95","fast","slow","time"],"answer":"p95 under 4 seconds end to end, streaming allowed."}
]'::jsonb WHERE slug = 'financial-graph-rag';

UPDATE scenarios SET clarifications = '[
  {"topic":"scale","keywords":["scale","workflows","concurrent","how many","volume","load"],"answer":"About 50k workflows running concurrently, each lasting from minutes to several days. Around 2M tool calls per day."},
  {"topic":"tools","keywords":["tool","tools","sandbox","code","execution","network"],"answer":"Tools include web fetch, code execution in Python, and calls to customer APIs. Some tools have side effects such as sending email or creating tickets."},
  {"topic":"hitl","keywords":["human","approval","approve","pause","resume","hitl"],"answer":"High-risk actions need human approval. Approvals can take hours and sometimes arrive after the underlying data changed."},
  {"topic":"tenancy","keywords":["tenant","customers","isolation","fair","quota","budget"],"answer":"Multi-tenant. Each tenant has a concurrency limit and a monthly token budget."},
  {"topic":"failure","keywords":["crash","failure","restart","worker","recovery"],"answer":"Workers are preemptible and get restarted a few times a day. Workflows must resume without repeating completed side effects."}
]'::jsonb WHERE slug = 'agentic-workflow-engine';

UPDATE scenarios SET clarifications = '[
  {"topic":"traffic","keywords":["traffic","concurrent","writes","qps","users","peak"],"answer":"200k concurrent purchase attempts in the first 10 seconds of a sale, for about 1,000 units of a single hot SKU and a long tail of others."},
  {"topic":"inventory","keywords":["inventory","stock","source of truth","database","units"],"answer":"Inventory of record lives in a sharded MySQL cluster. Overselling even one unit is not acceptable."},
  {"topic":"payment","keywords":["payment","pay","timeout","checkout","reservation"],"answer":"Users have 15 minutes to pay after reserving. About 30 percent of reservations are never paid."},
  {"topic":"fairness","keywords":["fair","bots","queue","order","first"],"answer":"The business wants roughly first-come-first-served and must block obvious bots."},
  {"topic":"regions","keywords":["region","multi-region","geo"],"answer":"Single region for this sale, three availability zones."}
]'::jsonb WHERE slug = 'high-freq-inventory-flash-sale';

UPDATE scenarios SET clarifications = '[
  {"topic":"volume","keywords":["volume","posts","per day","traffic","scale","burst"],"answer":"10M posts per day on average from three platforms; viral events can push 50x for 10 to 30 minutes."},
  {"topic":"budget","keywords":["budget","cost","llm","spend","dollars","tokens"],"answer":"Hard LLM budget of 2,000 dollars per day across all customers. Overspend is not allowed."},
  {"topic":"latency","keywords":["latency","lag","freshness","priority","sla"],"answer":"Priority brands need results within 60 seconds; everyone else within 15 minutes."},
  {"topic":"intents","keywords":["intent","labels","classification","accuracy","recall"],"answer":"About 12 intent labels such as purchase intent or churn risk. Recall matters more than precision for purchase intent."},
  {"topic":"dedupe","keywords":["duplicate","dedupe","same","repost","cross-platform"],"answer":"The same text is often reposted across platforms with different IDs."}
]'::jsonb WHERE slug = 'realtime-social-intent-crawler';

UPDATE scenarios SET clarifications = '[
  {"topic":"models","keywords":["model","models","size","parameters","7b","70b","weights"],"answer":"Three open-weight models: an 8B, a 70B and a 34B code model. The 70B takes about 60 percent of traffic."},
  {"topic":"hardware","keywords":["gpu","hardware","h100","a100","nodes","memory","capacity"],"answer":"A fleet of 8xH100 nodes. GPU spend is the largest cost line, so utilization matters."},
  {"topic":"traffic","keywords":["traffic","concurrent","streams","qps","peak","context","prompt"],"answer":"5,000 concurrent streams at peak. Median prompt is 2k tokens, but 5 percent of requests exceed 64k tokens."},
  {"topic":"slo","keywords":["slo","latency","ttft","first token","tokens per second","sla"],"answer":"Time to first token under 800ms at p95 for prompts under 8k tokens; at least 30 output tokens per second per stream."},
  {"topic":"tenants","keywords":["tenant","customers","priority","tiers","fair"],"answer":"Enterprise tenants have reserved capacity; free-tier traffic can be shed first."},
  {"topic":"rollout","keywords":["rollout","deploy","new model","version","canary"],"answer":"A new model version ships roughly every two weeks and must be rolled out without downtime."}
]'::jsonb WHERE slug = 'llm-inference-serving';

UPDATE scenarios SET clarifications = '[
  {"topic":"data","keywords":["vectors","data","size","dimension","dim","corpus","documents"],"answer":"1B chunks embedded at 768 dimensions, growing 5 percent a month. Average chunk is 400 tokens."},
  {"topic":"traffic","keywords":["qps","traffic","queries","peak","load"],"answer":"3k QPS at peak, top-k of 20, with a reranker after retrieval."},
  {"topic":"tenants","keywords":["tenant","acl","permission","access","customers","filter"],"answer":"About 5,000 tenants; the largest holds 8 percent of vectors. Every query filters by tenant and by document ACL groups."},
  {"topic":"freshness","keywords":["fresh","update","delete","ingest","latency"],"answer":"New or edited documents must be searchable within 60 seconds; deletions must be honored within 60 seconds for compliance."},
  {"topic":"quality","keywords":["recall","quality","accuracy","precision"],"answer":"Target recall@20 of at least 0.95 against exact search on the evaluation set."}
]'::jsonb WHERE slug = 'vector-search-rag-retrieval';

UPDATE scenarios SET clarifications = '[
  {"topic":"scale","keywords":["users","connections","concurrent","dau","scale","how many"],"answer":"10M concurrent connections at peak, 60M daily active users, about 1M messages per second at peak."},
  {"topic":"groups","keywords":["group","groups","members","channel","large"],"answer":"Most chats are 1:1 or small groups under 20. A few thousand groups have over 10k members, up to 50k."},
  {"topic":"delivery","keywords":["delivery","ordering","order","guarantee","exactly","receipts"],"answer":"Messages must appear in the same order for everyone in a conversation. Read receipts are best effort."},
  {"topic":"offline","keywords":["offline","push","notification","mobile"],"answer":"Offline users get push notifications and must see missed messages when they reconnect, for up to 30 days."},
  {"topic":"regions","keywords":["region","global","geo","latency"],"answer":"Users are global; two regions today, one in the US and one in Europe."}
]'::jsonb WHERE slug = 'realtime-chat-presence';

UPDATE scenarios SET clarifications = '[
  {"topic":"volume","keywords":["tps","volume","transactions","peak","load"],"answer":"20k transfers per second at peak, 400M per day. Each transfer has at least two entries."},
  {"topic":"accounts","keywords":["account","accounts","hot","merchant","balance"],"answer":"About 50M accounts. A handful of platform settlement accounts receive thousands of credits per second."},
  {"topic":"currency","keywords":["currency","fx","multi-currency","cents"],"answer":"12 currencies; all amounts are stored in minor units. FX conversion happens in a separate service."},
  {"topic":"consistency","keywords":["consistency","negative","overdraft","balance","strong"],"answer":"Customer balances must never go negative. Reads of a balance right after a transfer must reflect it."},
  {"topic":"reconciliation","keywords":["reconcile","reconciliation","bank","settlement","audit"],"answer":"Daily bank settlement files arrive by 06:00 UTC and must reconcile by 09:00 UTC."}
]'::jsonb WHERE slug = 'payment-ledger';

UPDATE scenarios SET clarifications = '[
  {"topic":"volume","keywords":["jobs","volume","per day","scale","how many","load"],"answer":"100M job executions per day; 30 percent are cron, the rest one-off delayed jobs from a minute to 30 days out."},
  {"topic":"timing","keywords":["precision","timing","late","skew","on time"],"answer":"Jobs should start within 1 second of their scheduled time for paying tenants, within 1 minute for free tenants."},
  {"topic":"duration","keywords":["duration","long","runtime","timeout","worker"],"answer":"Median job runs 2 seconds; 1 percent run over 10 minutes; the maximum is 2 hours."},
  {"topic":"tenants","keywords":["tenant","fair","customers","quota","priority"],"answer":"About 20k tenants. One large tenant can submit tens of millions of jobs in an hour."},
  {"topic":"semantics","keywords":["exactly once","at least once","retry","idempotent","duplicate"],"answer":"At-least-once is acceptable; handlers are expected to be idempotent, but the platform should minimize duplicates."}
]'::jsonb WHERE slug = 'distributed-job-scheduler';

UPDATE scenarios SET clarifications = '[
  {"topic":"scale","keywords":["qps","reads","traffic","scale","peak"],"answer":"300k feature-vector reads per second at peak, about 200 features per request across users and items."},
  {"topic":"entities","keywords":["entities","users","items","keys","cardinality"],"answer":"500M users and 50M items. Viral items can be read 80k times per second."},
  {"topic":"freshness","keywords":["fresh","streaming","update","latency","real-time"],"answer":"Streaming features must be visible within 5 seconds; batch features refresh daily."},
  {"topic":"training","keywords":["training","offline","backfill","point-in-time","history"],"answer":"Training uses two years of history and requires point-in-time correct joins. New features need backfills."},
  {"topic":"latency","keywords":["latency","p99","budget","slo"],"answer":"Feature retrieval has a 10ms p99 budget inside a 100ms ranking request."}
]'::jsonb WHERE slug = 'online-feature-store';
