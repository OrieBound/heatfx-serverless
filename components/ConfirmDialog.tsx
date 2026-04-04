'use client';

import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus the cancel button when opened (safe default)
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card, #1e1e1e)',
          border: '1px solid var(--border, #333)',
          borderRadius: 12,
          padding: '28px 28px 22px',
          width: '100%',
          maxWidth: 380,
          margin: '0 16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <h3
          id="confirm-title"
          style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}
        >
          {title}
        </h3>

        {message && (
          <p style={{ margin: '0 0 22px', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: '1px solid var(--border, #444)',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: danger ? 'var(--danger, #e53e3e)' : 'var(--accent, #4caf50)',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
