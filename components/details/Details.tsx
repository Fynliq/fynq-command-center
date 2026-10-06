'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { formatValue } from '@/lib/format';
import { BarChart, LineChart } from '../charts';
import { ActivityFeed, ConversionFeed, Funnel, HBars, KpiCard, RateCard } from '../parts';
import { GrowthChart } from '../growth/GrowthSection';
import { PlusIcon } from '../ui';

const OUTCOME_LABEL: Record<string, string> = { read: 'Read successfully', unreadable: 'Unreadable', reader_error: 'Reader error', privacy_blocked: 'Blocked for privacy', no_aid_lines: 'No aid lines found' };
const KIND_LABEL: Record<string, string> = { 'fafsa-submission-summary': 'FAFSA Submission Summary', 'award-letter': 'Award letter', 'account-statement': 'Account statement', 'cost-estimate': 'Tuition / cost estimate' };
const pretty = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/**
 * Every metric the Command Center had before the redesign, with its
 * definition on hover: nothing was removed, only moved below the story.
 */
export function Details({ d }: { d: DashboardData }) {
  return (
    <section className="detailsSec" aria-labelledby="details-title">
      <div className="container">
        <details className="detailsBox">
          <summary>
            <span>
              <span className="label">For the operator</span>
              <span id="details-title" className="detailsTitle">Every metric, in detail.</span>
            </span>
            <PlusIcon />
          </summary>
          <div className="detailsInner">
            {d.summary.length > 0 && <div className="card summary">{d.summary.map((s) => <p key={s}>{s}</p>)}</div>}

            <h3 className="h2" style={{ marginTop: 36 }}>Company</h3>
            <div className="kpis six" style={{ marginTop: 12 }}>{d.primary.map((m) => <KpiCard key={m.id} metric={m} />)}</div>
            <div className="kpis small" style={{ marginTop: 12 }}>{d.secondary.map((m) => <KpiCard key={`${m.id}-s`} metric={m} size="small" />)}</div>

            <h3 className="h2" style={{ marginTop: 36 }}>Users and accounts</h3>
            <div className="grid2 even" style={{ marginTop: 12 }}>
              <div className="card"><p className="cardTitle">Accounts</p><p className="cardSub">Registered accounts over time.</p><GrowthChart series={d.growth.accounts} noun="accounts" height={300} /></div>
              <div className="card">
                <p className="cardTitle">Sign-ups and logins</p>
                <p className="cardSub">Last 30 days, per day</p>
                <div style={{ marginTop: 12 }}>
                  <LineChart
                    ariaLabel="Sign-ups and logins per day, last 30 days"
                    height={240}
                    points={d.logins.map((p) => ({ label: p.label, values: [p.signups, p.logins] }))}
                    series={[{ name: 'Sign-ups', color: 'var(--series-1)' }, { name: 'Logins', color: 'var(--series-2)' }]}
                    tooltip={(p) => (
                      <>
                        <div className="tDate">{p.label}</div>
                        <div className="tRow"><span className="key" style={{ background: 'var(--series-1)' }} /><strong style={{ color: 'var(--tx)' }}>{p.values[0]}</strong> sign-ups</div>
                        <div className="tRow"><span className="key" style={{ background: 'var(--series-2)' }} /><strong style={{ color: 'var(--tx)' }}>{p.values[1]}</strong> logins</div>
                      </>
                    )}
                  />
                  <div className="legend"><span><i style={{ background: 'var(--series-1)' }} />Sign-ups</span><span><i style={{ background: 'var(--series-2)' }} />Logins</span></div>
                </div>
                <div style={{ marginTop: 18 }}><HBars rows={d.active.map((m) => ({ label: m.label, value: m.value ?? 0 }))} unit="users" /></div>
              </div>
            </div>

            <h3 className="h2" style={{ marginTop: 36 }}>Uploads</h3>
            <div className="kpis six" style={{ marginTop: 12 }}>{d.uploads.metrics.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}</div>
            <div className="grid2" style={{ marginTop: 12 }}>
              <div className="card">
                <p className="cardTitle">Files submitted per day</p>
                <p className="cardSub">Each upload session carries 1–3 files</p>
                <div style={{ marginTop: 12 }}>
                  <BarChart
                    ariaLabel="Files submitted per day"
                    points={d.uploads.daily.slice(-30).map((p) => ({ label: p.label, value: p.files }))}
                    tooltip={(p, i) => (<><div className="tDate">{p.label}</div><div className="tMain">{p.value} {p.value === 1 ? 'file' : 'files'}</div><div>{d.uploads.daily.slice(-30)[i]?.sessions ?? 0} sessions</div></>)}
                  />
                </div>
              </div>
              <div className="card">
                <p className="cardTitle">Upload outcomes</p>
                <p className="cardSub">Sessions by result</p>
                <div style={{ marginTop: 16 }}><HBars rows={d.uploads.outcomes.map((o) => ({ label: OUTCOME_LABEL[o.outcome] ?? pretty(o.outcome), value: o.sessions, extra: `${o.files} files` }))} unit="sessions" /></div>
              </div>
            </div>

            <h3 className="h2" style={{ marginTop: 36 }}>Revenue and conversion</h3>
            <div className="kpis four" style={{ marginTop: 12 }}>{d.revenue.metrics.map((m) => <KpiCard key={`${m.id}-r`} metric={m} size="small" />)}</div>
            <div className="grid2" style={{ marginTop: 12 }}>
              <div className="card">
                <p className="cardTitle">Conversion funnel</p>
                <p className="cardSub">Distinct accounts reaching each step · % from the step before</p>
                <div style={{ marginTop: 16 }}><Funnel stages={d.revenue.funnel} /></div>
              </div>
              <div className="card">
                <p className="cardTitle">Checkouts</p>
                <p className="cardSub">Live Stripe Checkout sessions</p>
                <table className="table" style={{ marginTop: 10 }}>
                  <tbody>{d.revenue.checkouts.map((m) => <tr key={m.id}><td>{m.label}</td><td className="num">{formatValue(m.value, m.format)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="card" style={{ marginTop: 12 }}>
              <p className="cardTitle">Every tracked event</p>
              <p className="cardSub">Live, non-test. New event types appear here automatically</p>
              <div className="tableWrap">
                <table className="table" style={{ marginTop: 8 }}>
                  <thead><tr><th>Event</th><th className="num">Events</th><th className="num">Accounts</th></tr></thead>
                  <tbody>{d.revenue.events.map((e) => <tr key={e.eventType}><td>{e.eventType}</td><td className="num">{e.events.toLocaleString('en-US')}</td><td className="num">{e.accounts.toLocaleString('en-US')}</td></tr>)}</tbody>
                </table>
              </div>
            </div>

            <h3 className="h2" style={{ marginTop: 36 }}>Questions and aid analyses</h3>
            <div className="grid2 even" style={{ marginTop: 12 }}>
              <div className="card">
                <p className="cardTitle">Ask FYNQ</p>
                <div className="kpis" style={{ marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>{d.questions.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}</div>
              </div>
              <div className="card">
                <p className="cardTitle">Aid analyses</p>
                <div className="kpis" style={{ marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>{d.analyses.metrics.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}</div>
                <div style={{ marginTop: 16 }}><HBars rows={d.analyses.byKind.map((k) => ({ label: KIND_LABEL[k.kind] ?? pretty(k.kind), value: k.analyses, extra: `${k.files} files` }))} unit="analyses" /></div>
              </div>
            </div>

            <h3 className="h2" style={{ marginTop: 36 }}>Performance</h3>
            <div className="perf" style={{ marginTop: 12 }}>{d.performance.map((r) => <RateCard key={r.id} rate={r} />)}</div>

            {d.attribution.state === 'ok' && (
              <>
                <h3 className="h2" style={{ marginTop: 36 }}>Recent conversions</h3>
                <p className="sub">Attributed accounts, newest activity first, shown by masked reference</p>
                <div style={{ marginTop: 12 }}><ConversionFeed trails={d.attribution.recent} /></div>
              </>
            )}

            <h3 className="h2" style={{ marginTop: 36 }}>Last 7 days, in 3-hour blocks</h3>
            <div style={{ marginTop: 12 }}><ActivityFeed blocks={d.activity} /></div>
          </div>
        </details>
      </div>
    </section>
  );
}
