/** Small shared pieces: metric lookup and stroke icons. */
import type { Metric } from '@/lib/metrics/types';

export const byId = (list: Metric[], id: string): Metric | undefined => list.find((m) => m.id === id);
/** A metric's value, or null when it is unavailable. */
export const v = (m: Metric | undefined): number | null => (m && m.status === 'ok' ? m.value : null);

type IconProps = { className?: string };
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const RefreshIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
);
export const EyeIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
);
export const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
);
export const ExpandIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 9V4h5" /><path d="M20 9V4h-5" /><path d="M4 15v5h5" /><path d="M20 15v5h-5" /></svg>
);
export const ChevronDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="m6 9 6 6 6-6" /></svg>
);
export const PlusIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M12 5v14" /><path d="M5 12h14" /></svg>
);
export const CheckIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base} strokeWidth={2.2}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const MenuIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M4 8h16" /><path d="M4 16h16" /></svg>
);
export const CloseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M6 6l12 12" /><path d="M18 6 6 18" /></svg>
);
export const ArrowRight = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
);
export const ArrowLeft = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} {...base}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
);

// ------------------------------------------------------------ number text

/** 1,284. Null is an em dash, never a zero. */
export const fmtN = (n: number | null, digits = 0) => (n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: digits }));
/** $3 · $3.50. Real cents, never rounded up into something bigger. */
export const fmtUsd = (n: number | null) => (n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }));
/** 33% · 4.2% (one decimal under 10). */
export const fmtPct = (p: number | null) => (p === null || !Number.isFinite(p) ? '—' : `${p > 0 && p < 10 && !Number.isInteger(p) ? p.toFixed(1) : Math.round(p)}%`);
/** 14.4 · 54.6 · 120 */
export const fmtRate = (n: number | null) => (n === null || !Number.isFinite(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: Math.abs(n) < 100 ? 1 : 0, minimumFractionDigits: Math.abs(n) < 100 ? 1 : 0 }));

/** "↑ 18%" in the positive color, "↓ 4%" in the negative one, or "New". Nothing when there is nothing honest to say. */
export function Change({ change, isNew = false, unit = '%', className = '' }: { change: number | null | undefined; isNew?: boolean; unit?: '%' | 'pts'; className?: string }) {
  if (isNew) return <span className={`chgTxt new ${className}`}>New</span>;
  if (change === null || change === undefined || !Number.isFinite(change)) return null;
  if (change === 0) return <span className={`chgTxt flat ${className}`}>0%</span>;
  const up = change > 0;
  return (
    <span className={`chgTxt ${up ? 'up' : 'down'} ${className}`}>
      <span aria-hidden="true">{up ? '↑' : '↓'}</span> {Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: Math.abs(change) < 10 ? 1 : 0 })}{unit === 'pts' ? ' pts' : '%'}
      <span className="sr"> {up ? 'up' : 'down'}</span>
    </span>
  );
}
