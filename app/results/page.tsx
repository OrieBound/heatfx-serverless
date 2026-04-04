'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { RecordedEvent } from '@/types/events';
import { HeatmapTab } from '@/components/HeatmapTab';
import { ReplayTab } from '@/components/ReplayTab';
import { DetailsTab } from '@/components/DetailsTab';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { useAuth } from '@/contexts/AuthContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

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
  settingSnapshots?: SettingSnapshot[];
}

type Tab = 'heatmap' | 'replay' | 'details';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

function ResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { color: accentColor } = useCursorColor();
  const { user, idToken } = useAuth();
  const sessionId = searchParams.get('sessionId');
  const fromRecordings = searchParams.get('from') === 'recordings';
  const [data, setData] = useState<StoredResult | null>(null);
  const [tab, setTab] = useState<Tab>('heatmap');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = sessionStorage.getItem(`heatfx-result-${sessionId}`);
      if (raw) setData(JSON.parse(raw) as StoredResult);
    } catch {
      setData(null);
    }
  }, [sessionId]);

  const goBack = () => {
    if (sessionId) sessionStorage.removeItem(`heatfx-result-${sessionId}`);
    router.push(fromRecordings ? '/sessions' : '/');
  };

  const handleDelete = async () => {
    if (!idToken || !sessionId) return;
    setIsDeleting(true);
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      sessionStorage.removeItem(`heatfx-result-${sessionId}`);
      router.push('/sessions');
    } catch {
      setIsDeleting(false);
    }
  };

  if (!sessionId) {
    return (
      <div style={{ minHeight: '100vh', padding: 24 }}>
        <p style={{ color: 'var(--text-muted)' }}>No recording found. Start a new one.</p>
        <button
          type="button"
          onClick={() => router.push('/')}
          style={{ marginTop: 16, padding: '8px 16px', background: accentColor, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
        >
          Start recording
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: 24 }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>

        {/* Top navigation */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              padding: '6px 14px',
              background: 'var(--surface)',
              color: accentColor,
              border: `1px solid ${accentColor}`,
              borderRadius: 6,
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {fromRecordings ? '← My Recordings' : '← Back to recording'}
          </button>
          {!fromRecordings && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              You&apos;re viewing results. Go back to record again.
            </span>
          )}
        </div>

        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Results</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Recording: {sessionId}
            {data && ` · ${(data.durationMs / 1000).toFixed(1)}s · ${data.gridWidthPx}×${data.gridHeightPx} · ${data.events?.length ?? 0} events`}
          </p>
        </header>

        {/* Tab switcher */}
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
          {(['heatmap', 'replay', 'details'] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px',
                background: tab === t ? accentColor : 'transparent',
                color: tab === t ? 'white' : 'var(--text-muted)',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: '0.95rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
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

        {/* Bottom action row */}
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={goBack}
            style={{
              padding: '10px 20px',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {fromRecordings ? '← My Recordings' : 'Close'}
          </button>

          {fromRecordings && (
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{
                padding: '10px 20px',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              New recording
            </button>
          )}

          {!fromRecordings && user && (
            <button
              type="button"
              onClick={() => router.push('/sessions')}
              style={{
                padding: '10px 20px',
                background: 'var(--surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              My Recordings
            </button>
          )}

          {fromRecordings && user && (
            <>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: isDeleting ? 'default' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? 'Deleting…' : 'Delete recording'}
              </button>
              <ConfirmDialog
                open={showDeleteConfirm}
                title="Delete this recording?"
                message="This cannot be undone. The recording and all its data will be permanently removed."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                danger
                onConfirm={() => { setShowDeleteConfirm(false); handleDelete(); }}
                onCancel={() => setShowDeleteConfirm(false)}
              />
            </>
          )}

          {!user && (
            <button
              type="button"
              onClick={() => router.push('/auth/login')}
              style={{
                padding: '10px 20px',
                background: accentColor,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.92rem',
              }}
            >
              Log in to save this recording
            </button>
          )}
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
