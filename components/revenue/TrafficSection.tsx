'use client';

import type { AttributionData } from '@/lib/metrics/types';
import { CampaignTable, Funnel, KpiCard, RateTable, SourceTable } from '../parts';
import { Reveal } from '../motion';

const sinceFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', year: 'numeric' });

/** Traffic → Revenue: first-touch source for visitors, accounts and payments. */
export function TrafficSection({ a }: { a: AttributionData }) {
  return (
    <section id="traffic" className="trafficSec" aria-labelledby="sources-title">
      <div className="container">
        <Reveal>
          <p className="label">Traffic → Revenue</p>
          <h2 id="sources-title" className="sectionTitle">Where they <span className="soft">come from.</span></h2>
          <p className="lead">
            {a.state === 'ok'
              ? `First touch: where each person first arrived from. ${a.trackingSince ? `Tracking since ${sinceFmt.format(new Date(a.trackingSince))}.` : 'No attributed visits yet.'} Unknown traffic is never counted as TikTok.`
              : a.state === 'not_installed'
                ? 'Source tracking turns on once its database migration is applied. Until then, everyone counts as Legacy / Unattributed.'
                : 'Data temporarily unavailable.'}
          </p>
        </Reveal>
        {a.state === 'ok' && (
          <div className="trafficBody">
            <Reveal className="kpis five">{a.tiktok.map((m) => <KpiCard key={m.id} metric={m} size="small" />)}</Reveal>
            <Reveal className="grid2">
              <div className="card">
                <p className="cardTitle">TikTok funnel</p>
                <p className="cardSub">Visitors are browsers; every later step is an account · % from the step before</p>
                <div style={{ marginTop: 16 }}><Funnel stages={a.tiktokFunnel} /></div>
              </div>
              <div className="card">
                <p className="cardTitle">TikTok conversion</p>
                <p className="cardSub">Each rate shows what it divides</p>
                <div style={{ marginTop: 6 }}><RateTable rates={a.tiktokRates} /></div>
              </div>
            </Reveal>
            <Reveal className="card">
              <p className="cardTitle">Every source</p>
              <p className="cardSub">Legacy / Unattributed: before tracking began, or no reliable source. Their payments stay in total revenue.</p>
              <div style={{ marginTop: 10 }}><SourceTable rows={a.sources} /></div>
            </Reveal>
            <Reveal className="card">
              <p className="cardTitle">Top campaigns</p>
              <p className="cardSub">Grouped by utm_campaign and utm_content, sorted by revenue</p>
              <div style={{ marginTop: 10 }}><CampaignTable rows={a.campaigns} /></div>
            </Reveal>
          </div>
        )}
      </div>
    </section>
  );
}
