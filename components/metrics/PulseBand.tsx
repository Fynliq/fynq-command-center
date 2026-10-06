'use client';

import type { StoryData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { Change, fmtN, fmtRate } from '../ui';

const VELOCITY_WORD = { accelerating: 'Accelerating', stable: 'Stable', slowing: 'Slowing' } as const;

/**
 * FYNQ Pulse and Growth Velocity, side by side. Both are fixed rules over
 * the counts (written out under each), never a model, and neither claims
 * why a number moved.
 */
export function PulseBand({ pulse, velocity }: { pulse: StoryData['pulse']; velocity: StoryData['velocity'] }) {
  return (
    <section className="band" aria-label="FYNQ Pulse and Growth Velocity">
      <div className="container bandGrid">
        <Reveal className="pulse2">
          <p className="label">FYNQ Pulse</p>
          <p className={`pulseWord ${pulse.state ?? 'none'}`}>
            <span className="pulseDot" aria-hidden="true" />{pulse.state ? pulse.label : 'UNAVAILABLE'}
          </p>
          <ul className="pulseSignals">
            {pulse.signals.map((s) => (
              <li key={s.id}>
                <span className="sigLabel">{s.label}</span>
                <span className="sigVal">{s.value !== null && (s.isNew || s.change !== null) ? <Change change={s.change} isNew={s.isNew} /> : <span className="muted">—</span>}</span>
              </li>
            ))}
            <li>
              <span className="sigLabel">Customers</span>
              <span className="sigVal tnum">{fmtN(pulse.customers)}</span>
            </li>
          </ul>
          <p className="rule">{pulse.rule}</p>
        </Reveal>

        <Reveal className="velocity" delay={80}>
          <p className="label">Growth Velocity</p>
          <div className="velNum">
            <span className="velBig"><MetricNumber value={velocity.current} decimals={1} /></span>
            <span className="velUnit">new users / day</span>
          </div>
          <div className="velCompare">
            <span className={`velState ${velocity.state ?? 'none'}`}>{velocity.state ? VELOCITY_WORD[velocity.state] : '—'}</span>
            <span className="muted tnum">Previous 7 days: {fmtRate(velocity.previous)} / day</span>
          </div>
          <p className="rule">{velocity.rule}</p>
        </Reveal>
      </div>
    </section>
  );
}
