'use client';

import type { RecordedEvent } from '@/types/events';
import type { AnimationTheme, CursorShape } from '@/contexts/RecordingSettingsContext';
import { effectParticleShapeStyle, softGlowFilter } from '@/components/cursorVisualUtils';

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
  cursorShape?: CursorShape;
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
  cursorShape = 'circle',
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

  const isNeon   = theme === 'neon';
  const isParty  = theme === 'party';
  const isFire   = theme === 'fire';
  const isOcean  = theme === 'ocean';
  const isCosmic = theme === 'cosmic';

  const COSMIC_COLORS = ['#ffffff', '#a855f7', '#22d3ee', '#818cf8', '#e879f9'];

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
                  ...effectParticleShapeStyle(cursorShape),
                  background: color,
                  filter: softGlowFilter([
                    { blurPx: r * 2, color },
                    { blurPx: r * 4, color: `${color}80` },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape, `scale(${burstScale})`),
                  border: `3px solid ${color}`,
                  boxSizing: 'border-box',
                  background: `${color}18`,
                  opacity: opacity * 0.9,
                  filter: softGlowFilter([
                    { blurPx: size * 0.55, color },
                    { blurPx: size * 0.95, color: `${color}99` },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape),
                  background: `hsl(${hue}, 85%, 65%)`,
                  filter: softGlowFilter([{ blurPx: Math.max(4, r * 1.2), color: `hsl(${hue}, 80%, 55%)` }]),
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
            const bc = ['#f97316', '#ec4899', '#22c55e', '#3b82f6', '#eab308'][i % 5];
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
                  ...effectParticleShapeStyle(cursorShape, `scale(${burstScale})`),
                  background: bc,
                  opacity: opacity * 0.95,
                  filter: softGlowFilter([
                    { blurPx: size * 0.85, color: bc },
                    { blurPx: size * 1.4, color: `${bc}99` },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape),
                  background: `hsl(${hue}, 95%, 55%)`,
                  filter: softGlowFilter([
                    { blurPx: r * 1.1, color: `hsl(${hue}, 100%, 58%)` },
                    { blurPx: r * 2.2, color: 'rgba(251, 146, 60, 0.65)' },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape, `scale(${burstScale})`),
                  border: '3px solid #f97316',
                  boxSizing: 'border-box',
                  background: 'rgba(249, 115, 22, 0.12)',
                  opacity: opacity * 0.95,
                  filter: softGlowFilter([
                    { blurPx: 18, color: '#fb923c' },
                    { blurPx: 36, color: 'rgba(234, 88, 12, 0.55)' },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape),
                  background: `hsla(${hue}, 75%, 55%, ${opacity})`,
                  filter: softGlowFilter([
                    { blurPx: r * 2.2, color: `hsla(${hue}, 80%, 58%, 0.85)` },
                  ]),
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
                  ...effectParticleShapeStyle(cursorShape, `scale(${burstScale})`),
                  border: '3px solid #0ea5e9',
                  boxSizing: 'border-box',
                  background: 'rgba(14, 165, 233, 0.1)',
                  opacity: opacity * 0.9,
                  filter: softGlowFilter([
                    { blurPx: 16, color: '#38bdf8' },
                    { blurPx: 32, color: 'rgba(2, 132, 199, 0.5)' },
                  ]),
                }}
              />
            );
          })}
        </>
      )}
      {isCosmic && (
        <>
          {trail.map((p, i) => {
            const age = currentTimeMs - p.t;
            const progress = Math.min(1, age / TRAIL_TTL_MS);
            const opacity = (1 - progress) * 0.95;
            const r = (2 + (1 - progress) * 7) * scale;
            const starColor = COSMIC_COLORS[i % COSMIC_COLORS.length];
            return (
              <div
                key={`${p.x}-${p.y}-${i}`}
                style={{
                  position: 'absolute',
                  left: p.x, top: p.y,
                  width: r, height: r,
                  marginLeft: -r / 2, marginTop: -r / 2,
                  ...effectParticleShapeStyle(cursorShape),
                  background: starColor,
                  filter: softGlowFilter([
                    { blurPx: r * 3, color: starColor },
                    { blurPx: r * 6, color: `${starColor}99` },
                  ]),
                  opacity,
                }}
              />
            );
          })}
          {recentBursts.map((b, i) => {
            const age = currentTimeMs - b.t;
            if (age > BURST_TTL_MS) return null;
            const progress = age / BURST_TTL_MS;
            const opacity = 1 - progress;
            const size = 32 * scale;
            return (
              <div key={`${b.x}-${b.y}-${b.t}-${i}`}>
                <div style={{
                  position: 'absolute', left: b.x, top: b.y,
                  width: size, height: size,
                  marginLeft: -size / 2, marginTop: -size / 2,
                  ...effectParticleShapeStyle(cursorShape, `scale(${1 + progress * 3})`),
                  border: '2px solid #a855f7',
                  boxSizing: 'border-box',
                  background: 'rgba(168, 85, 247, 0.08)',
                  opacity: opacity * 0.9,
                  filter: softGlowFilter([
                    { blurPx: 14, color: '#c084fc' },
                    { blurPx: 28, color: 'rgba(124, 58, 237, 0.55)' },
                  ]),
                }} />
                <div style={{
                  position: 'absolute', left: b.x, top: b.y,
                  width: 8 * scale, height: 8 * scale,
                  marginLeft: -4 * scale, marginTop: -4 * scale,
                  ...effectParticleShapeStyle(cursorShape),
                  background: '#ffffff',
                  opacity: opacity * (1 - progress),
                  filter: softGlowFilter([
                    { blurPx: 6, color: '#ffffff' },
                    { blurPx: 14, color: 'rgba(232, 121, 249, 0.75)' },
                  ]),
                }} />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
