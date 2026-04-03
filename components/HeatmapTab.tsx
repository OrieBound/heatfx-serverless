'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RecordedEvent } from '@/types/events';

const HEAT_RES = 64;
const RADIUS = 0.03;

function classicColor(ratio: number): string {
  const r = Math.min(255, Math.floor(255 * ratio));
  const g = Math.min(255, Math.floor(128 * (1 - ratio)));
  const b = Math.min(255, Math.floor(128 * (1 - ratio)));
  return `rgb(${r},${g},${b})`;
}

interface HeatmapTabProps {
  events: RecordedEvent[];
  gridWidthPx: number;
  gridHeightPx: number;
  /** Cursor/accent color for drag rects and path (matches recording theme). */
  accentColor?: string;
}

export function HeatmapTab({ events, gridWidthPx, gridHeightPx, accentColor = '#6366f1' }: HeatmapTabProps) {
  const dragStroke = `${accentColor}cc`;
  const pathStroke = `${accentColor}99`;
  const [showMovement, setShowMovement] = useState(true);
  const [showClickHeat, setShowClickHeat] = useState(true);
  const [showDragRects, setShowDragRects] = useState(true);
  const [showDragPath, setShowDragPath] = useState(true);
  const [showRightClicks, setShowRightClicks] = useState(true);

  const { movementGrid, clickGridLeft, clickGridRight, dragRects, dragPath } = useMemo(() => {
    const cols = HEAT_RES;
    const rows = Math.max(1, Math.round((HEAT_RES * gridHeightPx) / gridWidthPx));
    const movementGrid = Array.from({ length: rows }, () => new Float32Array(cols));
    const clickGridLeft = Array.from({ length: rows }, () => new Float32Array(cols));
    const clickGridRight = Array.from({ length: rows }, () => new Float32Array(cols));
    const dragRects: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const dragPath: { x: number; y: number }[] = [];

    const toCell = (x: number, y: number) => ({
      c: Math.min(cols - 1, Math.floor(x * cols)),
      r: Math.min(rows - 1, Math.floor(y * rows)),
    });
    const addHeat = (grid: Float32Array[], x: number, y: number, amount: number) => {
      const { c, r } = toCell(x, y);
      grid[r][c] += amount;
    };
    const addGaussian = (grid: Float32Array[], x: number, y: number, amount: number) => {
      const cx = x * cols;
      const cy = y * rows;
      const rad = RADIUS * Math.min(cols, rows);
      for (let dr = -Math.ceil(rad); dr <= Math.ceil(rad); dr++) {
        for (let dc = -Math.ceil(rad); dc <= Math.ceil(rad); dc++) {
          const r = Math.floor(cy + dr);
          const c = Math.floor(cx + dc);
          if (r >= 0 && r < grid.length && c >= 0 && c < cols) {
            const dist = Math.hypot(dr, dc) / rad;
            if (dist <= 1) grid[r][c] += amount * (1 - dist);
          }
        }
      }
    };

    const addClickHeat = (x: number, y: number, btn: 0 | 2) => {
      if (btn === 0) addGaussian(clickGridLeft, x, y, 1);
      if (btn === 2) addGaussian(clickGridRight, x, y, 1);
    };
    for (const e of events) {
      if (e.type === 'move') addGaussian(movementGrid, e.x, e.y, 1);
      if (e.type === 'drag_move') {
        addGaussian(movementGrid, e.x, e.y, 1);
        dragPath.push({ x: e.x, y: e.y });
      }
      if (e.type === 'down') addClickHeat(e.x, e.y, e.btn);
      if (e.type === 'drag_start') addClickHeat(e.x, e.y, e.btn);
      if (e.type === 'click') addClickHeat(e.x, e.y, e.btn);
      if (e.type === 'drag_end' && e.rect) dragRects.push(e.rect);
    }

    return { movementGrid, clickGridLeft, clickGridRight, dragRects, dragPath };
  }, [events, gridWidthPx, gridHeightPx]);

  const cols = HEAT_RES;
  const rows = Math.max(1, Math.round((HEAT_RES * (gridHeightPx || 300)) / (gridWidthPx || 400)));
  const [canvasUrl, setCanvasUrl] = useState<string>('');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const maxM = movementGrid.reduce((m, row) => Math.max(m, ...row), 0) || 1;
    const maxCL = clickGridLeft.reduce((m, row) => Math.max(m, ...row), 0) || 1;
    const maxCR = clickGridRight.reduce((m, row) => Math.max(m, ...row), 0) || 1;

    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const id = ctx.getImageData(0, 0, cols, rows);
    const d = id.data;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let R = 0, G = 0, B = 0;
        if (showMovement && movementGrid[r][c] > 0) {
          const ratio = movementGrid[r][c] / maxM;
          const color = classicColor(ratio);
          const match = color.match(/\d+/g);
          if (match) {
            R += Number(match[0]); G += Number(match[1]); B += Number(match[2]);
          }
        }
        if (showClickHeat && clickGridLeft[r][c] > 0) {
          const ratio = clickGridLeft[r][c] / maxCL;
          const color = classicColor(ratio);
          const match = color.match(/\d+/g);
          if (match) {
            R = Math.max(R, Number(match[0])); G = Math.max(G, Number(match[1])); B = Math.max(B, Number(match[2]));
          }
        }
        if (showRightClicks && clickGridRight[r][c] > 0) {
          const ratio = clickGridRight[r][c] / maxCR;
          R = Math.min(255, Math.max(R, Math.floor(80 * ratio)));
          G = Math.min(255, Math.max(G, Math.floor(100 * ratio)));
          B = Math.min(255, B + Math.floor(220 * ratio));
        }
        const i = (r * cols + c) * 4;
        d[i] = Math.min(255, R);
        d[i + 1] = Math.min(255, G);
        d[i + 2] = Math.min(255, B);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
    setCanvasUrl(canvas.toDataURL('image/png'));
  }, [movementGrid, clickGridLeft, clickGridRight, showMovement, showClickHeat, showRightClicks, rows, cols]);

  const displayWidth = Math.min(800, gridWidthPx || 400);
  const displayHeight = Math.round((displayWidth * (gridHeightPx || 300)) / (gridWidthPx || 400));

  const toggleLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: '0.9rem' };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Warmer areas = more movement or clicks. Use the toggles to show or hide each layer.
      </p>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center' }}>
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              position: 'relative',
              width: displayWidth,
              height: displayHeight,
              background: 'var(--bg)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {canvasUrl && (
            <img
              src={canvasUrl}
              alt="Heatmap"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                display: 'block',
              }}
            />
            )}
            {showDragRects && dragRects.length > 0 && (
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
              >
                {dragRects.map((rect, i) => (
                  <rect
                    key={i}
                    x={rect.x1}
                    y={rect.y1}
                    width={rect.x2 - rect.x1}
                    height={rect.y2 - rect.y1}
                    fill="none"
                    stroke={dragStroke}
                    strokeWidth={0.005}
                  />
                ))}
              </svg>
            )}
            {showDragPath && dragPath.length > 1 && (
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
              >
                <polyline
                  points={dragPath.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={pathStroke}
                  strokeWidth={0.008}
                />
              </svg>
            )}
          </div>
        </div>
        <div
          style={{
            width: 220,
            flexShrink: 0,
            padding: '14px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            marginLeft: 8,
          }}
        >
          <p style={{ margin: '0 0 12px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Toggles</p>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showMovement ? 'var(--border)' : 'transparent' }}>
            <input type="checkbox" checked={showMovement} onChange={(e) => setShowMovement(e.target.checked)} style={{ accentColor: dragStroke }} />
            Movement heat
          </label>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showClickHeat ? 'var(--border)' : 'transparent' }}>
            <input type="checkbox" checked={showClickHeat} onChange={(e) => setShowClickHeat(e.target.checked)} style={{ accentColor: dragStroke }} />
            Click heat
          </label>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showDragRects ? 'var(--border)' : 'transparent' }}>
            <input type="checkbox" checked={showDragRects} onChange={(e) => setShowDragRects(e.target.checked)} style={{ accentColor: dragStroke }} />
            Drag rectangles
          </label>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showDragPath ? 'var(--border)' : 'transparent' }}>
            <input type="checkbox" checked={showDragPath} onChange={(e) => setShowDragPath(e.target.checked)} style={{ accentColor: dragStroke }} />
            Drag path
          </label>
          <label style={{ ...toggleLabelStyle, marginBottom: 0, padding: '6px 10px', borderRadius: 8, background: showRightClicks ? 'var(--border)' : 'transparent' }}>
            <input type="checkbox" checked={showRightClicks} onChange={(e) => setShowRightClicks(e.target.checked)} style={{ accentColor: dragStroke }} />
            Right-clicks
          </label>
          <p style={{ margin: '12px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Movement = hover density; clicks = left (warm) / right (blue tint).
          </p>
        </div>
      </div>
    </div>
  );
}
