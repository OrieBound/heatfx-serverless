'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { RecordingGrid, type GridDimensions } from './RecordingGrid';
import { RecordingCursor } from './RecordingCursor';
import { StartInGridOverlay } from './StartInGridOverlay';
import { RecordingEffects } from './RecordingEffects';
import { RecordingLiveOverlay } from './RecordingLiveOverlay';
import { RecordingSidebar } from './RecordingSidebar';
import { useRecordingEvents } from '@/hooks/useRecordingEvents';
import { useCursorColor } from '@/contexts/CursorColorContext';
import {
  useRecordingSettings,
  CURSOR_SIZE_MIN,
  CURSOR_SIZE_MAX,
  type AnimationTheme,
} from '@/contexts/RecordingSettingsContext';
import type { RecordedEvent } from '@/types/events';

export interface SettingSnapshot {
  t: number;
  cursorColor: string;
  animationTheme: AnimationTheme;
  cursorSizePx: number;
}

const MAX_DURATION_MS = 30_000;
const THEME_SHORTCUTS: Record<string, AnimationTheme> = {
  Digit1: 'classic',
  Digit2: 'neon',
  Digit3: 'party',
  Digit4: 'fire',
  Digit5: 'ocean',
};

type Phase = 'idle' | 'recording' | 'paused' | 'completed';

interface FinalizedRecording {
  id: string;
  duration: number;
  payload: {
    events: RecordedEvent[];
    eventCounts: Record<string, number>;
    durationMs: number;
    settingSnapshots: SettingSnapshot[];
  };
}

export function RecordingScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [frozenGrid, setFrozenGrid] = useState<GridDimensions | null>(null);
  const [finalizedRecording, setFinalizedRecording] = useState<FinalizedRecording | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const storedEventsRef = useRef<{ events: RecordedEvent[]; eventCounts: Record<string, number>; durationMs?: number } | null>(null);
  const settingSnapshotsRef = useRef<SettingSnapshot[]>([]);
  const frozenGridRef = useRef<GridDimensions | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;

  const { color: cursorColor, setColor: setCursorColor, palette } = useCursorColor();
  const { cursorSizePx, setCursorSizePx, animationTheme, setAnimationTheme } = useRecordingSettings();
  const { flush } = useRecordingEvents(
    gridRef,
    frozenGrid,
    startTimeRef,
    phase === 'recording'
  );
  const flushRef = useRef(flush);
  flushRef.current = flush;

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const saveAndNavigateToResults = useCallback(
    (
      id: string,
      duration: number,
      payload: {
        events: RecordedEvent[];
        eventCounts: Record<string, number>;
        durationMs: number;
        settingSnapshots: SettingSnapshot[];
      }
    ) => {
      const dims = frozenGridRef.current;
      try {
        sessionStorage.setItem(
          `heatfx-result-${id}`,
          JSON.stringify({
            sessionId: id,
            gridWidthPx: dims?.widthPx ?? 0,
            gridHeightPx: dims?.heightPx ?? 0,
            durationMs: payload.durationMs,
            aspectRatio: '4:3',
            eventCounts: payload.eventCounts,
            events: payload.events,
            settingSnapshots: payload.settingSnapshots,
          })
        );
      } catch (_) {}
      router.push(`/results?sessionId=${encodeURIComponent(id)}`);
    },
    [router]
  );

  const finishRecording = useCallback(
    (duration: number) => {
      const events = flushRef.current();
      const eventCounts: Record<string, number> = {};
      for (const e of events) eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
      const settingSnapshots = [...settingSnapshotsRef.current];
      const payload = { events, eventCounts, durationMs: duration, settingSnapshots };
      storedEventsRef.current = payload;
      setElapsedMs(duration);
      const id = sessionIdRef.current;
      if (!id) return;
      setFinalizedRecording({ id, duration, payload });
      setPhase('completed');
    },
    []
  );

  const startRecording = useCallback(() => {
    const id = nanoid();
    setSessionId(id);
    setFinalizedRecording(null);
    if (gridRef.current) {
      const rect = gridRef.current.getBoundingClientRect();
      const dims = { widthPx: Math.round(rect.width), heightPx: Math.round(rect.height) };
      setFrozenGrid(dims);
      frozenGridRef.current = dims;
    }
    setPhase('recording');
    setElapsedMs(0);
    accumulatedMsRef.current = 0;
    startTimeRef.current = Date.now();
    storedEventsRef.current = null;
    settingSnapshotsRef.current = [{ t: 0, cursorColor, animationTheme, cursorSizePx }];
    timerRef.current = setInterval(() => {
      const elapsed = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
      setElapsedMs(elapsed);
      if (elapsed >= MAX_DURATION_MS) {
        stopTimer();
        finishRecording(MAX_DURATION_MS);
      }
    }, 100);
  }, [stopTimer, finishRecording, cursorColor, animationTheme, cursorSizePx]);

  const pauseRecording = useCallback(() => {
    if (phase !== 'recording') return;
    accumulatedMsRef.current += Date.now() - startTimeRef.current;
    stopTimer();
    setPhase('paused');
  }, [phase, stopTimer]);

  const resumeRecording = useCallback(() => {
    if (phase !== 'paused') return;
    startTimeRef.current = Date.now();
    setPhase('recording');
    timerRef.current = setInterval(() => {
      const elapsed = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
      setElapsedMs(elapsed);
      if (elapsed >= MAX_DURATION_MS) {
        stopTimer();
        finishRecording(MAX_DURATION_MS);
      }
    }, 100);
  }, [phase, stopTimer, finishRecording]);

  const stopRecording = useCallback(() => {
    stopTimer();
    const elapsed =
      phase === 'paused'
        ? accumulatedMsRef.current
        : accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    const duration = Math.min(elapsed, MAX_DURATION_MS);
    finishRecording(duration);
  }, [stopTimer, phase, finishRecording]);

  const proceedToResults = useCallback(() => {
    if (!finalizedRecording) return;
    saveAndNavigateToResults(finalizedRecording.id, finalizedRecording.duration, finalizedRecording.payload);
  }, [finalizedRecording, saveAndNavigateToResults]);

  const resetToIdle = useCallback(() => {
    setFinalizedRecording(null);
    setSessionId(null);
    sessionIdRef.current = null;
    setFrozenGrid(null);
    frozenGridRef.current = null;
    settingSnapshotsRef.current = [];
    accumulatedMsRef.current = 0;
    startTimeRef.current = 0;
    setElapsedMs(0);
    setPhase('idle');
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const theme = THEME_SHORTCUTS[event.code];
      if (theme) {
        event.preventDefault();
        setAnimationTheme(theme);
        return;
      }

      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        if (!palette.length) return;
        event.preventDefault();
        const current = palette.indexOf(cursorColor);
        if (current < 0) {
          setCursorColor(event.code === 'ArrowRight' ? palette[0] : palette[palette.length - 1]);
          return;
        }
        const direction = event.code === 'ArrowRight' ? 1 : -1;
        const next = (current + direction + palette.length) % palette.length;
        setCursorColor(palette[next]);
        return;
      }

      if (phase !== 'recording' && phase !== 'paused') return;
      if (event.code !== 'Space') return;
      event.preventDefault();
      stopRecording();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, stopRecording, setAnimationTheme, palette, cursorColor, setCursorColor]);

  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      const next = Math.max(CURSOR_SIZE_MIN, Math.min(CURSOR_SIZE_MAX, cursorSizePx + direction * 2));
      setCursorSizePx(next);
    };

    gridEl.addEventListener('wheel', onWheel, { passive: false });
    return () => gridEl.removeEventListener('wheel', onWheel);
  }, [cursorSizePx, setCursorSizePx]);

  const lastSettingsRef = useRef<{ cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number } | null>(null);
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') {
      lastSettingsRef.current = null;
      return;
    }
    const t =
      phase === 'paused'
        ? accumulatedMsRef.current
        : accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    const current = { cursorColor, animationTheme, cursorSizePx };
    const last = lastSettingsRef.current;
    if (!last) {
      lastSettingsRef.current = current;
      return;
    }
    if (last.cursorColor === current.cursorColor && last.animationTheme === current.animationTheme && last.cursorSizePx === current.cursorSizePx) return;
    lastSettingsRef.current = current;
    settingSnapshotsRef.current.push({ t, ...current });
  }, [phase, cursorColor, animationTheme, cursorSizePx]);

  const remainingMs = Math.max(0, MAX_DURATION_MS - elapsedMs);
  const finalCountdownNumber = phase === 'recording' && remainingMs > 0 && remainingMs <= 5_000
    ? Math.ceil(remainingMs / 1_000)
    : null;

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px',
        overflow: 'hidden',
      }}
    >
      <header style={{ marginBottom: 16, flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>HeatFX</h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Record mouse interactions (up to 30s), then view heatmap &amp; replay.
        </p>
        {phase === 'idle' && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
            }}
          >
            <strong style={{ color: 'var(--text)' }}>How it works:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li>
                Click{' '}
                <button
                  type="button"
                  onClick={startRecording}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    font: 'inherit',
                    color: cursorColor,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Start recording
                </button>{' '}
                in the grid or below.
              </li>
              <li><strong>Move and click</strong> inside the dark box (left or right click, or drag).</li>
              <li>
                Click <strong>Stop</strong> when done (or wait 30s), then choose whether to proceed to results.
              </li>
            </ol>
          </div>
        )}
        {(phase === 'recording' || phase === 'paused') && (
          <>
            <p style={{ margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 600, color: cursorColor }}>
              → Move your cursor into the box below and click or drag there
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Shortcuts: <strong>Space</strong> stop, <strong>1-5</strong> animation themes, <strong>Left/Right</strong> cursor color, mouse <strong>wheel on grid</strong> changes cursor size
            </p>
            <div
              style={{
                marginTop: 12,
                padding: '12px 16px',
                background: 'var(--surface)',
                border: `2px solid ${cursorColor}`,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 700 }}>
                {(elapsedMs / 1000).toFixed(1)}s / 30s
                {phase === 'paused' && ' (paused)'}
              </span>
              {phase === 'recording' && (
                <button
                  type="button"
                  onClick={pauseRecording}
                  style={{
                    padding: '8px 18px',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  Pause
                </button>
              )}
              {phase === 'paused' && (
                <button
                  type="button"
                  onClick={resumeRecording}
                  style={{
                    padding: '8px 18px',
                    background: cursorColor,
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={stopRecording}
                style={{
                  padding: '8px 18px',
                  background: 'var(--danger)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                Stop
              </button>
            </div>
          </>
        )}
      </header>

      <div
        style={{
          flex: '1 1 0',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        <RecordingSidebar />
        <div
          style={{
            flex: '1 1 0',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          <RecordingGrid
              frozen={phase !== 'idle' ? frozenGrid : null}
              gridRef={gridRef}
              isRecording={phase === 'recording' || phase === 'paused'}
              accentColor={cursorColor}
            >
              {phase === 'idle' && (
                <StartInGridOverlay onStart={startRecording} color={cursorColor} />
              )}
              <RecordingCursor
                gridRef={gridRef}
                isActive={phase === 'recording' || phase === 'paused'}
                color={cursorColor}
                sizePx={cursorSizePx}
              />
              <RecordingLiveOverlay
                gridRef={gridRef}
                isActive={phase === 'recording' || phase === 'paused'}
                theme={animationTheme}
                color={cursorColor}
              />
              <RecordingEffects
                gridRef={gridRef}
                isActive={phase === 'recording' || phase === 'paused'}
                theme={animationTheme}
                color={cursorColor}
                cursorSizePx={cursorSizePx}
              />
              {phase === 'completed' && finalizedRecording && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20,
                    background: 'color-mix(in srgb, var(--bg) 60%, transparent)',
                  }}
                >
                  <div
                    style={{
                      width: 'min(560px, 95%)',
                      borderRadius: 12,
                      border: `1px solid ${cursorColor}`,
                      background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
                      boxShadow: `0 0 28px ${cursorColor}22`,
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Recording is ready</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.4 }}>
                      Your recording has been created ({(finalizedRecording.duration / 1000).toFixed(1)}s, {finalizedRecording.payload.events.length} events).
                      Would you like to proceed to the results?
                    </p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={proceedToResults}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: 'none',
                          background: cursorColor,
                          color: 'white',
                          fontWeight: 700,
                        }}
                      >
                        Proceed to results
                      </button>
                      <button
                        type="button"
                        onClick={resetToIdle}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'transparent',
                          color: 'var(--text)',
                          fontWeight: 600,
                        }}
                      >
                        Go back
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {finalCountdownNumber !== null && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 'clamp(72px, 18vw, 180px)',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: `${cursorColor}66`,
                      textShadow: `0 0 28px ${cursorColor}35`,
                      userSelect: 'none',
                    }}
                  >
                    {finalCountdownNumber}
                  </div>
                </div>
              )}
              {(phase === 'recording' || phase === 'paused') && (
                <div
                  style={{
                    position: 'absolute',
                    right: 8,
                    bottom: 8,
                    zIndex: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
                    border: `1px solid ${cursorColor}`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                    }}
                    title="Elapsed recording time"
                  >
                    {(elapsedMs / 1000).toFixed(1)}s / 30s
                    {phase === 'paused' ? ' (paused)' : ''}
                  </span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    style={{
                      padding: '7px 14px',
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 700,
                    }}
                    title="Stop recording (Space)"
                  >
                    Stop
                  </button>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Press <strong style={{ color: 'var(--text)' }}>Space</strong> to stop
                  </span>
                </div>
              )}
            </RecordingGrid>
        </div>
      </div>

      {/* Footer – idle hint only */}
      <div
        style={{
          flexShrink: 0,
          marginTop: 16,
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {phase === 'idle' && (
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Click{' '}
            <button
              type="button"
              onClick={startRecording}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
                color: cursorColor,
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Start recording
            </button>{' '}
            in the grid, or adjust settings in the left panel.
          </span>
        )}
      </div>
    </div>
  );
}
