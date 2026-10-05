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
      <form className="card loginCard glow" onSubmit={submit}>
        <div className="brand">
          <img className="mark" src="/fynq-logo.png" alt="" width={44} height={44} />
          <div className="brandText">
            <div className="brandName">FYNQ <span>Command Center</span></div>
            <div className="brandSub">Live company intelligence</div>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="sub">Internal dashboard. Founder and COO access only.</p>
        <label htmlFor="password" className="srOnly" style={{ position: 'absolute', left: -9999 }}>Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="err" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </main>
  );
}
