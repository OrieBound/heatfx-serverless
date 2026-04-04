'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_PREFIX = 'heatfx-';

export const CURSOR_SIZE_MIN = 8;
export const CURSOR_SIZE_MAX = 96;
export const CURSOR_SIZE_DEFAULT = 16;

export type AnimationTheme = 'classic' | 'neon' | 'party' | 'fire' | 'ocean';

export type GridBackground = 'none' | 'dots' | 'grid';

const RecordingSettingsContext = createContext<{
  cursorSizePx: number;
  setCursorSizePx: (n: number) => void;
  animationTheme: AnimationTheme;
  setAnimationTheme: (t: AnimationTheme) => void;
  gridBackground: GridBackground;
  setGridBackground: (b: GridBackground) => void;
}>({
  cursorSizePx: CURSOR_SIZE_DEFAULT,
  setCursorSizePx: () => {},
  animationTheme: 'neon',
  setAnimationTheme: () => {},
  gridBackground: 'grid',
  setGridBackground: () => {},
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

  useEffect(() => {
    const stored = getStored<number>('cursor-size-px', CURSOR_SIZE_DEFAULT, (v): v is number =>
      typeof v === 'number' && v >= CURSOR_SIZE_MIN && v <= CURSOR_SIZE_MAX
    );
    setCursorSizePxState(clampCursorSize(stored));
    setAnimationThemeState(
      getStored<AnimationTheme>('animation-theme', 'neon', (v): v is AnimationTheme =>
        ['classic', 'neon', 'party', 'fire', 'ocean'].includes(v as AnimationTheme)
      )
    );
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

  const value = useMemo(
    () => ({
      cursorSizePx,
      setCursorSizePx,
      animationTheme,
      setAnimationTheme,
      gridBackground,
      setGridBackground,
    }),
    [cursorSizePx, setCursorSizePx, animationTheme, setAnimationTheme, gridBackground, setGridBackground]
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
