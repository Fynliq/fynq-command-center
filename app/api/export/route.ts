import { isSignedIn } from '@/lib/auth';
import { getDashboard } from '@/lib/data';
import { dashboardCsv } from '@/lib/metrics/csv';
import { dayKey } from '@/lib/metrics/time';

export const dynamic = 'force-dynamic';

/** "Export Summary": aggregate metrics as CSV. No user-level rows. */
export async function GET() {
  try {
    if (!(await isSignedIn())) return new Response('Sign in again.', { status: 401 });
    const data = await getDashboard();
    return new Response(dashboardCsv(data), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="fynq-summary-${dayKey(Date.now())}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('The summary is unavailable right now.', { status: 503 });
  }
}
