'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { byId, Change, v } from '../ui';

const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' });

const pctChange = (cur: number | null, prev: number | null): { change: number | null; isNew: boolean } => {
  if (cur === null || prev === null) return { change: null, isNew: false };
  if (prev === 0) return { change: null, isNew: cur > 0 };
  return { change: ((cur - prev) / prev) * 100, isNew: false };
};

/**
 * Today, read like a morning briefing: since midnight Central Time, each
 * against the same time yesterday.
 */
export function TodayBriefing({ d }: { d: DashboardData }) {
  const t = (id: string) => byId(d.today, id);
  const reads = d.story.todayExtra;
  const readsChg = pctChange(reads.reads, reads.readsYesterday);
  const rows: { n: number | null; label: string; usd?: boolean; change: number | null | undefined; isNew: boolean }[] = [
    ...([
      ['newTrackedToday', 'new tracked users'],
      ['newAccountsToday', 'new accounts'],
      ['uploadSessions', 'upload sessions'],
      ['filesSubmitted', 'files submitted'],
    ] as const).map(([id, label]) => ({ n: v(t(id)), label, change: t(id)?.comparison?.change, isNew: t(id)?.comparison?.direction === 'new' })),
    { n: reads.reads, label: 'successful reads', change: readsChg.change, isNew: readsChg.isNew },
    ...([
      ['paywallViews', 'paywall views'],
      ['checkoutCreated', 'checkout starts'],
      ['paidCustomers', 'payments'],
      ['revenueToday', 'revenue'],
    ] as const).map(([id, label]) => ({ n: v(t(id)), label, usd: id === 'revenueToday', change: t(id)?.comparison?.change, isNew: t(id)?.comparison?.direction === 'new' })),
  ];
  return (
    <section id="today" className="today2" aria-labelledby="today-title">
      <div className="container">
        <Reveal className="todayHead">
          <p className="label">Today</p>
          <h2 id="today-title" className="todayDate">{dayFmt.format(new Date(d.generatedAt))}</h2>
          <p className="muted">Since midnight Central Time · each against yesterday at this hour</p>
        </Reveal>
        <Reveal as="ol" className="brief">
          {rows.map((r) => (
            <li key={r.label} className={r.n ? 'has' : 'zero'}>
              <span className="briefN"><MetricNumber value={r.n} format={r.usd ? 'usd' : 'count'} /></span>
              <span className="briefL">{r.label}</span>
              <span className="briefC"><Change change={r.change} isNew={r.isNew} /></span>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
