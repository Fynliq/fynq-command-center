'use client';

import type { ReactNode } from 'react';
import { METRICS } from '@/lib/metrics/definitions';
import type { ActivityBlock, FunnelStage, Metric, RateMetric } from '@/lib/metrics/types';
import { formatChange, formatMetric } from '@/lib/format';
import { Ring, Sparkline } from './charts';

const definitionOf = (id: string) => (METRICS as Record<string, { definition: string }>)[id]?.definition;

export function Section({ eyebrow, title, sub, right, children }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="section" aria-label={title}>
      <div className="sectionHead">
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <h2 className="h2">{title}</h2>
          {sub && <p className="sub">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Delta({ metric, compact = false }: { metric: Metric; compact?: boolean }) {
  const change = formatChange(metric.comparison);
  if (!change || metric.status !== 'ok') return null;
  return (
    <span className={`delta ${change.direction}`}>
      <span className="chg">{change.text}</span>
      {!compact && <span>{metric.comparison?.label}</span>}
    </span>
  );
}

export function KpiCard({ metric, size = 'normal', trend, bare = false }: { metric: Metric; size?: 'big' | 'normal' | 'small'; trend?: number[]; bare?: boolean }) {
  const def = definitionOf(metric.id);
  return (
    <div className={`card kpi ${size}${size === 'big' ? ' glow' : ''}`}>
      <div className="kpiLabel">
        {metric.label}
        {def && !bare && <span className="info" title={def} aria-label={def}>i</span>}
      </div>
      <div className={`kpiValue${metric.status !== 'ok' ? ' na' : ''}`}>{formatMetric(metric, { compact: size === 'small' })}</div>
      <Delta metric={metric} />
      {metric.note && metric.status === 'ok' && <div className="kpiNote">{metric.note}</div>}
      {trend && trend.length > 1 && <Sparkline values={trend} />}
    </div>
  );
}

export function TodayStrip({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="today">
      {metrics.map((m) => (
        <div className="todayCell" key={`${m.id}-${m.label}`}>
          <div className="kpiLabel">{m.label.replace(/ Today$/, '')}</div>
          <div className={`kpiValue${m.status !== 'ok' ? ' na' : ''}`}>{formatMetric(m)}</div>
          <Delta metric={m} compact />
        </div>
      ))}
    </div>
  );
}

export function HBars({ rows, unit }: { rows: { label: string; value: number; extra?: string }[]; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <div className="empty">Nothing recorded yet</div>;
  return (
    <div className="hbars">
      {rows.map((r) => (
        <div className="hbar" key={r.label}>
          <div className="hbarTop">
            <span>{r.label}</span>
            <span>{r.value.toLocaleString('en-US')}{unit ? ` ${unit}` : ''}{r.extra ? ` · ${r.extra}` : ''}</span>
          </div>
          <div className="track"><div className="fill" style={{ width: `${(r.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Funnel({ stages }: { stages: FunnelStage[] }) {
  if (!stages.length) return <div className="empty">The funnel is unavailable right now</div>;
  // Tracked users dwarf every later step, so they lead in as a sentence and
  // the bars are scaled from accounts down.
  const lead = stages[0].id === 'tracked' ? stages[0] : null;
  const rows = lead ? stages.slice(1) : stages;
  const top = Math.max(1, rows[0]?.count ?? 1);
  return (
    <div className="funnel" role="table" aria-label="Conversion funnel">
      {lead && rows[0] && (
        <p className="fLead">
          <strong>{lead.count.toLocaleString('en-US')}</strong> tracked users → <strong>{rows[0].count.toLocaleString('en-US')}</strong> accounts
          {rows[0].fromPrevious !== null && <> · <span className="fLeadPct">{rows[0].fromPrevious < 10 ? rows[0].fromPrevious.toFixed(1) : Math.round(rows[0].fromPrevious)}%</span></>}
        </p>
      )}
      {rows.map((s, i) => {
        const width = Math.max(0.5, (s.count / top) * 100);
        return (
          <div className="fRow" role="row" key={s.id}>
            <div className="fLabel" role="cell">{s.label}</div>
            <div className="fBarWrap" role="cell" style={{ ['--w' as string]: `${width}%` }}>
              <div className={`fBar${width < 14 ? ' out' : ''}`} style={{ width: `${width}%`, animationDelay: `${i * 60}ms` }}>{width >= 14 ? s.count.toLocaleString('en-US') : ''}</div>
              {width < 14 && <span className="fCount">{s.count.toLocaleString('en-US')}</span>}
            </div>
            <div className="fPct" role="cell" title="Conversion from the previous stage">
              {s.fromPrevious === null || (lead && i === 0) ? '' : `${s.fromPrevious < 10 && s.fromPrevious > 0 ? s.fromPrevious.toFixed(1) : Math.round(s.fromPrevious)}%`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RateCard({ rate }: { rate: RateMetric }) {
  return (
    <div className="card perfCard">
      <Ring value={rate.value} />
      <div style={{ minWidth: 0 }}>
        <div className="perfLabel">{rate.label}</div>
        <div className="perfFrac">
          {rate.numerator === null || rate.denominator === null
            ? 'Unavailable'
            : `${rate.numerator.toLocaleString('en-US')} ${rate.numeratorLabel} of ${rate.denominator.toLocaleString('en-US')} ${rate.denominatorLabel}`}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ blocks }: { blocks: ActivityBlock[] }) {
  if (!blocks.length) return <div className="empty">No activity in the last 7 days</div>;
  return (
    <div className="card">
      <div className="feed">
        {blocks.map((b) => (
          <div className="block" key={b.start}>
            <div className="blockDot" aria-hidden="true" />
            <div>
              <div className="blockLabel">{b.label}</div>
              <div className="chips">
                {b.items.map((it) => <span key={it.kind} className={`chip${it.kind === 'payments' ? ' money' : ''}`}>{it.text}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
