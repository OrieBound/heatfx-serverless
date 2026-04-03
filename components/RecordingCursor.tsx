'use client';

import { useEffect, useState } from 'react';

interface RecordingCursorProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  color?: string;
  sizePx?: number;
}

/** Shows a dot that follows the mouse inside the grid during recording so the user sees where they're pointing. */
export function RecordingCursor({ gridRef, isActive, color = '#6366f1', sizePx = 12 }: RecordingCursorProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const r = sizePx / 2;

  useEffect(() => {
    if (!isActive || !gridRef.current) {
      setPos(null);
      return;
    }
    const el = gridRef.current;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      } else {
        setPos(null);
      }
    };
    const onLeave = () => setPos(null);

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [isActive, gridRef]);

  if (!isActive || !pos || !gridRef.current) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: sizePx,
        height: sizePx,
        marginLeft: -r,
        marginTop: -r,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 0 ${Math.max(2, sizePx / 4)}px ${color}50`,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
