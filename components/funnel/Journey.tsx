'use client';

import type { StoryJourneyStage } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { fmtPct } from '../ui';

/**
 * The FYNQ Journey: large numbers joined by thin lines, with the share that
 * carried on between each pair. Stages count different things (people,
 * accounts), so a share over 100% is not shown as a conversion rate.
 */
export function Journey({ stages, compact = false }: { stages: StoryJourneyStage[]; compact?: boolean }) {
  return (
    <Reveal as="ol" className={`journey2${compact ? ' compact' : ''}`} aria-label="The FYNQ Journey">
      {stages.map((s, i) => {
        const rate = s.fromPrevious !== null && s.fromPrevious <= 100 ? s.fromPrevious : null;
        return (
          <li key={s.id} className={`jStage${i === stages.length - 1 ? ' last' : ''}`}>
            {i > 0 && (
              <span className="jLink" aria-hidden="true">
                <span className="jRate tnum">{rate === null ? '' : fmtPct(rate)}</span>
              </span>
            )}
            <span className="jIdx tnum" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <span className="jNum"><MetricNumber value={s.count} /></span>
            <span className="jLabel">{s.label}</span>
            <span className="jUnit">{s.unit}{rate !== null && <span className="sr">, {fmtPct(rate)} of the stage before</span>}</span>
          </li>
        );
      })}
    </Reveal>
  );
}
