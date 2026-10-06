'use client';

import type { StoryData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';

const plus = (n: number | null) => (n === null ? '—' : `+${n.toLocaleString('en-US')}`);

/** "248 and counting." The total is all tracked users; the rows are new users in each window. */
export function CompanyMoment({ moment }: { moment: StoryData['moment'] }) {
  return (
    <section className="stage graphite center" aria-labelledby="moment-title">
      <Reveal className="wrap">
        <p className="kicker lime">Tracked users</p>
        <h2 id="moment-title" className="momentNum">
          <MetricNumber value={moment.total} unavailableNote /> {moment.total !== null && <small>and counting.</small>}
        </h2>
        <p className="lede" style={{ marginTop: 24 }}>Students are discovering FYNQ every day.</p>
        <div className="momentRow">
          <div><b className="tnum">{plus(moment.today)}</b><span>today</span></div>
          <div><b className="tnum">{plus(moment.week)}</b><span>in the last 7 days</span></div>
          <div><b className="tnum">{plus(moment.month)}</b><span>in the last 30 days</span></div>
        </div>
      </Reveal>
    </section>
  );
}
