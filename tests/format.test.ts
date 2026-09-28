import { describe, expect, it } from 'vitest';
import { formatSlot, formatStart } from '../src/format';

describe('formatSlot', () => {
  it('VI-TC-12: formats a slot for uk-UA', () => {
    expect(formatSlot('2026-10-01T18:00+03:00', 120, 'Europe/Kyiv')).toBe('чт, 1 жовтня · 18:00–20:00');
  });

  it('VI-TC-13: shows the time in the friend time zone', () => {
    expect(formatSlot('2026-10-01T18:00+03:00', 90, 'Europe/London')).toBe('чт, 1 жовтня · 16:00–17:30');
  });
});

describe('formatStart', () => {
  it('VI-TC-14: formats the start in the given zone', () => {
    expect(formatStart('2026-10-01T15:00Z', 'Europe/Kyiv')).toBe('чт, 1 жовтня · 18:00');
  });
});
