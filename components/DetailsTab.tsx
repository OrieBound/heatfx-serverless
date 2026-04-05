'use client';

import type { RecordedEvent } from '@/types/events';

export interface DetailsTabData {
  sessionId: string;
  gridWidthPx: number;
  gridHeightPx: number;
  durationMs: number;
  aspectRatio: string;
  eventCounts: Record<string, number>;
  events: RecordedEvent[];
}

function formatEventRow(e: RecordedEvent): string {
  const t = `${e.t}ms`;
  switch (e.type) {
    case 'move':
      return `t=${t}  x=${e.x.toFixed(3)}  y=${e.y.toFixed(3)}`;
    case 'down':
    case 'up':
    case 'click':
      return `t=${t}  x=${e.x.toFixed(3)}  y=${e.y.toFixed(3)}  btn=${e.btn}`;
    case 'drag_start':
    case 'drag_move':
      return `t=${t}  x=${e.x.toFixed(3)}  y=${e.y.toFixed(3)}  btn=${e.btn}`;
    case 'drag_end':
      return `t=${t}  x=${e.x.toFixed(3)}  y=${e.y.toFixed(3)}  btn=${e.btn}  rect=[${e.rect.x1.toFixed(3)},${e.rect.y1.toFixed(3)} → ${e.rect.x2.toFixed(3)},${e.rect.y2.toFixed(3)}]`;
    case 'scroll':
      return `t=${t}  dx=${e.dx}  dy=${e.dy}`;
    default:
      return `t=${t}`;
  }
}

function escapeCsv(value: string | number): string {
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function eventToCsvRow(e: RecordedEvent, index: number): string {
  const hasPoint =
    e.type === 'move' ||
    e.type === 'down' ||
    e.type === 'up' ||
    e.type === 'click' ||
    e.type === 'drag_start' ||
    e.type === 'drag_move' ||
    e.type === 'drag_end';
  const x = hasPoint ? e.x.toFixed(6) : '';
  const y = hasPoint ? e.y.toFixed(6) : '';
  const btn = e.type === 'down' || e.type === 'up' || e.type === 'click' || e.type === 'drag_start' || e.type === 'drag_move' || e.type === 'drag_end' ? e.btn : '';
  const dx = e.type === 'scroll' ? e.dx : '';
  const dy = e.type === 'scroll' ? e.dy : '';
  const rectX1 = e.type === 'drag_end' ? e.rect.x1.toFixed(6) : '';
  const rectY1 = e.type === 'drag_end' ? e.rect.y1.toFixed(6) : '';
  const rectX2 = e.type === 'drag_end' ? e.rect.x2.toFixed(6) : '';
  const rectY2 = e.type === 'drag_end' ? e.rect.y2.toFixed(6) : '';
  const detail = formatEventRow(e);

  const values = [
    index + 1,
    e.t,
    e.type,
    x,
    y,
    btn,
    dx,
    dy,
    rectX1,
    rectY1,
    rectX2,
    rectY2,
    detail,
  ];
  return values.map((v) => escapeCsv(v)).join(',');
}

export function DetailsTab({ data }: { data: DetailsTabData }) {
  const counts = data.eventCounts ?? {};
  const chaosHits = counts['chaos_hits'] ?? 0;
  const eventTypes = Object.keys(counts).filter((t) => t !== 'chaos_hits').sort();
  const handleDownloadCsv = () => {
    const header = [
      '#',
      't_ms',
      'type',
      'x',
      'y',
      'btn',
      'dx',
      'dy',
      'rect_x1',
      'rect_y1',
      'rect_x2',
      'rect_y2',
      'detail',
    ].join(',');
    const rows = (data.events ?? []).map((e, index) => eventToCsvRow(e, index));
    const csv = [header, ...rows].join('\n');
    const utf8Bom = '\uFEFF';
    const blob = new Blob([utf8Bom, csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSessionId = data.sessionId.replace(/[^a-zA-Z0-9_-]/g, '');
    a.download = `heatfx-events-${safeSessionId || 'recording'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 980, margin: '0 auto' }}>
      <section>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>Recording</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          <li>Recording ID: <code style={{ background: 'var(--bg)', padding: '2px 6px', borderRadius: 4 }}>{data.sessionId}</code></li>
          <li>Duration: {(data.durationMs / 1000).toFixed(2)} s</li>
          <li>Grid: {data.gridWidthPx} × {data.gridHeightPx} px</li>
          <li>Aspect ratio: {data.aspectRatio}</li>
          <li>Total events: {data.events?.length ?? 0}</li>
          {chaosHits > 0 && (
            <li style={{ color: '#f87171' }}>
              💥 Chaos hits: <strong>{chaosHits}</strong>
            </li>
          )}
        </ul>
      </section>

      <section>
        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 600 }}>Events by type</h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          {eventTypes.map((type) => (
            <li key={type}>{type}: {counts[type]}</li>
          ))}
        </ul>
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Event list</h3>
          <button
            type="button"
            onClick={handleDownloadCsv}
            style={{
              padding: '7px 12px',
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            Download CSV
          </button>
        </div>
        <div
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            overflow: 'auto',
            maxHeight: 420,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>#</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--text-muted)', fontWeight: 600 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {(data.events ?? []).map((e, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{e.type}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{formatEventRow(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
