import { redirect } from 'next/navigation';
import { Dashboard } from '@/components/Dashboard';
import { isSignedIn } from '@/lib/auth';
import { getDashboard } from '@/lib/data';
import { ConfigError } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let signedIn = false;
  try {
    signedIn = await isSignedIn();
  } catch (error) {
    if (error instanceof ConfigError) return <NotConfigured missing={error.missing} />;
    throw error;
  }
  if (!signedIn) redirect('/login');

  // The first paint already has live numbers; the page then refreshes itself every 60 seconds.
  const data = await getDashboard();
  return <Dashboard initial={data} />;
}

function NotConfigured({ missing }: { missing: string[] }) {
  return (
    <main className="loginWrap">
      <div className="card loginCard">
        <img className="mark" src="/fynq-logo.png" alt="" width={44} height={44} />
        <h1>FYNQ Command Center isn&rsquo;t configured yet</h1>
        <p className="sub">Add these environment variables in Vercel, then redeploy:</p>
        <ul className="sub">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
      </div>
    </main>
  );
}
