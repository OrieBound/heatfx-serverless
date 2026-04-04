'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

interface AdminSession {
  sessionId:    string;
  sub:          string;
  userEmail:    string;
  userNickname: string;
  createdAt:    string;
  durationMs:   number;
  gridWidthPx:  number;
  gridHeightPx: number;
  aspectRatio:  string;
  eventCounts:  Record<string, number>;
}

interface UserGroup {
  sub:          string;
  email:        string;
  nickname:     string;
  sessions:     AdminSession[];
  collapsed:    boolean;
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

function passesFilter(iso: string, filter: DateFilter): boolean {
  if (filter === 'all') return true;
  const d   = new Date(iso);
  const now = new Date();
  if (filter === 'today')  return d.toDateString() === now.toDateString();
  if (filter === 'week')   { const w = new Date(now); w.setDate(now.getDate() - 7);   return d >= w; }
  if (filter === 'month')  { const m = new Date(now); m.setMonth(now.getMonth() - 1); return d >= m; }
  return true;
}

export default function AdminPage() {
  const { user, idToken, isLoading } = useAuth();
  const { color: accentColor }       = useCursorColor();
  const router                       = useRouter();

  const [sessions, setSessions]         = useState<AdminSession[]>([]);
  const [fetching, setFetching]         = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [userGroups, setUserGroups]     = useState<UserGroup[]>([]);
  const [dateFilter, setDateFilter]     = useState<DateFilter>('all');
  const [search, setSearch]             = useState('');
  const [loadingId, setLoadingId]             = useState<string | null>(null);
  const [deletingId, setDeletingId]           = useState<string | null>(null);
  const [viewMode, setViewMode]               = useState<'admin' | 'user'>('admin');
  const [confirmDelete, setConfirmDelete]     = useState<{ sessionId: string; userEmail: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke]     = useState<string | null>(null);
  const [page, setPage]                       = useState(0);
  const [pageSize, setPageSize]               = useState(25);

  // Admin management
  const [adminList, setAdminList]       = useState<{ email: string; nickname: string }[]>([]);
  const [grantEmail, setGrantEmail]     = useState('');
  const [grantLoading, setGrantLoading] = useState(false);
  const [grantError, setGrantError]     = useState<string | null>(null);
  const [grantSuccess, setGrantSuccess] = useState<string | null>(null);

  const isAdmin = user?.groups?.includes('admins') ?? false;

  useEffect(() => {
    if (isLoading) return;
    if (!user || !isAdmin) { router.replace('/'); return; }
    if (!idToken) return;

    // Load admin list
    fetch(`${API_URL}/api/admin/admins`, { headers: { Authorization: `Bearer ${idToken}` } })
      .then(r => r.json())
      .then(data => setAdminList(data.admins ?? []))
      .catch(() => {});

    setFetching(true);
    fetch(`${API_URL}/api/admin/sessions`, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        return data;
      })
      .then(data => {
        const all: AdminSession[] = data.sessions ?? [];
        setSessions(all);

        // Group by sub
        const map = new Map<string, UserGroup>();
        for (const s of all) {
          if (!map.has(s.sub)) {
            map.set(s.sub, {
              sub:       s.sub,
              email:     s.userEmail    || s.sub,
              nickname:  s.userNickname || '',
              sessions:  [],
              collapsed: false,
            });
          }
          map.get(s.sub)!.sessions.push(s);
        }
        setUserGroups(Array.from(map.values()));
      })
      .catch((e: unknown) => setError(e instanceof Error ? `API error: ${e.message}` : 'Failed to load admin data.'))
      .finally(() => setFetching(false));
  }, [idToken, isLoading, isAdmin, user, router]);

  const toggleCollapse = (sub: string) => {
    setUserGroups(prev =>
      prev.map(g => g.sub === sub ? { ...g, collapsed: !g.collapsed } : g)
    );
  };

  const openSession = async (sessionId: string) => {
    if (!idToken) return;
    setLoadingId(sessionId);
    try {
      const res      = await fetch(`${API_URL}/api/admin/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data     = await res.json();
      if (!data.eventsUrl) throw new Error('No events URL');

      const eventsData = await (await fetch(data.eventsUrl)).json();
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
      router.push(`/results?sessionId=${encodeURIComponent(sessionId)}&from=admin`);
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
      await fetch(`${API_URL}/api/admin/sessions/${sessionId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
      setUserGroups(prev =>
        prev
          .map(g => ({ ...g, sessions: g.sessions.filter(s => s.sessionId !== sessionId) }))
          .filter(g => g.sessions.length > 0)
      );
    } catch {
      setError('Failed to delete recording.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleGrant = async () => {
    if (!idToken || !grantEmail.trim()) return;
    setGrantLoading(true);
    setGrantError(null);
    setGrantSuccess(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/admins`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email: grantEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setGrantSuccess(`Admin granted to ${data.granted}`);
      setGrantEmail('');
      setAdminList(prev => [...prev, { email: data.granted, nickname: '' }]);
    } catch (e) {
      setGrantError(e instanceof Error ? e.message : 'Failed to grant admin');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!idToken) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/admins`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      setAdminList(prev => prev.filter(a => a.email !== email));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to revoke admin');
    }
  };

  const filteredGroups = useMemo(() => {
    setPage(0); // reset to first page when filters change
    const q = search.trim().toLowerCase();
    return userGroups
      .map(g => ({
        ...g,
        sessions: g.sessions.filter(s =>
          passesFilter(s.createdAt, dateFilter) &&
          (!q || g.email.toLowerCase().includes(q) || g.nickname.toLowerCase().includes(q) || g.sub.toLowerCase().includes(q))
        ),
      }))
      .filter(g => g.sessions.length > 0)
      .sort((a, b) => {
        if (a.sub === user?.sub) return -1;
        if (b.sub === user?.sub) return 1;
        return 0;
      });
  }, [userGroups, dateFilter, search, user?.sub]);

  const totalPages      = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const pagedGroups     = filteredGroups.slice(page * pageSize, (page + 1) * pageSize);
  const totalRecordings = sessions.length;
  const totalUsers      = userGroups.length;

  if (isLoading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text-muted)' }}>Loading…</p></div>;
  }

  if (!user || !isAdmin) return null;

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => router.push('/')} style={outlineBtn(accentColor)}>
            ← Home
          </button>

          <h1 style={{ margin: 0, fontSize: '1.4rem' }}>Admin Dashboard</h1>

          <span style={{ marginLeft: 'auto' }} />

          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {(['admin', 'user'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  if (mode === 'user') router.push('/sessions');
                  else setViewMode('admin');
                }}
                style={{
                  padding: '7px 16px',
                  background: viewMode === mode ? accentColor : 'transparent',
                  color: viewMode === mode ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {mode === 'admin' ? 'Admin view' : 'User view'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total users',      value: totalUsers },
            { label: 'Total recordings', value: totalRecordings },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding: '14px 24px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                minWidth: 130,
              }}
            >
              <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: accentColor }}>{value}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '8px 14px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              fontSize: '0.88rem',
              outline: 'none',
              width: 240,
            }}
          />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Filter:</span>
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

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {/* Admin management card */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700 }}>Admin accounts</h2>
          <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Only admins can grant or revoke admin access. You cannot revoke your own access.
          </p>

          {/* Current admins */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {adminList.map(a => (
              <div key={a.email} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 600 }}>{a.email}</span>
                {a.nickname && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>({a.nickname})</span>}
                {a.email !== user?.email && (
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(a.email)}
                    style={{ padding: '4px 10px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Revoke
                  </button>
                )}
                {a.email === user?.email && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 10px' }}>You</span>
                )}
              </div>
            ))}
          </div>

          {/* Grant form */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type="email"
              placeholder="user@example.com"
              value={grantEmail}
              onChange={e => { setGrantEmail(e.target.value); setGrantError(null); setGrantSuccess(null); }}
              style={{ padding: '8px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: '0.88rem', outline: 'none', width: 240 }}
            />
            <button
              type="button"
              onClick={handleGrant}
              disabled={grantLoading || !grantEmail.trim()}
              style={{ padding: '8px 16px', background: accentColor, color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: grantLoading || !grantEmail.trim() ? 'default' : 'pointer', opacity: grantLoading || !grantEmail.trim() ? 0.6 : 1 }}
            >
              {grantLoading ? 'Granting…' : 'Grant admin'}
            </button>
          </div>
          {grantError   && <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--danger)' }}>{grantError}</p>}
          {grantSuccess && <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#22c55e' }}>{grantSuccess}</p>}
        </div>

        {fetching && <p style={{ color: 'var(--text-muted)' }}>Loading data…</p>}

        {!fetching && filteredGroups.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>No recordings found.</p>
          </div>
        )}

        {/* User groups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pagedGroups.map(group => (
            <div
              key={group.sub}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}
            >
              {/* User header */}
              <button
                type="button"
                onClick={() => toggleCollapse(group.sub)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: group.collapsed ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* Avatar */}
                <span style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: group.sub === user?.sub ? accentColor : 'var(--border)',
                  color: group.sub === user?.sub ? 'white' : 'var(--text)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.85rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {(group.nickname || group.email || group.sub)[0].toUpperCase()}
                </span>

                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {group.email || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No email on record</span>}
                    {group.nickname && (
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        ({group.nickname})
                      </span>
                    )}
                    {group.sub === user?.sub && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: accentColor, color: 'white' }}>
                        You
                      </span>
                    )}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {group.sub}
                  </p>
                </div>

                <span style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)',
                }}>
                  {group.sessions.length} recording{group.sessions.length !== 1 ? 's' : ''}
                </span>

                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {group.collapsed ? '▼' : '▲'}
                </span>
              </button>

              {/* Sessions list */}
              {!group.collapsed && (
                <div style={{ padding: '0 0 8px' }}>
                  {group.sessions.map(s => (
                    <div
                      key={s.sessionId}
                      style={{
                        padding: '10px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        borderBottom: '1px solid var(--border)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                          {formatDate(s.createdAt)}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '0.77rem', color: 'var(--text-muted)' }}>
                          {(s.durationMs / 1000).toFixed(1)}s &middot; {s.gridWidthPx}&times;{s.gridHeightPx} &middot; {totalEvents(s.eventCounts)} events
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => openSession(s.sessionId)}
                          disabled={!!loadingId}
                          style={{
                            padding: '6px 12px',
                            background: loadingId === s.sessionId ? 'var(--border)' : accentColor,
                            color: 'white',
                            border: 'none',
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: '0.82rem',
                            cursor: loadingId ? 'default' : 'pointer',
                            opacity: loadingId && loadingId !== s.sessionId ? 0.5 : 1,
                          }}
                        >
                          {loadingId === s.sessionId ? 'Loading…' : 'View'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete({ sessionId: s.sessionId, userEmail: group.email })}
                          disabled={deletingId === s.sessionId}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            borderRadius: 6,
                            fontWeight: 600,
                            fontSize: '0.82rem',
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
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {filteredGroups.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}>
            {/* Left: page info + size picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredGroups.length)} of {filteredGroups.length} user{filteredGroups.length !== 1 ? 's' : ''}
              </span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
                style={{
                  padding: '4px 8px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                {[25, 50, 100].map(n => (
                  <option key={n} value={n}>{n} per page</option>
                ))}
              </select>
            </div>

            {/* Right: prev / page dots / next */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  padding: '5px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: page === 0 ? 'var(--text-muted)' : 'var(--text)',
                  fontSize: '0.82rem',
                  cursor: page === 0 ? 'default' : 'pointer',
                  opacity: page === 0 ? 0.5 : 1,
                }}
              >
                ← Prev
              </button>

              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                  if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`ellipsis-${idx}`} style={{ padding: '5px 6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item as number)}
                      style={{
                        padding: '5px 10px',
                        background: page === item ? accentColor : 'var(--surface)',
                        border: `1px solid ${page === item ? accentColor : 'var(--border)'}`,
                        borderRadius: 6,
                        color: page === item ? 'white' : 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: page === item ? 700 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {(item as number) + 1}
                    </button>
                  )
                )}

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                style={{
                  padding: '5px 12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: page === totalPages - 1 ? 'var(--text-muted)' : 'var(--text)',
                  fontSize: '0.82rem',
                  cursor: page === totalPages - 1 ? 'default' : 'pointer',
                  opacity: page === totalPages - 1 ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this recording?"
        message={confirmDelete ? `This will permanently remove the recording from ${confirmDelete.userEmail}. This cannot be undone.` : ''}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { const d = confirmDelete!; setConfirmDelete(null); deleteSession(d.sessionId); }}
        onCancel={() => setConfirmDelete(null)}
      />

      <ConfirmDialog
        open={confirmRevoke !== null}
        title="Revoke admin access?"
        message={confirmRevoke ? `This will remove admin access from ${confirmRevoke}. They will need to be re-granted by an admin.` : ''}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { const email = confirmRevoke!; setConfirmRevoke(null); handleRevoke(email); }}
        onCancel={() => setConfirmRevoke(null)}
      />
    </div>
  );
}

function outlineBtn(color: string): React.CSSProperties {
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
