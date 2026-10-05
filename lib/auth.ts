import { cookies } from 'next/headers';
import { serverEnv } from './env';
import { SESSION_COOKIE, verifySession } from './session';

if (typeof window !== 'undefined') throw new Error('lib/auth.ts is server-only');

/** True when the request carries a valid dashboard session. */
export async function isSignedIn(): Promise<boolean> {
  const env = serverEnv();
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value, env.sessionSecret, env.password);
}
