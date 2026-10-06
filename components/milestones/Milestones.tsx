'use client';

import type { StoryData } from '@/lib/metrics/types';
import { Reveal } from '../motion';
import { CheckIcon } from '../ui';

const fmtPct = (p: number) => `${p >= 10 || p === 0 ? p.toFixed(0) : p.toFixed(1)}%`;

export function Milestones({ milestones }: { milestones: StoryData['milestones'] }) {
  return (
    <section className="stage center" aria-labelledby="ms-title">
      <div className="wrap">
        <Reveal>
          <p className="kicker lime">Milestones</p>
          <h2 id="ms-title" className="title" style={{ marginTop: 14 }}>What&rsquo;s next.</h2>
        </Reveal>
        <Reveal as="ul" className="msList">
          {milestones.map((m) => (
            <li className={`ms${m.done ? ' done' : ''}`} key={m.id}>
              <div className="msTop">
                <span className="lab">{m.done && <CheckIcon className="check" />}{m.label}</span>
                <span className="val">
                  {m.current === null ? 'Data temporarily unavailable' : `${m.current.toLocaleString('en-US')} / ${m.target.toLocaleString('en-US')} · ${fmtPct(m.pct ?? 0)}`}
                </span>
              </div>
              <div className="msTrack" role="progressbar" aria-label={m.label} aria-valuemin={0} aria-valuemax={m.target} aria-valuenow={m.current ?? undefined}>
                <div className="msFill" style={{ transform: `scaleX(${(m.pct ?? 0) / 100})` }} />
              </div>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

const deadlineFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const perDay = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 1 : 0 });

/** A target, not a forecast: the pace needed versus the pace of the last 7 days. */
export function RoadTo5000({ target }: { target: StoryData['target'] }) {
  const t = target;
  const reached = t.current !== null && t.current >= t.goal;
  const deadline = deadlineFmt.format(new Date(`${t.deadline}T12:00:00Z`));
  return (
    <section className="stage graphite center" aria-labelledby="target-title">
      <div className="wrap">
        <Reveal>
          <span className="badge">Growth target · not a forecast</span>
          <h2 id="target-title" className="title" style={{ marginTop: 20 }}>Road to {t.goal.toLocaleString('en-US')}.</h2>
          <p className="lede" style={{ marginTop: 16 }}>{t.goal.toLocaleString('en-US')} tracked users by {deadline}. {t.daysLeft} {t.daysLeft === 1 ? 'day' : 'days'} to go.</p>
        </Reveal>
        <Reveal className="targetBar">
          <div className="msTrack" role="progressbar" aria-label="Progress to the target" aria-valuemin={0} aria-valuemax={t.goal} aria-valuenow={t.current ?? undefined}>
            <div className="msFill" style={{ transform: `scaleX(${(t.pct ?? 0) / 100})` }} />
          </div>
          <div className="ends tnum"><span>{t.current === null ? '—' : t.current.toLocaleString('en-US')} now · {t.pct === null ? '—' : fmtPct(t.pct)}</span><span>{t.goal.toLocaleString('en-US')}</span></div>
        </Reveal>
        <Reveal className="targetGrid">
          <div className="card"><b className="tnum">{t.requiredPerDay === null ? '—' : perDay(t.requiredPerDay)}</b><span>new users a day needed</span></div>
          <div className="card"><b className="tnum">{t.pace7dPerDay === null ? '—' : perDay(t.pace7dPerDay)}</b><span>a day, last 7 days</span></div>
          <div className="card"><b className="tnum" style={{ color: t.gapPerDay !== null && t.gapPerDay >= 0 ? 'var(--lime)' : undefined }}>{t.gapPerDay === null ? '—' : `${t.gapPerDay >= 0 ? '+' : '−'}${perDay(Math.abs(t.gapPerDay))}`}</b><span>{t.gapPerDay !== null && t.gapPerDay >= 0 ? 'a day ahead of the pace needed' : 'a day behind the pace needed'}</span></div>
        </Reveal>
        <Reveal>
          <p className="lede targetSentence">
            {reached
              ? `${t.goal.toLocaleString('en-US')} reached.`
              : t.requiredPerDay === null
                ? 'Data temporarily unavailable.'
                : `FYNQ needs about ${Math.ceil(t.requiredPerDay).toLocaleString('en-US')} new users a day to reach ${t.goal.toLocaleString('en-US')} by ${deadline}.`}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
