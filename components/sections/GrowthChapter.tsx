'use client';

import type { DashboardData } from '@/lib/metrics/types';
import { GrowthChart } from '../growth/GrowthSection';
import { Journey } from '../funnel/Journey';
import { MetricNumber, Reveal } from '../motion';
import { byId, v } from '../ui';
import { Block, Chapter } from './Chapter';

/** 01 Growth: the tracked-user chart dominates; the journey follows. */
export function GrowthChapter({ d }: { d: DashboardData }) {
  const stats = [
    { label: 'Tracked Users', value: v(byId(d.primary, 'trackedUsers')) },
    { label: 'MAU', value: v(byId(d.primary, 'mau')) },
    { label: 'New Today', value: v(byId(d.secondary, 'newTrackedToday')) },
    { label: 'New 7D', value: v(byId(d.secondary, 'newTracked7d')) },
    { label: 'New 30D', value: v(byId(d.secondary, 'newTracked30d')) },
  ];
  return (
    <Chapter id="growth" n="01" name="Growth" title="Growth" sub="Every person who enters the FYNQ ecosystem.">
      <Reveal as="dl" className="statRow">
        {stats.map((s, i) => (
          <div key={s.label} className={i === 0 ? 'statLead' : undefined}>
            <dt>{s.label}</dt>
            <dd><MetricNumber value={s.value} /></dd>
          </div>
        ))}
      </Reveal>
      <Reveal className="wideChart">
        <GrowthChart series={d.growth.tracked} />
      </Reveal>

      <div id="journey" className="anchorPad">
        <Block label="The FYNQ Journey" right={<p className="muted small">All time · each line shows the share that reached the next stage</p>}>
          <Journey stages={d.story.journey} />
        </Block>
      </div>
    </Chapter>
  );
}
