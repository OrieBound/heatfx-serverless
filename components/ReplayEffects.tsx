'use client';

import type { RecordedEvent } from '@/types/events';
import type { AnimationTheme } from '@/contexts/RecordingSettingsContext';

const TRAIL_MAX = 30;
const TRAIL_TTL_MS = 500;
const BURST_TTL_MS = 800;

interface ReplayEffectsProps {
  events: RecordedEvent[];
  currentTimeMs: number;
  theme: AnimationTheme;
  color: string;
  scaleX: number;
  scaleY: number;
  width: number;
  height: number;
  cursorSizePx?: number;
}

export function ReplayEffects({
  events,
  currentTimeMs,
  theme,
  color,
  scaleX,
  scaleY,
  width,
  height,
  cursorSizePx = 16,
}: ReplayEffectsProps) {
  if (theme === 'classic') return null;
  const scale = Math.max(1, (cursorSizePx ?? 16) / 16);

  const trailPoints: { x: number; y: number; t: number }[] = [];
  for (const e of events) {
    if (e.t > currentTimeMs) break;
    if (e.type === 'move' || e.type === 'drag_move') {
      trailPoints.push({ x: e.x * scaleX, y: e.y * scaleY, t: e.t });
    }
  }
  const trail = trailPoints.slice(-TRAIL_MAX);

  const bursts: { x: number; y: number; t: number }[] = [];
  for (const e of events) {
    if (e.t > currentTimeMs) break;
    if ((e.type === 'click' || e.type === 'down' || e.type === 'drag_start') && 'x' in e) {
      bursts.push({ x: e.x * scaleX, y: e.y * scaleY, t: e.t });
    }
  }
  const recentBursts = bursts.slice(-10);

  const isNeon = theme === 'neon';
  const isParty = theme === 'party';
  const isFire = theme === 'fire';
  const isOcean = theme === 'ocean';

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        overflow: 'hidden',
      }}
    >
      {isNeon && (
        <>
          {trail.map((p, i) => {
            const age = currentTimeMs - p.t;
            if (age > TRAIL_TTL_MS) return null;
            const opacity = 1 - age / TRAIL_TTL_MS;
            const r = (4 + opacity * 12) * scale;
            return (
              <div
                key={`${p.x}-${p.y}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: r,
                  height: r,
                  marginLeft: -r / 2,
                  marginTop: -r / 2,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 ${r * 2}px ${color}, 0 0 ${r * 4}px ${color}80`,
                  opacity,
                }}
              />
            );
          })}
          {recentBursts.map((b, i) => {
            const age = currentTimeMs - b.t;
            if (age > BURST_TTL_MS) return null;
            const burstScale = Math.min(4, age / 80);
            const opacity = 1 - age / BURST_TTL_MS;
            const size = 29 * scale;
            return (
              <div
                key={`${b.x}-${b.y}-${b.t}-${i}`}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  border: `3px solid ${color}`,
                  borderRadius: '50%',
                  transform: `scale(${burstScale})`,
                  opacity: opacity * 0.9,
                  boxShadow: `0 0 ${size * 0.6}px ${color}, 0 0 ${size}px ${color}80`,
                }}
              />
            );
          })}
        </>
      )}
      {isParty && (
        <>
          {trail.map((p, i) => {
            const age = currentTimeMs - p.t;
            if (age > TRAIL_TTL_MS) return null;
            const opacity = 1 - age / TRAIL_TTL_MS;
            const hue = (i * 60 + age * 0.2) % 360;
            const r = 6 * scale;
            return (
              <div
                key={`${p.x}-${p.y}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: r,
                  height: r,
                  marginLeft: -r / 2,
                  marginTop: -r / 2,
                  borderRadius: '50%',
                  background: `hsl(${hue}, 85%, 65%)`,
                  boxShadow: `0 0 ${r}px hsl(${hue}, 80%, 60%)`,
                  opacity,
                }}
              />
            );
          })}
          {recentBursts.map((b, i) => {
            const age = currentTimeMs - b.t;
            if (age > BURST_TTL_MS) return null;
            const opacity = 1 - age / BURST_TTL_MS;
            const size = 15 * scale;
            const burstScale = 1 + age / 120;
            return (
              <div
                key={`${b.x}-${b.y}-${b.t}-${i}`}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  borderRadius: '50%',
                  background: ['#f97316', '#ec4899', '#22c55e', '#3b82f6', '#eab308'][i % 5],
                  opacity: opacity * 0.95,
                  transform: `scale(${burstScale})`,
                  boxShadow: `0 0 ${size}px ${['#f97316', '#ec4899', '#22c55e', '#3b82f6'][i % 4]}80`,
                }}
              />
            );
          })}
        </>
      )}
      {isFire && (
        <>
          {trail.map((p, i) => {
            const age = currentTimeMs - p.t;
            if (age > TRAIL_TTL_MS) return null;
            const opacity = 1 - age / TRAIL_TTL_MS;
            const r = (5 + opacity * 10) * scale;
            const hue = 25 - age / TRAIL_TTL_MS * 15;
            return (
              <div
                key={`${p.x}-${p.y}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: r,
                  height: r,
                  marginLeft: -r / 2,
                  marginTop: -r / 2,
                  borderRadius: '50%',
                  background: `hsl(${hue}, 95%, 55%)`,
                  boxShadow: `0 0 ${r}px hsl(${hue}, 100%, 60%), 0 0 ${r * 2}px rgba(251, 146, 60, 0.6)`,
                  opacity,
                }}
              />
            );
          })}
          {recentBursts.map((b, i) => {
            const age = currentTimeMs - b.t;
            if (age > BURST_TTL_MS) return null;
            const burstScale = Math.min(4, age / 70);
            const opacity = 1 - age / BURST_TTL_MS;
            const size = 28 * scale;
            return (
              <div
                key={`${b.x}-${b.y}-${b.t}-${i}`}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  border: '3px solid #f97316',
                  borderRadius: '50%',
                  transform: `scale(${burstScale})`,
                  opacity: opacity * 0.95,
                  boxShadow: '0 0 32px #ea580c, 0 0 64px rgba(234, 88, 12, 0.5)',
                }}
              />
            );
          })}
        </>
      )}
      {isOcean && (
        <>
          {trail.map((p, i) => {
            const age = currentTimeMs - p.t;
            if (age > TRAIL_TTL_MS) return null;
            const opacity = 1 - age / TRAIL_TTL_MS;
            const r = (4 + opacity * 10) * scale;
            const hue = 195 + (i % 3) * 15;
            return (
              <div
                key={`${p.x}-${p.y}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: r,
                  height: r,
                  marginLeft: -r / 2,
                  marginTop: -r / 2,
                  borderRadius: '50%',
                  background: `hsla(${hue}, 75%, 55%, ${opacity})`,
                  boxShadow: `0 0 ${r * 2}px hsla(${hue}, 80%, 60%, 0.7)`,
                }}
              />
            );
          })}
          {recentBursts.map((b, i) => {
            const age = currentTimeMs - b.t;
            if (age > BURST_TTL_MS) return null;
            const burstScale = Math.min(3.5, age / 90);
            const opacity = 1 - age / BURST_TTL_MS;
            const size = 26 * scale;
            return (
              <div
                key={`${b.x}-${b.y}-${b.t}-${i}`}
                style={{
                  position: 'absolute',
                  left: b.x,
                  top: b.y,
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  border: '3px solid #0ea5e9',
                  borderRadius: '50%',
                  transform: `scale(${burstScale})`,
                  opacity: opacity * 0.9,
                  boxShadow: '0 0 28px #0284c7, 0 0 56px rgba(2, 132, 199, 0.4)',
                }}
              />
            );
          })}
        </>
      )}
    </div>
  );
}
