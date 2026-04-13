'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RecordedEvent } from '@/types/events';

const MOVE_THROTTLE_MS = 33;   // ~30 Hz
const DRAG_THROTTLE_MS = 16;   // ~60 Hz
const JITTER_THRESHOLD = 0.001;
/** Only treat as drag if pointer moved more than this (normalized). Stops tiny movement from stealing clicks. */
const DRAG_THRESHOLD = 0.015;

/** Clicks on controls inside the grid must not start pointer capture (would steal events from buttons). */
function isGridChromeTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(
    target.closest('button, a[href], input, textarea, select, [role="button"]')
  );
}

type MouseButton = 0 | 2;

interface GridDimensions {
  widthPx: number;
  heightPx: number;
}

function normalize(
  clientX: number,
  clientY: number,
  rect: DOMRect
): { x: number; y: number } {
  const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
  return { x, y };
}

export function useRecordingEvents(
  gridRef: React.RefObject<HTMLDivElement | null>,
  dimensions: GridDimensions | null,
  startTimeRef: React.RefObject<number>,
  isRecording: boolean
) {
  const eventsRef = useRef<RecordedEvent[]>([]);
  const lastMoveTimeRef = useRef<number>(0);
  const lastDragMoveTimeRef = useRef<number>(0);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; btn: MouseButton } | null>(null);
  /** Primary pointer (mouse / first touch) for this grid. */
  const activePointerIdRef = useRef<number | null>(null);

  const push = useCallback((e: RecordedEvent) => {
    eventsRef.current.push(e);
  }, []);

  const t = useCallback(() => {
    const start = startTimeRef.current;
    return start ? Date.now() - start : 0;
  }, []);

  useEffect(() => {
    if (!isRecording || !dimensions || !gridRef.current) return;
    const el = gridRef.current;

    const getRect = () => el.getBoundingClientRect();

    const clearPointer = (pointerId: number) => {
      if (activePointerIdRef.current !== pointerId) return;
      activePointerIdRef.current = null;
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* not captured */
      }
    };

    const onPointerDown = (ev: PointerEvent) => {
      if (activePointerIdRef.current !== null) return;
      if (isGridChromeTarget(ev.target)) return;
      if (ev.pointerType === 'mouse') {
        if (ev.button !== 0 && ev.button !== 2) return;
      } else if (ev.button !== 0) {
        return;
      }
      activePointerIdRef.current = ev.pointerId;
      try {
        el.setPointerCapture(ev.pointerId);
      } catch {
        /* ignore */
      }
      if (ev.button === 2) ev.preventDefault();
      const rect = getRect();
      const { x, y } = normalize(ev.clientX, ev.clientY, rect);
      const btn = (ev.button === 2 ? 2 : 0) as MouseButton;
      push({ t: t(), type: 'down', x, y, btn });
      dragStartRef.current = { x, y, btn };
      isDraggingRef.current = false;
    };

    const onPointerMove = (ev: PointerEvent) => {
      const rect = getRect();
      const { x, y } = normalize(ev.clientX, ev.clientY, rect);
      const now = Date.now();

      // Preserve desktop-style hover capture when no pointer is actively held.
      // Touch should not synthesize hover movement, but mouse/pen can.
      if (activePointerIdRef.current === null) {
        if (ev.pointerType === 'touch' || ev.buttons !== 0) return;
        if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS) return;
        const last = lastPosRef.current;
        if (last && Math.hypot(x - last.x, y - last.y) < JITTER_THRESHOLD) return;
        lastMoveTimeRef.current = now;
        lastPosRef.current = { x, y };
        push({ t: t(), type: 'move', x, y });
        return;
      }

      if (ev.pointerId !== activePointerIdRef.current) return;

      if (ev.buttons !== 0 && dragStartRef.current) {
        const start = dragStartRef.current;
        const dist = Math.hypot(x - start.x, y - start.y);
        if (!isDraggingRef.current && dist > DRAG_THRESHOLD) {
          isDraggingRef.current = true;
          push({
            t: t(),
            type: 'drag_start',
            x: start.x,
            y: start.y,
            btn: start.btn,
          });
        }
        if (!isDraggingRef.current) return;
        if (now - lastDragMoveTimeRef.current < DRAG_THROTTLE_MS) return;
        lastDragMoveTimeRef.current = now;
        push({
          t: t(),
          type: 'drag_move',
          x,
          y,
          btn: dragStartRef.current.btn,
        });
        lastPosRef.current = { x, y };
        return;
      }

      if (ev.buttons !== 0) return;
      if (now - lastMoveTimeRef.current < MOVE_THROTTLE_MS) return;
      const last = lastPosRef.current;
      if (last && Math.hypot(x - last.x, y - last.y) < JITTER_THRESHOLD) return;
      lastMoveTimeRef.current = now;
      lastPosRef.current = { x, y };
      push({ t: t(), type: 'move', x, y });
    };

    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== activePointerIdRef.current) return;
      const rect = getRect();
      const { x, y } = normalize(ev.clientX, ev.clientY, rect);
      const btn = (ev.button === 2 ? 2 : 0) as MouseButton;
      push({ t: t(), type: 'up', x, y, btn });

      if (isDraggingRef.current && dragStartRef.current) {
        const s = dragStartRef.current;
        const x1 = Math.min(s.x, x);
        const y1 = Math.min(s.y, y);
        const x2 = Math.max(s.x, x);
        const y2 = Math.max(s.y, y);
        push({
          t: t(),
          type: 'drag_end',
          x,
          y,
          btn,
          rect: { x1, y1, x2, y2 },
        });
      } else {
        push({ t: t(), type: 'click', x, y, btn });
      }
      dragStartRef.current = null;
      isDraggingRef.current = false;
      clearPointer(ev.pointerId);
    };

    const onPointerCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== activePointerIdRef.current) return;
      dragStartRef.current = null;
      isDraggingRef.current = false;
      clearPointer(ev.pointerId);
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const scale = 1 / (dimensions?.widthPx ?? 1);
      push({
        t: t(),
        type: 'scroll',
        dx: ev.deltaX * scale,
        dy: ev.deltaY * scale,
      });
    };

    const onContextMenu = (ev: MouseEvent) => {
      ev.preventDefault();
    };

    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerCancel);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('contextmenu', onContextMenu);

    return () => {
      if (activePointerIdRef.current !== null) {
        try {
          el.releasePointerCapture(activePointerIdRef.current);
        } catch {
          /* */
        }
        activePointerIdRef.current = null;
      }
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerCancel);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('contextmenu', onContextMenu);
    };
  }, [isRecording, dimensions, push, t]);

  const flush = useCallback((): RecordedEvent[] => {
    const copy = [...eventsRef.current];
    eventsRef.current = [];
    return copy;
  }, []);

  const getEventCounts = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const e of eventsRef.current) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return counts;
  }, []);

  return { flush, getEventCounts };
}
