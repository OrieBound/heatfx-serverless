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
import { ChaosOverlay } from './ChaosOverlay';
import { chaosHitTypographyRems } from '@/components/cursorVisualUtils';
import { useRecordingEvents } from '@/hooks/useRecordingEvents';
import { AuthButton } from './AuthButton';
import { useCursorColor } from '@/contexts/CursorColorContext';
import {
  useRecordingSettings,
  CURSOR_SIZE_MIN,
  CURSOR_SIZE_MAX,
  CHAOS_DENSITY_MIN,
  CHAOS_DENSITY_MAX,
  RECORDING_DURATION_FREE_MS,
  type AnimationTheme,
  type ChaosObstacleType,
  type CursorShape,
  type GridBackground,
} from '@/contexts/RecordingSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import type { RecordedEvent } from '@/types/events';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export interface SettingSnapshot {
  t: number;
  cursorColor: string;
  animationTheme: AnimationTheme;
  cursorSizePx: number;
  cursorShape: CursorShape;
}

export interface ChaosDensitySnapshot {
  t: number;
  density: number;
}

export interface ChaosHitEvent {
  t: number;
  normX: number;
  normY: number;
}

const SHAPE_SHORTCUTS: Record<string, CursorShape> = {
  Digit1: 'circle',
  Digit2: 'square',
  Digit3: 'plus',
  Digit4: 'diamond',
  Digit5: 'octagon',
  Digit6: 'triangle',
};

const THEME_SHORTCUTS: Record<string, AnimationTheme> = {
  KeyQ: 'classic',
  KeyW: 'neon',
  KeyE: 'party',
  KeyR: 'fire',
  KeyT: 'ocean',
  KeyY: 'cosmic',
};

const CHAOS_SHORTCUTS: Record<string, ChaosObstacleType> = {
  KeyA: 'none',
  KeyS: 'dots',
  KeyD: 'rocks',
  KeyF: 'snowflakes',
  KeyG: 'stars',
  KeyH: 'rings',
};

const BACKGROUND_SHORTCUTS: Record<string, GridBackground> = {
  KeyZ: 'none',
  KeyX: 'dots',
  KeyC: 'grid',
};

type Phase = 'idle' | 'recording' | 'paused' | 'completed';

const IDLE_HINTS = [
  { id: 'click', text: '👆 Click or drag anywhere in the grid' },
  { id: 'color', text: '🎨 Press ← → on your keyboard (arrow keys) to cycle cursor colours' },
  { id: 'shape', text: '🔷 Press 1–6 to change cursor shape' },
  { id: 'theme', text: '✨ Press Q–Y to switch cursor theme' },
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
    chaosDensitySnapshots: ChaosDensitySnapshot[];
    chaosHits: ChaosHitEvent[];
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
  const storedEventsRef = useRef<{ events: RecordedEvent[]; eventCounts: Record<string, number>; durationMs?: number; chaosDensitySnapshots: ChaosDensitySnapshot[]; chaosHits: ChaosHitEvent[] } | null>(null);
  const settingSnapshotsRef = useRef<SettingSnapshot[]>([]);
  const frozenGridRef = useRef<GridDimensions | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  sessionIdRef.current = sessionId;
  /** Cap for the current (or next) recording; set synchronously when starting. */
  const sessionCapMsRef = useRef(RECORDING_DURATION_FREE_MS);

  const { color: cursorColor, setColor: setCursorColor, palette } = useCursorColor();
  const {
    cursorSizePx, setCursorSizePx,
    animationTheme, setAnimationTheme,
    cursorShape, setCursorShape,
    chaosObstacleType, chaosDensity, setChaosObstacleType, setChaosDensity,
    setGridBackground,
    recordingDurationMs,
  } = useRecordingSettings();
  const chaosActive = chaosObstacleType !== 'none';
  const { user, idToken } = useAuth();
  const nextRecordingCapMs = user ? recordingDurationMs : RECORDING_DURATION_FREE_MS;

  // Chaos mode hit tracking
  const chaosHitCountRef        = useRef(0);
  const chaosHitsRef            = useRef<ChaosHitEvent[]>([]);
  const chaosDensitySnapshotsRef = useRef<ChaosDensitySnapshot[]>([]);
  /** `id` increments each hit so the POW node remounts and CSS `chaos-hit` restarts (same coords would otherwise skip animation). */
  const [hitFlash, setHitFlash] = useState<{ x: number; y: number; id: number } | null>(null);
  const hitFlashTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chaosSnapshotRef        = useRef<{ obstacleType: string; density: number } | null>(null);

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
        chaosDensitySnapshots: ChaosDensitySnapshot[];
        chaosHits: ChaosHitEvent[];
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
            chaosModeSettings: chaosSnapshotRef.current,
            chaosDensitySnapshots: payload.chaosDensitySnapshots,
            chaosHits: payload.chaosHits,
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
      if (chaosHitCountRef.current > 0) {
        eventCounts['chaos_hits'] = chaosHitCountRef.current;
      }
      const settingSnapshots = [...settingSnapshotsRef.current];
      const chaosDensitySnapshots = [...chaosDensitySnapshotsRef.current];
      const chaosHits = [...chaosHitsRef.current];
      const payload = { events, eventCounts, durationMs: duration, settingSnapshots, chaosDensitySnapshots, chaosHits };
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
    chaosHitCountRef.current = 0;
    chaosHitsRef.current = [];
    chaosDensitySnapshotsRef.current = chaosActive ? [{ t: 0, density: chaosDensity }] : [];
    setHitFlash(null);
    chaosSnapshotRef.current = chaosActive ? { obstacleType: chaosObstacleType, density: chaosDensity } : null;
    const cap = user ? recordingDurationMs : RECORDING_DURATION_FREE_MS;
    sessionCapMsRef.current = cap;
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
    settingSnapshotsRef.current = [{ t: 0, cursorColor, animationTheme, cursorSizePx, cursorShape }];
    timerRef.current = setInterval(() => {
      const elapsed = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
      setElapsedMs(elapsed);
      const maxMs = sessionCapMsRef.current;
      if (elapsed >= maxMs) {
        stopTimer();
        finishRecording(maxMs);
      }
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopTimer, finishRecording, cursorColor, animationTheme, cursorSizePx, cursorShape, chaosActive, chaosObstacleType, chaosDensity, user, recordingDurationMs]);

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
      const maxMs = sessionCapMsRef.current;
      if (elapsed >= maxMs) {
        stopTimer();
        finishRecording(maxMs);
      }
    }, 100);
  }, [phase, stopTimer, finishRecording]);

  const stopRecording = useCallback(() => {
    stopTimer();
    const elapsed =
      phase === 'paused'
        ? accumulatedMsRef.current
        : accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    const duration = Math.min(elapsed, sessionCapMsRef.current);
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
          chaosDensitySnapshots: finalizedRecording.payload.chaosDensitySnapshots,
          chaosHits: finalizedRecording.payload.chaosHits,
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
    chaosDensitySnapshotsRef.current = [];
    chaosHitsRef.current = [];
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

      const shape = SHAPE_SHORTCUTS[event.code];
      if (shape) {
        event.preventDefault();
        setCursorShape(shape);
        return;
      }

      const theme = THEME_SHORTCUTS[event.code];
      if (theme) {
        event.preventDefault();
        setAnimationTheme(theme);
        return;
      }

      const chaosType = CHAOS_SHORTCUTS[event.code];
      if (chaosType !== undefined) {
        event.preventDefault();
        setChaosObstacleType(chaosType);
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

      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        if (!chaosActive) return;
        event.preventDefault();
        const delta = event.code === 'ArrowUp' ? 1 : -1;
        setChaosDensity(Math.max(CHAOS_DENSITY_MIN, Math.min(CHAOS_DENSITY_MAX, chaosDensity + delta)));
        return;
      }

      const bg = BACKGROUND_SHORTCUTS[event.code];
      if (bg !== undefined) {
        event.preventDefault();
        setGridBackground(bg);
        return;
      }

      if (phase !== 'recording' && phase !== 'paused') return;
      if (event.code !== 'Space') return;
      event.preventDefault();
      stopRecording();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, stopRecording, setCursorShape, setAnimationTheme, setChaosObstacleType, setChaosDensity, setGridBackground, chaosActive, chaosDensity, palette, cursorColor, setCursorColor]);

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

  // Track chaos density changes during recording
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') return;
    if (!chaosActive) return;
    const t = phase === 'paused'
      ? accumulatedMsRef.current
      : accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    const snaps = chaosDensitySnapshotsRef.current;
    if (snaps.length > 0 && snaps[snaps.length - 1].density === chaosDensity) return;
    snaps.push({ t, density: chaosDensity });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaosDensity, phase, chaosActive]);

  const lastSettingsRef = useRef<{ cursorColor: string; animationTheme: AnimationTheme; cursorSizePx: number; cursorShape: CursorShape } | null>(null);
  useEffect(() => {
    if (phase !== 'recording' && phase !== 'paused') {
      lastSettingsRef.current = null;
      return;
    }
    const t =
      phase === 'paused'
        ? accumulatedMsRef.current
        : accumulatedMsRef.current + (Date.now() - startTimeRef.current);
    const current = { cursorColor, animationTheme, cursorSizePx, cursorShape };
    const last = lastSettingsRef.current;
    if (!last) {
      lastSettingsRef.current = current;
      return;
    }
    if (
      last.cursorColor === current.cursorColor &&
      last.animationTheme === current.animationTheme &&
      last.cursorSizePx === current.cursorSizePx &&
      last.cursorShape === current.cursorShape
    ) return;
    lastSettingsRef.current = current;
    settingSnapshotsRef.current.push({ t, ...current });
  }, [phase, cursorColor, animationTheme, cursorSizePx, cursorShape]);

  const chaosHitTy = chaosHitTypographyRems(cursorSizePx);
  const capMs =
    phase === 'recording' || phase === 'paused' || phase === 'completed'
      ? sessionCapMsRef.current
      : nextRecordingCapMs;
  const remainingMs = Math.max(0, capMs - elapsedMs);
  const finalCountdownNumber = phase === 'recording' && remainingMs > 0 && remainingMs <= 5_000
    ? Math.ceil(remainingMs / 1_000)
    : null;

  // ── Grid flash overlays ───────────────────────────────────────────────────
  const [showGo, setShowGo] = useState(false);
  const [milestoneText, setMilestoneText] = useState<string | null>(null);
  const shownMilestonesRef = useRef(new Set<number>());
  const goTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const milestoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "GO!" flash when recording starts
  useEffect(() => {
    if (phase === 'recording' && elapsedMs < 500) {
      // Reset milestones for a fresh recording
      shownMilestonesRef.current = new Set();
      if (goTimerRef.current) clearTimeout(goTimerRef.current);
      goTimerRef.current = setTimeout(() => {
        setShowGo(true);
        goTimerRef.current = setTimeout(() => setShowGo(false), 1200);
      }, 700);
    }
    if (phase !== 'recording') {
      setShowGo(false);
      setMilestoneText(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Milestone banners: only "20" and "10" (seconds left) — not every 10s interval for the whole length
  useEffect(() => {
    if (phase !== 'recording') return;
    const rem = Math.max(0, sessionCapMsRef.current - elapsedMs);
    const secRem = Math.ceil(rem / 1000);
    const fire = (secondsLeft: number, label: string) => {
      if (secRem !== secondsLeft || shownMilestonesRef.current.has(secondsLeft)) return;
      shownMilestonesRef.current.add(secondsLeft);
      if (milestoneTimerRef.current) clearTimeout(milestoneTimerRef.current);
      setMilestoneText(label);
      milestoneTimerRef.current = setTimeout(() => setMilestoneText(null), 1800);
    };
    fire(20, '20');
    fire(10, '10');
  }, [elapsedMs, phase]);

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 24px',
        overflow: 'hidden',
      }}
    >
      <header style={{ flexShrink: 0 }}>
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
              <li>
                <strong>Main recording grid</strong> (the dark box)—that&apos;s where your movement and clicks are recorded. Left- or right-click and drag to interact with the grid.
              </li>
              <li>
                <strong>Settings bar</strong> (after you start): try color, size, shape, themes, chaos, grid, etc. Change settings while you move for the best effect.
              </li>
              <li>
                Stop when done (or let the timer run out), then open results if you want.
              </li>
            </ol>
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => window.open('/about', '_blank')}
                  style={{ background: `${cursorColor}14`, border: `1.5px solid ${cursorColor}99`, borderRadius: 8, padding: '9px 18px', font: 'inherit', color: cursorColor, fontWeight: 700, cursor: 'pointer', fontSize: '0.97rem', letterSpacing: '0.01em' }}
                >
                  📖 User Guide
                </button>
                <button
                  type="button"
                  onClick={() => window.open('/stack', '_blank')}
                  style={{ background: `${cursorColor}14`, border: `1.5px solid ${cursorColor}99`, borderRadius: 8, padding: '9px 18px', font: 'inherit', color: cursorColor, fontWeight: 700, cursor: 'pointer', fontSize: '0.97rem', letterSpacing: '0.01em' }}
                >
                  🏗️ How It&#39;s Built
                </button>
                <button
                  type="button"
                  onClick={() => window.open('/why', '_blank')}
                  style={{ background: `${cursorColor}14`, border: `1.5px solid ${cursorColor}99`, borderRadius: 8, padding: '9px 18px', font: 'inherit', color: cursorColor, fontWeight: 700, cursor: 'pointer', fontSize: '0.97rem', letterSpacing: '0.01em' }}
                >
                  💡 Why HeatFX
                </button>
              </div>
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
              Shortcuts: <strong>Space</strong> stop; keyboard <strong>←</strong> <strong>→</strong> cursor colour; <strong>1–6</strong> shape, <strong>Q–Y</strong> theme; mouse <strong>wheel on grid</strong> resizes cursor
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
                {(elapsedMs / 1000).toFixed(1)}s / {(sessionCapMsRef.current / 1000).toFixed(0)}s
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
                shape={cursorShape}
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
                cursorShape={cursorShape}
              />
              <ChaosOverlay
                gridRef={gridRef}
                isActive={phase === 'recording' && chaosActive}
                obstacleType={chaosObstacleType}
                density={chaosDensity}
                accentColor={cursorColor}
                cursorSizePx={cursorSizePx}
                onHit={(gridX, gridY) => {
                  chaosHitCountRef.current += 1;
                  const dims = frozenGridRef.current;
                  if (dims) {
                    const t = accumulatedMsRef.current + (Date.now() - startTimeRef.current);
                    chaosHitsRef.current.push({ t, normX: gridX / dims.widthPx, normY: gridY / dims.heightPx });
                  }
                  setHitFlash((prev) => ({ x: gridX, y: gridY, id: (prev?.id ?? 0) + 1 }));
                  if (hitFlashTimerRef.current) clearTimeout(hitFlashTimerRef.current);
                  hitFlashTimerRef.current = setTimeout(() => setHitFlash(null), 700);
                }}
              />
              {hitFlash && phase === 'recording' && chaosActive && (
                <div
                  key={hitFlash.id}
                  style={{
                    position: 'absolute',
                    left: hitFlash.x,
                    top: hitFlash.y,
                    transform: 'translate(-50%, -120%)',
                    pointerEvents: 'none',
                    zIndex: 30,
                    userSelect: 'none',
                    animation: 'chaos-hit 0.7s ease forwards',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontSize: `${chaosHitTy.emojiRem}rem`,
                    filter: 'drop-shadow(0 0 8px #ff4444)',
                    lineHeight: 1,
                  }}>
                    💥
                  </div>
                  <div style={{
                    fontSize: `${chaosHitTy.powRem}rem`,
                    fontWeight: 800,
                    color: '#ff4444',
                    letterSpacing: '0.05em',
                    textShadow: '0 0 6px #ff000088',
                    marginTop: 2,
                  }}>
                    POW!
                  </div>
                </div>
              )}
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
              {/* GO! flash */}
              {showGo && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15 }}>
                  <div
                    key="go-flash"
                    style={{
                      fontSize: 'clamp(72px, 18vw, 180px)',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: `${cursorColor}55`,
                      textShadow: `0 0 40px ${cursorColor}33`,
                      userSelect: 'none',
                      animation: 'countdown-pop 0.35s ease forwards',
                    }}
                  >
                    GO!
                  </div>
                </div>
              )}
              {/* Milestone banner: only at 20s and 10s remaining */}
              {milestoneText && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 15 }}>
                  <div
                    key={milestoneText}
                    style={{
                      fontSize: 'clamp(72px, 18vw, 180px)',
                      fontWeight: 900,
                      lineHeight: 1,
                      color: `${cursorColor}55`,
                      textShadow: `0 0 28px ${cursorColor}33`,
                      userSelect: 'none',
                      letterSpacing: '-0.02em',
                      animation: 'countdown-pop 0.35s ease forwards',
                    }}
                  >
                    {milestoneText}
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
                      color: `${cursorColor}55`,
                      textShadow: `0 0 28px ${cursorColor}33`,
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
                    {(elapsedMs / 1000).toFixed(1)}s / {(sessionCapMsRef.current / 1000).toFixed(0)}s
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
