# FYNQ Command Center: metric definitions

Every number on the dashboard is computed in one place, `lib/metrics/compute.ts`, from the definitions in `lib/metrics/definitions.ts`. The cards, charts, summary, Performance tab and CSV export all read that single result, so a metric can never mean two different things.

## Ground rules

- **Time.** Timestamps are compared as UTC instants. Calendar days, "today" and hourly buckets use **America/Chicago**: "today" starts at midnight Central Time, and daily charts group by the Central calendar day.
- **Rolling windows.** 24H, 7D and 30D are rolling windows ending now. "Today" is compared with yesterday from midnight to the same clock time.
- **Comparisons.**
  - New-in-period counts compare with the previous period of the same length.
  - Totals and rates compare with the same figure as of 7 days ago. Rates change in percentage points ("pts").
  - When the comparison value is 0, the card says **New** instead of an invented percentage.
  - MAU and returning accounts have no history in the database (`last_active_at` and `login_count` are overwritten), so they show no comparison.
- **Real money only.**
  - Paid customers, revenue, checkout conversion and the funnel count only rows with `livemode = true`, `is_test_account` not true, and accounts not listed in `EXCLUDED_BILLING_EMAILS`.
  - Those emails are matched to account IDs on the server and never reach the browser.
  - Amounts are stored in cents and shown in US dollars.
- **No personal data.** The browser receives aggregates only: counts, sums, rates, day buckets. No emails, user IDs, guest IDs, aid facts, analysis overviews or document content are read for display, and the CSV export holds no user-level rows.
- **Failures are local.** If one table cannot be read, only the metrics that depend on it show "Unavailable", and a banner names the source. Everything else stays live.
- **Freshness.** The server recomputes at most every 30 seconds. The page refreshes every 60 seconds, and the Refresh button can skip the cache once every 10 seconds.

## Identities

- **Tracked user:** one row in `anonymous_users`, which is a browser FYNQ has seen.
- **Account:** one row in `accounts`.
- **Unique uploader (canonical identity):**
  1. `upload_events.account_id` when it is set;
  2. otherwise, the account that `guest_id` was linked to in `account_guests`;
  3. otherwise, `guest_id`.

  A student who uploads as a guest and later creates an account therefore counts once.
- **Files, sessions and uploaders are three different counts.** One upload session (one `upload_events` row) carries 1–3 files (`files`). Many sessions can belong to one uploader.

## People

| Metric | Definition |
|---|---|
| **Total Tracked Users** | One row in anonymous_users: a browser FYNQ has seen. |
| **MAU** | Tracked users whose COALESCE(last_active_at, created_at) is within the last 30 rolling days. |
| **7-Day Active** | Tracked users whose COALESCE(last_active_at, created_at) is within the last 7 rolling days. |
| **24-Hour Active** | Tracked users whose COALESCE(last_active_at, created_at) is within the last 24 hours. |
| **New Users Today** | anonymous_users rows created since midnight America/Chicago. |
| **New Users 24H** | anonymous_users rows created in the last 24 hours. |
| **New Users 7D** | anonymous_users rows created in the last 7 rolling days. |
| **New Users 30D** | anonymous_users rows created in the last 30 rolling days. |

## Accounts

| Metric | Definition |
|---|---|
| **Total Accounts** | One row in accounts: a registered email-and-password account. |
| **New Accounts Today** | accounts rows created since midnight America/Chicago. |
| **New Accounts 24H** | accounts rows created in the last 24 hours. |
| **New Accounts 7D** | accounts rows created in the last 7 rolling days. |
| **New Accounts 30D** | accounts rows created in the last 30 rolling days. |
| **Returning Accounts** | Accounts with login_count > 1. |
| **Returning Accounts %** | Returning accounts / total accounts. |
| **Logins 7D** | account_events with event_type = logged_in in the last 7 days. |

## Uploads

| Metric | Definition |
|---|---|
| **Upload Sessions** | One row in upload_events: one submission of 1–3 files to the reader. |
| **Files Submitted** | SUM(upload_events.files). |
| **Successful Sessions** | upload_events rows with outcome = 'read'. |
| **Successful Files** | SUM(upload_events.files) where outcome = 'read'. |
| **Figures Extracted** | SUM(upload_events.figures). |
| **Unique Uploaders** | Distinct canonical identities with at least one upload session. Identity = account_id, else the account linked to guest_id through account_guests, else guest_id. |
| **Successful Unique Uploaders** | Distinct canonical identities with at least one outcome = 'read' session. |
| **Upload Success Rate** | Upload sessions with outcome = 'read' / all upload sessions. |
| **Files per Uploader** | Files submitted / unique uploaders. |

## Questions

| Metric | Definition |
|---|---|
| **Questions Submitted** | One row in beta_questions. |
| **Questions Answered** | beta_questions with state = 'success'. |
| **Failed Questions** | beta_questions finished with a state other than 'success'. |
| **Pending Questions** | beta_questions with no finished_at and no final state. |
| **Question Success Rate** | Questions with state = 'success' / all finished questions. |

## Aid analyses

| Metric | Definition |
|---|---|
| **Aid Analyses** | Rows in aid_analyses (saved My Aid reads). Expired rows are deleted after 30 days, so this counts analyses still on file. |
| **Analyses Today** | aid_analyses rows created since midnight America/Chicago. |
| **Analyses 7D** | aid_analyses rows created in the last 7 rolling days. |
| **Files Analyzed** | SUM(aid_analyses.file_count). |

## Revenue & conversion

| Metric | Definition |
|---|---|
| **Paid Customers** | Distinct account_id in billing_entitlements with livemode = true, status = 'active', is_test_account not true, and not in EXCLUDED_BILLING_EMAILS. |
| **Real Revenue** | SUM(amount) in cents of the same valid entitlements, shown in US dollars. |
| **Revenue Today** | Real revenue with paid_at (or activated_at) since midnight America/Chicago. |
| **Revenue 7D** | Real revenue paid in the last 7 rolling days. |
| **Revenue 30D** | Real revenue paid in the last 30 rolling days. |
| **Revenue All-Time** | All real revenue. |
| **Checkout Sessions** | billing_checkouts rows with livemode = true, is_test_account not true, excluding excluded accounts. |
| **Completed Checkouts** | Live checkout sessions with completed_at set or status = 'complete'. |
| **Paid Checkouts** | Live checkout sessions with paid_at set or payment_status = 'paid', not marked duplicate_payment. |
| **Abandoned / Incomplete** | Live checkout sessions that were never completed. |
| **Checkout Conversion** | Paid checkouts / live checkout sessions. |
| **Paywall Views** | monetization_events with event_type = 'paywall_viewed' (live, non-test, excluding excluded accounts). |
| **Unlock Clicks** | monetization_events with event_type 'unlock_clicked' or 'unlock_button_clicked' (live, non-test). |
| **Checkout Created** | monetization_events with event_type = 'checkout_created' (live, non-test). |
| **Checkout Completed** | monetization_events with event_type = 'checkout_completed' (live, non-test). |
| **Payment Confirmed** | monetization_events with event_type = 'payment_confirmed' (live, non-test), recorded only from a signature-verified Stripe webhook. |

## Conversion funnel

Stages, in order. Each counts **distinct accounts** with any of the listed events in `monetization_events` (livemode = true, is_test_account not true, account not excluded). Stages marked *optional* are hidden when no account has reached them.

| Stage | Events |
|---|---|
| Tracked Users | rows in anonymous_users (shown as the lead-in) |
| Accounts Created | rows in accounts |
| My Aid Entered | `my_aid_entered`, `my_aid_page_view` |
| Upload Started *(optional)* | `aid_upload_started`, `preflight_completed` |
| Analysis Completed *(optional)* | `aid_analysis_completed`, `analysis_completed` |
| Preview Viewed *(optional)* | `aid_preview_viewed` |
| Paywall Viewed | `paywall_viewed` |
| Unlock Clicked | `unlock_clicked`, `unlock_button_clicked` |
| Checkout Created | `checkout_created`, `stripe_checkout_started` |
| Checkout Completed | `checkout_completed` |
| Payment Confirmed | `payment_confirmed`, `payment_completed` |
| Entitlement Activated | `entitlement_activated` |

New event types are never lost: every `event_type` in `monetization_events` (live, non-test) is listed with its count in **Every tracked event**, whether or not it belongs to a funnel stage. To add a stage, add it to `FUNNEL` in `lib/metrics/definitions.ts`.

Only accounts created after the paywall launched record funnel events, so the step from Accounts Created to My Aid Entered is a lower bound for older accounts.

## Activity feed

The last 7 days in 3-hour blocks (Central Time), newest first. Each block counts:
- new tracked users
- new accounts
- logins
- upload sessions
- files submitted
- aid analyses
- questions asked
- paywall views
- live checkouts created
- successful live payments

## Executive summary

These sentences are plain templates filled with the numbers above. No AI is involved, and the sentences are recalculated on every refresh.
