'use client';

import type { Metric } from '@/lib/metrics/types';
import { formatChange } from '@/lib/format';
import { MetricNumber, Reveal } from '../motion';

/** Plain-English labels for the Today metrics; the ids and definitions are unchanged. */
const LABEL: Record<string, string> = {
  newTrackedToday: 'new tracked users',
  newAccountsToday: 'new accounts',
  filesSubmitted: 'files uploaded',
  uploadSessions: 'upload sessions',
  paywallViews: 'paywall views',
  checkoutCreated: 'checkouts started',
  paidCustomers: 'payments',
  revenueToday: 'revenue',
};

export function TodaySection({ today }: { today: Metric[] }) {
  return (
    <section className="stage" aria-labelledby="today-title">
      <Reveal className="wrap">
        <p className="kicker">Since midnight, Central Time</p>
        <h2 id="today-title" className="title" style={{ marginTop: 14 }}>Today at FYNQ.</h2>
        <div className="todayGrid">
          {today.map((m) => {
            const change = m.status === 'ok' ? formatChange(m.comparison) : null;
            return (
              <div className="todayItem" key={`${m.id}-${m.label}`}>
                <b><MetricNumber value={m.status === 'ok' ? m.value : null} format={m.format} /></b>
                <span>{LABEL[m.id] ?? m.label}</span>
                {m.status !== 'ok'
                  ? <small>Data temporarily unavailable</small>
                  : change && <small className={change.direction === 'up' || change.direction === 'new' ? 'up' : undefined}>{change.text} vs yesterday at this time</small>}
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}
