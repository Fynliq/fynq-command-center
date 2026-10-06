'use client';

import { useEffect } from 'react';
import type { DashboardData } from '@/lib/metrics/types';
import { syncedAt } from '@/lib/format';
import { GrowthSection } from '../growth/GrowthSection';
import { MetricNumber } from '../motion';
import { byId, ExpandIcon, v } from '../ui';

const pct = (n: number) => `${n < 10 && n > 0 ? n.toFixed(1) : Math.round(n)}%`;

/**
 * Screenshot-ready: headline numbers, growth and the funnel. No controls,
 * definitions, errors or internal names. Presentation mode goes full screen.
 */
export function InvestorMode({ d, presenting, onPresent, onExit }: { d: DashboardData; presenting: boolean; onPresent: (on: boolean) => void; onExit: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onPresent(false); };
    const onFs = () => { if (!document.fullscreenElement) onPresent(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [onPresent]);

  const n7 = byId(d.secondary, 'newTracked7d');
  const n30 = byId(d.secondary, 'newTracked30d');
  const change7 = n7?.comparison?.change;
  const cells = [
    { label: 'Tracked users', m: byId(d.primary, 'trackedUsers') },
    { label: 'Monthly active users', m: byId(d.primary, 'mau') },
    { label: 'Accounts', m: byId(d.primary, 'accounts') },
    { label: 'Unique uploaders', m: byId(d.uploads.metrics, 'uniqueUploaders') },
    { label: 'Files processed', m: byId(d.uploads.metrics, 'successfulFiles') },
    { label: 'Paying customers', m: byId(d.primary, 'paidCustomers') },
    { label: 'Revenue', m: byId(d.primary, 'realRevenue') },
  ];

  return (
    <main className="inv" id="top">
      <div className="wrap">
        <div className="invHead">
          <div className="invBrand">
            <img src="/fynq-logo.png" alt="" width={56} height={56} />
            <div>
              <h1 className="headline" style={{ fontSize: 'clamp(34px, 4vw, 52px)' }}>FYNQ</h1>
              <p className="lede" style={{ fontSize: 18, marginTop: 4 }}>Live company growth</p>
            </div>
          </div>
          <div className="invControls footActions">
            <button type="button" className="navBtn" onClick={() => onPresent(!presenting)}><ExpandIcon />{presenting ? 'Exit presentation' : 'Full Screen Presentation'}</button>
            <button type="button" className="navBtn" onClick={onExit}>Exit Investor View</button>
          </div>
        </div>

        <div className="invGrid">
          {cells.map((c) => (
            <div className="invCell" key={c.label}>
              <b><MetricNumber value={v(c.m)} format={c.m?.format ?? 'count'} /></b>
              <span>{c.label}</span>
            </div>
          ))}
          <div className="invCell">
            <b className="tnum">{v(n7) === null ? '—' : `+${(v(n7) as number).toLocaleString('en-US')}`}</b>
            <span>New users, 7 days</span>
            {typeof change7 === 'number' && <small>{change7 >= 0 ? '↑' : '↓'} {Math.abs(change7).toLocaleString('en-US', { maximumFractionDigits: 1 })}% vs prior 7 days</small>}
            {v(n30) !== null && <small style={{ color: 'var(--tx-2)', fontWeight: 500 }}>+{(v(n30) as number).toLocaleString('en-US')} in 30 days</small>}
          </div>
        </div>

        <div className="invTwo">
          <GrowthSection series={d.growth.tracked} title="Growth" subtitle="Tracked users since launch." compact />
          <div className="card">
            <p className="headline" style={{ fontSize: 'clamp(24px, 2.4vw, 32px)' }}>Conversion</p>
            <ol className="jSteps" style={{ marginTop: 10 }}>
              {d.story.journey.map((s, i) => (
                <li key={s.id} className={`jStep${i === d.story.journey.length - 1 ? ' final' : ''}`} style={{ padding: '14px 0' }}>
                  <div>
                    <span className="lab" style={{ fontSize: 17 }}>{s.label}</span>
                    {s.fromPrevious !== null && <span className="unit">{pct(s.fromPrevious)} of the step before</span>}
                  </div>
                  <div className="n" style={{ fontSize: 'clamp(32px, 3.4vw, 48px)' }}><MetricNumber value={s.count} /></div>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <p className="invFoot">FYNQ · live figures as of {syncedAt(d.generatedAt)} Central Time · paying customers and revenue are live payments only</p>
      </div>
    </main>
  );
}
