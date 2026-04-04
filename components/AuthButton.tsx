'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export function AuthButton() {
  const { user, isLoading, login, logout } = useAuth();
  const { color: accentColor } = useCursorColor();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = user?.groups?.includes('admins') ?? false;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLoading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => router.push('/auth/login')}
        style={{
          padding: '9px 20px',
          background: accentColor,
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.92rem',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        Log in / Sign up
      </button>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '7px 14px',
          background: 'var(--surface)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: '0.85rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 220,
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: accentColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {(user.nickname ?? user.email)[0].toUpperCase()}
        </span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 160,
          }}
        >
          {`Hi, ${user.nickname ?? user.email.split('@')[0]}!`}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: 190,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {[
            ...(isAdmin ? [{ label: '⚙ Admin Dashboard', path: '/admin' }] : []),
            { label: 'My Recordings', path: '/sessions' },
            { label: 'Settings',      path: '/settings' },
          ].map(({ label, path }) => (
            <button
              key={path}
              type="button"
              onClick={() => { setOpen(false); router.push(path); }}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: 'transparent',
                color: 'var(--text)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                textAlign: 'left',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => { setOpen(false); setShowLogoutConfirm(true); }}
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'transparent',
              color: 'var(--text)',
              border: 'none',
              textAlign: 'left',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--border)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Log out
          </button>
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        title="Log out?"
        message="You will be signed out of your account."
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
