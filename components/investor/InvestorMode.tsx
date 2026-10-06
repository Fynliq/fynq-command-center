'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/metrics/types';
import { syncedAt } from '@/lib/format';
import { GrowthChart } from '../growth/GrowthSection';
import { Journey } from '../funnel/Journey';
import { MetricNumber } from '../motion';
import { ArrowLeft, ArrowRight, byId, fmtN, fmtPct, v } from '../ui';

/**
 * Investor View: the company in seven slides. Only headline numbers and
 * the history — no controls, errors, definitions or internal names.
 * Presentation Mode hides the navigation, fills the screen, enlarges the
 * type, and moves between slides with the arrow keys (Esc to leave).
 */
export function InvestorMode({ d, presenting, onPresent }: { d: DashboardData; presenting: boolean; onPresent: (on: boolean) => void }) {
  const slides = useRef<(HTMLElement | null)[]>([]);
  const [current, setCurrent] = useState(0);

  const n30 = v(byId(d.secondary, 'newTracked30d'));
  const n7 = byId(d.secondary, 'newTracked7d');
  const r = d.story.retention;

  const content: { id: string; node: React.ReactNode }[] = [
    {
      id: 'cover',
      node: (
        <div className="slideCover">
          <img src="/fynq-logo.png" alt="" width={72} height={72} />
          <p className="label">FYNQ · Live company growth</p>
          <p className="slideHuge"><MetricNumber value={d.story.moment.total} /></p>
          <p className="slideSub">tracked users</p>
        </div>
      ),
    },
    {
      id: 'growth',
      node: (
        <div className="slideWide">
          <p className="label">Growth</p>
          <h2 className="slideTitle">+{fmtN(n30)} <span className="soft">in the last 30 days.</span></h2>
          {typeof n7?.comparison?.change === 'number' && <p className="slideSub tnum">+{fmtN(v(n7))} in 7 days · {n7.comparison.change >= 0 ? '↑' : '↓'} {Math.abs(n7.comparison.change).toFixed(0)}% on the week before</p>}
          <div className="slideChart"><GrowthChart series={d.growth.tracked} height={presenting ? 460 : 380} ranges={[{ value: '30d', label: '30D' }, { value: '90d', label: '90D' }, { value: 'all', label: 'ALL' }]} /></div>
        </div>
      ),
    },
    { id: 'users', node: <Pair label="Users" a={{ v: v(byId(d.primary, 'mau')), l: 'Monthly active users' }} b={{ v: v(byId(d.primary, 'accounts')), l: 'Accounts' }} /> },
    { id: 'product', node: <Pair label="Product" a={{ v: v(byId(d.uploads.metrics, 'uniqueUploaders')), l: 'Uploaders' }} b={{ v: v(byId(d.uploads.metrics, 'successfulFiles')), l: 'Files processed' }} /> },
    { id: 'revenue', node: <Pair label="Revenue" a={{ v: v(byId(d.primary, 'paidCustomers')), l: 'Paying customers' }} b={{ v: v(byId(d.primary, 'realRevenue')), l: 'Revenue', usd: true }} /> },
    {
      id: 'conversion',
      node: (
        <div className="slideWide">
          <p className="label">Conversion</p>
          <h2 className="slideTitle">{fmtPct(d.story.journey[1]?.fromPrevious ?? null)} <span className="soft">of visitors create an account.</span></h2>
          <Journey stages={d.story.journey} compact />
        </div>
      ),
    },
    { id: 'retention', node: <Pair label="Retention" a={{ v: r.returningPct, l: 'Accounts that came back', pct: true }} b={{ v: r.wau, l: 'Active in the last 7 days' }} /> },
  ];

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(content.length - 1, i));
    slides.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrent(n);
  }, [content.length]);

  // Which slide is on screen.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setCurrent(Number((e.target as HTMLElement).dataset.i));
    }, { threshold: 0.55 });
    slides.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea')) return;
      if (e.key === 'Escape') onPresent(false);
      // Left/right always move a slide; up/down, page keys and space only while presenting (otherwise they scroll).
      else if (e.key === 'ArrowRight' || (presenting && (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' '))) { e.preventDefault(); go(current + 1); }
      else if (e.key === 'ArrowLeft' || (presenting && (e.key === 'ArrowUp' || e.key === 'PageUp'))) { e.preventDefault(); go(current - 1); }
    };
    const onFs = () => { if (!document.fullscreenElement) onPresent(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [current, go, onPresent, presenting]);

  return (
    <main className={`inv2${presenting ? ' presenting' : ''}`} id="top">
      {content.map((c, i) => (
        <section key={c.id} className="slide" data-i={i} ref={(el) => { slides.current[i] = el; }} aria-label={c.id}>
          <div className="container slideIn">{c.node}</div>
        </section>
      ))}
      <p className="invFoot2">FYNQ · live figures as of {syncedAt(d.generatedAt)} Central Time</p>
      <nav className="slideNav" aria-label="Slides">
        <button type="button" className="iconBtn" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Previous slide"><ArrowLeft /></button>
        <span className="tnum">{current + 1} / {content.length}</span>
        <button type="button" className="iconBtn" onClick={() => go(current + 1)} disabled={current === content.length - 1} aria-label="Next slide"><ArrowRight /></button>
        {presenting && <button type="button" className="navBtn" onClick={() => onPresent(false)}>Exit</button>}
      </nav>
    </main>
  );
}

function Pair({ label, a, b }: { label: string; a: { v: number | null; l: string; usd?: boolean; pct?: boolean }; b: { v: number | null; l: string; usd?: boolean; pct?: boolean } }) {
  return (
    <div className="slidePair">
      <p className="label">{label}</p>
      <div className="pairRow">
        {[a, b].map((x) => (
          <div key={x.l}>
            <p className="slideBig"><MetricNumber value={x.v} format={x.usd ? 'usd' : x.pct ? 'percent' : 'count'} decimals={x.pct ? 0 : undefined} /></p>
            <p className="slideSub">{x.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
