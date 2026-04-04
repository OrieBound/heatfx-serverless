'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorColor } from '@/contexts/CursorColorContext';

export function AuthPanel() {
  const { user, isLoading, login, logout } = useAuth();
  const { color: accentColor } = useCursorColor();
  const router = useRouter();

  if (isLoading) {
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Account
        </p>
        <button
          type="button"
          onClick={login}
          style={{
            padding: '9px 14px',
            background: accentColor,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          Log in / Sign up
        </button>
        <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          Log in to save sessions and access them later.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Account
      </p>
      <div
        style={{
          padding: '8px 10px',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontSize: '0.82rem',
          color: 'var(--text)',
          wordBreak: 'break-all',
        }}
      >
        {user.email}
      </div>
      <button
        type="button"
        onClick={() => router.push('/sessions')}
        style={{
          padding: '8px 14px',
          background: 'transparent',
          color: accentColor,
          border: `1px solid ${accentColor}`,
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.88rem',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        My Sessions
      </button>
      <button
        type="button"
        onClick={logout}
        style={{
          padding: '8px 14px',
          background: 'transparent',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.88rem',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        Log out
      </button>
    </div>
  );
}
