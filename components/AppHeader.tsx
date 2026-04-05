'use client';

import { useRouter } from 'next/navigation';
import { AuthButton } from './AuthButton';

export default function AppHeader() {
  const router = useRouter();
  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}
    >
      <button
        type="button"
        onClick={() => router.push('/')}
        style={{
          background: 'none',
          border: 'none',
          padding: '6px 10px 6px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>HeatFX</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Mouse Heatmap &amp; Replay
        </span>
      </button>
      <AuthButton />
    </div>
  );
}
