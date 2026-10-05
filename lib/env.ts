/**
 * Server configuration. Read only in server code (route handlers, server
 * components). Nothing here is ever prefixed NEXT_PUBLIC_, so Next.js never
 * bundles it for the browser.
 */

if (typeof window !== 'undefined') throw new Error('lib/env.ts is server-only');

export class ConfigError extends Error {
  constructor(public missing: string[]) {
    super(`Missing configuration: ${missing.join(', ')}`);
    this.name = 'ConfigError';
  }
}

export interface ServerEnv {
  supabaseUrl: string;
  serviceRoleKey: string;
  password: string;
  sessionSecret: string;
  excludedEmails: string[];
}

export function serverEnv(): ServerEnv {
  const get = (name: string) => (process.env[name] ?? '').trim();
  const env = {
    supabaseUrl: get('SUPABASE_URL'),
    serviceRoleKey: get('SUPABASE_SERVICE_ROLE_KEY'),
    password: get('DASHBOARD_PASSWORD'),
    sessionSecret: get('DASHBOARD_SESSION_SECRET'),
    excludedEmails: get('EXCLUDED_BILLING_EMAILS').split(',').map((e) => e.trim().toLowerCase()).filter((e) => e.includes('@')),
  };
  const missing = [
    !env.supabaseUrl && 'SUPABASE_URL',
    !env.serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    !env.password && 'DASHBOARD_PASSWORD',
    env.sessionSecret.length < 32 && 'DASHBOARD_SESSION_SECRET (32+ characters)',
  ].filter((x): x is string => Boolean(x));
  if (missing.length) throw new ConfigError(missing);
  return env;
}
