'use client';

import { useEffect, useState } from 'react';
import type { CursorShape } from '@/contexts/RecordingSettingsContext';
import { CURSOR_SIZE_DEFAULT } from '@/contexts/RecordingSettingsContext';

interface RecordingCursorProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  color?: string;
  sizePx?: number;
  shape?: CursorShape;
}

function getShapeStyle(shape: CursorShape, sizePx: number, color: string): React.CSSProperties {
  const glowSize = Math.max(2, sizePx / 4);
  const glow = `0 0 0 ${glowSize}px ${color}50`;

  switch (shape) {
    case 'square':
      return { borderRadius: 2, background: color, boxShadow: glow };
    case 'plus':
      return {
        background: color,
        clipPath: 'polygon(33% 0%,67% 0%,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0% 67%,0% 33%,33% 33%)',
      };
    case 'diamond':
      return { background: color, transform: 'rotate(45deg)', borderRadius: 1, boxShadow: glow };
    case 'octagon':
      return {
        background: color,
        clipPath:
          'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)',
        boxShadow: glow,
      };
    case 'triangle':
      return { background: color, clipPath: 'polygon(50% 0%,0% 100%,100% 100%)' };
    case 'circle':
    default:
      return { borderRadius: '50%', background: color, boxShadow: glow };
  }
}

export function RecordingCursor({
  gridRef, isActive, color = '#6366f1', sizePx = CURSOR_SIZE_DEFAULT, shape = 'circle',
}: RecordingCursorProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isActive || !gridRef.current) { setPos(null); return; }
    const el = gridRef.current;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setPos(null);
      }
    };
    const onLeave = () => setPos(null);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, [isActive, gridRef]);

  if (!isActive || !pos) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: sizePx,
        height: sizePx,
        marginLeft: -sizePx / 2,
        marginTop: -sizePx / 2,
        pointerEvents: 'none',
        zIndex: 5,
        ...getShapeStyle(shape, sizePx, color),
      }}
    />
  );
}
