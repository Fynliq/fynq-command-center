'use client';

import type { DashboardData, Metric } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { byId, v } from '../ui';

function Cell({ m, label, note }: { m: Metric | undefined; label: string; note?: string }) {
  return (
    <div className="revCell">
      <b><MetricNumber value={v(m)} format={m?.format ?? 'count'} decimals={m?.format === 'usd' ? 2 : undefined} /></b>
      <span>{label}</span>
      {v(m) === null ? <small>Data temporarily unavailable</small> : note && <small>{note}</small>}
    </div>
  );
}

/** Live money only. Exclusions happen on the server before these numbers exist. */
export function RevenueSection({ d }: { d: DashboardData }) {
  const revenue = byId(d.primary, 'realRevenue');
  const paywall: Metric = { id: 'paywallConversion', label: 'Paywall conversion', value: d.story.paywallConversion, format: 'percent', comparison: null, status: d.story.paywallConversion === null ? 'unavailable' : 'ok' };
  return (
    <section id="revenue" className="stage revenue" aria-labelledby="revenue-title">
      <div className="wrap">
        <Reveal>
          <p className="kicker lime">Monetization</p>
          <p className="revenueNum" aria-label="Real revenue"><MetricNumber value={v(revenue)} format="usd" decimals={2} unavailableNote /></p>
          <h2 id="revenue-title" className="headline">Real customers.<br />Real revenue.</h2>
        </Reveal>
        <Reveal className="revGrid" delay={80}>
          <Cell m={byId(d.primary, 'paidCustomers')} label="Paid customers" />
          <Cell m={byId(d.revenue.windows, 'revenueToday')} label="Revenue today" />
          <Cell m={byId(d.revenue.windows, 'revenue7d')} label="Revenue, 7 days" />
          <Cell m={byId(d.revenue.windows, 'revenue30d')} label="Revenue, 30 days" />
          <Cell m={byId(d.revenue.windows, 'revenueAll')} label="All-time revenue" />
          <Cell m={byId(d.revenue.metrics, 'checkoutCreated')} label="Checkouts created" note="events" />
          <Cell m={byId(d.revenue.metrics, 'checkoutCompleted')} label="Checkouts completed" note="events" />
          <Cell m={byId(d.revenue.metrics, 'paymentConfirmed')} label="Payments confirmed" note="verified by Stripe" />
          <Cell m={paywall} label="Paywall conversion" note="paid ÷ saw the paywall" />
        </Reveal>
        <p className="revNote">Live Stripe payments only. Test-mode payments, test accounts and the founder&rsquo;s own accounts are removed on the server before any number is calculated.</p>
      </div>
    </section>
  );
}
