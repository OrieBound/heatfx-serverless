'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'heatfx-cursor-color';
const DEFAULT_COLOR = '#6366f1';

const PALETTE = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a855f7', // purple
  '#eab308', // yellow
  '#14b8a6', // teal
  '#f43f5e', // rose
  '#84cc16', // lime
  '#ffffff', // white
  '#0ea5e9', // sky blue
  '#7c3aed', // violet
  '#10b981', // emerald
  '#f59e0b', // amber
  '#fb923c', // coral
  '#e879f9', // fuchsia
  '#4ade80', // light green
  '#38bdf8', // light blue
  '#fbbf24', // golden yellow
] as const;

const CursorColorContext = createContext<{
  color: string;
  setColor: (c: string) => void;
  palette: readonly string[];
}>({ color: DEFAULT_COLOR, setColor: () => {}, palette: PALETTE });

function getStored(): string {
  if (typeof window === 'undefined') return DEFAULT_COLOR;
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && /^#[0-9a-fA-F]{6}$/.test(s)) return s;
  } catch {}
  return DEFAULT_COLOR;
}

export function CursorColorProvider({ children }: { children: React.ReactNode }) {
  const [color, setColorState] = useState(DEFAULT_COLOR);

  useEffect(() => {
    setColorState(getStored());
  }, []);

  const setColor = useCallback((c: string) => {
    setColorState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c);
    } catch {}
  }, []);

  const value = useMemo(() => ({
    color,
    setColor,
    palette: PALETTE,
  }), [color, setColor]);

  return (
    <CursorColorContext.Provider value={value}>
      {children}
    </CursorColorContext.Provider>
  );
}

export function useCursorColor() {
  return useContext(CursorColorContext);
}
