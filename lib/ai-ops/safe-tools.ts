/** Explicitly synthetic, least-privilege tool facade. No external credentials. */
import type { AgentName } from './catalog';

export type ReadCapability = 'api-health.read' | 'cloud-health.read' | 'cloud-costs.read' | 'training-status.read' | 'funnel-aggregates.read';
type Metric = { readonly label: string; readonly value: number; readonly unit: string; readonly synthetic: true };

const ACCESS: Partial<Record<AgentName, readonly ReadCapability[]>> = {
  'chief-of-staff': ['api-health.read', 'cloud-health.read', 'cloud-costs.read', 'training-status.read', 'funnel-aggregates.read'],
  'api-reliability': ['api-health.read'],
  'cloud-infrastructure': ['cloud-health.read'],
  'cost-optimization': ['cloud-costs.read'],
  'ai-model-training': ['training-status.read'],
  'product-analytics': ['funnel-aggregates.read'],
};

const FIXTURES: Record<ReadCapability, Metric> = {
  'api-health.read': { label: 'synthetic_5xx_rate', value: 0.02, unit: 'fraction', synthetic: true },
  'cloud-health.read': { label: 'synthetic_cpu_utilization', value: 0.45, unit: 'fraction', synthetic: true },
  'cloud-costs.read': { label: 'synthetic_daily_usd', value: 2.50, unit: 'USD', synthetic: true },
  'training-status.read': { label: 'synthetic_training_step', value: 250, unit: 'steps', synthetic: true },
  'funnel-aggregates.read': { label: 'synthetic_activation_rate', value: 0.30, unit: 'fraction', synthetic: true },
};

export class SafeSandboxGateway {
  readMetric(agent: AgentName, capability: ReadCapability): Metric {
    if (!ACCESS[agent]?.includes(capability)) throw new Error('CAPABILITY_DENIED');
    return { ...FIXTURES[capability] };
  }
  write(): never { throw new Error('ALL_WRITES_DENIED_IN_SANDBOX'); }
  readStudentData(): never { throw new Error('PROTECTED_STUDENT_DATA_DENIED'); }
}
