'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { LineChart } from '../charts';
import { useChartHeight } from '../growth/GrowthSection';
import { MetricNumber, Reveal } from '../motion';
import { byId, fmtN, v } from '../ui';
import { Block, Chapter } from './Chapter';

/** 03 Engagement: what people do once they are in. */
export function EngagementChapter({ d }: { d: DashboardData }) {
  const e = d.story.engagement;
  const height = useChartHeight(220, 340, 0.22);
  const qRate = v(byId(d.questions, 'questionSuccessRate'));
  const rows: { label: string; value: number | null; def: string; format?: 'ratio' }[] = [
    { label: 'Questions asked', value: e.questions, def: 'Questions submitted to FYNQ.' },
    { label: 'Questions answered', value: e.answered, def: qRate === null ? 'Answered successfully.' : `Answered successfully · ${Math.round(qRate)}% of finished questions.` },
    { label: 'Aid analyses on file', value: e.analyses, def: 'Saved My Aid reads still on file (kept 30 days).' },
    { label: 'Logins, last 7 days', value: e.logins7d, def: 'Account log-ins, counted each time.' },
    { label: 'Files per uploader', value: e.filesPerUploader, def: 'Files submitted ÷ unique uploaders.', format: 'ratio' },
  ];
  return (
    <Chapter id="engagement" n="03" name="Engagement" title={<>Once they&rsquo;re in,<br /><span className="soft">they keep going.</span></>} tone="raised">
      <Reveal className="engGrid">
        <div className="engLead">
          <div>
            <span className="metricXL"><MetricNumber value={v(byId(d.active, 'wau'))} unavailableNote /></span>
            <span className="metricLabel">7-Day Active</span>
            <span className="metricNote">Tracked users seen in the last 7 days.</span>
          </div>
          <div>
            <span className="metricL"><MetricNumber value={v(byId(d.active, 'dau'))} /></span>
            <span className="metricLabel">24-Hour Active</span>
          </div>
        </div>
        <dl className="actList">
          {rows.map((r) => (
            <div key={r.label} className="actRow">
              <dt><span className="actName">{r.label}</span><span className="actDef">{r.def}</span></dt>
              <dd><MetricNumber value={r.value} format={r.format ?? 'count'} decimals={r.format === 'ratio' ? 1 : undefined} /></dd>
            </div>
          ))}
        </dl>
      </Reveal>
      {d.logins.length > 0 && (
        <Block label="Sign-ups and logins · last 30 days" right={<p className="legend2"><span><i style={{ background: 'var(--text-primary)' }} />Logins</span><span><i style={{ background: 'var(--fynq-green)' }} />Sign-ups</span></p>}>
          <LineChart
            ariaLabel="Account sign-ups and logins per day, last 30 days"
            height={height}
            points={d.logins.map((p) => ({ label: p.label, values: [p.logins, p.signups] }))}
            series={[{ name: 'Logins', color: 'var(--text-primary)' }, { name: 'Sign-ups', color: 'var(--fynq-green)' }]}
            tooltip={(_, i) => (
              <>
                <div className="tDate">{d.logins[i].label}</div>
                <div className="tMain">{fmtN(d.logins[i].logins)} logins</div>
                <div>{fmtN(d.logins[i].signups)} sign-ups</div>
              </>
            )}
          />
        </Block>
      )}
    </Chapter>
  );
}
