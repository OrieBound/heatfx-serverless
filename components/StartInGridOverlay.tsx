'use client';

interface StartInGridOverlayProps {
  onStart: () => void;
  color: string;
}

/** Start recording button in the center of the grid; click is not recorded. */
export function StartInGridOverlay({ onStart, color }: StartInGridOverlayProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onStart();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          pointerEvents: 'auto',
          padding: '20px 48px',
          fontSize: '1.25rem',
          fontWeight: 700,
          background: color,
          color: 'white',
          border: 'none',
          borderRadius: 14,
          boxShadow: `0 6px 24px ${color}50`,
          cursor: 'pointer',
        }}
      >
        Start recording
      </button>
    </div>
  );
}
