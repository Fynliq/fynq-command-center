'use client';

import { useEffect, useState } from 'react';
import type { GrowthSeries } from '@/lib/metrics/types';
import { BarChart, LineChart } from '../charts';
import { Seg } from '../parts';

export type Range = '24h' | '7d' | '30d' | '90d' | 'all';
type Mode = 'cumulative' | 'daily';

export function sliceSeries(series: GrowthSeries, range: Range) {
  if (range === '24h') return series.hourly;
  if (range === '7d') return series.daily.slice(-7);
  if (range === '30d') return series.daily.slice(-30);
  if (range === '90d') return series.daily.slice(-90);
  return series.daily;
}

/** Tall on a desktop, still legible on a phone. */
export function useChartHeight(min = 280, max = 560, ratio = 0.34) {
  const [h, setH] = useState(420);
  useEffect(() => {
    const on = () => setH(Math.round(Math.min(max, Math.max(min, window.innerWidth * ratio))));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [min, max, ratio]);
  return h;
}

export const RANGE_TEXT: Record<Range, string> = { '24h': 'in the last 24 hours', '7d': 'in the last 7 days', '30d': 'in the last 30 days', '90d': 'in the last 90 days', all: 'since the first visitor' };
const RANGES: { value: Range; label: string }[] = [{ value: '24h', label: '24H' }, { value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: 'all', label: 'ALL' }];

/**
 * The dominant chart: tracked users, cumulative or per day. One thin line,
 * a faint wash, a hairline grid. Tooltip: "Oct 5 · +20 new users · 248 total".
 */
export function GrowthChart({ series, noun = 'users', height: fixed, ranges = RANGES }: { series: GrowthSeries; noun?: string; height?: number; ranges?: { value: Range; label: string }[] }) {
  const [mode, setMode] = useState<Mode>('cumulative');
  const [range, setRange] = useState<Range>('all');
  const auto = useChartHeight();
  const height = fixed ?? auto;
  const pts = sliceSeries(series, range);
  const added = pts.reduce((n, p) => n + p.added, 0);
  const tip = (p: { label: string; added: number; total: number }) => (
    <>
      <div className="tDate">{p.label}</div>
      <div className="tMain">+{p.added.toLocaleString('en-US')} new {noun}</div>
      <div>{p.total.toLocaleString('en-US')} total</div>
    </>
  );
  return (
    <div className="growthChart2">
      <div className="chartBar">
        <p className="muted tnum">+{added.toLocaleString('en-US')} {RANGE_TEXT[range]}</p>
        <div className="controlsRow">
          <Seg label="Date range" value={range} onChange={setRange} options={ranges} />
          <Seg label="Chart mode" value={mode} onChange={setMode} options={[{ value: 'cumulative', label: 'Cumulative' }, { value: 'daily', label: range === '24h' ? 'Hourly' : 'Daily' }]} />
        </div>
      </div>
      {mode === 'cumulative' ? (
        <LineChart
          ariaLabel={`Tracked ${noun}, cumulative, ${RANGE_TEXT[range]}`}
          area
          height={height}
          points={pts.map((p) => ({ label: p.label, values: [p.total] }))}
          series={[{ name: `Tracked ${noun}`, color: 'var(--fynq-green)' }]}
          tooltip={(_, i) => tip(pts[i])}
        />
      ) : (
        <BarChart
          ariaLabel={`New ${noun} per ${range === '24h' ? 'hour' : 'day'}, ${RANGE_TEXT[range]}`}
          height={height}
          color="var(--fynq-green)"
          points={pts.map((p) => ({ label: p.label, value: p.added }))}
          tooltip={(_, i) => tip(pts[i])}
        />
      )}
    </div>
  );
}
