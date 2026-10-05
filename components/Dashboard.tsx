'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData, GrowthSeries, Metric } from '@/lib/metrics/types';
import { formatValue, syncedAt } from '@/lib/format';
import { BarChart, LineChart } from './charts';
import { ActivityFeed, Funnel, HBars, KpiCard, RateCard, Section, Seg, TodayStrip } from './parts';

type Tab = 'overview' | 'activity' | 'performance';
type Range = '24h' | '7d' | '30d' | 'all';
type Mode = 'cumulative' | 'daily';

const REFRESH_MS = 60_000;
const byId = (list: Metric[], id: string) => list.find((m) => m.id === id);
const pick = (list: Metric[], ids: string[]) => ids.map((id) => byId(list, id)).filter((m): m is Metric => Boolean(m));

const OUTCOME_LABEL: Record<string, string> = { read: 'Read successfully', unreadable: 'Unreadable', reader_error: 'Reader error', privacy_blocked: 'Blocked for privacy', no_aid_lines: 'No aid lines found' };
const KIND_LABEL: Record<string, string> = { 'fafsa-submission-summary': 'FAFSA Submission Summary', 'award-letter': 'Award letter', 'account-statement': 'Account statement', 'cost-estimate': 'Tuition / cost estimate' };
const pretty = (s: string) => s.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// ------------------------------------------------------------ icons

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={spinning ? 'spin' : ''} aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" />
  </svg>
);
const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);

// ------------------------------------------------------------ growth chart

function sliceSeries(series: GrowthSeries, range: Range) {
  if (range === '24h') return series.hourly;
  if (range === '7d') return series.daily.slice(-7);
  if (range === '30d') return series.daily.slice(-30);
  return series.daily;
}

function GrowthPanel({ title, series, noun, total }: { title: string; series: GrowthSeries; noun: [string, string]; total: string }) {
  const [mode, setMode] = useState<Mode>('cumulative');
  const [range, setRange] = useState<Range>('30d');
  const pts = sliceSeries(series, range);
  const added = pts.reduce((n, p) => n + p.added, 0);
  const last = pts[pts.length - 1];
  const rangeName = { '24h': 'in the last 24 hours', '7d': 'in the last 7 days', '30d': 'in the last 30 days', all: 'all time' }[range];
  const tip = (p: { label: string; added: number; total: number }) => (
    <>
      <div className="tDate">{p.label}</div>
      <div className="tMain">+{p.added.toLocaleString('en-US')} new {p.added === 1 ? noun[0] : noun[1]}</div>
      <div>{p.total.toLocaleString('en-US')} total {total}</div>
    </>
  );
  return (
    <div className="card glow">
      <div className="chartHead">
        <div>
          <p className="cardTitle">{title}</p>
          <div className="big">{(last?.total ?? 0).toLocaleString('en-US')}</div>
          <p className="cardSub">+{added.toLocaleString('en-US')} {rangeName}</p>
        </div>
        <div className="segs">
          <Seg label="Chart mode" value={mode} onChange={setMode} options={[{ value: 'cumulative', label: 'Cumulative' }, { value: 'daily', label: range === '24h' ? 'Hourly new' : 'Daily new' }]} />
          <Seg label="Date range" value={range} onChange={setRange} options={[{ value: '24h', label: '24H' }, { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: 'all', label: 'All Time' }]} />
        </div>
      </div>
      {mode === 'cumulative' ? (
        <LineChart
          ariaLabel={`${title}, cumulative`}
          area
          points={pts.map((p) => ({ label: p.label, values: [p.total] }))}
          series={[{ name: title, color: 'var(--lime)' }]}
          tooltip={(_, i) => tip(pts[i])}
        />
      ) : (
        <BarChart ariaLabel={`${title}, new per ${range === '24h' ? 'hour' : 'day'}`} height={260} points={pts.map((p) => ({ label: p.label, value: p.added }))} tooltip={(_, i) => tip(pts[i])} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ the page

export function Dashboard({ initial }: { initial: DashboardData }) {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<Tab>('overview');
  const [investor, setInvestor] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const busy = useRef(false);

  const refresh = useCallback(async (force = false) => {
    if (busy.current) return;
    busy.current = true;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/metrics${force ? '?fresh=1' : ''}`, { cache: 'no-store', credentials: 'same-origin' });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('metrics');
      setData((await res.json()) as DashboardData);
      setStale(false);
    } catch {
      setStale(true); // keep showing the last good numbers
    } finally {
      busy.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, REFRESH_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => null);
    window.location.href = '/login';
  };

  const d = data;
  const trackedTrend = d.growth.tracked.daily.slice(-30).map((p) => p.total);
  const accountTrend = d.growth.accounts.daily.slice(-30).map((p) => p.total);
  const trendFor = (id: string) => (id === 'trackedUsers' ? trackedTrend : id === 'accounts' ? accountTrend : undefined);

  const header = (
    <header className="top">
      <div className="brand">
        <div className="mark" aria-hidden="true">F</div>
        <div className="brandText">
          <div className="brandName">FYNQ <span>Command Center</span></div>
          <div className="brandSub">Live company intelligence</div>
        </div>
      </div>
      <div className="controls">
        <span className="live" role="status" aria-live="polite">
          <span className={`dot${stale ? ' stale' : ''}`} aria-hidden="true" />
          <b>{stale ? 'RETRYING' : 'LIVE'}</b>
          <span>Last synced {syncedAt(d.generatedAt)}</span>
        </span>
        <button type="button" className="btn" onClick={() => void refresh(true)} disabled={refreshing} aria-label="Refresh now">
          <RefreshIcon spinning={refreshing} /> Refresh
        </button>
        <button type="button" className={`btn${investor ? ' primary' : ''}`} onClick={() => setInvestor((v) => !v)} aria-pressed={investor}>
          <EyeIcon /> {investor ? 'Exit Investor View' : 'Investor View'}
        </button>
        {!investor && (
          <>
            <a className="btn" href="/api/export"><DownloadIcon /> Export Summary</a>
            <button type="button" className="btn ghost" onClick={() => void logout()}>Log out</button>
          </>
        )}
      </div>
    </header>
  );

  const summary = d.summary.length > 0 && (
    <div className="card summary">
      {d.summary.map((s) => <p key={s}>{s}</p>)}
    </div>
  );

  // ---------------------------------------------------------- investor view
  if (investor) {
    const kpis = [
      ...pick(d.primary, ['trackedUsers', 'mau', 'accounts']),
      ...pick(d.uploads.metrics, ['uniqueUploaders', 'successfulSessions']),
      ...pick(d.primary, ['paidCustomers', 'realRevenue']),
    ];
    const rates = pick(d.secondary, ['newTracked7d', 'newTracked30d', 'newAccounts7d']);
    return (
      <main className="shell investor">
        {header}
        {summary}
        <div className="investorHero">
          <div className="kpis four">{kpis.slice(0, 4).map((m) => <KpiCard key={m.id} metric={m} size="big" trend={trendFor(m.id)} bare />)}</div>
          <div className="kpis">{kpis.slice(4).map((m) => <KpiCard key={m.id} metric={m} size="big" bare />)}</div>
          <GrowthPanel title="Tracked User Growth" series={d.growth.tracked} noun={['user', 'users']} total="tracked" />
          <div className="kpis">{rates.map((m) => <KpiCard key={m.id} metric={m} bare />)}</div>
        </div>
        <p className="footnote">FYNQ · aggregate figures only · times in Central Time · synced {syncedAt(d.generatedAt)}</p>
      </main>
    );
  }

  // ---------------------------------------------------------- full dashboard
  return (
    <main className={`shell${refreshing ? '' : ''}`}>
      {header}
      <nav className="tabs" role="tablist" aria-label="Views">
        {(['overview', 'activity', 'performance'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>{pretty(t)}</button>
        ))}
      </nav>
      {d.unavailable.length > 0 && (
        <div className="banner" role="alert">Some data could not be loaded ({d.unavailable.join(', ')}). Those numbers show as unavailable; everything else is live.</div>
      )}

      {tab === 'overview' && (
        <>
          {summary}

          <Section eyebrow="Today" title="Today so far" sub="Since midnight Central Time, compared with yesterday at this time">
            <TodayStrip metrics={d.today} />
          </Section>

          <Section eyebrow="Headline" title="Company at a glance">
            <div className="kpis six">{d.primary.map((m) => <KpiCard key={m.id} metric={m} size="big" trend={trendFor(m.id)} />)}</div>
            <div className="kpis small" style={{ marginTop: 12 }}>{d.secondary.map((m) => <KpiCard key={`${m.id}-s`} metric={m} size="small" />)}</div>
          </Section>

          <Section eyebrow="Growth" title="Users and accounts">
            <div className="grid2">
              <GrowthPanel title="Tracked User Growth" series={d.growth.tracked} noun={['user', 'users']} total="tracked" />
              <div className="card">
                <p className="cardTitle">Active users</p>
                <p className="cardSub">Based on last activity, or sign-up when there is none</p>
                <div style={{ marginTop: 16 }}>
                  <HBars rows={d.active.map((m) => ({ label: m.label, value: m.value ?? 0 }))} unit="users" />
                </div>
              </div>
            </div>
            <div className="grid2 even" style={{ marginTop: 12 }}>
              <GrowthPanel title="Account Growth" series={d.growth.accounts} noun={['account', 'accounts']} total="accounts" />
              <div className="card">
                <p className="cardTitle">Sign-ups and logins</p>
                <p className="cardSub">Last 30 days, per day</p>
                <div style={{ marginTop: 12 }}>
                  <LineChart
                    ariaLabel="Sign-ups and logins per day, last 30 days"
                    height={220}
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
              </div>
            </div>
          </Section>

          <Section eyebrow="Uploads" title="Upload Intelligence" sub="Files, sessions and unique uploaders are three different counts">
            <div className="kpis six">{pick(d.uploads.metrics, ['filesSubmitted', 'uploadSessions', 'uniqueUploaders', 'uniqueSuccessfulUploaders', 'uploadSuccessRate', 'figuresExtracted']).map((m) => <KpiCard key={m.id} metric={m} />)}</div>
            <div className="grid2" style={{ marginTop: 12 }}>
              <div className="card">
                <p className="cardTitle">Files submitted per day</p>
                <p className="cardSub">Each upload session carries 1–3 files</p>
                <div style={{ marginTop: 12 }}>
                  <BarChart
                    ariaLabel="Files submitted per day"
                    points={d.uploads.daily.slice(-30).map((p) => ({ label: p.label, value: p.files }))}
                    tooltip={(p, i) => (
                      <>
                        <div className="tDate">{p.label}</div>
                        <div className="tMain">{p.value} {p.value === 1 ? 'file' : 'files'}</div>
                        <div>{d.uploads.daily.slice(-30)[i]?.sessions ?? 0} sessions</div>
                      </>
                    )}
                  />
                </div>
              </div>
              <div className="card">
                <p className="cardTitle">Upload outcomes</p>
                <p className="cardSub">Sessions by result</p>
                <div style={{ marginTop: 16 }}>
                  <HBars rows={d.uploads.outcomes.map((o) => ({ label: OUTCOME_LABEL[o.outcome] ?? pretty(o.outcome), value: o.sessions, extra: `${o.files} files` }))} unit="sessions" />
                </div>
              </div>
            </div>
          </Section>

          <Section eyebrow="Money" title="Revenue & Conversion" sub="Live payments only; test accounts and excluded founder accounts are left out">
            <div className="kpis four">{d.revenue.metrics.map((m) => <KpiCard key={`${m.id}-r`} metric={m} />)}</div>
            <div className="kpis four" style={{ marginTop: 12 }}>{d.revenue.windows.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}</div>
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
                  <tbody>
                    {d.revenue.checkouts.map((m) => (
                      <tr key={m.id}><td>{m.label}</td><td className="num">{formatValue(m.value, m.format)}</td></tr>
                    ))}
                  </tbody>
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
          </Section>

          <Section eyebrow="Product" title="Questions and aid analyses">
            <div className="grid2 even">
              <div className="card">
                <p className="cardTitle">Ask FYNQ</p>
                <div className="kpis" style={{ marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  {d.questions.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}
                </div>
              </div>
              <div className="card">
                <p className="cardTitle">Aid analyses</p>
                <div className="kpis" style={{ marginTop: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
                  {d.analyses.metrics.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}
                </div>
                <div style={{ marginTop: 16 }}>
                  <HBars rows={d.analyses.byKind.map((k) => ({ label: KIND_LABEL[k.kind] ?? pretty(k.kind), value: k.analyses, extra: `${k.files} files` }))} unit="analyses" />
                </div>
              </div>
            </div>
          </Section>
        </>
      )}

      {tab === 'activity' && (
        <Section eyebrow="Activity" title="What happened" sub="Last 7 days in 3-hour blocks, newest first. Counts only">
          <ActivityFeed blocks={d.activity} />
        </Section>
      )}

      {tab === 'performance' && (
        <Section eyebrow="Performance" title="Conversion and quality" sub="Each rate shows exactly what it divides">
          <div className="perf">{d.performance.map((r) => <RateCard key={r.id} rate={r} />)}</div>
          <div className="card" style={{ marginTop: 12 }}>
            <p className="cardTitle">Conversion funnel</p>
            <p className="cardSub">Distinct accounts reaching each step · % from the step before</p>
            <div style={{ marginTop: 16 }}><Funnel stages={d.revenue.funnel} /></div>
          </div>
        </Section>
      )}

      <p className="footnote">Aggregate figures only · Central Time · refreshes every 60 seconds</p>
    </main>
  );
}
