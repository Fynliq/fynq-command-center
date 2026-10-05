import { METRICS, type MetricId } from './definitions';
import type { DashboardData, Metric } from './types';

/**
 * The dashboard as a CSV of aggregates: one row per metric, never a row per
 * user. Built from the same DashboardData the page renders.
 */
const cell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function dashboardCsv(d: DashboardData): string {
  const rows: unknown[][] = [['section', 'metric', 'value', 'unit', 'comparison', 'previous', 'change', 'definition']];
  const add = (section: string, m: Metric) => rows.push([
    section, m.label, m.value, m.format, m.comparison?.label ?? '', m.comparison?.previous ?? '',
    m.comparison?.change === null || m.comparison?.change === undefined ? '' : `${m.comparison.change}${m.comparison.changeUnit === 'pts' ? ' pts' : '%'}`,
    (METRICS as Record<string, { definition: string }>)[m.id as MetricId]?.definition ?? '',
  ]);
  d.primary.forEach((m) => add('Headline', m));
  d.secondary.forEach((m) => add('Secondary', m));
  d.today.forEach((m) => add('Today', m));
  d.active.forEach((m) => add('Active users', m));
  d.uploads.metrics.forEach((m) => add('Uploads', m));
  d.questions.forEach((m) => add('Questions', m));
  d.revenue.metrics.forEach((m) => add('Revenue & conversion', m));
  d.revenue.windows.forEach((m) => add('Revenue by period', m));
  d.revenue.checkouts.forEach((m) => add('Checkouts', m));
  d.analyses.metrics.forEach((m) => add('Aid analyses', m));
  d.performance.forEach((r) => rows.push(['Performance', r.label, r.value === null ? '' : Math.round(r.value * 10) / 10, 'percent', `${r.numeratorLabel} / ${r.denominatorLabel}`, '', '', `${r.numerator ?? ''} / ${r.denominator ?? ''}`]));
  d.revenue.funnel.forEach((s) => rows.push(['Funnel', s.label, s.count, 'count', 'from previous stage', '', s.fromPrevious === null ? '' : `${Math.round(s.fromPrevious * 10) / 10}%`, '']));
  d.uploads.outcomes.forEach((o) => rows.push(['Upload outcomes', o.outcome, o.sessions, 'sessions', '', '', '', `${o.files} files`]));
  d.analyses.byKind.forEach((k) => rows.push(['Analyses by document kind', k.kind, k.analyses, 'count', '', '', '', `${k.files} files`]));
  d.growth.tracked.daily.forEach((p) => rows.push(['Daily tracked users', p.key, p.added, 'new', 'cumulative', p.total, '', '']));
  d.growth.accounts.daily.forEach((p) => rows.push(['Daily accounts', p.key, p.added, 'new', 'cumulative', p.total, '', '']));
  // Traffic → Revenue: aggregates by first-touch source and campaign. The
  // recent-conversions feed is per account, so it is never exported.
  d.attribution.tiktok.forEach((m) => add('Traffic → Revenue (TikTok)', m));
  d.attribution.tiktokRates.forEach((r) => rows.push(['TikTok conversion', r.label, r.value === null ? '' : Math.round(r.value * 10) / 10, 'percent', `${r.numeratorLabel} / ${r.denominatorLabel}`, '', '', `${r.numerator ?? ''} / ${r.denominator ?? ''}`]));
  d.attribution.sources.forEach((x) => rows.push(['Source breakdown', x.label, x.visitors, 'visitors', 'accounts / uploaders / paywall / checkouts / paying / revenue', `${x.accounts} / ${x.uploaders} / ${x.paywallViews} / ${x.checkoutStarts} / ${x.payingCustomers} / $${x.revenue}`, x.visitorToPaid === null ? '' : `${Math.round(x.visitorToPaid * 10) / 10}% visitor → paid`, 'First-touch source']));
  d.attribution.campaigns.forEach((x) => rows.push(['Top campaigns', `${x.channelLabel} · ${x.campaignLabel} / ${x.contentLabel}`, x.visitors, 'visitors', 'accounts / My Aid / paywall / checkouts / payments / revenue', `${x.accounts} / ${x.myAidUsers} / ${x.paywallViews} / ${x.checkouts} / ${x.payments} / $${x.revenue}`, x.conversion === null ? '' : `${Math.round(x.conversion * 10) / 10}% visitor → paid`, '']));
  rows.push(['Generated', d.generatedAt, '', '', d.timezone, '', '', '']);
  return rows.map((r) => r.map(cell).join(',')).join('\n') + '\n';
}
