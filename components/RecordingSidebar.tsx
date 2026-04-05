'use client';

import { useCursorColor } from '@/contexts/CursorColorContext';
import {
  useRecordingSettings,
  CURSOR_SIZE_MIN,
  CURSOR_SIZE_MAX,
  CHAOS_DENSITY_MIN,
  CHAOS_DENSITY_MAX,
  RECORDING_DURATION_OPTIONS_MS,
  type AnimationTheme,
  type GridBackground,
  type ChaosObstacleType,
  type CursorShape,
  type RecordingDurationMs,
} from '@/contexts/RecordingSettingsContext';
import { useAuth } from '@/contexts/AuthContext';

interface RecordingSidebarProps {
  children?: React.ReactNode;
  side?: 'left' | 'right';
}

const CURSOR_SHAPES: { value: CursorShape; label: string; emoji: string; hotkey: string }[] = [
  { value: 'circle',   label: 'Circle',   emoji: '●', hotkey: '1' },
  { value: 'square',   label: 'Square',   emoji: '■', hotkey: '2' },
  { value: 'plus',     label: 'Plus',     emoji: '+', hotkey: '3' },
  { value: 'diamond',  label: 'Diamond',  emoji: '◆', hotkey: '4' },
  { value: 'octagon',  label: 'Octagon',  emoji: '⯃', hotkey: '5' },
  { value: 'triangle', label: 'Triangle', emoji: '▲', hotkey: '6' },
];

const ANIMATION_THEMES: { value: AnimationTheme; label: string; emoji: string; hotkey: string }[] = [
  { value: 'classic', label: 'Classic', emoji: '💫', hotkey: 'Q' },
  { value: 'neon',    label: 'Neon',    emoji: '✨', hotkey: 'W' },
  { value: 'party',   label: 'Party',   emoji: '🎊', hotkey: 'E' },
  { value: 'fire',    label: 'Fire',    emoji: '🔥', hotkey: 'R' },
  { value: 'ocean',   label: 'Ocean',   emoji: '🌊', hotkey: 'T' },
  { value: 'cosmic',  label: 'Cosmic',  emoji: '🌌', hotkey: 'Y' },
];

const GRID_BACKGROUNDS: { value: GridBackground; label: string; hotkey: string }[] = [
  { value: 'none', label: 'None', hotkey: 'Z' },
  { value: 'dots', label: 'Dots', hotkey: 'X' },
  { value: 'grid', label: 'Grid', hotkey: 'C' },
];

const CHAOS_OBSTACLE_TYPES: { value: ChaosObstacleType; label: string; emoji: string; hotkey: string }[] = [
  { value: 'none',       label: 'None',    emoji: '○', hotkey: 'A' },
  { value: 'dots',       label: 'Dots',    emoji: '●', hotkey: 'S' },
  { value: 'rocks',      label: 'Rocks',   emoji: '⬡', hotkey: 'D' },
  { value: 'snowflakes', label: 'Flakes',  emoji: '❄', hotkey: 'F' },
  { value: 'stars',      label: 'Stars',   emoji: '★', hotkey: 'G' },
  { value: 'rings',      label: 'Rings',   emoji: '◎', hotkey: 'H' },
];


export function RecordingSidebar({ children, side = 'left' }: RecordingSidebarProps) {
  const { user } = useAuth();
  const { color: cursorColor, setColor: setCursorColor, palette } = useCursorColor();
  const {
    cursorSizePx, setCursorSizePx,
    animationTheme, setAnimationTheme,
    gridBackground, setGridBackground,
    cursorShape, setCursorShape,
    chaosObstacleType, setChaosObstacleType,
    chaosDensity, setChaosDensity,
    recordingDurationMs, setRecordingDurationMs,
  } = useRecordingSettings();
  const chaosActive = chaosObstacleType !== 'none';
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

      {user && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Recording length
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {RECORDING_DURATION_OPTIONS_MS.map((ms) => {
              const sec = ms / 1000;
              const active = recordingDurationMs === ms;
              return (
                <button
                  key={ms}
                  type="button"
                  onClick={() => setRecordingDurationMs(ms as RecordingDurationMs)}
                  title={`Record up to ${sec} seconds`}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 72,
                    padding: '8px 6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: `1px solid ${active ? cursorColor : 'var(--border)'}`,
                    borderRadius: 6,
                    background: active ? `${cursorColor}22` : 'transparent',
                    color: active ? 'var(--text)' : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {sec}s
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cursor color
        </p>
        <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Press the <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.68rem', fontFamily: 'ui-monospace, monospace' }}>←</kbd>{' '}
          <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.68rem', fontFamily: 'ui-monospace, monospace' }}>→</kbd>{' '}
          <strong style={{ color: 'var(--text)' }}>arrow keys on your keyboard</strong> (not on-screen buttons) to cycle colours while recording.
        </p>
        {/* 22 palette swatches – 11 per row, 2 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 24px)', gap: 5, marginBottom: 8 }}>
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
                padding: 0,
              }}
              title={c}
            />
          ))}
        </div>
        {/* Custom colour picker */}
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          title="Pick any colour"
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: '2px solid var(--border)',
              padding: 2,
              background: `linear-gradient(135deg, #6366f1 0%, #ec4899 50%, #22c55e 100%)`,
              flexShrink: 0,
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
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Custom colour
          </span>
        </label>
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

      {/* Cursor shape */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cursor shape
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          {CURSOR_SHAPES.map(({ value, label, emoji, hotkey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCursorShape(value)}
              title={`Press ${hotkey} to switch to ${label}`}
              style={{
                padding: '6px 4px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: cursorShape === value ? 'var(--border)' : 'transparent',
                color: cursorShape === value ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: '1.0rem', lineHeight: 1 }}>{emoji}</span>
              <span>{label}</span>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                marginTop: 1,
              }}>
                {hotkey}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Cursor theme */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Cursor theme
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5 }}>
          {ANIMATION_THEMES.map(({ value, label, emoji, hotkey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setAnimationTheme(value)}
              title={`Press ${hotkey} to switch to ${label}`}
              style={{
                padding: '6px 4px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: animationTheme === value ? 'var(--border)' : 'transparent',
                color: animationTheme === value ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{emoji}</span>
              <span>{label}</span>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                marginTop: 1,
              }}>
                {hotkey}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chaos Mode */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Chaos Mode <span style={{ fontSize: '0.72rem' }}>💥</span>
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: chaosActive ? 12 : 0 }}>
          {CHAOS_OBSTACLE_TYPES.map(({ value, label, emoji, hotkey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setChaosObstacleType(value)}
              title={`Press ${hotkey} to select ${label}`}
              style={{
                padding: '6px 4px',
                fontSize: '0.75rem',
                border: '1px solid var(--border)',
                borderRadius: 6,
                background: chaosObstacleType === value
                  ? (value === 'none' ? 'var(--border)' : '#ef444422')
                  : 'transparent',
                color: chaosObstacleType === value
                  ? (value === 'none' ? 'var(--text)' : '#f87171')
                  : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                position: 'relative',
              }}
            >
              <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{emoji}</span>
              <span>{label}</span>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                marginTop: 1,
              }}>
                {hotkey}
              </span>
            </button>
          ))}
        </div>
        {!chaosActive && (
          <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Choose any obstacle type other than None to show the <strong style={{ color: 'var(--text)' }}>density</strong> slider (low → high). Use <kbd style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border)', fontSize: '0.65rem', fontFamily: 'monospace' }}>↑</kbd>{' '}
            <kbd style={{ padding: '1px 4px', borderRadius: 3, border: '1px solid var(--border)', fontSize: '0.65rem', fontFamily: 'monospace' }}>↓</kbd> on the keyboard to adjust density.
          </p>
        )}

        {chaosActive && (
          <>
            <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Density
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 16 }}>{CHAOS_DENSITY_MIN}</span>
              <input
                type="range"
                min={CHAOS_DENSITY_MIN}
                max={CHAOS_DENSITY_MAX}
                value={chaosDensity}
                onChange={(e) => setChaosDensity(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#f87171' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 24 }}>{CHAOS_DENSITY_MAX}</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {chaosDensity} obstacle{chaosDensity !== 1 ? 's' : ''} — dodge them all! 💥
            </p>
          </>
        )}
      </div>

      <div>
        <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Background
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {GRID_BACKGROUNDS.map(({ value, label, hotkey }) => (
            <button
              key={value}
              type="button"
              onClick={() => setGridBackground(value)}
              title={`Press ${hotkey} to select ${label}`}
              style={{
                padding: '8px 12px',
                fontSize: '0.85rem',
                textAlign: 'left',
                background: gridBackground === value ? 'var(--border)' : 'transparent',
                color: gridBackground === value ? 'var(--text)' : 'var(--text-muted)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <span>{label}</span>
              <span style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                padding: '1px 5px',
                borderRadius: 3,
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
                lineHeight: 1.4,
              }}>
                {hotkey}
              </span>
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
