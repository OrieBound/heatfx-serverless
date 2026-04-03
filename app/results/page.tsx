'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RecordedEvent } from '@/types/events';
import { HeatmapTab } from '@/components/HeatmapTab';
import { ReplayTab } from '@/components/ReplayTab';
import { DetailsTab } from '@/components/DetailsTab';
import { useCursorColor } from '@/contexts/CursorColorContext';

/** Snapshot of cursor/theme settings at a moment during recording (t = ms since start). */
export interface SettingSnapshot {
  t: number;
  cursorColor: string;
  animationTheme: string;
  cursorSizePx: number;
}

export interface StoredResult {
  sessionId: string;
  gridWidthPx: number;
  gridHeightPx: number;
  durationMs: number;
  aspectRatio: string;
  eventCounts: Record<string, number>;
  events: RecordedEvent[];
  /** If present, replay uses these so animation matches what the user saw at each time. */
  settingSnapshots?: SettingSnapshot[];
}

type Tab = 'heatmap' | 'replay' | 'details';

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { color: accentColor } = useCursorColor();
  const sessionId = searchParams.get('sessionId');
  const [data, setData] = useState<StoredResult | null>(null);
  const [tab, setTab] = useState<Tab>('heatmap');

  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = sessionStorage.getItem(`heatfx-result-${sessionId}`);
      if (raw) setData(JSON.parse(raw) as StoredResult);
    } catch {
      setData(null);
    }
  }, [sessionId]);

  const handleDiscard = () => {
    if (sessionId) sessionStorage.removeItem(`heatfx-result-${sessionId}`);
    router.push('/');
  };

  if (!sessionId) {
    return (
      <div style={{ minHeight: '100vh', padding: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>No session. Start a recording first.</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ marginTop: 16, padding: '8px 16px', background: accentColor, color: 'white', border: 'none', borderRadius: 8 }}
        >
          Go to recording
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
      {/* Compact back navigation */}
      <div
        style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{
            padding: '6px 14px',
            background: 'var(--surface)',
            color: accentColor,
            border: `1px solid ${accentColor}`,
            borderRadius: 6,
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          ← Back to recording
        </button>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          You’re viewing results. Go back to record again.
        </span>
      </div>

      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Results</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Session: {sessionId}
          {data && ` · ${(data.durationMs / 1000).toFixed(1)}s · ${data.gridWidthPx}×${data.gridHeightPx} · ${data.events?.length ?? 0} events`}
        </p>
      </header>

      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          padding: 4,
          background: 'var(--surface)',
          borderRadius: 10,
          border: '1px solid var(--border)',
          width: 'fit-content',
        }}
      >
        <button
          type="button"
          onClick={() => setTab('heatmap')}
          style={{
            padding: '10px 20px',
            background: tab === 'heatmap' ? accentColor : 'transparent',
            color: tab === 'heatmap' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          Heatmap
        </button>
        <button
          type="button"
          onClick={() => setTab('replay')}
          style={{
            padding: '10px 20px',
            background: tab === 'replay' ? accentColor : 'transparent',
            color: tab === 'replay' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          Replay
        </button>
        <button
          type="button"
          onClick={() => setTab('details')}
          style={{
            padding: '10px 20px',
            background: tab === 'details' ? accentColor : 'transparent',
            color: tab === 'details' ? 'white' : 'var(--text-muted)',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          Details
        </button>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          minHeight: 400,
          overflow: 'hidden',
        }}
      >
        {tab === 'heatmap' && data && (
          <HeatmapTab
            events={data.events}
            gridWidthPx={data.gridWidthPx}
            gridHeightPx={data.gridHeightPx}
            accentColor={accentColor}
          />
        )}
        {tab === 'replay' && data && (
          <ReplayTab
            events={data.events}
            gridWidthPx={data.gridWidthPx}
            gridHeightPx={data.gridHeightPx}
            durationMs={data.durationMs}
            settingSnapshots={data.settingSnapshots}
          />
        )}
        {tab === 'details' && data && <DetailsTab data={data} />}
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={handleDiscard}
          style={{
            padding: '10px 20px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
          }}
        >
          Discard
        </button>
        <span style={{ marginLeft: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Log in to save this session
        </span>
      </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading…</div>}>
      <ResultsContent />
    </Suspense>
  );
}
