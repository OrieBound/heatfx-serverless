'use client';

import { useEffect, useRef } from 'react';
import { CHAOS_DENSITY_MAX } from '@/contexts/RecordingSettingsContext';
import type { ChaosObstacleType } from '@/contexts/RecordingSettingsContext';
const BURST_FRAMES = 22;
const HIT_COOLDOWN_FRAMES = 40;

interface Obstacle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  burstFrame: number; // -1 = alive, 0+ = bursting
}

function spawnObstacle(w: number, h: number, spreadY?: number): Obstacle {
  const radius = 8 + Math.random() * 10;
  return {
    x: radius + Math.random() * (w - radius * 2),
    y: spreadY !== undefined ? spreadY : -radius - Math.random() * h,
    vx: (Math.random() - 0.5) * 1.2,
    vy: 1.2 + Math.random() * 1.8,
    radius,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.08,
    burstFrame: -1,
  };
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obs: Obstacle,
  type: ChaosObstacleType,
  color: string,
  alpha: number,
) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.rotate(obs.rotation);
  ctx.globalAlpha = alpha;

  if (type === 'dots') {
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
    ctx.fillStyle = `${color}55`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (type === 'rocks') {
    ctx.beginPath();
    const pts = 7;
    for (let i = 0; i < pts; i++) {
      const a = (i / pts) * Math.PI * 2;
      const r = obs.radius * (0.65 + Math.sin(i * 2.3 + 1) * 0.35);
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
              : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = `${color}33`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (type === 'snowflakes') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const cx = Math.cos(a), cy = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cx * obs.radius, cy * obs.radius);
      ctx.stroke();
      // small branches
      const bx = cx * obs.radius * 0.55, by = cy * obs.radius * 0.55;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(a + s * Math.PI / 3) * obs.radius * 0.22,
                   by + Math.sin(a + s * Math.PI / 3) * obs.radius * 0.22);
        ctx.stroke();
      }
    }
  } else if (type === 'rings') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha * 0.55;
    ctx.beginPath();
    ctx.arc(0, 0, obs.radius * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'stars') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? obs.radius : obs.radius * 0.42;
      i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
              : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = `${color}44`;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.restore();
}

function drawBurst(ctx: CanvasRenderingContext2D, obs: Obstacle, color: string, progress: number) {
  ctx.save();
  ctx.translate(obs.x, obs.y);
  ctx.globalAlpha = Math.max(0, 1 - progress);
  const scale = 1 + progress * 2.5;
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, obs.radius, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const inner = obs.radius + 2;
    const outer = obs.radius + obs.radius * 0.6 * progress;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

interface ChaosOverlayProps {
  gridRef: React.RefObject<HTMLDivElement>;
  isActive: boolean;
  obstacleType: ChaosObstacleType;
  density: number;
  accentColor: string;
  cursorSizePx: number;
  onHit: (gridX: number, gridY: number) => void;
}

export function ChaosOverlay({
  gridRef, isActive, obstacleType, density, accentColor, cursorSizePx, onHit,
}: ChaosOverlayProps) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const onHitRef        = useRef(onHit);
  const cursorSizePxRef = useRef(cursorSizePx);
  const accentColorRef  = useRef(accentColor);
  onHitRef.current        = onHit;
  cursorSizePxRef.current = cursorSizePx;
  accentColorRef.current  = accentColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    const grid   = gridRef.current;
    if (!canvas || !grid || !isActive) return;

    const w = grid.clientWidth;
    const h = grid.clientHeight;
    canvas.width  = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d')!;
    const count = density;

    // Spread initial y positions so grid isn't empty at start
    const obstacles: Obstacle[] = Array.from({ length: count }, (_, i) =>
      spawnObstacle(w, h, (i / count) * h)
    );

    let cursor: { x: number; y: number } | null = null;
    let hitCooldown = 0;
    let raf = 0;

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      if (hitCooldown > 0) hitCooldown--;

      // Read volatile values from refs each frame — avoids restarting effect on change
      const color = accentColorRef.current;

      for (const obs of obstacles) {
        if (obs.burstFrame >= 0) {
          const progress = obs.burstFrame / BURST_FRAMES;
          drawBurst(ctx, obs, color, progress);
          obs.burstFrame++;
          if (obs.burstFrame >= BURST_FRAMES) {
            Object.assign(obs, spawnObstacle(w, h));
            obs.burstFrame = -1;
          }
        } else {
          obs.x += obs.vx;
          obs.y += obs.vy;
          obs.rotation += obs.rotationSpeed;

          // Wall bounce
          if (obs.x - obs.radius < 0)  { obs.x = obs.radius;       obs.vx =  Math.abs(obs.vx); }
          if (obs.x + obs.radius > w)   { obs.x = w - obs.radius;   obs.vx = -Math.abs(obs.vx); }
          // Respawn at top
          if (obs.y - obs.radius > h) Object.assign(obs, spawnObstacle(w, h));

          drawObstacle(ctx, obs, obstacleType, color, 0.8);

          // Read cursor size via ref so resizing doesn't restart the effect
          if (cursor && hitCooldown <= 0) {
            const dx = cursor.x - obs.x;
            const dy = cursor.y - obs.y;
            if (Math.sqrt(dx * dx + dy * dy) < obs.radius + cursorSizePxRef.current / 2) {
              obs.burstFrame = 0;
              hitCooldown = HIT_COOLDOWN_FRAMES;
              onHitRef.current(cursor.x, cursor.y);
            }
          }
        }
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onMove  = (e: PointerEvent) => {
      const r = grid.getBoundingClientRect();
      cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onLeave = () => { cursor = null; };
    grid.addEventListener('pointermove', onMove,  { passive: true });
    grid.addEventListener('pointerleave', onLeave);

    return () => {
      cancelAnimationFrame(raf);
      grid.removeEventListener('pointermove', onMove);
      grid.removeEventListener('pointerleave', onLeave);
    };
  // cursorSizePx and accentColor intentionally omitted — read via refs each frame
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, obstacleType, density, gridRef]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 8,
        borderRadius: 8,
      }}
    />
  );
}

// ── Deterministic replay variant ──────────────────────────────────────────────

function hashSessionId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return h >>> 0;
}

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return (s >>> 0) / 0xffffffff;
  };
}

interface ChaosReplayObstacle {
  x0: number; y0: number;
  vxPxMs: number; vyPxMs: number;
  radius: number;
  rotation0: number;
  rotSpeedMs: number;
}

function buildReplayObstacles(
  sessionId: string,
  count: number,
  w: number,
  h: number,
): ChaosReplayObstacle[] {
  const rng = seededRng(hashSessionId(sessionId));
  return Array.from({ length: count }, (_, i) => {
    const radius = 8 + rng() * 10;
    const vy = (1.2 + rng() * 1.8) / 16.67;   // px per ms
    const vx = (rng() - 0.5) * 1.2 / 16.67;
    return {
      x0: radius + rng() * (w - radius * 2),
      y0: (i / count) * h,
      vxPxMs: vx,
      vyPxMs: vy,
      radius,
      rotation0: rng() * Math.PI * 2,
      rotSpeedMs: (rng() - 0.5) * 0.08 / 16.67,
    };
  });
}

interface ChaosDensitySnapshot {
  t: number;
  density: number;
}

interface ChaosReplayOverlayProps {
  sessionId: string;
  currentTimeMs: number;
  gridWidthPx: number;
  gridHeightPx: number;
  obstacleType: ChaosObstacleType;
  density: number;
  accentColor: string;
  /** If provided, density varies over time during replay. */
  chaosDensitySnapshots?: ChaosDensitySnapshot[];
}

function getDensityAtTime(snapshots: ChaosDensitySnapshot[] | undefined, fallback: number, t: number): number {
  if (!snapshots || snapshots.length === 0) return fallback;
  let d = snapshots[0].density;
  for (const snap of snapshots) {
    if (snap.t <= t) d = snap.density;
    else break;
  }
  return d;
}

export function ChaosReplayOverlay({
  sessionId, currentTimeMs, gridWidthPx, gridHeightPx,
  obstacleType, density, accentColor, chaosDensitySnapshots,
}: ChaosReplayOverlayProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const obstaclesRef = useRef<ChaosReplayObstacle[]>([]);

  useEffect(() => {
    // Always pre-build CHAOS_DENSITY_MAX obstacles so density changes reveal/hide seamlessly.
    obstaclesRef.current = buildReplayObstacles(
      sessionId, CHAOS_DENSITY_MAX, gridWidthPx, gridHeightPx,
    );
  }, [sessionId, gridWidthPx, gridHeightPx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width  = gridWidthPx;
    canvas.height = gridHeightPx;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, gridWidthPx, gridHeightPx);
    const t = currentTimeMs;
    const h = gridHeightPx;
    const currentDensity = getDensityAtTime(chaosDensitySnapshots, density, t);

    obstaclesRef.current.slice(0, currentDensity).forEach((o) => {
      const rawY = o.y0 + o.vyPxMs * t;
      const span = h + o.radius * 2;
      const y = ((rawY % span) + span) % span - o.radius;
      const x = o.x0 + o.vxPxMs * t;
      const rotation = o.rotation0 + o.rotSpeedMs * t;
      const obs: Obstacle = { x, y, vx: 0, vy: 0, radius: o.radius, rotation, rotationSpeed: 0, burstFrame: -1 };
      drawObstacle(ctx, obs, obstacleType, accentColor, 0.7);
    });
  }, [currentTimeMs, gridWidthPx, gridHeightPx, obstacleType, accentColor, density, chaosDensitySnapshots]);

  return (
    <canvas
      ref={canvasRef}
      width={gridWidthPx}
      height={gridHeightPx}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 8,
        borderRadius: 8,
      }}
    />
  );
}
