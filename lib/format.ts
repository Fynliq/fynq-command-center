import type { Comparison, Metric, MetricFormat } from './metrics/types';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** 1,284 · 12.9K · $4,200 · $1 · 92% — never "NaN", never a made-up zero. */
export function formatValue(value: number | null, format: MetricFormat, opts: { compact?: boolean } = {}): string {
  if (value === null || !Number.isFinite(value)) return '—';
  switch (format) {
    case 'usd':
      return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 });
    case 'percent':
      return `${value < 10 && !Number.isInteger(value) ? value.toFixed(1) : Math.round(value)}%`;
    case 'ratio':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    default:
      return opts.compact && Math.abs(value) >= 10_000 ? compact.format(value) : value.toLocaleString('en-US');
  }
}

export const formatMetric = (m: Metric, opts?: { compact?: boolean }) => (m.status === 'unavailable' ? 'Unavailable' : formatValue(m.value, m.format, opts));

/** "↑ 18%", "↓ 2.5 pts", "New", or null when there is nothing honest to say. */
export function formatChange(c: Comparison | null): { text: string; direction: Comparison['direction'] } | null {
  if (!c) return null;
  if (c.direction === 'new') return { text: 'New', direction: 'new' };
  if (c.change === null) return { text: 'No change', direction: 'flat' };
  if (c.change === 0) return { text: '0%', direction: 'flat' };
  const arrow = c.change > 0 ? '↑' : '↓';
  return { text: `${arrow} ${Math.abs(c.change).toLocaleString('en-US', { maximumFractionDigits: 1 })}${c.changeUnit === 'pts' ? ' pts' : '%'}`, direction: c.direction };
}

const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' });
export const syncedAt = (iso: string) => timeFmt.format(new Date(iso));
