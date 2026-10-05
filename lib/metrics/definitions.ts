/**
 * Every metric the dashboard shows, defined once.
 *
 * The label is what the card says; the definition is what METRICS.md, the
 * CSV export and the card's tooltip say. Components never invent a metric:
 * they look it up here by id, and compute.ts is the only place that counts.
 */

export interface MetricDefinition { label: string; definition: string }

export const METRICS = {
  // People
  trackedUsers: { label: 'Total Tracked Users', definition: 'One row in anonymous_users: a browser FYNQ has seen.' },
  mau: { label: 'MAU', definition: 'Tracked users whose COALESCE(last_active_at, created_at) is within the last 30 rolling days.' },
  wau: { label: '7-Day Active', definition: 'Tracked users whose COALESCE(last_active_at, created_at) is within the last 7 rolling days.' },
  dau: { label: '24-Hour Active', definition: 'Tracked users whose COALESCE(last_active_at, created_at) is within the last 24 hours.' },
  newTrackedToday: { label: 'New Users Today', definition: 'anonymous_users rows created since midnight America/Chicago.' },
  newTracked24h: { label: 'New Users 24H', definition: 'anonymous_users rows created in the last 24 hours.' },
  newTracked7d: { label: 'New Users 7D', definition: 'anonymous_users rows created in the last 7 rolling days.' },
  newTracked30d: { label: 'New Users 30D', definition: 'anonymous_users rows created in the last 30 rolling days.' },

  // Accounts
  accounts: { label: 'Total Accounts', definition: 'One row in accounts: a registered email-and-password account.' },
  newAccountsToday: { label: 'New Accounts Today', definition: 'accounts rows created since midnight America/Chicago.' },
  newAccounts24h: { label: 'New Accounts 24H', definition: 'accounts rows created in the last 24 hours.' },
  newAccounts7d: { label: 'New Accounts 7D', definition: 'accounts rows created in the last 7 rolling days.' },
  newAccounts30d: { label: 'New Accounts 30D', definition: 'accounts rows created in the last 30 rolling days.' },
  returningAccounts: { label: 'Returning Accounts', definition: 'Accounts with login_count > 1.' },
  returningRate: { label: 'Returning Accounts %', definition: 'Returning accounts / total accounts.' },
  logins7d: { label: 'Logins 7D', definition: 'account_events with event_type = logged_in in the last 7 days.' },

  // Uploads
  uploadSessions: { label: 'Upload Sessions', definition: 'One row in upload_events: one submission of 1–3 files to the reader.' },
  filesSubmitted: { label: 'Files Submitted', definition: 'SUM(upload_events.files).' },
  successfulSessions: { label: 'Successful Sessions', definition: "upload_events rows with outcome = 'read'." },
  successfulFiles: { label: 'Successful Files', definition: "SUM(upload_events.files) where outcome = 'read'." },
  figuresExtracted: { label: 'Figures Extracted', definition: 'SUM(upload_events.figures).' },
  uniqueUploaders: { label: 'Unique Uploaders', definition: 'Distinct canonical identities with at least one upload session. Identity = account_id, else the account linked to guest_id through account_guests, else guest_id.' },
  uniqueSuccessfulUploaders: { label: 'Successful Unique Uploaders', definition: "Distinct canonical identities with at least one outcome = 'read' session." },
  uploadSuccessRate: { label: 'Upload Success Rate', definition: "Upload sessions with outcome = 'read' / all upload sessions." },
  filesPerUploader: { label: 'Files per Uploader', definition: 'Files submitted / unique uploaders.' },

  // Questions
  questions: { label: 'Questions Submitted', definition: 'One row in beta_questions.' },
  questionsAnswered: { label: 'Questions Answered', definition: "beta_questions with state = 'success'." },
  questionsFailed: { label: 'Failed Questions', definition: "beta_questions finished with a state other than 'success'." },
  questionsPending: { label: 'Pending Questions', definition: 'beta_questions with no finished_at and no final state.' },
  questionSuccessRate: { label: 'Question Success Rate', definition: "Questions with state = 'success' / all finished questions." },

  // Aid analyses
  analyses: { label: 'Aid Analyses', definition: 'Rows in aid_analyses (saved My Aid reads). Expired rows are deleted after 30 days, so this counts analyses still on file.' },
  analysesToday: { label: 'Analyses Today', definition: 'aid_analyses rows created since midnight America/Chicago.' },
  analyses7d: { label: 'Analyses 7D', definition: 'aid_analyses rows created in the last 7 rolling days.' },
  filesAnalyzed: { label: 'Files Analyzed', definition: 'SUM(aid_analyses.file_count).' },

  // Money
  paidCustomers: { label: 'Paid Customers', definition: "Distinct account_id in billing_entitlements with livemode = true, status = 'active', is_test_account not true, and not in EXCLUDED_BILLING_EMAILS." },
  realRevenue: { label: 'Real Revenue', definition: 'SUM(amount) in cents of the same valid entitlements, shown in US dollars.' },
  revenueToday: { label: 'Revenue Today', definition: 'Real revenue with paid_at (or activated_at) since midnight America/Chicago.' },
  revenue7d: { label: 'Revenue 7D', definition: 'Real revenue paid in the last 7 rolling days.' },
  revenue30d: { label: 'Revenue 30D', definition: 'Real revenue paid in the last 30 rolling days.' },
  revenueAll: { label: 'Revenue All-Time', definition: 'All real revenue.' },
  checkoutSessions: { label: 'Checkout Sessions', definition: 'billing_checkouts rows with livemode = true, is_test_account not true, excluding excluded accounts.' },
  checkoutsCompleted: { label: 'Completed Checkouts', definition: "Live checkout sessions with completed_at set or status = 'complete'." },
  checkoutsPaid: { label: 'Paid Checkouts', definition: "Live checkout sessions with paid_at set or payment_status = 'paid', not marked duplicate_payment." },
  checkoutsIncomplete: { label: 'Abandoned / Incomplete', definition: 'Live checkout sessions that were never completed.' },
  checkoutConversion: { label: 'Checkout Conversion', definition: 'Paid checkouts / live checkout sessions.' },
  paywallViews: { label: 'Paywall Views', definition: "monetization_events with event_type = 'paywall_viewed' (live, non-test, excluding excluded accounts)." },
  unlockClicks: { label: 'Unlock Clicks', definition: "monetization_events with event_type 'unlock_clicked' or 'unlock_button_clicked' (live, non-test)." },
  checkoutCreated: { label: 'Checkout Created', definition: "monetization_events with event_type = 'checkout_created' (live, non-test)." },
  checkoutCompleted: { label: 'Checkout Completed', definition: "monetization_events with event_type = 'checkout_completed' (live, non-test)." },
  paymentConfirmed: { label: 'Payment Confirmed', definition: "monetization_events with event_type = 'payment_confirmed' (live, non-test), recorded only from a signature-verified Stripe webhook." },
} as const satisfies Record<string, MetricDefinition>;

export type MetricId = keyof typeof METRICS;

/**
 * The conversion funnel, in product order. Each stage counts distinct
 * accounts (live, non-test, not excluded) that recorded any of its events.
 * Synonyms from older and newer versions of the app are merged. Stages with
 * no events and not marked `always` are hidden; every event type, including
 * ones added later, is also listed in the events table.
 */
export const FUNNEL: { id: string; label: string; events: string[]; always?: boolean }[] = [
  { id: 'my_aid', label: 'My Aid Entered', events: ['my_aid_entered', 'my_aid_page_view'], always: true },
  { id: 'upload', label: 'Upload Started', events: ['aid_upload_started', 'preflight_completed'] },
  { id: 'analysis', label: 'Analysis Completed', events: ['aid_analysis_completed', 'analysis_completed'] },
  { id: 'preview', label: 'Preview Viewed', events: ['aid_preview_viewed'] },
  { id: 'paywall', label: 'Paywall Viewed', events: ['paywall_viewed'], always: true },
  { id: 'unlock', label: 'Unlock Clicked', events: ['unlock_clicked', 'unlock_button_clicked'], always: true },
  { id: 'checkout_created', label: 'Checkout Created', events: ['checkout_created', 'stripe_checkout_started'], always: true },
  { id: 'checkout_completed', label: 'Checkout Completed', events: ['checkout_completed'], always: true },
  { id: 'payment_confirmed', label: 'Payment Confirmed', events: ['payment_confirmed', 'payment_completed'], always: true },
  { id: 'entitlement', label: 'Entitlement Activated', events: ['entitlement_activated'], always: true },
];

/** Friendly names for data sources, for the "some data is unavailable" banner. */
export const SOURCE_NAMES = {
  trackedUsers: 'tracked users', accounts: 'accounts', accountEvents: 'login events', uploads: 'uploads',
  guestLinks: 'guest links', questions: 'questions', monetization: 'funnel events', checkouts: 'checkouts',
  entitlements: 'payments', analyses: 'aid analyses', exclusions: 'excluded billing accounts',
} as const;
