'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordedEvent } from '@/types/events';
import type { AnimationTheme, CursorShape } from '@/contexts/RecordingSettingsContext';
import { chaosHitTypographyRems } from '@/components/cursorVisualUtils';
import { useRecordingSettings } from '@/contexts/RecordingSettingsContext';
import { useCursorColor } from '@/contexts/CursorColorContext';
import { ReplayEffects } from './ReplayEffects';
import { ChaosReplayOverlay } from './ChaosOverlay';
import type { SettingSnapshot, ChaosDensitySnapshot, ChaosHitEvent } from '@/app/results/page';
import type { ChaosObstacleType } from '@/contexts/RecordingSettingsContext';

function themeStrokeColors(_theme: AnimationTheme, accent: string): { dragStroke: string; clickStroke: string } {
  return { dragStroke: `${accent}cc`, clickStroke: `${accent}dd` };
}

interface ReplayTabProps {
  events: RecordedEvent[];
  gridWidthPx: number;
  gridHeightPx: number;
  durationMs: number;
  sessionId?: string;
  /** When present, replay uses these so animation matches what the user saw at each time. */
  settingSnapshots?: SettingSnapshot[];
  chaosModeSettings?: { obstacleType: string; density: number } | null;
  chaosDensitySnapshots?: ChaosDensitySnapshot[];
  chaosHits?: ChaosHitEvent[];
}

const SPEEDS = [0.5, 1, 1.5, 2] as const;

function hasPosition(
  e: RecordedEvent
): e is RecordedEvent & { x: number; y: number } {
  return 'x' in e && 'y' in e;
}

function octagonPoints(cx: number, cy: number, R: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + Math.PI / 8 + (k * Math.PI) / 4;
    pts.push(`${cx + R * Math.cos(a)},${cy + R * Math.sin(a)}`);
  }
  return pts.join(' ');
}

function ReplayCursorShape({ cx, cy, r, color, shape }: { cx: number; cy: number; r: number; color: string; shape: string }) {
  switch (shape) {
    case 'square':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} rx={2} />;
    case 'plus':
      return (
        <g>
          <rect x={cx - r * 0.3} y={cy - r} width={r * 0.6} height={r * 2} fill={color} />
          <rect x={cx - r} y={cy - r * 0.3} width={r * 2} height={r * 0.6} fill={color} />
        </g>
      );
    case 'diamond':
      return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill={color} />;
    case 'octagon':
    case 'ring':
      return <polygon points={octagonPoints(cx, cy, r)} fill={color} />;
    case 'triangle':
      return <polygon points={`${cx},${cy - r} ${cx - r},${cy + r} ${cx + r},${cy + r}`} fill={color} />;
    case 'circle':
    default:
      return <circle cx={cx} cy={cy} r={r} fill={color} />;
  }
}
/** Match RecordingLiveOverlay: drag rects fade after this many ms */
const DRAG_FADE_MS = 550;

function getEffectiveSettings(
  currentTimeMs: number,
  snapshots: SettingSnapshot[] | undefined,
  fallback: { cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number; cursorShape: string }
): { cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number; cursorShape: string } {
  if (!snapshots?.length) return fallback;
  let best = snapshots[0];
  for (let i = 0; i < snapshots.length; i++) {
    if (snapshots[i].t <= currentTimeMs) best = snapshots[i];
    else break;
  }
  const rawShape = best.cursorShape ?? fallback.cursorShape;
  const cursorShapeNorm = rawShape === 'ring' ? 'octagon' : rawShape;
  return {
    cursorColor: best.cursorColor,
    animationTheme: best.animationTheme as AnimationTheme,
    cursorSizePx: best.cursorSizePx,
    cursorShape: cursorShapeNorm,
  };
}

export function ReplayTab({ events, gridWidthPx, gridHeightPx, durationMs, sessionId, settingSnapshots, chaosModeSettings, chaosDensitySnapshots, chaosHits }: ReplayTabProps) {
  const { color: contextColor } = useCursorColor();
  const { cursorSizePx: contextSize, animationTheme: contextTheme, cursorShape: contextShape } = useRecordingSettings();
  const fallback = { cursorColor: contextColor, animationTheme: contextTheme, cursorSizePx: contextSize, cursorShape: contextShape };
  const [playing, setPlaying] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const { cursorColor, animationTheme, cursorSizePx, cursorShape } = getEffectiveSettings(currentTimeMs, settingSnapshots, fallback);
  const [speed, setSpeed] = useState(1);
  const [showCursor, setShowCursor] = useState(true);
  const [showDragRects, setShowDragRects] = useState(true);
  const [showClickMarkers, setShowClickMarkers] = useState(true);
  const [showEffects, setShowEffects] = useState(true);
  const [showChaos, setShowChaos] = useState(true);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const displayWidth = Math.min(800, gridWidthPx);
  const displayHeight = Math.round((displayWidth * gridHeightPx) / gridWidthPx);
  const scaleX = displayWidth;
  const scaleY = displayHeight;
  const cursorDisplayScale = displayWidth / Math.max(1, gridWidthPx);
  const effectiveCursorPx = cursorSizePx * cursorDisplayScale;
  const hitTy = chaosHitTypographyRems(effectiveCursorPx);

  const currentEventIndex = events.findIndex((e) => e.t > currentTimeMs);
  const visibleIndex = currentEventIndex < 0 ? events.length - 1 : Math.max(0, currentEventIndex - 1);
  const currentPos = (() => {
    for (let i = visibleIndex; i >= 0; i--) {
      const e = events[i];
      if (!e) continue;
      if (!hasPosition(e)) continue;
      return { x: e.x * scaleX, y: e.y * scaleY };
    }
    return null;
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
  // currentTimeMs is intentionally omitted — adding it would restart the RAF loop every frame
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            cursorShape={cursorShape as CursorShape}
          />
        )}
        {chaosModeSettings && sessionId && showChaos && (
          <ChaosReplayOverlay
            sessionId={sessionId}
            currentTimeMs={currentTimeMs}
            gridWidthPx={displayWidth}
            gridHeightPx={displayHeight}
            obstacleType={chaosModeSettings.obstacleType as ChaosObstacleType}
            density={chaosModeSettings.density}
            accentColor={cursorColor}
            chaosDensitySnapshots={chaosDensitySnapshots}
          />
        )}
        {/* Chaos hit markers */}
        {showChaos && chaosHits?.filter((h) => currentTimeMs >= h.t && currentTimeMs < h.t + 700).map((h, i) => {
          const age = currentTimeMs - h.t;
          const progress = age / 700;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: h.normX * displayWidth,
                top: h.normY * displayHeight,
                transform: `translate(-50%, ${-120 - progress * 60}%) scale(${1.2 - progress * 0.4})`,
                opacity: 1 - progress,
                pointerEvents: 'none',
                zIndex: 20,
                userSelect: 'none',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              <div style={{ fontSize: `${hitTy.emojiRem}rem`, filter: 'drop-shadow(0 0 8px #ff4444)', lineHeight: 1 }}>💥</div>
              <div style={{
                fontSize: `${hitTy.powRem}rem`,
                fontWeight: 800,
                color: '#ff4444',
                textShadow: '0 0 6px #ff000088',
                marginTop: 2,
              }}>
                POW!
              </div>
            </div>
          );
        })}
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
                r={effectiveCursorPx}
                fill={cursorColor + '44'}
                style={{ filter: 'blur(4px)' }}
              />
              <ReplayCursorShape
                cx={currentPos.x}
                cy={currentPos.y}
                r={effectiveCursorPx / 2}
                color={cursorColor}
                shape={cursorShape}
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
          <label style={{ ...toggleLabelStyle, marginBottom: chaosModeSettings ? 10 : 0, padding: '6px 10px', borderRadius: 8, background: showEffects ? `${cursorColor}18` : 'transparent' }}>
            <input type="checkbox" checked={showEffects} onChange={(e) => setShowEffects(e.target.checked)} style={{ accentColor: cursorColor }} />
            Trail & effects
          </label>
          {chaosModeSettings && (
            <label style={{ ...toggleLabelStyle, marginBottom: 0, padding: '6px 10px', borderRadius: 8, background: showChaos ? '#ef444422' : 'transparent' }}>
              <input type="checkbox" checked={showChaos} onChange={(e) => setShowChaos(e.target.checked)} style={{ accentColor: '#f87171' }} />
              <span style={{ color: showChaos ? '#f87171' : 'var(--text-muted)' }}>💥 Chaos layer</span>
            </label>
          )}
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
