/** Normalized coords x,y in 0..1 relative to grid. t = ms since recording start. */

export type MouseButton = 0 | 2; // 0 left, 2 right

export type EventMove = { t: number; type: 'move'; x: number; y: number };
export type EventDown = { t: number; type: 'down'; x: number; y: number; btn: MouseButton };
export type EventUp = { t: number; type: 'up'; x: number; y: number; btn: MouseButton };
export type EventClick = { t: number; type: 'click'; x: number; y: number; btn: MouseButton };
export type EventDragStart = { t: number; type: 'drag_start'; x: number; y: number; btn: MouseButton };
export type EventDragMove = { t: number; type: 'drag_move'; x: number; y: number; btn: MouseButton };
export type EventDragEnd = {
  t: number;
  type: 'drag_end';
  x: number;
  y: number;
  btn: MouseButton;
  rect: { x1: number; y1: number; x2: number; y2: number };
};
export type EventScroll = { t: number; type: 'scroll'; dx: number; dy: number };

export type RecordedEvent =
  | EventMove
  | EventDown
  | EventUp
  | EventClick
  | EventDragStart
  | EventDragMove
  | EventDragEnd
  | EventScroll;

export interface SessionMeta {
  sessionId: string;
  gridWidthPx: number;
  gridHeightPx: number;
  aspectRatio: string;
  durationMs: number;
  maxDurationMs: number;
  eventCounts: Record<string, number>;
  themeDefault?: string;
}
