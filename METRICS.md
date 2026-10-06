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

## Traffic → Revenue (attribution)

Source: `acquisition_attribution` in the main FYNQ database (one row per guest browser, written by the FYNQ app on each page load). Until that migration is applied the section says so and nothing else changes.

**First touch is the rule.** A browser's source is the first visit FYNQ recorded for it, and it is never overwritten. An account's source is the earliest-seen browser it has used (linked through `account_guests`). An account created *before* its earliest recorded visit predates tracking, so it is **Legacy / Unattributed**, as is every browser that existed when tracking began and every browser with no row. Nothing is credited to TikTok (or any source) without a recorded touch.

How a visit is classified (in the app, `server/attribution.js`), in priority order:
1. `utm_source` (tiktok/tt → TikTok; ig/instagram → Instagram; fb/facebook/meta → Facebook; google → Google; anything else → Other, or Referral when `utm_medium=referral`)
2. `?ref=` shared link → Referral
3. ad click id present: `ttclid` → TikTok, `gclid` → Google, `fbclid` → Facebook (Instagram if the referrer is instagram.com)
4. referrer host: tiktok.com, instagram.com, facebook.com, google.* → that channel; known sites (Reddit, YouTube, Bing…) → Other; any other site → Referral
5. nothing → Direct. FYNQ itself and Stripe Checkout are never a source.

| Metric | Definition |
|---|---|
| Visitors | Guest browsers by their own first touch (founder-linked browsers excluded). Browsers with no row count as Legacy / Unattributed. |
| Accounts | Accounts by account first touch (excluded accounts left out). |
| Unique uploaders / upload events | People (account, else browser) with `upload_events` rows, by their first touch. |
| Completed question flows | `beta_questions` with `state = 'success'`, by the asker's first touch. |
| Paywall views | Distinct accounts with a live, non-test `paywall_viewed` event. |
| Checkout starts | Distinct accounts with a live, non-test checkout session or checkout-started event. |
| Paying customers / revenue | Same rule as Real Revenue (live, active, non-test, not excluded), grouped by account first touch. The sources always add up to total real revenue. |
| Post-payment completed analyses | Paying accounts with `analysis_completed`, `aid_analysis_completed` or `full_analysis_viewed` at or after payment. |
| Funnel | TikTok visitors → registered → used My Aid → saw paywall → started checkout → paid → completed analysis. Visitors are browsers; later steps are accounts. |
| Top campaigns | Grouped by first-touch source + `utm_campaign` + `utm_content`, sorted by revenue. Conversion = paying customers / visitors. |
| Recent conversions (Activity tab) | The 20 attributed accounts with the newest activity, with the time of each step. Accounts appear as a masked reference (a one-way hash), never an email or id. Not exported. |

Stripe TEST-mode checkouts and payments, test accounts and `EXCLUDED_BILLING_EMAILS` accounts never count as conversions or revenue.

## Story sections (COMMAND, CEO and Investor views)

Every number on the page is one of the metrics above (same ids, same definitions, same exclusions). What is new is computed server-side in `lib/metrics/story.ts`; only the Trajectory arithmetic runs in the browser, and nothing is ever written back.

| Section | What it shows |
|---|---|
| Hero | Total tracked users; new today (since midnight Central) and in the last 7 rolling days; "Updated N seconds ago" counts from `generatedAt`, the time the numbers were computed. |
| Executive strip | MAU, accounts, unique uploaders, files submitted, paid customers, real revenue. "7D growth" = the total now against the total 7 days ago. MAU has no 7-day history and says "Active, last 30 days" instead. |
| FYNQ Pulse | `PULSE_RULE`: new tracked users, last 7 days vs the 7 before. +20% or more with new accounts not falling = Accelerating; +5% or more = Growing; down less than 10% = Steady; down 10% or more = Cooling. Signals: traffic, accounts and upload sessions (7 days vs the 7 before) and paying customers. Never claims a cause. |
| Growth Velocity | `VELOCITY_RULE`: new tracked users in the last 7 days ÷ 7 against the 7 days before. More than 10% faster = Accelerating, more than 10% slower = Slowing, otherwise Stable. |
| Today | New tracked users, new accounts, upload sessions, files submitted, successful reads (sessions with outcome = read), paywall views, checkout starts, payments, revenue — each against yesterday at the same time. |
| 01 Growth | Tracked-user chart (24H hourly; 7D/30D/90D/ALL daily; cumulative or per day) and Tracked, MAU, New Today/7D/30D. |
| The FYNQ Journey | Visitors (tracked users) → accounts → unique uploaders → value (uploaders with a successful read) → accounts that saw the paywall → accounts that started checkout → paying customers. A share is shown only when it is ≤ 100%, because the stages count different things. |
| 02 Activation | Files submitted, upload sessions, unique uploaders, successful unique uploaders, successful files, upload success rate, figures extracted. The files chart labels the "Highest upload day": most files in view, the most recent on a tie. |
| 03 Engagement | 7-day and 24-hour active, questions asked/answered, aid analyses on file, logins in the last 7 days, files per uploader; sign-ups and logins for 30 days. |
| 04 Monetization | Real revenue and paying customers (live, non-test, non-excluded active entitlements). Payment funnel: accounts at paywall viewed → unlock clicked → checkout created → checkout completed → payment confirmed → paying customers; the largest drop-off is the biggest share lost between neighbouring steps. Revenue timeline: per day, cumulative, and customers so far; the axis tops out at no less than $10 / 5 customers so small numbers are drawn small. |
| 05 Retention | Returning accounts (login_count > 1) and their share, 7-day active, MAU, logins per account. "Cohort retention tracking not yet available." |
| Live | The 14 latest anonymous events: visitors (back-to-back grouped), account created, upload completed (read; with the file count), files submitted (not read), question answered, paywall viewed, checkout created, payment confirmed (real money only). No names, emails, ids, payment references or places. |
| Next. | 500 / 1,000 / 2,500 / 5,000 / 10,000 tracked users, 100 / 500 / 1,000 accounts, 10 / 25 / 100 customers. "Completed" carries a date only when the Nth row's own timestamp shows it. |
| Road to 5,000 | Target model, not a forecast. Remaining = 5,000 − tracked users; days left until Dec 31 (Central); required pace = remaining ÷ days left; current pace = last 7 days ÷ 7; gap = current − required. |
| Trajectory | Scenarios, not forecasts. Conservative 0.5×, Current Pace 1×, Strong Growth 2×, Breakout 4× the current pace, or any users/day typed in. Total = tracked users today + users/day × days, rounded down, at 30 days, 90 days and Dec 31. Computed in the browser; never stored. |
| CEO View | One screen: "Is FYNQ growing?" answered by the Pulse rule, then the facts — today, velocity, account growth, activation, payments, retention, the nearest milestone, the 5,000 target and the Pulse signals. |
| Investor View | Seven slides: tracked users, growth chart, MAU and accounts, uploaders and files processed (files in sessions read successfully), customers and revenue, the journey, retention. Presentation Mode hides the navigation, goes full screen, and moves with the arrow keys (Esc exits). |
| Every metric, in detail | Everything from before the redesign, unchanged. |

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
