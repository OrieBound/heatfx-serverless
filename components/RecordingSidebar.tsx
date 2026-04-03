'use client';

import { useCursorColor } from '@/contexts/CursorColorContext';
import {
  useRecordingSettings,
  CURSOR_SIZE_MIN,
  CURSOR_SIZE_MAX,
  type AnimationTheme,
  type GridBackground,
} from '@/contexts/RecordingSettingsContext';

interface RecordingSidebarProps {
  children?: React.ReactNode;
  side?: 'left' | 'right';
}

const ANIMATION_THEMES: { value: AnimationTheme; label: string; hotkey: string }[] = [
  { value: 'classic', label: 'Classic', hotkey: '1' },
  { value: 'neon', label: 'Neon', hotkey: '2' },
  { value: 'party', label: 'Party', hotkey: '3' },
  { value: 'fire', label: 'Fire', hotkey: '4' },
  { value: 'ocean', label: 'Ocean', hotkey: '5' },
];

const GRID_BACKGROUNDS: { value: GridBackground; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid' },
];

export function RecordingSidebar({ children, side = 'left' }: RecordingSidebarProps) {
  const { color: cursorColor, setColor: setCursorColor, palette } = useCursorColor();
  const {
    cursorSizePx,
    setCursorSizePx,
    animationTheme,
    setAnimationTheme,
    gridBackground,
    setGridBackground,
  } = useRecordingSettings();
  const activePaletteIndex = palette.indexOf(cursorColor);
  const cyclePalette = (direction: -1 | 1) => {
    if (!palette.length) return;
    if (activePaletteIndex < 0) {
      setCursorColor(direction > 0 ? palette[0] : palette[palette.length - 1]);
      return;
    }
    const next = (activePaletteIndex + direction + palette.length) % palette.length;
    setCursorColor(palette[next]);
  };

  return (
    <aside
      style={{
        width: 360,
        flexShrink: 0,
        padding: 16,
        background: 'var(--surface)',
        borderRight: side === 'left' ? '1px solid var(--border)' : 'none',
        borderLeft: side === 'right' ? '1px solid var(--border)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
        Settings
      </h3>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cursor color
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {palette.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCursorColor(c)}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: cursorColor === c ? '2px solid var(--text)' : '1px solid var(--border)',
                cursor: 'pointer',
              }}
              title={c}
            />
          ))}
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              gap: 4,
            }}
            title="Pick any color (gradient/custom)"
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: '2px solid var(--border)',
                padding: 2,
                background: `linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #22c55e 100%)`,
              }}
            >
              <input
                type="color"
                value={cursorColor}
                onChange={(e) => setCursorColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                  display: 'block',
                  background: cursorColor,
                }}
              />
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: `linear-gradient(90deg, transparent, ${cursorColor}40, transparent)`, padding: '0 4px', borderRadius: 2 }}>
              Custom
            </span>
          </label>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => cyclePalette(-1)}
            style={{
              width: 28,
              height: 24,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: 700,
              lineHeight: 1,
            }}
            title="Previous palette color (Arrow Left)"
            aria-label="Previous palette color"
          >
            ←
          </button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {activePaletteIndex >= 0 ? `Palette ${activePaletteIndex + 1}/${palette.length}` : 'Custom color'}
          </span>
          <button
            type="button"
            onClick={() => cyclePalette(1)}
            style={{
              width: 28,
              height: 24,
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontWeight: 700,
              lineHeight: 1,
            }}
            title="Next palette color (Arrow Right)"
            aria-label="Next palette color"
          >
            →
          </button>
        </div>
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cursor size
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 20 }}>{CURSOR_SIZE_MIN}</span>
          <input
            type="range"
            min={CURSOR_SIZE_MIN}
            max={CURSOR_SIZE_MAX}
            value={cursorSizePx}
            onChange={(e) => setCursorSizePx(Number(e.target.value))}
            style={{ flex: 1, accentColor: cursorColor }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 24 }}>{CURSOR_SIZE_MAX}</span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Drag left (small) ↔ right (large). Current: {cursorSizePx}px
        </p>
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Animation theme
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ANIMATION_THEMES.map(({ value, label, hotkey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAnimationTheme(value)}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                textAlign: 'left',
                background: animationTheme === value ? 'var(--border)' : 'transparent',
                color: animationTheme === value ? 'var(--text)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
              title={`Press ${hotkey} to switch to ${label}`}
            >
              <span>{label}</span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  padding: '3px 7px',
                  borderRadius: 999,
                  border: `1px solid ${animationTheme === value ? 'var(--text-muted)' : 'var(--border)'}`,
                  color: animationTheme === value ? 'var(--text)' : 'var(--text-muted)',
                  background: animationTheme === value ? 'var(--surface)' : 'transparent',
                  minWidth: 28,
                  textAlign: 'center',
                }}
              >
                {hotkey}
              </span>
            </button>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Neon: glow trail. Party: rainbow. Fire: warm trail + burst. Ocean: blue waves.
        </p>
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Background
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GRID_BACKGROUNDS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGridBackground(value)}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                textAlign: 'left',
                background: gridBackground === value ? 'var(--border)' : 'transparent',
                color: gridBackground === value ? 'var(--text)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Background for the recording area.
        </p>
      </div>

      {children}
    </aside>
  );
}
