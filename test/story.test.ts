// Story layer: Pulse, journey, milestones, the 5,000 target and the live feed.
// Synthetic data only.  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboard } from '../lib/metrics/compute';
import { biggestDrop, daysUntil, pulseState, velocityState } from '../lib/metrics/story';
import type { RawData } from '../lib/metrics/types';
import { phoneMetricsFrom } from '../lib/metrics/phone';

const NOW = Date.parse('2026-10-05T17:00:00Z'); // 12:00 PM in Chicago
const ago = (h: number) => new Date(NOW - h * 3_600_000).toISOString();
const A = 'a0000000-0000-4000-8000-000000000001';
const B = 'b0000000-0000-4000-8000-000000000002';
const FOUNDER = 'f0000000-0000-4000-8000-000000000003';
const G = '90000000-0000-4000-8000-000000000001';

function raw(o: Partial<RawData> = {}): RawData {
  return {
    // 6 new in the last 7 days, 4 in the 7 before, 2 older.
    trackedUsers: [1, 2, 30, 50, 100, 150, 200, 220, 250, 300, 400, 500].map((h) => ({ created_at: ago(h), last_active_at: null })),
    accounts: [
      { user_id: A, created_at: ago(3), last_login_at: null, login_count: 1 },
      { user_id: B, created_at: ago(200), last_login_at: null, login_count: 1 },
      { user_id: FOUNDER, created_at: ago(400), last_login_at: null, login_count: 5 },
    ],
    excludedAccountIds: [FOUNDER],
    accountEvents: [],
    uploads: [
      { id: 'u1', created_at: ago(2), account_id: A, guest_id: G, outcome: 'read', files: 3, figures: 4 },
      { id: 'u2', created_at: ago(1.5), account_id: FOUNDER, guest_id: null, outcome: 'read', files: 2, figures: 1 },
    ],
    guestLinks: [{ user_id: A, guest_id: G }],
    questions: [{ created_at: ago(5), finished_at: ago(5), state: 'success', user_id: G }],
    monetization: [
      { created_at: ago(2), account_id: A, event_type: 'paywall_viewed', livemode: true, is_test_account: false },
      { created_at: ago(2), account_id: B, event_type: 'paywall_viewed', livemode: true, is_test_account: false },
      { created_at: ago(1.8), account_id: A, event_type: 'unlock_button_clicked', livemode: true, is_test_account: false },
      { created_at: ago(1.7), account_id: A, event_type: 'checkout_created', livemode: true, is_test_account: false },
    ],
    checkouts: [
      { account_id: A, livemode: true, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(1.7), completed_at: ago(1.6), paid_at: ago(1.6) },
      { account_id: B, livemode: false, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(1.2), completed_at: ago(1.1), paid_at: ago(1.1) },
      { account_id: FOUNDER, livemode: true, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(1), completed_at: ago(0.9), paid_at: ago(0.9) },
    ],
    entitlements: [
      { account_id: A, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(1.6), activated_at: ago(1.6) },
      { account_id: B, status: 'active', amount: 100, currency: 'usd', livemode: false, is_test_account: false, paid_at: ago(1.1), activated_at: ago(1.1) },
      { account_id: FOUNDER, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(0.9), activated_at: ago(0.9) },
    ],
    analyses: [],
    attribution: [],
    attributionInstalled: true,
    failed: [],
    ...o,
  };
}

const s = computeDashboard(raw(), NOW).story;

test('Growth Velocity: last 7 days per day, against the 7 before', () => {
  assert.equal(velocityState(11.1, 10), 'accelerating');
  assert.equal(velocityState(10.9, 10), 'stable');
  assert.equal(velocityState(9.1, 10), 'stable');
  assert.equal(velocityState(8.9, 10), 'slowing');
  assert.equal(velocityState(1, 0), 'accelerating');
  assert.equal(velocityState(null, 3), null);
  assert.equal(s.velocity.current, 6 / 7);
  assert.equal(s.velocity.previous, 4 / 7);
  assert.equal(s.velocity.state, 'accelerating');
});

test('Pulse: a stated rule over traffic and sign-ups, never an LLM', () => {
  assert.equal(pulseState({ cur: 12, prev: 10 }, 0), 'accelerating');
  assert.equal(pulseState({ cur: 12, prev: 10 }, -5), 'growing', 'traffic up 20% but sign-ups falling is not accelerating');
  assert.equal(pulseState({ cur: 106, prev: 100 }, null), 'growing');
  assert.equal(pulseState({ cur: 95, prev: 100 }, null), 'steady');
  assert.equal(pulseState({ cur: 90, prev: 100 }, null), 'cooling');
  assert.equal(pulseState({ cur: 3, prev: 0 }, null), 'growing');
  assert.equal(s.pulse.state, 'accelerating');
  assert.equal(s.pulse.label, 'ACCELERATING');
  const sig = Object.fromEntries(s.pulse.signals.map((x) => [x.id, x]));
  assert.equal(sig.traffic.change, 50);
  assert.equal(sig.accounts.change, 0);
  assert.equal(sig.uploads.change, null);
  assert.equal(sig.uploads.isNew, true);
  assert.equal(s.pulse.customers, 1);
});

test('the journey and the payment funnel use the existing definitions', () => {
  assert.deepEqual(s.journey.map((j) => [j.id, j.count]), [['visitor', 12], ['account', 3], ['upload', 2], ['value', 2], ['paywall', 2], ['checkout', 1], ['customer', 1]]);
  assert.equal(s.journey[0].fromPrevious, null);
  assert.equal(Math.round(s.journey[1].fromPrevious! * 10) / 10, 25);
  assert.deepEqual(s.paymentFunnel.stages.map((j) => [j.id, j.count]), [['paywall', 2], ['unlock', 1], ['checkout_created', 1], ['checkout_completed', 0], ['payment_confirmed', 0], ['customers', 1]]);
  assert.deepEqual(s.paymentFunnel.biggestDrop, { from: 'Checkout created', to: 'Checkout completed', lost: 1, pct: 100 });
  assert.equal(biggestDrop([{ id: 'a', label: 'A', count: null }, { id: 'b', label: 'B', count: 3 }]), null);
  assert.equal(s.paywallConversion, 50, '1 paying customer of 2 accounts that saw the paywall');
});

test('revenue timeline: live money only, $1 stays $1', () => {
  const last = s.revenueSeries[s.revenueSeries.length - 1];
  assert.deepEqual([last.revenue, last.cumulative, last.customers], [1, 1, 1], 'the TEST and founder payments are not in it');
  assert.equal(s.revenueSeries.reduce((n, p) => n + p.revenue, 0), 1);
  assert.equal(s.revenueSeries[0].key, computeDashboard(raw(), NOW).growth.tracked.daily[0].key);
});

test('today, retention and engagement', () => {
  assert.equal(s.todayExtra.reads, 2);
  assert.equal(s.retention.returning, 1);
  assert.equal(Math.round(s.retention.returningPct! * 10) / 10, 33.3);
  assert.equal(s.retention.avgLogins, 7 / 3);
  assert.equal(s.retention.cohortsAvailable, false);
  assert.equal(s.engagement.questions, 1);
  assert.equal(s.engagement.answered, 1);
});

test('milestones carry the date they were reached, only when the rows show it', () => {
  const m = Object.fromEntries(s.milestones.map((x) => [x.id, x]));
  assert.equal(m.users500.current, 12);
  assert.equal(m.users500.done, false);
  assert.equal(m.users500.completedAt, null);
  assert.deepEqual(s.milestones.map((x) => x.target), [500, 1000, 2500, 5000, 10000, 100, 500, 1000, 10, 25, 100]);
  const many = Array.from({ length: 520 }, (_, i) => ({ created_at: ago(520 - i), last_active_at: null }));
  const big = computeDashboard(raw({ trackedUsers: many }), NOW).story.milestones.find((x) => x.id === 'users500')!;
  assert.equal(big.done, true);
  assert.equal(big.completedAt, ago(520 - 499), 'the 500th tracked user');
});

test('road to 5,000 is a target model', () => {
  assert.equal(daysUntil(NOW, 12, 31), 87);
  assert.equal(daysUntil(Date.parse('2026-12-31T18:00:00Z'), 12, 31), 1);
  assert.equal(s.target.remaining, 4988);
  assert.equal(s.target.requiredPerDay, 4988 / 87);
  assert.equal(s.target.pace7dPerDay, 6 / 7);
  assert.equal(s.target.gapPerDay, 6 / 7 - 4988 / 87);
});

test('live feed: newest first, real money only, no ids or places', () => {
  const kinds = s.live.map((e) => e.kind);
  assert.equal(kinds[0], 'visitor');
  assert.equal(s.live.filter((e) => e.kind === 'payment').length, 1, 'TEST and founder payments are not shown');
  assert.equal(s.live.filter((e) => e.kind === 'checkout').length, 1);
  assert.equal(s.live.filter((e) => e.kind === 'paywall').length, 2);
  assert.deepEqual(s.live.filter((e) => e.kind === 'upload').map((e) => e.count), [2, 3]);
  for (const e of s.live) assert.deepEqual(Object.keys(e).sort(), ['at', 'count', 'kind']);
  const text = JSON.stringify(s);
  for (const id of [A, B, FOUNDER, G]) assert.ok(!text.includes(id));
});

test('back-to-back visitors become one line', () => {
  const only = computeDashboard(raw({ accounts: [], uploads: [], questions: [], checkouts: [], entitlements: [], monetization: [] }), NOW).story.live;
  assert.deepEqual(only.map((e) => [e.kind, e.count]), [['visitor', 12]]);
});

test('failed sources make story values null, never zero', () => {
  const f = computeDashboard(raw({ failed: ['trackedUsers'] }), NOW).story;
  assert.equal(f.moment.total, null);
  assert.equal(f.target.requiredPerDay, null);
  assert.equal(f.milestones[0].current, null);
  assert.equal(f.journey[0].count, null);
  assert.equal(f.velocity.current, null);
  assert.ok(!f.live.some((e) => e.kind === 'visitor'));
  const g = computeDashboard(raw({ failed: ['entitlements'] }), NOW).story;
  assert.deepEqual(g.revenueSeries, []);
});

test('the phone display gets nine aggregate numbers from the shared response, nothing else', () => {
  const d = computeDashboard(raw(), NOW);
  const p = phoneMetricsFrom(d);
  assert.deepEqual(Object.keys(p).sort(), ['filesSubmitted', 'growthHistory', 'newAccountsToday', 'newTrackedUsersToday', 'paidCustomers', 'realRevenue', 'totalAccounts', 'trackedUsers', 'uniqueUploaders']);
  assert.equal(p.trackedUsers, 12);
  assert.equal(p.totalAccounts, 3);
  assert.equal(p.paidCustomers, 1, 'TEST and founder payments excluded, same as the page');
  assert.equal(p.realRevenue, 1);
  assert.equal(p.filesSubmitted, 5);
  assert.ok(p.growthHistory.length <= 30 && p.growthHistory.every((n) => typeof n === 'number'));
  assert.equal(p.growthHistory[p.growthHistory.length - 1], 12);
  for (const [k, v] of Object.entries(p)) if (k !== 'growthHistory') assert.ok(v === null || typeof v === 'number', k);
  const text = JSON.stringify(p);
  for (const id of [A, B, FOUNDER, G]) assert.ok(!text.includes(id));
  assert.equal(phoneMetricsFrom(computeDashboard(raw({ failed: ['trackedUsers'] }), NOW)).trackedUsers, null, 'unavailable is null, never 0');
});
