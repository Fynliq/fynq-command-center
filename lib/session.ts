/**
 * The login session: a signed, expiring token in an HttpOnly cookie.
 *
 * token = base64url({ exp }) + "." + base64url(HMAC-SHA256(payload))
 * The HMAC key mixes DASHBOARD_SESSION_SECRET with DASHBOARD_PASSWORD, so
 * changing either one logs every device out. Web Crypto only, so it runs in
 * any Next.js runtime.
 */

export const SESSION_COOKIE = '__Host-fynq_cc';
export const SESSION_HOURS = 12;

const enc = new TextEncoder();
const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url');

async function key(secret: string, password: string) {
  return crypto.subtle.importKey('raw', enc.encode(`fynq-cc-v1|${secret}|${password}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSession(secret: string, password: string, now = Date.now()): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ exp: now + SESSION_HOURS * 3_600_000 })));
  const sig = await crypto.subtle.sign('HMAC', await key(secret, password), enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined, secret: string, password: string, now = Date.now()): Promise<boolean> {
  if (!token || token.length > 512) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  let sigBytes: Uint8Array<ArrayBuffer>;
  try { sigBytes = Uint8Array.from(Buffer.from(sig, 'base64url')); } catch { return false; }
  // crypto.subtle.verify compares in constant time.
  const valid = await crypto.subtle.verify('HMAC', await key(secret, password), sigBytes, enc.encode(payload));
  if (!valid) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}

/** Password check without leaking its length or content through timing. */
export async function passwordMatches(given: string, expected: string): Promise<boolean> {
  const k = await crypto.subtle.importKey('raw', enc.encode('fynq-cc-password-check'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  const expectedMac = await crypto.subtle.sign('HMAC', k, enc.encode(expected));
  return crypto.subtle.verify('HMAC', k, expectedMac, enc.encode(given));
}

export const sessionCookie = (value: string, maxAgeSeconds = SESSION_HOURS * 3600) =>
  `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAgeSeconds}`;
