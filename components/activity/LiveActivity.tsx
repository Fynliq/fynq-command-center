'use client';

import type { LiveEvent } from '@/lib/metrics/types';
import { ago, Reveal, useNow } from '../motion';

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

const WHAT: Record<LiveEvent['kind'], (n: number) => string> = {
  visitor: (n) => (n === 1 ? 'New tracked visitor' : `${n.toLocaleString('en-US')} new tracked visitors`),
  account: () => 'Account created',
  upload: (n) => `Upload completed · ${plural(n, 'file', 'files')}`,
  files: (n) => `${plural(n, 'file', 'files')} submitted`,
  answer: () => 'Question answered',
  paywall: () => 'Paywall viewed',
  checkout: () => 'Checkout created',
  payment: () => 'Payment confirmed',
};
const TONE: Record<LiveEvent['kind'], string> = { visitor: 'dim', account: 'bright', upload: 'bright', files: 'dim', answer: 'dim', paywall: 'dim', checkout: 'bright', payment: 'green' };

/**
 * Live: what just happened, anonymously. A kind of event and a time — no
 * names, emails, ids, payment references or places (FYNQ records no
 * location, so none is shown).
 */
export function LiveActivity({ events, limit }: { events: LiveEvent[]; limit?: number }) {
  const now = useNow(15_000);
  const list = limit ? events.slice(0, limit) : events;
  return (
    <section id="activity" className="live2" aria-labelledby="live-title">
      <div className="container liveGrid">
        <Reveal className="liveHead">
          <p className="label"><span className="liveDot beat" aria-hidden="true" />Activity</p>
          <h2 id="live-title" className="sectionTitle">Live</h2>
          <p className="lead">The latest moments inside FYNQ. Anonymous by design.</p>
        </Reveal>
        <Reveal>
          {list.length ? (
            <ul className="stream" aria-live="polite">
              {list.map((e) => (
                <li className={`streamItem ${TONE[e.kind]}`} key={`${e.kind}-${e.at}-${e.count}`}>
                  <i aria-hidden="true" />
                  <span className="what">{WHAT[e.kind](e.count)}</span>
                  <time dateTime={e.at} className="tnum">{ago(e.at, now)}</time>
                </li>
              ))}
            </ul>
          ) : <div className="empty">Nothing recorded yet</div>}
        </Reveal>
      </div>
    </section>
  );
}
