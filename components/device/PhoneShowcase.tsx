'use client';

import { useEffect, useRef } from 'react';
import { MetricNumber, prefersReducedMotion, Reveal } from '../motion';
import { fmtN } from '../ui';

export interface PhoneMetrics {
  trackedUsers: number | null;
  newUsersToday: number | null;
  accounts: number | null;
  uploaders: number | null;
  paidCustomers: number | null;
  revenue: number | null;
  /** Cumulative tracked users per day, oldest first. */
  growthHistory: number[];
}

/** A path through the history, scaled into a 100 x 40 box. */
function miniPath(values: number[]): { line: string; area: string } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((val, i) => [(i / (values.length - 1)) * 100, 38 - ((val - min) / span) * 34] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return { line, area: `${line} L100,40 L0,40 Z` };
}

/** The FYNQ mobile dashboard, drawn from the same live numbers as the page. Not a screenshot. */
export function PhoneScreen({ metrics }: { metrics: PhoneMetrics }) {
  const chart = miniPath(metrics.growthHistory);
  return (
    <div className="ps" aria-label="FYNQ Command Center on a phone, live numbers">
      <div className="psTop">
        <span className="psBrand"><img src="/fynq-logo.png" alt="" />FYNQ</span>
        <span className="psLive"><i aria-hidden="true" />LIVE</span>
      </div>
      <div className="psHero">
        <div className="psLabel">Tracked users</div>
        <div className="psBig"><MetricNumber value={metrics.trackedUsers} /></div>
        {metrics.newUsersToday !== null && <span className="psUp tnum">+{fmtN(metrics.newUsersToday)} today</span>}
      </div>
      <div className="psChart">
        {chart ? (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="psFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8f04a" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#b8f04a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={chart.area} fill="url(#psFill)" />
            <path d={chart.line} fill="none" stroke="#b8f04a" strokeWidth="1.25" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        ) : <svg viewBox="0 0 100 40" aria-hidden="true" />}
        <p><span>30 days</span><span>Growth</span></p>
      </div>
      <div className="psList">
        <div><span>Accounts</span><b><MetricNumber value={metrics.accounts} /></b></div>
        <div><span>Uploaders</span><b><MetricNumber value={metrics.uploaders} /></b></div>
        <div><span>Customers</span><b><MetricNumber value={metrics.paidCustomers} /></b></div>
        <div><span>Revenue</span><b><MetricNumber value={metrics.revenue} format="usd" /></b></div>
      </div>
      <div className="psHome" aria-hidden="true" />
    </div>
  );
}

/**
 * An original device (CSS only, no photography, no third-party marks): a
 * slim slab with even hairline bezels and a single pinhole camera. It
 * starts slightly turned and settles flat, a touch larger and brighter, as
 * it scrolls into the middle of the screen. No spinning.
 */
export function PhoneShowcase({ metrics }: { metrics: PhoneMetrics }) {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    if (prefersReducedMotion()) { el.style.setProperty('--p', '1'); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 while the device's top is at the bottom edge; 1 once its middle reaches the middle of the screen.
      const p = Math.min(1, Math.max(0, (vh - r.top) / Math.max(1, (vh + r.height) / 2)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <section id="device" className="device2" aria-labelledby="device-title">
      <div className="container deviceGrid">
        <Reveal className="deviceText">
          <p className="label">Mobile</p>
          <h2 id="device-title" className="sectionTitle">The company,<br /><span className="soft">in your hand.</span></h2>
          <p className="lead">The same live numbers, on the same refresh, built for a phone.</p>
        </Reveal>
        <div className="deviceStage" ref={stage}>
          <div className="dev">
            <div className="devShadow" aria-hidden="true" />
            <div className="devBody">
              <span className="devKey k1" aria-hidden="true" />
              <span className="devKey k2" aria-hidden="true" />
              <div className="devScreen">
                <span className="devCam" aria-hidden="true" />
                <PhoneScreen metrics={metrics} />
                <span className="devGlare" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
