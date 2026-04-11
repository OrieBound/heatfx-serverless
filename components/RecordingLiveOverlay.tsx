'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationTheme } from '@/contexts/RecordingSettingsContext';

interface RecordingLiveOverlayProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  theme: AnimationTheme;
  color: string;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  t: number;
}

const FADE_MS = 550;

function themeDragStyle(_theme: AnimationTheme, color: string): { stroke: string; strokeWidth: number } {
  return { stroke: `${color}ee`, strokeWidth: 2.5 };
}

export function RecordingLiveOverlay({ gridRef, isActive, theme, color }: RecordingLiveOverlayProps) {
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);
  const [completedRects, setCompletedRects] = useState<Rect[]>([]);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!isActive || !gridRef.current) return;
    const el = gridRef.current;

    const getXY = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest('button, a[href], input, textarea, select')) return;
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      if (e.pointerType !== 'mouse' && e.button !== 0) return;
      const { x, y } = getXY(e);
      startRef.current = { x, y };
      isDraggingRef.current = false;
      setCurrentRect(null);
    };

    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      const start = startRef.current;
      if (!start) return;
      const { x, y } = getXY(e);
      const dx = x - start.x;
      const dy = y - start.y;
      if (!isDraggingRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        isDraggingRef.current = true;
      }
      if (!isDraggingRef.current) return;
      const x1 = Math.min(start.x, x);
      const y1 = Math.min(start.y, y);
      const x2 = Math.max(start.x, x);
      const y2 = Math.max(start.y, y);
      setCurrentRect({ x1, y1, x2, y2, t: Date.now() });
    };

    const onUp = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      const start = startRef.current;
      if (start && isDraggingRef.current) {
        const { x, y } = getXY(e);
        const x1 = Math.min(start.x, x);
        const y1 = Math.min(start.y, y);
        const x2 = Math.max(start.x, x);
        const y2 = Math.max(start.y, y);
        setCompletedRects((prev) => [...prev.slice(-12), { x1, y1, x2, y2, t: Date.now() }]);
      }
      startRef.current = null;
      isDraggingRef.current = false;
      setCurrentRect(null);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
    };
  }, [isActive, theme, gridRef]);

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const t = Date.now();
      setCompletedRects((prev) => prev.filter((r) => t - r.t < FADE_MS));
    }, 80);
    return () => clearInterval(id);
  }, [isActive]);

  if (!isActive) return null;

  const { stroke, strokeWidth } = themeDragStyle(theme, color);
  const now = Date.now();

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      <svg width="100%" height="100%" style={{ display: 'block' }}>
        {completedRects.map((r, i) => {
          const age = now - r.t;
          if (age > FADE_MS) return null;
          const opacity = 1 - age / FADE_MS;
          return (
            <rect
              key={`${r.t}-${i}`}
              x={r.x1}
              y={r.y1}
              width={r.x2 - r.x1}
              height={r.y2 - r.y1}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          );
        })}
        {currentRect && (
          <rect
            x={currentRect.x1}
            y={currentRect.y1}
            width={currentRect.x2 - currentRect.x1}
            height={currentRect.y2 - currentRect.y1}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={0.95}
          />
        )}
      </svg>
    </div>
  );
}
