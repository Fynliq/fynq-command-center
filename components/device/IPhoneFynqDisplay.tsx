'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { PhoneMetrics } from '@/lib/metrics/phone';
import { MetricNumber, prefersReducedMotion, useInViewOnce, useNow } from '../motion';
import { fmtN } from '../ui';

export type { PhoneMetrics };

/** A path through the history, scaled into a 100 x 32 box. Flat history draws a flat line. */
function growthPath(values: number[]): { line: string; area: string; end: { x: number; y: number } } | null {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * 100, y: span === 0 ? 24 : 29 - ((v - min) / span) * 25 }));
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  return { line, area: `${line} L100,32 L0,32 Z`, end: pts[pts.length - 1] };
}

/** The hero number shrinks as it grows a digit, so 249, 5,000 and 120,000 all fit the screen. */
function heroSize(n: number | null): string {
  const len = fmtN(n).length;
  return len <= 3 ? '25cqw' : len <= 5 ? '21cqw' : len <= 7 ? '16.5cqw' : '13cqw';
}

const clockFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * A premium flagship phone, drawn entirely in CSS and SVG (no photography,
 * no third-party marks), running the FYNQ mobile app on live aggregate
 * numbers. Pass it the shared metrics; it re-renders whenever they change.
 *
 * Motion: one entrance when it first scrolls into view (fade, rise 40px,
 * 3° → 0°, 0.94 → 1 over 800ms) and a very small float tied to scroll.
 * Neither runs with prefers-reduced-motion, and on phones it stays straight.
 */
export function IPhoneFynqDisplay({ metrics, className = '' }: { metrics: PhoneMetrics; className?: string }) {
  const m = metrics;
  const chart = growthPath(m.growthHistory);
  const gid = useId().replace(/:/g, '');
  const now = useNow(30_000);
  const [pre, setPre] = useState(false);
  const stage = useInViewOnce<HTMLDivElement>(() => setPre(false), '0px 0px -8% 0px');
  const float = useRef<HTMLDivElement>(null);

  // Hidden only once we know it starts below the fold (visible without JavaScript).
  useEffect(() => {
    const el = stage.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top > window.innerHeight * 0.92) setPre(true);
  }, [stage]);

  // A few pixels of float, following scroll. Desktop only.
  useEffect(() => {
    const el = float.current;
    if (!el || prefersReducedMotion() || window.matchMedia('(max-width: 767px)').matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const offset = (window.innerHeight / 2 - (r.top + r.height / 2)) * 0.03;
      el.style.setProperty('--float', `${Math.max(-10, Math.min(10, offset)).toFixed(2)}px`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div ref={stage} className={`ipStage${pre ? ' pre' : ''} ${className}`}>
      <div className="ipFloat" ref={float}>
        <div className="ip">
          <div className="ipShadow" aria-hidden="true" />
          <span className="ipBtn action" aria-hidden="true" />
          <span className="ipBtn volUp" aria-hidden="true" />
          <span className="ipBtn volDown" aria-hidden="true" />
          <span className="ipBtn power" aria-hidden="true" />
          <span className="ipBtn camera" aria-hidden="true" />
          <div className="ipFrame">
            <div className="ipBezel">
              <div className="ipScreen" role="img" aria-label={`FYNQ mobile app. ${fmtN(m.trackedUsers)} tracked users, ${fmtN(m.totalAccounts)} accounts, ${fmtN(m.paidCustomers)} paid customers.`}>
                <div className="ipIsland" aria-hidden="true"><i /></div>
                <div className="ipStatus" aria-hidden="true">
                  <span className="tnum">{clockFmt.format(new Date(now)).replace(/\s?[AP]M$/, '')}</span>
                  <span className="ipStatusIcons">
                    <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="0.8" /><rect x="5" y="5.5" width="3" height="6.5" rx="0.8" /><rect x="10" y="3" width="3" height="9" rx="0.8" /><rect x="15" y="0" width="3" height="12" rx="0.8" /></svg>
                    <svg viewBox="0 0 26 12"><rect x="0.5" y="0.5" width="22" height="11" rx="3.2" fill="none" stroke="currentColor" strokeOpacity="0.45" /><rect x="2" y="2" width="16" height="8" rx="2" /><rect x="23.6" y="4" width="1.6" height="4" rx="0.8" fillOpacity="0.45" /></svg>
                  </span>
                </div>

                <div className="ipApp">
                  <header className="ipTop">
                    <span className="ipBrand"><img src="/fynq-logo.png" alt="" />FYNQ</span>
                    <span className="ipLive"><i />LIVE</span>
                  </header>

                  <section className="ipHero">
                    <div className="ipBig" style={{ fontSize: heroSize(m.trackedUsers) }}><MetricNumber value={m.trackedUsers} /></div>
                    <p className="ipLabel">Tracked Users</p>
                    <p className="ipUp tnum">{m.newTrackedUsersToday === null ? '—' : `+${fmtN(m.newTrackedUsersToday)} today`}</p>
                  </section>

                  <div className="ipChart">
                    {chart ? (
                      <svg viewBox="0 0 100 32" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id={`ipg-${gid}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#b8f04a" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="#b8f04a" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={chart.area} fill={`url(#ipg-${gid})`} />
                        <path d={chart.line} fill="none" stroke="#b8f04a" strokeWidth="1.3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
                      </svg>
                    ) : <svg viewBox="0 0 100 32" preserveAspectRatio="none" />}
                    {chart && <span className="ipChartDot" style={{ left: `${chart.end.x}%`, top: `${(chart.end.y / 32) * 100}%` }} />}
                    <p><span>{m.growthHistory.length} days</span><span>Growth</span></p>
                  </div>

                  <div className="ipGrid">
                    <div>
                      <b><MetricNumber value={m.totalAccounts} /></b>
                      <span>Accounts{m.newAccountsToday ? <em className="tnum"> +{fmtN(m.newAccountsToday)} today</em> : null}</span>
                    </div>
                    <div><b><MetricNumber value={m.uniqueUploaders} /></b><span>Uploaders</span></div>
                    <div><b><MetricNumber value={m.filesSubmitted} /></b><span>Files</span></div>
                    <div><b><MetricNumber value={m.paidCustomers} /></b><span>Customers</span></div>
                  </div>

                  <div className="ipRevenue">
                    <b><MetricNumber value={m.realRevenue} format="usd" decimals={2} /></b>
                    <span>Revenue</span>
                  </div>
                </div>

                <div className="ipHome" aria-hidden="true" />
                <div className="ipGlass" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
