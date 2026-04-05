import type { CSSProperties } from 'react';
import type { CursorShape } from '@/contexts/RecordingSettingsContext';

const PLUS_CLIP =
  'polygon(33% 0%,67% 0%,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0% 67%,0% 33%,33% 33%)';
const OCT_CLIP =
  'polygon(29.3% 0%, 70.7% 0%, 100% 29.3%, 100% 70.7%, 70.7% 100%, 29.3% 100%, 0% 70.7%, 0% 29.3%)';
const TRI_CLIP = 'polygon(50% 0%,0% 100%,100% 100%)';

/** Trail / burst particles: same silhouette as the live cursor shape. */
export function effectParticleShapeStyle(
  shape: CursorShape,
  transformExtra = ''
): Pick<CSSProperties, 'borderRadius' | 'clipPath' | 'transform' | 'boxSizing'> {
  const te = transformExtra.trim();
  const withT = (base: string) => (te ? `${base} ${te}` : base);
  switch (shape) {
    case 'square':
      return te ? { borderRadius: 2, transform: te } : { borderRadius: 2 };
    case 'plus':
      return te ? { clipPath: PLUS_CLIP, transform: te } : { clipPath: PLUS_CLIP };
    case 'diamond':
      return { borderRadius: 1, transform: withT('rotate(45deg)') };
    case 'octagon':
      return te ? { clipPath: OCT_CLIP, transform: te } : { clipPath: OCT_CLIP };
    case 'triangle':
      return te ? { clipPath: TRI_CLIP, transform: te } : { clipPath: TRI_CLIP };
    case 'circle':
    default:
      return te ? { borderRadius: '50%', transform: te } : { borderRadius: '50%' };
  }
}

/** Multi-layer glow that survives `clip-path` (unlike `box-shadow`, which browsers clip to the path). */
export function softGlowFilter(stops: { blurPx: number; color: string }[]): string {
  return stops.map(({ blurPx, color }) => `drop-shadow(0 0 ${blurPx}px ${color})`).join(' ');
}

/** Emoji + label size for chaos hit flash, scaled like the cursor (16px baseline). */
export function chaosHitTypographyRems(cursorSizePx: number): { emojiRem: number; powRem: number } {
  const s = Math.max(0.95, Math.min(3.4, cursorSizePx / 16));
  return { emojiRem: 1.2 * s, powRem: 0.65 * s };
}
