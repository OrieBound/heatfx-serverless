'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('CodeMismatchException'))    return 'Incorrect code. Please check your email and try again.';
  if (msg.includes('ExpiredCodeException'))     return 'This code has expired. Request a new one below.';
  if (msg.includes('TooManyRequestsException')) return 'Too many attempts. Please wait a moment.';
  if (msg.includes('AliasExistsException'))     return 'This email is already verified. Try signing in.';
  return 'Something went wrong. Please try again.';
}

function VerifyContent() {
  const { confirmSignUp, resendCode, signIn } = useAuth();
  const router    = useRouter();
  const params    = useSearchParams();
  const emailParam = params.get('email') ?? '';
  const passwordParam = params.get('password') ?? '';

  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [resent, setResent]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailParam || !code) return;
    setError('');
    setLoading(true);
    try {
      await confirmSignUp(emailParam, code);
      // Auto sign-in if password was passed through
      if (passwordParam) {
        try {
          await signIn(emailParam, passwordParam);
        } catch { /* ignore — user can sign in manually */ }
      }
      router.replace('/');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!emailParam) return;
    try {
      await resendCode(emailParam);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>HeatFX</div>
        <h1 style={styles.heading}>Check your email</h1>
        <p style={styles.sub}>
          We sent a 6-digit verification code to{' '}
          <strong style={{ color: 'var(--text)' }}>{emailParam || 'your email'}</strong>.
          Enter it below to confirm your account.
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
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              style={{ ...styles.input, letterSpacing: '0.25em', fontSize: '1.2rem', textAlign: 'center' }}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          {resent && <p style={styles.success}>New code sent — check your inbox.</p>}

          <button type="submit" disabled={loading || code.length < 6} style={styles.button}>
            {loading ? 'Verifying…' : 'Verify email'}
          </button>
        </form>

        <p style={styles.footer}>
          Didn&apos;t receive a code?{' '}
          <button type="button" onClick={handleResend} style={styles.textBtn}>
            Resend
          </button>
          {' · '}
          <a href="/auth/login" style={styles.link}>Back to sign in</a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    }>
      <VerifyContent />
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
    lineHeight: 1.5,
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
  success: {
    margin: 0,
    padding: '10px 14px',
    background: 'rgba(34,197,94,0.08)',
    border: '1px solid #22c55e',
    borderRadius: 8,
    color: '#22c55e',
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
