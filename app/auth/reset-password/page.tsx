'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('Missing NEXT_PUBLIC_COGNITO')) {
    return 'Auth is not configured in this build. Set Cognito env vars and restart or rebuild.';
  }
  if (msg.includes('ResourceNotFoundException')) return 'Cognito pool or client no longer exists. Update .env.local from stack outputs.';
  if (msg.includes('CodeMismatchException'))    return 'Incorrect code. Check your email and try again.';
  if (msg.includes('ExpiredCodeException'))     return 'This code has expired. Request a new code from “Forgot password”.';
  if (msg.includes('InvalidPasswordException')) return 'Password must be at least 8 characters with uppercase, lowercase, and a number.';
  if (msg.includes('LimitExceededException'))   return 'Too many attempts. Try again later.';
  if (msg.includes('TooManyRequestsException')) return 'Too many attempts. Please wait a moment.';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'Network error. Check connection or try again.';
  }
  return 'Something went wrong. Please try again.';
}

function ResetPasswordContent() {
  const { user, isLoading, confirmPasswordReset, requestPasswordReset } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const emailParam = params.get('email')?.trim().toLowerCase() ?? '';

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!isLoading && user) router.replace('/');
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailParam || !code.trim()) return;
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await confirmPasswordReset(emailParam, code, password);
      router.replace('/auth/login?reset=success');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailParam) return;
    setError('');
    try {
      await requestPasswordReset(emailParam);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  if (!emailParam) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>HeatFX</div>
          <h1 style={styles.heading}>Reset password</h1>
          <p style={styles.sub}>Start from the forgot-password step so we know which account to reset.</p>
          <a href="/auth/forgot-password" style={{ ...styles.link, display: 'block', textAlign: 'center' }}>
            Forgot password
          </a>
          <p style={{ ...styles.footer, marginTop: 16 }}>
            <a href="/auth/login" style={styles.link}>Sign in</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>HeatFX</div>
        <h1 style={styles.heading}>Choose a new password</h1>
        <p style={styles.sub}>
          We sent a code to <strong>{emailParam}</strong>. Enter the code from your email, then your new password
          twice.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label} htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Code from email"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters, upper, lower, number"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label} htmlFor="confirm">Confirm new password</label>
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
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p style={styles.hint}>
          <button type="button" onClick={handleResend} style={styles.textBtn}>
            Resend code
          </button>
          {resent ? <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>Check your inbox.</span> : null}
        </p>

        <p style={styles.footer}>
          <a href="/auth/login" style={styles.link}>Back to sign in</a>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg)' }} />}>
      <ResetPasswordContent />
    </Suspense>
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
    lineHeight: 1.55,
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
  hint: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  footer: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  link: {
    color: '#6366f1',
    fontWeight: 600,
    textDecoration: 'none',
  },
  textBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    color: '#6366f1',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    font: 'inherit',
  },
};
