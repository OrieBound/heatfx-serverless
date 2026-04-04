'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const API_URL   = process.env.NEXT_PUBLIC_API_URL!;
const MAX_SAVED = 20;

interface SessionMeta {
  sessionId:    string;
  createdAt:    string;
  gridWidthPx:  number;
  gridHeightPx: number;
  aspectRatio:  string;
  durationMs:   number;
  eventCounts:  Record<string, number>;
}

type DateFilter = 'all' | 'today' | 'week' | 'month';

function totalEvents(counts: Record<string, number>): number {
  return Object.values(counts).reduce((s, n) => s + n, 0);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso));
  } catch { return iso; }
}

function passesDateFilter(iso: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const d = new Date(iso);
  const now = new Date();
  if (filter === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (filter === 'week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    return d >= weekAgo;
  }
  if (filter === 'month') {
    const monthAgo = new Date(now);
    monthAgo.setMonth(now.getMonth() - 1);
    return d >= monthAgo;
  }
  return true;
}

export default function SessionsPage() {
  const { user, idToken, isLoading } = useAuth();
  const { color: accentColor } = useCursorColor();
  const router = useRouter();
  const isAdmin = user?.groups?.includes('admins') ?? false;

  const [sessions, setSessions]     = useState<SessionMeta[]>([]);
  const [fetching, setFetching]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading || !idToken) return;
    setFetching(true);
    setError(null);
    fetch(`${API_URL}/api/sessions`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(r => r.json())
      .then(data => setSessions(data.sessions ?? []))
      .catch(() => setError('Failed to load recordings. Please try again.'))
      .finally(() => setFetching(false));
  }, [idToken, isLoading]);

  const filtered = useMemo(
    () => sessions.filter(s => passesDateFilter(s.createdAt, dateFilter)),
    [sessions, dateFilter]
  );

  const openSession = async (sessionId: string) => {
    if (!idToken) return;
    setLoadingId(sessionId);
    try {
      const res      = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data     = await res.json();
      if (!data.eventsUrl) throw new Error('No events URL');

      const eventsRes  = await fetch(data.eventsUrl);
      const eventsData = await eventsRes.json();

      sessionStorage.setItem(
        `heatfx-result-${sessionId}`,
        JSON.stringify({
          sessionId,
          gridWidthPx:      data.gridWidthPx,
          gridHeightPx:     data.gridHeightPx,
          durationMs:       data.durationMs,
          aspectRatio:      data.aspectRatio,
          eventCounts:      data.eventCounts,
          events:           eventsData.events ?? [],
          settingSnapshots: eventsData.settingSnapshots ?? [],
        })
      );
      router.push(`/results?sessionId=${encodeURIComponent(sessionId)}&from=recordings`);
    } catch {
      setError('Failed to load recording.');
    } finally {
      setLoadingId(null);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!idToken) return;
    setDeletingId(sessionId);
    try {
      await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch {
      setError('Failed to delete recording.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: 'var(--text-muted)' }}>You need to be logged in to view your recordings.</p>
        <button
          type="button"
          onClick={() => router.push('/auth/login')}
          style={{ padding: '10px 20px', background: accentColor, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
        >
          Log in
        </button>
      </div>
    );
  }

  const atLimit = sessions.length >= MAX_SAVED;

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={btnOutline(accentColor)}
          >
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>My Recordings</h1>

          {/* Count badge */}
          <span
            style={{
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: '0.8rem',
              fontWeight: 700,
              background: atLimit ? 'rgba(239,68,68,0.15)' : 'var(--surface)',
              color: atLimit ? '#ef4444' : 'var(--text-muted)',
              border: `1px solid ${atLimit ? '#ef4444' : 'var(--border)'}`,
            }}
          >
            {sessions.length} / {MAX_SAVED}
          </span>

          <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            {user.email}
          </span>

          {isAdmin && (
            <button
              type="button"
              onClick={() => router.push('/admin')}
              style={{
                padding: '6px 14px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: 7,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              Admin view
            </button>
          )}
        </div>

        {/* Limit warning */}
        {atLimit && (
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid #ef4444',
            borderRadius: 8,
            fontSize: '0.85rem',
            color: '#ef4444',
          }}>
            You&apos;ve reached the 20-recording limit. Delete older recordings to save new ones.
          </div>
        )}

        {/* Filter bar */}
        {sessions.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: 4 }}>Filter:</span>
            {(['all', 'today', 'week', 'month'] as DateFilter[]).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setDateFilter(f)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 20,
                  border: `1px solid ${dateFilter === f ? accentColor : 'var(--border)'}`,
                  background: dateFilter === f ? accentColor : 'transparent',
                  color: dateFilter === f ? 'white' : 'var(--text-muted)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {f === 'all' ? 'All time' : f === 'today' ? 'Today' : f === 'week' ? 'This week' : 'This month'}
              </button>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {fetching && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading recordings…</p>
        )}

        {/* Empty state */}
        {!fetching && sessions.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ margin: '0 0 16px', color: 'var(--text-muted)' }}>
              No saved recordings yet. Record something and save it!
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              style={{ padding: '9px 18px', background: accentColor, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}
            >
              Start recording
            </button>
          </div>
        )}

        {/* No results after filter */}
        {!fetching && sessions.length > 0 && filtered.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No recordings match this filter.</p>
          </div>
        )}

        {/* Recordings list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(s => (
            <div
              key={s.sessionId}
              style={{
                padding: '14px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                  {formatDate(s.createdAt)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {(s.durationMs / 1000).toFixed(1)}s &middot; {s.gridWidthPx}&times;{s.gridHeightPx} &middot; {totalEvents(s.eventCounts)} events
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => openSession(s.sessionId)}
                  disabled={!!loadingId}
                  style={{
                    padding: '7px 14px',
                    background: loadingId === s.sessionId ? 'var(--border)' : accentColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: 7,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: loadingId ? 'default' : 'pointer',
                    opacity: loadingId && loadingId !== s.sessionId ? 0.5 : 1,
                  }}
                >
                  {loadingId === s.sessionId ? 'Loading…' : 'View'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(s.sessionId)}
                  disabled={deletingId === s.sessionId}
                  style={{
                    padding: '7px 14px',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 7,
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: deletingId === s.sessionId ? 'default' : 'pointer',
                    opacity: deletingId === s.sessionId ? 0.6 : 1,
                  }}
                >
                  {deletingId === s.sessionId ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete this recording?"
        message="This cannot be undone. The recording and all its data will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { const id = confirmDeleteId!; setConfirmDeleteId(null); deleteSession(id); }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function btnOutline(color: string): React.CSSProperties {
  return {
    padding: '6px 14px',
    background: 'var(--surface)',
    color: color,
    border: `1px solid ${color}`,
    borderRadius: 6,
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  };
}
