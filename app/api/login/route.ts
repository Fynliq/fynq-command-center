import { ConfigError, serverEnv } from '@/lib/env';
import { createSession, passwordMatches, sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

// Best-effort brute-force brake: 8 tries per address per 15 minutes, per instance.
const attempts = new Map<string, { n: number; until: number }>();
const WINDOW = 15 * 60_000;

export async function POST(request: Request) {
  let env;
  try { env = serverEnv(); } catch (e) {
    return Response.json({ error: e instanceof ConfigError ? 'The dashboard is not configured yet.' : 'Unavailable.' }, { status: 503 });
  }
  // Same-site form posts only.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== request.headers.get('host')) return Response.json({ error: 'Not allowed.' }, { status: 403 });

  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.until > now && entry.n >= 8) return Response.json({ error: 'Too many attempts. Try again in a few minutes.' }, { status: 429 });

  let password = '';
  try { password = String(((await request.json()) as { password?: unknown }).password ?? ''); } catch { /* empty */ }
  if (password.length > 200 || !(await passwordMatches(password, env.password))) {
    attempts.set(ip, { n: (entry && entry.until > now ? entry.n : 0) + 1, until: now + WINDOW });
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: 'That password is not right.' }, { status: 401 });
  }
  attempts.delete(ip);
  const token = await createSession(env.sessionSecret, env.password);
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie(token), 'Cache-Control': 'no-store' } });
}
