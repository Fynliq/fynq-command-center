// npm test  (tsx --test test/*.test.ts). Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboard, countChange, canonicalUploader } from '../lib/metrics/compute';
import { dashboardCsv } from '../lib/metrics/csv';
import { dayKey, startOfDay, windows } from '../lib/metrics/time';
import type { DashboardData, Metric, RawData } from '../lib/metrics/types';

// Monday 5 Oct 2026, 13:00 UTC = 8:00 AM in Chicago (CDT, UTC-5).
const NOW = Date.parse('2026-10-05T13:00:00Z');
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

const A = 'a1000000-0000-4000-8000-000000000001';
const B = 'b2000000-0000-4000-8000-000000000002';
const FOUNDER = 'f3000000-0000-4000-8000-000000000003';
const TESTER = 'c4000000-0000-4000-8000-000000000004';
const G1 = '91000000-0000-4000-8000-000000000001'; // guest later linked to A
const G2 = '92000000-0000-4000-8000-000000000002'; // guest never linked

function raw(overrides: Partial<RawData> = {}): RawData {
  return {
    trackedUsers: [
      { created_at: ago(1), last_active_at: null },            // today
      { created_at: ago(5), last_active_at: ago(2) },          // today (07:00 UTC = 2 AM CDT)
      { created_at: ago(9), last_active_at: null },            // 04:00 UTC = 11 PM yesterday in Chicago
      { created_at: ago(24 * 3), last_active_at: ago(10) },
      { created_at: ago(24 * 10), last_active_at: ago(24 * 20) },
      { created_at: ago(24 * 40), last_active_at: ago(24 * 2) },
      { created_at: ago(24 * 40), last_active_at: null },      // inactive for 40 days
    ],
    accounts: [
      { user_id: A, created_at: ago(2), last_login_at: ago(1), login_count: 3 },
      { user_id: B, created_at: ago(24 * 9), last_login_at: null, login_count: 1 },
      { user_id: FOUNDER, created_at: ago(24 * 30), last_login_at: ago(5), login_count: 9 },
      { user_id: TESTER, created_at: ago(24 * 30), last_login_at: null, login_count: 1 },
    ],
    excludedAccountIds: [FOUNDER],
    accountEvents: [
      { event_type: 'signed_up', created_at: ago(2) },
      { event_type: 'logged_in', created_at: ago(1) },
      { event_type: 'logged_out', created_at: ago(1) },
    ],
    uploads: [
      { id: 'u1', created_at: ago(30), account_id: null, guest_id: G1, outcome: 'read', files: 3, figures: 10 },  // guest, later linked to A
      { id: 'u2', created_at: ago(1), account_id: A, guest_id: G1, outcome: 'read', files: 2, figures: 6 },        // same person, as account
      { id: 'u3', created_at: ago(1), account_id: null, guest_id: G2, outcome: 'unreadable', files: 1, figures: 0 },
      { id: 'u4', created_at: ago(24 * 9), account_id: B, guest_id: null, outcome: 'read', files: 3, figures: 4 },
      { id: 'u5', created_at: ago(2), account_id: B, guest_id: null, outcome: 'reader_error', files: 2, figures: null },
      { id: 'u6', created_at: ago(3), account_id: B, guest_id: null, outcome: 'privacy_blocked_v2', files: 1, figures: null }, // a future outcome
    ],
    guestLinks: [{ user_id: A, guest_id: G1 }],
    questions: [
      { created_at: ago(5), finished_at: ago(5), state: 'success' },
      { created_at: ago(4), finished_at: ago(4), state: 'error' },
      { created_at: ago(1), finished_at: null, state: 'pending' },
    ],
    monetization: [
      { created_at: ago(2), account_id: A, event_type: 'my_aid_page_view', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: A, event_type: 'paywall_viewed', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: A, event_type: 'unlock_button_clicked', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: A, event_type: 'checkout_created', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: A, event_type: 'payment_confirmed', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: A, event_type: 'entitlement_activated', livemode: true, is_test_account: false },
      { created_at: ago(9 * 24), account_id: B, event_type: 'my_aid_entered', livemode: true, is_test_account: false },
      { created_at: ago(9 * 24), account_id: B, event_type: 'paywall_viewed', livemode: true, is_test_account: false },
      { created_at: ago(9 * 24), account_id: B, event_type: 'unlock_clicked', livemode: true, is_test_account: false },
      { created_at: ago(1), account_id: B, event_type: 'brand_new_event', livemode: true, is_test_account: false },
      { created_at: ago(1), account_id: FOUNDER, event_type: 'paywall_viewed', livemode: true, is_test_account: false },
      { created_at: ago(1), account_id: TESTER, event_type: 'paywall_viewed', livemode: true, is_test_account: true },
      { created_at: ago(1), account_id: B, event_type: 'paywall_viewed', livemode: false, is_test_account: false },
    ],
    checkouts: [
      { account_id: A, livemode: true, is_test_account: false, status: 'complete', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(2), completed_at: ago(2), paid_at: ago(2) },
      { account_id: B, livemode: true, is_test_account: false, status: 'expired', amount_total: 100, payment_status: 'unpaid', duplicate_payment: false, created_at: ago(9 * 24), completed_at: null, paid_at: null },
      { account_id: FOUNDER, livemode: true, is_test_account: false, status: 'complete', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(30), completed_at: ago(30), paid_at: ago(30) },
      { account_id: TESTER, livemode: false, is_test_account: true, status: 'complete', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(30), completed_at: ago(30), paid_at: ago(30) },
    ],
    entitlements: [
      { account_id: A, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(2), activated_at: ago(2) },
      { account_id: FOUNDER, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(30), activated_at: ago(30) },
      { account_id: TESTER, status: 'active', amount: 100, currency: 'usd', livemode: false, is_test_account: true, paid_at: ago(30), activated_at: ago(30) },
      { account_id: B, status: 'refunded', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(40), activated_at: ago(40) },
    ],
    analyses: [
      { created_at: ago(1), document_kind: 'award-letter', file_count: 2 },
      { created_at: ago(24 * 3), document_kind: 'fafsa-submission-summary', file_count: 1 },
      { created_at: ago(24 * 9), document_kind: 'cost-estimate', file_count: 1 },
    ],
    failed: [],
    ...overrides,
  };
}

const find = (list: Metric[], id: string): Metric => { const m = list.find((x) => x.id === id); assert.ok(m, `metric ${id}`); return m as Metric; };

test('Chicago days: today starts at local midnight, across DST', () => {
  assert.equal(dayKey(NOW), '2026-10-05');
  assert.equal(new Date(startOfDay('2026-10-05')).toISOString(), '2026-10-05T05:00:00.000Z'); // CDT
  assert.equal(new Date(startOfDay('2026-12-01')).toISOString(), '2026-12-01T06:00:00.000Z'); // CST
  assert.equal(new Date(startOfDay('2026-11-01')).toISOString(), '2026-11-01T05:00:00.000Z'); // DST ends that night
  const w = windows(NOW);
  assert.equal(w.today.current.start, Date.parse('2026-10-05T05:00:00Z'));
  assert.equal(w.today.previous.end - w.today.previous.start, NOW - w.today.current.start);
});

test('people: totals, MAU from COALESCE(last_active_at, created_at), new today in Chicago time', () => {
  const d = computeDashboard(raw(), NOW);
  assert.equal(find(d.primary, 'trackedUsers').value, 7);
  assert.equal(find(d.primary, 'mau').value, 6);
  assert.equal(find(d.active, 'wau').value, 5);
  assert.equal(find(d.active, 'dau').value, 4);
  const today = find(d.secondary, 'newTrackedToday');
  assert.equal(today.value, 2, '11 PM yesterday in Chicago is not today, even though it is the same UTC date');
  assert.equal(find(d.primary, 'mau').comparison, null, 'MAU has no history to compare with, so no change is shown');
});

test('changes are never made up', () => {
  assert.deepEqual(countChange(5, 0, 'x'), { previous: 0, change: null, changeUnit: '%', direction: 'new', label: 'x' });
  assert.equal(countChange(0, 0, 'x')?.change, null);
  assert.equal(countChange(12, 10, 'x')?.change, 20);
  assert.equal(countChange(null, 10, 'x'), null);
});

test('accounts and returning accounts', () => {
  const d = computeDashboard(raw(), NOW);
  assert.equal(find(d.primary, 'accounts').value, 4);
  assert.equal(find(d.secondary, 'newAccountsToday').value, 1);
  const ret = find(d.secondary, 'returningAccounts');
  assert.equal(ret.value, 2);
  assert.equal(ret.note, '50% of accounts');
});

test('uploads: files, sessions and unique uploaders stay separate; guests linked to accounts count once', () => {
  const d = computeDashboard(raw(), NOW);
  const u = d.uploads.metrics;
  assert.equal(find(u, 'filesSubmitted').value, 12);
  assert.equal(find(u, 'uploadSessions').value, 6);
  assert.equal(find(u, 'uniqueUploaders').value, 3, 'A (via guest G1 and as account), B, and unlinked guest G2');
  assert.equal(find(u, 'uniqueSuccessfulUploaders').value, 2);
  assert.equal(find(u, 'successfulFiles').value, 8);
  assert.equal(find(u, 'figuresExtracted').value, 20);
  assert.equal(Math.round(find(u, 'uploadSuccessRate').value!), 50);
  assert.deepEqual(d.uploads.outcomes.map((o) => o.outcome).sort(), ['privacy_blocked_v2', 'read', 'reader_error', 'unreadable']);
  assert.equal(canonicalUploader({ account_id: null, guest_id: G1 }, new Map([[G1, A]])), `a:${A}`);
});

test('money: only live, non-test, active, non-excluded entitlements; cents to dollars', () => {
  const d = computeDashboard(raw(), NOW);
  assert.equal(find(d.primary, 'paidCustomers').value, 1);
  assert.equal(find(d.primary, 'realRevenue').value, 1);
  assert.equal(find(d.revenue.windows, 'revenueToday').value, 1);
  assert.equal(find(d.revenue.windows, 'revenueAll').value, 1);
  const ck = d.revenue.checkouts;
  assert.equal(find(ck, 'checkoutSessions').value, 2, 'founder and test checkouts excluded');
  assert.equal(find(ck, 'checkoutsPaid').value, 1);
  assert.equal(find(ck, 'checkoutsIncomplete').value, 1);
  assert.equal(find(ck, 'checkoutConversion').value, 50);
});

test('money: zero payments shows $0, not an error', () => {
  const d = computeDashboard(raw({ entitlements: [], checkouts: [] }), NOW);
  assert.equal(find(d.primary, 'realRevenue').value, 0);
  assert.equal(find(d.primary, 'paidCustomers').value, 0);
  assert.equal(find(d.revenue.checkouts, 'checkoutConversion').value, null);
  assert.ok(d.summary.includes('No real payments yet.'));
});

test('funnel: live non-test accounts, synonyms merged, new event types listed', () => {
  const d = computeDashboard(raw(), NOW);
  const stage = (id: string) => d.revenue.funnel.find((s) => s.id === id)?.count;
  assert.equal(stage('tracked'), 7);
  assert.equal(stage('accounts'), 4);
  assert.equal(stage('my_aid'), 2, 'my_aid_entered and my_aid_page_view are one stage');
  assert.equal(stage('paywall'), 2, 'founder, test and non-live views are left out');
  assert.equal(stage('unlock'), 2, 'unlock_clicked and unlock_button_clicked are one stage');
  assert.equal(stage('payment_confirmed'), 1);
  assert.equal(d.revenue.funnel[1].fromPrevious, (4 / 7) * 100);
  assert.ok(d.revenue.events.some((e) => e.eventType === 'brand_new_event'));
  assert.equal(find(d.revenue.metrics, 'paywallViews').value, 2);
});

test('aid analyses: totals and every document kind, including new ones', () => {
  const d = computeDashboard(raw(), NOW);
  assert.equal(find(d.analyses.metrics, 'analyses').value, 3);
  assert.equal(find(d.analyses.metrics, 'analysesToday').value, 1);
  assert.equal(find(d.analyses.metrics, 'filesAnalyzed').value, 4);
  assert.deepEqual(d.analyses.byKind.map((k) => k.kind).sort(), ['award-letter', 'cost-estimate', 'fafsa-submission-summary']);
});

test('growth series: cumulative by Chicago day, hourly for the last 24h', () => {
  const d = computeDashboard(raw(), NOW);
  const daily = d.growth.tracked.daily;
  assert.equal(daily[daily.length - 1].key, '2026-10-05');
  assert.equal(daily[daily.length - 1].total, 7);
  assert.equal(daily[daily.length - 1].added, 2);
  assert.equal(daily.reduce((n, p) => n + p.added, 0), 7);
  assert.equal(d.growth.tracked.hourly.length, 24);
  assert.equal(d.growth.tracked.hourly[23].total, 7);
});

test('a failed source shows its metrics as unavailable and leaves the rest alone', () => {
  const d = computeDashboard(raw({ entitlements: [], failed: ['entitlements'] }), NOW);
  assert.equal(find(d.primary, 'realRevenue').status, 'unavailable');
  assert.equal(find(d.primary, 'realRevenue').value, null);
  assert.equal(find(d.primary, 'trackedUsers').status, 'ok');
  assert.deepEqual(d.unavailable, ['payments']);
});

test('performance rates', () => {
  const d = computeDashboard(raw(), NOW);
  const r = (id: string) => d.performance.find((p) => p.id === id)!;
  assert.equal(r('trackedToAccount').value, (4 / 7) * 100);
  assert.equal(r('accountToUpload').value, 50, 'A and B uploaded, of 4 accounts');
  assert.equal(r('checkoutToPayment').value, 50);
  assert.equal(r('uploadSuccess').value, 50);
});

test('activity is grouped into time blocks, with no identifiers', () => {
  const d = computeDashboard(raw(), NOW);
  assert.ok(d.activity.length > 0);
  assert.match(d.activity[0].label, /^Today, /);
  const text = JSON.stringify(d.activity);
  assert.match(text, /new tracked user/);
  for (const id of [A, B, FOUNDER, G1]) assert.ok(!text.includes(id));
});

test('the browser payload and the CSV carry no IDs, emails or document content', () => {
  const d: DashboardData = computeDashboard(raw(), NOW);
  const payload = JSON.stringify(d) + dashboardCsv(d);
  for (const id of [A, B, FOUNDER, TESTER, G1, G2, 'u1']) assert.ok(!payload.includes(id), `${id} leaked`);
  assert.ok(!payload.includes('@'));
  assert.match(dashboardCsv(d), /^section,metric,value/);
});

test('summary is deterministic and uses live numbers', () => {
  const d = computeDashboard(raw(), NOW);
  assert.equal(d.summary[0], 'FYNQ has 7 tracked users and 4 registered accounts.');
  assert.ok(d.summary.some((s) => /3 distinct users have uploaded aid information, with a 50% successful processing rate\./.test(s)));
  assert.ok(d.summary.some((s) => s === '1 paying customer has generated $1 in real revenue.'));
});
