export type FocusArea =
  | "rate_limiting"
  | "llm_gateway"
  | "consistency"
  | "graph_rag"
  | "agent_runtime"
  | "high_concurrency";

export const FOCUS_LABELS: Record<string, string> = {
  rate_limiting: "Rate limiting & traffic governance",
  llm_gateway: "LLM gateway & cost control",
  consistency: "Distributed consistency",
  graph_rag: "Retrieval, RAG & data correctness",
  agent_runtime: "Agent runtime & workflows",
  high_concurrency: "Scale & high concurrency",
  ai_infra: "AI infrastructure",
};

export type Track = {
  slug: string;
  title: string;
  short: string;
  tagline: string;
  overview: string;
  levels: string[];
  weights: Partial<Record<FocusArea, number>>;
  rounds: Array<{ name: string; minutes: number; tests: string }>;
  pitfalls: string[];
};

export const TRACKS: Track[] = [
  {
    slug: "ai-infra-engineer",
    title: "AI Infrastructure Engineer",
    short: "AI Infra",
    tagline: "LLM gateways, inference serving, RAG and agent runtimes.",
    overview:
      "AI infrastructure loops test whether you can run models in production: admission control and cost governance in front of providers, GPU-efficient serving, retrieval that does not hallucinate, and agent workflows that survive crashes.",
    levels: ["Senior (L5)", "Staff (L6)"],
    weights: { llm_gateway: 35, graph_rag: 25, agent_runtime: 20, high_concurrency: 20 },
    rounds: [
      { name: "High-level design", minutes: 15, tests: "Data plane vs control plane, request lifecycle, where state lives" },
      { name: "Chaos injection", minutes: 12, tests: "Provider outages, KV-cache pressure, retry storms, noisy tenants" },
      { name: "Cost & edge cases", minutes: 10, tests: "Token spend governors, eval gates, rollout safety" },
    ],
    pitfalls: [
      "Treating the LLM provider as infinitely available",
      "No hard per-tenant budget, only soft alerts",
      "Checking ACLs after retrieval instead of inside it",
      "Ignoring time-to-first-token while optimizing throughput",
    ],
  },
  {
    slug: "backend-staff",
    title: "Staff Backend Engineer",
    short: "Backend Staff",
    tagline: "Correctness under contention, multi-region trade-offs, blast radius.",
    overview:
      "Staff-level backend loops push past the boxes-and-arrows diagram. Expect to quantify bounds: how much over-admission, how much lag, which invariant holds during a partition, and what you sacrifice to keep it.",
    levels: ["Staff (L6)"],
    weights: { consistency: 35, high_concurrency: 30, rate_limiting: 20, llm_gateway: 15 },
    rounds: [
      { name: "High-level design", minutes: 15, tests: "Invariants, ownership of state, API and data model" },
      { name: "Chaos injection", minutes: 12, tests: "Hot keys, partitions, retries after timeouts, clock skew" },
      { name: "Cost & edge cases", minutes: 10, tests: "Reconciliation, migrations, operational cost" },
    ],
    pitfalls: [
      "Naming Redis or Kafka without saying what invariant they protect",
      "No idempotency story for client retries",
      "Hand-waving partition behavior",
      "Not quantifying the error bound of local batching",
    ],
  },
  {
    slug: "backend-senior",
    title: "Senior Backend Engineer",
    short: "Backend Senior",
    tagline: "Solid scalable designs with clear data flow and failure handling.",
    overview:
      "Senior loops check that you can design a complete, scalable system end to end, choose sensible storage and messaging, and handle the obvious failure modes without prompting.",
    levels: ["Senior (L5)"],
    weights: { high_concurrency: 40, consistency: 25, rate_limiting: 20, graph_rag: 15 },
    rounds: [
      { name: "High-level design", minutes: 15, tests: "Requirements, API, data model, core components" },
      { name: "Chaos injection", minutes: 12, tests: "Node failure, reconnect storms, hot partitions" },
      { name: "Cost & edge cases", minutes: 10, tests: "Capacity estimates and operational trade-offs" },
    ],
    pitfalls: [
      "Skipping capacity estimates",
      "One database for everything with no partitioning plan",
      "No plan for reconnects or retries",
    ],
  },
  {
    slug: "ml-platform",
    title: "ML Platform Engineer",
    short: "ML Platform",
    tagline: "Feature stores, retrieval, schedulers and serving infrastructure.",
    overview:
      "ML platform loops blend data engineering and serving: point-in-time correctness, freshness versus cost, safe model rollout, and batch plus streaming pipelines that agree with each other.",
    levels: ["Senior (L5)", "Staff (L6)"],
    weights: { graph_rag: 30, high_concurrency: 30, agent_runtime: 20, llm_gateway: 20 },
    rounds: [
      { name: "High-level design", minutes: 15, tests: "Batch vs streaming, storage tiers, serving path" },
      { name: "Chaos injection", minutes: 12, tests: "Late events, skew, hot entities, backfills" },
      { name: "Cost & edge cases", minutes: 10, tests: "Freshness budgets, compute cost, monitoring" },
    ],
    pitfalls: [
      "Training and serving computing features differently",
      "No backfill plan for new features",
      "Ignoring late-arriving data",
    ],
  },
];

export type CompanyType = {
  slug: string;
  label: string;
  hint: string;
  weights: Partial<Record<FocusArea, number>>;
};

export const COMPANY_TYPES: CompanyType[] = [
  {
    slug: "big-tech",
    label: "Big Tech",
    hint: "Scale, multi-region, and crisp trade-offs",
    weights: { high_concurrency: 35, consistency: 30, rate_limiting: 20, graph_rag: 15 },
  },
  {
    slug: "ai-lab",
    label: "AI lab / model provider",
    hint: "Serving, gateways, evals, GPU economics",
    weights: { llm_gateway: 40, agent_runtime: 25, high_concurrency: 20, graph_rag: 15 },
  },
  {
    slug: "fintech",
    label: "Fintech",
    hint: "Exactly-once, ledgers, reconciliation",
    weights: { consistency: 45, high_concurrency: 25, rate_limiting: 15, graph_rag: 15 },
  },
  {
    slug: "ecommerce",
    label: "E-commerce / marketplace",
    hint: "Flash sales, rate limits, inventory",
    weights: { high_concurrency: 35, rate_limiting: 30, consistency: 25, llm_gateway: 10 },
  },
  {
    slug: "startup",
    label: "AI-native startup",
    hint: "Pragmatic infra, cost control, speed",
    weights: { llm_gateway: 35, agent_runtime: 25, graph_rag: 20, rate_limiting: 20 },
  },
];

export const LEVELS = [
  { slug: "senior", label: "Senior (L5)" },
  { slug: "staff", label: "Staff (L6)" },
];

export function trackBySlug(slug: string) {
  return TRACKS.find((t) => t.slug === slug);
}

export function companyBySlug(slug: string) {
  return COMPANY_TYPES.find((c) => c.slug === slug);
}

export const ROUND_PLAN = [
  { name: "High-level design", minutes: 15 },
  { name: "Chaos injection", minutes: 12 },
  { name: "Cost & edge cases", minutes: 10 },
];
