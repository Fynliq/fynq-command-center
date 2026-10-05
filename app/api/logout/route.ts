import { sessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json', 'Set-Cookie': sessionCookie('', 0), 'Cache-Control': 'no-store' } });
}
