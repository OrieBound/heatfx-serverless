'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useRecordingSettings } from '@/contexts/RecordingSettingsContext';
import { GridBackground } from './GridBackground';

const ASPECT_RATIO = 4 / 3;

export interface GridDimensions {
  widthPx: number;
  heightPx: number;
}

interface RecordingGridProps {
  /** When set, grid size is frozen to these dimensions (e.g. at recording start). */
  frozen?: GridDimensions | null;
  /** Optional class for the outer wrapper. */
  className?: string;
  /** Content to render inside the grid (e.g. cursor overlay). */
  children?: React.ReactNode;
  /** Ref to attach to the grid element for event capture. */
  gridRef?: React.RefObject<HTMLDivElement>;
  /** When true, show "Recording area" styling (border + label). */
  isRecording?: boolean;
  /** Accent color for border/label when recording (defaults to CSS var --accent). */
  accentColor?: string;
}

export function RecordingGrid({
  frozen,
  className = '',
  children,
  gridRef: externalGridRef,
  isRecording = false,
  accentColor = 'var(--accent)',
}: RecordingGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalGridRef = useRef<HTMLDivElement>(null);
  const gridRef = externalGridRef ?? internalGridRef;
  const { gridBackground } = useRecordingSettings();

  const [liveSize, setLiveSize] = useState<GridDimensions>({ widthPx: 400, heightPx: 300 });

  const measure = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    let widthPx: number;
    let heightPx: number;
    if (w / h >= ASPECT_RATIO) {
      heightPx = h;
      widthPx = Math.round(h * ASPECT_RATIO);
    } else {
      widthPx = w;
      heightPx = Math.round(w / ASPECT_RATIO);
    }
    setLiveSize({ widthPx, heightPx });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    const el = containerRef.current;
    if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const dims = frozen ?? liveSize;
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
        setCoords({ x, y });
      } else {
        setCoords(null);
      }
    };
    const onLeave = () => setCoords(null);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  // gridRef is a stable ref object — adding it to deps is an anti-pattern
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
      }}
    >
        <div
          ref={gridRef}
          style={{
            width: dims.widthPx,
            height: dims.heightPx,
            background: 'var(--bg)',
            border: isRecording ? `3px solid ${accentColor}` : '2px solid var(--border)',
            borderRadius: 8,
            position: 'relative',
            boxShadow: isRecording ? `0 0 20px ${accentColor}30` : undefined,
          }}
        >
        <GridBackground variant={gridBackground} />
        {isRecording && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '0.9rem',
              color: accentColor,
              fontWeight: 700,
              pointerEvents: 'none',
              zIndex: 2,
              textAlign: 'center',
            }}
          >
            Put your cursor in this box — move and click here
          </div>
        )}
        {children}
        {(coords || isRecording) && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: 'var(--text-muted)',
              background: 'var(--surface)',
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border)',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          >
            {coords
              ? `x: ${coords.x.toFixed(3)}  y: ${coords.y.toFixed(3)}`
              : 'x: —  y: —'}
          </div>
        )}
      </div>
    </div>
  );
}

export function useGridDimensions(): GridDimensions {
  return { widthPx: 400, heightPx: 300 };
}
