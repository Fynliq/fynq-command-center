'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { MetricNumber, Reveal } from '../motion';
import { byId, v } from '../ui';

/**
 * Traffic and activation as two editorial chapters. Files, sessions and
 * people are three different counts and are labelled as such.
 */
export function ProductStory({ d }: { d: DashboardData }) {
  const tracked = byId(d.primary, 'trackedUsers');
  const accounts = byId(d.primary, 'accounts');
  const today = v(byId(d.today, 'newTrackedToday'));
  const accountsToday = v(byId(d.today, 'newAccountsToday'));
  const conv = d.performance.find((r) => r.id === 'trackedToAccount');
  const files = byId(d.uploads.metrics, 'filesSubmitted');
  const sessions = byId(d.uploads.metrics, 'uploadSessions');
  const people = byId(d.uploads.metrics, 'uniqueUploaders');
  const successful = byId(d.uploads.metrics, 'uniqueSuccessfulUploaders');
  const rate = byId(d.uploads.metrics, 'uploadSuccessRate');

  return (
    <>
      <section id="product" className="stage graphite" aria-labelledby="traffic-title">
        <div className="wrap">
          <Reveal>
            <p className="kicker lime">Traffic</p>
            <h2 id="traffic-title" className="title" style={{ marginTop: 14 }}>People find FYNQ.<br /><span className="soft">Some of them stay.</span></h2>
          </Reveal>
          <div className="pair">
            <Reveal className="card bigStat">
              <div className="v"><MetricNumber value={v(tracked)} unavailableNote /></div>
              <div className="l">Tracked users</div>
              <div className="d">Every browser FYNQ has seen.</div>
              {today !== null && <div className="up tnum">+{today.toLocaleString('en-US')} today</div>}
            </Reveal>
            <Reveal className="card bigStat" delay={80}>
              <div className="v"><MetricNumber value={v(accounts)} unavailableNote /></div>
              <div className="l">Accounts</div>
              <div className="d">Registered email-and-password accounts{accountsToday !== null ? ` · +${accountsToday} today` : ''}.</div>
              <div className="rate">
                <b><MetricNumber value={conv?.value ?? null} format="percent" decimals={1} /></b>
                <span>Visitor → Account</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="stage" aria-labelledby="activation-title">
        <div className="wrap">
          <Reveal>
            <p className="kicker lime">Activation</p>
            <h2 id="activation-title" className="title" style={{ marginTop: 14 }}>Students bring<br />their aid letters.</h2>
            <p className="lede" style={{ marginTop: 18, maxWidth: 620 }}>
              {v(rate) === null ? 'Upload success is unavailable right now.' : `${Math.round(v(rate) as number)}% of upload sessions are read successfully.`}
            </p>
          </Reveal>
          <div className="quad">
            <Reveal className="card bigStat">
              <div className="v"><MetricNumber value={v(files)} unavailableNote /></div>
              <div className="l">Files submitted</div>
              <div className="d">Every file, across all upload sessions.</div>
            </Reveal>
            <Reveal className="card bigStat" delay={60}>
              <div className="v"><MetricNumber value={v(sessions)} unavailableNote /></div>
              <div className="l">Upload sessions</div>
              <div className="d">One submission of 1–3 files.</div>
            </Reveal>
            <Reveal className="card bigStat" delay={120}>
              <div className="v"><MetricNumber value={v(people)} unavailableNote /></div>
              <div className="l">Unique uploaders</div>
              <div className="d">People, counted once whether as a guest or after signing up.</div>
            </Reveal>
            <Reveal className="card bigStat" delay={180}>
              <div className="v"><MetricNumber value={v(successful)} unavailableNote /></div>
              <div className="l">Successful uploaders</div>
              <div className="d">People with at least one document read.</div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
