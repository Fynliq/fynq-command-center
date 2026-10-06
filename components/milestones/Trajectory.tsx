'use client';

import { useMemo, useState } from 'react';
import type { StoryData } from '@/lib/metrics/types';
import { Reveal } from '../motion';
import { fmtN, fmtRate } from '../ui';

/** Scenario multipliers on the last 7 days' pace. Assumptions, not predictions. */
export const SCENARIOS = [
  { id: 'conservative', label: 'Conservative', factor: 0.5 },
  { id: 'current', label: 'Current Pace', factor: 1 },
  { id: 'strong', label: 'Strong Growth', factor: 2 },
  { id: 'breakout', label: 'Breakout', factor: 4 },
] as const;

/** current + perDay × days, rounded down: a scenario never rounds itself up. */
export const project = (current: number, perDay: number, days: number) => Math.floor(current + Math.max(0, perDay) * days);

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Trajectory: what the total would be under a stated users-per-day
 * assumption. Labelled SCENARIOS, computed in the browser, never stored.
 */
export function Trajectory({ target, history, generatedAt }: { target: StoryData['target']; history: number[]; generatedAt: string }) {
  const pace = target.pace7dPerDay;
  const current = target.current;
  const [rate, setRate] = useState<string>(() => (pace === null ? '' : String(Math.round(pace * 10) / 10)));
  const [picked, setPicked] = useState<string>('current');
  const perDay = Number.parseFloat(rate);
  const valid = current !== null && Number.isFinite(perDay) && perDay >= 0;
  // Shown in time order: Dec 31 lands between 30 and 90 days for most of the autumn.
  const horizons = [
    { label: 'In 30 days', days: 30 },
    { label: 'In 90 days', days: 90 },
    { label: 'By Dec 31', days: target.daysLeft },
  ].sort((a, b) => a.days - b.days);
  const reach = valid && current !== null && current < target.goal && perDay > 0
    ? new Date(Date.parse(generatedAt) + Math.ceil((target.goal - current) / perDay) * 86_400_000)
    : null;

  const choose = (id: string, factor: number) => {
    setPicked(id);
    if (pace !== null) setRate(String(Math.round(pace * factor * 10) / 10));
  };

  return (
    <section id="trajectory" className="traj" aria-labelledby="traj-title">
      <div className="container">
        <Reveal className="trajHead">
          <div>
            <p className="badge2">Scenarios — not forecasts</p>
            <h2 id="traj-title" className="sectionTitle">Trajectory</h2>
            <p className="lead">Pick an assumption, or type your own. Totals are simple arithmetic on today&rsquo;s live count. Nothing here is saved.</p>
          </div>
        </Reveal>

        <Reveal className="trajGrid">
          <div className="trajControls">
            <div className="scenarioPick" role="group" aria-label="Scenario">
              {SCENARIOS.map((s) => (
                <button key={s.id} type="button" aria-pressed={picked === s.id} onClick={() => choose(s.id, s.factor)} disabled={pace === null}>
                  <span>{s.label}</span>
                  <small className="tnum">{pace === null ? '—' : `${fmtRate(pace * s.factor)}/day`}{s.factor !== 1 ? ` · ${s.factor}× pace` : ' · last 7 days'}</small>
                </button>
              ))}
            </div>
            <label className="rateInput">
              <span className="label">Average new users / day</span>
              <span className="inputRow">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  value={rate}
                  onChange={(e) => { setRate(e.target.value); setPicked('custom'); }}
                  aria-describedby="traj-note"
                />
                <span className="muted">users/day</span>
              </span>
            </label>
            <p id="traj-note" className="metricNote">Starting from {fmtN(current)} tracked users today.</p>
          </div>

          <div className="trajOut">
            <dl className="trajTotals">
              {horizons.map((h) => (
                <div key={h.label}>
                  <dt>{h.label}</dt>
                  <dd className="tnum">{valid && current !== null ? fmtN(project(current, perDay, h.days)) : '—'}</dd>
                </div>
              ))}
            </dl>
            <p className="trajReach">
              {current !== null && current >= target.goal
                ? `${fmtN(target.goal)} already reached.`
                : reach
                  ? <>At this rate, {fmtN(target.goal)} on <b>{dateFmt.format(reach)}</b>.</>
                  : `Enter a rate above zero to see when ${fmtN(target.goal)} would be reached.`}
            </p>
            <TrajectoryChart history={history} current={current} perDay={valid ? perDay : null} days={Math.max(90, target.daysLeft)} goal={target.goal} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Past 60 days (solid) and the chosen scenario (dashed). The 5,000 line only when it is in view. */
function TrajectoryChart({ history, current, perDay, days, goal }: { history: number[]; current: number | null; perDay: number | null; days: number; goal: number }) {
  const W = 640, H = 220, padL = 4, padR = 4, padT = 16, padB = 18;
  const past = history.slice(-60);
  const model = useMemo(() => (perDay === null || current === null ? [] : Array.from({ length: days + 1 }, (_, i) => current + perDay * i)), [perDay, current, days]);
  if (!past.length) return null;
  const total = past.length - 1 + days;
  const maxY = Math.max(10, ...past, ...(model.length ? [model[model.length - 1]] : []));
  const x = (i: number) => padL + (i / total) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / maxY) * (H - padT - padB);
  const pastPath = past.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const off = past.length - 1;
  const modelPath = model.length ? `M${x(off)},${y(model[0])} L${x(off + days)},${y(model[model.length - 1])}` : '';
  return (
    <svg className="trajChart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Past 60 days and the chosen scenario">
      {goal <= maxY && <line className="goal" x1={padL} x2={W - padR} y1={y(goal)} y2={y(goal)} />}
      <line className="now" x1={x(off)} x2={x(off)} y1={padT} y2={H - padB} />
      <path className="past" d={pastPath} />
      {modelPath && <path className="model" d={modelPath} />}
    </svg>
  );
}
