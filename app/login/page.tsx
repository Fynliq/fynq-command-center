import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { isSignedIn } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in · FYNQ Command Center' };

export default async function Login() {
  let signedIn = false;
  try { signedIn = await isSignedIn(); } catch { /* not configured: the form explains */ }
  if (signedIn) redirect('/');
  return <LoginForm />;
}
