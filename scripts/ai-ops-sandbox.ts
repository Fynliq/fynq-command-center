/** Synthetic smoke test: npx tsx scripts/ai-ops-sandbox.ts */
import { MemoryTaskStore, SandboxOrchestrator } from '../lib/ai-ops/orchestrator';
import { SafeSandboxGateway } from '../lib/ai-ops/safe-tools';

async function main() {
  const store = new MemoryTaskStore();
  const runner = new SandboxOrchestrator(store, { enabled: true });
  const gateway = new SafeSandboxGateway();
  runner.enqueue({
    key: 'synthetic:api-5xx:2026-10-14',
    agent: 'api-reliability',
    summary: 'Synthetic elevated API error rate',
    action: 'inspect',
    sensitivity: 'synthetic',
    priority: 1,
    estimatedCostCents: 0,
  });
  const task = await runner.runOnce(async () => {
    const datum = gateway.readMetric('api-reliability', 'api-health.read');
    return `Inspected ${datum.label}=${datum.value} (${datum.unit}); this is synthetic only.`;
  });
  console.log(JSON.stringify({ id: task?.id, status: task?.status, result: task?.result, auditEvents: store.audit.map(a => a.event) }, null, 2));
}
main().catch(() => { console.error('Sandbox smoke test failed'); process.exitCode = 1; });
