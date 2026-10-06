/**
 * The nine numbers the phone display shows, taken from the same aggregate
 * DashboardData the rest of the Command Center renders. No new queries, and
 * nothing but numbers: no emails, ids, names, payment references or aid data.
 */
import type { DashboardData, Metric } from './types';

export interface PhoneMetrics {
  trackedUsers: number | null;
  newTrackedUsersToday: number | null;
  totalAccounts: number | null;
  newAccountsToday: number | null;
  uniqueUploaders: number | null;
  filesSubmitted: number | null;
  paidCustomers: number | null;
  /** Dollars, live payments only (test mode and excluded accounts removed on the server). */
  realRevenue: number | null;
  /** Cumulative tracked users per Central Time day, oldest first (last 30 days). */
  growthHistory: number[];
}

const pick = (list: Metric[], id: string): number | null => {
  const m = list.find((x) => x.id === id);
  return m && m.status === 'ok' && typeof m.value === 'number' && Number.isFinite(m.value) ? m.value : null;
};

export function phoneMetricsFrom(d: DashboardData, days = 30): PhoneMetrics {
  return {
    trackedUsers: pick(d.primary, 'trackedUsers'),
    newTrackedUsersToday: pick(d.today, 'newTrackedToday'),
    totalAccounts: pick(d.primary, 'accounts'),
    newAccountsToday: pick(d.today, 'newAccountsToday'),
    uniqueUploaders: pick(d.uploads.metrics, 'uniqueUploaders'),
    filesSubmitted: pick(d.uploads.metrics, 'filesSubmitted'),
    paidCustomers: pick(d.primary, 'paidCustomers'),
    realRevenue: pick(d.primary, 'realRevenue'),
    growthHistory: d.growth.tracked.daily.slice(-days).map((p) => p.total).filter((n) => Number.isFinite(n)),
  };
}
