# AI Operations sandbox rollout & execution checklist

Status on 2026-10-14: **NOT DEPLOYED / NOT SCHEDULED / NO PAID AGENT EXECUTION**. This branch adds code definitions, a synthetic in-memory engine, tests, a read-only fixture capability gateway, and an inactive Command Center page.

## What exists

- 18 distinct project-local Claude Code definitions in `.claude/agents/`. Six are tagged as potential pilots and all are disabled.
- A typed agent registry (`lib/ai-ops/catalog.ts`).
- Sandbox orchestration (`lib/ai-ops/orchestrator.ts`) with key-based deduplication, priority, bounded exponential retry, CEO-gated draft state, audit events, hard-blocked consequential actions and protected data, and a local emergency stop.
- A backend-style sandbox tool facade (`lib/ai-ops/safe-tools.ts`) with per-agent read capabilities and zero write capability.
- `/ai-ops` in the existing dashboard with truthful inactive statuses.
- Synthetic test suites and a synthetic CLI smoke test.

## What deliberately does not exist

No real durable queue, live worker, model provider calls, cron, customer communication, cloud monitoring credentials, Supabase AI Ops schema, prod migrations, paid task budget, model training integration, deployed agent UI APIs, or live task history. The in-memory store, `actorRole: 'ceo'` prototype string, and process-local pause flag are **not production security controls**. Do not mount the prototype approval method into HTTP routes.

## Local verification commands

```bash
npm install
npm run typecheck
npm test
npx tsx scripts/ai-ops-sandbox.ts
npm run build
```

All runnable commands are intentionally local/synthetic. **Tests were authored, but not executed in the development environment during the remote GitHub update**; typecheck, Next.js build and integration status remain unverified until CI or a local checkout runs them. Do not call this production-ready.

## Proposed worker foundation (requires implementation and approval)

1. Introduce a dedicated restricted `ai_ops_private` schema or compatible task store; apply new migrations in a sandbox branch first. Separate task table, idempotency uniqueness constraint, append-only audit, approvals ledger, agent configuration and per-day spend counters. No direct `anon` or general `authenticated` access.
2. Evaluate Supabase Queues (durable PGMQ) for work delivery with queue visibility timeouts and idempotent processing. Persist tasks transactionally and use durable lease/heartbeat/claim ownership; distinguish at-least-once delivery from exactly-once *effects*. Support dead-letter handling and backoff.
3. Use existing cloud/Vercel telemetry for event ingestion, not constant AI polling. Evaluate Supabase Cron/Vercel Cron only where needed, and require explicit schedule approval.
4. Build server-side allowlisted adapters: `readApiHealth`, `readCloudHealth`, `readCloudCosts`, `readTrainingSummary`, `readFunnelAggregates`. Return small sanitized aggregates with provenance and TTL; no raw student records or secret-bearing logs.
5. Connect provider execution through a sandboxed Claude Agent SDK worker with version-pinned dependencies, timeouts, disabled network/tool capabilities by default, model routing based on evals and hard provider-level budgets. Start concurrency at 1; max 3 attempts, max 2 minutes per reasoning task, and no costly GPU launches.
6. Replace the prototype role string with verified, step-up-authenticated CEO identity and dual verification for high-risk operations. Approvals must name exact task payload hash, environment, resource, cost ceiling, expiry and allowed action.
7. Create authenticated read-only `/api/ai-ops` summaries and separate approval endpoints only after centralized authorization, CSRF protection, audit and negative tests are in place.
8. Add company-wide persistent emergency halt checked before every tool invocation and job claim. Revoke worker credentials and cancel active tasks during an incident.
9. Establish evaluations and monitoring for false alerts, prompt injection, policy bypass attempts, cost variance and task completion quality. Review results before any production activation.

## Approved-by-CEO decisions needed

- Ownership and credentials for Fynliq cloud APIs, observability platform and training metrics; confirmation of the training environment.
- Whether to use existing Supabase infrastructure for private PGMQ and tasks, and whether paid compute/provider execution is allowed.
- Named human approvers, MFA/step-up identity, and the exact production action allowlist.
- Specific budgets, schedules, alert thresholds, data retention windows and incident escalation channels.
- Separate privacy review of sponsor placements, merchant onboarding, and how students consent to commercial matching.

## Initial cost guardrails (proposed, NOT enabled)

- Current sandbox: **$0 paid AI budget**; no LLMs are invoked.
- First authorized staging pilot proposal: **$5/day total model budget**, **$1/agent/day** for each of six pilots (the total cap takes precedence), max **1 active agent job**, no paid training or compute scaling, and a **$150/30-day** theoretical aggregate ceiling if the cap were fully spent every day.
- Underlying cloud/DB/observability costs are **not yet quantified** and are not covered by the illustrative model budget. Before enabling, measure token costs, infra usage, scheduling overhead and failure rates. Hard limits must be enforced at provider and worker layers; textual caps alone are not sufficient.
- Engineering/complex reasoning can use Sonnet after approval; cheap checks use deterministic code and cheaper models for anomalies. Never force the proprietary model into a critical path before it passes evaluation.

## Test matrix

| Control | Code test | External verification still needed |
| --- | --- | --- |
| 18 definitions, six pilots | Catalog uniqueness test | Claude Code discovery in actual checkout |
| Task dedup and disabled default | Synthetic unit tests | Durable DB unique index and concurrent workers |
| Deny student data and dangerous actions | Synthetic policy tests | Real backend authorization and prompt-injection red team |
| Approval gate | Role-string synthetic test | MFA, identity binding, audit and replay resistance |
| Retry limits | Synthetic unit test | Crash/restart, leases, dead-letter queue |
| Emergency stop | Local in-process unit test | Distributed durable kill switch, active-job cancellation |
| Cost tracking | Zero-cost rule only | Provider billing reconciliation and daily spending cap |
| Command Center | Inactive page and auth reuse | Build/UI tests, mobile layout and authenticated staging |
| Cloud/API/model telemetry | Not connected | Contract tests with approved sources |

## Rollout sequence

A. Review this draft branch and run commands above in a clean local clone. Fix failing tests before merging.  
B. Provision a **separate staging environment** with synthetic data, then build durable queue, identity/approval service and audit.  
C. Wire **read-only API health and product aggregates** to two pilot agents; monitor costs and correctness for several review cycles.  
D. Add Cloud Infrastructure, Cost Optimization, Chief of Staff and (only after its source is verified) Model Training.  
E. Show real task history and CEO approvals inside the existing Command Center only when source-backed and secure.  
F. Seek explicit approval before any unattended schedule, paid work, production deployment or external partner communication.
