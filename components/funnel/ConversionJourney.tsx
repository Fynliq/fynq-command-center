'use client';

import { Fragment } from 'react';
import type { StoryJourneyStage } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';

const pct = (n: number) => `${n < 10 && n > 0 ? n.toFixed(1) : Math.round(n)}%`;

/** Every step from first visit to payment, with the share that made it to the next. */
export function ConversionJourney({ journey }: { journey: StoryJourneyStage[] }) {
  return (
    <section className="stage graphite" aria-labelledby="journey-title">
      <div className="wrap journey">
        <Reveal className="journeyTitle">
          <p className="kicker lime">Conversion</p>
          <h2 id="journey-title" className="title" style={{ marginTop: 14 }}>From attention<br />to revenue.</h2>
          <p className="lede">Each number is people or accounts reaching that step. The percentage is the share of the step before. Payments are live and exclude test and founder accounts.</p>
        </Reveal>
        <Reveal as="ol" className="jSteps" aria-label="Conversion journey">
          {journey.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 && (
                <li className="jLink" aria-hidden={s.fromPrevious === null}>
                  <span className="jLine" />
                  {s.fromPrevious !== null && <span><b>↓ {pct(s.fromPrevious)}</b> continued</span>}
                </li>
              )}
              <li className={`jStep${i === journey.length - 1 ? ' final' : ''}`}>
                <div><span className="lab">{s.label}</span><span className="unit">{s.unit}</span></div>
                <div className="n"><MetricNumber value={s.count} /></div>
              </li>
            </Fragment>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
