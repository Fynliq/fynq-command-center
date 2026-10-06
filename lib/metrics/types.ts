/**
 * The shapes that cross the server/browser boundary, and the raw rows that
 * never do.
 *
 * RawData lives only on the server (lib/data.ts reads it, lib/metrics/compute.ts
 * reduces it). DashboardData is the only thing the browser ever receives: counts,
 * sums, rates and day buckets. No emails, no IDs, no document content.
 */

// ------------------------------------------------------------ raw rows (server only)

export interface TrackedUserRow { created_at: string; last_active_at: string | null }
export interface AccountRow { user_id: string; created_at: string; last_login_at: string | null; login_count: number | null }
export interface AccountEventRow { event_type: string; created_at: string }
export interface UploadRow { id: string; created_at: string; account_id: string | null; guest_id: string | null; outcome: string | null; files: number | null; figures: number | null }
export interface GuestLinkRow { user_id: string; guest_id: string }
export interface QuestionRow { created_at: string; finished_at: string | null; state: string | null; /** The guest browser that asked. */ user_id?: string | null }
export interface MonetizationRow { created_at: string; account_id: string | null; event_type: string; livemode: boolean | null; is_test_account: boolean | null }
export interface CheckoutRow {
  account_id: string | null; livemode: boolean | null; is_test_account: boolean | null; status: string | null;
  amount_total: number | null; payment_status: string | null; duplicate_payment: boolean | null;
  created_at: string; completed_at: string | null; paid_at: string | null;
}
export interface EntitlementRow {
  account_id: string; status: string | null; amount: number | null; currency: string | null;
  livemode: boolean | null; is_test_account: boolean | null; paid_at: string | null; activated_at: string | null;
}
export interface AnalysisRow { created_at: string; document_kind: string | null; file_count: number | null }
/** One guest browser's first-touch source (acquisition_attribution). */
export interface AttributionRow {
  guest_id: string | null; account_id: string | null; first_seen_at: string; attribution_type: string; channel: string;
  source: string | null; medium: string | null; campaign: string | null; content: string | null;
}

export type SourceKey =
  | 'trackedUsers' | 'accounts' | 'accountEvents' | 'uploads' | 'guestLinks' | 'questions'
  | 'monetization' | 'checkouts' | 'entitlements' | 'analyses' | 'exclusions' | 'attribution';

export interface RawData {
  trackedUsers: TrackedUserRow[];
  accounts: AccountRow[];
  /** Founder/test accounts resolved from EXCLUDED_BILLING_EMAILS. IDs only; emails stay in lib/data.ts. */
  excludedAccountIds: string[];
  accountEvents: AccountEventRow[];
  uploads: UploadRow[];
  guestLinks: GuestLinkRow[];
  questions: QuestionRow[];
  monetization: MonetizationRow[];
  checkouts: CheckoutRow[];
  entitlements: EntitlementRow[];
  analyses: AnalysisRow[];
  attribution: AttributionRow[];
  /** False until the acquisition_attribution migration has been applied. */
  attributionInstalled: boolean;
  /** Sources that could not be read. Metrics that need them show as unavailable. */
  failed: SourceKey[];
}

// ------------------------------------------------------------ what the browser gets

export type MetricFormat = 'count' | 'usd' | 'percent' | 'ratio';

export interface Comparison {
  /** The value in the comparison period, or null when it cannot be known. */
  previous: number | null;
  /** Percent change for counts and money; percentage points for rates. Null when it would be made up. */
  change: number | null;
  /** 'pts' for rates, '%' otherwise. */
  changeUnit: '%' | 'pts';
  direction: 'up' | 'down' | 'flat' | 'new' | 'none';
  label: string;
}

export interface Metric {
  id: string;
  label: string;
  value: number | null;
  format: MetricFormat;
  comparison: Comparison | null;
  /** Short context under the number, e.g. "8 of 29 accounts". */
  note?: string;
  status: 'ok' | 'unavailable';
}

export interface GrowthPoint { key: string; label: string; added: number; total: number }

export interface GrowthSeries {
  /** One point per Chicago calendar day, first record to today. */
  daily: GrowthPoint[];
  /** One point per hour for the last 24 hours. */
  hourly: GrowthPoint[];
}

export interface FunnelStage { id: string; label: string; count: number; fromPrevious: number | null; fromTop: number | null }

export interface RateMetric { id: string; label: string; numerator: number | null; denominator: number | null; value: number | null; numeratorLabel: string; denominatorLabel: string }

export interface ActivityBlock { start: string; label: string; items: { kind: string; count: number; text: string }[] }

export type ChannelKey = 'tiktok' | 'instagram' | 'facebook' | 'google' | 'referral' | 'direct' | 'other' | 'legacy';

export interface SourceRow {
  channel: ChannelKey; label: string; visitors: number; accounts: number; uploaders: number; paywallViews: number;
  checkoutStarts: number; payingCustomers: number; revenue: number; visitorToPaid: number | null;
}

export interface CampaignRow {
  channel: ChannelKey; channelLabel: string; source: string | null; campaign: string | null; content: string | null;
  campaignLabel: string; contentLabel: string; visitors: number; accounts: number; myAidUsers: number; paywallViews: number;
  checkouts: number; payments: number; revenue: number; conversion: number | null;
}

/** One attributed account's path. `ref` is a masked label, never the account id. */
export interface ConversionTrail {
  ref: string; channel: ChannelKey; channelLabel: string; campaign: string | null; latest: string | null;
  steps: { id: 'account' | 'my_aid' | 'paywall' | 'checkout' | 'paid' | 'analysis'; label: string; at: string }[];
}

export interface AttributionData {
  /** 'not_installed' until the migration is applied; 'unavailable' when a read failed. */
  state: 'ok' | 'not_installed' | 'unavailable';
  /** Earliest attributed (non-legacy) first touch: when tracking began. */
  trackingSince: string | null;
  tiktok: Metric[];
  tiktokFunnel: FunnelStage[];
  tiktokRates: RateMetric[];
  sources: SourceRow[];
  campaigns: CampaignRow[];
  recent: ConversionTrail[];
}

export interface StoryJourneyStage { id: string; label: string; count: number | null; unit: string; fromPrevious: number | null }

/** One anonymous thing that happened: a kind, a time and a count. Never who, never where. */
export interface LiveEvent { kind: 'visitor' | 'account' | 'upload' | 'files' | 'answer' | 'paywall' | 'checkout' | 'payment'; at: string; count: number }

export interface StorySignal { id: string; label: string; value: number | null; change: number | null; isNew: boolean }

export interface StoryData {
  velocity: { current: number | null; previous: number | null; state: 'accelerating' | 'stable' | 'slowing' | null; rule: string };
  pulse: { state: 'accelerating' | 'growing' | 'steady' | 'cooling' | null; label: string; signals: StorySignal[]; customers: number | null; rule: string };
  journey: StoryJourneyStage[];
  paymentFunnel: { stages: StoryJourneyStage[]; biggestDrop: { from: string; to: string; lost: number; pct: number } | null };
  /** One point per Chicago day: revenue that day, running total, and customers so far. Live money only. */
  revenueSeries: { key: string; label: string; revenue: number; cumulative: number; customers: number }[];
  todayExtra: { reads: number | null; readsYesterday: number | null };
  retention: { returning: number | null; returningPct: number | null; wau: number | null; dau: number | null; mau: number | null; avgLogins: number | null; cohortsAvailable: boolean };
  engagement: { questions: number | null; answered: number | null; analyses: number | null; logins7d: number | null; filesPerUploader: number | null };
  milestones: { id: string; metric: 'trackedUsers' | 'accounts' | 'paidCustomers'; label: string; current: number | null; target: number; pct: number | null; done: boolean; completedAt: string | null }[];
  target: {
    goal: number; current: number | null; remaining: number | null; deadline: string; daysLeft: number; pct: number | null;
    requiredPerDay: number | null; pace7dPerDay: number | null; gapPerDay: number | null;
  };
  live: LiveEvent[];
  moment: { total: number | null; today: number | null; week: number | null; month: number | null };
  /** Paying customers / accounts that saw the paywall, in percent. */
  paywallConversion: number | null;
  revenue: number | null;
}

export interface DashboardData {
  generatedAt: string;
  timezone: string;
  summary: string[];
  primary: Metric[];
  secondary: Metric[];
  today: Metric[];
  active: Metric[];
  growth: { tracked: GrowthSeries; accounts: GrowthSeries };
  logins: { key: string; label: string; signups: number; logins: number }[];
  uploads: {
    metrics: Metric[];
    daily: { key: string; label: string; files: number; sessions: number }[];
    outcomes: { outcome: string; sessions: number; files: number }[];
  };
  questions: Metric[];
  revenue: {
    metrics: Metric[];
    windows: Metric[];
    checkouts: Metric[];
    funnel: FunnelStage[];
    events: { eventType: string; events: number; accounts: number }[];
  };
  analyses: { metrics: Metric[]; byKind: { kind: string; analyses: number; files: number }[] };
  performance: RateMetric[];
  activity: ActivityBlock[];
  attribution: AttributionData;
  story: StoryData;
  /** Which sources failed, by friendly name. Never error details. */
  unavailable: string[];
}
