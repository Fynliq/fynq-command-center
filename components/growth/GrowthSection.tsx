'use client';

import { useEffect, useState } from 'react';
import type { GrowthSeries } from '@/lib/metrics/types';
import { BarChart, LineChart } from '../charts';
import { Seg } from '../parts';
import { Reveal } from '../motion';

type Range = '24h' | '7d' | '30d' | 'all';
type Mode = 'cumulative' | 'daily';

function slice(series: GrowthSeries, range: Range) {
  if (range === '24h') return series.hourly;
  if (range === '7d') return series.daily.slice(-7);
  if (range === '30d') return series.daily.slice(-30);
  return series.daily;
}

/** Tall on a desktop, still legible on a phone. */
function useChartHeight() {
  const [h, setH] = useState(420);
  useEffect(() => {
    const on = () => setH(Math.round(Math.min(560, Math.max(280, window.innerWidth * 0.36))));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return h;
}

const RANGE_TEXT: Record<Range, string> = { '24h': 'in the last 24 hours', '7d': 'in the last 7 days', '30d': 'in the last 30 days', all: 'since the first visitor' };

export function GrowthSection({ series, title = 'Growth', subtitle = 'From zero to now.', compact = false }: { series: GrowthSeries; title?: string; subtitle?: string; compact?: boolean }) {
  const [mode, setMode] = useState<Mode>('cumulative');
  const [range, setRange] = useState<Range>('all');
  const height = useChartHeight();
  const pts = slice(series, range);
  const last = pts[pts.length - 1];
  const added = pts.reduce((n, p) => n + p.added, 0);
  const tip = (p: { label: string; added: number; total: number }) => (
    <>
      <div className="tDate">{p.label}</div>
      <div className="tMain">+{p.added.toLocaleString('en-US')} new</div>
      <div>{p.total.toLocaleString('en-US')} total</div>
    </>
  );

  const body = (
    <>
      <div className="growthHead">
        <div>
          {!compact && <p className="kicker lime">Tracked users</p>}
          <h2 id="growth-title" className={compact ? 'headline' : 'title'} style={{ marginTop: compact ? 0 : 14 }}>{title}</h2>
          <p className="lede" style={{ marginTop: 10 }}>{subtitle}</p>
          <div className="growthNow">
            <b className="tnum">{(last?.total ?? 0).toLocaleString('en-US')}</b>
            <span className="tnum">+{added.toLocaleString('en-US')} {RANGE_TEXT[range]}</span>
          </div>
        </div>
        <div className="controlsRow">
          <Seg label="Date range" value={range} onChange={setRange} options={[{ value: '24h', label: '24H' }, { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: 'all', label: 'ALL' }]} />
          <Seg label="Chart mode" value={mode} onChange={setMode} options={[{ value: 'cumulative', label: 'Cumulative' }, { value: 'daily', label: range === '24h' ? 'Hourly' : 'Daily' }]} />
        </div>
      </div>
      <div className="growthChart">
        {mode === 'cumulative' ? (
          <LineChart
            ariaLabel={`Tracked users, cumulative, ${RANGE_TEXT[range]}`}
            area
            height={compact ? Math.min(height, 360) : height}
            points={pts.map((p) => ({ label: p.label, values: [p.total] }))}
            series={[{ name: 'Tracked users', color: 'var(--lime)' }]}
            tooltip={(_, i) => tip(pts[i])}
          />
        ) : (
          <BarChart
            ariaLabel={`New tracked users per ${range === '24h' ? 'hour' : 'day'}, ${RANGE_TEXT[range]}`}
            height={compact ? Math.min(height, 360) : height}
            points={pts.map((p) => ({ label: p.label, value: p.added }))}
            tooltip={(_, i) => tip(pts[i])}
          />
        )}
      </div>
    </>
  );

  if (compact) return <div className="card" style={{ padding: 'clamp(22px, 3vw, 36px)' }}>{body}</div>;
  return (
    <section id="growth" className="stage" aria-labelledby="growth-title">
      <Reveal className="wrap">{body}</Reveal>
    </section>
  );
}
