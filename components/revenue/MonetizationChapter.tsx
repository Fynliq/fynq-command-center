'use client';

import { useState } from 'react';
import type { DashboardData } from '@/lib/metrics/types';
import { BarChart, LineChart } from '../charts';
import { useChartHeight } from '../growth/GrowthSection';
import { MetricNumber, Reveal } from '../motion';
import { Seg } from '../parts';
import { byId, fmtN, fmtPct, fmtUsd, v } from '../ui';
import { Block } from '../sections/Chapter';

type Range = '7d' | '30d' | '90d' | 'all';
type Mode = 'daily' | 'cumulative' | 'customers';

/**
 * 04 Monetization. Live money only (test mode and excluded accounts are
 * removed on the server). The charts never stretch a small number: the
 * axis tops out at $10 or 5 customers at least, so $3 is drawn as $3.
 */
export function MonetizationChapter({ d }: { d: DashboardData }) {
  const [range, setRange] = useState<Range>('all');
  const [mode, setMode] = useState<Mode>('cumulative');
  const height = useChartHeight(240, 420, 0.28);
  const revenue = v(byId(d.primary, 'realRevenue'));
  const customers = v(byId(d.primary, 'paidCustomers'));
  const series = d.story.revenueSeries;
  const pts = range === '7d' ? series.slice(-7) : range === '30d' ? series.slice(-30) : range === '90d' ? series.slice(-90) : series;
  const stages = d.story.paymentFunnel.stages;
  const drop = d.story.paymentFunnel.biggestDrop;
  const windows = d.revenue.windows;
  const tip = (i: number) => (
    <>
      <div className="tDate">{pts[i].label}</div>
      <div className="tMain">{fmtUsd(pts[i].revenue)} that day</div>
      <div>{fmtUsd(pts[i].cumulative)} total · {fmtN(pts[i].customers)} {pts[i].customers === 1 ? 'customer' : 'customers'}</div>
    </>
  );

  return (
    <section id="monetization" className="chapter money" aria-labelledby="monetization-title">
      <div className="chapterTag" aria-hidden="true"><div className="container"><span className="num tnum">04</span><span className="nm">Monetization</span></div></div>
      <div className="moneyHero">
        <div className="container">
          <Reveal className="moneyHeroIn">
            <p className="eyebrowTag"><span className="tnum">04</span>Monetization</p>
            <p className="label moneyEyebrow">Revenue</p>
            <h2 id="monetization-title" className="moneyBig"><MetricNumber value={revenue} format="usd" decimals={2} unavailableNote /></h2>
            <p className="moneySub tnum">{customers === null ? '—' : `${fmtN(customers)} real ${customers === 1 ? 'customer' : 'customers'}`}</p>
            <ul className="moneyWindows">
              {windows.map((w) => (
                <li key={w.id}><span>{w.id === 'revenueToday' ? 'Today' : w.id === 'revenue7d' ? '7 days' : w.id === 'revenue30d' ? '30 days' : 'All time'}</span><b className="tnum">{fmtUsd(v(w))}</b></li>
              ))}
            </ul>
            <p className="muted small">Live payments only. Test-mode and founder/test accounts are excluded on the server.</p>
          </Reveal>
        </div>
      </div>

      <div className="container">
        <Block label="Payment funnel" right={<p className="muted small">Accounts at each step · all time</p>}>
          <ol className="payFunnel">
            {stages.map((s, i) => {
              const isDrop = drop !== null && s.label === drop.to;
              const top = stages[0].count;
              const width = s.count === null || !top ? 0 : Math.max(0.6, (s.count / top) * 100);
              return (
                <li key={s.id} className={isDrop ? 'drop' : undefined}>
                  <span className="pfLabel">{s.label}</span>
                  <span className="pfBar" aria-hidden="true"><i style={{ width: `${Math.min(100, width)}%` }} /></span>
                  <span className="pfN tnum">{fmtN(s.count)}</span>
                  <span className="pfPct tnum">{i === 0 ? '' : s.fromPrevious === null || s.fromPrevious > 100 ? '—' : fmtPct(s.fromPrevious)}</span>
                </li>
              );
            })}
          </ol>
          {drop && (
            <p className="dropNote">
              <span className="label">Largest drop-off</span>
              <span>{drop.from} → {drop.to}</span>
              <span className="tnum muted">{fmtN(drop.lost)} {drop.lost === 1 ? 'account' : 'accounts'} · {fmtPct(drop.pct)} of the step before</span>
            </p>
          )}
        </Block>

        <Block
          label="Revenue timeline"
          right={
            <div className="controlsRow">
              <Seg label="Revenue range" value={range} onChange={setRange} options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: 'all', label: 'ALL' }]} />
              <Seg label="Revenue measure" value={mode} onChange={setMode} options={[{ value: 'daily', label: 'Daily' }, { value: 'cumulative', label: 'Cumulative' }, { value: 'customers', label: 'Customers' }]} />
            </div>
          }
        >
          {mode === 'daily' ? (
            <BarChart ariaLabel="Revenue per day" money minTop={10} height={height} color="var(--fynq-green)" points={pts.map((p) => ({ label: p.label, value: p.revenue }))} tooltip={(_, i) => tip(i)} />
          ) : (
            <LineChart
              ariaLabel={mode === 'customers' ? 'Paying customers over time' : 'Cumulative revenue'}
              area
              money={mode === 'cumulative'}
              minTop={mode === 'customers' ? 5 : 10}
              height={height}
              points={pts.map((p) => ({ label: p.label, values: [mode === 'customers' ? p.customers : p.cumulative] }))}
              series={[{ name: mode === 'customers' ? 'Customers' : 'Revenue', color: 'var(--fynq-green)' }]}
              tooltip={(_, i) => tip(i)}
            />
          )}
        </Block>
      </div>
    </section>
  );
}
