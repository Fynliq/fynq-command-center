import { isSignedIn } from '@/lib/auth';
import { getDashboard } from '@/lib/data';
import { ConfigError } from '@/lib/env';

export const dynamic = 'force-dynamic';

let lastForced = 0;

/** Aggregate JSON only. Requires a dashboard session. */
export async function GET(request: Request) {
  try {
    if (!(await isSignedIn())) return Response.json({ error: 'Sign in again.' }, { status: 401 });
    // The refresh button may skip the 30-second cache, at most every 10 seconds.
    const wantsFresh = new URL(request.url).searchParams.get('fresh') === '1' && Date.now() - lastForced > 10_000;
    if (wantsFresh) lastForced = Date.now();
    const data = await getDashboard(wantsFresh);
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof ConfigError) return Response.json({ error: 'The dashboard is not configured yet.' }, { status: 503 });
    console.error('[command-center] metrics failed:', error instanceof Error ? error.name : 'error');
    return Response.json({ error: 'Metrics are unavailable right now.' }, { status: 503 });
  }
}
