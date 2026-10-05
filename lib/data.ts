/**
 * Reads the production tables with the service-role key, on the server only.
 *
 * Only the columns a metric needs are selected: never facts, overview,
 * emails (except to resolve EXCLUDED_BILLING_EMAILS to account IDs, which
 * stay on the server), Stripe IDs or document content. Rows are paged so no
 * table is read in one oversized request, and each table fails on its own:
 * a broken source makes its metrics "unavailable", not the whole dashboard.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { computeDashboard } from './metrics/compute';
import type {
  AccountEventRow, AccountRow, AnalysisRow, CheckoutRow, DashboardData, EntitlementRow, GuestLinkRow, MonetizationRow, QuestionRow, RawData, SourceKey, TrackedUserRow, UploadRow,
} from './metrics/types';
import { serverEnv } from './env';

if (typeof window !== 'undefined') throw new Error('lib/data.ts is server-only');

const PAGE = 1000;
const MAX_ROWS = 250_000;

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient {
  if (client) return client;
  const env = serverEnv();
  client = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { 'x-client-info': 'fynq-command-center' } },
  });
  return client;
}

async function readAll<T>(table: string, columns: string, order = 'created_at'): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await supabase().from(table).select(columns).order(order, { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.code ?? 'error'}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

async function excludedAccountIds(emails: string[]): Promise<string[]> {
  if (!emails.length) return [];
  const { data, error } = await supabase().from('accounts').select('user_id').in('email', emails);
  if (error) throw new Error(`accounts: ${error.code ?? 'error'}`);
  return (data ?? []).map((r: { user_id: string }) => r.user_id);
}

export async function loadRawData(): Promise<RawData> {
  const env = serverEnv();
  const failed: SourceKey[] = [];
  const safe = async <T,>(key: SourceKey, read: () => Promise<T[]>): Promise<T[]> => {
    try { return await read(); } catch (error) {
      // Table name and error code only; never row content.
      console.error('[command-center] read failed:', key, error instanceof Error ? error.message : 'error');
      failed.push(key);
      return [];
    }
  };
  const [trackedUsers, accounts, accountEvents, uploads, guestLinks, questions, monetization, checkouts, entitlements, analyses, excluded] = await Promise.all([
    safe<TrackedUserRow>('trackedUsers', () => readAll<TrackedUserRow>('anonymous_users', 'created_at,last_active_at')),
    safe<AccountRow>('accounts', () => readAll<AccountRow>('accounts', 'user_id,created_at,last_login_at,login_count')),
    safe<AccountEventRow>('accountEvents', () => readAll<AccountEventRow>('account_events', 'event_type,created_at')),
    safe<UploadRow>('uploads', () => readAll<UploadRow>('upload_events', 'id,created_at,account_id,guest_id,outcome,files,figures')),
    safe<GuestLinkRow>('guestLinks', () => readAll<GuestLinkRow>('account_guests', 'user_id,guest_id', 'linked_at')),
    safe<QuestionRow>('questions', () => readAll<QuestionRow>('beta_questions', 'created_at,finished_at,state')),
    safe<MonetizationRow>('monetization', () => readAll<MonetizationRow>('monetization_events', 'created_at,account_id,event_type,livemode,is_test_account')),
    safe<CheckoutRow>('checkouts', () => readAll<CheckoutRow>('billing_checkouts', 'account_id,livemode,is_test_account,status,amount_total,payment_status,duplicate_payment,created_at,completed_at,paid_at')),
    safe<EntitlementRow>('entitlements', () => readAll<EntitlementRow>('billing_entitlements', 'account_id,status,amount,currency,livemode,is_test_account,paid_at,activated_at', 'account_id')),
    safe<AnalysisRow>('analyses', () => readAll<AnalysisRow>('aid_analyses', 'created_at,document_kind,file_count')),
    safe<string>('exclusions', async () => excludedAccountIds(env.excludedEmails)),
  ]);
  return {
    trackedUsers, accounts, accountEvents, uploads, guestLinks, questions, monetization, checkouts, entitlements, analyses,
    excludedAccountIds: excluded,
    failed,
  };
}

// ------------------------------------------------------------ cache
//
// One computation serves every request for 30 seconds, and concurrent
// requests share the same one, so the dashboard stays within 30–60 seconds
// of the database without re-reading every table on every poll.

const FRESH_MS = 30_000;
let cached: { at: number; data: DashboardData } | null = null;
let inflight: Promise<DashboardData> | null = null;

export async function getDashboard(force = false): Promise<DashboardData> {
  const now = Date.now();
  if (!force && cached && now - cached.at < FRESH_MS) return cached.data;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const raw = await loadRawData();
      const data = computeDashboard(raw, Date.now());
      cached = { at: Date.now(), data };
      return data;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
