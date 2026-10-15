/** Metadata only. No agents execute merely by importing this module. */
export const AGENTS = [
  {
    "id": "chief-of-staff",
    "description": "Triage events, prioritize tasks, coordinate specialists, and draft CEO briefings",
    "model": "haiku",
    "maxTurns": 12,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "product-innovation",
    "description": "Research unmet student needs and propose measurable product opportunities",
    "model": "sonnet",
    "maxTurns": 10,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "product-analytics",
    "description": "Analyze permitted aggregate activation, retention, revenue and funnel changes",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "growth-marketing",
    "description": "Draft campaigns, SEO improvements and TikTok growth experiments for approval",
    "model": "sonnet",
    "maxTurns": 10,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "customer-support",
    "description": "Triage redacted support issues and prepare responses for human review",
    "model": "haiku",
    "maxTurns": 9,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "software-engineering",
    "description": "Implement explicitly approved features and fixes in isolated worktrees",
    "model": "sonnet",
    "maxTurns": 18,
    "mode": "edit",
    "activation": "manual-disabled"
  },
  {
    "id": "code-review",
    "description": "Review diff correctness, security, scalability and maintainability",
    "model": "sonnet",
    "maxTurns": 12,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "qa-testing",
    "description": "Run approved synthetic tests and report regressions and release blockers",
    "model": "haiku",
    "maxTurns": 12,
    "mode": "test",
    "activation": "manual-disabled"
  },
  {
    "id": "security-privacy",
    "description": "Audit access, secrets exposure, student-data isolation and dependencies",
    "model": "sonnet",
    "maxTurns": 12,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "api-reliability",
    "description": "Investigate API errors, latency spikes and timeouts using safe telemetry",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "cloud-infrastructure",
    "description": "Review health and scaling of cloud workloads and databases",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "cost-optimization",
    "description": "Find verifiable savings in cloud, inference and vendor expenses",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "data-engineering",
    "description": "Validate pipeline quality, schema lineage and safe data preparation",
    "model": "sonnet",
    "maxTurns": 10,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "ai-model-training",
    "description": "Monitor approved training metrics, checkpoint health and GPU efficiency",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "pilot-disabled"
  },
  {
    "id": "model-evaluation",
    "description": "Design and assess safe model benchmarks and regression evaluations",
    "model": "sonnet",
    "maxTurns": 12,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "mlops-deployment",
    "description": "Prepare model candidate comparisons, deployment checks and rollbacks",
    "model": "sonnet",
    "maxTurns": 12,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "inference-optimization",
    "description": "Analyze approved model-serving latency, batching and cost metrics",
    "model": "sonnet",
    "maxTurns": 10,
    "mode": "read",
    "activation": "manual-disabled"
  },
  {
    "id": "finance-business-intelligence",
    "description": "Analyze approved expense, revenue and unit-economics aggregates",
    "model": "haiku",
    "maxTurns": 10,
    "mode": "read",
    "activation": "manual-disabled"
  }
] as const;
export type AgentName = (typeof AGENTS)[number]['id'];
export const PILOT_AGENTS: readonly AgentName[] = AGENTS.filter(a => a.activation === 'pilot-disabled').map(a => a.id);
export function isKnownAgent(name: string): name is AgentName { return AGENTS.some(a => a.id === name); }
