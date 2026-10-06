'use client';

import type { LiveEvent } from '@/lib/metrics/types';
import { ago, Reveal, useNow } from '../motion';

const WHAT: Record<LiveEvent['kind'], (n: number) => string> = {
  visitor: (n) => (n === 1 ? 'New visitor' : `${n.toLocaleString('en-US')} new visitors`),
  account: () => 'New account created',
  files: (n) => `${n.toLocaleString('en-US')} ${n === 1 ? 'file' : 'files'} submitted`,
  answer: () => 'Question answered',
  checkout: () => 'Checkout started',
  payment: () => 'Payment received',
};
const DOT: Record<LiveEvent['kind'], string> = { visitor: '', account: 'white', files: '', answer: '', checkout: 'white', payment: 'lime' };

/**
 * What just happened, anonymously: the kind of event and when. No names,
 * emails, ids or places (FYNQ does not record location).
 */
export function LiveActivity({ events }: { events: LiveEvent[] }) {
  const now = useNow();
  return (
    <section id="activity" className="stage graphite" aria-labelledby="live-title">
      <div className="wrap liveWrap">
        <Reveal>
          <p className="kicker lime">Live activity</p>
          <h2 id="live-title" className="title" style={{ marginTop: 14 }}>Happening<br />right now.</h2>
          <p className="lede" style={{ marginTop: 18, maxWidth: 420 }}>The latest moments across FYNQ. Anonymous by design: no names, emails or locations.</p>
        </Reveal>
        <Reveal>
          {events.length ? (
            <ul className="liveList" aria-live="polite">
              {events.map((e) => (
                <li className="liveItem" key={`${e.kind}-${e.at}-${e.count}`}>
                  <i className={DOT[e.kind]} aria-hidden="true" />
                  <span className="what">{WHAT[e.kind](e.count)}</span>
                  <time dateTime={e.at}>{ago(e.at, now)}</time>
                </li>
              ))}
            </ul>
          ) : <div className="empty">Nothing recorded yet</div>}
        </Reveal>
      </div>
    </section>
  );
}
