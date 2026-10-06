/**
 * The storytelling layer: Pulse, Growth Velocity, the journey, the payment
 * funnel, the revenue timeline, retention, engagement, milestones, the
 * 5,000-user target and the live activity feed.
 *
 * Every number here is either a metric computeDashboard already produced
 * (same definitions, same exclusions) or is counted from the same raw rows
 * with the same rules. Nothing is estimated and no sentence is written by
 * AI: each label is chosen by a stated, fixed rule. The live feed carries an
 * event kind, a time and a count only: never who, never where.
 */

import type { DashboardData, LiveEvent, Metric, RawData, StoryData, StoryJourneyStage } from './types';
import { addDays, dayKey, dayLabel, daysBetween, inWindow, toMs, windows } from './time';

const find = (list: Metric[], id: string) => list.find((m) => m.id === id);
const val = (m: Metric | undefined) => (m && m.status === 'ok' ? m.value : null);
const pctChange = (cur: number | null, prev: number | null) => (cur === null || prev === null || prev === 0 ? null : ((cur - prev) / prev) * 100);

export const MILESTONES: { id: string; metric: 'trackedUsers' | 'accounts' | 'paidCustomers'; target: number; label: string }[] = [
  { id: 'users500', metric: 'trackedUsers', target: 500, label: 'tracked users' },
  { id: 'users1000', metric: 'trackedUsers', target: 1000, label: 'tracked users' },
  { id: 'users2500', metric: 'trackedUsers', target: 2500, label: 'tracked users' },
  { id: 'users5000', metric: 'trackedUsers', target: 5000, label: 'tracked users' },
  { id: 'users10000', metric: 'trackedUsers', target: 10000, label: 'tracked users' },
  { id: 'accounts100', metric: 'accounts', target: 100, label: 'accounts' },
  { id: 'accounts500', metric: 'accounts', target: 500, label: 'accounts' },
  { id: 'accounts1000', metric: 'accounts', target: 1000, label: 'accounts' },
  { id: 'paid10', metric: 'paidCustomers', target: 10, label: 'customers' },
  { id: 'paid25', metric: 'paidCustomers', target: 25, label: 'customers' },
  { id: 'paid100', metric: 'paidCustomers', target: 100, label: 'customers' },
];

export const TARGET = { users: 5000, month: 12, day: 31 };

export const VELOCITY_RULE = 'New tracked users in the last 7 days ÷ 7, compared with the 7 days before. More than 10% faster is accelerating, more than 10% slower is slowing, otherwise stable.';
export const PULSE_RULE = 'Based on new tracked users in the last 7 days against the 7 days before: +20% or more (with sign-ups not falling) is Accelerating, +5% or more is Growing, down by less than 10% is Steady, down 10% or more is Cooling. A week after a week with none is Growing.';

/** Growth Velocity: today's pace against last week's pace. */
export function velocityState(current: number | null, previous: number | null): 'accelerating' | 'stable' | 'slowing' | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return current > 0 ? 'accelerating' : 'stable';
  if (current > previous * 1.1) return 'accelerating';
  if (current < previous * 0.9) return 'slowing';
  return 'stable';
}

/** FYNQ Pulse, from traffic and sign-up change over 7 days (see PULSE_RULE). */
export function pulseState(traffic: { cur: number | null; prev: number | null }, accountsChange: number | null): 'accelerating' | 'growing' | 'steady' | 'cooling' | null {
  if (traffic.cur === null || traffic.prev === null) return null;
  if (traffic.prev === 0) return traffic.cur > 0 ? 'growing' : 'steady';
  const t = ((traffic.cur - traffic.prev) / traffic.prev) * 100;
  if (t >= 20 && (accountsChange === null || accountsChange >= 0)) return 'accelerating';
  if (t >= 5) return 'growing';
  if (t > -10) return 'steady';
  return 'cooling';
}

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

/** The step that loses the largest share of people, or null when nothing can be compared. */
export function biggestDrop(stages: { id: string; label: string; count: number | null }[]) {
  let best: { from: string; to: string; lost: number; pct: number } | null = null;
  for (let i = 1; i < stages.length; i++) {
    const a = stages[i - 1].count;
    const b = stages[i].count;
    if (a === null || b === null || a <= 0) continue;
    const pct = Math.max(0, ((a - b) / a) * 100);
    if (!best || pct > best.pct) best = { from: stages[i - 1].label, to: stages[i].label, lost: Math.max(0, a - b), pct };
  }
  return best;
}

const withRates = (steps: { id: string; label: string; count: number | null; unit: string }[]): StoryJourneyStage[] =>
  steps.map((s, i) => {
    const prev = i === 0 ? null : steps[i - 1].count;
    return { ...s, fromPrevious: s.count !== null && prev ? (s.count / prev) * 100 : null };
  });

export function buildStory(raw: RawData, d: Omit<DashboardData, 'story'>, now: number): StoryData {
  const w = windows(now);
  const ok = (k: RawData['failed'][number]) => !raw.failed.includes(k);
  const excluded = new Set(raw.excludedAccountIds);
  const real = (r: { livemode: boolean | null; is_test_account: boolean | null; account_id: string | null }) =>
    r.livemode === true && r.is_test_account !== true && !(r.account_id && excluded.has(r.account_id));

  const tracked = val(find(d.primary, 'trackedUsers'));
  const accounts = val(find(d.primary, 'accounts'));
  const paid = val(find(d.primary, 'paidCustomers'));
  const revenue = val(find(d.primary, 'realRevenue'));
  const mau = val(find(d.primary, 'mau'));
  const uploaders = val(find(d.uploads.metrics, 'uniqueUploaders'));
  const successfulUploaders = val(find(d.uploads.metrics, 'uniqueSuccessfulUploaders'));
  const new7 = find(d.secondary, 'newTracked7d');
  const new30 = find(d.secondary, 'newTracked30d');
  const acc7 = find(d.secondary, 'newAccounts7d');
  const todayUsers = val(find(d.today, 'newTrackedToday'));

  // ---- Growth Velocity
  const cur7 = val(new7);
  const prev7 = cur7 === null ? null : new7?.comparison?.previous ?? null;
  const velocity = {
    current: cur7 === null ? null : cur7 / 7,
    previous: prev7 === null ? null : prev7 / 7,
    state: velocityState(cur7, prev7),
    rule: VELOCITY_RULE,
  };

  // ---- Pulse
  const uploadsCur = ok('uploads') ? raw.uploads.filter((u) => inWindow(toMs(u.created_at), w.d7.current)).length : null;
  const uploadsPrev = ok('uploads') ? raw.uploads.filter((u) => inWindow(toMs(u.created_at), w.d7.previous)).length : null;
  const accCur = val(acc7);
  const accPrev = accCur === null ? null : acc7?.comparison?.previous ?? null;
  const accountsChange = pctChange(accCur, accPrev);
  const state = pulseState({ cur: cur7, prev: prev7 }, accountsChange);
  const signal = (id: string, label: string, cur: number | null, prev: number | null) => ({ id, label, value: cur, change: pctChange(cur, prev), isNew: prev === 0 && (cur ?? 0) > 0 });
  const pulse = {
    state,
    label: state ? state.toUpperCase() : 'UNAVAILABLE',
    signals: [
      signal('traffic', 'Traffic', cur7, prev7),
      signal('accounts', 'Accounts', accCur, accPrev),
      signal('uploads', 'Uploads', uploadsCur, uploadsPrev),
    ],
    customers: paid,
    rule: PULSE_RULE,
  };

  // ---- the journey (people) and the payment funnel (accounts)
  const funnelOk = d.revenue.funnel.length > 0;
  const stage = (id: string) => (funnelOk ? d.revenue.funnel.find((s) => s.id === id)?.count ?? 0 : null);
  const journey = withRates([
    { id: 'visitor', label: 'Visitors', count: tracked, unit: 'tracked users' },
    { id: 'account', label: 'Accounts', count: accounts, unit: 'registered' },
    { id: 'upload', label: 'Uploaders', count: uploaders, unit: 'unique people who uploaded' },
    { id: 'value', label: 'Value', count: successfulUploaders, unit: 'got a document read' },
    { id: 'paywall', label: 'Paywall', count: stage('paywall'), unit: 'accounts that saw it' },
    { id: 'checkout', label: 'Checkout', count: stage('checkout_created'), unit: 'accounts that started one' },
    { id: 'customer', label: 'Customers', count: paid, unit: 'live, paying' },
  ]);
  const payStages = withRates([
    { id: 'paywall', label: 'Paywall views', count: stage('paywall'), unit: 'accounts' },
    { id: 'unlock', label: 'Unlock clicks', count: stage('unlock'), unit: 'accounts' },
    { id: 'checkout_created', label: 'Checkout created', count: stage('checkout_created'), unit: 'accounts' },
    { id: 'checkout_completed', label: 'Checkout completed', count: stage('checkout_completed'), unit: 'accounts' },
    { id: 'payment_confirmed', label: 'Payment confirmed', count: stage('payment_confirmed'), unit: 'accounts' },
    { id: 'customers', label: 'Customers', count: paid, unit: 'live, paying' },
  ]);
  const paymentFunnel = { stages: payStages, biggestDrop: biggestDrop(payStages) };

  // ---- revenue timeline: live, non-test, not excluded, active entitlements
  const valid = ok('entitlements') ? raw.entitlements.filter((e) => real(e) && e.status === 'active') : [];
  const paidTimes = valid.map((e) => ({ at: toMs(e.paid_at) ?? toMs(e.activated_at), cents: Math.max(0, e.amount ?? 0), account: e.account_id })).filter((p): p is { at: number; cents: number; account: string } => p.at !== null).sort((a, b) => a.at - b.at);
  const firstDay = d.growth.tracked.daily[0]?.key ?? (paidTimes[0] ? dayKey(paidTimes[0].at) : addDays(dayKey(now), -29));
  const byDay = new Map<string, { cents: number; accounts: string[] }>();
  for (const p of paidTimes) { const k = dayKey(p.at); const e = byDay.get(k) ?? { cents: 0, accounts: [] }; e.cents += p.cents; e.accounts.push(p.account); byDay.set(k, e); }
  let cum = 0;
  const seen = new Set<string>();
  const revenueSeries = ok('entitlements') ? daysBetween(firstDay < dayKey(now) ? firstDay : dayKey(now), dayKey(now)).map((key) => {
    const e = byDay.get(key);
    cum += e?.cents ?? 0;
    for (const a of e?.accounts ?? []) seen.add(a);
    return { key, label: dayLabel(key), revenue: (e?.cents ?? 0) / 100, cumulative: cum / 100, customers: seen.size };
  }) : [];

  // ---- today extras
  const readsToday = ok('uploads') ? raw.uploads.filter((u) => u.outcome === 'read' && inWindow(toMs(u.created_at), w.today.current)).length : null;
  const readsYesterday = ok('uploads') ? raw.uploads.filter((u) => u.outcome === 'read' && inWindow(toMs(u.created_at), w.today.previous)).length : null;

  // ---- retention (no cohorts: the data has no per-week activity history per account)
  const returning = val(find(d.secondary, 'returningAccounts'));
  const logins = ok('accounts') ? raw.accounts.reduce((n, a) => n + Math.max(0, a.login_count ?? 0), 0) : null;
  const retention = {
    returning,
    returningPct: returning !== null && accounts ? (returning / accounts) * 100 : null,
    wau: val(d.active.find((m) => m.id === 'wau')),
    dau: val(d.active.find((m) => m.id === 'dau')),
    mau,
    avgLogins: logins !== null && accounts ? logins / accounts : null,
    cohortsAvailable: false,
  };

  // ---- engagement
  const logins7d = ok('accountEvents') ? raw.accountEvents.filter((e) => e.event_type === 'logged_in' && inWindow(toMs(e.created_at), w.d7.current)).length : null;
  const engagement = {
    questions: val(find(d.questions, 'questions')),
    answered: val(find(d.questions, 'questionsAnswered')),
    analyses: val(find(d.analyses.metrics, 'analyses')),
    logins7d,
    filesPerUploader: val(find(d.uploads.metrics, 'filesPerUploader')),
  };

  // ---- milestones, with the date each was reached when the rows say so
  const sortedTimes = (times: (number | null)[]) => times.filter((t): t is number => t !== null).sort((a, b) => a - b);
  const reachedAt: Record<string, number[]> = {
    trackedUsers: ok('trackedUsers') ? sortedTimes(raw.trackedUsers.map((u) => toMs(u.created_at))) : [],
    accounts: ok('accounts') ? sortedTimes(raw.accounts.map((a) => toMs(a.created_at))) : [],
    paidCustomers: (() => { const s = new Set<string>(); const out: number[] = []; for (const p of paidTimes) if (!s.has(p.account)) { s.add(p.account); out.push(p.at); } return out; })(),
  };
  const current = { trackedUsers: tracked, accounts, paidCustomers: paid };
  const milestones = MILESTONES.map((m) => {
    const c = current[m.metric];
    const done = c !== null && c >= m.target;
    const t = done ? reachedAt[m.metric][m.target - 1] : undefined;
    return { id: m.id, metric: m.metric, label: m.label, current: c, target: m.target, pct: c === null ? null : Math.min(100, (c / m.target) * 100), done, completedAt: t ? new Date(t).toISOString() : null };
  });

  // ---- road to 5,000 (a target model, not a forecast)
  const daysLeft = daysUntil(now, TARGET.month, TARGET.day);
  const pace7 = cur7 === null ? null : cur7 / 7;
  const remaining = tracked === null ? null : Math.max(0, TARGET.users - tracked);
  const required = remaining === null ? null : remaining / daysLeft;
  const target = {
    goal: TARGET.users,
    current: tracked,
    remaining,
    deadline: `${dayKey(now).slice(0, 4)}-12-31`,
    daysLeft,
    pct: tracked === null ? null : Math.min(100, (tracked / TARGET.users) * 100),
    requiredPerDay: required,
    pace7dPerDay: pace7,
    gapPerDay: required === null || pace7 === null ? null : pace7 - required,
  };

  // ---- live feed: what happened and when. Money and paywall events follow the real-money rule.
  const events: LiveEvent[] = [];
  const push = (kind: LiveEvent['kind'], at: number | null, count = 1) => { if (at !== null && at <= now) events.push({ kind, at: new Date(at).toISOString(), count }); };
  if (ok('trackedUsers')) for (const u of raw.trackedUsers) push('visitor', toMs(u.created_at));
  if (ok('accounts')) for (const a of raw.accounts) push('account', toMs(a.created_at));
  if (ok('uploads')) for (const u of raw.uploads) push(u.outcome === 'read' ? 'upload' : 'files', toMs(u.created_at), Math.max(0, u.files ?? 0));
  if (ok('questions')) for (const q of raw.questions) if (q.state === 'success') push('answer', toMs(q.finished_at) ?? toMs(q.created_at));
  if (ok('monetization')) for (const m of raw.monetization) if (m.event_type === 'paywall_viewed' && real(m)) push('paywall', toMs(m.created_at));
  if (ok('checkouts')) for (const c of raw.checkouts) if (real(c)) push('checkout', toMs(c.created_at));
  if (ok('entitlements')) for (const p of paidTimes) push('payment', p.at);
  events.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  // Back-to-back visitors read better as one line: "5 new visitors".
  const feed: LiveEvent[] = [];
  for (const e of events) {
    const last = feed[feed.length - 1];
    if (e.kind === 'visitor' && last?.kind === 'visitor') last.count += 1;
    else feed.push({ ...e });
  }

  const paywallViewers = stage('paywall');
  return {
    velocity,
    pulse,
    journey,
    paymentFunnel,
    revenueSeries,
    todayExtra: { reads: readsToday, readsYesterday },
    retention,
    engagement,
    milestones,
    target,
    live: feed.slice(0, 14),
    moment: { total: tracked, today: todayUsers, week: cur7, month: val(new30) },
    paywallConversion: paid !== null && paywallViewers ? (paid / paywallViewers) * 100 : null,
    revenue,
  };
}
