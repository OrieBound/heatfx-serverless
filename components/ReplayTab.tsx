'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordedEvent } from '@/types/events';
import type { AnimationTheme } from '@/contexts/RecordingSettingsContext';
import { useRecordingSettings } from '@/contexts/RecordingSettingsContext';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { ReplayEffects } from './ReplayEffects';
import type { SettingSnapshot } from '@/app/results/page';

function themeStrokeColors(_theme: AnimationTheme, accent: string): { dragStroke: string; clickStroke: string } {
  return { dragStroke: `${accent}cc`, clickStroke: `${accent}dd` };
}

interface ReplayTabProps {
  events: RecordedEvent[];
  gridWidthPx: number;
  gridHeightPx: number;
  durationMs: number;
  /** When present, replay uses these so animation matches what the user saw at each time. */
  settingSnapshots?: SettingSnapshot[];
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;
/** Match RecordingLiveOverlay: drag rects fade after this many ms */
const DRAG_FADE_MS = 550;

function getEffectiveSettings(
  currentTimeMs: number,
  snapshots: SettingSnapshot[] | undefined,
  fallback: { cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number }
): { cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number } {
  if (!snapshots?.length) return fallback;
  let best = snapshots[0];
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].t <= currentTimeMs) best = snapshots[i];
    else break;
  }
  return {
    cursorColor: best.cursorColor,
    animationTheme: best.animationTheme as AnimationTheme,
    cursorSizePx: best.cursorSizePx,
  };
}

export function ReplayTab({ events, gridWidthPx, gridHeightPx, durationMs, settingSnapshots }: ReplayTabProps) {
  const { color: contextColor } = useCursorColor();
  const { cursorSizePx: contextSize, animationTheme: contextTheme } = useRecordingSettings();
  const fallback = { cursorColor: contextColor, animationTheme: contextTheme, cursorSizePx: contextSize };
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const { cursorColor, animationTheme, cursorSizePx } = getEffectiveSettings(currentTimeMs, settingSnapshots, fallback);
  const [speed, setSpeed] = useState(1);
  const [showCursor, setShowCursor] = useState(true);
  const [showDragRects, setShowDragRects] = useState(true);
  const [showClickMarkers, setShowClickMarkers] = useState(true);
  const [showEffects, setShowEffects] = useState(true);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const displayWidth = Math.min(800, gridWidthPx);
  const displayHeight = Math.round((displayWidth * gridHeightPx) / gridWidthPx);
  const scaleX = displayWidth;
  const scaleY = displayHeight;

  const currentEventIndex = events.findIndex((e) => e.t > currentTimeMs);
  const visibleIndex = currentEventIndex < 0 ? events.length - 1 : Math.max(0, currentEventIndex - 1);
  const currentPos = (() => {
    const e = events[visibleIndex];
    if (!e || !('x' in e)) return null;
    return { x: (e as { x: number; y: number }).x * scaleX, y: (e as { x: number; y: number }).y * scaleY };
  })();

  useEffect(() => {
    if (!playing) return;
    startTimeRef.current = performance.now() - currentTimeMs / speed;
    const tick = () => {
      const t = (performance.now() - startTimeRef.current) * speed;
      setCurrentTimeMs((prev) => {
        const next = Math.min(durationMs, t);
        if (next >= durationMs) setPlaying(false);
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, speed, durationMs]);

  const seek = useCallback((pct: number) => {
    setPlaying(false);
    setCurrentTimeMs((durationMs * pct) / 100);
  }, [durationMs]);

  const atEnd = durationMs > 0 && currentTimeMs >= durationMs;
  const handlePlayPause = useCallback(() => {
    if (atEnd) {
      setCurrentTimeMs(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [atEnd]);

  const clickPositions = events.filter((e): e is RecordedEvent & { type: 'click'; x: number; y: number } => e.type === 'click');
  const dragEnds = events.filter((e): e is RecordedEvent & { type: 'drag_end'; t: number; rect: { x1: number; y1: number; x2: number; y2: number } } => e.type === 'drag_end');
  const visibleDragEnds = dragEnds.filter((e) => currentTimeMs >= e.t && currentTimeMs < e.t + DRAG_FADE_MS);
  const { dragStroke, clickStroke } = themeStrokeColors(animationTheme, cursorColor);

  const toggleLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, fontSize: '0.9rem' };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
        {showEffects && (
          <ReplayEffects
            events={events}
            currentTimeMs={currentTimeMs}
            theme={animationTheme}
            color={cursorColor}
            scaleX={scaleX}
            scaleY={scaleY}
            width={displayWidth}
            height={displayHeight}
            cursorSizePx={cursorSizePx}
          />
        )}
        <svg
          width={displayWidth}
          height={displayHeight}
          style={{ display: 'block' }}
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        >
          {showDragRects && visibleDragEnds.map((e, i) => {
            const age = currentTimeMs - e.t;
            const opacity = 1 - age / DRAG_FADE_MS;
            return (
              <rect
                key={i}
                x={e.rect.x1 * scaleX}
                y={e.rect.y1 * scaleY}
                width={(e.rect.x2 - e.rect.x1) * scaleX}
                height={(e.rect.y2 - e.rect.y1) * scaleY}
                fill="none"
                stroke={dragStroke}
                strokeWidth={2}
                opacity={opacity}
              />
            );
          })}
          {showCursor && currentPos && (
            <>
              <circle
                cx={currentPos.x}
                cy={currentPos.y}
                r={cursorSizePx}
                fill={cursorColor + '66'}
                style={{ filter: 'blur(4px)' }}
              />
              <circle
                cx={currentPos.x}
                cy={currentPos.y}
                r={cursorSizePx / 2}
                fill={cursorColor}
              />
            </>
          )}
          {showClickMarkers && clickPositions
            .filter((e) => e.t <= currentTimeMs)
            .slice(-5)
            .map((e, i) => (
              <circle
                key={i}
                cx={e.x * scaleX}
                cy={e.y * scaleY}
                r={8}
                fill="none"
                stroke={clickStroke}
                strokeWidth={2}
                opacity={0.85}
              />
            ))}
        </svg>
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
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showCursor ? `${cursorColor}18` : 'transparent' }}>
            <input type="checkbox" checked={showCursor} onChange={(e) => setShowCursor(e.target.checked)} style={{ accentColor: cursorColor }} />
            Cursor
          </label>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showDragRects ? `${cursorColor}18` : 'transparent' }}>
            <input type="checkbox" checked={showDragRects} onChange={(e) => setShowDragRects(e.target.checked)} style={{ accentColor: cursorColor }} />
            Drag rectangles
          </label>
          <label style={{ ...toggleLabelStyle, padding: '6px 10px', borderRadius: 8, background: showClickMarkers ? `${cursorColor}18` : 'transparent' }}>
            <input type="checkbox" checked={showClickMarkers} onChange={(e) => setShowClickMarkers(e.target.checked)} style={{ accentColor: cursorColor }} />
            Click markers
          </label>
          <label style={{ ...toggleLabelStyle, marginBottom: 0, padding: '6px 10px', borderRadius: 8, background: showEffects ? `${cursorColor}18` : 'transparent' }}>
            <input type="checkbox" checked={showEffects} onChange={(e) => setShowEffects(e.target.checked)} style={{ accentColor: cursorColor }} />
            Trail & effects
          </label>
        </div>
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          width: '100%',
          maxWidth: displayWidth + 220 + 16,
        }}
      >
        <button
          type="button"
          onClick={handlePlayPause}
          style={{
            padding: '8px 16px',
            background: cursorColor,
            color: 'white',
            border: 'none',
            borderRadius: 6,
          }}
        >
          {playing ? 'Pause' : atEnd ? 'Restart' : 'Play'}
        </button>
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpeed(s)}
            style={{
              padding: '4px 12px',
              background: speed === s ? cursorColor + '20' : 'transparent',
              color: speed === s ? cursorColor : 'var(--text-muted)',
              border: `1px solid ${speed === s ? cursorColor : 'var(--border)'}`,
              borderRadius: 4,
            }}
          >
            {s}x
          </button>
        ))}
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="range"
            min={0}
            max={100}
            value={durationMs ? (currentTimeMs / durationMs) * 100 : 0}
            onChange={(e) => seek(Number(e.target.value))}
            style={{ width: '100%', accentColor: cursorColor }}
          />
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {(currentTimeMs / 1000).toFixed(1)}s / {(durationMs / 1000).toFixed(1)}s
        </span>
      </div>
      <p style={{ margin: '16px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Replay shows the cursor color, size, and animation theme you had at each moment during recording. Playback uses strict timestamps.
      </p>
    </div>
  );
}
