'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnimationTheme } from '@/contexts/RecordingSettingsContext';

interface RecordingEffectsProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  theme: AnimationTheme;
  color: string;
  /** Scale trail and bursts with cursor size (e.g. 16 = 1x, 48 = 3x). */
  cursorSizePx?: number;
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

export function RecordingEffects({ gridRef, isActive, theme, color, cursorSizePx = 16 }: RecordingEffectsProps) {
  const scale = Math.max(1, (cursorSizePx ?? 16) / 16);
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
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 ${r * 2}px ${color}, 0 0 ${r * 4}px ${color}80`,
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
                  borderRadius: '50%',
                  background: `hsl(${hue}, 85%, 65%)`,
                  boxShadow: `0 0 ${r}px hsl(${hue}, 80%, 60%)`,
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
                  borderRadius: '50%',
                  background: `hsl(${hue}, 95%, 55%)`,
                  boxShadow: `0 0 ${r}px hsl(${hue}, 100%, 60%), 0 0 ${r * 2}px rgba(251, 146, 60, 0.6)`,
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
                  border: `3px solid #f97316`,
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
                  borderRadius: '50%',
                  background: `hsla(${hue}, 75%, 55%, ${opacity})`,
                  boxShadow: `0 0 ${r * 2}px hsla(${hue}, 80%, 60%, 0.7)`,
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
                  border: `3px solid #0ea5e9`,
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
