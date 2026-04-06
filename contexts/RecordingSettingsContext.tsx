'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'heatfx-';

export const CURSOR_SIZE_MIN = 8;
export const CURSOR_SIZE_MAX = 160;
export const CURSOR_SIZE_DEFAULT = 40;

export type AnimationTheme = 'classic' | 'neon' | 'party' | 'fire' | 'ocean' | 'cosmic';
export type GridBackground = 'none' | 'dots' | 'grid';
export type CursorShape = 'circle' | 'square' | 'plus' | 'diamond' | 'octagon' | 'triangle';
export type ChaosObstacleType = 'none' | 'dots' | 'rocks' | 'snowflakes' | 'stars' | 'rings';
export const CHAOS_DENSITY_MIN = 1;
export const CHAOS_DENSITY_MAX = 100;
export const CHAOS_DENSITY_DEFAULT = 15;

/** Guests are always limited to this length. Logged-in users may choose up to 120s. */
export const RECORDING_DURATION_FREE_MS = 30_000;
export const RECORDING_DURATION_OPTIONS_MS = [30_000, 60_000, 90_000, 120_000] as const;
export type RecordingDurationMs = (typeof RECORDING_DURATION_OPTIONS_MS)[number];

const RecordingSettingsContext = createContext<{
  cursorSizePx: number;
  setCursorSizePx: (n: number) => void;
  animationTheme: AnimationTheme;
  setAnimationTheme: (t: AnimationTheme) => void;
  gridBackground: GridBackground;
  setGridBackground: (b: GridBackground) => void;
  cursorShape: CursorShape;
  setCursorShape: (s: CursorShape) => void;
  chaosObstacleType: ChaosObstacleType;
  setChaosObstacleType: (v: ChaosObstacleType) => void;
  chaosDensity: number;
  setChaosDensity: (v: number) => void;
  recordingDurationMs: RecordingDurationMs;
  setRecordingDurationMs: (ms: RecordingDurationMs) => void;
}>({
  cursorSizePx: CURSOR_SIZE_DEFAULT,
  setCursorSizePx: () => {},
  animationTheme: 'neon',
  setAnimationTheme: () => {},
  gridBackground: 'grid',
  setGridBackground: () => {},
  cursorShape: 'circle',
  setCursorShape: () => {},
  chaosObstacleType: 'none',
  setChaosObstacleType: () => {},
  chaosDensity: CHAOS_DENSITY_DEFAULT,
  setChaosDensity: () => {},
  recordingDurationMs: RECORDING_DURATION_FREE_MS,
  setRecordingDurationMs: () => {},
});

function getStored<T>(key: string, fallback: T, validate: (v: unknown) => v is T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const s = localStorage.getItem(STORAGE_PREFIX + key);
    if (s == null) return fallback;
    const v = JSON.parse(s) as unknown;
    return validate(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function clampCursorSize(n: number): number {
  return Math.round(Math.max(CURSOR_SIZE_MIN, Math.min(CURSOR_SIZE_MAX, n)));
}

export function RecordingSettingsProvider({ children }: { children: React.ReactNode }) {
  const [cursorSizePx, setCursorSizePxState] = useState(CURSOR_SIZE_DEFAULT);
  const [animationTheme, setAnimationThemeState] = useState<AnimationTheme>('neon');
  const [gridBackground, setGridBackgroundState] = useState<GridBackground>('grid');
  const [cursorShape, setCursorShapeState] = useState<CursorShape>('circle');
  const [chaosObstacleType, setChaosObstacleType] = useState<ChaosObstacleType>('none');
  const [chaosDensity, setChaosDensity] = useState<number>(CHAOS_DENSITY_DEFAULT);
  const [recordingDurationMs, setRecordingDurationMsState] = useState<RecordingDurationMs>(RECORDING_DURATION_FREE_MS);

  useEffect(() => {
    const stored = getStored<number>('cursor-size-px', CURSOR_SIZE_DEFAULT, (v): v is number =>
      typeof v === 'number' && v >= CURSOR_SIZE_MIN && v <= CURSOR_SIZE_MAX
    );
    setCursorSizePxState(clampCursorSize(stored));
    setAnimationThemeState(
      getStored<AnimationTheme>('animation-theme', 'neon', (v): v is AnimationTheme =>
        ['classic', 'neon', 'party', 'fire', 'ocean', 'cosmic'].includes(v as AnimationTheme)
      )
    );
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + 'cursor-shape');
      if (raw != null) {
        const v = JSON.parse(raw) as unknown;
        const ok = ['circle', 'square', 'plus', 'diamond', 'octagon', 'triangle'] as const;
        if (v === 'ring') {
          setCursorShapeState('octagon');
          try {
            localStorage.setItem(STORAGE_PREFIX + 'cursor-shape', JSON.stringify('octagon'));
          } catch {}
        } else if (typeof v === 'string' && ok.includes(v as (typeof ok)[number])) {
          setCursorShapeState(v as CursorShape);
        }
      }
    } catch {
      /* keep default circle */
    }
    const storedBg = getStored<GridBackground>('grid-background', 'grid', (v): v is GridBackground =>
      ['none', 'dots', 'grid'].includes(v as GridBackground)
    );
    const initialBg = storedBg === 'none' ? 'grid' : storedBg;
    setGridBackgroundState(initialBg);
    if (storedBg === 'none') {
      try {
        localStorage.setItem(STORAGE_PREFIX + 'grid-background', JSON.stringify('grid'));
      } catch {}
    }
    const storedDur = getStored<number>(
      'recording-duration-ms',
      RECORDING_DURATION_FREE_MS,
      (v): v is RecordingDurationMs =>
        typeof v === 'number' && (RECORDING_DURATION_OPTIONS_MS as readonly number[]).includes(v)
    );
    setRecordingDurationMsState(storedDur as RecordingDurationMs);
  }, []);

  const setCursorSizePx = useCallback((n: number) => {
    const v = clampCursorSize(n);
    setCursorSizePxState(v);
    try {
      localStorage.setItem(STORAGE_PREFIX + 'cursor-size-px', JSON.stringify(v));
    } catch {}
  }, []);

  const setAnimationTheme = useCallback((t: AnimationTheme) => {
    setAnimationThemeState(t);
    try {
      localStorage.setItem(STORAGE_PREFIX + 'animation-theme', JSON.stringify(t));
    } catch {}
  }, []);

  const setGridBackground = useCallback((b: GridBackground) => {
    setGridBackgroundState(b);
    try {
      localStorage.setItem(STORAGE_PREFIX + 'grid-background', JSON.stringify(b));
    } catch {}
  }, []);

  const setCursorShape = useCallback((s: CursorShape) => {
    setCursorShapeState(s);
    try { localStorage.setItem(STORAGE_PREFIX + 'cursor-shape', JSON.stringify(s)); } catch {}
  }, []);

  const setRecordingDurationMs = useCallback((ms: RecordingDurationMs) => {
    setRecordingDurationMsState(ms);
    try {
      localStorage.setItem(STORAGE_PREFIX + 'recording-duration-ms', JSON.stringify(ms));
    } catch {}
  }, []);

  const value = useMemo(
    () => ({
      cursorSizePx, setCursorSizePx,
      animationTheme, setAnimationTheme,
      gridBackground, setGridBackground,
      cursorShape, setCursorShape,
      chaosObstacleType, setChaosObstacleType,
      chaosDensity, setChaosDensity,
      recordingDurationMs, setRecordingDurationMs,
    }),
    [cursorSizePx, setCursorSizePx, animationTheme, setAnimationTheme, gridBackground, setGridBackground,
     cursorShape, setCursorShape, chaosObstacleType, chaosDensity, recordingDurationMs, setRecordingDurationMs]
  );

  return (
    <RecordingSettingsContext.Provider value={value}>
      {children}
    </RecordingSettingsContext.Provider>
  );
}

export function useRecordingSettings() {
  return useContext(RecordingSettingsContext);
}
