// Traffic → Revenue: first-touch attribution in the Command Center.
// Synthetic data only.  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboard } from '../lib/metrics/compute';
import { dashboardCsv } from '../lib/metrics/csv';
import { maskId, prettyTag } from '../lib/metrics/attribution';
import type { AttributionRow, Metric, RawData } from '../lib/metrics/types';

const NOW = Date.parse('2026-10-08T15:00:00Z');
const ago = (hours: number) => new Date(NOW - hours * 3_600_000).toISOString();

const acct = (n: number) => `a${String(n).padStart(7, '0')}-0000-4000-8000-000000000000`;
const guest = (n: number) => `9${String(n).padStart(7, '0')}-0000-4000-8000-000000000000`;
const T1 = acct(1), T3 = acct(3), I1 = acct(4), LEGACY_ACCT = acct(5), OLD = acct(6), FOUNDER = acct(7);
const GT1 = guest(1), GT2 = guest(2), GT3 = guest(3), GI = guest(4), GD = guest(5), GL = guest(6), GTX = guest(7), GF = guest(8);

const row = (guest_id: string, account_id: string | null, hoursAgo: number, channel: string, campaign: string | null = null, content: string | null = null): AttributionRow => ({
  guest_id, account_id, first_seen_at: ago(hoursAgo), attribution_type: channel === 'legacy' ? 'legacy' : channel === 'direct' ? 'direct' : 'utm',
  channel, source: ['legacy', 'direct'].includes(channel) ? null : channel, medium: null, campaign, content,
});
const live = (account_id: string, event_type: string, hoursAgo: number, livemode = true) => ({ created_at: ago(hoursAgo), account_id, event_type, livemode, is_test_account: false });

function raw(overrides: Partial<RawData> = {}): RawData {
  return {
    trackedUsers: Array.from({ length: 9 }, (_, i) => ({ created_at: ago(100 - i), last_active_at: null })), // 8 rows + 1 browser never recorded
    accounts: [
      { user_id: T1, created_at: ago(40), last_login_at: null, login_count: 1 },
      { user_id: T3, created_at: ago(30), last_login_at: null, login_count: 1 },
      { user_id: I1, created_at: ago(20), last_login_at: null, login_count: 1 },
      { user_id: LEGACY_ACCT, created_at: ago(24 * 10), last_login_at: null, login_count: 2 },
      { user_id: OLD, created_at: ago(24 * 3), last_login_at: null, login_count: 2 },
      { user_id: FOUNDER, created_at: ago(24 * 20), last_login_at: null, login_count: 9 },
    ],
    excludedAccountIds: [FOUNDER],
    accountEvents: [],
    uploads: [
      { id: 'u1', created_at: ago(39), account_id: T1, guest_id: GT1, outcome: 'read', files: 2, figures: 5 },
      { id: 'u2', created_at: ago(35), account_id: null, guest_id: GT2, outcome: 'read', files: 1, figures: 3 },
      { id: 'u3', created_at: ago(10), account_id: FOUNDER, guest_id: GF, outcome: 'read', files: 1, figures: 3 },
    ],
    guestLinks: [
      { user_id: T1, guest_id: GT1 }, { user_id: T3, guest_id: GT3 }, { user_id: I1, guest_id: GI },
      { user_id: LEGACY_ACCT, guest_id: GL }, { user_id: OLD, guest_id: GTX }, { user_id: FOUNDER, guest_id: GF },
    ],
    questions: [
      { created_at: ago(34), finished_at: ago(34), state: 'success', user_id: GT2 },
      { created_at: ago(33), finished_at: ago(33), state: 'error', user_id: GT2 },
    ],
    monetization: [
      live(T1, 'paywall_viewed', 38), live(T1, 'checkout_created', 37), live(T1, 'analysis_completed', 36),
      live(T3, 'paywall_viewed', 29), live(T3, 'checkout_created', 28, false),       // TEST-mode checkout
      live(FOUNDER, 'paywall_viewed', 9), live(FOUNDER, 'analysis_completed', 8),
    ],
    checkouts: [
      { account_id: T1, livemode: true, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(37), completed_at: ago(36.5), paid_at: ago(36.5) },
      { account_id: T3, livemode: false, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(28), completed_at: ago(27), paid_at: ago(27) },
      { account_id: FOUNDER, livemode: true, is_test_account: false, status: 'paid', amount_total: 100, payment_status: 'paid', duplicate_payment: false, created_at: ago(9), completed_at: ago(9), paid_at: ago(9) },
    ],
    entitlements: [
      { account_id: T1, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(36.5), activated_at: ago(36.5) },
      { account_id: T3, status: 'active', amount: 100, currency: 'usd', livemode: false, is_test_account: false, paid_at: ago(27), activated_at: ago(27) },  // TEST payment
      { account_id: LEGACY_ACCT, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(24 * 5), activated_at: ago(24 * 5) },
      { account_id: FOUNDER, status: 'active', amount: 100, currency: 'usd', livemode: true, is_test_account: false, paid_at: ago(9), activated_at: ago(9) },
    ],
    analyses: [],
    attribution: [
      row(GL, LEGACY_ACCT, 24 * 11, 'legacy'),
      row(GT1, T1, 41, 'tiktok', 'october_growth', 'video_07'),
      row(GT2, null, 36, 'tiktok', 'october_growth', 'video_07'),
      row(GT3, T3, 31, 'tiktok', 'profile', 'bio'),
      row(GI, I1, 21, 'instagram'),
      row(GD, null, 5, 'direct'),
      row(GTX, OLD, 24, 'tiktok', 'october_growth', 'video_08'),   // an old account, new phone
      row(GF, FOUNDER, 11, 'tiktok', 'october_growth', 'video_07'), // the founder testing
    ],
    attributionInstalled: true,
    failed: [],
    ...overrides,
  };
}

const d = computeDashboard(raw(), NOW);
const a = d.attribution;
const tt = (id: string) => (a.tiktok.find((m) => m.id === id) as Metric).value;
const source = (c: string) => a.sources.find((s) => s.channel === c)!;

test('TikTok headline counts first-touch TikTok only, live money only, founder excluded', () => {
  assert.equal(a.state, 'ok');
  assert.equal(tt('ttVisitors'), 4, 'GT1, GT2, GT3, GTX; the founder browser is excluded');
  assert.equal(tt('ttAccounts'), 2, 'T1 and T3; the old account on a new phone stays legacy');
  assert.equal(tt('ttUploaders'), 2, 'T1 (account) and GT2 (guest)');
  assert.equal(tt('ttUploadEvents'), 2);
  assert.equal(tt('ttQuestionFlows'), 1, 'only answered questions');
  assert.equal(tt('ttPaywall'), 2);
  assert.equal(tt('ttCheckout'), 1, "T3's checkout was Stripe TEST mode");
  assert.equal(tt('ttPaid'), 1, "T3's TEST payment is not a paying customer");
  assert.equal(tt('ttRevenue'), 1);
  assert.equal(tt('ttAnalyses'), 1);
});

test('the TikTok funnel and its rates', () => {
  assert.deepEqual(a.tiktokFunnel.map((s) => [s.id, s.count]), [['visitors', 4], ['registered', 2], ['my_aid', 1], ['paywall', 2], ['checkout', 1], ['paid', 1], ['analysis', 1]]);
  const r = Object.fromEntries(a.tiktokRates.map((x) => [x.id, x.value]));
  assert.equal(r.ttVisitorAccount, 50);
  assert.equal(r.ttVisitorMyAid, 50);
  assert.equal(r.ttVisitorPaywall, 50);
  assert.equal(r.ttPaywallCheckout, 50);
  assert.equal(r.ttCheckoutPaid, 100);
  assert.equal(r.ttVisitorPaid, 25);
});

test('every source, with Legacy / Unattributed kept apart and in total revenue', () => {
  assert.deepEqual(a.sources.map((s) => s.channel), ['tiktok', 'instagram', 'facebook', 'google', 'referral', 'direct', 'other', 'legacy']);
  assert.equal(source('instagram').visitors, 1);
  assert.equal(source('instagram').accounts, 1);
  assert.equal(source('direct').visitors, 1);
  assert.equal(source('legacy').visitors, 2, 'one legacy browser plus one never recorded');
  assert.equal(source('legacy').accounts, 2, 'LEGACY_ACCT and OLD');
  assert.equal(source('legacy').payingCustomers, 1);
  assert.equal(source('legacy').revenue, 1);
  const attributedRevenue = a.sources.reduce((n, s) => n + s.revenue, 0);
  const total = d.primary.find((m) => m.id === 'realRevenue')!.value;
  assert.equal(attributedRevenue, total, 'every real dollar is in exactly one source');
  assert.equal(a.sources.reduce((n, s) => n + s.payingCustomers, 0), d.primary.find((m) => m.id === 'paidCustomers')!.value);
});

test('campaigns and videos', () => {
  const v7 = a.campaigns.find((c) => c.campaign === 'october_growth' && c.content === 'video_07')!;
  assert.equal(v7.campaignLabel, 'October Growth');
  assert.equal(v7.contentLabel, 'Video 07');
  assert.deepEqual([v7.visitors, v7.accounts, v7.myAidUsers, v7.paywallViews, v7.checkouts, v7.payments, v7.revenue, v7.conversion], [2, 1, 2, 1, 1, 1, 1, 50]);
  assert.equal(a.campaigns[0], v7, 'sorted by revenue');
  const v8 = a.campaigns.find((c) => c.content === 'video_08')!;
  assert.deepEqual([v8.visitors, v8.accounts], [1, 0]);
  assert.ok(a.campaigns.find((c) => c.campaign === 'profile' && c.content === 'bio'));
});

test('recent conversions: attributed real accounts only, masked, in order', () => {
  assert.deepEqual(a.recent.map((t) => t.channel).sort(), ['instagram', 'tiktok', 'tiktok']);
  const t1 = a.recent.find((t) => t.ref === maskId(T1))!;
  assert.equal(t1.campaign, 'October Growth / Video 07');
  assert.deepEqual(t1.steps.map((s) => s.id), ['account', 'my_aid', 'paywall', 'checkout', 'paid', 'analysis']);
  const t3 = a.recent.find((t) => t.ref === maskId(T3))!;
  assert.ok(!t3.steps.some((s) => s.id === 'paid' || s.id === 'checkout'), 'TEST checkout and payment are not conversions');
  assert.match(t1.ref, /^#[0-9A-Z]{6}$/);
});

test('no ids or emails reach the browser or the CSV', () => {
  const payload = JSON.stringify(d);
  for (const id of [T1, T3, I1, LEGACY_ACCT, OLD, FOUNDER, GT1, GT2, GT3, GI, GD, GL, GTX, GF]) assert.ok(!payload.includes(id), id);
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(payload));
  const csv = dashboardCsv(d);
  assert.ok(csv.includes('Source breakdown'));
  assert.ok(!csv.includes('#'), 'the per-account feed is not exported');
});

test('before the migration, and when the table cannot be read', () => {
  assert.equal(computeDashboard(raw({ attribution: [], attributionInstalled: false }), NOW).attribution.state, 'not_installed');
  const failed = computeDashboard(raw({ attribution: [], failed: ['attribution'] }), NOW);
  assert.equal(failed.attribution.state, 'unavailable');
  assert.ok(failed.unavailable.includes('traffic attribution'));
  assert.equal(computeDashboard(raw({ attribution: [], attributionInstalled: false }), NOW).unavailable.length, 0, 'not installed is not an error');
});

test('with no attribution rows at all, everything is Legacy / Unattributed, never TikTok', () => {
  const x = computeDashboard(raw({ attribution: [] }), NOW).attribution;
  assert.equal(x.tiktok.find((m) => m.id === 'ttVisitors')!.value, 0);
  assert.equal(x.sources.find((s) => s.channel === 'legacy')!.visitors, 9);
  assert.equal(x.sources.find((s) => s.channel === 'legacy')!.payingCustomers, 2);
});

test('helpers', () => {
  assert.equal(prettyTag('october_growth'), 'October Growth');
  assert.equal(prettyTag(null), '');
  assert.equal(maskId(T1), maskId(T1));
  assert.notEqual(maskId(T1), maskId(T3));
});
