'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('UserNotConfirmedException')) return 'Please verify your email before signing in.';
  if (msg.includes('NotAuthorizedException'))    return 'Incorrect email or password.';
  if (msg.includes('UserNotFoundException'))     return 'No account found with that email.';
  if (msg.includes('TooManyRequestsException'))  return 'Too many attempts. Please wait a moment.';
  return 'Something went wrong. Please try again.';
}

export default function LoginPage() {
  const { user, isLoading, signIn } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('UserNotConfirmedException')) {
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
        return;
      }
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>HeatFX</div>
        <h1 style={styles.heading}>Sign in</h1>
        <p style={styles.sub}>Welcome back. Enter your details below.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={styles.footer}>
          Don&apos;t have an account?{' '}
          <a href="/auth/signup" style={styles.link}>Sign up</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    background: 'var(--bg)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: '40px 36px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
  },
  logo: {
    fontSize: '1.1rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    color: '#6366f1',
    marginBottom: 24,
  },
  heading: {
    margin: '0 0 6px',
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--text)',
  },
  sub: {
    margin: '0 0 28px',
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  input: {
    padding: '10px 14px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: '0.95rem',
    outline: 'none',
    width: '100%',
  },
  error: {
    margin: 0,
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid #ef4444',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: '0.85rem',
  },
  button: {
    marginTop: 4,
    padding: '12px',
    background: '#6366f1',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    width: '100%',
  },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  link: {
    color: '#6366f1',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
