/**
 * Fynliq AI Ops — sandbox-only deterministic orchestration foundation.
 *
 * No network calls, model invocations, database writes, background schedules,
 * production credentials or file system writes. The MemoryTaskStore is NOT
 * durable and MUST NOT be used for distributed production processing.
 */
import { isKnownAgent, PILOT_AGENTS, type AgentName } from './catalog';

export type Action = 'inspect' | 'draft-change' | 'deploy' | 'database-write' | 'train-model' | 'release-model' | 'pay' | 'message-customer' | 'change-permissions';
export type Sensitivity = 'synthetic' | 'aggregate' | 'protected-student';
export type TaskStatus = 'queued' | 'approval-required' | 'retry-wait' | 'running' | 'succeeded' | 'failed' | 'blocked';
export type Priority = 1 | 2 | 3;

export interface IntakeEvent {
  key: string;
  agent: AgentName;
  summary: string;
  action: Action;
  sensitivity: Sensitivity;
  priority: Priority;
  estimatedCostCents: number;
}

export interface Task {
  id: string;
  event: IntakeEvent;
  status: TaskStatus;
  attempts: number;
  readyAt: number;
  createdAt: number;
  approvalBy?: string;
  result?: string;
  errorCode?: string;
}

export interface AuditEntry {
  taskId: string;
  event: 'enqueued' | 'blocked' | 'approved' | 'started' | 'retried' | 'succeeded' | 'failed' | 'paused';
  at: number;
  code?: string;
}

/** Demo store. A production adapter needs durable uniqueness, claim leases and atomic writes. */
export class MemoryTaskStore {
  private readonly tasks = new Map<string, Task>();
  readonly audit: AuditEntry[] = [];
  list(): Task[] { return [...this.tasks.values()].map(t => ({ ...t, event: { ...t.event } })); }
  get(id: string): Task | undefined { return this.tasks.get(id); }
  findByKey(key: string): Task | undefined { return [...this.tasks.values()].find(t => t.event.key === key); }
  save(task: Task): void { this.tasks.set(task.id, task); }
  record(item: AuditEntry): void { this.audit.push(item); }
}

const NEVER_EXECUTE = new Set<Action>(['deploy', 'database-write', 'train-model', 'release-model', 'pay', 'message-customer', 'change-permissions']);
const MAX_ATTEMPTS = 3;
const MAX_SUMMARY_LENGTH = 240;

/** Settings are fixed to a zero-cost synthetic-data sandbox. */
export interface SandboxSettings {
  enabled: boolean;
  allowedAgents?: readonly AgentName[];
}

/**
 * A dry-run callback. It must not call external services or reveal sensitive
 * data. A future production worker MUST use a capability-scoped tool gateway.
 */
export type SandboxExecutor = (task: Readonly<Task>, signal: AbortSignal) => Promise<string>;

export class SandboxOrchestrator {
  private paused = false;
  private readonly allowed: Set<AgentName>;
  constructor(private readonly store: MemoryTaskStore, private readonly settings: SandboxSettings = { enabled: false }) {
    this.allowed = new Set(settings.allowedAgents ?? PILOT_AGENTS);
  }

  emergencyStop(): void {
    this.paused = true;
    this.store.record({ taskId: '-', event: 'paused', at: Date.now(), code: 'CEO_HALT' });
  }

  /** No cross-process or cross-instance durable guarantees; run one instance in sandbox tests only. */
  enqueue(event: IntakeEvent, now = Date.now()): Task {
    if (!event.key || event.key.length > 180 || event.summary.length > MAX_SUMMARY_LENGTH || !event.summary.trim()) throw new Error('INVALID_EVENT');
    if (!isKnownAgent(event.agent) || !Number.isInteger(event.estimatedCostCents) || event.estimatedCostCents < 0 || ![1, 2, 3].includes(event.priority)) throw new Error('INVALID_EVENT');
    const previous = this.store.findByKey(event.key);
    if (previous) return previous;
    const forbidden = event.sensitivity === 'protected-student' || NEVER_EXECUTE.has(event.action);
    // Paid workloads are entirely disallowed in this initial foundation.
    const blocked = forbidden || event.estimatedCostCents !== 0 || !this.allowed.has(event.agent);
    const status: TaskStatus = blocked ? 'blocked' : event.action === 'draft-change' ? 'approval-required' : 'queued';
    const task: Task = { id: crypto.randomUUID(), event: { ...event }, status, attempts: 0, readyAt: now, createdAt: now };
    this.store.save(task);
    this.store.record({ taskId: task.id, event: blocked ? 'blocked' : 'enqueued', at: now, code: blocked ? 'POLICY_DENIED' : undefined });
    return task;
  }

  /** Prototype role string only, NOT authentication. Do not expose this as an HTTP endpoint. */
  approveDraftForSandbox(taskId: string, actorRole: string): Task {
    if (actorRole !== 'ceo') throw new Error('FORBIDDEN');
    const task = this.store.get(taskId);
    if (!task || task.status !== 'approval-required' || task.event.action !== 'draft-change') throw new Error('NOT_APPROVABLE');
    task.approvalBy = 'ceo';
    task.status = 'queued';
    this.store.save(task);
    this.store.record({ taskId, event: 'approved', at: Date.now() });
    return task;
  }

  async runOnce(executor: SandboxExecutor, now = Date.now()): Promise<Task | undefined> {
    if (!this.settings.enabled || this.paused) return undefined;
    const next = this.store.list()
      .filter(t => (t.status === 'queued' || t.status === 'retry-wait') && t.readyAt <= now)
      .sort((a, b) => a.event.priority - b.event.priority || a.createdAt - b.createdAt)[0];
    if (!next) return undefined;
    const task = this.store.get(next.id)!;
    if (task.event.sensitivity !== 'synthetic' || task.event.estimatedCostCents !== 0 || NEVER_EXECUTE.has(task.event.action)) {
      task.status = 'blocked'; task.errorCode = 'SANDBOX_ONLY'; this.store.save(task);
      this.store.record({ taskId: task.id, event: 'blocked', at: now, code: 'SANDBOX_ONLY' });
      return task;
    }
    task.status = 'running'; task.attempts += 1; this.store.save(task);
    this.store.record({ taskId: task.id, event: 'started', at: now });
    try {
      // Hard turn and paid-token caps belong to the future provider gateway.
      // This callback only exercises zero-cost fake executors.
      const result = await executor({ ...task, event: { ...task.event } }, AbortSignal.timeout(5_000));
      if (this.paused) { task.status = 'blocked'; task.errorCode = 'CEO_HALT'; }
      else { task.status = 'succeeded'; task.result = String(result).slice(0, 500); }
      this.store.record({ taskId: task.id, event: task.status === 'succeeded' ? 'succeeded' : 'blocked', at: now });
    } catch {
      task.errorCode = 'SANDBOX_EXECUTION_FAILED';
      if (task.attempts >= MAX_ATTEMPTS) {
        task.status = 'failed'; this.store.record({ taskId: task.id, event: 'failed', at: now, code: task.errorCode });
      } else {
        task.status = 'retry-wait';
        task.readyAt = now + 1_000 * 2 ** (task.attempts - 1);
        this.store.record({ taskId: task.id, event: 'retried', at: now, code: task.errorCode });
      }
    }
    this.store.save(task);
    return task;
  }
}
