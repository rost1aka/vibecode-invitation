export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect extends Size {
  left: number;
  top: number;
}

export const EDGE_MARGIN = 16;
export const MIN_POINTER_DISTANCE = 200;
export const NEAR_RADIUS = 100;
export const MAX_CANDIDATES = 20;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Top-left corner for the button: first random spot ≥ 200px from the pointer, else the farthest one. */
export function nextPosition(viewport: Size, button: Size, pointer: Point, random: () => number): Point {
  const spanX = Math.max(0, viewport.width - button.width - 2 * EDGE_MARGIN);
  const spanY = Math.max(0, viewport.height - button.height - 2 * EDGE_MARGIN);
  let best: Point = { x: EDGE_MARGIN, y: EDGE_MARGIN };
  let bestDistance = -1;
  for (let i = 0; i < MAX_CANDIDATES; i++) {
    const candidate = { x: EDGE_MARGIN + random() * spanX, y: EDGE_MARGIN + random() * spanY };
    const centre = { x: candidate.x + button.width / 2, y: candidate.y + button.height / 2 };
    const d = distance(centre, pointer);
    if (d >= MIN_POINTER_DISTANCE) return candidate;
    if (d > bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }
  return best;
}

export function isNear(pointer: Point, rect: Rect, radius = NEAR_RADIUS): boolean {
  const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  return distance(pointer, centre) < radius;
}
