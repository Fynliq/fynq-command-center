'use client';

import type { DashboardData, Metric } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { byId, Change, v } from '../ui';

/**
 * Six executive numbers in one row. The small line under each is its
 * growth over 7 days (the total now against the total 7 days ago). MAU has
 * no 7-day history, so it says what it is instead of inventing a change.
 */
export function ExecutiveStrip({ d }: { d: DashboardData }) {
  const items: { label: string; m: Metric | undefined; note?: string }[] = [
    { label: 'MAU', m: byId(d.primary, 'mau'), note: 'Active, last 30 days' },
    { label: 'Accounts', m: byId(d.primary, 'accounts') },
    { label: 'Unique Uploaders', m: byId(d.uploads.metrics, 'uniqueUploaders') },
    { label: 'Files Submitted', m: byId(d.uploads.metrics, 'filesSubmitted') },
    { label: 'Paid Customers', m: byId(d.primary, 'paidCustomers') },
    { label: 'Revenue', m: byId(d.primary, 'realRevenue') },
  ];
  return (
    <section className="strip" aria-label="Executive summary">
      <div className="container">
        <Reveal as="ul" className="stripRow">
          {items.map(({ label, m, note }) => {
            const c = m?.comparison;
            return (
              <li key={label} className="stripItem">
                <span className="stripVal"><MetricNumber value={v(m)} format={m?.format ?? 'count'} /></span>
                <span className="stripLabel">{label}</span>
                <span className="stripChg">
                  {note ?? (c ? <><Change change={c.change} isNew={c.direction === 'new'} unit={c.changeUnit} /><span className="muted">7D growth</span></> : <span className="muted">7D growth —</span>)}
                </span>
              </li>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
