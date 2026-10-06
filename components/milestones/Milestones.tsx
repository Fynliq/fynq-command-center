'use client';

import type { StoryData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { CheckIcon, fmtN, fmtRate } from '../ui';

type M = StoryData['milestones'][number];

const pctText = (p: number | null) => (p === null ? '—' : `${p >= 100 ? 100 : p.toFixed(1)}%`);
const doneFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' });
const GROUPS: { metric: M['metric']; name: string }[] = [
  { metric: 'trackedUsers', name: 'Tracked users' },
  { metric: 'accounts', name: 'Accounts' },
  { metric: 'paidCustomers', name: 'Customers' },
];

/**
 * Next.: the next milestone of each kind, enormous, then the ladder. A
 * finished one gets a small check and its date — only when the rows show
 * exactly when it was crossed.
 */
export function Milestones({ milestones }: { milestones: StoryData['milestones'] }) {
  return (
    <section id="milestones" className="next" aria-labelledby="ms-title">
      <div className="container">
        <Reveal className="nextHead">
          <p className="label">Milestones</p>
          <h2 id="ms-title" className="displayM">Next.</h2>
        </Reveal>
        <div className="nextGrid">
          {GROUPS.map((g, gi) => {
            const ladder = milestones.filter((m) => m.metric === g.metric);
            const next = ladder.find((m) => !m.done) ?? ladder[ladder.length - 1];
            if (!next) return null;
            return (
              <Reveal key={g.metric} className="nextCol" delay={gi * 80}>
                <p className="label">{g.name}</p>
                <p className="nextBig tnum">
                  <MetricNumber value={next.current} /><span className="of"> / {fmtN(next.target)}</span>
                </p>
                <p className="nextPct tnum">{pctText(next.pct)}</p>
                <div className="thinTrack" role="progressbar" aria-label={`${fmtN(next.target)} ${next.label}`} aria-valuemin={0} aria-valuemax={next.target} aria-valuenow={next.current ?? undefined}>
                  <div className="thinFill" style={{ transform: `scaleX(${Math.min(1, (next.pct ?? 0) / 100)})` }} />
                </div>
                <ul className="ladder">
                  {ladder.map((m) => (
                    <li key={m.id} className={m.done ? 'done' : m.id === next.id ? 'current' : undefined}>
                      <span className="tnum">{fmtN(m.target)}</span>
                      <span className="ladderState">
                        {m.done ? <><CheckIcon className="check" />{m.completedAt ? `Completed ${doneFmt.format(new Date(m.completedAt))}` : 'Completed'}</> : m.id === next.id ? 'Next' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const deadlineFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });

/** Road to 5,000: a target model, not a forecast. Pace needed against the pace of the last 7 days. */
export function RoadTo5000({ target }: { target: StoryData['target'] }) {
  const t = target;
  const deadline = deadlineFmt.format(new Date(`${t.deadline}T12:00:00Z`));
  const r = 120;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, (t.pct ?? 0) / 100));
  const ahead = t.gapPerDay !== null && t.gapPerDay >= 0;
  return (
    <section id="target" className="road" aria-labelledby="target-title">
      <div className="container roadGrid">
        <Reveal className="roadText">
          <p className="badge2">Target model — not forecast</p>
          <h2 id="target-title" className="sectionTitle">Road to {fmtN(t.goal)}.</h2>
          <p className="lead">{fmtN(t.goal)} tracked users by {deadline}. {t.daysLeft} {t.daysLeft === 1 ? 'day' : 'days'} left.</p>
          <dl className="roadStats">
            <div><dt>Current pace</dt><dd className="tnum">{fmtRate(t.pace7dPerDay)}<small>/day</small></dd><p className="metricNote">New tracked users per day, last 7 days.</p></div>
            <div><dt>Required pace</dt><dd className="tnum">{fmtRate(t.requiredPerDay)}<small>/day</small></dd><p className="metricNote">{fmtN(t.remaining)} remaining ÷ {t.daysLeft} days.</p></div>
            <div><dt>Gap</dt><dd className={`tnum ${t.gapPerDay === null ? '' : ahead ? 'pos' : 'neg'}`}>{t.gapPerDay === null ? '—' : `${t.gapPerDay >= 0 ? '+' : '−'}${fmtRate(Math.abs(t.gapPerDay))}`}<small>/day</small></dd><p className="metricNote">{t.gapPerDay === null ? '' : ahead ? 'Ahead of the pace needed.' : 'Behind the pace needed.'}</p></div>
          </dl>
        </Reveal>
        <Reveal className="roadRing" delay={80}>
          <svg viewBox="0 0 280 280" role="img" aria-label={`${fmtN(t.current)} of ${fmtN(t.goal)} tracked users`}>
            <circle cx="140" cy="140" r={r} className="ringBg" />
            <circle cx="140" cy="140" r={r} className="ringFg" strokeDasharray={c} strokeDashoffset={c * (1 - p)} transform="rotate(-90 140 140)" />
          </svg>
          <div className="ringText">
            <span className="ringNum"><MetricNumber value={t.current} /></span>
            <span className="muted tnum">of {fmtN(t.goal)} · {t.pct === null ? '—' : `${t.pct.toFixed(1)}%`}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
