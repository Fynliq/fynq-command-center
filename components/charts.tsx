'use client';

/**
 * Hand-built SVG charts: area/line with a crosshair, columns with per-bar
 * hover, a two-series line, a sparkline and a progress ring.
 *
 * Specs (see the dataviz guidance): 2px lines, area wash ~12%, columns at
 * most 24px wide with 4px rounded tops, hairline grid, mono axis numerals,
 * one tooltip listing every series at the hovered X, values leading.
 * Charts never scroll sideways: they measure their container and fit it.
 * touch-action: pan-y keeps vertical page scrolling while a horizontal drag
 * scrubs the chart.
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

function useWidth<T extends HTMLElement>(fallback = 640, min = 240) {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(min, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, width] as const;
}

/** Clean axis ticks: 0, 50, 100… never 0, 37, 74. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

const tickText = (v: number, money?: boolean) => {
  const s = Math.abs(v) >= 1000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k` : v.toLocaleString('en-US', { maximumFractionDigits: 1 });
  return money ? `$${s}` : s;
};

/** Smooth path through points (monotone-ish cubic, no overshoot below zero). */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    const c1y = Math.min(hi, Math.max(lo, p1.y + (p2.y - p0.y) * t));
    const c2y = Math.min(hi, Math.max(lo, p2.y - (p3.y - p1.y) * t));
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

export interface SeriesPoint { label: string; values: number[] }
export interface SeriesSpec { name: string; color: string }

interface LineChartProps {
  points: SeriesPoint[];
  series: SeriesSpec[];
  height?: number;
  /** Area wash under the first series (single-series charts). */
  area?: boolean;
  money?: boolean;
  ariaLabel: string;
  tooltip: (p: SeriesPoint, index: number) => ReactNode;
}

/** Line / area chart with a snapping crosshair and one tooltip for every series. */
export function LineChart({ points, series, height = 260, area = false, money = false, ariaLabel, tooltip }: LineChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, '');
  const pad = { top: 12, right: 12, bottom: 26, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const max = Math.max(1, ...points.flatMap((p) => p.values));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1] || 1;
  const x = (i: number) => pad.left + (points.length <= 1 ? w / 2 : (i / (points.length - 1)) * w);
  const y = (v: number) => pad.top + h - (v / top) * h;
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 78))));

  const paths = series.map((_, s) => smoothPath(points.map((p, i) => ({ x: x(i), y: y(p.values[s] ?? 0) }))));

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el || !points.length) return;
    const rel = clientX - el.getBoundingClientRect().left - pad.left;
    const i = Math.round((rel / Math.max(1, w)) * (points.length - 1));
    setHover(Math.max(0, Math.min(points.length - 1, i)));
  };

  if (!points.length) return <div className="empty">No data in this range yet</div>;
  const hx = hover === null ? 0 : x(hover);
  const tipLeft = Math.min(Math.max(hx, 80), width - 80);

  return (
    <div
      ref={ref}
      className="chart"
      style={{ height }}
      onPointerMove={(e) => onMove(e.clientX)}
      onPointerDown={(e) => onMove(e.clientX)}
      onPointerLeave={() => setHover(null)}
      tabIndex={0}
      role="img"
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') setHover((h0) => Math.min(points.length - 1, (h0 ?? -1) + 1));
        if (e.key === 'ArrowLeft') setHover((h0) => Math.max(0, (h0 ?? points.length) - 1));
      }}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} key={`${points.length}-${points[0]?.label}`}>
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={series[0].color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={series[0].color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={pad.left - 8} y={y(t) + 4} textAnchor="end">{tickText(t, money)}</text>
          </g>
        ))}
        {points.map((p, i) => (i === points.length - 1 || (i % labelEvery === 0 && points.length - 1 - i >= labelEvery)) ? (
          <text key={i} className="axis" x={x(i)} y={height - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>{p.label}</text>
        ) : null)}
        {area && paths[0] && (
          <path className="fade" d={`${paths[0]} L${x(points.length - 1)},${pad.top + h} L${x(0)},${pad.top + h} Z`} fill={`url(#fill-${gid})`} />
        )}
        {paths.map((d, s) => <path key={s} className="line draw" d={d} stroke={series[s].color} pathLength={1} />)}
        {/* End dots: the latest value of each series. */}
        {series.map((sp, s) => (
          <circle key={s} cx={x(points.length - 1)} cy={y(points[points.length - 1].values[s] ?? 0)} r={4} fill={sp.color} stroke="var(--card-solid)" strokeWidth={2} />
        ))}
        {hover !== null && (
          <g>
            <line className="cross" x1={hx} x2={hx} y1={pad.top} y2={pad.top + h} />
            {series.map((sp, s) => (
              <circle key={s} cx={hx} cy={y(points[hover].values[s] ?? 0)} r={5} fill={sp.color} stroke="var(--card-solid)" strokeWidth={2} />
            ))}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: tipLeft, top: Math.max(56, y(Math.max(...points[hover].values))) }}>{tooltip(points[hover], hover)}</div>
      )}
    </div>
  );
}

interface BarChartProps {
  points: { label: string; value: number }[];
  color?: string;
  height?: number;
  ariaLabel: string;
  tooltip: (p: { label: string; value: number }, index: number) => ReactNode;
}

/** Columns from one baseline; the hovered column lifts, the rest dim. */
export function BarChart({ points, color = 'var(--lime)', height = 220, ariaLabel, tooltip }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 26, left: 36 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(1, ...points.map((p) => p.value)));
  const top = ticks[ticks.length - 1] || 1;
  const slot = w / Math.max(1, points.length);
  const barW = Math.max(2, Math.min(24, slot - 2));
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(w / 70))));
  if (!points.length) return <div className="empty">No data in this range yet</div>;

  const onMove = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const i = Math.floor((clientX - el.getBoundingClientRect().left - pad.left) / slot);
    setHover(i >= 0 && i < points.length ? i : null);
  };
  const bx = (i: number) => pad.left + i * slot + (slot - barW) / 2;

  return (
    <div ref={ref} className="chart" style={{ height }} onPointerMove={(e) => onMove(e.clientX)} onPointerDown={(e) => onMove(e.clientX)} onPointerLeave={() => setHover(null)} role="img" aria-label={ariaLabel}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={pad.left} x2={width - pad.right} y1={pad.top + h - (t / top) * h} y2={pad.top + h - (t / top) * h} />
            <text className="axis" x={pad.left - 8} y={pad.top + h - (t / top) * h + 4} textAnchor="end">{tickText(t)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const bh = (p.value / top) * h;
          const r = Math.min(4, barW / 2, bh);
          const x0 = bx(i);
          const y0 = pad.top + h - bh;
          // Rounded data-end, square at the baseline.
          const d = bh <= 0 ? '' : `M${x0},${pad.top + h} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} L${x0 + barW - r},${y0} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} L${x0 + barW},${pad.top + h} Z`;
          return d ? <path key={i} className={`bar fade${hover !== null && hover !== i ? ' dim' : ''}`} d={d} fill={color} /> : null;
        })}
        {points.map((p, i) => (i % labelEvery === 0 ? <text key={`l${i}`} className="axis" x={bx(i) + barW / 2} y={height - 6} textAnchor="middle">{p.label}</text> : null))}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: Math.min(Math.max(bx(hover) + barW / 2, 80), width - 80), top: Math.max(56, pad.top + h - (points[hover].value / top) * h) }}>{tooltip(points[hover], hover)}</div>
      )}
    </div>
  );
}

/** A 12-point trend under a stat; no axes, no hover (the card carries the number). */
export function Sparkline({ values, color = 'var(--lime)' }: { values: number[]; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(120, 40);
  const gid = useId().replace(/:/g, '');
  if (values.length < 2) return <div className="spark" />;
  const h = 34;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * (width - 4) + 2, y: h - 3 - (v / max) * (h - 8) }));
  const d = smoothPath(pts);
  return (
    <div ref={ref} className="spark" aria-hidden="true">
      <svg width={width} height={h}>
        <defs>
          <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
        </defs>
        <path d={`${d} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`} fill={`url(#sp-${gid})`} />
        <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** A percentage as a ring. Null shows an empty ring and a dash. */
export function Ring({ value }: { value: number | null }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <svg className="ring" viewBox="0 0 76 76" role="img" aria-label={value === null ? 'Not enough data' : `${Math.round(v)} percent`}>
      <circle className="bg" cx="38" cy="38" r={r} />
      <circle className="fg" cx="38" cy="38" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} transform="rotate(-90 38 38)" />
      <text x="38" y="43" textAnchor="middle">{value === null ? '—' : `${v < 10 && !Number.isInteger(v) ? v.toFixed(1) : Math.round(v)}%`}</text>
    </svg>
  );
}
