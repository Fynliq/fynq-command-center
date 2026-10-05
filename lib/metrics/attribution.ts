/**
 * Traffic → Revenue: which first-touch source each visitor, account and
 * payment came from. Pure functions, like compute.ts.
 *
 * First touch is the primary rule:
 *   - a guest browser's source is its acquisition_attribution row;
 *   - an account's source is the earliest-seen row among the browsers it has
 *     used (account_id on the row, or linked through account_guests);
 *   - an account created before its earliest recorded visit, or whose
 *     earliest row is legacy, is Legacy / Unattributed. Nothing is ever
 *     credited to TikTok (or anything else) without a recorded touch.
 * Money follows the same rules as the rest of the dashboard: live mode,
 * not a test account, not an excluded founder account.
 */

import type {
  AttributionData, AttributionRow, CampaignRow, ChannelKey, ConversionTrail, FunnelStage, Metric, RateMetric, RawData, SourceRow,
} from './types';
import { METRICS, type MetricId } from './definitions';
import { toMs } from './time';

export const CHANNEL_ORDER: ChannelKey[] = ['tiktok', 'instagram', 'facebook', 'google', 'referral', 'direct', 'other', 'legacy'];
export const CHANNEL_LABEL: Record<ChannelKey, string> = {
  tiktok: 'TikTok', instagram: 'Instagram', facebook: 'Facebook', google: 'Google', referral: 'Referral / shared link',
  direct: 'Direct', other: 'Other', legacy: 'Legacy / Unattributed',
};
const KNOWN = new Set<string>(CHANNEL_ORDER);
const asChannel = (c: string | null | undefined): ChannelKey => (c && KNOWN.has(c) ? (c as ChannelKey) : 'legacy');

/** Events that mean the student saw their completed analysis. */
const ANALYSIS_DONE = ['analysis_completed', 'aid_analysis_completed', 'full_analysis_viewed'];
const CHECKOUT_EVENTS = ['checkout_created', 'stripe_checkout_started'];

interface Attr { channel: ChannelKey; source: string | null; campaign: string | null; content: string | null }
const LEGACY: Attr = { channel: 'legacy', source: null, campaign: null, content: null };

const pct = (num: number, den: number): number | null => (den > 0 ? (num / den) * 100 : null);

/** "october_growth" -> "October Growth". */
export const prettyTag = (s: string | null) => (s ? s.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase()) : '');

/** A short, stable, non-reversible label for an account in the feed. */
export function maskId(id: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `#${h.toString(36).padStart(6, '0').slice(-6).toUpperCase()}`;
}

function attrOf(row: AttributionRow | undefined): Attr {
  if (!row) return LEGACY;
  const channel = asChannel(row.channel);
  return channel === 'legacy' ? LEGACY : { channel, source: row.source, campaign: row.campaign, content: row.content };
}

interface Counts { visitors: number; accounts: Set<string>; uploaders: Set<string>; uploadEvents: number; questionFlows: number; myAidAccounts: Set<string>; paywall: Set<string>; checkout: Set<string>; paid: Set<string>; revenueCents: number; postPaymentAnalyses: Set<string> }
const emptyCounts = (): Counts => ({ visitors: 0, accounts: new Set(), uploaders: new Set(), uploadEvents: 0, questionFlows: 0, myAidAccounts: new Set(), paywall: new Set(), checkout: new Set(), paid: new Set(), revenueCents: 0, postPaymentAnalyses: new Set() });

export function computeAttribution(raw: RawData, ok: (...keys: RawData['failed']) => boolean): AttributionData {
  const installed = raw.attributionInstalled;
  const available = installed && ok('attribution', 'accounts', 'guestLinks', 'exclusions');
  const empty: AttributionData = { state: installed ? 'unavailable' : 'not_installed', trackingSince: null, tiktok: [], tiktokFunnel: [], tiktokRates: [], sources: [], campaigns: [], recent: [] };
  if (!available) return empty;

  const excluded = new Set(raw.excludedAccountIds);
  const real = (r: { livemode: boolean | null; is_test_account: boolean | null; account_id: string | null }) =>
    r.livemode === true && r.is_test_account !== true && !(r.account_id && excluded.has(r.account_id));

  // ---- identities
  const rowByGuest = new Map<string, AttributionRow>();
  const rowsByAccount = new Map<string, AttributionRow[]>();
  for (const r of raw.attribution) {
    if (r.guest_id) rowByGuest.set(r.guest_id, r);
    if (r.account_id) rowsByAccount.set(r.account_id, [...(rowsByAccount.get(r.account_id) ?? []), r]);
  }
  const guestsByAccount = new Map<string, string[]>();
  const accountByGuest = new Map<string, string>();
  for (const g of raw.guestLinks) {
    guestsByAccount.set(g.user_id, [...(guestsByAccount.get(g.user_id) ?? []), g.guest_id]);
    if (!accountByGuest.has(g.guest_id)) accountByGuest.set(g.guest_id, g.user_id);
  }
  const accountCreated = new Map(raw.accounts.map((a) => [a.user_id, toMs(a.created_at)]));

  const accountAttrCache = new Map<string, Attr>();
  const accountAttr = (accountId: string): Attr => {
    const cached = accountAttrCache.get(accountId);
    if (cached) return cached;
    const candidates = [...(rowsByAccount.get(accountId) ?? [])];
    for (const g of guestsByAccount.get(accountId) ?? []) { const r = rowByGuest.get(g); if (r) candidates.push(r); }
    candidates.sort((a, b) => (toMs(a.first_seen_at) ?? 0) - (toMs(b.first_seen_at) ?? 0));
    const best = candidates[0];
    const created = accountCreated.get(accountId) ?? null;
    const firstSeen = best ? toMs(best.first_seen_at) : null;
    const result = !best || (created !== null && firstSeen !== null && created < firstSeen) ? LEGACY : attrOf(best);
    accountAttrCache.set(accountId, result);
    return result;
  };
  /** A person: their account if the browser is linked to one, else the browser. */
  const personOf = (accountId: string | null, guestId: string | null): { key: string; attr: Attr; account: string | null } | null => {
    const account = accountId ?? (guestId ? accountByGuest.get(guestId) ?? null : null);
    if (account) return { key: `a:${account}`, attr: accountAttr(account), account };
    if (guestId) return { key: `g:${guestId}`, attr: attrOf(rowByGuest.get(guestId)), account: null };
    return null;
  };

  // ---- tallies per channel and per campaign
  const byChannel = new Map<ChannelKey, Counts>(CHANNEL_ORDER.map((c) => [c, emptyCounts()]));
  const campaignKey = (a: Attr) => (a.channel !== 'legacy' && (a.campaign || a.content) ? `${a.channel}|${a.source ?? ''}|${a.campaign ?? ''}|${a.content ?? ''}` : null);
  const byCampaign = new Map<string, { attr: Attr; c: Counts }>();
  const tally = (a: Attr, f: (c: Counts) => void) => {
    f(byChannel.get(a.channel)!);
    const k = campaignKey(a);
    if (k) {
      const e = byCampaign.get(k) ?? { attr: a, c: emptyCounts() };
      f(e.c);
      byCampaign.set(k, e);
    }
  };

  // Visitors: guest browsers by their own first touch. Browsers that belong
  // to an excluded founder account are not visitors.
  let firstTracked: number | null = null;
  for (const r of raw.attribution) {
    if (r.guest_id && accountByGuest.has(r.guest_id) && excluded.has(accountByGuest.get(r.guest_id)!)) continue;
    if (r.account_id && excluded.has(r.account_id)) continue;
    const a = attrOf(r);
    tally(a, (c) => { c.visitors += 1; });
    if (a.channel !== 'legacy') { const t = toMs(r.first_seen_at); if (t !== null && (firstTracked === null || t < firstTracked)) firstTracked = t; }
  }
  // Tracked browsers with no attribution row at all are unattributed too.
  if (ok('trackedUsers')) {
    const missing = raw.trackedUsers.length - raw.attribution.filter((r) => r.guest_id).length;
    if (missing > 0) byChannel.get('legacy')!.visitors += missing;
  }

  for (const a of raw.accounts) {
    if (excluded.has(a.user_id)) continue;
    tally(accountAttr(a.user_id), (c) => { c.accounts.add(a.user_id); });
  }

  const firstUpload = new Map<string, number>();
  if (ok('uploads')) {
    for (const u of raw.uploads) {
      const p = personOf(u.account_id, u.guest_id);
      if (!p || (p.account && excluded.has(p.account))) continue;
      tally(p.attr, (c) => { c.uploadEvents += 1; c.uploaders.add(p.key); if (p.account) c.myAidAccounts.add(p.account); });
      const t = toMs(u.created_at);
      if (p.account && t !== null && (!firstUpload.has(p.account) || t < firstUpload.get(p.account)!)) firstUpload.set(p.account, t);
    }
  }

  if (ok('questions')) {
    for (const q of raw.questions) {
      if (q.state !== 'success' || !q.user_id) continue;
      const p = personOf(null, q.user_id);
      if (!p || (p.account && excluded.has(p.account))) continue;
      tally(p.attr, (c) => { c.questionFlows += 1; });
    }
  }

  const firstEvent = (types: string[]) => {
    const m = new Map<string, number>();
    for (const e of raw.monetization) {
      if (!real(e) || !e.account_id || !types.includes(e.event_type)) continue;
      const t = toMs(e.created_at);
      if (t !== null && (!m.has(e.account_id) || t < m.get(e.account_id)!)) m.set(e.account_id, t);
    }
    return m;
  };
  const paywallAt = ok('monetization') ? firstEvent(['paywall_viewed']) : new Map<string, number>();
  for (const id of paywallAt.keys()) tally(accountAttr(id), (c) => { c.paywall.add(id); });

  const checkoutAt = new Map<string, number>();
  if (ok('checkouts')) {
    for (const ck of raw.checkouts) {
      if (!real(ck) || !ck.account_id) continue;
      const t = toMs(ck.created_at);
      if (t !== null && (!checkoutAt.has(ck.account_id) || t < checkoutAt.get(ck.account_id)!)) checkoutAt.set(ck.account_id, t);
    }
  }
  if (ok('monetization')) for (const [id, t] of firstEvent(CHECKOUT_EVENTS)) if (!checkoutAt.has(id) || t < checkoutAt.get(id)!) checkoutAt.set(id, t);
  for (const id of checkoutAt.keys()) tally(accountAttr(id), (c) => { c.checkout.add(id); });

  const paidAt = new Map<string, number>();
  if (ok('entitlements')) {
    for (const e of raw.entitlements) {
      if (!real(e) || e.status !== 'active') continue;
      const t = toMs(e.paid_at) ?? toMs(e.activated_at);
      if (t !== null) paidAt.set(e.account_id, t);
      tally(accountAttr(e.account_id), (c) => { c.paid.add(e.account_id); c.revenueCents += Math.max(0, e.amount ?? 0); });
    }
  }
  const analysisAt = new Map<string, number>();
  if (ok('monetization')) {
    for (const e of raw.monetization) {
      if (!real(e) || !e.account_id || !ANALYSIS_DONE.includes(e.event_type)) continue;
      const paid = paidAt.get(e.account_id);
      const t = toMs(e.created_at);
      if (paid === undefined || t === null || t < paid) continue;
      if (!analysisAt.has(e.account_id) || t < analysisAt.get(e.account_id)!) analysisAt.set(e.account_id, t);
    }
  }
  for (const id of analysisAt.keys()) tally(accountAttr(id), (c) => { c.postPaymentAnalyses.add(id); });

  // ---- TikTok headline
  const tt = byChannel.get('tiktok')!;
  const okMoney = ok('entitlements');
  const m = (id: MetricId, value: number, format: Metric['format'], valid = true, note?: string): Metric => ({
    id, label: METRICS[id].label, value: valid ? value : null, format, comparison: null, note: valid ? note : undefined, status: valid ? 'ok' : 'unavailable',
  });
  const tiktok: Metric[] = [
    m('ttVisitors', tt.visitors, 'count'),
    m('ttAccounts', tt.accounts.size, 'count'),
    m('ttUploaders', tt.uploaders.size, 'count', ok('uploads')),
    m('ttUploadEvents', tt.uploadEvents, 'count', ok('uploads')),
    m('ttQuestionFlows', tt.questionFlows, 'count', ok('questions')),
    m('ttPaywall', tt.paywall.size, 'count', ok('monetization')),
    m('ttCheckout', tt.checkout.size, 'count', ok('checkouts') && ok('monetization')),
    m('ttPaid', tt.paid.size, 'count', okMoney),
    m('ttRevenue', tt.revenueCents / 100, 'usd', okMoney),
    m('ttAnalyses', tt.postPaymentAnalyses.size, 'count', okMoney && ok('monetization')),
  ];

  const stagesRaw = [
    { id: 'visitors', label: 'TikTok Visitors', count: tt.visitors },
    { id: 'registered', label: 'Registered', count: tt.accounts.size },
    { id: 'my_aid', label: 'Used My Aid', count: tt.myAidAccounts.size },
    { id: 'paywall', label: 'Saw Paywall', count: tt.paywall.size },
    { id: 'checkout', label: 'Started Checkout', count: tt.checkout.size },
    { id: 'paid', label: 'Paid $1', count: tt.paid.size },
    { id: 'analysis', label: 'Completed Analysis', count: tt.postPaymentAnalyses.size },
  ];
  const tiktokFunnel: FunnelStage[] = stagesRaw.map((s, i) => ({ ...s, fromPrevious: i === 0 ? null : pct(s.count, stagesRaw[i - 1].count), fromTop: pct(s.count, stagesRaw[0].count) }));

  const rate = (id: string, label: string, numerator: number, denominator: number, numeratorLabel: string, denominatorLabel: string): RateMetric => ({
    id, label, numerator, denominator, value: pct(numerator, denominator), numeratorLabel, denominatorLabel,
  });
  const tiktokRates: RateMetric[] = [
    rate('ttVisitorAccount', 'Visitor → Account', tt.accounts.size, tt.visitors, 'accounts', 'TikTok visitors'),
    rate('ttVisitorMyAid', 'Visitor → My Aid', tt.uploaders.size, tt.visitors, 'My Aid uploaders', 'TikTok visitors'),
    rate('ttVisitorPaywall', 'Visitor → Paywall', tt.paywall.size, tt.visitors, 'saw the paywall', 'TikTok visitors'),
    rate('ttPaywallCheckout', 'Paywall → Checkout', tt.checkout.size, tt.paywall.size, 'started checkout', 'saw the paywall'),
    rate('ttCheckoutPaid', 'Checkout → Paid', tt.paid.size, tt.checkout.size, 'paid', 'started checkout'),
    rate('ttVisitorPaid', 'Visitor → Paid', tt.paid.size, tt.visitors, 'paid', 'TikTok visitors'),
  ];

  // ---- every source
  const sources: SourceRow[] = CHANNEL_ORDER.map((channel) => {
    const c = byChannel.get(channel)!;
    return {
      channel, label: CHANNEL_LABEL[channel], visitors: c.visitors, accounts: c.accounts.size, uploaders: c.uploaders.size,
      paywallViews: c.paywall.size, checkoutStarts: c.checkout.size, payingCustomers: c.paid.size,
      revenue: c.revenueCents / 100, visitorToPaid: pct(c.paid.size, c.visitors),
    };
  });

  // ---- campaigns / videos
  const campaigns: CampaignRow[] = [...byCampaign.values()].map(({ attr, c }) => ({
    channel: attr.channel, channelLabel: CHANNEL_LABEL[attr.channel], source: attr.source,
    campaign: attr.campaign, content: attr.content, campaignLabel: prettyTag(attr.campaign) || '(no campaign)', contentLabel: prettyTag(attr.content) || '—',
    visitors: c.visitors, accounts: c.accounts.size, myAidUsers: c.uploaders.size, paywallViews: c.paywall.size,
    checkouts: c.checkout.size, payments: c.paid.size, revenue: c.revenueCents / 100, conversion: pct(c.paid.size, c.visitors),
  })).sort((a, b) => b.revenue - a.revenue || b.payments - a.payments || b.accounts - a.accounts || b.visitors - a.visitors).slice(0, 25);

  // ---- recent conversions: attributed, real accounts only, masked
  const recent: ConversionTrail[] = raw.accounts
    .filter((a) => !excluded.has(a.user_id) && accountAttr(a.user_id).channel !== 'legacy')
    .map((a) => {
      const attr = accountAttr(a.user_id);
      const steps: ConversionTrail['steps'] = [];
      const push = (id: ConversionTrail['steps'][number]['id'], label: string, at: number | null | undefined) => { if (at !== null && at !== undefined) steps.push({ id, label, at: new Date(at).toISOString() }); };
      push('account', 'Account created', toMs(a.created_at));
      push('my_aid', 'My Aid uploaded', firstUpload.get(a.user_id));
      push('paywall', 'Paywall viewed', paywallAt.get(a.user_id));
      push('checkout', 'Checkout started', checkoutAt.get(a.user_id));
      push('paid', '$1 paid', paidAt.get(a.user_id));
      push('analysis', 'Analysis completed', analysisAt.get(a.user_id));
      steps.sort((x, y) => Date.parse(x.at) - Date.parse(y.at));
      return {
        ref: maskId(a.user_id), channel: attr.channel, channelLabel: CHANNEL_LABEL[attr.channel],
        campaign: [prettyTag(attr.campaign), prettyTag(attr.content)].filter(Boolean).join(' / ') || null,
        steps, latest: steps.length ? steps[steps.length - 1].at : null,
      };
    })
    .sort((a, b) => Date.parse(b.latest ?? '1970-01-01') - Date.parse(a.latest ?? '1970-01-01'))
    .slice(0, 20);

  return {
    state: 'ok',
    trackingSince: firstTracked === null ? null : new Date(firstTracked).toISOString(),
    tiktok, tiktokFunnel, tiktokRates, sources, campaigns, recent,
  };
}
