import { describe, expect, it } from 'vitest';
import { isNear, nextPosition } from '../src/dodge';

/** Deterministic PRNG (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns the given values in a loop. */
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('nextPosition', () => {
  it('VI-TC-18: always keeps the button inside the viewport with a 16px margin', () => {
    const viewport = { width: 375, height: 667 };
    const button = { width: 80, height: 44 };
    const random = seeded(42);
    for (let i = 0; i < 1000; i++) {
      const pointer = { x: random() * viewport.width, y: random() * viewport.height };
      const pos = nextPosition(viewport, button, pointer, random);
      expect(pos.x).toBeGreaterThanOrEqual(16);
      expect(pos.y).toBeGreaterThanOrEqual(16);
      expect(pos.x + button.width).toBeLessThanOrEqual(viewport.width - 16);
      expect(pos.y + button.height).toBeLessThanOrEqual(viewport.height - 16);
    }
  });

  it('VI-TC-19: returns the first candidate whose centre is at least 200px from the pointer', () => {
    // candidate 1 = (16,16), centre (66,36) — right under the pointer; candidate 2 = (450,380)
    const pos = nextPosition({ width: 1000, height: 800 }, { width: 100, height: 40 }, { x: 66, y: 36 }, sequence(0, 0, 0.5, 0.5));
    expect(pos).toEqual({ x: 450, y: 380 });
  });

  it('VI-TC-20: falls back to the farthest candidate on a small screen', () => {
    // No point of a 240x240 viewport is 200px from its centre; (16,16) is the farthest of the two candidates.
    const pos = nextPosition({ width: 240, height: 240 }, { width: 100, height: 40 }, { x: 120, y: 120 }, sequence(0.5, 0.5, 0, 0));
    expect(pos).toEqual({ x: 16, y: 16 });
  });

  it('VI-TC-50: never lands on a rect it must avoid, such as the Yes button', () => {
    const viewport = { width: 375, height: 667 };
    const button = { width: 80, height: 44 };
    const yes = { left: 100, top: 300, width: 90, height: 44 };
    const random = seeded(7);
    for (let i = 0; i < 1000; i++) {
      const pointer = { x: random() * viewport.width, y: random() * viewport.height };
      const pos = nextPosition(viewport, button, pointer, random, [yes]);
      const overlaps =
        pos.x < yes.left + yes.width &&
        pos.x + button.width > yes.left &&
        pos.y < yes.top + yes.height &&
        pos.y + button.height > yes.top;
      expect(overlaps).toBe(false);
    }
  });

  it('VI-TC-21: returns finite non-negative coordinates when the button does not fit', () => {
    const pos = nextPosition({ width: 50, height: 30 }, { width: 100, height: 40 }, { x: 25, y: 15 }, seeded(1));
    expect(Number.isFinite(pos.x) && Number.isFinite(pos.y)).toBe(true);
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });
});

describe('isNear', () => {
  it('VI-TC-22: is true strictly within 100px of the button centre', () => {
    const rect = { left: 100, top: 100, width: 80, height: 40 }; // centre (140,120)
    expect(isNear({ x: 239, y: 120 }, rect)).toBe(true);
    expect(isNear({ x: 240, y: 120 }, rect)).toBe(false);
  });
});
