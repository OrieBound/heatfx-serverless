'use client';

import { useRouter } from 'next/navigation';
import { AuthButton } from './AuthButton';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Same breakpoint as the recording layout’s compact mode. */
const COMPACT_HEADER_MQ = '(max-width: 900px)';

export default function AppHeader() {
  const router = useRouter();
  const compact = useMediaQuery(COMPACT_HEADER_MQ);

  return (
    <>
      <div
        className="app-header"
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
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <span className="app-header-title" style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>HeatFX</span>
          <span className="app-header-brand-sub" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Mouse Heatmap &amp; Replay
          </span>
        </button>
        <AuthButton />
      </div>
      {compact && (
        <div
          role="alert"
          className="app-mobile-hint"
          style={{
            flexShrink: 0,
            padding: '12px 16px',
            fontSize: '0.84rem',
            lineHeight: 1.5,
            color: 'var(--text)',
            background: 'rgba(234, 179, 8, 0.14)',
            borderBottom: '2px solid rgba(217, 119, 6, 0.55)',
            textAlign: 'center',
          }}
        >
          <strong>HeatFX is not designed for mobile devices.</strong> It expects a{' '}
          <strong>desktop or laptop</strong> with a <strong>mouse and keyboard</strong> (shortcuts, wheel to resize cursor, precise recording).
          A phone or tablet may load, but behavior is unsupported and can be unreliable — please switch to a computer for the real experience.
        </div>
      )}
    </>
  );
}
