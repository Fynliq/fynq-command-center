import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SafeSandboxGateway } from '../lib/ai-ops/safe-tools';

test('tool capabilities are enforced, not described only in prompts', () => {
  const gateway = new SafeSandboxGateway();
  const metric = gateway.readMetric('api-reliability', 'api-health.read');
  assert.equal(metric.synthetic, true);
  assert.throws(() => gateway.readMetric('api-reliability', 'cloud-costs.read'), /CAPABILITY_DENIED/);
  assert.throws(() => gateway.readMetric('growth-marketing', 'api-health.read'), /CAPABILITY_DENIED/);
  assert.throws(() => gateway.write(), /ALL_WRITES_DENIED/);
  assert.throws(() => gateway.readStudentData(), /PROTECTED_STUDENT_DATA_DENIED/);
});
