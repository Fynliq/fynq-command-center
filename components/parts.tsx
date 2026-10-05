'use client';

import type { ReactNode } from 'react';
import { METRICS } from '@/lib/metrics/definitions';
import type { ActivityBlock, CampaignRow, ConversionTrail, FunnelStage, Metric, RateMetric, SourceRow } from '@/lib/metrics/types';
import { formatChange, formatMetric, formatValue } from '@/lib/format';
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

// ------------------------------------------------------------ traffic → revenue

const n = (v: number) => v.toLocaleString('en-US');
const pctCell = (v: number | null) => formatValue(v, 'percent');
const money = (v: number) => formatValue(v, 'usd');

export function RateTable({ rates }: { rates: RateMetric[] }) {
  return (
    <table className="table">
      <tbody>
        {rates.map((r) => (
          <tr key={r.id}>
            <td><span className="chName">{r.label}</span><div className="tag">{r.numerator === null ? '' : `${n(r.numerator)} ${r.numeratorLabel} of ${n(r.denominator ?? 0)} ${r.denominatorLabel}`}</div></td>
            <td className="num">{r.value === null ? '—' : pctCell(r.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SourceTable({ rows }: { rows: SourceRow[] }) {
  return (
    <div className="tableWrap">
      <table className="table wide">
        <thead>
          <tr><th>Source</th><th className="num">Visitors</th><th className="num">Accounts</th><th className="num">Unique uploaders</th><th className="num">Paywall views</th><th className="num">Checkout starts</th><th className="num">Paying</th><th className="num">Revenue</th><th className="num">Visitor → Paid</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.channel} className={r.channel === 'legacy' ? 'muted' : undefined}>
              <td><span className="chName">{r.label}</span></td>
              <td className="num">{n(r.visitors)}</td>
              <td className="num">{n(r.accounts)}</td>
              <td className="num">{n(r.uploaders)}</td>
              <td className="num">{n(r.paywallViews)}</td>
              <td className="num">{n(r.checkoutStarts)}</td>
              <td className={`num${r.payingCustomers > 0 ? ' hl' : ''}`}>{n(r.payingCustomers)}</td>
              <td className={`num${r.revenue > 0 ? ' hl' : ''}`}>{money(r.revenue)}</td>
              <td className="num">{pctCell(r.visitorToPaid)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  if (!rows.length) return <div className="empty">No tagged campaigns yet. Links with utm_campaign and utm_content show up here.</div>;
  return (
    <div className="tableWrap">
      <table className="table wide">
        <thead>
          <tr><th>Source</th><th>Campaign</th><th>Content</th><th className="num">Visitors</th><th className="num">Accounts</th><th className="num">My Aid users</th><th className="num">Paywall</th><th className="num">Checkouts</th><th className="num">Payments</th><th className="num">Revenue</th><th className="num">Conversion</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.channel}|${r.source}|${r.campaign}|${r.content}`}>
              <td><span className="chName">{r.channelLabel}</span>{r.source && r.source !== r.channel ? <div className="tag">{r.source}</div> : null}</td>
              <td><span className="chName">{r.campaignLabel}</span></td>
              <td>{r.contentLabel}</td>
              <td className="num">{n(r.visitors)}</td>
              <td className="num">{n(r.accounts)}</td>
              <td className="num">{n(r.myAidUsers)}</td>
              <td className="num">{n(r.paywallViews)}</td>
              <td className="num">{n(r.checkouts)}</td>
              <td className={`num${r.payments > 0 ? ' hl' : ''}`}>{n(r.payments)}</td>
              <td className={`num${r.revenue > 0 ? ' hl' : ''}`}>{money(r.revenue)}</td>
              <td className="num">{pctCell(r.conversion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const stepTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function ConversionFeed({ trails }: { trails: ConversionTrail[] }) {
  if (!trails.length) return <div className="empty">No attributed accounts yet. They appear here as tracked visitors sign up.</div>;
  return (
    <div className="card">
      <div className="feed">
        {trails.map((t) => (
          <div className="block" key={t.ref}>
            <div className="blockDot" aria-hidden="true" />
            <div>
              <div className="convHead"><span className="chName">{t.channelLabel}</span>{t.campaign && <span> · {t.campaign}</span>}<span className="tag"> · account {t.ref}</span></div>
              <ol className="trail">
                {t.steps.map((s) => (
                  <li key={s.id}>
                    <span className={`chip${s.id === 'paid' ? ' money' : ''}`}>{s.label}<time dateTime={s.at}>{stepTime.format(new Date(s.at))}</time></span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
