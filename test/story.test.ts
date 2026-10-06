// Story layer: Pulse, journey, milestones, the 5,000 target and the live feed.
// Synthetic data only.  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboard } from '../lib/metrics/compute';
import { daysUntil, trendWord } from '../lib/metrics/story';
import type { RawData } from '../lib/metrics/types';

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

test('Pulse follows the stated 20% rule and never exaggerates', () => {
  assert.equal(trendWord(13, 10), 'accelerating');
  assert.equal(trendWord(12, 10), 'steady');
  assert.equal(trendWord(8, 10), 'steady');
  assert.equal(trendWord(7, 10), 'slowed');
  assert.equal(trendWord(3, 0), 'started');
  assert.equal(trendWord(0, 0), 'quiet');
  assert.equal(trendWord(null, 3), null);
  // 6 new this week vs 4 the week before: +50%.
  assert.equal(s.pulse.headline, 'Growth is accelerating.');
  const items = Object.fromEntries(s.pulse.items.map((i) => [i.id, i.value]));
  assert.deepEqual(items, { users: 2, accounts: 1, files: 5, revenue: 1 }, 'the founder payment is excluded; uploads count as the dashboard counts them');
});

test('the journey uses the existing definitions, with % from the step before', () => {
  assert.deepEqual(s.journey.map((j) => [j.id, j.count]), [['tracked', 12], ['accounts', 3], ['uploaders', 2], ['paywall', 2], ['unlock', 1], ['checkout', 1], ['paid', 1]]);
  assert.equal(s.journey[0].fromPrevious, null);
  assert.equal(Math.round(s.journey[1].fromPrevious! * 10) / 10, 25);
  assert.equal(s.paywallConversion, 50, '1 paying customer of 2 accounts that saw the paywall');
});

test('milestones and the road to 5,000', () => {
  const m = Object.fromEntries(s.milestones.map((x) => [x.id, x]));
  assert.equal(m.users500.current, 12);
  assert.equal(m.users500.pct, 12 / 500 * 100);
  assert.equal(m.users500.done, false);
  assert.equal(m.paid25.current, 1);
  assert.equal(daysUntil(NOW, 12, 31), 87);
  assert.equal(daysUntil(Date.parse('2026-12-31T18:00:00Z'), 12, 31), 1);
  assert.equal(s.target.daysLeft, 87);
  assert.equal(s.target.requiredPerDay, (5000 - 12) / 87);
  assert.equal(s.target.pace7dPerDay, 6 / 7);
  assert.equal(s.target.gapPerDay, 6 / 7 - (5000 - 12) / 87);
});

test('live feed: newest first, real money only, no ids or places', () => {
  const kinds = s.live.map((e) => e.kind);
  assert.equal(kinds[0], 'visitor');
  assert.equal(s.live.filter((e) => e.kind === 'payment').length, 1, 'TEST and founder payments are not shown');
  assert.equal(s.live.filter((e) => e.kind === 'checkout').length, 1);
  assert.deepEqual(s.live.filter((e) => e.kind === 'files').map((e) => e.count), [2, 3]);
  for (const e of s.live) assert.deepEqual(Object.keys(e).sort(), ['at', 'count', 'kind']);
  const text = JSON.stringify(s);
  for (const id of [A, B, FOUNDER, G]) assert.ok(!text.includes(id));
});

test('failed sources make story values null, never zero', () => {
  const f = computeDashboard(raw({ failed: ['trackedUsers'] }), NOW).story;
  assert.equal(f.moment.total, null);
  assert.equal(f.target.requiredPerDay, null);
  assert.equal(f.milestones[0].current, null);
  assert.equal(f.journey[0].count, null);
  assert.ok(!f.live.some((e) => e.kind === 'visitor'));
});

test('back-to-back visitors become one line', () => {
  const only = computeDashboard(raw({ accounts: [], uploads: [], questions: [], checkouts: [], entitlements: [], monetization: [] }), NOW).story.live;
  assert.deepEqual(only.map((e) => [e.kind, e.count]), [['visitor', 12]]);
});
