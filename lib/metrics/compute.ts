/**
 * The metrics layer: raw rows in, aggregate numbers out.
 *
 * Pure functions only (no I/O, no clock): `now` is passed in, so every number
 * is reproducible in tests. This is the one place where anything is counted;
 * cards, charts, the summary, the performance page and the CSV all read the
 * same DashboardData.
 */

import { FUNNEL, METRICS, SOURCE_NAMES, type MetricId } from './definitions';
import { DAY, HOUR, addDays, dayKey, dayLabel, daysBetween, hourLabel, inWindow, toMs, windows, type Window, type WindowPair } from './time';
import type {
  ActivityBlock, Comparison, DashboardData, FunnelStage, GrowthSeries, Metric, MetricFormat, RateMetric, RawData, SourceKey,
} from './types';

// ------------------------------------------------------------ building blocks

const pct = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Change for counts and money: percent, never invented when there is nothing to compare with. */
export function countChange(current: number | null, previous: number | null, label: string): Comparison | null {
  if (current === null || previous === null) return null;
  if (previous === 0) return { previous, change: null, changeUnit: '%', direction: current > 0 ? 'new' : 'flat', label };
  const change = round1(((current - previous) / previous) * 100);
  return { previous, change, changeUnit: '%', direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', label };
}

/** Change for rates: percentage points. */
export function rateChange(current: number | null, previous: number | null, label: string): Comparison | null {
  if (current === null || previous === null) return null;
  const change = round1(current - previous);
  return { previous, change, changeUnit: 'pts', direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat', label };
}

function metric(id: MetricId, value: number | null, format: MetricFormat, comparison: Comparison | null, ok: boolean, note?: string): Metric {
  return { id, label: METRICS[id].label, value: ok ? value : null, format, comparison: ok ? comparison : null, note: ok ? note : undefined, status: ok ? 'ok' : 'unavailable' };
}

const countIn = (times: (number | null)[], w: Window) => times.reduce<number>((n, t) => n + (inWindow(t, w) ? 1 : 0), 0);
const countBefore = (times: (number | null)[], at: number) => times.reduce<number>((n, t) => n + (t !== null && t < at ? 1 : 0), 0);

/** New-in-window metric with its previous-period comparison. */
function windowMetric(id: MetricId, times: (number | null)[], pair: WindowPair, ok: boolean): Metric {
  const current = countIn(times, pair.current);
  const previous = countIn(times, pair.previous);
  return metric(id, current, 'count', countChange(current, previous, pair.compareLabel), ok);
}

/** A running total compared with the same total as of 7 days ago. */
function totalMetric(id: MetricId, times: (number | null)[], weekAgo: number, ok: boolean, note?: string): Metric {
  const current = times.length;
  const previous = countBefore(times, weekAgo);
  return metric(id, current, 'count', countChange(current, previous, 'vs 7 days ago'), ok, note);
}

/** Daily and hourly growth for any list of creation times. */
export function growthSeries(times: (number | null)[], now: number): GrowthSeries {
  const valid = times.filter((t): t is number => t !== null).sort((a, b) => a - b);
  const today = dayKey(now);
  const byDay = new Map<string, number>();
  for (const t of valid) byDay.set(dayKey(t), (byDay.get(dayKey(t)) ?? 0) + 1);
  const first = valid.length ? dayKey(valid[0]) : addDays(today, -29);
  let total = 0;
  const daily = daysBetween(first < today ? first : today, today).map((key) => {
    const added = byDay.get(key) ?? 0;
    total += added;
    return { key, label: dayLabel(key), added, total };
  });

  const hourStart = now - (now % HOUR);
  const firstHour = hourStart - 23 * HOUR;
  let running = valid.filter((t) => t < firstHour).length;
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const start = firstHour + i * HOUR;
    const added = valid.filter((t) => t >= start && t < start + HOUR).length;
    running += added;
    return { key: new Date(start).toISOString(), label: hourLabel(start), added, total: running };
  });
  return { daily, hourly };
}

// ------------------------------------------------------------ identities

/**
 * One uploader, however they arrived: their account, else the account their
 * guest browser was later linked to, else the guest browser itself.
 */
export function canonicalUploader(row: { account_id: string | null; guest_id: string | null }, guestToAccount: Map<string, string>): string | null {
  if (row.account_id) return `a:${row.account_id}`;
  if (row.guest_id) {
    const linked = guestToAccount.get(row.guest_id);
    return linked ? `a:${linked}` : `g:${row.guest_id}`;
  }
  return null;
}

// ------------------------------------------------------------ the dashboard

export function computeDashboard(raw: RawData, now: number): DashboardData {
  const w = windows(now);
  const ok = (...sources: SourceKey[]) => sources.every((s) => !raw.failed.includes(s));
  const excluded = new Set(raw.excludedAccountIds);
  const real = (r: { livemode: boolean | null; is_test_account: boolean | null; account_id: string | null }) =>
    r.livemode === true && r.is_test_account !== true && !(r.account_id && excluded.has(r.account_id));

  // ---- people
  const trackedCreated = raw.trackedUsers.map((u) => toMs(u.created_at));
  const trackedActive = raw.trackedUsers.map((u) => toMs(u.last_active_at) ?? toMs(u.created_at));
  const activeSince = (since: number) => trackedActive.filter((t) => t !== null && t >= since).length;
  const okUsers = ok('trackedUsers');

  const mau = metric('mau', activeSince(now - 30 * DAY), 'count', null, okUsers, 'Active in the last 30 days');
  const wau = metric('wau', activeSince(now - 7 * DAY), 'count', null, okUsers);
  const dau = metric('dau', activeSince(now - DAY), 'count', null, okUsers);

  // ---- accounts
  const okAccounts = ok('accounts');
  const accountCreated = raw.accounts.map((a) => toMs(a.created_at));
  const returning = raw.accounts.filter((a) => (a.login_count ?? 0) > 1).length;
  const returningRate = pct(returning, raw.accounts.length);
  // login_count has no history, so the returning rate has no honest comparison.
  const returningMetric = metric('returningAccounts', returning, 'count', null, okAccounts, returningRate === null ? undefined : `${Math.round(returningRate)}% of accounts`);

  // ---- uploads
  const okUploads = ok('uploads', 'guestLinks');
  const guestToAccount = new Map(raw.guestLinks.map((g) => [g.guest_id, g.user_id]));
  const uploads = raw.uploads.map((u) => ({ ...u, at: toMs(u.created_at), who: canonicalUploader(u, guestToAccount), filesN: Math.max(0, u.files ?? 0), figuresN: Math.max(0, u.figures ?? 0), read: u.outcome === 'read' }));
  const sumFiles = (xs: typeof uploads) => xs.reduce((n, u) => n + u.filesN, 0);
  const uploadersOf = (xs: typeof uploads) => new Set(xs.map((u) => u.who).filter((x): x is string => x !== null));
  const uploadsBefore = uploads.filter((u) => u.at !== null && u.at < w.weekAgo);
  const sessions = uploads.length;
  const readSessions = uploads.filter((u) => u.read);
  const uniqueUploaders = uploadersOf(uploads).size;
  const uniqueSuccessful = uploadersOf(readSessions).size;
  const successRate = pct(readSessions.length, sessions);
  const successRateBefore = pct(uploadsBefore.filter((u) => u.read).length, uploadsBefore.length);
  const filesSubmitted = sumFiles(uploads);

  const uploadMetrics = [
    metric('filesSubmitted', filesSubmitted, 'count', countChange(filesSubmitted, sumFiles(uploadsBefore), 'vs 7 days ago'), okUploads),
    metric('uploadSessions', sessions, 'count', countChange(sessions, uploadsBefore.length, 'vs 7 days ago'), okUploads),
    metric('uniqueUploaders', uniqueUploaders, 'count', countChange(uniqueUploaders, uploadersOf(uploadsBefore).size, 'vs 7 days ago'), okUploads),
    metric('uniqueSuccessfulUploaders', uniqueSuccessful, 'count', countChange(uniqueSuccessful, uploadersOf(uploadsBefore.filter((u) => u.read)).size, 'vs 7 days ago'), okUploads),
    metric('uploadSuccessRate', successRate, 'percent', rateChange(successRate, successRateBefore, 'vs 7 days ago'), okUploads, `${readSessions.length} of ${sessions} sessions`),
    metric('figuresExtracted', uploads.reduce((n, u) => n + u.figuresN, 0), 'count', countChange(uploads.reduce((n, u) => n + u.figuresN, 0), uploadsBefore.reduce((n, u) => n + u.figuresN, 0), 'vs 7 days ago'), okUploads),
    metric('successfulFiles', sumFiles(readSessions), 'count', countChange(sumFiles(readSessions), sumFiles(uploadsBefore.filter((u) => u.read)), 'vs 7 days ago'), okUploads),
    metric('filesPerUploader', uniqueUploaders ? Math.round((filesSubmitted / uniqueUploaders) * 10) / 10 : null, 'ratio', null, okUploads),
    metric('successfulSessions', readSessions.length, 'count', countChange(readSessions.length, uploadsBefore.filter((u) => u.read).length, 'vs 7 days ago'), okUploads),
  ];

  const uploadDays = new Map<string, { files: number; sessions: number }>();
  for (const u of uploads) {
    if (u.at === null) continue;
    const k = dayKey(u.at);
    const e = uploadDays.get(k) ?? { files: 0, sessions: 0 };
    e.files += u.filesN; e.sessions += 1;
    uploadDays.set(k, e);
  }
  const firstUpload = [...uploadDays.keys()].sort()[0] ?? addDays(dayKey(now), -29);
  const uploadDaily = daysBetween(firstUpload, dayKey(now)).map((key) => ({ key, label: dayLabel(key), files: uploadDays.get(key)?.files ?? 0, sessions: uploadDays.get(key)?.sessions ?? 0 }));
  const outcomeMap = new Map<string, { sessions: number; files: number }>();
  for (const u of uploads) {
    const k = u.outcome ?? 'unknown';
    const e = outcomeMap.get(k) ?? { sessions: 0, files: 0 };
    e.sessions += 1; e.files += u.filesN;
    outcomeMap.set(k, e);
  }
  const outcomes = [...outcomeMap.entries()].map(([outcome, v]) => ({ outcome, ...v })).sort((a, b) => b.sessions - a.sessions);

  // ---- questions
  const okQuestions = ok('questions');
  const finished = raw.questions.filter((q) => q.finished_at || (q.state && q.state !== 'pending'));
  const answered = raw.questions.filter((q) => q.state === 'success').length;
  const failed = finished.filter((q) => q.state !== 'success').length;
  const pending = raw.questions.length - finished.length;
  const qRate = pct(answered, finished.length);
  const questionTimes = raw.questions.map((q) => toMs(q.created_at));
  const questionMetrics = [
    totalMetric('questions', questionTimes, w.weekAgo, okQuestions),
    metric('questionsAnswered', answered, 'count', countChange(answered, raw.questions.filter((q) => q.state === 'success' && (toMs(q.created_at) ?? Infinity) < w.weekAgo).length, 'vs 7 days ago'), okQuestions),
    metric('questionsFailed', failed, 'count', null, okQuestions),
    metric('questionsPending', pending, 'count', null, okQuestions),
    metric('questionSuccessRate', qRate, 'percent', null, okQuestions, `${answered} of ${finished.length} finished`),
  ];

  // ---- money
  const okMoney = ok('entitlements', 'exclusions');
  const validEntitlements = raw.entitlements.filter((e) => real(e) && e.status === 'active');
  const paidAt = (e: (typeof validEntitlements)[number]) => toMs(e.paid_at) ?? toMs(e.activated_at);
  const cents = (xs: typeof validEntitlements) => xs.reduce((n, e) => n + Math.max(0, e.amount ?? 0), 0);
  const dollars = (c: number) => Math.round(c) / 100;
  const paidCustomersOf = (xs: typeof validEntitlements) => new Set(xs.map((e) => e.account_id)).size;
  const entBefore = validEntitlements.filter((e) => (paidAt(e) ?? Infinity) < w.weekAgo);
  const paidCustomers = paidCustomersOf(validEntitlements);
  const revenueAll = dollars(cents(validEntitlements));
  const revenueIn = (win: Window) => dollars(cents(validEntitlements.filter((e) => inWindow(paidAt(e), win))));

  const paidCustomersMetric = metric('paidCustomers', paidCustomers, 'count', countChange(paidCustomers, paidCustomersOf(entBefore), 'vs 7 days ago'), okMoney);
  const revenueMetric = metric('realRevenue', revenueAll, 'usd', countChange(revenueAll, dollars(cents(entBefore)), 'vs 7 days ago'), okMoney);
  const revenueWindows = [
    metric('revenueToday', revenueIn(w.today.current), 'usd', countChange(revenueIn(w.today.current), revenueIn(w.today.previous), w.today.compareLabel), okMoney),
    metric('revenue7d', revenueIn(w.d7.current), 'usd', countChange(revenueIn(w.d7.current), revenueIn(w.d7.previous), w.d7.compareLabel), okMoney),
    metric('revenue30d', revenueIn(w.d30.current), 'usd', countChange(revenueIn(w.d30.current), revenueIn(w.d30.previous), w.d30.compareLabel), okMoney),
    metric('revenueAll', revenueAll, 'usd', countChange(revenueAll, dollars(cents(entBefore)), 'vs 7 days ago'), okMoney),
  ];

  const okCheckouts = ok('checkouts', 'exclusions');
  const checkouts = raw.checkouts.filter(real);
  const completedCk = checkouts.filter((c) => c.completed_at || c.status === 'complete');
  const paidCk = checkouts.filter((c) => (c.paid_at || c.payment_status === 'paid') && c.duplicate_payment !== true);
  const ckConv = pct(paidCk.length, checkouts.length);
  const ckBefore = checkouts.filter((c) => (toMs(c.created_at) ?? Infinity) < w.weekAgo);
  const ckConvBefore = pct(ckBefore.filter((c) => (c.paid_at || c.payment_status === 'paid') && c.duplicate_payment !== true && (toMs(c.paid_at) ?? toMs(c.created_at) ?? Infinity) < w.weekAgo).length, ckBefore.length);
  const checkoutConversion = metric('checkoutConversion', ckConv, 'percent', rateChange(ckConv, ckConvBefore, 'vs 7 days ago'), okCheckouts, `${paidCk.length} paid of ${checkouts.length} sessions`);
  const checkoutMetrics = [
    metric('checkoutSessions', checkouts.length, 'count', countChange(checkouts.length, ckBefore.length, 'vs 7 days ago'), okCheckouts),
    metric('checkoutsCompleted', completedCk.length, 'count', null, okCheckouts),
    metric('checkoutsPaid', paidCk.length, 'count', null, okCheckouts),
    metric('checkoutsIncomplete', checkouts.length - completedCk.length, 'count', null, okCheckouts),
    checkoutConversion,
  ];

  // ---- funnel (live, non-test, not excluded)
  const okFunnel = ok('monetization', 'exclusions');
  const liveEvents = raw.monetization.filter(real);
  const accountsByEvent = new Map<string, Set<string>>();
  const eventCounts = new Map<string, number>();
  for (const e of liveEvents) {
    eventCounts.set(e.event_type, (eventCounts.get(e.event_type) ?? 0) + 1);
    if (!e.account_id) continue;
    const set = accountsByEvent.get(e.event_type) ?? new Set<string>();
    set.add(e.account_id);
    accountsByEvent.set(e.event_type, set);
  }
  const accountsFor = (events: string[]) => { const s = new Set<string>(); for (const ev of events) for (const a of accountsByEvent.get(ev) ?? []) s.add(a); return s.size; };
  const eventsFor = (events: string[]) => events.reduce((n, ev) => n + (eventCounts.get(ev) ?? 0), 0);
  const rawStages = [
    { id: 'tracked', label: 'Tracked Users', count: raw.trackedUsers.length },
    { id: 'accounts', label: 'Accounts Created', count: raw.accounts.length },
    ...FUNNEL.filter((s) => s.always || accountsFor(s.events) > 0).map((s) => ({ id: s.id, label: s.label, count: accountsFor(s.events) })),
  ];
  const funnel: FunnelStage[] = okFunnel && okUsers && okAccounts ? rawStages.map((s, i) => ({
    ...s,
    fromPrevious: i === 0 ? null : pct(s.count, rawStages[i - 1].count),
    fromTop: pct(s.count, rawStages[0].count),
  })) : [];
  const events = [...eventCounts.entries()].map(([eventType, n]) => ({ eventType, events: n, accounts: accountsByEvent.get(eventType)?.size ?? 0 })).sort((a, b) => b.events - a.events);
  const liveEventTimes = (types: string[]) => liveEvents.filter((e) => types.includes(e.event_type)).map((e) => toMs(e.created_at));
  const eventMetric = (id: MetricId, types: string[]) => {
    const times = liveEventTimes(types);
    return metric(id, eventsFor(types), 'count', countChange(times.length, countBefore(times, w.weekAgo), 'vs 7 days ago'), okFunnel);
  };
  const revenueSection = [
    paidCustomersMetric,
    revenueMetric,
    eventMetric('paywallViews', ['paywall_viewed']),
    eventMetric('unlockClicks', ['unlock_clicked', 'unlock_button_clicked']),
    eventMetric('checkoutCreated', ['checkout_created', 'stripe_checkout_started']),
    eventMetric('checkoutCompleted', ['checkout_completed']),
    eventMetric('paymentConfirmed', ['payment_confirmed', 'payment_completed']),
    checkoutConversion,
  ];

  // ---- aid analyses
  const okAnalyses = ok('analyses');
  const analysisTimes = raw.analyses.map((a) => toMs(a.created_at));
  const kinds = new Map<string, { analyses: number; files: number }>();
  for (const a of raw.analyses) {
    const k = a.document_kind ?? 'unknown';
    const e = kinds.get(k) ?? { analyses: 0, files: 0 };
    e.analyses += 1; e.files += Math.max(0, a.file_count ?? 0);
    kinds.set(k, e);
  }
  const analysisMetrics = [
    totalMetric('analyses', analysisTimes, w.weekAgo, okAnalyses),
    windowMetric('analysesToday', analysisTimes, w.today, okAnalyses),
    windowMetric('analyses7d', analysisTimes, w.d7, okAnalyses),
    metric('filesAnalyzed', raw.analyses.reduce((n, a) => n + Math.max(0, a.file_count ?? 0), 0), 'count', null, okAnalyses),
  ];

  // ---- logins (last 30 days)
  const okEvents = ok('accountEvents');
  const loginDays = new Map<string, { signups: number; logins: number }>();
  for (const e of raw.accountEvents) {
    const t = toMs(e.created_at);
    if (t === null || t < now - 30 * DAY) continue;
    const k = dayKey(t);
    const v = loginDays.get(k) ?? { signups: 0, logins: 0 };
    if (e.event_type === 'signed_up') v.signups += 1;
    if (e.event_type === 'logged_in') v.logins += 1;
    loginDays.set(k, v);
  }
  const logins = okEvents ? daysBetween(addDays(dayKey(now), -29), dayKey(now)).map((key) => ({ key, label: dayLabel(key), signups: loginDays.get(key)?.signups ?? 0, logins: loginDays.get(key)?.logins ?? 0 })) : [];
  const loginTimes = raw.accountEvents.filter((e) => e.event_type === 'logged_in').map((e) => toMs(e.created_at));

  // ---- KPI groups
  const primary = [
    mau,
    totalMetric('trackedUsers', trackedCreated, w.weekAgo, okUsers),
    totalMetric('accounts', accountCreated, w.weekAgo, okAccounts),
    paidCustomersMetric,
    revenueMetric,
    uploadMetrics[2],
  ];
  const secondary = [
    windowMetric('newTrackedToday', trackedCreated, w.today, okUsers),
    windowMetric('newTracked7d', trackedCreated, w.d7, okUsers),
    windowMetric('newTracked30d', trackedCreated, w.d30, okUsers),
    windowMetric('newAccountsToday', accountCreated, w.today, okAccounts),
    windowMetric('newAccounts7d', accountCreated, w.d7, okAccounts),
    returningMetric,
    uploadMetrics[1],
    uploadMetrics[0],
    uploadMetrics[6],
    questionMetrics[1],
    analysisMetrics[0],
    checkoutConversion,
  ];

  const filesIn = (win: Window) => sumFiles(uploads.filter((u) => inWindow(u.at, win)));
  const sessionsIn = (win: Window) => uploads.filter((u) => inWindow(u.at, win)).length;
  const eventsIn = (types: string[], win: Window) => countIn(liveEventTimes(types), win);
  const paymentsIn = (win: Window) => validEntitlements.filter((e) => inWindow(paidAt(e), win)).length;
  const t = w.today;
  const todayMetrics: Metric[] = [
    windowMetric('newTrackedToday', trackedCreated, t, okUsers),
    windowMetric('newAccountsToday', accountCreated, t, okAccounts),
    { ...metric('filesSubmitted', filesIn(t.current), 'count', countChange(filesIn(t.current), filesIn(t.previous), t.compareLabel), okUploads), label: 'Files Uploaded' },
    { ...metric('uploadSessions', sessionsIn(t.current), 'count', countChange(sessionsIn(t.current), sessionsIn(t.previous), t.compareLabel), okUploads) },
    { ...metric('paywallViews', eventsIn(['paywall_viewed'], t.current), 'count', countChange(eventsIn(['paywall_viewed'], t.current), eventsIn(['paywall_viewed'], t.previous), t.compareLabel), okFunnel) },
    { ...metric('checkoutCreated', eventsIn(['checkout_created', 'stripe_checkout_started'], t.current), 'count', countChange(eventsIn(['checkout_created', 'stripe_checkout_started'], t.current), eventsIn(['checkout_created', 'stripe_checkout_started'], t.previous), t.compareLabel), okFunnel), label: 'Checkout Starts' },
    { ...metric('paidCustomers', paymentsIn(t.current), 'count', countChange(paymentsIn(t.current), paymentsIn(t.previous), t.compareLabel), okMoney), label: 'Payments' },
    revenueWindows[0],
  ];

  // ---- performance
  const rate = (id: string, label: string, numerator: number | null, denominator: number | null, numeratorLabel: string, denominatorLabel: string, valid: boolean): RateMetric => ({
    id, label, numeratorLabel, denominatorLabel,
    numerator: valid ? numerator : null,
    denominator: valid ? denominator : null,
    value: valid && numerator !== null && denominator !== null ? pct(numerator, denominator) : null,
  });
  const paywallAccounts = accountsFor(['paywall_viewed']);
  const checkoutAccounts = accountsFor(['checkout_created', 'stripe_checkout_started']);
  const accountUploaders = uploadersOf(uploads.filter((u) => u.who?.startsWith('a:'))).size;
  const performance: RateMetric[] = [
    rate('trackedToAccount', 'Tracked → Account', raw.accounts.length, raw.trackedUsers.length, 'accounts', 'tracked users', okUsers && okAccounts),
    rate('accountToUpload', 'Account → Upload', accountUploaders, raw.accounts.length, 'accounts that uploaded', 'accounts', okUploads && okAccounts),
    rate('paywallToCheckout', 'Paywall → Checkout', checkoutAccounts, paywallAccounts, 'accounts that started checkout', 'accounts that saw the paywall', okFunnel),
    rate('checkoutToPayment', 'Checkout → Payment', paidCk.length, checkouts.length, 'paid checkouts', 'checkout sessions', okCheckouts),
    rate('accountToPaid', 'Account → Paid', paidCustomers, raw.accounts.length, 'paid customers', 'accounts', okMoney && okAccounts),
    rate('returning', 'Returning Accounts', returning, raw.accounts.length, 'accounts with more than one login', 'accounts', okAccounts),
    rate('questionCompletion', 'Question Completion', answered, raw.questions.length, 'answered', 'questions submitted', okQuestions),
    rate('uploadSuccess', 'Upload Success', readSessions.length, sessions, 'successful sessions', 'upload sessions', okUploads),
  ];

  // ---- activity: grouped into 3-hour blocks, last 7 days, newest first
  const activity = buildActivity(now, {
    tracked: trackedCreated,
    accounts: accountCreated,
    logins: loginTimes,
    sessions: uploads.map((u) => u.at),
    files: uploads.map((u) => ({ at: u.at, n: u.filesN })),
    analyses: analysisTimes,
    questions: questionTimes,
    paywall: liveEventTimes(['paywall_viewed']),
    checkouts: checkouts.map((c) => toMs(c.created_at)),
    payments: validEntitlements.map(paidAt),
  });

  // ---- summary
  const newWeek = countIn(trackedCreated, w.d7.current);
  const newPrevWeek = countIn(trackedCreated, w.d7.previous);
  const summary = buildSummary({
    tracked: okUsers ? raw.trackedUsers.length : null,
    accounts: okAccounts ? raw.accounts.length : null,
    newWeek: okUsers ? newWeek : null,
    newPrevWeek: okUsers ? newPrevWeek : null,
    mau: mau.value,
    uploaders: okUploads ? uniqueUploaders : null,
    successRate: okUploads ? successRate : null,
    paidCustomers: okMoney ? paidCustomers : null,
    revenue: okMoney ? revenueAll : null,
  });

  return {
    generatedAt: new Date(now).toISOString(),
    timezone: 'America/Chicago',
    summary,
    primary,
    secondary,
    today: todayMetrics,
    active: [mau, wau, dau],
    growth: { tracked: growthSeries(okUsers ? trackedCreated : [], now), accounts: growthSeries(okAccounts ? accountCreated : [], now) },
    logins,
    uploads: { metrics: uploadMetrics, daily: okUploads ? uploadDaily : [], outcomes: okUploads ? outcomes : [] },
    questions: questionMetrics,
    revenue: { metrics: revenueSection, windows: revenueWindows, checkouts: checkoutMetrics, funnel, events: okFunnel ? events : [] },
    analyses: { metrics: analysisMetrics, byKind: okAnalyses ? [...kinds.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => b.analyses - a.analyses) : [] },
    performance,
    activity,
    unavailable: [...new Set(raw.failed)].map((s) => SOURCE_NAMES[s]),
  };
}

// ------------------------------------------------------------ activity

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

function buildActivity(now: number, src: {
  tracked: (number | null)[]; accounts: (number | null)[]; logins: (number | null)[]; sessions: (number | null)[];
  files: { at: number | null; n: number }[]; analyses: (number | null)[]; questions: (number | null)[];
  paywall: (number | null)[]; checkouts: (number | null)[]; payments: (number | null)[];
}): ActivityBlock[] {
  const BLOCK = 3 * HOUR;
  const end = now - (now % HOUR) + HOUR;
  const start = end - 7 * DAY;
  const blocks = new Map<number, Map<string, number>>();
  const add = (kind: string, at: number | null, n = 1) => {
    if (at === null || at < start || at >= end || n <= 0) return;
    const b = end - Math.ceil((end - at) / BLOCK) * BLOCK;
    const m = blocks.get(b) ?? new Map<string, number>();
    m.set(kind, (m.get(kind) ?? 0) + n);
    blocks.set(b, m);
  };
  src.tracked.forEach((t) => add('tracked', t));
  src.accounts.forEach((t) => add('accounts', t));
  src.logins.forEach((t) => add('logins', t));
  src.sessions.forEach((t) => add('sessions', t));
  src.files.forEach((f) => add('files', f.at, f.n));
  src.analyses.forEach((t) => add('analyses', t));
  src.questions.forEach((t) => add('questions', t));
  src.paywall.forEach((t) => add('paywall', t));
  src.checkouts.forEach((t) => add('checkouts', t));
  src.payments.forEach((t) => add('payments', t));

  const TEXT: Record<string, [string, string]> = {
    tracked: ['new tracked user', 'new tracked users'], accounts: ['new account', 'new accounts'], logins: ['login', 'logins'],
    sessions: ['upload session', 'upload sessions'], files: ['file submitted', 'files submitted'], analyses: ['aid analysis', 'aid analyses'],
    questions: ['question asked', 'questions asked'], paywall: ['paywall view', 'paywall views'], checkouts: ['checkout created', 'checkouts created'],
    payments: ['successful payment', 'successful payments'],
  };
  const order = Object.keys(TEXT);
  const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', month: 'short', day: 'numeric' });
  const fmtHour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric' });
  const todayKey = dayKey(now);
  return [...blocks.entries()].sort((a, b) => b[0] - a[0]).slice(0, 56).map(([b, m]) => {
    const k = dayKey(b);
    const day = k === todayKey ? 'Today' : k === addDays(todayKey, -1) ? 'Yesterday' : fmtDay.format(new Date(b));
    return {
      start: new Date(b).toISOString(),
      label: `${day}, ${fmtHour.format(new Date(b))}–${fmtHour.format(new Date(b + BLOCK))}`,
      items: order.filter((kind) => m.has(kind)).map((kind) => ({ kind, count: m.get(kind)!, text: plural(m.get(kind)!, TEXT[kind][0], TEXT[kind][1]) })),
    };
  });
}

// ------------------------------------------------------------ summary

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 });

export function buildSummary(v: {
  tracked: number | null; accounts: number | null; newWeek: number | null; newPrevWeek: number | null; mau: number | null;
  uploaders: number | null; successRate: number | null; paidCustomers: number | null; revenue: number | null;
}): string[] {
  const out: string[] = [];
  if (v.tracked !== null && v.accounts !== null) out.push(`FYNQ has ${plural(v.tracked, 'tracked user', 'tracked users')} and ${plural(v.accounts, 'registered account', 'registered accounts')}.`);
  if (v.newWeek !== null && v.newPrevWeek !== null) {
    if (v.newPrevWeek > 0) {
      const change = Math.round(((v.newWeek - v.newPrevWeek) / v.newPrevWeek) * 100);
      out.push(change === 0
        ? `User growth is flat over the previous 7-day period (${v.newWeek} new users each week).`
        : `User growth is ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% over the previous 7-day period (${v.newWeek} new vs ${v.newPrevWeek}).`);
    } else if (v.newWeek > 0) {
      out.push(`${plural(v.newWeek, 'new tracked user', 'new tracked users')} arrived in the last 7 days, with none in the 7 days before.`);
    } else {
      out.push('No new tracked users in the last 14 days.');
    }
  }
  if (v.mau !== null) out.push(`${plural(v.mau, 'tracked user was', 'tracked users were')} active in the last 30 days.`);
  if (v.uploaders !== null) {
    out.push(v.uploaders > 0 && v.successRate !== null
      ? `${plural(v.uploaders, 'distinct user has', 'distinct users have')} uploaded aid information, with ${/^(8\d?|11|18)$/.test(String(Math.round(v.successRate))) ? 'an' : 'a'} ${Math.round(v.successRate)}% successful processing rate.`
      : 'No one has uploaded aid information yet.');
  }
  if (v.paidCustomers !== null && v.revenue !== null) {
    out.push(v.paidCustomers > 0
      ? `${plural(v.paidCustomers, 'paying customer has', 'paying customers have')} generated ${usd(v.revenue)} in real revenue.`
      : 'No real payments yet.');
  }
  return out;
}
