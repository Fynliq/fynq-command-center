'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { MetricNumber } from '../motion';
import { byId, Change, fmtN, fmtPct, fmtRate, fmtUsd, v } from '../ui';

const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' });
const ANSWER = { accelerating: 'Yes — accelerating.', growing: 'Yes.', steady: 'Holding steady.', cooling: 'Cooling.' } as const;

/**
 * CEO View: one screen that answers "Is FYNQ growing, and is it working?"
 * The first answer is the Pulse rule; the second is left to the facts
 * (activation, payments, retention) rather than a verdict.
 */
export function CeoView({ d }: { d: DashboardData }) {
  const s = d.story;
  const t = (id: string) => byId(d.today, id);
  const n7a = byId(d.secondary, 'newAccounts7d');
  const nextMs = s.milestones.filter((m) => !m.done && m.pct !== null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const rate = v(byId(d.uploads.metrics, 'uploadSuccessRate'));
  const successful = v(byId(d.uploads.metrics, 'uniqueSuccessfulUploaders'));
  const uploaders = v(byId(d.uploads.metrics, 'uniqueUploaders'));

  return (
    <main className="ceo" id="top">
      <div className="container">
        <header className="ceoHead">
          <p className="label">CEO View · {dayFmt.format(new Date(d.generatedAt))}</p>
          <h1 className="ceoQ">Is FYNQ growing?</h1>
          <p className={`ceoA ${s.pulse.state ?? ''}`}>{s.pulse.state ? ANSWER[s.pulse.state] : 'Not enough data right now.'}</p>
          <p className="rule">{s.pulse.rule}</p>
        </header>

        <div className="ceoGrid">
          <article className="ceoTile wide">
            <p className="label">Today</p>
            <dl className="ceoToday">
              <div><dd><MetricNumber value={v(t('newTrackedToday'))} /></dd><dt>new users</dt></div>
              <div><dd><MetricNumber value={v(t('newAccountsToday'))} /></dd><dt>accounts</dt></div>
              <div><dd><MetricNumber value={v(t('filesSubmitted'))} /></dd><dt>files</dt></div>
              <div><dd><MetricNumber value={s.todayExtra.reads} /></dd><dt>successful reads</dt></div>
              <div><dd><MetricNumber value={v(t('paidCustomers'))} /></dd><dt>payments</dt></div>
            </dl>
          </article>

          <article className="ceoTile">
            <p className="label">Growth Velocity</p>
            <p className="ceoBig tnum">{fmtRate(s.velocity.current)}<small> /day</small></p>
            <p className="ceoLine"><span className={`velState ${s.velocity.state ?? 'none'}`}>{s.velocity.state ? s.velocity.state[0].toUpperCase() + s.velocity.state.slice(1) : '—'}</span><span className="muted tnum">was {fmtRate(s.velocity.previous)}/day</span></p>
          </article>

          <article className="ceoTile">
            <p className="label">Account Growth</p>
            <p className="ceoBig tnum">+{fmtN(v(n7a))}<small> in 7 days</small></p>
            <p className="ceoLine">{n7a?.comparison && <Change change={n7a.comparison.change} isNew={n7a.comparison.direction === 'new'} />}<span className="muted tnum">{fmtN(v(byId(d.primary, 'accounts')))} total</span></p>
          </article>

          <article className="ceoTile">
            <p className="label">Activation</p>
            <p className="ceoBig tnum">{fmtPct(rate)}<small> read successfully</small></p>
            <p className="ceoLine muted tnum">{fmtN(successful)} of {fmtN(uploaders)} uploaders got a read</p>
          </article>

          <article className="ceoTile">
            <p className="label">Payments</p>
            <p className="ceoBig tnum">{fmtUsd(s.revenue)}</p>
            <p className="ceoLine muted tnum">{fmtN(v(byId(d.primary, 'paidCustomers')))} real customers · {fmtPct(s.paywallConversion)} of paywall viewers paid</p>
          </article>

          <article className="ceoTile">
            <p className="label">Retention</p>
            <p className="ceoBig tnum">{fmtPct(s.retention.returningPct)}<small> returning</small></p>
            <p className="ceoLine muted tnum">{fmtN(s.retention.wau)} active in 7 days · {fmtRate(s.retention.avgLogins)} logins/account</p>
          </article>

          <article className="ceoTile">
            <p className="label">Next milestone</p>
            {nextMs ? (
              <>
                <p className="ceoBig tnum">{fmtN(nextMs.current)}<small> / {fmtN(nextMs.target)} {nextMs.label}</small></p>
                <div className="thinTrack"><div className="thinFill" style={{ transform: `scaleX(${(nextMs.pct ?? 0) / 100})` }} /></div>
              </>
            ) : <p className="ceoBig">—</p>}
          </article>

          <article className="ceoTile">
            <p className="label">Road to {fmtN(s.target.goal)}</p>
            <p className="ceoBig tnum">{fmtRate(s.target.requiredPerDay)}<small>/day needed</small></p>
            <p className="ceoLine muted tnum">{fmtRate(s.target.pace7dPerDay)}/day now · {s.target.daysLeft} days left · target model, not forecast</p>
          </article>

          <article className="ceoTile">
            <p className="label">Pulse</p>
            <ul className="ceoSignals">
              {s.pulse.signals.map((x) => (
                <li key={x.id}><span>{x.label}</span>{x.value !== null && (x.isNew || x.change !== null) ? <Change change={x.change} isNew={x.isNew} /> : <span className="muted">—</span>}</li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </main>
  );
}
