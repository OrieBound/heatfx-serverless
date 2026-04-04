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
import { AuthButton } from './AuthButton';
import { useCursorColor } from '@/contexts/CursorColorContext';
import {
  useRecordingSettings,
  CURSOR_SIZE_MIN,
  CURSOR_SIZE_MAX,
  type AnimationTheme,
} from '@/contexts/RecordingSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { RecordedEvent } from '@/types/events';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

const IDLE_HINTS = [
  { id: 'click', text: '👆 Click or drag anywhere in the grid' },
  { id: 'color', text: '🎨 Press ← → to cycle cursor colours' },
  { id: 'theme', text: '✨ Press 1–5 to switch animation themes' },
  { id: 'size',  text: '🔍 Scroll the wheel here to resize your cursor' },
] as const;

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
  const { user, idToken } = useAuth();

  // Idle hint system
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const usedFeaturesRef = useRef(new Set<string>());
  const idleTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintIndexRef    = useRef(0);
  const hintColorRef    = useRef(cursorColor);
  const hintThemeRef    = useRef(animationTheme);
  const hintSizeRef     = useRef(cursorSizePx);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    // Reset hint tracking
    usedFeaturesRef.current = new Set();
    hintIndexRef.current = 0;
    setActiveHint(null);
    hintColorRef.current = cursorColor;
    hintThemeRef.current = animationTheme;
    hintSizeRef.current  = cursorSizePx;
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

  const saveAndProceed = useCallback(async () => {
    if (!finalizedRecording || !idToken) return;
    const dims = frozenGridRef.current;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API_URL}/api/sessions`, {
        method:  'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          gridWidthPx:      dims?.widthPx ?? 0,
          gridHeightPx:     dims?.heightPx ?? 0,
          aspectRatio:      '4:3',
          durationMs:       finalizedRecording.payload.durationMs,
          eventCounts:      finalizedRecording.payload.eventCounts,
          events:           finalizedRecording.payload.events,
          settingSnapshots: finalizedRecording.payload.settingSnapshots,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const { sessionId: savedId } = await res.json();
      saveAndNavigateToResults(savedId, finalizedRecording.duration, finalizedRecording.payload);
    } catch {
      setSaveError('Could not save to cloud. You can still view results locally.');
    } finally {
      setIsSaving(false);
    }
  }, [finalizedRecording, idToken, saveAndNavigateToResults]);

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

  // ── Idle hint: track feature usage ────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    if (cursorColor !== hintColorRef.current) {
      usedFeaturesRef.current.add('color');
      setActiveHint(null);
    }
  }, [cursorColor, phase]);

  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    if (animationTheme !== hintThemeRef.current) {
      usedFeaturesRef.current.add('theme');
      setActiveHint(null);
    }
  }, [animationTheme, phase]);

  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    if (cursorSizePx !== hintSizeRef.current) {
      usedFeaturesRef.current.add('size');
      setActiveHint(null);
    }
  }, [cursorSizePx, phase]);

  // ── Idle hint: show tip after 2.5 s of no grid activity ──────────────────
  useEffect(() => {
    if (phase !== 'recording') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      setActiveHint(null);
      return;
    }
    const grid = gridRef.current;
    if (!grid) return;

    const schedule = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        const pending = IDLE_HINTS.filter(h => !usedFeaturesRef.current.has(h.id));
        if (!pending.length) return;
        const hint = pending[hintIndexRef.current % pending.length];
        hintIndexRef.current++;
        setActiveHint(hint.text);
      }, 2500);
    };

    const onMove  = () => { setActiveHint(null); schedule(); };
    const onPress = () => {
      usedFeaturesRef.current.add('click');
      setActiveHint(null);
      schedule();
    };

    grid.addEventListener('pointermove', onMove,  { passive: true });
    grid.addEventListener('pointerdown', onPress, { passive: true });
    schedule(); // fire if user does nothing right away

    return () => {
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerdown', onPress);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [phase]);

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
      <header style={{ flexShrink: 0 }}>
        {/* Navbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 0',
            marginBottom: 12,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.02em' }}>HeatFX</h1>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Mouse Heatmap &amp; Replay
            </span>
          </div>
          <AuthButton />
        </div>
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
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button
                type="button"
                onClick={() => window.open('/about', '_blank')}
                style={{ background: `${cursorColor}14`, border: `1.5px solid ${cursorColor}99`, borderRadius: 8, padding: '9px 18px', font: 'inherit', color: cursorColor, fontWeight: 700, cursor: 'pointer', textAlign: 'left', fontSize: '0.97rem', width: 'fit-content', letterSpacing: '0.01em' }}
              >
                📖 View User Guide
              </button>
              {!user && (
                <p style={{ margin: 0, fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                  💡 <strong style={{ color: 'var(--text)' }}>Free to use</strong> — no account needed.{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/auth/signup')}
                    style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: cursorColor, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Create a free account
                  </button>{' '}
                  to save recordings.
                </p>
              )}
            </div>
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
              {phase === 'recording' && activeHint && (
                activeHint.startsWith('👆') ? (
                  /* Primary hint — big centred call-out */
                  <div
                    key={activeHint}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      zIndex: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      pointerEvents: 'none',
                      animation: 'hint-primary-in 0.4s ease forwards',
                      '--hint-color': cursorColor,
                    } as React.CSSProperties}
                  >
                    <div style={{
                      fontSize: '2.4rem',
                      animation: 'hint-bounce 1.2s ease-in-out infinite',
                    }}>
                      👇
                    </div>
                    <div style={{
                      padding: '12px 28px',
                      background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
                      border: `2px solid ${cursorColor}`,
                      borderRadius: 14,
                      fontSize: '1.15rem',
                      fontWeight: 700,
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      boxShadow: `0 0 28px ${cursorColor}55`,
                      animation: 'hint-pulse-ring 2s ease-out infinite',
                    }}>
                      Move your mouse into the grid &amp; start clicking!
                    </div>
                  </div>
                ) : (
                  /* Secondary hints — prominent pill at bottom */
                  <div
                    key={activeHint}
                    style={{
                      position: 'absolute',
                      bottom: 22,
                      left: '50%',
                      zIndex: 20,
                      padding: '10px 24px',
                      background: 'color-mix(in srgb, var(--surface) 93%, transparent)',
                      border: `1.5px solid ${cursorColor}88`,
                      borderRadius: 28,
                      fontSize: '1rem',
                      color: 'var(--text)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      animation: 'hint-fade 0.35s ease forwards',
                      boxShadow: `0 6px 24px ${cursorColor}33`,
                    }}
                  >
                    {activeHint}
                  </div>
                )
              )}
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
                      {(finalizedRecording.duration / 1000).toFixed(1)}s &middot; {finalizedRecording.payload.events.length} events recorded.
                    </p>

                    {!user && (
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: 8,
                        background: `${cursorColor}18`,
                        border: `1px solid ${cursorColor}55`,
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                        color: 'var(--text)',
                      }}>
                        <strong>Want to save this?</strong> Create a free account to save your recordings and access them anytime from any device.
                      </div>
                    )}

                    {saveError && (
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--danger)' }}>{saveError}</p>
                    )}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {user ? (
                        <button
                          type="button"
                          onClick={saveAndProceed}
                          disabled={isSaving}
                          style={{
                            padding: '9px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: cursorColor,
                            color: 'white',
                            fontWeight: 700,
                            opacity: isSaving ? 0.7 : 1,
                            cursor: isSaving ? 'default' : 'pointer',
                          }}
                        >
                          {isSaving ? 'Saving…' : 'Save & view results'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push('/auth/login')}
                          style={{
                            padding: '9px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: cursorColor,
                            color: 'white',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Log in to save
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={proceedToResults}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          border: `1px solid ${cursorColor}`,
                          background: 'transparent',
                          color: cursorColor,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        View results (local only)
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
                          cursor: 'pointer',
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
