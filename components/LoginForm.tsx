'use client';

import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (res.ok) { window.location.href = '/'; return; }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? 'Sign-in failed.');
    } catch {
      setError('Could not reach the server. Try again.');
    }
    setBusy(false);
  }

  return (
    <main className="loginWrap">
      <div className="grain" aria-hidden="true" />
      <form className="loginCard" onSubmit={submit}>
        <img className="loginLogo" src="/fynq-logo.png" alt="FYNQ" width={84} height={84} />
        <p className="kicker" style={{ marginTop: 22 }}>FYNQ</p>
        <h1 className="loginTitle">Command Center</h1>
        <p className="lede" style={{ fontSize: 17, marginTop: 10 }}>Founder and COO access only.</p>
        <label htmlFor="password" className="loginLabel">Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="err" role="alert">{error}</p>}
        <button className="loginBtn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
