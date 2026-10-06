'use client';

import { useEffect, useRef } from 'react';
import { MetricNumber, prefersReducedMotion, Reveal } from '../motion';

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

/** A smooth path through the history, scaled into a 100 x 40 box. */
function miniPath(values: number[]): { line: string; area: string } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const pts = values.map((val, i) => [(i / (values.length - 1)) * 100, 38 - ((val - min) / span) * 34] as const);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return { line, area: `${line} L100,40 L0,40 Z` };
}

/** The FYNQ app as it would look on a phone, drawn from the live numbers. */
export function PhoneScreen({ metrics }: { metrics: PhoneMetrics }) {
  const chart = miniPath(metrics.growthHistory);
  return (
    <div className="ps" aria-label="FYNQ Command Center on a phone, live numbers">
      <div className="psTop">
        <span className="psBrand"><img src="/fynq-logo.png" alt="" />FYNQ</span>
        <span className="psLive"><i aria-hidden="true" />LIVE</span>
      </div>
      <div className="psHero">
        <div className="psBig"><MetricNumber value={metrics.trackedUsers} /></div>
        <div className="psLabel">Tracked users</div>
        {metrics.newUsersToday !== null && <span className="psUp">+{metrics.newUsersToday.toLocaleString('en-US')} today</span>}
      </div>
      <div className="psGrid">
        <div className="psCard"><b><MetricNumber value={metrics.accounts} /></b><span>Accounts</span></div>
        <div className="psCard"><b><MetricNumber value={metrics.uploaders} /></b><span>Uploaders</span></div>
        <div className="psCard"><b><MetricNumber value={metrics.paidCustomers} /></b><span>Paid customers</span></div>
        <div className="psCard"><b><MetricNumber value={metrics.revenue} format="usd" /></b><span>Revenue</span></div>
      </div>
      <div className="psChart">
        <p><span>Growth</span><span>30 days</span></p>
        {chart ? (
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="psFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b8f04a" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#b8f04a" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={chart.area} fill="url(#psFill)" />
            <path d={chart.line} fill="none" stroke="#b8f04a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        ) : <svg viewBox="0 0 100 40" aria-hidden="true" />}
      </div>
    </div>
  );
}

/** An original device render (CSS only, no photography) holding the live app. */
export function IPhoneShowcase({ metrics }: { metrics: PhoneMetrics }) {
  const phone = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = phone.current;
    if (!el) return;
    if (prefersReducedMotion() || window.matchMedia('(max-width: 600px)').matches) { el.style.setProperty('--p', '1'); return; }
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 while the phone's top is at the bottom of the screen, 1 once it has risen 70% of the way up.
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      el.style.setProperty('--p', p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <section id="device" className="stage device center" aria-labelledby="device-title">
      <Reveal className="wrap">
        <h2 id="device-title" className="title">Your company.<br />In your pocket.</h2>
        <p className="lede" style={{ marginTop: 18 }}>Live FYNQ performance, anywhere.</p>
      </Reveal>
      <div className="deviceStage">
        <div className="phone" ref={phone}>
          <div className="phoneFloor" aria-hidden="true" />
          <div className="phoneShadow" aria-hidden="true" />
          <span className="btnSide btnL1" aria-hidden="true" />
          <span className="btnSide btnL2" aria-hidden="true" />
          <span className="btnSide btnL3" aria-hidden="true" />
          <span className="btnSide btnR" aria-hidden="true" />
          <span className="btnSide btnR2" aria-hidden="true" />
          <div className="phoneFrame" aria-hidden="true" />
          <div className="phoneGlass" aria-hidden="true" />
          <div className="phoneScreen">
            <div className="island" aria-hidden="true" />
            <PhoneScreen metrics={metrics} />
            <div className="reflect" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
