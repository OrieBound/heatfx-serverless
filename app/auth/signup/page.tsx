'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('UsernameExistsException'))   return 'An account with this email already exists.';
  if (msg.includes('InvalidPasswordException'))  return 'Password must be at least 8 characters with uppercase, lowercase, and a number.';
  if (msg.includes('InvalidParameterException')) return 'Please enter a valid email address.';
  if (msg.includes('TooManyRequestsException'))  return 'Too many attempts. Please wait a moment.';
  return 'Something went wrong. Please try again.';
}

export default function SignupPage() {
  const { user, isLoading, signUp } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, username);
      router.push(`/auth/verify?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>HeatFX</div>
        <h1 style={styles.heading}>Create an account</h1>
        <p style={styles.sub}>
          Free forever. Save and revisit your recordings anytime.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="username">
              Display name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              id="username"
              type="text"
              autoComplete="nickname"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. heatfx_user"
              style={styles.input}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              This is what appears in the top-right instead of your email.
            </span>
          </div>

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
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <a href="/auth/login" style={styles.link}>Sign in</a>
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
