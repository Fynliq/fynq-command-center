import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENTS } from '../lib/ai-ops/catalog';
import { MemoryTaskStore, SandboxOrchestrator, type IntakeEvent } from '../lib/ai-ops/orchestrator';

const event = (overrides: Partial<IntakeEvent> = {}): IntakeEvent => ({
  key: 'api:synthetic:1',
  agent: 'api-reliability',
  summary: 'Synthetic elevated error rate',
  action: 'inspect',
  sensitivity: 'synthetic',
  priority: 1,
  estimatedCostCents: 0,
  ...overrides,
});

test('exactly eighteen unique catalog agents and six disabled pilot candidates', () => {
  assert.equal(AGENTS.length, 18);
  assert.equal(new Set(AGENTS.map(a => a.id)).size, 18);
  assert.equal(AGENTS.filter(a => a.activation === 'pilot-disabled').length, 6);
});

test('disabled by default; event keys deduplicate', async () => {
  const store = new MemoryTaskStore();
  const runner = new SandboxOrchestrator(store);
  const a = runner.enqueue(event());
  assert.equal(runner.enqueue(event()).id, a.id);
  assert.equal(await runner.runOnce(async () => 'ok'), undefined);
  assert.equal(store.audit.length, 1);
});

test('never accesses protected student data or executes consequential actions', async () => {
  const store = new MemoryTaskStore();
  const runner = new SandboxOrchestrator(store, { enabled: true });
  assert.equal(runner.enqueue(event({ key: 'private', sensitivity: 'protected-student' })).status, 'blocked');
  assert.equal(runner.enqueue(event({ key: 'prod', action: 'deploy' })).status, 'blocked');
  assert.equal(runner.enqueue(event({ key: 'spend', estimatedCostCents: 1 })).status, 'blocked');
  assert.equal(runner.enqueue(event({ key: 'manual', agent: 'growth-marketing' })).status, 'blocked');
  assert.equal(await runner.runOnce(async () => { throw new Error('must not run'); }), undefined);
});

test('draft requires CEO gate; impersonated roles rejected', async () => {
  const runner = new SandboxOrchestrator(new MemoryTaskStore(), { enabled: true });
  const task = runner.enqueue(event({ action: 'draft-change' }));
  assert.equal(task.status, 'approval-required');
  assert.throws(() => runner.approveDraftForSandbox(task.id, 'analyst'), /FORBIDDEN/);
  runner.approveDraftForSandbox(task.id, 'ceo');
  const done = await runner.runOnce(async () => 'Synthetic draft ready');
  assert.equal(done?.status, 'succeeded');
});

test('transient failures have capped retries and backoff', async () => {
  const runner = new SandboxOrchestrator(new MemoryTaskStore(), { enabled: true });
  const task = runner.enqueue(event(), 100);
  let n = 0;
  const fail = async () => { n++; throw new Error('simulated transient'); };
  assert.equal((await runner.runOnce(fail, 100))?.status, 'retry-wait');
  assert.equal(await runner.runOnce(fail, 101), undefined);
  assert.equal((await runner.runOnce(fail, 1100))?.status, 'retry-wait');
  assert.equal((await runner.runOnce(fail, 3100))?.status, 'failed');
  assert.equal(n, 3);
  assert.equal(runner.enqueue(event()).id, task.id);
});

test('emergency stop prevents further execution', async () => {
  const runner = new SandboxOrchestrator(new MemoryTaskStore(), { enabled: true });
  runner.enqueue(event());
  runner.emergencyStop();
  assert.equal(await runner.runOnce(async () => 'unexpected'), undefined);
});
