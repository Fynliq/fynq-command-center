# Fynliq AI Operations — verified architecture audit (2026-10-14)

## Scope and evidence

Inspection was limited to the connected GitHub repositories, read-only Supabase project metadata/table lists, and Vercel project metadata. No repository was cloned locally and no production credentials were retrieved. Absence of evidence does not prove a service does not exist.

### Verified existing components

- `Fynliq/fynliq-landing`: React 18/Vite app; API routes for analysis, account/auth, billing and questions; Supabase integration; Stripe webhook and entitlement code; Vercel configuration; tests. Default branch is `feat/search-tabs-gradi` at inspection time.
- `Fynliq/fynq-command-center`: Next.js 16/React 19/TypeScript, server-side Supabase reads, signed HttpOnly session cookie, aggregate reporting, test suite, and existing navigation. Default branch `main`.
- Supabase: a connected project contains the same telemetry and account table names used by Command Center (`anonymous_users`, `account_events`, `upload_events`, `billing_checkouts`, `aid_analyses`, `acquisition_attribution`, etc.). The inspected public tables report RLS enabled. Neither an AI operations task queue nor approvals ledger was seen in that schema.
- Vercel: accessible projects include `fynliq-landing`, `fynq-command-center`, `fynliq-cloud`, and `fynq-cloud-deploy`. Project existence does not verify runtime architecture or application health.

### Not yet verified

- Proprietary model-training pipeline, GPU vendor, checkpoint storage, training logs, inference service, model registry, real-time cloud APIs, monitoring integrations, or their security posture.
- Current access to non-GitHub source for cloud services; any vendor APIs/agreements for jobs, discounts, scholarships or creator payments.
- Whether the current Command Center's password-only login meets requirements for production CEO authorization.

### Important risks

1. `lib/data.ts` uses a server-side Supabase service-role credential. Although the current code selects specific fields for aggregates and claims read-only behavior, the credential itself is privileged. **Do not reuse it for autonomous agents or public endpoints.**
2. Password/session authentication is not a sufficient standalone identity proof for high-consequence approval. Production approvals need named principals, MFA or step-up, server-side permissions, signed immutable audit records, expiry and replay protection.
3. Current aggregate reads paginate production rows, which may become costly at scale. Prefer dedicated least-privilege SQL aggregate views/services after reviewing query patterns.
4. Prompt instructions and restricted Claude Code tools do not replace backend authorization. Untrusted text can induce tool misuse unless every tool call is independently validated.
5. Student FAFSA/FTI and uploaded financial-aid material must be isolated from advertising, commercial matching, model training and merchant targeting. Get privacy/legal review and student-facing consent design before partner launch.
6. Production Postgres, cloud services, model serving and training must not be shared with unauthenticated or arbitrary agent execution.

## Architecture to extend, not rebuild

```text
Existing Fynliq application          Existing Command Center
(FAFSA + future opportunities)      (CEO view + inactive AI Ops view)
          |                                     |
          | first-party verified events         | authenticated read-only summaries
          v                                     v
   [event validation and redaction]       [AI Ops reporting API]
                     \                       /
                      v                     v
                     [private orchestration service]
                       |  immutable audit / idempotency
                       v
                   [durable queue]
                       |
                 [bounded worker(s)]
                       |
              [backend capability gateway]
                       |
   safe aggregate views / API health / cloud costs / approved training status
```

**Runtime choice:** Claude Code `.claude/agents/*.md` describes specialist behavior for development and manual delegation. A future worker can use Claude Agent SDK for on-demand execution, with enforced provider limits, rather than a never-ending CLI process. For queueing, evaluate Supabase Queues (PGMQ) and, for schedules, the current stack's Supabase Cron or Vercel Cron; confirm quotas, isolation, costs and existing workloads before enabling anything. No new database schema/queue/cron has been created.

## Event and authority boundaries

- Ingest only allowlisted signed first-party events, deduplicate with unique idempotency keys, include time/source/priority, and redact payloads before persistence.
- Aggregate production metrics are **read-only** through a scoped service identity and a fixed set of permitted RPCs or views; do not expose the current service-role key to workers.
- Approval actions: production deployments, writes/deletes, model releases, new training/compute spending, transactions, new budgets, customer messages, protected student data, or permission changes.
- Before dispatch, revalidate identity, environment, role, action, purpose, TTL, approvals, budgets, data classification and kill-switch status; repeat authorization at execution time.
- Workers should run with separate capability credentials, short sessions, network egress allowlists, concurrency caps, timeouts, and no direct student-document access.
- Record immutable append-only audit entries with task IDs, decision codes, model/token costs and outcome; **not** prompts containing sensitive data.

## Six pilot workflows (not activated)

| Workflow | Trigger | Allowed initial outcome |
| --- | --- | --- |
| API reliability | Alert on material 5xx/latency regression after minimum volume checks | Cause hypotheses and incident draft |
| Cloud infrastructure | Health threshold or scheduled aggregated health check | Capacity report and recommendations |
| Cost optimization | Significant cloud cost variance | Specific savings proposal and tradeoffs |
| AI model training | Verified heartbeat/checkpoint signals (integration missing) | Training status and suspected stall |
| Product analytics | Scheduled anomaly detection using aggregate funnels | Investigate and propose experiment |
| Chief of Staff | Completed incident/task summaries | Draft daily CEO brief and weekly review |

Use cheap deterministic monitoring rules first. An LLM is invoked only when an event warrants reasoning. Engineering edits require a separately approved task and isolated worktree; no push, merge or deployment is automatic.

## Business opportunity marketplace: next product layer

**Start without third-party APIs:** Create verified business accounts, an opportunity submission/review queue, clearly labeled sponsored placements, student discovery filters, safe offsite application links, and analytics on anonymized totals. Have businesses pay students directly for initial paid gigs; charge employers separately for placement/sponsorship if validated.

**Integrate later with actual agreements:** ATS/job posting partners, scholarship providers, discount affiliates, trusted merchant verification and—only if payouts become essential—a purpose-built payment/onboarding provider. Never infer that an API exists or may be used without confirming contract scope, rate limits, privacy and permissions. Separate ad profiles from FAFSA and protected financial-aid information; avoid individually targeting students by their financial hardship.

**Agent workflow:** sponsorship submission → deterministic policy validation → redacted fraud/quality analysis → human compliance approval → publish a labeled placement → aggregate performance analytics. Agents draft outreach; humans authorize external communications and contracts.
