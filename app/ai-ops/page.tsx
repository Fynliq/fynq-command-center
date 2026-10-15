import { redirect } from 'next/navigation';
import { isSignedIn } from '@/lib/auth';
import { AGENTS } from '@/lib/ai-ops/catalog';

export const dynamic = 'force-dynamic';

const PANELS = [
  ['Active tasks and approvals', 'Not connected — no queued jobs or approvals have been loaded.'],
  ['Execution history and audit logs', 'Not connected — no execution history is being collected.'],
  ['API and infrastructure health', 'Not connected — monitoring adapters must be reviewed first.'],
  ['Model training and evaluation', 'Not connected — no verified training or checkpoint integration.'],
  ['AI spending and verified savings', 'Not connected — zero paid AI workloads activated by this module.'],
  ['Emergency stop', 'Sandbox runner starts disabled. A distributed kill switch is a production prerequisite.'],
] as const;

export default async function AiOperations() {
  if (!(await isSignedIn())) redirect('/login');
  return (
    <main style={{ minHeight: '100vh', background: '#050706', color: '#f2f5f2', padding: '36px max(20px, 5vw)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <a href="/" style={{ color: '#a8c4b1' }}>← Command Center</a>
        <p style={{ marginTop: 34, color: '#a8c4b1', letterSpacing: 2, fontSize: 12 }}>FYNLIQ / INTERNAL</p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 58px)', margin: '10px 0' }}>AI Operations</h1>
        <p style={{ maxWidth: 780, color: '#bdc9c0', lineHeight: 1.6 }}>Architecture preview. All 18 specialists are defined in the repository, but no live agent execution, scheduling, external integrations or approval endpoints have been enabled.</p>
        <div role="status" style={{ display: 'inline-block', padding: '9px 14px', border: '1px solid #927753', borderRadius: 12, color: '#f4d5a1', margin: '12px 0 32px' }}>SANDBOX FOUNDATION · INACTIVE</div>
        <section aria-label="Operational modules" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(275px, 1fr))', gap: 14 }}>
          {PANELS.map(([heading, detail]) => (
            <div key={heading} style={{ border: '1px solid #2b332d', borderRadius: 15, padding: 20, background: '#0c100d' }}>
              <h2 style={{ fontSize: 17, margin: 0 }}>{heading}</h2>
              <p style={{ color: '#b2bdb5', fontSize: 14, lineHeight: 1.5 }}>{detail}</p>
            </div>
          ))}
        </section>
        <h2 style={{ fontSize: 25, marginTop: 42 }}>Agent registry · {AGENTS.length} defined</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(275px, 1fr))', gap: 12 }}>
          {AGENTS.map(agent => (
            <div key={agent.id} style={{ border: '1px solid #2b332d', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{agent.id}</strong><span style={{ color: '#e0b988', fontSize: 12 }}>Inactive</span>
              </div>
              <p style={{ color: '#b2bdb5', fontSize: 13, lineHeight: 1.5 }}>{agent.description}</p>
              <span style={{ color: '#91a797', fontSize: 12 }}>Claude {agent.model} · {agent.activation === 'pilot-disabled' ? 'Pilot candidate' : 'Manual candidate'}</span>
            </div>
          ))}
        </div>
        <p style={{ margin: '36px 0', color: '#93a098', fontSize: 13 }}>This view intentionally does not claim real-time monitoring or display student-level records.</p>
      </div>
    </main>
  );
}
