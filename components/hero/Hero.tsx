'use client';

import type { StoryData } from '@/lib/metrics/types';
import { MetricNumber, useNow } from '../motion';
import { fmtN } from '../ui';

/** "Updated 8 seconds ago", ticking every second, from when the numbers were computed. */
export function updatedAgo(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 5) return 'Updated just now';
  if (s < 60) return `Updated ${s} seconds ago`;
  const m = Math.floor(s / 60);
  return `Updated ${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
}

/**
 * The opening: one sentence and one number. Everything else waits below.
 * The only motion is a single slow rise (none with reduced motion).
 */
export function Hero({ moment, generatedAt, stale }: { moment: StoryData['moment']; generatedAt: string; stale: boolean }) {
  const now = useNow(1000);
  return (
    <section id="overview" className="hero" aria-labelledby="hero-title">
      <div className="heroLight" aria-hidden="true" />
      <div className="container heroIn enter">
        <p className="eyebrow2">FYNQ Command Center</p>
        <h1 id="hero-title" className="display">Everything happening<br />inside FYNQ.</h1>
        <p className="heroSub">Live company intelligence.<br />Updated continuously.</p>

        <div className="heroNumber">
          <div className="heroBig"><MetricNumber value={moment.total} unavailableNote /></div>
          <p className="heroLabel">Tracked users</p>
          <div className="heroDeltas tnum">
            <span><b>+{fmtN(moment.today)}</b> today</span>
            <span><b>+{fmtN(moment.week)}</b> last 7 days</span>
          </div>
          <p className="heroLive" role="status">
            <span className={`liveDot${stale ? ' stale' : ''}`} aria-hidden="true" />
            <span className="lv">{stale ? 'RECONNECTING' : 'LIVE'}</span>
            <span className="tnum">{updatedAgo(generatedAt, now)}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
