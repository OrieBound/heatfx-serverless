'use client';

import type { GridBackground as GridBackgroundType } from '@/contexts/RecordingSettingsContext';

interface GridBackgroundProps {
  variant: GridBackgroundType;
  className?: string;
  style?: React.CSSProperties;
}

export function GridBackground({ variant, className = '', style = {} }: GridBackgroundProps) {
  if (variant === 'none') return null;

  if (variant === 'dots') {
    return (
      <div
        aria-hidden
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          backgroundImage: 'radial-gradient(circle at center, var(--text-muted) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.25,
          pointerEvents: 'none',
          animation: 'grid-bg-dots 20s linear infinite',
          ...style,
        }}
      />
    );
  }

  if (variant === 'grid') {
    return (
      <div
        aria-hidden
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 'inherit',
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          opacity: 0.4,
          pointerEvents: 'none',
          ...style,
        }}
      />
    );
  }

  return null;
}
