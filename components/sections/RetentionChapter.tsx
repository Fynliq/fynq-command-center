'use client';

import type { StoryData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { Chapter } from './Chapter';

/** 05 Retention: only what the tables can actually support. */
export function RetentionChapter({ r }: { r: StoryData['retention'] }) {
  const cells: { label: string; value: number | null; format?: 'percent' | 'ratio'; note: string }[] = [
    { label: 'Returning Accounts', value: r.returning, note: 'Accounts that logged in more than once.' },
    { label: 'Returning Account %', value: r.returningPct, format: 'percent', note: 'Returning accounts ÷ all accounts.' },
    { label: '7-Day Active', value: r.wau, note: 'Tracked users seen in the last 7 days.' },
    { label: 'MAU', value: r.mau, note: 'Tracked users seen in the last 30 days.' },
    { label: 'Avg. logins per account', value: r.avgLogins, format: 'ratio', note: 'Total logins ÷ registered accounts.' },
  ];
  return (
    <Chapter id="retention" n="05" name="Retention" title={<>Coming back.</>} sub="Who returns after the first visit." tone="raised">
      <Reveal as="dl" className="retGrid">
        {cells.map((c, i) => (
          <div key={c.label} className={i === 1 ? 'retLead' : undefined}>
            <dd><MetricNumber value={c.value} format={c.format ?? 'count'} decimals={c.format === 'ratio' ? 1 : c.format === 'percent' ? 1 : undefined} /></dd>
            <dt>{c.label}</dt>
            <p className="metricNote">{c.note}</p>
          </div>
        ))}
      </Reveal>
      {!r.cohortsAvailable && (
        <Reveal><p className="cohortNote"><span className="label">Cohorts</span>Cohort retention tracking not yet available.</p></Reveal>
      )}
    </Chapter>
  );
}
