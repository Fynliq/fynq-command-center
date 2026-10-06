'use client';

import { useState } from 'react';
import type { DashboardData, Metric } from '@/lib/metrics/types';
import { BarChart } from '../charts';
import { useChartHeight } from '../growth/GrowthSection';
import { MetricNumber, Reveal } from '../motion';
import { Seg } from '../parts';
import { byId, Change, fmtN, fmtPct, v } from '../ui';
import { Block, Chapter } from './Chapter';

type Range = '7d' | '30d' | 'all';

/** The busiest day in view: most files; on a tie, the most recent. Nothing when no files. */
export function highestDay(points: { files: number }[]): number | null {
  let best: number | null = null;
  points.forEach((p, i) => { if (p.files > 0 && (best === null || p.files >= points[best].files)) best = i; });
  return best;
}

const DEFS: { id: string; label: string; def: string }[] = [
  { id: 'filesSubmitted', label: 'Files Submitted', def: 'Every file, summed across all upload sessions.' },
  { id: 'uploadSessions', label: 'Upload Sessions', def: 'One submission of 1–3 files to the reader.' },
  { id: 'uniqueUploaders', label: 'Unique Uploaders', def: 'People, counted once — a guest who later signs up is the same person.' },
  { id: 'uniqueSuccessfulUploaders', label: 'Successful Unique Uploaders', def: 'People with at least one session read successfully.' },
  { id: 'successfulFiles', label: 'Successful Files', def: 'Files in sessions that were read successfully.' },
  { id: 'uploadSuccessRate', label: 'Upload Success Rate', def: 'Sessions read successfully ÷ all sessions.' },
  { id: 'figuresExtracted', label: 'Figures Extracted', def: 'Aid figures the reader pulled out, summed.' },
];

/** 02 Activation: files, sessions and people are three different counts, labelled as such. */
export function ActivationChapter({ d }: { d: DashboardData }) {
  const [range, setRange] = useState<Range>('30d');
  const height = useChartHeight(240, 400, 0.26);
  const all = d.uploads.daily;
  const pts = range === '7d' ? all.slice(-7) : range === '30d' ? all.slice(-30) : all;
  const hi = highestDay(pts);
  const metric = (id: string): Metric | undefined => byId(d.uploads.metrics, id);
  const lead = metric('uniqueUploaders');
  const rate = v(metric('uploadSuccessRate'));

  return (
    <Chapter
      id="activation"
      n="02"
      name="Activation"
      title={<>People aren&rsquo;t just visiting.<br /><span className="soft">They&rsquo;re using it.</span></>}
      sub={rate === null ? undefined : `${fmtPct(rate)} of upload sessions are read successfully.`}
    >
      <Reveal className="actGrid">
        <div className="actLead">
          <span className="metricXL"><MetricNumber value={v(lead)} unavailableNote /></span>
          <span className="metricLabel">Unique Uploaders</span>
          <span className="metricNote">{DEFS[2].def}</span>
          {lead?.comparison && <span className="metricNote"><Change change={lead.comparison.change} isNew={lead.comparison.direction === 'new'} /> 7D growth</span>}
        </div>
        <dl className="actList">
          {DEFS.filter((x) => x.id !== 'uniqueUploaders').map((x) => {
            const m = metric(x.id);
            return (
              <div key={x.id} className="actRow" title={x.def}>
                <dt><span className="actName">{x.label}</span><span className="actDef">{x.def}</span></dt>
                <dd><MetricNumber value={v(m)} format={m?.format ?? 'count'} /></dd>
              </div>
            );
          })}
        </dl>
      </Reveal>

      <Block
        label="Files submitted over time"
        right={<Seg label="Files range" value={range} onChange={setRange} options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: 'all', label: 'ALL' }]} />}
      >
        <BarChart
          ariaLabel="Files submitted per day"
          height={height}
          color="var(--text-primary)"
          points={pts.map((p) => ({ label: p.label, value: p.files }))}
          annotate={hi === null ? null : { index: hi, text: `Highest upload day · ${fmtN(pts[hi].files)} files` }}
          tooltip={(_, i) => (
            <>
              <div className="tDate">{pts[i].label}</div>
              <div className="tMain">{fmtN(pts[i].files)} {pts[i].files === 1 ? 'file' : 'files'}</div>
              <div>{fmtN(pts[i].sessions)} {pts[i].sessions === 1 ? 'session' : 'sessions'}</div>
            </>
          )}
        />
      </Block>
    </Chapter>
  );
}
