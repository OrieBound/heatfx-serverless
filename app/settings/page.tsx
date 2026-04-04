'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsPage() {
  const { user, isLoading, updateProfile } = useAuth();
  const router = useRouter();

  const [nickname, setNickname]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!isLoading && !user) router.replace('/auth/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.nickname) setNickname(user.nickname);
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      await updateProfile(nickname.trim());
      setSaved(true);
    } catch {
      setError('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 36 }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{
              padding: '7px 14px',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 7,
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>Settings</h1>
        </div>

        {/* Profile card */}
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '28px 28px',
            marginBottom: 20,
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>Profile</h2>
          <p style={{ margin: '0 0 24px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Your display name is shown in the top-right of the app instead of your email address.
          </p>

          {/* Read-only email */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email address</label>
            <div
              style={{
                padding: '10px 14px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                fontSize: '0.92rem',
              }}
            >
              {user.email}
            </div>
            <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Email cannot be changed here.
            </p>
          </div>

          {/* Editable display name */}
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle} htmlFor="nickname">Display name</label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={e => { setNickname(e.target.value); setSaved(false); setError(''); }}
                placeholder={user.email.split('@')[0]}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                  fontSize: '0.92rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This is only a display label — it doesn&apos;t affect how you log in.
              </p>
            </div>

            {error && (
              <p style={{
                margin: '0 0 14px',
                padding: '10px 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid #ef4444',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: '0.85rem',
              }}>
                {error}
              </p>
            )}

            {saved && (
              <p style={{
                margin: '0 0 14px',
                padding: '10px 14px',
                background: 'rgba(34,197,94,0.08)',
                border: '1px solid #22c55e',
                borderRadius: 8,
                color: '#22c55e',
                fontSize: '0.85rem',
              }}>
                Display name updated successfully.
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => router.back()}
                style={{
                  padding: '10px 24px',
                  background: 'transparent',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                }}
              >
                Go back
              </button>
              <button
                type="submit"
                disabled={saving || !nickname.trim()}
                style={{
                  padding: '10px 24px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  fontSize: '0.92rem',
                  cursor: saving || !nickname.trim() ? 'default' : 'pointer',
                  opacity: saving || !nickname.trim() ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Account info card */}
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '20px 28px',
          }}
        >
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>Account</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
            Your HeatFX account details.
          </p>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>User ID: <code style={{ color: 'var(--text)', fontSize: '0.8rem' }}>{user.sub}</code></span>
          </div>
        </section>

      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: '0.82rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
};
