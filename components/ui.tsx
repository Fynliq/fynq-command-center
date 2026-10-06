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
