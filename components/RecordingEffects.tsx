'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationTheme, CursorShape } from '@/contexts/RecordingSettingsContext';
import { CURSOR_SIZE_DEFAULT } from '@/contexts/RecordingSettingsContext';
import { effectParticleShapeStyle, softGlowFilter } from '@/components/cursorVisualUtils';

interface RecordingEffectsProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  theme: AnimationTheme;
  color: string;
  /** Scale trail and bursts with cursor size (e.g. 16 = 1x, 48 = 3x). */
  cursorSizePx?: number;
  cursorShape?: CursorShape;
}

interface TrailPoint {
  x: number;
  y: number;
  t: number;
}

interface ClickBurst {
  x: number;
  y: number;
  t: number;
}

const TRAIL_MAX = 30;
const TRAIL_TTL = 500;
const BURST_TTL = 800;

export function RecordingEffects({ gridRef, isActive, theme, color, cursorSizePx = CURSOR_SIZE_DEFAULT, cursorShape = 'circle' }: RecordingEffectsProps) {
  const scale = Math.max(1, (cursorSizePx ?? CURSOR_SIZE_DEFAULT) / 16);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [bursts, setBursts] = useState<ClickBurst[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);

  useEffect(() => {
    if (!isActive || !gridRef.current || theme === 'classic') return;
    const el = gridRef.current;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      trailRef.current = [{ x, y, t: Date.now() }, ...trailRef.current].slice(0, TRAIL_MAX);
      setTrail(trailRef.current);
    };

    const onDown = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)
        return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setBursts((b) => [...b, { x, y, t: Date.now() }].slice(-8));
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mousedown', onDown);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mousedown', onDown);
    };
  }, [isActive, theme, gridRef]);

  useEffect(() => {
    if (!isActive || theme === 'classic') return;
    const id = setInterval(() => {
      const t = Date.now();
      setTrail(trailRef.current.filter((p) => t - p.t < TRAIL_TTL));
      setBursts((b) => b.filter((x) => t - x.t < BURST_TTL));
    }, 50);
    return () => clearInterval(id);
  }, [isActive, theme]);

  if (!isActive || theme === 'classic') return null;

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
        zIndex: 3,
        overflow: 'hidden',
        borderRadius: 'inherit',
      }}
    >
      {isNeon && (
        <>
          {trail.map((p, i) => {
            const age = Date.now() - p.t;
            const opacity = 1 - age / TRAIL_TTL;
            const r = (4 + (1 - age / TRAIL_TTL) * 12) * scale;
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
          {bursts.map((b, i) => {
            const age = Date.now() - b.t;
            if (age > BURST_TTL) return null;
            const burstScale = Math.min(4, age / 80);
            const opacity = 1 - age / BURST_TTL;
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
            const age = Date.now() - p.t;
            const opacity = 1 - age / TRAIL_TTL;
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
          {bursts.map((b, i) => {
            const age = Date.now() - b.t;
            if (age > BURST_TTL) return null;
            const opacity = 1 - age / BURST_TTL;
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
            const age = Date.now() - p.t;
            const opacity = 1 - age / TRAIL_TTL;
            const r = (5 + (1 - age / TRAIL_TTL) * 10) * scale;
            const hue = 25 - (age / TRAIL_TTL) * 15;
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
          {bursts.map((b, i) => {
            const age = Date.now() - b.t;
            if (age > BURST_TTL) return null;
            const burstScale = Math.min(4, age / 70);
            const opacity = 1 - age / BURST_TTL;
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
                  border: `3px solid #f97316`,
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
            const age = Date.now() - p.t;
            const opacity = 1 - age / TRAIL_TTL;
            const r = (4 + (1 - age / TRAIL_TTL) * 10) * scale;
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
          {bursts.map((b, i) => {
            const age = Date.now() - b.t;
            if (age > BURST_TTL) return null;
            const burstScale = Math.min(3.5, age / 90);
            const opacity = 1 - age / BURST_TTL;
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
                  border: `3px solid #0ea5e9`,
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
            const age = Date.now() - p.t;
            const progress = age / TRAIL_TTL;
            const opacity = (1 - progress) * 0.95;
            const r = (2 + (1 - progress) * 7) * scale;
            const starColor = COSMIC_COLORS[i % COSMIC_COLORS.length];
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
          {bursts.map((b, i) => {
            const age = Date.now() - b.t;
            if (age > BURST_TTL) return null;
            const progress = age / BURST_TTL;
            const opacity = 1 - progress;
            const size = 32 * scale;
            return (
              <div key={`${b.x}-${b.y}-${b.t}-${i}`}>
                <div
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: b.y,
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    ...effectParticleShapeStyle(cursorShape, `scale(${1 + progress * 3})`),
                    border: `2px solid #a855f7`,
                    boxSizing: 'border-box',
                    background: 'rgba(168, 85, 247, 0.08)',
                    opacity: opacity * 0.9,
                    filter: softGlowFilter([
                      { blurPx: 14, color: '#c084fc' },
                      { blurPx: 28, color: 'rgba(124, 58, 237, 0.55)' },
                    ]),
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: b.x,
                    top: b.y,
                    width: 8 * scale,
                    height: 8 * scale,
                    marginLeft: -4 * scale,
                    marginTop: -4 * scale,
                    ...effectParticleShapeStyle(cursorShape),
                    background: '#ffffff',
                    opacity: opacity * (1 - progress),
                    filter: softGlowFilter([
                      { blurPx: 6, color: '#ffffff' },
                      { blurPx: 14, color: 'rgba(232, 121, 249, 0.75)' },
                    ]),
                  }}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
