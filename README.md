# FYNQ Command Center

Internal, password-protected analytics for FYNQ: users, accounts, uploads, questions, aid analyses, revenue and conversion, live from the production Supabase project. It is a standalone Next.js app with its own Vercel project and never writes to the database.

Metric definitions: [METRICS.md](./METRICS.md).

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4 pipeline, with the design written as plain CSS in `app/globals.css`
- Supabase JS, server-side only, using the service-role key
- Charts: hand-built SVG components in `components/charts.tsx`. They add no chart dependency and are small and accessible.

## How it is put together
```
app/page.tsx              Signed-in check, first paint with live data
app/login/                Password screen
app/api/login|logout      Signed HttpOnly session cookie
app/api/metrics           Aggregate JSON (requires session), 30-second server cache
app/api/export            Aggregate CSV ("Export Summary")
lib/data.ts               Server-only Supabase reads: minimal columns, paged, per-table failure
lib/metrics/compute.ts    The ONE place anything is counted (pure functions, tested)
lib/metrics/definitions.ts  Every metric's label and definition
components/               Dashboard, cards, charts
test/metrics.test.ts      Metric tests on synthetic data
```

## Environment variables
| Name | What it is |
|---|---|
| `SUPABASE_URL` | Production project URL, `https://<ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys → service_role. **Server only. Never add a `NEXT_PUBLIC_` prefix.** |
| `DASHBOARD_PASSWORD` | The password you type on the login screen |
| `DASHBOARD_SESSION_SECRET` | 32+ random characters, e.g. `openssl rand -base64 48`. Changing it, or the password, signs every device out. |
| `EXCLUDED_BILLING_EMAILS` | Comma-separated founder/test emails whose payments are not real revenue |

## Security
- The service-role key is read only in server code (`lib/env.ts`, `lib/data.ts`). It has no `NEXT_PUBLIC_` prefix, so Next.js never sends it to the browser.
- Every page and API route checks the session on the server.
- The session cookie is `__Host-`, HttpOnly, Secure and SameSite=Strict, signed with HMAC-SHA256, and expires after 12 hours.
- Login attempts are throttled.
- The browser only ever receives aggregate JSON.
- `noindex`, `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer` are set on every response, and `robots.txt` disallows all.

## Run it locally
```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
npm test                     # metric tests (synthetic data, no network)
npm run typecheck
```

## Deploy (Vercel)
1. Vercel → **Add New → Project** → import this repository. The framework is detected as Next.js; keep the defaults.
2. Add the five environment variables above for **Production** (and for Preview if you want preview deployments to work).
3. Deploy, open the URL and sign in.
