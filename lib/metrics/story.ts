/**
 * The storytelling layer: Pulse, the conversion journey, milestones, the
 * 5,000-user target and the live activity feed.
 *
 * Every number here is read from metrics computeDashboard has already
 * produced (same definitions, same exclusions) or, for the live feed, from
 * the same raw rows with the same real-money filter. Nothing is estimated,
 * and no sentence is written by AI: each is a fixed template chosen by a
 * stated rule. The feed carries an event kind, a time and a count only.
 */

import type { DashboardData, LiveEvent, Metric, RawData, StoryData, StoryJourneyStage } from './types';
import { addDays, dayKey, toMs } from './time';

const find = (list: Metric[], id: string) => list.find((m) => m.id === id);
const val = (m: Metric | undefined) => (m && m.status === 'ok' ? m.value : null);

export const MILESTONES: { id: string; metric: 'trackedUsers' | 'accounts' | 'paidCustomers'; target: number; label: string }[] = [
  { id: 'users500', metric: 'trackedUsers', target: 500, label: 'tracked users' },
  { id: 'users1000', metric: 'trackedUsers', target: 1000, label: 'tracked users' },
  { id: 'users2500', metric: 'trackedUsers', target: 2500, label: 'tracked users' },
  { id: 'users5000', metric: 'trackedUsers', target: 5000, label: 'tracked users' },
  { id: 'accounts100', metric: 'accounts', target: 100, label: 'accounts' },
  { id: 'accounts250', metric: 'accounts', target: 250, label: 'accounts' },
  { id: 'paid25', metric: 'paidCustomers', target: 25, label: 'paying customers' },
  { id: 'paid100', metric: 'paidCustomers', target: 100, label: 'paying customers' },
];

export const TARGET = { users: 5000, month: 12, day: 31 };

/**
 * "Growth is accelerating" when this week's new users beat last week's by
 * more than 20%, "slowed" when they fall more than 20% short, "steady"
 * otherwise. With nothing last week, any growth is "has started".
 */
export function trendWord(current: number | null, previous: number | null): 'accelerating' | 'steady' | 'slowed' | 'started' | 'quiet' | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current > 0 ? 'started' : 'quiet';
  if (current > previous * 1.2) return 'accelerating';
  if (current < previous * 0.8) return 'slowed';
  return 'steady';
}

const HEADLINE = {
  accelerating: 'Growth is accelerating.',
  steady: 'Growth is steady.',
  slowed: 'Growth has slowed this week.',
  started: 'Growth has started.',
  quiet: 'A quiet week so far.',
} as const;

const SIGNUP_LINE = {
  accelerating: 'Sign-ups are up on last week.',
  steady: 'Sign-ups are in line with last week.',
  slowed: 'Sign-ups are below last week.',
  started: 'The first sign-ups of the fortnight are in.',
  quiet: 'No new sign-ups this week yet.',
} as const;

/** Days from today (Chicago) to the target date, at least 1. */
export function daysUntil(now: number, month: number, day: number): number {
  const today = dayKey(now);
  const year = Number(today.slice(0, 4));
  let target = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (target < today) target = `${year + 1}-${target.slice(5)}`;
  let n = 0;
  for (let k = today; k < target && n < 800; k = addDays(k, 1)) n += 1;
  return Math.max(1, n);
}

export function buildStory(raw: RawData, d: Omit<DashboardData, 'story'>, now: number): StoryData {
  const tracked = val(find(d.primary, 'trackedUsers'));
  const accounts = val(find(d.primary, 'accounts'));
  const paid = val(find(d.primary, 'paidCustomers'));
  const revenue = val(find(d.primary, 'realRevenue'));
  const uploaders = val(find(d.uploads.metrics, 'uniqueUploaders'));
  const new7 = find(d.secondary, 'newTracked7d');
  const new30 = find(d.secondary, 'newTracked30d');
  const acc7 = find(d.secondary, 'newAccounts7d');
  const todayUsers = val(find(d.today, 'newTrackedToday'));
  const todayAccounts = val(find(d.today, 'newAccountsToday'));
  const todayFiles = val(d.today.find((m) => m.id === 'filesSubmitted'));
  const todayRevenue = val(d.today.find((m) => m.id === 'revenueToday'));

  // ---- Pulse
  const userTrend = trendWord(val(new7), new7?.comparison?.previous ?? null);
  const accountTrend = trendWord(val(acc7), acc7?.comparison?.previous ?? null);
  const pulse = {
    headline: userTrend ? HEADLINE[userTrend] : 'Data temporarily unavailable.',
    tone: userTrend,
    detail: accountTrend ? SIGNUP_LINE[accountTrend] : null,
    rule: 'Compares new tracked users in the last 7 days with the 7 days before: more than 20% higher is accelerating, more than 20% lower has slowed, otherwise steady.',
    items: [
      { id: 'users', label: 'Tracked users', value: todayUsers, format: 'count' as const, suffix: 'today' },
      { id: 'accounts', label: 'Accounts', value: todayAccounts, format: 'count' as const, suffix: 'today' },
      { id: 'files', label: 'Files uploaded', value: todayFiles, format: 'count' as const, suffix: 'today' },
      { id: 'revenue', label: 'Revenue', value: todayRevenue, format: 'usd' as const, suffix: 'today' },
    ],
  };

  // ---- the journey: one person-count per step, % from the step before
  const stage = (id: string) => d.revenue.funnel.find((s) => s.id === id)?.count ?? null;
  const funnelOk = d.revenue.funnel.length > 0;
  const steps: { id: string; label: string; count: number | null; unit: string }[] = [
    { id: 'tracked', label: 'Tracked users', count: tracked, unit: 'browsers' },
    { id: 'accounts', label: 'Accounts', count: accounts, unit: 'accounts' },
    { id: 'uploaders', label: 'Unique uploaders', count: uploaders, unit: 'people' },
    { id: 'paywall', label: 'Paywall views', count: funnelOk ? stage('paywall') : null, unit: 'accounts' },
    { id: 'unlock', label: 'Unlock clicks', count: funnelOk ? stage('unlock') : null, unit: 'accounts' },
    { id: 'checkout', label: 'Checkouts', count: funnelOk ? stage('checkout_created') : null, unit: 'accounts' },
    { id: 'paid', label: 'Payments', count: paid, unit: 'paying customers' },
  ];
  const journey: StoryJourneyStage[] = steps.map((s, i) => {
    const prev = i === 0 ? null : steps[i - 1].count;
    return { ...s, fromPrevious: s.count !== null && prev ? (s.count / prev) * 100 : null };
  });

  // ---- milestones
  const current = { trackedUsers: tracked, accounts, paidCustomers: paid };
  const milestones = MILESTONES.map((m) => {
    const c = current[m.metric];
    return { id: m.id, label: `${m.target.toLocaleString('en-US')} ${m.label}`, current: c, target: m.target, pct: c === null ? null : Math.min(100, (c / m.target) * 100), done: c !== null && c >= m.target };
  });

  // ---- road to 5,000 (a target, not a forecast)
  const daysLeft = daysUntil(now, TARGET.month, TARGET.day);
  const pace7 = val(new7) === null ? null : (val(new7) as number) / 7;
  const required = tracked === null ? null : Math.max(0, TARGET.users - tracked) / daysLeft;
  const target = {
    goal: TARGET.users,
    current: tracked,
    deadline: `${dayKey(now).slice(0, 4)}-12-31`,
    daysLeft,
    pct: tracked === null ? null : Math.min(100, (tracked / TARGET.users) * 100),
    requiredPerDay: required,
    pace7dPerDay: pace7,
    gapPerDay: required === null || pace7 === null ? null : pace7 - required,
  };

  // ---- live feed: what happened, when. No ids, no emails, no places.
  // Same rules as the counts: money events are live, non-test and not from
  // an excluded account; everything else counts as the dashboard counts it.
  const excluded = new Set(raw.excludedAccountIds);
  const real = (r: { livemode: boolean | null; is_test_account: boolean | null; account_id: string | null }) =>
    r.livemode === true && r.is_test_account !== true && !(r.account_id && excluded.has(r.account_id));
  const events: LiveEvent[] = [];
  const push = (kind: LiveEvent['kind'], at: number | null, count = 1) => { if (at !== null && at <= now) events.push({ kind, at: new Date(at).toISOString(), count }); };
  if (!raw.failed.includes('trackedUsers')) for (const u of raw.trackedUsers) push('visitor', toMs(u.created_at));
  if (!raw.failed.includes('accounts')) for (const a of raw.accounts) push('account', toMs(a.created_at));
  if (!raw.failed.includes('uploads')) for (const u of raw.uploads) push('files', toMs(u.created_at), Math.max(0, u.files ?? 0));
  if (!raw.failed.includes('questions')) for (const q of raw.questions) if (q.state === 'success') push('answer', toMs(q.finished_at) ?? toMs(q.created_at));
  if (!raw.failed.includes('checkouts')) for (const c of raw.checkouts) if (real(c)) push('checkout', toMs(c.created_at));
  if (!raw.failed.includes('entitlements')) for (const e of raw.entitlements) if (real(e) && e.status === 'active') push('payment', toMs(e.paid_at) ?? toMs(e.activated_at));
  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // Back-to-back visitors read better as one line: "5 new visitors".
  const feed: LiveEvent[] = [];
  for (const e of events) {
    const last = feed[feed.length - 1];
    if (e.kind === 'visitor' && last?.kind === 'visitor') last.count += 1;
    else feed.push({ ...e });
  }

  // ---- revenue extras
  const paywallViewers = funnelOk ? stage('paywall') : null;
  const paywallConversion = paid !== null && paywallViewers ? (paid / paywallViewers) * 100 : null;

  return {
    pulse,
    journey,
    milestones,
    target,
    live: feed.slice(0, 12),
    moment: {
      total: tracked,
      today: todayUsers,
      week: val(new7),
      month: val(new30),
    },
    paywallConversion,
    revenue,
  };
}
